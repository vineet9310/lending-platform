import { z } from "zod";

export const CollateralSchema = z.object({
  type: z.enum(['real_estate', 'gold', 'vehicle', 'fixed_deposit', 'shares', 'machinery', 'other', 'blank_cheque'], {
    message: "Please select a valid collateral type",
  }),
  description: z.string().min(10, { message: "Description must be at least 10 characters long" }),
  estimatedValue: z.coerce
    .number()
    .min(1000, { message: "Estimated value must be at least INR 1,000" }),
  location: z.string().max(300).optional().or(z.literal("")),
  registrationNumber: z.string().max(100).optional().or(z.literal("")),
});

export type CollateralInput = z.infer<typeof CollateralSchema>;
