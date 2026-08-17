import PendingUser from "../models/PendingUser.model.js";
import User from "../models/User.model.js";
import validator from "validator";
import { isValidPhoneNumber } from "libphonenumber-js";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import generateToken from "../utils/generateToken.js";
import sendEmailOtp, { sendWelcomeEmail } from "../utils/sendOtpEmail.js";
import client from "../utils/googleClient.js";
import AdminContact from "../models/AdminContact.model.js";

const UserRegister = async (req, res, next) => {
  try {
    let { name, email, password, phone } = req.body;

    // Normalize
    email = email?.trim().toLowerCase();
    phone = phone?.trim();

    // India phone number
    if (phone && !phone.startsWith("+91")) {
      phone = `+91${phone}`;
    }

    // User is empty
    if (!name || !email || !password || !phone) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    // name validation

    const nameValid = /^[A-Za-z ]{3,50}$/;
    if (!nameValid.test(name)) {
      return res.status(400).json({
        success: false,
        message:
          "Name should contain only letters and spaces (3-50 characters).",
      });
    }
    // email validation

    if (!validator.isEmail(email)) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid email address.",
      });
    }

    // password validation
    const passwordValid =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

    if (!passwordValid.test(password)) {
      return res.status(400).json({
        success: false,
        message:
          "Password must contain at least 8 characters, one uppercase letter, one lowercase letter, one number, and one special character.",
      });
    }

    //  phone validation
    const indiaPhoneRegex = /^\+91[6-9]\d{9}$/;

    if (!indiaPhoneRegex.test(phone)) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid Indian phone number.",
      });
    }
    // existing user (active only)
    const existingUser = await User.findOne({
      $or: [{ email }, { phone }],
      isDeleted: false,
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User already exists",
      });
    }

    // pending user

    const pendingUser = await PendingUser.findOne({
      $or: [{ email }, { phone }],
    });

    if (pendingUser) {
      console.log("OTP Expire :", pendingUser.otpExpire);
      console.log("Current Time :", new Date());
      if (pendingUser.otpExpire > Date.now()) {
        return res.status(400).json({
          success: false,
          message: "OTP already sent. Pleas verify your email",
        });
      }
      await PendingUser.deleteOne({
        _id: pendingUser._id,
      });
    }
    //    generate otp (secure)
    const otp = crypto.randomInt(100000, 999999).toString();
    // otp expire
    const otpExpire = new Date(Date.now() + 3 * 60 * 1000);

    //hash password
    const hashPassword = await bcrypt.hash(password, 10);
    const hashOtp = await bcrypt.hash(otp, 10);
    // save user
    await PendingUser.create({
      name,
      email,
      password: hashPassword,
      phone,
      otp: hashOtp,
      otpExpire,
      provider: "local",
    });
    await sendEmailOtp(email, otp);
    return res.status(200).json({
      success: true,
      message: "OTP generated successfully.",
    });
  } catch (error) {
    return next(error);
  }
};

const verifyOtp = async (req, res, next) => {
  try {
    const { email, otp } = req.body;

    // =========================
    // Validation
    // =========================

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: "Email and Otp are Required",
      });
    }

    // =========================
    // Find Pending User
    // =========================

    const pendingUser = await PendingUser.findOne({
      email: email.trim().toLowerCase(),
    });

    if (!pendingUser) {
      return res.status(400).json({
        success: false,
        message: "No pending registration found.",
      });
    }

    // =========================
    // OTP Expired
    // =========================

    if (pendingUser.otpExpire < Date.now()) {
      await PendingUser.deleteOne({
        _id: pendingUser._id,
      });

      return res.status(400).json({
        success: false,
        message: "OTP has expired. Please register again.",
      });
    }

    // =========================
    // OTP Match
    // =========================

    const otpMatch = await bcrypt.compare(otp, pendingUser.otp);

    if (!otpMatch) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP.",
      });
    }

    // =========================
    // Create User
    // =========================

    const user = await User.create({
      name: pendingUser.name,
      email: pendingUser.email,
      password: pendingUser.password,
      phone: pendingUser.phone,
      provider: pendingUser.provider,
      isVerified: true,
    });

    // =========================
    // Delete Pending User
    // =========================

    await PendingUser.deleteOne({
      _id: pendingUser._id,
    });

    // =========================
    // Send Welcome Email
    // =========================

    try {
      await sendWelcomeEmail(user.email, user.name);
    } catch (emailError) {
      console.error("Welcome email failed:", emailError.message);

      // Do NOT fail account verification
      // if only welcome email fails.
    }

    // =========================
    // Generate JWT
    // =========================

    const token = generateToken(user._id);

    // =========================
    // Cookie
    // =========================

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    // =========================
    // Response
    // =========================

    return res.status(201).json({
      success: true,
      message: "Account verified successfully.",
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    return next(error);
  }
};

