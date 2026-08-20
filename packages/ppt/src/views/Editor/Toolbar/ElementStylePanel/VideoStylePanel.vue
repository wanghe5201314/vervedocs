<template>
  <div class="video-style-panel">
    <div class="title">视频预览封面</div>
    <div class="background-image-wrapper">
      <FileInput @change="(files: File[]) => setVideoPoster(files)">
        <div class="background-image">
          <div class="content" :style="{ backgroundImage: `url(${(handleElement as PPTVideoElement)?.poster || ''})` }">
            <IconPlus />
          </div>
        </div>
      </FileInput>
    </div>
    <div class="row"><a-button style="flex: 1;" @click="updateVideo({ poster: '' })">重置封面</a-button></div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { storeToRefs } from 'pinia'
import { useMainStore, useSlidesStore } from '@/store'
import { PPTVideoElement } from '@/types/slides'
import { getImageDataURL } from '@/utils/image'
import useHistorySnapshot from '@/hooks/useHistorySnapshot'

export default defineComponent({
  name: 'video-style-panel',
  setup() {
    const slidesStore = useSlidesStore()
    const { handleElement } = storeToRefs(useMainStore())

    const { addHistorySnapshot } = useHistorySnapshot()

    const updateVideo = (props: Partial<PPTVideoElement>) => {
      if (!handleElement.value) return
      slidesStore.updateElement({ id: handleElement.value.id, props })
      addHistorySnapshot()
    }

    // 设置视频预览封面
    const setVideoPoster = (files: File[]) => {
      const imageFile = files[0]
      if (!imageFile) return
      getImageDataURL(imageFile).then(dataURL => updateVideo({ poster: dataURL }))
    }

    return {
      handleElement,
      updateVideo,
      setVideoPoster,
    }
  }
})
</script>

<style lang="scss" scoped>
.row {
  width: 100%;
  display: flex;
  align-items: center;
  margin-bottom: 10px;
}
.title {
  margin-bottom: 10px;
}
.background-image-wrapper {
  margin-bottom: 10px;
}
.background-image {
  height: 0;
  padding-bottom: 56.25%;
  border: 1px dashed #e2e6ed;
  border-radius: 2px;
  position: relative;
  transition: all $transitionDelay;

  &:hover {
    border-color: #1a73e8;
    color: #1a73e8;
  }

  .content {
    @include absolute-0();

    display: flex;
    justify-content: center;
    align-items: center;
    background-position: center;
    background-size: contain;
    background-repeat: no-repeat;
    cursor: pointer;
  }
}
</style>
