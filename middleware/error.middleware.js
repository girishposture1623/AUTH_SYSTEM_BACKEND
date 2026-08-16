import logger from "../utils/logger.js";

const errorMiddleware = (err, req, res, next) => {
  logger.error("Unhandled error", { message: err.message });

  // MongoDB Duplicate Key Error
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern || {})[0];

    return res.status(409).json({
      success: false,
      message: `${field || "Field"} already exists.`,
    });
  }

  // MongoDB Invalid ObjectId
  if (err.name === "CastError") {
    return res.status(400).json({
      success: false,
      message: "Invalid ID.",
    });
  }

  // Mongoose Validation Error
  if (err.name === "ValidationError") {
    const messages = Object.values(err.errors).map((error) => error.message);

    return res.status(400).json({
      success: false,
      message: messages[0] || "Validation failed.",
      errors: messages,
    });
  }

  // Default Error
  return res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || "Internal Server Error.",
  });
};

export default errorMiddleware;
