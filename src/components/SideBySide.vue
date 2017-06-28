<template>
  <m2m-single :store="store1"></m2m-single>
  <m2m-single :store="store2"></m2m-single>
</template>

<script>
import Vue from 'vue'
import Map from '@/components/Map'

export default {
  name: 'home',
  data () {
    return {
      config1: null,
      config2: null
    }
  },
  components: {
    'm2m-single': Single
  },
}
</script>
<style>

</style>
