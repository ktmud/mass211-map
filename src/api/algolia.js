// import * as algoliasearch from "algoliasearch/lite"
// var client = algoliasearch('4ZYKEW75VK', 'da457248e2b0552ba89f2e3d6692aa49')
import { createFromAlgoliaCredentials } from 'vue-instantsearch'

function processHighlight(item, attr, ensureList = false) {
  let res = item._highlightResult
  if (!res || !res[attr]) return item
  if (ensureList && !Array.isArray(res[attr])) {
    res[attr] = [res[attr]]
  }
  if (Array.isArray(res[attr])) {
    item[attr + '_h'] = res[attr].map((item) => item.value)
  } else {
    item[attr + '_h'] = res[attr].value
  }
  return item
}

function ensureList(item, attr) {
  if (item[attr] == null) {
    item[attr] = []
    return
  }
  if (!Array.isArray(item[attr])) {
    item[attr] = [item[attr]]
  }
}

/**
 * Cleanup the coverage attribute
 */
function processCoverage(item) {
  let isWholeMA = item.coverage.indexOf('MA') != -1
  if (isWholeMA) {
    item.coverage = ['All of MA']
    return
  }
  item.coverage = item.coverage
    .filter((area) => !!area)
    .map((item) => item.split(' - ').pop())
}

/**
 * Remove duplicate items in a list of objects
 */
function preprocess(arr, idProp = 'objectID') {
  let seen = {}
  return arr.filter((item) => {
    if (item[idProp] in seen) return false
    if (!item._geoloc || !item._geoloc.lat) return false
    ensureList(item, 'taxonomy_term')
    ensureList(item, 'coverage')
    ensureList(item, 'topic')
    processHighlight(item, 'name')
    processCoverage(item)
    // processHighlight(item, 'taxonomy_term', true)
    seen[item[idProp]] = 1
    return true
  })
}

export const searchStore = function() {
  let store = createFromAlgoliaCredentials(
    '4ZYKEW75VK', 'da457248e2b0552ba89f2e3d6692aa49'
  )
  store.indexName = 'mass211-resources'
  store.resultsPerPage = 100

  // store._helper.state.aroundLatLngViaIP = true
  store._helper.state.aroundRadius = 50000

  store.currentQuery = store.query
  store.currentResults = []

  store._helper.on('result', () => {
    let results = store.currentResults
    var res = store.results  // new result
    if (store.query == store.currentQuery) {
      results = preprocess(results.concat(res), 'objectID')
    } else {
      results = preprocess(res, 'objectID')
      store.currentQuery = store.query
    }
    store.currentResults = results
  })
  return store
}

export { Component } from 'vue-instantsearch'