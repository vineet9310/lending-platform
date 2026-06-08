import { z } from "zod";

export const LoanApplicationSchema = z.object({
  amountRequested: z.coerce
    .number()
    .min(10000, { message: "Minimum loan amount is PKR 10,000" })
    .max(5000000, { message: "Maximum loan amount is PKR 5,000,000" }),
  tenureMonths: z.coerce
    .number()
    .int()
    .min(1, { message: "Minimum tenure is 1 month" })
    .max(360, { message: "Maximum tenure is 360 months (30 years)" }),
  purpose: z.enum(['home', 'business', 'personal', 'education', 'vehicle', 'agriculture', 'other'], {
    message: "Please select a valid loan purpose",
  }),
  purposeDetail: z.string().max(500).optional(),
  employmentType: z.enum(['salaried', 'self_employed', 'business_owner', 'freelancer'], {
    message: "Please select a valid employment type",
  }),
  monthlyIncome: z.coerce
    .number()
    .min(5000, { message: "Monthly income must be at least PKR 5,000" }),
  existingLoans: z.coerce
    .number()
    .min(0, { message: "Existing loans amount cannot be negative" })
    .default(0),
});

export type LoanApplicationInput = z.infer<typeof LoanApplicationSchema>;
