import dotenv from "dotenv";
import app from "./app.js";
import connectDB from "./config/db.js";
import logger from "./utils/logger.js";

dotenv.config();

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDB();

    app.listen(PORT, () => {
      logger.info("Server running", { port: PORT });
    });
  } catch (error) {
    logger.error("Failed to start server", {
      error: error.message,
    });

    process.exit(1);
  }
};

startServer();
