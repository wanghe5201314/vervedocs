<template>
  <a-modal v-model:open="visible" title="自定义项目符号" width="650px" :maskClosable="false" class="app-dialog custom-symbol-dialog" :destroyOnClose="true" @afterOpenChange="(open: boolean) => { if (open) handleOpen() }">
    <div class="custom-symbol-content">
      <div class="symbol-controls">
        <div class="control-item">
          <label class="control-label">字体(F)</label>
          <a-select v-model:value="currentFont" :size="'small'" style="width: 180px" filterable @change="handleFontChange">
            <a-select-option v-for="f in allFontOptions" :key="f.value" :label="f.label" :value="f.value">
              <span :style="{ fontFamily: f.value }">{{ f.label }}</span>
            </a-select-option>
          </a-select>
        </div>
        <div class="control-item">
          <label class="control-label">子集(U)</label>
          <a-select v-model:value="currentSubset" :size="'small'" style="width: 180px" @change="handleSubsetChange">
            <a-select-option v-for="s in subsetOptions" :key="s.value" :label="s.label" :value="s.value" />
          </a-select>
        </div>
      </div>

      <div class="symbol-grid-container" ref="gridContainerRef">
        <div class="symbol-grid">
          <button
            v-for="(char, idx) in displayedChars"
            :key="idx"
            class="symbol-cell"
            :class="{ selected: selectedChar === char }"
            :style="{ fontFamily: currentFontDisplay }"
            :title="`U+${char.codePointAt(0)!.toString(16).toUpperCase().padStart(4, '0')}`"
            @click="handleSelectChar(char)"
          >
            {{ char }}
          </button>
        </div>
      </div>

      <div class="symbol-controls" style="border-bottom: none; padding-bottom: 0;">
        <div class="control-item">
          <label class="control-label">字符代码(C)</label>
          <a-input :value="selectedCharCode" :size="'small'" style="width: 120px" readonly />
        </div>
        <div class="control-item">
          <label class="control-label">来自(M)</label>
          <a-select v-model:value="encodingType" :size="'small'" style="width: 180px">
            <a-select-option label="Unicode(十六进制)" value="unicode-hex" />
            <a-select-option label="Unicode(十进制)" value="unicode-dec" />
          </a-select>
        </div>
      </div>
    </div>

    <template #footer>
      <a-button @click="visible = false">取消</a-button>
      <a-button type="primary" :disabled="!selectedChar" @click="handleConfirm">确定</a-button>
    </template>
  </a-modal>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { symbolCategories } from '@/components/editor/toolbar/index'
import { UI_FONT_OPTIONS } from '@/config/ui-constants'

const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'confirm', symbol: string, font: string): void
}>()

const visible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const allFontOptions = UI_FONT_OPTIONS.map(f => ({ label: f.label, value: f.value }))

const currentFont = ref('Microsoft YaHei, sans-serif')
const currentSubset = ref('all')
const selectedChar = ref('')
const gridContainerRef = ref<HTMLElement>()

const currentFontDisplay = computed(() => currentFont.value)

const encodingType = ref('unicode-hex')

const selectedCharCode = computed(() => {
  if (!selectedChar.value) return ''
  const cp = selectedChar.value.codePointAt(0)!
  if (encodingType.value === 'unicode-dec') return String(cp)
  return cp.toString(16).toUpperCase().padStart(4, '0')
})

const unicodeSubsets = [
  { label: '基本拉丁语', value: 'basic-latin', range: [0x0021, 0x007E] },
  { label: '拉丁语-1补充', value: 'latin-1-supplement', range: [0x00A1, 0x00FF] },
  { label: '拉丁语扩充-A', value: 'latin-ext-a', range: [0x0100, 0x017F] },
  { label: '拉丁语扩充-B', value: 'latin-ext-b', range: [0x0180, 0x024F] },
  { label: '基本希腊语', value: 'greek', range: [0x0370, 0x03FF] },
  { label: '希腊语扩充', value: 'greek-extended', range: [0x1F00, 0x1FFF] },
  { label: '西里尔语', value: 'cyrillic', range: [0x0400, 0x04FF] },
  { label: '上标和下标', value: 'super-sub-scripts', range: [0x2070, 0x209F] },
  { label: '货币符号', value: 'currency-symbols', range: [0x20A0, 0x20CF] },
  { label: '字母式符号', value: 'letterlike-symbols', range: [0x2100, 0x214F] },
  { label: '数字形式', value: 'number-forms', range: [0x2150, 0x218F] },
  { label: '箭头', value: 'arrows', range: [0x2190, 0x21FF] },
  { label: '数学运算符', value: 'mathematical-operators', range: [0x2200, 0x22FF] },
  { label: '杂项技术符号', value: 'miscellaneous-technical', range: [0x2300, 0x23FF] },
  { label: '封闭式字母数字', value: 'enclosed-alphanumerics', range: [0x2460, 0x24FF] },
  { label: '制表符', value: 'box-drawing', range: [0x2500, 0x257F] },
  { label: '方块元素', value: 'block-elements', range: [0x2580, 0x259F] },
  { label: '几何图形', value: 'geometric-shapes', range: [0x25A0, 0x25FF] },
  { label: '杂项符号', value: 'miscellaneous-symbols', range: [0x2600, 0x26FF] },
  { label: '丁贝符', value: 'dingbats', range: [0x2700, 0x27BF] },
  { label: '补充箭头-A', value: 'supplemental-arrows-a', range: [0x27F0, 0x27FF] },
  { label: '补充箭头-B', value: 'supplemental-arrows-b', range: [0x2900, 0x297F] },
  { label: '补充数学运算符', value: 'supplemental-math-operators', range: [0x2A00, 0x2AFF] },
  { label: '杂项符号和箭头', value: 'misc-symbols-and-arrows', range: [0x2B00, 0x2BFF] },
  { label: '中日韩符号和标点', value: 'cjk-symbols-punctuation', range: [0x3000, 0x303F] },
  { label: '平假名', value: 'hiragana', range: [0x3040, 0x309F] },
  { label: '片假名', value: 'katakana', range: [0x30A0, 0x30FF] },
  { label: '注音符号', value: 'bopomofo', range: [0x3100, 0x312F] },
  { label: '中日韩兼容性文字', value: 'cjk-compatibility', range: [0x3300, 0x33FF] },
  { label: '中日韩统一表意文字', value: 'cjk-unified-ideographs', range: [0x4E00, 0x9FFF] },
  { label: '半形和全形形式', value: 'halfwidth-fullwidth', range: [0xFF00, 0xFFEF] },
  { label: '表情符号', value: 'emoticons', range: [0x1F600, 0x1F64F] },
  { label: '杂项符号和象形文字', value: 'misc-symbols-pictographs', range: [0x1F300, 0x1F5FF] },
  { label: '运输和地图符号', value: 'transport-map-symbols', range: [0x1F680, 0x1F6FF] }
]

