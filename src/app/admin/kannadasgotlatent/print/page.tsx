"use client";

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { db, auth } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { Loader2, Printer, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface KannadaGotLatentApp {
  id: string;
  fullName: string;
  stageName?: string;
  gender: string;
  dateOfBirth: string;
  age: number;
  mobileNumber: string;
  email: string;
  city: string;
  state: string;
  pinCode: string;
  talentCategory: string[];
  talentTitle: string;
  talentDescription: string;
  performedOnStageBefore: boolean;
  introVideoUrl: string;
  talentVideoUrl: string;
  externalVideoLink?: string;
  photos: string[];
  instagram?: string;
  youtube?: string;
  facebook?: string;
  otherSocial?: string;
  canTravel: boolean;
  preferredLanguages: string[];
  availableWeekends: boolean;
  availableWeekdays: boolean;
  emergencyName: string;
  emergencyRelationship: string;
  emergencyMobile: string;
  status: 'New' | 'Shortlisted' | 'Rejected' | 'Selected';
  internalNotes?: string;
  callScheduled?: boolean;
  auditionDate?: string | null;
  judgeComments?: string;
  createdAt: any;
}

function PrintRegistrationProfileContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  const [app, setApp] = useState<KannadaGotLatentApp | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // 1) Verify auth status
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        setIsAuthenticated(true);
      } else {
        setError('Unauthorized access. Please log in as an administrator.');
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  // 2) Fetch candidate details
  useEffect(() => {
    if (!isAuthenticated || !id) return;

    const fetchDetails = async () => {
      try {
        const docRef = doc(db, 'kannadaGotLatentApplications', id);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          setApp({ id: docSnap.id, ...docSnap.data() } as KannadaGotLatentApp);
        } else {
          setError(`Registration entry #${id} not found.`);
        }
      } catch (err: any) {
        console.error('Error fetching print candidate:', err);
        setError(err.message || 'Error loading registration.');
      } fillAll(() => {
        setLoading(false);
      });
    };

    const fillAll = (cb: () => void) => cb();

    fetchDetails();
  }, [id, isAuthenticated]);

  // 3) Trigger browser print dialog when data is loaded
  useEffect(() => {
    if (app) {
      const timer = setTimeout(() => {
        window.print();
      }, 800); // Small timeout to ensure browser paints photos/text
      return () => clearTimeout(timer);
    }
  }, [app]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col justify-center items-center gap-3 bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <span className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Loading Registration Details...</span>
      </div>
    );
  }

  if (error || !app) {
    return (
      <div className="min-h-screen flex flex-col justify-center items-center gap-4 bg-background px-4 text-center">
        <AlertCircle className="h-12 w-12 text-destructive" />
        <div className="space-y-1">
          <h2 className="text-xl font-bold">Print Error</h2>
          <p className="text-sm text-muted-foreground">{error || 'An unexpected error occurred.'}</p>
        </div>
      </div>
    );
  }

  const dobFormatted = app.dateOfBirth 
    ? new Date(app.dateOfBirth).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : 'N/A';

  const formatShortDate = (timestamp: any) => {
    if (!timestamp) return 'N/A';
    if (typeof timestamp.toDate === 'function') {
      return timestamp.toDate().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    }
    return new Date(timestamp).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const submittedDate = app.createdAt ? formatShortDate(app.createdAt) : 'N/A';

  return (
    <div className="min-h-screen bg-white text-zinc-900 p-6 sm:p-12 max-w-4xl mx-auto print:p-0">
      
      {/* Quick Print Toolbar (Hidden on Print) */}
      <div className="flex justify-between items-center gap-3 bg-zinc-50 border rounded-2xl p-4 mb-8 print:hidden">
        <div className="text-xs text-zinc-500">
          Print preview page for Registration <strong>#{app.id}</strong>.
        </div>
        <Button onClick={() => window.print()} className="rounded-xl font-bold flex items-center gap-2">
          <Printer className="h-4 w-4" /> Print / Save as PDF
        </Button>
      </div>

      {/* Main Registration Form Container */}
      <div className="space-y-6">
        
        {/* Header Title Banner */}
        <div className="border-b-4 border-teal-700 pb-4 flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-extrabold text-teal-800 tracking-tight">Kannada's Got Latent</h1>
            <p className="text-sm font-semibold uppercase tracking-wider text-zinc-500 mt-1">Official Registration Profile</p>
          </div>
          <div className="text-right">
            <div className="text-sm font-mono font-bold text-zinc-600 mb-1.5">Registration ID: #{app.id}</div>
            <span className={`inline-block px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-full ${
              app.status === 'Selected' ? 'bg-emerald-100 text-emerald-800' :
              app.status === 'Shortlisted' ? 'bg-amber-100 text-amber-800' :
              app.status === 'Rejected' ? 'bg-rose-100 text-rose-800' :
              'bg-sky-100 text-sky-800'
            }`}>
              {app.status || 'New'}
            </span>
          </div>
        </div>

        {/* 2-Column Info Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* Column 1: Basic Information */}
          <div className="space-y-4">
            <h2 className="text-sm font-extrabold text-teal-800 uppercase tracking-wider border-b pb-1.5">1. Basic Information</h2>
            <table className="w-full text-xs">
              <tbody className="divide-y divide-zinc-100">
                <tr className="py-2"><td className="py-2 text-zinc-500 font-medium w-1/3">Full Name</td><td className="py-2 font-bold">{app.fullName}</td></tr>
                <tr className="py-2"><td className="py-2 text-zinc-500 font-medium">Stage Name</td><td className="py-2 font-bold">{app.stageName || 'N/A'}</td></tr>
                <tr className="py-2"><td className="py-2 text-zinc-500 font-medium">Gender</td><td className="py-2 font-bold capitalize">{app.gender}</td></tr>
                <tr className="py-2"><td className="py-2 text-zinc-500 font-medium">Date of Birth</td><td className="py-2 font-bold">{dobFormatted}</td></tr>
                <tr className="py-2"><td className="py-2 text-zinc-500 font-medium">Calculated Age</td><td className="py-2 font-bold">{app.age} Years Old</td></tr>
                <tr className="py-2"><td className="py-2 text-zinc-500 font-medium">Mobile Number</td><td className="py-2 font-mono font-bold">{app.mobileNumber}</td></tr>
                <tr className="py-2"><td className="py-2 text-zinc-500 font-medium">Email Address</td><td className="py-2 font-bold break-all">{app.email}</td></tr>
                <tr className="py-2"><td className="py-2 text-zinc-500 font-medium">City / Location</td><td className="py-2 font-bold">{app.city}</td></tr>
                <tr className="py-2"><td className="py-2 text-zinc-500 font-medium">State</td><td className="py-2 font-bold">{app.state}</td></tr>
                <tr className="py-2"><td className="py-2 text-zinc-500 font-medium">PIN Code</td><td className="py-2 font-mono font-bold">{app.pinCode}</td></tr>
              </tbody>
            </table>
          </div>

          {/* Column 2: Talent Details & Availability */}
          <div className="space-y-6">
            <div className="space-y-3">
              <h2 className="text-sm font-extrabold text-teal-800 uppercase tracking-wider border-b pb-1.5">2. Talent Information</h2>
              <table className="w-full text-xs">
                <tbody className="divide-y divide-zinc-100">
                  <tr><td className="py-2 text-zinc-500 font-medium w-1/3">Talent Categories</td><td className="py-2 font-bold">{app.talentCategory?.join(', ') || 'N/A'}</td></tr>
                  <tr><td className="py-2 text-zinc-500 font-medium">Talent Title</td><td className="py-2 font-bold">{app.talentTitle}</td></tr>
                  <tr><td className="py-2 text-zinc-500 font-medium">Performed on Stage</td><td className="py-2 font-bold">{app.performedOnStageBefore ? 'Yes' : 'No'}</td></tr>
                  <tr><td className="py-2 text-zinc-500 font-medium">Submitted On</td><td className="py-2 font-bold">{submittedDate}</td></tr>
                </tbody>
              </table>
            </div>

            <div className="space-y-3">
              <h2 className="text-sm font-extrabold text-teal-800 uppercase tracking-wider border-b pb-1.5">3. Availability & Travel</h2>
              <table className="w-full text-xs">
                <tbody className="divide-y divide-zinc-100">
                  <tr><td className="py-2 text-zinc-500 font-medium w-1/3">Can Travel to Shoot</td><td className="py-2 font-bold">{app.canTravel ? 'Yes' : 'No'}</td></tr>
                  <tr><td className="py-2 text-zinc-500 font-medium">Preferred Languages</td><td className="py-2 font-bold">{app.preferredLanguages?.join(', ') || 'N/A'}</td></tr>
                  <tr><td className="py-2 text-zinc-500 font-medium">Weekend Shoot</td><td className="py-2 font-bold">{app.availableWeekends ? 'Available' : 'Not Available'}</td></tr>
                  <tr><td className="py-2 text-zinc-500 font-medium">Weekday Shoot</td><td className="py-2 font-bold">{app.availableWeekdays ? 'Available' : 'Not Available'}</td></tr>
                </tbody>
              </table>
            </div>
          </div>

        </div>

        {/* Talent Description (Full Width) */}
        <div className="space-y-2 pt-2">
          <h2 className="text-sm font-extrabold text-teal-800 uppercase tracking-wider border-b pb-1.5">4. Talent Description</h2>
          <div className="bg-zinc-50 border rounded-xl p-4 text-xs leading-relaxed text-zinc-700 whitespace-pre-wrap">
            {app.talentDescription}
          </div>
        </div>

        {/* Emergency Contact & Review Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-2">
          <div className="space-y-3">
            <h2 className="text-sm font-extrabold text-teal-800 uppercase tracking-wider border-b pb-1.5">5. Emergency Contact</h2>
            <table className="w-full text-xs">
              <tbody className="divide-y divide-zinc-100">
                <tr><td className="py-2 text-zinc-500 font-medium w-1/3">Contact Name</td><td className="py-2 font-bold">{app.emergencyName || 'N/A'}</td></tr>
                <tr><td className="py-2 text-zinc-500 font-medium">Relationship</td><td className="py-2 font-bold">{app.emergencyRelationship || 'N/A'}</td></tr>
                <tr><td className="py-2 text-zinc-500 font-medium">Mobile Number</td><td className="py-2 font-mono font-bold">{app.emergencyMobile || 'N/A'}</td></tr>
              </tbody>
            </table>
          </div>

          <div className="space-y-3">
            <h2 className="text-sm font-extrabold text-teal-800 uppercase tracking-wider border-b pb-1.5">6. Review Details</h2>
            <table className="w-full text-xs">
              <tbody className="divide-y divide-zinc-100">
                <tr><td className="py-2 text-zinc-500 font-medium w-1/3">Performance Date</td><td className="py-2 font-bold">{app.auditionDate ? formatShortDate(app.auditionDate) : 'Not Scheduled'}</td></tr>
                <tr><td className="py-2 text-zinc-500 font-medium">Call Scheduled</td><td className="py-2 font-bold">{app.callScheduled ? 'Yes' : 'No'}</td></tr>
                <tr><td className="py-2 text-zinc-500 font-medium">Internal Notes</td><td className="py-2 text-zinc-600 italic break-words">{app.internalNotes || 'No notes added'}</td></tr>
                <tr><td className="py-2 text-zinc-500 font-medium">Judge Comments</td><td className="py-2 text-zinc-600 italic break-words">{app.judgeComments || 'No comments logged'}</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Performance Media Links */}
        <div className="space-y-3 pt-2">
          <h2 className="text-sm font-extrabold text-teal-800 uppercase tracking-wider border-b pb-1.5">7. Performance Media Links</h2>
          <div className="space-y-1.5 text-xs">
            {app.introVideoUrl && (
              <div className="flex justify-between py-1 border-b border-zinc-100">
                <span className="text-zinc-500 font-medium">1. Introduction Video Link</span>
                <span className="font-bold font-mono text-teal-700 underline truncate max-w-lg">
                  <a href={app.introVideoUrl} target="_blank" rel="noopener noreferrer">
                    {app.introVideoUrl}
                  </a>
                </span>
              </div>
            )}
            {(app.talentVideoUrl || app.externalVideoLink) && (
              <div className="flex justify-between py-1 border-b border-zinc-100">
                <span className="text-zinc-500 font-medium">2. Performance Video / Reel</span>
                <span className="font-bold font-mono text-teal-700 underline truncate max-w-lg">
                  <a 
                    href={(app.talentVideoUrl && app.talentVideoUrl.startsWith('/uploads/')) ? app.talentVideoUrl : app.externalVideoLink || app.talentVideoUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                  >
                    {(app.talentVideoUrl && app.talentVideoUrl.startsWith('/uploads/')) ? app.talentVideoUrl : app.externalVideoLink || app.talentVideoUrl}
                  </a>
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Profile Images */}
        <div className="space-y-3 pt-2">
          <h2 className="text-sm font-extrabold text-teal-800 uppercase tracking-wider border-b pb-1.5">8. Uploaded Profile Images</h2>
          {app.photos && app.photos.length > 0 ? (
            <div className="grid grid-cols-5 gap-3 pt-2">
              {app.photos.map((photoUrl, idx) => (
                <div key={photoUrl} className="aspect-square border rounded-lg overflow-hidden bg-zinc-50">
                  <img src={photoUrl} alt={`Profile Image ${idx + 1}`} className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-zinc-500 italic">No profile images uploaded</p>
          )}
        </div>

      </div>

    </div>
  );
}

export default function PrintRegistrationProfile() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex flex-col justify-center items-center gap-3 bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <span className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Initializing Print Layout...</span>
      </div>
    }>
      <PrintRegistrationProfileContent />
    </Suspense>
  );
}
