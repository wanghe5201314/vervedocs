<template>
  <div class="menu-bar">
    <a-menu mode="horizontal" class="docx-menu-bar" :selectable="false" triggerSubMenuAction="click" @click="({ key }: any) => handleMenuClick(key)">
      <!-- 文件菜单 -->
      <a-sub-menu key="file" popupClassName="gdocs-menu-popper gdocs-start-popper">
        <template #title>文件</template>
        <a-menu-item key="new"><span class="mi"><MdiIcon name="file-plus-outline" /><span>新建文档</span></span></a-menu-item>
        <a-menu-item key="import"><div class="mi-row"><span class="mi"><MdiIcon name="file-import-outline" /><span>
          {{ isImporting ? '导入中...' : '导入文档' }}&nbsp;&nbsp;&nbsp;
          </span></span><span class="shortcut">Ctrl+Alt+O</span>
          <a-tag color="error" size="small">1.0.1-beta.20260412</a-tag></div>
        </a-menu-item>
        <a-menu-divider />
        <a-menu-item key="save"><div class="mi-row"><span class="mi"><MdiIcon name="content-save-outline" /><span>保存</span></span><span class="shortcut">Ctrl+S</span></div></a-menu-item>
        <a-sub-menu key="download" popupClassName="gdocs-menu-popper">
          <template #title><span class="mi"><MdiIcon name="download-outline" /><span>下载为</span></span></template>
          <a-menu-item key="downloadDocx"><span class="mi"><MdiIcon name="file-word-outline" /><span>Word文件 (*.docx)</span></span></a-menu-item>
        </a-sub-menu>
        <a-menu-item key="print"><div class="mi-row"><span class="mi"><MdiIcon name="printer-outline" /><span>打印</span></span><span class="shortcut">Ctrl+P</span></div></a-menu-item>
        <a-menu-item key="preview"><span class="mi"><MdiIcon name="eye-outline" /><span>预览</span></span></a-menu-item>
        <a-menu-item key="rename"><span class="mi"><MdiIcon name="rename-box" /><span>重命名</span></span></a-menu-item>
        <a-menu-divider />
        <a-menu-item key="protectEncrypt"><span class="mi"><MdiIcon name="lock-outline" /><span>加密文档</span></span></a-menu-item>
        <a-menu-item key="protectDoc"><span class="mi"><MdiIcon name="shield-lock-outline" /><span>保护文档</span></span></a-menu-item>
        <a-menu-item key="unprotect"><span class="mi"><MdiIcon name="lock-open-outline" /><span>解除保护</span></span></a-menu-item>
        <a-menu-divider />
        <a-menu-item key="versionHistory"><span class="mi"><MdiIcon name="history" /><span>版本历史</span></span></a-menu-item>
        <a-menu-item key="accessPermission"><span class="mi"><MdiIcon name="account-multiple-outline" /><span>访问权限</span></span></a-menu-item>
        <a-menu-divider />
        <a-menu-item key="feedback"><span class="mi"><MdiIcon name="message-outline" /><span>提出功能建议</span></span></a-menu-item>
      </a-sub-menu>

      <!-- 编辑菜单 -->
      <a-sub-menu key="edit" popupClassName="gdocs-menu-popper">
        <template #title>编辑</template>
        <a-menu-item key="undo"><div class="mi-row"><span class="mi"><MdiIcon name="undo" /><span>撤销</span></span><span class="shortcut">Ctrl+Z</span></div></a-menu-item>
        <a-menu-item key="redo"><div class="mi-row"><span class="mi"><MdiIcon name="redo" /><span>重做</span></span><span class="shortcut">Ctrl+Y</span></div></a-menu-item>
        <a-menu-divider />
        <a-menu-item key="cut" :class="{ disabled: !hasSelection }"><div class="mi-row"><span class="mi"><MdiIcon name="content-cut" /><span>剪切</span></span><span class="shortcut">Ctrl+X</span></div></a-menu-item>
        <a-menu-item key="copy" :class="{ disabled: !hasSelection }"><div class="mi-row"><span class="mi"><MdiIcon name="content-copy" /><span>复制</span></span><span class="shortcut">Ctrl+C</span></div></a-menu-item>
        <a-menu-item key="paste"><div class="mi-row"><span class="mi"><MdiIcon name="content-paste" /><span>粘贴</span></span><span class="shortcut">Ctrl+V</span></div></a-menu-item>
        <a-menu-item key="pasteNoFormat"><div class="mi-row"><span class="mi"><MdiIcon name="clipboard-text-outline" /><span>无格式粘贴</span></span><span class="shortcut">Ctrl+Shift+V</span></div></a-menu-item>
        <a-menu-divider />
        <a-menu-item key="selectAll"><div class="mi-row"><span class="mi"><MdiIcon name="select-all" /><span>全选</span></span><span class="shortcut">Ctrl+A</span></div></a-menu-item>
        <a-menu-item key="delete" :class="{ disabled: !hasSelection }"><span class="mi"><MdiIcon name="delete-outline" /><span>删除</span></span></a-menu-item>
        <a-menu-divider />
        <a-menu-item key="search"><div class="mi-row"><span class="mi"><MdiIcon name="magnify" /><span>查找</span></span><span class="shortcut">Ctrl+F</span></div></a-menu-item>
      </a-sub-menu>

      <!-- 格式菜单 -->
      <a-sub-menu key="format" popupClassName="gdocs-menu-popper">
        <template #title>格式</template>
        <a-sub-menu key="textStyle" popupClassName="gdocs-menu-popper">
          <template #title><span class="mi"><MdiIcon name="format-text" /><span>文本</span></span></template>
          <a-menu-item key="bold"><div class="mi-row"><span class="mi"><MdiIcon name="format-bold" /><span>粗体</span></span><span class="shortcut">Ctrl+B</span></div></a-menu-item>
          <a-menu-item key="italic"><div class="mi-row"><span class="mi"><MdiIcon name="format-italic" /><span>斜体</span></span><span class="shortcut">Ctrl+I</span></div></a-menu-item>
          <a-menu-item key="underline"><div class="mi-row"><span class="mi"><MdiIcon name="format-underline" /><span>下划线</span></span><span class="shortcut">Ctrl+U</span></div></a-menu-item>
          <a-menu-item key="strikeout"><span class="mi"><MdiIcon name="format-strikethrough" /><span>删除线</span></span></a-menu-item>
          <a-menu-item key="superscript"><span class="mi"><MdiIcon name="format-superscript" /><span>上标</span></span></a-menu-item>
          <a-menu-item key="subscript"><span class="mi"><MdiIcon name="format-subscript" /><span>下标</span></span></a-menu-item>
        </a-sub-menu>
        <a-sub-menu
          key="characterScale"
          popupClassName="gdocs-menu-popper"
          :disabled="!hasSelection"
          :class="{ 'submenu-disabled': !hasSelection }"
        >
          <template #title>
            <span class="mi"><MdiIcon name="format-letter-case" />              <span>字符缩放</span></span>
          </template>
          <a-menu-item
            v-for="scale in characterScaleOptions"
            :key="'characterScale' + scale"
            :class="{ 'is-current-scale': normalizedCharacterScale === scale }"
          >

              <span
                class="scale-check"
                :class="{ active: normalizedCharacterScale === scale }"
                aria-hidden="true"
              >✓</span>{{ scale }}%

          </a-menu-item>
          <a-menu-divider />
          <a-menu-item key="characterScaleCustom">
            <span class="scale-check" aria-hidden="true"></span>其他(M)...
          </a-menu-item>
        </a-sub-menu>
        <a-sub-menu key="paragraphStyle" popupClassName="gdocs-menu-popper">
          <template #title><span class="mi"><MdiIcon name="format-paragraph" /><span>段落</span></span></template>
          <a-sub-menu key="alignment" popupClassName="gdocs-menu-popper">
            <template #title><span class="mi"><MdiIcon name="format-align-left" /><span>对齐方式</span></span></template>
            <a-menu-item key="alignLeft"><span class="mi"><MdiIcon name="format-align-left" /><span>左对齐</span></span></a-menu-item>
            <a-menu-item key="alignCenter"><span class="mi"><MdiIcon name="format-align-center" /><span>居中对齐</span></span></a-menu-item>
            <a-menu-item key="alignRight"><span class="mi"><MdiIcon name="format-align-right" /><span>右对齐</span></span></a-menu-item>
            <a-menu-item key="alignJustify"><span class="mi"><MdiIcon name="format-align-justify" /><span>两端对齐</span></span></a-menu-item>
          </a-sub-menu>
          <a-sub-menu key="lineSpacing" popupClassName="gdocs-menu-popper">
            <template #title><span class="mi"><MdiIcon name="format-line-spacing" /><span>行距</span></span></template>
            <a-menu-item key="lineHeight1">单倍行距</a-menu-item>
            <a-menu-item key="lineHeight1.15">1.15 倍行距</a-menu-item>
            <a-menu-item key="lineHeight1.5">1.5 倍行距</a-menu-item>
            <a-menu-item key="lineHeight2">双倍行距</a-menu-item>
            <a-menu-item key="lineHeight2.5">2.5 倍行距</a-menu-item>
            <a-menu-item key="lineHeight3">三倍行距</a-menu-item>
            <a-menu-divider />
            <a-menu-item key="lineHeightCustom">自定义行距...</a-menu-item>
          </a-sub-menu>
          <a-menu-divider />
          <a-menu-item key="indentIncrease"><span class="mi"><MdiIcon name="format-indent-increase" /><span>增加缩进</span></span></a-menu-item>
          <a-menu-item key="indentDecrease"><span class="mi"><MdiIcon name="format-indent-decrease" /><span>减少缩进</span></span></a-menu-item>
          <a-menu-item key="firstLineIndent"><span class="mi"><MdiIcon name="format-textdirection-l-to-r" /><span>首行缩进</span></span></a-menu-item>
        </a-sub-menu>
        <a-sub-menu key="listStyle" popupClassName="gdocs-menu-popper">
          <template #title><span class="mi"><MdiIcon name="format-list-bulleted" /><span>项目符号和编号</span></span></template>
          <a-menu-item key="bulletList"><span class="mi"><MdiIcon name="format-list-bulleted" /><span>项目符号列表</span></span></a-menu-item>
          <a-menu-item key="numberList"><span class="mi"><MdiIcon name="format-list-numbered" /><span>编号列表</span></span></a-menu-item>
          <a-menu-item key="checkList"><span class="mi"><MdiIcon name="format-list-checks" /><span>清单</span></span></a-menu-item>
        </a-sub-menu>
        <a-menu-divider />
        <a-sub-menu key="columns" popupClassName="gdocs-menu-popper">
          <template #title><span class="mi"><MdiIcon name="view-column-outline" /><span>分栏</span></span></template>
          <a-menu-item key="columns1"><span class="mi"><MdiIcon name="view-column-outline" /><span>一栏</span></span></a-menu-item>
          <a-menu-item key="columns2"><span class="mi"><MdiIcon name="view-column-outline" /><span>两栏</span></span></a-menu-item>
          <a-menu-item key="columns3"><span class="mi"><MdiIcon name="view-column-outline" /><span>三栏</span></span></a-menu-item>
          <a-menu-divider />
          <a-menu-item key="columnsMore"><span class="mi"><MdiIcon name="cog-outline" /><span>更多选项...</span></span></a-menu-item>
        </a-sub-menu>
        <a-menu-divider />
        <a-menu-item key="clearFormat"><div class="mi-row"><span class="mi"><MdiIcon name="format-clear" /><span>清除格式</span></span><span class="shortcut">Ctrl+\</span></div></a-menu-item>
        <a-menu-divider />
        <a-sub-menu key="direction" popupClassName="gdocs-menu-popper gdocs-direction-popper">
          <template #title><span class="mi"><MdiIcon name="crop-portrait" /><span>纸张方向</span></span></template>
          <div class="direction-panel">
            <div class="direction-item" @click="emit('layout', 'paperVertical')">
              <div class="direction-icon vertical-icon"></div>
              <span>纵向</span>
            </div>
            <div class="direction-item" @click="emit('layout', 'paperHorizontal')">
              <div class="direction-icon horizontal-icon"></div>
              <span>横向</span>
            </div>
          </div>
        </a-sub-menu>
        <a-sub-menu key="size" popupClassName="gdocs-menu-popper gdocs-size-popper">
          <template #title><span class="mi"><MdiIcon name="file-outline" /><span>纸张大小</span></span></template>
          <div class="size-panel">
            <div class="size-item" :class="{ 'size-active': currentPaperSizeName === size.name }" v-for="size in paperSizes" :key="size.name" @click="emit('paperSize', size)">
              <div class="size-icon"></div>
              <div class="size-info">
                <div class="size-name">{{ size.name }}</div>
                <div class="size-dimensions">{{ size.displayHeight }} × {{ size.displayWidth }}</div>
              </div>
            </div>
          </div>
          <a-menu-divider />
          <a-menu-item key="customPaperSize"><span class="mi"><MdiIcon name="cog-outline" /><span>其它页面大小...</span></span></a-menu-item>
        </a-sub-menu>
        <a-sub-menu key="margin" popupClassName="gdocs-menu-popper gdocs-margin-popper">
          <template #title><span class="mi"><MdiIcon name="format-textbox" /><span>页边距</span></span></template>
          <div class="margin-presets">
            <div class="preset-item" v-for="preset in marginPresets" :key="preset.name" @click="emit('margin', preset)">
              <div class="page-icon"><div class="page-content" :style="preset.style"></div></div>
              <div class="preset-info">
                <div class="preset-name">{{ preset.name }}</div>
                <div class="preset-dimensions"><span class="margin-pair">上{{ (preset.margins[0] / 37.8).toFixed(1) }}厘米</span><span class="margin-pair">下{{ (preset.margins[2] / 37.8).toFixed(1) }}厘米</span></div>
                <div class="preset-dimensions"><span class="margin-pair">左{{ (preset.margins[3] / 37.8).toFixed(1) }}厘米</span><span class="margin-pair">右{{ (preset.margins[1] / 37.8).toFixed(1) }}厘米</span></div>
              </div>
            </div>
          </div>
        </a-sub-menu>
        <a-sub-menu key="bgColor" popupClassName="gdocs-menu-popper gdocs-bg-popper">
          <template #title><span class="mi"><MdiIcon name="format-color-fill" /><span>页面颜色</span></span></template>
          <div class="bg-menu">
            <div class="bg-item" @click="emit('bgColor', '#FFFFFF')">
              <span class="bg-check"><MdiIcon v-if="selectedBgColor === '#FFFFFF'" name="check" /></span>
              <span class="bg-item-text">无填充</span>
            </div>
            <div class="bg-divider"></div>
            <div class="bg-section-title">主题颜色</div>
            <div class="bg-grid">
              <button v-for="c in bgColorPalette" :key="c" class="bg-color" :class="{ selected: selectedBgColor === c }" :style="{ backgroundColor: c }" @click="emit('bgColor', c)"></button>
            </div>
          </div>
        </a-sub-menu>
      </a-sub-menu>

      <!-- 插入菜单 -->
      <a-sub-menu key="insert" popupClassName="gdocs-menu-popper">
        <template #title>插入</template>
        <a-menu-item key="insertBlankPage"><span class="mi"><MdiIcon name="file-plus-outline" /><span>空白页</span></span></a-menu-item>
        <a-sub-menu key="breaks" popupClassName="gdocs-menu-popper">
          <template #title><span class="mi"><MdiIcon name="format-page-break" /><span>分隔符</span></span></template>
          <a-menu-item key="pageBreak"><div class="mi-row"><span class="mi"><MdiIcon name="format-page-break" /><span>分页符(P)</span></span><span class="shortcut">Ctrl+Enter</span></div></a-menu-item>
          <a-menu-item key="columnBreak"><span class="mi"><MdiIcon name="format-columns" /><span>分栏符(C)</span></span></a-menu-item>
          <a-menu-item key="lineBreak"><div class="mi-row"><span class="mi"><MdiIcon name="keyboard-return" /><span>换行符(W)</span></span><span class="shortcut">Shift+Enter</span></div></a-menu-item>
          <a-menu-divider />
          <a-menu-item key="sectionBreakNextPage"><span class="mi"><MdiIcon name="file-document-outline" /><span>下一页分节符(N)</span></span></a-menu-item>
          <a-menu-item key="sectionBreakContinuous"><span class="mi"><MdiIcon name="format-section" /><span>连续分节符(T)</span></span></a-menu-item>
          <a-menu-item key="sectionBreakEvenPage"><span class="mi"><MdiIcon name="numeric-2-box-outline" /><span>偶数页分节符(E)</span></span></a-menu-item>
          <a-menu-item key="sectionBreakOddPage"><span class="mi"><MdiIcon name="numeric-1-box-outline" /><span>奇数页分节符(O)</span></span></a-menu-item>
        </a-sub-menu>
        <a-menu-divider />
        <a-sub-menu key="insertTable" popupClassName="gdocs-menu-popper gdocs-table-popper">
          <template #title><span class="mi"><MdiIcon name="table" /><span>表格</span></span></template>
          <a-card size="small" title="插入表格" :bordered="true" class="table-selector">
            <div class="table-grid" @mouseleave="hoverCell = { r: -1, c: -1 }">
              <div v-for="r in 10" :key="r" class="tgrid-row">
                <div v-for="c in 10" :key="c" class="tgrid-cell" :class="{ selected: r <= hoverCell.r + 1 && c <= hoverCell.c + 1 }" @mouseover="hoverCell = { r: r - 1, c: c - 1 }" @click="handleInsertTable(r, c)"></div>
              </div>
            </div>
            <div class="table-info">{{ hoverCell.r >= 0 ? `${hoverCell.r + 1} × ${hoverCell.c + 1}` : '选择大小' }}</div>
          </a-card>
          <a-menu-divider />
          <a-menu-item key="insertTableDialog"><span class="mi"><MdiIcon name="cog-outline" /><span>更多选项...</span></span></a-menu-item>
        </a-sub-menu>
        <a-menu-item key="image"><span class="mi"><MdiIcon name="image-outline" /><span>图片</span></span></a-menu-item>
        <a-sub-menu key="av" popupClassName="gdocs-menu-popper">
          <template #title><span class="mi"><MdiIcon name="video-outline" /><span>音视频</span></span></template>
          <a-menu-item key="audio"><span class="mi"><MdiIcon name="music-note" /><span>音频</span></span></a-menu-item>
          <a-menu-item key="video"><span class="mi"><MdiIcon name="video-outline" /><span>视频</span></span></a-menu-item>
        </a-sub-menu>
        <a-menu-item key="insertChart"><span class="mi"><MdiIcon name="chart-bar" /><span>图表</span></span></a-menu-item>
        <a-sub-menu key="shapes" popupClassName="gdocs-menu-popper gdocs-shapes-popper">
          <template #title><span class="mi"><MdiIcon name="shape-outline" /><span>形状</span></span></template>
          <a-sub-menu v-for="cat in shapeCategories" :key="'shapes-' + cat.name" popupClassName="gdocs-menu-popper gdocs-third-popper">
            <template #title><span class="mi"><MdiIcon :name="cat.icon" /><span>{{ cat.name }}</span></span></template>
            <div class="shapes-grid">
              <div v-for="shape in cat.shapes" :key="shape.type" class="shape-item" @click="emit('shape', shape.type)" :title="shape.name">
                <MdiIcon :name="shape.icon" />
              </div>
            </div>
          </a-sub-menu>
        </a-sub-menu>
        <a-menu-divider />
        <a-menu-item key="hyperlink"><span class="mi"><MdiIcon name="link-variant" /><span>超链接</span></span></a-menu-item>
        <a-menu-item key="bookmark"><span class="mi"><MdiIcon name="bookmark-outline" /><span>书签</span></span></a-menu-item>
        <a-menu-divider />
        <a-sub-menu key="formula" popupClassName="gdocs-menu-popper gdocs-formula-popper">
          <template #title><span class="mi"><MdiIcon name="function-variant" /><span>公式</span></span></template>
          <a-menu-item key="latex"><span class="mi"><MdiIcon name="function-variant" /><span>插入LaTeX公式</span></span></a-menu-item>
          <a-sub-menu v-for="cat in formulaCategories" :key="'formula-' + cat.name" popupClassName="gdocs-menu-popper gdocs-third-popper">
            <template #title><span class="mi"><MdiIcon :name="cat.icon" /><span>{{ cat.name }}</span></span></template>
            <a-menu-item v-for="f in cat.formulas" :key="'f-' + f.name" @click.stop="emit('formula', f.latex)">
              <div class="formula-item-content">
                <div class="formula-name">{{ f.name }}</div>
                <div class="formula-preview">{{ f.preview }}</div>
              </div>
            </a-menu-item>
          </a-sub-menu>
        </a-sub-menu>
        <a-sub-menu key="symbol" popupClassName="gdocs-menu-popper gdocs-symbol-popper">
          <template #title><span class="mi"><MdiIcon name="omega" /><span>符号</span></span></template>
          <a-card size="small" title="插入符号" :bordered="true" class="symbol-categories">
            <div v-for="category in symbolCategories" :key="category.name" class="symbol-category">
              <div class="symbol-section-title">{{ category.name }}</div>
              <div class="symbol-grid">
                <div class="symbol-item" v-for="s in category.symbols" :key="s" @click="emit('symbol', s)">{{ s }}</div>
              </div>
            </div>
          </a-card>
        </a-sub-menu>
        <a-sub-menu key="separator" popupClassName="gdocs-menu-popper gdocs-separator-popper">
          <template #title><span class="mi"><MdiIcon name="minus" /><span>分割线</span></span></template>
          <a-card size="small" title="分割线类型" :bordered="true" class="separator-card">
            <div class="separator-list">
              <div
                class="separator-item"
                v-for="sep in separatorStyles"
                :key="sep.name"
                @click="emit('separator', { type: sep.type, width: sep.width, dashArray: sep.dashArray })"
              >
                <div class="separator-preview"
                  :class="{ 'wavy': sep.type === 'wavy' }"
                  :style="getSeparatorStyle(sep)"
                ></div>
              </div>
            </div>
          </a-card>
          <a-menu-divider />
          <a-menu-item key="separatorDialog"><span class="mi"><MdiIcon name="palette-outline" /><span>分割线颜色</span></span></a-menu-item>
        </a-sub-menu>
        <a-menu-divider />
        <a-menu-item key="footnote"><span class="mi"><MdiIcon name="format-annotation-plus" /><span>脚注</span></span></a-menu-item>
        <a-menu-item key="comment"><div class="mi-row"><span class="mi"><MdiIcon name="comment-plus-outline" /><span>评论</span></span><span class="shortcut">Ctrl+Alt+M</span></div></a-menu-item>
        <a-menu-divider />
        <a-sub-menu key="watermark" popupClassName="gdocs-menu-popper gdocs-watermark-popper">
          <template #title><span class="mi"><MdiIcon name="watermark" /><span>水印</span></span></template>
          <a-card size="small" title="水印" :bordered="true" class="wm-card">
            <div class="wm-section">
              <div class="wm-section-title">自定义水印</div>
              <div class="wm-custom-add" @click="emit('cmd', 'addWatermark')">
                <MdiIcon name="plus" />
                <span>点击添加</span>
              </div>
            </div>
            <div class="wm-section">
              <div class="wm-section-title">预设水印</div>
              <div class="wm-preset-grid">
                <div class="wm-preset-item" v-for="preset in watermarkPresets" :key="preset.name" @click="emit('watermark', preset)">
                  <div class="wm-preset-preview"><span>{{ preset.name }}</span></div>
                  <div class="wm-preset-name">{{ preset.name }}</div>
                </div>
              </div>
            </div>
          </a-card>
          <a-menu-divider />
          <a-menu-item key="deleteWatermark"><span class="mi"><MdiIcon name="delete-outline" /><span>删除水印</span></span></a-menu-item>
        </a-sub-menu>
        <a-sub-menu key="hf" popupClassName="gdocs-menu-popper">
          <template #title><span class="mi"><MdiIcon name="page-layout-header-footer" /><span>页眉和页脚</span></span></template>
          <a-menu-item key="header">编辑页眉</a-menu-item>
          <a-menu-item key="footer">编辑页脚</a-menu-item>
          <a-menu-item key="pageNumber">插入页码</a-menu-item>
          <a-menu-divider />
          <a-menu-item key="clearHeader">移除页眉</a-menu-item>
          <a-menu-item key="clearFooter">移除页脚</a-menu-item>
        </a-sub-menu>
      </a-sub-menu>

      <!-- 视图菜单 -->
      <a-sub-menu key="view" popupClassName="gdocs-menu-popper">
        <template #title>视图</template>
        <a-sub-menu key="zoom" popupClassName="gdocs-menu-popper">
          <template #title><span class="mi"><MdiIcon name="magnify-plus-outline" /><span>缩放</span></span></template>
          <a-menu-item v-for="z in zoomLevels" :key="'zoom' + z">
            <span class="zoom-check"><MdiIcon v-if="zoomPercent === z" name="check" /></span>{{ z }}%
          </a-menu-item>
        </a-sub-menu>
        <a-menu-item key="fitPage"><span class="mi"><MdiIcon name="fit-to-page-outline" /><span>适应页面</span></span></a-menu-item>
        <a-menu-item key="fitWidth"><span class="mi"><MdiIcon name="arrow-expand-horizontal" /><span>适应宽度</span></span></a-menu-item>
        <a-menu-divider />

        <a-menu-item key="toggleToolbar"><span class="mi"><MdiIcon name="view-headline" /><span>显示/隐藏工具栏</span></span></a-menu-item>
        <a-menu-item key="toggleLeftPanel"><span class="mi"><MdiIcon name="page-layout-sidebar-left" /><span>显示/隐藏左侧面板</span></span></a-menu-item>
        <a-menu-item key="toggleBottomNav"><span class="mi"><MdiIcon name="dock-bottom" /><span>显示/隐藏状态栏</span></span></a-menu-item>
        <a-menu-item key="toggleRuler"><span class="mi"><MdiIcon name="ruler" /><span>显示/隐藏标尺</span></span></a-menu-item>
        <a-menu-item key="toggleLineBreak"><span class="mi"><MdiIcon :name="showLineBreak ? 'checkbox-marked-outline' : 'checkbox-blank-outline'" /><span>显示换行符</span></span></a-menu-item>
        <a-menu-divider />
        <a-menu-item key="toggleEyeCare"><span class="mi"><MdiIcon name="eye-outline" /><span>护眼模式</span></span></a-menu-item>
        <a-menu-divider />
        <a-sub-menu key="toc" popupClassName="gdocs-menu-popper gdocs-toc-popper">
          <template #title><span class="mi"><MdiIcon name="table-of-contents" /><span>目录</span></span></template>
          <a-card size="small" title="自动目录" :bordered="true" class="toc-card-panel">
            <div class="toc-card-list">
              <div class="toc-card" @click="emit('view', 'tocInsert1')">
                <div class="toc-card-preview">
                  <div class="toc-preview-title">目录</div>
                  <div class="toc-preview-item level-1">第1级 <span class="toc-dots"></span> 1</div>
                  <div class="toc-preview-item level-1">第1级 <span class="toc-dots"></span> 3</div>
                  <div class="toc-preview-item level-1">第1级 <span class="toc-dots"></span> 5</div>
                </div>
              </div>
              <div class="toc-card" @click="emit('view', 'tocInsert2')">
                <div class="toc-card-preview">
                  <div class="toc-preview-title">目录</div>
                  <div class="toc-preview-item level-1">第1级 <span class="toc-dots"></span> 1</div>
                  <div class="toc-preview-item level-2">第2级 <span class="toc-dots"></span> 3</div>
                  <div class="toc-preview-item level-2">第2级 <span class="toc-dots"></span> 5</div>
                </div>
              </div>
              <div class="toc-card" @click="emit('view', 'tocInsert3')">
                <div class="toc-card-preview">
                  <div class="toc-preview-title">目录</div>
                  <div class="toc-preview-item level-1">第1级 <span class="toc-dots"></span> 1</div>
                  <div class="toc-preview-item level-2">第2级 <span class="toc-dots"></span> 3</div>
                  <div class="toc-preview-item level-3">第3级 <span class="toc-dots"></span> 5</div>
                </div>
              </div>
            </div>
          </a-card>
          <a-menu-divider />
          <a-menu-item key="tocCustom"><span class="mi"><MdiIcon name="cog-outline" /><span>自定义目录(C)...</span></span></a-menu-item>
          <a-menu-item key="tocRemove"><span class="mi"><MdiIcon name="delete-outline" /><span>删除目录(R)</span></span></a-menu-item>
        </a-sub-menu>
      </a-sub-menu>

      <!-- 审阅菜单 -->
      <a-sub-menu key="review" popupClassName="gdocs-menu-popper">
        <template #title>审阅</template>
        <a-sub-menu key="revisionDisplay" popupClassName="gdocs-menu-popper">
          <template #title><span class="mi"><MdiIcon name="eye-outline" /><span>显示标记选项</span></span></template>
          <a-menu-item key="showAllMarks" title="同时显示批注卡片和修订卡片">
            <span class="mi"><MdiIcon :name="revisionDisplayMode === 'all' ? 'checkbox-marked-outline' : 'checkbox-blank-outline'" /><span>显示所有批注和修订</span></span>
          </a-menu-item>
          <a-menu-item key="showComments" title="仅显示批注卡片，隐藏修订卡片">
            <span class="mi"><MdiIcon :name="revisionDisplayMode === 'comments' ? 'checkbox-marked-outline' : 'checkbox-blank-outline'" /><span>仅显示批注</span></span>
          </a-menu-item>
          <a-menu-item key="showRevisions" title="仅显示修订卡片，隐藏批注卡片">
            <span class="mi"><MdiIcon :name="revisionDisplayMode === 'revisions' ? 'checkbox-marked-outline' : 'checkbox-blank-outline'" /><span>仅显示修订</span></span>
          </a-menu-item>
        </a-sub-menu>
        <a-menu-divider />
        <a-menu-item key="revisionPanel"><span class="mi"><MdiIcon name="dock-right" /><span>修订面板</span></span></a-menu-item>
      </a-sub-menu>

      <a-sub-menu
        v-if="showCollaborationMenu"
        key="collaboration"
        popupClassName="gdocs-menu-popper"
      >
        <template #title>协同</template>
        <a-menu-item key="toggleCollaborationCursor">
          <div class="mi-row mi-row--toggle">
            <span class="mi"><MdiIcon name="pencil" /><span>光标协同</span></span>
            <span class="menu-toggle-check" aria-hidden="true">
              <MdiIcon v-if="cursorCollaborationEnabled" name="check" />
            </span>
          </div>
        </a-menu-item>
        <a-menu-item key="toggleCollaborationSelection">
          <div class="mi-row mi-row--toggle">
            <span class="mi"><MdiIcon name="select-all" /><span>选区协同</span></span>
            <span class="menu-toggle-check" aria-hidden="true">
              <MdiIcon v-if="selectionCollaborationEnabled" name="check" />
            </span>
          </div>
        </a-menu-item>
      </a-sub-menu>

      <!-- 工具菜单 -->
      <a-sub-menu key="tools" popupClassName="gdocs-menu-popper">
        <template #title>工具</template>
        <a-menu-item key="barcode"><span class="mi"><MdiIcon name="barcode" /><span>条形码</span></span></a-menu-item>
        <a-menu-item key="qrcode"><span class="mi"><MdiIcon name="qrcode" /><span>二维码</span></span></a-menu-item>
        <a-menu-divider />
        <a-menu-item key="insertDate"><span class="mi"><MdiIcon name="calendar-clock" /><span>日期和时间</span></span></a-menu-item>
        <a-menu-item key="signature"><span class="mi"><MdiIcon name="draw" /><span>电子签名</span></span></a-menu-item>
        <a-menu-divider />
        <a-sub-menu key="spellcheckSub" popupClassName="gdocs-menu-popper gdocs-spellcheck-popper">
          <template #title><span class="mi"><MdiIcon name="spellcheck" /><span>拼写检查</span></span></template>
          <a-card size="small" title="拼写检查" :bordered="true" class="spellcheck-panel">
            <div class="sp-status">
              <MdiIcon name="check-circle" class="sp-ok" />
              <span>未发现拼写错误</span>
            </div>
            <div class="sp-actions">
              <button class="sp-btn" @click="emit('cmd', 'spellcheck')">重新检查</button>
            </div>
            <div class="sp-tip">支持中文、英文拼写检查</div>
          </a-card>
        </a-sub-menu>
        <a-sub-menu key="wordCountSub" popupClassName="gdocs-menu-popper gdocs-wordcount-popper">
          <template #title><span class="mi"><MdiIcon name="counter" /><span>字数统计</span></span></template>
          <a-card size="small" title="字数统计" :bordered="true" class="wordcount-panel">
            <div class="wc-grid">
              <div class="wc-row"><span class="wc-label">页数</span><span class="wc-value">{{ documentStats?.totalPages || 0 }}</span></div>
              <div class="wc-row"><span class="wc-label">字数</span><span class="wc-value">{{ documentStats?.wordCount || 0 }}</span></div>
              <div class="wc-row"><span class="wc-label">字符（不含空格）</span><span class="wc-value">{{ documentStats?.charCount || 0 }}</span></div>
              <div class="wc-row"><span class="wc-label">字符（含空格）</span><span class="wc-value">{{ documentStats?.charCountWithSpaces || 0 }}</span></div>
              <div class="wc-row"><span class="wc-label">段落</span><span class="wc-value">{{ documentStats?.paragraphCount || 0 }}</span></div>
            </div>
            <div class="wc-tip">选中文本后查看可显示选中内容的统计</div>
          </a-card>
        </a-sub-menu>
        <a-menu-divider />
        <a-menu-item key="compare"><span class="mi"><MdiIcon name="compare" /><span>比较文档</span></span></a-menu-item>
        <a-menu-divider />
        <a-sub-menu key="aiTools" popupClassName="gdocs-menu-popper">
          <template #title><span class="mi"><MdiIcon name="robot-outline" /><span>AI 助手</span></span></template>
          <a-menu-item key="aiPanel"><span class="mi"><MdiIcon name="dock-right" /><span>打开 AI 面板</span></span></a-menu-item>
          <a-menu-divider />
          <a-menu-item key="aiPolish" :disabled="!hasSelection"><span class="mi"><MdiIcon name="auto-fix" /><span>AI 润色</span></span></a-menu-item>
          <a-menu-item key="aiSummarize" :disabled="!hasSelection"><span class="mi"><MdiIcon name="text-box-check-outline" /><span>AI 总结</span></span></a-menu-item>
          <a-menu-item key="aiContinue"><span class="mi"><MdiIcon name="pen-plus" /><span>AI 续写</span></span></a-menu-item>
          <a-menu-item key="aiFixGrammar" :disabled="!hasSelection"><span class="mi"><MdiIcon name="spellcheck" /><span>修正语法</span></span></a-menu-item>
          <a-menu-divider />
          <a-sub-menu key="aiTranslate" popupClassName="gdocs-menu-popper">
            <template #title><span class="mi"><MdiIcon name="translate" /><span>AI 翻译</span></span></template>
            <a-menu-item key="aiTranslateEn" :disabled="!hasSelection">翻译为英文</a-menu-item>
            <a-menu-item key="aiTranslateZh" :disabled="!hasSelection">翻译为中文</a-menu-item>
            <a-menu-item key="aiTranslateJa" :disabled="!hasSelection">翻译为日文</a-menu-item>
            <a-menu-item key="aiTranslateKo" :disabled="!hasSelection">翻译为韩文</a-menu-item>
          </a-sub-menu>
          <a-menu-divider />
          <a-menu-item key="aiDocAnalysis"><span class="mi"><MdiIcon name="file-search-outline" /><span>全文分析</span></span></a-menu-item>
          <a-menu-item key="aiLayout"><span class="mi"><MdiIcon name="page-layout-body" /><span>排版建议</span></span></a-menu-item>
          <a-menu-divider />
          <a-menu-item key="aiSettings"><span class="mi"><MdiIcon name="cog-outline" /><span>AI 设置...</span></span></a-menu-item>
        </a-sub-menu>
      </a-sub-menu>

      <!-- 帮助子菜单 -->
      <a-sub-menu key="help" popupClassName="gdocs-menu-popper">
        <template #title>帮助</template>
        <a-menu-item key="helpShortcuts"><div class="mi-row">
          <span class="mi"><MdiIcon name="keyboard-outline" /><span>键盘快捷键</span></span>
          <span class="shortcut">Ctrl+/</span></div>
        </a-menu-item>
      </a-sub-menu>
    </a-menu>

    <!-- 工具栏切换下拉菜单 -->
    <a-dropdown :trigger="['click']" class="toolbar-dropdown">
      <div class="toolbar-switch">
        <MdiIcon name="chevron-down" />
      </div>
      <template #overlay>
        <a-menu @click="({ key }: any) => handleToolbarSwitch(key)">
          <a-menu-item key="professional" :class="{ 'is-active': toolbarMode === 'professional' }">
            <span class="mi"><MdiIcon name="view-headline" /><span>专业工具栏</span></span>
          </a-menu-item>
          <a-menu-item key="simple" :class="{ 'is-active': toolbarMode === 'simple' }">
            <span class="mi"><MdiIcon name="view-column-outline" /><span>简约工具栏</span></span>
          </a-menu-item>
        </a-menu>
      </template>
    </a-dropdown>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, toRefs } from 'vue'
