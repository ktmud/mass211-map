<template>
  <div class="resource-info" @click="onClick">
    <el-row :gutter="10">
      <el-col :span="20">
        <h3 v-html="resource.name_h"></h3>
        <div class="details">
          <!-- <div class="addr1">{{ resource.address }}</div> -->
          <div class="addr2">{{ resource.city ? resource.city + ', ' : '' }} MA {{ resource.zip || '' }}</div>
        </div>
        <div class="tags">
          <span v-for="(topic, index) in resource.topic" :key="index"
            :class="'tag tag-' + topicColor(topic)"
            v-html="topic">
          </span>
        </div>
      </el-col>
      <el-col :span="4">
        <div title="Number of calls referred to this agency (approx.)"
          class="referral-count" v-if="resource.n_call">
          <strong>{{ formatBigNum(resource.n_call) }}</strong>
          refs per year
        </div>
      </el-col>
    </el-row>
  </div>
</template>

<script>
import { getTopicIcon, formatBigNum } from '@/api/data'
// import { format as d3format } from 'd3-format'
// const formatBigNum = d3format(',')

export default {
  props: ['resource'],
  name: 'm2m-resource-item',
  methods: {
    onClick () {
      this.$emit('click', this)
    },
    topicColor (topic) {
      let [icon, color] = getTopicIcon(topic)
      return color
    },
    formatBigNum: formatBigNum
  }
}
</script>

<style>

</style>
