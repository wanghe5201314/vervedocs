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
        :online-users="collabOnlineUsers"
        @command="handleHeaderCommand"
      />
      <div class="menu-card">
        <div class="ribbon-tabs-bar">
          <div
            v-for="tab in menuTabs"
            :key="tab.key"
            v-show="tab.key !== 'collab' || collabConnectionState === 'connected'"
            class="ribbon-tab"
            :class="{ active: activeMenuTab === tab.key }"
            @click="activeMenuTab = tab.key"
          >
            <span class="ribbon-tab-label">{{ tab.label }}</span>
          </div>
        </div>
        <div class="ribbon-panel" @mousedown.capture="handleRibbonStyleMouseDownCapture">
          <div v-if="activeMenuTab === 'file'" class="ribbon-tab-panel">
            <div class="ribbon-group">
              <div class="ribbon-group-content">
                <button class="ribbon-btn-lg" :disabled="readOnly" @click="handleCreateNewWorkbook()" title="新建表格"><VIcon name="plus" /><span>新建</span></button>
                <button class="ribbon-btn-lg" @click="handleSave()" title="保存"><VIcon name="content-save-outline" /><span>保存</span></button>
                <button class="ribbon-btn-lg" @click="handlePrint()" title="打印"><VIcon name="printer-outline" /><span>打印</span></button>
              </div>
              <div class="ribbon-group-title">文件</div>
            </div>
            <div class="ribbon-group">
              <div class="ribbon-group-content">
                <button class="ribbon-btn-lg" :disabled="readOnly" @click="triggerImportExcel()" title="导入表格"><VIcon name="file-excel-box" /><span>导入</span></button>
                <button class="ribbon-btn-lg" @click="handleExportExcel()" title="导出 Excel"><VIcon name="file-excel-box" /><span>导出</span></button>
              </div>
              <div class="ribbon-group-title">导入导出</div>
            </div>
          </div>
          <div v-else-if="activeMenuTab === 'home'" class="ribbon-tab-panel">
            <div class="ribbon-group">
              <div class="ribbon-group-content">
                <a-select v-model:value="toolbarState.fontFamily" size="small" style="width: 110px" :disabled="readOnly" @mousedown="handleFontSelectMouseDown" @change="handleFontFamilyChange">
                  <a-select-option v-for="font in fontOptions" :key="font.value" :label="font.label" :value="font.value">
                    <span :style="{ fontFamily: font.cssFamily || font.value }">{{ font.label }}</span>
                  </a-select-option>
                </a-select>
                <a-select v-model:value="toolbarState.fontSize" size="small" style="width: 60px" :disabled="readOnly" @change="updateCellStyle()">
                  <a-select-option v-for="s in sizeOptions" :key="s.value + '-' + s.label" :label="s.label" :value="s.value" />
                </a-select>
                <button class="ribbon-btn-lg" :disabled="readOnly" :class="{ active: toolbarState.bold }" @click="toggleStyle('bold')" title="粗体 (Ctrl+B)"><VIcon name="format-bold" /><span>加粗</span></button>
                <button class="ribbon-btn-lg" :disabled="readOnly" :class="{ active: toolbarState.italic }" @click="toggleStyle('italic')" title="斜体 (Ctrl+I)"><VIcon name="format-italic" /><span>斜体</span></button>
                <button class="ribbon-btn-lg" :disabled="readOnly" :class="{ active: toolbarState.underline }" @click="toggleStyle('underline')" title="下划线 (Ctrl+U)"><VIcon name="format-underline" /><span>下划线</span></button>
                <button class="ribbon-btn-lg" :disabled="readOnly" :class="{ active: toolbarState.strikethrough }" @click="toggleStyle('strikethrough')" title="删除线"><VIcon name="format-strikethrough" /><span>删除线</span></button>
              </div>
              <div class="ribbon-group-title">字体</div>
            </div>

            <div class="ribbon-group">
              <div class="ribbon-group-content">
                <a-popover placement="bottom" :width="260" trigger="click">
                  <template #content>
                    <div class="color-panel"><div class="color-grid">
                      <button v-for="c in colorPalette" :key="'fc-'+c" class="color-cell" :style="{ backgroundColor: c }" @click="setFontColor(c)"></button>
                    </div></div>
                  </template>
                  <template #default>
                    <button class="ribbon-btn-lg color-btn" :disabled="readOnly" title="字体颜色"><VIcon name="format-color-text" /><span>字色</span><span class="color-bar" :style="{ backgroundColor: toolbarState.fontColor || '#000000' }"></span></button>
                  </template>
                </a-popover>
                <a-popover placement="bottom" :width="260" trigger="click">
                  <template #content>
                    <div class="color-panel"><div class="color-grid">
                      <button class="color-cell color-none" @click="setBgColor('')" title="无填充"><svg viewBox="0 0 16 16" width="14" height="14"><line x1="2" y1="14" x2="14" y2="2" stroke="#f00" stroke-width="1.5"/></svg></button>
                      <button v-for="c in colorPalette" :key="'bg-'+c" class="color-cell" :style="{ backgroundColor: c }" @click="setBgColor(c)"></button>
                    </div></div>
                  </template>
                  <template #default>
                    <button class="ribbon-btn-lg color-btn" :disabled="readOnly" title="填充颜色"><VIcon name="format-color-fill" /><span>填充</span><span class="color-bar" :style="{ backgroundColor: toolbarState.bgColor || '#ffffff' }"></span></button>
                  </template>
                </a-popover>
              </div>
              <div class="ribbon-group-title">颜色</div>
            </div>

            <div class="ribbon-group">
              <div class="ribbon-group-content">
                <a-popover placement="bottom" :width="140" trigger="click">
                  <template #content>
                    <div class="align-panel">
                      <div class="align-group-label">水平对齐</div>
                      <button class="align-btn" :class="{ active: toolbarState.align === 'left' }" @click="setAlign('left')"><VIcon name="format-align-left" /><span>左对齐</span></button>
                      <button class="align-btn" :class="{ active: toolbarState.align === 'center' }" @click="setAlign('center')"><VIcon name="format-align-center" /><span>居中</span></button>
                      <button class="align-btn" :class="{ active: toolbarState.align === 'right' }" @click="setAlign('right')"><VIcon name="format-align-right" /><span>右对齐</span></button>
                      <div class="align-group-divider"></div>
                      <div class="align-group-label">垂直对齐</div>
                      <button class="align-btn" :class="{ active: toolbarState.verticalAlign === 'top' }" @click="setVerticalAlign('top')"><VIcon name="format-vertical-align-top" /><span>顶部</span></button>
                      <button class="align-btn" :class="{ active: toolbarState.verticalAlign === 'middle' }" @click="setVerticalAlign('middle')"><VIcon name="format-vertical-align-center" /><span>居中</span></button>
                      <button class="align-btn" :class="{ active: toolbarState.verticalAlign === 'bottom' }" @click="setVerticalAlign('bottom')"><VIcon name="format-vertical-align-bottom" /><span>底部</span></button>
                    </div>
                  </template>
                  <template #default>
                    <button class="ribbon-btn-lg" :disabled="readOnly" title="对齐方式"><VIcon :name="'format-align-' + (toolbarState.align || 'left')" /><span>对齐</span></button>
                  </template>
                </a-popover>
                <button class="ribbon-btn-lg" :disabled="readOnly" :class="{ active: toolbarState.wrap === 'wrap' }" @click="toggleWrap()" title="自动换行"><VIcon name="text-wrap" /><span>换行</span></button>
              </div>
              <div class="ribbon-group-title">对齐</div>
            </div>

            <div class="ribbon-group">
              <div class="ribbon-group-content">
                <a-select v-model:value="toolbarState.numberFormat" size="small" style="width: 80px" :disabled="readOnly" @change="updateCellStyle()">
                  <a-select-option label="自动" value="auto" />
                  <a-select-option label="纯文本" value="text" />
                  <a-select-option label="数字" value="number" />
                  <a-select-option label="百分比" value="percent" />
                  <a-select-option label="货币" value="currency" />
                  <a-select-option label="日期" value="date" />
                </a-select>
                <button class="ribbon-btn-lg" :disabled="readOnly" @click="quickFormat('currency')" title="货币格式 (¥)"><VIcon name="currency-usd" /><span>货币</span></button>
                <button class="ribbon-btn-lg" :disabled="readOnly" @click="quickFormat('percent')" title="百分比格式 (%)"><VIcon name="percent" /><span>百分比</span></button>
                <button class="ribbon-btn-lg" :disabled="readOnly" @click="changeDecimal(-1)" title="减少小数位"><VIcon name="decimal-decrease" /><span>减位</span></button>
                <button class="ribbon-btn-lg" :disabled="readOnly" @click="changeDecimal(1)" title="增加小数位"><VIcon name="decimal-increase" /><span>增位</span></button>
              </div>
              <div class="ribbon-group-title">数字</div>
            </div>

            <div class="ribbon-group">
              <div class="ribbon-group-content">
                <a-popover placement="bottom" :width="200" trigger="click">
                  <template #content>
                    <div class="border-panel"><div class="border-grid">
                      <button class="border-btn" @click="setBorders('all')" title="所有边框"><svg viewBox="0 0 24 24" width="20" height="20"><path fill="currentColor" d="M3,3V21H21V3H3M19,19H13V13H19V19M19,11H13V5H19V11M11,19H5V13H11V19M11,11H5V5H11V11Z"/></svg></button>
                      <button class="border-btn" @click="setBorders('outer')" title="外侧边框"><svg viewBox="0 0 24 24" width="20" height="20"><path fill="currentColor" d="M3,3V21H21V3H3M19,5V19H5V5H19Z"/></svg></button>
                      <button class="border-btn" @click="setBorders('none')" title="无边框"><svg viewBox="0 0 24 24" width="20" height="20"><path fill="currentColor" d="M3,3V5H5V3H3M7,3V5H9V3H7M11,3V5H13V3H11M15,3V5H17V3H15M19,3V5H21V3H19M3,7V9H5V7H3M19,7V9H21V7H19M3,11V13H5V11H3M19,11V13H21V11H19M3,15V17H5V15H3M19,15V17H21V15H19M3,19V21H5V19H3M7,19V21H9V19H7M11,19V21H13V19H11M15,19V21H17V19H15M19,19V21H21V19H19Z"/></svg></button>
                      <button class="border-btn" @click="setBorders('bottom')" title="下边框"><svg viewBox="0 0 24 24" width="20" height="20"><path fill="currentColor" d="M3,19V21H21V19H3Z"/></svg></button>
                      <button class="border-btn" @click="setBorders('top')" title="上边框"><svg viewBox="0 0 24 24" width="20" height="20"><path fill="currentColor" d="M3,3V5H21V3H3Z"/></svg></button>
                      <button class="border-btn" @click="setBorders('left')" title="左边框"><svg viewBox="0 0 24 24" width="20" height="20"><path fill="currentColor" d="M3,3V21H5V3H3Z"/></svg></button>
                      <button class="border-btn" @click="setBorders('right')" title="右边框"><svg viewBox="0 0 24 24" width="20" height="20"><path fill="currentColor" d="M19,3V21H21V3H19Z"/></svg></button>
                    </div></div>
                  </template>
                  <template #default>
                    <button class="ribbon-btn-lg" :disabled="readOnly" title="边框"><VIcon name="grid" /><span>边框</span></button>
                  </template>
                </a-popover>
                <button class="ribbon-btn-lg" :disabled="readOnly" @click="handleMergeCells()" title="合并单元格"><VIcon name="table-merge-cells" /><span>合并</span></button>
                <button class="ribbon-btn-lg" :disabled="readOnly" @click="handleUnmergeCells()" title="取消合并"><VIcon name="table-split-cell" /><span>取消合并</span></button>
                <button class="ribbon-btn-lg" :disabled="readOnly" @click="clearSelectedFormat()" title="清除格式"><VIcon name="format-clear" /><span>清格式</span></button>
              </div>
              <div class="ribbon-group-title">单元格</div>
            </div>

            <div class="ribbon-group">
              <div class="ribbon-group-content">
                <button class="ribbon-btn-lg" :disabled="readOnly" @click="showRowHeightDialog = true" title="行高"><VIcon name="arrow-expand-vertical" /><span>行高</span></button>
                <button class="ribbon-btn-lg" :disabled="readOnly" @click="autoFitRowHeight()" title="自动行高"><VIcon name="arrow-fit-vertical" /><span>自动行高</span></button>
                <button class="ribbon-btn-lg" :disabled="readOnly" @click="showColWidthDialog = true" title="列宽"><VIcon name="arrow-expand-horizontal" /><span>列宽</span></button>
                <button class="ribbon-btn-lg" :disabled="readOnly" @click="autoFitColWidth()" title="自动列宽"><VIcon name="arrow-fit-horizontal" /><span>自动列宽</span></button>
              </div>
              <div class="ribbon-group-title">行列</div>
            </div>
          </div>

          <div v-else-if="activeMenuTab === 'edit'" class="ribbon-tab-panel">
            <div class="ribbon-group">
              <div class="ribbon-group-content">
                <button class="ribbon-btn-lg" :disabled="readOnly || !canUndo" @click="handleUndo()" title="撤销 (Ctrl+Z)"><VIcon name="undo" /><span>撤销</span></button>
                <button class="ribbon-btn-lg" :disabled="readOnly || !canRedo" @click="handleRedo()" title="重做 (Ctrl+Y)"><VIcon name="redo" /><span>重做</span></button>
                <button class="ribbon-btn-lg" :disabled="readOnly" @click="handleFormatPainter()" :class="{ active: formatPainterActive }" title="格式刷"><VIcon name="format-paint" /><span>格式刷</span></button>
              </div>
              <div class="ribbon-group-title">操作</div>
            </div>
            <div class="ribbon-group">
              <div class="ribbon-group-content">
                <button class="ribbon-btn-lg" :disabled="readOnly" @click="handleCut()" title="剪切 (Ctrl+X)"><VIcon name="content-cut" /><span>剪切</span></button>
                <button class="ribbon-btn-lg" :disabled="readOnly" @click="handleCopy()" title="复制 (Ctrl+C)"><VIcon name="content-copy" /><span>复制</span></button>
                <button class="ribbon-btn-lg" :disabled="readOnly" @click="handlePaste()" title="粘贴 (Ctrl+V)"><VIcon name="content-paste" /><span>粘贴</span></button>
              </div>
              <div class="ribbon-group-title">剪贴板</div>
            </div>
            <div class="ribbon-group">
              <div class="ribbon-group-content">
                <button class="ribbon-btn-lg" @click="selectAll()" title="全选 (Ctrl+A)"><VIcon name="select-all" /><span>全选</span></button>
                <button class="ribbon-btn-lg" :disabled="readOnly" @click="deleteSelectedContent()" title="删除内容 (Delete)"><VIcon name="delete-outline" /><span>删除</span></button>
                <button class="ribbon-btn-lg" :disabled="readOnly" @click="clearSelectedFormat()" title="清除格式"><VIcon name="format-clear" /><span>清格式</span></button>
                <button class="ribbon-btn-lg" @click="openUniverReplaceDialog()" title="查找和替换 (Ctrl+H)"><VIcon name="magnify" /><span>查找</span></button>
              </div>
              <div class="ribbon-group-title">编辑</div>
            </div>
            <div class="ribbon-group">
              <div class="ribbon-group-content">
                <button class="ribbon-btn-lg" :disabled="readOnly" @click="deleteRow()" title="删除行"><VIcon name="table-row-remove" /><span>删行</span></button>
                <button class="ribbon-btn-lg" :disabled="readOnly" @click="deleteCol()" title="删除列"><VIcon name="table-column-remove" /><span>删列</span></button>
              </div>
              <div class="ribbon-group-title">行列</div>
            </div>
          </div>

          <div v-else-if="activeMenuTab === 'view'" class="ribbon-tab-panel">
            <div class="ribbon-group">
              <div class="ribbon-group-content">
                <button class="ribbon-btn-lg" @click="toggleGridlines()" :class="{ active: showGridlines }" title="网格线"><VIcon name="grid" /><span>网格线</span></button>
                <button class="ribbon-btn-lg" @click="showFormulaBar = !showFormulaBar" :class="{ active: showFormulaBar }" title="编辑栏"><VIcon name="function-variant" /><span>编辑栏</span></button>
              </div>
              <div class="ribbon-group-title">显示</div>
            </div>
            <div class="ribbon-group">
              <div class="ribbon-group-content">
                <button class="ribbon-btn-lg" @click="setZoom(50)" :class="{ active: zoomLevel === 50 }" title="50%"><VIcon name="magnify-minus" /><span>50%</span></button>
                <button class="ribbon-btn-lg" @click="setZoom(75)" :class="{ active: zoomLevel === 75 }" title="75%"><VIcon name="magnify-minus" /><span>75%</span></button>
                <button class="ribbon-btn-lg" @click="setZoom(100)" :class="{ active: zoomLevel === 100 }" title="100%"><VIcon name="magnify" /><span>100%</span></button>
                <button class="ribbon-btn-lg" @click="setZoom(125)" :class="{ active: zoomLevel === 125 }" title="125%"><VIcon name="magnify-plus" /><span>125%</span></button>
                <button class="ribbon-btn-lg" @click="setZoom(150)" :class="{ active: zoomLevel === 150 }" title="150%"><VIcon name="magnify-plus" /><span>150%</span></button>
                <button class="ribbon-btn-lg" @click="setZoom(200)" :class="{ active: zoomLevel === 200 }" title="200%"><VIcon name="magnify-plus" /><span>200%</span></button>
              </div>
              <div class="ribbon-group-title">缩放</div>
            </div>
            <div class="ribbon-group">
              <div class="ribbon-group-content">
                <button class="ribbon-btn-lg" @click="toggleFreezeRow()" :class="{ active: frozenRows > 0 }" title="冻结首行"><VIcon name="snowflake" /><span>{{ frozenRows > 0 ? '取消冻结行' : '冻结首行' }}</span></button>
                <button class="ribbon-btn-lg" @click="toggleFreezeCol()" :class="{ active: frozenCols > 0 }" title="冻结首列"><VIcon name="snowflake" /><span>{{ frozenCols > 0 ? '取消冻结列' : '冻结首列' }}</span></button>
              </div>
              <div class="ribbon-group-title">冻结</div>
            </div>
            <div class="ribbon-group">
              <div class="ribbon-group-content">
                <button class="ribbon-btn-lg" :disabled="readOnly" @click="toggleUniverFilter()" title="筛选"><VIcon name="filter-outline" /><span>筛选</span></button>
              </div>
              <div class="ribbon-group-title">筛选</div>
            </div>
          </div>


          <div v-else-if="activeMenuTab === 'insert'" class="ribbon-tab-panel">
            <div class="ribbon-group">
              <div class="ribbon-group-content">
                <button class="ribbon-btn-lg" :disabled="readOnly" @click="insertRow('above')" title="在上方插入行"><VIcon name="table-row-plus-before" /><span>上方插行</span></button>
                <button class="ribbon-btn-lg" :disabled="readOnly" @click="insertRow('below')" title="在下方插入行"><VIcon name="table-row-plus-after" /><span>下方插行</span></button>
                <button class="ribbon-btn-lg" :disabled="readOnly" @click="insertCol('left')" title="在左侧插入列"><VIcon name="table-column-plus-before" /><span>左侧插列</span></button>
                <button class="ribbon-btn-lg" :disabled="readOnly" @click="insertCol('right')" title="在右侧插入列"><VIcon name="table-column-plus-after" /><span>右侧插列</span></button>
              </div>
              <div class="ribbon-group-title">行列</div>
            </div>
            <div class="ribbon-group">
              <div class="ribbon-group-content">
                <button class="ribbon-btn-lg" :disabled="readOnly" @click="openUniverHyperlink()" title="插入链接"><VIcon name="link-variant" /><span>链接</span></button>
                <button class="ribbon-btn-lg" :disabled="readOnly" @click="insertImage()" title="插入图片"><VIcon name="image-outline" /><span>图片</span></button>
              </div>
              <div class="ribbon-group-title">链接</div>
            </div>
            <div class="ribbon-group">
              <div class="ribbon-group-content">
                <button class="ribbon-btn-lg" :disabled="readOnly" @click="openUniverNote()" title="便签"><VIcon name="note-text-outline" /><span>便签</span></button>
                <button class="ribbon-btn-lg" :disabled="readOnly" @click="openUniverThreadComment()" title="评论"><VIcon name="comment-plus-outline" /><span>评论</span></button>
              </div>
              <div class="ribbon-group-title">批注</div>
            </div>
            <div class="ribbon-group">
              <div class="ribbon-group-content">
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
                    <button class="ribbon-btn-lg" :disabled="readOnly" title="函数"><VIcon name="sigma" /><span>函数</span></button>
                  </template>
                </a-popover>
              </div>
              <div class="ribbon-group-title">函数</div>
            </div>
          </div>




          <div v-else-if="activeMenuTab === 'format'" class="ribbon-tab-panel">
            <div class="ribbon-group">
              <div class="ribbon-group-content">
                <button class="ribbon-btn-lg" :disabled="readOnly" :class="{ active: toolbarState.wrap === 'clip' }" @click="setWrap('clip')" title="裁剪"><VIcon name="crop" /><span>裁剪</span></button>
                <button class="ribbon-btn-lg" :disabled="readOnly" :class="{ active: toolbarState.wrap === 'overflow' }" @click="setWrap('overflow')" title="溢出"><VIcon name="arrow-right" /><span>溢出</span></button>
              </div>
              <div class="ribbon-group-title">换行</div>
            </div>
            <div class="ribbon-group">
              <div class="ribbon-group-content">
                <button class="ribbon-btn-lg" :disabled="readOnly" :class="{ active: toolbarState.rotation === 0 }" @click="setRotation(0)" title="无旋转"><VIcon name="format-text-rotation-none" /><span>无旋转</span></button>
                <button class="ribbon-btn-lg" :disabled="readOnly" :class="{ active: toolbarState.rotation === 45 }" @click="setRotation(45)" title="向上倾斜"><VIcon name="format-text-rotation-up" /><span>向上</span></button>
                <button class="ribbon-btn-lg" :disabled="readOnly" :class="{ active: toolbarState.rotation === -45 }" @click="setRotation(-45)" title="向下倾斜"><VIcon name="format-text-rotation-down" /><span>向下</span></button>
                <button class="ribbon-btn-lg" :disabled="readOnly" :class="{ active: toolbarState.rotation === 90 }" @click="setRotation(90)" title="竖排文字"><VIcon name="format-text-rotation-vertical" /><span>竖排</span></button>
              </div>
              <div class="ribbon-group-title">旋转</div>
            </div>
            <div class="ribbon-group">
              <div class="ribbon-group-content">
                <button class="ribbon-btn-lg" :disabled="readOnly" @click="hideRow()" title="隐藏行"><VIcon name="eye-off-outline" /><span>隐藏行</span></button>
                <button class="ribbon-btn-lg" :disabled="readOnly" @click="unhideRow()" title="取消隐藏行"><VIcon name="eye-outline" /><span>显示行</span></button>
                <button class="ribbon-btn-lg" :disabled="readOnly" @click="hideCol()" title="隐藏列"><VIcon name="eye-off-outline" /><span>隐藏列</span></button>
                <button class="ribbon-btn-lg" :disabled="readOnly" @click="unhideCol()" title="取消隐藏列"><VIcon name="eye-outline" /><span>显示列</span></button>
              </div>
              <div class="ribbon-group-title">隐藏</div>
            </div>
          </div>

          <div v-else-if="activeMenuTab === 'data'" class="ribbon-tab-panel">
            <div class="ribbon-group">
              <div class="ribbon-group-content">
                <button class="ribbon-btn-lg" :disabled="readOnly" @click="openUniverSort('asc')" title="升序排序"><VIcon name="sort-ascending" /><span>升序</span></button>
                <button class="ribbon-btn-lg" :disabled="readOnly" @click="openUniverSort('desc')" title="降序排序"><VIcon name="sort-descending" /><span>降序</span></button>
              </div>
              <div class="ribbon-group-title">排序</div>
            </div>
            <div class="ribbon-group">
              <div class="ribbon-group-content">
                <button class="ribbon-btn-lg" :disabled="readOnly" @click="openUniverDataValidation()" title="数据验证"><VIcon name="check-circle-outline" /><span>验证</span></button>
                <button class="ribbon-btn-lg" :disabled="readOnly" @click="removeDuplicates()" title="删除重复值"><VIcon name="table-minus" /><span>去重</span></button>
              </div>
              <div class="ribbon-group-title">数据工具</div>
            </div>
          </div>

          <div v-else-if="activeMenuTab === 'collab' && collabConnectionState === 'connected'" class="ribbon-tab-panel">
            <div class="ribbon-group">
              <div class="ribbon-group-content">
                <button class="ribbon-btn-lg" @click="toggleSyncSelection()" :class="{ active: syncSelectionEnabled }" title="显示/隐藏他人选区"><VIcon name="cursor-default" /><span>{{ syncSelectionEnabled ? '隐藏选区' : '显示选区' }}</span></button>
                <button class="ribbon-btn-lg" @click="toggleSyncFilter()" :class="{ active: syncFilterEnabled }" title="显示/隐藏他人筛选"><VIcon name="filter-outline" /><span>{{ syncFilterEnabled ? '隐藏筛选' : '显示筛选' }}</span></button>
                <button class="ribbon-btn-lg" @click="toggleSyncSort()" :class="{ active: syncSortEnabled }" title="显示/隐藏他人排序"><VIcon name="sort-ascending" /><span>{{ syncSortEnabled ? '隐藏排序' : '显示排序' }}</span></button>
              </div>
              <div class="ribbon-group-title">协同显示</div>
            </div>
          </div>

          <div v-else-if="activeMenuTab === 'help'" class="ribbon-tab-panel">
            <div class="ribbon-group">
              <div class="ribbon-group-content">
                <button class="ribbon-btn-lg" @click="showShortcutsDialog = true" title="键盘快捷键"><VIcon name="keyboard-outline" /><span>快捷键</span></button>
              </div>
              <div class="ribbon-group-title">帮助</div>
            </div>
          </div>
        </div>
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
          <div v-for="s in SHORTCUT_ENTRIES" :key="s.keys" class="shortcut-row"><span>{{ s.label }}</span><kbd>{{ s.keys }}</kbd></div>
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
import { VIcon } from '@vervedoc/icons'
import UnifiedTopHeader from './UnifiedTopHeader.vue'
import type { ExcelExportCallback, ExcelImportCallback, IWorkbook } from '../types'
import { cellKey, columnLabel } from '../utils/cell'
import { createDefaultSheet, hasUsableWorkbookContent, normalizeWorkbook } from '../utils/workbook-state'
import { applyNoteResourcesToSheets } from '../utils/sheet-note-resources'

