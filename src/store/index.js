/*
 * store.js
 * Copyright (C) 2017 Jesse Yang <hello@yjc.me>
 *
 * Distributed under terms of the MIT license.
 */
import Vuex from 'vuex'

import api from '@/components/api'
import { getTileProvider } from '@/components/utils'

/**
 * Default configs for a map store
 */
const MAP_STORE = {
  mutations: {
  }
}

const stores = {}

/**
 * Get a store object for a map
 */
export const mapStore = (map_id) => {
  if (map_id in stores) {
    return stores[map_id]
  }
  stores[map_id] = new Vuex.Store({
    strict: process.env.NODE_ENV !== 'production',
    ...MAP_STORE
  })
}

export default store
