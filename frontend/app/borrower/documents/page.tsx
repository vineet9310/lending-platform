"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/Table";
import { ShieldCheck, FolderOpen, Download, AlertCircle, ArrowLeft, Activity, ExternalLink } from "lucide-react";
import toast from "react-hot-toast";

interface KYCInfo {
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
  verificationNotes?: string;
}

export default function BorrowerDocumentsPage() {
  const { data: session } = useSession();
  const [kyc, setKyc] = useState<KYCInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchKycRecord = async () => {
    try {
      // 1. Get borrower applications first to find an active application ID
      const appRes = await fetch("/api/loans/my-loans");
      const appJson = await appRes.json();
      
      if (appJson.success && appJson.applications && appJson.applications.length > 0) {
        const firstAppId = appJson.applications[0]._id;
        
        // 2. Fetch KYC for this application
        const kycRes = await fetch(`/api/kyc/${firstAppId}`);
        const kycJson = await kycRes.json();
        
        if (kycJson.success) {
          setKyc(kycJson.kyc);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchKycRecord();
  }, []);

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Activity className="h-6 w-6 animate-spin text-blue-600" />
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "verified":
        return "text-green-600 bg-green-50 dark:bg-green-950/20 dark:text-green-400";
      case "rejected":
        return "text-red-600 bg-red-50 dark:bg-red-950/20 dark:text-red-400";
      case "in_review":
        return "text-blue-600 bg-blue-50 dark:bg-blue-950/20 dark:text-blue-400";
      default:
        return "text-amber-600 bg-amber-50 dark:bg-amber-950/20 dark:text-amber-400";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-white flex items-center gap-2">
            <FolderOpen className="h-6 w-6 text-blue-600" /> Documents Center
          </h1>
          <p className="text-xs text-slate-400">View your uploaded KYC identity proofs, employer letters, and bank slips</p>
        </div>
        <Link href="/borrower/dashboard">
          <Button variant="outline" size="sm" className="h-9 text-xs flex items-center gap-1.5">
            <ArrowLeft className="h-4 w-4" /> Back to Dashboard
          </Button>
        </Link>
      </div>

      {!kyc ? (
        <Card className="border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-950">
          <CardContent className="p-10 text-center space-y-4">
            <AlertCircle className="h-10 w-10 text-slate-300 mx-auto" />
            <div>
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">No KYC documents uploaded yet.</p>
              <p className="text-xs text-slate-400 mt-1">Please submit a new loan application to upload your verification files.</p>
            </div>
            <Link href="/borrower/apply">
              <Button size="sm">Apply Loan & Upload docs</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          
          {/* Left panel: Verification Status summary */}
          <div className="lg:col-span-1 space-y-6">
            <Card className="border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-950">
              <CardHeader>
                <CardTitle className="text-base font-bold">Verification status</CardTitle>
                <CardDescription>KYC Record audit check status</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className={`rounded-xl p-4 text-center border font-bold capitalize text-sm ${getStatusColor(kyc.verificationStatus)}`}>
                  {kyc.verificationStatus === "verified" ? "KYC Approved" : kyc.verificationStatus === "rejected" ? "KYC Rejected" : "KYC Pending Review"}
                </div>

                {kyc.verificationNotes && (
                  <div className="rounded-xl bg-slate-50 p-4 text-xs text-slate-600 dark:bg-slate-900/60 dark:text-slate-400">
                    <p className="font-bold text-slate-800 dark:text-slate-200 mb-1">Agent Review Notes:</p>
                    <p>{kyc.verificationNotes}</p>
                  </div>
                )}

                {kyc.verificationStatus === "rejected" && (
                  <div className="rounded-xl border border-red-100 bg-red-50/20 p-4 text-xs text-red-600 dark:border-red-950/20 dark:bg-red-950/10">
                    <p className="font-bold flex items-center gap-1.5"><AlertCircle className="h-4 w-4" /> Resubmission Required</p>
                    <p className="mt-1">Please apply for a new loan or contact support to update your KYC details on the portal.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right panel: Uploaded Files List */}
          <div className="lg:col-span-2">
            <Card className="border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-950">
              <CardHeader>
                <CardTitle className="text-base font-bold">Uploaded Documents List</CardTitle>
                <CardDescription>Click to preview or download files securely</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Document Type</TableHead>
                      <TableHead>Details</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {/* Selfie */}
                    <TableRow>
                      <TableCell className="font-bold text-xs">Selfie Photograph</TableCell>
                      <TableCell className="text-xs text-slate-500">Camera photograph</TableCell>
                      <TableCell className="text-right">
                        <a href={kyc.selfieUrl} target="_blank" rel="noopener noreferrer">
                          <Button size="sm" variant="outline" className="h-8 text-xs flex items-center gap-1 ml-auto">
                            <ExternalLink className="h-3.5 w-3.5" /> View
                          </Button>
                        </a>
                      </TableCell>
                    </TableRow>

                    {/* Identity Doc Front */}
                    <TableRow>
                      <TableCell className="font-bold text-xs">ID Document (Front)</TableCell>
                      <TableCell className="text-xs text-slate-500 capitalize">
                        {kyc.identityDoc.type} - ending ***{kyc.identityDoc.number.slice(-4)}
                      </TableCell>
                      <TableCell className="text-right">
                        <a href={kyc.identityDoc.frontImageUrl} target="_blank" rel="noopener noreferrer">
                          <Button size="sm" variant="outline" className="h-8 text-xs flex items-center gap-1 ml-auto">
                            <ExternalLink className="h-3.5 w-3.5" /> View
                          </Button>
                        </a>
                      </TableCell>
                    </TableRow>

                    {/* Identity Doc Back */}
                    <TableRow>
                      <TableCell className="font-bold text-xs">ID Document (Back)</TableCell>
                      <TableCell className="text-xs text-slate-500 capitalize">{kyc.identityDoc.type}</TableCell>
                      <TableCell className="text-right">
                        <a href={kyc.identityDoc.backImageUrl} target="_blank" rel="noopener noreferrer">
                          <Button size="sm" variant="outline" className="h-8 text-xs flex items-center gap-1 ml-auto">
                            <ExternalLink className="h-3.5 w-3.5" /> View
                          </Button>
                        </a>
                      </TableCell>
                    </TableRow>

                    {/* Address Proof */}
                    <TableRow>
                      <TableCell className="font-bold text-xs">Address Proof</TableCell>
                      <TableCell className="text-xs text-slate-500 capitalize">{kyc.addressProof.type.replace("_", " ")}</TableCell>
                      <TableCell className="text-right">
                        <a href={kyc.addressProof.imageUrl} target="_blank" rel="noopener noreferrer">
                          <Button size="sm" variant="outline" className="h-8 text-xs flex items-center gap-1 ml-auto">
                            <ExternalLink className="h-3.5 w-3.5" /> View
                          </Button>
                        </a>
                      </TableCell>
                    </TableRow>

                    {/* Income Proof */}
                    {kyc.incomeProof.documentUrls.map((url, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-bold text-xs">Income Proof #{i + 1}</TableCell>
                        <TableCell className="text-xs text-slate-500 capitalize">{kyc.incomeProof.type.replace("_", " ")}</TableCell>
                        <TableCell className="text-right">
                          <a href={url} target="_blank" rel="noopener noreferrer">
                            <Button size="sm" variant="outline" className="h-8 text-xs flex items-center gap-1 ml-auto">
                              <ExternalLink className="h-3.5 w-3.5" /> View
                            </Button>
                          </a>
                        </TableCell>
                      </TableRow>
                    ))}

                    {/* Bank Statements */}
                    {kyc.bankStatements.map((url, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-bold text-xs">Bank Statement #{i + 1}</TableCell>
                        <TableCell className="text-xs text-slate-500">Bank accounts transaction history</TableCell>
                        <TableCell className="text-right">
                          <a href={url} target="_blank" rel="noopener noreferrer">
                            <Button size="sm" variant="outline" className="h-8 text-xs flex items-center gap-1 ml-auto">
                              <ExternalLink className="h-3.5 w-3.5" /> View
                            </Button>
                          </a>
                        </TableCell>
                      </TableRow>
                    ))}

                    {/* Employer Letter */}
                    {kyc.employerLetter && (
                      <TableRow>
                        <TableCell className="font-bold text-xs">Employer Letter</TableCell>
                        <TableCell className="text-xs text-slate-500">Employment certification letter</TableCell>
                        <TableCell className="text-right">
                          <a href={kyc.employerLetter} target="_blank" rel="noopener noreferrer">
                            <Button size="sm" variant="outline" className="h-8 text-xs flex items-center gap-1 ml-auto">
                              <ExternalLink className="h-3.5 w-3.5" /> View
                            </Button>
                          </a>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