import type { ExcelI18nMessages, ExcelLocale } from '@/i18n'
import { getAuthToken } from '../api/sheet.api'
import { loadUniverRuntime } from '../utils/univer-runtime'
import type { LoadedUniverRuntime } from '../utils/univer-runtime'
import { createUniverInstance } from '../utils/univer-setup'
import { ConnectionState, SyncState } from '@vervedoc/docx-editor-collaboration'
import type { ExcelCollaborationConfig, UserInfo } from '@vervedoc/docx-editor-collaboration'
import { useSheetCollaboration } from '@/composables/use-sheet-collaboration'
import { useSheetI18n } from '@/composables/use-sheet-i18n'
import { useSheetFilter } from '@/composables/use-sheet-filter'
import { useSheetHistory } from '@/composables/use-sheet-history'
import { useCellStyle } from '@/composables/use-cell-style'
import { useSheetCommands } from '@/composables/use-sheet-commands'
import type { SheetCommandContext, SheetCoreContext } from '@/composables/sheet-editor-context'
import {
  COLOR_PALETTE,
  FONT_OPTIONS,
  MENU_TABS,
  SHORTCUT_ENTRIES,
  SIZE_OPTIONS,
  resolveToolbarFont,
} from '@/constants/toolbar-options'

const props = withDefaults(defineProps<{
  initialContent?: any
  documentUrl?: string
  documentName?: string
  readOnly?: boolean
  locale?: ExcelLocale
  i18n?: Partial<ExcelI18nMessages>
  collaboration?: ExcelCollaborationConfig
  importCallback?: ExcelImportCallback
  exportCallback?: ExcelExportCallback
}>(), {
  initialContent: undefined,
  documentUrl: undefined,
  documentName: '',
  readOnly: false,
  locale: 'zhCN',
  collaboration: undefined
})

