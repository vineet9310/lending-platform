import { z } from "zod";

export const KYCSchema = z.object({
  identityDoc: z.object({
    type: z.enum(['cnic', 'passport', 'driving_license'], {
      message: "Please select a valid identity document type",
    }),
    number: z.string().min(5, { message: "Document number must be at least 5 characters" }),
    expiryDate: z.coerce.date().refine((date) => date > new Date(), {
      message: "Identity document must not be expired",
    }),
  }),
  addressProof: z.object({
    type: z.enum(['utility_bill', 'bank_statement', 'rent_agreement'], {
      message: "Please select a valid address proof type",
    }),
    issuedDate: z.coerce.date().refine((date) => date <= new Date(), {
      message: "Issue date cannot be in the future",
    }),
  }),
  incomeProof: z.object({
    type: z.enum(['salary_slip', 'bank_statement', 'tax_return', 'business_registration'], {
      message: "Please select a valid income proof type",
    }),
  }),
});

export type KYCInput = z.infer<typeof KYCSchema>;
