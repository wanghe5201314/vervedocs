<template>
  <VdDialog v-model:open="visible" :title="t('dialog.latex.title')" width="800px" :maskClosable="false" class="app-dialog">
    <div class="input-preview-row">
      <div class="input-section">
        <div class="section-label">{{ t('dialog.latex.formula') }}</div>
        <a-textarea
          v-model:value="latexForm.content"
          :rows="4"
          placeholder="输入LaTeX公式，如：\frac{-b\pm\sqrt{b^2-4ac}}{2a}"
          @input="handlePreview"
        />
      </div>
      <div class="preview-section">
        <div class="section-label">{{ t('dialog.latex.preview') }}</div>
        <div class="latex-preview">
          <div v-if="previewError" class="preview-error">{{ previewError }}</div>
          <img v-else-if="previewSvg" :src="previewSvg" class="preview-image" alt="Preview" />
          <div v-else class="preview-placeholder">{{ t('dialog.latex.formulaPreview') }}</div>
        </div>
      </div>
    </div>

    <div class="latex-examples">
      <a-tabs v-model:activeKey="activeTab" class="formula-tabs" type="card">
        <a-tab-pane :tab="t('dialog.latex.tabFraction')" key="fraction">
          <div class="examples-grid">
            <div class="example-item" v-for="ex in fractionFormulas" :key="ex.latex" @click="fillExample(ex.latex)">
              <img v-if="ex.preview" :src="ex.preview" class="example-preview" />
              <span class="example-name">{{ ex.name }}</span>
            </div>
          </div>
        </a-tab-pane>
        <a-tab-pane :tab="t('dialog.latex.tabScript')" key="script">
          <div class="examples-grid">
            <div class="example-item" v-for="ex in scriptFormulas" :key="ex.latex" @click="fillExample(ex.latex)">
              <img v-if="ex.preview" :src="ex.preview" class="example-preview" />
              <span class="example-name">{{ ex.name }}</span>
            </div>
          </div>
        </a-tab-pane>
        <a-tab-pane :tab="t('dialog.latex.tabRadical')" key="radical">
          <div class="examples-grid">
            <div class="example-item" v-for="ex in radicalFormulas" :key="ex.latex" @click="fillExample(ex.latex)">
              <img v-if="ex.preview" :src="ex.preview" class="example-preview" />
              <span class="example-name">{{ ex.name }}</span>
            </div>
          </div>
        </a-tab-pane>
        <a-tab-pane :tab="t('dialog.latex.tabIntegral')" key="integral">
          <div class="examples-grid">
            <div class="example-item" v-for="ex in integralFormulas" :key="ex.latex" @click="fillExample(ex.latex)">
              <img v-if="ex.preview" :src="ex.preview" class="example-preview" />
              <span class="example-name">{{ ex.name }}</span>
            </div>
          </div>
        </a-tab-pane>
        <a-tab-pane :tab="t('dialog.latex.tabLargeOp')" key="largeop">
          <div class="examples-grid">
            <div class="example-item" v-for="ex in largeopFormulas" :key="ex.latex" @click="fillExample(ex.latex)">
              <img v-if="ex.preview" :src="ex.preview" class="example-preview" />
              <span class="example-name">{{ ex.name }}</span>
            </div>
          </div>
        </a-tab-pane>
        <a-tab-pane :tab="t('dialog.latex.tabBracket')" key="bracket">
          <div class="examples-grid">
            <div class="example-item" v-for="ex in bracketFormulas" :key="ex.latex" @click="fillExample(ex.latex)">
              <img v-if="ex.preview" :src="ex.preview" class="example-preview" />
              <span class="example-name">{{ ex.name }}</span>
            </div>
          </div>
        </a-tab-pane>
        <a-tab-pane :tab="t('dialog.latex.tabFunction')" key="function">
          <div class="examples-grid">
            <div class="example-item" v-for="ex in functionFormulas" :key="ex.latex" @click="fillExample(ex.latex)">
              <img v-if="ex.preview" :src="ex.preview" class="example-preview" />
              <span class="example-name">{{ ex.name }}</span>
            </div>
          </div>
        </a-tab-pane>
        <a-tab-pane :tab="t('dialog.latex.tabLimit')" key="limit">
          <div class="examples-grid">
            <div class="example-item" v-for="ex in limitFormulas" :key="ex.latex" @click="fillExample(ex.latex)">
              <img v-if="ex.preview" :src="ex.preview" class="example-preview" />
              <span class="example-name">{{ ex.name }}</span>
            </div>
          </div>
        </a-tab-pane>
        <a-tab-pane :tab="t('dialog.latex.tabMatrix')" key="matrix">
          <div class="examples-grid">
            <div class="example-item" v-for="ex in matrixFormulas" :key="ex.latex" @click="fillExample(ex.latex)">
              <img v-if="ex.preview" :src="ex.preview" class="example-preview" />
              <span class="example-name">{{ ex.name }}</span>
            </div>
          </div>
        </a-tab-pane>
        <a-tab-pane :tab="t('dialog.latex.tabGreek')" key="greek">
          <div class="examples-grid greek-grid">
            <div class="example-item small" v-for="ex in greekFormulas" :key="ex.latex" @click="fillExample(ex.latex)">
              <img v-if="ex.preview" :src="ex.preview" class="example-preview small" />
              <span class="example-name">{{ ex.name }}</span>
            </div>
          </div>
        </a-tab-pane>
      </a-tabs>
    </div>
    <template #footer>
      <VdButton type="primary" icon="check" @click="confirmLatex" :disabled="!latexForm.content.trim()">{{ t('common.ok') }}</VdButton>
      <VdButton icon="close" @click="visible = false">{{ t('common.cancel') }}</VdButton>
    </template>
  </VdDialog>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { VdDialog, VdButton } from '@vervedoc/ui'
