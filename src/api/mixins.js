/*
 * mixins.js
 * Copyright (C) 2017 Jesse Yang <hello@yjc.me>
 */
import {addClass, removeClass} from './utils'
import _ from 'lodash'

export const MapMixin = {
  props: {
    config: {
      type: Object,
      default () {
        return {
        }
      },
    },
  },
  computed: {
    /**
     * Current zoom level (as seen in the config object)
     * only updates after the URL is updated
     */
    zoom () {
      return this.config.zoom
    },
    isZoomedIn () {
      return this.zoom > this.ZOOM_BIG
    },
    mapObject () {
      return this.$refs.map.mapObject
    },
    /**
     * Debounced view updating based on configured viewport options
     */
    updateView () {
      return _.debounce(function () {
        if (this.config.bounds) {
          this.setBounds(this.config.bounds)
        }
        if (this.config.center) {
          this.setView(this.config.center, this.config.zoom)
        }
      }, 10)
    },
  },
  watch: {
    ['config.center'] (to) {
      this.updateView()
    },
    ['config.zoom'] (to) {
      this.updateView()
    },
  },
  methods: {
    zoomIn (e) {
      if (!this.isZoomedIn) {
        this.lastBounds = this.getBounds()
      }
      this.setBounds(e.target.getBounds())
    },
    zoomOut (e) {
      if (this.lastBounds) {
        this.setBounds(this.lastBounds)
      } else {
        this.setBounds(this.$refs.geojson.getBounds())
      }
    },
    setBounds (bounds, options) {
      this.mapObject.fitBounds(bounds, options)
    },
    // quietSetBounds (bounds) {
    //   bounds = bounds || this.config.bounds;
    //   setTimeout(() => {
    //     this.fitting = true;
    //     this.mapObject.fitBounds(bounds, { animate: false })
    //     console.log(bounds)
    //     setTimeout(() => {
    //       this.fitting = false;
    //     }, 400)
    //   })
    // },
    getBounds () {
      return this.mapObject.getBounds()
    },
    setZoom (zoom) {
      this.mapObject.setZoom(zoom)
    },
    getZoom () {
      // take care of javascript float precision bug which produces
      // numbers like .0000000001
      return Math.round(this.mapObject.getZoom() * 10) / 10
    },
    getCenter (target=null) {
      return (target || this.mapObject).getCenter()
    },
    panTo (...args) {
      this.mapObject.panTo(...args)
    },
    setView (center, zoom, options) {
      this.mapObject.setView(center, zoom, options)
    },
    redraw () {
      this.mapObject._onResize()
      // if (this.config.bounds) {
      //   this.quietSetBounds()
      // }
    },
    zoomToFeature (e) {
      if (e.target == this.lastClickTarget) {
        this.lastClickTarget = null
        this.zoomOut(e)
      } else {
        this.lastClickTarget = e.target
        this.zoomIn(e)
      }
    },
    onZoomChange (e) {
      this.onMapUpdate(e)
      this.updateTooltip()
    },
    updateTooltip() {
      // stub
    },
    resetStyle () {
      // stub
    },
    /**
     * Map updated; change location in url
     */
    onMapUpdate: _.debounce(function (e) {
      if (this.fitting) return;
      let from = this.config
      let to = {
        ...from,
        center: this.getCenter(),
        // handle float precision error
        zoom: this.getZoom()
      }
      this.config.zoom = to.zoom
      this.config.center = to.center
      this.updateURL(to, from)
      this.resetStyle()
    }, 400),
    /**
     * Move map will update the url
     */
    updateURL (to, from) {
      this.$emit('updateURL', to, from, this)
    },
    onControlUpdate (to) {
      var from = this.config
      to = { ...from, ...to }
      this.updateURL(to, from)
    },
  }
}

/**
 * The view triggers full screen mode
 */
export const FullscreenMixin = {
  beforeMount () {
    addClass(document.documentElement, 'full-screen')
  },
  beforeDestroy () {
    removeClass(document.documentElement, 'full-screen')
  },
}

/**
 * The component is a map container
 */
export const MapContainerMixin = {
}
