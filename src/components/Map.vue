<template>
  <v-map
    v-loading="loading"
    @l-dragend="onMapUpdate"
    @l-zoomend="onMapUpdate"
    :options="mapOptions"
    :zoom="config.zoom" :center="config.center">
    <v-tilelayer :url="tile.url" :attribution="tile.attribution"></v-tilelayer>
    <v-geojson-layer ref="geojson" :geojson="geojson" :options="geojsonOptions"></v-geojson-layer>
    <div class="map-info" v-if="infoItem">
      <strong class="item-name">
        {{ infoItem.name }}
      </strong>
      -
      <strong>{{ format(infoItem[this.variable.name]) }}</strong>
      <span class="item-units" v-html="variable.units"></span>
    </div>
    <div class="map-legend" v-if="!loading">
      <h5>{{ variable.legend || variable.label }}</h5>
      <table>
        <tr v-for="(item, index) in legendColors" :key="index">
          <td class="color">
            <i :style="'background-color: ' + item.color"></i>
          </td>
          <td class="label" v-html="item.label">
          </td>
        </tr>
      </table>
      <p class="note" v-if="variable.desc" v-html="variable.desc"></p>
    </div>
  </v-map>
</template>

<script>
import { getGeoData, findVariable, getFormat } from '@/components/api'
import { color as d3color } from 'd3-color'
import { colorize, getTileProvider } from '@/components/utils'
import _ from 'lodash'

export default {
  props: ['config'],
  data () {
    return {
      // must be an empty array, otherwise leaflet will complain
      geojson: [],
      loading: true,
      tile: getTileProvider(),
      lastClickTarget: null,
      lastHoverTarget: null,
      mapOptions: {
        // wheelDebounceTime: 20,
        // wheelPxPerZoomLevel: 100,
        zoomControl: false,
        zoomSnap: 0.1,
        zoomDelta: 0.5
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
             layer.on({
               mouseover: this.highlightFeature,
               mouseout: this.resetHighlight,
               click: this.zoomToFeature
             });
           }
        }
      },
    }
  },
  computed: {
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
      var unit = this.variable.unit || ''
      var format = getFormat(this.variable, this.vals)
      return (val) => {
        return format(val)
      }
    },
    infoItem () {
      let item = this.lastHoverTarget
      if (!item || !item.feature.properties) return null
      return item.feature.properties
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
          label: this.format(val) + ' ' + this.variable.unitsShort,
          value: val
        }
      })
      return colors
    }
  },
  methods: {
    loadPolygons () {
      this.loading = true
      getGeoData(this.config.geounit)
        .then(data => {
          this.geojson = data
          this.loading = false
        })
    },
    resetStyle (target) {
      if (target) {
        this.$refs.geojson.$geoJSON.resetStyle(target)
      } else {
        this.$refs.geojson.$geoJSON.setStyle(this.geojsonOptions.style)
      }
      this.resetHoverTarget()
    },
    resetHoverTarget: _.debounce(() => {
      this.lastHoverTarget = null
    }, 200),
    zoomIn (target) {
      this.setBounds(target.getBounds())
    },
    zoomOut () {
      this.setZoom(8.8)
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
    highlightFeature (e) {
      var layer = e.target;
      layer.setStyle({
        opacity: 0.4,
        fillOpacity: 0.08,
        fillColor: '#fe9929',
      })
      this.lastHoverTarget = layer
    },
    resetHighlight (e) {
      this.resetStyle(e.target)
    },
    zoomToFeature (e) {
      if (e.target == this.lastClickTarget) {
        this.zoomOut()
      } else {
        this.lastClickTarget = e.target
        this.zoomIn(e.target)
      }
    },
    onZoomStart (e) {
      clearTimeout(t_zoom)
    },
    /**
     * Map updated; change location in url
     */
    onMapUpdate (e) {
      let from = this.config
      let to = {
        ...from,
        center: this.getCenter(),
        zoom: Math.round(this.getZoom() * 10) / 10
      }
      this.updateURL(to, from)
    },
    onControlUpdate (e) {
      var from = this.config
      var to = {
        ...from,
        geounit: this.geounit,
        variable: this.variable
      }
      this.$emit('updateURL', to, from)
    },
  },
}
</script>
<style>

</style>
