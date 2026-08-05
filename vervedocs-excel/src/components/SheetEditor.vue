<template>
  <div ref="sheetEditorRef" class="sheet-editor" :class="{ 'eye-care-mode': isEyeCareMode }" @keydown="handleGlobalKeydown">
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
          <a-menu-item key="newWorkbook" :disabled="readOnly" @click="handleCreateNewWorkbook()"><SheetIcon name="plus" />新建表格</a-menu-item>
          <a-menu-item key="save" @click="emitChange()"><SheetIcon name="content-save-outline" />保存<span class="shortcut">Ctrl+S</span></a-menu-item>
          <a-menu-divider />
          <a-menu-item key="importExcel" :disabled="readOnly" @click="triggerImportExcel()">
            <SheetIcon name="file-excel-box" />导入表格&nbsp;&nbsp;<a-tag color="red">BETA</a-tag><span class="shortcut">Ctrl+O</span></a-menu-item>
          <a-menu-item key="exportExcel" @click="handleExportExcel()"><SheetIcon name="file-excel-box" />导出 Excel</a-menu-item>
          <a-menu-divider />
          <a-menu-item key="print" @click="handlePrint()"><SheetIcon name="printer-outline" />打印<span class="shortcut">Ctrl+P</span></a-menu-item>
        </a-sub-menu>

        <a-sub-menu key="edit" popupClassName="sheet-menu-popper">
          <template #title>编辑</template>
          <a-menu-item key="undo" @click="handleUndo()"><SheetIcon name="undo" />撤销<span class="shortcut">Ctrl+Z</span></a-menu-item>
          <a-menu-item key="redo" @click="handleRedo()"><SheetIcon name="redo" />重做<span class="shortcut">Ctrl+Y</span></a-menu-item>
          <a-menu-divider />
          <a-menu-item key="cut" @click="handleCut()"><SheetIcon name="content-cut" />剪切<span class="shortcut">Ctrl+X</span></a-menu-item>
          <a-menu-item key="copy" @click="handleCopy()"><SheetIcon name="content-copy" />复制<span class="shortcut">Ctrl+C</span></a-menu-item>
          <a-menu-item key="paste" @click="handlePaste()"><SheetIcon name="content-paste" />粘贴<span class="shortcut">Ctrl+V</span></a-menu-item>
          <a-menu-divider />
          <a-menu-item key="selectAll" @click="selectAll()"><SheetIcon name="select-all" />全选<span class="shortcut">Ctrl+A</span></a-menu-item>
          <a-menu-item key="deleteContent" @click="deleteSelectedContent()"><SheetIcon name="delete-outline" />删除内容<span class="shortcut">Delete</span></a-menu-item>
        </a-sub-menu>

        <a-sub-menu key="view" popupClassName="sheet-menu-popper">
          <template #title>视图</template>
          <a-menu-item key="showGridlines" @click="toggleGridlines()">
            <SheetIcon :name="showGridlines ? 'checkbox-marked-outline' : 'checkbox-blank-outline'" />
            {{ showGridlines ? '显示网格线' : '隐藏网格线' }}
          </a-menu-item>
          <a-menu-item key="showFormulaBar" @click="showFormulaBar = !showFormulaBar">
            <SheetIcon :name="showFormulaBar ? 'checkbox-marked-outline' : 'checkbox-blank-outline'" />
            {{ showFormulaBar ? '显示编辑栏' : '隐藏编辑栏' }}
          </a-menu-item>
          <a-menu-divider />
          <a-menu-item key="freezeRow" @click="toggleFreezeRow()">
            <SheetIcon name="snowflake" />
            {{ frozenRows > 0 ? '取消冻结行' : '冻结第一行' }}
          </a-menu-item>
          <a-menu-item key="freezeCol" @click="toggleFreezeCol()">
            <SheetIcon name="snowflake" />
            {{ frozenCols > 0 ? '取消冻结列' : '冻结第一列' }}
          </a-menu-item>
        </a-sub-menu>

        <a-sub-menu key="insert" popupClassName="sheet-menu-popper">
          <template #title>插入</template>
          <a-menu-item key="insertRowAbove" @click="insertRow('above')"><SheetIcon name="table-row-plus-before" />在上方插入行</a-menu-item>
          <a-menu-item key="insertRowBelow" @click="insertRow('below')"><SheetIcon name="table-row-plus-after" />在下方插入行</a-menu-item>
          <a-menu-divider />
          <a-menu-item key="insertColLeft" @click="insertCol('left')"><SheetIcon name="table-column-plus-before" />在左侧插入列</a-menu-item>
          <a-menu-item key="insertColRight" @click="insertCol('right')"><SheetIcon name="table-column-plus-after" />在右侧插入列</a-menu-item>
        </a-sub-menu>

        <a-sub-menu key="format" popupClassName="sheet-menu-popper">
          <template #title>格式</template>
          <a-sub-menu key="textFormat" popupClassName="sheet-menu-popper">
            <template #title><SheetIcon name="format-text" />文本</template>
            <a-menu-item key="fBold" @click="toggleStyle('bold')"><SheetIcon name="format-bold" />粗体<span class="shortcut">Ctrl+B</span></a-menu-item>
            <a-menu-item key="fItalic" @click="toggleStyle('italic')"><SheetIcon name="format-italic" />斜体<span class="shortcut">Ctrl+I</span></a-menu-item>
            <a-menu-item key="fUnderline" @click="toggleStyle('underline')"><SheetIcon name="format-underline" />下划线<span class="shortcut">Ctrl+U</span></a-menu-item>
            <a-menu-item key="fStrikethrough" @click="toggleStyle('strikethrough')"><SheetIcon name="format-strikethrough" />删除线</a-menu-item>
          </a-sub-menu>
          <a-sub-menu key="alignFormat" popupClassName="sheet-menu-popper">
            <template #title><SheetIcon name="format-align-left" />对齐方式</template>
            <a-menu-item key="aLeft" @click="setAlign('left')"><SheetIcon name="format-align-left" />左对齐</a-menu-item>
            <a-menu-item key="aCenter" @click="setAlign('center')"><SheetIcon name="format-align-center" />居中对齐</a-menu-item>
            <a-menu-item key="aRight" @click="setAlign('right')"><SheetIcon name="format-align-right" />右对齐</a-menu-item>
            <a-menu-divider />
            <a-menu-item key="vaTop" @click="setVerticalAlign('top')"><SheetIcon name="format-vertical-align-top" />顶部对齐</a-menu-item>
            <a-menu-item key="vaMiddle" @click="setVerticalAlign('middle')"><SheetIcon name="format-vertical-align-center" />垂直居中</a-menu-item>
            <a-menu-item key="vaBottom" @click="setVerticalAlign('bottom')"><SheetIcon name="format-vertical-align-bottom" />底部对齐</a-menu-item>
          </a-sub-menu>
          <a-sub-menu key="wrapFormat" popupClassName="sheet-menu-popper">
            <template #title><SheetIcon name="text-wrap" />文本换行</template>
            <a-menu-item key="wrapClip" @click="setWrap('clip')">裁剪</a-menu-item>
            <a-menu-item key="wrapOverflow" @click="setWrap('overflow')">溢出</a-menu-item>
            <a-menu-item key="wrapWrap" @click="setWrap('wrap')">自动换行</a-menu-item>
          </a-sub-menu>
          <a-menu-divider />
          <a-menu-item key="mergeCells" @click="handleMergeCells()"><SheetIcon name="table-merge-cells" />合并单元格</a-menu-item>
          <a-menu-item key="unmergeCells" @click="handleUnmergeCells()"><SheetIcon name="table-split-cell" />取消合并</a-menu-item>
          <a-menu-divider />
          <a-menu-item key="clearFormat" @click="clearSelectedFormat()"><SheetIcon name="format-clear" />清除格式</a-menu-item>
        </a-sub-menu>

        <a-sub-menu key="data" popupClassName="sheet-menu-popper">
          <template #title>数据</template>
          <a-menu-item key="sortAsc" @click="sortColumn('asc')"><SheetIcon name="sort-ascending" />按列升序排序</a-menu-item>
          <a-menu-item key="sortDesc" @click="sortColumn('desc')"><SheetIcon name="sort-descending" />按列降序排序</a-menu-item>
        </a-sub-menu>

        <a-sub-menu key="help" popupClassName="sheet-menu-popper">
          <template #title>帮助</template>
          <a-menu-item key="shortcuts" @click="showShortcutsDialog = true">
            <SheetIcon name="keyboard-outline" />键盘快捷键
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

      <!-- 货币/百分比/小数位 快捷按钮 -->
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

      <!-- 填充色 -->
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
      <a-popover placement="bottom" :width="280" trigger="click" v-model:open="filterPopoverVisible" @afterOpenChange="(v: boolean) => v && prepareFilterPanel()">
        <template #content>
          <div class="filter-panel">
            <div class="filter-title">筛选列 {{ columnLabel(filterColumn ?? selected.col) }}</div>
            <input v-model="filterKeyword" class="filter-input" placeholder="包含关键词" />
            <div class="filter-actions-inline">
              <button class="tb-sm" @click="toggleAllFilterValues(true)">全选</button>
              <button class="tb-sm" @click="toggleAllFilterValues(false)">全不选</button>
            </div>
            <div class="filter-values">
              <label v-for="value in filterValueOptions" :key="`fv-${value}`" class="filter-value-item">
                <input type="checkbox" :checked="isFilterValueSelected(value)" @change="onFilterValueChange(value, $event)" />
                <span>{{ value === FILTER_EMPTY_TOKEN ? '(空白)' : value }}</span>
              </label>
            </div>
            <div class="filter-actions-inline">
              <button class="tb-sm" @click="sortColumn('asc')">升序</button>
              <button class="tb-sm" @click="sortColumn('desc')">降序</button>
              <button class="tb-sm replace-btn" @click="applyFilterAndClose()">应用</button>
              <button class="tb-sm" @click="clearFilter()">清除</button>
            </div>
          </div>
        </template>
        <template #default>
          <button class="tb" :disabled="readOnly" :class="{ active: filterActive }" title="筛选">
            <SheetIcon name="filter-outline" />
          </button>
        </template>
      </a-popover>
      <span class="toolbar-divider" />

      <!-- 超链接 -->
      <button class="tb" :disabled="readOnly" @click="insertHyperlink()" title="插入链接">
        <SheetIcon name="link-variant" />
      </button>
      <!-- 插入图片 -->
      <button class="tb" :disabled="readOnly" @click="insertImage()" title="插入图片">
        <SheetIcon name="image-outline" />
      </button>
      <!-- 评论 -->
      <button class="tb" :disabled="readOnly" @click="insertComment()" title="评论">
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
      <button class="tb" @click="openSearch()" title="查找和替换 (Ctrl+H)">
        <SheetIcon name="find-replace" />
      </button>
    </div>
    </div>

    <!-- 查找替换面板 -->
    <div class="search-panel" v-if="searchVisible">
      <div class="search-row">
        <input v-model="searchText" placeholder="查找" class="search-input" @keydown.enter="performSearch()" />
        <span class="search-count" v-if="searchResults.length > 0">{{ searchIndex + 1 }}/{{ searchResults.length }}</span>
        <button class="tb-sm" @click="searchPrev()" title="上一个">&#9650;</button>
        <button class="tb-sm" @click="searchNext()" title="下一个">&#9660;</button>
        <button class="tb-sm" @click="searchVisible = false; searchResults = []; searchIndex = -1" title="关闭">&#10005;</button>
      </div>
      <div class="search-row">
        <input v-model="replaceText" placeholder="替换为" class="search-input" @keydown.enter="replaceOne()" />
        <button class="tb-sm replace-btn" @click="replaceOne()" :disabled="readOnly || searchResults.length === 0">替换</button>
        <button class="tb-sm replace-btn" @click="replaceAll()" :disabled="readOnly || searchResults.length === 0">全部</button>
      </div>
    </div>

    <!-- 表格网格 -->
    <div class="grid-scroll luckysheet-grid-scroll" ref="gridScrollRef" @mousedown="handleGridMouseDown">
      <div class="luckysheet-grid-zoom" :style="sheetGridStyle">
        <div :id="luckysheetContainerId" ref="luckysheetHostRef" class="luckysheet-host"></div>
      </div>
    </div>

    <!-- 单元格右键菜单 -->
    <Teleport to="body">
      <div v-if="cellMenu.visible" class="sheet-ctx-menu" :style="{ left: cellMenu.x + 'px', top: cellMenu.y + 'px' }" @click.stop>
        <div class="ctx-menu-item" @click="ctxCut()"><SheetIcon name="content-cut" /><span>剪切</span><span class="ctx-shortcut">Ctrl+X</span></div>
        <div class="ctx-menu-item" @click="ctxCopy()"><SheetIcon name="content-copy" /><span>复制</span><span class="ctx-shortcut">Ctrl+C</span></div>
        <div class="ctx-menu-item" @click="ctxPaste()"><SheetIcon name="content-paste" /><span>粘贴</span><span class="ctx-shortcut">Ctrl+V</span></div>
        <div class="ctx-menu-divider"></div>
        <div class="ctx-menu-item" @click="ctxInsertRowAbove()"><SheetIcon name="table-row-plus-before" /><span>在上方插入行</span></div>
        <div class="ctx-menu-item" @click="ctxInsertRowBelow()"><SheetIcon name="table-row-plus-after" /><span>在下方插入行</span></div>
        <div class="ctx-menu-item" @click="ctxDeleteRow()"><SheetIcon name="delete-outline" /><span>删除行</span></div>
        <div class="ctx-menu-divider"></div>
        <div class="ctx-menu-item" @click="ctxInsertColLeft()"><SheetIcon name="table-column-plus-before" /><span>在左侧插入列</span></div>
        <div class="ctx-menu-item" @click="ctxInsertColRight()"><SheetIcon name="table-column-plus-after" /><span>在右侧插入列</span></div>
        <div class="ctx-menu-item" @click="ctxDeleteCol()"><SheetIcon name="delete-outline" /><span>删除列</span></div>
        <div class="ctx-menu-divider"></div>
        <div class="ctx-menu-item" @click="ctxClearContent()"><SheetIcon name="delete-outline" /><span>删除内容</span><span class="ctx-shortcut">Delete</span></div>
        <div class="ctx-menu-item" @click="ctxClearFormat()"><SheetIcon name="format-clear" /><span>清除格式</span></div>
      </div>
    </Teleport>

    <!-- 工作表标签右键菜单 -->
    <Teleport to="body">
      <div v-if="sheetMenu.visible" class="sheet-ctx-menu" :style="{ left: sheetMenu.x + 'px', bottom: sheetMenu.y + 'px' }" @click.stop>
        <div class="ctx-menu-item" @click="ctxRenameSheet()"><SheetIcon name="format-text" /><span>重命名</span></div>
        <div class="ctx-menu-item" @click="ctxDuplicateSheet()"><SheetIcon name="content-copy" /><span>创建副本</span></div>
        <div class="ctx-menu-item" @click="ctxInsertSheet()"><SheetIcon name="plus" /><span>插入工作表</span></div>
        <template v-if="workbook.sheets.length > 1">
          <div class="ctx-menu-divider"></div>
          <div class="ctx-menu-item ctx-danger" @click="ctxDeleteSheet()"><SheetIcon name="delete-outline" /><span>删除工作表</span></div>
        </template>
      </div>
    </Teleport>


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
import { computed, h, nextTick, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import { message, Modal } from 'ant-design-vue'
import 'luckysheet/dist/plugins/css/pluginsCss.css'
import 'luckysheet/dist/plugins/plugins.css'
import 'luckysheet/dist/css/luckysheet.css'
import 'luckysheet/dist/assets/iconfont/iconfont.css'
import pluginScriptUrl from 'luckysheet/dist/plugins/js/plugin.js?url'
import luckysheetScriptUrl from 'luckysheet/dist/luckysheet.umd.js?url'
import SheetIcon from './SheetIcon.vue'
import UnifiedTopHeader from './UnifiedTopHeader.vue'
import type { Align, VerticalAlign, WrapMode, ICellStyle, ICellMeta, IUiSheet, IWorkbook, UndoEntry } from '../types'
import { createExcelI18n } from '../i18n'
import type { ExcelI18nMessages, ExcelLocale } from '../i18n'
import { readExcelFileToWorkbook } from '../utils/excel-import'
import { writeWorkbookToExcelBuffer } from '../utils/excel-export'
import { extractWorkbookFromLuckysheet, workbookToLuckySheets } from '../utils/luckysheet-adapter'

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
const isSelecting = ref(false)
const formulaValue = ref('')
const formulaFocused = ref(false)
const formulaInputRef = ref<HTMLInputElement | null>(null)
const cellInputRef = ref<HTMLInputElement[] | HTMLInputElement | null>(null)
const gridScrollRef = ref<HTMLElement | null>(null)
const sheetEditorRef = ref<HTMLElement | null>(null)
const showGridlines = ref(true)
const showFormulaBar = ref(true)
const frozenRows = ref(0)
const frozenCols = ref(0)
const formatPainterActive = ref(false)
const formatPainterStyle = ref<ICellStyle | null>(null)
const colWidths = reactive<Record<number, number>>({})
const rowHeights = reactive<Record<number, number>>({})

const editingCell = ref<{ row: number; col: number } | null>(null)
const editingValue = ref('')

const cellMenu = reactive({ visible: false, x: 0, y: 0 })
const sheetMenu = reactive({ visible: false, x: 0, y: 0, index: 0 })

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
const zoomPercent = ref(100)
const isFullscreen = ref(false)
const isEyeCareMode = ref(false)
const zoomLevels = [50, 75, 100, 125, 150, 175, 200]
const luckysheetHostRef = ref<HTMLElement | null>(null)
const luckysheetContainerId = `luckysheet-${Math.random().toString(36).slice(2)}`

type LuckyRange = {
  row: [number, number]
  column: [number, number]
}

type LuckySheetInstance = {
  create: (options: Record<string, any>) => void
  destroy?: () => void
  getAllSheets?: () => any[]
  getRange?: () => LuckyRange[]
  setSheetActive?: (index: number | string) => void
}

let luckysheetLoadPromise: Promise<void> | null = null
let luckysheetRenderTimer: number | undefined
let renderingLuckysheet = false

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

function getLuckysheet(): LuckySheetInstance | undefined {
  return (window as any).luckysheet
}

function loadClassicScript(url: string, marker: string) {
  return new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[data-luckysheet-script="${marker}"]`)
    if (existing) {
      if (existing.dataset.loaded === 'true') {
        resolve()
        return
      }
      existing.addEventListener('load', () => resolve(), { once: true })
      existing.addEventListener('error', () => reject(new Error(`Failed to load ${marker}`)), { once: true })
      return
    }
    const script = document.createElement('script')
    script.src = url
    script.async = false
    script.dataset.luckysheetScript = marker
    script.onload = () => {
      script.dataset.loaded = 'true'
      resolve()
    }
    script.onerror = () => reject(new Error(`Failed to load ${marker}`))
    document.head.appendChild(script)
  })
}

async function ensureLuckysheetLoaded() {
  if (getLuckysheet()) return
  if (!luckysheetLoadPromise) {
    luckysheetLoadPromise = (async () => {
      await loadClassicScript(pluginScriptUrl, 'plugin')
      await loadClassicScript(luckysheetScriptUrl, 'core')
    })()
  }
  await luckysheetLoadPromise
}

function clearLuckysheetRenderTimer() {
  if (luckysheetRenderTimer !== undefined) {
    window.clearTimeout(luckysheetRenderTimer)
    luckysheetRenderTimer = undefined
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
    scheduleLuckysheetRender()
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

const sheetGridStyle = computed(() => ({
  zoom: `${zoomPercent.value}%`
}))

const filteredCellCount = computed(() => {
  const sheet = activeSheet.value
  if (!sheet) return 0
  return Object.values(sheet.cells).filter(v => v !== '').length
})

// ===== Merge rendering =====
const mergeMap = computed(() => {
  const map: Record<string, { hidden: true } | { rowSpan: number; colSpan: number }> = {}
  const sheet = activeSheet.value
  if (!sheet?.merges) return map
  for (const m of sheet.merges) {
    const [r1, c1, r2, c2] = m.split(':').map(Number)
    map[cellKey(r1, c1)] = { rowSpan: r2 - r1 + 1, colSpan: c2 - c1 + 1 }
    for (let r = r1; r <= r2; r++) {
      for (let c = c1; c <= c2; c++) {
        if (r !== r1 || c !== c1) {
          map[cellKey(r, c)] = { hidden: true }
        }
      }
    }
  }
  return map
})

function getMergeInfo(row: number, col: number) {
  return mergeMap.value[cellKey(row, col)]
}

function isMergeHidden(row: number, col: number): boolean {
  const info = getMergeInfo(row, col)
  return !!info && 'hidden' in info
}

function getMergeSpan(row: number, col: number): { rowSpan?: number; colSpan?: number } {
  const info = getMergeInfo(row, col)
  if (info && 'rowSpan' in info) return { rowSpan: info.rowSpan, colSpan: info.colSpan }
  return {}
}

watch([activeSheetIndex, () => selected.row, () => selected.col], () => {
  syncDimensionStateFromActiveSheet()
  syncToolbarAndFormula()
})

watch(activeSheetIndex, () => {
  loadFilterStateFromActiveSheet()
  getLuckysheet()?.setSheetActive?.(activeSheetIndex.value)
})

function updateSelectionFromLuckysheet() {
  const range = getLuckysheet()?.getRange?.()?.[0]
  if (!range) return
  selected.row = Number(range.row?.[0] || 0)
  selectionEnd.row = Number(range.row?.[1] || selected.row)
  selected.col = Number(range.column?.[0] || 0)
  selectionEnd.col = Number(range.column?.[1] || selected.col)
  syncToolbarAndFormula()
}

function syncWorkbookFromLuckysheet() {
  const extracted = extractWorkbookFromLuckysheet()
  if (!Array.isArray(extracted.sheets) || extracted.sheets.length === 0) return
  const currentSheets = workbook.sheets || []
  workbook.version = extracted.version || workbook.version || 1
  workbook.sheets = extracted.sheets.map((sheet, index) => {
    const current = currentSheets[index]
    return {
      ...sheet,
      cellMeta: { ...(current?.cellMeta || {}) },
      filterColumn: current?.filterColumn ?? null,
      filterKeyword: current?.filterKeyword || '',
      filterSelectedValues: { ...(current?.filterSelectedValues || {}) },
      filterActive: !!current?.filterActive
    }
  })
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

async function renderLuckysheet() {
  await ensureLuckysheetLoaded()
  const lucky = getLuckysheet()
  const host = luckysheetHostRef.value
  if (!lucky || !host) return
  renderingLuckysheet = true
  try {
    try {
      lucky.destroy?.()
    } catch {
      // ignore luckysheet destroy errors
    }
    host.innerHTML = ''
    const hostReady = await waitForLuckysheetHost(host)
    if (!hostReady) {
      console.warn('[SheetEditor] luckysheet host height is 0')
      return
    }
    lucky.create({
      container: luckysheetContainerId,
      data: workbookToLuckySheets(workbook),
      lang: props.locale === 'enUS' ? 'en' : 'zh',
      showtoolbar: false,
      showinfobar: false,
      showsheetbar: true,
      showstatisticBar: false,
      showConfigWindow: false,
      sheetBottomConfig: true,
      allowEdit: !props.readOnly,
      enableAddRow: !props.readOnly,
      enableAddBack: !props.readOnly,
      forceCalculation: false,
      hook: {
        cellMousedown: () => {
          window.setTimeout(updateSelectionFromLuckysheet, 0)
        },
        rangeSelect: () => {
          window.setTimeout(updateSelectionFromLuckysheet, 0)
        },
        sheetActivate: () => {
          window.setTimeout(updateSelectionFromLuckysheet, 0)
        },
        cellUpdateBefore: () => {
          if (props.readOnly) return false
          return true
        },
        cellUpdated: () => {
          if (renderingLuckysheet) return
          syncWorkbookFromLuckysheet()
          updateSelectionFromLuckysheet()
          emitChange('luckysheet')
        },
        workbookCreateAfter: () => {
          lucky.setSheetActive?.(activeSheetIndex.value)
          updateSelectionFromLuckysheet()
          window.dispatchEvent(new Event('resize'))
        }
      }
    })
  } catch (error) {
    console.error('[SheetEditor] luckysheet render error:', error)
  } finally {
    renderingLuckysheet = false
  }
}

function scheduleLuckysheetRender() {
  clearLuckysheetRenderTimer()
  luckysheetRenderTimer = window.setTimeout(() => {
    renderLuckysheet()
  }, 0)
}

// ===== Normalization =====
function normalizeWorkbook(input: any): IWorkbook {
  if (input && typeof input === 'object') {
    if (Array.isArray(input?.data)) {
      return {
        version: Number(input?.version || 1),
        sheets: input.data.map((sheet: any, i: number) => fromFortuneSheetRecord(sheet, i))
      }
    }
    if (input?.data && typeof input.data === 'object' && Array.isArray(input.data?.sheets)) {
      return {
        version: Number(input?.version || 1),
        sheets: input.data.sheets.map((sheet: any, i: number) => fromInternalSheet(sheet, i))
      }
    }
    if (Array.isArray(input?.sheets)) {
      return {
        version: Number(input?.version || 1),
        sheets: input.sheets.map((sheet: any, i: number) => fromInternalSheet(sheet, i))
      }
    }
  }
  return { version: 1, sheets: [createDefaultSheet(0)] }
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

function normalizeHyperlink(url: string): string {
  const trimmed = String(url || '').trim()
  if (!trimmed) return ''
  if (/^(https?:\/\/|mailto:|tel:)/i.test(trimmed)) return trimmed
  return `https://${trimmed}`
}

function getCellMeta(row: number, col: number): ICellMeta {
  return activeSheet.value?.cellMeta?.[cellKey(row, col)] || {}
}

function getCellHyperlink(row: number, col: number): string {
  return normalizeHyperlink(String(getCellMeta(row, col).hyperlink || ''))
}

function getCellComment(row: number, col: number): string {
  return String(getCellMeta(row, col).comment || '')
}

function displayCellValue(row: number, col: number): string {
  const val = cellValue(row, col)
  const key = cellKey(row, col)
  const style = activeSheet.value?.styles[key]
  if (!val || !style?.numberFormat || style.numberFormat === 'auto' || style.numberFormat === 'text') return val
  const num = Number(val)
  if (!Number.isFinite(num)) return val
  const dp = style.decimalPlaces ?? 2
  switch (style.numberFormat) {
    case 'percent': return (num * 100).toFixed(dp) + '%'
    case 'currency': return '¥' + num.toFixed(dp)
    case 'number': return num.toFixed(dp)
    default: return val
  }
}

function getCellStyle(row: number, col: number) {
  const key = cellKey(row, col)
  const style = activeSheet.value?.styles[key] || {}
  const result: Record<string, string> = {
    textAlign: style.align || 'left',
    fontWeight: style.bold ? '700' : '400',
    fontStyle: style.italic ? 'italic' : 'normal',
    textDecoration: [
      style.underline ? 'underline' : '',
      style.strikethrough ? 'line-through' : ''
    ].filter(Boolean).join(' ') || 'none',
    fontFamily: style.fontFamily || 'Microsoft YaHei, sans-serif',
    fontSize: `${style.fontSize || 12}px`,
  }
  if (style.fontColor) result.color = style.fontColor
  if (style.bgColor) result.backgroundColor = style.bgColor
  if (style.borderTop) result.borderTop = style.borderTop
  if (style.borderBottom) result.borderBottom = style.borderBottom
  if (style.borderLeft) result.borderLeft = style.borderLeft
  if (style.borderRight) result.borderRight = style.borderRight
  const vaMap: Record<string, string> = { top: 'top', middle: 'middle', bottom: 'bottom' }
  result.verticalAlign = vaMap[style.verticalAlign as string] || 'middle'
  if (style.rotation) {
    result.transform = `rotate(${style.rotation}deg)`
    result.writingMode = style.rotation === 90 ? 'vertical-rl' : 'horizontal-tb'
  }
  if (style.wrap === 'wrap') {
    result.whiteSpace = 'pre-wrap'
    result.wordBreak = 'break-word'
  }
  const isFrozenRow = frozenRows.value > 0 && row < frozenRows.value
  const isFrozenCol = frozenCols.value > 0 && col < frozenCols.value
  if (isFrozenRow) {
    result.position = 'sticky'
    result.top = `${getFrozenTopOffset(row)}px`
  }
  if (isFrozenCol) {
    result.position = 'sticky'
    result.left = `${getFrozenLeftOffset(col)}px`
  }
  if (isFrozenRow || isFrozenCol) {
    result.backgroundColor = result.backgroundColor || '#ffffff'
    result.zIndex = isFrozenRow && isFrozenCol ? '5' : '2'
  }
  return result
}

function getRowHeight(row: number): number {
  return rowHeights[row] || 25
}

function getColWidth(col: number): number {
  return colWidths[col] || 100
}

function isRowHidden(row: number): boolean {
  return !!activeSheet.value?.hiddenRows?.[row] || !!filteredRows[row]
}

function isColHidden(col: number): boolean {
  return !!activeSheet.value?.hiddenCols?.[col]
}

function getFrozenLeftOffset(col: number): number {
  let left = 46
  for (let c = 0; c < col; c++) {
    if (isColHidden(c)) continue
    if (c >= frozenCols.value) break
    left += getColWidth(c)
  }
  return left
}

function getFrozenTopOffset(row: number): number {
  let top = 25
  for (let r = 0; r < row; r++) {
    if (isRowHidden(r)) continue
    if (r >= frozenRows.value) break
    top += getRowHeight(r)
  }
  return top
}

function getColumnHeaderStyle(col: number): Record<string, string> {
  if (!(frozenCols.value > 0 && col < frozenCols.value) || isColHidden(col)) return {}
  return {
    left: `${getFrozenLeftOffset(col)}px`,
    zIndex: '4'
  }
}

function getRowHeaderStyle(row: number): Record<string, string> {
  if (!(frozenRows.value > 0 && row < frozenRows.value) || isRowHidden(row)) return {}
  return {
    top: `${getFrozenTopOffset(row)}px`,
    zIndex: '3'
  }
}

function getCellClass(row: number, col: number) {
  const { r1, r2, c1, c2 } = selectionRange.value
  const inRange = row >= r1 && row <= r2 && col >= c1 && col <= c2
  const isAnchor = row === selected.row && col === selected.col
  const meta = getCellMeta(row, col)
  return {
    active: isAnchor && r1 === r2 && c1 === c2,
    'in-selection': inRange && !isAnchor,
    'selection-anchor': isAnchor && (r1 !== r2 || c1 !== c2),
    'has-comment': !!meta.comment
  }
}

function isRowInSelection(row: number): boolean {
  const { r1, r2 } = selectionRange.value
  return row >= r1 && row <= r2
}

function isColInSelection(col: number): boolean {
  const { c1, c2 } = selectionRange.value
  return col >= c1 && col <= c2
}

// ===== Selection =====
function selectCell(row: number, col: number) {
  if (editingCell.value) confirmEditing()
  selected.row = row
  selected.col = col
  selectionEnd.row = row
  selectionEnd.col = col
  syncToolbarAndFormula()
}

function onCellMouseDown(row: number, col: number, e: MouseEvent) {
  if (formatPainterActive.value && formatPainterStyle.value) {
    applyFormatPainter(row, col)
    return
  }
  if (editingCell.value && (editingCell.value.row !== row || editingCell.value.col !== col)) {
    confirmEditing()
  }
  if (e.shiftKey) {
    selectionEnd.row = row
    selectionEnd.col = col
  } else {
    selected.row = row
    selected.col = col
    selectionEnd.row = row
    selectionEnd.col = col
  }
  isSelecting.value = true
  syncToolbarAndFormula()

  const onMouseUp = () => {
    isSelecting.value = false
    document.removeEventListener('mouseup', onMouseUp)
  }
  document.addEventListener('mouseup', onMouseUp)
}

function onCellMouseOver(row: number, col: number) {
  if (isSelecting.value) {
    selectionEnd.row = row
    selectionEnd.col = col
  }
}

function selectAll() {
  selected.row = 0
  selected.col = 0
  selectionEnd.row = currentRows.value.length - 1
  selectionEnd.col = currentColumns.value.length - 1
}

function selectEntireRow(row: number) {
  selected.row = row
  selected.col = 0
  selectionEnd.row = row
  selectionEnd.col = currentColumns.value.length - 1
  syncToolbarAndFormula()
}

function selectEntireCol(col: number) {
  selected.row = 0
  selected.col = col
  selectionEnd.row = currentRows.value.length - 1
  selectionEnd.col = col
  syncToolbarAndFormula()
}

function selectCellRefInput() {
  formulaInputRef.value?.focus()
  formulaInputRef.value?.select()
}

// ===== Editing =====
function startEditing(row: number, col: number) {
  if (props.readOnly) return
  selectCell(row, col)
  editingCell.value = { row, col }
  editingValue.value = cellValue(row, col)
  nextTick(() => {
    const input = Array.isArray(cellInputRef.value) ? cellInputRef.value[0] : cellInputRef.value
    input?.focus()
  })
}

function startTypingEdit(char: string) {
  if (props.readOnly || editingCell.value) return
  editingCell.value = { row: selected.row, col: selected.col }
  editingValue.value = char
  nextTick(() => {
    const input = Array.isArray(cellInputRef.value) ? cellInputRef.value[0] : cellInputRef.value
    if (input) {
      input.focus()
    }
  })
}

function onCellInput(e: Event) {
  editingValue.value = (e.target as HTMLInputElement).value
  formulaValue.value = editingValue.value
}

function onFormulaInput(e: Event) {
  const val = (e.target as HTMLInputElement).value
  formulaValue.value = val
  if (editingCell.value) {
    editingValue.value = val
  }
}

function confirmEditing() {
  if (!editingCell.value || !activeSheet.value) return
  saveUndoState()
  const { row, col } = editingCell.value
  const key = cellKey(row, col)
  const value = editingValue.value
  if (value) {
    activeSheet.value.cells[key] = value
  } else {
    delete activeSheet.value.cells[key]
  }
  editingCell.value = null
  editingValue.value = ''
  syncToolbarAndFormula()
  emitChange()
}

function confirmFormulaAndMove(dir: 'down' | 'right') {
  if (editingCell.value) {
    confirmEditing()
  } else if (formulaFocused.value) {
    applyFormulaValue()
  }
  if (dir === 'down') moveSelection(1, 0)
  else moveSelection(0, 1)
}

function cancelEditing() {
  editingCell.value = null
  editingValue.value = ''
  syncToolbarAndFormula()
}

function applyFormulaValue() {
  if (props.readOnly || !activeSheet.value) return
  saveUndoState()
  const key = cellKey(selected.row, selected.col)
  const value = String(formulaValue.value || '')
  if (value) {
    activeSheet.value.cells[key] = value
  } else {
    delete activeSheet.value.cells[key]
  }
  updateCellStyle()
  emitChange()
}

// ===== Keyboard Navigation =====
function onCellInputKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter') {
    e.preventDefault()
    confirmEditing()
    moveSelection(e.shiftKey ? -1 : 1, 0)
  } else if (e.key === 'Tab') {
    e.preventDefault()
    confirmEditing()
    moveSelection(0, e.shiftKey ? -1 : 1)
  } else if (e.key === 'Escape') {
    e.preventDefault()
    cancelEditing()
  }
}

