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
        <div class="ribbon-panel">
          <div v-if="activeMenuTab === 'file'" class="ribbon-tab-panel">
            <div class="ribbon-group">
              <div class="ribbon-group-content">
                <button class="ribbon-btn-lg" :disabled="readOnly" @click="handleCreateNewWorkbook()" title="新建表格"><VIcon name="plus" /><span>新建</span></button>
                <button class="ribbon-btn-lg" @click="emitChange()" title="保存"><VIcon name="content-save-outline" /><span>保存</span></button>
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
                <a-select v-model:value="toolbarState.fontFamily" size="small" style="width: 110px" :disabled="readOnly" @change="updateCellStyle()">
                  <a-select-option v-for="font in fontOptions" :key="font.value" :label="font.label" :value="font.value">
                    <span :style="{ fontFamily: font.value }">{{ font.label }}</span>
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
                <button class="ribbon-btn-lg" :disabled="readOnly || undoStack.length === 0" @click="handleUndo()" title="撤销 (Ctrl+Z)"><VIcon name="undo" /><span>撤销</span></button>
                <button class="ribbon-btn-lg" :disabled="readOnly || redoStack.length === 0" @click="handleRedo()" title="重做 (Ctrl+Y)"><VIcon name="redo" /><span>重做</span></button>
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
import { BorderStyleTypes, BorderType, Direction } from '@univerjs/core'
import type { Univer as UniverType } from '@univerjs/core'
import type { FUniver } from '@univerjs/core/facade'
import {
  AddWorksheetMergeAllCommand,
  ClearSelectionContentCommand,
  ClearSelectionFormatCommand,
  InsertColCommand,
  InsertRowCommand,
  RemoveColCommand,
  RemoveRowCommand,
  RemoveWorksheetMergeCommand,
  ResetBackgroundColorCommand,
  ResetTextColorCommand,
  SetBackgroundColorCommand,
  SetBorderBasicCommand,
  SetBoldCommand,
  SetColHiddenCommand,
  SetFontFamilyCommand,
  SetFontSizeCommand,
  SetHorizontalTextAlignCommand,
  SetItalicCommand,
  SetRowHiddenCommand,
  SetSpecificColsVisibleCommand,
  SetSpecificRowsVisibleCommand,
  SetStrikeThroughCommand,
  SetTextColorCommand,
  SetTextRotationCommand,
  SetTextWrapCommand,
  SetUnderlineCommand,
  SetVerticalTextAlignCommand,
} from '@univerjs/sheets'
import { SetNumfmtCommand } from '@univerjs/sheets-numfmt'
import type { FRange, FWorkbook, FWorksheet } from '@univerjs/sheets/facade'
import { VIcon } from '@vervedoc/icons'
import UnifiedTopHeader from './UnifiedTopHeader.vue'
import type { Align, VerticalAlign, WrapMode, ICellStyle, IUiSheet, IWorkbook, UndoEntry } from '../types'
import type { ExcelExportCallback, ExcelImportCallback } from '@vervedoc/excel-parser'

import type { ExcelI18nMessages, ExcelLocale } from '@/i18n'
import { getAuthToken } from '../api/sheet.api'
import { loadUniverRuntime } from '../utils/univer-runtime'
import type { LoadedUniverRuntime } from '../utils/univer-runtime'
import { ConnectionState, SyncState } from '@vervedoc/docx-editor-collaboration'
import type { ExcelCollaborationConfig, UserInfo } from '@vervedoc/docx-editor-collaboration'
import { useSheetCollaboration } from '@/composables/use-sheet-collaboration'
import { useSheetI18n } from '@/composables/use-sheet-i18n'
import { useSheetFilter } from '@/composables/use-sheet-filter'

const props = withDefaults(defineProps<{
  initialContent?: any
  documentUrl?: string
  documentName?: string
  readOnly?: boolean
  locale?: ExcelLocale
  i18n?: Partial<ExcelI18nMessages>
  collaboration?: ExcelCollaborationConfig
  importCallback: ExcelImportCallback
  exportCallback: ExcelExportCallback
}>(), {
  initialContent: undefined,
  documentUrl: undefined,
  documentName: '',
  readOnly: false,
  locale: 'zhCN',
  collaboration: undefined
})

