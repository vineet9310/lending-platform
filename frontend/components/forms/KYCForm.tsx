"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { KYCSchema, KYCInput } from "@/lib/validators/kyc.schema";
import { useAppStore } from "@/store/useAppStore";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { FileUp, Eye, CheckCircle } from "lucide-react";
import toast from "react-hot-toast";

export default function KYCForm() {
  const { wizardData, updateWizardData, setWizardStep } = useAppStore();
  const [files, setFiles] = useState<Record<string, File | null>>({
    selfie: null,
    identityFront: null,
    identityBack: null,
    addressProof: null,
    incomeProof: null,
    bankStatement: null,
    employerLetter: null,
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<KYCInput>({
    resolver: zodResolver(KYCSchema) as any,
    defaultValues: {
      identityDoc: {
        type: wizardData.identityDocType,
        number: wizardData.identityDocNumber,
        expiryDate: wizardData.identityDocExpiryDate ? new Date(wizardData.identityDocExpiryDate) : undefined,
      },
      addressProof: {
        type: wizardData.addressDocType,
        issuedDate: wizardData.addressDocIssuedDate ? new Date(wizardData.addressDocIssuedDate) : undefined,
      },
      incomeProof: {
        type: wizardData.incomeDocType,
      },
    },
  });

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

  const onSubmit = (data: KYCInput) => {
    // Validate that required files are selected
    if (!files.selfie || !files.identityFront || !files.identityBack || !files.addressProof || !files.incomeProof || !files.bankStatement) {
      toast.error("Please upload all required documents (Selfie, Front/Back ID, Address Proof, Income Proof, Bank Statement)");
      return;
    }

    // Save metadata and file references in Zustand store
    updateWizardData({
      identityDocType: data.identityDoc.type,
      identityDocNumber: data.identityDoc.number,
      identityDocExpiryDate: data.identityDoc.expiryDate.toISOString(),
      addressDocType: data.addressProof.type,
      addressDocIssuedDate: data.addressProof.issuedDate.toISOString(),
      incomeDocType: data.incomeProof.type,
      
      // Save file objects directly
      selfieFile: files.selfie,
      identityFrontFile: files.identityFront,
      identityBackFile: files.identityBack,
      addressProofFile: files.addressProof,
      incomeProofFile: files.incomeProof,
      bankStatementFile: files.bankStatement,
      employerLetterFile: files.employerLetter,
    });

    setWizardStep(4); // Go to step 4 (Collateral Details)
  };

  // Styled file upload helper
  const FileSelector = ({ id, label, required = true }: { id: string; label: string; required?: boolean }) => {
    const isSelected = !!files[id];
    return (
      <div className="space-y-1">
        <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
        <div className={`relative flex items-center justify-between rounded-xl border border-dashed p-3 transition-colors ${
          isSelected 
            ? "border-green-300 bg-green-50/20 dark:border-green-800" 
            : "border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950"
        }`}>
          <div className="flex items-center gap-3">
            <div className={`rounded-lg p-1.5 ${isSelected ? "bg-green-100 text-green-700 dark:bg-green-900/40" : "bg-blue-50 text-blue-600 dark:bg-blue-900/30"}`}>
              {isSelected ? <CheckCircle className="h-5 w-5" /> : <FileUp className="h-5 w-5" />}
            </div>
            <div className="max-w-[200px] overflow-hidden text-left">
              <p className="truncate text-xs font-medium text-slate-700 dark:text-slate-200">
                {isSelected ? files[id]?.name : "Choose File"}
              </p>
              <p className="text-[10px] text-slate-400">PDF, JPG, PNG (Max 5MB)</p>
            </div>
          </div>
          <input
            type="file"
            accept=".jpg,.png,.pdf"
            onChange={(e) => handleFileChange(e, id)}
            className="absolute inset-0 cursor-pointer opacity-0"
          />
          {isSelected && (
            <span className="text-[10px] font-semibold text-green-600 dark:text-green-400 bg-green-100/50 px-2 py-0.5 rounded-full dark:bg-green-950/40">
              Selected
            </span>
          )}
        </div>
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
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">ID Document Type</label>
            <Select {...register("identityDoc.type")}>
              <option value="cnic">National ID (CNIC)</option>
              <option value="passport">Passport</option>
              <option value="driving_license">Driving License</option>
            </Select>
            {errors.identityDoc?.type && (
              <p className="text-xs text-red-500">{errors.identityDoc.type.message}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Document Number</label>
            <Input
              type="text"
              placeholder="e.g. 42101-XXXXXXX-X"
              error={!!errors.identityDoc?.number}
              {...register("identityDoc.number")}
            />
            {errors.identityDoc?.number && (
              <p className="text-xs text-red-500">{errors.identityDoc.number.message}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Expiry Date</label>
            <Input
              type="date"
              error={!!errors.identityDoc?.expiryDate}
              {...register("identityDoc.expiryDate")}
            />
            {errors.identityDoc?.expiryDate && (
              <p className="text-xs text-red-500">{errors.identityDoc.expiryDate.message}</p>
            )}
          </div>
        </div>
        
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <FileSelector id="selfie" label="Upload Selfie Photograph" />
          <FileSelector id="identityFront" label="Identity Document (Front Photo)" />
          <FileSelector id="identityBack" label="Identity Document (Back Photo)" />
        </div>
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
              <option value="utility_bill">Utility Bill (Electricity, Gas, Water)</option>
              <option value="bank_statement">Bank Statement (With Address)</option>
              <option value="rent_agreement">Rent Agreement</option>
            </Select>
            {errors.addressProof?.type && (
              <p className="text-xs text-red-500">{errors.addressProof.type.message}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Document Issued Date</label>
            <Input
              type="date"
              error={!!errors.addressProof?.issuedDate}
              {...register("addressProof.issuedDate")}
            />
            {errors.addressProof?.issuedDate && (
              <p className="text-xs text-red-500">{errors.addressProof.issuedDate.message}</p>
            )}
          </div>
        </div>
        
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FileSelector id="addressProof" label="Upload Address Proof Document" />
          <FileSelector id="employerLetter" label="Upload Employer Letter (Optional)" required={false} />
        </div>
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
        
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FileSelector id="incomeProof" label="Upload Income Proof File" />
          <FileSelector id="bankStatement" label="Upload Bank Statements (3-6 Months)" />
        </div>
      </div>

      <div className="flex justify-between pt-4 border-t border-slate-100 dark:border-slate-800/60">
        <Button type="button" variant="outline" onClick={() => setWizardStep(1)}>
          Back: Loan Info
        </Button>
        <Button type="submit">
          Next: Collateral Info
        </Button>
      </div>
    </form>
  );
}
