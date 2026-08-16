import User from "../models/User.model.js";
import AdminContact from "../models/AdminContact.model.js";

// ================= Dashboard =================
export const dashboard = async (req, res, next) => {
  try {
    const totalUsers = await User.countDocuments({ isDeleted: false });

    const totalAdmins = await User.countDocuments({
      role: "admin",
      isDeleted: false,
    });

    const verifiedUsers = await User.countDocuments({
      isVerified: true,
      isDeleted: false,
    });

    const googleUsers = await User.countDocuments({
      provider: "google",
      isDeleted: false,
    });

    const localUsers = await User.countDocuments({
      provider: "local",
      isDeleted: false,
    });

    const blockedUsers = await User.countDocuments({
      isBlocked: true,
      isDeleted: false,
    });

    return res.status(200).json({
      success: true,
      stats: {
        totalUsers,
        totalAdmins,
        verifiedUsers,
        googleUsers,
        localUsers,
        blockedUsers,
      },
    });
  } catch (error) {
    return next(error);
  }
};

// ================= Get All Users =================
export const getAllUsers = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = "",
      role,
      provider,
      blocked,
      sortBy = "createdAt",
      order = "desc",
    } = req.query;

    const currentPage = Math.max(Number(page), 1);
    const perPage = Math.min(Math.max(Number(limit), 1), 100);
    const skip = (currentPage - 1) * perPage;

    // ================= Query =================
    const query = {
      isDeleted: false,
    };

    // Search by name or email
    if (search.trim()) {
      query.$or = [
        {
          name: {
            $regex: search.trim(),
            $options: "i",
          },
        },
        {
          email: {
            $regex: search.trim(),
            $options: "i",
          },
        },
      ];
    }

    // Filter by role
    if (role && ["user", "admin"].includes(role)) {
      query.role = role;
    }

    // Filter by provider
    if (provider && ["local", "google"].includes(provider)) {
      query.provider = provider;
    }

    // Filter by blocked status
    if (blocked === "true") {
      query.isBlocked = true;
    }

    if (blocked === "false") {
      query.isBlocked = false;
    }

    // ================= Sorting =================

    const allowedSortFields = [
      "name",
      "email",
      "role",
      "provider",
      "createdAt",
      "lastLogin",
    ];

    const selectedSortField = allowedSortFields.includes(sortBy)
      ? sortBy
      : "createdAt";

    const sortOrder = order === "asc" ? 1 : -1;

    const sort = {
      [selectedSortField]: sortOrder,
    };

    // ================= Database =================

    const users = await User.find(query)
      .select("-password -refreshToken")
      .sort(sort)
      .skip(skip)
      .limit(perPage);

    const totalUsers = await User.countDocuments(query);

    const totalPages = Math.ceil(totalUsers / perPage);

    return res.status(200).json({
      success: true,

      pagination: {
        currentPage,
        perPage,
        totalUsers,
        totalPages,
        hasNextPage: currentPage < totalPages,
        hasPreviousPage: currentPage > 1,
      },

      filters: {
        search,
        role: role || null,
        provider: provider || null,
        blocked: blocked === "true" ? true : blocked === "false" ? false : null,
        sortBy: selectedSortField,
        order: order === "asc" ? "asc" : "desc",
      },

      users,
    });
  } catch (error) {
    return next(error);
  }
};

// ================= Get Single User =================
export const getSingleUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).select(
      "-password -refreshToken",
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    return next(error);
  }
};

// ================= Update User =================
// ================= Update User =================
export const updateUser = async (req, res, next) => {
  try {
    const userId = req.params.id;

    const { name, email, phone } = req.body;

    // Find User
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    // Soft Deleted User
    if (user.isDeleted) {
      return res.status(400).json({
        success: false,
        message: "Deleted user cannot be updated.",
      });
    }

    // Name Validation
    if (name !== undefined) {
      const trimmedName = name.trim();

      if (!trimmedName) {
        return res.status(400).json({
          success: false,
          message: "Name cannot be empty.",
        });
      }

      if (trimmedName.length < 3) {
        return res.status(400).json({
          success: false,
          message: "Name must be at least 3 characters.",
        });
      }

      if (trimmedName.length > 50) {
        return res.status(400).json({
          success: false,
          message: "Name cannot exceed 50 characters.",
        });
      }

      user.name = trimmedName;
    }

    // Email Validation
    if (email !== undefined) {
      const normalizedEmail = email.trim().toLowerCase();

      if (!normalizedEmail) {
        return res.status(400).json({
          success: false,
          message: "Email cannot be empty.",
        });
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      if (!emailRegex.test(normalizedEmail)) {
        return res.status(400).json({
          success: false,
          message: "Please enter a valid email address.",
        });
      }

      // Check duplicate email
      const existingEmail = await User.findOne({
        email: normalizedEmail,
        _id: { $ne: userId },
        isDeleted: false,
      });

      if (existingEmail) {
        return res.status(409).json({
          success: false,
          message: "Email already exists.",
        });
      }

      user.email = normalizedEmail;
    }

    // Phone Validation
    if (phone !== undefined) {
      const normalizedPhone = phone.trim();

      if (!normalizedPhone) {
        return res.status(400).json({
          success: false,
          message: "Phone cannot be empty.",
        });
      }

      const phoneRegex = /^[6-9]\d{9}$/;

      if (!phoneRegex.test(normalizedPhone)) {
        return res.status(400).json({
          success: false,
          message: "Please enter a valid 10-digit phone number.",
        });
      }

      // Check duplicate phone
      const existingPhone = await User.findOne({
        phone: normalizedPhone,
        _id: { $ne: userId },
        isDeleted: false,
      });

      if (existingPhone) {
        return res.status(409).json({
          success: false,
          message: "Phone number already exists.",
        });
      }

      user.phone = normalizedPhone;
    }

    await user.save();

    return res.status(200).json({
      success: true,
      message: "User updated successfully.",
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        provider: user.provider,
        isVerified: user.isVerified,
        isBlocked: user.isBlocked,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    });
  } catch (error) {
    // Duplicate key error
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern || {})[0];

      return res.status(409).json({
        success: false,
        message: `${field} already exists.`,
      });
    }

    return next(error);
  }
};

