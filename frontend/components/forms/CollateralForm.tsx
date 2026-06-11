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
    asset_image: null,
    blank_cheque: null,
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
    // Validate mandatory asset image or blank cheque scan
    if (data.type === "blank_cheque") {
      const hasCheque = !!files.blank_cheque || !!wizardData.blank_chequeUrl;
      if (!hasCheque) {
        toast.error("Please upload a scan/photo of the Blank Cheque as mandatory proof.");
        return;
      }
    } else {
      const hasAssetImage = !!files.asset_image || !!wizardData.asset_imageUrl;
      if (!hasAssetImage) {
        toast.error("Please upload an image/photo of the collateral asset as mandatory proof.");
        return;
      }
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
        asset_imageUrl: updatedDocsUrls.asset_imageUrl || wizardData.asset_imageUrl,
        blank_chequeUrl: updatedDocsUrls.blank_chequeUrl || wizardData.blank_chequeUrl,
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

  // Dynamic labels and placeholders based on collateralType
  const getFieldLabels = () => {
    switch (collateralType) {
      case "real_estate":
        return {
          valueLabel: `Estimated Market Value (${currency})`,
          valuePlaceholder: "e.g. 5000000",
          locationLabel: "Property Address & Location",
          locationPlaceholder: "e.g. Plot 4B, Phase 6 DHA, Karachi",
          regLabel: "Registry / Deed / Khata Number",
          regPlaceholder: "e.g. REG-789-2024",
          showLocation: true,
          showReg: true,
          descPlaceholder: "Describe the property size, condition, and any specific landmarks...",
        };
      case "vehicle":
        return {
          valueLabel: `Estimated Vehicle Value (${currency})`,
          valuePlaceholder: "e.g. 1500000",
          locationLabel: "Registration City / Current Location",
          locationPlaceholder: "e.g. Lahore, Punjab",
          regLabel: "Vehicle Registration / Chassis Number",
          regPlaceholder: "e.g. LE-24-4903",
          showLocation: true,
          showReg: true,
          descPlaceholder: "Describe the make, model, year, mileage, and general condition...",
        };
      case "blank_cheque":
        return {
          valueLabel: `Cheque Guarantee Value / Max Limit (${currency})`,
          valuePlaceholder: "e.g. 500000 (Nominal guarantee amount)",
          locationLabel: "Bank Name & Branch",
          locationPlaceholder: "e.g. HBL Mall Road Branch, Lahore",
          regLabel: "Cheque Number & Account Number",
          regPlaceholder: "e.g. Chq: 98765432, Acc: 1234567890",
          showLocation: true,
          showReg: true,
          descPlaceholder: "Provide bank account holder name, cheque book details, and any terms...",
        };
      case "gold":
        return {
          valueLabel: `Estimated Gold Value (${currency})`,
          valuePlaceholder: "e.g. 300000",
          locationLabel: "Current Location (e.g. Self Custody / Bank Locker)",
          locationPlaceholder: "e.g. Bank Locker, DHA Branch",
          regLabel: "Gold Certificate / Receipt Number (If any)",
          regPlaceholder: "e.g. GLD-8821",
          showLocation: true,
          showReg: true,
          descPlaceholder: "Describe the gold weight in grams, purity in Karats (e.g., 22K), ornaments description...",
        };
      case "fixed_deposit":
        return {
          valueLabel: `Fixed Deposit Principal Value (${currency})`,
          valuePlaceholder: "e.g. 1000000",
          locationLabel: "Issuing Bank Name & Branch",
          locationPlaceholder: "e.g. Allied Bank, Gulberg Branch",
          regLabel: "FD Receipt / Account Number",
          regPlaceholder: "e.g. FDR-456789-2026",
          showLocation: true,
          showReg: true,
          descPlaceholder: "Describe FD maturity date, interest rate, issuing branch, and nominee details...",
        };
      case "shares":
        return {
          valueLabel: `Current Portfolio Value (${currency})`,
          valuePlaceholder: "e.g. 800000",
          locationLabel: "Brokerage House / CDC Custodian Name",
          locationPlaceholder: "e.g. CDC Pakistan / KASB Securities",
          regLabel: "CDC Account / Folio Number",
          regPlaceholder: "e.g. CDC-9876-21",
          showLocation: true,
          showReg: true,
          descPlaceholder: "Describe the ticker symbols, number of shares, and broker details...",
        };
      case "machinery":
        return {
          valueLabel: `Estimated Machinery Value (${currency})`,
          valuePlaceholder: "e.g. 1200000",
          locationLabel: "Factory / Storage Location",
          locationPlaceholder: "e.g. Industrial Area Phase 1, Islamabad",
          regLabel: "Serial / Purchase Invoice Number",
          regPlaceholder: "e.g. SN-MAC-5542",
          showLocation: true,
          showReg: true,
          descPlaceholder: "Describe the machine type, model, manufacturer, year, and operational status...",
        };
      default:
        return {
          valueLabel: `Estimated Market Value (${currency})`,
          valuePlaceholder: "e.g. 500000",
          locationLabel: "Asset Storage Location / Address",
          locationPlaceholder: "e.g. Main Warehouse, Karachi",
          regLabel: "Asset Registration / Serial Number (If any)",
          regPlaceholder: "e.g. SN-998877",
          showLocation: true,
          showReg: true,
          descPlaceholder: "Describe the asset, standard of gold (karats), model of vehicle, or size of property...",
        };
    }
  };

  const labels = getFieldLabels();

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
            <option value="blank_cheque">Blank Cheque</option>
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
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                {labels.valueLabel} <span className="text-red-500">*</span>
              </label>
              <Input
                type="number"
                placeholder={labels.valuePlaceholder}
                error={!!errors.estimatedValue}
                {...register("estimatedValue")}
              />
              {errors.estimatedValue && (
                <p className="text-xs text-red-500">{errors.estimatedValue.message}</p>
              )}
            </div>

            {/* Location */}
            {labels.showLocation && (
              <div className="space-y-1.5 md:col-span-2">
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  {labels.locationLabel}
                </label>
                <Input
                  type="text"
                  placeholder={labels.locationPlaceholder}
                  error={!!errors.location}
                  {...register("location")}
                />
                {errors.location && (
                  <p className="text-xs text-red-500">{errors.location.message}</p>
                )}
              </div>
            )}

            {/* Registration Number */}
            {labels.showReg && (
              <div className="space-y-1.5 md:col-span-2">
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  {labels.regLabel}
                </label>
                <Input
                  type="text"
                  placeholder={labels.regPlaceholder}
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
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Asset Description & Details <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={3}
                placeholder={labels.descPlaceholder}
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
          <p className="text-xs text-slate-500 -mt-2">
            {collateralType === "blank_cheque"
              ? "Please upload a photo/scan of the blank cheque as mandatory proof."
              : "Please upload an image of the asset as mandatory proof, along with other supporting documents."}
          </p>
          
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {collateralType === "blank_cheque" ? (
              <FileSelector id="blank_cheque" label="Upload Scan of Blank Cheque" required={true} />
            ) : (
              <>
                <FileSelector id="asset_image" label="Upload Asset Image / Photo Proof" required={true} />
                <FileSelector id="ownership_deed" label="Upload Ownership Deed / Gold Receipt" />
                <FileSelector id="valuation_report" label="Upload Asset Valuation Report" />
                <FileSelector id="registration" label="Upload Registration Book / Shares Statement" />
                <FileSelector id="insurance" label="Upload Insurance Policy Document (If any)" />
              </>
            )}
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
