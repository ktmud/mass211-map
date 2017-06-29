<template>
  <div class="vue2leaflet-map">
    <slot></slot>
  </div>
</template>

<script>
import Vue from 'vue'
import L from 'leaflet';

const props = {
  center: {
    type: [Object, Array],
    custom: true,
    default: undefined,
  },
  bounds: {
    custom: true,
    default: undefined,
  },
  zoom: {
    type: Number,
    default: undefined,
  },
  minZoom: {
    type: Number,
    default: undefined,
  },
  maxZoom: {
    type: Number,
    default: undefined,
  },
  paddingBottomRight: {
    custom: true,
    default: null,
  },
  paddingTopLeft: {
    custom: true,
    default: null
  },
  padding: {
    custom: true,
    default: null
  },
  worldCopyJump: {
    type: Boolean,
    default: false
  },
  crs: {
    custom: true,
    default: () => L.CRS.EPSG3857,
  },
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