const resendOtp = async (req, res, next) => {
  try {
    let { email } = req.body;

    // Normalize Email
    email = email?.trim().toLowerCase();

    // Empty Validation
    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required.",
      });
    }

    // Email Validation
    if (!validator.isEmail(email)) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid email address.",
      });
    }

    // Find Pending User
    const pendingUser = await PendingUser.findOne({ email });

    if (!pendingUser) {
      return res.status(404).json({
        success: false,
        message: "Please register first.",
      });
    }

    // Generate New OTP (secure)
    const otp = crypto.randomInt(100000, 999999).toString();

    // Hash OTP
    const hashedOTP = await bcrypt.hash(otp, 10);

    // OTP Expiry (3 Minutes)
    const otpExpire = new Date(Date.now() + 3 * 60 * 1000);

    // Update Pending User
    pendingUser.otp = hashedOTP;
    pendingUser.otpExpire = otpExpire;

    await pendingUser.save();

    // Send Email
    await sendEmailOtp(email, otp);

    return res.status(200).json({
      success: true,
      message: "OTP resent successfully.",
    });
  } catch (error) {
    return next(error);
  }
};
const userLogin = async (req, res, next) => {
  try {
    let { email, password } = req.body;

    // Normalize
    email = email?.trim().toLowerCase();

    // Empty validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and Password are required.",
      });
    }

    // Email validation
    if (!validator.isEmail(email)) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid email address.",
      });
    }

    // Find user
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    // Deleted account
    if (user.isDeleted) {
      return res.status(403).json({
        success: false,
        message: "This account has been deleted.",
      });
    }

    // Blocked account
    if (user.isBlocked) {
      return res.status(403).json({
        success: false,
        message:
          "Your account has been blocked. Please contact the administrator.",
      });
    }

    // =====================================================
    // Google Account Without Password
    // =====================================================

    if (user.provider === "google" && !user.password) {
      return res.status(400).json({
        success: false,
        message: "This account uses Google login. Please continue with Google.",
      });
    }

    // =====================================================
    // Password Check
    // =====================================================

    const checkPass = await bcrypt.compare(password, user.password);

    if (!checkPass) {
      return res.status(400).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    // Account verification
    if (!user.isVerified) {
      return res.status(400).json({
        success: false,
        message: "Please verify your account first.",
      });
    }

    // Generate JWT
    const token = generateToken(user._id);

    // Update last login
    user.lastLogin = new Date();

    await user.save();

    // Set cookie
  res.cookie("token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production"
        ? "none"
        : "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
});

    return res.status(200).json({
      success: true,
      message: "Login successful",
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        provider: user.provider,
      },
    });
  } catch (error) {
    return next(error);
  }
};

const verifyResetOtp = async (req, res, next) => {
  try {
    let { email, otp } = req.body;
    // normalize email
    email = email?.trim().toLowerCase();

    // Validation
    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: "Email and OTP are required",
      });
    }
    // email validation

    if (!validator.isEmail(email)) {
      return res.status(400).json({
        success: false,
        message: "Please enter valid email address",
      });
    }

    // find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({
        success: false,
        message: "User not found",
      });
    }

    // otp exist check
    if (!user.resetOTP) {
      return res.status(400).json({
        success: false,
        message: "No reset OTP found. Please request a new OTP.",
      });
    }

    // Check OTP Expiry
    if (!user.resetOTPExpire || user.resetOTPExpire < Date.now()) {
      return res.status(400).json({
        success: false,
        message: "OTP has expired.",
      });
    }

    // compare otp
    const otpMatch = await bcrypt.compare(otp, user.resetOTP);
    if (!otpMatch) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP",
      });
    }

    // mark as verified
    user.resetVerified = true;
    await user.save();

    return res.status(200).json({
      success: true,
      message: "OTP verified successfully.",
    });
  } catch (error) {
    return next(error);
  }
};

