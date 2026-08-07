<template>
  <div ref="sheetEditorRef" class="sheet-editor" @keydown="handleGlobalKeydown">
    <!-- 固定头部区域 -->
    <div class="fixed-header">
      <UnifiedTopHeader
        doc-type="excel"
        :title="headerTitle"
        :is-view-mode="readOnly"
        :last-save-time="headerLastSaveTime"
        :t="t"
      />
      <div class="menu-card">
      <a-menu mode="horizontal" class="sheet-menu-bar" :selectable="false">
        <a-sub-menu key="file" popupClassName="sheet-menu-popper">
          <template #title>文件</template>
          <a-menu-item key="newWorkbook" :disabled="readOnly" @click="handleCreateNewWorkbook()">
            <span class="menu-item-content">
              <span class="menu-item-label"><SheetIcon name="plus" />新建表格</span>
              <span class="menu-item-meta"></span>
            </span>
          </a-menu-item>
          <a-menu-item key="save" @click="emitChange()">
            <span class="menu-item-content">
              <span class="menu-item-label"><SheetIcon name="content-save-outline" />保存</span>
              <span class="menu-item-meta"><span class="shortcut">Ctrl+S</span></span>
            </span>
          </a-menu-item>
          <a-menu-divider />
          <a-menu-item key="importExcel" :disabled="readOnly" @click="triggerImportExcel()">
            <span class="menu-item-content">
              <span class="menu-item-label"><SheetIcon name="file-excel-box" />导入表格&nbsp;&nbsp;<a-tag color="red">BETA</a-tag></span>
              <span class="menu-item-meta"><span class="shortcut">Ctrl+O</span></span>
            </span>
          </a-menu-item>
          <a-menu-item key="exportExcel" @click="handleExportExcel()">
            <span class="menu-item-content">
              <span class="menu-item-label"><SheetIcon name="file-excel-box" />导出 Excel</span>
              <span class="menu-item-meta"></span>
            </span>
          </a-menu-item>
          <a-menu-divider />
          <a-menu-item key="print" @click="handlePrint()">
            <span class="menu-item-content">
              <span class="menu-item-label"><SheetIcon name="printer-outline" />打印</span>
              <span class="menu-item-meta"><span class="shortcut">Ctrl+P</span></span>
            </span>
          </a-menu-item>
        </a-sub-menu>

        <a-sub-menu key="edit" popupClassName="sheet-menu-popper">
          <template #title>编辑</template>
          <a-menu-item key="undo" @click="handleUndo()">
            <span class="menu-item-content">
              <span class="menu-item-label"><SheetIcon name="undo" />撤销</span>
              <span class="menu-item-meta"><span class="shortcut">Ctrl+Z</span></span>
            </span>
          </a-menu-item>
          <a-menu-item key="redo" @click="handleRedo()">
            <span class="menu-item-content">
              <span class="menu-item-label"><SheetIcon name="redo" />重做</span>
              <span class="menu-item-meta"><span class="shortcut">Ctrl+Y</span></span>
            </span>
          </a-menu-item>
          <a-menu-divider />
          <a-menu-item key="cut" @click="handleCut()">
            <span class="menu-item-content">
              <span class="menu-item-label"><SheetIcon name="content-cut" />剪切</span>
              <span class="menu-item-meta"><span class="shortcut">Ctrl+X</span></span>
            </span>
          </a-menu-item>
          <a-menu-item key="copy" @click="handleCopy()">
            <span class="menu-item-content">
              <span class="menu-item-label"><SheetIcon name="content-copy" />复制</span>
              <span class="menu-item-meta"><span class="shortcut">Ctrl+C</span></span>
            </span>
          </a-menu-item>
          <a-menu-item key="paste" @click="handlePaste()">
            <span class="menu-item-content">
              <span class="menu-item-label"><SheetIcon name="content-paste" />粘贴</span>
              <span class="menu-item-meta"><span class="shortcut">Ctrl+V</span></span>
            </span>
          </a-menu-item>
          <a-menu-divider />
          <a-menu-item key="selectAll" @click="selectAll()">
            <span class="menu-item-content">
              <span class="menu-item-label"><SheetIcon name="select-all" />全选</span>
              <span class="menu-item-meta"><span class="shortcut">Ctrl+A</span></span>
            </span>
          </a-menu-item>
          <a-menu-item key="deleteContent" @click="deleteSelectedContent()">
            <span class="menu-item-content">
              <span class="menu-item-label"><SheetIcon name="delete-outline" />删除内容</span>
              <span class="menu-item-meta"><span class="shortcut">Delete</span></span>
            </span>
          </a-menu-item>
        </a-sub-menu>

        <a-sub-menu key="view" popupClassName="sheet-menu-popper">
          <template #title>视图</template>
          <a-menu-item key="showGridlines" @click="toggleGridlines()">
            <span class="menu-item-content">
              <span class="menu-item-label"><SheetIcon name="grid" />{{ showGridlines ? '显示网格线' : '隐藏网格线' }}</span>
              <span class="menu-item-meta"><SheetIcon v-if="showGridlines" name="check" class="menu-check" /></span>
            </span>
          </a-menu-item>
          <a-menu-item key="showFormulaBar" @click="showFormulaBar = !showFormulaBar">
            <span class="menu-item-content">
              <span class="menu-item-label"><SheetIcon name="function-variant" />{{ showFormulaBar ? '显示编辑栏' : '隐藏编辑栏' }}</span>
              <span class="menu-item-meta"><SheetIcon v-if="showFormulaBar" name="check" class="menu-check" /></span>
            </span>
          </a-menu-item>
          <a-menu-divider />
          <a-sub-menu key="zoomMenu" popupClassName="sheet-menu-popper">
            <template #title><SheetIcon name="magnify" />缩放</template>
            <a-menu-item key="zoom50" @click="setZoom(50)">
              <span class="menu-item-content">
                <span class="menu-item-label"><SheetIcon name="magnify-minus" />50%</span>
                <span class="menu-item-meta"><SheetIcon v-if="zoomLevel === 50" name="check" class="menu-check" /></span>
              </span>
            </a-menu-item>
            <a-menu-item key="zoom75" @click="setZoom(75)">
              <span class="menu-item-content">
                <span class="menu-item-label"><SheetIcon name="magnify-minus" />75%</span>
                <span class="menu-item-meta"><SheetIcon v-if="zoomLevel === 75" name="check" class="menu-check" /></span>
              </span>
            </a-menu-item>
            <a-menu-item key="zoom100" @click="setZoom(100)">
              <span class="menu-item-content">
                <span class="menu-item-label"><SheetIcon name="magnify" />100%</span>
                <span class="menu-item-meta"><SheetIcon v-if="zoomLevel === 100" name="check" class="menu-check" /></span>
              </span>
            </a-menu-item>
            <a-menu-item key="zoom125" @click="setZoom(125)">
              <span class="menu-item-content">
                <span class="menu-item-label"><SheetIcon name="magnify-plus" />125%</span>
                <span class="menu-item-meta"><SheetIcon v-if="zoomLevel === 125" name="check" class="menu-check" /></span>
              </span>
            </a-menu-item>
            <a-menu-item key="zoom150" @click="setZoom(150)">
              <span class="menu-item-content">
                <span class="menu-item-label"><SheetIcon name="magnify-plus" />150%</span>
                <span class="menu-item-meta"><SheetIcon v-if="zoomLevel === 150" name="check" class="menu-check" /></span>
              </span>
            </a-menu-item>
            <a-menu-item key="zoom200" @click="setZoom(200)">
              <span class="menu-item-content">
                <span class="menu-item-label"><SheetIcon name="magnify-plus" />200%</span>
                <span class="menu-item-meta"><SheetIcon v-if="zoomLevel === 200" name="check" class="menu-check" /></span>
              </span>
            </a-menu-item>
          </a-sub-menu>
          <a-menu-divider />
          <a-menu-item key="freezeRow" @click="toggleFreezeRow()">
            <span class="menu-item-content">
              <span class="menu-item-label"><SheetIcon name="snowflake" />{{ frozenRows > 0 ? '取消冻结行' : '冻结第一行' }}</span>
              <span class="menu-item-meta"><SheetIcon v-if="frozenRows > 0" name="check" class="menu-check" /></span>
            </span>
          </a-menu-item>
          <a-menu-item key="freezeCol" @click="toggleFreezeCol()">
            <span class="menu-item-content">
              <span class="menu-item-label"><SheetIcon name="snowflake" />{{ frozenCols > 0 ? '取消冻结列' : '冻结第一列' }}</span>
              <span class="menu-item-meta"><SheetIcon v-if="frozenCols > 0" name="check" class="menu-check" /></span>
            </span>
          </a-menu-item>
        </a-sub-menu>


        <a-sub-menu key="insert" popupClassName="sheet-menu-popper">
          <template #title>插入</template>
          <a-menu-item key="insertRowAbove" @click="insertRow('above')">
            <span class="menu-item-content">
              <span class="menu-item-label"><SheetIcon name="table-row-plus-before" />在上方插入行</span>
              <span class="menu-item-meta"></span>
            </span>
          </a-menu-item>
          <a-menu-item key="insertRowBelow" @click="insertRow('below')">
            <span class="menu-item-content">
              <span class="menu-item-label"><SheetIcon name="table-row-plus-after" />在下方插入行</span>
              <span class="menu-item-meta"></span>
            </span>
          </a-menu-item>
          <a-menu-divider />
          <a-menu-item key="insertColLeft" @click="insertCol('left')">
            <span class="menu-item-content">
              <span class="menu-item-label"><SheetIcon name="table-column-plus-before" />在左侧插入列</span>
              <span class="menu-item-meta"></span>
            </span>
          </a-menu-item>
          <a-menu-item key="insertColRight" @click="insertCol('right')">
            <span class="menu-item-content">
              <span class="menu-item-label"><SheetIcon name="table-column-plus-after" />在右侧插入列</span>
              <span class="menu-item-meta"></span>
            </span>
          </a-menu-item>
        </a-sub-menu>

        <a-sub-menu key="delete" popupClassName="sheet-menu-popper">
          <template #title>删除</template>
          <a-menu-item key="deleteRow" @click="deleteRow()">
            <span class="menu-item-content">
              <span class="menu-item-label"><SheetIcon name="table-row-remove" />删除行</span>
              <span class="menu-item-meta"></span>
            </span>
          </a-menu-item>
          <a-menu-item key="deleteCol" @click="deleteCol()">
            <span class="menu-item-content">
              <span class="menu-item-label"><SheetIcon name="table-column-remove" />删除列</span>
              <span class="menu-item-meta"></span>
            </span>
          </a-menu-item>
        </a-sub-menu>


        <a-sub-menu key="format" popupClassName="sheet-menu-popper">
          <template #title>格式</template>
          <a-sub-menu key="textFormat" popupClassName="sheet-menu-popper">
            <template #title><SheetIcon name="format-text" />文本</template>
            <a-menu-item key="fBold" @click="toggleStyle('bold')">
              <span class="menu-item-content">
                <span class="menu-item-label"><SheetIcon name="format-bold" />粗体</span>
                <span class="menu-item-meta"><span class="shortcut">Ctrl+B</span><SheetIcon v-if="toolbarState.bold" name="check" class="menu-check" /></span>
              </span>
            </a-menu-item>
            <a-menu-item key="fItalic" @click="toggleStyle('italic')">
              <span class="menu-item-content">
                <span class="menu-item-label"><SheetIcon name="format-italic" />斜体</span>
                <span class="menu-item-meta"><span class="shortcut">Ctrl+I</span><SheetIcon v-if="toolbarState.italic" name="check" class="menu-check" /></span>
              </span>
            </a-menu-item>
            <a-menu-item key="fUnderline" @click="toggleStyle('underline')">
              <span class="menu-item-content">
                <span class="menu-item-label"><SheetIcon name="format-underline" />下划线</span>
                <span class="menu-item-meta"><span class="shortcut">Ctrl+U</span><SheetIcon v-if="toolbarState.underline" name="check" class="menu-check" /></span>
              </span>
            </a-menu-item>
            <a-menu-item key="fStrikethrough" @click="toggleStyle('strikethrough')">
              <span class="menu-item-content">
                <span class="menu-item-label"><SheetIcon name="format-strikethrough" />删除线</span>
                <span class="menu-item-meta"><SheetIcon v-if="toolbarState.strikethrough" name="check" class="menu-check" /></span>
              </span>
            </a-menu-item>
          </a-sub-menu>
          <a-sub-menu key="alignFormat" popupClassName="sheet-menu-popper">
            <template #title><SheetIcon name="format-align-left" />对齐方式</template>
            <a-menu-item key="aLeft" @click="setAlign('left')">
              <span class="menu-item-content">
                <span class="menu-item-label"><SheetIcon name="format-align-left" />左对齐</span>
                <span class="menu-item-meta"><SheetIcon v-if="toolbarState.align === 'left'" name="check" class="menu-check" /></span>
              </span>
            </a-menu-item>
            <a-menu-item key="aCenter" @click="setAlign('center')">
              <span class="menu-item-content">
                <span class="menu-item-label"><SheetIcon name="format-align-center" />居中对齐</span>
                <span class="menu-item-meta"><SheetIcon v-if="toolbarState.align === 'center'" name="check" class="menu-check" /></span>
              </span>
            </a-menu-item>
            <a-menu-item key="aRight" @click="setAlign('right')">
              <span class="menu-item-content">
                <span class="menu-item-label"><SheetIcon name="format-align-right" />右对齐</span>
                <span class="menu-item-meta"><SheetIcon v-if="toolbarState.align === 'right'" name="check" class="menu-check" /></span>
              </span>
            </a-menu-item>
            <a-menu-divider />
            <a-menu-item key="vaTop" @click="setVerticalAlign('top')">
              <span class="menu-item-content">
                <span class="menu-item-label"><SheetIcon name="format-vertical-align-top" />顶部对齐</span>
                <span class="menu-item-meta"><SheetIcon v-if="toolbarState.verticalAlign === 'top'" name="check" class="menu-check" /></span>
              </span>
            </a-menu-item>
            <a-menu-item key="vaMiddle" @click="setVerticalAlign('middle')">
              <span class="menu-item-content">
                <span class="menu-item-label"><SheetIcon name="format-vertical-align-center" />垂直居中</span>
                <span class="menu-item-meta"><SheetIcon v-if="toolbarState.verticalAlign === 'middle'" name="check" class="menu-check" /></span>
              </span>
            </a-menu-item>
            <a-menu-item key="vaBottom" @click="setVerticalAlign('bottom')">
              <span class="menu-item-content">
                <span class="menu-item-label"><SheetIcon name="format-vertical-align-bottom" />底部对齐</span>
                <span class="menu-item-meta"><SheetIcon v-if="toolbarState.verticalAlign === 'bottom'" name="check" class="menu-check" /></span>
              </span>
            </a-menu-item>
          </a-sub-menu>
          <a-sub-menu key="wrapFormat" popupClassName="sheet-menu-popper">
            <template #title><SheetIcon name="text-wrap" />文本换行</template>
            <a-menu-item key="wrapClip" @click="setWrap('clip')">
              <span class="menu-item-content">
                <span class="menu-item-label"><SheetIcon name="crop" />裁剪</span>
                <span class="menu-item-meta"><SheetIcon v-if="toolbarState.wrap === 'clip'" name="check" class="menu-check" /></span>
              </span>
            </a-menu-item>
            <a-menu-item key="wrapOverflow" @click="setWrap('overflow')">
              <span class="menu-item-content">
                <span class="menu-item-label"><SheetIcon name="arrow-right" />溢出</span>
                <span class="menu-item-meta"><SheetIcon v-if="toolbarState.wrap === 'overflow'" name="check" class="menu-check" /></span>
              </span>
            </a-menu-item>
            <a-menu-item key="wrapWrap" @click="setWrap('wrap')">
              <span class="menu-item-content">
                <span class="menu-item-label"><SheetIcon name="text-wrap" />自动换行</span>
                <span class="menu-item-meta"><SheetIcon v-if="toolbarState.wrap === 'wrap'" name="check" class="menu-check" /></span>
              </span>
            </a-menu-item>
          </a-sub-menu>
          <a-menu-divider />
          <a-sub-menu key="rowFormat" popupClassName="sheet-menu-popper">
            <template #title><SheetIcon name="table-row" />行</template>
            <a-menu-item key="rowHeight" @click="showRowHeightDialog = true">
              <span class="menu-item-content">
                <span class="menu-item-label"><SheetIcon name="arrow-expand-vertical" />行高</span>
                <span class="menu-item-meta"></span>
              </span>
            </a-menu-item>
            <a-menu-item key="autoRowHeight" @click="autoFitRowHeight()">
              <span class="menu-item-content">
                <span class="menu-item-label"><SheetIcon name="arrow-fit-vertical" />自动调整行高</span>
                <span class="menu-item-meta"></span>
              </span>
            </a-menu-item>
            <a-menu-divider />
            <a-menu-item key="hideRow" @click="hideRow()">
              <span class="menu-item-content">
                <span class="menu-item-label"><SheetIcon name="eye-off-outline" />隐藏行</span>
                <span class="menu-item-meta"></span>
              </span>
            </a-menu-item>
            <a-menu-item key="unhideRow" @click="unhideRow()">
              <span class="menu-item-content">
                <span class="menu-item-label"><SheetIcon name="eye-outline" />取消隐藏行</span>
                <span class="menu-item-meta"></span>
              </span>
            </a-menu-item>
          </a-sub-menu>
          <a-sub-menu key="colFormat" popupClassName="sheet-menu-popper">
            <template #title><SheetIcon name="table-column" />列</template>
            <a-menu-item key="colWidth" @click="showColWidthDialog = true">
              <span class="menu-item-content">
                <span class="menu-item-label"><SheetIcon name="arrow-expand-horizontal" />列宽</span>
                <span class="menu-item-meta"></span>
              </span>
            </a-menu-item>
            <a-menu-item key="autoColWidth" @click="autoFitColWidth()">
              <span class="menu-item-content">
                <span class="menu-item-label"><SheetIcon name="arrow-fit-horizontal" />自动调整列宽</span>
                <span class="menu-item-meta"></span>
              </span>
            </a-menu-item>
            <a-menu-divider />
            <a-menu-item key="hideCol" @click="hideCol()">
              <span class="menu-item-content">
                <span class="menu-item-label"><SheetIcon name="eye-off-outline" />隐藏列</span>
                <span class="menu-item-meta"></span>
              </span>
            </a-menu-item>
            <a-menu-item key="unhideCol" @click="unhideCol()">
              <span class="menu-item-content">
                <span class="menu-item-label"><SheetIcon name="eye-outline" />取消隐藏列</span>
                <span class="menu-item-meta"></span>
              </span>
            </a-menu-item>
          </a-sub-menu>
          <a-menu-divider />
          <a-menu-item key="mergeCells" @click="handleMergeCells()">
            <span class="menu-item-content">
              <span class="menu-item-label"><SheetIcon name="table-merge-cells" />合并单元格</span>
              <span class="menu-item-meta"></span>
            </span>
          </a-menu-item>
          <a-menu-item key="unmergeCells" @click="handleUnmergeCells()">
            <span class="menu-item-content">
              <span class="menu-item-label"><SheetIcon name="table-split-cell" />取消合并</span>
              <span class="menu-item-meta"></span>
            </span>
          </a-menu-item>
          <a-menu-divider />
          <a-menu-item key="clearFormat" @click="clearSelectedFormat()">
            <span class="menu-item-content">
              <span class="menu-item-label"><SheetIcon name="format-clear" />清除格式</span>
              <span class="menu-item-meta"></span>
            </span>
          </a-menu-item>
        </a-sub-menu>

        <a-sub-menu key="data" popupClassName="sheet-menu-popper">
          <template #title>数据</template>
          <a-menu-item key="sortAsc" @click="openUniverSort('asc')">
            <span class="menu-item-content">
              <span class="menu-item-label"><SheetIcon name="sort-ascending" />按列升序排序</span>
              <span class="menu-item-meta"></span>
            </span>
          </a-menu-item>
          <a-menu-item key="sortDesc" @click="openUniverSort('desc')">
            <span class="menu-item-content">
              <span class="menu-item-label"><SheetIcon name="sort-descending" />按列降序排序</span>
              <span class="menu-item-meta"></span>
            </span>
          </a-menu-item>
          <a-menu-divider />
          <a-menu-item key="dataValidation" @click="openUniverDataValidation()">
            <span class="menu-item-content">
              <span class="menu-item-label"><SheetIcon name="check-circle-outline" />数据验证</span>
              <span class="menu-item-meta"></span>
            </span>
          </a-menu-item>
          <a-menu-item key="removeDuplicates" @click="removeDuplicates()">
            <span class="menu-item-content">
              <span class="menu-item-label"><SheetIcon name="table-minus" />删除重复值</span>
              <span class="menu-item-meta"></span>
            </span>
          </a-menu-item>
        </a-sub-menu>


        <a-sub-menu key="help" popupClassName="sheet-menu-popper">
          <template #title>帮助</template>
          <a-menu-item key="shortcuts" @click="showShortcutsDialog = true">
            <span class="menu-item-content">
              <span class="menu-item-label"><SheetIcon name="keyboard-outline" />键盘快捷键</span>
              <span class="menu-item-meta"></span>
            </span>
          </a-menu-item>

        </a-sub-menu>
      </a-menu>
    </div>

    <!-- 工具栏 -->
    <div class="toolbar">
      <!-- 撤销/重做/格式刷 -->
      <button class="tb" :disabled="readOnly || undoStack.length === 0" @click="handleUndo()" title="撤销 (Ctrl+Z)">
        <SheetIcon name="undo" />
      </button>
      <button class="tb" :disabled="readOnly || redoStack.length === 0" @click="handleRedo()" title="重做 (Ctrl+Y)">
        <SheetIcon name="redo" />
      </button>
      <button class="tb" :disabled="readOnly" @click="handleFormatPainter()" :class="{ active: formatPainterActive }" title="格式刷">
        <SheetIcon name="format-color-fill" />
      </button>
      <span class="toolbar-divider" />

      <!-- 货币/百分比/小数位快捷按钮 -->
      <button class="tb" :disabled="readOnly" @click="quickFormat('currency')" title="货币格式 (¥)">
        <SheetIcon name="currency-usd" />
      </button>
      <button class="tb" :disabled="readOnly" @click="quickFormat('percent')" title="百分比格式 (%)">
        <SheetIcon name="percent" />
      </button>
      <button class="tb" :disabled="readOnly" @click="changeDecimal(-1)" title="减少小数位">
        <SheetIcon name="decimal-decrease" />
      </button>
      <button class="tb" :disabled="readOnly" @click="changeDecimal(1)" title="增加小数位">
        <SheetIcon name="decimal-increase" />
      </button>
      <!-- 数字格式下拉 -->
      <a-select v-model:value="toolbarState.numberFormat" size="small" class="toolbar-select" style="width: 80px" :disabled="readOnly" @change="updateCellStyle()">
        <a-select-option label="自动" value="auto" />
        <a-select-option label="纯文本" value="text" />
        <a-select-option label="数字" value="number" />
        <a-select-option label="百分比" value="percent" />
        <a-select-option label="货币" value="currency" />
        <a-select-option label="日期" value="date" />
      </a-select>
      <span class="toolbar-divider" />

      <!-- 字体 -->
      <a-select v-model:value="toolbarState.fontFamily" size="small" class="toolbar-select" style="width: 130px" :disabled="readOnly" @change="updateCellStyle()">
        <a-select-option v-for="font in fontOptions" :key="font.value" :label="font.label" :value="font.value">
          <span :style="{ fontFamily: font.value }">{{ font.label }}</span>
        </a-select-option>
      </a-select>

      <!-- 字号 -->
      <a-select v-model:value="toolbarState.fontSize" size="small" class="toolbar-size" style="width: 80px" :disabled="readOnly" @change="updateCellStyle()">
        <a-select-option v-for="s in sizeOptions" :key="s.value + '-' + s.label" :label="s.label" :value="s.value" />
      </a-select>
      <button class="tb" :disabled="readOnly" @click="changeFontSize(1)" title="增大字号">
        <SheetIcon name="plus" />
      </button>
      <button class="tb" :disabled="readOnly" @click="changeFontSize(-1)" title="减小字号">
        <SheetIcon name="minus" />
      </button>
      <span class="toolbar-divider" />

      <!-- 文字样式 -->
      <button class="tb" :disabled="readOnly" :class="{ active: toolbarState.bold }" @click="toggleStyle('bold')" title="粗体 (Ctrl+B)">
        <SheetIcon name="format-bold" />
      </button>
      <button class="tb" :disabled="readOnly" :class="{ active: toolbarState.italic }" @click="toggleStyle('italic')" title="斜体 (Ctrl+I)">
        <SheetIcon name="format-italic" />
      </button>
      <button class="tb" :disabled="readOnly" :class="{ active: toolbarState.strikethrough }" @click="toggleStyle('strikethrough')" title="删除线">
        <SheetIcon name="format-strikethrough" />
      </button>
      <button class="tb" :disabled="readOnly" :class="{ active: toolbarState.underline }" @click="toggleStyle('underline')" title="下划线 (Ctrl+U)">
        <SheetIcon name="format-underline" />
      </button>
      <span class="toolbar-divider" />

      <!-- 字体颜色 -->
      <a-popover placement="bottom" :width="260" trigger="click">
        <template #content>
          <div class="color-panel">
            <div class="color-grid">
              <button v-for="c in colorPalette" :key="'fc-'+c" class="color-cell" :style="{ backgroundColor: c }" @click="setFontColor(c)"></button>
            </div>
          </div>
        </template>
        <template #default>
          <button class="tb color-btn" :disabled="readOnly" title="字体颜色">
            <SheetIcon name="format-text" />
            <span class="color-bar" :style="{ backgroundColor: toolbarState.fontColor || '#000000' }"></span>
          </button>
        </template>
      </a-popover>

      <!-- 填充颜色 -->
      <a-popover placement="bottom" :width="260" trigger="click">
        <template #content>
          <div class="color-panel">
            <div class="color-grid">
              <button class="color-cell color-none" @click="setBgColor('')" title="无填充">
                <svg viewBox="0 0 16 16" width="14" height="14"><line x1="2" y1="14" x2="14" y2="2" stroke="#f00" stroke-width="1.5"/></svg>
              </button>
              <button v-for="c in colorPalette" :key="'bg-'+c" class="color-cell" :style="{ backgroundColor: c }" @click="setBgColor(c)"></button>
            </div>
          </div>
        </template>
        <template #default>
          <button class="tb color-btn" :disabled="readOnly" title="填充颜色">
            <SheetIcon name="format-color-fill" />
            <span class="color-bar" :style="{ backgroundColor: toolbarState.bgColor || '#ffffff' }"></span>
          </button>
        </template>
      </a-popover>
      <span class="toolbar-divider" />

      <!-- 边框 -->
      <a-popover placement="bottom" :width="200" trigger="click">
        <template #content>
          <div class="border-panel">
            <div class="border-grid">
              <button class="border-btn" @click="setBorders('all')" title="所有边框">
                <svg viewBox="0 0 24 24" width="20" height="20"><path fill="currentColor" d="M3,3V21H21V3H3M19,19H13V13H19V19M19,11H13V5H19V11M11,19H5V13H11V19M11,11H5V5H11V11Z"/></svg>
              </button>
              <button class="border-btn" @click="setBorders('outer')" title="外侧边框">
                <svg viewBox="0 0 24 24" width="20" height="20"><path fill="currentColor" d="M3,3V21H21V3H3M19,5V19H5V5H19Z"/></svg>
              </button>
              <button class="border-btn" @click="setBorders('none')" title="无边框">
                <svg viewBox="0 0 24 24" width="20" height="20"><path fill="currentColor" d="M3,3V5H5V3H3M7,3V5H9V3H7M11,3V5H13V3H11M15,3V5H17V3H15M19,3V5H21V3H19M3,7V9H5V7H3M19,7V9H21V7H19M3,11V13H5V11H3M19,11V13H21V11H19M3,15V17H5V15H3M19,15V17H21V15H19M3,19V21H5V19H3M7,19V21H9V19H7M11,19V21H13V19H11M15,19V21H17V19H15M19,19V21H21V19H19Z"/></svg>
              </button>
              <button class="border-btn" @click="setBorders('bottom')" title="下边框">
                <svg viewBox="0 0 24 24" width="20" height="20"><path fill="currentColor" d="M3,19V21H21V19H3Z"/></svg>
              </button>
              <button class="border-btn" @click="setBorders('top')" title="上边框">
                <svg viewBox="0 0 24 24" width="20" height="20"><path fill="currentColor" d="M3,3V5H21V3H3Z"/></svg>
              </button>
              <button class="border-btn" @click="setBorders('left')" title="左边框">
                <svg viewBox="0 0 24 24" width="20" height="20"><path fill="currentColor" d="M3,3V21H5V3H3Z"/></svg>
              </button>
              <button class="border-btn" @click="setBorders('right')" title="右边框">
                <svg viewBox="0 0 24 24" width="20" height="20"><path fill="currentColor" d="M19,3V21H21V3H19Z"/></svg>
              </button>
            </div>
          </div>
        </template>
        <template #default>
          <button class="tb" :disabled="readOnly" title="边框">
            <SheetIcon name="grid" />
            <SheetIcon name="chevron-down" size="12" />
          </button>
        </template>
      </a-popover>

      <!-- 合并单元格 -->
      <button class="tb" :disabled="readOnly" @click="handleMergeCells()" title="合并单元格">
        <SheetIcon name="table-merge-cells" />
      </button>
      <span class="toolbar-divider" />

      <!-- 对齐方式 -->
      <a-popover placement="bottom" :width="140" trigger="click">
        <template #content>
          <div class="align-panel">
            <div class="align-group-label">水平对齐</div>
            <button class="align-btn" :class="{ active: toolbarState.align === 'left' }" @click="setAlign('left')"><SheetIcon name="format-align-left" /><span>左对齐</span></button>
            <button class="align-btn" :class="{ active: toolbarState.align === 'center' }" @click="setAlign('center')"><SheetIcon name="format-align-center" /><span>居中</span></button>
            <button class="align-btn" :class="{ active: toolbarState.align === 'right' }" @click="setAlign('right')"><SheetIcon name="format-align-right" /><span>右对齐</span></button>
            <div class="align-group-divider"></div>
            <div class="align-group-label">垂直对齐</div>
            <button class="align-btn" :class="{ active: toolbarState.verticalAlign === 'top' }" @click="setVerticalAlign('top')"><SheetIcon name="format-vertical-align-top" /><span>顶部</span></button>
            <button class="align-btn" :class="{ active: toolbarState.verticalAlign === 'middle' }" @click="setVerticalAlign('middle')"><SheetIcon name="format-vertical-align-center" /><span>居中</span></button>
            <button class="align-btn" :class="{ active: toolbarState.verticalAlign === 'bottom' }" @click="setVerticalAlign('bottom')"><SheetIcon name="format-vertical-align-bottom" /><span>底部</span></button>
          </div>
        </template>
        <template #default>
          <button class="tb" :disabled="readOnly" title="对齐方式">
            <SheetIcon :name="'format-align-' + (toolbarState.align || 'left')" />
            <SheetIcon name="chevron-down" size="12" />
          </button>
        </template>
      </a-popover>

      <!-- 文本换行 -->
      <button class="tb" :disabled="readOnly" :class="{ active: toolbarState.wrap === 'wrap' }" @click="toggleWrap()" title="自动换行">
        <SheetIcon name="text-wrap" />
      </button>

      <!-- 文字旋转 -->
      <a-popover placement="bottom" :width="140" trigger="click">
        <template #content>
          <div class="align-panel">
            <button class="align-btn" :class="{ active: toolbarState.rotation === 0 }" @click="setRotation(0)"><SheetIcon name="format-text-rotation-none" /><span>无旋转</span></button>
            <button class="align-btn" :class="{ active: toolbarState.rotation === 45 }" @click="setRotation(45)"><SheetIcon name="format-text-rotation-up" /><span>向上倾斜</span></button>
            <button class="align-btn" :class="{ active: toolbarState.rotation === -45 }" @click="setRotation(-45)"><SheetIcon name="format-text-rotation-down" /><span>向下倾斜</span></button>
            <button class="align-btn" :class="{ active: toolbarState.rotation === 90 }" @click="setRotation(90)"><SheetIcon name="format-text-rotation-vertical" /><span>竖排文字</span></button>
          </div>
        </template>
        <template #default>
          <button class="tb" :disabled="readOnly" title="文字旋转">
            <SheetIcon name="format-text-rotation-none" />
            <SheetIcon name="chevron-down" size="12" />
          </button>
        </template>
      </a-popover>
      <span class="toolbar-divider" />

      <!-- 冻结 -->
      <button class="tb" :class="{ active: frozenRows > 0 || frozenCols > 0 }" @click="toggleFreezeRow()" title="冻结首行">
        <SheetIcon name="snowflake" />
      </button>
      <!-- 筛选排序 -->
      <button class="tb" :disabled="readOnly" @click="toggleUniverFilter()" title="筛选">
        <SheetIcon name="filter-outline" />
      </button>
      <span class="toolbar-divider" />

      <!-- 超链接 -->
      <button class="tb" :disabled="readOnly" @click="openUniverHyperlink()" title="插入链接">
        <SheetIcon name="link-variant" />
      </button>
      <!-- 插入图片 -->
      <button class="tb" :disabled="readOnly" @click="insertImage()" title="插入图片">
        <SheetIcon name="image-outline" />
      </button>
      <!-- 便签 -->
      <button class="tb" :disabled="readOnly" @click="openUniverNote()" title="便签">
        <SheetIcon name="note-text-outline" />
      </button>
      <!-- 评论 -->
      <button class="tb" :disabled="readOnly" @click="openUniverThreadComment()" title="评论">
        <SheetIcon name="comment-plus-outline" />
      </button>
      <span class="toolbar-divider" />

      <!-- 快速函数 -->
      <a-popover placement="bottom" :width="150" trigger="click">
        <template #content>
          <div class="align-panel">
            <button class="align-btn" @click="insertFunction('SUM')"><span>SUM 求和</span></button>
            <button class="align-btn" @click="insertFunction('AVERAGE')"><span>AVERAGE 平均值</span></button>
            <button class="align-btn" @click="insertFunction('COUNT')"><span>COUNT 计数</span></button>
            <button class="align-btn" @click="insertFunction('MAX')"><span>MAX 最大值</span></button>
            <button class="align-btn" @click="insertFunction('MIN')"><span>MIN 最小值</span></button>
          </div>
        </template>
        <template #default>
          <button class="tb" :disabled="readOnly" title="函数">
            <SheetIcon name="sigma" />
            <SheetIcon name="chevron-down" size="12" />
          </button>
        </template>
      </a-popover>
      <span class="toolbar-divider" />

      <!-- 清除格式 -->
      <button class="tb" :disabled="readOnly" @click="clearSelectedFormat()" title="清除格式">
        <SheetIcon name="format-clear" />
      </button>
      <!-- 打印 -->
      <button class="tb" @click="handlePrint()" title="打印 (Ctrl+P)">
        <SheetIcon name="printer" />
      </button>
      <!-- 查找替换 -->
      <button class="tb" @click="openUniverReplaceDialog()" title="查找和替换 (Ctrl+H)">
        <SheetIcon name="find-replace" />
      </button>
    </div>
    </div>

    <div v-if="showFormulaBar" class="formula-row">
      <div class="cell-ref" @click="selectCellRefInput()">{{ currentCellRef }}</div>
      <input
        ref="formulaInputRef"
        :value="formulaValue"
        class="formula-input"
        :readonly="readOnly"
        placeholder="输入内容或公式"
        @input="onFormulaInput"
        @focus="formulaFocused = true"
        @blur="formulaFocused = false"
        @keydown.enter.prevent="confirmFormulaAndMove('down')"
        @keydown.tab.prevent="confirmFormulaAndMove('right')"
      />
    </div>

    <!-- 表格网格 -->
    <div class="grid-scroll univer-grid-scroll">
      <div class="univer-grid-viewport">
        <div :id="univerContainerId" ref="univerHostRef" class="univer-host"></div>
      </div>
    </div>


    <!-- 快捷键对话框 -->
    <a-modal v-model:open="showShortcutsDialog" title="键盘快捷键" width="480px" :footer="null">
      <div class="shortcuts-list">
        <div class="shortcut-group">
          <div class="shortcut-row"><span>撤销</span><kbd>Ctrl+Z</kbd></div>
          <div class="shortcut-row"><span>重做</span><kbd>Ctrl+Y</kbd></div>
          <div class="shortcut-row"><span>粗体</span><kbd>Ctrl+B</kbd></div>
          <div class="shortcut-row"><span>斜体</span><kbd>Ctrl+I</kbd></div>
          <div class="shortcut-row"><span>下划线</span><kbd>Ctrl+U</kbd></div>
          <div class="shortcut-row"><span>复制</span><kbd>Ctrl+C</kbd></div>
          <div class="shortcut-row"><span>剪切</span><kbd>Ctrl+X</kbd></div>
          <div class="shortcut-row"><span>粘贴</span><kbd>Ctrl+V</kbd></div>
          <div class="shortcut-row"><span>全选</span><kbd>Ctrl+A</kbd></div>
          <div class="shortcut-row"><span>查找/替换</span><kbd>Ctrl+F / Ctrl+H</kbd></div>
          <div class="shortcut-row"><span>打印</span><kbd>Ctrl+P</kbd></div>
          <div class="shortcut-row"><span>编辑单元格</span><kbd>F2</kbd></div>
          <div class="shortcut-row"><span>删除内容</span><kbd>Delete / Backspace</kbd></div>
          <div class="shortcut-row"><span>移动选区</span><kbd>方向键</kbd></div>
          <div class="shortcut-row"><span>切换单元格</span><kbd>Tab / Shift+Tab</kbd></div>
          <div class="shortcut-row"><span>确认并下移</span><kbd>Enter</kbd></div>
          <div class="shortcut-row"><span>行首/行尾</span><kbd>Home / End</kbd></div>
        </div>
      </div>
    </a-modal>

    <!-- 行高对话框 -->
    <a-modal v-model:open="showRowHeightDialog" title="设置行高" width="360px" @ok="applyRowHeight">
      <div style="padding: 16px 0">
        <label>行高（像素）：</label>
        <a-input-number v-model:value="rowHeightValue" :min="0" :max="500" style="width: 100%; margin-top: 8px" />
      </div>
    </a-modal>

    <!-- 列宽对话框 -->
    <a-modal v-model:open="showColWidthDialog" title="设置列宽" width="360px" @ok="applyColWidth">
      <div style="padding: 16px 0">
        <label>列宽（像素）：</label>
        <a-input-number v-model:value="colWidthValue" :min="0" :max="500" style="width: 100%; margin-top: 8px" />
      </div>
    </a-modal>

    <input
      ref="importExcelInputRef"
      type="file"
      accept=".xlsx,.xls"
      style="display:none"
      @change="handleImportExcelChange"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import { message } from 'ant-design-vue'
