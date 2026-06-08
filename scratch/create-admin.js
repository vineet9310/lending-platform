const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const fs = require("fs");
const path = require("path");

// Read MONGODB_URI from the .env.local file in the project root
let mongodbUri = "mongodb://127.0.0.1:27017/lending_platform";
try {
  const envPath = path.join(__dirname, "../.env.local");
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, "utf8");
    const match = envContent.match(/^MONGODB_URI=(.+)$/m);
    if (match && match[1]) {
      mongodbUri = match[1].trim();
    }
  }
} catch (err) {
  console.log("Could not read .env.local, using default local URI");
}

// Inline schema definition to ensure standalone execution
const UserSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    phone: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
    role: {
      type: String,
      enum: ["borrower", "agent", "admin", "superadmin"],
      required: true,
    },
    status: {
      type: String,
      enum: ["active", "suspended", "pending_verification"],
      required: true,
    },
    cnic: { type: String },
    isPhoneVerified: { type: Boolean, default: true },
    isEmailVerified: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const User = mongoose.models.User || mongoose.model("User", UserSchema);

async function createAdmin() {
  // Configurable details
  const adminName = "System Administrator";
  const adminEmail = "admin@example.com";
  const adminPassword = "AdminPassword123";
  const adminPhone = "+923000000000";

  console.log(`Connecting to database: ${mongodbUri}...`);
  try {
    await mongoose.connect(mongodbUri);
    console.log("Connected to MongoDB!");

    // Check if user already exists
    const existing = await User.findOne({ email: adminEmail });
    if (existing) {
      console.log(`Admin user with email ${adminEmail} already exists!`);
      process.exit(0);
    }

    const passwordHash = await bcrypt.hash(adminPassword, 12);

    await User.create({
      fullName: adminName,
      email: adminEmail.toLowerCase(),
      phone: adminPhone,
      passwordHash,
      role: "admin",
      status: "active",
      isPhoneVerified: true,
      isEmailVerified: true,
    });

    console.log("\n=========================================");
    console.log("🎉 Admin User Created Successfully!");
    console.log(`Email:    ${adminEmail}`);
    console.log(`Password: ${adminPassword}`);
    console.log(`Role:     admin (Active)`);
    console.log("=========================================\n");
  } catch (error) {
    console.error("Error creating admin:", error);
  } finally {
    await mongoose.disconnect();
  }
}

createAdmin();
