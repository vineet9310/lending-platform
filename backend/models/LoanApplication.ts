import mongoose, { Schema, Document, Model } from "mongoose";
import { IUser } from "./User";

export interface ILoanApplication extends Document {
  applicationNumber: string;
  borrower: mongoose.Types.ObjectId | IUser;
  amountRequested: number;
  tenureMonths: number;
  purpose: 'home' | 'business' | 'personal' | 'education' | 'vehicle' | 'agriculture' | 'other';
  purposeDetail?: string;
  employmentType: 'salaried' | 'self_employed' | 'business_owner' | 'freelancer';
  monthlyIncome: number;
  existingLoans: number;
  status:
    | 'draft'
    | 'submitted'
    | 'kyc_pending'
    | 'kyc_verified'
    | 'collateral_pending'
    | 'collateral_verified'
    | 'under_review'
    | 'approved'
    | 'rejected'
    | 'disbursed'
    | 'cancelled';
  assignedAgent?: mongoose.Types.ObjectId | IUser;
  reviewedBy?: mongoose.Types.ObjectId | IUser;
  approvedBy?: mongoose.Types.ObjectId | IUser;
  rejectionReason?: string;
  offeredInterestRate?: number;
  offeredAmount?: number;
  internalNotes?: string;
  submittedAt?: Date;
  reviewedAt?: Date;
  approvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const LoanApplicationSchema = new Schema<ILoanApplication>(
  {
    applicationNumber: { type: String, unique: true, index: true },
    borrower: { type: Schema.Types.ObjectId, ref: "User", required: true },
    amountRequested: { type: Number, required: true },
    tenureMonths: { type: Number, required: true, min: 1, max: 360 },
    purpose: {
      type: String,
      enum: ['home', 'business', 'personal', 'education', 'vehicle', 'agriculture', 'other'],
      required: true,
    },
    purposeDetail: { type: String },
    employmentType: {
      type: String,
      enum: ['salaried', 'self_employed', 'business_owner', 'freelancer'],
      required: true,
    },
    monthlyIncome: { type: Number, required: true },
    existingLoans: { type: Number, default: 0 },
    status: {
      type: String,
      enum: [
        'draft',
        'submitted',
        'kyc_pending',
        'kyc_verified',
        'collateral_pending',
        'collateral_verified',
        'under_review',
        'approved',
        'rejected',
        'disbursed',
        'cancelled',
      ],
      default: 'draft',
      required: true,
    },
    assignedAgent: { type: Schema.Types.ObjectId, ref: "User" },
    reviewedBy: { type: Schema.Types.ObjectId, ref: "User" },
    approvedBy: { type: Schema.Types.ObjectId, ref: "User" },
    rejectionReason: { type: String },
    offeredInterestRate: { type: Number },
    offeredAmount: { type: Number },
    internalNotes: { type: String },
    submittedAt: { type: Date },
    reviewedAt: { type: Date },
    approvedAt: { type: Date },
  },
  {
    timestamps: true,
  }
);

// Pre-save hook to generate application number
LoanApplicationSchema.pre("save", async function () {
  if (!this.applicationNumber) {
    const year = new Date().getFullYear();
    const randomDigits = Math.floor(10000 + Math.random() * 90000); // 5 digits
    this.applicationNumber = `LA-${year}-${randomDigits}`;
  }
});

export const LoanApplication: Model<ILoanApplication> =
  mongoose.models.LoanApplication || mongoose.model<ILoanApplication>("LoanApplication", LoanApplicationSchema);
