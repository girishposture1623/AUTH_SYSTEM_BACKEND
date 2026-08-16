import mongoose from "mongoose";

const adminContactSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },

    subject: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
    },

    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },

   status: {
    type: String,
    enum: ["pending", "resolved"],
    default: "pending",
},

resolvedAt: {
    type: Date,
    default: null,
},
  },
  {
    timestamps: true,
  },
);

const AdminContact =
  mongoose.models.AdminContact ||
  mongoose.model("AdminContact", adminContactSchema);

export default AdminContact;
