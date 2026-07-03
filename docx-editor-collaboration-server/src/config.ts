import dotenv from 'dotenv'
dotenv.config()

export const config = {
  port: parseInt(process.env.PORT || '1234', 10),
  mongoUri: process.env.MONGO_URI || 'mongodb://localhost:27017/docuflow',
  mongoCollection: process.env.MONGO_COLLECTION || 'docuFlow-document',
}
