<template>
  <div class="element-positopn-panel">
    <div class="title">层级：</div>
    <el-button-group class="row">
      <el-button style="flex: 1;" @click="orderElement(handleElement as any, 'top' as any)"><IconSendToBack class="btn-icon" /> 置于顶层</el-button>
      <el-button style="flex: 1;" @click="orderElement(handleElement as any, 'bottom' as any)"><IconBringToFrontOne class="btn-icon" /> 置于底层</el-button>
    </el-button-group>
    <el-button-group class="row">
      <el-button style="flex: 1;" @click="orderElement(handleElement as any, 'up' as any)"><IconBringToFront class="btn-icon" /> 上移一层</el-button>
      <el-button style="flex: 1;" @click="orderElement(handleElement as any, 'down' as any)"><IconSentToBack class="btn-icon" /> 下移一层</el-button>
    </el-button-group>

    <el-divider />
    
    <div class="title">对齐：</div>
    <el-button-group class="row">
      <el-tooltip content="左对齐" :show-after="500" :hide-after="0">
        <el-button style="flex: 1;" @click="alignElementToCanvas('left' as any)"><IconAlignLeft /></el-button>
      </el-tooltip>
      <el-tooltip content="水平居中" :show-after="500" :hide-after="0">
        <el-button style="flex: 1;" @click="alignElementToCanvas('horizontal' as any)"><IconAlignVertically /></el-button>
      </el-tooltip>
      <el-tooltip content="右对齐" :show-after="500" :hide-after="0">
        <el-button style="flex: 1;" @click="alignElementToCanvas('right' as any)"><IconAlignRight /></el-button>
      </el-tooltip>
    </el-button-group>
    <el-button-group class="row">
      <el-tooltip content="上对齐" :show-after="500" :hide-after="0">
        <el-button style="flex: 1;" @click="alignElementToCanvas('top' as any)"><IconAlignTop /></el-button>
      </el-tooltip>
      <el-tooltip content="垂直居中" :show-after="500" :hide-after="0">
        <el-button style="flex: 1;" @click="alignElementToCanvas('vertical' as any)"><IconAlignHorizontally /></el-button>
      </el-tooltip>
      <el-tooltip content="下对齐" :show-after="500" :hide-after="0">
        <el-button style="flex: 1;" @click="alignElementToCanvas('bottom' as any)"><IconAlignBottom /></el-button>
      </el-tooltip>
    </el-button-group>

    <el-divider />

    <div class="row">
      <div style="flex: 3;">位置：</div>
      <el-input-number
        :step="5"
        :model-value="left"
        @change="(value: number) => updateLeft(value)"
        style="flex: 4;"
        controls-position="right"
      />
      <div style="flex: 1;"></div>
      <el-input-number
        :step="5"
        :model-value="top"
        @change="(value: number) => updateTop(value)"
        style="flex: 4;"
        controls-position="right"
      />
    </div>
    <div class="row">
      <div style="flex: 3;"></div>
      <div style="flex: 4;" class="label">X</div>
      <div style="flex: 1;"></div>
      <div style="flex: 4;" class="label">Y</div>
    </div>

    <template v-if="handleElement?.type !== 'line'">
      <div class="row">
        <div style="flex: 3;">大小：</div>
        <el-input-number
          :min="minSize"
          :max="1500"
          :step="5"
          :model-value="width"
          @change="(value: number) => updateWidth(value)"
          style="flex: 4;"
          controls-position="right"
        />
        <template v-if="['image', 'shape', 'audio'].includes(handleElement?.type || '')">
          <el-tooltip content="解除宽高比锁定" :show-after="500" :hide-after="0" v-if="fixedRatio">
            <IconLock style="flex: 1;" class="icon-btn" @click="updateFixedRatio(false)" />
          </el-tooltip>
          <el-tooltip content="宽高比锁定" :show-after="500" :hide-after="0" v-else>
            <IconUnlock style="flex: 1;" class="icon-btn" @click="updateFixedRatio(true)" />
          </el-tooltip>
        </template>
        <div style="flex: 1;" v-else></div>
        <el-input-number 
          :min="minSize"
          :max="800"
          :step="5"
          :disabled="handleElement?.type === 'text'" 
          :model-value="height" 
          @change="(value: number) => updateHeight(value)"
          style="flex: 4;"
          controls-position="right"
        />
      </div>
      <div class="row">
        <div style="flex: 3;"></div>
        <div style="flex: 4;" class="label">宽</div>
        <div style="flex: 1;"></div>
        <div style="flex: 4;" class="label">高</div>
      </div>
    </template>

    <template v-if="!['line', 'video', 'audio'].includes((handleElement as any)?.type || '')">
      <el-divider />

      <div class="row">
        <div style="flex: 3;">旋转：</div>
        <el-tooltip content="逆时针旋转" :show-after="500" :hide-after="0">
          <IconRotate class="icon-btn" @click="updateRotate45('-')" style="flex: 2;" />
        </el-tooltip>
        <el-tooltip content="顺时针旋转" :show-after="500" :hide-after="0">
          <IconRotate 
            class="icon-btn" 
            @click="updateRotate45('+')" 
            :style="{
              flex: 2,
              transform: 'rotateY(180deg)',
            }" 
          />
        </el-tooltip>
        <div style="flex: 1;"></div>
        <el-input-number 
          :min="-180"
          :max="180"
          :step="5"
          :model-value="rotate" 
          @change="(value: number) => updateRotate(value)" 
          style="flex: 4;"
          controls-position="right"
        />
      </div>
    </template>
  </div>
