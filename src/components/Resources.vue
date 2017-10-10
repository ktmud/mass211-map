<template>
  <ais-index :search-store="store" :query="config.query">
    <div class="map-container">
      <div class="map-control ais-panel" :class="foldPanel ? 'folded' : ''">
        <el-tooltip :content="tooltipContent"
          :disabled="!showTogglerTooltip"
          transition="none"
          placement="right"
          ref="togglerTooltip"
        >
          <div class="ais-panel-toggler" @click="onClickToggler">
            <i class="el-icon-caret-left"></i>
            <i class="el-icon-caret-right"></i>
          </div>
        </el-tooltip>
        <ais-search-box>
          <div class="el-input">
            <button type="submit" class="el-input__icon el-icon-search is-clickable"></button>
            <ais-clear
             class="el-input__icon is-clickable el-icon-close"
            >
              <template><i class=""></i></template>
            </ais-clear>
            <ais-input></ais-input>
          </div>
        </ais-search-box>
        <div class="ais-panel-body">
          <div class="resource-list" v-if="results">
            <m2m-resource-item v-for="(resource, index) in results"
             :key="index" :resource="resource" @click="onClickItem">
            </m2m-resource-item>
          </div>
          <div v-if="!loading && hasMore" class="load-more" v-observe-visibility="loadMore">
            Loading{{ store.neverLoad ? '' : ' more' }}...
          </div>
        </div>
        <div class="ais-panel-footer">
          <span class="total" v-if="!store.neverLoad">
            <span class="current" v-if="total">
              {{ store.currentResults.length }} of
            </span>
            {{ total }} sites
          </span>
          <ais-powered-by></ais-powered-by>
        </div>
      </div>
      <div class="map-item">
        <m2m-resource-map ref="map" :config="config"
          @updateURL="updateURL"
          @locationfound="onLocationFound"
        ></m2m-resource-map>
      </div>
    </div>
  </ais-index>
</template>

<script>
import * as mixins from '@/api/mixins'
import { searchStore } from '@/api/algolia'
import { encodeLocation } from '@/router'
import ResourceItem from '@/components/resource/Item'
import _ from 'lodash'

const ZOOM_IN_LEVEL = 12

export default {
  name: 'm2m-resources',
  mixins: [mixins.FullscreenMixin],
  components: {
    'm2m-resource-item': ResourceItem,
  },
  props: {
    config: { type: Object, },
  },
  data () {
    let store = searchStore()
    store.neverLoad = true
    return {
      store,
      tooltipContent: 'Collapse side panel',
      foldPanel: false,
      showTogglerTooltip: true,
      loading: true,
    }
  },
  computed: {
    /**
     * Search keyword
     */
    query () {
      return this.store.query
    },
    queryInURL () {
      return (this.store.query || '-').replace(/ /g, '+')
    },
    total () {
      return this.store.totalResults
    },
    zoom () {
      return this.config.zoom
    },
    hasMore() {
      return this.store.totalPages > this.store.page
    },
    page() {
      return this.store.page
    },
    results() {
      return this.store.currentResults
    },
  },
  watch: {
    'store.query': _.debounce(function() {
      this.updateQueryInURL()
      this.resetResultsScroll()
    }, 350),
    // 'config.center': _.debounce(function() {
    //   if (this.zoom > 10) {
    //     this.geoSearch()
    //   } else {
    //     this.resetGeoSearch()
    //   }
    // }, 600)
  },
  methods: {
    loadMore: _.debounce(function (isVisible) {
      if (isVisible && this.store.totalPages > this.store.page) {
        this.store.page++;
      }
    }, 100),
    /**
     * Perform a geo search based on map center
     */
    geoSearch () {
      let store = this.store
      let latlngstr = this.config.center.join(', ')
      store.stop()
      store.currentQuery = latlngstr
      store._helper.state.aroundLatLng = latlngstr
      store.start()
      store.refresh()
    },
    resetGeoSearch (force) {
      if (force || !this.isNearbyOn()) {
        this.store._helper.state.aroundLatLng = undefined
      }
    },
    resetResultsScroll () {
      this.$el.querySelector('.ais-panel-body').scrollTop = 0
    },
    updateQueryInURL () {
      this.resetGeoSearch()
      this.$router.push({
        params: {
           query: this.queryInURL
        },
      })
    },
    updateURL (to, from, ctx) {
      let method = 'replace'
      if (to.query != from.query ||
          !_.isEqual(to.queryParameters, from.queryParameters)) {
        method = 'push'
      }
      let queryParameters = {...this.store.queryParameters}
      let route = {
        name: this.$route.name,
        params: {
          query: this.queryInURL || '-',
          location: encodeLocation(to.center, to.zoom)
        },
        query: this.$route.query
      }
      this.$router[method](route)
    },
    onClickToggler () {
      this.foldPanel = !this.foldPanel
      this.$refs.togglerTooltip.showPopper = false;
      this.$nextTick(() => {
        this.tooltipContent = this.foldPanel ? 'Expand side panel' : 'Collapse side panel'
      })
    },
    getPopupHeight (marker) {
      let el = marker._popup._content
       // default height is 320, add +40 for the ref count ribbon and the margin
      let height = el._height || ((el.clientHeight || 320) + 40)
      el._height = height
      return height
    },
    onClickItem (ctx) {
      let $map = this.$refs.map, map = $map.mapObject
      let objectID = ctx.resource.objectID
      let $marker = $map.getMarker(objectID)
      if (!$marker) return
      let latlng = $marker.mapObject.getLatLng()
      latlng = {
        lat: latlng.lat,
        // add some offset because the sidebar take some space
        lng: latlng.lng
      }
      let zoom = Math.max(ZOOM_IN_LEVEL, map.getZoom() || ZOOM_IN_LEVEL)
      let curpoint = map.project(map.getCenter(), zoom)  // current point
      let point = map.project(latlng, zoom)  // target point
      let halfHeight = this.getPopupHeight($marker.mapObject) / 2
      point = point.subtract([175, halfHeight])  // offset by the sidebar width and popup height
      latlng = map.unproject(point, zoom)
      if (point.distanceTo(curpoint) < 600) {
        map.setView(latlng, zoom)
      } else {
        map.flyTo(latlng, zoom, {
          duration: 0.7,
        })
      }
      map.once('moveend', () => {
        setTimeout(() => {
          $map.openPopup(objectID) // vue components
        }, 50)
      })
    },
    onLocationFound (e) {
      this.config.center = [e.latitude, e.longitude]
      this.geoSearch()
    },
    isNearbyOn () {
      return this.$refs.map.isNearbyOn()
    }
  },
  mounted () {
    // this.geoSearch()
    this.store._helper.on('search', (e) => {
      this.loading = true
    })
    this.store._helper.on('result', (e) => {
      this.store.neverLoad = false
      setTimeout(() => (this.loading = false), 100)
    })
  }
}
</script>

<style scoped>

</style>