function handleGlobalKeydown(e: KeyboardEvent) {
  if (editingCell.value) return
  if (formulaFocused.value) return

  const ctrl = e.ctrlKey || e.metaKey

  // Ctrl shortcuts
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
      case 'f': e.preventDefault(); openSearch(); return
      case 'h': e.preventDefault(); openSearch(); return
      case 'p': e.preventDefault(); handlePrint(); return
      case 's': e.preventDefault(); emitChange(); return
      case 'o': e.preventDefault(); triggerImportExcel(); return
    }
  }

  // Navigation
  switch (e.key) {
    case 'ArrowUp': e.preventDefault(); moveSelection(-1, 0); return
    case 'ArrowDown': e.preventDefault(); moveSelection(1, 0); return
    case 'ArrowLeft': e.preventDefault(); moveSelection(0, -1); return
    case 'ArrowRight': e.preventDefault(); moveSelection(0, 1); return
    case 'Tab': e.preventDefault(); moveSelection(0, e.shiftKey ? -1 : 1); return
    case 'Enter': e.preventDefault(); moveSelection(e.shiftKey ? -1 : 1, 0); return
    case 'Home': e.preventDefault(); selectCell(selected.row, 0); return
    case 'End': e.preventDefault(); selectCell(selected.row, currentColumns.value.length - 1); return
    case 'Delete':
    case 'Backspace':
      e.preventDefault()
      deleteSelectedContent()
      return
    case 'F2':
      e.preventDefault()
      startEditing(selected.row, selected.col)
      return
  }

  // Start typing to edit
  if (e.key.length === 1 && !ctrl && !e.altKey) {
    e.preventDefault()
    startTypingEdit(e.key)
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
  const key = cellKey(selected.row, selected.col)
  if (!editingCell.value) {
    formulaValue.value = activeSheet.value?.cells[key] || ''
  }
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
  if (props.readOnly || !activeSheet.value) return
  saveUndoState()
  const { r1, r2, c1, c2 } = selectionRange.value
  for (let r = r1; r <= r2; r++) {
    for (let c = c1; c <= c2; c++) {
      const key = cellKey(r, c)
      activeSheet.value.styles[key] = {
        ...(activeSheet.value.styles[key] || {}),
        bold: !!toolbarState.bold,
        italic: !!toolbarState.italic,
        underline: !!toolbarState.underline,
        strikethrough: !!toolbarState.strikethrough,
        align: toolbarState.align || 'left',
        verticalAlign: toolbarState.verticalAlign || 'bottom',
        fontFamily: toolbarState.fontFamily || 'Microsoft YaHei, sans-serif',
        fontSize: Number(toolbarState.fontSize || 12),
        fontColor: toolbarState.fontColor,
        bgColor: toolbarState.bgColor,
        wrap: toolbarState.wrap,
        numberFormat: toolbarState.numberFormat,
        decimalPlaces: toolbarState.decimalPlaces,
        rotation: toolbarState.rotation,
      }
    }
  }
  emitChange()
}

