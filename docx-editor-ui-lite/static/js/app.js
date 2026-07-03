import { WordEditor, RowFlex, TitleLevel, ListType, ListStyle, parseDocx } from '../../src/editor/index.ts'

const testData = {
  main: []
}

let documentMeta = {
  id: 'DEU' + Array.from({length: 4}, () => Math.random().toString(16).slice(2).toUpperCase().padEnd(4, '0').slice(0, 4)).join(''),
  name: '新建文档',
  createdAt: new Date().toISOString(),
  submittedAt: ''
}

let importModeResolver = null

const editor = new WordEditor({
  container: '#editor-container',
  data: testData,
  options: {
    width: 794,
    height: 1123,
    margins: [96, 120, 96, 120],
    defaultFont: '微软雅黑',
    defaultSize: 14,
    marginIndicatorDisabled: true,
    lineBreak: { disabled: false, color: '#AAAAAA' }
  },
  onPageChange: (pageNo) => {
    const el = document.getElementById('status-page')
    if (el) el.textContent = `第 ${pageNo} 页`
  },
  onChange: () => {
    updateWordCount()
    debounceRefreshCatalog()
  },
  onScaleChange: (scale) => {
    const pct = `${Math.round(scale * 100)}%`
    document.getElementById('zoom-value').textContent = pct
    const statusZoom = document.getElementById('status-zoom')
    if (statusZoom) statusZoom.textContent = pct
  }
})

function updateWordCount() {
  try {
    const result = editor.command.getWordCount()
    const count = result?.count ?? 0
    document.getElementById('status-words').textContent = `${count} 字`
  } catch (e) {
    // ignore
  }
}

setTimeout(() => updateWordCount(), 500)

window.editor = editor
window.RowFlex = RowFlex
window.TitleLevel = TitleLevel
window.ListType = ListType
window.ListStyle = ListStyle

window.execCmd = (cmd, ...args) => {
  try {
    focusEditorAgent()
    editor.command[cmd](...args)
  } catch (e) { console.error(`执行失败: ${cmd}`, e) }
}

function focusEditorAgent() {
  try {
    const container = document.getElementById('editor-container')
    const agentDom = container?.querySelector('textarea')
    if (agentDom && typeof agentDom.focus === 'function') {
      agentDom.focus()
    }
  } catch (e) { /* ignore */ }
}

window.setRowFlex = (flex) => { editor.command.executeRowFlex(RowFlex[flex]) }
window.setTitle = (level) => {
  if (!level) { editor.command.executeTitle(null); return }
  const levels = {
    '1': TitleLevel.FIRST, '2': TitleLevel.SECOND, '3': TitleLevel.THIRD,
    '4': TitleLevel.FOURTH, '5': TitleLevel.FIFTH, '6': TitleLevel.SIXTH
  }
  editor.command.executeTitle(levels[level])
}
window.setList = (type) => {
  if (type === 'OL') { editor.command.executeList(ListType.OL, ListStyle.DECIMAL) }
  else { editor.command.executeList(ListType.UL, ListStyle.DISC) }
}
window.setLineHeight = (value) => { editor.command.executeLineHeight(parseFloat(value)) }

window.showPopup = (id) => { document.getElementById('popup-overlay').classList.add('show'); document.getElementById(id).classList.add('show') }
window.closePopup = () => { document.getElementById('popup-overlay').classList.remove('show'); document.querySelectorAll('.popup-panel').forEach(p => p.classList.remove('show')) }

window.insertTable = () => showPopup('table-popup')
window.confirmInsertTable = () => { const rows = parseInt(document.getElementById('table-rows').value) || 3; const cols = parseInt(document.getElementById('table-cols').value) || 4; editor.command.executeInsertTable(rows, cols); closePopup() }

window.insertHyperlink = () => showPopup('link-popup')
window.confirmInsertLink = () => { const text = document.getElementById('link-text').value; const url = document.getElementById('link-url').value; if (url) { editor.command.executeHyperlink({ type: 'hyperlink', value: text || url, url }); } closePopup() }

