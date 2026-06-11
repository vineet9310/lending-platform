"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ArrowLeft, Check, X, ShieldAlert, Activity, ExternalLink, User, Mail, Phone, Fingerprint, Calendar, MapPin, DollarSign, Clock, FileText, Landmark, Briefcase, FileSpreadsheet } from "lucide-react";

interface Application {
  _id: string;
  applicationNumber: string;
  amountRequested: number;
  tenureMonths: number;
  purpose: string;
  status: string;
  borrower: {
    fullName: string;
    email: string;
    phone: string;
    address?: {
      street?: string;
      city?: string;
      province?: string;
      country?: string;
    };
  };
}

interface KYCRecord {
  _id: string;
  identityDoc: {
    type: string;
    number: string;
    frontImageUrl: string;
    backImageUrl: string;
    expiryDate: string;
  };
  selfieUrl: string;
  addressProof: {
    type: string;
    imageUrl: string;
    issuedDate: string;
  };
  incomeProof: {
    type: string;
    documentUrls: string[];
  };
  employerLetter?: string;
  bankStatements: string[];
  verificationStatus: string;
}

export default function KYCReviewPage({ params }: { params: Promise<{ applicationId: string }> }) {
  const { applicationId } = React.use(params);
  const router = useRouter();

  const [application, setApplication] = useState<Application | null>(null);
  const [kyc, setKyc] = useState<KYCRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const [notes, setNotes] = useState("");
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);

  const fetchKycDetails = async () => {
    try {
      // Fetch details from our unified route /api/loans/[id] which returns application + kyc
      const res = await fetch(`/api/loans/${applicationId}`);
      const json = await res.json();
      
      if (json.success) {
        setApplication(json.application);
        setKyc(json.kyc);
      } else {
        toast.error("Failed to load KYC record details");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error loading KYC details");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchKycDetails();
  }, [applicationId]);

  const handleApprove = async () => {
    if (!kyc) return;
    setIsApproving(true);
    try {
      const res = await fetch(`/api/kyc/verify/${kyc._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes }),
      });
      const data = await res.json();

      if (data.success) {
        toast.success("KYC verification approved!");
        router.push("/agent/applications");
      } else {
        toast.error(data.error || "Failed to approve KYC");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error approving verification");
    } finally {
      setIsApproving(false);
    }
  };

  const handleReject = async () => {
    if (!kyc) return;
    const reason = window.prompt("Enter detailed reason for KYC rejection:");
    if (!reason) {
      toast.error("Rejection reason is required to reject KYC");
      return;
    }

    setIsRejecting(true);
    try {
      const res = await fetch(`/api/kyc/reject/${kyc._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      const data = await res.json();

      if (data.success) {
        toast.success("KYC verification rejected.");
        router.push("/agent/applications");
      } else {
        toast.error(data.error || "Failed to reject KYC");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error rejecting verification");
    } finally {
      setIsRejecting(false);
    }
  };

  const currency = process.env.NEXT_PUBLIC_CURRENCY || "PKR";

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Activity className="h-6 w-6 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!application || !kyc) {
    return (
      <div className="text-center py-12">
        <p className="text-sm text-slate-500">KYC verification record not found for this application.</p>
        <Link href="/agent/applications" className="text-xs text-blue-600 hover:underline mt-2 inline-block">
          Go back to pipeline list
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Premium Header Status Banner */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-5 dark:border-slate-800 dark:bg-slate-950 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/40">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-slate-900 dark:text-white">KYC Verification Review</h1>
              <span className="text-[10px] font-bold bg-amber-50 text-amber-600 border border-amber-200/60 px-2 py-0.5 rounded-full dark:bg-amber-950/20">
                Pending Verification
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Application Ref: <span className="font-semibold text-slate-700 dark:text-slate-350">{application.applicationNumber}</span> | Applicant: <span className="font-semibold text-slate-700 dark:text-slate-350">{application.borrower?.fullName}</span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/agent/applications">
            <Button variant="outline" size="sm" className="h-9 text-xs flex items-center gap-1.5 border-slate-200 hover:bg-slate-50">
              <ArrowLeft className="h-4 w-4" /> Back to Queue
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left Column: Auditing Files & Document Verification */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Document Verification Gallery */}
          <Card className="border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-950 shadow-sm">
            <CardHeader className="border-b border-slate-100 dark:border-slate-800/60 pb-4">
              <CardTitle className="text-sm font-bold text-slate-900 dark:text-white">Primary Identity Documents</CardTitle>
              <CardDescription>Verify photograph authenticity and check name matches on ID credentials.</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              {/* Selfie & ID documents */}
              <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                <div className="space-y-2.5 text-center border border-slate-100 p-4 rounded-2xl dark:border-slate-850 hover:shadow-md hover:border-slate-200 transition-all bg-slate-50/25 dark:bg-slate-950">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Selfie Photograph</span>
                  <div className="overflow-hidden rounded-xl border border-slate-100 dark:border-slate-800">
                    <img src={kyc.selfieUrl} alt="Selfie" className="h-36 w-full object-cover bg-slate-55/40 hover:scale-105 transition-all duration-300" />
                  </div>
                  <a href={kyc.selfieUrl} target="_blank" rel="noreferrer" className="text-[10px] text-blue-655 hover:underline inline-flex items-center gap-1 mt-1.5 font-bold">
                    Open Full Resolution <ExternalLink className="h-3 w-3" />
                  </a>
                </div>

                <div className="space-y-2.5 text-center border border-slate-100 p-4 rounded-2xl dark:border-slate-850 hover:shadow-md hover:border-slate-200 transition-all bg-slate-50/25 dark:bg-slate-950">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Identity Front ({kyc.identityDoc?.type?.toUpperCase()})</span>
                  <div className="overflow-hidden rounded-xl border border-slate-100 dark:border-slate-800">
                    <img src={kyc.identityDoc?.frontImageUrl} alt="ID Front" className="h-36 w-full object-cover bg-slate-55/40 hover:scale-105 transition-all duration-300" />
                  </div>
                  <a href={kyc.identityDoc?.frontImageUrl} target="_blank" rel="noreferrer" className="text-[10px] text-blue-655 hover:underline inline-flex items-center gap-1 mt-1.5 font-bold">
                    Open Full Resolution <ExternalLink className="h-3 w-3" />
                  </a>
                </div>

                {kyc.identityDoc?.type === "pan" ? (
                  <div className="space-y-2.5 text-center border border-slate-100 p-4 rounded-2xl dark:border-slate-850 bg-slate-50/50 dark:bg-slate-900/10 flex flex-col justify-center items-center h-[218px]">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Identity Back</span>
                    <p className="text-xs text-slate-450 italic">Not applicable for PAN Card</p>
                  </div>
                ) : (
                  <div className="space-y-2.5 text-center border border-slate-100 p-4 rounded-2xl dark:border-slate-850 hover:shadow-md hover:border-slate-200 transition-all bg-slate-50/25 dark:bg-slate-950">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Identity Back ({kyc.identityDoc?.type?.toUpperCase()})</span>
                    {kyc.identityDoc?.backImageUrl ? (
                      <>
                        <div className="overflow-hidden rounded-xl border border-slate-100 dark:border-slate-800">
                          <img src={kyc.identityDoc?.backImageUrl} alt="ID Back" className="h-36 w-full object-cover bg-slate-55/40 hover:scale-105 transition-all duration-300" />
                        </div>
                        <a href={kyc.identityDoc?.backImageUrl} target="_blank" rel="noreferrer" className="text-[10px] text-blue-655 hover:underline inline-flex items-center gap-1 mt-1.5 font-bold">
                          Open Full Resolution <ExternalLink className="h-3 w-3" />
                        </a>
                      </>
                    ) : (
                      <div className="flex items-center justify-center h-36 bg-slate-55/40 rounded-xl border border-slate-200/40">
                        <p className="text-xs text-slate-400 italic">No Back Image Uploaded</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Address & Income Statements Audit Panel */}
          <Card className="border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-950 shadow-sm">
            <CardHeader className="border-b border-slate-100 dark:border-slate-800/60 pb-4">
              <CardTitle className="text-sm font-bold text-slate-900 dark:text-white">Address & Financial Verification</CardTitle>
              <CardDescription>Audit residency details and cross-check bank statement inflows with stated income.</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                {/* Address proof */}
                <div className="space-y-3 border border-slate-100 p-4 rounded-2xl dark:border-slate-850 hover:shadow-md hover:border-slate-200 transition-all bg-slate-50/25 dark:bg-slate-950">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold text-slate-450 uppercase tracking-wider">Address Proof ({kyc.addressProof?.type?.replace("_", " ")})</span>
                  </div>
                  <div className="overflow-hidden rounded-xl border border-slate-100 dark:border-slate-800">
                    <img src={kyc.addressProof?.imageUrl} alt="Address proof" className="h-44 w-full object-cover bg-slate-55/40 hover:scale-102 transition-all duration-350" />
                  </div>
                  <div className="text-center">
                    <a href={kyc.addressProof?.imageUrl} target="_blank" rel="noreferrer" className="text-[10px] text-blue-655 hover:underline inline-flex items-center gap-1 font-bold">
                      Open Full Resolution <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </div>

                {/* Verification Links Matrix */}
                <div className="border border-slate-100 p-5 rounded-2xl bg-slate-50/40 dark:bg-slate-900/10 dark:border-slate-850/60 flex flex-col justify-between">
                  <div className="space-y-4">
                    <span className="text-[10px] font-bold text-slate-450 uppercase tracking-wider block border-b border-slate-200/50 pb-2 dark:border-slate-850">
                      Supporting Verification Files
                    </span>
                    
                    {/* Income proof */}
                    <div className="text-xs space-y-2">
                      <div className="flex items-center gap-1.5 text-slate-650 dark:text-slate-350">
                        <FileSpreadsheet className="h-4.5 w-4.5 text-blue-500 flex-shrink-0" />
                        <p className="font-semibold text-slate-700 dark:text-slate-300">
                          Income Proof: <span className="font-bold text-slate-800 dark:text-slate-150 capitalize">{kyc.incomeProof?.type?.replace("_", " ")}</span>
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2 pl-6">
                        {kyc.incomeProof?.documentUrls?.map((url, i) => (
                          <a key={i} href={url} target="_blank" rel="noreferrer" className="bg-white border border-slate-200 text-blue-600 px-3 py-1.5 rounded-xl hover:bg-blue-50/35 hover:underline text-[10px] font-semibold dark:bg-slate-950 dark:border-slate-800 flex items-center gap-1 shadow-sm">
                            Income Document #{i + 1} <ExternalLink className="h-3 w-3 text-blue-500" />
                          </a>
                        ))}
                      </div>
                    </div>

                    {/* Bank Statements */}
                    <div className="text-xs space-y-2 border-t border-slate-200/40 pt-3 dark:border-slate-850/60">
                      <div className="flex items-center gap-1.5 text-slate-650 dark:text-slate-355">
                        <Landmark className="h-4.5 w-4.5 text-blue-500 flex-shrink-0" />
                        <p className="font-semibold text-slate-700 dark:text-slate-300">Bank Statements (3-6 Months)</p>
                      </div>
                      <div className="flex flex-wrap gap-2 pl-6">
                        {kyc.bankStatements?.map((url, i) => (
                          <a key={i} href={url} target="_blank" rel="noreferrer" className="bg-white border border-slate-200 text-blue-600 px-3 py-1.5 rounded-xl hover:bg-blue-50/35 hover:underline text-[10px] font-semibold dark:bg-slate-950 dark:border-slate-800 flex items-center gap-1 shadow-sm">
                            Bank Statement #{i + 1} <ExternalLink className="h-3 w-3 text-blue-500" />
                          </a>
                        ))}
                      </div>
                    </div>

                    {/* Employer letter */}
                    {kyc.employerLetter && (
                      <div className="text-xs space-y-2 border-t border-slate-200/40 pt-3 dark:border-slate-850/60">
                        <div className="flex items-center gap-1.5 text-slate-650 dark:text-slate-355">
                          <Briefcase className="h-4.5 w-4.5 text-blue-500 flex-shrink-0" />
                          <p className="font-semibold text-slate-700 dark:text-slate-300">Employer Verification Letter</p>
                        </div>
                        <div className="pl-6">
                          <a href={kyc.employerLetter} target="_blank" rel="noreferrer" className="bg-white border border-slate-200 text-blue-600 px-3 py-1.5 rounded-xl hover:bg-blue-50/35 hover:underline text-[10px] font-semibold dark:bg-slate-950 dark:border-slate-800 inline-flex items-center gap-1 shadow-sm">
                            View Letter File <ExternalLink className="h-3 w-3 text-blue-500" />
                          </a>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Decisions & Audit Profile */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-950 shadow-sm h-full">
            <CardHeader className="border-b border-slate-100 dark:border-slate-800/60 pb-4">
              <CardTitle className="text-sm font-bold text-slate-900 dark:text-white">Audit Profile Dashboard</CardTitle>
              <CardDescription>Check applicant personal data & parameters</CardDescription>
            </CardHeader>
            <CardContent className="pt-5 space-y-5 text-xs">
              
              {/* Personal Info */}
              <div className="space-y-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Personal Details</span>
                <div className="space-y-2 bg-slate-50/50 p-3.5 rounded-2xl dark:bg-slate-900/10 border border-slate-150/40 dark:border-slate-850">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-450 flex items-center gap-1.5"><User className="h-4 w-4 text-slate-450" /> Full Name:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{application.borrower?.fullName}</span>
                  </div>
                  <div className="flex justify-between items-center border-t border-slate-200/40 pt-2 dark:border-slate-800/50">
                    <span className="text-slate-455 flex items-center gap-1.5"><Mail className="h-4 w-4 text-slate-450" /> Email Address:</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-250 truncate max-w-[140px]" title={application.borrower?.email}>{application.borrower?.email}</span>
                  </div>
                  <div className="flex justify-between items-center border-t border-slate-200/40 pt-2 dark:border-slate-800/50">
                    <span className="text-slate-455 flex items-center gap-1.5"><Phone className="h-4 w-4 text-slate-455" /> Phone:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{application.borrower?.phone}</span>
                  </div>
                </div>
              </div>

              {/* ID & Address Verification metadata */}
              <div className="space-y-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Identity & Residency Docs</span>
                <div className="space-y-2 bg-slate-50/50 p-3.5 rounded-2xl dark:bg-slate-900/10 border border-slate-150/40 dark:border-slate-850">
                  <div className="flex flex-col gap-1">
                    <span className="text-slate-450 flex items-center gap-1.5"><Fingerprint className="h-4 w-4 text-slate-450" /> Decrypted ID Number ({kyc.identityDoc?.type?.toUpperCase()}):</span>
                    <span className="font-bold text-blue-600 dark:text-blue-400 text-sm tracking-wide bg-blue-50/80 px-3 py-1 rounded-xl dark:bg-blue-950/40 text-center w-full block mt-0.5 border border-blue-100/50 dark:border-blue-900/20">
                      {kyc.identityDoc?.number}
                    </span>
                  </div>
                  <div className="flex justify-between items-center border-t border-slate-200/40 pt-2 dark:border-slate-800/50">
                    <span className="text-slate-455 flex items-center gap-1.5"><Calendar className="h-4 w-4 text-slate-455" /> ID Expiry Date:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {kyc.identityDoc?.expiryDate && kyc.identityDoc?.type !== "aadhaar" && kyc.identityDoc?.type !== "pan" ? (
                        new Date(kyc.identityDoc?.expiryDate).toLocaleDateString("en-IN")
                      ) : (
                        <span className="text-slate-400 italic font-normal">No Expiry (Lifetime)</span>
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between items-center border-t border-slate-200/40 pt-2 dark:border-slate-800/50">
                    <span className="text-slate-455 flex items-center gap-1.5"><MapPin className="h-4 w-4 text-slate-455" /> Address Proof Issued:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {new Date(kyc.addressProof?.issuedDate).toLocaleDateString("en-IN")}
                    </span>
                  </div>
                </div>
              </div>

              {/* Financial Profile details */}
              <div className="space-y-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Financial Requirements</span>
                <div className="space-y-2 bg-slate-50/50 p-3.5 rounded-2xl dark:bg-slate-900/10 border border-slate-150/40 dark:border-slate-850">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-455 flex items-center gap-1.5"><DollarSign className="h-4 w-4 text-slate-455" /> Loan Requested:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{currency} {application.amountRequested?.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center border-t border-slate-200/40 pt-2 dark:border-slate-800/50">
                    <span className="text-slate-455 flex items-center gap-1.5"><Activity className="h-4 w-4 text-slate-455" /> Purpose:</span>
                    <span className="font-bold text-slate-850 dark:text-slate-200 capitalize">{application.purpose}</span>
                  </div>
                  <div className="flex justify-between items-center border-t border-slate-200/40 pt-2 dark:border-slate-800/50">
                    <span className="text-slate-455 flex items-center gap-1.5"><Clock className="h-4 w-4 text-slate-455" /> Term Duration:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{application.tenureMonths} Months</span>
                  </div>
                </div>
              </div>

              {/* Decision Action Console */}
              <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Action Audit Console</span>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500">Internal Verification Notes</label>
                  <textarea
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Record CNIC validation notes, bank income credits confirmation..."
                    className="flex w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-xs text-slate-900 transition-all duration-200 focus:border-blue-500 focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500/10"
                  />
                </div>

                <div className="flex gap-3 pt-1">
                  <Button
                    variant="destructive"
                    className="flex-1 text-xs h-10 flex items-center justify-center gap-1.5 bg-red-650 hover:bg-red-700 text-white rounded-xl transition-all shadow-sm"
                    onClick={handleReject}
                    isLoading={isRejecting}
                  >
                    <X className="h-4 w-4" /> Reject KYC
                  </Button>
                  <Button
                    className="flex-1 text-xs h-10 flex items-center justify-center gap-1.5 bg-green-600 hover:bg-green-700 text-white rounded-xl transition-all shadow-sm"
                    onClick={handleApprove}
                    isLoading={isApproving}
                  >
                    <Check className="h-4 w-4" /> Approve KYC
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
