import express from 'express';
import {
    forgotPassword,
    getCurrentUser,
    googleLogin,
    logOut,
    resendOtp,
    resetPassword,
    userLogin,
    UserRegister,
    verifyOtp,
    verifyResetOtp,
     checkAccountStatus,
} from '../controllers/auth.controller.js';
import authMiddleware from '../middleware/auth.middelware.js';


const authRoute = express.Router();

authRoute.post('/register', UserRegister);
authRoute.post('/verify-otp', verifyOtp);
authRoute.post('/resend-otp', resendOtp);

authRoute.post('/forgot-password', forgotPassword);
authRoute.post('/verify-reset-otp', verifyResetOtp);
authRoute.post('/reset-password', resetPassword);

authRoute.post('/login', userLogin);
authRoute.post('/logout', logOut);

authRoute.get("/me", authMiddleware, getCurrentUser);
authRoute.post("/google", googleLogin);
authRoute.get("/account-status",  checkAccountStatus);

export default authRoute;
