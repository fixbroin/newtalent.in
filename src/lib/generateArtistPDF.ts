"use client";

import jsPDF from 'jspdf';
import 'jspdf-autotable';
import type { UserOptions } from 'jspdf-autotable';
import type { ArtistApplication, CompanyDetailsForPdf } from '@/types/firestore';
import { Timestamp } from 'firebase/firestore';

declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: UserOptions) => jsPDF;
    lastAutoTable: { finalY: number };
  }
}

const formatTimestampToReadable = (timestamp?: Timestamp | Date | string): string => {
  if (!timestamp) return "N/A";
  let date: Date;
  if (timestamp instanceof Timestamp) {
    date = timestamp.toDate();
  } else if (timestamp instanceof Date) {
    date = timestamp;
  } else {
    try {
      date = new Date(timestamp);
      if (isNaN(date.getTime())) throw new Error("Invalid date string");
    } catch (e) {
      return String(timestamp); // Fallback
    }
  }
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const addSectionTitle = (doc: jsPDF, title: string, yPos: number): number => {
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42); // slate-900 primary
  doc.text(title.toUpperCase(), 14, yPos);
  
  // Section underline divider
  doc.setDrawColor(15, 23, 42); 
  doc.setLineWidth(0.6);
  doc.line(14, yPos + 2, 196, yPos + 2);
  
  doc.setFont("helvetica", "normal");
  doc.setTextColor(0);
  return yPos + 9;
};

const addDetail = (doc: jsPDF, label: string, value: string | string[] | undefined | null, yPos: number): number => {
  if (value === undefined || value === null || (Array.isArray(value) && value.length === 0)) {
    value = "N/A";
  }
  const valueText = Array.isArray(value) ? value.join(', ') : value;
  const splitValue = doc.splitTextToSize(valueText, 120);
  const height = Math.max(5, splitValue.length * 5);
  
  // Auto page break check inside addDetail
  const newY = checkAndAddPage(doc, yPos, height + 4);

  const labelText = `${label.toUpperCase()}`;

  // Draw Label (left-aligned, bold, grey, 8pt)
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(100, 116, 139); // Slate-500 text
  doc.text(labelText, 14, newY + 3);

  // Draw Value (left-aligned at x=70, regular, 10pt)
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(30, 41, 59); // Slate-800 text
  doc.text(splitValue, 70, newY + 3);

  const lineY = newY + height + 1;

  // Draw thin border line below the detail row
  doc.setDrawColor(226, 232, 240); // slate-200 border
  doc.setLineWidth(0.25);
  doc.line(14, lineY, 196, lineY);

  doc.setTextColor(0); // reset color
  return lineY + 5; // Return y position for next row
};

