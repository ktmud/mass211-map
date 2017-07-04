<template>
  <div class="map-item">
    <control-variable :config="config" @updateConfig="onControlUpdate">
    </control-variable>
    <control-sync :settings.sync="settings" :totalMaps="totalMaps"
      @removeSelf="$emit('removeItem', config)"
      @addSibling="$emit('addItem', config)">
    </control-sync>
    <v-map ref="map" v-loading="loading" :options="mapOptions">
      <v-tilelayer :url="tile.url" :attribution="tile.attribution">
      </v-tilelayer>
      <v-geojson-layer ref="geojson" :geojson="geojson" :options="geojsonOptions">
      </v-geojson-layer>
      <map-legend v-if="settings.ready" :settings.sync="settings"
        :meta="meta" :colors="legendColors">
      </map-legend>
    </v-map>
  </div>
</template>

<script>
import {
  getGeoData, findVariable, getFormat,
  settings, DEFAULT_VAR
} from '@/api/data'

import ControlVariable from './ControlVariable'
import ControlSync from './ControlSync'
import MapControl from "./Control"
import MapLegend from "./Legend"
import VMap from "./Map"

import { color as d3color } from 'd3-color'
import { colorize, getTileProvider } from '@/api/utils'
import _ from 'lodash'

const MAX_BOUNDS = L.latLngBounds(
  L.latLng(43.7314, -67.5437),
  L.latLng(40.4887, -76.1245),
)

