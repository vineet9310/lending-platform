import { z } from "zod";

export const KYCSchema = z.object({
  identityDoc: z.object({
    type: z.enum(['aadhaar', 'pan', 'driving_license', 'passport'], {
      message: "Please select a valid identity document type",
    }),
    number: z.string().min(5, { message: "Document number must be at least 5 characters" }),
    expiryDate: z.preprocess(
      (val) => (val && val !== "" ? new Date(val as string) : undefined),
      z.date().optional()
    ),
  }).refine((data) => {
    const num = data.number.replace(/\s/g, "").toUpperCase();
    if (data.type === 'aadhaar') {
      return /^\d{12}$/.test(num);
    }
    if (data.type === 'pan') {
      return /^[A-Z]{5}\d{4}[A-Z]{1}$/.test(num);
    }
    if (data.type === 'driving_license') {
      return num.length >= 10 && num.length <= 18;
    }
    if (data.type === 'passport') {
      return /^[A-Z]{1}\d{7}$/.test(num);
    }
    return true;
  }, {
    message: "Invalid document number format for the selected ID type (e.g. 12 digits for Aadhaar, 10 alphanumeric for PAN, Z1234567 for Passport)",
    path: ["number"],
  }).refine((data) => {
    if (['driving_license', 'passport'].includes(data.type)) {
      if (!data.expiryDate) return false;
      return data.expiryDate > new Date();
    }
    return true;
  }, {
    message: "Expiry date is required and must be in the future for Driving License and Passport",
    path: ["expiryDate"],
  }),
  addressProof: z.object({
    type: z.enum(['utility_bill', 'bank_statement', 'rent_agreement'], {
      message: "Please select a valid address proof type",
    }),
    issuedDate: z.preprocess(
      (val) => new Date(val as string),
      z.date()
    ).refine((date) => date <= new Date(), {
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