import MdiIcon from '@/components/common/MdiIcon.vue'
import {
  marginPresets, paperSizes, bgColorPalette, watermarkPresets,
  symbolCategories, separatorStyles, formulaCategories, zoomLevels, shapeCategories
} from './index'

const hoverCell = ref({ r: -1, c: -1 })

const toolbarMode = ref<'professional' | 'simple'>('professional')

const emit = defineEmits<{
  (e: 'cmd', cmd: string, ...args: any[]): void
  (e: 'import'): void
  (e: 'preview'): void
  (e: 'download', format: string): void
  (e: 'formula', latex: string): void
  (e: 'symbol', s: string): void
  (e: 'separator', d: { type: string; width: number; dashArray: number[] }): void
  (e: 'watermark', p: any): void
  (e: 'layout', cmd: string): void
  (e: 'view', cmd: string): void
  (e: 'format', cmd: string, value?: any): void
  (e: 'margin', p: any): void
  (e: 'paperSize', s: any): void
  (e: 'bgColor', c: string): void
  (e: 'shape', type: string): void
  (e: 'insertTable', rows: number, cols: number): void
}>()

const props = defineProps<{
  isImporting?: boolean

  selectedBgColor?: string
  zoomPercent?: number
  currentCharacterScale?: number
  currentPaperSizeName?: string
  hasSelection?: boolean
  inTable?: boolean
  inCanvas?: boolean
  showLineBreak?: boolean
  showCollaborationMenu?: boolean
  cursorCollaborationEnabled?: boolean
  selectionCollaborationEnabled?: boolean

  revisionDisplayMode?: 'all' | 'comments' | 'revisions'
  documentStats?: {
    totalPages: number
    wordCount: number
    paragraphCount: number
    charCount: number
    charCountWithSpaces: number
  }
}>()

