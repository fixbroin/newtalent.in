
"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { Mail, ShieldAlert, KeyRound, Trash2, Loader2, Phone, ShieldCheck, MapPin, Edit3, Save, User as UserIcon, AtSign, CheckCircle2, XCircle, Plus, Video, FileText, ExternalLink, Upload, Globe, Image as ImageIcon, Facebook, Instagram, Twitter, Linkedin, Youtube, Sparkles } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "@/lib/firebase";
import { nanoid } from "nanoid";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription as AlertDialogDescriptionComponent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { updateProfile, sendPasswordResetEmail, deleteUser, updateEmail, sendEmailVerification, RecaptchaVerifier, type ConfirmationResult, type User, linkWithPhoneNumber } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc, setDoc, deleteDoc, updateDoc, Timestamp, onSnapshot } from "firebase/firestore";
import { useToast } from '@/hooks/use-toast';
import type { FirestoreUser, ArtistApplication, ArtistApplicationStatus, ArtistVideo, ArtistCertificate } from '@/types/firestore';
import Link from 'next/link';
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import ArtistProfileDetails from "@/components/artist/ArtistProfileDetails";
import { useApplicationConfig } from '@/hooks/useApplicationConfig';
import { triggerRefresh, submitProfileToGoogleIndexing } from '@/lib/revalidateUtils';
import { debounce } from 'lodash';
import { Badge } from '@/components/ui/badge';
import { UserPlus, Clock,  AlertCircle, Edit, Briefcase, Share2 } from 'lucide-react';

const updateNameSchema = z.object({
  displayName: z.string().min(2, { message: "Name must be at least 2 characters." }).max(50, "Name too long."),
});
type UpdateNameFormValues = z.infer<typeof updateNameSchema>;

const updateUsernameSchema = z.object({
  username: z.string()
    .min(3, { message: "Username must be at least 3 characters." })
    .max(20, { message: "Username cannot exceed 20 characters." })
    .regex(/^[a-zA-Z0-9_]+$/, { message: "Username can only contain letters, numbers, and underscores." }),
});
type UpdateUsernameFormValues = z.infer<typeof updateUsernameSchema>;

const updateMobileSchema = z.object({
  mobileNumber: z.string()
    .min(10, "Please enter a valid 10-digit mobile number.")
    .max(10, "Please enter a valid 10-digit mobile number.")
    .regex(/^[6-9]\d{9}$/, "Please enter a valid 10-digit Indian mobile number."),
});
type UpdateMobileFormValues = z.infer<typeof updateMobileSchema>;

const updateEmailSchema = z.object({
  email: z.string().email("Please enter a valid email address."),
});
type UpdateEmailFormValues = z.infer<typeof updateEmailSchema>;

const otpSchema = z.object({
  otp: z.string().min(6, "OTP must be 6 digits.").max(6, "OTP must be 6 digits."),
});
type OtpFormData = z.infer<typeof otpSchema>;

interface TourTooltipProps {
  title: string;
  description: string;
  onNext: () => void;
  onSkip: () => void;
  step: number;
}

const TourTooltip = ({ title, description, onNext, onSkip, step }: TourTooltipProps) => {
  let positionClass = "";
  let arrowClass = "";

  if (step === 0) {
    positionClass = "left-0 translate-x-0 sm:left-1/2 sm:-translate-x-1/2";
    arrowClass = "left-10 sm:left-1/2 sm:-translate-x-1/2";
  } else if (step === 1) {
    positionClass = "left-1/2 -translate-x-[35%] sm:left-1/2 sm:-translate-x-1/2";
    arrowClass = "left-[35%] sm:left-1/2 sm:-translate-x-1/2";
  } else if (step === 2) {
    positionClass = "left-1/2 -translate-x-[65%] sm:left-1/2 sm:-translate-x-1/2";
    arrowClass = "left-[65%] sm:left-1/2 sm:-translate-x-1/2";
  } else {
    positionClass = "right-0 left-auto translate-x-0 sm:left-1/2 sm:-translate-x-1/2 sm:right-auto";
    arrowClass = "right-10 left-auto sm:left-1/2 sm:-translate-x-1/2 sm:right-auto";
  }

  return (
    <span 
      className={`absolute top-full mt-3 w-72 max-w-[calc(100vw-2rem)] bg-gradient-to-br from-primary to-primary/95 text-primary-foreground p-5 rounded-2xl shadow-2xl z-[100] text-left cursor-default border border-white/10 block font-normal normal-case whitespace-normal animate-in fade-in slide-in-from-top-2 duration-300 ${positionClass}`}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Little arrow pointing up */}
      <span className={`absolute bottom-full border-[8px] border-transparent border-b-primary block h-0 w-0 ${arrowClass}`} />
      
      <span className="space-y-3 block">
        <span className="flex justify-between items-center block">
          <span className="font-black text-[9px] uppercase tracking-[0.15em] bg-white/20 px-2 py-0.5 rounded-full inline-block">Step {step + 1} of 4</span>
          <span onClick={onSkip} className="text-xs font-bold hover:underline opacity-80 hover:opacity-100 transition-opacity cursor-pointer inline-block">Skip</span>
        </span>
        <span className="space-y-1 block">
          <span className="font-black text-sm tracking-tight block">{title}</span>
          <span className="text-xs leading-relaxed opacity-90 block">{description}</span>
        </span>
        <span className="flex justify-end pt-1 block">
          <span 
            className="h-8 text-xs px-4 rounded-xl font-bold bg-white text-primary hover:bg-gray-100 active:scale-95 transition-all shadow-md inline-flex items-center justify-center cursor-pointer"
            onClick={onNext}
          >
            {step === 3 ? "Finish" : "Next"}
          </span>
        </span>
      </span>
    </span>
  );
};

