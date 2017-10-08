<template>
    <v-map ref="map" :options="mapOptions">
        <v-tilelayer :url="tile.url" :attribution="tile.attribution"></v-tilelayer>
        <v-marker-cluster :options="clusterOptions" ref="cluster" style="display:none;">
          <v-marker v-for="(item, index) in markers" ref="markers"
           :icon="markerIcon(item)" :key="item.objectID" :lat-lng="item._geoloc">
              <v-popup class="resource-info"
               :options="{ maxWidth: 320 }">
                <h3>{{ item.name || '[UNKNOWN RESOURCE]' }}</h3>
                <div class="details">
                  <div class="alt-name" v-if="item.name_alt">
                    <em>a.k.a. </em> {{ item.name_alt }}
                  </div>
                  <div class="addr1" v-if="item.address">{{ item.address || '' }}</div>
                  <div class="addr2" v-if="item.zip || item.city">
                    {{ item.city ? item.city + ', ' : '' }} MA {{item.zip || ''}}
                  </div>
                  <div class="website" v-if="item.website">
                    <a :title="item.website" :href="item.website" target="_blank">{{ item.website }}</a>
                  </div>
                </div>
                <ul class="attrs">
                  <li class="desc" v-if="item.desc" v-html="item.desc.replace('\n', '<br>')"></li>
                  <li v-if="item.coverage && item.coverage.length">
                    <strong>Coverage:</strong>
                    {{ item.coverage.join(', ') }}
                  </li>
                  <li class="tags" v-if="item.taxonomy_term && item.taxonomy_term.length">
                    <strong>Services:</strong>
                    <span class="tag" v-for="tag in item.taxonomy_term" :key="tag">
                      {{ tag }}
                    </span>
                  </li>
                </ul>
              </v-popup>
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
    markerIndices () {
      let ret = {}
      this.searchStore.currentResults.forEach((item, i) => {
        ret[item.objectID] = i
      })
      return ret
    },
    markers () {
      return this.searchStore.currentResults
    }
  },
  methods: {
    getMarker (objectID) {
      return this.$refs.markers[this.markerIndices[objectID]]
    },
    openPopup (objectID) {
      let marker = this.getMarker(objectID)
      if (!marker) return
      let cluster = this.$refs.cluster.mapObject
      this.$nextTick(() => {
        let parent = cluster.getVisibleParent(marker.mapObject)
        if (parent && parent.spiderfy) {
          parent.spiderfy()
        }
        marker.mapObject.openPopup()
      })
      return marker
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
