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
            <ais-clear class="el-input__icon is-clickable el-icon-close">
              <template><i class=""></i></template>
            </ais-clear>
            <ais-input
              autofocus
              placeholder="Search 2-1-1 resources..."
              type="text"
              size="48"
              :class-names="{'ais-input': 'el-input__inner'}">
            </ais-input>
          </div>
        </ais-search-box>
        <div class="ais-panel-body">
          <div class="resource-list" v-if="results">
            <m2m-resource-item v-for="(resource, key) in results"
             :key="resource.objectID"
             :resource="resource"
             @click="onClickItem">
            </m2m-resource-item>
          </div>
          <div v-if="!loading && hasMore" class="load-more" v-observe-visibility="loadMore">
            Loading{{ store.neverLoad ? '' : ' more' }}...
          </div>
        </div>
        <div class="ais-panel-footer">
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

const ZOOM_IN_LEVEL = 14;

export default {
  name: 'm2m-resources',
  mixins: [mixins.FullscreenMixin],
  components: {
    'm2m-resource-item': ResourceItem
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
    query() {
      return (this.store.query || '-').replace(/ /g, '+')
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
      this.resetGeoSearch()
      this.$router.push({
        params: {
           query: this.query
        },
      });
    }, 600),
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
    resetGeoSearch () {
      this.store._helper.state.aroundLatLng = undefined
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
          query: this.query || '-',
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
    onClickItem (ctx) {
      let latlng = ctx.resource._geoloc
      latlng = {
        lat: latlng.lat,
        // add some offset because the sidebar take some space
        lng: latlng.lng - 0.01
      }
      this.$refs.map.setView(latlng, ZOOM_IN_LEVEL)
    },
    onLocationFound (e) {
      this.config.center = [e.latitude, e.longitude]
      this.geoSearch()
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
