import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import mongoose from "mongoose";

// Load server/.env using a path relative to this script file (Windows-safe)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.join(__dirname, "..", ".env");
dotenv.config({ path: envPath });

const MONGO = process.env.MONGO_URI;
if (!MONGO) {
  console.error("MONGO_URI not found in server/.env; aborting migration.");
  process.exit(2);
}

async function run() {
  const conn = await mongoose.connect(MONGO, { autoIndex: false });
  const db = conn.connection.db;
  const usersColl = db.collection("users");

  try {
    // 1) Verify no duplicate active emails
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
    const duplicateEmails = await usersColl
      .aggregate(dupEmailPipeline)
      .toArray();
    if (duplicateEmails.length > 0) {
      console.error("Aborting migration: duplicate active emails detected.");
      console.log(JSON.stringify(duplicateEmails, null, 2));
      process.exit(4);
    }

    // 2) Verify no duplicate active phones
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
    const duplicatePhones = await usersColl
      .aggregate(dupPhonePipeline)
      .toArray();
    if (duplicatePhones.length > 0) {
      console.error("Aborting migration: duplicate active phones detected.");
      console.log(JSON.stringify(duplicatePhones, null, 2));
      process.exit(5);
    }

    // 3) Get existing indexes
    const existingIndexes = await usersColl.indexes();
    console.log("Existing indexes before migration:");
    console.log(JSON.stringify(existingIndexes, null, 2));

    // 4) Drop conflicting old indexes if present: 'email_1' and 'phone_1'
    const indexNames = existingIndexes.map((i) => i.name);
    if (indexNames.includes("email_1")) {
      console.log("Dropping index: email_1");
      await usersColl.dropIndex("email_1");
    } else {
      console.log("Index email_1 not present; skipping drop.");
    }

    if (indexNames.includes("phone_1")) {
      console.log("Dropping index: phone_1");
      await usersColl.dropIndex("phone_1");
    } else {
      console.log("Index phone_1 not present; skipping drop.");
    }

    // 5) Create required partial unique indexes
    console.log("Creating partial unique index on email");
    await usersColl.createIndex(
      { email: 1 },
      { unique: true, partialFilterExpression: { isDeleted: false } },
    );

    console.log("Creating partial unique index on phone");
    await usersColl.createIndex(
      { phone: 1 },
      {
        unique: true,
        partialFilterExpression: { isDeleted: false, phone: { $exists: true } },
      },
    );

    // 6) Final verification
    const finalIndexes = await usersColl.indexes();
    console.log("Final indexes after migration:");
    console.log(JSON.stringify(finalIndexes, null, 2));

      // Confirm no conflicting indexes remain (same logic as audit)
      const conflicting = [];
      for (const idx of finalIndexes) {
        const keys = Object.keys(idx.key || {});
        if (keys.includes('email') || keys.includes('phone')) {
          if (idx.unique) {
            const pfe = idx.partialFilterExpression || {};
            const hasIsDeletedFalse = pfe.hasOwnProperty('isDeleted') && pfe.isDeleted === false;
            if (keys.includes('email')) {
              if (!hasIsDeletedFalse) conflicting.push(idx);
            } else if (keys.includes('phone')) {
              const phoneExpr = pfe.phone || pfe['phone'];
              const phoneExistsTrue = phoneExpr && (phoneExpr.$exists === true || phoneExpr['$exists'] === true);
              if (!(hasIsDeletedFalse && phoneExistsTrue)) conflicting.push(idx);
            }
          }
        }
      }
          return true;
      }
      return false;
    });

    if (conflicting.length > 0) {
      console.error("Migration completed but conflicting indexes remain:");
      console.log(JSON.stringify(conflicting, null, 2));
      process.exit(6);
    }

    console.log(
      "Migration completed successfully. Database indexes are now partial unique indexes as required.",
    );

    // 7) Re-run read-only duplicate checks and return summary
    const postDupEmails = await usersColl.aggregate(dupEmailPipeline).toArray();
    const postDupPhones = await usersColl.aggregate(dupPhonePipeline).toArray();

    console.log("\nPost-migration duplicate active emails:");
    console.log(
      postDupEmails.length === 0
        ? "None"
        : JSON.stringify(postDupEmails, null, 2),
    );

    console.log("\nPost-migration duplicate active phones:");
    console.log(
      postDupPhones.length === 0
        ? "None"
        : JSON.stringify(postDupPhones, null, 2),
    );
  } catch (err) {
    console.error("Migration failed:", err.message);
    process.exit(10);
  } finally {
    await mongoose.disconnect();
  }
}

run()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("Unexpected error:", e.message);
    process.exit(11);
  });
