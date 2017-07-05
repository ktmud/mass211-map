/*
 * map.js
 *
 * Map source methods and consts
 *
 * Copyright (C) 2017 Jesse Yang <hello@yjc.me>
 *
 * Distributed under terms of the MIT license.
 */
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
