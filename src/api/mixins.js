/*
 * mixins.js
 * Copyright (C) 2017 Jesse Yang <hello@yjc.me>
 */
import {addClass, removeClass} from './utils'

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
