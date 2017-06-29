<template>
  <div class="map-container" :class="extraClass">
    <m2m-map v-for="config in configs"
      :class="'map-' + config.id"
      :config="config" :key="config.id"
      :total-maps="configs.length"
      @syncMove="syncMove"
      @updateURL="updateURL"
      @addSibling="addItem"
      @removeSelf="removeItem"
      ></m2m-map>
  </div>
</template>

<script>
import Single from '@/components/Single'
import bus from '@/components/bus'
import router, { parseParams, encodeConfigs } from '@/router'

export default {
  name: 'm2m-main',
  components: {
    'm2m-map': Single
  },
  computed: {
    extraClass () {
      // sbs-3 -> side-by-side-3-maps
      return `sbs-${(this.configs || []).length}`
    }
  },
  data () {
    return {
      configs: []
    }
  },
  methods: {
    readParams (route) {
      this.configs = this.parseParams(route)
    },

    parseParams (route) {
      return parseParams(route || this.$route)
    },

    updateURL (to, from, ctx) {
      let configs = [...this.configs]

      if (ctx.settings.syncMove) {
        configs = configs.map(item => {
          return {
            ...item,
            // cannot use ...to here because not all
            // states in config is syncable
            // only geounit and map location state are
            geounit: to.geounit,
            zoom: to.zoom,
            center: to.center
          }
        })
      }
      // will need this to update current pane's
      // variable name
      configs[to.id] = { ...from, ...to }

      this.updateRoute(configs)
    },

    /**
     * Update current URL.
     * url should be the only source of truth.
     */
    updateRoute (configs, method="replace") {
      let route = {
        params: encodeConfigs(configs)
      }
      router[method](route)
    },

    syncMove (e, ctx) {
      // don't do real time sync
      // if there are too many children
      // if (this.configs.length > 2) {
      //   return;
      // }
      let id = ctx.config.id
      let center = e.target.getCenter()
      let zoom = e.target.getZoom()
      this.$children.forEach(item => {
        if (item === ctx) return
        item.setView(center, zoom, { animate: false })
      })
    },

    addItem (ctx) {
      let config = ctx.config
      // clone a new configs list
      let configs = [...this.configs]
      // clone current configs
      configs.splice(ctx.config.id, 0, ctx.config)
      this.updateRoute(configs)
    },

    removeItem (ctx) {
      let configs = this.configs.filter(item => {
        return item.id != ctx.config.id
      })
      this.updateRoute(configs)
    }

  },

  created () {
    this.readParams()
  },
  watch: {
    '$route': function(to, from) {
      let toConfigs = this.parseParams(to)
      let fromConfigs = this.parseParams(from)

      // update configs
      this.configs = toConfigs

      if (fromConfigs.length != toConfigs.length) {
        this.$children.forEach(item => {
          item.redraw()
        })
      }
    }
  },
  mounted () {
  },
}
</script>
