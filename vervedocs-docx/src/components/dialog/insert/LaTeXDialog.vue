<template>
  <el-dialog v-model="visible" title="插入LaTeX公式" width="800px" :close-on-click-modal="false" class="app-dialog">
    <!-- 输入和预览并排 -->
    <div class="input-preview-row">
      <div class="input-section">
        <div class="section-label">LaTeX 公式</div>
        <el-input
          type="textarea"
          v-model="latexForm.content"
          :rows="4"
          placeholder="输入LaTeX公式，如：\frac{-b\pm\sqrt{b^2-4ac}}{2a}"
          @input="handlePreview"
        />
      </div>
      <div class="preview-section">
        <div class="section-label">预览</div>
        <div class="latex-preview">
          <div v-if="previewError" class="preview-error">{{ previewError }}</div>
          <img v-else-if="previewSvg" :src="previewSvg" class="preview-image" alt="Preview" />
          <div v-else class="preview-placeholder">公式预览</div>
        </div>
      </div>
    </div>

    <!-- 公式分类 Tab -->
    <div class="latex-examples">
      <el-tabs v-model="activeTab" class="formula-tabs">
        <!-- 结构类 -->
        <el-tab-pane label="分数" name="fraction">
          <div class="examples-grid">
            <div class="example-item" v-for="ex in fractionFormulas" :key="ex.latex" @click="fillExample(ex.latex)">
              <img v-if="ex.preview" :src="ex.preview" class="example-preview" />
              <span class="example-name">{{ ex.name }}</span>
            </div>
          </div>
        </el-tab-pane>
        <el-tab-pane label="上下标" name="script">
          <div class="examples-grid">
            <div class="example-item" v-for="ex in scriptFormulas" :key="ex.latex" @click="fillExample(ex.latex)">
              <img v-if="ex.preview" :src="ex.preview" class="example-preview" />
              <span class="example-name">{{ ex.name }}</span>
            </div>
          </div>
        </el-tab-pane>
        <el-tab-pane label="根式" name="radical">
          <div class="examples-grid">
            <div class="example-item" v-for="ex in radicalFormulas" :key="ex.latex" @click="fillExample(ex.latex)">
              <img v-if="ex.preview" :src="ex.preview" class="example-preview" />
              <span class="example-name">{{ ex.name }}</span>
            </div>
          </div>
        </el-tab-pane>
        <el-tab-pane label="积分" name="integral">
          <div class="examples-grid">
            <div class="example-item" v-for="ex in integralFormulas" :key="ex.latex" @click="fillExample(ex.latex)">
              <img v-if="ex.preview" :src="ex.preview" class="example-preview" />
              <span class="example-name">{{ ex.name }}</span>
            </div>
          </div>
        </el-tab-pane>
        <el-tab-pane label="大型运算符" name="largeop">
          <div class="examples-grid">
            <div class="example-item" v-for="ex in largeopFormulas" :key="ex.latex" @click="fillExample(ex.latex)">
              <img v-if="ex.preview" :src="ex.preview" class="example-preview" />
              <span class="example-name">{{ ex.name }}</span>
            </div>
          </div>
        </el-tab-pane>
        <el-tab-pane label="括号" name="bracket">
          <div class="examples-grid">
            <div class="example-item" v-for="ex in bracketFormulas" :key="ex.latex" @click="fillExample(ex.latex)">
              <img v-if="ex.preview" :src="ex.preview" class="example-preview" />
              <span class="example-name">{{ ex.name }}</span>
            </div>
          </div>
        </el-tab-pane>
        <el-tab-pane label="函数" name="function">
          <div class="examples-grid">
            <div class="example-item" v-for="ex in functionFormulas" :key="ex.latex" @click="fillExample(ex.latex)">
              <img v-if="ex.preview" :src="ex.preview" class="example-preview" />
              <span class="example-name">{{ ex.name }}</span>
            </div>
          </div>
        </el-tab-pane>
        <el-tab-pane label="极限对数" name="limit">
          <div class="examples-grid">
            <div class="example-item" v-for="ex in limitFormulas" :key="ex.latex" @click="fillExample(ex.latex)">
              <img v-if="ex.preview" :src="ex.preview" class="example-preview" />
              <span class="example-name">{{ ex.name }}</span>
            </div>
          </div>
        </el-tab-pane>
        <el-tab-pane label="矩阵" name="matrix">
          <div class="examples-grid">
            <div class="example-item" v-for="ex in matrixFormulas" :key="ex.latex" @click="fillExample(ex.latex)">
              <img v-if="ex.preview" :src="ex.preview" class="example-preview" />
              <span class="example-name">{{ ex.name }}</span>
            </div>
          </div>
        </el-tab-pane>
        <el-tab-pane label="希腊字母" name="greek">
          <div class="examples-grid greek-grid">
            <div class="example-item small" v-for="ex in greekFormulas" :key="ex.latex" @click="fillExample(ex.latex)">
              <img v-if="ex.preview" :src="ex.preview" class="example-preview small" />
              <span class="example-name">{{ ex.name }}</span>
            </div>
          </div>
        </el-tab-pane>
      </el-tabs>
    </div>
    <template #footer>
      <el-button type="primary" @click="confirmLatex" :disabled="!latexForm.content.trim()">
        <el-icon><Check /></el-icon>
        确定
      </el-button>
      <el-button @click="visible = false">
        <el-icon><Close /></el-icon>
        取消
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { LaTexParticle } from '@vervedoc/core'
import { Check, Close } from '@element-plus/icons-vue'

