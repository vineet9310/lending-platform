import mongoose, { Schema, Document, Model } from "mongoose";
import { IUser } from "./User";
import { ILoanApplication } from "./LoanApplication";
import { ICollateral } from "./Collateral";

export interface ILoan extends Document {
  loanNumber: string;
  application: mongoose.Types.ObjectId | ILoanApplication;
  borrower: mongoose.Types.ObjectId | IUser;
  collateral?: mongoose.Types.ObjectId | ICollateral;
  principal: number;
  interestRate: number; // annual percentage
  interestType: 'flat' | 'reducing_balance' | 'compound';
  tenureMonths: number;
  totalPayable: number;
  totalInterest: number;
  emiAmount: number;
  disbursedAmount?: number;
  disbursedAt?: Date;
  disbursementMethod?: 'bank_transfer' | 'mobile_wallet' | 'cheque';
  disbursementReference?: string;
  status: 'active' | 'closed' | 'defaulted' | 'restructured';
  closedAt?: Date;
  nocGenerated: boolean;
  nocGeneratedAt?: Date;
  agreementUrl?: string; // URL to PDF
  createdAt: Date;
  updatedAt: Date;
}

const LoanSchema = new Schema<ILoan>(
  {
    loanNumber: { type: String, unique: true, index: true },
    application: { type: Schema.Types.ObjectId, ref: "LoanApplication", required: true },
    borrower: { type: Schema.Types.ObjectId, ref: "User", required: true },
    collateral: { type: Schema.Types.ObjectId, ref: "Collateral" },
    principal: { type: Number, required: true },
    interestRate: { type: Number, required: true },
    interestType: {
      type: String,
      enum: ['flat', 'reducing_balance', 'compound'],
      required: true,
    },
    tenureMonths: { type: Number, required: true },
    totalPayable: { type: Number, required: true },
    totalInterest: { type: Number, required: true },
    emiAmount: { type: Number, required: true },
    disbursedAmount: { type: Number },
    disbursedAt: { type: Date },
    disbursementMethod: {
      type: String,
      enum: ['bank_transfer', 'mobile_wallet', 'cheque'],
    },
    disbursementReference: { type: String },
    status: {
      type: String,
      enum: ['active', 'closed', 'defaulted', 'restructured'],
      default: 'active',
      required: true,
    },
    closedAt: { type: Date },
    nocGenerated: { type: Boolean, default: false },
    nocGeneratedAt: { type: Date },
    agreementUrl: { type: String },
  },
  {
    timestamps: true,
  }
);

// Pre-save hook to generate loan number
LoanSchema.pre("save", async function (next: any) {
  if (!this.loanNumber) {
    const year = new Date().getFullYear();
    const randomDigits = Math.floor(10000 + Math.random() * 90000); // 5 digits
    this.loanNumber = `LN-${year}-${randomDigits}`;
  }
  next();
});

export const Loan: Model<ILoan> =
  mongoose.models.Loan || mongoose.model<ILoan>("Loan", LoanSchema);