window.insertImage = () => {
  const input = document.createElement('input'); input.type = 'file'; input.accept = 'image/*'
  input.onchange = (e) => {
    const file = e.target.files[0]; if (!file) return
    const reader = new FileReader()
    reader.onload = (event) => {
      const img = new Image(); img.onload = () => { const maxWidth = 400; const scale = img.width > maxWidth ? maxWidth / img.width : 1; editor.command.executeImage({ value: event.target.result, width: img.width * scale, height: img.height * scale }) }; img.src = event.target.result
    }
    reader.readAsDataURL(file)
  }
  input.click()
}

window.searchReplace = () => showPopup('search-popup')
window.doSearch = () => { const text = document.getElementById('search-text').value; if (text) { const result = editor.command.executeSearch(text); alert(`找到 ${result?.count || 0} 处匹配`) } }
window.doReplace = () => { const search = document.getElementById('search-text').value; const replace = document.getElementById('replace-text').value; if (search) { editor.command.executeReplace(replace) } }
window.doReplaceAll = () => { const search = document.getElementById('search-text').value; const replace = document.getElementById('replace-text').value; if (search) { editor.command.executeSearch(search); let count = 0; while (editor.command.executeReplace(replace)) { count++; if (count > 1000) break; } alert(`已替换 ${count} 处`) } }

window.showShortcutsDialog = () => showPopup('shortcuts-popup')

// 菜单下拉交互
let activeDropdown = null
document.addEventListener('click', (e) => {
  if (activeDropdown) {
    activeDropdown.classList.remove('show')
    activeDropdown = null
  }
  const menuItem = e.target.closest('.menu-item')
  if (menuItem) {
    const dropdown = menuItem.querySelector('.dropdown-menu')
    if (dropdown) {
      e.stopPropagation()
      if (dropdown !== activeDropdown) {
        if (activeDropdown) activeDropdown.classList.remove('show')
        dropdown.classList.add('show')
        activeDropdown = dropdown
      }
    }
  }
})

// 确保编辑器保持焦点（core快捷键监听在agentDom上）
const editorContainer = document.getElementById('editor-container')
if (editorContainer) {
  const focusEditor = () => {
    try {
      const agentDom = editor.instance?.command?.__proxyGetAgentDom?.() 
        || editorContainer.querySelector('textarea')
      if (agentDom && typeof agentDom.focus === 'function') {
        agentDom.focus()
      }
    } catch (e) { /* ignore */ }
  }

  document.addEventListener('mousedown', (e) => {
    const target = e.target
    if (target && !editorContainer.contains(target) && !target.closest('.toolbar') && !target.closest('.menu-bar') && !target.closest('.popup-panel') && !target.closest('.status-bar') && !target.closest('.catalog-sidebar')) {
      setTimeout(focusEditor, 0)
    }
  })
}

// 快捷键全局监听
const editorContainerEl = document.getElementById('editor-container')
document.addEventListener('keydown', (e) => {
  // 如果事件已被core库处理（焦点在编辑器内），则跳过编辑器内置快捷键
  const inEditor = editorContainerEl && editorContainerEl.contains(e.target)
  const ctrl = e.ctrlKey || e.metaKey
  const shift = e.shiftKey
  const key = e.key.toLowerCase()

  // 应用级快捷键（始终拦截）
  if (ctrl && key === 's') { e.preventDefault(); handleSave(); return }
  if (ctrl && key === 'p') { e.preventDefault(); execCmd('executePrint'); return }
  if (ctrl && key === 'f') { e.preventDefault(); searchReplace(); return }
  if (ctrl && key === 'h') { e.preventDefault(); searchReplace(); return }

  // 编辑器内置快捷键：仅焦点不在编辑器时兜底处理
  if (inEditor) return
  if (ctrl && !shift && key === 'z') { e.preventDefault(); execCmd('executeUndo'); return }
  if (ctrl && shift && key === 'z') { e.preventDefault(); execCmd('executeRedo'); return }
  if (ctrl && key === 'y') { e.preventDefault(); execCmd('executeRedo'); return }
  if (ctrl && key === 'b') { e.preventDefault(); execCmd('executeBold'); return }
  if (ctrl && key === 'i') { e.preventDefault(); execCmd('executeItalic'); return }
  if (ctrl && key === 'u') { e.preventDefault(); execCmd('executeUnderline'); return }
  if (ctrl && key === 'k') { e.preventDefault(); insertHyperlink(); return }
  if (ctrl && key === '\\') { e.preventDefault(); execCmd('executeFormat'); return }
  if (ctrl && key === 'enter') { e.preventDefault(); execCmd('executePageBreak'); return }
})