interface FormulaExample {
  name: string
  latex: string
  preview?: string
}

const props = defineProps<{
  modelValue: boolean
  initialLatex?: string
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'confirm', latex: string): void
}>()

const visible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const latexForm = ref({ content: '' })
const previewSvg = ref('')
const previewError = ref('')
const activeTab = ref('fraction')

// 生成公式预览
const generateFormulaPreview = (latex: string): string => {
  try {
    const svg = LaTexParticle.convertLaTextToSVG(latex)
    return svg?.svg || ''
  } catch {
    return ''
  }
}

// 分数公式
const fractionFormulas = ref<FormulaExample[]>([
  { name: '简单分数', latex: '\\frac{a}{b}' },
  { name: '带系数分数', latex: '\\frac{x+1}{x-1}' },
  { name: '嵌套分数', latex: '\\frac{1}{1+\\frac{1}{x}}' },
  { name: '连分数', latex: '\\frac{1}{a+\\frac{1}{b+\\frac{1}{c}}}' },
  { name: '偏导数', latex: '\\frac{\\partial f}{\\partial x}' },
  { name: '求导', latex: '\\frac{dy}{dx}' },
  { name: '二阶导数', latex: '\\frac{d^2y}{dx^2}' },
  { name: '斜分数', latex: 'a/b' }
])

// 上下标公式
const scriptFormulas = ref<FormulaExample[]>([
  { name: '上标', latex: 'x^2' },
  { name: '下标', latex: 'x_i' },
  { name: '上下标', latex: 'x_i^2' },
  { name: '多级上标', latex: 'e^{x^2}' },
  { name: '指数', latex: 'e^{i\\pi}+1=0' },
  { name: '化学下标', latex: 'H_2O' },
  { name: '向量下标', latex: 'a_{ij}' },
  { name: '求和下标', latex: '\\sum_{i=1}^{n}' }
])

// 根式公式
const radicalFormulas = ref<FormulaExample[]>([
  { name: '平方根', latex: '\\sqrt{x}' },
  { name: '带系数根', latex: '\\sqrt{a^2+b^2}' },
  { name: '立方根', latex: '\\sqrt[3]{x}' },
  { name: 'n次根', latex: '\\sqrt[n]{x}' },
  { name: '嵌套根式', latex: '\\sqrt{1+\\sqrt{x}}' },
  { name: '求根公式', latex: 'x=\\frac{-b\\pm\\sqrt{b^2-4ac}}{2a}' },
  { name: '复杂根式', latex: '\\sqrt{\\frac{a}{b}}' },
  { name: '根式分数', latex: '\\frac{1}{\\sqrt{2}}' }
])

// 积分公式
const integralFormulas = ref<FormulaExample[]>([
  { name: '不定积分', latex: '\\int f(x)dx' },
  { name: '定积分', latex: '\\int_{a}^{b}f(x)dx' },
  { name: '二重积分', latex: '\\int\\int f(x,y)dxdy' },
  { name: '三重积分', latex: '\\int\\int\\int f dV' },
  { name: '曲线积分', latex: '\\oint_C f ds' },
  { name: '曲面积分', latex: '\\oint\\oint_S f dS' },
  { name: '积分示例', latex: '\\int_0^{\\infty}e^{-x^2}dx' },
  { name: '分部积分', latex: '\\int u dv=uv-\\int v du' }
])

