<template>
    <v-map ref="map" :options="mapOptions">
        <v-tilelayer :url="tile.url" :attribution="tile.attribution">
        </v-tilelayer>
        <v-marker-cluster>
          <v-marker v-for="(item, index) in markers" :key="index" :lat-lng="item.latlng">
              <v-popup :content="item.tooltipContent"></v-popup>
          </v-marker>
        </v-marker-cluster>
    </v-map>
</template>

<script>
import { Component } from 'vue-instantsearch';

import {
  getTileProvider,
  MAX_BOUNDS, MAX_ZOOM, DEFAULT_BOUNDS
} from '@/api/data'

export default {
  name: 'm2m-resource-map',
  mixins: [Component],
  data () {
    return {
      tile: getTileProvider(),
      mapOptions: {
        bounds: DEFAULT_BOUNDS,
        wheelDebounceTime: 100,
        // wheelPxPerZoomLevel: 100,
        zoomControl: false,
        zoomSnap: 0.1,
        zoomDelta: 0.5,
        maxZoom: MAX_ZOOM,
        zoomAnimationThreshold: 6,
        maxBounds: MAX_BOUNDS,
      },
    }
  },
  computed: {
    markers () {
      let results = this.searchStore.results
      return results.map(item => {
        let geoloc = item._geoloc
        if (typeof item.taxonomy_term == 'string') {
          item.taxonomy_term = [item.taxonomy_term]
        }
        if (typeof item.coverage == 'string') {
          item.coverage = [item.coverage]
        }
        return {
          'tooltipContent': this.tooltipContent(item),
          // 'address': item.address,
          // 'name': item.name,
          // 'name_alt': item.name_alt,
          // 'website': item.website,
          // 'zip': item.zip,
          // 'coverage': item.coverage,
          'taxonomy_term': item.taxonomy_term,
          'latlng': [geoloc.lat, geoloc.lng]
        }
      })
    }
  },
  methods: {
    tooltipContent(item) {
      let website = '', name_alt = '', coverage = '', tags = ''
      if (item.website) {
        website = `<div class="website"><a title="${item.website}" href="${item.website}">${item.website}</a></div>`
      }
      if (item.name_alt) {
        name_alt = `<div class="alt-name">${item.name_alt ? 'a.k.a: ' + item.name_alt : ''}</div>`
      }
      if (item.coverage) {
        coverage = `<li class="coverage"><strong>Coverage:</strong> ${item.coverage.join(', ')}</li>`
      }
      if (item.taxonomy_term) {
        let iblock = (x) => {
          return `<span class="tag">${x}</span>`
        }
        tags = `<li class="tags"><strong>Services:</strong> ${item.taxonomy_term.map(iblock).join(', ')}</li>`
      }
      return `<div class="marker-tooltip">
        <h3>${item.name || '[UNKNOWN RESOURCE]'}</h3>
        <div class="details">
          ${name_alt}
          <div class="addr1">${item.address || ''}</div>
          <div class="addr2">${item.city || '{City}'} MA, ${item.zip || ''}</div>
          ${website}
        </div>
        <ul class="attrs">
          ${tags}
        </ul>
      </div>`
    }
  }
}
</script>

<style>

</style>
