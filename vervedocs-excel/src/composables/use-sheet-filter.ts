import { reactive, ref, type ComputedRef } from 'vue'
import { message } from 'ant-design-vue'

const FILTER_EMPTY_TOKEN = '__EMPTY__'

interface FilterSheet {
  rowCount: number
  cells: Record<string, string>
  hiddenRows?: Record<number, boolean>
}

interface FilterSelected {
  row: number
  col: number
}

export function useSheetFilter(options: {
  getActiveSheet: ComputedRef<FilterSheet | undefined>
  selected: FilterSelected
  cellKey: (row: number, col: number) => string
  columnLabel: (col: number) => string
  syncFilterStateToActiveSheet: () => void
  emitChange: () => void
}) {
  const { getActiveSheet, selected, cellKey, columnLabel, syncFilterStateToActiveSheet, emitChange } = options

  const filterActive = ref(false)
  const filterColumn = ref<number | null>(null)
  const filterKeyword = ref('')
  const filteredRows = reactive<Record<number, boolean>>({})
  const filterPopoverVisible = ref(false)
  const filterValueOptions = ref<string[]>([])
  const filterSelectedValues = reactive<Record<string, boolean>>({})

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
    const sheet = getActiveSheet.value
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
    const sheet = getActiveSheet.value
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

  return {
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
  }
}