import { LaTexParticle } from '@vervedoc/core'
import { t } from '@/i18n'


/** 公式示例结构 */
interface FormulaExample {
  name: string
  latex: string
  preview?: string
}

/** 组件 props 定义 */
const props = defineProps<{
  modelValue: boolean
  initialLatex?: string
}>()

/** 组件 emits 定义 */
const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'confirm', latex: string): void
}>()

/** 弹窗可见性，双向绑定到 modelValue */
const visible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

/** LaTeX 公式表单数据 */
const latexForm = ref({ content: '' })
/** 预览 SVG 字符串 */
const previewSvg = ref('')
/** 预览错误信息 */
const previewError = ref('')
/** 当前激活的公式示例标签页 */
const activeTab = ref('fraction')

/**
 * 生成 LaTeX 公式的 SVG 预览
 * @param latex LaTeX 公式字符串
 * @returns {string} SVG 字符串，失败返回空字符串
 */
const generateFormulaPreview = (latex: string): string => {
  try {
    const svg = LaTexParticle.convertLaTextToSVG(latex)
    return svg?.svg || ''
  } catch {
    return ''
  }
}

/**
 * 为公式列表生成 SVG 预览
 * @param formulas 公式列表（无 preview 字段）
 * @returns 带 preview 字段的公式列表
 */
const withPreview = (formulas: Array<{ name: string; latex: string }>): FormulaExample[] =>
  formulas.map(f => ({ ...f, preview: generateFormulaPreview(f.latex) }))

/** 分数类公式示例 */
const fractionFormulas = computed<FormulaExample[]>(() => withPreview([
  { name: t('dialog.latex.preset.simpleFraction'), latex: '\\frac{a}{b}' },
  { name: t('dialog.latex.preset.fractionWithCoefficient'), latex: '\\frac{x+1}{x-1}' },
  { name: t('dialog.latex.preset.nestedFraction'), latex: '\\frac{1}{1+\\frac{1}{x}}' },
  { name: t('dialog.latex.preset.continuedFraction'), latex: '\\frac{1}{a+\\frac{1}{b+\\frac{1}{c}}}' },
  { name: t('dialog.latex.preset.partialDerivative'), latex: '\\frac{\\partial f}{\\partial x}' },
  { name: t('dialog.latex.preset.derivative'), latex: '\\frac{dy}{dx}' },
  { name: t('dialog.latex.preset.secondDerivative'), latex: '\\frac{d^2y}{dx^2}' },
  { name: t('dialog.latex.preset.slashFraction'), latex: 'a/b' }
]))

/** 上下标类公式示例 */
const scriptFormulas = computed<FormulaExample[]>(() => withPreview([
  { name: t('dialog.latex.preset.superscript'), latex: 'x^2' },
  { name: t('dialog.latex.preset.subscript'), latex: 'x_i' },
  { name: t('dialog.latex.preset.subSuperscript'), latex: 'x_i^2' },
  { name: t('dialog.latex.preset.multiLevelSuperscript'), latex: 'e^{x^2}' },
  { name: t('dialog.latex.preset.exponential'), latex: 'e^{i\\pi}+1=0' },
  { name: t('dialog.latex.preset.chemicalSubscript'), latex: 'H_2O' },
  { name: t('dialog.latex.preset.vectorSubscript'), latex: 'a_{ij}' },
  { name: t('dialog.latex.preset.summationSubscript'), latex: '\\sum_{i=1}^{n}' }
]))

