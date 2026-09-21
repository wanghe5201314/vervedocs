<template>
  <div class="app-skeleton">
    <div class="sk-topbar">
      <div class="sk-block sk-topbar-left"></div>
      <div class="sk-block sk-topbar-center"></div>
    </div>
    <div class="sk-tabs">
      <div class="sk-tab" v-for="i in 7" :key="i"></div>
    </div>
    <div class="sk-panel">
      <div class="sk-group" v-for="g in 4" :key="g">
        <div class="sk-btn" v-for="b in 5" :key="b"></div>
      </div>
    </div>
    <div class="sk-page-area">
      <div class="sk-page">
        <div class="sk-line sk-title"></div>
        <div class="sk-line" v-for="i in 8" :key="i" :style="{ width: widths[i % 4] }"></div>
        <div class="sk-gap"></div>
        <div class="sk-line sk-title"></div>
        <div class="sk-line" v-for="i in 6" :key="'b' + i" :style="{ width: widths[i % 4] }"></div>
        <div class="sk-gap"></div>
        <div class="sk-line" v-for="i in 5" :key="'c' + i" :style="{ width: widths[(i + 1) % 4] }"></div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
/** 骨架屏占位线条宽度循环数组 */
const widths = ['100%', '92%', '85%', '78%']
</script>

<style scoped>
.app-skeleton {
  position: fixed;
  inset: 0;
  z-index: 100000;
  background: #f5f7fa;
  overflow: auto;
}
.sk-topbar {
  height: 32px;
  background: #fff;
  border-bottom: 1px solid #e3e3e3;
  display: flex;
  align-items: center;
  padding: 0 12px;
  gap: 8px;
}
.sk-block {
  height: 16px;
  border-radius: 3px;
  background: linear-gradient(90deg, #ececec 25%, #f5f5f5 37%, #ececec 63%);
  background-size: 400px 100%;
  animation: sk-shimmer 1.4s ease infinite;
}
.sk-topbar-left { width: 120px; }
.sk-topbar-center { width: 180px; margin-left: auto; }
.sk-tabs {
  height: 30px;
  background: #f3f3f3;
  border-bottom: 1px solid #e3e3e3;
  display: flex;
  align-items: center;
  padding: 0 8px;
  gap: 4px;
}
.sk-tab {
  width: 56px;
  height: 18px;
  border-radius: 3px;
  background: linear-gradient(90deg, #e0e0e0 25%, #ededed 37%, #e0e0e0 63%);
  background-size: 400px 100%;
  animation: sk-shimmer 1.4s ease infinite;
}
.sk-panel {
  height: 82px;
  background: #f1f1f1;
  border-bottom: 1px solid #e3e3e3;
  display: flex;
  align-items: center;
  padding: 0 8px;
  gap: 16px;
}
.sk-group {
  display: flex;
  align-items: center;
  gap: 6px;
}
.sk-btn {
  width: 42px;
  height: 54px;
  border-radius: 4px;
  background: linear-gradient(90deg, #e6e6e6 25%, #f0f0f0 37%, #e6e6e6 63%);
  background-size: 400px 100%;
  animation: sk-shimmer 1.4s ease infinite;
}
.sk-page-area {
  padding: 40px 0;
}
.sk-page {
  max-width: 816px;
  margin: 0 auto;
  padding: 60px 80px;
  min-height: 1000px;
  background: #fff;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
  box-sizing: border-box;
}
.sk-line {
  height: 12px;
  border-radius: 2px;
  margin-bottom: 10px;
  background: linear-gradient(90deg, #ececec 25%, #f5f5f5 37%, #ececec 63%);
  background-size: 400px 100%;
  animation: sk-shimmer 1.4s ease infinite;
}
.sk-title {
  height: 24px;
  width: 42%;
  margin-bottom: 20px;
}
.sk-gap {
  height: 24px;
}
@keyframes sk-shimmer {
  0% { background-position: -200px 0; }
  100% { background-position: 200px 0; }
}
</style>