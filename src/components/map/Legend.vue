<template>
  <div class="map-control map-legend" :class="showLegend ? 'active' : ''">
    <div class="m2m-zoom-toggler is-clickable" @click="showLegend = !showLegend">
     <i class="el-icon-arrow-up"></i>
    </div>
    <el-collapse-transition>
    <div v-if="meta" class="m2m-zoom-elem" v-show="showLegend">
      <h5>{{ meta.legend || meta.label }}</h5>
      <table v-if="colors">
        <tr v-for="(item, index) in colors" :key="index">
          <td class="color">
            <i class="legend-box" :style="'background-color: ' + item.color"></i>
          </td>
          <td class="label" v-html="item.label">
          </td>
        </tr>
      </table>
      <p class="note" v-if="meta.desc" v-html="meta.desc"></p>
    </div>
    </el-collapse-transition>
  </div>
</template>

<script>
export default {
  props: ['settings', 'meta', 'colors'],
  computed: {
    showLegend: {
      get () {
        return this.settings.showLegend
      },
      set (val) {
        this.settings.showLegend = val
        this.$emit('settings.showLegend:update', val)
      },
    }
  }
}
</script>
<style>

</style>