import type { Univer as UniverType } from '@univerjs/core'
import type { FUniver } from '@univerjs/core/facade'
import type { FRange, FWorkbook, FWorksheet } from '@univerjs/sheets/facade'
import SheetIcon from './SheetIcon.vue'
import UnifiedTopHeader from './UnifiedTopHeader.vue'
import type { Align, VerticalAlign, WrapMode, ICellStyle, IUiSheet, IWorkbook, UndoEntry } from '../types'
import { createExcelI18n } from '@/i18n'
import type { ExcelI18nMessages, ExcelLocale } from '@/i18n'
import { readExcelFileToWorkbook } from '../utils/excel-import'
import { writeWorkbookToExcelBuffer } from '../utils/excel-export'
import { loadUniverRuntime } from '../utils/univer-runtime'
import type { LoadedUniverRuntime } from '../utils/univer-runtime'

const props = withDefaults(defineProps<{
  initialContent?: any
  documentUrl?: string
  documentName?: string
  readOnly?: boolean
  locale?: ExcelLocale
  i18n?: Partial<ExcelI18nMessages>
}>(), {
  initialContent: undefined,
  documentUrl: undefined,
  documentName: '',
  readOnly: false,
  locale: 'zhCN'
})

const excelI18n = createExcelI18n({
  locale: props.locale,
  overrides: props.i18n,
})

