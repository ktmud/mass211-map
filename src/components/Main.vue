<template>
  <div class="map-container" :class="extraClass">
    <m2m-map v-for="config in configs"
      :class="'map-' + config.id"
      :config="config" :key="config.id"
      @updateURL="updateURL"
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
      this.configs = parseParams(route || this.$route)
    },
    updateURL (to, from, ctx) {
      let configs = [...this.configs]
      configs[to.id] = { ...from, ...to }
      let route = {
        name: 'main',
        params: encodeConfigs(configs)
      }
      let method = 'replace'
      router[method](route)
    }
  },
  created () {
    this.readParams()
  },
  watch: {
    '$route': function(to, from) {
      this.readParams(to)
    }
  },
  mounted () {
  },
}
</script>
