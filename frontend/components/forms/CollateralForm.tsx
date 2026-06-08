"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CollateralSchema, CollateralInput } from "@/lib/validators/collateral.schema";
import { useAppStore } from "@/store/useAppStore";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { FileUp, CheckCircle } from "lucide-react";
import toast from "react-hot-toast";

export default function CollateralForm() {
  const { wizardData, updateWizardData, setWizardStep } = useAppStore();
  const currency = process.env.NEXT_PUBLIC_CURRENCY || "₹";
  const [files, setFiles] = useState<Record<string, File | null>>({
    ownership_deed: null,
    valuation_report: null,
    registration: null,
    insurance: null,
    other: null,
  });

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<CollateralInput>({
    resolver: zodResolver(CollateralSchema) as any,
    defaultValues: {
      type: wizardData.collateralType || "",
      description: wizardData.collateralDescription || "",
      estimatedValue: wizardData.collateralValue || "" as any,
      location: wizardData.collateralLocation || "",
      registrationNumber: wizardData.collateralRegistrationNumber || "",
    } as any,
  });

  const collateralType = watch("type") || "";

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

  const onSubmit = async (data: CollateralInput) => {
    // Check if at least one ownership document is uploaded or exists on the server
    const hasDoc = Object.keys(files).some((k) => !!files[k]) ||
      !!wizardData.ownership_deedUrl ||
      !!wizardData.valuation_reportUrl ||
      !!wizardData.registrationUrl ||
      !!wizardData.insuranceUrl ||
      !!wizardData.otherUrl;

    if (!hasDoc) {
      toast.error("Please upload at least one supporting document (e.g. Ownership Deed, Registration, or Valuation Report)");
      return;
    }

    setIsSubmitting(true);
    try {
      const collateralFormData = new FormData();
      collateralFormData.append("applicationId", wizardData.applicationId);
      collateralFormData.append("type", data.type);
      collateralFormData.append("description", data.description);
      collateralFormData.append("estimatedValue", data.estimatedValue.toString());
      collateralFormData.append("location", data.location || "");
      collateralFormData.append("registrationNumber", data.registrationNumber || "");

      // Append collateral files
      Object.keys(files).forEach((k) => {
        const file = files[k];
        if (file) collateralFormData.append(k, file);
      });

      const colRes = await fetch("/api/collateral/submit", {
        method: "POST",
        body: collateralFormData,
      });
      const colJson = await colRes.json();

      if (!colRes.ok) {
        throw new Error(colJson.error || "Failed to submit collateral details");
      }

      // Save collateral data and files to Zustand
      const updatedDocs = colJson.documents || [];
      const updatedDocsUrls: Record<string, string> = {};
      updatedDocs.forEach((d: any) => {
        updatedDocsUrls[`${d.docType}Url`] = d.fileUrl;
      });

      updateWizardData({
        collateralType: data.type,
        collateralDescription: data.description,
        collateralValue: data.estimatedValue,
        collateralLocation: data.location || "",
        collateralRegistrationNumber: data.registrationNumber || "",
        
        // Save collateral file objects
        collateralFiles: files,

        // Update URLs
        ownership_deedUrl: updatedDocsUrls.ownership_deedUrl || wizardData.ownership_deedUrl,
        valuation_reportUrl: updatedDocsUrls.valuation_reportUrl || wizardData.valuation_reportUrl,
        registrationUrl: updatedDocsUrls.registrationUrl || wizardData.registrationUrl,
        insuranceUrl: updatedDocsUrls.insuranceUrl || wizardData.insuranceUrl,
        otherUrl: updatedDocsUrls.otherUrl || wizardData.otherUrl,
      });

      toast.success("Collateral documents submitted successfully!");
      setWizardStep(5); // Go to step 5 (Final Review & Submit)
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to submit collateral. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const FileSelector = ({ id, label, required = false }: { id: string; label: string; required?: boolean }) => {
    const isSelected = !!files[id];
    
    // Fallback to checking the existing saved file URLs in wizardData
    const savedUrl = wizardData[`${id}Url`] || wizardData[id];

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
      
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Collateral Asset Type */}
        <div className="space-y-1.5 md:col-span-2">
          <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Collateral Type</label>
          <Select {...register("type")}>
            <option value="">Please select collateral type</option>
            <option value="gold">Gold Ornaments / Bullion</option>
            <option value="real_estate">Real Estate Property (Land/Home)</option>
            <option value="vehicle">Motor Vehicle</option>
            <option value="fixed_deposit">Fixed Deposit Receipts</option>
            <option value="shares">Listed Equities / Shares</option>
            <option value="machinery">Industrial Machinery</option>
            <option value="other">Other Assets</option>
          </Select>
          {errors.type && (
            <p className="text-xs text-red-500">{errors.type.message}</p>
          )}
        </div>

        {collateralType && (
          <>
            {/* Estimated Value */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Estimated Market Value ({currency})</label>
              <Input
                type="number"
                placeholder="e.g. 500000"
                error={!!errors.estimatedValue}
                {...register("estimatedValue")}
              />
              {errors.estimatedValue && (
                <p className="text-xs text-red-500">{errors.estimatedValue.message}</p>
              )}
            </div>

            {/* Location for Real Estate */}
            {collateralType === "real_estate" && (
              <div className="space-y-1.5 md:col-span-2">
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Property Address & Location</label>
                <Input
                  type="text"
                  placeholder="e.g. Plot 4B, Phase 6 DHA, Karachi, Pakistan"
                  error={!!errors.location}
                  {...register("location")}
                />
                {errors.location && (
                  <p className="text-xs text-red-500">{errors.location.message}</p>
                )}
              </div>
            )}

            {/* Registration Number for Vehicle */}
            {collateralType === "vehicle" && (
              <div className="space-y-1.5 md:col-span-2">
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Vehicle Registration / Chassis Number</label>
                <Input
                  type="text"
                  placeholder="e.g. LE-24-4903"
                  error={!!errors.registrationNumber}
                  {...register("registrationNumber")}
                />
                {errors.registrationNumber && (
                  <p className="text-xs text-red-500">{errors.registrationNumber.message}</p>
                )}
              </div>
            )}

            {/* Description */}
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Asset Description & Condition</label>
              <textarea
                rows={3}
                placeholder="Describe the asset, standard of gold (karats), model of vehicle, or size of property..."
                className="flex w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 transition-all duration-200 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/10 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-blue-500"
                {...register("description")}
              />
              {errors.description && (
                <p className="text-xs text-red-500">{errors.description.message}</p>
              )}
            </div>
          </>
        )}
      </div>

      {/* Collateral Documents upload */}
      {collateralType && (
        <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white pb-2">
            Supporting Collateral Documents
          </h3>
          <p className="text-xs text-slate-500 -mt-2">Upload proof of ownership, valuation reports, registry deed or insurance coverage papers.</p>
          
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <FileSelector id="ownership_deed" label="Upload Ownership Deed / Gold Receipt" />
            <FileSelector id="valuation_report" label="Upload Asset Valuation Report" />
            <FileSelector id="registration" label="Upload Registration Book / Shares Statement" />
            <FileSelector id="insurance" label="Upload Insurance Policy Document (If any)" />
          </div>
        </div>
      )}

      <div className="flex justify-between pt-4 border-t border-slate-100 dark:border-slate-800/60">
        <Button type="button" variant="outline" onClick={() => setWizardStep(3)}>
          Back: Upload KYC
        </Button>
        <Button type="submit" isLoading={isSubmitting}>
          Next: Review Application
        </Button>
      </div>
    </form>
  );
}