function toggleStyle(style: 'bold' | 'italic' | 'underline' | 'strikethrough') {
  if (props.readOnly) return
  toolbarState[style] = !toolbarState[style]
  updateCellStyle()
}

function setAlign(align: Align) {
  if (props.readOnly) return
  toolbarState.align = align
  updateCellStyle()
}

function setWrap(wrap: WrapMode) {
  if (props.readOnly) return
  toolbarState.wrap = wrap
  updateCellStyle()
}

function toggleWrap() {
  setWrap(toolbarState.wrap === 'wrap' ? 'clip' : 'wrap')
}

function setFontColor(color: string) {
  if (props.readOnly) return
  toolbarState.fontColor = color
  updateCellStyle()
}

function setBgColor(color: string) {
  if (props.readOnly) return
  toolbarState.bgColor = color
  updateCellStyle()
}

function setBorders(type: string) {
  if (props.readOnly || !activeSheet.value) return
  saveUndoState()
  const { r1, r2, c1, c2 } = selectionRange.value
  const borderValue = '1px solid #000'
  const noBorder = ''
  for (let r = r1; r <= r2; r++) {
    for (let c = c1; c <= c2; c++) {
      const key = cellKey(r, c)
      const existing = activeSheet.value.styles[key] || {}
      let borders = { borderTop: noBorder, borderBottom: noBorder, borderLeft: noBorder, borderRight: noBorder }
      if (type === 'all') {
        borders = { borderTop: borderValue, borderBottom: borderValue, borderLeft: borderValue, borderRight: borderValue }
      } else if (type === 'outer') {
        borders.borderTop = r === r1 ? borderValue : noBorder
        borders.borderBottom = r === r2 ? borderValue : noBorder
        borders.borderLeft = c === c1 ? borderValue : noBorder
        borders.borderRight = c === c2 ? borderValue : noBorder
      } else if (type === 'bottom') {
        borders.borderBottom = r === r2 ? borderValue : noBorder
      } else if (type === 'top') {
        borders.borderTop = r === r1 ? borderValue : noBorder
      } else if (type === 'left') {
        borders.borderLeft = c === c1 ? borderValue : noBorder
      } else if (type === 'right') {
        borders.borderRight = c === c2 ? borderValue : noBorder
      }
      activeSheet.value.styles[key] = { ...existing, ...borders }
    }
  }
  emitChange()
}

