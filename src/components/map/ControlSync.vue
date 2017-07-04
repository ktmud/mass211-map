<template>
    <!-- Sync move -->
    <div class="map-control-wrap map-control--right">
      <map-control class="map-control-padded" v-if="settings.ready && totalMaps > 1">
          <el-form-item class="el-form-item--hover-label" label="Sync">
            <el-switch on-text="" off-text="" v-model="syncMove"></el-switch>
          </el-form-item>
      </map-control>
      <map-control class="map-number-control">
        <el-button @click="$emit('removeSelf')" v-if="totalMaps > 1" title="Remove current pane" size="small">
          <i class="el-icon-close"></i>
        </el-button>
        <el-tooltip v-if="totalMaps == 1" content="Add a new map pane">
          <el-button @click="$emit('addSibling')" title="Add a map pane" size="small">
            <i class="el-icon-plus"></i>
          </el-button>
        </el-tooltip>
        <el-button @click="$emit('addSibling')"  v-if="totalMaps > 1 && totalMaps < 4" title="Add a map pane" size="small">
          <i class="el-icon-plus"></i>
        </el-button>
      </map-control>
    </div>
</template>

<script>
export default {
  props: ['settings', 'total-maps'],
  computed: {
    syncMove: {
      get () {
        return this.settings.syncMove
      },
      set (val) {
        this.settings.syncMove = val
        this.$emit('settings.syncMove:update', val)
      },
    }
  }
}
</script>
<style>

</style>
