import mongoose, { Schema, Document, Model } from "mongoose";
import { IUser } from "./User";

export interface IAuditLog extends Document {
  actor?: mongoose.Types.ObjectId | IUser;
  actorRole?: string;
  action: string;
  entityType: 'user' | 'loan_application' | 'loan' | 'kyc' | 'collateral' | 'payment' | 'emi';
  entityId: mongoose.Types.ObjectId;
  previousState?: any;
  newState?: any;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    actor: { type: Schema.Types.ObjectId, ref: "User" },
    actorRole: { type: String },
    action: { type: String, required: true },
    entityType: {
      type: String,
      enum: ['user', 'loan_application', 'loan', 'kyc', 'collateral', 'payment', 'emi'],
      required: true,
    },
    entityId: { type: Schema.Types.ObjectId, required: true },
    previousState: { type: Schema.Types.Mixed },
    newState: { type: Schema.Types.Mixed },
    ipAddress: { type: String },
    userAgent: { type: String },
    createdAt: { type: Date, default: Date.now, index: true },
  },
  {
    // Disable updatedAt as audit logs are write-only
    timestamps: { createdAt: true, updatedAt: false },
  }
);

// Prevent editing or deleting audit logs to ensure strict compliance
AuditLogSchema.pre("validate", function (next: any) {
  if (!this.isNew) {
    return next(new Error("Audit logs are append-only and cannot be modified."));
  }
  next();
});

AuditLogSchema.pre("deleteOne", { document: true, query: true }, function (next: any) {
  next(new Error("Audit logs cannot be deleted."));
});

AuditLogSchema.pre("deleteMany", { document: false, query: true }, function (next: any) {
  next(new Error("Audit logs cannot be deleted."));
});

export const AuditLog: Model<IAuditLog> =
  mongoose.models.AuditLog || mongoose.model<IAuditLog>("AuditLog", AuditLogSchema);
