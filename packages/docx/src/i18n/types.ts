/** docx 编辑器支持的语言代码 */
export type DocxLocale = 'zhCN' | 'zhTW' | 'jaJP' | 'koKR' | 'enUS'

/** 递归消息包类型：每个节点要么是字符串（叶子消息），要么是嵌套消息对象 */
export type DocxMessages = {
  [key: string]: string | DocxMessages
}