watch(() => props.locale, (locale) => {
  excelI18n.setLocale(locale || 'zhCN')
}, { immediate: true })

watch(() => props.i18n, (overrides) => {
  excelI18n.setOverrides(overrides)
})

const t = (key: string, params?: Record<string, string | number>) => excelI18n.t(key, params)

const headerLastSaveTime = ref('')
const localDocumentTitle = ref(String(props.documentName || '').trim())
watch(() => props.documentName, (name) => {
  localDocumentTitle.value = String(name || '').trim()
}, { immediate: true })
const headerTitle = computed(() => {
  const documentName = String(localDocumentTitle.value || '').trim()
  if (documentName) return documentName
  const name = String(activeSheet.value?.name || '').trim()
  return name || t('sheet.defaultTitle')
})

const emit = defineEmits<{
  (e: 'change', value: any): void
  (e: 'new-document', payload: { dbPayload: any; excelPayload: { fileName: string; mimeType: string; buffer: ArrayBuffer } }): void
}>()

const fontOptions = [
  { label: '宋体', value: 'SimSun, serif' },
  { label: '楷体', value: 'KaiTi, serif' },
  { label: '仿宋', value: 'FangSong, serif' },
  { label: '黑体', value: 'SimHei, sans-serif' },
  { label: '微软雅黑', value: 'Microsoft YaHei, sans-serif' },
  { label: '微软正黑体', value: 'Microsoft JhengHei, sans-serif' },
  { label: '华文新魏', value: 'STXinwei, serif' },
  { label: '思源黑体', value: 'Source Han Sans CN, sans-serif' },
  { label: '思源宋体', value: 'Source Han Serif CN, serif' },
  { label: 'Arial', value: 'Arial, sans-serif' },
  { label: 'Times New Roman', value: 'Times New Roman, serif' },
  { label: 'Segoe UI', value: 'Segoe UI, sans-serif' },
  { label: 'Courier New', value: 'Courier New, monospace' },
]
const sizeOptions = [
  { label: '初号', value: 42 },
  { label: '小初', value: 36 },
  { label: '一号', value: 26 },
  { label: '小一', value: 24 },
  { label: '二号', value: 22 },
  { label: '小二', value: 18 },
  { label: '三号', value: 16 },
  { label: '小三', value: 15 },
  { label: '四号', value: 14 },
  { label: '小四', value: 12 },
  { label: '五号', value: 10.5 },
  { label: '小五', value: 9 },
  { label: '六号', value: 7.5 },
  { label: '小六', value: 6.5 },
  { label: '七号', value: 5.5 },
  { label: '八号', value: 5 },
  { label: '5', value: 5 },
  { label: '5.5', value: 5.5 },
  { label: '6', value: 6 },
  { label: '6.5', value: 6.5 },
  { label: '7', value: 7 },
  { label: '7.5', value: 7.5 },
  { label: '8', value: 8 },
  { label: '9', value: 9 },
  { label: '10', value: 10 },
  { label: '10.5', value: 10.5 },
  { label: '11', value: 11 },
  { label: '12', value: 12 },
  { label: '14', value: 14 },
  { label: '16', value: 16 },
  { label: '18', value: 18 },
  { label: '20', value: 20 },
  { label: '22', value: 22 },
  { label: '24', value: 24 },
  { label: '26', value: 26 },
  { label: '28', value: 28 },
  { label: '36', value: 36 },
  { label: '48', value: 48 },
  { label: '72', value: 72 },
]
const colorPalette = [
  '#000000', '#434343', '#666666', '#999999', '#b7b7b7', '#cccccc', '#d9d9d9', '#efefef', '#f3f3f3', '#ffffff',
  '#980000', '#ff0000', '#ff9900', '#ffff00', '#00ff00', '#00ffff', '#4a86e8', '#0000ff', '#9900ff', '#ff00ff',
  '#e6b8af', '#f4cccc', '#fce5cd', '#fff2cc', '#d9ead3', '#d0e0e3', '#c9daf8', '#cfe2f3', '#d9d2e9', '#ead1dc',
  '#dd7e6b', '#ea9999', '#f9cb9c', '#ffe599', '#b6d7a8', '#a2c4c9', '#a4c2f4', '#9fc5e8', '#b4a7d6', '#d5a6bd',
  '#cc4125', '#e06666', '#f6b26b', '#ffd966', '#93c47d', '#76a5af', '#6d9eeb', '#6fa8dc', '#8e7cc3', '#c27ba0',
  '#a61c00', '#cc0000', '#e69138', '#f1c232', '#6aa84f', '#45818e', '#3c78d8', '#3d85c6', '#674ea7', '#a64d79',
]

