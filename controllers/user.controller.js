import bcrypt from "bcryptjs";
import crypto from "crypto";
import { isValidPhoneNumber } from "libphonenumber-js";
import transporter from "../config/brevo.js";
import cloudinary from "../config/cloudinary.js";
import User from "../models/User.model.js";

const getProfile = async (req, res, next) => {
  try {
    return res
      .status(200)
      .json({ success: true, message: "User Profile", user: req.user });
  } catch (error) {
    return next(error);
  }
};

const updateProfile = async (req, res, next) => {
  try {
    const { name } = req.body;
    let { phone } = req.body;

    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    if (name) {
      user.name = name.trim();
    }

    if (phone) {
      phone = phone.trim();

      // Add +91 if country code is not provided
      if (!phone.startsWith("+91")) {
        phone = `+91${phone}`;
      }

      if (!isValidPhoneNumber(phone)) {
        return res.status(400).json({
          success: false,
          message: "Please enter a valid phone number.",
        });
      }

      const existing = await User.findOne({
        phone: phone,
        isDeleted: false,
        _id: { $ne: user._id },
      });

      if (existing) {
        return res.status(409).json({
          success: false,
          message: "Phone number already in use.",
        });
      }

      user.phone = phone;
    }

    await user.save();

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully.",
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        provider: user.provider,
        isVerified: user.isVerified,
        profileImage: user.profileImage,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    });
  } catch (error) {
    return next(error);
  }
};

const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword)
      return res
        .status(400)
        .json({
          success: false,
          message: "Current password and new password are required.",
        });
    const passwordRegex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/;
    if (!passwordRegex.test(newPassword))
      return res
        .status(400)
        .json({
          success: false,
          message:
            "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&).",
        });
    const user = await User.findById(req.user._id);
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "User not found." });
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch)
      return res
        .status(400)
        .json({ success: false, message: "Current password is incorrect." });
    const isSamePassword = await bcrypt.compare(newPassword, user.password);
    if (isSamePassword)
      return res
        .status(400)
        .json({
          success: false,
          message: "New password must be different from the current password.",
        });
    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();
    return res
      .status(200)
      .json({ success: true, message: "Password changed successfully." });
  } catch (error) {
    return next(error);
  }
};

const uploadProfileImage = async (req, res, next) => {
  try {
    if (!req.file)
      return res
        .status(400)
        .json({ success: false, message: "Profile image is required." });
    const user = await User.findById(req.user._id);
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "User not found." });
    if (user.profileImagePublicId)
      await cloudinary.uploader.destroy(user.profileImagePublicId);
    const file = `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`;
    const result = await cloudinary.uploader.upload(file, {
      folder: "profile-images",
    });
    user.profileImage = result.secure_url;
    user.profileImagePublicId = result.public_id;
    await user.save();
    return res
      .status(200)
      .json({
        success: true,
        message: "Profile image uploaded successfully.",
        profileImage: user.profileImage,
      });
  } catch (error) {
    return next(error);
  }
};

const deleteProfileImage = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "User not found." });
    if (!user.profileImagePublicId)
      return res
        .status(400)
        .json({ success: false, message: "No profile image found." });
    await cloudinary.uploader.destroy(user.profileImagePublicId);
    user.profileImage = "";
    user.profileImagePublicId = "";
    await user.save();
    return res
      .status(200)
      .json({ success: true, message: "Profile image deleted successfully." });
  } catch (error) {
    return next(error);
  }
};

const deleteAccount = async (req, res, next) => {
  try {
    const { password } = req.body;
    if (!password)
      return res
        .status(400)
        .json({ success: false, message: "Password is required." });
    const user = await User.findById(req.user._id);
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "User not found." });
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res
        .status(400)
        .json({ success: false, message: "Incorrect password." });
    if (user.role === "admin")
      return res
        .status(400)
        .json({ success: false, message: "Admin account cannot be deleted." });
    if (user.profileImagePublicId)
      await cloudinary.uploader.destroy(user.profileImagePublicId);
    user.isDeleted = true;
    user.deletedAt = new Date();
    await user.save();
    res.cookie("token", "", {
      httpOnly: true,
      expires: new Date(0),
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });
    return res
      .status(200)
      .json({ success: true, message: "Account deleted successfully." });
  } catch (error) {
    return next(error);
  }
};

