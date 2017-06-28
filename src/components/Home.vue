<template>
  <div class="welcome">
    This is the home page.
  </div>
</template>

<script>
import Vue from 'vue'
import Single from '@/components/Single'

export default {
  name: 'home',
  components: {
    'm2m-single': Single
  },
}
</script>

<style lang="sass">
body, html, .map
  position: relative;
  width: 100%;
  height: 100%;
</style>
