<template>
  <div class="map-item">
    <div class="map-control map-control--right">
      <el-form inline>
        <el-form-item label="Geographic Level">
          <el-radio-group size="small" v-model="geounit" @change="onControlUpdate">
            <el-radio-button v-for="item in geounits"
              :title="item.desc" :key="item.name" :label="item.name" :value="item.name">
              {{ item.label }}
            </el-radio-button>
          </el-radio-group>
        </el-form-item>
      </el-form>
    </div>
    <div class="map-control">
      <el-form inline>
      <el-form-item label="Select Variable">
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
    </el-form>
    </div>
    <v-map
      ref="map"
      v-loading="loading"
      @l-dragend="onMapUpdate"
      @l-zoomend="onZoomChange"
      :options="mapOptions"
      :zoom="config.zoom" :center="config.center">
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
        <table>
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
import { color as d3color } from 'd3-color'
import { colorize, getTileProvider } from '@/components/utils'
import _ from 'lodash'

export default {
  props: ['config'],
  components: {
  },
  data () {

    return {
      // must be an empty array, otherwise leaflet will complain
      geojson: [],
      loading: true,
      geounits: geounits,
      geounit: this.config.geounit,
      variable: this.config.variable,

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
        // wheelDebounceTime: 20,
        // wheelPxPerZoomLevel: 100,
        zoomControl: false,
        zoomSnap: 0.1,
        zoomDelta: 0.5,
        zoomAnimationThreshold: 6,
        maxBounds: L.latLngBounds(
          L.latLng(43.57649597170367, -67.17797113214105),
          L.latLng(40.584941790941166, -75.74663448277443),
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
      if (!item || !item.feature.properties) return null
      let ret = item.feature.properties
      let prefix = this.geounit == 'zip' ? 'MA' : ''
      let suffix = this.geounit == 'county' ? 'County' : ''
      ret.fullname = `${prefix} ${ret.name} ${suffix}`
      return ret
    },
    fillColor () {
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
    }
  },
  watch: {
    ['config.geounit'] () {
      this.loadPolygons()
    },
    ['config.variable'] () {
      this.checkVariableValidity()
      this.resetStyle()
    }
  },
  methods: {

    loadPolygons () {
      this.loading = true
      getGeoData(this.config.geounit)
        .then(data => {
          this.geojson = data
          this.loading = false
          this.checkVariableValidity()
        })
    },

    checkVariableValidity () {
      if (this.meta.requires && !(this.geounit in this.meta.requires)) {
        this.$message({
          message: 'Variable not supported at this level.',
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
    }, 2000),

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
      this.$refs.map.setBounds(bounds)
    },
    getBounds () {
      return this.$refs.map.mapObject.getBounds()
    },
    setZoom (zoom) {
      this.$refs.map.mapObject.setZoom(zoom)
    },
    getZoom () {
      return this.$refs.map.mapObject.getZoom()
    },
    getCenter (plain=true, round=false) {
      let ret = this.$refs.map.mapObject.getCenter()
      if (plain) {
        if (round) {
          ret = [ret.lat, ret.lng]
        } else {
          ret = [ret.lat.toFixed(10), ret.lng.toFixed(10)]
        }
      }
      return ret
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

    /**
     * Map updated; change location in url
     */
    onMapUpdate: _.debounce(function (e) {
      let from = this.config
      let to = {
        ...from,
        center: this.getCenter(),
        zoom: Math.round(this.getZoom() * 10) / 10
      }
      this.updateURL(to, from)
    }, 200),

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
    }
  },
  mounted () {
    this.loadPolygons()
  }
}
</script>
<style>

</style>