const { t } = useSheetI18n(props)

function requireImportCallback(): ExcelImportCallback | null {
  if (!props.importCallback) {
    message.error(t('message.importCallbackMissing'))
    return null
  }
  return props.importCallback
}

function requireExportCallback(): ExcelExportCallback | null {
  if (!props.exportCallback) {
    message.error(t('message.exportCallbackMissing'))
    return null
  }
  return props.exportCallback
}

const emit = defineEmits<{
  (e: 'change', value: any): void
  (e: 'new-document', payload: { dbPayload: any; excelPayload: { fileName: string; mimeType: string; buffer: ArrayBuffer } }): void
  (e: 'collabConnectionChange', payload: { state: ConnectionState | string }): void
  (e: 'collabSyncStateChange', payload: { state: SyncState | string }): void
  (e: 'collabUsersChange', payload: UserInfo[]): void
  (e: 'collabError', payload: { code: string; message: string }): void
}>()

// ===== 常量（模板别名） =====
const fontOptions = FONT_OPTIONS
const sizeOptions = SIZE_OPTIONS
const colorPalette = COLOR_PALETTE
const menuTabs = MENU_TABS

const workbookStateOptions = {
  defaultSheetName: (index: number) => t('sheet.defaultSheetName', { index: index + 1 }),
  resolveFontFamily: resolveSheetFontFamily,
}

