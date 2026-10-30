"use client";

import React, { useState, useEffect } from 'react';
import type { ArtistApplication, FirestoreUser, ArtistCertificate, FirestoreCategory } from '@/types/firestore';
import { getOverriddenCategoryName } from '@/lib/adminDataOverrides';
import AppImage from '@/components/ui/AppImage';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { 
  CheckCircle, MapPin, Calendar, Star, MessageSquare, Ban,
  Share2, ArrowLeft, Instagram, Twitter, Facebook, Mail, Phone, PhoneCall,
  User, Briefcase, Ruler, Weight, UserCircle2, Clock, X, ZoomIn, Video, FileText, ExternalLink, Globe, Linkedin, Youtube, Sparkles
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { collection, addDoc, Timestamp, query, where, limit, onSnapshot, doc, getDoc, getDocs, orderBy } from 'firebase/firestore';
import SubscriptionPlansDialog from '@/components/category/SubscriptionPlansDialog';
import ImageLightboxModal from '@/components/shared/ImageLightboxModal';
import CertificateLightboxModal from '@/components/shared/CertificateLightboxModal';
import { checkContactRevealStatus, unlockArtistContact } from '@/lib/hireSubscriptionUtils';
import HireSubscriptionModal from '@/components/shared/HireSubscriptionModal';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from '@/lib/utils';
import { useFeaturesConfig } from '@/hooks/useFeaturesConfig';
import { AnimatePresence, motion } from 'framer-motion';

import { useApplicationConfig } from '@/hooks/useApplicationConfig';
import { sendConnectionRequestEmail } from '@/ai/flows/sendConnectionRequestEmailFlow';

interface PublicProfileClientProps {
  artist: ArtistApplication;
  relatedArtists?: ArtistApplication[];
  categorySlug?: string;
  allCategories?: FirestoreCategory[];
}

export default function PublicProfileClient({ artist, relatedArtists = [], categorySlug, allCategories = [] }: PublicProfileClientProps) {
  const router = useRouter();
  const { user, firestoreUser, triggerAuthRedirect } = useAuth();
  const { config: appAppSettings } = useApplicationConfig();
  const { toast } = useToast();
  const { featuresConfig: appConfig } = useFeaturesConfig();
  const [isRequesting, setIsRequesting] = useState(false);
  const [showSubscriptionPlans, setShowSubscriptionPlans] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'pending' | 'accepted' | 'rejected' | null>(null);
  const [isBlocked, setIsBlocked] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  const [selectedCertificate, setSelectedCertificate] = useState<ArtistCertificate | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [artistUserData, setArtistUserData] = useState<any>(null);
  const [categoriesList, setCategoriesList] = useState<FirestoreCategory[]>(allCategories);

  useEffect(() => {
    if (allCategories && allCategories.length > 0) {
      setCategoriesList(allCategories);
      return;
    }
    const fetchCategories = async () => {
      try {
        const q = query(
          collection(db, 'adminCategories'),
          where('isActive', '==', true),
          orderBy('order', 'asc')
        );
        const snapshot = await getDocs(q);
        const fetched = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FirestoreCategory));
        if (fetched.length > 0) {
          setCategoriesList(fetched);
        }
      } catch (err) {
        console.error("Error fetching categories in PublicProfileClient:", err);
      }
    };
    fetchCategories();
  }, [allCategories]);

  const [isHireModalOpen, setIsHireModalOpen] = useState(false);
  const [hireModalReason, setHireModalReason] = useState<'no_subscription' | 'limit_reached'>('no_subscription');
  const [confirmUnlockOpen, setConfirmUnlockOpen] = useState(false);
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [revealInfo, setRevealInfo] = useState<{ remaining: number; limit: number; used: number } | null>(null);

  const phoneNumber = artist.mobileNumber || '';
  const isUnlocked = firestoreUser?.unlockedArtistIds?.includes(artist.userId);

  const handleCallClick = () => {
    if (!user) {
      triggerAuthRedirect(window.location.pathname);
      return;
    }

    const check = checkContactRevealStatus(firestoreUser, artist.userId);

    if (check.status === 'already_unlocked') {
      if (phoneNumber) {
        window.location.href = `tel:${phoneNumber}`;
      } else {
        toast({ title: "Contact Number", description: "Mobile number is not listed by artist.", variant: "destructive" });
      }
      return;
    }

    if (check.status === 'can_unlock') {
      setRevealInfo({ remaining: check.remaining, limit: check.limit, used: check.used });
      setConfirmUnlockOpen(true);
      return;
    }

    if (check.status === 'limit_reached') {
      setHireModalReason('limit_reached');
      setRevealInfo({ remaining: 0, limit: check.limit, used: check.used });
      setIsHireModalOpen(true);
      return;
    }

    if (check.status === 'no_subscription') {
      setHireModalReason('no_subscription');
      setIsHireModalOpen(true);
      return;
    }
  };

  const handleConfirmUnlock = async () => {
    if (!user) return;
    setIsUnlocking(true);
    try {
      const success = await unlockArtistContact(user.uid, artist.userId);
      if (success) {
        setConfirmUnlockOpen(false);
        toast({ title: "Contact Unlocked!", description: `1 reveal credit used. Dialing ${artist.fullName}...` });
        if (phoneNumber) {
          window.location.href = `tel:${phoneNumber}`;
        }
      } else {
        toast({ title: "Error", description: "Failed to unlock contact.", variant: "destructive" });
      }
    } catch (err) {
      console.error("Unlock error:", err);
    } finally {
      setIsUnlocking(false);
    }
  };

  useEffect(() => {
    setIsMounted(true);
    // Fetch the user document for the artist to get visibility settings
    const fetchArtistUser = async () => {
      try {
        const userDoc = await getDoc(doc(db, "users", artist.userId));
        if (userDoc.exists()) {
          setArtistUserData(userDoc.data());
        }
      } catch (error) {
        console.error("Error fetching artist user data:", error);
      }
    };
    fetchArtistUser();
  }, [artist.userId]);

  const isSelf = isMounted && user?.uid === artist.userId;



  useEffect(() => {
    if (!user || isSelf || !isMounted) return;

    const q = query(
      collection(db, "connectionRequests"),
      where("senderId", "==", user.uid),
      where("receiverId", "==", artist.userId),
      limit(1)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        setConnectionStatus(snapshot.docs[0].data().status);
      } else {
        setConnectionStatus(null);
      }
    });

    return () => unsubscribe();
  }, [user, artist.userId, isSelf, isMounted]);

  useEffect(() => {
    if (!user || isSelf || !isMounted) {
      setIsBlocked(false);
      return;
    }

    const chatSessionId = [user.uid, artist.userId].sort().join('_');
    const docRef = doc(db, 'chats', chatSessionId);

    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setIsBlocked(data.blockedBy && data.blockedBy.length > 0);
      } else {
        setIsBlocked(false);
      }
    }, (error) => {
      console.warn("PublicProfileClient: Error listening to session:", error);
    });

    return () => unsubscribe();
  }, [user, artist.userId, isSelf, isMounted]);

  const portfolioImages = [
    { url: artist.profilePhotoUrl, label: "Main Profile Photo" },
    { url: artist.faceCloseUpUrl, label: "Close Up" },
    { url: artist.midShotUrl, label: "Mid Shot" },
    { url: artist.leftProfileUrl, label: "Left Profile" },
    { url: artist.rightProfileUrl, label: "Right Profile" },
    { url: artist.frontProfileUrl, label: "Front Profile" },
    { url: artist.backProfileUrl, label: "Back Profile" },
    ...(artist.additionalImages || artist.galleryImages || []).map((url, i) => ({
      url,
      label: `Additional Photo #${i + 1}`
    }))
  ].filter((img): img is { url: string; label: string } => !!img.url);

  const handleRequest = async () => {
    if (connectionStatus === 'accepted') {
      router.push(`/chat?with=${artist.userId}`);
      return;
    }

    if (connectionStatus === 'pending') {
      toast({ title: "Request Pending", description: "You have already sent a request." });
      return;
    }

    if (!user) {
      triggerAuthRedirect(window.location.pathname);
      return;
    }

    if (appConfig?.isSubscriptionRequired && !firestoreUser?.subscriptionActive) {
      setShowSubscriptionPlans(true);
      return;
    }

    setIsRequesting(true);
    try {
      const requestData: any = {
        senderId: user.uid,
        senderName: firestoreUser?.displayName || "User",
        receiverId: artist.userId,
        receiverName: artist.fullName,
        status: 'pending',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };
      if (user.email) requestData.senderEmail = user.email;
      if (artist.email) requestData.receiverEmail = artist.email;

      await addDoc(collection(db, "connectionRequests"), requestData);

      // Send in-app notification to the receiver (Artist)
      await addDoc(collection(db, "userNotifications"), {
        userId: artist.userId,
        title: "New Connection Request",
        message: `${firestoreUser?.displayName || 'A user'} wants to connect with you.`,
        type: 'info',
        read: false,
        href: '/connections',
        createdAt: Timestamp.now()
      });

      // Trigger Email Flow
      if (appAppSettings?.smtpHost && artist.email) {
          const recipientEmail = artist.email;
          const triggerEmail = async () => {
              let senderAge: number | undefined = undefined;
              let senderCategory: string | undefined = undefined;
              try {
                  const senderAppSnap = await getDoc(doc(db, "ArtistApplications", user.uid));
                  if (senderAppSnap.exists()) {
                      const appData = senderAppSnap.data();
                      senderAge = appData.age;
                      senderCategory = appData.workCategoryName;
                  }
              } catch (err) {
                  console.error("Error fetching sender artist details:", err);
              }

              await sendConnectionRequestEmail({
                  artistName: artist.fullName || "Artist",
                  artistEmail: recipientEmail,
                  senderName: firestoreUser?.displayName || "A user",
                  senderAge,
                  senderCategory,
                  smtpHost: appAppSettings.smtpHost,
                  smtpPort: appAppSettings.smtpPort,
                  smtpUser: appAppSettings.smtpUser,
                  smtpPass: appAppSettings.smtpPass,
                  senderEmail: appAppSettings.senderEmail,
              });
          };

          triggerEmail().catch(err => console.error("Failed to send connection request email:", err));
      }

      toast({ 
        title: "Request Sent!", 
        description: `Your request has been sent to ${artist.fullName}.`,
      });
    } catch (error) {
      console.error("Error sending request:", error);
      toast({ title: "Request Failed", description: "Could not send request.", variant: "destructive" });
    } finally {
      setIsRequesting(false);
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: `${artist.fullName} - ${artist.workCategoryName} on Newtalent`,
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast({ title: "Link Copied", description: "Profile link copied to clipboard." });
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header / Nav - Hidden on mobile, non-sticky and pushed down on desktop */}
      <div className="hidden md:block relative z-30 bg-background/80 backdrop-blur-md border-b mt-4">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => router.back()} 
            className="rounded-xl bg-muted/50 border-muted-foreground/10 hover:bg-primary hover:text-primary-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" /> Back
          </Button>
        </div>
      </div>

      {/* Floating Share Button - Positioned right side middle */}
      <div className="fixed right-4 top-1/2 -translate-y-1/2 z-50">
        <Button 
          variant="outline" 
          size="icon" 
          onClick={handleShare} 
          className="h-12 w-12 rounded-full bg-background/90 backdrop-blur-md shadow-2xl border-primary/20 hover:bg-primary hover:text-primary-foreground transition-all duration-300 group"
          title="Share Profile"
        >
          <Share2 className="w-5 h-5 group-hover:scale-110 transition-transform" />
        </Button>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column: Profile Info */}
          <div className="lg:col-span-1">
            <div className="bg-card border rounded-3xl overflow-hidden shadow-sm sticky top-24">
              <div 
                className="relative aspect-square cursor-zoom-in group"
                onClick={() => setSelectedImageIndex(0)}
              >
                <AppImage 
                  src={artist.profilePhotoUrl || "/default-image.png"} 
                  alt={artist.fullName || "Artist"} 
                  fill 
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                   <ZoomIn className="text-white opacity-0 group-hover:opacity-100 transition-opacity w-10 h-10 drop-shadow-lg" />
                </div>
                {((artist as any).subscriptionActive || (artist as any).isSubscribed) && (
                  <div className="absolute top-4 left-4 z-10">
                    <Badge className="bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 text-slate-950 font-black border-none px-3 py-1 rounded-full shadow-md flex items-center">
                      <Sparkles className="w-3.5 h-3.5 mr-1.5 fill-slate-950 text-slate-950" /> PREMIUM
                    </Badge>
                  </div>
                )}
                {artist.status === 'approved' && (
                  <div className="absolute top-4 right-4">
                    <Badge className="bg-green-500 hover:bg-green-600 text-white border-none px-3 py-1 rounded-full">
                      <CheckCircle className="w-3 h-3 mr-1" /> Verified
                    </Badge>
                  </div>
                )}
              </div>
              
              <div className="p-2">
                <div className="mb-4">
                  <h1 className="text-2xl font-black mb-1">{artist.fullName}</h1>
                  <p className="text-primary font-bold">{artist.workCategoryName}</p>
                </div>

                <div className="space-y-3 mb-6 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-primary" />
                    <span>{artist.area}, {artist.city}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-primary" />
                    <span>{artist.experienceLevelLabel} Experience</span>
                  </div>
                  {artist.age && (
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-primary" />
                      <span>{artist.age} Years Old</span>
                    </div>
                  )}

                  {artistUserData?.showSocialMediaOnPublicProfile && artistUserData?.socialMediaLinks && (
                    <div className="flex flex-wrap gap-3 pt-2">
                      {artistUserData.socialMediaLinks.facebook && (
                        <a href={artistUserData.socialMediaLinks.facebook} target="_blank" rel="noopener noreferrer" className="p-2 rounded-full bg-secondary/50 text-blue-600 hover:bg-blue-600 hover:text-white transition-all" title="Facebook">
                          <Facebook className="w-4 h-4" />
                        </a>
                      )}
                      {artistUserData.socialMediaLinks.instagram && (
                        <a href={artistUserData.socialMediaLinks.instagram} target="_blank" rel="noopener noreferrer" className="p-2 rounded-full bg-secondary/50 text-pink-600 hover:bg-pink-600 hover:text-white transition-all" title="Instagram">
                          <Instagram className="w-4 h-4" />
                        </a>
                      )}
                      {artistUserData.socialMediaLinks.twitter && (
                        <a href={artistUserData.socialMediaLinks.twitter} target="_blank" rel="noopener noreferrer" className="p-2 rounded-full bg-secondary/50 text-sky-500 hover:bg-sky-500 hover:text-white transition-all" title="Twitter">
                          <Twitter className="w-4 h-4" />
                        </a>
                      )}
                      {artistUserData.socialMediaLinks.linkedin && (
                        <a href={artistUserData.socialMediaLinks.linkedin} target="_blank" rel="noopener noreferrer" className="p-2 rounded-full bg-secondary/50 text-blue-700 hover:bg-blue-700 hover:text-white transition-all" title="LinkedIn">
                          <Linkedin className="w-4 h-4" />
                        </a>
                      )}
                      {artistUserData.socialMediaLinks.youtube && (
                        <a href={artistUserData.socialMediaLinks.youtube} target="_blank" rel="noopener noreferrer" className="p-2 rounded-full bg-secondary/50 text-red-600 hover:bg-red-600 hover:text-white transition-all" title="YouTube">
                          <Youtube className="w-4 h-4" />
                        </a>
                      )}
                      {artistUserData.socialMediaLinks.website && (
                        <a href={artistUserData.socialMediaLinks.website} target="_blank" rel="noopener noreferrer" className="p-2 rounded-full bg-secondary/50 text-primary hover:bg-primary hover:text-white transition-all" title="Website">
                          <Globe className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4 mb-8 p-4 bg-muted/30 rounded-2xl border">
                  <div className="text-center">
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold mb-1">Height</p>
                    <p className="font-bold">{artist.height || "N/A"}</p>
                  </div>
                  <div className="text-center border-l">
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold mb-1">Weight</p>
                    <p className="font-bold">{artist.weight || "N/A"}</p>
                  </div>
                </div>

                {isMounted && (
                  <>
                    {!isSelf && (
                      <Button 
                        variant="default"
                        className={cn(
                          "w-full h-12 rounded-2xl text-base font-black transition-all bg-emerald-600 text-white hover:bg-emerald-700 shadow-lg shadow-emerald-600/20",
                          isUnlocked && "bg-emerald-600 text-white font-black hover:bg-emerald-700"
                        )}
                        onClick={handleCallClick}
                      >
                        <PhoneCall className="w-5 h-5 mr-2 shrink-0" />
                        {isUnlocked ? (phoneNumber || "Call Now") : "Call / Reveal Mobile Number"}
                      </Button>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Bio & Portfolio */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Bio Section */}
            <section className="bg-card border rounded-3xl p-2 md:p-8 shadow-sm">
              <h2 className="text-xl font-black mb-4 flex items-center gap-2">
                <UserCircle2 className="w-5 h-5 text-primary" /> About Me
              </h2>
              <div className="prose prose-sm max-w-none text-muted-foreground italic leading-relaxed">
                {artist.bio ? `"${artist.bio}"` : "No bio provided."}
              </div>
              
              <div className="mt-8 grid grid-cols-1 md:bit-cols-2 gap-6 pt-6 border-t">
                 <div className="space-y-4">
                    <div>
                       <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">Languages</h4>
                       <div className="flex flex-wrap gap-2">
                          {artist.languagesSpokenLabels?.map(lang => (
                            <Badge key={lang} variant="secondary" className="rounded-lg font-bold">{lang}</Badge>
                          ))}
                          {(!artist.languagesSpokenLabels || artist.languagesSpokenLabels.length === 0) && <span className="text-sm font-medium">N/A</span>}
                       </div>
                    </div>
                    <div>
                       <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">Education / Qualification</h4>
                       <div className="flex flex-wrap gap-2">
                          {artist.qualificationLabel ? (
                            <Badge variant="secondary" className="rounded-lg font-bold">{artist.qualificationLabel}</Badge>
                          ) : (
                            <span className="text-sm font-medium">N/A</span>
                          )}
                       </div>
                    </div>
                 </div>
                 <div>
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-3">Physical Stats</h4>
                    <div className="space-y-2 text-sm">
                       <p className="flex justify-between border-b border-dashed pb-1"><span className="text-muted-foreground">Skin Tone:</span> <span className="font-bold text-foreground">{artist.skinTone || "N/A"}</span></p>
                       <p className="flex justify-between border-b border-dashed pb-1"><span className="text-muted-foreground">Gender:</span> <span className="font-bold text-foreground capitalize">{artist.gender || "N/A"}</span></p>
                    </div>
                 </div>
              </div>
            </section>

            {/* Portfolio Section */}
            <section>
              <h2 className="text-xl font-black mb-6 flex items-center gap-2 px-2">
                <Star className="w-5 h-5 text-primary" /> Portfolio Gallery
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
                {portfolioImages.map((img, i) => (
                  <div 
                    key={i} 
                    className="group relative aspect-[3/4] rounded-2xl overflow-hidden border bg-muted cursor-pointer shadow-sm hover:shadow-lg transition-all duration-300"
                    onClick={() => setSelectedImageIndex(i)}
                  >
                    <AppImage 
                      src={img.url!} 
                      alt={img.label} 
                      fill 
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                       <ZoomIn className="text-white opacity-0 group-hover:opacity-100 transition-opacity w-8 h-8 drop-shadow-md" />
                    </div>
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-3 opacity-90 group-hover:opacity-100 transition-opacity flex items-center justify-between">
                      <p className="text-white text-xs font-bold truncate">{img.label}</p>
                      <span className="text-[10px] text-amber-300 font-black bg-black/60 px-2 py-0.5 rounded-full border border-amber-300/30 shrink-0">
                        View #{i + 1}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Videos Section */}
            {artist.videos && artist.videos.length > 0 && (
              <section className="bg-card border rounded-3xl p-2 md:p-8 shadow-sm">
                <h2 className="text-xl font-black mb-6 flex items-center gap-2">
                  <Video className="w-5 h-5 text-primary" /> Audition & Work Videos
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {artist.videos.map((video) => (
                    <a 
                      key={video.id} 
                      href={video.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center gap-4 p-4 rounded-2xl bg-secondary/10 border border-primary/5 hover:bg-secondary/20 transition-all group"
                    >
                      <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                        <Video className="w-6 h-6" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm truncate">{video.name}</p>
                        <p className="text-[10px] text-primary font-bold uppercase tracking-wider flex items-center gap-1">
                          Watch Video <ExternalLink className="w-3 h-3" />
                        </p>
                      </div>
                    </a>
                  ))}
                </div>
              </section>
            )}

            {/* Certificates Section */}
            {artist.certificates && artist.certificates.length > 0 && (
              <section className="bg-card border rounded-3xl p-2 md:p-8 shadow-sm">
                <h2 className="text-xl font-black mb-6 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" /> Certifications & Awards
                </h2>
                <div className="space-y-3">
                  {artist.certificates.map((cert) => (
                    <div 
                      key={cert.id} 
                      onClick={() => {
                        if (cert.type === 'link') {
                          window.open(cert.url, '_blank');
                        } else {
                          setSelectedCertificate(cert);
                        }
                      }}
                      className="flex items-center justify-between p-4 rounded-2xl bg-secondary/10 border border-primary/5 hover:bg-secondary/20 transition-all group cursor-pointer"
                    >
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                          <FileText className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-bold text-sm">{cert.name}</p>
                          <Badge variant="outline" className="text-[9px] uppercase font-black px-2 py-0 h-4 border-primary/20">{cert.type}</Badge>
                        </div>
                      </div>
                      {cert.type === 'link' ? (
                         <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                      ) : (
                         <ZoomIn className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        </div>
      </div>

      {/* Standalone Zero-Flicker Lightbox Portals */}
      <CertificateLightboxModal 
        isOpen={!!selectedCertificate} 
        certificate={selectedCertificate} 
        onClose={() => setSelectedCertificate(null)} 
      />

      <SubscriptionPlansDialog 
        open={showSubscriptionPlans} 
        onOpenChange={setShowSubscriptionPlans}
        onSuccess={() => toast({ title: "Success", description: "You can now send requests!" })}
      />

      {/* Related Artists Section */}
      {relatedArtists && relatedArtists.length > 0 && (
        <section className="container mx-auto px-4 mt-16 pt-16 border-t">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-black flex items-center gap-3">
              <Star className="w-6 h-6 text-primary" /> More {artist.workCategoryName} Profiles
            </h2>
            {categorySlug && (
              <Button variant="ghost" className="font-bold text-primary gap-2" asChild>
                <Link href={`/category/${categorySlug}`}>
                  View All <ArrowLeft className="w-4 h-4 rotate-180" />
                </Link>
              </Button>
            )}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
            {relatedArtists.map((related) => (
              <Link 
                key={related.id} 
                href={categorySlug ? `/category/${categorySlug}/${related.username}` : `/${related.username}`}
                className="group flex flex-col items-center text-center space-y-3"
              >
                <div className="relative aspect-square w-full rounded-2xl overflow-hidden border bg-muted">
                  <AppImage 
                    src={related.profilePhotoUrl || "/default-image.png"} 
                    alt={related.fullName || "Artist"} 
                    fill 
                    className="object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                </div>
                <div>
                  <p className="font-bold text-sm leading-tight group-hover:text-primary transition-colors">{related.fullName}</p>
                  <p className="text-[10px] text-muted-foreground font-medium">{related.area || related.city}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Categories Interlinking */}
      <section className="container mx-auto px-4 mt-20 pt-16 border-t text-center">
        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-8">
          Browse Categories
        </h3>
        <div className="flex flex-wrap justify-center gap-3">
          {categoriesList.map((cat) => {
            const name = getOverriddenCategoryName(cat.id, cat.name);
            return (
              <Link 
                key={cat.id || cat.slug} 
                href={`/category/${cat.slug}`}
                className="px-4 py-2 rounded-xl bg-secondary/10 border border-primary/5 text-sm font-bold hover:bg-primary hover:text-white transition-all"
              >
                {name}
              </Link>
            );
          })}
          <Link 
            href="/categories"
            className="px-4 py-2 rounded-xl bg-primary/10 border border-primary/20 text-sm font-black text-primary hover:bg-primary hover:text-white transition-all"
          >
            All Categories
          </Link>
        </div>
      </section>

      {/* Hire Subscription Modal */}
      <HireSubscriptionModal
        isOpen={isHireModalOpen}
        onClose={() => setIsHireModalOpen(false)}
        reason={hireModalReason}
        usedCount={revealInfo?.used || 0}
        limitCount={revealInfo?.limit || 0}
      />

      {/* Confirmation Dialog before consuming 1 credit */}
      <AlertDialog open={confirmUnlockOpen} onOpenChange={setConfirmUnlockOpen}>
        <AlertDialogContent className="rounded-3xl max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <PhoneCall className="w-5 h-5 text-emerald-500" /> Unlock Contact Number?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm mt-2">
              Revealing <strong className="text-foreground">{artist.fullName}</strong>'s mobile number will use <strong>1 credit</strong> from your active Hire Subscription.
              <br /><br />
              <span className="text-xs bg-muted px-2.5 py-1 rounded-lg inline-block font-semibold">
                Remaining Credits: {revealInfo?.remaining} / {revealInfo?.limit}
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmUnlock} disabled={isUnlocking} className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold">
              {isUnlocking ? "Unlocking..." : "Unlock & Call"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Image Lightbox Gallery Modal */}
      <ImageLightboxModal
        isOpen={selectedImageIndex !== null}
        images={portfolioImages}
        currentIndex={selectedImageIndex ?? 0}
        onClose={() => setSelectedImageIndex(null)}
      />
    </div>
  );
}
