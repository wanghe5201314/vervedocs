<template>
  <Teleport to="body">
    <div v-if="open" class="file-screen" role="dialog" aria-modal="true" :aria-label="t('ribbon.file.label')">
      <aside class="file-sidebar">
        <button ref="firstFocusable" class="file-back" type="button" @click="close"><span aria-hidden="true">‹</span>{{ t('ribbon.file.back') }}</button>
        <nav class="file-nav" :aria-label="t('ribbon.file.fileOperations')">
          <button v-for="item in mainItems" :key="item.key" class="file-nav-item" :class="{ 'is-disabled': item.key === 'import' && isImporting }" type="button" :disabled="item.key === 'import' && isImporting" @click="run(item.key)">
            <span class="file-nav-label"><VdIcon :name="item.icon" />{{ item.label }}</span><span v-if="item.shortcut" class="file-shortcut">{{ item.shortcut }}</span>
          </button>
        </nav>
        <div class="file-sidebar-bottom">
          <button class="file-nav-item" type="button" @click="run('info')">
            <span class="file-nav-label"><VdIcon name="information-outline" />{{ t('ribbon.file.info') }}</span>
          </button>
        </div>
      </aside>

      <main ref="panel" class="file-content" tabindex="-1" @keydown.esc="close">
        <section v-if="activePage === 'export'" class="file-page">
          <h1>{{ t('ribbon.file.downloadAs') }}</h1>
          <p class="file-lead">{{ t('ribbon.file.downloadHint') }}</p>
          <div class="format-grid" :aria-label="t('ribbon.file.downloadFormat')">
            <button v-for="format in formats" :key="format.name" class="format-button" :class="{ 'is-available': format.available }" type="button" :disabled="!format.available" :aria-disabled="!format.available" :title="format.available ? t('ribbon.file.downloadAsName', { name: format.name }) : `${format.name} ${t('common.notSupported')}`" @click="format.available && run('export', format.value)">
              <span class="format-icon" :style="{ '--format-color': format.color }"><svg viewBox="0 0 70 91" aria-hidden="true"><path d="M1 1h46l22 22v67H1z" fill="currentColor"/><path d="M47 1v22h22" fill="none" stroke="#fff" stroke-width="2" opacity=".35"/><path v-if="format.kind === 'word'" d="M12 42l5 25 7-18 7 18 6-25M38 42h18" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/><path v-else-if="format.kind === 'pdf'" d="M13 60h42M18 42h25c5 0 8 3 8 7s-3 7-8 7H18zM22 42v18" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/><path v-else-if="format.kind === 'bird'" d="M16 58c8-18 17-21 27-18l11 7-9 2 5 10-12-5-8 7zM45 39l4-5" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/><path v-else-if="format.kind === 'book'" d="M13 42c8-4 15-4 22 1v20c-7-5-14-5-22-1zm44 0c-8-4-15-4-22 1v20c7-5 14-5 22-1z" fill="none" stroke="#fff" stroke-width="2.4" stroke-linejoin="round"/><path v-else-if="format.kind === 'code'" d="M27 43l-10 10 10 10m16-20l10 10-10 10M39 39l-8 28" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/><path v-else-if="format.kind === 'image'" d="M12 67l14-16 9 9 8-11 15 18zM23 43a4 4 0 1 0 0 .1" fill="none" stroke="#fff" stroke-width="2.4" stroke-linejoin="round"/><path v-else d="M15 43h40M15 52h40M15 61h28" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/></svg><span>{{ format.name }}</span></span>
            </button>
          </div>
          <p class="format-note">{{ t('ribbon.file.pdfNotSupported') }}</p>
        </section>
        <section v-else-if="activePage === 'info'" class="file-page info-page"><h1>{{ t('ribbon.file.info') }}</h1><div class="info-list"><div><span>{{ t('ribbon.file.docName') }}</span><strong>{{ documentName || t('common.unnamedDocument') }}</strong></div><div><span>{{ t('ribbon.file.pages') }}</span><strong>{{ documentStats?.totalPages ?? '—' }}</strong></div><div><span>{{ t('ribbon.file.wordCount') }}</span><strong>{{ documentStats?.wordCount ?? '—' }}</strong></div><div><span>{{ t('ribbon.file.paragraphs') }}</span><strong>{{ documentStats?.paragraphCount ?? '—' }}</strong></div><div><span>{{ t('ribbon.file.charCount') }}</span><strong>{{ documentStats?.charCount ?? '—' }}</strong></div></div></section>
        <section v-else class="file-page"><h1>{{ pageTitle }}</h1><p class="file-message">{{ pageMessage }}</p></section>
      </main>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { VdIcon } from '@vervedoc/ui'
import { t } from '@/i18n'

