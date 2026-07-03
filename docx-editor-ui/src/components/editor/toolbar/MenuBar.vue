<template>
  <el-menu mode="horizontal" class="menu-bar" :ellipsis="false">
    <!-- 文件菜单 -->
    <el-sub-menu index="file" popper-class="gdocs-menu-popper gdocs-start-popper">
      <template #title>文件</template>
      <el-menu-item index="new" @click="emit('cmd', 'new')"><MdiIcon name="file-plus-outline" />新建文档</el-menu-item>
      <el-menu-item index="import" @click="emit('import')"><MdiIcon name="file-import-outline" />
        {{ isImporting ? '导入中...' : '导入文档' }}&nbsp;&nbsp;&nbsp;
        <span class="shortcut">Ctrl+Alt+O</span>
        <el-tag type="danger" size="small">1.0.1-beta.20260412</el-tag>
      </el-menu-item>
      <el-divider />
      <el-menu-item index="save" @click="emit('cmd', 'save')"><MdiIcon name="content-save-outline" />保存<span class="shortcut">Ctrl+S</span></el-menu-item>
      <el-sub-menu index="download" popper-class="gdocs-menu-popper">
        <template #title><MdiIcon name="download-outline" />下载为</template>
        <el-menu-item index="downloadDocx" @click="emit('download', 'docx')"><MdiIcon name="file-word-outline" />Word文件 (*.docx)</el-menu-item>
      </el-sub-menu>
      <el-menu-item index="print" @click="emit('cmd', 'print')"><MdiIcon name="printer-outline" />打印<span class="shortcut">Ctrl+P</span></el-menu-item>
      <el-menu-item index="preview" @click="emit('preview')"><MdiIcon name="eye-outline" />预览</el-menu-item>
      <el-menu-item index="rename" @click="emit('cmd', 'rename')"><MdiIcon name="rename-box" />重命名</el-menu-item>
      <el-divider />
      <el-menu-item index="protectEncrypt" @click="emit('cmd', 'protect')"><MdiIcon name="lock-outline" />加密文档</el-menu-item>
      <el-menu-item index="protectDoc" @click="emit('cmd', 'protectDoc')"><MdiIcon name="shield-lock-outline" />保护文档</el-menu-item>
      <el-menu-item index="unprotect" @click="emit('cmd', 'unprotect')"><MdiIcon name="lock-open-outline" />解除保护</el-menu-item>
      <el-divider />
      <el-menu-item index="versionHistory" @click="emit('cmd', 'versionHistory')"><MdiIcon name="history" />版本历史</el-menu-item>
      <el-menu-item index="accessPermission" @click="emit('cmd', 'accessPermission')"><MdiIcon name="account-multiple-outline" />访问权限</el-menu-item>
      <el-divider />
      <el-menu-item index="feedback" @click="emit('cmd', 'feedback')"><MdiIcon name="message-outline" />提出功能建议</el-menu-item>
    </el-sub-menu>

    <!-- 编辑菜单 -->
    <el-sub-menu index="edit" popper-class="gdocs-menu-popper">
      <template #title>编辑</template>
      <el-menu-item index="undo" @click="emit('cmd', 'undo')"><MdiIcon name="undo" />撤销<span class="shortcut">Ctrl+Z</span></el-menu-item>
      <el-menu-item index="redo" @click="emit('cmd', 'redo')"><MdiIcon name="redo" />重做<span class="shortcut">Ctrl+Y</span></el-menu-item>
      <el-divider />
      <el-menu-item index="cut" :class="{ disabled: !hasSelection }" @click="hasSelection && emit('cmd', 'cut')"><MdiIcon name="content-cut" />剪切<span class="shortcut">Ctrl+X</span></el-menu-item>
      <el-menu-item index="copy" :class="{ disabled: !hasSelection }" @click="hasSelection && emit('cmd', 'copy')"><MdiIcon name="content-copy" />复制<span class="shortcut">Ctrl+C</span></el-menu-item>
      <el-menu-item index="paste" @click="emit('cmd', 'paste')"><MdiIcon name="content-paste" />粘贴<span class="shortcut">Ctrl+V</span></el-menu-item>
      <el-menu-item index="pasteNoFormat" @click="emit('cmd', 'pasteNoFormat')"><MdiIcon name="clipboard-text-outline" />无格式粘贴<span class="shortcut">Ctrl+Shift+V</span></el-menu-item>
      <el-divider />
      <el-menu-item index="selectAll" @click="emit('cmd', 'selectAll')"><MdiIcon name="select-all" />全选<span class="shortcut">Ctrl+A</span></el-menu-item>
      <el-menu-item index="delete" :class="{ disabled: !hasSelection }" @click="hasSelection && emit('cmd', 'delete')"><MdiIcon name="delete-outline" />删除</el-menu-item>
      <el-divider />
      <el-menu-item index="search" @click="emit('cmd', 'openSearchPanel')"><MdiIcon name="magnify" />查找<span class="shortcut">Ctrl+F</span></el-menu-item>
    </el-sub-menu>

    <!-- 格式菜单 -->
    <el-sub-menu index="format" popper-class="gdocs-menu-popper">
      <template #title>格式</template>
      <el-sub-menu index="textStyle" popper-class="gdocs-menu-popper">
        <template #title><MdiIcon name="format-text" />文本</template>
        <el-menu-item index="bold" @click="emit('cmd', 'bold')"><MdiIcon name="format-bold" />粗体<span class="shortcut">Ctrl+B</span></el-menu-item>
        <el-menu-item index="italic" @click="emit('cmd', 'italic')"><MdiIcon name="format-italic" />斜体<span class="shortcut">Ctrl+I</span></el-menu-item>
        <el-menu-item index="underline" @click="emit('cmd', 'underline')"><MdiIcon name="format-underline" />下划线<span class="shortcut">Ctrl+U</span></el-menu-item>
        <el-menu-item index="strikeout" @click="emit('cmd', 'strikeout')"><MdiIcon name="format-strikethrough" />删除线</el-menu-item>
        <el-menu-item index="superscript" @click="emit('cmd', 'superscript')"><MdiIcon name="format-superscript" />上标</el-menu-item>
        <el-menu-item index="subscript" @click="emit('cmd', 'subscript')"><MdiIcon name="format-subscript" />下标</el-menu-item>
      </el-sub-menu>
      <el-sub-menu
        index="characterScale"
        popper-class="gdocs-menu-popper"
        :disabled="!hasSelection"
        :class="{ 'submenu-disabled': !hasSelection }"
      >
        <template #title>
          <MdiIcon name="format-letter-case" />
          <span>字符缩放</span>
        </template>
        <el-menu-item
          v-for="scale in characterScaleOptions"
          :key="scale"
          :index="'characterScale' + scale"
          :class="{ 'is-current-scale': normalizedCharacterScale === scale }"
          @click="emit('format', 'characterScale', scale)"
        >
          <span
            class="scale-check"
            :class="{ active: normalizedCharacterScale === scale }"
            aria-hidden="true"
          >✓</span>{{ scale }}%
        </el-menu-item>
        <el-divider />
        <el-menu-item index="characterScaleCustom" @click="emit('format', 'characterScaleCustom')">
          <span class="scale-check" aria-hidden="true"></span>其他(M)...
        </el-menu-item>
      </el-sub-menu>
      <el-sub-menu index="paragraphStyle" popper-class="gdocs-menu-popper">
        <template #title><MdiIcon name="format-paragraph" />段落</template>
        <el-sub-menu index="alignment" popper-class="gdocs-menu-popper">
          <template #title><MdiIcon name="format-align-left" />对齐方式</template>
          <el-menu-item index="alignLeft" @click="emit('format', 'alignLeft')"><MdiIcon name="format-align-left" />左对齐</el-menu-item>
          <el-menu-item index="alignCenter" @click="emit('format', 'alignCenter')"><MdiIcon name="format-align-center" />居中对齐</el-menu-item>
          <el-menu-item index="alignRight" @click="emit('format', 'alignRight')"><MdiIcon name="format-align-right" />右对齐</el-menu-item>
          <el-menu-item index="alignJustify" @click="emit('format', 'alignJustify')"><MdiIcon name="format-align-justify" />两端对齐</el-menu-item>
        </el-sub-menu>
        <el-sub-menu index="lineSpacing" popper-class="gdocs-menu-popper">
          <template #title><MdiIcon name="format-line-spacing" />行距</template>
          <el-menu-item index="lineHeight1" @click="emit('format', 'lineHeight', 1)">单倍行距</el-menu-item>
          <el-menu-item index="lineHeight1.15" @click="emit('format', 'lineHeight', 1.15)">1.15 倍行距</el-menu-item>
          <el-menu-item index="lineHeight1.5" @click="emit('format', 'lineHeight', 1.5)">1.5 倍行距</el-menu-item>
          <el-menu-item index="lineHeight2" @click="emit('format', 'lineHeight', 2)">双倍行距</el-menu-item>
          <el-menu-item index="lineHeight2.5" @click="emit('format', 'lineHeight', 2.5)">2.5 倍行距</el-menu-item>
          <el-menu-item index="lineHeight3" @click="emit('format', 'lineHeight', 3)">三倍行距</el-menu-item>
          <el-divider />
          <el-menu-item index="lineHeightCustom" @click="emit('format', 'lineHeightCustom')">自定义行距...</el-menu-item>
        </el-sub-menu>
        <el-divider />
        <el-menu-item index="indentIncrease" @click="emit('cmd', 'indentStep', 'add')"><MdiIcon name="format-indent-increase" />增加缩进</el-menu-item>
        <el-menu-item index="indentDecrease" @click="emit('cmd', 'indentStep', 'sub')"><MdiIcon name="format-indent-decrease" />减少缩进</el-menu-item>
        <el-menu-item index="firstLineIndent" @click="emit('format', 'firstLineIndent')"><MdiIcon name="format-textdirection-l-to-r" />首行缩进</el-menu-item>
      </el-sub-menu>
      <el-sub-menu index="listStyle" popper-class="gdocs-menu-popper">
        <template #title><MdiIcon name="format-list-bulleted" />项目符号和编号</template>
        <el-menu-item index="bulletList" @click="emit('format', 'bulletList')"><MdiIcon name="format-list-bulleted" />项目符号列表</el-menu-item>
        <el-menu-item index="numberList" @click="emit('format', 'numberList')"><MdiIcon name="format-list-numbered" />编号列表</el-menu-item>
        <el-menu-item index="checkList" @click="emit('format', 'checkList')"><MdiIcon name="format-list-checks" />清单</el-menu-item>
      </el-sub-menu>
      <el-divider />
      <el-sub-menu index="columns" popper-class="gdocs-menu-popper gdocs-columns-popper">
        <template #title><MdiIcon name="view-column-outline" />分栏</template>
        <div class="columns-panel">
          <div class="columns-item" @click="emit('format', 'columns', 1)">
            <div class="columns-icon"><div class="col-block"></div></div>
            <span>一栏</span>
          </div>
          <div class="columns-item" @click="emit('format', 'columns', 2)">
            <div class="columns-icon"><div class="col-block"></div><div class="col-block"></div></div>
            <span>两栏</span>
          </div>
          <div class="columns-item" @click="emit('format', 'columns', 3)">
            <div class="columns-icon"><div class="col-block"></div><div class="col-block"></div><div class="col-block"></div></div>
            <span>三栏</span>
          </div>
        </div>
        <el-divider />
        <el-menu-item index="columnsMore" @click="emit('format', 'columnsDialog')"><MdiIcon name="cog-outline" />更多选项...</el-menu-item>
      </el-sub-menu>
      <el-divider />
      <el-menu-item index="clearFormat" @click="emit('cmd', 'format')"><MdiIcon name="format-clear" />清除格式<span class="shortcut">Ctrl+\\</span></el-menu-item>
      <el-divider />
      <el-sub-menu index="direction" popper-class="gdocs-menu-popper gdocs-direction-popper">
        <template #title><MdiIcon name="crop-portrait" />纸张方向</template>
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
      </el-sub-menu>
      <el-sub-menu index="size" popper-class="gdocs-menu-popper gdocs-size-popper">
        <template #title><MdiIcon name="file-outline" />纸张大小</template>
        <div class="size-panel">
          <div class="size-item" v-for="size in paperSizes" :key="size.name" @click="emit('paperSize', size)">
            <div class="size-icon"></div>
            <div class="size-info">
              <div class="size-name">{{ size.name }}</div>
              <div class="size-dimensions">{{ size.displayWidth }} × {{ size.displayHeight }}</div>
            </div>
          </div>
        </div>
        <el-divider />
        <el-menu-item index="customPaperSize" @click="emit('layout', 'customPaperSizeDialog')"><MdiIcon name="cog-outline" />其它页面大小...</el-menu-item>
      </el-sub-menu>
      <el-sub-menu index="margin" popper-class="gdocs-menu-popper gdocs-margin-popper">
        <template #title><MdiIcon name="format-textbox" />页边距</template>
        <div class="margin-presets">
          <div class="preset-item" v-for="preset in marginPresets" :key="preset.name" @click="emit('margin', preset)">
            <div class="page-icon"><div class="page-content" :style="preset.style"></div></div>
            <div class="preset-info">
              <div class="preset-name">{{ preset.name }}</div>
              <div class="preset-grid-values">
                <div class="value-row">
                  <span class="margin-label">上:</span>
                  <span class="margin-val">{{ (preset.margins[0] / 37.8).toFixed(2) }} 厘米</span>
                  <span class="margin-label">下:</span>
                  <span class="margin-val">{{ (preset.margins[2] / 37.8).toFixed(2) }} 厘米</span>
                </div>
                <div class="value-row">
                  <span class="margin-label">左:</span>
                  <span class="margin-val">{{ (preset.margins[3] / 37.8).toFixed(2) }} 厘米</span>
                  <span class="margin-label">右:</span>
                  <span class="margin-val">{{ (preset.margins[1] / 37.8).toFixed(2) }} 厘米</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </el-sub-menu>
      <el-sub-menu index="bgColor" popper-class="gdocs-menu-popper gdocs-bg-popper">
        <template #title><MdiIcon name="format-color-fill" />页面颜色</template>
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
      </el-sub-menu>
    </el-sub-menu>

    <!-- 插入菜单 -->
    <el-sub-menu index="insert" popper-class="gdocs-menu-popper">
      <template #title>插入</template>
      <el-menu-item index="insertBlankPage" @click="emit('cmd', 'insertBlankPageBefore')"><MdiIcon name="file-plus-outline" />空白页</el-menu-item>
      <el-sub-menu index="breaks" popper-class="gdocs-menu-popper">
        <template #title><MdiIcon name="format-page-break" />分隔符</template>
        <el-menu-item index="pageBreak" @click="emit('cmd', 'pageBreak')"><MdiIcon name="format-page-break" />分页符(P)<span class="shortcut">Ctrl+Enter</span></el-menu-item>
        <el-menu-item index="columnBreak" @click="emit('cmd', 'columnBreak')"><MdiIcon name="format-columns" />分栏符(C)</el-menu-item>
        <el-menu-item index="lineBreak" @click="emit('cmd', 'lineBreak')"><MdiIcon name="keyboard-return" />换行符(W)<span class="shortcut">Shift+Enter</span></el-menu-item>
        <el-divider />
        <el-menu-item index="sectionBreakNextPage" @click="emit('cmd', 'sectionBreakNextPage')"><MdiIcon name="file-document-outline" />下一页分节符(N)</el-menu-item>
        <el-menu-item index="sectionBreakContinuous" @click="emit('cmd', 'sectionBreakContinuous')"><MdiIcon name="format-section" />连续分节符(T)</el-menu-item>
        <el-menu-item index="sectionBreakEvenPage" @click="emit('cmd', 'sectionBreakEvenPage')"><MdiIcon name="numeric-2-box-outline" />偶数页分节符(E)</el-menu-item>
        <el-menu-item index="sectionBreakOddPage" @click="emit('cmd', 'sectionBreakOddPage')"><MdiIcon name="numeric-1-box-outline" />奇数页分节符(O)</el-menu-item>
      </el-sub-menu>
      <el-divider />
      <el-sub-menu index="insertTable" popper-class="gdocs-menu-popper gdocs-table-popper">
        <template #title><MdiIcon name="table" />表格</template>
        <div class="table-selector">
          <div class="table-title">插入表格</div>
          <div class="table-grid" @mouseleave="hoverCell = { r: -1, c: -1 }">
            <div v-for="r in 10" :key="r" class="tgrid-row">
              <div v-for="c in 10" :key="c" class="tgrid-cell" :class="{ selected: r <= hoverCell.r + 1 && c <= hoverCell.c + 1 }" @mouseover="hoverCell = { r: r - 1, c: c - 1 }" @click="handleInsertTable(r, c)"></div>
            </div>
          </div>
          <div class="table-info">{{ hoverCell.r >= 0 ? `${hoverCell.r + 1} × ${hoverCell.c + 1}` : '选择大小' }}</div>
        </div>
        <el-divider />
        <el-menu-item index="insertTableDialog" @click="emit('cmd', 'insertTableDialog')"><MdiIcon name="cog-outline" />更多选项...</el-menu-item>
      </el-sub-menu>
      <el-menu-item index="image" @click="emit('cmd', 'image')"><MdiIcon name="image-outline" />图片</el-menu-item>
      <el-sub-menu index="av" popper-class="gdocs-menu-popper">
        <template #title><MdiIcon name="video-outline" />音视频</template>
        <el-menu-item index="audio" @click="emit('cmd', 'audio')"><MdiIcon name="music-note" />音频</el-menu-item>
        <el-menu-item index="video" @click="emit('cmd', 'video')"><MdiIcon name="video-outline" />视频</el-menu-item>
      </el-sub-menu>
      <el-menu-item index="insertChart" @click="emit('cmd', 'insertChart')"><MdiIcon name="chart-bar" />图表</el-menu-item>
      <el-sub-menu index="shapes" popper-class="gdocs-menu-popper gdocs-shapes-popper">
        <template #title><MdiIcon name="shape-outline" />形状</template>
        <el-sub-menu v-for="cat in shapeCategories" :key="cat.name" :index="'shapes-' + cat.name" popper-class="gdocs-menu-popper gdocs-third-popper">
          <template #title><MdiIcon :name="cat.icon" />{{ cat.name }}</template>
          <div class="shapes-grid">
            <div v-for="shape in cat.shapes" :key="shape.type" class="shape-item" @click="emit('shape', shape.type)" :title="shape.name">
              <MdiIcon :name="shape.icon" />
            </div>
          </div>
        </el-sub-menu>
      </el-sub-menu>
      <el-divider />
      <el-menu-item index="hyperlink" @click="emit('cmd', 'hyperlink')"><MdiIcon name="link-variant" />超链接</el-menu-item>
      <el-menu-item index="bookmark" @click="emit('cmd', 'bookmark')"><MdiIcon name="bookmark-outline" />书签</el-menu-item>
      <el-divider />
      <el-sub-menu index="formula" popper-class="gdocs-menu-popper gdocs-formula-popper">
        <template #title><MdiIcon name="function-variant" />公式</template>
        <el-menu-item index="latex" @click="emit('cmd', 'latex')"><MdiIcon name="sigma" />插入LaTeX公式</el-menu-item>
        <el-divider />
        <div class="formula-section-title">常用公式</div>
        <el-sub-menu v-for="cat in formulaCategories" :key="cat.name" :index="'formula-' + cat.name" popper-class="gdocs-menu-popper gdocs-third-popper">
          <template #title><span class="formula-category-icon">{{ cat.icon }}</span>{{ cat.name }}</template>
          <el-menu-item v-for="f in cat.formulas" :key="f.name" :index="'f-' + f.name" @click="emit('formula', f.latex)">
            <div class="formula-item-content">
              <div class="formula-name">{{ f.name }}</div>
              <div class="formula-preview">{{ f.preview }}</div>
            </div>
          </el-menu-item>
        </el-sub-menu>
      </el-sub-menu>
      <el-sub-menu index="symbol" popper-class="gdocs-menu-popper gdocs-symbol-popper">
        <template #title><MdiIcon name="omega" />符号</template>
        <div class="symbol-categories">
          <div v-for="category in symbolCategories" :key="category.name" class="symbol-category">
            <div class="symbol-section-title">{{ category.name }}</div>
            <div class="symbol-grid">
              <div class="symbol-item" v-for="s in category.symbols" :key="s" @click="emit('symbol', s)">{{ s }}</div>
            </div>
          </div>
        </div>
      </el-sub-menu>
      <el-sub-menu index="separator" popper-class="gdocs-menu-popper gdocs-separator-popper">
        <template #title><MdiIcon name="minus" />分割线</template>
        <div class="separator-section">
          <div class="separator-section-title">分割线类型</div>
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
        </div>
        <el-divider />
        <el-menu-item index="separatorDialog" @click="emit('cmd', 'separatorDialog')"><MdiIcon name="palette-outline" />分割线颜色</el-menu-item>
      </el-sub-menu>
      <el-divider />
      <el-menu-item index="footnote" @click="emit('cmd', 'footnote')"><MdiIcon name="format-annotation-plus" />脚注</el-menu-item>
      <el-menu-item index="comment" @click="emit('cmd', 'comment')"><MdiIcon name="comment-plus-outline" />评论<span class="shortcut">Ctrl+Alt+M</span></el-menu-item>
      <el-divider />
      <el-sub-menu index="watermark" popper-class="gdocs-menu-popper gdocs-watermark-popper">
        <template #title><MdiIcon name="watermark" />水印</template>
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
        <el-divider />
        <el-menu-item index="deleteWatermark" @click="emit('cmd', 'deleteWatermark')"><MdiIcon name="delete-outline" />删除水印</el-menu-item>
      </el-sub-menu>
      <el-sub-menu index="hf" popper-class="gdocs-menu-popper">
        <template #title><MdiIcon name="page-layout-header-footer" />页眉和页脚</template>
        <el-menu-item index="header" @click="emit('cmd', 'header')">编辑页眉</el-menu-item>
        <el-menu-item index="footer" @click="emit('cmd', 'footer')">编辑页脚</el-menu-item>
        <el-menu-item index="pageNumber" @click="emit('cmd', 'pageNumberDialog')">插入页码</el-menu-item>
        <el-divider />
        <el-menu-item index="clearHeader" @click="emit('cmd', 'clearHeader')">移除页眉</el-menu-item>
        <el-menu-item index="clearFooter" @click="emit('cmd', 'clearFooter')">移除页脚</el-menu-item>
      </el-sub-menu>
    </el-sub-menu>

    <!-- 视图菜单 -->
    <el-sub-menu index="view" popper-class="gdocs-menu-popper">
      <template #title>视图</template>
      <el-sub-menu index="zoom" popper-class="gdocs-menu-popper">
        <template #title><MdiIcon name="magnify-plus-outline" />缩放</template>
        <el-menu-item v-for="z in zoomLevels" :key="z" :index="'zoom' + z" @click="emit('view', 'zoom' + z)">
          <span class="zoom-check"><MdiIcon v-if="zoomPercent === z" name="check" /></span>{{ z }}%
        </el-menu-item>
      </el-sub-menu>
      <el-menu-item index="fitPage" @click="emit('view', 'fitPage')"><MdiIcon name="fit-to-page-outline" />适应页面</el-menu-item>
      <el-menu-item index="fitWidth" @click="emit('view', 'fitWidth')"><MdiIcon name="arrow-expand-horizontal" />适应宽度</el-menu-item>
      <el-divider />

      <el-menu-item index="toggleToolbar" @click="emit('view', 'toggleToolbar')"><MdiIcon name="view-headline" />显示/隐藏工具栏</el-menu-item>
      <el-menu-item index="toggleLeftPanel" @click="emit('view', 'toggleLeftPanel')"><MdiIcon name="page-layout-sidebar-left" />显示/隐藏左侧面板</el-menu-item>
      <el-menu-item index="toggleBottomNav" @click="emit('view', 'toggleBottomNav')"><MdiIcon name="dock-bottom" />显示/隐藏状态栏</el-menu-item>
      <el-menu-item index="toggleRuler" @click="emit('view', 'toggleRuler')"><MdiIcon name="ruler" />显示/隐藏标尺</el-menu-item>
      <el-menu-item index="toggleLineBreak" @click="emit('view', 'toggleLineBreak')"><MdiIcon :name="showLineBreak ? 'checkbox-marked-outline' : 'checkbox-blank-outline'" />显示换行符</el-menu-item>
      <el-divider />
      <el-menu-item index="toggleEyeCare" @click="emit('view', 'toggleEyeCare')"><MdiIcon name="eye-outline" />护眼模式</el-menu-item>
      <el-divider />
      <el-sub-menu index="toc" popper-class="gdocs-menu-popper gdocs-toc-popper">
        <template #title><MdiIcon name="table-of-contents" />目录</template>
        <div class="toc-section">
          <div class="toc-section-title">自动目录</div>
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
        </div>
        <el-divider />
        <el-menu-item index="tocCustom" @click="emit('view', 'tocCustom')"><MdiIcon name="cog-outline" />自定义目录(C)...</el-menu-item>
        <el-menu-item index="tocRemove" @click="emit('view', 'tocRemove')"><MdiIcon name="delete-outline" />删除目录(R)</el-menu-item>
      </el-sub-menu>
    </el-sub-menu>

    <!-- 审阅菜单 -->
    <el-sub-menu index="review" popper-class="gdocs-menu-popper">
      <template #title>审阅</template>

      <el-sub-menu index="revisionDisplay" popper-class="gdocs-menu-popper">
        <template #title><MdiIcon name="eye-outline" />显示标记选项</template>
        <el-menu-item index="showAllMarks" @click="emit('cmd', 'revisionDisplayMode', 'all')" title="同时显示批注卡片和修订卡片">
          <MdiIcon :name="revisionDisplayMode === 'all' ? 'checkbox-marked-outline' : 'checkbox-blank-outline'" />显示所有批注和修订
        </el-menu-item>
        <el-menu-item index="showComments" @click="emit('cmd', 'revisionDisplayMode', 'comments')" title="仅显示批注卡片，隐藏修订卡片">
          <MdiIcon :name="revisionDisplayMode === 'comments' ? 'checkbox-marked-outline' : 'checkbox-blank-outline'" />仅显示批注
        </el-menu-item>
        <el-menu-item index="showRevisions" @click="emit('cmd', 'revisionDisplayMode', 'revisions')" title="仅显示修订卡片，隐藏批注卡片">
          <MdiIcon :name="revisionDisplayMode === 'revisions' ? 'checkbox-marked-outline' : 'checkbox-blank-outline'" />仅显示修订
        </el-menu-item>
      </el-sub-menu>
      <el-divider />
      <el-menu-item index="revisionPanel" @click="emit('cmd', 'openRevisionPanel')"><MdiIcon name="dock-right" />修订面板</el-menu-item>
    </el-sub-menu>

    <!-- 工具菜单 -->
    <el-sub-menu index="tools" popper-class="gdocs-menu-popper">
      <template #title>工具</template>
      <el-menu-item index="barcode" @click="emit('cmd', 'barcode')"><MdiIcon name="barcode" />条形码</el-menu-item>
      <el-menu-item index="qrcode" @click="emit('cmd', 'qrcode')"><MdiIcon name="qrcode" />二维码</el-menu-item>
      <el-divider />
      <el-menu-item index="insertDate" @click="emit('cmd', 'insertDate')"><MdiIcon name="calendar-clock" />日期和时间</el-menu-item>
      <el-menu-item index="signature" @click="emit('cmd', 'signature')"><MdiIcon name="draw" />电子签名</el-menu-item>
      <el-divider />
      <el-sub-menu index="spellcheckSub" popper-class="gdocs-menu-popper gdocs-spellcheck-popper">
        <template #title><MdiIcon name="spellcheck" />拼写检查</template>
        <div class="spellcheck-panel">
          <div class="sp-header">拼写检查</div>
          <div class="sp-status">
            <MdiIcon name="check-circle" class="sp-ok" />
            <span>未发现拼写错误</span>
          </div>
          <div class="sp-actions">
            <button class="sp-btn" @click="emit('cmd', 'spellcheck')">重新检查</button>
          </div>
          <div class="sp-tip">支持中文、英文拼写检查</div>
        </div>
      </el-sub-menu>
      <el-sub-menu index="wordCountSub" popper-class="gdocs-menu-popper gdocs-wordcount-popper">
        <template #title><MdiIcon name="counter" />字数统计</template>
        <div class="wordcount-panel">
          <div class="wc-header">字数统计</div>
          <div class="wc-grid">
            <div class="wc-row"><span class="wc-label">页数</span><span class="wc-value">{{ documentStats?.totalPages || 0 }}</span></div>
            <div class="wc-row"><span class="wc-label">字数</span><span class="wc-value">{{ documentStats?.wordCount || 0 }}</span></div>
            <div class="wc-row"><span class="wc-label">字符（不含空格）</span><span class="wc-value">{{ documentStats?.charCount || 0 }}</span></div>
            <div class="wc-row"><span class="wc-label">字符（含空格）</span><span class="wc-value">{{ documentStats?.charCountWithSpaces || 0 }}</span></div>
            <div class="wc-row"><span class="wc-label">段落</span><span class="wc-value">{{ documentStats?.paragraphCount || 0 }}</span></div>
          </div>
          <div class="wc-tip">选中文本后查看可显示选中内容的统计</div>
        </div>
      </el-sub-menu>
      <el-divider />
      <el-menu-item index="compare" @click="emit('cmd', 'compare')"><MdiIcon name="compare" />比较文档</el-menu-item>
      <el-divider />
      <el-sub-menu index="aiTools" popper-class="gdocs-menu-popper">
        <template #title><MdiIcon name="robot-outline" />AI 助手</template>
        <el-menu-item index="aiPanel" @click="emit('cmd', 'openAIPanel')"><MdiIcon name="dock-right" />打开 AI 面板</el-menu-item>
        <el-divider />
        <el-menu-item index="aiPolish" :disabled="!hasSelection" @click="emit('cmd', 'aiPolish')"><MdiIcon name="auto-fix" />AI 润色</el-menu-item>
        <el-menu-item index="aiSummarize" :disabled="!hasSelection" @click="emit('cmd', 'aiSummarize')"><MdiIcon name="text-box-check-outline" />AI 总结</el-menu-item>
        <el-menu-item index="aiContinue" @click="emit('cmd', 'aiContinue')"><MdiIcon name="pen-plus" />AI 续写</el-menu-item>
        <el-menu-item index="aiFixGrammar" :disabled="!hasSelection" @click="emit('cmd', 'aiFixGrammar')"><MdiIcon name="spellcheck" />修正语法</el-menu-item>
        <el-divider />
        <el-sub-menu index="aiTranslate" popper-class="gdocs-menu-popper">
          <template #title><MdiIcon name="translate" />AI 翻译</template>
          <el-menu-item index="aiTranslateEn" :disabled="!hasSelection" @click="emit('cmd', 'aiTranslate', 'en')">翻译为英文</el-menu-item>
          <el-menu-item index="aiTranslateZh" :disabled="!hasSelection" @click="emit('cmd', 'aiTranslate', 'zh')">翻译为中文</el-menu-item>
          <el-menu-item index="aiTranslateJa" :disabled="!hasSelection" @click="emit('cmd', 'aiTranslate', 'ja')">翻译为日文</el-menu-item>
          <el-menu-item index="aiTranslateKo" :disabled="!hasSelection" @click="emit('cmd', 'aiTranslate', 'ko')">翻译为韩文</el-menu-item>
        </el-sub-menu>
        <el-divider />
        <el-menu-item index="aiDocAnalysis" @click="emit('cmd', 'aiDocAnalysis')"><MdiIcon name="file-search-outline" />全文分析</el-menu-item>
        <el-menu-item index="aiLayout" @click="emit('cmd', 'aiLayout')"><MdiIcon name="page-layout-body" />排版建议</el-menu-item>
        <el-divider />
        <el-menu-item index="aiSettings" @click="emit('cmd', 'aiSettings')"><MdiIcon name="cog-outline" />AI 设置...</el-menu-item>
      </el-sub-menu>
    </el-sub-menu>

    <!-- 帮助子菜单 -->
    <el-sub-menu index="help" popper-class="gdocs-menu-popper">
      <template #title>
        <span>帮助</span>
      </template>
      <el-menu-item index="helpShortcuts" @click="emit('cmd', 'openShortcuts')">
        <MdiIcon name="keyboard-outline" />
        键盘快捷键
        <span class="shortcut">Ctrl+/</span>
      </el-menu-item>

    </el-sub-menu>

    <!-- 工具栏切换下拉菜单 -->
    <el-dropdown trigger="click" @command="handleToolbarSwitch" class="toolbar-dropdown">
      <div class="toolbar-switch">
        <MdiIcon name="chevron-down" />
      </div>
      <template #dropdown>
        <el-dropdown-menu>
          <el-dropdown-item command="professional" :class="{ 'is-active': toolbarMode === 'professional' }">
            <MdiIcon name="view-headline" />
            专业工具栏
          </el-dropdown-item>
          <el-dropdown-item command="simple" :class="{ 'is-active': toolbarMode === 'simple' }">
            <MdiIcon name="view-column-outline" />
            简约工具栏
          </el-dropdown-item>
        </el-dropdown-menu>
      </template>
    </el-dropdown>
  </el-menu>