const workbook = reactive<IWorkbook>(normalizeWorkbook(props.initialContent))
const activeSheetIndex = ref(0)
const selected = reactive({ row: 0, col: 0 })
const selectionEnd = reactive({ row: 0, col: 0 })

const formulaValue = ref('')
const formulaFocused = ref(false)
const formulaInputRef = ref<HTMLInputElement | null>(null)


const sheetEditorRef = ref<HTMLElement | null>(null)
const showGridlines = ref(true)
const showFormulaBar = ref(true)
const frozenRows = ref(0)
const frozenCols = ref(0)
const formatPainterActive = ref(false)

const colWidths = reactive<Record<number, number>>({})
const rowHeights = reactive<Record<number, number>>({})



const undoStack = ref<UndoEntry[]>([])
const redoStack = ref<UndoEntry[]>([])

const filterActive = ref(false)
const filterColumn = ref<number | null>(null)
const filterKeyword = ref('')
const filteredRows = reactive<Record<number, boolean>>({})
const filterPopoverVisible = ref(false)
const filterValueOptions = ref<string[]>([])
const filterSelectedValues = reactive<Record<string, boolean>>({})
const showShortcutsDialog = ref(false)

const importExcelInputRef = ref<HTMLInputElement | null>(null)
const FILTER_EMPTY_TOKEN = '__EMPTY__'

const zoomLevel = ref(100)
const showRowHeightDialog = ref(false)
const showColWidthDialog = ref(false)
const rowHeightValue = ref(20)
const colWidthValue = ref(100)

const univerContainerId = 'vervedocs-univer-host'
const univerHostRef = ref<HTMLElement | null>(null)
let univerRenderTimer: number | undefined
let renderingUniver = false
let univerRuntime: LoadedUniverRuntime | null = null
let univerInstance: UniverType | null = null
let univerAPI: FUniver | null = null
let activeUniverWorkbook: FWorkbook | null = null
let univerWorkbookDisposables: Array<{ dispose: () => void }> = []
let lastUniverSnapshot = ''


const toolbarState = reactive<ICellStyle & { numberFormat: string; decimalPlaces: number; rotation: number; verticalAlign: VerticalAlign }>({
  fontFamily: 'Microsoft YaHei, sans-serif',
  fontSize: 12,
  align: 'left',
  verticalAlign: 'bottom',
  bold: false,
  italic: false,
  underline: false,
  strikethrough: false,
  fontColor: '#000000',
  bgColor: '',
  wrap: 'clip',
  numberFormat: 'auto',
  decimalPlaces: 2,
  rotation: 0,
})

async function ensureUniverRuntime() {
  if (!univerRuntime) {
    univerRuntime = await loadUniverRuntime(props.locale)
  }
  return univerRuntime
}

function getUniverLocaleType(runtime: LoadedUniverRuntime) {
  return props.locale === 'enUS' ? runtime.core.LocaleType.EN_US : runtime.core.LocaleType.ZH_CN
}

function getActiveSheet(): FWorksheet | null {
  return activeUniverWorkbook?.getActiveSheet() ?? null
}

function getSelectionRange(): FRange | null {
  const sheet = getActiveSheet()
  if (!sheet) return null
  const { r1, r2, c1, c2 } = selectionRange.value
  return sheet.getRange(r1, c1, r2 - r1 + 1, c2 - c1 + 1)
}

const UNIVER_COMMANDS = {
  addNote: 'sheet.operation.add-note-popup',
  addThreadComment: 'sheet.operation.show-comment-modal',
  dataValidation: 'data-validation.operation.open-validation-panel',
  find: 'ui.operation.open-find-dialog',
  hyperlink: 'sheet.operation.insert-hyper-link',
  replace: 'ui.operation.open-replace-dialog',
  sortRange: 'sheet.command.sort-range',
  toggleFilter: 'sheet.command.smart-toggle-filter',
} as const

async function executeUniverCommand(commandId: string, params?: Record<string, any>) {
  if (!univerAPI) {
    message.warning('表格尚未初始化')
    return false
  }
  try {
    return await univerAPI.executeCommand(commandId, params)
  } catch (error) {
    console.error(`[SheetEditor] command failed: ${commandId}`, error)
    message.error('官方功能执行失败')
    return false
  }
}

async function openUniverSort(order: 'asc' | 'desc') {
  if (props.readOnly) return false
  const sheet = getActiveSheet()
  const workbook = activeUniverWorkbook
  if (!sheet || !workbook) {
    message.warning('表格尚未初始化')
    return false
  }

  const { r1, r2, c1, c2 } = selectionRange.value
  const sortWholeSheet = r1 === r2 && c1 === c2
  const startRow = sortWholeSheet ? 0 : r1
  const endRow = sortWholeSheet ? Math.max(0, (activeSheet.value?.rowCount || 1) - 1) : r2
  const startColumn = sortWholeSheet ? 0 : c1
  const endColumn = sortWholeSheet ? Math.max(0, (activeSheet.value?.colCount || 1) - 1) : c2
  const colIndex = Math.max(0, selected.col - startColumn)

  return executeUniverCommand(UNIVER_COMMANDS.sortRange, {
    unitId: workbook.getId(),
    subUnitId: sheet.getSheetId(),
    range: {
      startRow,
      endRow,
      startColumn,
      endColumn,
    },
    orderRules: [{
      colIndex,
      type: order,
    }],
    hasTitle: false,
  })
}

async function openUniverDataValidation() {
  if (props.readOnly) return false
  return executeUniverCommand(UNIVER_COMMANDS.dataValidation)
}

async function toggleUniverFilter() {
  if (props.readOnly) return false
  return executeUniverCommand(UNIVER_COMMANDS.toggleFilter)
}

async function openUniverHyperlink() {
  if (props.readOnly) return false
  return executeUniverCommand(UNIVER_COMMANDS.hyperlink)
}

async function openUniverNote() {
  if (props.readOnly) return false
  return executeUniverCommand(UNIVER_COMMANDS.addNote)
}

async function openUniverThreadComment() {
  if (props.readOnly) return false
  return executeUniverCommand(UNIVER_COMMANDS.addThreadComment)
}

async function openUniverFindDialog() {
  return executeUniverCommand(UNIVER_COMMANDS.find)
}

async function openUniverReplaceDialog() {
  return executeUniverCommand(UNIVER_COMMANDS.replace)
}

function clearUniverWorkbookDisposables() {
  univerWorkbookDisposables.forEach(disposable => disposable.dispose())
  univerWorkbookDisposables = []
}

async function ensureUniverInitialized(host: HTMLElement) {
  if (univerInstance && univerAPI) return
  const runtime = await ensureUniverRuntime()

  univerInstance = new runtime.core.Univer({
    locale: getUniverLocaleType(runtime),
    locales: {
      [runtime.core.LocaleType.ZH_CN]: runtime.core.mergeLocales(
        runtime.locales.conditionalFormattingUI,
        runtime.locales.crosshairHighlight,
        runtime.locales.dataValidation,
        runtime.locales.dataValidationUI,
        runtime.locales.design,
        runtime.locales.ui,
        runtime.locales.docsUI,
        runtime.locales.drawingUI,
        runtime.locales.findReplace,
        runtime.locales.sheets,
        runtime.locales.sheetsFilter,
        runtime.locales.sheetsFilterUI,
        runtime.locales.sheetsHyperLink,
        runtime.locales.sheetsHyperLinkUI,
        runtime.locales.sheetsUI,
        runtime.locales.sheetsFormulaUI,
        runtime.locales.sheetsNoteUI,
        runtime.locales.sheetsNumfmtUI,
        runtime.locales.sheetsSortUI,
        runtime.locales.sheetsTable,
        runtime.locales.sheetsTableUI,
        runtime.locales.sheetsThreadCommentUI,
        runtime.locales.threadCommentUI,
        runtime.locales.zenEditor,
      ),
      [runtime.core.LocaleType.EN_US]: runtime.core.mergeLocales(
        runtime.locales.conditionalFormattingUI,
        runtime.locales.crosshairHighlight,
        runtime.locales.dataValidation,
        runtime.locales.dataValidationUI,
        runtime.locales.design,
        runtime.locales.ui,
        runtime.locales.docsUI,
        runtime.locales.drawingUI,
        runtime.locales.findReplace,
        runtime.locales.sheets,
        runtime.locales.sheetsFilter,
        runtime.locales.sheetsFilterUI,
        runtime.locales.sheetsHyperLink,
        runtime.locales.sheetsHyperLinkUI,
        runtime.locales.sheetsUI,
        runtime.locales.sheetsFormulaUI,
        runtime.locales.sheetsNoteUI,
        runtime.locales.sheetsNumfmtUI,
        runtime.locales.sheetsSortUI,
        runtime.locales.sheetsTable,
        runtime.locales.sheetsTableUI,
        runtime.locales.sheetsThreadCommentUI,
        runtime.locales.threadCommentUI,
        runtime.locales.zenEditor,
      ),
    },
  })
  univerInstance.registerPlugin(runtime.plugins.UniverRenderEnginePlugin)
  univerInstance.registerPlugin(runtime.plugins.UniverFormulaEnginePlugin)
  univerInstance.registerPlugin(runtime.plugins.UniverUIPlugin, {
    container: host,
    header: false,
    toolbar: false,
    footer: true,
    contextMenu: true,
  })
  univerInstance.registerPlugin(runtime.plugins.UniverDocsPlugin)
  univerInstance.registerPlugin(runtime.plugins.UniverDocsUIPlugin)
  univerInstance.registerPlugin(runtime.plugins.UniverSheetsPlugin)
  univerInstance.registerPlugin(runtime.plugins.UniverSheetsGraphicsPlugin)
  univerInstance.registerPlugin(runtime.plugins.UniverSheetsDrawingPlugin)
  univerInstance.registerPlugin(runtime.plugins.UniverSheetsTablePlugin)
  univerInstance.registerPlugin(runtime.plugins.UniverSheetsDataValidationPlugin)
  univerInstance.registerPlugin(runtime.plugins.UniverSheetsConditionalFormattingPlugin)
  univerInstance.registerPlugin(runtime.plugins.UniverSheetsFilterPlugin)
  univerInstance.registerPlugin(runtime.plugins.UniverSheetsSortPlugin)
  univerInstance.registerPlugin(runtime.plugins.UniverSheetsHyperLinkPlugin)
  univerInstance.registerPlugin(runtime.plugins.UniverSheetsNotePlugin)
  univerInstance.registerPlugin(runtime.plugins.UniverThreadCommentPlugin)
  univerInstance.registerPlugin(runtime.plugins.UniverSheetsThreadCommentPlugin)
  univerInstance.registerPlugin(runtime.plugins.UniverFindReplacePlugin)
  univerInstance.registerPlugin(runtime.plugins.UniverSheetsFindReplacePlugin)
  univerInstance.registerPlugin(runtime.plugins.UniverSheetsUIPlugin, {
    footer: {
      addSheetButtonConfig: {
        show: true,
        defaultRowCount: 50,
        defaultColumnCount: 26,
      }
    }
  })
  univerInstance.registerPlugin(runtime.plugins.UniverSheetsFormulaPlugin)
  univerInstance.registerPlugin(runtime.plugins.UniverSheetsFormulaUIPlugin)
  univerInstance.registerPlugin(runtime.plugins.UniverSheetsNumfmtPlugin)
  univerInstance.registerPlugin(runtime.plugins.UniverSheetsNumfmtUIPlugin)
  univerInstance.registerPlugin(runtime.plugins.UniverSheetsDrawingUIPlugin)
  univerInstance.registerPlugin(runtime.plugins.UniverSheetsTableUIPlugin)
  univerInstance.registerPlugin(runtime.plugins.UniverSheetsDataValidationUIPlugin)
  univerInstance.registerPlugin(runtime.plugins.UniverSheetsConditionalFormattingUIPlugin)
  univerInstance.registerPlugin(runtime.plugins.UniverSheetsFilterUIPlugin)
  univerInstance.registerPlugin(runtime.plugins.UniverSheetsSortUIPlugin)
  univerInstance.registerPlugin(runtime.plugins.UniverSheetsHyperLinkUIPlugin)
  univerInstance.registerPlugin(runtime.plugins.UniverSheetsNoteUIPlugin)
  univerInstance.registerPlugin(runtime.plugins.UniverThreadCommentUIPlugin)
  univerInstance.registerPlugin(runtime.plugins.UniverSheetsThreadCommentUIPlugin)
  univerInstance.registerPlugin(runtime.plugins.UniverSheetsCrosshairHighlightPlugin)
  univerInstance.registerPlugin(runtime.plugins.UniverSheetsZenEditorPlugin)
  univerAPI = runtime.facade.FUniver.newAPI(univerInstance)
}

