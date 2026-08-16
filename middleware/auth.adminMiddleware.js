import logger from "../utils/logger.js";

const authAdminMiddleware = async (req, res, next) => {
  try {
    if (req.user.role !== "admin") {
      return res
        .status(403)
        .json({ success: false, message: "Access denied. Admin only." });
    }

    next();
  } catch (error) {
    logger.error("Admin middleware error", { message: error.message });
    return next(error);
  }
};

export default authAdminMiddleware;
