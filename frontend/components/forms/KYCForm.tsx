"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { KYCSchema, KYCInput } from "@/lib/validators/kyc.schema";
import { useAppStore } from "@/store/useAppStore";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { FileUp, Eye, CheckCircle, Calendar } from "lucide-react";
import toast from "react-hot-toast";

const formatDateToYYYYMMDD = (dateVal: any) => {
  if (!dateVal) return "";
  try {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return "";
    return d.toISOString().split("T")[0];
  } catch (e) {
    return "";
  }
};

export default function KYCForm() {
  const { wizardData, updateWizardData, setWizardStep } = useAppStore();
  const [files, setFiles] = useState<Record<string, File | null>>({
    selfie: wizardData.selfieFile || null,
    identityFront: wizardData.identityFrontFile || null,
    identityBack: wizardData.identityBackFile || null,
    addressProof: wizardData.addressProofFile || null,
    incomeProof: wizardData.incomeProofFile || null,
    bankStatement: wizardData.bankStatementFile || null,
    employerLetter: wizardData.employerLetterFile || null,
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<KYCInput>({
    resolver: zodResolver(KYCSchema) as any,
    defaultValues: {
      identityDoc: {
        type: (wizardData.identityDocType && wizardData.identityDocType !== "cnic")
          ? (wizardData.identityDocType as any)
          : "",
        number: wizardData.identityDocNumber || "",
        expiryDate: (formatDateToYYYYMMDD(wizardData.identityDocExpiryDate) || undefined) as any,
      },
      addressProof: {
        type: (wizardData.addressDocType as any) || "",
        issuedDate: formatDateToYYYYMMDD(wizardData.addressDocIssuedDate) as any,
      },
      incomeProof: {
        type: (wizardData.incomeDocType as any) || "",
      },
    } as any,
  });

  const selectedDocType = watch("identityDoc.type") || "";
  const selectedAddressType = watch("addressProof.type") || "";
  const selectedIncomeType = watch("incomeProof.type") || "";

  const getDocConfig = () => {
    switch (selectedDocType as any) {
      case "aadhaar":
        return {
          numberLabel: "Aadhaar Card Number",
          numberPlaceholder: "e.g. 1234 5678 9012 (12 digits)",
          frontLabel: "Aadhaar Card (Front Photo)",
          backLabel: "Aadhaar Card (Back Photo)",
          showBack: true,
          showExpiry: false,
          hideFields: false,
        };
      case "pan":
        return {
          numberLabel: "PAN Card Number",
          numberPlaceholder: "e.g. ABCDE1234F (10 alphanumeric)",
          frontLabel: "PAN Card (Front Photo)",
          backLabel: "",
          showBack: false,
          showExpiry: false,
          hideFields: false,
        };
      case "driving_license":
        return {
          numberLabel: "Driving License Number",
          numberPlaceholder: "e.g. DL-1420110012345",
          frontLabel: "Driving License (Front Photo)",
          backLabel: "Driving License (Back Photo)",
          showBack: true,
          showExpiry: true,
          hideFields: false,
        };
      case "passport":
        return {
          numberLabel: "Passport Number",
          numberPlaceholder: "e.g. Z1234567 (1 letter + 7 digits)",
          frontLabel: "Passport (Photo Page)",
          backLabel: "Passport (Address Page)",
          showBack: true,
          showExpiry: true,
          hideFields: false,
        };
      case "":
      default:
        return {
          numberLabel: "Document Number",
          numberPlaceholder: "e.g. ID number",
          frontLabel: "Identity Document (Front Photo)",
          backLabel: "Identity Document (Back Photo)",
          showBack: false,
          showExpiry: false,
          hideFields: true,
        };
    }
  };

  const docConfig = getDocConfig();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, key: string) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      if (selectedFile.size > 5 * 1024 * 1024) {
        toast.error("File size cannot exceed 5MB");
        return;
      }
      setFiles((prev) => ({ ...prev, [key]: selectedFile }));
    }
  };

  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSubmit = async (data: KYCInput) => {
    const isPan = data.identityDoc.type === "pan";

    // Validate that required files are selected or already uploaded on the server
    const hasSelfie = files.selfie || wizardData.selfieUrl;
    const hasIdentityFront = files.identityFront || wizardData.identityFrontUrl;
    const hasIdentityBack = files.identityBack || wizardData.identityBackUrl;
    const hasAddressProof = files.addressProof || wizardData.addressProofUrl;
    const hasIncomeProof = files.incomeProof || wizardData.incomeProofUrl;
    const hasBankStatement = files.bankStatement || wizardData.bankStatementUrl;

    if (!hasSelfie) {
      toast.error("Please upload your Selfie Photograph");
      return;
    }
    if (!hasIdentityFront) {
      toast.error("Please upload your Identity Document (Front/Photo Page)");
      return;
    }
    if (!isPan && !hasIdentityBack) {
      toast.error("Please upload your Identity Document (Back/Address Page)");
      return;
    }
    if (!hasAddressProof) {
      toast.error("Please upload your Address Proof Document");
      return;
    }
    if (!hasIncomeProof) {
      toast.error("Please upload your Income Proof Document");
      return;
    }
    if (!hasBankStatement) {
      toast.error("Please upload your Bank Statements");
      return;
    }

    setIsSubmitting(true);
    try {
      const kycFormData = new FormData();
      kycFormData.append("applicationId", wizardData.applicationId);
      kycFormData.append("identityDocType", data.identityDoc.type);
      kycFormData.append("identityDocNumber", data.identityDoc.number);
      kycFormData.append(
        "identityDocExpiryDate",
        data.identityDoc.expiryDate ? data.identityDoc.expiryDate.toISOString() : ""
      );
      kycFormData.append("addressDocType", data.addressProof.type);
      kycFormData.append("addressDocIssuedDate", data.addressProof.issuedDate.toISOString());
      kycFormData.append("incomeDocType", data.incomeProof.type);

      // Append files only if a new file has been chosen
      if (files.selfie) kycFormData.append("selfie", files.selfie);
      if (files.identityFront) kycFormData.append("identityFront", files.identityFront);
      if (!isPan && files.identityBack) kycFormData.append("identityBack", files.identityBack);
      if (files.addressProof) kycFormData.append("addressProof", files.addressProof);
      if (files.incomeProof) kycFormData.append("incomeProof", files.incomeProof);
      if (files.bankStatement) kycFormData.append("bankStatement", files.bankStatement);
      if (files.employerLetter) kycFormData.append("employerLetter", files.employerLetter);

      const kycRes = await fetch("/api/kyc/submit", {
        method: "POST",
        body: kycFormData, // multipart
      });
      const kycJson = await kycRes.json();

      if (!kycRes.ok) {
        throw new Error(kycJson.error || "Failed to upload KYC documents");
      }

      // Save metadata and file references in Zustand store
      updateWizardData({
        identityDocType: data.identityDoc.type,
        identityDocNumber: data.identityDoc.number,
        identityDocExpiryDate: data.identityDoc.expiryDate ? data.identityDoc.expiryDate.toISOString() : "",
        addressDocType: data.addressProof.type,
        addressDocIssuedDate: data.addressProof.issuedDate.toISOString(),
        incomeDocType: data.incomeProof.type,
        
        // Save file objects directly
        selfieFile: files.selfie,
        identityFrontFile: files.identityFront,
        identityBackFile: isPan ? null : files.identityBack,
        addressProofFile: files.addressProof,
        incomeProofFile: files.incomeProof,
        bankStatementFile: files.bankStatement,
        employerLetterFile: files.employerLetter,

        // Save backend URLs returned or updated
        selfieUrl: kycJson.selfieUrl || wizardData.selfieUrl,
        identityFrontUrl: kycJson.frontImageUrl || wizardData.identityFrontUrl,
        identityBackUrl: isPan ? null : (kycJson.backImageUrl || wizardData.identityBackUrl),
        addressProofUrl: kycJson.addressImageUrl || wizardData.addressProofUrl,
        incomeProofUrl: kycJson.incomeProofUrls?.[0] || wizardData.incomeProofUrl,
        bankStatementUrl: kycJson.bankStatementUrls?.[0] || wizardData.bankStatementUrl,
        employerLetterUrl: kycJson.employerLetterUrl || wizardData.employerLetterUrl,
      });

      toast.success("KYC documents uploaded successfully!");
      setWizardStep(4); // Go to step 4 (Collateral Details)
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to upload files. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Styled file upload helper
  const FileSelector = ({ id, label, required = true }: { id: string; label: string; required?: boolean }) => {
    const isSelected = !!files[id];
    
    // Fallback to checking the existing saved file URLs in wizardData
    const savedUrl = wizardData[`${id}Url`] || (id === "selfie" ? wizardData.selfieUrl : null)
      || (id === "identityFront" ? wizardData.identityFrontUrl : null)
      || (id === "identityBack" ? wizardData.identityBackUrl : null)
      || (id === "addressProof" ? wizardData.addressProofUrl : null)
      || (id === "incomeProof" ? wizardData.incomeProofUrl : null)
      || (id === "bankStatement" ? wizardData.bankStatementUrl : null)
      || (id === "employerLetter" ? wizardData.employerLetterUrl : null);

    const hasSaved = !isSelected && !!savedUrl;
    const savedFileName = savedUrl ? (savedUrl.split("/").pop() || "Uploaded File") : "";
    
    const displayName = isSelected
      ? files[id]?.name
      : "Choose File";

    return (
      <div className="space-y-1">
        <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
        <label className={`relative flex items-center justify-between rounded-xl border border-dashed p-3 transition-colors cursor-pointer ${
          isSelected 
            ? "border-green-300 bg-green-50/20 dark:border-green-800" 
            : hasSaved
            ? "border-blue-200 bg-blue-50/10 dark:border-blue-900/10 hover:bg-slate-50 dark:hover:bg-slate-900"
            : "border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950"
        }`}>
          <div className="flex items-center gap-3">
            <div className={`rounded-lg p-1.5 ${
              isSelected 
                ? "bg-green-100 text-green-700 dark:bg-green-900/40" 
                : hasSaved
                ? "bg-blue-50 text-blue-600 dark:bg-blue-900/30"
                : "bg-slate-100 text-slate-500 dark:bg-slate-800"
            }`}>
              {isSelected ? <CheckCircle className="h-5 w-5" /> : <FileUp className="h-5 w-5" />}
            </div>
            <div className="max-w-[200px] overflow-hidden text-left">
              <p className="truncate text-xs font-medium text-slate-700 dark:text-slate-200">
                {displayName}
              </p>
              <p className="text-[10px] text-slate-400">
                {hasSaved ? `Saved: ${savedFileName}` : "PDF, JPG, PNG (Max 5MB)"}
              </p>
            </div>
          </div>
          <input
            type="file"
            accept=".jpg,.png,.pdf"
            onChange={(e) => handleFileChange(e, id)}
            className="hidden"
          />
          {isSelected && (
            <span className="text-[10px] font-semibold text-green-600 dark:text-green-400 bg-green-100/50 px-2 py-0.5 rounded-full dark:bg-green-950/40">
              Selected
            </span>
          )}
          {hasSaved && (
            <span className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 bg-blue-100/50 px-2 py-0.5 rounded-full dark:bg-blue-950/40">
              Uploaded
            </span>
          )}
        </label>
      </div>
    );
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      
      {/* Identity Document Subform */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white border-b border-slate-100 pb-2 dark:border-slate-800">
          Step 3A: Identity Document Details
        </h3>
        <div className={`grid grid-cols-1 gap-4 ${docConfig.showExpiry ? "md:grid-cols-3" : "md:grid-cols-2"}`}>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">ID Document Type</label>
            <Select {...register("identityDoc.type")}>
              <option value="">Please select ID type</option>
              <option value="aadhaar">Aadhaar Card</option>
              <option value="pan">PAN Card</option>
              <option value="driving_license">Driving License</option>
              <option value="passport">Passport</option>
            </Select>
            {errors.identityDoc?.type && (
              <p className="text-xs text-red-500">{errors.identityDoc.type.message}</p>
            )}
          </div>

          {!docConfig.hideFields && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">{docConfig.numberLabel}</label>
              <Input
                type="text"
                placeholder={docConfig.numberPlaceholder}
                error={!!errors.identityDoc?.number}
                {...register("identityDoc.number")}
              />
              {errors.identityDoc?.number && (
                <p className="text-xs text-red-500">{errors.identityDoc.number.message}</p>
              )}
            </div>
          )}

          {!docConfig.hideFields && docConfig.showExpiry && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Expiry Date</label>
              <div className="relative">
                <Input
                  type="date"
                  error={!!errors.identityDoc?.expiryDate}
                  {...register("identityDoc.expiryDate")}
                  onClick={(e) => {
                    try {
                      e.currentTarget.showPicker();
                    } catch (err) {}
                  }}
                  className="pr-10"
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-400 dark:text-slate-500">
                  <Calendar className="h-4.5 w-4.5" />
                </div>
              </div>
              {errors.identityDoc?.expiryDate && (
                <p className="text-xs text-red-500">{errors.identityDoc.expiryDate.message}</p>
              )}
            </div>
          )}
        </div>
        
        {!docConfig.hideFields && (
          <div className={`grid grid-cols-1 gap-4 ${docConfig.showBack ? "md:grid-cols-3" : "md:grid-cols-2"}`}>
            <FileSelector id="selfie" label="Upload Selfie Photograph" />
            <FileSelector id="identityFront" label={docConfig.frontLabel} />
            {docConfig.showBack && (
              <FileSelector id="identityBack" label={docConfig.backLabel} />
            )}
          </div>
        )}
      </div>

      {/* Address Proof Subform */}
      <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white border-b border-slate-100 pb-2 dark:border-slate-800">
          Step 3B: Proof of Address
        </h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Address Proof Document Type</label>
            <Select {...register("addressProof.type")}>
              <option value="">Please select address proof type</option>
              <option value="utility_bill">Utility Bill (Electricity, Gas, Water)</option>
              <option value="bank_statement">Bank Statement (With Address)</option>
              <option value="rent_agreement">Rent Agreement</option>
            </Select>
            {errors.addressProof?.type && (
              <p className="text-xs text-red-500">{errors.addressProof.type.message}</p>
            )}
          </div>

          {selectedAddressType && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Document Issued Date</label>
              <div className="relative">
                <Input
                  type="date"
                  error={!!errors.addressProof?.issuedDate}
                  {...register("addressProof.issuedDate")}
                  onClick={(e) => {
                    try {
                      e.currentTarget.showPicker();
                    } catch (err) {}
                  }}
                  className="pr-10"
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-400 dark:text-slate-500">
                  <Calendar className="h-4.5 w-4.5" />
                </div>
              </div>
              {errors.addressProof?.issuedDate && (
                <p className="text-xs text-red-500">{errors.addressProof.issuedDate.message}</p>
              )}
            </div>
          )}
        </div>
        
        {selectedAddressType && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <FileSelector id="addressProof" label="Upload Address Proof Document" />
            <FileSelector id="employerLetter" label="Upload Employer Letter (Optional)" required={false} />
          </div>
        )}
      </div>

      {/* Income & Bank Proof Subform */}
      <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white border-b border-slate-100 pb-2 dark:border-slate-800">
          Step 3C: Income & Bank Statements
        </h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-1">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Income Verification Proof Type</label>
            <Select {...register("incomeProof.type")}>
              <option value="">Please select income verification type</option>
              <option value="salary_slip">Salary Slip / Certificate</option>
              <option value="bank_statement">Certified Bank Statement (Income Credit)</option>
              <option value="tax_return">Federal Tax Returns</option>
              <option value="business_registration">Business Registration Certificate</option>
            </Select>
            {errors.incomeProof?.type && (
              <p className="text-xs text-red-500">{errors.incomeProof.type.message}</p>
            )}
          </div>
        </div>
        
        {selectedIncomeType && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <FileSelector id="incomeProof" label="Upload Income Proof File" />
            <FileSelector id="bankStatement" label="Upload Bank Statements (3-6 Months)" />
          </div>
        )}
      </div>

      <div className="flex justify-between pt-4 border-t border-slate-100 dark:border-slate-800/60">
        <Button type="button" variant="outline" onClick={() => setWizardStep(1)}>
          Back: Loan Info
        </Button>
        <Button type="submit" isLoading={isSubmitting}>
          Next: Collateral Info
        </Button>
      </div>
    </form>
  );
}