/** 根式类公式示例 */
const radicalFormulas = computed<FormulaExample[]>(() => withPreview([
  { name: t('dialog.latex.preset.squareRoot'), latex: '\\sqrt{x}' },
  { name: t('dialog.latex.preset.radicalWithCoefficient'), latex: '\\sqrt{a^2+b^2}' },
  { name: t('dialog.latex.preset.cubeRoot'), latex: '\\sqrt[3]{x}' },
  { name: t('dialog.latex.preset.nthRoot'), latex: '\\sqrt[n]{x}' },
  { name: t('dialog.latex.preset.nestedRadical'), latex: '\\sqrt{1+\\sqrt{x}}' },
  { name: t('dialog.latex.preset.rootFormula'), latex: 'x=\\frac{-b\\pm\\sqrt{b^2-4ac}}{2a}' },
  { name: t('dialog.latex.preset.complexRadical'), latex: '\\sqrt{\\frac{a}{b}}' },
  { name: t('dialog.latex.preset.radicalFraction'), latex: '\\frac{1}{\\sqrt{2}}' }
]))

/** 积分类公式示例 */
const integralFormulas = computed<FormulaExample[]>(() => withPreview([
  { name: t('dialog.latex.preset.indefiniteIntegral'), latex: '\\int f(x)dx' },
  { name: t('dialog.latex.preset.definiteIntegral'), latex: '\\int_{a}^{b}f(x)dx' },
  { name: t('dialog.latex.preset.doubleIntegral'), latex: '\\int\\int f(x,y)dxdy' },
  { name: t('dialog.latex.preset.tripleIntegral'), latex: '\\int\\int\\int f dV' },
  { name: t('dialog.latex.preset.lineIntegral'), latex: '\\oint_C f ds' },
  { name: t('dialog.latex.preset.surfaceIntegral'), latex: '\\oint\\oint_S f dS' },
  { name: t('dialog.latex.preset.integralExample'), latex: '\\int_0^{\\infty}e^{-x^2}dx' },
  { name: t('dialog.latex.preset.integrationByParts'), latex: '\\int u dv=uv-\\int v du' }
]))

/** 大型运算符类公式示例 */
const largeopFormulas = computed<FormulaExample[]>(() => withPreview([
  { name: t('dialog.latex.preset.summation'), latex: '\\sum_{i=1}^{n}a_i' },
  { name: t('dialog.latex.preset.product'), latex: '\\prod_{i=1}^{n}a_i' },
  { name: t('dialog.latex.preset.union'), latex: '\\bigcup_{i=1}^{n}A_i' },
  { name: t('dialog.latex.preset.intersection'), latex: '\\bigcap_{i=1}^{n}A_i' },
  { name: t('dialog.latex.preset.limitSum'), latex: '\\sum_{n=0}^{\\infty}' },
  { name: t('dialog.latex.preset.doubleSum'), latex: '\\sum_{i}\\sum_{j}a_{ij}' },
  { name: t('dialog.latex.preset.series'), latex: '\\sum_{n=1}^{\\infty}\\frac{1}{n^2}' },
  { name: t('dialog.latex.preset.coproduct'), latex: '\\coprod_{i=1}^{n}' }
]))

/** 括号类公式示例 */
const bracketFormulas = computed<FormulaExample[]>(() => withPreview([
  { name: t('dialog.latex.preset.parentheses'), latex: '(a+b)' },
  { name: t('dialog.latex.preset.brackets'), latex: '[a+b]' },
  { name: t('dialog.latex.preset.braces'), latex: '\\{a+b\\}' },
  { name: t('dialog.latex.preset.angleBrackets'), latex: '\\langle a,b \\rangle' },
  { name: t('dialog.latex.preset.absoluteValue'), latex: '|x|' },
  { name: t('dialog.latex.preset.norm'), latex: '\\|x\\|' },
  { name: t('dialog.latex.preset.floor'), latex: '\\lfloor x \\rfloor' },
  { name: t('dialog.latex.preset.ceil'), latex: '\\lceil x \\rceil' }
]))