function clearSelectedFormat() {
  if (props.readOnly || !activeSheet.value) return
  saveUndoState()
  const { r1, r2, c1, c2 } = selectionRange.value
  for (let r = r1; r <= r2; r++) {
    for (let c = c1; c <= c2; c++) {
      delete activeSheet.value.styles[cellKey(r, c)]
    }
  }
  syncToolbarAndFormula()
  emitChange()
}

function deleteSelectedContent() {
  if (props.readOnly || !activeSheet.value) return
  saveUndoState()
  const { r1, r2, c1, c2 } = selectionRange.value
  for (let r = r1; r <= r2; r++) {
    for (let c = c1; c <= c2; c++) {
      delete activeSheet.value.cells[cellKey(r, c)]
      if (activeSheet.value.cellMeta) {
        delete activeSheet.value.cellMeta[cellKey(r, c)]
      }
    }
  }
  syncToolbarAndFormula()
  emitChange()
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
  if (props.readOnly || !activeSheet.value) return
  try {
    const text = await navigator.clipboard?.readText()
    if (!text) return
    saveUndoState()
    const rows = text.split('\n')
    for (let ri = 0; ri < rows.length; ri++) {
      const cols = rows[ri].split('\t')
      for (let ci = 0; ci < cols.length; ci++) {
        const r = selected.row + ri
        const c = selected.col + ci
        if (r < currentRows.value.length && c < currentColumns.value.length) {
          const key = cellKey(r, c)
          if (cols[ci]) {
            activeSheet.value.cells[key] = cols[ci]
          } else {
            delete activeSheet.value.cells[key]
          }
        }
      }
    }
    emitChange()
  } catch { /* clipboard access denied */ }
}

