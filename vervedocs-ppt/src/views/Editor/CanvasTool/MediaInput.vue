<template>
  <div class="media-input">
    <div class="tabs">
      <div 
        class="tab" 
        :class="{ 'active': type === tab.key }" 
        v-for="tab in tabs" 
        :key="tab.key"
        @click="type = tab.key"
      >{{tab.label}}</div>
    </div>

    <template v-if="type === 'video'">
      <a-input v-model:value="videoSrc" placeholder="请输入视频地址，e.g. https://xxx.mp4"></a-input>
      <div class="btns">
        <a-button @click="close()" style="margin-right: 10px;">取消</a-button>
        <a-button type="primary" @click="insertVideo()">确认</a-button>
      </div>
    </template>

    <template v-if="type === 'audio'">
      <a-input v-model:value="audioSrc" placeholder="请输入音频地址，e.g. https://xxx.mp3"></a-input>
      <div class="btns">
        <a-button @click="close()" style="margin-right: 10px;">取消</a-button>
        <a-button type="primary" @click="insertAudio()">确认</a-button>
      </div>
    </template>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref } from 'vue'
import { message } from 'ant-design-vue'

type TypeKey = 'video' | 'audio'
export interface TabItem {
  key: TypeKey;
  label: string;
}

export default defineComponent({
  name: 'media-input',
  emits: ['insertVideo', 'insertAudio', 'close'],
  setup(props, { emit }) {
    const type = ref<TypeKey>('video')

    const videoSrc = ref('https://mazwai.com/videvo_files/video/free/2019-01/small_watermarked/181004_04_Dolphins-Whale_06_preview.webm')
    const audioSrc = ref('https://freesound.org/data/previews/614/614107_11861866-lq.mp3')

    const tabs: TabItem[] = [
      { key: 'video', label: '视频' },
      { key: 'audio', label: '音频' },
    ]

    const insertVideo = () => {
      if (!videoSrc.value) return message.error('请先输入正确的视频地址')
      emit('insertVideo', videoSrc.value)
    }

    const insertAudio = () => {
      if (!audioSrc.value) return message.error('请先输入正确的音频地址')
      emit('insertAudio', audioSrc.value)
    }

    const close = () => emit('close')

    return {
      type,
      videoSrc,
      audioSrc,
      tabs,
      insertVideo,
      insertAudio,
      close,
    }
  },
})
</script>

<style  scoped>
.media-input {
  width: 480px;
}
.tabs {
  display: flex;
  justify-content: flex-start;
  align-items: center;
  border-bottom: 1px solid #e2e6ed;
  margin-bottom: 20px;
}
.tab {
  padding: 0 10px 8px;
  border-bottom: 2px solid transparent;
  cursor: pointer;

  &.active {
    border-bottom: 2px solid #1a73e8;
  }
}
.btns {
  margin-top: 10px;
  text-align: right;
}
</style>