const resetPassword = async (req, res, next) => {
  try {
    let { email, password } = req.body;

    // Normalize Email
    email = email.trim().toLowerCase();

    // validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and Password are required.",
      });
    }

    // Email Validation
    if (!validator.isEmail(email)) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid email address.",
      });
    }

    //  password validation
    const passwordRegex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

    if (!passwordRegex.test(password)) {
      return res.status(400).json({
        success: false,
        message:
          "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&) and be at least 8 characters long.",
      });
    }

    // Find User
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    // Check if OTP was verified
    if (!user.resetVerified) {
      return res.status(400).json({
        success: false,
        message: "Please verify your OTP first.",
      });
    }

    // Hash New Password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Update Password
    user.password = hashedPassword;

    // Clear Reset OTP and verification state
    user.resetOTP = null;
    user.resetOTPExpire = null;
    user.resetVerified = false;

    await user.save();

    return res.status(200).json({
      success: true,
      message: "Password reset successfully.",
    });
  } catch (error) {
    return next(error);
  }
};

const forgotPassword = async (req, res, next) => {
  try {
    let { email } = req.body;

    // Normalize Email
    email = email?.trim().toLowerCase();

    // Validation
    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required.",
      });
    }

    // Email Validation
    if (!validator.isEmail(email)) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid email address.",
      });
    }

    // Find User
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    // Generate secure OTP
    const otp = crypto.randomInt(100000, 999999).toString();

    // Hash OTP
    const hashedOTP = await bcrypt.hash(otp, 10);

    // OTP Expiry (3 Minutes)
    const otpExpire = new Date(Date.now() + 3 * 60 * 1000);

    // Save OTP and mark unverified until user verifies
    user.resetVerified = false;
    user.resetOTP = hashedOTP;
    user.resetOTPExpire = otpExpire;

    await user.save();

    // Send Email
    await sendEmailOtp(email, otp);

    return res.status(200).json({
      success: true,
      message: "Password reset OTP sent successfully.",
    });
  } catch (error) {
    return next(error);
  }
};

// Logout

const logOut = async (req, res, next) => {
  try {
    res.clearCookie("token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite:
        process.env.NODE_ENV === "production"
          ? "none"
          : "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.status(200).json({
      success: true,
      message: "Logout successful.",
    });
  } catch (error) {
    return next(error);
  }
};

const getCurrentUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select(
      "name email phone role provider profileImage isVerified isBlocked isDeleted createdAt password",
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    return res.status(200).json({
      success: true,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        provider: user.provider,
        profileImage: user.profileImage,
        isVerified: user.isVerified,
        isBlocked: user.isBlocked,
        isDeleted: user.isDeleted,
        createdAt: user.createdAt,

        // Password frontend ला पाठवत नाही
        // फक्त password आहे की नाही ते सांगतो
        hasPassword: Boolean(user.password),
      },
    });
  } catch (error) {
    return next(error);
  }
};

const googleLogin = async (req, res, next) => {
  try {
    const { credential } = req.body;

    if (!credential) {
      return res.status(400).json({
        success: false,
        message: "Google credential is required.",
      });
    }

    // Verify Google Token
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();

    const { name, email, picture, email_verified } = payload;

    if (!email_verified) {
      return res.status(400).json({
        success: false,
        message: "Google email is not verified.",
      });
    }

    // Check Existing User
    let user = await User.findOne({ email });

    if (!user) {
      user = await User.create({
        name,
        email,
        provider: "google",
        profileImage: picture,
        isVerified: true,
      });

      // Send welcome email only for new Google users
       console.log("New Google user created:", user.email);

  await sendWelcomeEmail(user.email, user.name);

  console.log("Welcome email function completed");
    }
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
    // Update Last Login
    user.lastLogin = new Date();
    await user.save();

    // Generate JWT
    const token = generateToken(user._id);

    // Cookie
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.status(200).json({
      success: true,
      message: "Google Login Successful",
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        profileImage: user.profileImage,
        provider: user.provider,
        hasPassword: !!user.password,
      },
    });
  } catch (error) {
    return next(error);
  }
};

export {
  UserRegister,
  verifyOtp,
  userLogin,
  resendOtp,
  verifyResetOtp,
  resetPassword,
  forgotPassword,
  logOut,
  getCurrentUser,
  googleLogin,
};

export const checkAccountStatus = async (req, res, next) => {
  try {
    const email = req.query.email?.trim().toLowerCase();

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required.",
      });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    const latestRequest = await AdminContact.findOne({
      email,
    }).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      isBlocked: user.isBlocked,
      requestStatus: latestRequest?.status || null,
    });
  } catch (error) {
    return next(error);
  }
};
