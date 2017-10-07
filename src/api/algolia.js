// import * as algoliasearch from "algoliasearch/lite"
// var client = algoliasearch('4ZYKEW75VK', 'da457248e2b0552ba89f2e3d6692aa49')
import { createFromAlgoliaCredentials } from 'vue-instantsearch'
export const searchStore = createFromAlgoliaCredentials(
  '4ZYKEW75VK', 'da457248e2b0552ba89f2e3d6692aa49'
)
searchStore.indexName = 'mass211-resources'
console.log(searchStore)
searchStore.resultsPerPage = 1000

export { Component } from 'vue-instantsearch'