function bindUniverEvents() {
  clearUniverWorkbookDisposables()
  if (!univerAPI) return
  univerWorkbookDisposables.push(univerAPI.addEvent(univerAPI.Event.CommandExecuted, () => {
    if (renderingUniver) return
    window.setTimeout(() => {
      if (renderingUniver) return
      updateSelectionFromUniver()
      const changed = syncWorkbookFromUniver()
      if (changed) {
        emitChange('univer')
      }
    }, 0)
  }))
}

function disposeActiveUniverWorkbook() {
  if (!univerAPI || !activeUniverWorkbook) {
    activeUniverWorkbook = null
    return
  }
  const unitId = activeUniverWorkbook.getId()
  activeUniverWorkbook = null
  univerAPI.disposeUnit(unitId)
}

function clearUniverRenderTimer() {
  if (univerRenderTimer !== undefined) {
    window.clearTimeout(univerRenderTimer)
    univerRenderTimer = undefined
  }
}

function syncDimensionStateFromActiveSheet() {
  Object.keys(colWidths).forEach(key => delete colWidths[Number(key)])
  Object.keys(rowHeights).forEach(key => delete rowHeights[Number(key)])
  const sheet = activeSheet.value
  if (!sheet) return
  const sheetColWidths = sheet.colWidths || {}
  const sheetRowHeights = sheet.rowHeights || {}
  frozenRows.value = Number.isFinite(sheet.frozenRows) ? Number(sheet.frozenRows) : 0
  frozenCols.value = Number.isFinite(sheet.frozenCols) ? Number(sheet.frozenCols) : 0
  for (const [key, value] of Object.entries(sheetColWidths)) {
    const col = Number(key)
    if (Number.isFinite(col) && Number.isFinite(value)) {
      colWidths[col] = Number(value)
    }
  }
  for (const [key, value] of Object.entries(sheetRowHeights)) {
    const row = Number(key)
    if (Number.isFinite(row) && Number.isFinite(value)) {
      rowHeights[row] = Number(value)
    }
  }
}

function syncDimensionStateToActiveSheet() {
  const sheet = activeSheet.value
  if (!sheet) return
  sheet.colWidths = {}
  sheet.rowHeights = {}
  for (const [key, value] of Object.entries(colWidths)) {
    const col = Number(key)
    if (Number.isFinite(col) && Number.isFinite(value)) {
      sheet.colWidths[col] = Number(value)
    }
  }
  for (const [key, value] of Object.entries(rowHeights)) {
    const row = Number(key)
    if (Number.isFinite(row) && Number.isFinite(value)) {
      sheet.rowHeights[row] = Number(value)
    }
  }
  sheet.frozenRows = Math.max(0, Number(frozenRows.value || 0))
  sheet.frozenCols = Math.max(0, Number(frozenCols.value || 0))
}

function loadFilterStateFromActiveSheet() {
  const sheet = activeSheet.value
  resetFilterState()
  if (!sheet) return
  filterColumn.value = Number.isFinite(sheet.filterColumn) ? Number(sheet.filterColumn) : null
  filterKeyword.value = String(sheet.filterKeyword || '')
  filterActive.value = !!sheet.filterActive
  const selectedValues = sheet.filterSelectedValues || {}
  for (const [key, value] of Object.entries(selectedValues)) {
    filterSelectedValues[key] = value !== false
  }
  if (filterColumn.value !== null) {
    prepareFilterPanel(false)
  }
  applyFilterRows()
}

function syncFilterStateToActiveSheet() {
  const sheet = activeSheet.value
  if (!sheet) return
  sheet.filterColumn = filterColumn.value
  sheet.filterKeyword = filterKeyword.value
  sheet.filterActive = filterActive.value
  const selectedValues: Record<string, boolean> = {}
  for (const [key, value] of Object.entries(filterSelectedValues)) {
    if (value === false) selectedValues[key] = false
  }
  sheet.filterSelectedValues = selectedValues
}

watch(
  () => props.initialContent,
  next => {
    const normalized = normalizeWorkbook(next)
    workbook.version = normalized.version
    workbook.resources = normalized.resources
    workbook.sheets = normalized.sheets
    activeSheetIndex.value = 0
    selected.row = 0
    selected.col = 0
    selectionEnd.row = 0
    selectionEnd.col = 0
    syncDimensionStateFromActiveSheet()
    loadFilterStateFromActiveSheet()
    syncToolbarAndFormula()
    undoStack.value = []
    redoStack.value = []
    scheduleUniverRender()
  },
  { deep: true }
)

const activeSheet = computed(() => workbook.sheets[activeSheetIndex.value] || workbook.sheets[0])
const currentRows = computed(() => Array.from({ length: Math.max(1, activeSheet.value?.rowCount || 50) }, (_, i) => i))
const currentColumns = computed(() => Array.from({ length: Math.max(1, activeSheet.value?.colCount || 26) }, (_, i) => i))
const currentCellRef = computed(() => `${columnLabel(selected.col)}${selected.row + 1}`)

const selectionRange = computed(() => {
  const r1 = Math.min(selected.row, selectionEnd.row)
  const r2 = Math.max(selected.row, selectionEnd.row)
  const c1 = Math.min(selected.col, selectionEnd.col)
  const c2 = Math.max(selected.col, selectionEnd.col)
  return { r1, r2, c1, c2 }
})



watch([activeSheetIndex, () => selected.row, () => selected.col], () => {
  syncDimensionStateFromActiveSheet()
  syncToolbarAndFormula()
})

watch(activeSheetIndex, () => {
  loadFilterStateFromActiveSheet()
  const nextSheet = activeUniverWorkbook?.getSheets()?.[activeSheetIndex.value]
  if (nextSheet) {
    activeUniverWorkbook?.setActiveSheet(nextSheet)
    applySelectionToUniver()
  }
})

function updateSelectionFromUniver() {
  const activeSheet = activeUniverWorkbook?.getActiveSheet()
  const activeRange = activeSheet?.getActiveRange()
  if (!activeSheet || !activeRange) return
  const nextIndex = workbook.sheets.findIndex(sheet => sheet.id === activeSheet.getSheetId())
  if (nextIndex >= 0) {
    activeSheetIndex.value = nextIndex
  }
  selected.row = activeRange.getRow()
  selectionEnd.row = activeRange.getLastRow()
  selected.col = activeRange.getColumn()
  selectionEnd.col = activeRange.getLastColumn()
  syncToolbarAndFormula()
}

function syncWorkbookFromUniver() {
  const snapshot = activeUniverWorkbook?.save()
  if (!snapshot || !univerRuntime) return false
  const serialized = JSON.stringify(snapshot)
  const changed = serialized !== lastUniverSnapshot
  lastUniverSnapshot = serialized
  const extracted = univerRuntime.adapter.univerWorkbookToInternal(snapshot)
  const currentSheets = workbook.sheets || []
  workbook.version = extracted.version || workbook.version || 1
  workbook.resources = extracted.resources && typeof extracted.resources === 'object'
    ? JSON.parse(JSON.stringify(extracted.resources))
    : undefined
  workbook.sheets = extracted.sheets.map((sheet, index) => {
    const currentById = currentSheets.find(item => item.id === sheet.id)
    const current = currentById || currentSheets[index]
    return {
      ...sheet,
      cellMeta: { ...(sheet.cellMeta || current?.cellMeta || {}) },
      filterColumn: current?.filterColumn ?? null,
      filterKeyword: current?.filterKeyword || '',
      filterSelectedValues: { ...(current?.filterSelectedValues || {}) },
      filterActive: !!current?.filterActive
    }
  })
  return changed
}

async function waitForLuckysheetHost(host: HTMLElement) {
  for (let index = 0; index < 4; index++) {
    await nextTick()
    await new Promise<void>(resolve => requestAnimationFrame(() => resolve()))
    if (host.clientHeight > 0) {
      return true
    }
  }
  return false
}

function applySelectionToUniver() {
  const sheets = activeUniverWorkbook?.getSheets() || []
  const targetSheet = sheets[activeSheetIndex.value]
  if (!targetSheet) return
  const { r1, r2, c1, c2 } = selectionRange.value
  activeUniverWorkbook?.setActiveSheet(targetSheet)
  const range = targetSheet.getRange(r1, c1, r2 - r1 + 1, c2 - c1 + 1)
  targetSheet.setActiveRange(range)
}

async function renderLuckysheet() {
  const host = univerHostRef.value

  if (!host) return
  renderingUniver = true
  try {
    const runtime = await ensureUniverRuntime()
    await ensureUniverInitialized(host)
    const hostReady = await waitForLuckysheetHost(host)
    if (!hostReady) {

      console.warn('[SheetEditor] univer host height is 0')
      return
    }

    disposeActiveUniverWorkbook()
    activeUniverWorkbook = univerAPI?.createWorkbook(runtime.adapter.internalWorkbookToUniver(workbook, props.locale)) || null

    bindUniverEvents()
    const sheets = activeUniverWorkbook?.getSheets() || []
    const nextSheet = sheets[activeSheetIndex.value] || sheets[0]
    if (nextSheet) {
      activeUniverWorkbook?.setActiveSheet(nextSheet)
    }
    lastUniverSnapshot = activeUniverWorkbook ? JSON.stringify(activeUniverWorkbook.save()) : ''
    applySelectionToUniver()
    updateSelectionFromUniver()

    window.dispatchEvent(new Event('resize'))
  } catch (error) {

    console.error('[SheetEditor] univer render error:', error)
  } finally {
    renderingUniver = false
  }
}

function scheduleUniverRender() {
  clearUniverRenderTimer()
  univerRenderTimer = window.setTimeout(() => {
    void renderLuckysheet()
  }, 0)
}

// ===== Normalization =====
function normalizeWorkbook(input: any): IWorkbook {
  if (input && typeof input === 'object') {
    if (Array.isArray(input?.data)) {
      return {
        version: Number(input?.version || 1),
        resources: undefined,
        sheets: input.data.map((sheet: any, i: number) => fromFortuneSheetRecord(sheet, i))
      }
    }
    if (input?.data && typeof input.data === 'object' && Array.isArray(input.data?.sheets)) {
      return {
        version: Number(input?.version || 1),
        resources: input.data?.resources && typeof input.data.resources === 'object'
          ? JSON.parse(JSON.stringify(input.data.resources))
          : undefined,
        sheets: input.data.sheets.map((sheet: any, i: number) => fromInternalSheet(sheet, i))
      }
    }
    if (Array.isArray(input?.sheets)) {
      return {
        version: Number(input?.version || 1),
        resources: input?.resources && typeof input.resources === 'object'
          ? JSON.parse(JSON.stringify(input.resources))
          : undefined,
        sheets: input.sheets.map((sheet: any, i: number) => fromInternalSheet(sheet, i))
      }
    }
  }
  return { version: 1, resources: undefined, sheets: [createDefaultSheet(0)] }
}

function fromInternalSheet(sheet: any, i: number): IUiSheet {
  return {
    id: String(sheet?.id || sheet?.meta?.id || i),
    name: String(sheet?.name || sheet?.meta?.name || t('sheet.defaultSheetName', { index: i + 1 })),
    rowCount: Number(sheet?.rowCount || sheet?.meta?.rowCount || 50),
    colCount: Number(sheet?.colCount || sheet?.meta?.colCount || 26),
    cells: { ...(sheet?.cells || {}) },
    styles: { ...(sheet?.styles || {}) },
    cellMeta: { ...(sheet?.cellMeta || {}) },
    merges: Array.isArray(sheet?.merges) ? [...sheet.merges] : [],
    colWidths: { ...(sheet?.colWidths || {}) },
    rowHeights: { ...(sheet?.rowHeights || {}) },
    hiddenCols: { ...(sheet?.hiddenCols || {}) },
    hiddenRows: { ...(sheet?.hiddenRows || {}) },
    frozenCols: Number(sheet?.frozenCols || 0),
    frozenRows: Number(sheet?.frozenRows || 0),
    filterColumn: Number.isFinite(sheet?.filterColumn) ? Number(sheet.filterColumn) : null,
    filterKeyword: String(sheet?.filterKeyword || ''),
    filterSelectedValues: { ...(sheet?.filterSelectedValues || {}) },
    filterActive: !!sheet?.filterActive
  }
}

function fromFortuneSheetRecord(sheet: any, i: number): IUiSheet {
  const cells: Record<string, string> = {}
  const styles: Record<string, ICellStyle> = {}
  const celldata = Array.isArray(sheet?.celldata) ? sheet.celldata : []
  celldata.forEach((item: any) => {
    const r = Number(item?.r)
    const c = Number(item?.c)
    const cell = item?.v
    if (!Number.isFinite(r) || !Number.isFinite(c)) return
    const key = cellKey(r, c)
    cells[key] = String(cell?.m ?? cell?.v ?? '')
    styles[key] = {
      bold: !!cell?.bl,
      italic: !!cell?.it,
      underline: !!cell?.un,
      align: (cell?.ht || 'left') as Align,
      fontFamily: String(cell?.ff || 'Microsoft YaHei, sans-serif'),
      fontSize: Number(cell?.fs || 12)
    }
  })
  return {
    id: String(sheet?.id || sheet?.index || i),
    name: String(sheet?.name || t('sheet.defaultSheetName', { index: i + 1 })),
    rowCount: Number(sheet?.row || 50),
    colCount: Number(sheet?.column || 26),
    cells,
    styles,
    cellMeta: {},
    colWidths: {},
    rowHeights: {},
    hiddenCols: {},
    hiddenRows: {},
    frozenCols: 0,
    frozenRows: 0,
    filterColumn: null,
    filterKeyword: '',
    filterSelectedValues: {},
    filterActive: false
  }
}

function createDefaultSheet(i: number): IUiSheet {
  return {
    id: String(i),
    name: t('sheet.defaultSheetName', { index: i + 1 }),
    rowCount: 50,
    colCount: 26,
    cells: {},
    styles: {},
    cellMeta: {},
    merges: [],
    colWidths: {},
    rowHeights: {},
    hiddenCols: {},
    hiddenRows: {},
    frozenCols: 0,
    frozenRows: 0,
    filterColumn: null,
    filterKeyword: '',
    filterSelectedValues: {},
    filterActive: false
  }
}

// ===== Helpers =====
function columnLabel(index: number): string {
  let n = index + 1
  let label = ''
  while (n > 0) {
    const rem = (n - 1) % 26
    label = String.fromCharCode(65 + rem) + label
    n = Math.floor((n - 1) / 26)
  }
  return label
}

function cellKey(row: number, col: number): string {
  return `${row}:${col}`
}

function cellValue(row: number, col: number): string {
  return activeSheet.value?.cells[cellKey(row, col)] || ''
}

