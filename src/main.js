// The Vue build version to load with the `import` command
// (runtime-only or standalone) has been set in webpack.base.conf with an alias.
import Vue from 'vue'
// import Vuex from 'vuex'
import ElementUI from 'element-ui'
import Vue2Leaflet from 'vue2-leaflet'
import VueAsyncData from 'vue-async-data'
import AsyncComputed from 'vue-async-computed'


import 'leaflet/dist/leaflet.css'
import './theme/index.sass'
import '../theme/index.css'

Vue.config.productionTip = false

Vue.component('v-tilelayer', Vue2Leaflet.TileLayer);
Vue.component('v-geojson-layer', Vue2Leaflet.GeoJSON);
Vue.component('v-marker', Vue2Leaflet.Marker);

import MapControl from "@/components/map/Control"
Vue.component('map-control', MapControl);

Vue.use(ElementUI)
// Vue.use(Vuex)
Vue.use(AsyncComputed)

// import { sync } from 'vuex-router-sync'
// import { store } from './store'
// syns(store, router)
import router from './router'

import App from './App'

/* eslint-disable no-new */
new Vue({
  el: '#app',
  router,
  template: '<App/>',
  components: { App }
})
