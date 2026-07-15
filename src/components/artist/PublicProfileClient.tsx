"use client";

import React, { useState, useEffect } from 'react';
import type { ArtistApplication, FirestoreUser, ArtistCertificate } from '@/types/firestore';
import AppImage from '@/components/ui/AppImage';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { 
  CheckCircle, MapPin, Calendar, Star, MessageSquare, 
  Share2, ArrowLeft, Instagram, Twitter, Facebook, Mail, Phone,
  User, Briefcase, Ruler, Weight, UserCircle2, Clock, X, ZoomIn, Video, FileText, ExternalLink, Globe, Linkedin, Youtube
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { collection, addDoc, Timestamp, query, where, limit, onSnapshot, doc, getDoc } from 'firebase/firestore';
import SubscriptionPlansDialog from '@/components/category/SubscriptionPlansDialog';
import { cn } from '@/lib/utils';
import { useFeaturesConfig } from '@/hooks/useFeaturesConfig';
import { AnimatePresence, motion } from 'framer-motion';

import { useApplicationConfig } from '@/hooks/useApplicationConfig';
import { sendConnectionRequestEmail } from '@/ai/flows/sendConnectionRequestEmailFlow';

interface PublicProfileClientProps {
  artist: ArtistApplication;
  relatedArtists?: ArtistApplication[];
  categorySlug?: string;
}

export default function PublicProfileClient({ artist, relatedArtists = [], categorySlug }: PublicProfileClientProps) {
  const router = useRouter();
  const { user, firestoreUser, triggerAuthRedirect } = useAuth();
  const { config: appAppSettings } = useApplicationConfig();
  const { toast } = useToast();
  const { featuresConfig: appConfig } = useFeaturesConfig();
  const [isRequesting, setIsRequesting] = useState(false);
  const [showSubscriptionPlans, setShowSubscriptionPlans] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'pending' | 'accepted' | 'rejected' | null>(null);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);
  const [selectedCertificate, setSelectedCertificate] = useState<ArtistCertificate | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [artistUserData, setArtistUserData] = useState<any>(null);

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

  // Lock body scroll when lightbox or certificate viewer is open
  useEffect(() => {
    if (selectedImageUrl || selectedCertificate) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [selectedImageUrl, selectedCertificate]);

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

  const portfolioImages = [
    { url: artist.faceCloseUpUrl, label: "Close Up" },
    { url: artist.midShotUrl, label: "Mid Shot" },
    { url: artist.leftProfileUrl, label: "Left Profile" },
    { url: artist.rightProfileUrl, label: "Right Profile" },
    { url: artist.frontProfileUrl, label: "Front" },
    { url: artist.backProfileUrl, label: "Back" },
  ].filter(img => img.url);

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
      await addDoc(collection(db, "connectionRequests"), {
        senderId: user.uid,
        senderName: firestoreUser?.displayName || "User",
        senderEmail: user.email || undefined,
        receiverId: artist.userId,
        receiverName: artist.fullName,
        receiverEmail: artist.email || undefined,
        status: 'pending',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });

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
          sendConnectionRequestEmail({
              artistName: artist.fullName || "Artist",
              artistEmail: artist.email,
              senderName: firestoreUser?.displayName || "A user",
              requestorEmail: user.email || undefined,
              smtpHost: appAppSettings.smtpHost,
              smtpPort: appAppSettings.smtpPort,
              smtpUser: appAppSettings.smtpUser,
              smtpPass: appAppSettings.smtpPass,
              senderEmail: appAppSettings.senderEmail,
          }).catch(err => console.error("Failed to send connection request email:", err));
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
                onClick={() => setSelectedImageUrl(artist.profilePhotoUrl || "/default-image.png")}
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
                  {artistUserData?.showMobileOnPublicProfile && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-primary" />
                      <a href={`tel:${artist.mobileNumber || artistUserData.mobileNumber}`} className="hover:text-primary transition-colors">
                        {artist.mobileNumber || artistUserData.mobileNumber}
                      </a>
                    </div>
                  )}
                  {artistUserData?.showEmailOnPublicProfile && (
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-primary" />
                      <a href={`mailto:${artist.email || artistUserData.email}`} className="truncate hover:text-primary transition-colors">
                        {artist.email || artistUserData.email}
                      </a>
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
                    <Button 
                      className={cn("w-full h-12 rounded-2xl text-base font-black shadow-lg shadow-primary/20", isSelf && "hidden")}
                      variant={connectionStatus === 'accepted' ? 'default' : connectionStatus === 'pending' ? 'outline' : 'default'}
                      onClick={handleRequest}
                      isLoading={isRequesting}
                      disabled={isSelf || connectionStatus === 'pending'}
                    >
                      {connectionStatus === 'accepted' ? (
                        <><MessageSquare className="w-5 h-5 mr-2" /> Chat Now</>
                      ) : connectionStatus === 'pending' ? (
                        <><Clock className="w-5 h-5 mr-2" /> Requested</>
                      ) : (
                        <><MessageSquare className="w-5 h-5 mr-2" /> Request Connection</>
                      )}
                    </Button>
                    
                    {appConfig?.isSubscriptionRequired && (
                      <p className="text-[10px] text-center text-muted-foreground mt-3 uppercase tracking-tighter">
                        Subscription required to connect
                      </p>
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
                    className="group relative aspect-[3/4] rounded-2xl overflow-hidden border bg-muted cursor-zoom-in"
                    onClick={() => setSelectedImageUrl(img.url!)}
                  >
                    <AppImage 
                      src={img.url!} 
                      alt={img.label} 
                      fill 
                      className="object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                       <ZoomIn className="text-white opacity-0 group-hover:opacity-100 transition-opacity w-8 h-8 drop-shadow-md" />
                    </div>
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                      <p className="text-white text-xs font-bold">{img.label}</p>
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

      {/* Lightbox Overlay */}
      <AnimatePresence>
        {selectedImageUrl && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-md flex flex-col items-center justify-center"
            onClick={() => setSelectedImageUrl(null)}
          >
            {/* Larger Close Button for Mobile Accessibility */}
            <div className="absolute top-0 right-0 p-4 z-[110]">
              <Button 
                variant="ghost" 
                size="icon" 
                className="text-white hover:bg-white/10 rounded-full h-14 w-14 bg-black/20 backdrop-blur-sm"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedImageUrl(null);
                }}
              >
                <X className="h-8 w-8" />
              </Button>
            </div>
            
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full h-full flex items-center justify-center p-2 md:p-10"
            >
              <div className="relative w-full h-full max-w-6xl max-h-[90vh]">
                <AppImage 
                  src={selectedImageUrl} 
                  alt="Full view" 
                  fill 
                  objectFit="contain"
                  priority
                  className="rounded-lg"
                />
              </div>
            </motion.div>
            
            {/* Tap background text hint for mobile */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-white/40 text-[10px] uppercase tracking-widest pointer-events-none md:hidden">
              Tap anywhere to close
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Certificate Lightbox Overlay */}
      <AnimatePresence>
        {selectedCertificate && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-md flex flex-col items-center justify-center p-4"
            onClick={() => setSelectedCertificate(null)}
          >
            <div className="absolute top-0 right-0 p-4 z-[110] flex items-center gap-4">
              <div className="text-white text-sm font-bold bg-black/40 px-4 py-2 rounded-full backdrop-blur-sm hidden md:block">
                {selectedCertificate.name}
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                className="text-white hover:bg-white/10 rounded-full h-12 w-12 bg-black/20 backdrop-blur-sm"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedCertificate(null);
                }}
              >
                <X className="h-6 w-6" />
              </Button>
            </div>
            
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full h-full max-w-5xl max-h-[85vh] flex items-center justify-center overflow-hidden rounded-2xl bg-white/5 select-none"
              onClick={(e) => e.stopPropagation()}
              onContextMenu={(e) => e.preventDefault()}
            >
              {selectedCertificate.type === 'pdf' ? (
                <iframe 
                  src={`${selectedCertificate.url}#toolbar=0&navpanes=0&scrollbar=0`} 
                  className="w-full h-full border-none rounded-2xl bg-white"
                  title={selectedCertificate.name}
                />
              ) : (
                <div className="relative w-full h-full">
                  <AppImage 
                    src={selectedCertificate.url} 
                    alt={selectedCertificate.name} 
                    fill 
                    objectFit="contain"
                    priority
                  />
                </div>
              )}
            </motion.div>

            <div className="mt-4 text-white/60 text-xs font-medium md:hidden">
              {selectedCertificate.name}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
          {['Acting', 'Singing', 'Modeling', 'Photography', 'Dancing', 'Voice Over'].map((cat) => (
            <Link 
              key={cat} 
              href={`/category/${cat.toLowerCase().replace(' ', '-')}`}
              className="px-4 py-2 rounded-xl bg-secondary/10 border border-primary/5 text-sm font-bold hover:bg-primary hover:text-white transition-all"
            >
              {cat}
            </Link>
          ))}
          <Link 
            href="/categories"
            className="px-4 py-2 rounded-xl bg-primary/10 border border-primary/20 text-sm font-black text-primary hover:bg-primary hover:text-white transition-all"
          >
            All Categories
          </Link>
        </div>
      </section>
    </div>
  );
}