// ===== Selection =====
function selectCell(row: number, col: number) {

  selected.row = row
  selected.col = col
  selectionEnd.row = row
  selectionEnd.col = col
  syncToolbarAndFormula()
}


function selectAll() {
  selected.row = 0
  selected.col = 0
  selectionEnd.row = currentRows.value.length - 1
  selectionEnd.col = currentColumns.value.length - 1
}


function selectCellRefInput() {
  formulaInputRef.value?.focus()
  formulaInputRef.value?.select()
}


function onFormulaInput(e: Event) {
  const val = (e.target as HTMLInputElement).value
  formulaValue.value = val
}

function confirmFormulaAndMove(dir: 'down' | 'right') {
  if (formulaFocused.value) {
    applyFormulaValue()
  }
  if (dir === 'down') moveSelection(1, 0)
  else moveSelection(0, 1)
}

function applyFormulaValue() {
  if (props.readOnly) return
  const value = String(formulaValue.value || '')
  const range = getSelectionRange()
  if (!range) return
  saveUndoState()
  if (value.startsWith('=') && value.length > 1) {
    range.setFormula(value.slice(1))
  } else {
    range.setValue(value)
  }
}



function handleGlobalKeydown(e: KeyboardEvent) {
  if (formulaFocused.value) return
  const target = e.target as HTMLElement | null
  if (target?.closest('.univer-host') || target?.closest('[class*="univer"]')) return
  if (target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA') return

  const ctrl = e.ctrlKey || e.metaKey

  if (ctrl) {
    switch (e.key.toLowerCase()) {
      case 'z': e.preventDefault(); handleUndo(); return
      case 'y': e.preventDefault(); handleRedo(); return
      case 'b': e.preventDefault(); toggleStyle('bold'); return
      case 'i': e.preventDefault(); toggleStyle('italic'); return
      case 'u': e.preventDefault(); toggleStyle('underline'); return
      case 'c': handleCopy(); return
      case 'x': handleCut(); return
      case 'v': handlePaste(); return
      case 'a': e.preventDefault(); selectAll(); return
      case 'f': e.preventDefault(); void openUniverFindDialog(); return
      case 'h': e.preventDefault(); void openUniverReplaceDialog(); return
      case 'p': e.preventDefault(); handlePrint(); return
      case 's': e.preventDefault(); emitChange(); return
      case 'o': e.preventDefault(); triggerImportExcel(); return
    }
  }
}

function moveSelection(dr: number, dc: number) {
  const maxR = currentRows.value.length - 1
  const maxC = currentColumns.value.length - 1
  const newR = Math.max(0, Math.min(maxR, selected.row + dr))
  const newC = Math.max(0, Math.min(maxC, selected.col + dc))
  selectCell(newR, newC)
}

// ===== Toolbar sync =====
function syncToolbarAndFormula() {
  const range = getSelectionRange()
  if (range) {
    const value = String(range.getValue() || '')
    formulaValue.value = value
    const fontWeight = String((range as any).getFontWeight?.() || 'normal')
    const fontStyle = String((range as any).getFontStyle?.() || 'normal')
    const fontLine = String((range as any).getFontLine?.() || 'none')
    toolbarState.bold = fontWeight === 'bold'
    toolbarState.italic = fontStyle === 'italic'
    toolbarState.underline = fontLine === 'underline'
    toolbarState.strikethrough = fontLine === 'line-through'
    const hAlign = String((range as any).getHorizontalAlignment?.() || 'left')
    toolbarState.align = (hAlign === 'center' ? 'center' : hAlign === 'right' ? 'right' : 'left') as Align
    const vAlign = String((range as any).getVerticalAlignment?.() || 'bottom')
    toolbarState.verticalAlign = (vAlign === 'top' ? 'top' : vAlign === 'middle' ? 'middle' : 'bottom') as VerticalAlign
    const fontFamily = String((range as any).getFontFamily?.() || 'Microsoft YaHei, sans-serif')
    toolbarState.fontFamily = fontFamily
    const fontSize = Number((range as any).getFontSize?.() || 12)
    toolbarState.fontSize = fontSize
    const fontColor = String((range as any).getFontColor?.() || '#000000')
    toolbarState.fontColor = fontColor === 'null' ? '#000000' : fontColor
    const bgColor = String((range as any).getBackground?.() || '')
    toolbarState.bgColor = bgColor === 'null' ? '' : bgColor
    const wrapStrategy = Number((range as any).getWrapStrategy?.() ?? 0)
    toolbarState.wrap = (wrapStrategy === 2 ? 'wrap' : wrapStrategy === 1 ? 'overflow' : 'clip') as WrapMode
    const textRotation = Number((range as any).getTextRotation?.() ?? 0)
    toolbarState.rotation = textRotation
  } else {
    const key = cellKey(selected.row, selected.col)
    formulaValue.value = activeSheet.value?.cells[key] || ''
    const style = activeSheet.value?.styles[key] || {}
    toolbarState.bold = !!style.bold
    toolbarState.italic = !!style.italic
    toolbarState.underline = !!style.underline
    toolbarState.strikethrough = !!style.strikethrough
    toolbarState.align = (style.align || 'left') as Align
    toolbarState.fontFamily = style.fontFamily || 'Microsoft YaHei, sans-serif'
    toolbarState.fontSize = Number(style.fontSize || 12)
    toolbarState.fontColor = style.fontColor || '#000000'
    toolbarState.bgColor = style.bgColor || ''
    toolbarState.wrap = style.wrap || 'clip'
    toolbarState.numberFormat = style.numberFormat || 'auto'
    toolbarState.verticalAlign = (style.verticalAlign || 'bottom') as VerticalAlign
    toolbarState.decimalPlaces = Number(style.decimalPlaces ?? 2)
    toolbarState.rotation = Number(style.rotation ?? 0)
  }
}

// ===== Style operations =====
function saveUndoState() {
  const sheet = activeSheet.value
  if (!sheet) return
  undoStack.value.push({
    sheetIndex: activeSheetIndex.value,
    cells: { ...sheet.cells },
    styles: JSON.parse(JSON.stringify(sheet.styles)),
    cellMeta: JSON.parse(JSON.stringify(sheet.cellMeta || {}))
  })
  if (undoStack.value.length > 50) undoStack.value.shift()
  redoStack.value = []
}

function updateCellStyle() {
  if (props.readOnly) return
  const range = getSelectionRange()
  if (!range) return
  saveUndoState()
  range.setFontWeight(toolbarState.bold ? 'bold' : 'normal')
  range.setFontStyle(toolbarState.italic ? 'italic' : 'normal')
  if (toolbarState.underline && toolbarState.strikethrough) {
    range.setFontLine('underline')
  } else if (toolbarState.underline) {
    range.setFontLine('underline')
  } else if (toolbarState.strikethrough) {
    range.setFontLine('line-through')
  } else {
    range.setFontLine('none')
  }
  range.setHorizontalAlignment(toolbarState.align === 'left' ? 'left' : toolbarState.align === 'center' ? 'center' : 'normal')
  range.setVerticalAlignment(toolbarState.verticalAlign === 'top' ? 'top' : toolbarState.verticalAlign === 'middle' ? 'middle' : 'bottom')
  range.setFontFamily(toolbarState.fontFamily || 'Microsoft YaHei, sans-serif')
  range.setFontSize(Number(toolbarState.fontSize || 12))
  range.setFontColor(toolbarState.fontColor || null)
  range.setBackground(toolbarState.bgColor || '')
  range.setWrapStrategy(toolbarState.wrap === 'wrap' ? 2 : toolbarState.wrap === 'overflow' ? 1 : 0)
  range.setTextRotation(Number(toolbarState.rotation ?? 0))
}


function toggleStyle(style: 'bold' | 'italic' | 'underline' | 'strikethrough') {
  if (props.readOnly) return
  toolbarState[style] = !toolbarState[style]
  const range = getSelectionRange()
  if (!range) return
  saveUndoState()
  if (style === 'bold') range.setFontWeight(toolbarState.bold ? 'bold' : 'normal')
  else if (style === 'italic') range.setFontStyle(toolbarState.italic ? 'italic' : 'normal')
  else if (style === 'underline') range.setFontLine(toolbarState.underline ? 'underline' : 'none')
  else if (style === 'strikethrough') range.setFontLine(toolbarState.strikethrough ? 'line-through' : 'none')
}

function setAlign(align: Align) {
  if (props.readOnly) return
  toolbarState.align = align
  const range = getSelectionRange()
  if (!range) return
  saveUndoState()
  range.setHorizontalAlignment(align === 'left' ? 'left' : align === 'center' ? 'center' : 'normal')
}

function setWrap(wrap: WrapMode) {
  if (props.readOnly) return
  toolbarState.wrap = wrap
  const range = getSelectionRange()
  if (!range) return
  saveUndoState()
  range.setWrapStrategy(wrap === 'wrap' ? 2 : wrap === 'overflow' ? 1 : 0)
}

function toggleWrap() {
  setWrap(toolbarState.wrap === 'wrap' ? 'clip' : 'wrap')
}

function setFontColor(color: string) {
  if (props.readOnly) return
  toolbarState.fontColor = color
  const range = getSelectionRange()
  if (!range) return
  saveUndoState()
  range.setFontColor(color || null)
}

function setBgColor(color: string) {
  if (props.readOnly) return
  toolbarState.bgColor = color
  const range = getSelectionRange()
  if (!range) return
  saveUndoState()
  range.setBackground(color || '')
}

function setBorders(type: string) {
  if (props.readOnly) return
  if (!univerRuntime) return
  const range = getSelectionRange()
  if (!range) return
  saveUndoState()
  const borderStyle = univerRuntime.core.BorderStyleTypes.THIN
  const borderType = univerRuntime.core.BorderType
  const color = '#000000'
  if (type === 'all') {
    range.setBorder(borderType.ALL, borderStyle, color)
  } else if (type === 'outer') {
    range.setBorder(borderType.OUTSIDE, borderStyle, color)
  } else if (type === 'none') {
    range.setBorder(borderType.NONE, univerRuntime.core.BorderStyleTypes.NONE, '')
  } else if (type === 'top') {
    range.setBorder(borderType.TOP, borderStyle, color)
  } else if (type === 'bottom') {
    range.setBorder(borderType.BOTTOM, borderStyle, color)
  } else if (type === 'left') {
    range.setBorder(borderType.LEFT, borderStyle, color)
  } else if (type === 'right') {
    range.setBorder(borderType.RIGHT, borderStyle, color)
  }
}

function clearSelectedFormat() {
  if (props.readOnly) return
  const range = getSelectionRange()
  if (!range) return
  saveUndoState()
  range.clearFormat()
  syncToolbarAndFormula()
}

function deleteSelectedContent() {
  if (props.readOnly) return
  const range = getSelectionRange()
  if (!range) return
  saveUndoState()
  range.clearContent()
  syncToolbarAndFormula()
}


// ===== Undo/Redo =====
function handleUndo() {
  if (props.readOnly || undoStack.value.length === 0) return
  const sheet = activeSheet.value
  if (!sheet) return
  redoStack.value.push({
    sheetIndex: activeSheetIndex.value,
    cells: { ...sheet.cells },
    styles: JSON.parse(JSON.stringify(sheet.styles)),
    cellMeta: JSON.parse(JSON.stringify(sheet.cellMeta || {}))
  })
  const entry = undoStack.value.pop()!
  if (entry.sheetIndex !== activeSheetIndex.value) {
    activeSheetIndex.value = entry.sheetIndex
  }
  const target = workbook.sheets[entry.sheetIndex]
  if (target) {
    target.cells = entry.cells
    target.styles = entry.styles
    target.cellMeta = entry.cellMeta ? JSON.parse(JSON.stringify(entry.cellMeta)) : {}
  }
  syncToolbarAndFormula()
  emitChange()
}

function handleRedo() {
  if (props.readOnly || redoStack.value.length === 0) return
  const sheet = activeSheet.value
  if (!sheet) return
  undoStack.value.push({
    sheetIndex: activeSheetIndex.value,
    cells: { ...sheet.cells },
    styles: JSON.parse(JSON.stringify(sheet.styles)),
    cellMeta: JSON.parse(JSON.stringify(sheet.cellMeta || {}))
  })
  const entry = redoStack.value.pop()!
  if (entry.sheetIndex !== activeSheetIndex.value) {
    activeSheetIndex.value = entry.sheetIndex
  }
  const target = workbook.sheets[entry.sheetIndex]
  if (target) {
    target.cells = entry.cells
    target.styles = entry.styles
    target.cellMeta = entry.cellMeta ? JSON.parse(JSON.stringify(entry.cellMeta)) : {}
  }
  syncToolbarAndFormula()
  emitChange()
}

// ===== Clipboard =====
function handleCopy() {
  const { r1, r2, c1, c2 } = selectionRange.value
  const rows: string[] = []
  for (let r = r1; r <= r2; r++) {
    const cols: string[] = []
    for (let c = c1; c <= c2; c++) {
      cols.push(cellValue(r, c))
    }
    rows.push(cols.join('\t'))
  }
  navigator.clipboard?.writeText(rows.join('\n')).catch(() => {})
}

function handleCut() {
  if (props.readOnly) return
  handleCopy()
  deleteSelectedContent()
}

async function handlePaste() {
  if (props.readOnly) return
  try {
    const text = await navigator.clipboard?.readText()
    if (!text) return
    const range = getSelectionRange()
    if (!range) return
    saveUndoState()
    const rows = text.split('\n')
    for (let ri = 0; ri < rows.length; ri++) {
      const cols = rows[ri].split('\t')
      for (let ci = 0; ci < cols.length; ci++) {
        const r = selected.row + ri
        const c = selected.col + ci
        const sheet = getActiveSheet()
        if (sheet) {
          const cell = sheet.getRange(r, c, 1, 1)
          if (cell) {
            cell.setValue(cols[ci])
          }
        }
      }
    }
  } catch { /* clipboard access denied */ }
}


// ===== Format Painter =====
function handleFormatPainter() {
  if (props.readOnly) return
  formatPainterActive.value = !formatPainterActive.value
}

// ===== Row/Col operations =====
function insertRow(position: 'above' | 'below') {
  if (props.readOnly) return
  saveUndoState()
  const sheet = getActiveSheet()
  if (!sheet) return
  const insertAt = position === 'above' ? selected.row : selected.row + 1
  sheet.insertRows(insertAt, 1)
}


function insertCol(position: 'left' | 'right') {
  if (props.readOnly) return
  saveUndoState()
  const sheet = getActiveSheet()
  if (!sheet) return
  const insertAt = position === 'left' ? selected.col : selected.col + 1
  sheet.insertColumns(insertAt, 1)
}

function deleteRow() {
  if (props.readOnly) return
  saveUndoState()
  const sheet = getActiveSheet()
  if (!sheet) return
  const { r1, r2 } = selectionRange.value
  const rowCount = r2 - r1 + 1
  sheet.deleteRows(r1, rowCount)
}

function deleteCol() {
  if (props.readOnly) return
  saveUndoState()
  const sheet = getActiveSheet()
  if (!sheet) return
  const { c1, c2 } = selectionRange.value
  const colCount = c2 - c1 + 1
  sheet.deleteColumns(c1, colCount)
}

function hideRow() {
  if (props.readOnly) return
  saveUndoState()
  const sheet = getActiveSheet()
  if (!sheet) return
  const { r1, r2 } = selectionRange.value
  for (let r = r1; r <= r2; r++) {
    ;(sheet as any).setRowHidden?.(r, true)
  }
}

function unhideRow() {
  if (props.readOnly) return
  saveUndoState()
  const sheet = getActiveSheet()
  if (!sheet) return
  const { r1, r2 } = selectionRange.value
  for (let r = r1; r <= r2; r++) {
    ;(sheet as any).setRowHidden?.(r, false)
  }
}

function hideCol() {
  if (props.readOnly) return
  saveUndoState()
  const sheet = getActiveSheet()
  if (!sheet) return
  const { c1, c2 } = selectionRange.value
  for (let c = c1; c <= c2; c++) {
    ;(sheet as any).setColumnHidden?.(c, true)
  }
}

function unhideCol() {
  if (props.readOnly) return
  saveUndoState()
  const sheet = getActiveSheet()
  if (!sheet) return
  const { c1, c2 } = selectionRange.value
  for (let c = c1; c <= c2; c++) {
    ;(sheet as any).setColumnHidden?.(c, false)
  }
}

function autoFitRowHeight() {
  if (props.readOnly) return
  const sheet = getActiveSheet()
  if (!sheet) return
  const { r1, r2 } = selectionRange.value
  for (let r = r1; r <= r2; r++) {
    ;(sheet as any).autoFitRowHeight?.(r)
  }
}

function autoFitColWidth() {
  if (props.readOnly) return
  const sheet = getActiveSheet()
  if (!sheet) return
  const { c1, c2 } = selectionRange.value
  for (let c = c1; c <= c2; c++) {
    ;(sheet as any).autoFitColumnWidth?.(c)
  }
}

function setZoom(level: number) {
  zoomLevel.value = level
  applyZoom()
}

function applyZoom() {
  const sheet = getActiveSheet()
  if (!sheet) return
  ;(activeUniverWorkbook as any)?.setZoomRatio?.(zoomLevel.value / 100)
}


// ===== Merge cells =====
function handleMergeCells() {
  if (props.readOnly) return
  const { r1, r2, c1, c2 } = selectionRange.value
  if (r1 === r2 && c1 === c2) return
  const range = getSelectionRange()
  if (!range) return
  saveUndoState()
  range.merge()
}


function handleUnmergeCells() {
  if (props.readOnly) return
  const range = getSelectionRange()
  if (!range) return
  saveUndoState()
  range.breakApart()
}

// ===== View operations =====
function toggleGridlines() { showGridlines.value = !showGridlines.value }
function toggleFreezeRow() {
  frozenRows.value = frozenRows.value > 0 ? 0 : 1
  syncDimensionStateToActiveSheet()
  const sheet = getActiveSheet()
  if (sheet) {
    sheet.setFrozenRows(frozenRows.value)
  }
}
function toggleFreezeCol() {
  frozenCols.value = frozenCols.value > 0 ? 0 : 1
  syncDimensionStateToActiveSheet()
  const sheet = getActiveSheet()
  if (sheet) {
    sheet.setFrozenColumns(frozenCols.value)
  }
}

// ===== Sort =====
function sortColumn(order: 'asc' | 'desc') {
  if (props.readOnly) return
  saveUndoState()
  const sheet = getActiveSheet()
  if (!sheet) return
  const col = selected.col
  const rowCount = (sheet as any).getRowCount?.() ?? activeSheet.value?.rowCount ?? 50
  const range = sheet.getRange(0, col, rowCount, 1)
  if (range) {
    if (order === 'asc') {
      ;(range as any).sort(col + 1, true)
    } else {
      ;(range as any).sort(col + 1, false)
    }
  }
}

// ===== Remove Duplicates =====
function removeDuplicates() {
  if (props.readOnly) return
  const { r1, r2, c1, c2 } = selectionRange.value
  if (r1 === r2 && c1 === c2) {
    message.warning('请选择包含数据的区域')
    return
  }
  saveUndoState()
  const sheet = getActiveSheet()
  if (!sheet) return
  
  const seen = new Set<string>()
  const rowsToDelete: number[] = []
  
  for (let r = r1; r <= r2; r++) {
    const rowData: string[] = []
    for (let c = c1; c <= c2; c++) {
      const value = String(sheet.getRange(r, c, 1, 1).getValue() || '')
      rowData.push(value)
    }
    const rowKey = rowData.join('\t')
    if (seen.has(rowKey)) {
      rowsToDelete.push(r)
    } else {
      seen.add(rowKey)
    }
  }
  
  if (rowsToDelete.length === 0) {
    message.info('未找到重复值')
    return
  }
  
  rowsToDelete.sort((a, b) => b - a)
  for (const r of rowsToDelete) {
    sheet.deleteRows(r, 1)
  }
  
  message.success(`已删除 ${rowsToDelete.length} 个重复行`)
}

// ===== Row Height & Column Width =====
function applyRowHeight() {
  if (props.readOnly) return
  saveUndoState()
  const sheet = getActiveSheet()
  if (!sheet) return
  const { r1, r2 } = selectionRange.value
  for (let r = r1; r <= r2; r++) {
    ;(sheet as any).setRowHeight?.(r, rowHeightValue.value)
  }
  showRowHeightDialog.value = false
}

function applyColWidth() {
  if (props.readOnly) return
  saveUndoState()
  const sheet = getActiveSheet()
  if (!sheet) return
  const { c1, c2 } = selectionRange.value
  for (let c = c1; c <= c2; c++) {
    ;(sheet as any).setColumnWidth?.(c, colWidthValue.value)
  }
  showColWidthDialog.value = false
}



onMounted(async () => {


  if (!props.initialContent && props.documentUrl) {
    try {
      const resp = await fetch(props.documentUrl)
      if (!resp.ok) throw new Error(`请求失败: ${resp.status}`)
      const buffer = await resp.arrayBuffer()
      const file = new File([buffer], 'import.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      const importedWorkbook = await readExcelFileToWorkbook(file, {
        defaultSheetName: index => t('sheet.defaultSheetName', { index: index + 1 }),
      })
      workbook.version = importedWorkbook.version
      workbook.resources = importedWorkbook.resources
      workbook.sheets = importedWorkbook.sheets
      resetFilterState()
      activeSheetIndex.value = 0
      selected.row = 0
      selected.col = 0
      selectionEnd.row = 0
      selectionEnd.col = 0
      syncDimensionStateFromActiveSheet()
      loadFilterStateFromActiveSheet()
      undoStack.value = []
      redoStack.value = []
      syncToolbarAndFormula()
      emitChange()
    } catch (e) {
      message.error(e instanceof Error ? e.message : t('message.importFailed'))
    }
  }
  await nextTick()
  scheduleUniverRender()
})
onUnmounted(() => {

  clearUniverRenderTimer()
  clearUniverWorkbookDisposables()
  disposeActiveUniverWorkbook()
  univerAPI?.dispose()
  univerAPI = null
  univerInstance?.dispose()
  univerInstance = null
})


