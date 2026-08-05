import dotenv from 'dotenv'
dotenv.config()

export const config = {
  port: parseInt(process.env.PORT || '9090', 10),
  mongoUri: process.env.MONGO_URI || 'mongodb://localhost:27017/docuflow',
  mongoCollection: process.env.MONGO_COLLECTION || 'docuFlow-document',
  internalToken: process.env.INTERNAL_TOKEN || 'vervedocs-internal',
  dashboardUsername: process.env.DASHBOARD_USERNAME || 'admin',
  dashboardPassword: process.env.DASHBOARD_PASSWORD || 'admin123',
}
