<template>
  <div class="slide-design-panel">
    <div class="title">背景填充</div>
    <div class="row">
      <el-select 
        style="flex: 10;" 
        :model-value="background.type" 
        @change="(value: string) => updateBackgroundType(value as 'solid' | 'image' | 'gradient')"
      >
        <el-option value="solid" label="纯色填充" />
        <el-option value="image" label="图片填充" />
        <el-option value="gradient" label="渐变填充" />
      </el-select>
      <div style="flex: 1;"></div>

      <el-popover trigger="click" v-if="background.type === 'solid'" width="auto">
        <ColorPicker
          :modelValue="background.color"
          @update:modelValue="(color: string) => updateBackground({ color })"
        />
        <template #reference>
          <ColorButton :color="background.color || '#fff'" style="flex: 10;" />
        </template>
      </el-popover>

      <el-select 
        style="flex: 10;" 
        :model-value="background.imageSize || 'cover'" 
        @change="(value: string) => updateBackground({ imageSize: value as 'cover' | 'contain' | 'repeat' })"
        v-else-if="background.type === 'image'"
      >
        <el-option value="contain" label="缩放" />
        <el-option value="repeat" label="拼贴" />
        <el-option value="cover" label="缩放铺满" />
      </el-select>

      <el-select 
        style="flex: 10;" 
        :model-value="background.gradientType" 
        @change="(value: string) => updateBackground({ gradientType: value as 'linear' | 'radial' })"
        v-else
      >
        <el-option value="linear" label="线性渐变" />
        <el-option value="radial" label="径向渐变" />
      </el-select>
    </div>

    <div class="background-image-wrapper" v-if="background.type === 'image'">
      <FileInput @change="(files: File[]) => uploadBackgroundImage(files)">
        <div class="background-image">
          <div class="content" :style="{ backgroundImage: `url(${background.image})` }">
            <IconPlus />
          </div>
        </div>
      </FileInput>
    </div>

    <div class="background-gradient-wrapper" v-if="background.type === 'gradient'">
      <div class="row">
        <div style="flex: 2;">起点颜色：</div>
        <el-popover trigger="click" width="auto">
          <ColorPicker
            :modelValue="background.gradientColor?.[0]"
            @update:modelValue="(value: string) => updateBackground({ gradientColor: [value, background.gradientColor?.[1] ?? '#fff'] })"
          />
          <template #reference>
            <ColorButton :color="background.gradientColor?.[0] ?? '#fff'" style="flex: 3;" />
          </template>
        </el-popover>
      </div>
      <div class="row">
        <div style="flex: 2;">终点颜色：</div>
        <el-popover trigger="click" width="auto">
          <ColorPicker
            :modelValue="background.gradientColor?.[1]"
            @update:modelValue="(value: string) => updateBackground({ gradientColor: [background.gradientColor?.[0] ?? '#fff', value] })"
          />
          <template #reference>
            <ColorButton :color="background.gradientColor?.[1] ?? '#fff'" style="flex: 3;" />
          </template>
        </el-popover>
      </div>
      <div class="row" v-if="background.gradientType === 'linear'">
        <div style="flex: 2;">渐变角度：</div>
        <el-slider
          class="slider"
          :min="0"
          :max="360"
          :step="15"
          :model-value="background.gradientRotate"
          @change="(value: number) => updateBackground({ gradientRotate: value })" 
        />
      </div>
    </div>

    <div class="row"><el-button style="flex: 1;" @click="applyBackgroundAllSlide()">应用背景到全选</el-button></div>

    <el-divider />

    <div class="row">
      <div style="flex: 2;">画布尺寸：</div>
      <el-select style="flex: 3;" :model-value="viewportRatio" @change="(value: number) => updateViewportRatio(value)">
        <el-option :value="0.5625" label="宽屏 16 : 9" />
        <el-option :value="0.625" label="宽屏 16 : 10" />
        <el-option :value="0.75" label="标准 4 : 3" />
      </el-select>
    </div>

    <el-divider />

    <div class="title">全局主题</div>
    <div class="row">
      <div style="flex: 2;">字体：</div>
      <el-select
        style="flex: 3;"
        :model-value="theme.fontName"
        @change="(value: string) => updateTheme({ fontName: value })"
      >
        <el-option-group label="系统字体">
          <el-option v-for="font in availableFonts" :key="font.value" :value="font.value" :label="font.label">
            <span :style="{ fontFamily: font.value }">{{font.label}}</span>
          </el-option>
        </el-option-group>
        <el-option-group label="在线字体">
          <el-option v-for="font in webFonts" :key="font.value" :value="font.value" :label="font.label">
            <span>{{font.label}}</span>
          </el-option>
        </el-option-group>
      </el-select>
    </div>
    <div class="row">
      <div style="flex: 2;">字体颜色：</div>
      <el-popover trigger="click" width="auto">
        <ColorPicker
          :modelValue="theme.fontColor"
          @update:modelValue="(value: string) => updateTheme({ fontColor: value })"
        />
        <template #reference>
          <ColorButton :color="theme.fontColor" style="flex: 3;" />
        </template>
      </el-popover>
    </div>
    <div class="row">
      <div style="flex: 2;">背景颜色：</div>
      <el-popover trigger="click" width="auto">
        <ColorPicker
          :modelValue="theme.backgroundColor"
          @update:modelValue="(value: string) => updateTheme({ backgroundColor: value })"
        />
        <template #reference>
          <ColorButton :color="theme.backgroundColor" style="flex: 3;" />
        </template>
      </el-popover>
    </div>
    <div class="row">
      <div style="flex: 2;">主题色：</div>
      <el-popover trigger="click" width="auto">
        <ColorPicker
          :modelValue="theme.themeColor"
          @update:modelValue="(value: string) => updateTheme({ themeColor: value })"
        />
        <template #reference>
          <ColorButton :color="theme.themeColor" style="flex: 3;" />
        </template>
      </el-popover>
    </div>

    <div class="title dropdown" :class="{ 'active': showPresetThemes }" @click="togglePresetThemesVisible()" style="margin-top: 20px;">
      预置主题 <IconDown class="icon" />
    </div>
    <div class="theme-list" v-if="showPresetThemes">
      <div 
        class="theme-item" 
        v-for="(item, index) in themes" 
        :key="index"
        :style="{ backgroundColor: item.background }"
        @click="updateTheme({
          fontColor: item.text,
          backgroundColor: item.background,
          themeColor: item.color,
        })"
      >
        <div class="theme-item-content">
          <div class="text" :style="{ color: item.text }">Aa</div>
          <div class="color-block" :style="{ backgroundColor: item.color }"></div>
        </div>
      </div>
    </div>

    <div class="row"><el-button style="flex: 1;" @click="applyThemeAllSlide()">应用主题到全选</el-button></div>
  </div>