const props = withDefaults(defineProps<{
  isImporting?: boolean
  open?: boolean
  documentName?: string
  documentStats?: { totalPages: number; wordCount: number; paragraphCount: number; charCount: number; charCountWithSpaces: number }
}>(), { open: true })
const emit = defineEmits<{ (e: 'command', cmd: string, ...args: any[]): void; (e: 'close'): void }>()
const activePage = ref('export')
const firstFocusable = ref<HTMLButtonElement>()
const panel = ref<HTMLElement>()
const mainItems = computed(() => [
  { key: 'new', label: t('ribbon.file.newItem'), icon: 'file-plus-outline' },
  { key: 'import', label: t('ribbon.file.importItem'), icon: 'file-import-outline', shortcut: 'Ctrl+Alt+O' },
  { key: 'save', label: t('ribbon.file.saveItem'), icon: 'content-save-outline', shortcut: 'Ctrl+S' },
  { key: 'export', label: t('ribbon.file.downloadItem'), icon: 'download-outline' },
  { key: 'print', label: t('ribbon.file.printItem'), icon: 'printer-outline', shortcut: 'Ctrl+P' },
  { key: 'protectDoc', label: t('ribbon.file.protectItem'), icon: 'shield-lock-outline' }
])
const formats = [
  { name: 'Word', value: 'docx', color: '#23477f', kind: 'word', available: true },
  { name: 'PDF', value: 'pdf', color: '#bb493a', kind: 'pdf', available: false }
]
const pageTitle = computed(() => activePage.value === 'protect' ? t('ribbon.file.protectItem') : t('ribbon.file.label'))
const pageMessage = computed(() => activePage.value === 'protect' ? t('ribbon.file.protectHint') : '')
const close = () => emit('close')
const run = async (key: string, ...args: any[]) => {
  if (key === 'import' && props.isImporting) return
  if (key === 'export' && args.length === 0) {
    activePage.value = 'export'
    return
  }
  if (key === 'info') {
    activePage.value = 'info'
    return
  }
  close()
  await nextTick()
  emit('command', key, ...args)
}
const onKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape' && props.open) close()
}
watch(() => props.open, open => { if (open) nextTick(() => { firstFocusable.value?.focus(); panel.value?.focus() }) })
onMounted(() => { window.addEventListener('keydown', onKeydown); if (props.open) nextTick(() => firstFocusable.value?.focus()) })
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))
</script>

<style scoped>
.file-screen { position: fixed; inset: 0; z-index: 2000; display: flex; background: #fff; color: #292929; font-family: Arial, 'Microsoft YaHei', sans-serif; }
.file-sidebar { width: 252px; flex: 0 0 252px; display: flex; flex-direction: column; background: #f3f3f3; border-right: 1px solid #dedede; }
.file-back { height: 55px; border: 0; border-bottom: 1px solid #e1e1e1; background: transparent; text-align: left; padding: 0 25px; font-size: 14px; color: #333; cursor: pointer; }
.file-back span { margin-right: 12px; font-size: 25px; vertical-align: -2px; }
.file-nav { padding-top: 9px; }
.file-nav-item { width: 100%; height: 32px; display: flex; align-items: center; justify-content: space-between; border: 0; padding: 0 25px; background: transparent; color: #333; font-size: 13px; text-align: left; cursor: pointer; }
.file-nav-item:hover:not(:disabled), .file-nav-item:focus-visible { background: #e5e5e5; outline: none; }
.file-nav-label { display: inline-flex; align-items: center; gap: 13px; }
.file-nav-label :deep(svg) { width: 17px; height: 17px; color: #666; }
.file-shortcut { color: #999; font-size: 11px; }
.file-nav-item:disabled { color: #aaa; cursor: not-allowed; }
.file-sidebar-bottom { margin-top: auto; padding: 9px 0 14px; border-top: 1px solid #dedede; }
.file-content { flex: 1; overflow: auto; outline: none; }
.file-page { padding: 31px 30px 50px; }
.file-page h1 { margin: 0; font-size: 16px; font-weight: 500; }
.file-lead { margin: 9px 0 0; color: #999; font-size: 12px; }
.format-grid { display: grid; grid-template-columns: repeat(5, 70px); column-gap: 24px; row-gap: 33px; margin-top: 26px; }
.format-button { width: 70px; height: 91px; padding: 0; border: 0; background: transparent; cursor: pointer; }
.format-button:disabled { cursor: not-allowed; }
.format-icon { position: relative; display: block; width: 70px; height: 91px; color: var(--format-color); font-size: 12px; font-weight: 400; }
.format-icon svg { display: block; width: 70px; height: 91px; }
.format-icon span { position: absolute; right: 7px; bottom: 9px; left: 7px; color: #fff; text-align: center; }
.format-button:not(.is-available) .format-icon { opacity: .96; }
.format-button.is-available:hover .format-icon, .format-button.is-available:focus-visible .format-icon { filter: brightness(1.15); transform: translateY(-1px); }
.format-button:focus-visible { outline: 2px solid #23477f; outline-offset: 4px; }
.format-note { margin: 32px 0 0; font-size: 12px; color: #888; }
.info-page { max-width: 620px; }
.info-list { margin-top: 28px; border-top: 1px solid #eee; }
.info-list div { display: flex; justify-content: space-between; padding: 13px 0; border-bottom: 1px solid #eee; font-size: 13px; }
.info-list span { color: #888; }.info-list strong { font-weight: 400; color: #333; }
.file-message { margin-top: 28px; color: #777; font-size: 13px; }
</style>
