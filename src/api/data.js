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
import { tileProviders } from './vars.yaml'

const DEFAULT_TILE = 'mapbox-light'
export const MAX_ZOOM = tileProviders[DEFAULT_TILE].maxZoom || 18
export const getTileProvider = (name = DEFAULT_TILE) => {
  // fallback to carto-light
  return tileProviders[name]
}

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
export const DEFAULT_BOUNDS = L.latLngBounds(
  // northeast
  L.latLng(43, -69.2),
  // southwest
  L.latLng(41, -74)
)
export const MAX_BOUNDS = L.latLngBounds(
  L.latLng(55, -55),
  L.latLng(30, -90)
)

// process variables
for (var group in variables) {
  variables[group].options.forEach(item => {
    item.requires = variables[group].requires
    item.label = item.label || item.name
    item.group = group
    item.desc = item.desc || null
    let format = '.0%'
    if (item.name == 'p_call' || item.name.indexOf('p_call_') == 0) {
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
    item.unitsShort = item.unitsShort || ''
    // variable units, used for formatting
    item.units = item.units || item.unitsShort
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
    var file = `/static/data/${level}.json`
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

export const formatBigNum = d3format(',.1s')

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

export const ICON_DEFAULT = ['md-home', 'blue']
export const TOPIC_ICON = {
  'food/cloth': ['md-leaf', 'blue'],
  'income': ['logo-usd', 'blue'],
  'housing': ['md-home', 'blue'],
  'health': ['md-medical', 'red'],
  'mental': ['md-medical', 'red'],
  'care/companion': ['md-person', 'lightgray'],
  'community': ['md-people', 'darkpurple'],
  'childcare': ['md-ionitron', 'green'],
  'education': ['md-school', 'green'],
  'youth help': ['md-body', 'green'],
  'infoservice': ['md-call', 'cadetblue'],
  'legal': ['md-filing', 'cadetblue'],
  'government': ['md-filing', 'cadetblue'],
  'homeless': ['md-umbrella', 'purple'],
}
export const getTopicIcon = function (topic) {
  return TOPIC_ICON[topic] || ICON_DEFAULT
}