// ===== Misc =====

function handlePrint() {
  window.print()
}


function triggerImportExcel() {
  if (props.readOnly) return
  if (!importExcelInputRef.value) return
  importExcelInputRef.value.value = ''
  importExcelInputRef.value.click()
}

async function handleImportExcelChange(e: Event) {
  if (props.readOnly) return
  const input = e.target as HTMLInputElement | null
  const file = input?.files?.[0]
  if (!file) return
  try {
    const importedWorkbook = await readExcelFileToWorkbook(file, {
      defaultSheetName: index => t('sheet.defaultSheetName', { index: index + 1 }),
    })
    workbook.version = importedWorkbook.version
    workbook.resources = importedWorkbook.resources
    workbook.sheets = importedWorkbook.sheets
    resetFilterState()
    activeSheetIndex.value = 0
    selected.row = 0
    selected.col = 0
    selectionEnd.row = 0
    selectionEnd.col = 0
    syncDimensionStateFromActiveSheet()
    loadFilterStateFromActiveSheet()
    undoStack.value = []
    redoStack.value = []
    syncToolbarAndFormula()
    emitChange()
    message.success(t('message.importSuccess', { name: file.name }))
  } catch (error) {
    const msg = error instanceof Error ? error.message : t('message.importFailed')
    message.error(msg)
  } finally {
    if (input) input.value = ''
  }
}

async function handleExportExcel() {
  if (!workbook.sheets.length) return
  try {
    const buffer = await writeWorkbookToExcelBuffer(workbook, {
      defaultSheetName: index => t('sheet.defaultSheetName', { index: index + 1 }),
    })
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    })
    const link = document.createElement('a')
    const now = new Date()
    const text = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`
    link.download = `${t('sheet.defaultWorkbookName')}-${text}.xlsx`
    link.href = URL.createObjectURL(blob)
    link.click()
    URL.revokeObjectURL(link.href)
    message.success(t('message.exportSuccess'))
  } catch (error) {
    const msg = error instanceof Error ? error.message : t('message.exportFailed')
    message.error(msg)
  }
}

function resetWorkbookForNewDocument() {
  workbook.version = 1
  workbook.resources = undefined
  workbook.sheets = [createDefaultSheet(0)]
  activeSheetIndex.value = 0
  selected.row = 0
  selected.col = 0
  selectionEnd.row = 0
  selectionEnd.col = 0
  syncDimensionStateFromActiveSheet()
  loadFilterStateFromActiveSheet()
  syncToolbarAndFormula()
  undoStack.value = []
  redoStack.value = []
}

async function handleCreateNewWorkbook() {
  if (props.readOnly) return
  try {
    resetWorkbookForNewDocument()
    const dbPayload = {
      format: 'sheet',
      engine: 'univer',
      version: workbook.version,
      data: {
        resources: workbook.resources,
        sheets: workbook.sheets
      }
    }
    const buffer = await writeWorkbookToExcelBuffer(workbook, {
      defaultSheetName: index => t('sheet.defaultSheetName', { index: index + 1 }),
    })
    const now = new Date()
    const fileName = `${t('sheet.defaultWorkbookName')}-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}.xlsx`
    localDocumentTitle.value = fileName.replace(/\.xlsx$/i, '')
    const excelPayload = {
      fileName,
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      buffer
    }

    emit('new-document', { dbPayload, excelPayload })
    emitChange()
    message.success(t('message.createSuccess'))
  } catch (error) {
    const msg = error instanceof Error ? error.message : t('message.createFailed')
    message.error(msg)
  }
}

// ===== 字号增减 =====
function changeFontSize(delta: number) {
  if (props.readOnly) return
  const numericSizes = sizeOptions.map(s => s.value).filter((v, i, a) => a.indexOf(v) === i).sort((a, b) => a - b)
  const current = toolbarState.fontSize || 12
  const idx = numericSizes.findIndex(s => s >= current)
  let newIdx: number
  if (delta > 0) {
    newIdx = idx < 0 ? numericSizes.length - 1 : Math.min(idx + 1, numericSizes.length - 1)
  } else {
    newIdx = idx <= 0 ? 0 : idx - 1
  }
  toolbarState.fontSize = numericSizes[newIdx]
  const range = getSelectionRange()
  if (!range) return
  saveUndoState()
  range.setFontSize(numericSizes[newIdx])
}

// ===== 快捷格式按钮 =====
function quickFormat(fmt: 'currency' | 'percent') {
  if (props.readOnly) return
  toolbarState.numberFormat = fmt
  const range = getSelectionRange()
  if (!range) return
  saveUndoState()
  if (fmt === 'currency') {
    range.setNumberFormat('¥#,##0.00')
  } else if (fmt === 'percent') {
    range.setNumberFormat('0.00%')
  }
}

function changeDecimal(delta: number) {
  if (props.readOnly) return
  toolbarState.decimalPlaces = Math.max(0, Math.min(10, (toolbarState.decimalPlaces ?? 2) + delta))
  const range = getSelectionRange()
  if (!range) return
  saveUndoState()
  const fmt = toolbarState.numberFormat || 'auto'
  if (fmt === 'currency') {
    range.setNumberFormat(`¥#,##0.${'#'.repeat(toolbarState.decimalPlaces)}`)
  } else if (fmt === 'percent') {
    range.setNumberFormat(`0.${'#'.repeat(toolbarState.decimalPlaces)}%`)
  }
}

// ===== 垂直对齐 =====
function setVerticalAlign(va: VerticalAlign) {
  if (props.readOnly) return
  toolbarState.verticalAlign = va
  const range = getSelectionRange()
  if (!range) return
  saveUndoState()
  range.setVerticalAlignment(va === 'top' ? 'top' : va === 'middle' ? 'middle' : 'bottom')
}

// ===== 文字旋转 =====
function setRotation(deg: number) {
  if (props.readOnly) return
  toolbarState.rotation = deg
  const range = getSelectionRange()
  if (!range) return
  saveUndoState()
  range.setTextRotation(deg)
}

// ===== 筛选 =====
function resetFilterState() {
  filterActive.value = false
  filterColumn.value = null
  filterKeyword.value = ''
  filterValueOptions.value = []
  Object.keys(filterSelectedValues).forEach(key => delete filterSelectedValues[key])
  Object.keys(filteredRows).forEach(key => delete filteredRows[Number(key)])
}

function normalizeFilterValue(value: string): string {
  return value === '' ? FILTER_EMPTY_TOKEN : value
}

function prepareFilterPanel(useSelectedColumn = true) {
  const sheet = activeSheet.value
  if (!sheet) return
  if (useSelectedColumn) {
    filterColumn.value = selected.col
  }
  const col = filterColumn.value
  if (col === null) return
  const unique = new Set<string>()
  for (let row = 0; row < sheet.rowCount; row++) {
    if (sheet.hiddenRows?.[row]) continue
    const text = String(sheet.cells[cellKey(row, col)] || '')
    unique.add(normalizeFilterValue(text))
  }
  filterValueOptions.value = Array.from(unique).sort((a, b) => {
    if (a === FILTER_EMPTY_TOKEN) return 1
    if (b === FILTER_EMPTY_TOKEN) return -1
    return a.localeCompare(b, 'zh-CN')
  })
  for (const value of filterValueOptions.value) {
    if (filterSelectedValues[value] === undefined) {
      filterSelectedValues[value] = true
    }
  }
}

