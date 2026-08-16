import mongoose from "mongoose";
import logger from "../utils/logger.js";

const ConnectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    logger.info("MongoDB connected", {
      host: conn.connection.host,
      db: conn.connection.name,
    });
  } catch (error) {
    logger.error("Database connection failed", error);
    process.exit(1);
  }
};

export default ConnectDB;
