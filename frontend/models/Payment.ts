import mongoose, { Schema, Document, Model } from "mongoose";
import { IUser } from "./User";
import { ILoan } from "./Loan";
import { IEMISchedule } from "./EMISchedule";

export interface IPayment extends Document {
  paymentReference: string;
  loan: mongoose.Types.ObjectId | ILoan;
  borrower: mongoose.Types.ObjectId | IUser;
  emiSchedule?: mongoose.Types.ObjectId | IEMISchedule;
  amount: number;
  type: 'emi' | 'prepayment' | 'penalty' | 'disbursement' | 'refund';
  direction: 'inflow' | 'outflow';
  method: 'razorpay' | 'bank_transfer' | 'mobile_wallet' | 'cash' | 'cheque';
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  razorpaySignature?: string;
  status: 'pending' | 'success' | 'failed' | 'refunded';
  failureReason?: string;
  processedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentSchema = new Schema<IPayment>(
  {
    paymentReference: { type: String, unique: true, index: true },
    loan: { type: Schema.Types.ObjectId, ref: "Loan", required: true },
    borrower: { type: Schema.Types.ObjectId, ref: "User", required: true },
    emiSchedule: { type: Schema.Types.ObjectId, ref: "EMISchedule" },
    amount: { type: Number, required: true },
    type: {
      type: String,
      enum: ['emi', 'prepayment', 'penalty', 'disbursement', 'refund'],
      required: true,
    },
    direction: {
      type: String,
      enum: ['inflow', 'outflow'],
      required: true,
    },
    method: {
      type: String,
      enum: ['razorpay', 'bank_transfer', 'mobile_wallet', 'cash', 'cheque'],
      required: true,
    },
    razorpayOrderId: { type: String },
    razorpayPaymentId: { type: String },
    razorpaySignature: { type: String },
    status: {
      type: String,
      enum: ['pending', 'success', 'failed', 'refunded'],
      default: 'pending',
      required: true,
    },
    failureReason: { type: String },
    processedAt: { type: Date },
  },
  {
    timestamps: true,
  }
);

// Pre-save hook to generate payment reference
PaymentSchema.pre("save", async function (next: any) {
  if (!this.paymentReference) {
    const randomDigits = Math.floor(100000 + Math.random() * 900000); // 6 digits
    this.paymentReference = `PAY-${randomDigits}`;
  }
  next();
});

export const Payment: Model<IPayment> =
  mongoose.models.Payment || mongoose.model<IPayment>("Payment", PaymentSchema);