function isFilterValueSelected(value: string): boolean {
  return filterSelectedValues[value] !== false
}

function onFilterValueChange(value: string, event: Event) {
  const checked = (event.target as HTMLInputElement).checked
  filterSelectedValues[value] = checked
}

function toggleAllFilterValues(checked: boolean) {
  for (const value of filterValueOptions.value) {
    filterSelectedValues[value] = checked
  }
}

function applyFilterRows() {
  Object.keys(filteredRows).forEach(key => delete filteredRows[Number(key)])
  const sheet = activeSheet.value
  const col = filterColumn.value
  if (!sheet || col === null) return
  const keyword = filterKeyword.value.toLowerCase()
  const hasUnchecked = filterValueOptions.value.some(value => !isFilterValueSelected(value))
  filterActive.value = !!keyword || hasUnchecked
  for (let row = 0; row < sheet.rowCount; row++) {
    if (sheet.hiddenRows?.[row]) continue
    const value = String(sheet.cells[cellKey(row, col)] || '')
    const normalizedValue = normalizeFilterValue(value)
    const normalized = value.toLowerCase()
    const passSelection = isFilterValueSelected(normalizedValue)
    const visible = keyword
      ? passSelection && normalized.includes(keyword)
      : passSelection
    if (!visible) {
      filteredRows[row] = true
    }
  }
}

function applyFilterAndClose() {
  applyFilterRows()
  syncFilterStateToActiveSheet()
  emitChange()
  filterPopoverVisible.value = false
  const col = filterColumn.value
  if (col === null) return
  message.success(`已应用列 ${columnLabel(col)} 筛选`)
}

function clearFilter() {
  resetFilterState()
  syncFilterStateToActiveSheet()
  emitChange()
  filterPopoverVisible.value = false
}

// ===== 插入图片 =====
function insertImage() {
  if (props.readOnly) return
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'image/*'
  input.onchange = () => {
    const file = input.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const range = getSelectionRange()
      if (!range) return
      saveUndoState()
      range.setValue(`[image:${file.name}]`)
    }
    reader.readAsDataURL(file)
  }
  input.click()
}

// ===== 快速函数 =====
function insertFunction(fn: string) {
  if (props.readOnly) return
  const range = getSelectionRange()
  if (!range) return
  saveUndoState()
  range.setFormula(`${fn}()`)
  formulaValue.value = `=${fn}()`
  syncToolbarAndFormula()
}

// ===== Emit =====
function emitChange(source: 'internal' | 'univer' = 'internal') {
  if (source !== 'univer') {
    scheduleUniverRender()
  }
  headerLastSaveTime.value = new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  emit('change', {
    format: 'sheet',
    engine: 'univer',
    version: workbook.version,
    data: {
      resources: workbook.resources,
      sheets: workbook.sheets
    }
  })
}
</script>

<style scoped>
.sheet-editor {
  display: flex;
  flex-direction: column;
  height: 100vh;
  min-height: 100vh;
  background: #fff;
  outline: none;
}

/* ===== 固定头部区域 ===== */
.fixed-header {
  position: sticky;
  top: 0;
  z-index: 100;
  background: #fff;
}

/* ===== 菜单栏 ===== */

/* ===== 工具栏 ===== */
.toolbar {
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 6px 12px;
  border-bottom: 1px solid #e2e6ed;
  background: #fff;
  flex-wrap: wrap;
}

.toolbar-divider {
  display: inline-block;
  width: 1px;
  height: 18px;
  background: #dadce0;
  margin: 0 4px;
  flex-shrink: 0;
}

.toolbar-select {
  width: 130px;
}

.toolbar-size {
  width: 70px;
}

.tb {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 26px;
  height: 26px;
  padding: 0 5px;
  border: none;
  background: transparent;
  border-radius: 4px;
  cursor: pointer;
  color: #5f6368;
  transition: background 0.15s;
  flex-shrink: 0;
}

.tb:hover:not(:disabled) {
  background: #f1f3f4;
}

.tb.active {
  background: #e8f0fe;
  color: #1a73e8;
}

.tb:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.tb svg {
  flex-shrink: 0;
}


/* 颜色按钮 */
.color-btn {
  position: relative;
}

.color-bar {
  position: absolute;
  bottom: 2px;
  left: 50%;
  transform: translateX(-50%);
  width: 14px;
  height: 3px;
  border-radius: 1px;
}

/* 颜色面板 */
.color-panel {
  padding: 8px;
}

.color-grid {
  display: grid;
  grid-template-columns: repeat(10, 1fr);
  gap: 3px;
}

.color-cell {
  width: 20px;
  height: 20px;
  border: 1px solid #dadce0;
  border-radius: 2px;
  cursor: pointer;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.color-cell:hover {
  transform: scale(1.15);
  z-index: 1;
}

.color-none {
  background: #fff;
}

/* 边框面板 */
.border-panel {
  padding: 8px;
}

.border-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 4px;
}

.border-btn {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #dadce0;
  border-radius: 4px;
  background: #fff;
  cursor: pointer;
  color: #5f6368;
}

.border-btn:hover {
  background: #f1f3f4;
  border-color: #1a73e8;
  color: #1a73e8;
}

/* 对齐/旋转/函数下拉面板 */
.align-panel {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 4px;
}

.align-group-label {
  font-size: 11px;
  color: #9aa0a6;
  padding: 4px 10px 2px;
  user-select: none;
}

.align-group-divider {
  height: 1px;
  background: #e8eaed;
  margin: 4px 8px;
}

.align-btn {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 10px;
  border: none;
  background: transparent;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
  color: #3c4043;
  white-space: nowrap;
}

.align-btn:hover {
  background: #f1f3f4;
}

.align-btn.active {
  background: #e8f0fe;
  color: #1a73e8;
}

.align-btn .mdi-icon {
  flex-shrink: 0;
}

/* ===== 编辑栏 ===== */
.formula-row {
  display: flex;
  align-items: center;
  gap: 0;
  border-bottom: 1px solid #e2e6ed;
  background: #fff;
}

.cell-ref {
  min-width: 70px;
  text-align: center;
  font-size: 12px;
  color: #3c4043;
  padding: 6px 10px;
  border-right: 1px solid #e2e6ed;
  cursor: pointer;
  user-select: none;
  font-weight: 500;
}

.cell-ref:hover {
  background: #f1f3f4;
}

.formula-input {
  flex: 1;
  border: none;
  outline: none;
  font-size: 13px;
  padding: 6px 10px;
  color: #202124;
  background: transparent;
  font-family: 'Google Sans', Arial, sans-serif;
}

.formula-input:focus {
  background: #e8f0fe;
}

/* ===== 表格网格 ===== */
.grid-scroll {
  display: flex;
  flex: 1;
  min-height: 0;
  overflow: hidden;
  position: relative;
}

.univer-grid-scroll {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  min-height: 0;
  background: #fff;
}

.univer-grid-viewport {
  display: flex;
  flex: 1;
  flex-direction: column;
  width: 100%;
  min-width: 0;
  min-height: 0;
}

.univer-host {
  flex: 1 1 auto;
  width: 100%;
  min-height: 0;
  height: 100%;
  position: relative;

}


/* ===== 查找替换面板 ===== */
.search-panel {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 8px 12px;
  border-bottom: 1px solid #e2e6ed;
  background: #f8f9fa;
}

.search-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.search-input {
  flex: 1;
  height: 28px;
  border: 1px solid #dadce0;
  border-radius: 4px;
  padding: 0 8px;
  font-size: 13px;
  color: #202124;
  outline: none;
  background: #fff;
}

.search-input:focus {
  border-color: #1a73e8;
  box-shadow: 0 0 0 1px #1a73e8 inset;
}

.search-count {
  font-size: 12px;
  color: #5f6368;
  white-space: nowrap;
  min-width: 40px;
  text-align: center;
}

.tb-sm {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 24px;
  height: 24px;
  padding: 0 4px;
  border: none;
  background: transparent;
  border-radius: 4px;
  cursor: pointer;
  color: #5f6368;
  font-size: 11px;
}

.tb-sm:hover:not(:disabled) {
  background: #e8eaed;
}

.tb-sm:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.replace-btn {
  font-size: 12px;
  color: #1a73e8;
  padding: 0 8px;
  white-space: nowrap;
}

.replace-btn:hover:not(:disabled) {
  background: #e8f0fe;
}

.filter-panel {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.filter-title {
  font-size: 12px;
  color: #3c4043;
  font-weight: 600;
}

.filter-input {
  height: 28px;
  border: 1px solid #dadce0;
  border-radius: 4px;
  padding: 0 8px;
  font-size: 12px;
  outline: none;
}

.filter-input:focus {
  border-color: #1a73e8;
  box-shadow: 0 0 0 1px #1a73e8 inset;
}

.filter-values {
  max-height: 180px;
  overflow-y: auto;
  border: 1px solid #eceff3;
  border-radius: 4px;
  padding: 4px;
  background: #fff;
}

.filter-value-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #3c4043;
  line-height: 1.6;
}

.filter-actions-inline {
  display: flex;
  align-items: center;
  gap: 4px;
  justify-content: flex-end;
}

/* ===== Ant Design Vue 覆盖 ===== */
:deep(.ant-select .ant-select-selector) {
  border: 1px solid #dadce0 !important;
  border-radius: 4px !important;
  height: 26px !important;
  min-height: 26px !important;
}

:deep(.ant-select .ant-select-selector:hover) {
  border-color: #1a73e8 !important;
}

/* 右键菜单锚点 - 已废弃，使用 Teleport 方案 */

/* 快捷键对话框 */
.shortcuts-list {
  max-height: 400px;
  overflow-y: auto;
}

.shortcut-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 0;
  font-size: 13px;
  color: #3c4043;
  border-bottom: 1px solid #f1f3f4;
}

.shortcut-row:last-child {
  border-bottom: none;
}

.shortcut-row kbd {
  background: #f1f3f4;
  border: 1px solid #dadce0;
  border-radius: 4px;
  padding: 2px 8px;
  font-size: 12px;
  font-family: 'Courier New', monospace;
  color: #5f6368;
}

</style>

<!-- 全局样式：弹出菜单（teleport 到 body，scoped 无法影响）-->
<style>
.sheet-menu-popper {
  min-width: 220px !important;
}

.sheet-menu-popper .ant-menu {
  border-inline-end: none !important;
}

.sheet-menu-popper .ant-menu-item {
  height: 32px !important;
  line-height: 32px !important;
  font-size: 13px !important;
  color: #3c4043 !important;
  padding: 0 16px !important;
  margin: 0 !important;
  display: flex !important;
  align-items: center !important;
}

.sheet-menu-popper .ant-menu-title-content {
  display: flex;
  align-items: center;
  flex: 1;
  min-width: 0;
  height: 100%;
}

.sheet-menu-popper .ant-menu-item:hover {
  background: #f1f3f4 !important;
}

.sheet-menu-popper .ant-menu-item .menu-item-label .mdi-icon {
  margin-right: 12px;
  color: #5f6368;
  flex-shrink: 0;
}

.sheet-menu-popper .ant-menu-item .menu-item-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  min-height: 100%;
  gap: 12px;
}

.sheet-menu-popper .ant-menu-item .menu-item-label {
  display: inline-flex;
  align-items: center;
  min-width: 0;
  min-height: 100%;
}

.sheet-menu-popper .ant-menu-item .menu-item-meta {
  display: inline-flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  margin-left: auto;
  flex-shrink: 0;
  min-height: 100%;
}

.sheet-menu-popper .ant-menu-item .shortcut {
  display: inline-flex;
  align-items: center;
  color: #9aa0a6;
  font-size: 12px;
  line-height: 1;
}

.sheet-menu-popper .ant-menu-item .menu-check {
  display: inline-flex;
  align-items: center;
  color: #1a1a1a;
  flex-shrink: 0;
}

.sheet-menu-popper .ant-menu-submenu-title {
  height: 32px !important;
  line-height: 32px !important;
  font-size: 13px !important;
  color: #3c4043 !important;
  padding: 0 16px !important;
  margin: 0 !important;
  display: flex !important;
  align-items: center !important;
}

.sheet-menu-popper .ant-menu-submenu-title:hover {
  background: #f1f3f4 !important;
}

.sheet-menu-popper .ant-menu-submenu-title .mdi-icon {
  margin-right: 12px;
  color: #5f6368;
  flex-shrink: 0;
}

/* 菜单栏样式 - 全局作用域 */
.sheet-editor .menu-card {
  border-radius: 0 !important;
  border-left: none !important;
  border-right: none !important;
  border-top: none !important;
  border-bottom: 1px solid #185c37 !important;
  background: #217346 !important;
  width: 100% !important;
  margin: 0 !important;
  padding: 0 !important;
}
.sheet-editor .sheet-menu-bar {
  border-bottom: none !important;
  height: auto !important;
  background: transparent !important;
  width: 100% !important;
  padding: 0 !important;
  margin: 0 !important;
  line-height: 1.4 !important;
}
.sheet-editor .sheet-menu-bar .ant-menu {
  border-bottom: none !important;
  background: transparent !important;
  padding: 0 !important;
  margin: 0 !important;
  line-height: 1.4 !important;
}
.sheet-editor .ant-menu-horizontal > .ant-menu-item,
.sheet-editor .ant-menu-horizontal > .ant-menu-submenu {
  padding-inline: 0 !important;
}
.sheet-editor .sheet-menu-bar .ant-menu-submenu-title {
  padding: 6px 12px !important;
  height: auto !important;
  line-height: 1.4 !important;
  font-size: 13px !important;
  color: #ffffff !important;
  background: #217346 !important;
  border-radius: 4px !important;
  border-bottom: none !important;
  display: flex !important;
  align-items: center !important;
}
.sheet-editor .sheet-menu-bar .ant-menu-submenu-title:hover {
  background: #1e6e3a !important;
}
.sheet-editor .sheet-menu-bar .ant-menu-submenu-open > .ant-menu-submenu-title {
  background: #185c37 !important;
}
.sheet-editor .sheet-menu-bar .ant-menu-submenu-arrow {
  display: none !important;
}

</style>