// 大型运算符
const largeopFormulas = ref<FormulaExample[]>([
  { name: '求和', latex: '\\sum_{i=1}^{n}a_i' },
  { name: '连乘', latex: '\\prod_{i=1}^{n}a_i' },
  { name: '并集', latex: '\\bigcup_{i=1}^{n}A_i' },
  { name: '交集', latex: '\\bigcap_{i=1}^{n}A_i' },
  { name: '极限求和', latex: '\\sum_{n=0}^{\\infty}' },
  { name: '双重求和', latex: '\\sum_{i}\\sum_{j}a_{ij}' },
  { name: '级数', latex: '\\sum_{n=1}^{\\infty}\\frac{1}{n^2}' },
  { name: '余积', latex: '\\coprod_{i=1}^{n}' }
])

// 括号公式
const bracketFormulas = ref<FormulaExample[]>([
  { name: '小括号', latex: '(a+b)' },
  { name: '中括号', latex: '[a+b]' },
  { name: '大括号', latex: '\\{a+b\\}' },
  { name: '尖括号', latex: '\\langle a,b \\rangle' },
  { name: '绝对值', latex: '|x|' },
  { name: '范数', latex: '\\|x\\|' },
  { name: '向下取整', latex: '\\lfloor x \\rfloor' },
  { name: '向上取整', latex: '\\lceil x \\rceil' }
])

// 函数公式
const functionFormulas = ref<FormulaExample[]>([
  { name: '正弦', latex: '\\sin\\theta' },
  { name: '余弦', latex: '\\cos\\theta' },
  { name: '正切', latex: '\\tan\\theta' },
  { name: '反正弦', latex: '\\arcsin x' },
  { name: '反余弦', latex: '\\arccos x' },
  { name: '反正切', latex: '\\arctan x' },
  { name: '双曲正弦', latex: '\\sinh x' },
  { name: '双曲余弦', latex: '\\cosh x' },
  { name: '指数函数', latex: '\\exp(x)' },
  { name: '最大值', latex: '\\max(a,b)' },
  { name: '最小值', latex: '\\min(a,b)' },
  { name: '模运算', latex: 'a \\mod b' }
])

// 极限和对数
const limitFormulas = ref<FormulaExample[]>([
  { name: '极限', latex: '\\lim_{x\\to\\infty}' },
  { name: '趋近于0', latex: '\\lim_{x\\to 0}' },
  { name: '极限定义', latex: '\\lim_{n\\to\\infty}a_n=L' },
  { name: '自然对数', latex: '\\ln x' },
  { name: '常用对数', latex: '\\lg x' },
  { name: '对数', latex: '\\log_a x' },
  { name: '换底公式', latex: '\\log_a b=\\frac{\\ln b}{\\ln a}' },
  { name: '导数极限', latex: '\\lim_{h\\to 0}\\frac{f(x+h)-f(x)}{h}' }
])

// 矩阵公式
const matrixFormulas = ref<FormulaExample[]>([
  { name: '2×2矩阵', latex: '\\begin{pmatrix}a&b\\\\c&d\\end{pmatrix}' },
  { name: '方括号矩阵', latex: '\\begin{bmatrix}a&b\\\\c&d\\end{bmatrix}' },
  { name: '行列式', latex: '\\begin{vmatrix}a&b\\\\c&d\\end{vmatrix}' },
  { name: '3×3矩阵', latex: '\\begin{pmatrix}a&b&c\\\\d&e&f\\\\g&h&i\\end{pmatrix}' },
  { name: '单位矩阵', latex: '\\begin{pmatrix}1&0\\\\0&1\\end{pmatrix}' },
  { name: '增广矩阵', latex: '\\begin{pmatrix}a&b&|&c\\\\d&e&|&f\\end{pmatrix}' },
  { name: '列向量', latex: '\\begin{pmatrix}x\\\\y\\\\z\\end{pmatrix}' },
  { name: '行向量', latex: '\\begin{pmatrix}x&y&z\\end{pmatrix}' }
])