function resolveSheetFontFamily(fontFamily?: string): string {
  return resolveToolbarFont(fontFamily)
}

// ===== 头部状态 =====
const headerLastSaveTime = ref('')
const localDocumentTitle = ref(String(props.documentName || '').trim())
watch(() => props.documentName, (name) => {
  localDocumentTitle.value = String(name || '').trim()
}, { immediate: true })
const headerTitle = computed(() => {
  const documentName = String(localDocumentTitle.value || '').trim()
  return documentName || t('sheet.defaultTitle')
})

// ===== 编辑器可变状态 =====
const workbook = reactive<IWorkbook>(normalizeWorkbook(props.initialContent, workbookStateOptions))

function prepareWorkbookForExport() {
  applyNoteResourcesToSheets(workbook.sheets, workbook.resources)
}

const activeSheetIndex = ref(0)
const selected = reactive({ row: 0, col: 0 })
const selectionEnd = reactive({ row: 0, col: 0 })

const formulaFocused = ref(false)
const formulaInputRef = ref<HTMLInputElement | null>(null)
const editingCell = ref<{ row: number; col: number } | null>(null)
const pendingStyleTargetCell = ref<{ row: number; col: number } | null>(null)

const sheetEditorRef = ref<HTMLElement | null>(null)
const showGridlines = ref(true)
const showFormulaBar = ref(true)
const frozenRows = ref(0)
const frozenCols = ref(0)
const formatPainterActive = ref(false)

