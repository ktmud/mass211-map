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
  getGeoData, findVariable, getFormat, getTileProvider,
  settings, DEFAULT_UNIT, DEFAULT_VAR, MAX_BOUNDS, MAX_ZOOM
} from '@/api/data'

import ControlVariable from './ControlVariable'
import ControlSync from './ControlSync'
import MapControl from "./Control"
import MapLegend from "./Legend"
import VMap from "./Map"

import { color as d3color } from 'd3-color'
import { scaleLinear } from 'd3-scale'
import { colorize } from '@/api/utils'
import _ from 'lodash'

// change the opacity based on zoom levels
// and use d3-scale to limit the range of it
var opacityScale = scaleLinear()
  .domain([8, 12])
  .range([1, 0.4])
  .clamp(true)

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
        maxZoom: MAX_ZOOM,
        zoomAnimationThreshold: 6,
        maxBounds: MAX_BOUNDS,
      },
      geojsonOptions: {
        style: this.polygonStyle,
        onEachFeature: this.onEachFeature,
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
    /**
     * How big is considered big zoom level
     */
    ZOOM_BIG () {
      if (this.geounit == 'county') return 9.5
      return 10
    },
    /**
     * Current zoom level (as seen in the config object)
     * only updates after the URL is updated
     */
    zoom () {
      return this.config.zoom
    },
    isZoomedIn () {
      return this.zoom > this.ZOOM_BIG
    },
    fillOpacity () {
      return opacityScale(this.zoom)
    },
    strokeOpacity () {
      return opacityScale(this.zoom + 2)
    },
    variableAvail () {
      return !this.meta.requires|| (this.geounit in this.meta.requires)
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
    // cache form and fillcolor functions
    format () {
      return getFormat(this.variable)
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
    infoItem () {
      let item = this.lastHoverTarget
      if (!this.variableAvail || !item || !item.feature.properties) return null
      let ret = item.feature.properties
      let prefix = this.geounit == 'zip' ? 'MA' : ''
      let suffix = this.geounit == 'county' ? 'County' : ''
      ret.fullname = `${prefix} ${ret.name} ${suffix}`
      return ret
    },
    /**
     * Feature ID to leaflet internal id mapping
     */
    polygonIds () {
      let ret = {}
      if (!this.geojson.features) {
        return ret
      }
      let geojson = this.$refs.geojson.$geoJSON
      geojson.getLayers().forEach((layer) => {
        ret[layer.feature.id] = geojson.getLayerId(layer)
      })
      return ret
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
    onEachFeature (feature, layer) {
      if (feature.properties) {
        layer.bindTooltip(this.tooltip(feature))
        layer.on({
          mouseover: this.onHoverFeature,
          mouseout: this.onLeaveFeature,
          click: this.zoomToFeature
        });
      }
    },
    polygonStyle (item) {
      let fillColor = this.fillColor(item)
      let color = d3color(this.fillColor(item)).darker(1)
      let fillOpacity = this.fillOpacity
      let opacity = this.strokeOpacity
      return {
        weight: 1,
        color,
        opacity,
        fillColor,
        fillOpacity
      }
    },
    fail (msg) {
      this.$message.error(msg, { duration: 1200 });
      setTimeout(() => {
        this.updateURL({
          ...this.config,
          geounit: DEFAULT_UNIT,
          variable: DEFAULT_VAR,
          center: this.getCenter(),
          zoom: this.getZoom()
        }, this.config)
      }, 2500)
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
      if (this.isZoomedIn) {
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
      if (this.isZoomedIn) {
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
      if (!this.isZoomedIn) {
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
    setBounds (bounds, options) {
      this.mapObject.fitBounds(bounds, options)
    },
    // quietSetBounds (bounds) {
    //   bounds = bounds || this.config.bounds;
    //   setTimeout(() => {
    //     this.fitting = true;
    //     this.mapObject.fitBounds(bounds, { animate: false })
    //     console.log(bounds)
    //     setTimeout(() => {
    //       this.fitting = false;
    //     }, 400)
    //   })
    // },
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
      // if (this.config.bounds) {
      //   this.quietSetBounds()
      // }
    },
    /**
     * Get the values stored in geojson features
     */
    getGeoVals (variable, removeNA=true) {
      variable = variable || this.variable
      if (!this.geojson.features) {
        return []
      }
      let ret = this.geojson.features.map(item => {
        return item.properties[variable]
      })
      if (removeNA) {
        ret = ret.filter(x => x < Infinity)
      }
      return ret
    },
    onHoverFeature ({ target }) {
      this.highlightFeature(target)
      this.$emit('hoverFeature', target, this)
    },
    onLeaveFeature ({ target }) {
      this.unhighlightFeature(target)
      this.$emit('leaveFeature', target, this)
    },
    highlightFeature (target, style) {
      style = style || {
        opacity: 0.4,
        fillOpacity: 0.08,
        fillColor: '#fe9929',
      }
      // target is a GeoJSON layer
      target.setStyle(style).bringToFront()
      this.hovering = true
      this.lastHoverTarget = target
    },
    unhighlightFeature (target) {
      this.hovering = false
      this.resetStyle(target)
      target.bringToBack()
    },
    /**
     * Find the layer with the same id
     */
    findLayer ({ feature }) {
      // the leaflet geojson object
      let id = feature.id
      let geojson = this.$refs.geojson.$geoJSON
      let leafletId = this.polygonIds[id]
      return geojson.getLayer(leafletId)
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
      this.onMapUpdate(e)
      this.updateTooltip()
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
      if (this.fitting) return;
      let from = this.config
      let to = {
        ...from,
        center: this.getCenter(),
        // handle float precision error
        zoom: this.getZoom()
      }
      this.config.zoom = to.zoom
      this.config.center = to.center
      this.updateURL(to, from)
      this.resetStyle()
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
    if (!this.config.zoom) {
      map.whenReady(() => {
        this.config.center = this.getCenter()
        this.config.zoom = this.getZoom()
      })
    }
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
