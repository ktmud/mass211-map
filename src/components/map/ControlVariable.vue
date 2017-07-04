<template>
  <div class="map-control-wrap">
    <map-control class="map-control">
      <el-form-item label="" class="select-geounit">
        <el-select v-model="geounit" size="small">
          <el-option v-for="item in geounits"
            :title="item.desc" :key="item.name" :label="item.label" :value="item.name">
            {{ item.label }}
          </el-option>
        </el-select>
      </el-form-item>
    </map-control>
    <map-control>
      <el-form-item>
        <el-select v-model="variable" class="select-variable" filterable size="small"
          placeholder="Type to search">
          <el-option-group v-for="group in variables"
            :key="group.label" :label="group.label">
            <el-option v-for="item in group.options" :key="item.name"
              :label="item.label" :value="item.name">
            </el-option>
          </el-option-group>
        </el-select>
      </el-form-item>
    </map-control>
  </div>
</template>

<script>
import { geounits, getVariables } from '@/api/data'

export default {

  props: ['config'],

  data () {
    return {
      geounits: geounits,
    }
  },

  computed: {

    geounit: {
      get () {
        return this.config.geounit
      },
      set (geounit) {
        this.updateConfig({ geounit })
      }
    },

    variable: {
      get () {
        return this.config.variable
      },
      set (variable) {
        this.updateConfig({ variable })
      }
    },

    /**
     * The variables based on geounit
     */
    variables () {
      return getVariables(this.geounit)
    },

  },

  methods: {
    updateConfig (to) {
      // sync configs (with only partial update)
      this.$emit('updateConfig', to)
    },
  }

}
</script>
<style>

</style>
