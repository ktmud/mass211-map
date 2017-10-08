<template>
  <div id="app">
    <el-menu theme="dark" :default-active="page" class="main-menu" mode="horizontal" @select="handleSelect">
      <el-menu-item index="main">Demands</el-menu-item>
      <el-menu-item index="resources">Resources</el-menu-item>
      <!-- <el-menu-item index="timeline">Timeline</el-menu-item> -->
    </el-menu>
    <router-view></router-view>
  </div>
</template>

<script>
export default {
  name: 'app',
  data () {
    return {
      page: this.$route.name
    }
  },
  methods: {
    handleSelect (key, path) {
      this.page = key
      this.$router.push({ name: key })
    }
  }
}
</script>

<style lang="sass">
</style>
