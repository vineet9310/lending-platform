import mongoose, { Schema, Document, Model } from "mongoose";
import { IUser } from "./User";
import { ILoanApplication } from "./LoanApplication";

export interface IKYCRecord extends Document {
  application: mongoose.Types.ObjectId | ILoanApplication;
  borrower: mongoose.Types.ObjectId | IUser;
  identityDoc: {
    type: 'cnic' | 'passport' | 'driving_license';
    number: string; // encrypted
    frontImageUrl: string;
    backImageUrl: string;
    expiryDate: Date;
  };
  selfieUrl: string;
  addressProof: {
    type: 'utility_bill' | 'bank_statement' | 'rent_agreement';
    imageUrl: string;
    issuedDate: Date;
  };
  incomeProof: {
    type: 'salary_slip' | 'bank_statement' | 'tax_return' | 'business_registration';
    documentUrls: string[]; // max 6 files
  };
  employerLetter?: string;
  bankStatements: string[]; // 3-6 months bank statement URLs
  verificationStatus: 'pending' | 'in_review' | 'verified' | 'rejected';
  verifiedBy?: mongoose.Types.ObjectId | IUser;
  verificationNotes?: string;
  verifiedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const KYCRecordSchema = new Schema<IKYCRecord>(
  {
    application: { type: Schema.Types.ObjectId, ref: "LoanApplication", required: true },
    borrower: { type: Schema.Types.ObjectId, ref: "User", required: true },
    identityDoc: {
      type: {
        type: String,
        enum: ['cnic', 'passport', 'driving_license'],
        required: true,
      },
      number: { type: String, required: true },
      frontImageUrl: { type: String, required: true },
      backImageUrl: { type: String, required: true },
      expiryDate: { type: Date, required: true },
    },
    selfieUrl: { type: String, required: true },
    addressProof: {
      type: {
        type: String,
        enum: ['utility_bill', 'bank_statement', 'rent_agreement'],
        required: true,
      },
      imageUrl: { type: String, required: true },
      issuedDate: { type: Date, required: true },
    },
    incomeProof: {
      type: {
        type: String,
        enum: ['salary_slip', 'bank_statement', 'tax_return', 'business_registration'],
        required: true,
      },
      documentUrls: {
        type: [String],
        validate: [
          (val: string[]) => val.length <= 6,
          "Income proof documents list cannot exceed 6 files",
        ],
        required: true,
      },
    },
    employerLetter: { type: String },
    bankStatements: { type: [String], required: true },
    verificationStatus: {
      type: String,
      enum: ['pending', 'in_review', 'verified', 'rejected'],
      default: 'pending',
      required: true,
    },
    verifiedBy: { type: Schema.Types.ObjectId, ref: "User" },
    verificationNotes: { type: String },
    verifiedAt: { type: Date },
  },
  {
    timestamps: true,
  }
);

export const KYCRecord: Model<IKYCRecord> =
  mongoose.models.KYCRecord || mongoose.model<IKYCRecord>("KYCRecord", KYCRecordSchema);
