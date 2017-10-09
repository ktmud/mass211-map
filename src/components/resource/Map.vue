<template>
    <v-map ref="map" :options="mapOptions">
        <v-tilelayer :url="tile.url" :attribution="tile.attribution"></v-tilelayer>
        <v-marker-cluster :options="clusterOptions" ref="cluster" style="display:none;">
          <v-marker v-for="(resource, index) in markers" ref="markers"
           :icon="markerIcon(resource)" :key="resource.objectID" :lat-lng="resource._geoloc">
              <v-popup class="resource-info"
               :options="{ maxWidth: 320 }">
                <h3>{{ resource.name || '[UNKNOWN RESOURCE]' }}</h3>
                <div class="details">
                  <div class="alt-name" v-if="resource.name_alt">
                    <em>a.k.a. </em> {{ resource.name_alt }}
                  </div>
                  <div class="addr1" v-if="resource.address">{{ resource.address || '' }}</div>
                  <div class="addr2" v-if="resource.zip || resource.city">
                    {{ resource.city ? resource.city + ', ' : '' }} MA {{resource.zip || ''}}
                  </div>
                  <div class="website" v-if="resource.website">
                    <a :title="resource.website" :href="resource.website" target="_blank">{{ resource.website }}</a>
                  </div>
                </div>
                <div class="referral-count" v-if="resource.n_call">
                    <strong>{{ formatBigNum(resource.n_call) }}</strong> <em>referrals per year</em>
                </div>
                <ul class="attrs">
                  <li class="desc" v-if="resource.desc" v-html="resource.desc.replace('\n', '<br>')"></li>
                  <li v-if="resource.coverage && resource.coverage.length">
                    <strong>Coverage:</strong>
                    {{ resource.coverage.join(', ') }}
                  </li>
                  <li class="tags" v-if="resource.taxonomy_term && resource.taxonomy_term.length">
                    <strong>Services:</strong>
                    <span class="tag" v-for="tag in resource.taxonomy_term" :key="tag">
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
import { formatBigNum, ICON_DEFAULT, TOPIC_ICON } from '@/api/data'

import {
  getTileProvider,
  MAX_BOUNDS, MAX_ZOOM, DEFAULT_BOUNDS
} from '@/api/data'

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
        maxClusterRadius: 50,
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
    },
    formatBigNum: formatBigNum
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