// ===== Format Painter =====
function handleFormatPainter() {
  if (props.readOnly) return
  if (formatPainterActive.value) {
    formatPainterActive.value = false
    formatPainterStyle.value = null
    return
  }
  const key = cellKey(selected.row, selected.col)
  formatPainterStyle.value = { ...(activeSheet.value?.styles[key] || {}) }
  formatPainterActive.value = true
}

function applyFormatPainter(row: number, col: number) {
  if (!formatPainterStyle.value || !activeSheet.value) return
  saveUndoState()
  const key = cellKey(row, col)
  activeSheet.value.styles[key] = { ...formatPainterStyle.value }
  formatPainterActive.value = false
  formatPainterStyle.value = null
  syncToolbarAndFormula()
  emitChange()
}

// ===== Row/Col operations =====
function insertRow(position: 'above' | 'below') {
  if (props.readOnly || !activeSheet.value) return
  saveUndoState()
  const sheet = activeSheet.value
  const insertAt = position === 'above' ? selected.row : selected.row + 1
  const newCells: Record<string, string> = {}
  const newStyles: Record<string, ICellStyle> = {}
  const newMeta: Record<string, ICellMeta> = {}
  for (const [key, val] of Object.entries(sheet.cells)) {
    const [r, c] = key.split(':').map(Number)
    if (r >= insertAt) {
      newCells[cellKey(r + 1, c)] = val
    } else {
      newCells[key] = val
    }
  }
  for (const [key, val] of Object.entries(sheet.styles)) {
    const [r, c] = key.split(':').map(Number)
    if (r >= insertAt) {
      newStyles[cellKey(r + 1, c)] = val
    } else {
      newStyles[key] = val
    }
  }
  for (const [key, val] of Object.entries(sheet.cellMeta || {})) {
    const [r, c] = key.split(':').map(Number)
    if (r >= insertAt) {
      newMeta[cellKey(r + 1, c)] = val
    } else {
      newMeta[key] = val
    }
  }
  sheet.cells = newCells
  sheet.styles = newStyles
  sheet.cellMeta = newMeta
  sheet.rowCount++
  emitChange()
}

function insertCol(position: 'left' | 'right') {
  if (props.readOnly || !activeSheet.value) return
  saveUndoState()
  const sheet = activeSheet.value
  const insertAt = position === 'left' ? selected.col : selected.col + 1
  const newCells: Record<string, string> = {}
  const newStyles: Record<string, ICellStyle> = {}
  const newMeta: Record<string, ICellMeta> = {}
  for (const [key, val] of Object.entries(sheet.cells)) {
    const [r, c] = key.split(':').map(Number)
    if (c >= insertAt) {
      newCells[cellKey(r, c + 1)] = val
    } else {
      newCells[key] = val
    }
  }
  for (const [key, val] of Object.entries(sheet.styles)) {
    const [r, c] = key.split(':').map(Number)
    if (c >= insertAt) {
      newStyles[cellKey(r, c + 1)] = val
    } else {
      newStyles[key] = val
    }
  }
  for (const [key, val] of Object.entries(sheet.cellMeta || {})) {
    const [r, c] = key.split(':').map(Number)
    if (c >= insertAt) {
      newMeta[cellKey(r, c + 1)] = val
    } else {
      newMeta[key] = val
    }
  }
  sheet.cells = newCells
  sheet.styles = newStyles
  sheet.cellMeta = newMeta
  sheet.colCount++
  emitChange()
}

// ===== Merge cells =====
function handleMergeCells() {
  if (props.readOnly || !activeSheet.value) return
  const { r1, r2, c1, c2 } = selectionRange.value
  if (r1 === r2 && c1 === c2) return
  saveUndoState()
  // Keep value from top-left cell, clear others
  const mergeKey = `${r1}:${c1}:${r2}:${c2}`
  if (!activeSheet.value.merges) activeSheet.value.merges = []
  activeSheet.value.merges.push(mergeKey)
  for (let r = r1; r <= r2; r++) {
    for (let c = c1; c <= c2; c++) {
      if (r !== r1 || c !== c1) {
        delete activeSheet.value.cells[cellKey(r, c)]
        if (activeSheet.value.cellMeta) {
          delete activeSheet.value.cellMeta[cellKey(r, c)]
        }
      }
    }
  }
  emitChange()
}

function handleUnmergeCells() {
  if (props.readOnly || !activeSheet.value || !activeSheet.value.merges) return
  saveUndoState()
  const { r1, r2, c1, c2 } = selectionRange.value
  activeSheet.value.merges = activeSheet.value.merges.filter(m => {
    const [mr1, mc1, mr2, mc2] = m.split(':').map(Number)
    return !(mr1 >= r1 && mr2 <= r2 && mc1 >= c1 && mc2 <= c2)
  })
  emitChange()
}

// ===== View operations =====
function toggleGridlines() { showGridlines.value = !showGridlines.value }
function toggleFreezeRow() {
  frozenRows.value = frozenRows.value > 0 ? 0 : 1
  syncDimensionStateToActiveSheet()
  emitChange()
}
function toggleFreezeCol() {
  frozenCols.value = frozenCols.value > 0 ? 0 : 1
  syncDimensionStateToActiveSheet()
  emitChange()
}