export default {
  props: ['config', 'total-maps'],
  components: {
    ControlVariable,
    ControlSync,
    VMap,
    MapControl,
    MapLegend
  },
  data () {

    return {
      // must be an empty array, otherwise leaflet will complain
      geojson: [],
      geojsonLoading: true,

      // persistent settings
      // (stored locally instead on in url)
      settings: {
        // whether to sync moves between different maps
        syncMove: true,
        // whether to show legend
        showLegend: this.totalMaps <= 3,
        ready: false
      },

      tile: getTileProvider(),

      lastBounds: null,
      lastClickTarget: null,
      lastHoverTarget: null,
      hovering: false,
      // whether zoomed big enough
      // that the tooltip should be expanded
      // mode
      bigMode: this.config.zoom > this.ZOOM_BIG,

      mapOptions: {
        center: this.config.center,
        zoom: this.config.zoom,
        bounds: this.config.bounds,
        wheelDebounceTime: 100,
        // wheelPxPerZoomLevel: 100,
        zoomControl: false,
        zoomSnap: 0.1,
        zoomDelta: 0.5,
        zoomAnimationThreshold: 6,
        maxBounds: MAX_BOUNDS,
      },
      geojsonOptions: {
        style: (item) => {
          return {
            weight: 1,
            color: this.strokeColor(item),
            opacity: 1,
            fillColor: this.fillColor(item),
            fillOpacity: 1
          }
        },
        onEachFeature: (feature, layer) => {
           if (feature.properties) {
             layer.bindTooltip(this.tooltip(feature))
             layer.on({
               mouseover: this.onHoverFeature,
               mouseout: this.onLeaveFeature,
               click: this.zoomToFeature
             });
           }
        }
      },
    }
  },
  computed: {
    geounit () {
      return this.config.geounit
    },
    variable () {
      return this.config.variable
    },
    /**
     * The meta data of current variable
     */
    meta () {
      return findVariable(this.variable)
    },
    ZOOM_BIG () {
      if (this.geounit == 'county') return 9.5
      return 10
    },
    variableAvail () {
      return !this.meta.requires|| (this.geounit in this.meta.requires)
    },
    strokeColor () {
      return (item) => {
        return d3color(this.fillColor(item)).darker(1)
      }
    },
    /**
     * get all possible values
     */
    vals () {
      return this.getGeoVals()
    },
    logvals () {
      // remove zeros and add logs
      return this.vals.filter(x => x > 0).map(Math.log)
    },
    format () {
      var format = getFormat(this.variable)
      return (val) => {
        return format(val)
      }
    },
    infoItem () {
      let item = this.lastHoverTarget
      if (!this.variableAvail || !item || !item.feature.properties) return null
      let ret = item.feature.properties
      let prefix = this.geounit == 'zip' ? 'MA' : ''
      let suffix = this.geounit == 'county' ? 'County' : ''
      ret.fullname = `${prefix} ${ret.name} ${suffix}`
      return ret
    },
    fillColor () {
      if (!this.variableAvail) {
        return (item) => '#eee'
      }
      var variable = this.variable
      var color = colorize(this.logvals)
      var ret = (item) => {
        if (item.properties) {
          item = Math.log(item.properties[variable])
        }
        return color(item)
      }
      ret.ticks = color.ticks
      return ret
    },
    legendColors () {
      if (this.loading || !this.variableAvail) {
        return null
      }
      let vals = this.fillColor.ticks(5)
      let colors = vals.map(x => {
        // revert to original values
        let val = Math.pow(Math.exp(1), x)
        return {
          color: this.fillColor(x),
          label: this.format(val) + ' ' + this.meta.unitsShort,
          value: val
        }
      })
      return colors
    },
    mapObject () {
      return this.$refs.map.mapObject
    },
    loading () {
      return this.geojsonLoading;
    },
    /**
     * Debounced view updating based on configured viewport options
     */
    updateView () {
      return _.debounce(function () {
        if (this.config.bounds) {
          this.setBounds(this.config.bounds)
        }
        if (this.config.center) {
          this.setView(this.config.center, this.config.zoom)
        }
      }, 10)
    },
  },
  watch: {
    ['meta'] (to, from) {
      // when redirected from wrong URL
      if (!from) {
        this.loadPolygons();
      }
    },
    ['config.geounit'] () {
      this.loadPolygons()
    },
    ['config.variable'] () {
      this.checkVariableValidity()
      this.resetStyle()
      this.updateTooltip(true)
    },
    ['config.center'] (to) {
      this.updateView()
    },
    ['config.zoom'] (to) {
      this.updateView()
    },
    settings: {
      handler: function (val) {
        settings.dump(this)
      },
      deep: true,
    },
  },
  methods: {

    loadSettings () {
      settings.load(this).then(vals => {
        if (vals) {
          if (vals.showLegend !== this.settings.showLegend) {
            this.settings.showLegend = vals.showLegend;
          }
          if (vals.syncMove !== this.settings.syncMove) {
            this.settings.syncMove = vals.syncMove;
          }
        }
        this.settings.ready = true;
      }, err => {
        this.settings.ready = true;
      })
    },
    loadPolygons () {
      this.geojsonLoading = true
      getGeoData(this.geounit)
        .then(data => {
          this.geojson = data
          this.geojsonLoading = false
          this.checkVariableValidity()
        }, err => {
          this.fail('Invalid URL provided');
        })
    },
    fail (msg) {
      this.$message.error(msg, { duration: 1500 });
      setTimeout(() => {
        this.updateURL({
          ...this.config,
          variable: DEFAULT_VAR,
          center: this.getCenter(),
          zoom: this.getZoom()
        })
      }, 2000)
    },
    checkVariableValidity () {
      if (!this.variableAvail) {
        this.$message({
          message: `Variable "${this.variable}" not supported at this level.`,
          showClose: true,
          duration: 2000,
          type: 'error'
        });
      }
    },
    resetStyle (target) {
      if (target) {
        this.$refs.geojson.$geoJSON.resetStyle(target)
      } else {
        this.$refs.geojson.$geoJSON.setStyle(this.geojsonOptions.style)
      }
      this.resetHoverTarget()
    },
    resetHoverTarget: _.debounce(function () {
      if (!this.hovering) {
        this.lastHoverTarget = null
      }
    }, 1000),
    /**
     * Generate tooltip based on current zoom level
     */
    tooltip (feature) {
      let item = feature.properties
      if (this.getZoom() > this.ZOOM_BIG) {
        return this.fullTooltip(item)
      } else {
        return this.simpleTooltip(item)
      }
    },
    simpleTooltip (item) {
      return `<strong>${item.name}</strong> <br>
        ${this.formatted(item)}
        ${this.meta.units}
      `
    },
    formatted (item) {
      return this.format(item[this.variable])
    },
    fullTooltip (item) {
      const format = (name) => {
        return getFormat(name)(item[name])
      }
      return `<div class="item-detail">
            <h4>
              <strong>${item.name}</strong>:
              ${this.formatted(item)}
              ${this.meta.units}
            </h4>
            <table class="item-props">
              <tr>
                <th>Population</th>
                <td>${format('TotalPop')}</td>
              </tr>
              <tr>
                <th>Income</th>
                <td>${format('MedHouseIncome')}</td>
              </tr>
              <tr>
                <th>White</th>
                <td>${format('White')}</td>
              </tr>
              <tr>
                <th>In poverty</th>
                <td>${format('BelowPoverty')}</td>
              </tr>
            </table>
        </div>`
    },
    updateTooltip: _.debounce(function (update = false) {
      // only update when zoom level
      // switched between big and small
      if (this.getZoom() > this.ZOOM_BIG) {
        if (!this.bigMode) {
          this.bigMode = true
          update = true
        }
      } else {
        if (this.bigMode) {
          this.bigMode = false
          update = true
        }
      }
      if (update) {
        this.$refs.geojson.$geoJSON.eachLayer((layer) => {
          layer.bindTooltip(this.tooltip(layer.feature))
        })
      }
    }, 600),
    zoomIn (e) {
      if (this.getZoom() < this.ZOOM_BIG) {
        this.lastBounds = this.getBounds()
      }
      this.setBounds(e.target.getBounds())
    },
    zoomOut (e) {
      if (this.lastBounds) {
        this.setBounds(this.lastBounds)
      } else {
        this.setBounds(this.$refs.geojson.getBounds())
      }
    },
    setBounds (...args) {
      this.mapObject.fitBounds(...args)
    },
    getBounds () {
      return this.mapObject.getBounds()
    },
    setZoom (zoom) {
      this.mapObject.setZoom(zoom)
    },
    getZoom () {
      // take care of javascript float precision bug which produces
      // numbers like .0000000001
      return Math.round(this.mapObject.getZoom() * 10) / 10
    },
    getCenter (target=null) {
      return (target || this.mapObject).getCenter()
    },
    panTo (...args) {
      this.mapObject.panTo(...args)
    },
    setView (center, zoom, options) {
      this.mapObject.setView(center, zoom, options)
    },
    redraw () {
      this.mapObject._onResize()
    },
    /**
     * Get the values stored in geojson features
     */
    getGeoVals (variable, removeNA=true) {
     variable = variable || this.variable
      let ret = this.geojson.features.map(item => {
        return item.properties[variable]
      })
      if (removeNA) {
        ret = ret.filter(x => x < Infinity)
      }
      return ret
    },
    onHoverFeature (e) {
      var layer = e.target;
      layer.setStyle({
        opacity: 0.4,
        fillOpacity: 0.08,
        fillColor: '#fe9929',
      })
      this.hovering = true
      this.lastHoverTarget = layer
    },
    onLeaveFeature (e) {
      this.hovering = false
      this.resetStyle(e.target)
    },
    zoomToFeature (e) {
      if (e.target == this.lastClickTarget) {
        this.lastClickTarget = null
        this.zoomOut(e)
      } else {
        this.lastClickTarget = e.target
        this.zoomIn(e)
      }
    },
    onZoomChange (e) {
      this.updateTooltip()
      this.onMapUpdate(e)
    },
    onMove (e) {
      if (this.settings.syncMove) {
        this.$emit('syncMove', e, this)
      }
    },
    /**
     * Map updated; change location in url
     */
    onMapUpdate: _.debounce(function (e) {
      let from = this.config
      let to = {
        ...from,
        center: this.getCenter(),
        // handle float precision error
        zoom: this.getZoom()
      }
      this.updateURL(to, from)
    }, 400),
    onControlUpdate (to) {
      var from = this.config
      to = { ...from, ...to }
      this.updateURL(to, from)
    },
    /**
     * Move map will update the url
     */
    updateURL (to, from) {
      this.$emit('updateURL', to, from, this)
    },
  },
  created () {
    this.loadSettings()
  },
  mounted () {
    let map = this.mapObject
    // add zoom controls
    L.control.zoom({ position: 'bottomright' }).addTo(map)
    map.on('drag', (e) => this.onMove(e))
    map.on('dragend', (e) => this.onMapUpdate(e))
    map.on('zoomend', (e) => this.onZoomChange(e))
    if (this.meta) {
      this.loadPolygons()
      this.updateView()
    } else {
      let msg = `Variable "${this.config.variable}" is not available.`
      this.fail(msg);
    }
  }
}
</script>
<style>

</style>
