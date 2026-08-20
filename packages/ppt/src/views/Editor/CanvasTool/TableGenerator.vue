<template>
  <div class="table-generator">
    <div class="title">
      <div class="lef">{{ translate('tableGenerator.title') }} {{endCell.length ? `${endCell[0]} x ${endCell[1]}` : ''}}</div>
      <div class="right" @click="isCustom = !isCustom">{{ isCustom ? translate('tableGenerator.back') : translate('tableGenerator.custom') }}</div>
    </div>
    <table 
      @mouseleave="endCell = []" 
      @click="handleClickTable()" 
      v-if="!isCustom"
    >
      <tbody>
        <tr v-for="row in 10" :key="row">
          <td 
            @mouseenter="endCell = [row, col]"
            v-for="col in 10" :key="col"
          >
            <div 
              class="cell" 
              :class="{ 'active': endCell.length && row <= endCell[0] && col <= endCell[1] }"
            ></div>
          </td>
        </tr>
      </tbody>
    </table>

    <div class="custom" v-else>
      <div class="row">
        <div class="label" style="flex: 1;">{{ translate('tableGenerator.row') }}</div>
        <a-input-number
          :min="1"
          :max="20"
          v-model:value="customRow"
          style="flex: 3;"
        />
      </div>
      <div class="row">
        <div class="label" style="flex: 1;">{{ translate('tableGenerator.col') }}</div>
        <a-input-number
          :min="1"
          :max="20"
          v-model:value="customCol"
          style="flex: 3;"
        />
      </div>
      <div class="btns">
        <a-button class="btn" @click="close()">{{ translate('tableGenerator.cancel') }}</a-button>
        <a-button class="btn" type="primary" @click="insertCustomTable()">{{ translate('tableGenerator.confirm') }}</a-button>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref } from 'vue'

import { message } from 'ant-design-vue'

export default defineComponent({
  name: 'table-generator',
  props: {
    t: Function,
  },
  emits: ['insert', 'close'],
  setup(props, { emit }) {
    const endCell = ref<number[]>([])
    const customRow = ref(3)
    const customCol = ref(3)
    const isCustom = ref(false)

    const translate = (key: string, params?: Record<string, string | number>) => {
      if (typeof props.t === 'function') return props.t(key, params)
      const defaults: Record<string, string> = {
        'tableGenerator.title': '表格',
        'tableGenerator.back': '返回',
        'tableGenerator.custom': '自定义',
        'tableGenerator.row': '行数：',
        'tableGenerator.col': '列数：',
        'tableGenerator.cancel': '取消',
        'tableGenerator.confirm': '确认',
        'tableGenerator.rangeWarning': '行数/列数必须在 1~20 之间',
      }
      return defaults[key] || key
    }

    const handleClickTable = () => {
      if (!endCell.value.length) return
      const [row, col] = endCell.value
      emit('insert', { row, col })
    }

    const insertCustomTable = () => {
      if (customRow.value < 1 || customRow.value > 20) return message.warning(translate('tableGenerator.rangeWarning'))
      if (customCol.value < 1 || customCol.value > 20) return message.warning(translate('tableGenerator.rangeWarning'))
      emit('insert', { row: customRow.value, col: customCol.value })
      isCustom.value = false
    }

    const close = () => {
      emit('close')
      isCustom.value = false
    }

    return {
      endCell,
      customRow,
      customCol,
      handleClickTable,
      insertCustomTable,
      isCustom,
      close,
      translate,
    }
  },
})
</script>

<style  scoped>
.table-generator {
  width: 100%;
  margin-top: -12px;
}
.title {
  height: 28px;
  line-height: 28px;
  background-color: #ededed;
  margin: 0 -12px 12px -12px;
  padding: 0 14px;
  font-size: 12px;
  display: flex;
  justify-content: space-between;
  user-select: none;

  .right {
    cursor: pointer;

    &:hover {
      color: #1a73e8;
    }
  }
}
table {
  border-collapse: separate;
}
td {
  width: 23px;
  height: 23px;
  line-height: 23px;
  border: 2px solid #fff;
  background-color: #f7f7f7;
}
.cell {
  width: 100%;
  height: 100%;
  border: 1px solid #dcdcdc;

  &.active {
    background-color: rgba($color: #1a73e8, $alpha: .1);
    border-color: #1a73e8;
  }
}

.custom {
  width: 230px;

  .row {
    display: flex;
    align-items: center;

    & + .row {
      margin-top: 10px;
    }
  }
}

.btns {
  margin-top: 10px;
  text-align: right;

  .btn {
    margin-left: 10px;
  }
}
</style>