// 保存功能
window.handleSave = () => {
  const indicator = document.getElementById('save-indicator')
  try {
    const content = editor.command.getValue()
    if (!content) return
    const snapshot = { meta: { ...documentMeta }, content }
    documentMeta.submittedAt = new Date().toISOString()
    indicator.textContent = '保存中...'
    indicator.classList.add('saving')
    setTimeout(() => {
      indicator.textContent = `已保存 ${formatTime(new Date())}`
      indicator.classList.remove('saving')
      console.log('[save] 保存快照:', snapshot)
    }, 300)
  } catch (e) {
    indicator.textContent = '保存失败'
    indicator.classList.remove('saving')
    console.error('保存失败:', e)
  }
}

function formatTime(date) {
  return `${String(date.getHours()).padStart(2,'0')}:${String(date.getMinutes()).padStart(2,'0')}:${String(date.getSeconds()).padStart(2,'0')}`
}

// 导入文档功能
window.handleImportDoc = () => {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.docx,.doc'
  input.onchange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const fileSize = file.size < 1024 * 1024
      ? `${(file.size / 1024).toFixed(1)} KB`
      : `${(file.size / 1024 / 1024).toFixed(1)} MB`

    const notification = document.getElementById('import-notification')
    document.getElementById('import-info').textContent = `${file.name} (${fileSize})`
    notification.classList.add('show')

    importModeResolver = (mode) => {
      notification.classList.remove('show')
      if (mode === 'cancel') return

      const hex = () => Math.random().toString(16).slice(2).toUpperCase().padEnd(4, '0').slice(0, 4)
      const newId = 'DEU' + hex() + hex() + hex() + hex()
      documentMeta.id = newId
      documentMeta.name = file.name.replace(/\.\w+$/, '')
      const titleInput = document.getElementById('doc-title')
      titleInput.value = documentMeta.name
      titleInput.title = documentMeta.name

      const reader = new FileReader()
      reader.onload = async (event) => {
        try {
          const arrayBuffer = event.target.result
          const result = await parseDocx(arrayBuffer)

          if (!result.success || !result.elements || result.elements.length === 0) {
            alert('文档解析失败: ' + (result.error || '未知错误'))
            return
          }

          if (mode === 'overwrite') {
            editor.command.executeSetValue({ main: result.elements })
          } else {
            const current = editor.command.getValue()
            const currentElements = current?.data?.main || current?.main || []
            const merged = [...currentElements, ...result.elements]
            editor.command.executeSetValue({ main: merged })
          }

          updateWordCount()
          refreshCatalog()
          handleSave()
        } catch (err) {
          console.error('导入失败:', err)
          alert('导入失败: ' + (err.message || '未知错误'))
        }
      }
      reader.readAsArrayBuffer(file)
    }
  }
  input.click()
}

window.handleImportAction = (mode) => {
  if (importModeResolver) {
    const resolver = importModeResolver
    importModeResolver = null
    resolver(mode)
  }
}

// 文档标题同步
document.getElementById('doc-title').addEventListener('input', (e) => {
  documentMeta.name = e.target.value
  e.target.title = e.target.value
})

// 目录功能
const levelOrderMap = {
  first: 1, second: 2, third: 3, fourth: 4, fifth: 5, sixth: 6
}

