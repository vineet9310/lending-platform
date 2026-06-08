import mongoose, { Schema, Document, Model } from "mongoose";
import { IUser } from "./User";
import { ILoan } from "./Loan";

export interface IEMISchedule extends Document {
  loan: mongoose.Types.ObjectId | ILoan;
  borrower: mongoose.Types.ObjectId | IUser;
  emiNumber: number;
  dueDate: Date;
  principalComponent: number;
  interestComponent: number;
  totalEMI: number;
  outstandingPrincipal: number; // outstanding principal before this EMI is paid
  status: 'upcoming' | 'due' | 'paid' | 'overdue' | 'partial' | 'waived';
  paidAmount: number;
  paidAt?: Date;
  penaltyAmount: number;
  penaltyReason?: string;
  reminderSentAt: Date[];
  createdAt: Date;
  updatedAt: Date;
}

const EMIScheduleSchema = new Schema<IEMISchedule>(
  {
    loan: { type: Schema.Types.ObjectId, ref: "Loan", required: true },
    borrower: { type: Schema.Types.ObjectId, ref: "User", required: true },
    emiNumber: { type: Number, required: true },
    dueDate: { type: Date, required: true },
    principalComponent: { type: Number, required: true },
    interestComponent: { type: Number, required: true },
    totalEMI: { type: Number, required: true },
    outstandingPrincipal: { type: Number, required: true },
    status: {
      type: String,
      enum: ['upcoming', 'due', 'paid', 'overdue', 'partial', 'waived'],
      default: 'upcoming',
      required: true,
    },
    paidAmount: { type: Number, default: 0, required: true },
    paidAt: { type: Date },
    penaltyAmount: { type: Number, default: 0, required: true },
    penaltyReason: { type: String },
    reminderSentAt: { type: [Date], default: [] },
  },
  {
    timestamps: true,
  }
);

export const EMISchedule: Model<IEMISchedule> =
  mongoose.models.EMISchedule || mongoose.model<IEMISchedule>("EMISchedule", EMIScheduleSchema);