// ===== Sort =====
function sortColumn(order: 'asc' | 'desc') {
  if (props.readOnly || !activeSheet.value) return
  saveUndoState()
  const col = selected.col
  const sheet = activeSheet.value
  const rowData: Array<{ row: number; val: string }> = []
  for (let r = 0; r < sheet.rowCount; r++) {
    rowData.push({ row: r, val: cellValue(r, col) })
  }
  rowData.sort((a, b) => {
    const va = a.val
    const vb = b.val
    const na = Number(va)
    const nb = Number(vb)
    if (Number.isFinite(na) && Number.isFinite(nb)) {
      return order === 'asc' ? na - nb : nb - na
    }
    return order === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va)
  })
  const oldCells = { ...sheet.cells }
  const oldStyles = { ...sheet.styles }
  const oldMeta = { ...(sheet.cellMeta || {}) }
  const newCells: Record<string, string> = {}
  const newStyles: Record<string, ICellStyle> = {}
  const newMeta: Record<string, ICellMeta> = {}
  for (let newRow = 0; newRow < rowData.length; newRow++) {
    const oldRow = rowData[newRow].row
    for (let c = 0; c < sheet.colCount; c++) {
      const oldKey = cellKey(oldRow, c)
      const newKey = cellKey(newRow, c)
      if (oldCells[oldKey]) newCells[newKey] = oldCells[oldKey]
      if (oldStyles[oldKey]) newStyles[newKey] = oldStyles[oldKey]
      if (oldMeta[oldKey]) newMeta[newKey] = oldMeta[oldKey]
    }
  }
  sheet.cells = newCells
  sheet.styles = newStyles
  sheet.cellMeta = newMeta
  if (filterColumn.value !== null) {
    applyFilterRows()
  }
  emitChange()
}

// ===== Sheet operations =====
function switchSheet(idx: number) {
  if (editingCell.value) confirmEditing()
  activeSheetIndex.value = idx
  selected.row = 0
  selected.col = 0
  selectionEnd.row = 0
  selectionEnd.col = 0
  syncDimensionStateFromActiveSheet()
  syncToolbarAndFormula()
  getLuckysheet()?.setSheetActive?.(activeSheetIndex.value)
}

function addSheet() {
  if (props.readOnly) return
  const nextIndex = workbook.sheets.length
  workbook.sheets.push(createDefaultSheet(nextIndex))
  switchSheet(nextIndex)
  emitChange()
}

async function renameSheet(idx: number) {
  if (props.readOnly) return
  const sheet = workbook.sheets[idx]
  if (!sheet) return
  try {
    const { value } = await new Promise<{ value: string }>((resolve, reject) => {
      let inputValue = sheet.name
      Modal.confirm({
        title: t('dialog.renameSheetTitle'),
        content: () => h('input', {
          value: inputValue,
          onInput: (e: Event) => { inputValue = (e.target as HTMLInputElement).value },
          style: { width: '100%', padding: '4px 8px', border: '1px solid #d9d9d9', borderRadius: '4px', marginTop: '8px' },
          placeholder: t('dialog.renameSheetInputPlaceholder')
        }),
        okText: t('common.confirm'),
        cancelText: t('common.cancel'),
        onOk: () => resolve({ value: inputValue }),
        onCancel: () => reject(new Error('cancel'))
      })
    })
    const name = String(value || '').trim()
    if (!name) return
    sheet.name = name
    emitChange()
  } catch {
    return
  }
}

function showSheetContextMenu(e: MouseEvent, idx: number) {
  if (props.readOnly) return
  cellMenu.visible = false
  sheetMenu.index = idx
  sheetMenu.x = e.clientX
  sheetMenu.y = window.innerHeight - e.clientY
  sheetMenu.visible = true
}

function showCellContextMenu(e: MouseEvent, row: number, col: number) {
  if (props.readOnly) return
  sheetMenu.visible = false
  const { r1, r2, c1, c2 } = selectionRange.value
  const inRange = row >= r1 && row <= r2 && col >= c1 && col <= c2
  if (!inRange) {
    selectCell(row, col)
  }
  cellMenu.x = e.clientX
  cellMenu.y = e.clientY
  cellMenu.visible = true
}

function closeAllMenus() {
  cellMenu.visible = false
  sheetMenu.visible = false
}

// ===== 单元格右键菜单操作 =====
function ctxCut() { closeAllMenus(); handleCut() }
function ctxCopy() { closeAllMenus(); handleCopy() }
function ctxPaste() { closeAllMenus(); handlePaste() }
function ctxClearContent() { closeAllMenus(); deleteSelectedContent() }
function ctxClearFormat() { closeAllMenus(); clearSelectedFormat() }
function ctxInsertRowAbove() { closeAllMenus(); insertRow('above') }
function ctxInsertRowBelow() { closeAllMenus(); insertRow('below') }
function ctxInsertColLeft() { closeAllMenus(); insertCol('left') }
function ctxInsertColRight() { closeAllMenus(); insertCol('right') }

function ctxDeleteRow() {
  closeAllMenus()
  if (props.readOnly || !activeSheet.value) return
  saveUndoState()
  const sheet = activeSheet.value
  const { r1, r2 } = selectionRange.value
  const count = r2 - r1 + 1
  if (count >= sheet.rowCount) return // 不允许删除所有行
  const newCells: Record<string, string> = {}
  const newStyles: Record<string, ICellStyle> = {}
  const newMeta: Record<string, ICellMeta> = {}
  for (const [key, val] of Object.entries(sheet.cells)) {
    const [r, c] = key.split(':').map(Number)
    if (r < r1) {
      newCells[key] = val
    } else if (r > r2) {
      newCells[cellKey(r - count, c)] = val
    }
  }
  for (const [key, val] of Object.entries(sheet.styles)) {
    const [r, c] = key.split(':').map(Number)
    if (r < r1) {
      newStyles[key] = val
    } else if (r > r2) {
      newStyles[cellKey(r - count, c)] = val
    }
  }
  for (const [key, val] of Object.entries(sheet.cellMeta || {})) {
    const [r, c] = key.split(':').map(Number)
    if (r < r1) {
      newMeta[key] = val
    } else if (r > r2) {
      newMeta[cellKey(r - count, c)] = val
    }
  }
  sheet.cells = newCells
  sheet.styles = newStyles
  sheet.cellMeta = newMeta
  sheet.rowCount -= count
  if (selected.row >= sheet.rowCount) {
    selectCell(Math.max(0, sheet.rowCount - 1), selected.col)
  }
  syncToolbarAndFormula()
  emitChange()
}

function ctxDeleteCol() {
  closeAllMenus()
  if (props.readOnly || !activeSheet.value) return
  saveUndoState()
  const sheet = activeSheet.value
  const { c1, c2 } = selectionRange.value
  const count = c2 - c1 + 1
  if (count >= sheet.colCount) return // 不允许删除所有列
  const newCells: Record<string, string> = {}
  const newStyles: Record<string, ICellStyle> = {}
  const newMeta: Record<string, ICellMeta> = {}
  for (const [key, val] of Object.entries(sheet.cells)) {
    const [r, c] = key.split(':').map(Number)
    if (c < c1) {
      newCells[key] = val
    } else if (c > c2) {
      newCells[cellKey(r, c - count)] = val
    }
  }
  for (const [key, val] of Object.entries(sheet.styles)) {
    const [r, c] = key.split(':').map(Number)
    if (c < c1) {
      newStyles[key] = val
    } else if (c > c2) {
      newStyles[cellKey(r, c - count)] = val
    }
  }
  for (const [key, val] of Object.entries(sheet.cellMeta || {})) {
    const [r, c] = key.split(':').map(Number)
    if (c < c1) {
      newMeta[key] = val
    } else if (c > c2) {
      newMeta[cellKey(r, c - count)] = val
    }
  }
  sheet.cells = newCells
  sheet.styles = newStyles
  sheet.cellMeta = newMeta
  sheet.colCount -= count
  if (selected.col >= sheet.colCount) {
    selectCell(selected.row, Math.max(0, sheet.colCount - 1))
  }
  syncToolbarAndFormula()
  emitChange()
}

// ===== 工作表标签右键菜单操作 =====
function ctxRenameSheet() {
  const idx = sheetMenu.index
  closeAllMenus()
  void renameSheet(idx)
}

function ctxDuplicateSheet() {
  const idx = sheetMenu.index
  closeAllMenus()
  if (props.readOnly) return
  const source = workbook.sheets[idx]
  if (!source) return
  const copy: IUiSheet = {
    id: String(Date.now()),
    name: source.name + t('sheet.duplicateSuffix'),
    rowCount: source.rowCount,
    colCount: source.colCount,
    cells: { ...source.cells },
    styles: JSON.parse(JSON.stringify(source.styles)),
    cellMeta: JSON.parse(JSON.stringify(source.cellMeta || {})),
    merges: source.merges ? [...source.merges] : [],
    colWidths: { ...(source.colWidths || {}) },
    rowHeights: { ...(source.rowHeights || {}) },
    hiddenCols: { ...(source.hiddenCols || {}) },
    hiddenRows: { ...(source.hiddenRows || {}) },
    frozenCols: Number(source.frozenCols || 0),
    frozenRows: Number(source.frozenRows || 0)
  }
  workbook.sheets.splice(idx + 1, 0, copy)
  switchSheet(idx + 1)
  emitChange()
}

function ctxInsertSheet() {
  closeAllMenus()
  addSheet()
}