const subsetOptions = computed(() => {
  return [
    { label: '全部', value: 'all' },
    ...unicodeSubsets.map(s => ({ label: s.label, value: s.value }))
  ]
})

const allSymbols = computed(() => {
  const chars: string[] = []
  const seen = new Set<number>()
  for (const subset of unicodeSubsets) {
    const [start, end] = subset.range
    if (end - start > 2000) continue
    for (let i = start; i <= end; i++) {
      if (!seen.has(i)) {
        seen.add(i)
        chars.push(String.fromCodePoint(i))
      }
    }
  }
  for (const category of symbolCategories) {
    for (const s of category.symbols) {
      const cp = s.codePointAt(0)
      if (cp && !seen.has(cp)) {
        seen.add(cp)
        chars.push(s)
      }
    }
  }
  return chars
})

const rangeToChars = (start: number, end: number) => {
  return Array.from({ length: end - start + 1 }, (_, i) => String.fromCodePoint(start + i))
}

const displayedChars = computed(() => {
  if (currentSubset.value === 'all') {
    return allSymbols.value
  }

  const subset = unicodeSubsets.find(s => s.value === currentSubset.value)
  if (subset) return rangeToChars(subset.range[0], subset.range[1])

  const category = symbolCategories.find(c => c.name === currentSubset.value)
  return category ? category.symbols : allSymbols.value
})

const handleFontChange = () => {
  currentSubset.value = 'all'
  selectedChar.value = ''
}

const handleSubsetChange = () => {
  selectedChar.value = ''
}

const handleSelectChar = (char: string) => {
  selectedChar.value = char
}

const handleOpen = () => {
  selectedChar.value = ''
  currentFont.value = 'Microsoft YaHei, sans-serif'
  currentSubset.value = 'all'
}

const handleConfirm = () => {
  if (selectedChar.value) {
    emit('confirm', selectedChar.value, currentFont.value)
    visible.value = false
  }
}
</script>

<style scoped>
.custom-symbol-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.symbol-controls {
  display: flex;
  gap: 16px;
  align-items: center;
  padding-bottom: 12px;
  border-bottom: 1px solid #e8eaed;
}

.control-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.control-label {
  font-size: 13px;
  color: #5f6368;
  white-space: nowrap;
}

.symbol-grid-container {
  border: 1px solid #dadce0;
  border-radius: 6px;
  background: #fff;
  max-height: 280px;
  overflow-y: auto;
  padding: 8px;
}

.symbol-grid {
  display: grid;
  grid-template-columns: repeat(10, 1fr);
  gap: 4px;
}

.symbol-cell {
  width: 100%;
  aspect-ratio: 1;
  border: 1px solid transparent;
  border-radius: 4px;
  background: #fff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  color: #202124;
  transition: all 0.15s;
  padding: 0;
  min-height: 36px;
}

.symbol-cell:hover {
  background: #f1f3f4;
  border-color: #1a73e8;
  transform: scale(1.08);
}

.symbol-cell.selected {
  background: #e8f0fe;
  border-color: #1a73e8;
  box-shadow: 0 0 0 2px rgba(26, 115, 232, 0.3);
}

.symbol-grid-container::-webkit-scrollbar {
  width: 8px;
}

.symbol-grid-container::-webkit-scrollbar-track {
  background: #f1f3f4;
  border-radius: 4px;
}

.symbol-grid-container::-webkit-scrollbar-thumb {
  background: #dadce0;
  border-radius: 4px;
}

.symbol-grid-container::-webkit-scrollbar-thumb:hover {
  background: #bdc1c6;
}
</style>
