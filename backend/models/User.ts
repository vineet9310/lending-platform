import mongoose, { Schema, Document, Model } from "mongoose";

export interface IUser extends Document {
  fullName: string;
  email: string;
  phone: string;
  passwordHash: string;
  role: 'borrower' | 'agent' | 'admin' | 'superadmin';
  status: 'active' | 'suspended' | 'pending_verification';
  cnic?: string; // encrypted
  address?: {
    street?: string;
    city?: string;
    province?: string;
    country?: string;
  };
  isPhoneVerified: boolean;
  isEmailVerified: boolean;
  twoFactorEnabled: boolean;
  loginAttempts: number;
  lockUntil?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    fullName: { type: String, required: true },
    email: { type: String, required: true, unique: true, index: true },
    phone: { type: String, required: true, unique: true, index: true },
    passwordHash: { type: String, required: true },
    role: {
      type: String,
      enum: ['borrower', 'agent', 'admin', 'superadmin'],
      default: 'borrower',
      required: true,
    },
    status: {
      type: String,
      enum: ['active', 'suspended', 'pending_verification'],
      default: 'pending_verification',
      required: true,
    },
    cnic: { type: String },
    address: {
      street: { type: String },
      city: { type: String },
      province: { type: String },
      country: { type: String },
    },
    isPhoneVerified: { type: Boolean, default: false },
    isEmailVerified: { type: Boolean, default: false },
    twoFactorEnabled: { type: Boolean, default: false },
    loginAttempts: { type: Number, default: 0, required: true },
    lockUntil: { type: Date },
  },
  {
    timestamps: true,
  }
);

// To avoid recompiling models on hot reload
export const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>("User", UserSchema);