const colWidths = reactive<Record<number, number>>({})
const rowHeights = reactive<Record<number, number>>({})

const showShortcutsDialog = ref(false)
const activeMenuTab = ref('home')

const importExcelInputRef = ref<HTMLInputElement | null>(null)

const zoomLevel = ref(100)
const showRowHeightDialog = ref(false)
const showColWidthDialog = ref(false)
const rowHeightValue = ref(20)
const colWidthValue = ref(100)

// ===== Univer 生命周期状态 =====
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

// ===== Computed =====
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

// ===== Univer 基础访问 =====
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

async function executeUniverCommand(commandId: string, params?: Record<string, any>) {
  if (!univerAPI) {
    message.warning('表格尚未初始化')
    return false
  }
  try {
    return await univerAPI.executeCommand(commandId, params)
  } catch {
    message.error('官方功能执行失败')
    return false
  }
}

async function executeSheetCommand(commandId: string, params?: Record<string, any>) {
  await commitActiveCellEdit()
  syncUniverSelection()
  const ok = await executeUniverCommand(commandId, params)
  if (ok) {
    await nextTick()
    syncToolbarAndFormula()
  }
  return ok
}

function getActiveSheetCommandContext(): SheetCommandContext | null {
  const wb = activeUniverWorkbook
  const sheet = getActiveSheet()
  if (!wb || !sheet) {
    message.warning('表格尚未初始化')
    return null
  }
  const { r1, r2, c1, c2 } = selectionRange.value
  return {
    unitId: wb.getId(),
    subUnitId: sheet.getSheetId(),
    range: {
      startRow: r1,
      endRow: r2,
      startColumn: c1,
      endColumn: c2,
    },
    rowRange: {
      startRow: r1,
      endRow: r2,
      startColumn: 0,
      endColumn: Math.max(0, (activeSheet.value?.colCount || 1) - 1),
    },
    colRange: {
      startRow: 0,
      endRow: Math.max(0, (activeSheet.value?.rowCount || 1) - 1),
      startColumn: c1,
      endColumn: c2,
    },
  }
}

function syncUniverSelection() {
  const sheet = getActiveSheet()
  if (!sheet) return
  const { r1, r2, c1, c2 } = selectionRange.value
  const range = sheet.getRange(r1, c1, r2 - r1 + 1, c2 - c1 + 1)
  sheet.setActiveSelection(range)
}

function restoreSelectionCell(row: number, col: number) {
  const sheet = getActiveSheet()
  if (!sheet) return
  const range = sheet.getRange(row, col, 1, 1)
  sheet.setActiveSelection(range)
  selected.row = row
  selected.col = col
  selectionEnd.row = row
  selectionEnd.col = col
}

async function commitActiveCellEdit(target?: { row: number; col: number } | null) {
  const wb = activeUniverWorkbook
  if (!wb?.endEditingAsync) return
  const restoreTarget = target || pendingStyleTargetCell.value || editingCell.value
  try {
    await wb.endEditingAsync(true)
  } catch {
    // 当前未处于编辑态时忽略
  }
  if (restoreTarget) {
    restoreSelectionCell(restoreTarget.row, restoreTarget.col)
  }
}

