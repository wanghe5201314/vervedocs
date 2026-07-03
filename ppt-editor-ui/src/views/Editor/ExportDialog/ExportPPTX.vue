<template>
  <div class="export-pptx-dialog">
    <div class="configs">
      <div class="row">
        <div class="title">导出范围：</div>
        <el-radio-group
          class="config-item"
          v-model="rangeType"
        >
          <el-radio-button style="width: 33.33%;" value="all">全部</el-radio-button>
          <el-radio-button style="width: 33.33%;" value="current">当前页</el-radio-button>
          <el-radio-button style="width: 33.33%;" value="custom">自定义</el-radio-button>
        </el-radio-group>
      </div>
      <div class="row" v-if="rangeType === 'custom'">
        <div class="title" :data-range="`（${range[0]} ~ ${range[1]}）`">自定义范围：</div>
        <el-slider
          class="config-item"
          range
          :min="1"
          :max="slides.length"
          :step="1"
          v-model="range"
        />
      </div>
      <div class="row">
        <div class="title">覆盖默认母版：</div>
        <div class="config-item">
          <el-switch v-model="masterOverwrite" />
        </div>
      </div>
    </div>
    <div class="btns">
      <el-button class="btn export" type="primary" @click="exportPPTX(selectedSlides, masterOverwrite)">导出 PPTX</el-button>
      <el-button class="btn close" @click="close()">关闭</el-button>
    </div>

    <FullscreenSpin :loading="exporting" tip="正在导出..." />
  </div>
</template>

<script lang="ts">
import { computed, defineComponent, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useSlidesStore } from '@/store'
import useExport from '@/hooks/useExport'

export default defineComponent({
  name: 'export-pptx-dialog',
  setup(props, { emit }) {
    const { slides, currentSlide } = storeToRefs(useSlidesStore())

    const rangeType = ref<'all' | 'current' | 'custom'>('all')
    const range = ref<[number, number]>([1, slides.value.length])
    const masterOverwrite = ref(true)

    const selectedSlides = computed(() => {
      if (rangeType.value === 'all') return slides.value
      if (rangeType.value === 'current') return [currentSlide.value]
      return slides.value.filter((item, index) => {
        const [min, max] = range.value
        return index >= min - 1 && index <= max - 1
      })
    })

    const close = () => emit('close')

    const { exportPPTX, exporting } = useExport()
    
    return {
      slides,
      rangeType,
      range,
      masterOverwrite,
      exporting,
      selectedSlides,
      exportPPTX,
      close,
    }
  },
})
</script>

<style  scoped>
.export-pptx-dialog {
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: column;
  position: relative;
  overflow: hidden;
}
.configs {
  width: 350px;
  height: calc(100% - 100px);
  display: flex;
  flex-direction: column;
  justify-content: center;

  .row {
    display: flex;
    justify-content: center;
    align-items: center;
    margin-bottom: 25px;
  }

  .title {
    width: 100px;
    position: relative;

    &::after {
      content: attr(data-range);
      position: absolute;
      top: 20px;
      left: 0;
    }
  }
  .config-item {
    flex: 1;
  }
}
.btns {
  width: 300px;
  height: 100px;
  display: flex;
  justify-content: center;
  align-items: center;

  .export {
    flex: 1;
  }
  .close {
    width: 100px;
    margin-left: 10px;
  }
}
</style>