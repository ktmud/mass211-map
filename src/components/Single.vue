<template>
  <div class="map-item">
    <div class="map-control-wrap">
      <m2m-control class="map-control">
        <el-form-item label="" class="select-geounit">
          <el-select size="small" v-model="geounit" @change="onControlUpdate">
            <el-option v-for="item in geounits"
              :title="item.desc" :key="item.name" :label="item.label" :value="item.name">
              {{ item.label }}
            </el-option>
          </el-select>
        </el-form-item>
      </m2m-control>
      <m2m-control>
        <el-form-item>
          <el-select class="select-variable" v-model="variable" filterable size="small"
            @change="onControlUpdate" placeholder="Type to search">
            <el-option-group v-for="group in variables"
              :key="group.label" :label="group.label">
              <el-option v-for="item in group.options" :key="item.name"
                :label="item.label" :value="item.name">
              </el-option>
            </el-option-group>
          </el-select>
        </el-form-item>
      </m2m-control>
    </div>
    <!-- Sync move -->
    <div class="map-control-wrap map-control--right">
      <m2m-control class="map-control-padded" v-if="settings && totalMaps > 1">
          <el-form-item class="el-form-item--hover-label" label="Sync">
            <el-switch on-text="" off-text="" v-model="settings.syncMove"></el-switch>
          </el-form-item>
      </m2m-control>
      <m2m-control class="map-number-control">
        <el-button v-if="totalMaps > 1" title="Remove current pane" @click="removeSelf" size="small">
          <i class="el-icon-close"></i>
        </el-button>
        <el-tooltip v-if="totalMaps == 1" content="Add a new map pane">
          <el-button title="Add a map pane" @click="addSibling" size="small">
            <i class="el-icon-plus"></i>
          </el-button>
        </el-tooltip>
        <el-button v-if="totalMaps > 1 && totalMaps < 4" title="Add a map pane" @click="addSibling" size="small">
          <i class="el-icon-plus"></i>
        </el-button>
      </m2m-control>
    </div>
    <v-map ref="map" v-loading="loading" :options="mapOptions">
      <v-tilelayer :url="tile.url" :attribution="tile.attribution"></v-tilelayer>
      <v-geojson-layer ref="geojson" :geojson="geojson" :options="geojsonOptions"></v-geojson-layer>
      <!--
      <div class="map-info-wrap">
        <div class="map-info" v-if="infoItem">
          <strong class="item-name">
            {{ infoItem.fullname }}
          </strong>
          -
          <strong>{{ format(infoItem[this.variable]) }}</strong>
          <span class="item-units" v-html="meta.units"></span>
        </div>
      </div>
      -->
      <div class="map-control map-legend" v-if="!loading">
        <div class="m2m-zoom-toggler" @click="settings.showLegend = !settings.showLegend">
         <i class="el-icon-arrow-up"></i>
        </div>
        <el-collapse-transition>
        <div class="m2m-zoom-elem" v-show="settings.showLegend">
          <h5>{{ meta.legend || meta.label }}</h5>
          <table v-if="legendColors">
            <tr v-for="(item, index) in legendColors" :key="index">
              <td class="color">
                <i class="legend-box" :style="'background-color: ' + item.color"></i>
              </td>
              <td class="label" v-html="item.label">
              </td>
            </tr>
          </table>
          <p class="note" v-if="meta.desc" v-html="meta.desc"></p>
        </div>
        </el-collapse-transition>
      </div>
    </v-map>
  </div>
</template>

<script>
import {
  geounits, getVariables,
  getGeoData, findVariable, getFormat,
  settings
} from '@/components/api'
import MapControl from "./control"
import VMap from "./map"
import { color as d3color } from 'd3-color'
import { colorize, getTileProvider } from '@/components/utils'
import router from '@/router'
import _ from 'lodash'

export default {
  props: ['config', 'total-maps'],
  components: {
    "m2m-control": MapControl,
    'v-map': VMap,
  },
  data () {

    return {
      // must be an empty array, otherwise leaflet will complain
      geojson: [],
      geojsonLoading: true,
      geounits: geounits,

      // persistent settings
      // (stored locally instead on in url)
      settings: {
        // whether to sync moves between different maps
        syncMove: true,
        // whether to show legend
        showLegend: this.totalMaps <= 3,
        loading: true
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
        wheelDebounceTime: 100,
        // wheelPxPerZoomLevel: 100,
        zoomControl: false,
        zoomSnap: 0.1,
        zoomDelta: 0.5,
        zoomAnimationThreshold: 6,
        maxBounds: L.latLngBounds(
          L.latLng(43.7314, -68.5437),
          L.latLng(40.4887, -75.1245),
        )
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

    ZOOM_BIG () {
      if (this.geounit == 'county') {
        return 9.5
      }
      return 10
    },

    updateView () {
      return _.debounce(function () {
        this.setView(this.config.center, this.config.zoom)
      }, 10)
    },

    geounit: {
      get () {
        return this.config.geounit
      },
      set (val) {
        this.config.geounit = val
      }
    },

    variable: {
      get () {
        return this.config.variable
      },
      set (val) {
        this.config.variable = val
      }
    },

    variableAvail () {
      return !this.meta.requires|| (this.geounit in this.meta.requires)
    },

    /**
     * The variables based on geounit
     */
    variables () {
      return getVariables(this.geounit)
    },

    strokeColor () {
      return (item) => {
        return d3color(this.fillColor(item)).darker(1)
      }
    },
    /**
     * The meta data of current variable
     */
    meta () {
      return findVariable(this.variable)
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
      var variable = this.config.variable
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
      if (!this.variableAvail) {
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
      return this.geojsonLoading || this.settings.loading;
    },
  },
  watch: {
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
        this.settings.loading = false;
      }, err => {
        this.settings.loading = false;
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
          this.$message('Invalid URL provided');
          setTimeout(() => {
            router.replace('/')
          }, 300)
        })
    },

    checkVariableValidity () {
      if (!this.variableAvail) {
        this.$message({
          message: 'Variable not supported at this level.',
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
    setBounds (bounds) {
      this.mapObject.fitBounds(bounds)
    },
    getBounds () {
      return this.mapObject.getBounds()
    },
    setZoom (zoom) {
      this.mapObject.setZoom(zoom)
    },
    getZoom () {
      return this.mapObject.getZoom()
    },
    getCenter (target=null) {
      return (target || this.mapObject).getCenter()
    },
    panTo (...args) {
      this.mapObject.panTo(...args)
    },
    setView (...args) {
      this.mapObject.setView(...args)
    },
    redraw () {
      this.mapObject._onResize()
    },

    /**
     * Get the values stored in geojson features
     */
    getGeoVals (variable, removeNA=true) {
     variable = variable || this.config.variable
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
        zoom: Math.round(this.getZoom() * 10) / 10
      }
      this.updateURL(to, from)
    }, 400),

    onControlUpdate (e) {
      var from = this.config
      var to = {
        ...from,
        geounit: this.geounit,
        variable: this.variable
      }
      this.updateURL(to, from)
    },

    /**
     * Move map will update the url
     */
    updateURL (to, from) {
      this.$emit('updateURL', to, from, this)
    },

    addSibling (to, from) {
      this.$emit('addSibling', this)
    },

    removeSelf (to, from) {
      this.$emit('removeSelf', this)
    }

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

    this.loadPolygons()
  }
}
</script>
<style>

</style>
