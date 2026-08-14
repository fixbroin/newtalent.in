
"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { ArtistApplication, KycDocument, BankDetails, ArtistApplicationStatus } from '@/types/firestore';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserCircle, Briefcase, FileText, Banknote, MapPin, Image as ImageIcon, ShieldCheck, CheckCircle, AlertTriangle, XCircle, Loader2, Download, Edit as EditIcon, ExternalLink, Copy } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { useState, useEffect, useRef } from "react";
import NextImage from 'next/image';
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { generateArtistApplicationPdf } from '@/lib/generateArtistPDF';
import { triggerPdfDownload } from '@/lib/pdfUtils';
import { useGlobalSettings } from '@/hooks/useGlobalSettings';
import { Separator } from "@/components/ui/separator";
import { cn, getTimestampMillis } from "@/lib/utils";
import { db } from '@/lib/firebase';
import { doc, updateDoc, Timestamp } from 'firebase/firestore';

const Artist_APPLICATION_COLLECTION = "ArtistApplications";

interface ArtistApplicationDetailsModalProps {
  application: ArtistApplication | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdateStatus: (applicationId: string, newStatus: ArtistApplicationStatus, notes?: string) => Promise<void>;
  isLoadingStatusUpdate: boolean;
}

const formatTimestampToReadable = (timestamp?: any): string => {
  const millis = getTimestampMillis(timestamp);
  if (!millis) return "N/A";
  return new Date(millis).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
};