async function ctxDeleteSheet() {
  const idx = sheetMenu.index
  closeAllMenus()
  if (props.readOnly || workbook.sheets.length <= 1) return
  const name = workbook.sheets[idx]?.name || ''
  try {
    await new Promise<void>((resolve, reject) => {
      Modal.confirm({
        title: t('dialog.deleteSheetTitle'),
        content: t('dialog.deleteSheetContent', { name }),
        okText: t('dialog.deleteButton'),
        okType: 'danger',
        cancelText: t('common.cancel'),
        onOk: () => resolve(),
        onCancel: () => reject(new Error('cancel'))
      })
    })
  } catch {
    return
  }
  workbook.sheets.splice(idx, 1)
  if (activeSheetIndex.value >= workbook.sheets.length) {
    activeSheetIndex.value = workbook.sheets.length - 1
  } else if (activeSheetIndex.value > idx) {
    activeSheetIndex.value--
  } else if (activeSheetIndex.value === idx) {
    activeSheetIndex.value = Math.min(idx, workbook.sheets.length - 1)
  }
  selected.row = 0
  selected.col = 0
  selectionEnd.row = 0
  selectionEnd.col = 0
  syncToolbarAndFormula()
  emitChange()
}

// 点击空白处关闭右键菜单
function onDocumentClick() {
  closeAllMenus()
}
function handleFullscreenChange() {
  const current = document.fullscreenElement
  isFullscreen.value = !!current && current === sheetEditorRef.value
}
onMounted(async () => {
  document.addEventListener('click', onDocumentClick)
  document.addEventListener('fullscreenchange', handleFullscreenChange)

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
  scheduleLuckysheetRender()
})
onUnmounted(() => {
  document.removeEventListener('click', onDocumentClick)
  document.removeEventListener('fullscreenchange', handleFullscreenChange)
  clearLuckysheetRenderTimer()
  try {
    getLuckysheet()?.destroy?.()
  } catch {
    // ignore luckysheet destroy errors
  }
})

// ===== Column resize =====
function startColResize(e: MouseEvent, col: number) {
  const startX = e.clientX
  const startWidth = colWidths[col] || 100
  const onMove = (ev: MouseEvent) => {
    const diff = ev.clientX - startX
    colWidths[col] = Math.max(30, startWidth + diff)
  }
  const onUp = () => {
    syncDimensionStateToActiveSheet()
    emitChange()
    document.removeEventListener('mousemove', onMove)
    document.removeEventListener('mouseup', onUp)
  }
  document.addEventListener('mousemove', onMove)
  document.addEventListener('mouseup', onUp)
}

// ===== Misc =====
function handleGridMouseDown(e: MouseEvent) {
  // If clicking on the grid scroll area (not a cell), deselect editing
  const target = e.target as HTMLElement
  if (target.classList.contains('grid-scroll')) {
    if (editingCell.value) confirmEditing()
  }
}

function handlePrint() {
  window.print()
}

function clampZoom(value: number): number {
  return Math.max(50, Math.min(200, value))
}

function applyZoom(value: number) {
  zoomPercent.value = clampZoom(Math.round(value / 10) * 10)
}

function changeZoom(delta: number) {
  applyZoom(zoomPercent.value + delta)
}

function onZoomSliderInput(value: number) {
  if (!Number.isFinite(value)) return
  applyZoom(value)
}

function toggleEyeCareMode() {
  isEyeCareMode.value = !isEyeCareMode.value
}

function onZoomDropdownCommand(level: number | string) {
  const value = Number(level)
  if (!Number.isFinite(value)) return
  applyZoom(value)
}

async function toggleFullscreen() {
  const root = sheetEditorRef.value
  if (!root) return
  try {
    if (document.fullscreenElement === root) {
      await document.exitFullscreen()
      return
    }
    await root.requestFullscreen()
  } catch {
    return
  }
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
      engine: 'custom-grid',
      version: workbook.version,
      data: {
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
    console.log('[SheetEditor] 新建表格-数据库数据:', dbPayload)
    console.log('[SheetEditor] 新建表格-Excel文件流(ArrayBuffer):', buffer)
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
  updateCellStyle()
}

// ===== 快捷格式按钮 =====
function quickFormat(fmt: 'currency' | 'percent') {
  if (props.readOnly) return
  toolbarState.numberFormat = fmt
  updateCellStyle()
}

function changeDecimal(delta: number) {
  if (props.readOnly) return
  toolbarState.decimalPlaces = Math.max(0, Math.min(10, (toolbarState.decimalPlaces ?? 2) + delta))
  updateCellStyle()
}

// ===== 垂直对齐 =====
function setVerticalAlign(va: VerticalAlign) {
  if (props.readOnly) return
  toolbarState.verticalAlign = va
  updateCellStyle()
}

// ===== 文字旋转 =====
function setRotation(deg: number) {
  if (props.readOnly) return
  toolbarState.rotation = deg
  updateCellStyle()
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
    if (!file || !activeSheet.value) return
    const reader = new FileReader()
    reader.onload = () => {
      saveUndoState()
      const key = cellKey(selected.row, selected.col)
      activeSheet.value!.cells[key] = `[image:${file.name}]`
      emitChange()
    }
    reader.readAsDataURL(file)
  }
  input.click()
}

// ===== 快速函数 =====
function insertFunction(fn: string) {
  if (props.readOnly || !activeSheet.value) return
  saveUndoState()
  const key = cellKey(selected.row, selected.col)
  activeSheet.value.cells[key] = `=${fn}()`
  startEditing(selected.row, selected.col)
  editingValue.value = `=${fn}()`
  syncToolbarAndFormula()
}

// ===== 超链接 =====
async function insertHyperlink() {
  if (props.readOnly || !activeSheet.value) return
  const key = cellKey(selected.row, selected.col)
  const currentHyperlink = activeSheet.value.cellMeta?.[key]?.hyperlink || ''
  const currentValue = activeSheet.value.cells[key] || ''
  const defaultUrl = currentHyperlink || (currentValue.startsWith('http') ? currentValue : 'https://')
  let url = ''
  try {
    url = await new Promise<string>((resolve, reject) => {
      let inputValue = defaultUrl
      Modal.confirm({
        title: '插入链接',
        content: () => h('input', {
          value: inputValue,
          onInput: (e: Event) => { inputValue = (e.target as HTMLInputElement).value },
          style: { width: '100%', padding: '4px 8px', border: '1px solid #d9d9d9', borderRadius: '4px', marginTop: '8px' },
          placeholder: '请输入链接地址'
        }),
        okText: '确定',
        cancelText: '取消',
        onOk: () => resolve(inputValue),
        onCancel: () => reject(new Error('cancel'))
      })
    })
  } catch {
    return
  }
  const normalized = normalizeHyperlink(url)
  saveUndoState()
  if (!activeSheet.value.cellMeta) {
    activeSheet.value.cellMeta = {}
  }
  const meta = { ...(activeSheet.value.cellMeta[key] || {}) }
  if (normalized) {
    meta.hyperlink = normalized
    activeSheet.value.cellMeta[key] = meta
    if (!activeSheet.value.cells[key]) {
      activeSheet.value.cells[key] = normalized
    }
  } else if (meta.comment) {
    delete meta.hyperlink
    activeSheet.value.cellMeta[key] = meta
  } else {
    delete activeSheet.value.cellMeta[key]
  }
  syncToolbarAndFormula()
  emitChange()
}

// ===== 评论 =====
async function insertComment() {
  if (props.readOnly || !activeSheet.value) return
  const key = cellKey(selected.row, selected.col)
  const currentComment = activeSheet.value.cellMeta?.[key]?.comment || ''
  let comment = ''
  try {
    comment = await new Promise<string>((resolve, reject) => {
      let inputValue = currentComment
      Modal.confirm({
        title: '批注',
        content: () => h('textarea', {
          value: inputValue,
          onInput: (e: Event) => { inputValue = (e.target as HTMLTextAreaElement).value },
          style: { width: '100%', padding: '4px 8px', border: '1px solid #d9d9d9', borderRadius: '4px', marginTop: '8px', minHeight: '60px' },
          placeholder: '请输入批注内容'
        }),
        okText: '确定',
        cancelText: '取消',
        onOk: () => resolve(inputValue),
        onCancel: () => reject(new Error('cancel'))
      })
    })
  } catch {
    return
  }
  const normalized = comment.trim()
  saveUndoState()
  if (!activeSheet.value.cellMeta) {
    activeSheet.value.cellMeta = {}
  }
  const meta = { ...(activeSheet.value.cellMeta[key] || {}) }
  if (normalized) {
    meta.comment = normalized
    activeSheet.value.cellMeta[key] = meta
  } else if (meta.hyperlink) {
    delete meta.comment
    activeSheet.value.cellMeta[key] = meta
  } else {
    delete activeSheet.value.cellMeta[key]
  }
  emitChange()
}

// ===== 查找替换 =====
const searchVisible = ref(false)
const searchText = ref('')
const replaceText = ref('')
const searchResults = ref<Array<{ row: number; col: number }>>([])
const searchIndex = ref(-1)

function openSearch() {
  searchVisible.value = !searchVisible.value
  if (searchVisible.value) {
    nextTick(() => {
      const input = document.querySelector('.search-panel input') as HTMLInputElement
      input?.focus()
    })
  }
}

function performSearch() {
  if (!activeSheet.value || !searchText.value) {
    searchResults.value = []
    searchIndex.value = -1
    return
  }
  const keyword = searchText.value.toLowerCase()
  const results: Array<{ row: number; col: number }> = []
  const sheet = activeSheet.value
  for (let r = 0; r < sheet.rowCount; r++) {
    for (let c = 0; c < sheet.colCount; c++) {
      const val = (sheet.cells[cellKey(r, c)] || '').toLowerCase()
      if (val.includes(keyword)) {
        results.push({ row: r, col: c })
      }
    }
  }
  searchResults.value = results
  if (results.length > 0) {
    searchIndex.value = 0
    selectCell(results[0].row, results[0].col)
  } else {
    searchIndex.value = -1
  }
}

