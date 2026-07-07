<template>
  <div class="table-style-panel">
    <div class="input-group-compact row">
      <el-select
        style="flex: 3;"
        :model-value="textAttrs.fontname"
        @change="(value: any) => updateTextAttrs({ fontname: value })"
      >
        <template #prefix><IconFontSize /></template>
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
      <el-select
        style="flex: 2;"
        :model-value="textAttrs.fontsize"
        @change="(value: any) => updateTextAttrs({ fontsize: value })"
      >
        <template #prefix><IconAddText /></template>
        <el-option v-for="fontsize in fontSizeOptions" :key="fontsize" :value="fontsize" :label="fontsize">
        </el-option>
      </el-select>
    </div>

    <el-button-group class="row">
      <el-popover trigger="click">
        <ColorPicker
          :modelValue="textAttrs.color"
          @update:modelValue="(value: any) => updateTextAttrs({ color: value })"
        />
        <template #reference>
          <el-tooltip :hide-after="0" :show-after="500" content="文字颜色">
            <el-button class="text-color-btn" style="flex: 1;">
              <IconText />
              <div class="text-color-block" :style="{ backgroundColor: textAttrs.color }"></div>
            </el-button>
          </el-tooltip>
        </template>
      </el-popover>
      <el-popover trigger="click">
        <ColorPicker
          :modelValue="textAttrs.backcolor"
          @update:modelValue="(value: any) => updateTextAttrs({ backcolor: value })"
        />
        <template #reference>
          <el-tooltip :hide-after="0" :show-after="500" content="单元格填充">
            <el-button class="text-color-btn" style="flex: 1;">
              <IconFill />
              <div class="text-color-block" :style="{ backgroundColor: textAttrs.backcolor }"></div>
            </el-button>
          </el-tooltip>
        </template>
      </el-popover>
    </el-button-group>

    <div class="checkbox-button-group row">
      <el-tooltip :hide-after="0" :show-after="500" content="加粗">
        <CheckboxButton 
          style="flex: 1;"
          :checked="textAttrs.bold"
          @click="updateTextAttrs({ bold: !textAttrs.bold })"
        ><IconTextBold /></CheckboxButton>
      </el-tooltip>
      <el-tooltip :hide-after="0" :show-after="500" content="斜体">
        <CheckboxButton 
          style="flex: 1;"
          :checked="textAttrs.em"
          @click="updateTextAttrs({ em: !textAttrs.em })"
        ><IconTextItalic /></CheckboxButton>
      </el-tooltip>
      <el-tooltip :hide-after="0" :show-after="500" content="下划线">
        <CheckboxButton 
          style="flex: 1;"
          :checked="textAttrs.underline"
          @click="updateTextAttrs({ underline: !textAttrs.underline })"
        ><IconTextUnderline /></CheckboxButton>
      </el-tooltip>
      <el-tooltip :hide-after="0" :show-after="500" content="删除线">
        <CheckboxButton 
          style="flex: 1;"
          :checked="textAttrs.strikethrough"
          @click="updateTextAttrs({ strikethrough: !textAttrs.strikethrough })"
        ><IconStrikethrough /></CheckboxButton>
      </el-tooltip>
    </div>

    <el-radio-group 
      class="row" 
      :model-value="textAttrs.align"
      @change="(value: any) => updateTextAttrs({ align: value })"
    >
      <el-tooltip :hide-after="0" :show-after="500" content="左对齐">
        <el-radio-button value="left" style="flex: 1;"><IconAlignTextLeft /></el-radio-button>
      </el-tooltip>
      <el-tooltip :hide-after="0" :show-after="500" content="居中">
        <el-radio-button value="center" style="flex: 1;"><IconAlignTextCenter /></el-radio-button>
      </el-tooltip>
      <el-tooltip :hide-after="0" :show-after="500" content="右对齐">
        <el-radio-button value="right" style="flex: 1;"><IconAlignTextRight /></el-radio-button>
      </el-tooltip>
    </el-radio-group>

    <el-divider />

    <ElementOutline :fixed="true" />

    <el-divider />

    <div class="row">
      <div style="flex: 2;">行数：</div>
      <div class="set-count" style="flex: 3;">
        <el-button class="btn" :disabled="rowCount <= 1" @click="setTableRow(rowCount - 1)"><IconMinus /></el-button>
        <div class="count-text">{{rowCount}}</div>
        <el-button class="btn" :disabled="rowCount >= 30" @click="setTableRow(rowCount + 1)"><IconPlus /></el-button>
      </div>
    </div>
    <div class="row">
      <div style="flex: 2;">列数：</div>
      <div class="set-count" style="flex: 3;">
        <el-button class="btn" :disabled="colCount <= 1" @click="setTableCol(colCount - 1)"><IconMinus /></el-button>
        <div class="count-text">{{colCount}}</div>
        <el-button class="btn" :disabled="colCount >= 30" @click="setTableCol(colCount + 1)"><IconPlus /></el-button>
      </div>
    </div>

    <el-divider />

    <div class="row theme-switch">
      <div style="flex: 2;">启用主题表格：</div>
      <div class="switch-wrapper" style="flex: 3;">
        <el-switch 
          :model-value="hasTheme" 
          @change="(checked: any) => toggleTheme(checked)" 
        />
      </div>
    </div>

    <template v-if="hasTheme">
      <div class="row">
        <el-checkbox 
          @change="(checked: any) => updateTheme({ rowHeader: checked })" 
          :model-value="theme?.rowHeader" 
          style="flex: 1;"
        >标题行</el-checkbox>
        <el-checkbox 
          @change="(checked: any) => updateTheme({ rowFooter: checked })" 
          :model-value="theme?.rowFooter" 
          style="flex: 1;"
        >汇总行</el-checkbox>
      </div>
      <div class="row">
        <el-checkbox 
          @change="(checked: any) => updateTheme({ colHeader: checked })" 
          :model-value="theme?.colHeader" 
          style="flex: 1;"
        >第一列</el-checkbox>
        <el-checkbox 
          @change="(checked: any) => updateTheme({ colFooter: checked })" 
          :model-value="theme?.colFooter" 
          style="flex: 1;"
        >最后一列</el-checkbox>
      </div>
      <div class="row">
        <div style="flex: 2;">主题颜色：</div>
        <el-popover trigger="click">
          <ColorPicker
            :modelValue="theme?.color"
            @update:modelValue="(value: any) => updateTheme({ color: value })"
          />
          <template #reference>
            <ColorButton :color="theme?.color || ''" style="flex: 3;" />
          </template>
        </el-popover>
      </div>
    </template>
  </div>
