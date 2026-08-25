import dotenv from 'dotenv'
dotenv.config()

/**
 * 协作服务配置
 *
 * 环境变量：
 *   PORT              WebSocket 端口（默认 1235）
 *   MONGO_URI         MongoDB 连接字符串
 *   MONGO_COLLECTION  文档集合名
 *   REDIS_URI         Redis 连接字符串（可选，多实例同步）
 *   BACKEND_URL       Java 后端 API 地址（敏感词过滤等内部接口）
 *   LOG_LEVEL         日志级别（默认 info）
 *   LOG_FILE          日志文件路径（可选，设置后双写 stdout + 文件）
 *   LOG_PRETTY        是否启用彩色输出（默认 true）
 */
export const config = {
  /** WebSocket 服务端口 */
  port: parseInt(process.env.PORT || '1235', 10),

  /** MongoDB 连接字符串 */
  mongoUri: process.env.MONGO_URI || 'mongodb://localhost:27017/docuflow',
  /** 文档持久化集合名 */
  mongoCollection: process.env.MONGO_COLLECTION || 'docuFlow-document',

  /** Redis 连接字符串（可选，多实例协同同步） */
  redisUri: process.env.REDIS_URI || '',

  /** Java 后端 API 地址（敏感词过滤等内部接口） */
  backendUrl: process.env.BACKEND_URL || 'http://localhost:8090',

  /** 日志级别 */
  logLevel: process.env.LOG_LEVEL || 'info',
  /** 日志文件路径（可选，设置后同时写入 stdout 与文件） */
  logFile: process.env.LOG_FILE || '',
  /** 是否启用彩色输出 */
  logPretty: process.env.LOG_PRETTY !== 'false',
}