async function handleRibbonStyleMouseDownCapture(event: MouseEvent) {
  if (activeMenuTab.value === 'file') return
  const target = event.target as HTMLElement | null
  if (!target?.closest('.ribbon-group-content')) return
  if (target.closest('button[disabled], .ant-select-disabled')) return

  const wb = activeUniverWorkbook
  if (!wb?.isCellEditing?.()) return

  pendingStyleTargetCell.value = editingCell.value || { row: selected.row, col: selected.col }
  // 阻止工具栏抢焦点，先提交单元格编辑内容，避免 A1/A2 等输入内容丢失
  event.preventDefault()
  await commitActiveCellEdit()
}

async function getPreparedSelectionRange(): Promise<FRange | null> {
  const sheet = getActiveSheet()
  if (!sheet) return null

  const target = pendingStyleTargetCell.value || editingCell.value
  await commitActiveCellEdit()

  if (target) {
    pendingStyleTargetCell.value = null
    return sheet.getRange(target.row, target.col, 1, 1)
  }
  return getSelectionRange()
}

async function finishRangeStyleMutation() {
  await nextTick()
  syncToolbarAndFormula()
  commitUniverFacadeMutation()
}

// ===== Composable 接线 =====
const ctx: SheetCoreContext = {
  readOnly: () => props.readOnly === true,

  getUiSheet: () => activeSheet.value,
  getUniverSheet: getActiveSheet,
  getUniverWorkbook: () => activeUniverWorkbook,
  getUniverAPI: () => univerAPI,

  selected,
  selectionRange: () => selectionRange.value,

  editingCell,
  pendingStyleTargetCell,

  getSelectionRange,
  getPreparedSelectionRange,
  commitActiveCellEdit,

  executeUniverCommand,
  executeSheetCommand,
  getActiveSheetCommandContext,
  finishRangeStyleMutation,

  syncToolbarAndFormula: () => {},
  saveUndoState: () => {},

  zoomLevel,
  frozenRows,
  frozenCols,
  rowHeightValue,
  colWidthValue,
  showRowHeightDialog,
  showColWidthDialog,
  syncDimensionStateToActiveSheet,
}

const {
  canUndo,
  canRedo,
  saveUndoState,
  clearHistory,
  handleUndo,
  handleRedo,
  bindUndoRedoStatus,
  unbindUndoRedoStatus,
} = useSheetHistory({
  readOnly: () => props.readOnly === true,
  getUniverAPI: () => univerAPI,
})

const {
  toolbarState,
  formulaValue,
  syncToolbarAndFormula,
  updateCellStyle,
  toggleStyle,
  setAlign,
  setVerticalAlign,
  setWrap,
  toggleWrap,
  setFontColor,
  setBgColor,
  setRotation,
  handleFontSelectMouseDown,
  handleFontFamilyChange,
  quickFormat,
  changeDecimal,
} = useCellStyle(ctx)
ctx.saveUndoState = saveUndoState
ctx.syncToolbarAndFormula = syncToolbarAndFormula

const {
  openUniverSort,
  openUniverDataValidation,
  toggleUniverFilter,
  openUniverHyperlink,
  openUniverNote,
  openUniverThreadComment,
  openUniverFindDialog,
  openUniverReplaceDialog,
  setBorders,
  clearSelectedFormat,
  deleteSelectedContent,
  insertRow,
  insertCol,
  deleteRow,
  deleteCol,
  hideRow,
  unhideRow,
  hideCol,
  unhideCol,
  autoFitRowHeight,
  autoFitColWidth,
  applyRowHeight,
  applyColWidth,
  setZoom,
  handleMergeCells,
  handleUnmergeCells,
  toggleFreezeRow,
  toggleFreezeCol,
  handleCopy,
  handleCut,
  handlePaste,
  removeDuplicates,
} = useSheetCommands(ctx)

// ===== 筛选（仅保留 sheet 状态同步所需成员） =====
const {
  filterActive,
  filterColumn,
  filterKeyword,
  filterSelectedValues,
  resetFilterState,
  prepareFilterPanel,
  applyFilterRows,
} = useSheetFilter({
  getActiveSheet: activeSheet,
  selected,
  cellKey,
  columnLabel,
  syncFilterStateToActiveSheet,
  emitChange,
})

// ===== Univer 初始化 / 渲染 =====
function ensureUniverInitialized(host: HTMLElement) {
  if (univerInstance && univerAPI) return Promise.resolve()
  return ensureUniverRuntime().then(runtime => {
    univerInstance = createUniverInstance(runtime, host, getUniverLocaleType(runtime))
    univerAPI = runtime.facade.FUniver.newAPI(univerInstance)
    bindUndoRedoStatus(univerInstance)
  })
}

function bindUniverEvents() {
  clearUniverWorkbookDisposables()
  if (!univerAPI) return
  univerWorkbookDisposables.push(univerAPI.addEvent(univerAPI.Event.SheetEditStarted, (params: { row: number; column: number }) => {
    editingCell.value = { row: params.row, col: params.column }
  }))
  univerWorkbookDisposables.push(univerAPI.addEvent(univerAPI.Event.SheetEditEnded, () => {
    editingCell.value = null
  }))
  univerWorkbookDisposables.push(univerAPI.addEvent(univerAPI.Event.SheetEditChanging, (params: { row: number; column: number; value?: { toPlainText?: () => string } }) => {
    const key = cellKey(params.row, params.column)
    if (cellKey(selected.row, selected.col) !== key) return
    const plainText = params.value?.toPlainText?.()
    if (plainText !== undefined) {
      formulaValue.value = plainText
    }
  }))
  univerWorkbookDisposables.push(univerAPI.addEvent(univerAPI.Event.SelectionChanged, () => {
    if (renderingUniver) return
    updateSelectionFromUniver()
  }))
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

function clearUniverWorkbookDisposables() {
  univerWorkbookDisposables.forEach(disposable => disposable.dispose())
  univerWorkbookDisposables = []
}

function clearUniverRenderTimer() {
  if (univerRenderTimer !== undefined) {
    window.clearTimeout(univerRenderTimer)
    univerRenderTimer = undefined
  }
}

// ===== 状态同步（Univer ↔ 内部 workbook） =====
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
    // comment 以 Univer SHEET_NOTE_PLUGIN（已写入 extracted.cellMeta）为准，避免删除后残留
    const mergedMeta: Record<string, any> = { ...(current?.cellMeta || {}) }
    for (const [key, meta] of Object.entries(mergedMeta)) {
      if (!meta || typeof meta !== 'object' || meta.comment === undefined) continue
      const rest = { ...meta }
      delete rest.comment
      if (Object.keys(rest).length) mergedMeta[key] = rest
      else delete mergedMeta[key]
    }
    for (const [key, meta] of Object.entries(sheet.cellMeta || {})) {
      mergedMeta[key] = { ...(mergedMeta[key] || {}), ...(meta || {}) }
    }
    return {
      ...sheet,
      cellMeta: mergedMeta,
      images: current?.images ?? sheet.images,
      filterColumn: current?.filterColumn ?? null,
      filterKeyword: current?.filterKeyword || '',
      filterSelectedValues: { ...(current?.filterSelectedValues || {}) },
      filterActive: !!current?.filterActive
    }
  })
  return changed
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