const { hasSelection } = toRefs(props)
const characterScaleOptions = [200, 150, 100, 90, 80, 66, 50, 33]
const normalizedCharacterScale = computed(() => {
  const value = Number(props.currentCharacterScale ?? 100)
  return Number.isFinite(value) ? Math.round(value) : 100
})

const handleToolbarSwitch = (mode: string) => {
  toolbarMode.value = mode as 'professional' | 'simple'
  emit('cmd', 'switchToolbar', toolbarMode.value)
}

const handleInsertTable = (r: number, c: number) => {
  emit('insertTable', r, c)
}

const getSeparatorStyle = (sep: { type: string; width: number; dashArray: number[] }): Record<string, string> => {
  if (sep.type === 'wavy') return {}
  return {
    borderTopStyle: sep.type as string,
    borderTopWidth: `${sep.width}px`
  }
}

const handleMenuClick = (key: string) => {
  const keyToEmitMap: Record<string, () => void> = {
    new: () => emit('cmd', 'new'),
    import: () => emit('import'),
    save: () => emit('cmd', 'save'),
    downloadDocx: () => emit('download', 'docx'),
    print: () => emit('cmd', 'print'),
    preview: () => emit('preview'),
    rename: () => emit('cmd', 'rename'),
    protectEncrypt: () => emit('cmd', 'protect'),
    protectDoc: () => emit('cmd', 'protectDoc'),
    unprotect: () => emit('cmd', 'unprotect'),
    versionHistory: () => emit('cmd', 'versionHistory'),
    accessPermission: () => emit('cmd', 'accessPermission'),
    feedback: () => emit('cmd', 'feedback'),
    undo: () => emit('cmd', 'undo'),
    redo: () => emit('cmd', 'redo'),
    cut: () => hasSelection.value && emit('cmd', 'cut'),
    copy: () => hasSelection.value && emit('cmd', 'copy'),
    paste: () => emit('cmd', 'paste'),
    pasteNoFormat: () => emit('cmd', 'pasteNoFormat'),
    selectAll: () => emit('cmd', 'selectAll'),
    delete: () => hasSelection.value && emit('cmd', 'delete'),
    search: () => emit('cmd', 'openSearchPanel'),
    bold: () => emit('format', 'bold'),
    italic: () => emit('format', 'italic'),
    underline: () => emit('format', 'underline'),
    strikeout: () => emit('format', 'strikeout'),
    superscript: () => emit('format', 'superscript'),
    subscript: () => emit('format', 'subscript'),
    characterScaleCustom: () => emit('format', 'characterScaleCustom'),
    alignLeft: () => emit('format', 'alignLeft'),
    alignCenter: () => emit('format', 'alignCenter'),
    alignRight: () => emit('format', 'alignRight'),
    alignJustify: () => emit('format', 'alignJustify'),
    lineHeight1: () => emit('format', 'lineHeight', 1),
    'lineHeight1.15': () => emit('format', 'lineHeight', 1.15),
    'lineHeight1.5': () => emit('format', 'lineHeight', 1.5),
    lineHeight2: () => emit('format', 'lineHeight', 2),
    'lineHeight2.5': () => emit('format', 'lineHeight', 2.5),
    lineHeight3: () => emit('format', 'lineHeight', 3),
    lineHeightCustom: () => emit('format', 'lineHeightCustom'),
    indentIncrease: () => emit('cmd', 'indentStep', 'add'),
    indentDecrease: () => emit('cmd', 'indentStep', 'sub'),
    firstLineIndent: () => emit('format', 'firstLineIndent'),
    bulletList: () => emit('format', 'bulletList'),
    numberList: () => emit('format', 'numberList'),
    checkList: () => emit('format', 'checkList'),
    columnsMore: () => emit('format', 'columnsDialog'),
    columns1: () => emit('format', 'columns', 1),
    columns2: () => emit('format', 'columns', 2),
    columns3: () => emit('format', 'columns', 3),
    clearFormat: () => emit('cmd', 'format'),
    customPaperSize: () => emit('layout', 'customPaperSizeDialog'),
    insertBlankPage: () => emit('cmd', 'insertBlankPageBefore'),
    pageBreak: () => emit('cmd', 'pageBreak'),
    columnBreak: () => emit('cmd', 'columnBreak'),
    lineBreak: () => emit('cmd', 'lineBreak'),
    sectionBreakNextPage: () => emit('cmd', 'sectionBreakNextPage'),
    sectionBreakContinuous: () => emit('cmd', 'sectionBreakContinuous'),
    sectionBreakEvenPage: () => emit('cmd', 'sectionBreakEvenPage'),
    sectionBreakOddPage: () => emit('cmd', 'sectionBreakOddPage'),
    insertTableDialog: () => emit('cmd', 'insertTableDialog'),
    image: () => emit('cmd', 'image'),
    audio: () => emit('cmd', 'audio'),
    video: () => emit('cmd', 'video'),
    insertChart: () => emit('cmd', 'insertChart'),
    hyperlink: () => emit('cmd', 'hyperlink'),
    bookmark: () => emit('cmd', 'bookmark'),
    latex: () => emit('cmd', 'latex'),
    separatorDialog: () => emit('cmd', 'separatorDialog'),
    footnote: () => emit('cmd', 'footnote'),
    comment: () => emit('cmd', 'comment'),
    deleteWatermark: () => emit('cmd', 'deleteWatermark'),
    header: () => emit('cmd', 'header'),
    footer: () => emit('cmd', 'footer'),
    pageNumber: () => emit('cmd', 'pageNumberDialog'),
    clearHeader: () => emit('cmd', 'clearHeader'),
    clearFooter: () => emit('cmd', 'clearFooter'),
    fitPage: () => emit('view', 'fitPage'),
    fitWidth: () => emit('view', 'fitWidth'),
    toggleToolbar: () => emit('view', 'toggleToolbar'),
    toggleLeftPanel: () => emit('view', 'toggleLeftPanel'),
    toggleBottomNav: () => emit('view', 'toggleBottomNav'),
    toggleRuler: () => emit('view', 'toggleRuler'),
    toggleLineBreak: () => emit('view', 'toggleLineBreak'),
    toggleEyeCare: () => emit('view', 'toggleEyeCare'),
    tocCustom: () => emit('view', 'tocCustom'),
    tocRemove: () => emit('view', 'tocRemove'),
    revisionPanel: () => emit('cmd', 'openRevisionPanel'),
    toggleCollaborationCursor: () => emit('cmd', 'toggleCollaborationCursor'),
    toggleCollaborationSelection: () => emit('cmd', 'toggleCollaborationSelection'),
    showAllMarks: () => emit('cmd', 'revisionDisplayMode', 'all'),
    showComments: () => emit('cmd', 'revisionDisplayMode', 'comments'),
    showRevisions: () => emit('cmd', 'revisionDisplayMode', 'revisions'),
    barcode: () => emit('cmd', 'barcode'),
    qrcode: () => emit('cmd', 'qrcode'),
    insertDate: () => emit('cmd', 'insertDate'),
    signature: () => emit('cmd', 'signature'),
    compare: () => emit('cmd', 'compare'),
    aiPanel: () => emit('cmd', 'openAIPanel'),
    aiPolish: () => emit('cmd', 'aiPolish'),
    aiSummarize: () => emit('cmd', 'aiSummarize'),
    aiContinue: () => emit('cmd', 'aiContinue'),
    aiFixGrammar: () => emit('cmd', 'aiFixGrammar'),
    aiTranslateEn: () => emit('cmd', 'aiTranslate', 'en'),
    aiTranslateZh: () => emit('cmd', 'aiTranslate', 'zh'),
    aiTranslateJa: () => emit('cmd', 'aiTranslate', 'ja'),
    aiTranslateKo: () => emit('cmd', 'aiTranslate', 'ko'),
    aiDocAnalysis: () => emit('cmd', 'aiDocAnalysis'),
    aiLayout: () => emit('cmd', 'aiLayout'),
    aiSettings: () => emit('cmd', 'aiSettings'),
    helpShortcuts: () => emit('cmd', 'openShortcuts'),
  }

  // Handle character scale keys
  if (key.startsWith('characterScale') && key !== 'characterScaleCustom') {
    const scale = parseInt(key.replace('characterScale', ''))
    if (!isNaN(scale)) {
      emit('format', 'characterScale', scale)
      return
    }
  }

  // Handle zoom keys
  if (key.startsWith('zoom')) {
    const z = parseInt(key.replace('zoom', ''))
    if (!isNaN(z)) {
      emit('view', 'zoom' + z)
      return
    }
  }

  // Handle formula keys
  if (key.startsWith('f-')) {
    const formulaName = key.slice(2)
    for (const cat of formulaCategories) {
      const found = cat.formulas.find(f => f.name === formulaName)
      if (found) {
        emit('formula', found.latex)
        return
      }
    }
    return
  }

  const handler = keyToEmitMap[key]
  if (handler) handler()
}
</script>

