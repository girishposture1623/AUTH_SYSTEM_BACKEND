import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import User from "../models/User.model.js";

dotenv.config();

const authMiddleware = async (req, res, next) => {
  try {
    // get token from cookie
    const token = req.cookies?.token;
    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized. Please login.",
      });
    }

    // verify token
    const verifyToken = jwt.verify(token, process.env.JWT_SECRET);

    // find user
    const user = await User.findById(verifyToken.id).select(
      "-password -refreshToken -resetOTP -resetOTPExpire -emailVerifyOtp -emailVerifyOtpExpireAt -profileImagePublicId",
    );

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found",
      });
    }

    // deny access for soft-deleted or blocked users
    if (user.isDeleted) {
      return res.status(403).json({
        success: false,
        message: "This account has been deleted.",
      });
    }

    if (user.isBlocked) {
      return res.status(403).json({
        success: false,
        message:
          "Your account has been blocked. Please contact the administrator.",
      });
    }

    // store user
    req.user = user;

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token.",
    });
  }
};

export default authMiddleware;