const { t } = useSheetI18n(props)

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
  (e: 'collabConnectionChange', payload: { state: ConnectionState | string }): void
  (e: 'collabSyncStateChange', payload: { state: SyncState | string }): void
  (e: 'collabUsersChange', payload: UserInfo[]): void
  (e: 'collabError', payload: { code: string; message: string }): void
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
  { label: '八号', value: 5 },
  { label: '七号', value: 5.5 },
  { label: '6', value: 6 },
  { label: '小六', value: 6.5 },
  { label: '7', value: 7 },
  { label: '六号', value: 7.5 },
  { label: '8', value: 8 },
  { label: '小五', value: 9 },
  { label: '10', value: 10 },
  { label: '五号', value: 10.5 },
  { label: '11', value: 11 },
  { label: '小四', value: 12 },
  { label: '四号', value: 14 },
  { label: '小三', value: 15 },
  { label: '三号', value: 16 },
  { label: '小二', value: 18 },
  { label: '20', value: 20 },
  { label: '二号', value: 22 },
  { label: '小一', value: 24 },
  { label: '一号', value: 26 },
  { label: '28', value: 28 },
  { label: '小初', value: 36 },
  { label: '初号', value: 42 },
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

const showShortcutsDialog = ref(false)

const activeMenuTab = ref('home')
const menuTabs = [
  { key: 'file', label: '文件' },
  { key: 'home', label: '开始' },
  { key: 'edit', label: '编辑' },
  { key: 'view', label: '视图' },
  { key: 'insert', label: '插入' },
  { key: 'format', label: '格式' },
  { key: 'data', label: '数据' },
  { key: 'collab', label: '协同' },
  { key: 'help', label: '帮助' },
]

const importExcelInputRef = ref<HTMLInputElement | null>(null)

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
  } catch {
    message.error('官方功能执行失败')
    return false
  }
}

async function executeStyleCommand(commandId: string, params?: Record<string, any>) {
  syncUniverSelection()
  const ok = await executeUniverCommand(commandId, params)
  if (ok) {
    await nextTick()
    syncToolbarAndFormula()
  }
  return ok
}

