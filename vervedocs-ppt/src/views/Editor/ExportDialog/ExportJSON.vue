<template>
  <div class="export-json-dialog">
    <div class="preview">
      <pre>{{slides}}</pre>
    </div>

    <div class="btns">
      <a-button class="btn export" type="primary" @click="exportJSON()">导出 JSON</a-button>
      <a-button class="btn close" @click="close()">关闭</a-button>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { storeToRefs } from 'pinia'
import { useSlidesStore } from '@/store'
import useExport from '@/hooks/useExport'

export default defineComponent({
  name: 'export-json-dialog',
  setup(props, { emit }) {
    const close = () => emit('close')

    const { slides } = storeToRefs(useSlidesStore())

    const { exportJSON } = useExport()
    
    return {
      slides,
      exportJSON,
      close,
    }
  },
})
</script>

<style  scoped>
.export-json-dialog {
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: column;
  position: relative;
  overflow: hidden;
}
.preview {
  width: 100%;
  height: calc(100% - 100px);
  display: flex;
  flex-direction: column;
  justify-content: center;
  background-color: #f1f3f4;
  color: #0451a5;
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
::-webkit-scrollbar {
  width: 10px;
  height: 10px;
  background-color: #f1f3f4;
}
::-webkit-scrollbar-thumb {
  background-color: #c1c1c1;
}
</style>