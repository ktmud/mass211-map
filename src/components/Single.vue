<template>
  <div class="map-item">
    <m2m-control class="map-control--right">
      <el-form-item label="">
        <el-radio-group size="small" v-model="geounit" @change="onControlUpdate">
          <el-radio-button v-for="item in geounits"
            :title="item.desc" :key="item.name" :label="item.name" :value="item.name">
            {{ item.label }}
          </el-radio-button>
        </el-radio-group>
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
    <!-- Sync move -->
    <div class="map-control-wrap map-control--right map-control--row2">
      <m2m-control v-if="totalMaps > 1">
          <el-form-item class="el-form-item--hover-label" label="Sync">
            <el-switch on-text="ON" off-text="OFF" v-model="syncMove"></el-switch>
          </el-form-item>
      </m2m-control>
      <m2m-control class="map-number-control">
        <el-button v-if="totalMaps > 1" title="Remove current pane" @click="removeSelf" size="small">
          <i class="el-icon-close"></i>
        </el-button><el-button v-if="totalMaps < 4" title="Add a map pane" @click="addSibling" size="small">
          <i class="el-icon-plus"></i>
        </el-button>
      </m2m-control>
    </div>
    <v-map ref="map" v-loading="loading" :options="mapOptions">
      <v-tilelayer :url="tile.url" :attribution="tile.attribution"></v-tilelayer>
      <v-geojson-layer ref="geojson" :geojson="geojson" :options="geojsonOptions"></v-geojson-layer>
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
      <div class="map-legend" v-if="!loading">
        <h5>{{ meta.legend || meta.label }}</h5>
        <table v-if="legendColors">
          <tr v-for="(item, index) in legendColors" :key="index">
            <td class="color">
              <i :style="'background-color: ' + item.color"></i>
            </td>
            <td class="label" v-html="item.label">
            </td>
          </tr>
        </table>
        <p class="note" v-if="meta.desc" v-html="meta.desc"></p>
      </div>
    </v-map>
  </div>
</template>

<script>
import {
  geounits, getVariables,
  getGeoData, findVariable, getFormat
} from '@/components/api'
import MapControl from "./control"
import VMap from "./map"
import { color as d3color } from 'd3-color'
import { colorize, getTileProvider } from '@/components/utils'
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
      loading: true,
      geounits: geounits,

      tile: getTileProvider(),

      lastBounds: null,
      lastClickTarget: null,
      lastHoverTarget: null,
      hovering: false,
      // whether zoomed big enough
      // that the tooltip should be expanded
      // mode
      bigMode: this.config.zoom > this.ZOOM_BIG,

      // whether to sync moves between different maps
      syncMove: true,

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
      return findVariable(this.config.variable)
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
    }
  },
  watch: {
    ['config.geounit'] () {
      this.loadPolygons()
    },
    ['config.variable'] () {
      this.checkVariableValidity()
      this.resetStyle()
    },
    ['config.center'] (to) {
      this.updateView()
    },
    ['config.zoom'] (to) {
      this.updateView()
    },
  },
  methods: {

    loadPolygons () {
      this.loading = true
      getGeoData(this.geounit)
        .then(data => {
          this.geojson = data
          this.loading = false
          this.checkVariableValidity()
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
      return item.name
    },
    fullTooltip (item) {
      const format = (name) => {
        return getFormat(name)(item[name])
      }
      return `<div class="item-detail">
            <h4>${item.name}</h4>
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
    updateTooltip: _.debounce(function () {
      let update = false
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
      if (this.syncMove) {
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
  mounted () {
    let map = this.mapObject

    // add zoom controls
    L.control.zoom({ position: 'bottomright' }).addTo(map)

    map.on('dragend', (e) => this.onMapUpdate(e))
    map.on('zoomend', (e) => this.onZoomChange(e))
    map.on('mosuemove', (e) => this.onMove(e))

    this.loadPolygons()
  }
}
</script>
<style>

</style>