function applyWorkbookState(next: IWorkbook) {
  workbook.version = next.version
  workbook.resources = next.resources
  workbook.sheets = next.sheets
  resetFilterState()
  activeSheetIndex.value = 0
  selected.row = 0
  selected.col = 0
  selectionEnd.row = 0
  selectionEnd.col = 0
  syncDimensionStateFromActiveSheet()
  loadFilterStateFromActiveSheet()
  clearHistory()
  syncToolbarAndFormula()
}

async function loadWorkbookFromDocumentUrl(url: string) {
  const token = String(getAuthToken() || '').trim()
  const headers: Record<string, string> = {}
  if (token) headers['Authorization'] = `Bearer ${token}`
  const resp = await fetch(url, { headers })
  if (!resp.ok) throw new Error(`请求失败: ${resp.status}`)
  const buffer = await resp.arrayBuffer()
  if (!buffer || buffer.byteLength === 0) throw new Error('远程文件内容为空')
  const importCallback = requireImportCallback()
  if (!importCallback) return
  const result = await importCallback(buffer, {
    defaultSheetName: index => t('sheet.defaultSheetName', { index: index + 1 }),
  })
  if (!result.success || !result.workbook) {
    throw new Error(result.error || t('message.importFailed'))
  }
  applyWorkbookState(result.workbook)
  if (!String(localDocumentTitle.value || '').trim()) {
    const fromUrl = fileNameFromUrl(url)
    if (fromUrl) localDocumentTitle.value = fromUrl
  }
  emitChange()
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

function updateSelectionFromUniver() {
  const univerActiveSheet = activeUniverWorkbook?.getActiveSheet()
  const activeRange = univerActiveSheet?.getActiveRange()
  if (!univerActiveSheet || !activeRange) return
  const nextIndex = workbook.sheets.findIndex(sheet => sheet.id === univerActiveSheet.getSheetId())
  if (nextIndex >= 0) {
    activeSheetIndex.value = nextIndex
  }
  selected.row = activeRange.getRow()
  selectionEnd.row = activeRange.getLastRow()
  selected.col = activeRange.getColumn()
  selectionEnd.col = activeRange.getLastColumn()
  syncToolbarAndFormula()
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
      return
    }

    disposeActiveUniverWorkbook()
    const univerWorkbookData = runtime.adapter.internalWorkbookToUniver(workbook, props.locale)
    if (univerWorkbookData.resources) {
      workbook.resources = JSON.parse(JSON.stringify(univerWorkbookData.resources))
    }
    activeUniverWorkbook = univerAPI?.createWorkbook(univerWorkbookData) || null

    bindUniverEvents()
    const sheets = activeUniverWorkbook?.getSheets() || []
    const nextSheet = sheets[activeSheetIndex.value] || sheets[0]
    if (nextSheet) {
      activeUniverWorkbook?.setActiveSheet(nextSheet)
    }
    lastUniverSnapshot = activeUniverWorkbook ? JSON.stringify(activeUniverWorkbook.save()) : ''
    applySelectionToUniver()
    updateSelectionFromUniver()
    await initCollaboration()

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

watch(
  () => props.initialContent,
  next => {
    if (!hasUsableWorkbookContent(next)) return
    const normalized = normalizeWorkbook(next, workbookStateOptions)
    applyWorkbookState(normalized)
    scheduleUniverRender()
  },
  { deep: true }
)

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

// ===== 选区 / 编辑栏 =====
function selectCell(row: number, col: number) {

  selected.row = row
  selected.col = col
  selectionEnd.row = row
  selectionEnd.col = col
  syncUniverSelection()
  syncToolbarAndFormula()
}

function selectAll() {
  selected.row = 0
  selected.col = 0
  selectionEnd.row = currentRows.value.length - 1
  selectionEnd.col = currentColumns.value.length - 1
  syncUniverSelection()
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
  range.setValue(value)
  syncToolbarAndFormula()
  commitUniverFacadeMutation()
}

function commitUniverFacadeMutation() {
  const changed = syncWorkbookFromUniver()
  forceCollabSync()
  if (changed) {
    emitChange('univer')
  }
}

function moveSelection(dr: number, dc: number) {
  const maxR = currentRows.value.length - 1
  const maxC = currentColumns.value.length - 1
  const newR = Math.max(0, Math.min(maxR, selected.row + dr))
  const newC = Math.max(0, Math.min(maxC, selected.col + dc))
  selectCell(newR, newC)
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
      case 's': e.preventDefault(); handleSave(); return
      case 'o': e.preventDefault(); triggerImportExcel(); return
    }
  }
}

// ===== 协同 =====
const {
  collabConnectionState,
  collabOnlineUsers,
  syncSelectionEnabled,
  syncFilterEnabled,
  syncSortEnabled,
  toggleSyncSelection,
  toggleSyncFilter,
  toggleSyncSort,
  initCollaboration,
  destroyCollaboration,
  forceCollabSync,
} = useSheetCollaboration({
  props,
  emit,
  getUniverAPI: () => univerAPI,
  sheetEditorRef,
})

// ===== 视图开关 / 格式刷 =====
function toggleGridlines() { showGridlines.value = !showGridlines.value }

function handleFormatPainter() {
  if (props.readOnly) return
  formatPainterActive.value = !formatPainterActive.value
}

function handleHeaderCommand(command: string) {
  switch (command) {
    case 'import': return triggerImportExcel()
    case 'save': return handleSave()
    case 'undo': return handleUndo()
    case 'redo': return handleRedo()
  }
}

// ===== 插入内容 =====
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
      commitUniverFacadeMutation()
    }
    reader.readAsDataURL(file)
  }
  input.click()
}

function insertFunction(fn: string) {
  if (props.readOnly) return
  const range = getSelectionRange()
  if (!range) return
  saveUndoState()
  range.setValue(`=${fn}()`)
  formulaValue.value = `=${fn}()`
  syncToolbarAndFormula()
  commitUniverFacadeMutation()
  selectCellRefInput()
}

// ===== 导入 / 导出 / 新建 =====
function stripSpreadsheetExtension(name: string): string {
  return String(name || '').trim().replace(/\.(xlsx|xlsm|xls|csv)$/i, '')
}

function fileNameFromUrl(url: string): string {
  try {
    const pathname = new URL(url, window.location.origin).pathname
    const last = decodeURIComponent(pathname.split('/').filter(Boolean).pop() || '')
    return stripSpreadsheetExtension(last)
  } catch {
    const last = decodeURIComponent(String(url).split('?')[0].split('#')[0].split('/').filter(Boolean).pop() || '')
    return stripSpreadsheetExtension(last)
  }
}

