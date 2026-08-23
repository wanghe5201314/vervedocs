/**
 * 协作用户信息
 */
export interface CollabUser {
  /** 用户唯一标识 */
  userId: string
  /** 用户显示名 */
  userName: string
  /** 用户光标 / 选区颜色（HEX 或 RGB） */
  color: string
}