const sendChangeEmailOTP = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { email } = req.body;
    if (!email)
      return res
        .status(400)
        .json({ success: false, message: "Email is required." });
    const emailExists = await User.findOne({ email, isDeleted: false });
    if (emailExists)
      return res
        .status(400)
        .json({ success: false, message: "Email already exists." });
    const otp = crypto.randomInt(100000, 999999).toString();
    const user = await User.findById(userId);
    const hashedOTP = await bcrypt.hash(otp, 10);
    user.emailVerifyOtp = hashedOTP;
    user.emailVerifyNew = email;
    user.emailVerifyOtpExpireAt = Date.now() + 10 * 60 * 1000;
    await user.save();
    await transporter.sendMail({
      from: process.env.SENT_EMAIL,
      to: email,
      subject: "Verify New Email",
      html: `<h2>Email Change Verification</h2><p>Your OTP is:</p><h1>${otp}</h1><p>Valid for 10 minutes.</p>`,
    });
    return res
      .status(200)
      .json({ success: true, message: "OTP sent successfully." });
  } catch (error) {
    return next(error);
  }
};

const verifyChangeEmailOTP = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { otp, email } = req.body;
    if (!otp || !email)
      return res
        .status(400)
        .json({ success: false, message: "Email and OTP are required." });
    const user = await User.findById(userId);
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "User not found." });
    if (
      !user.emailVerifyOtpExpireAt ||
      user.emailVerifyOtpExpireAt < Date.now()
    )
      return res
        .status(400)
        .json({ success: false, message: "OTP has expired." });
    const match = await bcrypt.compare(otp, user.emailVerifyOtp || "");
    if (!match)
      return res.status(400).json({ success: false, message: "Invalid OTP." });
    if (!user.emailVerifyNew || user.emailVerifyNew !== email)
      return res
        .status(400)
        .json({
          success: false,
          message: "Email mismatch or no pending email change.",
        });
    const exists = await User.findOne({
      email,
      isDeleted: false,
      _id: { $ne: user._id },
    });
    if (exists)
      return res
        .status(409)
        .json({ success: false, message: "Email already exists." });
    user.email = email;
    user.emailVerifyOtp = null;
    user.emailVerifyOtpExpireAt = null;
    user.emailVerifyNew = null;
    await user.save();
    return res
      .status(200)
      .json({
        success: true,
        message: "Email updated successfully.",
        user: { _id: user._id, email: user.email, name: user.name },
      });
  } catch (error) {
    return next(error);
  }
};
const setPassword = async (req, res, next) => {
  try {
    const { newPassword, confirmPassword } = req.body;

    // ================= Validation =================

    if (!newPassword || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "New password and confirm password are required.",
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "Passwords do not match.",
      });
    }

    // ================= Password Validation =================

    const passwordRegex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/;

    if (!passwordRegex.test(newPassword)) {
      return res.status(400).json({
        success: false,
        message:
          "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&).",
      });
    }

    // ================= Find User =================

    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    // ================= Only Google Users =================

    if (user.provider !== "google") {
      return res.status(403).json({
        success: false,
        message: "Set Password is available only for Google users.",
      });
    }

    // ================= Already Has Password =================

    if (user.password) {
      return res.status(400).json({
        success: false,
        message: "Password has already been set. Please use Change Password.",
      });
    }

    // ================= Hash Password =================

    user.password = await bcrypt.hash(newPassword, 10);

    await user.save();

    return res.status(200).json({
      success: true,
      message:
        "Password set successfully. You can now login using your email and password.",
    });

  } catch (error) {
    return next(error);
  }
};
export {
  changePassword,
  deleteAccount,
  deleteProfileImage,
  getProfile,
  sendChangeEmailOTP,
  updateProfile,
  uploadProfileImage,
  verifyChangeEmailOTP,
  setPassword,
};