const KycDocDisplay: React.FC<{ 
  doc?: KycDocument | null, 
  docName: string,
  onVerify?: () => void,
  isVerifying?: boolean
}> = ({ doc, docName, onVerify, isVerifying }) => {
  if (!doc || (!doc.docNumber && !doc.frontImageUrl)) return <p className="text-sm text-muted-foreground">Not Provided</p>;
  return (
    <div className="space-y-2 border p-3 rounded-lg bg-muted/5">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
            <p className="text-sm font-bold">{doc.docLabel || docName}</p>
            <Badge variant={doc.verified ? "default" : "secondary"} className={cn(doc.verified && "bg-green-500 hover:bg-green-600")}>
                {doc.verified ? "Verified" : "Pending Verification"}
            </Badge>
        </div>
        {!doc.verified && onVerify && (
            <Button 
                size="sm" 
                variant="outline" 
                className="h-7 text-[10px] border-green-500 text-green-600 hover:bg-green-50"
                onClick={(e) => { e.stopPropagation(); onVerify(); }}
                disabled={isVerifying}
            >
                {isVerifying ? <Loader2 className="h-3 w-3 animate-spin mr-1"/> : <CheckCircle className="h-3 w-3 mr-1"/>}
                Approve
            </Button>
        )}
      </div>
      <p className="text-sm"><strong>ID Number:</strong> {doc.docNumber || "N/A"}</p>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
        {doc.frontImageUrl && (
          <div className="space-y-1">
            <span className="text-[10px] uppercase text-muted-foreground font-bold">Front Image</span>
            <div className="relative aspect-video w-full border rounded-md bg-white">
              <NextImage src={doc.frontImageUrl} alt={`${docName} Front`} fill className="object-contain p-1"/>
              <a href={doc.frontImageUrl} target="_blank" rel="noopener noreferrer" className="absolute bottom-1 right-1 bg-black/50 p-1 rounded text-white hover:bg-black/70"><ExternalLink className="h-3 w-3"/></a>
            </div>
          </div>
        )}
        {doc.backImageUrl && (
          <div className="space-y-1">
            <span className="text-[10px] uppercase text-muted-foreground font-bold">Back Image</span>
            <div className="relative aspect-video w-full border rounded-md bg-white">
              <NextImage src={doc.backImageUrl} alt={`${docName} Back`} fill className="object-contain p-1"/>
              <a href={doc.backImageUrl} target="_blank" rel="noopener noreferrer" className="absolute bottom-1 right-1 bg-black/50 p-1 rounded text-white hover:bg-black/70"><ExternalLink className="h-3 w-3"/></a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const BankDetailsDisplay: React.FC<{ 
  details?: BankDetails | null,
  onVerify?: () => void,
  isVerifying?: boolean
}> = ({ details, onVerify, isVerifying }) => {
  if (!details || !details.bankName) return <p className="text-sm text-muted-foreground">Not Provided</p>;
  return (
    <div className="space-y-1 text-sm">
      <div className="flex justify-between items-start">
          <div className="space-y-1">
            <p><strong>Bank:</strong> {details.bankName}</p>
            <p><strong>A/C Holder:</strong> {details.accountHolderName}</p>
            <p><strong>A/C No:</strong> {details.accountNumber}</p>
            <p><strong>IFSC:</strong> {details.ifscCode}</p>
          </div>
          {!details.verified && onVerify && (
            <Button 
                size="sm" 
                variant="outline" 
                className="h-7 text-[10px] border-green-500 text-green-600 hover:bg-green-50"
                onClick={onVerify}
                disabled={isVerifying}
            >
                {isVerifying ? <Loader2 className="h-3 w-3 animate-spin mr-1"/> : <CheckCircle className="h-3 w-3 mr-1"/>}
                Verify Bank
            </Button>
          )}
      </div>
      {details.cancelledChequeUrl && (
         <div className="mt-1">
            <a href={details.cancelledChequeUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline">View Cheque ({details.cancelledChequeFileName || 'View'})</a>
            {details.cancelledChequeUrl.startsWith('http') && <div className="relative w-32 h-20 mt-1 border rounded"><NextImage src={details.cancelledChequeUrl} alt="Cancelled Cheque" fill className="object-contain p-1"/></div>}
        </div>
      )}
      <div className="text-xs mt-1">Status: <Badge variant={details.verified ? "default" : "secondary"} className={cn(details.verified && "bg-green-500 hover:bg-green-600")}>{details.verified ? "Verified" : "Pending"}</Badge></div>
    </div>
  );
};


const DetailRow: React.FC<{ 
  label: string; 
  value: React.ReactNode; 
  copyValue?: string; 
  onCopy?: (text: string) => void;
  isCopied?: boolean;
}> = ({ label, value, copyValue, onCopy, isCopied }) => (
  <div className="flex flex-col sm:flex-row py-1.5 border-b border-border/40 gap-1 sm:gap-4 sm:items-start">
    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground w-full sm:w-56 shrink-0">{label}</span>
    <div className="flex items-center gap-1.5 text-sm font-medium text-foreground break-all text-left">
      <span>{value ?? 'N/A'}</span>
      {copyValue && value && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-5 w-5 text-muted-foreground hover:text-foreground hover:bg-muted/50"
          onClick={() => onCopy?.(copyValue)}
          title={`Copy ${label}`}
        >
          {isCopied ? <CheckCircle className="h-3 w-3 text-green-500 animate-in fade-in zoom-in-50" /> : <Copy className="h-3 w-3" />}
        </Button>
      )}
    </div>
  </div>
);

export default function ArtistApplicationDetailsModal({
  application,
  isOpen,
  onClose,
  onUpdateStatus,
  isLoadingStatusUpdate,
}: ArtistApplicationDetailsModalProps) {
  const [adminNotes, setAdminNotes] = useState("");
  const { toast } = useToast();
  const { settings: globalCompanySettings } = useGlobalSettings();
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [verifyingDocType, setVerifyingDocType] = useState<string | null>(null);
  const [tabsListEl, setTabsListEl] = useState<HTMLDivElement | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const handleCopy = (text: string, fieldName: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => {
      setCopiedField(null);
    }, 2000);
  };

  useEffect(() => {
    if (application) {
      setAdminNotes(application.adminReviewNotes || "");
    } else {
      setAdminNotes("");
    }
  }, [application]);

  useEffect(() => {
    if (!tabsListEl) return;

    let isDown = false;
    let startX: number;
    let scrollLeft: number;
    let hasMoved = false;

    const onMouseDown = (e: MouseEvent) => {
      isDown = true;
      startX = e.pageX - tabsListEl.offsetLeft;
      scrollLeft = tabsListEl.scrollLeft;
      hasMoved = false;
    };

    const onMouseLeave = () => {
      isDown = false;
    };

    const onMouseUp = () => {
      isDown = false;
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDown) return;
      const x = e.pageX - tabsListEl.offsetLeft;
      const walk = (x - startX) * 1.8; // scroll speed multiplier
      if (Math.abs(walk) > 4) {
        hasMoved = true;
        e.preventDefault();
        tabsListEl.scrollLeft = scrollLeft - walk;
      }
    };

    const onClick = (e: MouseEvent) => {
      if (hasMoved) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    tabsListEl.addEventListener('mousedown', onMouseDown);
    tabsListEl.addEventListener('mouseleave', onMouseLeave);
    tabsListEl.addEventListener('mouseup', onMouseUp);
    tabsListEl.addEventListener('mousemove', onMouseMove);
    tabsListEl.addEventListener('click', onClick, true); // Capture phase blocker

    return () => {
      tabsListEl.removeEventListener('mousedown', onMouseDown);
      tabsListEl.removeEventListener('mouseleave', onMouseLeave);
      tabsListEl.removeEventListener('mouseup', onMouseUp);
      tabsListEl.removeEventListener('mousemove', onMouseMove);
      tabsListEl.removeEventListener('click', onClick, true);
    };
  }, [tabsListEl]);

  if (!application) return null;

  const handleStatusAction = (newStatus: ArtistApplicationStatus) => {
    if (!application?.id) return;

    if (newStatus === 'rejected' || newStatus === 'needs_update') {
        if (!adminNotes.trim()) {
            toast({
              title: "Notes Required",
              description: "Please provide notes for approval, rejection, or requesting updates.",
              variant: "destructive"
            });
            return;
        }
    }
    onUpdateStatus(application.id, newStatus, adminNotes);
  };

  const handleVerifyDocument = async (docType: string) => {
    if (!application?.id) return;
    setVerifyingDocType(docType);
    
    try {
      const appDocRef = doc(db, Artist_APPLICATION_COLLECTION, application.id);
      const updatePayload: any = { updatedAt: Timestamp.now() };

      if (docType === 'aadhaar') {
        updatePayload['aadhaar.verified'] = true;
      } else if (docType === 'pan') {
        updatePayload['pan.verified'] = true;
      } else if (docType === 'bank') {
        updatePayload['bankDetails.verified'] = true;
      } else {
        // Find and update in additionalDocuments array
        const updatedDocs = application.additionalDocuments?.map(d => 
          d.docType === docType ? { ...d, verified: true } : d
        );
        updatePayload['additionalDocuments'] = updatedDocs;
      }

      await updateDoc(appDocRef, updatePayload);
      toast({ title: "Verified", description: "Document has been marked as verified." });
    } catch (error) {
      console.error("Error verifying document:", error);
      toast({ title: "Error", description: "Could not verify document.", variant: "destructive" });
    } finally {
      setVerifyingDocType(null);
    }
  };

  const handleDownloadArtistPdf = async () => {
    if (!application) return;
    setIsDownloadingPdf(true);
    try {
      const companyInfo = {
        name: globalCompanySettings?.websiteName || "Newtalent.in",
        address: globalCompanySettings?.address || "Company Address Placeholder",
        contactEmail: globalCompanySettings?.contactEmail || 'support@example.com',
        contactMobile: globalCompanySettings?.contactMobile || '+91-XXXXXXXXXX',
        logoUrl: globalCompanySettings?.logoUrl || undefined,
      };
      const pdfDataUri = await generateArtistApplicationPdf(application, companyInfo);
      triggerPdfDownload(pdfDataUri, `ArtistApp-${application.fullName?.replace(/\s+/g, '_') || application.id}.pdf`);
    } catch (error) {
      console.error("Error generating or downloading Artist PDF:", error);
      toast({ title: "PDF Error", description: (error as Error).message || "Could not generate or download PDF.", variant: "destructive" });
    } finally {
      setIsDownloadingPdf(false);
    }
  };


  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl w-[calc(100vw-8px)] sm:w-[90vw] h-[calc(100vh-8px)] max-h-[calc(100vh-8px)] grid grid-rows-[auto_1fr_auto] p-0 overflow-x-hidden border-border/80">
        <DialogHeader className="p-4 sm:p-2 border-b flex-shrink-0 w-full max-w-full overflow-hidden">
          <div className="flex items-start sm:items-center space-x-3 sm:space-x-4">
            <Avatar className="h-12 w-12 sm:h-16 sm:w-16 flex-shrink-0">
              <AvatarImage src={application.profilePhotoUrl || undefined} alt={application.fullName || "Artist"} />
              <AvatarFallback className="text-xl sm:text-2xl">{application.fullName ? application.fullName[0].toUpperCase() : "P"}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <DialogTitle className="text-xl sm:text-2xl break-words max-w-full">{application.fullName || "Artist Application"}</DialogTitle>
              <DialogDescription className="text-xs sm:text-sm break-words max-w-full flex items-center gap-1.5 mt-0.5">
                <span>ID: {application.id}</span>
                {application.id && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-4 w-4 text-muted-foreground hover:text-foreground"
                    onClick={() => handleCopy(application.id!, 'appId')}
                    title="Copy Application ID"
                  >
                    {copiedField === 'appId' ? <CheckCircle className="h-2.5 w-2.5 text-green-500" /> : <Copy className="h-2.5 w-2.5" />}
                  </Button>
                )}
              </DialogDescription>
              <Badge variant="outline" className="mt-1 text-xs capitalize">{application.status.replace(/_/g, ' ')}</Badge>
            </div>
          </div>
        </DialogHeader>

        <div className="overflow-y-auto overflow-x-hidden flex-grow min-h-0">
            <div className="p-4 sm:p-2">
            <Tabs defaultValue="step1" className="w-full">
                <div className="relative mb-6">
                    <TabsList 
                      ref={setTabsListEl} 
                      style={{ scrollbarWidth: 'none' }}
                      className="h-12 w-full justify-start gap-4 bg-muted p-1 overflow-x-auto select-none flex-nowrap rounded-lg cursor-grab active:cursor-grabbing [&::-webkit-scrollbar]:hidden"
                    >
                        <TabsTrigger value="step1" className="px-4 py-2 text-xs sm:text-sm whitespace-nowrap rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all"><Briefcase className="mr-2 h-4 w-4 shrink-0"/>Category & Languages</TabsTrigger>
                        <TabsTrigger value="step2" className="px-4 py-2 text-xs sm:text-sm whitespace-nowrap rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all"><UserCircle className="mr-2 h-4 w-4 shrink-0"/>Personal Info</TabsTrigger>
                        <TabsTrigger value="step3" className="px-4 py-2 text-xs sm:text-sm whitespace-nowrap rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all"><ImageIcon className="mr-2 h-4 w-4 shrink-0"/>Portfolio Photos</TabsTrigger>
                        <TabsTrigger value="step4" className="px-4 py-2 text-xs sm:text-sm whitespace-nowrap rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all"><FileText className="mr-2 h-4 w-4 shrink-0"/>KYC Documents</TabsTrigger>
                        <TabsTrigger value="step5" className="px-4 py-2 text-xs sm:text-sm whitespace-nowrap rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all"><MapPin className="mr-2 h-4 w-4 shrink-0"/>Location & Terms</TabsTrigger>
                    </TabsList>
                </div>

                <TabsContent value="step1" className="space-y-1 focus-visible:outline-none mt-0">
                    <DetailRow label="Primary Work Category" value={application.workCategoryName} />
                    <DetailRow label="Experience Level" value={application.experienceLevelLabel} />
                    <DetailRow label="Gender" value={application.gender} />
                    <DetailRow label="Languages Spoken" value={application.languagesSpokenLabels?.join(', ')} />
                    {application.languagesSpokenIds?.includes('other') && (
                      <DetailRow label="Other Language Specified" value={application.otherLanguageText} />
                    )}
                </TabsContent>

                <TabsContent value="step2" className="space-y-1 focus-visible:outline-none mt-0">
                    {application.profilePhotoUrl && (
                      <div className="flex justify-center py-3 border-b border-border/40">
                        <a 
                          href={application.profilePhotoUrl} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="block relative h-32 w-32 rounded-xl overflow-hidden border border-border bg-muted shadow-sm hover:opacity-90 transition-opacity cursor-pointer"
                          title="Click to view full image"
                        >
                          <NextImage 
                            src={application.profilePhotoUrl} 
                            alt="Profile Photo" 
                            fill 
                            className="object-cover"
                            sizes="128px"
                          />
                        </a>
                      </div>
                    )}
                    <DetailRow 
                      label="Full Name" 
                      value={application.fullName} 
                      copyValue={application.fullName} 
                      onCopy={(txt) => handleCopy(txt, 'fullName')} 
                      isCopied={copiedField === 'fullName'} 
                    />
                    <DetailRow 
                      label="Email" 
                      value={application.email} 
                      copyValue={application.email} 
                      onCopy={(txt) => handleCopy(txt, 'email')} 
                      isCopied={copiedField === 'email'} 
                    />
                    <DetailRow 
                      label="Mobile Number" 
                      value={application.mobileNumber} 
                      copyValue={application.mobileNumber} 
                      onCopy={(txt) => handleCopy(txt, 'mobile')} 
                      isCopied={copiedField === 'mobile'} 
                    />
                    <DetailRow label="Alternate Mobile" value={application.alternateMobile || 'N/A'} />
                    <DetailRow 
                      label="Pin Code" 
                      value={application.pinCode} 
                      copyValue={application.pinCode} 
                      onCopy={(txt) => handleCopy(txt, 'pinCode')} 
                      isCopied={copiedField === 'pinCode'} 
                    />
                    <DetailRow 
                      label="City" 
                      value={application.city} 
                      copyValue={application.city} 
                      onCopy={(txt) => handleCopy(txt, 'city')} 
                      isCopied={copiedField === 'city'} 
                    />
                    <DetailRow label="Area" value={application.area} />
                    <DetailRow label="Height" value={application.height} />
                    <DetailRow label="Weight" value={application.weight} />
                    <DetailRow label="Skin Tone" value={application.skinTone} />
                    <DetailRow label="Age" value={application.age ? `${application.age} YRS` : undefined} />
                    <DetailRow label="Qualification" value={application.qualificationLabel} />
                    <DetailRow label="Submitted At" value={formatTimestampToReadable(application.submittedAt || application.createdAt)} />
                    <div className="py-2 border-b border-border/40 space-y-1">
                      <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Bio / About Me</span>
                      <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed italic bg-muted/20 p-2.5 rounded-lg border border-border/40">
                        "{application.bio || 'No bio provided.'}"
                      </p>
                    </div>
                </TabsContent>

                <TabsContent value="step3" className="space-y-4 focus-visible:outline-none mt-0">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-2">
                        {[
                            { url: application.faceCloseUpUrl, label: "Face Close-up" },
                            { url: application.midShotUrl, label: "Mid Shot" },
                            { url: application.rightProfileUrl, label: "Right Profile" },
                            { url: application.leftProfileUrl, label: "Left Profile" },
                            { url: application.frontProfileUrl, label: "Front Profile" },
                            { url: application.backProfileUrl, label: "Back Profile" },
                        ].map((photo, index) => photo.url ? (
                            <div key={index} className="space-y-1">
                                <span className="text-[10px] uppercase text-muted-foreground font-bold">{photo.label}</span>
                                <div className="relative aspect-[3/4] w-full border rounded-md bg-white overflow-hidden group">
                                    <NextImage src={photo.url} alt={photo.label} fill className="object-cover transition-transform group-hover:scale-105"/>
                                    <a href={photo.url} target="_blank" rel="noopener noreferrer" className="absolute bottom-1 right-1 bg-black/50 p-1.5 rounded text-white opacity-0 group-hover:opacity-100 transition-opacity">
                                        <ExternalLink className="h-4 w-4"/>
                                    </a>
                                </div>
                            </div>
                        ) : null)}
                    </div>
                    {![application.faceCloseUpUrl, application.midShotUrl, application.rightProfileUrl, application.leftProfileUrl, application.frontProfileUrl, application.backProfileUrl].some(url => !!url) && (
                        <p className="text-sm text-muted-foreground text-center py-8">No portfolio photos provided.</p>
                    )}
                </TabsContent>

                <TabsContent value="step4" className="space-y-4 focus-visible:outline-none mt-0">
                    {(application.aadhaar?.docNumber || application.aadhaar?.frontImageUrl) && (
                      <KycDocDisplay 
                          doc={application.aadhaar} 
                          docName="Aadhaar Card"
                          onVerify={() => handleVerifyDocument('aadhaar')}
                          isVerifying={verifyingDocType === 'aadhaar'}
                      />
                    )}
                    {(application.pan?.docNumber || application.pan?.frontImageUrl) && (
                      <KycDocDisplay 
                          doc={application.pan} 
                          docName="PAN Card"
                          onVerify={() => handleVerifyDocument('pan')}
                          isVerifying={verifyingDocType === 'pan'}
                      />
                    )}
                    
                    {application.additionalDocuments && application.additionalDocuments.length > 0 && (
                        <div className="pt-2">
                          <h4 className="font-bold text-sm mb-3 border-b pb-1 uppercase tracking-wider text-muted-foreground">Additional Documents</h4>
                          <div className="space-y-4">
                            {application.additionalDocuments.map((doc, idx) => (
                                <KycDocDisplay 
                                  key={idx} 
                                  doc={doc} 
                                  docName={doc.docLabel || doc.docType || `Additional Document ${idx+1}`}
                                  onVerify={() => handleVerifyDocument(doc.docType)}
                                  isVerifying={verifyingDocType === doc.docType}
                                />
                            ))}
                          </div>
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="step5" className="space-y-4 focus-visible:outline-none mt-0">
                    <div>
                        <h4 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground mb-2">Work Area & Location:</h4>
                        <DetailRow label="Work Center Lat/Long" value={application.workAreaCenter ? `${application.workAreaCenter.latitude.toFixed(4)}, ${application.workAreaCenter.longitude.toFixed(4)}` : 'N/A'} />
                        <DetailRow label="Radius" value={application.workAreaRadiusKm ? `${application.workAreaRadiusKm} km` : 'N/A'} />
                        {application.workAreaCenter && (
                            <Button variant="link" size="sm" onClick={() => window.open(`https://www.google.com/maps?q=${application.workAreaCenter?.latitude},${application.workAreaCenter?.longitude}`, '_blank')} className="px-0 h-auto text-xs">
                                View on Map <ExternalLink className="ml-1 h-3 w-3"/>
                            </Button>
                        )}
                    </div>
                    <Separator />
                    <div>
                        <h4 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground mb-2">Terms & Confirmation:</h4>
                        {application.termsConfirmedAt ? (
                            <p className="flex items-center text-xs text-green-600 font-medium"><CheckCircle className="mr-2 h-4 w-4"/>Confirmed on {formatTimestampToReadable(application.termsConfirmedAt)}</p>
                        ) : (
                            <p className="flex items-center text-xs text-destructive font-medium"><XCircle className="mr-2 h-4 w-4"/>Not Confirmed</p>
                        )}
                    </div>
                     {application.signatureUrl && (
                       <div>
                          <h4 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground mb-2">Signature:</h4>
                          <div className="mt-1">
                              <a href={application.signatureUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline">View Signature ({application.signatureFileName || 'View Image'})</a>
                              {application.signatureUrl.startsWith('http') && <div className="relative w-48 h-24 mt-1 border rounded bg-white"><NextImage src={application.signatureUrl} alt="Artist Signature" fill className="object-contain p-1"/></div>}
                          </div>
                      </div>
                     )}
                </TabsContent>
            </Tabs>

            {(application.status === 'pending_review' || application.status === 'needs_update' || application.status === 'rejected') && (
            <div className="mt-6 pt-4 border-t">
                <Label htmlFor="adminReviewNotes" className="font-semibold text-sm">Admin Review Notes:</Label>
                <Textarea
                    id="adminReviewNotes"
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    placeholder="Add notes for approval, rejection, or update request..."
                    rows={3}
                    className="mt-1.5 text-sm"
                    disabled={isLoadingStatusUpdate}
                />
            </div>
            )}
            </div>
        </div>

        <DialogFooter className="p-2 border-t bg-muted/50 flex flex-col sm:flex-row sm:justify-between items-center gap-2 flex-shrink-0">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleDownloadArtistPdf} 
            disabled={isLoadingStatusUpdate || isDownloadingPdf} 
            className="w-full sm:w-auto h-8 text-xs font-semibold"
          >
             {isDownloadingPdf ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin"/> : <Download className="mr-1.5 h-3.5 w-3.5"/>} Download PDF
          </Button>
          
          <div className="grid grid-cols-2 sm:flex sm:flex-row gap-2 w-full sm:w-auto">
            {/* Edit button */}
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => window.location.href = `/artist-registration?editApplicationId=${application.id}`}
              disabled={isLoadingStatusUpdate} 
              className="h-8 text-xs border-primary text-primary hover:bg-primary/5 font-semibold"
            >
              <EditIcon className="mr-1.5 h-3.5 w-3.5" /> Edit
            </Button>

            {application.status !== 'approved' && (
                <Button 
                  onClick={() => handleStatusAction('approved')} 
                  disabled={isLoadingStatusUpdate} 
                  size="sm"
                  className="bg-green-600 hover:bg-green-700 h-8 text-xs font-semibold"
                >
                  {isLoadingStatusUpdate && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin"/>} <CheckCircle className="mr-1.5 h-3.5 w-3.5"/> Approve
                </Button>
            )}
            
            {application.status !== 'rejected' && (
                <Button 
                  variant="destructive" 
                  onClick={() => handleStatusAction('rejected')} 
                  disabled={isLoadingStatusUpdate} 
                  size="sm"
                  className="h-8 text-xs font-semibold"
                >
                  {isLoadingStatusUpdate && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin"/>} <XCircle className="mr-1.5 h-3.5 w-3.5"/> Reject
                </Button>
            )}
            
            {application.status !== 'needs_update' && (
                <Button 
                  variant="outline" 
                  onClick={() => handleStatusAction('needs_update')} 
                  disabled={isLoadingStatusUpdate} 
                  size="sm"
                  className="border-yellow-500 text-yellow-600 hover:bg-yellow-500/10 h-8 text-xs font-semibold"
                >
                  {isLoadingStatusUpdate && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin"/>} <AlertTriangle className="mr-1.5 h-3.5 w-3.5"/> Needs Update
                </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

