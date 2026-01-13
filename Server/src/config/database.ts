import mongoose from "mongoose"
import dotenv from "dotenv"

dotenv.config()

let isConnected = false

const connectDB = async (): Promise<boolean> => {
  try {
    const mongoUri = process.env.MONGO_URI || "mongodb://localhost:27017/billiards"
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 3000, // 3 second timeout
      connectTimeoutMS: 3000,
    })
    console.log("MongoDB connected successfully")
    isConnected = true
    return true
  } catch (err) {
    console.warn("MongoDB connection failed - running in offline mode")
    console.warn("Room persistence will not be available")
    isConnected = false
    return false
  }
}

const isDBConnected = (): boolean => isConnected

export { connectDB, isDBConnected }
