import express from 'express';
import {
    changePassword,
     setPassword,
    deleteAccount,
    deleteProfileImage,
    getProfile,
    updateProfile,
    uploadProfileImage,
    sendChangeEmailOTP,
    verifyChangeEmailOTP,
} from '../controllers/user.controller.js';
import authMiddleware from '../middleware/auth.middelware.js';
import upload from '../middleware/multer.middleware.js';

const userRouter = express.Router();

userRouter.get('/profile', authMiddleware, getProfile);
userRouter.put('/profile', authMiddleware, updateProfile);
userRouter.put('/change-password', authMiddleware, changePassword);
userRouter.put(
    '/set-password',
    authMiddleware,
    setPassword
);
userRouter.put('/profile-image', authMiddleware, upload.single('image'), uploadProfileImage);

userRouter.delete('/profile-image', authMiddleware, deleteProfileImage);

userRouter.delete('/delete-account', authMiddleware, deleteAccount);

userRouter.post('/change-email', authMiddleware, sendChangeEmailOTP);

userRouter.post('/verify-change-email', authMiddleware, verifyChangeEmailOTP);
export default userRouter;