async function getImageDataUri(url: string): Promise<{ dataUri: string; format: string } | null> {
  if (!url) return null;
  if (url.startsWith('data:')) {
    const mime = url.match(/:(.*?);/)?.[1] || 'image/jpeg';
    const format = mime.split('/')[1]?.toUpperCase() || 'JPEG';
    return { dataUri: url, format };
  }
  if (!url.startsWith('http')) return null;
  try {
    // Route image fetches through local proxy to bypass browser CORS settings
    const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(url)}`;
    const response = await fetch(proxyUrl);
    if (!response.ok) {
      console.warn(`Failed to fetch image proxy from ${proxyUrl}: ${response.statusText}`);
      return null;
    }
    const dataUri = await response.text();
    const mime = dataUri.match(/:(.*?);/)?.[1] || 'image/jpeg';
    const format = mime.split('/')[1]?.toUpperCase() || 'JPEG';
    return { dataUri, format };
  } catch (error) {
    console.error(`Error proxying image ${url}:`, error);
    return null;
  }
}

const checkAndAddPage = (doc: jsPDF, currentY: number, neededHeight: number): number => {
  const pageHeight = doc.internal.pageSize.height;
  const bottomMargin = 20;
  if (currentY + neededHeight > pageHeight - bottomMargin) {
    doc.addPage();
    return 20; // New page yStart
  }
  return currentY;
};

const addImageToPdf = async (
  doc: jsPDF,
  imageUrl: string | undefined | null,
  label: string,
  currentY: number,
  imageWidthMm = 50, 
  imageMaxHeightMm = 35
): Promise<number> => {
  let newY = currentY;
  if (imageUrl) {
    newY = checkAndAddPage(doc, newY, imageMaxHeightMm + 10); 
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(100, 116, 139);
    doc.text(label.toUpperCase(), 14, newY);
    doc.setTextColor(0);
    newY += 4;
    const imageData = await getImageDataUri(imageUrl);
    if (imageData) {
      try {
        const imgProps = doc.getImageProperties(imageData.dataUri);
        const aspectRatio = imgProps.width / imgProps.height;
        let pdfImgWidth = imageWidthMm;
        let pdfImgHeight = imageWidthMm / aspectRatio;

        if (pdfImgHeight > imageMaxHeightMm) {
          pdfImgHeight = imageMaxHeightMm;
          pdfImgWidth = imageMaxHeightMm * aspectRatio;
        }
        newY = checkAndAddPage(doc, newY, pdfImgHeight + 2); 
        doc.addImage(imageData.dataUri, imageData.format, 14, newY, pdfImgWidth, pdfImgHeight);
        newY += pdfImgHeight + 5; 
      } catch (e) {
        console.error(`Error adding image ${label} to PDF:`, e);
        doc.text(`(Image for ${label} could not be loaded)`, 14, newY);
        newY += 5;
      }
    } else {
      doc.text(`(Image for ${label} not available or failed to load)`, 14, newY);
      newY += 5;
    }
  } else {
    newY = checkAndAddPage(doc, newY, 10);
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(100, 116, 139);
    doc.text(`${label.toUpperCase()}: NOT PROVIDED`, 14, newY);
    doc.setTextColor(0);
    newY += 5;
  }
  return newY;
};


export const generateArtistApplicationPdf = async (
  application: ArtistApplication,
  companyDetails?: CompanyDetailsForPdf
): Promise<string> => {
  const doc = new jsPDF();
  let y = 22;

  const defaultCompanyDetails: CompanyDetailsForPdf = {
    name: companyDetails?.name || "Newtalent.in",
    address: companyDetails?.address || "Company Address Placeholder",
    contactEmail: companyDetails?.contactEmail || 'support@example.com',
    contactMobile: companyDetails?.contactMobile || '+91-XXXXXXXXXX',
    logoUrl: companyDetails?.logoUrl,
  };

  // Company Header
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text(defaultCompanyDetails.name, 14, y);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  y += 6;
  const addressLines = doc.splitTextToSize(defaultCompanyDetails.address, 80);
  doc.text(addressLines, 14, y);
  y += (addressLines.length * 4) + 2;
  doc.text(`Email: ${defaultCompanyDetails.contactEmail} | Phone: ${defaultCompanyDetails.contactMobile}`, 14, y);

  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("Artist Application Details", 196, y - 10, { align: "right" });
  y += 10;
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");

  doc.setFontSize(11);
  doc.text(`Application ID: ${application.id || 'N/A'}`, 196, y, { align: "right" });
  y += 5;
  doc.text(`Status: ${application.status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}`, 196, y, { align: "right" });
  y += 10;

  // Personal Information
  y = checkAndAddPage(doc, y, 20);
  y = addSectionTitle(doc, "Personal Information", y);
  if (application.profilePhotoUrl) {
    y = await addImageToPdf(doc, application.profilePhotoUrl, "Profile Photo", y, 30, 30);
  }
  y = addDetail(doc, "Full Name", application.fullName, y);
  y = addDetail(doc, "Email", application.email, y);
  y = addDetail(doc, "Mobile Number", application.mobileNumber, y);
  y = addDetail(doc, "Alternate Mobile", application.alternateMobile, y);
  y = addDetail(doc, "Pin Code", application.pinCode, y);
  y = addDetail(doc, "City", application.city, y);
  y = addDetail(doc, "Area", application.area, y);
  y = addDetail(doc, "Height", application.height, y);
  y = addDetail(doc, "Weight", application.weight, y);
  y = addDetail(doc, "Skin Tone", application.skinTone, y);
  y = addDetail(doc, "Age", application.age?.toString(), y);
  y = addDetail(doc, "Qualification", application.qualificationLabel, y);
  y = addDetail(doc, "Languages Spoken", application.languagesSpokenLabels, y);
  if (application.languagesSpokenIds?.includes('other')) {
    y = addDetail(doc, "Other Language Specified", application.otherLanguageText, y);
  }
  y += 5;

  // Work Information
  y = checkAndAddPage(doc, y, 20);
  y = addSectionTitle(doc, "Work Information", y);
  y = addDetail(doc, "Primary Work Category", application.workCategoryName, y);
  y = addDetail(doc, "Experience Level", application.experienceLevelLabel, y);
  y = addDetail(doc, "Gender", application.gender, y);
  if (application.bio) {
    y = checkAndAddPage(doc, y, 15);
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(100, 116, 139);
    doc.text("BIO / ABOUT ME", 14, y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(30, 41, 59);
    y += 4;
    const bioLines = doc.splitTextToSize(application.bio, 180);
    doc.text(bioLines, 14, y);
    y += (bioLines.length * 5) + 5;
    doc.setDrawColor(226, 232, 240);
    doc.line(14, y, 196, y);
    y += 5;
  }
  y += 5;

  // KYC Documents
  y = checkAndAddPage(doc, y, 20);
  y = addSectionTitle(doc, "KYC Documents", y);
  
  if (application.aadhaar?.docNumber || application.aadhaar?.frontImageUrl) {
    y = addDetail(doc, "Aadhaar Number", application.aadhaar?.docNumber, y);
    y = await addImageToPdf(doc, application.aadhaar?.frontImageUrl, "Aadhaar - Front", y);
    y = await addImageToPdf(doc, application.aadhaar?.backImageUrl, "Aadhaar - Back", y);
    y = addDetail(doc, "Aadhaar Status", application.aadhaar?.verified ? "Verified" : "Pending", y);
    y += 3;
  }

  if (application.pan?.docNumber || application.pan?.frontImageUrl) {
    y = addDetail(doc, "PAN Number", application.pan?.docNumber, y);
    y = await addImageToPdf(doc, application.pan?.frontImageUrl, "PAN Card - Front", y);
    y = addDetail(doc, "PAN Status", application.pan?.verified ? "Verified" : "Pending", y);
    y += 5;
  }

  if (application.additionalDocuments && application.additionalDocuments.length > 0) {
    y = checkAndAddPage(doc, y, 20);
    y = addSectionTitle(doc, "Additional Documents", y);
    for (const optDoc of application.additionalDocuments) {
      y = addDetail(doc, optDoc.docLabel || optDoc.docType || "Document", optDoc.docNumber, y);
      y = await addImageToPdf(doc, optDoc.frontImageUrl, `${optDoc.docLabel || optDoc.docType || "Optional Doc"} - Front`, y);
      y = await addImageToPdf(doc, optDoc.backImageUrl, `${optDoc.docLabel || optDoc.docType || "Optional Doc"} - Back`, y);
      y = addDetail(doc, `${optDoc.docLabel || optDoc.docType || "Optional Doc"} Status`, optDoc.verified ? "Verified" : "Pending", y);
      y += 3;
    }
  }
  y += 5;

  // Work Location & Terms
  y = checkAndAddPage(doc, y, 20);
  y = addSectionTitle(doc, "Work Location & Terms", y);
  y = addDetail(doc, "Work Area Center", application.workAreaCenter ? `${application.workAreaCenter.latitude.toFixed(4)}, ${application.workAreaCenter.longitude.toFixed(4)}` : "N/A", y);
  y = addDetail(doc, "Service Radius", application.workAreaRadiusKm ? `${application.workAreaRadiusKm} km` : "N/A", y);
  y += 5; 

  // Digital Consent & Signature
  y = checkAndAddPage(doc, y, 40);
  y = addSectionTitle(doc, "Digital Consent & Agreement", y);
  
  doc.setFontSize(9);
  doc.setTextColor(80);
  const consentText = `I, ${application.fullName || 'the applicant'}, hereby declare that I have read, understood, and agreed to the Terms and Conditions of Newtalent. I confirm that all information provided in this application is true and accurate to the best of my knowledge. I understand that any false information may lead to the rejection of my application or termination of my partnership. I provide my digital consent below as a formal agreement.`;
  const splitConsent = doc.splitTextToSize(consentText, 180);
  doc.text(splitConsent, 14, y);
  y += (splitConsent.length * 5) + 5;

  doc.setTextColor(0);
  if (application.termsConfirmedAt) {
    y = addDetail(doc, "Agreed On", formatTimestampToReadable(application.termsConfirmedAt), y);
  }

  if (application.signatureUrl) {
    y = await addImageToPdf(doc, application.signatureUrl, "Digital Signature", y, 60, 25);
    y += 5;
  }

  if (application.adminReviewNotes) {
    y = checkAndAddPage(doc, y, 15);
    y = addSectionTitle(doc, "Admin Review Notes", y);
    const notesLines = doc.splitTextToSize(application.adminReviewNotes, 180);
    doc.text(notesLines, 14, y);
    y += (notesLines.length * 5) + 5;
  }

  // Footer Metadata
  doc.setFontSize(8);
  doc.setTextColor(150);
  y = checkAndAddPage(doc, y, 10);
  if (application.createdAt) {
    doc.text(`Application Created: ${formatTimestampToReadable(application.createdAt)}`, 14, y);
    y += 4;
  }
  if (application.updatedAt) {
    y = checkAndAddPage(doc, y, 5);
    doc.text(`Last Updated: ${formatTimestampToReadable(application.updatedAt)}`, 14, y);
  }

  const pageCount = (doc.internal as any).getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(100);
    doc.text(`Page ${i} of ${pageCount}`, doc.internal.pageSize.width - 25, doc.internal.pageSize.height - 10);
  }

  return doc.output('datauristring');
};