</template>

<script lang="ts">
import { computed, defineComponent, onMounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { nanoid } from 'nanoid'
import { useMainStore, useSlidesStore } from '@/store'
import { PPTTableElement, TableCell, TableCellStyle, TableTheme } from '@/types/slides'
import { WEB_FONTS } from '@/configs/font'
import useHistorySnapshot from '@/hooks/useHistorySnapshot'

import ElementOutline from '../common/ElementOutline.vue'
import ColorButton from '../common/ColorButton.vue'

const webFonts = WEB_FONTS

export default defineComponent({
  name: 'table-style-panel',
  components: {
    ElementOutline,
    ColorButton,
  },
  setup() {
    const slidesStore = useSlidesStore()
    const { handleElement, handleElementId, selectedTableCells: selectedCells, availableFonts } = storeToRefs(useMainStore())
    const themeColor = computed(() => slidesStore.theme.themeColor)
    
    const fontSizeOptions = [
      '12px', '14px', '16px', '18px', '20px', '22px', '24px', '28px', '32px',
    ]

    const textAttrs = ref({
      bold: false,
      em: false,
      underline: false,
      strikethrough: false,
      color: '#000',
      backcolor: '#000',
      fontsize: '12px',
      fontname: '微软雅黑',
      align: 'left',
    })

    const theme = ref<TableTheme>()
    const hasTheme = ref(false)
    const rowCount = ref(0)
    const colCount = ref(0)
    const minRowCount = ref(0)
    const minColCount = ref(0)

    watch(handleElement, () => {
      if (!handleElement.value || handleElement.value.type !== 'table') return
      
      theme.value = handleElement.value.theme
      hasTheme.value = !!theme.value

      rowCount.value = handleElement.value.data.length
      colCount.value = handleElement.value.data[0].length

      minRowCount.value = handleElement.value.data.length
      minColCount.value = handleElement.value.data[0].length
    }, { deep: true, immediate: true })

    const { addHistorySnapshot } = useHistorySnapshot()

    // 更新当前选中单元格的文本样式状态
    const updateTextAttrState = () => {
      if (!handleElement.value || handleElement.value.type !== 'table') return

      let rowIndex = 0
      let colIndex = 0
      if (selectedCells.value.length) {
        const selectedCell = selectedCells.value[0]
        rowIndex = +selectedCell.split('_')[0]
        colIndex = +selectedCell.split('_')[1]
      }
      const style = handleElement.value.data[rowIndex][colIndex].style

      if (!style) {
        textAttrs.value = {
          bold: false,
          em: false,
          underline: false,
          strikethrough: false,
          color: '#000',
          backcolor: '#000',
          fontsize: '12px',
          fontname: '微软雅黑',
          align: 'left',
        }
      }
      else {
        textAttrs.value = {
          bold: !!style.bold,
          em: !!style.em,
          underline: !!style.underline,
          strikethrough: !!style.strikethrough,
          color: style.color || '#000',
          backcolor: style.backcolor || '#000',
          fontsize: style.fontsize || '12px',
          fontname: style.fontname || '微软雅黑',
          align: style.align || 'left',
        }
      }
    }

    onMounted(() => {
      if (selectedCells.value.length) updateTextAttrState()
    })

    watch(selectedCells, updateTextAttrState)

    const updateElement = (props: Partial<PPTTableElement>) => {
      slidesStore.updateElement({ id: handleElementId.value, props })
      addHistorySnapshot()
    }

    // 设置单元格内容文本样式
    const updateTextAttrs = (textAttrProp: Partial<TableCellStyle>) => {
      const _handleElement = handleElement.value as PPTTableElement

      const data: TableCell[][] = JSON.parse(JSON.stringify(_handleElement.data))

      for (let i = 0; i < data.length; i++) {
        for (let j = 0; j < data[i].length; j++) {
          if (!selectedCells.value.length || selectedCells.value.includes(`${i}_${j}`)) {
            const style = data[i][j].style || {}
            data[i][j].style = { ...style, ...textAttrProp }
          }
        }
      }
      updateElement({ data })
      updateTextAttrState()
    }

    // 更新表格主题：主题色、标题行、汇总行、第一列、最后一列
    const updateTheme = (themeProp: Partial<TableTheme>) => {
      if (!theme.value) return
      const _theme = { ...theme.value, ...themeProp }
      updateElement({ theme: _theme })
    }

    // 开?关闭表格主题
    const toggleTheme = (checked: boolean) => {
      if (checked) {
        const props = {
          theme: {
            color: themeColor.value,
            rowHeader: true,
            rowFooter: false,
            colHeader: false,
            colFooter: false,
          }
        }
        updateElement(props)
      }
      else {
        slidesStore.removeElementProps({ id: handleElementId.value, propName: 'theme' })
        addHistorySnapshot()
      }
    }

    // 设置表格行数
    const setTableRow = (value: number) => {
      const _handleElement = handleElement.value as PPTTableElement
      const rowCount = _handleElement.data.length

      if (value > rowCount) {
        const rowCells: TableCell[] = new Array(colCount.value).fill({ id: nanoid(10), colspan: 1, rowspan: 1, text: '' })
        const newTableCells: TableCell[][] = new Array(value - rowCount).fill(rowCells)
  
        const tableCells: TableCell[][] = JSON.parse(JSON.stringify(_handleElement.data))
        tableCells.push(...newTableCells)
  
        updateElement({ data: tableCells })
      }
      else {
        const tableCells: TableCell[][] = _handleElement.data.slice(0, value)
        updateElement({ data: tableCells })
      }
    }

    // 设置表格列数
    const setTableCol = (value: number) => {
      const _handleElement = handleElement.value as PPTTableElement
      const colCount = _handleElement.data[0].length

      let tableCells = _handleElement.data
      let colSizeList = _handleElement.colWidths.map(item => item * _handleElement.width)

      if (value > colCount) {
        tableCells = tableCells.map(item => {
          const cells: TableCell[] = new Array(value - colCount).fill({ id: nanoid(10), colspan: 1, rowspan: 1, text: '' })
          item.push(...cells)
          return item
        })
  
        const newColSizeList: number[] = new Array(value - colCount).fill(100)
        colSizeList.push(...newColSizeList)
      }
      else {
        tableCells = tableCells.map(item => item.slice(0, value))
        colSizeList = colSizeList.slice(0, value)
      }

      const width = colSizeList.reduce((a, b) => a + b)
      const colWidths = colSizeList.map(item => item / width)

      const props = {
        width,
        data: tableCells,
        colWidths,
      }
      updateElement(props)
    }

    return {
      handleElement,
      availableFonts,
      fontSizeOptions,
      textAttrs,
      updateTextAttrs,
      theme,
      rowCount,
      colCount,
      minRowCount,
      minColCount,
      hasTheme,
      toggleTheme,
      updateTheme,
      setTableRow,
      setTableCol,
      webFonts,
    }
  },
})
</script>

<style  scoped>
.row {
  width: 100%;
  display: flex;
  align-items: center;
  margin-bottom: 10px;
}
.theme-switch {
  margin-bottom: 18px;
}
.switch-wrapper {
  text-align: right;
}
.text-color-btn {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}
.text-color-block {
  width: 16px;
  height: 3px;
  margin-top: 1px;
}
.set-count {
  display: flex;
  justify-content: center;
  align-items: center;

  .btn {
    padding: 4px 8px;
  }

  .count-text {
    flex: 1;
    text-align: center;
    margin: 0 8px;
  }
}
</style>