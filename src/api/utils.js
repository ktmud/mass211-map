/*
 * Copyright (C) 2017 Jesse Yang <hello@yjc.me>
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
export const colorize = (values,
  {color, domain, transform='log', symmetric=false, reverse=false}
) => {
  // apply log transformation to the variable
  if (transform == 'log') {
    // 0 should not have any color, so it will not be used in the range
    values = values.filter(x => x > 0).map(Math.log)
    if (domain) {
      domain = domain.map(x => x > 0 ? Math.log(x) : x)
    }
  }
  let [min, max] = extent(values)
  domain = domain || [min, max]
  // the variable should be symetric
  if (symmetric) {
    if (min < 0) {
      max = Math.min(-min, max)
    }
    domain = [max, -max]
  }
  if (domain[0] == null) {
    domain[0] = min
  }
  if (domain[1] == null) {
    domain[1] = max
  }
  // console.log(domain)
  if (reverse) {
    domain = domain.reverse()
  }
  let inter = d3sc['interpolate' + (color || 'Blues')]
  let ret = scaleSequential(inter)
    .domain(domain)
  return ret
}

export const removeClass = (el, className) => {
  if (el.classList) {
    el.classList.remove(className)
  } else {
    el.className = el.className.replace(
      new RegExp('(^|\\b)' +
        className.split(' ').join('|') +
        '(\\b|$)', 'gi'),
      ' '
    );
  }
}
export const addClass = (el, className) => {
  if (el.classList) {
    el.classList.add(className)
  } else {
    el.className += ' ' + className
  }
}