let catalogOpen = true
let catalogRefreshTimer = null

const debounceRefreshCatalog = () => {
  if (catalogRefreshTimer) clearTimeout(catalogRefreshTimer)
  catalogRefreshTimer = setTimeout(() => refreshCatalog(), 1000)
}

async function refreshCatalog() {
  try {
    const catalog = await editor.command.getCatalog()
    renderCatalog(Array.isArray(catalog) ? catalog : [])
  } catch (e) {
    // ignore
  }
}

function getLevelNumber(level) {
  if (typeof level === 'number') return level
  return levelOrderMap[level] || 1
}

function renderCatalog(catalog) {
  const treeEl = document.getElementById('catalog-tree')
  const emptyEl = document.getElementById('catalog-empty')

  treeEl.querySelectorAll('.catalog-node').forEach(n => n.remove())

  if (!catalog || catalog.length === 0) {
    emptyEl.style.display = 'block'
    return
  }
  emptyEl.style.display = 'none'

  const renderItems = (items) => {
    for (const item of items) {
      const node = document.createElement('div')
      node.className = `catalog-node level-${getLevelNumber(item.level)}`
      node.textContent = item.name || ''
      node.title = item.name || ''
      if (item.id) {
        node.addEventListener('click', () => {
          try { editor.command.executeLocationCatalog(item.id) } catch (e) { console.error('定位失败:', e) }
        })
      }
      treeEl.appendChild(node)
      if (item.subCatalog && item.subCatalog.length > 0) {
        renderItems(item.subCatalog)
      }
    }
  }
  renderItems(catalog)
}

window.toggleCatalog = (checked) => {
  catalogOpen = typeof checked === 'boolean' ? checked : !catalogOpen
  const sidebar = document.getElementById('catalog-sidebar')
  const cb = document.getElementById('catalog-toggle-cb')
  if (catalogOpen) {
    sidebar.classList.add('open')
    if (cb) cb.checked = true
    refreshCatalog()
  } else {
    sidebar.classList.remove('open')
    if (cb) cb.checked = false
  }
}

// 初始化时打开目录并刷新
setTimeout(() => {
  const sidebar = document.getElementById('catalog-sidebar')
  if (sidebar) sidebar.classList.add('open')
  refreshCatalog()
}, 800)

// 纸张方向切换
let paperDirection = 'vertical'
window.togglePaperDirection = () => {
  paperDirection = paperDirection === 'vertical' ? 'horizontal' : 'vertical'
  document.getElementById('paper-direction-btn').textContent = paperDirection === 'vertical' ? '纵向' : '横向'
  try {
    editor.command.executePaperDirection(paperDirection)
  } catch (e) { console.error('切换纸张方向失败:', e) }
}

// 纸张大小选择
let paperSizeMenuOpen = false
window.togglePaperSizeMenu = () => {
  paperSizeMenuOpen = !paperSizeMenuOpen
  const dropdown = document.getElementById('paper-size-dropdown')
  if (paperSizeMenuOpen) {
    dropdown.classList.add('show')
  } else {
    dropdown.classList.remove('show')
  }
}

document.addEventListener('click', (e) => {
  if (paperSizeMenuOpen && !e.target.closest('.paper-size-wrap')) {
    paperSizeMenuOpen = false
    document.getElementById('paper-size-dropdown').classList.remove('show')
  }
})

window.setPaperSize = (width, height, label) => {
  document.getElementById('paper-size-btn').textContent = label
  paperSizeMenuOpen = false
  document.getElementById('paper-size-dropdown').classList.remove('show')
  document.querySelectorAll('.paper-size-item').forEach(item => {
    item.classList.toggle('active', item.dataset.label === label)
  })
  try {
    const w = paperDirection === 'horizontal' ? height : width
    const h = paperDirection === 'horizontal' ? width : height
    editor.command.executePaperSize(w, h)
  } catch (e) { console.error('设置纸张大小失败:', e) }
}

console.log('DocxEditor UI Lite 初始化成功！')
