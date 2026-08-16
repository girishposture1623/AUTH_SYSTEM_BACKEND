import dotenv from "dotenv";
import mongoose from "mongoose";

import path from "path";

// Ensure we load the server/.env file (don't print or expose its contents)
const envPath = path.resolve(new URL("../.env", import.meta.url).pathname);
dotenv.config();

const MONGO = process.env.MONGO_URI;
if (!MONGO) {
  console.error(
    "MONGO_URI not set in environment. Provide it in .env or environment to run this audit.",
  );
  process.exit(2);
}

async function run() {
  // Connect without autoIndex to avoid any index creation
  await mongoose.connect(MONGO, { autoIndex: false });
  const db = mongoose.connection.db;

  // Import User model to read schema-defined indexes (does not create indexes because autoIndex=false)
  const { default: User } = await import("../models/User.model.js");

  // 1) Existing indexes in DB
  const usersColl = db.collection("users");
  const existingIndexes = await usersColl.indexes();

  // 2) Required indexes declared in schema
  const schemaIndexes =
    (User && User.schema && User.schema.indexes && User.schema.indexes()) || [];

  // 3) Duplicate active emails
  const dupEmailPipeline = [
    {
      $match: {
        isDeleted: false,
        email: { $exists: true, $ne: null, $ne: "" },
      },
    },
    { $group: { _id: "$email", count: { $sum: 1 }, ids: { $push: "$_id" } } },
    { $match: { count: { $gt: 1 } } },
    { $project: { _id: 0, email: "$_id", count: 1, ids: 1 } },
  ];

  const duplicateEmails = await usersColl.aggregate(dupEmailPipeline).toArray();

  // 4) Duplicate active phones
  const dupPhonePipeline = [
    {
      $match: {
        isDeleted: false,
        phone: { $exists: true, $ne: null, $ne: "" },
      },
    },
    { $group: { _id: "$phone", count: { $sum: 1 }, ids: { $push: "$_id" } } },
    { $match: { count: { $gt: 1 } } },
    { $project: { _id: 0, phone: "$_id", count: 1, ids: 1 } },
  ];

  const duplicatePhones = await usersColl.aggregate(dupPhonePipeline).toArray();

  // 5) Identify conflicting old unique indexes: any unique index on email or phone that doesn't include the required partialFilterExpression
  const conflicting = [];
  for (const idx of existingIndexes) {
    // look for indexes on email or phone
    const keys = Object.keys(idx.key || {});
    if (keys.includes("email") || keys.includes("phone")) {
      if (idx.unique) {
        const pfe = idx.partialFilterExpression || {};
        const hasIsDeletedFalse =
          pfe.hasOwnProperty("isDeleted") && pfe.isDeleted === false;
        if (keys.includes("email")) {
          // email index is valid only if it has isDeleted:false in partialFilterExpression
          if (!hasIsDeletedFalse) conflicting.push(idx);
        }
        if (keys.includes("phone")) {
          // phone index must have isDeleted:false and phone.$exists:true in partialFilterExpression
          const phoneExpr = pfe.phone || pfe["phone"];
          const phoneExistsTrue =
            phoneExpr &&
            (phoneExpr.$exists === true || phoneExpr["$exists"] === true);
          if (!(hasIsDeletedFalse && phoneExistsTrue)) conflicting.push(idx);
        }
      }
    }
  }

  // Output summary (avoid sensitive fields)
  console.log("--- DB INDEX AUDIT REPORT ---");
  console.log("\n[1] Existing Indexes (users collection):");
  console.log(JSON.stringify(existingIndexes, null, 2));

  console.log("\n[2] Required Indexes (from User.schema.indexes()):");
  console.log(JSON.stringify(schemaIndexes, null, 2));

  console.log("\n[3] Duplicate active emails (isDeleted:false):");
  if (duplicateEmails.length === 0) console.log("None");
  else console.log(JSON.stringify(duplicateEmails, null, 2));

  console.log("\n[4] Duplicate active phones (isDeleted:false):");
  if (duplicatePhones.length === 0) console.log("None");
  else console.log(JSON.stringify(duplicatePhones, null, 2));

  console.log(
    "\n[5] Conflicting unique indexes (unique indexes on email/phone without partialFilterExpression isDeleted:false):",
  );
  if (conflicting.length === 0) console.log("None");
  else console.log(JSON.stringify(conflicting, null, 2));

  // 6) Whether DB is safe: safe if no duplicates and no conflicting unique indexes
  const safe =
    duplicateEmails.length === 0 &&
    duplicatePhones.length === 0 &&
    conflicting.length === 0;
  console.log(
    `\n[6] Database safe for declaring partial unique indexes: ${safe}`,
  );

  // 7) Manual cleanup steps printed below (generic guidance)
  if (!safe) {
    console.log("\n[7] Manual cleanup steps (DO NOT RUN - manual actions):");
    console.log(
      "1) Inspect duplicate email groups and decide which documents to merge/deactivate.",
    );
    console.log("   Example to list duplicates:");
    console.log(
      "   db.users.aggregate([{ $match: { isDeleted: false, email: { $exists: true, $ne: '' } } },{ $group: { _id: '$email', count: { $sum: 1 }, ids: { $push: '$_id' } } },{ $match: { count: { $gt: 1 } } }])",
    );
    console.log(
      "2) For each duplicate group, either merge user data or set isDeleted:true on duplicates you want deactivated.",
    );
    console.log(
      "3) After cleanup, create the partial unique indexes manually or restart server so Mongoose can create them.",
    );
    console.log("   Manual index creation examples:");
    console.log(
      "   db.users.createIndex({ email: 1 }, { unique: true, partialFilterExpression: { isDeleted: false } })",
    );
    console.log(
      "   db.users.createIndex({ phone: 1 }, { unique: true, partialFilterExpression: { isDeleted: false, phone: { $exists: true } } })",
    );
  }

  await mongoose.disconnect();
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Audit script failed:", err.message);
    process.exit(3);
  });
