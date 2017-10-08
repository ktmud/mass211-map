import Vue from 'vue'
import Router from 'vue-router'
import ga from 'vue-ga'


import { DEFAULT_VAR, DEFAULT_UNIT, DEFAULT_BOUNDS } from '@/api/data'
import Main from '@/components/Main'
import Resources from '@/components/Resources'
import Timeline from '@/components/Timeline'
import PageNotFound from '@/components/404'

Vue.use(Router)

const router = new Router({
  mode: 'history',
  routes: [
    {
      name: 'resources',
      path: '/resources/:query?/:location?',
      component: Resources,
      props (route) {
        // map location
        let location = parseLocations(route.params.location)[0]
        let query = route.params.query
        if (query == '-') {
          query = ''
        }
        query = (query ||  '').replace(/\+/g, ' ')
        return {
          config: {
            zoom: location.zoom,
            center: location.center,
            // keyword
            query: query,
            // search paramaters
            queryParameters: route.query
          }
        }
      },
    },
    {
      name: 'timeline',
      path: '/timeline/:daterange?',
      component: Timeline
    },
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
ga(router, 'UA-1080811-22')


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
function parseLocations (value) {
  var m, ret = []
  value = value || ''
  while (m = re_loc.exec(value)) {
    ret.push({
      center: [parseFloat(m[1], 10), parseFloat(m[2], 10)],
      zoom: parseFloat(m[3], 10)
    })
  }
  if (!ret.length) {
    ret.push({
      bounds: DEFAULT_BOUNDS
    })
  }
  return ret
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


const DEFAULT_CENTER = '42.0498619443,-71.6507286010'
/**
 * Parase route params to be a list of configs
 * for multiple maps
 */
export const parseParams = (route) => {
  let params = route.params
  let geounits = splitPlus(params.geounit, DEFAULT_UNIT)
  let variables = splitPlus(params.variable, DEFAULT_VAR)
  let n = Math.max(geounits.length, variables.length) // number of maps
  let locations = parseLocations(params.location)
  let maxlen = reptail(geounits, variables, locations)
  let ret = []
  for (let i = 0, l = maxlen; i < l; i++) {
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
 * Encode location object to string
 */
export const encodeLocation = (center, zoom) => {
  if (!center || !zoom) {
    return 'auto';
  }
  if ('lat' in center) {
    center = [center.lat.toFixed(8), center.lng.toFixed(8)]
  }
  return `@${center.join(',')},${zoom}z`
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
