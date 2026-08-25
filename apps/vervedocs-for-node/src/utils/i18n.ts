/**
 * i18n 国际化日志消息
 *
 * 自动检测系统语言（LANG / LC_ALL / Intl locale），支持 zh / en。
 * 用 t('key', { param: value }) 获取翻译消息，{placeholder} 自动替换。
 */

type Locale = 'zh' | 'en'

const messages: Record<Locale, Record<string, string>> = {
  zh: {
    'parse.received': 'Preparing >>> 地址【{url}】文件名称【{file}】 开始处理....',
    'parse.completed': 'Preparing >>> 文件【{file}】 处理耗时={duration}ms 元素={elements} 批注={comments} 处理完成！',
    'parse.missingFile': '缺少 file 字段',
    'parse.wrongType': '文件类型错误 文件【{file}】',
    'parse.notDocx': 'file 必须是 .docx 文件',
    'parse.failedJar': '解析请求失败 (jar)',
    'parse.failed': '解析异常: {message}',
    'export.received': '收到导出请求 地址【{url}】文件【{file}】',
    'export.receivedJson': '收到导出请求 地址【{url}】格式【JSON】',
    'export.completed': '导出请求完成 耗时={duration}ms 输出={bytes}字节',
    'export.missingFile': '缺少 file 字段',
    'export.invalidFormat': 'format 参数必须是 docx 或 pdf',
    'export.unsupportedType': '不支持的 Content-Type【{contentType}】',
    'export.mustBeJsonOrMultipart': 'Content-Type 必须是 application/json 或 multipart/form-data',
    'export.failedJar': '导出请求失败 (jar)',
    'export.failed': '导出异常: {message}',
    'upload.parseFailed': '文件上传解析失败: {message}',
    'upload.mustBeMultipart': '请求必须是 multipart/form-data 且包含 file 字段（当前 Content-Type: {contentType}）',
    'server.notFound': '路由不存在: {method} {path}',
    'server.error': '内部服务器错误',
    'server.uncaught': '未捕获错误',
    'server.started': '服务已启动',
  },
  en: {
    'parse.received': 'Preparing >>> Parse request received url[{url}] file[{file}]',
    'parse.completed': 'Preparing >>> Parse completed file[{file}] duration={duration}ms elements={elements} comments={comments}',
    'parse.missingFile': 'Missing file field',
    'parse.wrongType': 'Wrong file type file[{file}]',
    'parse.notDocx': 'file must be a .docx file',
    'parse.failedJar': 'Parse request failed (jar)',
    'parse.failed': 'Parse error: {message}',
    'export.received': 'Export request received url[{url}] file[{file}]',
    'export.receivedJson': 'Export request received url[{url}] format[JSON]',
    'export.completed': 'Export completed duration={duration}ms output={bytes}bytes',
    'export.missingFile': 'Missing file field',
    'export.invalidFormat': 'format must be docx or pdf',
    'export.unsupportedType': 'Unsupported Content-Type[{contentType}]',
    'export.mustBeJsonOrMultipart': 'Content-Type must be application/json or multipart/form-data',
    'export.failedJar': 'Export request failed (jar)',
    'export.failed': 'Export error: {message}',
    'upload.parseFailed': 'File upload parse failed: {message}',
    'upload.mustBeMultipart': 'Request must be multipart/form-data with file field (Content-Type: {contentType})',
    'server.notFound': 'Route not found: {method} {path}',
    'server.error': 'Internal server error',
    'server.uncaught': 'Uncaught error',
    'server.started': 'Server started',
  },
}

/**
 * 检测系统语言。
 *
 * 优先级：LANG > LC_ALL > LANGUAGE > Intl locale
 *
 * @returns 检测到的语言（zh 或 en，默认 en）
 */
function detectLocale(): Locale {
  const envLang = process.env.LANG || process.env.LC_ALL || process.env.LANGUAGE || ''
  if (envLang.toLowerCase().startsWith('zh')) return 'zh'
  if (envLang.toLowerCase().startsWith('en')) return 'en'
  const locale = Intl.DateTimeFormat().resolvedOptions().locale
  if (locale.toLowerCase().startsWith('zh')) return 'zh'
  return 'en'
}

const locale = detectLocale()

/**
 * 翻译消息。
 *
 * @param key 消息 key
 * @param params 占位符参数（{name} → value）
 * @returns 翻译后的字符串
 */
export function t(key: string, params?: Record<string, string | number>): string {
  let msg = messages[locale]?.[key] ?? messages.en[key] ?? key
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      msg = msg.replaceAll(`{${k}}`, String(v))
    }
  }
  return msg
}

export { locale }