export default function ProfilePage() {
  const { user, firestoreUser, isLoading: authIsLoading, setUser, logOut, checkUsernameAvailability, generateUsernameSuggestions } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const { config: appConfig, isLoading: isLoadingAppSettings } = useApplicationConfig();

  const [isLoadingData, setIsLoadingData] = useState(true);
  const [artistApp, setArtistApp] = useState<ArtistApplication | null>(null);
  const [isLoadingArtistApp, setIsLoadingArtistApp] = useState(true);
  const [isNameDialogOpen, setIsNameDialogOpen] = useState(false);
  const [isSubmittingName, setIsSubmittingName] = useState(false);
  const [isUsernameDialogOpen, setIsUsernameDialogOpen] = useState(false);
  const [isSubmittingUsername, setIsSubmittingUsername] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid'>('idle');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isMobileDialogOpen, setIsMobileDialogOpen] = useState(false);
  const [isSubmittingMobile, setIsSubmittingMobile] = useState(false);
  const [isEmailDialogOpen, setIsEmailDialogOpen] = useState(false);
  const [isSubmittingEmail, setIsSubmittingEmail] = useState(false);
  const [isSendingResetEmail, setIsSendingResetEmail] = useState(false);
  const [isSendingVerification, setIsSendingVerification] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [deletionRequest, setDeletionRequest] = useState<any>(null);
  const [isLoadingDeletionRequest, setIsLoadingDeletionRequest] = useState(true);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isSuccessDialogOpen, setIsSuccessDialogOpen] = useState(false);
  const [deletionReason, setDeletionReason] = useState("");
  const [isSubmittingDeletionRequest, setIsSubmittingDeletionRequest] = useState(false);
  const [isCancelingDeletion, setIsCancelingDeletion] = useState(false);
  const [isOtpDialogOpen, setIsOtpDialogOpen] = useState(false);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const recaptchaVerifierRef = useRef<RecaptchaVerifier | null>(null);

  const [videos, setVideos] = useState<ArtistVideo[]>([]);
  const [certificates, setCertificates] = useState<ArtistCertificate[]>([]);
  const [isSavingPortfolio, setIsSavingPortfolio] = useState(false);
  const [isVideoDialogOpen, setIsVideoDialogOpen] = useState(false);
  const [isCertDialogOpen, setIsCertDialogOpen] = useState(false);
  const [newVideo, setNewVideo] = useState({ name: '', url: '' });
  const [newCert, setNewCert] = useState<{ name: string; url: string; type: 'link' | 'image' | 'pdf'; file: File | null }>({ name: '', url: '', type: 'link', file: null });
  const [isUploading, setIsUploading] = useState(false);

  const [socialMedia, setSocialMedia] = useState({
    facebook: '',
    instagram: '',
    twitter: '',
    linkedin: '',
    youtube: '',
    website: ''
  });
  const [showSocialMedia, setShowSocialMedia] = useState(false);
  const [isSavingSocial, setIsSavingSocial] = useState(false);

  const [activeTab, setActiveTab] = useState<string>("account");
  const [tourStep, setTourStep] = useState<number | null>(null);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [isChecklistOpen, setIsChecklistOpen] = useState(false);
  const [isAlertDismissed, setIsAlertDismissed] = useState(false);

  // Check if current user has the artist role or app
  const isArtist = firestoreUser?.roles?.includes('artist') || (artistApp && artistApp.status === 'approved');

  // Onboarding items details
  const hasSocialLinks = !!firestoreUser?.socialMediaLinks && Object.values(firestoreUser.socialMediaLinks).some(link => !!link);
  const hasVisibilitySettings = firestoreUser?.showMobileOnPublicProfile !== undefined || firestoreUser?.showEmailOnPublicProfile !== undefined;

  const checklistItems = [
    {
      id: 'photo_bio',
      label: 'Upload Profile Photo & Write Bio',
      tab: 'account',
      isCompleted: !!artistApp?.profilePhotoUrl && !!artistApp?.bio,
      percentage: 20,
      description: 'Add a professional headshot and brief description of your talent.'
    },
    {
      id: 'videos',
      label: 'Add Audition or Work Videos',
      tab: 'portfolio',
      isCompleted: videos.length > 0,
      percentage: 20,
      description: 'Add links to your best performances or video work samples.'
    },
    {
      id: 'certificates',
      label: 'Add Course Certificates',
      tab: 'portfolio',
      isCompleted: certificates.length > 0,
      percentage: 20,
      description: 'Showcase your training, diplomas, or professional certifications.'
    },
    {
      id: 'social',
      label: 'Link Social Media Profiles',
      tab: 'social',
      isCompleted: hasSocialLinks,
      percentage: 20,
      description: 'Link your Instagram, YouTube, or LinkedIn accounts so clients can research you.'
    },
    {
      id: 'visibility',
      label: 'Configure Mobile & Email Visibility',
      tab: 'security',
      isCompleted: hasVisibilitySettings,
      percentage: 20,
      description: 'Set whether casting directors can see your contact numbers/emails.'
    }
  ];

  const profileStrength = checklistItems.reduce((sum, item) => sum + (item.isCompleted ? item.percentage : 0), 0);
  const isProfileComplete = profileStrength === 100;

  useEffect(() => {
    if (isArtist && user?.uid) {
      const hasSeenModal = localStorage.getItem(`seen_welcome_checklist_${user.uid}`);
      if (!hasSeenModal) {
        setShowWelcomeModal(true);
      }
      const isDismissed = localStorage.getItem(`dismiss_profile_alert_${user.uid}`) === 'true';
      setIsAlertDismissed(isDismissed);
    }
  }, [isArtist, user?.uid]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search);
      if (searchParams.get('startTour') === 'true') {
        window.history.replaceState({}, document.title, window.location.pathname);
        setActiveTab("account");
        setTourStep(0);
      }
    }
  }, []);

  const startTour = () => {
    setShowWelcomeModal(false);
    if (user?.uid) {
      localStorage.setItem(`seen_welcome_checklist_${user.uid}`, 'true');
    }
    setActiveTab("account");
    setTourStep(0);
  };

  const skipWelcomeModal = () => {
    setShowWelcomeModal(false);
    if (user?.uid) {
      localStorage.setItem(`seen_welcome_checklist_${user.uid}`, 'true');
    }
  };

  const endTour = () => {
    setTourStep(null);
    if (user?.uid) {
      localStorage.setItem(`seen_profile_tour_${user.uid}`, 'true');
    }
    setActiveTab("account");
  };

  useEffect(() => {
    if (firestoreUser) {
      setVideos(firestoreUser.videos || []);
      setCertificates(firestoreUser.certificates || []);
      setSocialMedia({
        facebook: firestoreUser.socialMediaLinks?.facebook || '',
        instagram: firestoreUser.socialMediaLinks?.instagram || '',
        twitter: firestoreUser.socialMediaLinks?.twitter || '',
        linkedin: firestoreUser.socialMediaLinks?.linkedin || '',
        youtube: firestoreUser.socialMediaLinks?.youtube || '',
        website: firestoreUser.socialMediaLinks?.website || ''
      });
      setShowSocialMedia(!!firestoreUser.showSocialMediaOnPublicProfile);
    }
  }, [firestoreUser]);

  const handleSaveSocial = async () => {
    if (!user) return;
    setIsSavingSocial(true);
    try {
      const socialLinks = {
        facebook: socialMedia.facebook.trim(),
        instagram: socialMedia.instagram.trim(),
        twitter: socialMedia.twitter.trim(),
        linkedin: socialMedia.linkedin.trim(),
        youtube: socialMedia.youtube.trim(),
        website: socialMedia.website.trim()
      };
      
      await updateDoc(doc(db, "users", user.uid), { 
        socialMediaLinks: socialLinks,
        showSocialMediaOnPublicProfile: showSocialMedia
      });

      // If user is an artist, also update ArtistApplications
      const appDocRef = doc(db, "ArtistApplications", user.uid);
      const appDocSnap = await getDoc(appDocRef);
      if (appDocSnap.exists()) {
        await updateDoc(appDocRef, { 
          socialMediaLinks: socialLinks,
          showSocialMediaOnPublicProfile: showSocialMedia
        });
        
        // Trigger multi-level revalidation
        await triggerRefresh('artists');
        const appData = appDocSnap.data() as ArtistApplication;
        if (appData.username) {
            await triggerRefresh(`artist-${appData.username}`);
        }
        if (appData.workCategorySlug) {
            await triggerRefresh(`category-${appData.workCategorySlug}`);
        }
        if (appData.status === 'approved' && appData.workCategorySlug && appData.username) {
          submitProfileToGoogleIndexing(appData.workCategorySlug, appData.username).catch(err => {
            console.error("Google Indexing error on social media update:", err);
          });
        }
      }

      toast({ title: "Success", description: "Social media links updated successfully." });
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Could not save social media links.", variant: "destructive" });
    } finally {
      setIsSavingSocial(false);
    }
  };

  const handleSavePortfolio = async (updatedVideos: ArtistVideo[], updatedCerts: ArtistCertificate[]) => {
    if (!user) return;
    setIsSavingPortfolio(true);
    try {
      await setDoc(doc(db, "users", user.uid), { 
        videos: updatedVideos, 
        certificates: updatedCerts 
      }, { merge: true });

      // If user is an artist, also update ArtistApplications
      const appDocRef = doc(db, "ArtistApplications", user.uid);
      const appDocSnap = await getDoc(appDocRef);
      if (appDocSnap.exists()) {
        const appData = appDocSnap.data() as ArtistApplication;
        await setDoc(appDocRef, { 
          videos: updatedVideos, 
          certificates: updatedCerts 
        }, { merge: true });
        
        // Trigger multi-level revalidation
        await triggerRefresh('artists');
        if (appData.username) {
            await triggerRefresh(`artist-${appData.username}`);
        }
        if (appData.workCategorySlug) {
            await triggerRefresh(`category-${appData.workCategorySlug}`);
        }
        if (appData.status === 'approved' && appData.workCategorySlug && appData.username) {
          submitProfileToGoogleIndexing(appData.workCategorySlug, appData.username).catch(err => {
            console.error("Google Indexing error on portfolio update:", err);
          });
        }
      }

      toast({ title: "Success", description: "Portfolio updated successfully." });
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Could not save portfolio.", variant: "destructive" });
    } finally {
      setIsSavingPortfolio(false);
    }
  };

  const handleAddVideo = () => {
    if (!newVideo.name || !newVideo.url) {
      toast({ title: "Missing Information", description: "Please provide both video name and URL.", variant: "destructive" });
      return;
    }
    const updatedVideos = [...videos, { id: nanoid(), ...newVideo }];
    setVideos(updatedVideos);
    handleSavePortfolio(updatedVideos, certificates);
    setNewVideo({ name: '', url: '' });
    setIsVideoDialogOpen(false);
  };

  const handleRemoveVideo = (id: string) => {
    const updatedVideos = videos.filter(v => v.id !== id);
    setVideos(updatedVideos);
    handleSavePortfolio(updatedVideos, certificates);
  };

  const handleFileUpload = async (file: File) => {
    if (!user) return null;
    setIsUploading(true);
    try {
      const storageRef = ref(storage, `users/${user.uid}/portfolio/${nanoid()}-${file.name}`);
      const snapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);
      return downloadURL;
    } catch (error: any) {
      toast({ title: "Upload Error", description: error.message, variant: "destructive" });
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  const handleAddCert = async () => {
    if (!newCert.name) {
      toast({ title: "Missing Name", description: "Please provide the course name.", variant: "destructive" });
      return;
    }

    let finalUrl = newCert.url;
    if (newCert.type !== 'link' && newCert.file) {
      const uploadedUrl = await handleFileUpload(newCert.file);
      if (!uploadedUrl) return;
      finalUrl = uploadedUrl;
    }

    if (!finalUrl && newCert.type === 'link') {
        toast({ title: "Missing URL", description: "Please provide a certificate URL.", variant: "destructive" });
        return;
    }

    if (!finalUrl) {
      toast({ title: "Missing File", description: "Please upload a file.", variant: "destructive" });
      return;
    }

    const updatedCerts = [...certificates, { 
      id: nanoid(), 
      name: newCert.name, 
      url: finalUrl, 
      type: newCert.type 
    }];
    setCertificates(updatedCerts);
    handleSavePortfolio(videos, updatedCerts);
    setNewCert({ name: '', url: '', type: 'link', file: null });
    setIsCertDialogOpen(false);
  };

  const handleRemoveCert = (id: string) => {
    const updatedCerts = certificates.filter(c => c.id !== id);
    setCertificates(updatedCerts);
    handleSavePortfolio(videos, updatedCerts);
  };

  const nameForm = useForm<UpdateNameFormValues>({ resolver: zodResolver(updateNameSchema) });
  const usernameForm = useForm<UpdateUsernameFormValues>({ resolver: zodResolver(updateUsernameSchema) });
  const mobileForm = useForm<UpdateMobileFormValues>({ resolver: zodResolver(updateMobileSchema) });
  const emailForm = useForm<UpdateEmailFormValues>({ resolver: zodResolver(updateEmailSchema) });
  const otpForm = useForm<OtpFormData>({ resolver: zodResolver(otpSchema) });

  useEffect(() => {
    if (user && firestoreUser) {
      nameForm.reset({ displayName: firestoreUser.displayName || user.displayName || "" });
      usernameForm.reset({ username: firestoreUser.username || "" });
      mobileForm.reset({ mobileNumber: (firestoreUser.mobileNumber || user.phoneNumber || "").replace(appConfig?.defaultOtpCountryCode || '+91', '') });
      emailForm.reset({ email: firestoreUser.email || user.email || "" });
      setIsLoadingData(false);
    } else if (!authIsLoading && !user) {
      setIsLoadingData(false); // User not logged in, stop loading
    }
  }, [user, firestoreUser, authIsLoading, appConfig, nameForm, mobileForm, emailForm]);

  useEffect(() => {
    if (user?.uid) {
      const appDocRef = doc(db, "ArtistApplications", user.uid);
      const unsubscribe = onSnapshot(appDocRef, (docSnap) => {
        if (docSnap.exists()) {
          setArtistApp(docSnap.data() as ArtistApplication);
        } else {
          setArtistApp(null);
        }
        setIsLoadingArtistApp(false);
      });
      return () => unsubscribe();
    } else {
      setArtistApp(null);
      setIsLoadingArtistApp(false);
    }
  }, [user]);

  useEffect(() => {
    if (user?.uid) {
      const deletionDocRef = doc(db, "accountDeletionRequests", user.uid);
      const unsubscribe = onSnapshot(deletionDocRef, (docSnap) => {
        if (docSnap.exists()) {
          setDeletionRequest(docSnap.data());
        } else {
          setDeletionRequest(null);
        }
        setIsLoadingDeletionRequest(false);
      }, (error) => {
        console.error("Error loading deletion request in profile dashboard:", error);
        setIsLoadingDeletionRequest(false);
      });
      return () => unsubscribe();
    } else {
      setDeletionRequest(null);
      setIsLoadingDeletionRequest(false);
    }
  }, [user]);

  const setupAndRenderRecaptcha = useCallback(async (): Promise<RecaptchaVerifier> => {
    if (recaptchaVerifierRef.current) {
        recaptchaVerifierRef.current.clear();
    }
    const recaptchaContainer = document.getElementById('recaptcha-container-profile');
    if (!recaptchaContainer) {
        throw new Error("reCAPTCHA container not found.");
    }
    try {
        const verifier = new RecaptchaVerifier(auth, recaptchaContainer, {
            'size': 'invisible',
            'callback': () => console.log("reCAPTCHA solved for profile verification."),
        });
        await verifier.render();
        recaptchaVerifierRef.current = verifier;
        return verifier;
    } catch (e) {
        console.error("Error setting up reCAPTCHA for profile:", e);
        throw new Error("Failed to initialize reCAPTCHA. Please refresh and try again.");
    }
  }, []);

  const handleSendVerificationOtp = async () => {
    const mobileNumber = firestoreUser?.mobileNumber || user?.phoneNumber;
    if (!mobileNumber) {
        toast({ title: "Mobile Number Missing", description: "Please add a mobile number to your profile first.", variant: "destructive" });
        return;
    }
    if (!auth.currentUser) {
        toast({ title: "Authentication Error", description: "User not found. Please log in again.", variant: "destructive" });
        return;
    }
    
    setIsSendingOtp(true);
    const countryCode = appConfig?.defaultOtpCountryCode || '+91';
    let fullPhoneNumber = mobileNumber;
    if (!fullPhoneNumber.startsWith('+')) {
      fullPhoneNumber = `${countryCode}${fullPhoneNumber.replace(/\D/g, '')}`;
    }
    
    try {
        const appVerifier = await setupAndRenderRecaptcha();
        const confirmation = await linkWithPhoneNumber(auth.currentUser, fullPhoneNumber, appVerifier);
        setConfirmationResult(confirmation);
        setIsOtpDialogOpen(true);
        toast({ title: "OTP Sent", description: `An OTP has been sent to ${fullPhoneNumber}.` });
    } catch (error: any) {
        console.error("Error sending OTP for verification:", error);
        toast({ title: "OTP Error", description: error.message || "Failed to send OTP. The number might be invalid or already in use.", variant: "destructive" });
    } finally {
        setIsSendingOtp(false);
    }
  };
  
  const handleVerifyOtp = async (data: OtpFormData) => {
    if (!confirmationResult || !user) return;
    setIsVerifyingOtp(true);
    try {
        await confirmationResult.confirm(data.otp);
        await setDoc(doc(db, "users", user.uid), { mobileNumberVerified: true }, { merge: true });
        toast({ title: "Success!", description: "Your mobile number has been verified." });
        setIsOtpDialogOpen(false);
        otpForm.reset();
        await auth.currentUser?.reload();
        setUser(auth.currentUser);
    } catch (error: any) {
        otpForm.setError("otp", { type: "manual", message: "Invalid OTP or error verifying." });
        toast({ title: "Verification Failed", description: error.message, variant: "destructive" });
    } finally {
        setIsVerifyingOtp(false);
    }
  };

  const profileUsername = usernameForm.watch("username");

  const debouncedCheck = useCallback(
    debounce(async (val: string) => {
      if (val === firestoreUser?.username) {
        setUsernameStatus('available');
        return;
      }
      if (val.length < 3) {
        setUsernameStatus('invalid');
        return;
      }
      setUsernameStatus('checking');
      const isAvailable = await checkUsernameAvailability(val);
      if (isAvailable) {
        setUsernameStatus('available');
        setSuggestions([]);
      } else {
        setUsernameStatus('taken');
        const newSuggestions = await generateUsernameSuggestions(val);
        setSuggestions(newSuggestions);
      }
    }, 500),
    [checkUsernameAvailability, generateUsernameSuggestions, firestoreUser?.username]
  );

  useEffect(() => {
    if (profileUsername && isUsernameDialogOpen) {
      debouncedCheck(profileUsername);
    } else {
      setUsernameStatus('idle');
      setSuggestions([]);
    }
  }, [profileUsername, debouncedCheck, isUsernameDialogOpen]);

  const handleUpdateUsername = async (values: UpdateUsernameFormValues) => {
    if (!user || usernameStatus !== 'available') return;
    setIsSubmittingUsername(true);
    try {
      const newUsername = values.username.toLowerCase();
      
      // Update users collection
      await setDoc(doc(db, "users", user.uid), { username: newUsername }, { merge: true });
      
      // Update ArtistApplications collection if user is an artist
      const appDocRef = doc(db, "ArtistApplications", user.uid);
      const appDocSnap = await getDoc(appDocRef);
      if (appDocSnap.exists()) {
        await setDoc(appDocRef, { username: newUsername }, { merge: true });
        
        // Trigger refresh for artists list and the specific category if possible
        await triggerRefresh('artists');
        const appData = appDocSnap.data() as ArtistApplication;
        if (appData.workCategorySlug) {
          await triggerRefresh(`category-${appData.workCategorySlug}`);
        }
        if (appData.status === 'approved' && appData.workCategorySlug) {
          submitProfileToGoogleIndexing(appData.workCategorySlug, newUsername).catch(err => {
            console.error("Google Indexing error on username update:", err);
          });
        }
      }

      toast({ title: "Success", description: "Your username has been updated." });
      setIsUsernameDialogOpen(false);
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Could not update username.", variant: "destructive" });
    } finally {
      setIsSubmittingUsername(false);
    }
  };

  const handleUpdateName = async (values: UpdateNameFormValues) => {
    if (!user || !auth.currentUser) return;
    setIsSubmittingName(true);
    try {
      await updateProfile(auth.currentUser, { displayName: values.displayName });
      await setDoc(doc(db, "users", user.uid), { displayName: values.displayName }, { merge: true });
      toast({ title: "Success", description: "Your name has been updated." });
      setIsNameDialogOpen(false);
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Could not update name.", variant: "destructive" });
    } finally {
      setIsSubmittingName(false);
    }
  };
  
  const handleUpdateEmail = async (values: UpdateEmailFormValues) => {
    if (!user || !auth.currentUser) return;
    setIsSubmittingEmail(true);
    try {
      await updateEmail(auth.currentUser, values.email); 
      await setDoc(doc(db, "users", user.uid), { email: values.email }, { merge: true });
      toast({ title: "Email Updated", description: "A verification link has been sent to your new email address." });
      setIsEmailDialogOpen(false);
    } catch (error: any) {
      if (error.code === 'auth/requires-recent-login') {
         toast({ title: "Action Requires Recent Login", description: "Please log out and log back in to update your email.", variant: "destructive" });
      } else {
         toast({ title: "Error", description: error.message || "Could not update email.", variant: "destructive" });
      }
    } finally {
      setIsSubmittingEmail(false);
    }
  };

  const handleUpdateMobileNumber = async (values: UpdateMobileFormValues) => {
    if (!user) return;
    setIsSubmittingMobile(true);
    const countryCode = appConfig?.defaultOtpCountryCode || '+91';
    const fullPhoneNumber = `${countryCode}${values.mobileNumber}`;
    try {
      await setDoc(doc(db, "users", user.uid), {
  mobileNumber: fullPhoneNumber,
  mobileNumberVerified: false,
}, { merge: true });
      toast({ title: "Success", description: "Your mobile number has been updated. Please verify it." });
      setIsMobileDialogOpen(false);
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Could not update mobile number.", variant: "destructive" });
    } finally {
      setIsSubmittingMobile(false);
    }
  };

  const handleChangePassword = async () => {
    const emailToUse = user?.email || firestoreUser?.email;
    if (!emailToUse) {
      toast({ title: "Email Required", description: "You must have an email address set to change your password.", variant: "destructive" });
      return;
    }
    setIsSendingResetEmail(true);
    try {
      await sendPasswordResetEmail(auth, emailToUse);
      toast({ title: "Password Reset Email Sent", description: "Check your inbox for a password reset link." });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsSendingResetEmail(false);
    }
  };

  const handleSendVerificationEmail = async () => {
    if (!user || !auth.currentUser || !user.email) return;
    setIsSendingVerification(true);
    try {
        const actionCodeSettings = { url: `${window.location.origin}/profile`, handleCodeInApp: true };
        await sendEmailVerification(auth.currentUser, actionCodeSettings);
        toast({title: "Verification Email Sent", description: "Please check your inbox."});
    } catch (error: any) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
        setIsSendingVerification(false);
    }
  };

  const handleCancelDeletionRequest = async () => {
    if (!user) return;
    setIsCancelingDeletion(true);
    try {
      await deleteDoc(doc(db, "accountDeletionRequests", user.uid));
      toast({
        title: "Deletion Request Cancelled",
        description: "Your deletion request has been cancelled successfully."
      });
    } catch (error: any) {
      toast({
        title: "Cancellation failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsCancelingDeletion(false);
    }
  };

  const handleDeleteRequestSubmit = async () => {
    if (!user) return;
    setIsSubmittingDeletionRequest(true);

    try {
      await setDoc(doc(db, "accountDeletionRequests", user.uid), {
        userId: user.uid,
        userEmail: user.email || firestoreUser?.email || "",
        displayName: firestoreUser?.displayName || "Talent",
        reason: deletionReason,
        status: 'pending',
        requestedAt: Timestamp.now()
      });

      toast({
        title: "Deletion Request Submitted",
        description: "Your account will be deleted permanently in 3 working days."
      });
      
      setIsDeleteDialogOpen(false);
      setIsSuccessDialogOpen(true);
    } catch (error: any) {
      toast({
        title: "Submission failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsSubmittingDeletionRequest(false);
    }
  };

  const renderArtistStatus = () => {
    if (isLoadingArtistApp) {
      return (
        <Card>
          <CardContent className="py-6 flex justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </CardContent>
        </Card>
      );
    }

    if (!artistApp) {
      return (
        <Card className="border-dashed border-2">
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-primary" />
              Join as Artist
            </CardTitle>
            <CardDescription>
              Become a service provider on Newtalent and grow your business.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/artist-registration">
              <Button className="w-full">Register as Artist</Button>
            </Link>
          </CardContent>
        </Card>
      );
    }

    const status = artistApp.status;

    if (status.startsWith('pending_step_')) {
      const step = status.replace('pending_step_', '');
      return (
        <Card className="border-yellow-500/50 bg-yellow-50/50 dark:bg-yellow-950/20">
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2 text-yellow-700 dark:text-yellow-400">
              <AlertCircle className="h-5 w-5" />
              Incomplete Profile
            </CardTitle>
            <CardDescription>
              You haven't completed your artist registration. You are at step {step}.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/artist-registration">
              <Button variant="outline" className="w-full border-yellow-500 text-yellow-700 hover:bg-yellow-100 dark:text-yellow-400 dark:hover:bg-yellow-900/40">
                Continue Registration
              </Button>
            </Link>
          </CardContent>
        </Card>
      );
    }

    if (status === 'pending_review') {
      return (
        <Card className="border-blue-500/50 bg-blue-50/50 dark:bg-blue-950/20">
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2 text-blue-700 dark:text-blue-400">
              <Clock className="h-5 w-5" />
              Application Under Review
            </CardTitle>
            <CardDescription>
              Your application is not approved still please wait. We are reviewing your profile.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button disabled className="w-full bg-blue-500 hover:bg-blue-500 opacity-70">
              Pending Approval
            </Button>
          </CardContent>
        </Card>
      );
    }

    if (status === 'approved') {
      return (
        <Card className="border-green-500/50 bg-green-50/50 dark:bg-green-950/20">
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2 text-green-700 dark:text-green-400">
              <CheckCircle2 className="h-5 w-5" />
              Artist Profile Approved
            </CardTitle>
            <CardDescription>
              Congratulations! Your artist profile is approved and live for the community to discover.
            </CardDescription>
          </CardHeader>
          <CardFooter className="flex flex-col gap-2">
            <Link href="/artist-registration?edit=profile" className="w-full">
              <Button variant="outline" className="w-full border-green-500 text-green-700 hover:bg-green-100 dark:text-green-400 dark:hover:bg-green-900/40">
                <Edit className="mr-2 h-4 w-4" /> Edit Your Profile
              </Button>
            </Link>
            <p className="text-[10px] text-muted-foreground text-center mt-1">
              Note: Changes to your profile will require admin approval again.
            </p>
          </CardFooter>
        </Card>
      );
    }

    if (status === 'rejected' || status === 'needs_update') {
      return (
        <Card className="border-destructive/50 bg-destructive/10">
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2 text-destructive">
              <XCircle className="h-5 w-5" />
              {status === 'rejected' ? 'Application Rejected' : 'Action Required'}
            </CardTitle>
            <CardDescription>
              {status === 'rejected' 
                ? 'Your application could not be approved at this time.' 
                : 'Your application needs some updates as requested by the admin.'}
            </CardDescription>
          </CardHeader>
          {artistApp.adminReviewNotes && (
             <CardContent>
                <div className="p-3 bg-white/50 dark:bg-black/20 rounded border border-destructive/20 text-sm">
                    <p className="font-bold mb-1">Feedback:</p>
                    <p className="text-muted-foreground">{artistApp.adminReviewNotes}</p>
                </div>
             </CardContent>
          )}
          <CardFooter>
            <Link href="/artist-registration" className="w-full">
              <Button variant="destructive" className="w-full">
                {status === 'rejected' ? 'Re-apply as Artist' : 'Update Profile'}
              </Button>
            </Link>
          </CardFooter>
        </Card>
      );
    }

    return null;
  };

  if (authIsLoading || isLoadingData || isLoadingAppSettings || !user) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
  }
  
  return (
    <ProtectedRoute>
      <div id="recaptcha-container-profile" className="fixed bottom-0 right-0"></div>
      <div className="container mx-auto px-4 py-8 max-w-2xl space-y-6">
        
        {/* Dynamic & Premium Page Header */}
        <div className="space-y-1.5 mb-8">
          <div className="flex items-center space-x-2 text-primary">
            <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">User Settings</span>
          </div>
          <h1 className="text-4xl font-black tracking-tight">
            Profile Settings
          </h1>
          <p className="text-muted-foreground text-sm font-medium">
            Manage your personal profile, credentials, portfolio media, and security settings.
          </p>
        </div>

        {isArtist && (
          <div className="space-y-4 mb-6">
            {/* Option 2: Profile Strength Progress Card */}
            <Card className="border-primary/10 shadow-md bg-card/65 backdrop-blur-sm overflow-hidden rounded-3xl">
              <CardContent className="p-6 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black uppercase tracking-widest text-primary bg-primary/10 px-2 py-0.5 rounded-md">Artist Profile</span>
                      {profileStrength === 100 ? (
                        <span className="text-xs font-bold text-green-600 dark:text-green-400 flex items-center gap-1">
                          <CheckCircle2 className="h-3.5 w-3.5" /> All-Star Profile
                        </span>
                      ) : (
                        <span className="text-xs font-bold text-yellow-600 dark:text-yellow-400">
                          Incomplete Profile ({profileStrength}% Done)
                        </span>
                      )}
                    </div>
                    <h3 className="text-lg font-black tracking-tight mt-1">Profile Strength</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setIsChecklistOpen(!isChecklistOpen)}
                      className="rounded-xl border-primary/20 text-xs font-bold text-primary hover:bg-primary/5"
                    >
                      {isChecklistOpen ? "Hide Details" : "Show Checklist"}
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => {
                        setActiveTab("account");
                        setTourStep(0);
                      }}
                      className="text-xs font-bold text-muted-foreground hover:text-primary"
                    >
                      Restart Tour
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-bold text-muted-foreground">
                    <span>{profileStrength === 100 ? "Ready for castings!" : "Complete your profile to unlock 5x more jobs"}</span>
                    <span>{profileStrength}%</span>
                  </div>
                  <Progress value={profileStrength} className="h-2.5 bg-secondary rounded-full [&>div]:bg-gradient-to-r [&>div]:from-primary [&>div]:to-primary/75" />
                </div>

                {isChecklistOpen && (
                  <div className="pt-4 border-t border-primary/5 space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                    <p className="text-xs font-medium text-muted-foreground mb-1">Follow these steps to build a premium verified profile:</p>
                    <div className="grid gap-3 sm:grid-cols-1">
                      {checklistItems.map((item) => (
                        <div 
                          key={item.id}
                          onClick={() => {
                            setActiveTab(item.tab);
                            // Scroll to corresponding trigger
                            const element = document.getElementById(`tab-trigger-${item.tab}`);
                            if (element) {
                              element.scrollIntoView({ behavior: 'smooth' });
                            }
                          }}
                          className={`flex items-start gap-3 p-3 rounded-2xl border transition-all cursor-pointer ${
                            item.isCompleted 
                              ? "bg-green-500/5 border-green-500/10 text-green-900 dark:text-green-100" 
                              : "bg-secondary/20 border-primary/5 hover:border-primary/20 text-foreground"
                          }`}
                        >
                          <div className="mt-0.5 shrink-0">
                            {item.isCompleted ? (
                              <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                            ) : (
                              <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/30 flex items-center justify-center text-[10px] font-bold text-muted-foreground">
                                •
                              </div>
                            )}
                          </div>
                          <div className="space-y-0.5">
                            <p className="text-xs font-bold leading-none">{item.label}</p>
                            <p className="text-[10px] text-muted-foreground font-medium">{item.description}</p>
                          </div>
                          <span className="text-[10px] font-bold ml-auto opacity-70">+{item.percentage}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Option 3: Sleek Banner Alert */}
            {!isProfileComplete && !isAlertDismissed && (
              <div className="relative bg-gradient-to-r from-yellow-500/15 via-orange-500/10 to-yellow-500/5 border border-yellow-500/25 p-4 rounded-3xl flex items-start gap-3 text-sm animate-in fade-in slide-in-from-top-2 duration-300 shadow-sm">
                <span className="text-lg mt-0.5">💡</span>
                <div className="space-y-1 pr-6">
                  <p className="font-bold text-yellow-800 dark:text-yellow-300">Boost your casting visibility!</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Verified profiles with audition videos, social handles, and visible contact details get highlighted first. 
                    Click <span className="font-bold cursor-pointer underline text-primary" onClick={() => setIsChecklistOpen(true)}>Show Checklist</span> above to finish your setup.
                  </p>
                </div>
                <button 
                  onClick={() => {
                    setIsAlertDismissed(true);
                    if (user?.uid) {
                      localStorage.setItem(`dismiss_profile_alert_${user.uid}`, 'true');
                    }
                  }}
                  className="absolute top-3 right-3 text-muted-foreground hover:text-foreground text-xs p-1"
                >
                  <XCircle className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-8">
            <TabsTrigger id="tab-trigger-account" value="account" className="flex items-center justify-center gap-1.5 relative">
              <UserIcon className="h-4 w-4" />
              <span className="hidden sm:inline">Profile Setting</span>
              <span className="sm:hidden">Profile</span>
              {tourStep === 0 && (
                <TourTooltip 
                  title="Profile Setting"
                  description="Register as an artist and manage your basic details, name, username, bio, and work category."
                  onNext={() => {
                    setActiveTab("portfolio");
                    setTourStep(1);
                  }}
                  onSkip={endTour}
                  step={0}
                />
              )}
            </TabsTrigger>
            <TabsTrigger id="tab-trigger-portfolio" value="portfolio" className="flex items-center justify-center gap-1.5 relative">
              <Briefcase className="h-4 w-4" />
              <span>Portfolio</span>
              {tourStep === 1 && (
                <TourTooltip 
                  title="Your Portfolio"
                  description="Add links to your best audition/work videos and course certificates to stand out to scouts."
                  onNext={() => {
                    setActiveTab("social");
                    setTourStep(2);
                  }}
                  onSkip={endTour}
                  step={1}
                />
              )}
            </TabsTrigger>
            <TabsTrigger id="tab-trigger-social" value="social" className="flex items-center justify-center gap-1.5 relative">
              <Share2 className="h-4 w-4" />
              <span>Social</span>
              {tourStep === 2 && (
                <TourTooltip 
                  title="Social Profiles"
                  description="Link your Instagram, YouTube, Facebook, and LinkedIn profiles for clients to research you."
                  onNext={() => {
                    setActiveTab("security");
                    setTourStep(3);
                  }}
                  onSkip={endTour}
                  step={2}
                />
              )}
            </TabsTrigger>
            <TabsTrigger id="tab-trigger-security" value="security" className="flex items-center justify-center gap-1.5 relative">
              <ShieldAlert className="h-4 w-4" />
              <span>Security</span>
              {tourStep === 3 && (
                <TourTooltip 
                  title="Visibility & Security"
                  description="Choose whether casting directors can directly view your mobile number and email."
                  onNext={endTour}
                  onSkip={endTour}
                  step={3}
                />
              )}
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="account" className="space-y-6">
            {renderArtistStatus()}
            <ArtistProfileDetails
              user={user}
              firestoreUser={firestoreUser}
              onSendVerificationOtp={handleSendVerificationOtp}
              isSendingOtp={isSendingOtp}
              isPhoneVerified={user?.providerData?.some(p => (p as any).providerId === 'phone') || firestoreUser?.mobileNumberVerified}
              onEditName={() => setIsNameDialogOpen(true)}
              onEditUsername={() => setIsUsernameDialogOpen(true)}
              allowUsernameEdit={appConfig?.allowUsernameEdit}
            />
          </TabsContent>

          <TabsContent value="portfolio" className="space-y-6">
            {/* Videos Section */}
            <Card className="border-primary/10 shadow-md">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-xl flex items-center gap-2">
                    <Video className="h-5 w-5 text-primary" /> Audition/Work Videos
                  </CardTitle>
                  <CardDescription>Add links to your best performances or work samples.</CardDescription>
                </div>
                <Button size="sm" onClick={() => setIsVideoDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-1" /> Add
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {videos.length === 0 ? (
                    <div className="text-center py-10 text-muted-foreground border-2 border-dashed rounded-2xl bg-secondary/5">
                      <Video className="h-10 w-10 mx-auto mb-2 opacity-20" />
                      <p>No videos added yet.</p>
                      <p className="text-xs">Showcase your talent with video links.</p>
                    </div>
                  ) : (
                    videos.map((video) => (
                      <div key={video.id} className="flex items-center justify-between p-4 bg-secondary/10 rounded-2xl border border-primary/5 group hover:bg-secondary/20 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-primary/10 rounded-xl text-primary">
                            <Video className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="font-bold text-sm">{video.name}</p>
                            <a href={video.url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-primary flex items-center gap-1 hover:underline font-bold uppercase tracking-wider">
                              <ExternalLink className="h-3 w-3" /> View Video
                            </a>
                          </div>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => handleRemoveVideo(video.id)} className="bg-destructive/10 text-destructive hover:bg-destructive hover:text-destructive-foreground transition-all rounded-full h-8 w-8">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Certificates Section */}
            <Card className="border-primary/10 shadow-md">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-xl flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" /> Course Certificates
                  </CardTitle>
                  <CardDescription>Showcase your qualifications and professional certifications.</CardDescription>
                </div>
                <Button size="sm" onClick={() => setIsCertDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-1" /> Add
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {certificates.length === 0 ? (
                    <div className="text-center py-10 text-muted-foreground border-2 border-dashed rounded-2xl bg-secondary/5">
                      <FileText className="h-10 w-10 mx-auto mb-2 opacity-20" />
                      <p>No certificates added yet.</p>
                      <p className="text-xs">Add your educational and professional milestones.</p>
                    </div>
                  ) : (
                    certificates.map((cert) => (
                      <div key={cert.id} className="flex items-center justify-between p-4 bg-secondary/10 rounded-2xl border border-primary/5 group hover:bg-secondary/20 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-primary/10 rounded-xl text-primary">
                            <FileText className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="font-bold text-sm">{cert.name}</p>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-[9px] uppercase font-black px-2 py-0 h-4 border-primary/20">{cert.type}</Badge>
                              <a href={cert.url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-primary flex items-center gap-1 hover:underline font-bold uppercase tracking-wider">
                                <ExternalLink className="h-3 w-3" /> View Certificate
                              </a>
                            </div>
                          </div>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => handleRemoveCert(cert.id)} className="bg-destructive/10 text-destructive hover:bg-destructive hover:text-destructive-foreground transition-all rounded-full h-8 w-8">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="social" className="space-y-6">
            <Card className="border-primary/10 shadow-md">
              <CardHeader>
                <CardTitle className="text-xl flex items-center gap-2">
                  <Globe className="h-5 w-5 text-primary" /> Social Media Links
                </CardTitle>
                <CardDescription>Add links to your social media profiles to help clients find you.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between p-4 bg-secondary/10 rounded-2xl border border-primary/5">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-bold">Show Social Media on Public Profile</Label>
                    <p className="text-[10px] text-muted-foreground italic">If enabled, your social media links will be visible on your public profile.</p>
                  </div>
                  <Switch 
                    checked={showSocialMedia} 
                    onCheckedChange={setShowSocialMedia}
                  />
                </div>

                <div className="grid gap-4">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2"><Facebook className="h-4 w-4 text-blue-600" /> Facebook</Label>
                    <Input 
                      placeholder="https://facebook.com/yourprofile" 
                      value={socialMedia.facebook} 
                      onChange={(e) => setSocialMedia({...socialMedia, facebook: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2"><Instagram className="h-4 w-4 text-pink-600" /> Instagram</Label>
                    <Input 
                      placeholder="https://instagram.com/yourprofile" 
                      value={socialMedia.instagram} 
                      onChange={(e) => setSocialMedia({...socialMedia, instagram: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2"><Twitter className="h-4 w-4 text-sky-500" /> Twitter (X)</Label>
                    <Input 
                      placeholder="https://twitter.com/yourprofile" 
                      value={socialMedia.twitter} 
                      onChange={(e) => setSocialMedia({...socialMedia, twitter: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2"><Linkedin className="h-4 w-4 text-blue-700" /> LinkedIn</Label>
                    <Input 
                      placeholder="https://linkedin.com/in/yourprofile" 
                      value={socialMedia.linkedin} 
                      onChange={(e) => setSocialMedia({...socialMedia, linkedin: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2"><Youtube className="h-4 w-4 text-red-600" /> YouTube</Label>
                    <Input 
                      placeholder="https://youtube.com/c/yourchannel" 
                      value={socialMedia.youtube} 
                      onChange={(e) => setSocialMedia({...socialMedia, youtube: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2"><Globe className="h-4 w-4 text-primary" /> Personal Website</Label>
                    <Input 
                      placeholder="https://yourwebsite.com" 
                      value={socialMedia.website} 
                      onChange={(e) => setSocialMedia({...socialMedia, website: e.target.value})}
                    />
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button className="w-full" onClick={handleSaveSocial} disabled={isSavingSocial}>
                  {isSavingSocial && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Social Media Links
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>

          <TabsContent value="security" className="space-y-6">
            <Card className="border-primary/10 shadow-md">
              <CardHeader>
                <CardTitle className="text-xl flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-primary" />
                  Profile Visibility
                </CardTitle>
                <CardDescription>Control what information is visible on your public profile.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-secondary/10 rounded-2xl border border-primary/5">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-bold">Show Mobile Number</Label>
                    <p className="text-[10px] text-muted-foreground italic">If enabled, your mobile number will be visible to everyone.</p>
                  </div>
                  <Switch 
                    checked={!!firestoreUser?.showMobileOnPublicProfile} 
                    onCheckedChange={async (checked) => {
                      if (!user) return;
                      try {
                        await updateDoc(doc(db, "users", user.uid), { showMobileOnPublicProfile: checked });
                        toast({ title: checked ? "Mobile Visibility Enabled" : "Mobile Visibility Disabled" });
                      } catch (error: any) {
                        toast({ title: "Update Failed", description: error.message, variant: "destructive" });
                      }
                    }}
                  />
                </div>
                
                <div className="flex items-center justify-between p-4 bg-secondary/10 rounded-2xl border border-primary/5">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-bold">Show Email Address</Label>
                    <p className="text-[10px] text-muted-foreground italic">If enabled, your email address will be visible to everyone.</p>
                  </div>
                  <Switch 
                    checked={!!firestoreUser?.showEmailOnPublicProfile} 
                    onCheckedChange={async (checked) => {
                      if (!user) return;
                      try {
                        await updateDoc(doc(db, "users", user.uid), { showEmailOnPublicProfile: checked });
                        toast({ title: checked ? "Email Visibility Enabled" : "Email Visibility Disabled" });
                      } catch (error: any) {
                        toast({ title: "Update Failed", description: error.message, variant: "destructive" });
                      }
                    }}
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="border-primary/10 shadow-md">
              <CardHeader>
                <CardTitle className="text-xl">Account Security</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                  <Button variant="outline" onClick={handleChangePassword} disabled={isSendingResetEmail}>
                    {isSendingResetEmail ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <KeyRound className="mr-2 h-4 w-4" />}
                    Change Password
                  </Button>

                  {!deletionRequest && (
                    <Button 
                      variant="destructive" 
                      className="sm:ml-auto" 
                      onClick={() => {
                        setDeletionReason("");
                        setIsDeleteDialogOpen(true);
                      }}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete Account
                    </Button>
                  )}
                </div>

                {deletionRequest && (
                  <div className="p-5 rounded-2xl bg-destructive/10 border border-destructive/20 text-foreground flex flex-col sm:flex-row items-start sm:items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-destructive/20 flex items-center justify-center text-destructive shrink-0">
                      <Trash2 className="h-5 w-5" />
                    </div>
                    <div className="space-y-1 flex-1 text-left">
                      <h4 className="font-bold text-sm text-destructive leading-normal">Account Deletion Requested</h4>
                      <p className="text-xs text-muted-foreground leading-normal">
                        Your account is scheduled for deletion. It will be deleted permanently in 3 working days.
                      </p>
                      {deletionRequest.reason && (
                        <p className="text-[11px] text-muted-foreground italic leading-normal pt-1">
                          Reason: "{deletionRequest.reason}"
                        </p>
                      )}
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={handleCancelDeletionRequest} 
                      disabled={isCancelingDeletion}
                      className="rounded-xl border-primary/10 hover:bg-primary/5 text-xs font-bold shrink-0 self-end sm:self-center bg-background"
                    >
                      {isCancelingDeletion && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
                      Cancel Request
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Onboarding Welcome Checklist Modal (Option 1) */}
        <Dialog open={showWelcomeModal} onOpenChange={setShowWelcomeModal}>
          <DialogContent className="w-[calc(100vw-2rem)] sm:w-full sm:max-w-[480px] max-h-[calc(100vh-4rem)] p-0 overflow-hidden border-none rounded-3xl shadow-2xl flex flex-col">
            <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-6 pb-4 border-b border-primary/5 shrink-0">
              <DialogHeader>
                <div className="flex items-center gap-2 text-primary mb-2">
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] bg-primary/10 px-2 py-0.5 rounded-md">Welcome</span>
                  <span className="text-xs font-bold text-muted-foreground">• Artist Onboarding</span>
                </div>
                <DialogTitle className="text-2xl font-black tracking-tight text-foreground">
                  Welcome, {firestoreUser?.displayName || "Talent"}! 🎉
                </DialogTitle>
                <DialogDescription className="text-muted-foreground text-sm pt-1">
                  Your artist profile is set up. Let's make sure casting directors can find and contact you!
                </DialogDescription>
              </DialogHeader>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Your Setup Checklist:</p>
              <div className="space-y-2.5">
                {checklistItems.map((item, idx) => (
                  <div key={item.id} className="flex items-center gap-3 p-3 rounded-2xl bg-secondary/20 border border-primary/5">
                    <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-black text-primary">
                      {idx + 1}
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-xs font-bold">{item.label}</p>
                      <p className="text-[10px] text-muted-foreground">{item.description}</p>
                    </div>
                    <div className="ml-auto text-[10px] font-bold text-primary/80">
                      +{item.percentage}%
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <DialogFooter className="p-6 bg-secondary/10 border-t border-primary/5 flex flex-col sm:flex-row gap-2 shrink-0">
              <Button variant="outline" className="w-full sm:w-auto rounded-xl font-bold border-primary/10 text-muted-foreground" onClick={skipWelcomeModal}>
                Skip Setup
              </Button>
              <Button className="w-full sm:w-auto rounded-xl font-bold bg-primary text-white hover:bg-primary/90 flex-1" onClick={startTour}>
                Start Setup Tour 🚀
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Dialog open={isNameDialogOpen} onOpenChange={setIsNameDialogOpen}>
        <DialogContent className="sm:max-w-[425px]"><DialogHeader><DialogTitle>Update Your Name</DialogTitle><DialogDescription>Enter your new display name.</DialogDescription></DialogHeader>
          <Form {...nameForm}><form onSubmit={nameForm.handleSubmit(handleUpdateName)} className="space-y-4 py-2">
            <FormField control={nameForm.control} name="displayName" render={({ field }) => (<FormItem><FormLabel htmlFor="displayName">Full Name</FormLabel><FormControl><Input id="displayName" {...field} disabled={isSubmittingName} /></FormControl><FormMessage /></FormItem>)}/>
            <DialogFooter><DialogClose asChild><Button type="button" variant="outline" disabled={isSubmittingName}>Cancel</Button></DialogClose><Button type="submit" disabled={isSubmittingName}>{isSubmittingName && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save Changes</Button></DialogFooter>
          </form></Form>
        </DialogContent>
      </Dialog>
      {appConfig?.allowUsernameEdit && (
        <Dialog open={isUsernameDialogOpen} onOpenChange={setIsUsernameDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Update Username</DialogTitle>
              <DialogDescription>Choose a unique username for your profile.</DialogDescription>
            </DialogHeader>
            <Form {...usernameForm}>
              <form onSubmit={usernameForm.handleSubmit(handleUpdateUsername)} className="space-y-4 py-2">
                <FormField 
                  control={usernameForm.control} 
                  name="username" 
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel htmlFor="username"><AtSign className="inline mr-2 h-4 w-4" />Username</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input 
                            id="username" 
                            placeholder="johndoe123" 
                            {...field} 
                            disabled={isSubmittingUsername}
                          />
                          <div className="absolute right-3 top-1/2 -translate-y-1/2">
                            {usernameStatus === 'checking' && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                            {usernameStatus === 'available' && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                            {usernameStatus === 'taken' && <XCircle className="h-4 w-4 text-destructive" />}
                          </div>
                        </div>
                      </FormControl>
                      {usernameStatus === 'taken' && suggestions.length > 0 && (
                        <div className="mt-2 space-y-1">
                          <p className="text-xs text-muted-foreground">Username taken. Suggestions:</p>
                          <div className="flex flex-wrap gap-2">
                            {suggestions.map((sug) => (
                              <Badge 
                                key={sug} 
                                variant="outline" 
                                className="cursor-pointer hover:bg-primary hover:text-primary-foreground"
                                onClick={() => {
                                  usernameForm.setValue("username", sug, { shouldValidate: true });
                                  setUsernameStatus('available');
                                }}
                              >
                                {sug}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <DialogClose asChild><Button type="button" variant="outline" disabled={isSubmittingUsername}>Cancel</Button></DialogClose>
                  <Button type="submit" disabled={isSubmittingUsername || usernameStatus !== 'available'}>
                    {isSubmittingUsername && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save Changes
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      )}

      <Dialog open={isEmailDialogOpen} onOpenChange={setIsEmailDialogOpen}>
        <DialogContent className="sm:max-w-[425px]"><DialogHeader><DialogTitle>Update Email</DialogTitle><DialogDescription>Enter your new email address. You will need to verify it.</DialogDescription></DialogHeader>
          <Form {...emailForm}><form onSubmit={emailForm.handleSubmit(handleUpdateEmail)} className="space-y-4 py-2">
            <FormField control={emailForm.control} name="email" render={({ field }) => (<FormItem><FormLabel htmlFor="email">Email</FormLabel><FormControl><Input type="email" id="email" {...field} disabled={isSubmittingEmail} /></FormControl><FormMessage /></FormItem>)}/>
            <DialogFooter><DialogClose asChild><Button type="button" variant="outline" disabled={isSubmittingEmail}>Cancel</Button></DialogClose><Button type="submit" disabled={isSubmittingEmail}>{isSubmittingEmail && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Update Email</Button></DialogFooter>
          </form></Form>
        </DialogContent>
      </Dialog>
      <Dialog open={isMobileDialogOpen} onOpenChange={setIsMobileDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Update Mobile Number</DialogTitle>
            <DialogDescription>Enter your 10-digit mobile number.</DialogDescription>
          </DialogHeader>
          <Form {...mobileForm}>
            <form onSubmit={mobileForm.handleSubmit(handleUpdateMobileNumber)} className="space-y-4 py-2">
              <FormField control={mobileForm.control} name="mobileNumber" render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="mobileNumber">Mobile Number</FormLabel>
                  <div className="flex items-center">
                    <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-input bg-muted text-muted-foreground h-10">
                      {appConfig?.defaultOtpCountryCode || '+91'}
                    </span>
                    <FormControl>
                      <Input
                        type="tel"
                        id="mobileNumber"
                        placeholder="9876543210"
                        {...field}
                        className="rounded-l-none"
                        disabled={isSubmittingMobile}
                      />
                    </FormControl>
                  </div>
                  <FormMessage />
                </FormItem>
              )} />
              <DialogFooter>
                <DialogClose asChild><Button type="button" variant="outline" disabled={isSubmittingMobile}>Cancel</Button></DialogClose>
                <Button type="submit" disabled={isSubmittingMobile}>
                  {isSubmittingMobile && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Changes
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      <Dialog open={isOtpDialogOpen} onOpenChange={setIsOtpDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Verify Mobile Number</DialogTitle>
            <DialogDescription>Enter the 6-digit OTP sent to {firestoreUser?.mobileNumber || user.phoneNumber}.</DialogDescription>
          </DialogHeader>
          <Form {...otpForm}>
            <form onSubmit={otpForm.handleSubmit(handleVerifyOtp)} className="space-y-4 py-2">
                <FormField
                  control={otpForm.control}
                  name="otp"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="sr-only">OTP</FormLabel>
                      <FormControl>
                        <div className="flex justify-center">
                            <InputOTP maxLength={6} {...field}>
                                <InputOTPGroup>
                                    <InputOTPSlot index={0} />
                                    <InputOTPSlot index={1} />
                                    <InputOTPSlot index={2} />
                                </InputOTPGroup>
                                <InputOTPGroup>
                                    <InputOTPSlot index={3} />
                                    <InputOTPSlot index={4} />
                                    <InputOTPSlot index={5} />
                                </InputOTPGroup>
                            </InputOTP>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsOtpDialogOpen(false)} disabled={isVerifyingOtp}>Cancel</Button>
                <Button type="submit" disabled={isVerifyingOtp}>
                  {isVerifyingOtp && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Verify OTP
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Video Dialog */}
      <Dialog open={isVideoDialogOpen} onOpenChange={setIsVideoDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Video className="h-5 w-5 text-primary" /> Add Work Video</DialogTitle>
            <DialogDescription>Enter the name and URL of your audition or work video.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Video Name</Label>
              <Input placeholder="e.g., My Audition 2024" value={newVideo.name} onChange={(e) => setNewVideo({...newVideo, name: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Video URL</Label>
              <Input placeholder="https://youtube.com/watch?v=..." value={newVideo.url} onChange={(e) => setNewVideo({...newVideo, url: e.target.value})} />
              <p className="text-[10px] text-muted-foreground">Support YouTube, Vimeo, or any direct video link.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsVideoDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleAddVideo} disabled={isSavingPortfolio}>
               {isSavingPortfolio && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save & Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Certificate Dialog */}
      <Dialog open={isCertDialogOpen} onOpenChange={setIsCertDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><FileText className="h-5 w-5 text-primary" /> Add Certificate</DialogTitle>
            <DialogDescription>Add a certificate from a course or professional training.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Course Name</Label>
              <Input placeholder="e.g., Professional Acting Course" value={newCert.name} onChange={(e) => setNewCert({...newCert, name: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Tabs value={newCert.type} onValueChange={(v) => setNewCert({...newCert, type: v as any})} className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="link"><Globe className="h-4 w-4 mr-1"/> Link</TabsTrigger>
                  <TabsTrigger value="image"><Upload className="h-4 w-4 mr-1"/> Image</TabsTrigger>
                  <TabsTrigger value="pdf"><FileText className="h-4 w-4 mr-1"/> PDF</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
            {newCert.type === 'link' ? (
              <div className="space-y-2">
                <Label>Certificate URL</Label>
                <Input placeholder="https://..." value={newCert.url} onChange={(e) => setNewCert({...newCert, url: e.target.value})} />
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Upload {newCert.type.toUpperCase()}</Label>
                <div className="flex items-center justify-center w-full">
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-2xl cursor-pointer bg-secondary/5 hover:bg-secondary/10 border-primary/20 transition-all group">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <Upload className="w-8 h-8 mb-3 text-primary group-hover:scale-110 transition-transform" />
                      <p className="mb-2 text-sm text-muted-foreground">
                        <span className="font-semibold">Click to upload</span>
                      </p>
                      <p className="text-[10px] text-muted-foreground px-4 text-center">{newCert.file ? newCert.file.name : `Supports ${newCert.type.toUpperCase()} files up to 10MB`}</p>
                    </div>
                    <input 
                        type="file" 
                        className="hidden" 
                        accept={newCert.type === 'pdf' ? '.pdf' : 'image/*'} 
                        onChange={(e) => {
                            if (e.target.files?.[0]) {
                                setNewCert({...newCert, file: e.target.files[0]});
                            }
                        }}
                    />
                  </label>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCertDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleAddCert} disabled={isSavingPortfolio || isUploading}>
               {(isSavingPortfolio || isUploading) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save & Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Account Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="w-[calc(100vw-2rem)] sm:w-full sm:max-w-[480px] p-6 rounded-3xl shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-destructive flex items-center gap-2">
              <Trash2 className="h-5 w-5" />
              Delete Account Request
            </DialogTitle>
            <DialogDescription className="text-muted-foreground text-sm pt-2">
              Please enter the reason for deleting your profile. Once submitted, your deletion request will be processed by administrators, and your account will be permanently deleted in <strong>3 working days</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <label htmlFor="deletion-reason" className="text-xs font-black text-foreground uppercase tracking-wider block mb-2">Reason for leaving</label>
            <textarea
              id="deletion-reason"
              className="w-full min-h-[100px] p-4 rounded-2xl bg-secondary/30 border border-primary/10 focus:border-primary/30 outline-none text-sm leading-relaxed text-foreground resize-none"
              placeholder="Please tell us why you wish to delete your account..."
              value={deletionReason}
              onChange={(e) => setDeletionReason(e.target.value)}
            />
          </div>

          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button variant="outline" className="w-full sm:w-auto rounded-xl font-bold border-primary/10 text-muted-foreground" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive"
              className="w-full sm:w-auto rounded-xl font-bold flex-1" 
              onClick={handleDeleteRequestSubmit}
              disabled={isSubmittingDeletionRequest || !deletionReason.trim()}
            >
              {isSubmittingDeletionRequest && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Submit Delete Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Deletion Request Success Confirmation Dialog */}
      <Dialog open={isSuccessDialogOpen} onOpenChange={setIsSuccessDialogOpen}>
        <DialogContent className="w-[calc(100vw-2rem)] sm:w-full sm:max-w-[440px] p-6 rounded-3xl shadow-2xl text-center flex flex-col items-center gap-4">
          <div className="h-12 w-12 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <div className="space-y-2">
            <DialogHeader>
              <DialogTitle className="text-xl font-black text-center text-foreground">
                Request Pending
              </DialogTitle>
              <DialogDescription className="text-muted-foreground text-sm text-center pt-1">
                Your deletion request has been submitted. Your account will be deleted permanently in <strong>3 working days</strong>.
              </DialogDescription>
            </DialogHeader>
          </div>
          <Button className="w-full rounded-xl font-bold bg-primary text-white hover:bg-primary/90 mt-2" onClick={() => setIsSuccessDialogOpen(false)}>
            Understood
          </Button>
        </DialogContent>
      </Dialog>
    </ProtectedRoute>
  );
}