function searchNext() {
  if (searchResults.value.length === 0) return
  searchIndex.value = (searchIndex.value + 1) % searchResults.value.length
  const r = searchResults.value[searchIndex.value]
  selectCell(r.row, r.col)
}

function searchPrev() {
  if (searchResults.value.length === 0) return
  searchIndex.value = (searchIndex.value - 1 + searchResults.value.length) % searchResults.value.length
  const r = searchResults.value[searchIndex.value]
  selectCell(r.row, r.col)
}

function replaceOne() {
  if (props.readOnly || !activeSheet.value || searchResults.value.length === 0 || searchIndex.value < 0) return
  saveUndoState()
  const r = searchResults.value[searchIndex.value]
  const key = cellKey(r.row, r.col)
  const oldVal = activeSheet.value.cells[key] || ''
  const regex = new RegExp(escapeRegex(searchText.value), 'gi')
  activeSheet.value.cells[key] = oldVal.replace(regex, replaceText.value)
  emitChange()
  performSearch()
}

function replaceAll() {
  if (props.readOnly || !activeSheet.value || searchResults.value.length === 0) return
  saveUndoState()
  const regex = new RegExp(escapeRegex(searchText.value), 'gi')
  for (const r of searchResults.value) {
    const key = cellKey(r.row, r.col)
    const oldVal = activeSheet.value.cells[key] || ''
    activeSheet.value.cells[key] = oldVal.replace(regex, replaceText.value)
  }
  emitChange()
  performSearch()
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// ===== Emit =====
function emitChange(source: 'internal' | 'luckysheet' = 'internal') {
  if (source !== 'luckysheet') {
    scheduleLuckysheetRender()
  }
  headerLastSaveTime.value = new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  emit('change', {
    format: 'sheet',
    engine: 'custom-grid',
    version: workbook.version,
    data: {
      sheets: workbook.sheets
    }
  })
}
</script>

<style scoped>
.sheet-editor {
  display: flex;
  flex-direction: column;
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


.shortcut {
  margin-left: auto;
  padding-left: 24px;
  color: #9aa0a6;
  font-size: 12px;
}

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
  height: 20px;
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
  min-width: 28px;
  height: 28px;
  padding: 0 6px;
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

.arrow-icon {
  margin-left: -2px;
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

.luckysheet-grid-scroll {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  min-height: 0;
  background: #fff;
}

.luckysheet-grid-zoom {
  display: flex;
  flex: 1;
  flex-direction: column;
  width: 100%;
  min-width: 0;
  min-height: 0;
}

.luckysheet-host {
  flex: 1 1 auto;
  width: 100%;
  min-height: 0;
  height: auto;
}

.sheet-grid {
  border-collapse: collapse;
  min-width: 100%;
  table-layout: fixed;
}

.sheet-grid .col-index {
  width: 46px;
}

.sheet-grid th,
.sheet-grid td {
  border: 1px solid #e2e6ed;
  height: 25px;
}

.sheet-grid.hide-gridlines td {
  border-color: transparent;
}

.sheet-grid thead th {
  position: sticky;
  top: 0;
  z-index: 2;
  background: #f8f9fa;
  font-size: 11px;
  color: #5f6368;
  text-align: center;
  font-weight: 500;
  user-select: none;
  border-bottom: 1px solid #dadce0;
  padding: 0;
  cursor: default;
}

.sheet-grid thead th:hover {
  background: #e8eaed;
}

.sheet-grid thead th.col-selected {
  background: #d3e3fd;
  color: #1a73e8;
}

.sheet-grid thead th span {
  display: block;
  padding: 2px 4px;
}

.col-resize-handle {
  position: absolute;
  right: 0;
  top: 0;
  bottom: 0;
  width: 4px;
  cursor: col-resize;
}

.sheet-grid thead th {
  position: sticky;
  top: 0;
  z-index: 2;
}

.sheet-grid .row-index {
  position: sticky;
  left: 0;
  z-index: 1;
  min-width: 46px;
  width: 46px;
  background: #f8f9fa;
  font-size: 11px;
  color: #5f6368;
  text-align: center;
  font-weight: 500;
  user-select: none;
  cursor: default;
  border-right: 1px solid #dadce0;
}

.sheet-grid .row-index:hover {
  background: #e8eaed;
}

.sheet-grid .row-index.row-selected {
  background: #d3e3fd;
  color: #1a73e8;
}

.sheet-grid .corner {
  position: sticky;
  left: 0;
  top: 0;
  z-index: 3;
  min-width: 46px;
  width: 46px;
  background: #f8f9fa;
  cursor: pointer;
  border-right: 1px solid #dadce0;
  border-bottom: 1px solid #dadce0;
}

.sheet-grid .corner:hover {
  background: #e8eaed;
}

.sheet-grid td {
  min-width: 100px;
  padding: 0 6px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  cursor: cell;
  font-size: 13px;
  color: #202124;
  position: relative;
}

.sheet-grid td.active {
  outline: 2px solid #1a73e8;
  outline-offset: -1px;
  background: #fff;
}

.sheet-grid td.selection-anchor {
  outline: 2px solid #1a73e8;
  outline-offset: -1px;
  background: #fff;
}

.sheet-grid td.in-selection {
  background: #d3e3fd;
}

.sheet-grid td.has-comment::after {
  content: '';
  position: absolute;
  top: 1px;
  right: 1px;
  width: 0;
  height: 0;
  border-top: 8px solid #f59e0b;
  border-left: 8px solid transparent;
}

.sheet-editor.eye-care-mode .sheet-grid td,
.sheet-editor.eye-care-mode .sheet-grid td.active,
.sheet-editor.eye-care-mode .sheet-grid td.selection-anchor,
.sheet-editor.eye-care-mode .sheet-grid td.in-selection {
  background: #e8f5e9;
}

.cell-text {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
}

.cell-link {
  color: #1a73e8;
  text-decoration: underline;
}

.cell-input {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  border: none;
  outline: 2px solid #1a73e8;
  outline-offset: -1px;
  padding: 0 6px;
  font-size: 13px;
  font-family: inherit;
  color: #202124;
  background: #fff;
  z-index: 1;
  box-sizing: border-box;
}

/* ===== 工作表标签栏 ===== */
.sheet-tabs {
  display: flex;
  align-items: center;
  gap: 0;
  padding: 0 8px;
  height: 36px;
  border-top: 1px solid #e2e6ed;
  background: #f8f9fa;
  flex-shrink: 0;
  position: sticky;
  bottom: 0;
  z-index: 10;
}

.sheet-tab {
  border: none;
  background: transparent;
  color: #5f6368;
  font-size: 12px;
  padding: 6px 16px;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  transition: all 0.15s;
  white-space: nowrap;
}

.sheet-tab:hover {
  background: #e8eaed;
  color: #202124;
}

.sheet-tab.active {
  color: #1a73e8;
  border-bottom-color: #1a73e8;
  background: #fff;
  font-weight: 500;
}

.sheet-add {
  border: none;
  background: transparent;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #5f6368;
  border-radius: 50%;
  margin-left: 4px;
}

.sheet-add:hover:not(:disabled) {
  background: #e8eaed;
}

.sheet-add:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.sheet-tabs-spacer {
  flex: 1;
}

.sheet-view-controls {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.view-btn {
  border: none;
  background: transparent;
  color: #3c4043;
  width: 24px;
  height: 24px;
  border-radius: 4px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.view-btn:hover {
  background: #e8eaed;
}

.view-btn.active {
  color: #2e7d32;
  background: #e8f5e9;
}

.view-btn.zoom-label {
  width: auto;
  padding: 0 6px;
  gap: 2px;
  font-size: 12px;
}

.zoom-slider {
  width: 120px;
}

.zoom-slider :deep(.ant-slider-track) {
  margin: 0;
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

.about-content {
  text-align: center;
  padding: 16px 0;
}
</style>

<!-- 全局样式：弹出菜单（teleport 到 body，scoped 无法影响） -->
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

.sheet-menu-popper .ant-menu-item:hover {
  background: #f1f3f4 !important;
}

.sheet-menu-popper .ant-menu-item .mdi-icon {
  margin-right: 12px;
  color: #5f6368;
  flex-shrink: 0;
}

.sheet-menu-popper .ant-menu-item .shortcut {
  margin-left: auto;
  padding-left: 24px;
  color: #9aa0a6;
  font-size: 12px;
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

/* ===== 右键菜单（Teleport 到 body） ===== */
.sheet-ctx-menu {
  position: fixed;
  min-width: 220px;
  padding: 6px 0;
  border-radius: 8px;
  background: #fff;
  box-shadow: 0 4px 16px rgba(0,0,0,0.14), 0 1px 4px rgba(0,0,0,0.08);
  z-index: 9999;
}

.sheet-ctx-menu .ctx-menu-item {
  display: flex;
  align-items: center;
  gap: 0;
  padding: 0 16px;
  height: 34px;
  line-height: 34px;
  font-size: 13px;
  color: #3c4043;
  cursor: pointer;
  user-select: none;
}

.sheet-ctx-menu .ctx-menu-item:hover {
  background: #f1f3f4;
}

.sheet-ctx-menu .ctx-menu-item .mdi-icon {
  margin-right: 12px;
  color: #5f6368;
  flex-shrink: 0;
}

.sheet-ctx-menu .ctx-menu-item span:first-of-type {
  flex: 1;
}

.sheet-ctx-menu .ctx-shortcut {
  margin-left: 24px;
  color: #9aa0a6;
  font-size: 12px;
  flex: none;
}

.sheet-ctx-menu .ctx-danger {
  color: #d93025;
}

.sheet-ctx-menu .ctx-menu-divider {
  margin: 4px 12px;
  border-top: 1px solid #e8eaed;
}
</style>
