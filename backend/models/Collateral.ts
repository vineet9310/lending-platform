import mongoose, { Schema, Document, Model } from "mongoose";
import { IUser } from "./User";
import { ILoanApplication } from "./LoanApplication";

export interface ICollateralDoc {
  docType: 'ownership_deed' | 'valuation_report' | 'registration' | 'insurance' | 'other' | 'blank_cheque' | 'asset_image';
  fileUrl: string;
  uploadedAt: Date;
}

export interface IValuationReport {
  valuedBy?: string;
  valuedAt?: Date;
  marketValue?: number;
  forcedSaleValue?: number;
  reportUrl?: string;
}

export interface ICollateral extends Document {
  application: mongoose.Types.ObjectId | ILoanApplication;
  borrower: mongoose.Types.ObjectId | IUser;
  type: 'real_estate' | 'gold' | 'vehicle' | 'fixed_deposit' | 'shares' | 'machinery' | 'other' | 'blank_cheque';
  description: string;
  estimatedValue: number;
  currency: string;
  documents: ICollateralDoc[];
  location?: string;
  registrationNumber?: string;
  ltvRatio?: number; // loan_amount / collateral_value * 100
  verificationStatus: 'pending' | 'in_review' | 'verified' | 'rejected' | 'released';
  verifiedBy?: mongoose.Types.ObjectId | IUser;
  valuationReport?: IValuationReport;
  lienMarked: boolean;
  lienMarkedAt?: Date;
  releasedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const CollateralDocSchema = new Schema<ICollateralDoc>({
  docType: {
    type: String,
    enum: ['ownership_deed', 'valuation_report', 'registration', 'insurance', 'other', 'blank_cheque', 'asset_image'],
    required: true,
  },
  fileUrl: { type: String, required: true },
  uploadedAt: { type: Date, default: Date.now },
});

const ValuationReportSchema = new Schema<IValuationReport>({
  valuedBy: { type: String },
  valuedAt: { type: Date },
  marketValue: { type: Number },
  forcedSaleValue: { type: Number },
  reportUrl: { type: String },
});

const CollateralSchema = new Schema<ICollateral>(
  {
    application: { type: Schema.Types.ObjectId, ref: "LoanApplication", required: true },
    borrower: { type: Schema.Types.ObjectId, ref: "User", required: true },
    type: {
      type: String,
      enum: ['real_estate', 'gold', 'vehicle', 'fixed_deposit', 'shares', 'machinery', 'other', 'blank_cheque'],
      required: true,
    },
    description: { type: String, required: true },
    estimatedValue: { type: Number, required: true },
    currency: { type: String, default: "PKR" },
    documents: [CollateralDocSchema],
    location: { type: String },
    registrationNumber: { type: String },
    ltvRatio: { type: Number },
    verificationStatus: {
      type: String,
      enum: ['pending', 'in_review', 'verified', 'rejected', 'released'],
      default: 'pending',
      required: true,
    },
    verifiedBy: { type: Schema.Types.ObjectId, ref: "User" },
    valuationReport: ValuationReportSchema,
    lienMarked: { type: Boolean, default: false },
    lienMarkedAt: { type: Date },
    releasedAt: { type: Date },
  },
  {
    timestamps: true,
  }
);

export const Collateral: Model<ICollateral> =
  mongoose.models.Collateral || mongoose.model<ICollateral>("Collateral", CollateralSchema);
