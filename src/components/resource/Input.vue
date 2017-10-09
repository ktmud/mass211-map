<template>
  <input type="search"
    v-model="query"
    autocorrect="off"
    autocapitalize="off"
    autocomplete="off"
    spellcheck="false"
    class="el-input__inner"
    autofocus
    placeholder="Search 2-1-1 resources..."
    size="48">
</template>

<script>
import { Component } from 'vue-instantsearch'
import _ from 'lodash'

export default {
  name: 'ais-input',
  mixins: [Component],
  props: {
    // type delay in ms
    delay: {
      type: Number,
      default: 250
    }
  },
  computed: {
    query: {
      get() {
        return this.searchStore.query;
      },
      set(value) {
        this.searchStore.stop();
        this.searchStore.query = value;
        this.$emit('query', value);
        // We here ensure we give the time to listeners to alter the store's state
        // without triggering in between ghost queries.
        this.$nextTick(function() {
          this.doSearchDebounce()
        });
      },
    },
    doSearchDebounce () {
      return _.debounce(function(force) {
        this.doSearch(force)
      }, this.delay)
    },
  },
  methods: {
    doSearch (force=true) {
      // force searching
      if (force) {
        this.searchStore._stoppedCounter = 0;
      }
      this.searchStore.start();
      this.searchStore.refresh();
    },
  }
};
</script>