// 希腊字母
const greekFormulas = ref<FormulaExample[]>([
  { name: 'α', latex: '\\alpha' },
  { name: 'β', latex: '\\beta' },
  { name: 'γ', latex: '\\gamma' },
  { name: 'δ', latex: '\\delta' },
  { name: 'ε', latex: '\\epsilon' },
  { name: 'ζ', latex: '\\zeta' },
  { name: 'η', latex: '\\eta' },
  { name: 'θ', latex: '\\theta' },
  { name: 'ι', latex: '\\iota' },
  { name: 'κ', latex: '\\kappa' },
  { name: 'λ', latex: '\\lambda' },
  { name: 'μ', latex: '\\mu' },
  { name: 'ν', latex: '\\nu' },
  { name: 'ξ', latex: '\\xi' },
  { name: 'π', latex: '\\pi' },
  { name: 'ρ', latex: '\\rho' },
  { name: 'σ', latex: '\\sigma' },
  { name: 'τ', latex: '\\tau' },
  { name: 'υ', latex: '\\upsilon' },
  { name: 'φ', latex: '\\phi' },
  { name: 'χ', latex: '\\chi' },
  { name: 'ψ', latex: '\\psi' },
  { name: 'ω', latex: '\\omega' },
  { name: 'Γ', latex: '\\Gamma' },
  { name: 'Δ', latex: '\\Delta' },
  { name: 'Θ', latex: '\\Theta' },
  { name: 'Λ', latex: '\\Lambda' },
  { name: 'Π', latex: '\\Pi' },
  { name: 'Σ', latex: '\\Sigma' },
  { name: 'Φ', latex: '\\Phi' },
  { name: 'Ψ', latex: '\\Psi' },
  { name: 'Ω', latex: '\\Omega' }
])

// 初始化预览
const initPreviews = () => {
  const allFormulas = [
    fractionFormulas, scriptFormulas, radicalFormulas, integralFormulas,
    largeopFormulas, bracketFormulas, functionFormulas, limitFormulas,
    matrixFormulas, greekFormulas
  ]
  allFormulas.forEach(formulas => {
    formulas.value.forEach(f => {
      f.preview = generateFormulaPreview(f.latex)
    })
  })
}

// 监听对话框打开
watch(() => props.modelValue, (val) => {
  if (val) {
    latexForm.value.content = props.initialLatex || ''
    if (props.initialLatex) {
      handlePreview()
    } else {
      previewSvg.value = ''
      previewError.value = ''
    }
  }
})

onMounted(() => {
  initPreviews()
})

// 防抖预览
let previewTimer: ReturnType<typeof setTimeout> | null = null
const handlePreview = () => {
  if (previewTimer) clearTimeout(previewTimer)
  previewTimer = setTimeout(() => {
    const latex = latexForm.value.content.trim()
    if (!latex) {
      previewSvg.value = ''
      previewError.value = ''
      return
    }
    try {
      const svg = LaTexParticle.convertLaTextToSVG(latex)
      if (svg?.svg) {
        previewSvg.value = svg.svg
        previewError.value = ''
      } else {
        previewError.value = '无法解析LaTeX公式'
      }
    } catch (error: any) {
      previewError.value = '公式解析错误：' + (error.message || '请检查语法')
      previewSvg.value = ''
    }
  }, 300)
}

const fillExample = (latex: string) => {
  latexForm.value.content = latex
  handlePreview()
}

const confirmLatex = () => {
  const latex = latexForm.value.content.trim()
  if (latex) {
    emit('confirm', latex)
    visible.value = false
  }
}
</script>

<style scoped>
.input-preview-row {
  display: flex;
  gap: 16px;
  margin-bottom: 16px;
}

.input-section {
  flex: 1;
}

.preview-section {
  width: 280px;
  flex-shrink: 0;
}

.section-label {
  font-size: 13px;
  color: #606266;
  margin-bottom: 8px;
  font-weight: 500;
}

.latex-preview {
  height: 100px;
  padding: 12px;
  background: #fafafa;
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: auto;
}

.preview-placeholder {
  color: #c0c4cc;
  font-size: 13px;
}

.preview-error {
  color: #f56c6c;
  font-size: 12px;
  text-align: center;
}

.preview-image {
  max-width: 100%;
  max-height: 80px;
  height: auto;
}

.latex-examples {
  border-top: 1px solid #ebeef5;
  padding-top: 12px;
}

.formula-tabs :deep(.el-tabs__header) {
  margin-bottom: 8px;
}

.formula-tabs :deep(.el-tabs__item) {
  font-size: 13px;
  padding: 0 14px;
  height: 32px;
  line-height: 32px;
}

.examples-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  max-height: 180px;
  overflow-y: auto;
  padding: 4px;
}

.examples-grid.greek-grid {
  grid-template-columns: repeat(8, 1fr);
}

.example-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 8px 4px;
  background: #f5f7fa;
  border: 1px solid transparent;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.15s;
  min-height: 55px;
}

.example-item.small {
  min-height: 45px;
  padding: 6px 4px;
}

.example-item:hover {
  background: #ecf5ff;
  border-color: #409eff;
}

.example-preview {
  max-width: 100%;
  max-height: 28px;
  margin-bottom: 4px;
}

.example-preview.small {
  max-height: 18px;
}

.example-name {
  font-size: 11px;
  color: #909399;
  text-align: center;
  line-height: 1.2;
}
</style>