function getActiveSheetCommandContext() {
  const workbook = activeUniverWorkbook
  const sheet = getActiveSheet()
  if (!workbook || !sheet) {
    message.warning('表格尚未初始化')
    return null
  }
  const { r1, r2, c1, c2 } = selectionRange.value
  return {
    unitId: workbook.getId(),
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

async function executeSheetCommand(commandId: string, params?: Record<string, any>) {
  syncUniverSelection()
  const ok = await executeUniverCommand(commandId, params)
  if (ok) {
    await nextTick()
    syncToolbarAndFormula()
  }
  return ok
}

function syncUniverSelection() {
  const target = univerAPI?.getActiveSheet?.()
  const worksheet = target?.worksheet
  if (!worksheet) return
  const { r1, r2, c1, c2 } = selectionRange.value
  const range = worksheet.getRange(r1, c1, r2 - r1 + 1, c2 - c1 + 1)
  worksheet.setActiveSelection(range)
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
    if (!hasUsableWorkbookContent(next)) return
    const normalized = normalizeWorkbook(next)
    applyWorkbookState(normalized)
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
      images: current?.images ?? sheet.images,
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

// ===== Normalization =====
function hasUsableWorkbookContent(input: any): boolean {
  if (!input || typeof input !== 'object') return false
  if (Array.isArray(input?.data)) {
    return input.data.length > 0
  }
  if (input?.data && typeof input.data === 'object' && Array.isArray(input.data?.sheets)) {
    return input.data.sheets.length > 0
  }
  if (Array.isArray(input?.sheets)) {
    return input.sheets.length > 0
  }
  return false
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
  undoStack.value = []
  redoStack.value = []
  syncToolbarAndFormula()
}

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

async function loadWorkbookFromDocumentUrl(url: string) {
  const token = String(getAuthToken() || '').trim()
  const headers: Record<string, string> = {}
  if (token) headers['Authorization'] = `Bearer ${token}`
  const resp = await fetch(url, { headers })
  if (!resp.ok) throw new Error(`请求失败: ${resp.status}`)
  const buffer = await resp.arrayBuffer()
  if (!buffer || buffer.byteLength === 0) throw new Error('远程文件内容为空')
  const result = await props.importCallback(buffer, {
    defaultSheetName: index => t('sheet.defaultSheetName', { index: index + 1 }),
  })
  if (!result.success || !result.workbook) {
    throw new Error(result.error || t('message.importFailed'))
  }
  applyWorkbookState(result.workbook)
  emitChange()
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
    images: Array.isArray(sheet?.images) ? JSON.parse(JSON.stringify(sheet.images)) : undefined,
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
  if (value.startsWith('=') && value.length > 1) {
    range.setFormula(value.slice(1))
  } else {
    range.setValue(value)
  }
}

function commitUniverFacadeMutation() {
  const changed = syncWorkbookFromUniver()
  forceCollabSync()
  if (changed) {
    emitChange('univer')
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

async function updateCellStyle() {
  if (props.readOnly) return
  const range = getSelectionRange()
  if (!range) return
  saveUndoState()
  const currentFontLine = String((range as any).getFontLine?.() || 'none')
  const currentBold = String((range as any).getFontWeight?.() || 'normal') === 'bold'
  const currentItalic = String((range as any).getFontStyle?.() || 'normal') === 'italic'
  const currentUnderline = currentFontLine === 'underline'
  const currentStrikethrough = currentFontLine === 'line-through'

  if (toolbarState.bold !== currentBold) await executeStyleCommand(SetBoldCommand.id)
  if (toolbarState.italic !== currentItalic) await executeStyleCommand(SetItalicCommand.id)
  if (toolbarState.underline !== currentUnderline) await executeStyleCommand(SetUnderlineCommand.id)
  if (toolbarState.strikethrough !== currentStrikethrough) await executeStyleCommand(SetStrikeThroughCommand.id)

  await executeStyleCommand(SetHorizontalTextAlignCommand.id, {
    value: toolbarState.align === 'left' ? 'left' : toolbarState.align === 'center' ? 'center' : 'right',
  })
  await executeStyleCommand(SetVerticalTextAlignCommand.id, { value: toolbarState.verticalAlign })
  await executeStyleCommand(SetFontFamilyCommand.id, { value: toolbarState.fontFamily || 'Microsoft YaHei, sans-serif' })
  await executeStyleCommand(SetFontSizeCommand.id, { value: Number(toolbarState.fontSize || 12) })
  await executeStyleCommand(
    toolbarState.fontColor ? SetTextColorCommand.id : ResetTextColorCommand.id,
    toolbarState.fontColor ? { value: toolbarState.fontColor } : undefined
  )
  await executeStyleCommand(
    toolbarState.bgColor ? SetBackgroundColorCommand.id : ResetBackgroundColorCommand.id,
    toolbarState.bgColor ? { value: toolbarState.bgColor } : undefined
  )
  await executeStyleCommand(SetTextWrapCommand.id, {
    value: toolbarState.wrap === 'wrap' ? 2 : toolbarState.wrap === 'overflow' ? 1 : 0,
  })
  await executeStyleCommand(SetTextRotationCommand.id, { value: Number(toolbarState.rotation ?? 0) })
}


async function toggleStyle(style: 'bold' | 'italic' | 'underline' | 'strikethrough') {
  if (props.readOnly) return
  toolbarState[style] = !toolbarState[style]
  const range = getSelectionRange()
  if (!range) return
  saveUndoState()
  if (style === 'bold') await executeStyleCommand(SetBoldCommand.id)
  else if (style === 'italic') await executeStyleCommand(SetItalicCommand.id)
  else if (style === 'underline') await executeStyleCommand(SetUnderlineCommand.id)
  else if (style === 'strikethrough') await executeStyleCommand(SetStrikeThroughCommand.id)
}

async function setAlign(align: Align) {
  if (props.readOnly) return
  toolbarState.align = align
  saveUndoState()
  await executeStyleCommand(SetHorizontalTextAlignCommand.id, {
    value: align === 'left' ? 'left' : align === 'center' ? 'center' : 'right',
  })
}

async function setWrap(wrap: WrapMode) {
  if (props.readOnly) return
  toolbarState.wrap = wrap
  saveUndoState()
  await executeStyleCommand(SetTextWrapCommand.id, {
    value: wrap === 'wrap' ? 2 : wrap === 'overflow' ? 1 : 0,
  })
}

function toggleWrap() {
  setWrap(toolbarState.wrap === 'wrap' ? 'clip' : 'wrap')
}

async function setFontColor(color: string) {
  if (props.readOnly) return
  toolbarState.fontColor = color
  saveUndoState()
  await executeStyleCommand(SetTextColorCommand.id, { value: color || '#000000' })
}

async function setBgColor(color: string) {
  if (props.readOnly) return
  toolbarState.bgColor = color
  saveUndoState()
  await executeStyleCommand(
    color ? SetBackgroundColorCommand.id : ResetBackgroundColorCommand.id,
    color ? { value: color } : undefined
  )
}

async function setBorders(type: string) {
  if (props.readOnly) return
  saveUndoState()
  const borderTypeMap: Record<string, BorderType> = {
    all: BorderType.ALL,
    outer: BorderType.OUTSIDE,
    none: BorderType.NONE,
    top: BorderType.TOP,
    bottom: BorderType.BOTTOM,
    left: BorderType.LEFT,
    right: BorderType.RIGHT,
  }
  const borderInfo = {
    type: borderTypeMap[type] ?? BorderType.ALL,
    color: type === 'none' ? undefined : '#000000',
    style: type === 'none' ? BorderStyleTypes.NONE : BorderStyleTypes.THIN,
    activeBorderType: type !== 'none',
  }
  await executeSheetCommand(SetBorderBasicCommand.id, {
    value: borderInfo,
  })
}

async function clearSelectedFormat() {
  if (props.readOnly) return
  const context = getActiveSheetCommandContext()
  if (!context) return
  saveUndoState()
  await executeSheetCommand(ClearSelectionFormatCommand.id, {
    unitId: context.unitId,
    subUnitId: context.subUnitId,
    ranges: [context.range],
  })
}

async function deleteSelectedContent() {
  if (props.readOnly) return
  const context = getActiveSheetCommandContext()
  if (!context) return
  saveUndoState()
  await executeSheetCommand(ClearSelectionContentCommand.id, {
    unitId: context.unitId,
    subUnitId: context.subUnitId,
    ranges: [context.range],
  })
}


// ===== Undo/Redo =====
function handleHeaderCommand(command: string) {
  switch (command) {
    case 'import': return triggerImportExcel()
    case 'save': return emitChange()
    case 'undo': return handleUndo()
    case 'redo': return handleRedo()
  }
}

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
async function insertRow(position: 'above' | 'below') {
  if (props.readOnly) return
  saveUndoState()
  const context = getActiveSheetCommandContext()
  if (!context) return
  const insertAt = position === 'above' ? selected.row : selected.row + 1
  await executeSheetCommand(InsertRowCommand.id, {
    unitId: context.unitId,
    subUnitId: context.subUnitId,
    direction: position === 'above' ? Direction.UP : Direction.DOWN,
    range: {
      startRow: insertAt,
      endRow: insertAt,
      startColumn: 0,
      endColumn: Math.max(0, (activeSheet.value?.colCount || 1) - 1),
    },
  })
}


async function insertCol(position: 'left' | 'right') {
  if (props.readOnly) return
  saveUndoState()
  const context = getActiveSheetCommandContext()
  if (!context) return
  const insertAt = position === 'left' ? selected.col : selected.col + 1
  await executeSheetCommand(InsertColCommand.id, {
    unitId: context.unitId,
    subUnitId: context.subUnitId,
    direction: position === 'left' ? Direction.LEFT : Direction.RIGHT,
    range: {
      startRow: 0,
      endRow: Math.max(0, (activeSheet.value?.rowCount || 1) - 1),
      startColumn: insertAt,
      endColumn: insertAt,
    },
  })
}

async function deleteRow() {
  if (props.readOnly) return
  saveUndoState()
  const context = getActiveSheetCommandContext()
  if (!context) return
  await executeSheetCommand(RemoveRowCommand.id, {
    unitId: context.unitId,
    subUnitId: context.subUnitId,
    range: context.rowRange,
  })
}

async function deleteCol() {
  if (props.readOnly) return
  saveUndoState()
  const context = getActiveSheetCommandContext()
  if (!context) return
  await executeSheetCommand(RemoveColCommand.id, {
    unitId: context.unitId,
    subUnitId: context.subUnitId,
    range: context.colRange,
  })
}

async function hideRow() {
  if (props.readOnly) return
  saveUndoState()
  const context = getActiveSheetCommandContext()
  if (!context) return
  await executeSheetCommand(SetRowHiddenCommand.id, {
    unitId: context.unitId,
    subUnitId: context.subUnitId,
    ranges: [context.rowRange],
  })
}

async function unhideRow() {
  if (props.readOnly) return
  saveUndoState()
  const context = getActiveSheetCommandContext()
  if (!context) return
  await executeSheetCommand(SetSpecificRowsVisibleCommand.id, {
    unitId: context.unitId,
    subUnitId: context.subUnitId,
    ranges: [context.rowRange],
  })
}

async function hideCol() {
  if (props.readOnly) return
  saveUndoState()
  const context = getActiveSheetCommandContext()
  if (!context) return
  await executeSheetCommand(SetColHiddenCommand.id, {
    unitId: context.unitId,
    subUnitId: context.subUnitId,
    ranges: [context.colRange],
  })
}

async function unhideCol() {
  if (props.readOnly) return
  saveUndoState()
  const context = getActiveSheetCommandContext()
  if (!context) return
  await executeSheetCommand(SetSpecificColsVisibleCommand.id, {
    unitId: context.unitId,
    subUnitId: context.subUnitId,
    ranges: [context.colRange],
  })
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
async function handleMergeCells() {
  if (props.readOnly) return
  const { r1, r2, c1, c2 } = selectionRange.value
  if (r1 === r2 && c1 === c2) return
  saveUndoState()
  await executeSheetCommand(AddWorksheetMergeAllCommand.id)
}


async function handleUnmergeCells() {
  if (props.readOnly) return
  saveUndoState()
  await executeSheetCommand(RemoveWorksheetMergeCommand.id)
}

// ===== View operations =====
function toggleGridlines() { showGridlines.value = !showGridlines.value }
async function toggleFreezeRow() {
  const target = univerAPI?.getActiveSheet?.()
  const worksheet = target?.worksheet
  if (!worksheet) return
  frozenRows.value = frozenRows.value > 0 ? 0 : 1
  syncDimensionStateToActiveSheet()
  if (frozenRows.value === 0 && frozenCols.value === 0) {
    worksheet.cancelFreeze()
    return
  }
  worksheet.setFreeze({
    startRow: frozenRows.value,
    startColumn: frozenCols.value,
    ySplit: frozenRows.value,
    xSplit: frozenCols.value,
  })
}
async function toggleFreezeCol() {
  const target = univerAPI?.getActiveSheet?.()
  const worksheet = target?.worksheet
  if (!worksheet) return
  frozenCols.value = frozenCols.value > 0 ? 0 : 1
  syncDimensionStateToActiveSheet()
  if (frozenRows.value === 0 && frozenCols.value === 0) {
    worksheet.cancelFreeze()
    return
  }
  worksheet.setFreeze({
    startRow: frozenRows.value,
    startColumn: frozenCols.value,
    ySplit: frozenRows.value,
    xSplit: frozenCols.value,
  })
}

// ===== Sort =====
function sortColumn(order: 'asc' | 'desc') {
  if (props.readOnly) return
  saveUndoState()
  void openUniverSort(order)
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

// ===== 协同功能 =====
const {
  collabConnectionState,
  collabSyncState,
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



onMounted(async () => {

  if (hasUsableWorkbookContent(props.initialContent)) {
    console.log('[ExcelEditor] 文档加载方式: JSON 加载', props.initialContent)
  } else if (props.documentUrl) {
    console.log('[ExcelEditor] 文档加载方式: 远程文件加载', props.documentUrl)
    try {
      await loadWorkbookFromDocumentUrl(props.documentUrl)
    } catch (e) {
      message.error(e instanceof Error ? e.message : t('message.importFailed'))
    }
  } else {
    console.log('[ExcelEditor] 文档加载方式: 空白文档')
  }
  await nextTick()
  scheduleUniverRender()
})
onUnmounted(() => {

  destroyCollaboration()
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
    const result = await props.importCallback(file, {
      defaultSheetName: index => t('sheet.defaultSheetName', { index: index + 1 }),
    })
    if (!result.success || !result.workbook) {
      throw new Error(result.error || t('message.importFailed'))
    }
    applyWorkbookState(result.workbook)
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
    const result = await props.exportCallback(workbook, {
      defaultSheetName: index => t('sheet.defaultSheetName', { index: index + 1 }),
    })
    if (!result.success || !result.data) {
      throw new Error(result.error || t('message.exportFailed'))
    }
    const blob = new Blob([result.data], {
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
    const result = await props.exportCallback(workbook, {
      defaultSheetName: index => t('sheet.defaultSheetName', { index: index + 1 }),
    })
    if (!result.success || !result.data) {
      throw new Error(result.error || t('message.exportFailed'))
    }
    const now = new Date()
    const fileName = `${t('sheet.defaultWorkbookName')}-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}.xlsx`
    localDocumentTitle.value = fileName.replace(/\.xlsx$/i, '')
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

// ===== 字号增减 =====
async function changeFontSize(delta: number) {
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
  saveUndoState()
  await executeStyleCommand(SetFontSizeCommand.id, { value: numericSizes[newIdx] })
}

// ===== 快捷格式按钮 =====
async function quickFormat(fmt: 'currency' | 'percent') {
  if (props.readOnly) return
  toolbarState.numberFormat = fmt
  const context = getActiveSheetCommandContext()
  if (!context) return
  saveUndoState()
  const pattern = fmt === 'currency' ? '¥#,##0.00' : '0.00%'
  const values = []
  for (let row = context.range.startRow; row <= context.range.endRow; row++) {
    for (let col = context.range.startColumn; col <= context.range.endColumn; col++) {
      values.push({ row, col, pattern })
    }
  }
  await executeSheetCommand(SetNumfmtCommand.id, {
    unitId: context.unitId,
    subUnitId: context.subUnitId,
    values,
  })
}

async function changeDecimal(delta: number) {
  if (props.readOnly) return
  toolbarState.decimalPlaces = Math.max(0, Math.min(10, (toolbarState.decimalPlaces ?? 2) + delta))
  const context = getActiveSheetCommandContext()
  if (!context) return
  saveUndoState()
  const fmt = toolbarState.numberFormat || 'auto'
  let pattern = ''
  if (fmt === 'currency') {
    pattern = `¥#,##0.${'#'.repeat(toolbarState.decimalPlaces)}`
  } else if (fmt === 'percent') {
    pattern = `0.${'#'.repeat(toolbarState.decimalPlaces)}%`
  }
  if (!pattern) return
  const values = []
  for (let row = context.range.startRow; row <= context.range.endRow; row++) {
    for (let col = context.range.startColumn; col <= context.range.endColumn; col++) {
      values.push({ row, col, pattern })
    }
  }
  await executeSheetCommand(SetNumfmtCommand.id, {
    unitId: context.unitId,
    subUnitId: context.subUnitId,
    values,
  })
}

// ===== 垂直对齐 =====
async function setVerticalAlign(va: VerticalAlign) {
  if (props.readOnly) return
  toolbarState.verticalAlign = va
  saveUndoState()
  await executeStyleCommand(SetVerticalTextAlignCommand.id, { value: va })
}

// ===== 文字旋转 =====
async function setRotation(deg: number) {
  if (props.readOnly) return
  toolbarState.rotation = deg
  saveUndoState()
  await executeStyleCommand(SetTextRotationCommand.id, { value: deg })
}

// ===== 筛选 =====
const {
  FILTER_EMPTY_TOKEN,
  filterActive,
  filterColumn,
  filterKeyword,
  filteredRows,
  filterPopoverVisible,
  filterValueOptions,
  filterSelectedValues,
  resetFilterState,
  prepareFilterPanel,
  isFilterValueSelected,
  onFilterValueChange,
  toggleAllFilterValues,
  applyFilterRows,
  applyFilterAndClose,
  clearFilter,
} = useSheetFilter({
  getActiveSheet: activeSheet,
  selected,
  cellKey,
  columnLabel,
  syncFilterStateToActiveSheet,
  emitChange,
})

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
      commitUniverFacadeMutation()
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
  commitUniverFacadeMutation()
}

// ===== Emit =====
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
  console.log('[ExcelEditor] 保存后的JSON:', payload)
  emit('change', payload)
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

.ribbon-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 28px;
  padding: 0 8px;
  border: 1px solid transparent;
  background: transparent;
  border-radius: 3px;
  cursor: pointer;
  font-size: 12px;
  color: #3c4043;
  white-space: nowrap;
  transition: background-color 0.15s, border-color 0.15s, color 0.15s;
}

.ribbon-btn:hover:not(:disabled) {
  background: #dadce0;
  color: #202124;
}

.ribbon-btn.active {
  background: #d3e3fd;
  color: #1a73e8;
}

.ribbon-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.ribbon-btn-sm {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 2px;
  min-width: 28px;
  height: 28px;
  padding: 0 6px;
  border: 1px solid transparent;
  background: transparent;
  border-radius: 3px;
  cursor: pointer;
  font-size: 12px;
  color: #3c4043;
  white-space: nowrap;
  transition: background-color 0.15s, border-color 0.15s, color 0.15s;
}

.ribbon-btn-sm:hover:not(:disabled) {
  background: #dadce0;
  color: #202124;
}

.ribbon-btn-sm.active {
  background: #d3e3fd;
  color: #1a73e8;
}

.ribbon-btn-sm:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.ribbon-divider {
  display: inline-block;
  width: 1px;
  height: 20px;
  background: #dadce0;
  margin: 0 4px;
  flex-shrink: 0;
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

/* ===== 工具栏 ===== */
.toolbar {
  display: flex;
  align-items: center;
  gap: 3px;
  padding: 4px 12px;
  border-bottom: 1px solid #e2e6ed;
  background: #f1f1f1;
  flex-wrap: wrap;
  font-size: 14px;
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
  border: 1px solid transparent;
  background: transparent;
  border-radius: 3px;
  cursor: pointer;
  color: #3c4043;
  transition: background-color 0.15s, border-color 0.15s, color 0.15s;
  flex-shrink: 0;
}

.tb:hover:not(:disabled) {
  background: #dadce0;
  border-color: transparent;
  color: #202124;
}

.tb:active:not(:disabled) {
  background: #d3e3fd;
}

.tb.active {
  background: #d3e3fd;
  color: #1a73e8;
  border-color: transparent;
}

.tb:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.tb .v-icon {
  flex-shrink: 0;
}

.tb > .v-icon + .v-icon {
  font-size: 12px;
  color: #80868b;
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

<!-- 全局样式：弹出菜单（teleport 到 body，scoped 无法影响）-->
<style>
.sheet-editor .menu-card {
  width: 100%;
  margin: 0;
  padding: 0;
  background: #fff;
  border-bottom: 1px solid #e2e6ed;
}
</style>