/** 函数类公式示例 */
const functionFormulas = computed<FormulaExample[]>(() => withPreview([
  { name: t('dialog.latex.preset.sine'), latex: '\\sin\\theta' },
  { name: t('dialog.latex.preset.cosine'), latex: '\\cos\\theta' },
  { name: t('dialog.latex.preset.tangent'), latex: '\\tan\\theta' },
  { name: t('dialog.latex.preset.arcsine'), latex: '\\arcsin x' },
  { name: t('dialog.latex.preset.arccosine'), latex: '\\arccos x' },
  { name: t('dialog.latex.preset.arctangent'), latex: '\\arctan x' },
  { name: t('dialog.latex.preset.hyperbolicSine'), latex: '\\sinh x' },
  { name: t('dialog.latex.preset.hyperbolicCosine'), latex: '\\cosh x' },
  { name: t('dialog.latex.preset.exponentialFunction'), latex: '\\exp(x)' },
  { name: t('dialog.latex.preset.maximum'), latex: '\\max(a,b)' },
  { name: t('dialog.latex.preset.minimum'), latex: '\\min(a,b)' },
  { name: t('dialog.latex.preset.modulo'), latex: 'a \\mod b' }
]))

/** 极限对数类公式示例 */
const limitFormulas = computed<FormulaExample[]>(() => withPreview([
  { name: t('dialog.latex.preset.limit'), latex: '\\lim_{x\\to\\infty}' },
  { name: t('dialog.latex.preset.limitToZero'), latex: '\\lim_{x\\to 0}' },
  { name: t('dialog.latex.preset.limitDefinition'), latex: '\\lim_{n\\to\\infty}a_n=L' },
  { name: t('dialog.latex.preset.naturalLog'), latex: '\\ln x' },
  { name: t('dialog.latex.preset.commonLog'), latex: '\\lg x' },
  { name: t('dialog.latex.preset.logarithm'), latex: '\\log_a x' },
  { name: t('dialog.latex.preset.changeOfBase'), latex: '\\log_a b=\\frac{\\ln b}{\\ln a}' },
  { name: t('dialog.latex.preset.derivativeLimit'), latex: '\\lim_{h\\to 0}\\frac{f(x+h)-f(x)}{h}' }
]))

/** 矩阵类公式示例 */
const matrixFormulas = computed<FormulaExample[]>(() => withPreview([
  { name: t('dialog.latex.preset.matrix2x2'), latex: '\\begin{pmatrix}a&b\\\\c&d\\end{pmatrix}' },
  { name: t('dialog.latex.preset.bracketMatrix'), latex: '\\begin{bmatrix}a&b\\\\c&d\\end{bmatrix}' },
  { name: t('dialog.latex.preset.determinant'), latex: '\\begin{vmatrix}a&b\\\\c&d\\end{vmatrix}' },
  { name: t('dialog.latex.preset.matrix3x3'), latex: '\\begin{pmatrix}a&b&c\\\\d&e&f\\\\g&h&i\\end{pmatrix}' },
  { name: t('dialog.latex.preset.identityMatrix'), latex: '\\begin{pmatrix}1&0\\\\0&1\\end{pmatrix}' },
  { name: t('dialog.latex.preset.augmentedMatrix'), latex: '\\begin{pmatrix}a&b&|&c\\\\d&e&|&f\\end{pmatrix}' },
  { name: t('dialog.latex.preset.columnVector'), latex: '\\begin{pmatrix}x\\\\y\\\\z\\end{pmatrix}' },
  { name: t('dialog.latex.preset.rowVector'), latex: '\\begin{pmatrix}x&y&z\\end{pmatrix}' }
]))

/** 希腊字母公式示例 */
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

/** 初始化希腊字母公式示例的预览图（其他公式示例的预览由 computed 内部生成） */
const initPreviews = () => {
  greekFormulas.value.forEach(f => {
    f.preview = generateFormulaPreview(f.latex)
  })
}

/** 弹窗打开时初始化公式内容与预览 */
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

/** 组件挂载时初始化所有公式示例预览 */
onMounted(() => {
  initPreviews()
})

/** 预览防抖定时器 */
let previewTimer: ReturnType<typeof setTimeout> | null = null
/** 输入后防抖触发公式预览生成 */
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
        previewError.value = t('message.latexParseFailed')
      }
    } catch (error: any) {
      previewError.value = t('message.latexParseError') + (error.message || t('message.latexCheckSyntax'))
      previewSvg.value = ''
    }
  }, 300)
}

/**
 * 填充示例公式到输入框并生成预览
 * @param latex 示例 LaTeX 字符串
 * @returns {void}
 */
const fillExample = (latex: string) => {
  latexForm.value.content = latex
  handlePreview()
}

/** 确认插入 LaTeX 公式，触发 confirm 事件 */
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
  border-top: 1px solid #f0f0f0;
  padding-top: 12px;
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
  background: #e6f7ff;
  border-color: #1890ff;
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