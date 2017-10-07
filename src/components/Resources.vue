<template>
  <ais-index :search-store="searchStore">
    <div class="map-container">
      <div class="map-control">
        <ais-search-box>
          <div class="el-input">
            <ais-input
              placeholder="Search resource by name or service types..."
              size="48"
              :class-names="{'ais-input': 'el-input__inner'}">
            </ais-input>
          </div>
          <!-- /input-group -->
        </ais-search-box>
      </div>
      <div class="map-item">
        <m2m-resource-map></m2m-resource-map>
      </div>
    </div>
  </ais-index>
</template>

<script>
import * as mixins from '@/api/mixins'
import { searchStore } from '@/api/algolia'

export default {
  name: 'm2m-resources',
  mixins: [mixins.FullscreenMixin],
  data () {
    return {
      searchStore,
      loading: true,
    }
  },
  computed: {
    /**
     * Search keyword
     */
    query() {
      return this.searchStore.query
    },
  }
}
</script>

<style scoped>

</style>
