// stylesheets
import 'leaflet/dist/leaflet.css'
import './theme/index.sass'
import '../theme/index.css'

// The Vue build version to load with the `import` command
// (runtime-only or standalone) has been set in webpack.base.conf with an alias.
import Vue from 'vue'
// import Vuex from 'vuex'
import ElementUI from 'element-ui'
import Vue2Leaflet from 'vue2-leaflet'
import VueAsyncData from 'vue-async-data'
import Vue2LeafletMarkerCluster from 'vue2-leaflet-markercluster'
import AsyncComputed from 'vue-async-computed'

// ========= map =============
import 'ionicons/dist/css/ionicons.css'
import 'leaflet.awesome-markers/dist/leaflet.awesome-markers.css'
import 'leaflet.awesome-markers/dist/leaflet.awesome-markers.js'
import 'leaflet.locatecontrol/dist/L.Control.Locate.css'
import 'leaflet.locatecontrol/dist/L.Control.Locate.min.js'

Vue.config.productionTip = false

Vue.component('v-tilelayer', Vue2Leaflet.TileLayer);
Vue.component('v-geojson-layer', Vue2Leaflet.GeoJSON);
Vue.component('v-marker', Vue2Leaflet.Marker);
Vue.component('v-marker-cluster', Vue2LeafletMarkerCluster)
Vue.component('v-popup', Vue2Leaflet.Popup);

delete L.Icon.Default.prototype._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});
L.Icon.Default = function() {
  return L.AwesomeMarkers.icon({
    icon: 'md-home',
    prefix: 'ion',
    markerColor: 'blue'
  });
}

// ====== instance search =============
import { Index, SearchBox, Results, Clear, PoweredBy } from 'vue-instantsearch'
import AisInput from '@/components/resource/Input'

Vue.component('ais-index', Index)
Vue.component('ais-search-box', SearchBox)
Vue.component('ais-results', Results)
Vue.component('ais-clear', Clear)
Vue.component('ais-powered-by', PoweredBy)
Vue.component('ais-input', AisInput)

// ====== Custom components ============
import MapControl from "@/components/map/Control"
import VMap from "@/components/map/Map"
import ResourceMap from "@/components/resource/Map"
Vue.component('map-control', MapControl)
Vue.component('v-map', VMap)
Vue.component('m2m-resource-map', ResourceMap)

Vue.use(ElementUI)
// Vue.use(Vuex)
Vue.use(AsyncComputed)

import VueObserveVisibility from 'vue-observe-visibility'
Vue.use(VueObserveVisibility)

// import { sync } from 'vuex-router-sync'
// import { store } from './store'
// syns(store, router)
import router from './router'

// import vbclass from 'vue-body-class'
// Vue.use(vbclass, { router })

import App from './App'

/* eslint-disable no-new */
new Vue({
  el: '#app',
  router,
  template: '<App />',
  components: { App }
})
