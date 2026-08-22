/**
 * AI 提示词模板
 */

import { AIAction, TranslateLanguage } from '../types'

/**
 * 语言名称映射
 */
const LANGUAGE_NAMES: Record<TranslateLanguage, string> = {
  [TranslateLanguage.CHINESE]: '中文',
  [TranslateLanguage.ENGLISH]: 'English',
  [TranslateLanguage.JAPANESE]: '日本語',
  [TranslateLanguage.KOREAN]: '한국어',
  [TranslateLanguage.FRENCH]: 'Français',
  [TranslateLanguage.GERMAN]: 'Deutsch',
  [TranslateLanguage.SPANISH]: 'Español',
  [TranslateLanguage.RUSSIAN]: 'Русский'
}

/**
 * 内置提示词模板
 */
export const PROMPT_TEMPLATES: Record<AIAction, string> = {
  [AIAction.POLISH]: `你是一个专业的文字润色助手。请对以下文本进行润色，使其更加流畅、优美、专业，同时保持原意不变。

原文：
{text}

要求：
1. 保持原文的核心意思不变
2. 改善语言表达，使其更加流畅自然
3. 修正语法和用词问题
4. 直接输出润色后的文本，不要添加解释或说明`,

  [AIAction.TRANSLATE]: `你是一个专业的翻译助手。请将以下文本翻译成 {targetLanguage}。

原文：
{text}

要求：
1. 翻译要准确、地道
2. 保持原文的语气和风格
3. 直接输出翻译结果，不要添加解释或说明`,

  [AIAction.SUMMARIZE]: `你是一个专业的文本摘要助手。请对以下文本进行总结，提取核心要点。

原文：
{text}

要求：
1. 提取最关键的信息
2. 保持简洁，控制在原文 1/3 以内
3. 使用要点式或段落式总结
4. 直接输出总结内容，不要添加解释或说明`,

  [AIAction.CONTINUE]: `你是一个专业的写作助手。请根据以下内容继续写作，保持风格一致。

已有内容：
{text}

要求：
1. 延续原文的风格和语气
2. 内容要与原文衔接自然
3. 续写长度适中（约100-200字）
4. 直接输出续写内容，不要添加解释或说明`,

  [AIAction.EXPAND]: `你是一个专业的内容扩展助手。请对以下文本进行扩展，使其更加详细、丰富。

原文：
{text}

要求：
1. 在不改变原意的基础上扩展内容
2. 添加更多细节、例证或解释
3. 保持逻辑清晰，段落分明
4. 直接输出扩展后的内容，不要添加解释或说明`,

  [AIAction.FIX_GRAMMAR]: `你是一个专业的语法检查助手。请检查并修正以下文本中的语法错误、拼写错误和标点错误。

原文：
{text}

要求：
1. 仅修正语法、拼写和标点错误
2. 不要改变原文的意思和风格
3. 直接输出修正后的文本，不要添加解释或说明`,

  [AIAction.FORMAL]: `你是一个专业的文风转换助手。请将以下文本改写为正式的书面语风格。

原文：
{text}

要求：
1. 使用正式、专业的词汇
2. 避免口语化表达
3. 保持原文的核心意思
4. 直接输出改写后的文本，不要添加解释或说明`,

  [AIAction.CASUAL]: `你是一个专业的文风转换助手。请将以下文本改写为轻松、随意的口语化风格。

原文：
{text}

要求：
1. 使用日常、轻松的词汇
2. 可以使用口语化表达
3. 保持原文的核心意思
4. 直接输出改写后的文本，不要添加解释或说明`,

  [AIAction.CUSTOM]: `{customPrompt}

文本内容：
{text}`
}

/**
 * 构建完整的提示词
 */
export function buildPrompt(
  action: AIAction,
  text: string,
  options?: {
    targetLanguage?: TranslateLanguage
    customPrompt?: string
    context?: {
      before?: string
      after?: string
    }
  }
): string {
  let prompt = PROMPT_TEMPLATES[action]

  // 替换文本占位符
  prompt = prompt.replace('{text}', text)

  // 替换翻译语言
  if (action === AIAction.TRANSLATE && options?.targetLanguage) {
    prompt = prompt.replace('{targetLanguage}', LANGUAGE_NAMES[options.targetLanguage])
  }

  // 替换自定义提示词
  if (action === AIAction.CUSTOM && options?.customPrompt) {
    prompt = prompt.replace('{customPrompt}', options.customPrompt)
  }

  // 添加上下文（如果有）
  if (options?.context) {
    const contextParts: string[] = []
    if (options.context.before) {
      contextParts.push(`【前文】\n${options.context.before}`)
    }
    if (options.context.after) {
      contextParts.push(`【后文】\n${options.context.after}`)
    }
    if (contextParts.length > 0) {
      prompt = `${prompt}\n\n上下文参考：\n${contextParts.join('\n\n')}`
    }
  }

  return prompt
}

/**
 * 获取语言名称
 */
export function getLanguageName(lang: TranslateLanguage): string {
  return LANGUAGE_NAMES[lang]
}
