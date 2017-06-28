import Vue from 'vue'
import Router from 'vue-router'
import { DEFAULT_VAR, DEFAULT_UNIT } from '@/components/api'
import Home from '@/components/Home'
import Main from '@/components/Main'
import PageNotFound from '@/components/404'

Vue.use(Router)

const router = new Router({
  mode: 'history',
  routes: [
    {
      name: 'main',
      path: '/:geounit?/:variable?/:location?',
      component: Main
    },
    {
      path: "*",
      component: PageNotFound
    }
  ]
})

/**
 * Split "a+b" to ['a', 'b']
 */
function splitPlus (value, defaultValue) {
  return (value || defaultValue).split('+')
}

/**
 * Extract viewport locations
 * format: "@42.1299658,-71.7159472,9z"
 */
const re_loc = /\@([-\d\.]+),([-\d\.]+),([\d\.]+)z/ig
function parseLocations (value, defaultValue) {
  var m, ret = []
  value = value || defaultValue
  while (m = re_loc.exec(value)) {
    ret.push({
      center: [parseFloat(m[1], 10), parseFloat(m[2], 10)],
      zoom: parseFloat(m[3], 10)
    })
  }
  return ret
}
/**
 * Encode location object to string
 */
function encodeLocation (center, zoom) {
  return `@${center.join(',')},${zoom}z`
}


/**
 * Let a list of arrays have the same length
 * by repeating items when needed
 */
function reptail (...lists) {
  var maxlen = Math.max(...lists.map(item => item.length))
  for (var i = 0, l = maxlen; i < l; i++) {
    lists.forEach(item => {
      item[i] = item[i] || item[i % item.length]
    })
  }
  return maxlen
}

/**
 * Parase route params to be a list of configs
 * for multiple maps
 */
export const parseParams = (route) => {
  var params = route.params
  var geounits = splitPlus(params.geounit, DEFAULT_UNIT)
  var variables = splitPlus(params.variable, DEFAULT_VAR)
  var locations = parseLocations(params.location, '@42.0768030401,-71.5758452224,8.7z')
  var maxlen = reptail(geounits, variables, locations)
  var ret = []
  for (var i = 0, l = maxlen; i < l; i++) {
    ret.push({
      // assign each config an id, vue needs it to track
      // and reuse node
      id: i,
      geounit: geounits[i],
      variable: variables[i],
      ...locations[i]
    })
  }
  return ret
}
/**
 * Encode a list of configs into params object
 */
export const encodeConfigs = (configs) => {
  var ret = {
    geounit: [],
    variable: [],
    location: []
  }
  for (var config of configs) {
    ret.geounit.push(config.geounit)
    ret.variable.push(config.variable)
    ret.location.push(encodeLocation(config.center, config.zoom))
  }
  for (var key of Object.keys(ret)) {
    ret[key] = ret[key].join('+')
  }
  return ret
}

export default router
