<template>
    <v-map ref="map" :options="mapOptions">
        <v-tilelayer :url="tile.url" :attribution="tile.attribution">
        </v-tilelayer>
        <v-marker-cluster :options="clusterOptions">
          <v-marker v-for="(item, index) in markers"
           :icon="item.icon"
           :key="index" :lat-lng="item.latlng">
              <v-popup :content="item.tooltipContent"></v-popup>
          </v-marker>
        </v-marker-cluster>
    </v-map>
</template>

<script>
import { Component } from 'vue-instantsearch'
import { MapMixin } from '@/api/mixins'

import {
  getTileProvider,
  MAX_BOUNDS, MAX_ZOOM, DEFAULT_BOUNDS
} from '@/api/data'

const ICON_DEFAULT = ['md-home', 'blue']
const TOPIC_ICON = {
  'food/cloth': ['md-pizza', 'orange'],
  'legal': ['md-filing', 'blue'],
  'health': ['md-medical', 'red'],
  'care/companion': ['md-person', 'lightgray'],
  'community': ['md-people', 'darkpurple'],
  'income': ['md-cash', 'green'],
  'childcare': ['md-ionitron', 'pink'],
  'education': ['md-school', 'blue'],
  'homeless': ['md-umbrella', 'purple'],
}
const DEFAULT_CENTER = [42.01339313, -72.35770328]

export default {
  name: 'm2m-resource-map',
  mixins: [Component, MapMixin],
  data () {
    return {
      tile: getTileProvider(),
      mapOptions: {
        center: this.config.center || DEFAULT_CENTER,
        zoom: this.config.zoom || 8.6,
        wheelDebounceTime: 100,
        // wheelPxPerZoomLevel: 100,
        zoomControl: false,
        zoomSnap: 0.1,
        zoomDelta: 0.5,
        maxZoom: MAX_ZOOM,
        zoomAnimationThreshold: 6,
        maxBounds: MAX_BOUNDS,
      },
      clusterOptions: {
        spiderfyOnMaxZoom: true,
        // disableClusteringAtZoom: 16,
      }
    }
  },
  computed: {
    mapObject () {
      return this.$refs.map.mapObject
    },
    markers () {
      let results = this.searchStore.currentResults
      return results.map(item => {
        let geoloc = item._geoloc
        return {
          'tooltipContent': this.tooltipContent(item),
          'icon': this.markerIcon(item),
          // 'address': item.address,
          // 'name': item.name,
          // 'name_alt': item.name_alt,
          // 'website': item.website,
          // 'zip': item.zip,
          // 'coverage': item.coverage,
          // 'taxonomy_term': item.taxonomy_term,
          'latlng': [geoloc.lat, geoloc.lng]
        }
      })
    }
  },
  methods: {
    tooltipContent(item) {
      let website = '', name_alt = '', coverage = '', tags = '', desc = ''
      if (item.website) {
        website = `<div class="website"><a title="${item.website}" href="${item.website}">${item.website}</a></div>`
      }
      if (item.name_alt) {
        name_alt = `<div class="alt-name">${item.name_alt ? 'a.k.a: ' + item.name_alt : ''}</div>`
      }
      if (item.coverage) {
        coverage = `<li class="coverage"><strong>Coverage:</strong> ${item.coverage.join(', ')}</li>`
      }
      if (item.desc) {
        desc = `<li class="desc"><strong>Intro:</strong> ${item.desc.replace('\n', '<br>')}</li>`
      }
      if (item.taxonomy_term) {
        let iblock = (x) => {
          return `<span class="tag">${x}</span>`
        }
        tags = `<li class="tags"><strong>Services:</strong> ${item.taxonomy_term.map(iblock).join(' ')}</li>`
      }
      return `<div class="resource-info">
        <h3>${item.name || '[UNKNOWN RESOURCE]'}</h3>
        <div class="details">
          ${name_alt}
          <div class="addr1">${item.address || ''}</div>
          <div class="addr2">${item.city || '{City}'}, MA ${item.zip || ''}</div>
          ${website}
        </div>
        <ul class="attrs">
          ${desc}
          ${coverage}
          ${tags}
        </ul>
      </div>`
    },
    markerIcon (item) {
      let [name, color] = this.markerIconInfo(item)
      return L.AwesomeMarkers.icon({
        icon: name,
        prefix: 'ion',
        markerColor: color
      });
    },
    markerIconInfo (item) {
      for (var i = 0; i < item.topic.length; i++) {
        var topic = item.topic[i]
        if (topic in TOPIC_ICON) return TOPIC_ICON[topic]
      }
      return ICON_DEFAULT
    }
  },
  mounted () {
    let map = this.mapObject
    // add zoom controls
    L.control.zoom({ position: 'bottomright' }).addTo(map)
    L.control.locate({
      position: 'topright',
      icon: 'icon ion-ios-locate-outline',
      iconLoading: 'el-icon-loading'
    }).addTo(map);
    map.on('locationfound', (e) => this.$emit('locationfound', e))
    map.on('dragend', (e) => this.onMapUpdate(e))
    map.on('zoomend', (e) => this.onZoomChange(e))
  }
}
</script>

<style>

</style>