// ================= Change Role =================
// ================= Change User Role =================
export const updateUserRole = async (req, res, next) => {
  try {
    const userId = req.params.id;
    const { role } = req.body;

    // Role validation
    if (!role) {
      return res.status(400).json({
        success: false,
        message: "Role is required.",
      });
    }

    if (!["user", "admin"].includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Invalid role. Role must be user or admin.",
      });
    }

    // Find User
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    // Soft Deleted User
    if (user.isDeleted) {
      return res.status(400).json({
        success: false,
        message: "Deleted user role cannot be changed.",
      });
    }

    // Admin cannot change own role
    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: "You cannot change your own role.",
      });
    }

    // Same role
    if (user.role === role) {
      return res.status(400).json({
        success: false,
        message: `User is already ${role}.`,
      });
    }

    // Update Role
    user.role = role;

    await user.save();

    return res.status(200).json({
      success: true,
      message: `User role changed to ${role} successfully.`,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        provider: user.provider,
        isVerified: user.isVerified,
        isBlocked: user.isBlocked,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    });
  } catch (error) {
    return next(error);
  }
};
// ================= Block User =================
export const blockUser = async (req, res, next) => {
  try {
    const userId = req.params.id;

    // Find User
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    // Soft Deleted User
    if (user.isDeleted) {
      return res.status(400).json({
        success: false,
        message: "Deleted user cannot be blocked.",
      });
    }

    // Admin Protection
    if (user.role === "admin") {
      return res.status(400).json({
        success: false,
        message: "Admin user cannot be blocked.",
      });
    }

    // Prevent admin from blocking themselves
    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: "You cannot block your own account.",
      });
    }

    // Already Blocked
    if (user.isBlocked) {
      return res.status(400).json({
        success: false,
        message: "User is already blocked.",
      });
    }

    // Block User
    user.isBlocked = true;
    user.blockedAt = new Date();

    await user.save();
    // Resolve pending contact requests
    await AdminContact.updateMany(
      {
        $or: [{ user: user._id }, { email: user.email }],
        status: "pending",
      },
      {
        $set: {
          status: "resolved",
          resolvedAt: new Date(),
        },
      },
    );
    return res.status(200).json({
      success: true,
      message: "User blocked successfully.",
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        provider: user.provider,
        isVerified: user.isVerified,
        isBlocked: user.isBlocked,
        blockedAt: user.blockedAt,
      },
    });
  } catch (error) {
    return next(error);
  }
};
// ================= Unblock User =================
export const unblockUser = async (req, res, next) => {
  try {
    const userId = req.params.id;

    // Find User
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    // Soft Deleted User
    if (user.isDeleted) {
      return res.status(400).json({
        success: false,
        message: "Deleted user cannot be unblocked.",
      });
    }

    // Already Unblocked
    if (!user.isBlocked) {
      return res.status(400).json({
        success: false,
        message: "User is already active.",
      });
    }

    // ================= Unblock User =================

    user.isBlocked = false;
    user.blockedAt = null;

    await user.save();

    // ================= Delete Contact Request =================

    const deletedContacts = await AdminContact.deleteMany({
      email: user.email,
      status: "pending",
    });

    console.log(
      "Deleted contact requests:",
      deletedContacts.deletedCount
    );

    // ================= Response =================

    return res.status(200).json({
      success: true,
      message: "User unblocked successfully.",
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        provider: user.provider,
        isVerified: user.isVerified,
        isBlocked: user.isBlocked,
        blockedAt: user.blockedAt,
      },
    });

  } catch (error) {
    return next(error);
  }
};
// ================= Delete User =================
export const deleteUser = async (req, res, next) => {
  try {
    const userId = req.params.id;

    // Find User
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    // Already Deleted
    if (user.isDeleted) {
      return res.status(400).json({
        success: false,
        message: "User is already deleted.",
      });
    }

    // Admin Protection
    if (user.role === "admin") {
      return res.status(400).json({
        success: false,
        message: "Admin account cannot be deleted.",
      });
    }

    // Prevent admin from deleting themselves
    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: "You cannot delete your own account.",
      });
    }

    // Soft Delete
    user.isDeleted = true;
    user.deletedAt = new Date();

    await user.save();

    return res.status(200).json({
      success: true,
      message: "User deleted successfully.",
    });
  } catch (error) {
    return next(error);
  }
};

// ================= Create Admin Contact Request =================
export const createAdminContact = async (req, res, next) => {
  try {
    const { email, subject, message } = req.body;

    // Validation
    if (!email || !subject || !message) {
      return res.status(400).json({
        success: false,
        message: "Email, subject and message are required.",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(normalizedEmail)) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid email address.",
      });
    }

    const contact = await AdminContact.create({
      user: null,
      email: normalizedEmail,
      subject: subject.trim(),
      message: message.trim(),
    });

    return res.status(201).json({
      success: true,
      message: "Request sent to administrator successfully.",
      contact,
    });
  } catch (error) {
    return next(error);
  }
};

// ================= Get Admin Contact Requests =================
export const getAdminContacts = async (req, res, next) => {
  try {
    const contacts = await AdminContact.find()
      .populate("user", "name email phone role isBlocked")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      contacts,
    });
  } catch (error) {
    return next(error);
  }
};
