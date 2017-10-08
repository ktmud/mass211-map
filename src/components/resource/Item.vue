<template>
  <div class="resource-info" @click="onClick">
    <h3 v-html="resource.name_h"></h3>
    <div class="details">
      <!-- <div class="addr1">{{ resource.address }}</div> -->
      <div class="addr2">{{ resource.city }}, MA {{ resource.zip }}</div>
      <!-- <div class="website"><a :title="resource.website" :href="resource.website">{{ resource.website }}</a></div> -->
    </div>
    <div class="tags">
      <span v-for="(term, index) in resource.topic" :key="index" class="tag" v-html="term">
      </span>
    </div>
  </div>
</template>

<script>
export default {
  props: ['resource'],
  name: 'm2m-resource-item',
  methods: {
    onClick () {
      this.$emit('click', this)
    }
  }
}
</script>

<style>

</style>