function currentWorkbookFileName(): string {
  const name = stripSpreadsheetExtension(headerTitle.value) || t('sheet.defaultTitle')
  return `${name}.xlsx`
}

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
  const importCallback = requireImportCallback()
  if (!importCallback) return
  try {
    const result = await importCallback(file, {
      defaultSheetName: index => t('sheet.defaultSheetName', { index: index + 1 }),
    })
    if (!result.success || !result.workbook) {
      throw new Error(result.error || t('message.importFailed'))
    }
    applyWorkbookState(result.workbook)
    localDocumentTitle.value = stripSpreadsheetExtension(file.name) || t('sheet.defaultTitle')
    scheduleUniverRender()
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
  const exportCallback = requireExportCallback()
  if (!exportCallback) return
  try {
    syncWorkbookFromUniver()
    prepareWorkbookForExport()
    const result = await exportCallback(workbook, {
      defaultSheetName: index => t('sheet.defaultSheetName', { index: index + 1 }),
    })
    if (!result.success || !result.data) {
      throw new Error(result.error || t('message.exportFailed'))
    }
    const blob = new Blob([result.data], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    })
    const link = document.createElement('a')
    link.download = currentWorkbookFileName()
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
  workbook.sheets = [createDefaultSheet(0, workbookStateOptions)]
  activeSheetIndex.value = 0
  selected.row = 0
  selected.col = 0
  selectionEnd.row = 0
  selectionEnd.col = 0
  syncDimensionStateFromActiveSheet()
  loadFilterStateFromActiveSheet()
  syncToolbarAndFormula()
  clearHistory()
}

async function handleCreateNewWorkbook() {
  if (props.readOnly) return
  const exportCallback = requireExportCallback()
  if (!exportCallback) return
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
    prepareWorkbookForExport()
    const result = await exportCallback(workbook, {
      defaultSheetName: index => t('sheet.defaultSheetName', { index: index + 1 }),
    })
    if (!result.success || !result.data) {
      throw new Error(result.error || t('message.exportFailed'))
    }
    localDocumentTitle.value = t('sheet.defaultTitle')
    const fileName = currentWorkbookFileName()
    const excelPayload = {
      fileName,
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      buffer: result.data
    }

    emit('new-document', { dbPayload, excelPayload })
    emitChange()
    message.success(t('message.createSuccess'))
  } catch (error) {
    const msg = error instanceof Error ? error.message : t('message.createFailed')
    message.error(msg)
  }
}

// ===== Emit =====
function handleSave() {
  syncWorkbookFromUniver()
  emitChange('univer')
}

function emitChange(source: 'internal' | 'univer' = 'internal') {
  if (source !== 'univer') {
    scheduleUniverRender()
  }
  headerLastSaveTime.value = new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  const payload = {
    format: 'excel',
    engine: 'univer',
    version: workbook.version,
    data: {
      resources: workbook.resources,
      sheets: workbook.sheets
    }
  }
  emit('change', payload)
}

// ===== 生命周期 =====
onMounted(async () => {
  if (!hasUsableWorkbookContent(props.initialContent) && props.documentUrl) {
    try {
      await loadWorkbookFromDocumentUrl(props.documentUrl)
    } catch (e) {
      message.error(e instanceof Error ? e.message : t('message.importFailed'))
    }
  }
  await nextTick()
  scheduleUniverRender()
})
onUnmounted(() => {

  destroyCollaboration()
  clearUniverRenderTimer()
  clearUniverWorkbookDisposables()
  unbindUndoRedoStatus()
  disposeActiveUniverWorkbook()
  univerAPI?.dispose()
  univerAPI = null
  univerInstance?.dispose()
  univerInstance = null
})
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

/* ===== 菜单栏（选项卡 + 面板） ===== */
.ribbon-tabs-bar {
  display: flex;
  align-items: center;
  background: #217346;
  padding: 0 8px;
  height: 26px;
}

.ribbon-tab {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 26px;
  min-width: 52px;
  padding: 0 12px;
  cursor: pointer;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.94);
  border-radius: 4px 4px 0 0;
  position: relative;
  user-select: none;
  transition: background-color 0.15s, color 0.15s;
}

.ribbon-tab:hover {
  background: rgba(255, 255, 255, 0.12);
  color: #fff;
}

.ribbon-tab.active {
  background: #f1f1f1;
  color: #217346;
  font-weight: 600;
}

.ribbon-tab-label {
  line-height: 1;
  white-space: nowrap;
}

.ribbon-panel {
  background: #f1f1f1;
  padding: 4px 8px;
  min-height: 36px;
  overflow-x: auto;
  overflow-y: hidden;
  box-shadow: inset 0 -1px 0 #e6eaf2;
  display: flex;
  align-items: center;
}

.ribbon-tab-panel {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-wrap: nowrap;
}

/* ===== Ribbon 分组 ===== */
.ribbon-group {
  display: flex;
  flex-direction: column;
  padding: 2px 8px;
  border-right: 1px solid #e3e8f2;
  flex-shrink: 0;
}
.ribbon-group:last-child {
  border-right: none;
}
.ribbon-group-content {
  display: flex;
  align-items: center;
  gap: 2px;
  flex: 1;
  flex-wrap: wrap;
}
.ribbon-group-title {
  font-size: 10px;
  color: #7a8191;
  text-align: center;
  margin-top: 2px;
  line-height: 1.2;
  user-select: none;
}

/* ===== 大按钮：纵向，图标上文字下 ===== */
.ribbon-btn-lg {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  min-width: 42px;
  height: 54px;
  padding: 4px 3px;
  gap: 1px;
  border: 1px solid transparent;
  background: transparent;
  border-radius: 4px;
  cursor: pointer;
  color: #3c4043;
  transition: background-color 0.15s, border-color 0.15s, color 0.15s;
  font-family: inherit;
  flex-shrink: 0;
}
.ribbon-btn-lg:hover:not(:disabled) {
  background: #edf2fb;
  color: #202124;
}
.ribbon-btn-lg.active {
  background: #dce8ff;
  color: #1f57b8;
}
.ribbon-btn-lg:disabled {
  color: #c0c4cc;
  cursor: not-allowed;
  opacity: 0.55;
}
.ribbon-btn-lg .v-icon {
  font-size: 18px;
}
.ribbon-btn-lg > span {
  font-size: 11px;
  line-height: 1.2;
  text-align: center;
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

.align-btn .v-icon {
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

/* ===== Ant Design Vue 覆盖 ===== */
:deep(.ant-select .ant-select-selector) {
  border: 1px solid #dadce0 !important;
  border-radius: 3px !important;
  height: 28px !important;
  min-height: 28px !important;
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

<!-- 全局样式：弹出层 teleport 到 body，scoped 无法影响 -->
<style>
html,
body {
  overflow: hidden;
}

.sheet-editor .menu-card {
  width: 100%;
  margin: 0;
  padding: 0;
  background: #fff;
  border-bottom: 1px solid #e2e6ed;
}
</style>