</template>

<script setup lang="ts">
import { computed, ref, toRefs } from 'vue'
import MdiIcon from '@/components/common/MdiIcon.vue'
import {
  marginPresets, paperSizes, bgColorPalette, watermarkPresets,
  symbolCategories, separatorStyles, formulaCategories, zoomLevels, shapeCategories
} from './index'

const hoverCell = ref({ r: -1, c: -1 })

// 工具栏模式：professional（专业）或 simple（简约）
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

const handleInsertTable = (r: number, c: number) => {
  emit('insertTable', r, c)
}

// 获取分割线预览样式
const getSeparatorStyle = (sep: { type: string; width: number; dashArray: number[] }) => {
  if (sep.type === 'wavy') return {}
  return {
    borderTopStyle: sep.type,
    borderTopWidth: `${sep.width}px`
  }
}

const props = defineProps<{
  isImporting?: boolean

  selectedBgColor?: string
  zoomPercent?: number
  currentCharacterScale?: number
  hasSelection?: boolean
  inTable?: boolean
  inCanvas?: boolean
  showLineBreak?: boolean

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

// 工具栏切换处理函数
const handleToolbarSwitch = (mode: string) => {
  toolbarMode.value = mode as 'professional' | 'simple'
  emit('cmd', 'switchToolbar', toolbarMode.value)
}
</script>

<style scoped>
.menu-bar { border-bottom: 1px solid rgba(0,0,0,0.1) !important; height: auto !important; background: var(--tabs-bg-color, #f2f4f7) !important; }
.menu-bar :deep(.el-menu--horizontal) { border-bottom: none !important; background: transparent !important; }
.menu-bar :deep(.el-sub-menu__title) { padding: 6px 12px !important; height: auto !important; line-height: 1.4 !important; font-size: 13px !important; color: var(--tabs-text-color, #3c4043) !important; border-radius: 4px !important; border-bottom: none !important; }
.menu-bar :deep(.el-sub-menu__title:hover) { background: rgba(255,255,255,0.2) !important; }
.menu-bar :deep(.el-sub-menu.is-opened > .el-sub-menu__title) { background: rgba(255,255,255,0.3) !important; }
.menu-bar :deep(.el-sub-menu__icon-arrow) { display: none !important; }
.menu-bar :deep(.el-menu-item), .menu-bar :deep(.el-sub-menu .el-sub-menu__title) { height: auto !important; line-height: 1.6 !important; }
.menu-bar :deep(.el-menu-item .material-icons), .menu-bar :deep(.el-sub-menu .el-sub-menu__title .material-icons) { margin-right: 8px !important; }
.theme-check, .zoom-check { display: inline-flex; align-items: center; justify-content: center; width: 16px; margin-right: 8px; color: #1a73e8; flex-shrink: 0; }
.scale-check { display: inline-flex; align-items: center; justify-content: center; width: 16px; margin-right: 8px; color: transparent; flex-shrink: 0; font-size: 14px; line-height: 1; }
.scale-check.active { color: #202124; }
.menu-bar :deep(.is-current-scale) { color: #1a73e8; }

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

/* 下拉菜单项样式 */
:deep(.el-dropdown-menu__item) {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  padding: 8px 16px;
}
:deep(.el-dropdown-menu__item .material-icons) {
  width: 18px;
  height: 18px;
  color: #5f6368;
  flex-shrink: 0;
}
:deep(.el-dropdown-menu__item:hover .material-icons) {
  color: #1a73e8;
}
:deep(.el-dropdown-menu__item.is-active) {
  color: #1a73e8;
  background-color: #e8f0fe;
  font-weight: 500;
}
:deep(.el-dropdown-menu__item.is-active .material-icons) {
  color: #1a73e8;
}

/* 页边距预设 */
.margin-presets { height: auto; overflow-y: auto; }
.preset-item { display: flex; align-items: center; padding: 8px 12px; cursor: pointer; border-radius: 4px; gap: 12px; }
.preset-item:hover { background-color: #f0f7ff; }
.page-icon { width: 40px; height: 52px; border: 1px solid #909399; background: #fff; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.page-content { background: #e6f7ff; width: 100%; height: 100%; }
.preset-info { flex: 1; min-width: 0; }
.preset-name { font-weight: bold; color: #303133; margin-bottom: 4px; font-size: 13px; }
.preset-grid-values { display: flex; flex-direction: column; gap: 2px; }
.value-row { display: grid; grid-template-columns: 20px 70px 20px 70px; font-size: 11px; color: #909399; }

/* 纸张方向 */
.direction-panel { display: flex; gap: 10px; }
.direction-item { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 10px 6px; cursor: pointer; border-radius: 4px; border: 1px solid #dcdfe6; }
.direction-item:hover { background-color: #f0f7ff; border-color: #409eff; }
.direction-icon { border: 2px solid #606266; background: #fff; }
.vertical-icon { width: 36px; height: 48px; }
.horizontal-icon { width: 48px; height: 36px; }
.direction-item span { font-size: 12px; color: #606266; }

/* 纸张大小 */
.size-panel { min-height: 280px; overflow-y: auto; }
.size-item { display: flex; align-items: center; gap: 10px; padding: 6px 12px; cursor: pointer; border-radius: 4px; }
.size-item:hover { background-color: #f5f7fa; }
.size-icon { width: 20px; height: 28px; border: 1px solid #909399; background: #fff; flex-shrink: 0; }
.size-info { flex: 1; }
.size-name { font-size: 13px; color: #303133; font-weight: 500; }
.size-dimensions { font-size: 11px; color: #909399; margin-top: 2px; }

/* 页面颜色 */
.bg-menu { padding: 6px 0; }
.bg-item { display: flex; align-items: center; gap: 8px; padding: 6px 10px; cursor: pointer; color: #303133; font-size: 13px; }
.bg-item:hover { background: #f5f7fa; }
.bg-check { width: 16px; height: 16px; display: flex; align-items: center; justify-content: center; color: #409eff; flex-shrink: 0; }
.bg-item-text { flex: 1; }
.bg-divider { height: 1px; background: #ebeef5; margin: 6px 0; }
.bg-section-title { padding: 4px 10px 8px; font-size: 12px; color: #909399; font-weight: 600; }
.bg-grid { display: grid; grid-template-columns: repeat(10, 18px); justify-content: start; gap: 4px; padding: 0 10px 6px; }
.bg-color { width: 18px; height: 18px; border: 1px solid #dcdfe6; border-radius: 2px; cursor: pointer; padding: 0; }
.bg-color:hover { transform: scale(1.1); }
.bg-color.selected { border-color: #409eff; box-shadow: 0 0 0 1px #409eff inset; }

/* 水印 */
.wm-section { margin-bottom: 10px; }
.wm-section-title { font-size: 12px; color: #909399; font-weight: 600; margin-bottom: 8px; }
.wm-custom-add { width: 70px; height: 80px; border: 1px dashed #dcdfe6; border-radius: 4px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; cursor: pointer; color: #909399; }
.wm-custom-add:hover { border-color: #409eff; color: #409eff; }
.wm-custom-add .material-icons { width: 20px; height: 20px; }
.wm-custom-add span { font-size: 11px; }
.wm-preset-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
.wm-preset-item { display: flex; flex-direction: column; align-items: center; cursor: pointer; }
.wm-preset-preview { width: 70px; height: 80px; border: 1px solid #e4e7ed; background: #fff; display: flex; align-items: center; justify-content: center; margin-bottom: 4px; border-radius: 4px; }
.wm-preset-preview span { font-size: 11px; color: #dcdfe6; transform: rotate(-45deg); white-space: nowrap; }
.wm-preset-item:hover .wm-preset-preview { border-color: #409eff; background-color: #f0f7ff; }
.wm-preset-name { font-size: 11px; color: #606266; }

/* 符号 */
.symbol-categories { max-height: 400px; overflow-y: auto; }
.symbol-category { margin-bottom: 12px; }
.symbol-category:last-child { margin-bottom: 0; }
.symbol-section-title { font-size: 12px; color: #909399; font-weight: 600; margin-bottom: 8px; }
.symbol-grid { display: grid; grid-template-columns: repeat(12, 1fr); gap: 2px; }
.symbol-item { width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; font-size: 14px; cursor: pointer; border-radius: 2px; }
.symbol-item:hover { background: #e8f0fe; color: #1a73e8; }

/* 分割线 */
.separator-section { padding: 8px 12px; }
.separator-section-title { font-size: 12px; color: #5f6368; font-weight: 500; margin-bottom: 8px; }
.separator-list { display: flex; flex-direction: column; gap: 4px; width: 100%; }
.separator-item { padding: 8px 12px; cursor: pointer; border-radius: 4px; display: flex; align-items: center; width: 100%; box-sizing: border-box; }
.separator-item:hover { background: #f5f7fa; }
.separator-preview { flex: 1; height: 0; border-top: 1px solid #606266; }
.separator-preview.wavy { border: none; height: 6px; background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='6' viewBox='0 0 20 6'%3E%3Cpath d='M0 3 Q5 0 10 3 T20 3' stroke='%23606266' fill='none' stroke-width='1'/%3E%3C/svg%3E") repeat-x; }

/* 公式 */
.formula-section-title { font-size: 12px; color: #909399; padding: 6px 12px 4px; }
.formula-category-icon { width: 24px; font-size: 11px; color: #5f6368; }
.formula-item-content { display: flex; flex-direction: column; width: 100%; }
.formula-name { font-size: 13px; color: #303133; }
.formula-preview { font-size: 11px; color: #909399; margin-top: 2px; }

/* 拼写检查面板 */
.spellcheck-panel { padding: 12px; min-width: 200px; }
.sp-header { font-size: 14px; font-weight: 500; color: #202124; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid #e8eaed; }
.sp-status { display: flex; align-items: center; gap: 8px; padding: 8px 0; }
.sp-ok { color: #34a853; font-size: 20px; }
.sp-status span { font-size: 13px; color: #202124; }
.sp-actions { margin-top: 8px; }
.sp-btn { width: 100%; padding: 6px 12px; background: #1a73e8; color: #fff; border: none; border-radius: 4px; cursor: pointer; font-size: 13px; }
.sp-btn:hover { background: #1557b0; }
.sp-tip { margin-top: 10px; font-size: 11px; color: #9aa0a6; }

/* 字数统计面板 */
.wordcount-panel { padding: 12px; min-width: 220px; }
.wc-header { font-size: 14px; font-weight: 500; color: #202124; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid #e8eaed; }
.wc-grid { display: flex; flex-direction: column; gap: 8px; }
.wc-row { display: flex; justify-content: space-between; align-items: center; }
.wc-label { font-size: 13px; color: #5f6368; }
.wc-value { font-size: 13px; color: #202124; font-weight: 500; }
.wc-tip { margin-top: 12px; padding-top: 8px; border-top: 1px solid #e8eaed; font-size: 11px; color: #9aa0a6; }

/* 表格选择器 */
.table-selector { padding: 8px; }
.table-title { font-size: 12px; color: #5f6368; margin-bottom: 8px; padding-bottom: 6px; border-bottom: 1px solid #e8eaed; }
.table-grid { display: flex; flex-direction: column; gap: 2px; }
.tgrid-row { display: flex; gap: 2px; }
.tgrid-cell { width: 18px; height: 18px; border: 1px solid #dadce0; cursor: pointer; transition: all 0.1s; background: #fff; }
.tgrid-cell:hover { border-color: #1a73e8; }
.tgrid-cell.selected { background: #e8f0fe; border-color: #1a73e8; }
.table-info { margin-top: 8px; font-size: 12px; color: #5f6368; text-align: center; }

/* 形状网格 */
.shapes-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 6px; padding: 8px 12px; min-width: 240px; box-sizing: border-box; }
.shape-item { width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; border: 1px solid #dadce0; border-radius: 4px; cursor: pointer; background: #fff; transition: all 0.15s; }
.shape-item:hover { background: #e8f0fe; border-color: #1a73e8; color: #1a73e8; }
.shape-item .material-icons { width: 20px; height: 20px; color: #5f6368; }
.shape-item:hover .material-icons { color: #1a73e8; }

:deep(.gdocs-third-popper .el-menu) { padding: 6px 0; }
:deep(.gdocs-third-popper .el-menu-item) { padding: 8px 12px !important; height: auto !important; line-height: 1.4 !important; }
:deep(.gdocs-third-popper .el-sub-menu__title) { padding: 8px 12px !important; }

/* 快捷键 */
.shortcut { margin-left: auto; padding-left: 24px; color: #9aa0a6; font-size: 12px; }

/* 禁用状态 */
.menu-bar :deep(.el-menu-item.disabled) { color: #c0c4cc !important; cursor: not-allowed !important; }
.menu-bar :deep(.el-menu-item.disabled:hover) { background: transparent !important; }
.menu-bar :deep(.el-menu-item.disabled i) { color: #c0c4cc !important; }
.disabled-tip { margin-left: 8px; font-size: 11px; color: #c0c4cc; }

/* 子菜单禁用 */
.menu-bar :deep(.submenu-disabled > .el-sub-menu__title) { color: #c0c4cc !important; }
.menu-bar :deep(.submenu-disabled > .el-sub-menu__title i) { color: #c0c4cc !important; }
.menu-bar :deep(.submenu-disabled > .el-sub-menu__title .material-icons) { color: #c0c4cc !important; }

/* 面板禁用 */
.panel-disabled { opacity: 0.5; pointer-events: none; }
</style>
