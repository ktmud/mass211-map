/*
 * map.js
 *
 * Map source methods and consts
 *
 * Copyright (C) 2017 Jesse Yang <hello@yjc.me>
 *
 * Distributed under terms of the MIT license.
 */
import { tileProviders } from './vars.yaml'
import api from './api'

const DEFAULT_TILE = 'carto-light'
export const getTileProvider = (name = DEFAULT_TILE) => {
  // fallback to carto-light
  return tileProviders[name] || tileProdivers[DEFAULT_TILE]
}


import {
  interpolateViridis,
  scaleSequential,
  scaleOrdinal
} from 'd3-scale'
import {
  interpolatePuBu, interpolateGnBu,
  interpolateGreens, interpolateOrRd,
  interpolateBlues
} from 'd3-scale-chromatic'
import { extent } from 'd3-array'

/**
 * Create a color pallete for a set
 * of continous values
 */
export const colorize = (values) => {
  let domain = extent(values)
  let inter = interpolateBlues
  let ret = scaleSequential(inter)
    .domain(domain)
  return ret
}
