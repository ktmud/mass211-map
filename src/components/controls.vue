<template>
  <div class="map-control">
    <el-row>
      <el-col :span="24">
        <el-form ref="form" inline>
          <slot></slot>
        </el-form>
      </el-col>
    </el-row>
  </div>
</template>

<script>
import { geounits, getVariables } from '@/api/data'
import router from '@/router'

export default {
  props: ['config'],
  data () {
    return {
      geounit: this.config.geounit,
      variable: this.config.variable,
      geounits: geounits
    }
  },
  computed: {
    variables () {
      // variables list might change based on geounit
      return getVariables(this.geounit)
    }
  },
  methods: {
    updateURL () {
      // if the base map does not change, replace current url, instead of push
      // a new history item
      var from = this.config
      var to = {
        ...from,
        geounit: this.geounit,
        variable: this.variable
      }
      this.$emit('updateURL', to, from)
    }
  }
}
</script>
<style>

</style>
