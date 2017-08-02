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
import * as d3sc from 'd3-scale-chromatic'
import { extent } from 'd3-array'

/**
 * Create a color pallete for a set
 * of continous values
 */
export const colorize = (values, color, balanced=false) => {
  let domain
  if (balanced) {
    let max = Math.max(...values)
    let min = Math.min(...values)
    if (min < 0) {
      max = Math.min(-min, max)
    }
    domain = [max, -max]
  } else {
    domain = extent(values)
  }
  let inter = d3sc['interpolate' + (color || 'Blues')]
  let ret = scaleSequential(inter)
    .domain(domain)
  return ret
}
