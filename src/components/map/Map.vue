<template>
  <div class="vue2leaflet-map">
    <slot></slot>
  </div>
</template>

<script>
import Vue from 'vue'
import L from 'leaflet';

const props = {
  options: {
    type: Object,
    default: () => ({}),
  },
};

export default {
  props: props,
  mounted() {
    const options = this.options;
    this.mapObject = L.map(this.$el, options);
    if (options.bounds) {
      // fit the default bounds
      this.mapObject.fitBounds(options.bounds)
    }
    for (var i = 0; i < this.$children.length; i++) {
      this.$children[i].deferredMountedTo(this.mapObject);
    }
  },
  methods: {
  },
}
</script>

<style type="text/css">
  .vue2leaflet-map {
    height: 100%;
    width: 100%;
  }
</style>