</template>

<script lang="ts">
import { computed, defineComponent, ref, watch } from 'vue'
import { round } from 'lodash'
import { storeToRefs } from 'pinia'
import { useMainStore, useSlidesStore } from '@/store'
import { MIN_SIZE } from '@/configs/element'
import useOrderElement from '@/hooks/useOrderElement'
import useAlignElementToCanvas from '@/hooks/useAlignElementToCanvas'
import useHistorySnapshot from '@/hooks/useHistorySnapshot'

export default defineComponent({
  name: 'element-positopn-panel',
  setup() {
    const slidesStore = useSlidesStore()
    const { handleElement, handleElementId } = storeToRefs(useMainStore())

    const left = ref(0)
    const top = ref(0)
    const width = ref(0)
    const height = ref(0)
    const rotate = ref(0)
    const fixedRatio = ref(false)

    const minSize = computed(() => {
      if (!handleElement.value) return 20
      return MIN_SIZE[handleElement.value.type] || 20
    })

    watch(handleElement, () => {
      if (!handleElement.value) return

      left.value = round(handleElement.value.left, 1)
      top.value = round(handleElement.value.top, 1)

      fixedRatio.value = 'fixedRatio' in handleElement.value && !!handleElement.value.fixedRatio

      if (handleElement.value.type !== 'line') {
        width.value = round(handleElement.value.width, 1)
        height.value = round(handleElement.value.height, 1)
        rotate.value = 'rotate' in handleElement.value && handleElement.value.rotate !== undefined ? round(handleElement.value.rotate, 1) : 0
      }
    }, { deep: true, immediate: true })

    const { orderElement } = useOrderElement()
    const { alignElementToCanvas } = useAlignElementToCanvas()

    const { addHistorySnapshot } = useHistorySnapshot()

    const updateLeft = (value: number) => {
      const props = { left: value }
      slidesStore.updateElement({ id: handleElementId.value, props })
      addHistorySnapshot()
    }
    const updateTop = (value: number) => {
      const props = { top: value }
      slidesStore.updateElement({ id: handleElementId.value, props })
      addHistorySnapshot()
    }
    const updateWidth = (value: number) => {
      const props = { width: value }
      slidesStore.updateElement({ id: handleElementId.value, props })
      addHistorySnapshot()
    }
    const updateHeight = (value: number) => {
      const props = { height: value }
      slidesStore.updateElement({ id: handleElementId.value, props })
      addHistorySnapshot()
    }
    const updateRotate = (value: number) => {
      const props = { rotate: value }
      slidesStore.updateElement({ id: handleElementId.value, props })
      addHistorySnapshot()
    }
    const updateFixedRatio = (value: boolean) => {
      const props = { fixedRatio: value }
      slidesStore.updateElement({ id: handleElementId.value, props })
      addHistorySnapshot()
    }
    const updateRotate45 = (command: '+' | '-') => {
      let _rotate = Math.floor(rotate.value / 45) * 45
      if (command === '+') _rotate = _rotate + 45
      else if (command === '-') _rotate = _rotate - 45

      if (_rotate < -180) _rotate = -180
      if (_rotate > 180) _rotate = 180

      const props = { rotate: _rotate }
      slidesStore.updateElement({ id: handleElementId.value, props })
      addHistorySnapshot()
    }

    return {
      handleElement,
      orderElement,
      alignElementToCanvas,
      left,
      top,
      width,
      height,
      rotate,
      fixedRatio,
      minSize,
      updateLeft,
      updateTop,
      updateWidth,
      updateHeight,
      updateRotate,
      updateFixedRatio,
      updateRotate45,
    }
  },
})
</script>

<style scoped>
.element-positopn-panel {
  user-select: none;
}

.section-title {
  font-size: 11px;
  color: #5f6368;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  margin-bottom: 12px;
}

.row {
  width: 100%;
  display: flex;
  align-items: center;
  margin-bottom: 10px;

  &:last-child {
    margin-bottom: 0;
  }
}

.title {
  margin-bottom: 10px;
  font-size: 12px;
  color: #5f6368;
  font-weight: 500;
}

.label {
  text-align: center;
  font-size: 11px;
  color: #9aa0a6;
}

.btn-icon {
  margin-right: 4px;
}

.icon-btn {
  cursor: pointer;
  padding: 6px;
  border-radius: 4px;
  transition: background 0.2s;

  &:hover {
    background: #f1f3f4;
  }
}

:deep(.el-divider) {
  margin: 16px 0;
}

:deep(.el-button-group) {
  display: flex;
  width: 100%;

  .el-button {
    flex: 1;
    height: 36px;
    padding: 0;
  }
}
</style>
