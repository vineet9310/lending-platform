"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ArrowLeft, Check, X, ShieldAlert, Activity, ExternalLink } from "lucide-react";

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

export default function KYCReviewPage({ params }: { params: { applicationId: string } }) {
  const { applicationId } = params;
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-white flex items-center gap-2">
            <ShieldAlert className="h-6 w-6 text-blue-600" /> KYC Verification Review
          </h1>
          <p className="text-xs text-slate-400">Reviewing application: {application.applicationNumber} ({application.borrower?.fullName})</p>
        </div>
        <Link href="/agent/applications">
          <Button variant="outline" size="sm" className="h-9 text-xs flex items-center gap-1.5">
            <ArrowLeft className="h-4 w-4" /> Back to Queue
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left column: Application & document details */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Document Display Panel */}
          <Card className="border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-950">
            <CardHeader>
              <CardTitle className="text-base font-bold">Uploaded Document Verification Gallery</CardTitle>
              <CardDescription>Click links to view high-resolution image files in new tabs</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Selfie & ID documents */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="space-y-2 text-center border p-3 rounded-xl">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Selfie Photograph</span>
                  <img src={kyc.selfieUrl} alt="Selfie" className="h-32 w-full object-cover rounded-lg border bg-slate-50" />
                  <a href={kyc.selfieUrl} target="_blank" rel="noreferrer" className="text-[10px] text-blue-600 hover:underline inline-flex items-center gap-0.5 mt-1 font-bold">
                    Open Full Resolution <ExternalLink className="h-3 w-3" />
                  </a>
                </div>

                <div className="space-y-2 text-center border p-3 rounded-xl">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Identity Front ({kyc.identityDoc?.type})</span>
                  <img src={kyc.identityDoc?.frontImageUrl} alt="ID Front" className="h-32 w-full object-cover rounded-lg border bg-slate-50" />
                  <a href={kyc.identityDoc?.frontImageUrl} target="_blank" rel="noreferrer" className="text-[10px] text-blue-600 hover:underline inline-flex items-center gap-0.5 mt-1 font-bold">
                    Open Full Resolution <ExternalLink className="h-3 w-3" />
                  </a>
                </div>

                <div className="space-y-2 text-center border p-3 rounded-xl">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Identity Back ({kyc.identityDoc?.type})</span>
                  <img src={kyc.identityDoc?.backImageUrl} alt="ID Back" className="h-32 w-full object-cover rounded-lg border bg-slate-50" />
                  <a href={kyc.identityDoc?.backImageUrl} target="_blank" rel="noreferrer" className="text-[10px] text-blue-600 hover:underline inline-flex items-center gap-0.5 mt-1 font-bold">
                    Open Full Resolution <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>

              {/* Address bill & statements */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2 text-center border p-3 rounded-xl">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Address Proof ({kyc.addressProof?.type?.replace("_", " ")})</span>
                  <img src={kyc.addressProof?.imageUrl} alt="Address proof" className="h-40 w-full object-cover rounded-lg border bg-slate-50" />
                  <a href={kyc.addressProof?.imageUrl} target="_blank" rel="noreferrer" className="text-[10px] text-blue-600 hover:underline inline-flex items-center gap-0.5 mt-1 font-bold">
                    Open Full Resolution <ExternalLink className="h-3 w-3" />
                  </a>
                </div>

                <div className="flex flex-col justify-between border p-4 rounded-xl text-left bg-slate-50/50 dark:bg-slate-900/10">
                  <div className="space-y-3">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Verify Document Links</span>
                    
                    {/* Income proof */}
                    <div className="text-xs">
                      <p className="font-bold text-slate-700 dark:text-slate-200">Income Proof Type: <span className="capitalize">{kyc.incomeProof?.type?.replace("_", " ")}</span></p>
                      <div className="mt-1 flex flex-wrap gap-2">
                        {kyc.incomeProof?.documentUrls?.map((url, i) => (
                          <a key={i} href={url} target="_blank" rel="noreferrer" className="bg-white border text-blue-600 px-2.5 py-1 rounded-lg hover:underline text-[10px] font-semibold dark:bg-slate-950 dark:border-slate-800 flex items-center gap-1">
                            Income Document #{i + 1} <ExternalLink className="h-2.5 w-2.5" />
                          </a>
                        ))}
                      </div>
                    </div>

                    {/* Bank Statements */}
                    <div className="text-xs">
                      <p className="font-bold text-slate-700 dark:text-slate-200">Bank Statements (3-6 Months):</p>
                      <div className="mt-1 flex flex-wrap gap-2">
                        {kyc.bankStatements?.map((url, i) => (
                          <a key={i} href={url} target="_blank" rel="noreferrer" className="bg-white border text-blue-600 px-2.5 py-1 rounded-lg hover:underline text-[10px] font-semibold dark:bg-slate-950 dark:border-slate-800 flex items-center gap-1">
                            Bank Statement #{i + 1} <ExternalLink className="h-2.5 w-2.5" />
                          </a>
                        ))}
                      </div>
                    </div>

                    {/* Employer letter */}
                    {kyc.employerLetter && (
                      <div className="text-xs">
                        <p className="font-bold text-slate-700 dark:text-slate-200">Employer Verification Letter:</p>
                        <a href={kyc.employerLetter} target="_blank" rel="noreferrer" className="mt-1 bg-white border text-blue-600 px-2.5 py-1 rounded-lg hover:underline text-[10px] font-semibold dark:bg-slate-950 dark:border-slate-800 inline-flex items-center gap-1">
                          View Letter File <ExternalLink className="h-2.5 w-2.5" />
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right column: Decisions & review data */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-950">
            <CardHeader>
              <CardTitle className="text-base font-bold">Applicant Details</CardTitle>
              <CardDescription>Verified personal credentials</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-xs">
              <div className="space-y-2 border-b pb-3">
                <p className="flex justify-between">
                  <span className="text-slate-400">FullName:</span>
                  <span className="font-bold text-slate-700 dark:text-slate-200">{application.borrower?.fullName}</span>
                </p>
                <p className="flex justify-between">
                  <span className="text-slate-400">Email:</span>
                  <span className="font-bold text-slate-700 dark:text-slate-200">{application.borrower?.email}</span>
                </p>
                <p className="flex justify-between">
                  <span className="text-slate-400">Phone:</span>
                  <span className="font-bold text-slate-700 dark:text-slate-200">{application.borrower?.phone}</span>
                </p>
              </div>

              <div className="space-y-2 border-b pb-3">
                <p className="flex justify-between">
                  <span className="text-slate-400">Decrypted CNIC:</span>
                  <span className="font-bold text-blue-600 dark:text-blue-400 text-sm tracking-wide bg-blue-50 px-2 py-0.5 rounded dark:bg-blue-950/20">
                    {kyc.identityDoc?.number}
                  </span>
                </p>
                <p className="flex justify-between">
                  <span className="text-slate-400">CNIC Expiry:</span>
                  <span className="font-bold text-slate-700 dark:text-slate-200">
                    {new Date(kyc.identityDoc?.expiryDate).toLocaleDateString("en-PK")}
                  </span>
                </p>
                <p className="flex justify-between">
                  <span className="text-slate-400">Address Proof Date:</span>
                  <span className="font-bold text-slate-700 dark:text-slate-200">
                    {new Date(kyc.addressProof?.issuedDate).toLocaleDateString("en-PK")}
                  </span>
                </p>
              </div>

              <div className="space-y-2 border-b pb-3 bg-slate-50 p-3 rounded-xl dark:bg-slate-900/30">
                <p className="flex justify-between">
                  <span className="text-slate-400 font-medium">Loan Requested:</span>
                  <span className="font-bold text-slate-700 dark:text-slate-200">{currency} {application.amountRequested?.toLocaleString()}</span>
                </p>
                <p className="flex justify-between">
                  <span className="text-slate-400 font-medium">Purpose:</span>
                  <span className="font-bold text-slate-700 dark:text-slate-200 capitalize">{application.purpose}</span>
                </p>
                <p className="flex justify-between">
                  <span className="text-slate-400 font-medium font-bold">Requested Term:</span>
                  <span className="font-bold text-slate-700 dark:text-slate-200">{application.tenureMonths} Months</span>
                </p>
              </div>

              {/* Action notes */}
              <div className="space-y-1.5 pt-2">
                <label className="text-xs font-semibold text-slate-500">Internal Verification Notes</label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Record CNIC validation notes, bank income credits confirmation..."
                  className="flex w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 transition-all duration-200 focus:border-blue-500 focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                />
              </div>

              {/* Action buttons */}
              <div className="flex gap-2 pt-2">
                <Button
                  variant="destructive"
                  className="flex-1 text-xs h-10 flex items-center justify-center gap-1 bg-red-600 hover:bg-red-700 text-white"
                  onClick={handleReject}
                  isLoading={isRejecting}
                >
                  <X className="h-4 w-4" /> Reject KYC
                </Button>
                <Button
                  className="flex-1 text-xs h-10 flex items-center justify-center gap-1 bg-green-600 hover:bg-green-700 text-white"
                  onClick={handleApprove}
                  isLoading={isApproving}
                >
                  <Check className="h-4 w-4" /> Approve KYC
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
