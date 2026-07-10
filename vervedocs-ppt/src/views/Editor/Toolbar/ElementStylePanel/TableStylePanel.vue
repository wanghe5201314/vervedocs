<template>
  <div class="table-style-panel">
    <div class="input-group-compact row">
      <a-select
        style="flex: 3;"
        :value="textAttrs.fontname"
        @change="(value: any) => updateTextAttrs({ fontname: value })"
      >
        <a-select-opt-group label="系统字体">
          <a-select-option v-for="font in availableFonts" :key="font.value" :value="font.value">
            <span :style="{ fontFamily: font.value }">{{font.label}}</span>
          </a-select-option>
        </a-select-opt-group>
        <a-select-opt-group label="在线字体">
          <a-select-option v-for="font in webFonts" :key="font.value" :value="font.value">
            <span>{{font.label}}</span>
          </a-select-option>
        </a-select-opt-group>
      </a-select>
      <a-select
        style="flex: 2;"
        :value="textAttrs.fontsize"
        @change="(value: any) => updateTextAttrs({ fontsize: value })"
      >
        <a-select-option v-for="fontsize in fontSizeOptions" :key="fontsize" :value="fontsize">{{fontsize}}</a-select-option>
      </a-select>
    </div>

    <a-button-group class="row">
      <a-popover trigger="click">
        <template #content>
          <ColorPicker
            :modelValue="textAttrs.color"
            @update:modelValue="(value: any) => updateTextAttrs({ color: value })"
          />
        </template>
        <a-tooltip title="文字颜色" :mouseEnterDelay="0.5" :mouseLeaveDelay="0">
          <a-button class="text-color-btn" style="flex: 1;">
            <IconText />
            <div class="text-color-block" :style="{ backgroundColor: textAttrs.color }"></div>
          </a-button>
        </a-tooltip>
      </a-popover>
      <a-popover trigger="click">
        <template #content>
          <ColorPicker
            :modelValue="textAttrs.backcolor"
            @update:modelValue="(value: any) => updateTextAttrs({ backcolor: value })"
          />
        </template>
        <a-tooltip title="单元格填充" :mouseEnterDelay="0.5" :mouseLeaveDelay="0">
          <a-button class="text-color-btn" style="flex: 1;">
            <IconFill />
            <div class="text-color-block" :style="{ backgroundColor: textAttrs.backcolor }"></div>
          </a-button>
        </a-tooltip>
      </a-popover>
    </a-button-group>

    <div class="checkbox-button-group row">
      <a-tooltip title="加粗" :mouseEnterDelay="0.5" :mouseLeaveDelay="0">
        <CheckboxButton 
          style="flex: 1;"
          :checked="textAttrs.bold"
          @click="updateTextAttrs({ bold: !textAttrs.bold })"
        ><IconTextBold /></CheckboxButton>
      </a-tooltip>
      <a-tooltip title="斜体" :mouseEnterDelay="0.5" :mouseLeaveDelay="0">
        <CheckboxButton 
          style="flex: 1;"
          :checked="textAttrs.em"
          @click="updateTextAttrs({ em: !textAttrs.em })"
        ><IconTextItalic /></CheckboxButton>
      </a-tooltip>
      <a-tooltip title="下划线" :mouseEnterDelay="0.5" :mouseLeaveDelay="0">
        <CheckboxButton 
          style="flex: 1;"
          :checked="textAttrs.underline"
          @click="updateTextAttrs({ underline: !textAttrs.underline })"
        ><IconTextUnderline /></CheckboxButton>
      </a-tooltip>
      <a-tooltip title="删除线" :mouseEnterDelay="0.5" :mouseLeaveDelay="0">
        <CheckboxButton 
          style="flex: 1;"
          :checked="textAttrs.strikethrough"
          @click="updateTextAttrs({ strikethrough: !textAttrs.strikethrough })"
        ><IconStrikethrough /></CheckboxButton>
      </a-tooltip>
    </div>

    <a-radio-group 
      class="row" 
      :value="textAttrs.align"
      @change="(value: any) => updateTextAttrs({ align: value })"
    >
      <a-tooltip title="左对齐" :mouseEnterDelay="0.5" :mouseLeaveDelay="0">
        <a-radio-button value="left" style="flex: 1;"><IconAlignTextLeft /></a-radio-button>
      </a-tooltip>
      <a-tooltip title="居中" :mouseEnterDelay="0.5" :mouseLeaveDelay="0">
        <a-radio-button value="center" style="flex: 1;"><IconAlignTextCenter /></a-radio-button>
      </a-tooltip>
      <a-tooltip title="右对齐" :mouseEnterDelay="0.5" :mouseLeaveDelay="0">
        <a-radio-button value="right" style="flex: 1;"><IconAlignTextRight /></a-radio-button>
      </a-tooltip>
    </a-radio-group>

    <a-divider />

    <ElementOutline :fixed="true" />

    <a-divider />

    <div class="row">
      <div style="flex: 2;">行数：</div>
      <div class="set-count" style="flex: 3;">
        <a-button class="btn" :disabled="rowCount <= 1" @click="setTableRow(rowCount - 1)"><IconMinus /></a-button>
        <div class="count-text">{{rowCount}}</div>
        <a-button class="btn" :disabled="rowCount >= 30" @click="setTableRow(rowCount + 1)"><IconPlus /></a-button>
      </div>
    </div>
    <div class="row">
      <div style="flex: 2;">列数：</div>
      <div class="set-count" style="flex: 3;">
        <a-button class="btn" :disabled="colCount <= 1" @click="setTableCol(colCount - 1)"><IconMinus /></a-button>
        <div class="count-text">{{colCount}}</div>
        <a-button class="btn" :disabled="colCount >= 30" @click="setTableCol(colCount + 1)"><IconPlus /></a-button>
      </div>
    </div>

    <a-divider />

    <div class="row theme-switch">
      <div style="flex: 2;">启用主题表格：</div>
      <div class="switch-wrapper" style="flex: 3;">
        <a-switch 
          :checked="hasTheme" 
          @change="(checked: any) => toggleTheme(checked)" 
        />
      </div>
    </div>

    <template v-if="hasTheme">
      <div class="row">
        <a-checkbox 
          @change="(checked: any) => updateTheme({ rowHeader: checked })" 
          :checked="theme?.rowHeader" 
          style="flex: 1;"
        >标题行</a-checkbox>
        <a-checkbox 
          @change="(checked: any) => updateTheme({ rowFooter: checked })" 
          :checked="theme?.rowFooter" 
          style="flex: 1;"
        >汇总行</a-checkbox>
      </div>
      <div class="row">
        <a-checkbox 
          @change="(checked: any) => updateTheme({ colHeader: checked })" 
          :checked="theme?.colHeader" 
          style="flex: 1;"
        >第一列</a-checkbox>
        <a-checkbox 
          @change="(checked: any) => updateTheme({ colFooter: checked })" 
          :checked="theme?.colFooter" 
          style="flex: 1;"
        >最后一列</a-checkbox>
      </div>
      <div class="row">
        <div style="flex: 2;">主题颜色：</div>
        <a-popover trigger="click">
          <template #content>
            <ColorPicker
              :modelValue="theme?.color"
              @update:modelValue="(value: any) => updateTheme({ color: value })"
            />
          </template>
          <ColorButton :color="theme?.color || ''" style="flex: 3;" />
        </a-popover>
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