</template>

<script lang="ts">
import { computed, defineComponent, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useMainStore, useSlidesStore } from '@/store'
import { Slide, SlideBackground, SlideTheme } from '@/types/slides'
import { PRESET_THEMES } from '@/configs/theme'
import { WEB_FONTS } from '@/configs/font'
import useHistorySnapshot from '@/hooks/useHistorySnapshot'

import ColorButton from './common/ColorButton.vue'
import { getImageDataURL } from '@/utils/image'

const themes = PRESET_THEMES
const webFonts = WEB_FONTS

export default defineComponent({
  name: 'slide-design-panel',
  components: {
    ColorButton,
  },
  setup() {
    const slidesStore = useSlidesStore()
    const { availableFonts } = storeToRefs(useMainStore())
    const { slides, currentSlide, viewportRatio, theme } = storeToRefs(slidesStore)

    const background = computed(() => {
      if (!currentSlide.value.background) {
        return {
          type: 'solid',
          value: '#fff',
        } as SlideBackground
      }
      return currentSlide.value.background
    })

    const { addHistorySnapshot } = useHistorySnapshot()

    const updateBackgroundType = (type: 'solid' | 'image' | 'gradient') => {
      if (type === 'solid') {
        const newBackground: SlideBackground = {
          ...background.value,
          type: 'solid',
          color: background.value.color || '#fff',
        }
        slidesStore.updateSlide({ background: newBackground })
      }
      else if (type === 'image') {
        const newBackground: SlideBackground = {
          ...background.value,
          type: 'image',
          image: background.value.image || '',
          imageSize: background.value.imageSize || 'cover',
        }
        slidesStore.updateSlide({ background: newBackground })
      }
      else {
        const newBackground: SlideBackground = {
          ...background.value,
          type: 'gradient',
          gradientType: background.value.gradientType || 'linear',
          gradientColor: background.value.gradientColor || ['#fff', '#fff'],
          gradientRotate: background.value.gradientRotate || 0,
        }
        slidesStore.updateSlide({ background: newBackground })
      }
      addHistorySnapshot()
    }

    const updateBackground = (props: Partial<SlideBackground>) => {
      slidesStore.updateSlide({ background: { ...background.value, ...props } })
      addHistorySnapshot()
    }

    const uploadBackgroundImage = (files: File[]) => {
      const imageFile = files[0]
      if (!imageFile) return
      getImageDataURL(imageFile).then(dataURL => updateBackground({ image: dataURL }))
    }

    const applyBackgroundAllSlide = () => {
      const newSlides = slides.value.map(slide => {
        return {
          ...slide,
          background: currentSlide.value.background,
        }
      })
      slidesStore.setSlides(newSlides)
      addHistorySnapshot()
    }

    const updateTheme = (themeProps: Partial<SlideTheme>) => {
      slidesStore.setTheme(themeProps)
    }

    const applyThemeAllSlide = () => {
      const newSlides: Slide[] = JSON.parse(JSON.stringify(slides.value))
      const { themeColor, backgroundColor, fontColor, fontName } = theme.value

      for (const slide of newSlides) {
        if (!slide.background || slide.background.type !== 'image') {
          slide.background = {
            ...slide.background,
            type: 'solid',
            color: backgroundColor
          }
        }

        const elements = slide.elements
        for (const el of elements) {
          if (el.type === 'shape') el.fill = themeColor
          else if (el.type === 'line') el.color = themeColor
          else if (el.type === 'text') {
            el.defaultColor = fontColor
            el.defaultFontName = fontName
            if (el.fill) el.fill = themeColor
          }
          else if (el.type === 'table') {
            if (el.theme) el.theme.color = themeColor
            for (const rowCells of el.data) {
              for (const cell of rowCells) {
                if (cell.style) {
                  cell.style.color = fontColor
                  cell.style.fontname = fontName
                }
              }
            }
          }
          else if (el.type === 'chart') {
            el.themeColor = [themeColor]
            el.gridColor = fontColor
          }
          else if (el.type === 'latex') el.color = fontColor
          else if (el.type === 'audio') el.color = themeColor
        }
      }
      slidesStore.setSlides(newSlides)
      addHistorySnapshot()
    }

    const showPresetThemes = ref(true)
    const togglePresetThemesVisible = () => {
      showPresetThemes.value = !showPresetThemes.value
    }

    const updateViewportRatio = (value: number) => {
      slidesStore.setViewportRatio(value)
    }

    return {
      availableFonts,
      background,
      updateBackgroundType,
      updateBackground,
      uploadBackgroundImage,
      applyBackgroundAllSlide,
      themes,
      theme,
      webFonts,
      updateTheme,
      applyThemeAllSlide,
      viewportRatio,
      updateViewportRatio,
      showPresetThemes,
      togglePresetThemesVisible,
    }
  },
})
</script>

