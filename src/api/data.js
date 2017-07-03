/*
 * export const js
 *
 * The data source API
 *
 * Copyright (C) 2017 Jesse Yang <hello@yjc.me>
 *
 * Distributed under terms of the MIT license.
 */
import 'whatwg-fetch'  // add `window.fetch` shim
import forage from 'localforage'
import { levels, variables } from './vars.yaml'

const variable_finder = {}
const cache = {}
const fetch = window.fetch

/**
 * Geographic units
 */
export const geounits = levels.map(item => {
  item.name = item.name || item.label.toLowerCase()
  return item
})

export const DEFAULT_UNIT = 'town'
export const DEFAULT_VAR = 'p_call'

// process variables
for (var group in variables) {
  variables[group].options.forEach(item => {
    item.requires = variables[group].requires
    item.label = item.label || item.name
    item.group = group
    item.desc = item.desc || null
    let format = '.2%'
    if (item.name.indexOf('p_call') == 0) {
      item.format = ',.2f'
      item.units = 'calls'
    }
    if (item.name.indexOf('fertility') == 0) {
      item.format = ',.0f'
      item.units = 'per 1k women'
      item.unitsShort = '/ 1,000 women'
      let race = item.name.indexOf('_') != -1 ? item.name.replace('fertility_', '') : ''
      item.desc = `Births per 1,000 ${race} women ages 15 to 44 in the year of 2010`
    }
    item.format = item.format || format
    // variable units, used for formatting
    item.units = item.units || item.unitsShort
    item.unitsShort = item.unitsShort || ''
    variable_finder[item.name] = item
  })
}


export const getGeoData = (level) => {
  var promise = new Promise((resolve, reject) => {
    var cached = cache[level]
    if (cached) {
      // if the object is too large, wait at least 100ms so that
      // the loading spinner can appear
      // var wait = cached.features.length > 400 ? 0 : 0;
      return cache[level].then(resolve, reject)
    }
    var file = `/static/data/${level}.geojson`
    fetch(file)
      .then(response => response.json())
      .then(resolve, reject)
  })
  cache[level] = promise
  return promise
}

/**
 * Geo units list
 */
export const getGeoUnits = () =>
  ['zip', 'town', 'county'].map(item => {
    return {
      label: geounits[item],
      value: item
    }
  })

/**
 * Variables list
 */
export const getVariables = geounit => {
  // TODO: filter variables by geounit
  return variables.filter(item => {
    if (!item.requires) return true
    return geounit in item.requires
  })
}


import { format as d3format } from 'd3-format'

/**
 * Variable format for legends
 */
export const getFormat = (variable, vals) => {
  if ('string' == typeof variable) {
    variable = findVariable(variable)
  }
  if (variable._format) {
    return variable._format
  }
  let format = variable.format
  variable._format = d3format(format)
  return variable._format
}

export const findVariable = (name) => {
  return variable_finder[name]
}

/**
 * Get and set configs stored in local storage
 */
export const settings = {
  load (ctx) {
    return forage.getItem('map-' + ctx.config.id)
  },
  dump (ctx) {
    let val = ctx.settings
    return forage.setItem('map-' + ctx.config.id, val)
  }
}