<style scoped>
.menu-bar {
  display: flex;
  align-items: center;
  border-bottom: 1px solid rgba(0,0,0,0.1);
  height: 35px;
  background: var(--tabs-bg-color, #f2f4f7);
  padding: 0 4px;
}

/* 水平菜单栏样式 */
.docx-menu-bar {
  border-bottom: none !important;
  background: transparent !important;
  line-height: unset !important;
  height: auto !important;
  flex: 1;
}

.mi {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 400;
}

.mi-row {
  display: inline-flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
}

.mi-row--toggle {
  min-width: 180px;
}

.menu-toggle-check {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  min-width: 16px;
  color: #1677ff;
}

/* 工具栏切换下拉菜单 */
.toolbar-dropdown {
  margin-left: auto;
}
.toolbar-switch {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  margin-right: 10px;
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.2s ease;
  color: var(--tabs-text-color, #3c4043);
}
.toolbar-switch:hover {
  background: rgba(255, 255, 255, 0.2);
}
.toolbar-switch .material-icons {
  width: 16px;
  height: 16px;
}
</style>

<style>
.docx-menu-bar.ant-menu-horizontal {
  border-bottom: none !important;
  background: transparent !important;
  line-height: unset !important;
}
.docx-menu-bar.ant-menu-horizontal > .ant-menu-item,
.docx-menu-bar.ant-menu-horizontal > .ant-menu-submenu {
  padding-inline: 0 !important;
}
.docx-menu-bar .ant-menu-submenu-title {
  padding: 6px 12px !important;
  height: auto !important;
  line-height: 1.4 !important;
  font-size: 13px !important;
  color: var(--tabs-text-color, #3c4043) !important;
  border-radius: 4px !important;
  border-bottom: none !important;
  margin: 0 !important;
}
.docx-menu-bar .ant-menu-submenu-title:hover {
  background: rgba(255,255,255,0.2) !important;
}
.docx-menu-bar .ant-menu-submenu-arrow {
  display: none !important;
}
</style>