<style lang="scss" scoped>
.slide-design-panel {
  user-select: none;
}

.section {
  background: #fff;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px;
  border: 1px solid #e8eaed;
}

.row {
  width: 100%;
  display: flex;
  align-items: center;
  margin-bottom: 12px;
  font-size: 12px;
  color: #5f6368;

  &:last-child {
    margin-bottom: 0;
  }
}

.title {
  margin-bottom: 12px;
  font-size: 11px;
  color: #5f6368;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.8px;

  &.dropdown {
    display: flex;
    align-items: center;
    cursor: pointer;
    margin-top: 16px;

    .icon {
      margin-left: 6px;
      transition: transform 0.2s;
      font-size: 12px;
    }

    &:not(.active) .icon {
      transform: rotate(-90deg);
    }
  }
}

.background-image-wrapper {
  margin: 12px 0;
}

.background-image {
  height: 0;
  padding-bottom: 56.25%;
  border: 2px dashed #dadce0;
  border-radius: 8px;
  position: relative;
  transition: all 0.2s;
  background: #f8f9fa;

  &:hover {
    border-color: #1a73e8;
    background: rgba(26, 115, 232, 0.04);
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
    border-radius: 8px;
  }
}

.theme-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
  justify-content: space-between;
}

.theme-item {
  width: calc(33.333% - 5.333px);
  padding-bottom: calc(33.333% - 5.333px);
  border-radius: 6px;
  position: relative;
  cursor: pointer;

  .theme-item-content {
    @include absolute-0();
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    border-radius: 6px;
    transition: all 0.2s;
    border: 2px solid transparent;

    &:hover {
      border-color: #1a73e8;
      transform: scale(1.05);
    }
  }

  .text {
    font-size: 14px;
    font-weight: 500;
  }

  .color-block {
    width: 24px;
    height: 4px;
    margin-top: 4px;
    border-radius: 2px;
  }
}

.slider {
  flex: 3;
}

:deep(.el-divider) {
  margin: 16px 0;
}
</style>
