import express from "express";

import authMiddleware from "../middleware/auth.middelware.js";
import adminMiddleware from "../middleware/auth.adminMiddleware.js";
import validateObjectId from "../middleware/validateObjectId.middleware.js";

import {
  dashboard,
  getAllUsers,
  getSingleUser,
  updateUser,
  updateUserRole,
  blockUser,
  unblockUser,
  deleteUser,
  createAdminContact,
  getAdminContacts,
} from "../controllers/admin.controller.js";

const adminRouter = express.Router();

// Dashboard
adminRouter.get("/dashboard", authMiddleware, adminMiddleware, dashboard);

// Get All Users
adminRouter.get("/users", authMiddleware, adminMiddleware, getAllUsers);

// Get Single User
adminRouter.get(
  "/user/:id",
  authMiddleware,
  adminMiddleware,
  validateObjectId,
  getSingleUser,
);

// Update User
adminRouter.put(
  "/user/:id",
  authMiddleware,
  adminMiddleware,
  validateObjectId,
  updateUser,
);

// Change Role
adminRouter.put(
  "/change-role/:id",
  authMiddleware,
  adminMiddleware,
  validateObjectId,
  updateUserRole,
);

// Block User
adminRouter.put(
  "/block/:id",
  authMiddleware,
  adminMiddleware,
  validateObjectId,
  blockUser,
);

// Unblock User
adminRouter.put(
  "/unblock/:id",
  authMiddleware,
  adminMiddleware,
  validateObjectId,
  unblockUser,
);

// Delete User
adminRouter.delete(
  "/user/:id",
  authMiddleware,
  adminMiddleware,
  validateObjectId,
  deleteUser,
);

// User Contact Administrator
adminRouter.post(
    "/contact",
    createAdminContact
);

// Get Admin Contact Requests
adminRouter.get(
    "/contacts",
    authMiddleware,
    adminMiddleware,
    getAdminContacts
);

export default adminRouter;
