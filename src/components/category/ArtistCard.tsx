"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { User, MapPin, CheckCircle, Info, MessageSquare, Clock, Ban, X, PhoneCall, Phone, Sparkles } from 'lucide-react';
import type { ArtistApplication } from '@/types/firestore';
import AppImage from '@/components/ui/AppImage';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { checkContactRevealStatus, unlockArtistContact } from '@/lib/hireSubscriptionUtils';
import HireSubscriptionModal from '@/components/shared/HireSubscriptionModal';
import { useToast } from '@/hooks/use-toast';
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

interface ArtistCardProps {
  artist: ArtistApplication;
  onRequest: (artist: ArtistApplication) => void;
  isLoading?: boolean;
  categorySlug?: string;
  connectionStatus?: 'pending' | 'accepted' | 'rejected' | null;
  isBlocked?: boolean;
}

const ArtistCard: React.FC<ArtistCardProps> = ({ artist, onRequest, isLoading, categorySlug, connectionStatus, isBlocked }) => {
  const { user, firestoreUser, triggerAuthRedirect } = useAuth();
  const { toast } = useToast();
  const [isHireModalOpen, setIsHireModalOpen] = useState(false);
  const [hireModalReason, setHireModalReason] = useState<'no_subscription' | 'limit_reached'>('no_subscription');
  const [confirmUnlockOpen, setConfirmUnlockOpen] = useState(false);
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [revealInfo, setRevealInfo] = useState<{ remaining: number; limit: number; used: number } | null>(null);

  const isSelf = user?.uid === artist.userId;
  const catSlug = categorySlug || artist.workCategorySlug || 'all';
  const uname = artist.username || artist.userId || artist.id;
  const profileUrl = uname ? `/category/${catSlug}/${uname}` : null;
  const mainImage = artist.profilePhotoUrl || "/default-image.png";
  const phoneNumber = artist.mobileNumber || '';

  const handleAboutClick = (e: React.MouseEvent) => {
    if (!user) {
      e.preventDefault();
      const currentPath = window.location.pathname + window.location.search;
      triggerAuthRedirect(currentPath);
    }
  };

  const handleCallClick = () => {
    if (!user) {
      const currentPath = window.location.pathname + window.location.search;
      triggerAuthRedirect(currentPath);
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

  const isUnlocked = firestoreUser?.unlockedArtistIds?.includes(artist.userId);
  const isPaidSubscriber = !!(
    (artist as any).subscriptionActive ||
    (artist as any).profileSubscriptionActive ||
    (artist as any).isSubscribed ||
    (artist as any).isPremium ||
    ((artist as any).promotionIndex && (artist as any).promotionIndex > 0)
  );

  return (
    <>
      <div className={cn(
        "bg-card border rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 flex flex-col h-full group relative",
        isPaidSubscriber && "border-amber-500/40 ring-1 ring-amber-500/20 shadow-amber-500/10 shadow-md bg-gradient-to-b from-amber-500/5 to-transparent"
      )}>
        {/* Image Section */}
        {profileUrl ? (
          <Link href={profileUrl} onClick={handleAboutClick} className="relative aspect-square w-full bg-muted flex items-center justify-center cursor-pointer overflow-hidden">
            <AppImage 
              src={mainImage} 
              alt={artist.fullName || "Artist"} 
              fill 
              className="object-contain w-full h-full transition-transform duration-500 group-hover:scale-105"
            />
            {isPaidSubscriber && (
              <div className="absolute top-3 left-3 z-10">
                <Badge className="bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 text-slate-950 font-black border-none shadow-md backdrop-blur-sm px-2.5 py-0.5 text-[10px] tracking-wider uppercase flex items-center">
                  <Sparkles className="w-3 h-3 mr-1 fill-slate-950 text-slate-950" /> Premium
                </Badge>
              </div>
            )}
            {artist.status === 'approved' && (
              <div className="absolute top-3 right-3 z-10">
                <Badge className="bg-green-500/90 hover:bg-green-600 text-white border-none backdrop-blur-sm">
                  <CheckCircle className="w-3 h-3 mr-1" /> Verified
                </Badge>
              </div>
            )}
          </Link>
        ) : (
          <div className="relative aspect-square w-full bg-muted flex items-center justify-center">
            <AppImage 
              src={mainImage} 
              alt={artist.fullName || "Artist"} 
              fill 
              className="object-contain w-full h-full transition-transform duration-500 group-hover:scale-105"
            />
            {isPaidSubscriber && (
              <div className="absolute top-3 left-3 z-10">
                <Badge className="bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 text-slate-950 font-black border-none shadow-md backdrop-blur-sm px-2.5 py-0.5 text-[10px] tracking-wider uppercase flex items-center">
                  <Sparkles className="w-3 h-3 mr-1 fill-slate-950 text-slate-950" /> Premium
                </Badge>
              </div>
            )}
            {artist.status === 'approved' && (
              <div className="absolute top-3 right-3">
                <Badge className="bg-green-500/90 hover:bg-green-600 text-white border-none backdrop-blur-sm">
                  <CheckCircle className="w-3 h-3 mr-1" /> Verified
                </Badge>
              </div>
            )}
          </div>
        )}

        {/* Content Section */}
        <div className="p-4 flex flex-col flex-grow">
          <div className="mb-2">
            <h3 className="font-bold text-lg leading-tight line-clamp-1 text-foreground hover:text-primary transition-colors">
              {profileUrl ? (
                <Link href={profileUrl} onClick={handleAboutClick}>
                  {artist.fullName || "New Talent"}
                </Link>
              ) : (
                artist.fullName || "New Talent"
              )}
            </h3>
            <p className="text-sm text-primary font-medium">{artist.workCategoryName || "Professional"}</p>
          </div>

          <div className="flex items-center justify-between text-muted-foreground text-xs mb-4">
            <div className="flex items-center min-w-0">
              <MapPin className="w-3 h-3 mr-1 shrink-0" />
              <span className="line-clamp-1">{artist.area || artist.city || "Available Near You"}</span>
            </div>
            {artist.age && (
              <span className="ml-2 shrink-0 font-bold text-primary bg-primary/5 px-1.5 py-0.5 rounded text-[10px] border border-primary/10">
                {artist.age} YRS
              </span>
            )}
          </div>

          {artist.bio && (
            <p className="text-sm text-muted-foreground line-clamp-2 mb-4 italic">
              "{artist.bio}"
            </p>
          )}

          {/* Buttons Section */}
          <div className="mt-auto flex flex-col gap-2 w-full">
            <div className="flex gap-2 w-full">
              {profileUrl ? (
                <Button asChild variant="outline" size="sm" className="w-full h-9 rounded-xl border-primary/20 hover:border-primary hover:bg-primary/5 hover:text-primary px-3">
                  <Link href={profileUrl} onClick={handleAboutClick}>
                    <Info className="w-3.5 h-3.5 mr-1.5 shrink-0" /> 
                    <span className="text-xs font-bold">About & Portfolio</span>
                  </Link>
                </Button>
              ) : (
                <Button variant="outline" size="sm" className="w-full h-9 rounded-xl border-primary/20 opacity-50 cursor-not-allowed px-3" disabled>
                  <Info className="w-3.5 h-3.5 mr-1.5 shrink-0" /> 
                  <span className="text-xs font-bold">About & Portfolio</span>
                </Button>
              )}
            </div>

            {!isSelf && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleCallClick}
                className={cn(
                  "w-full h-9 rounded-xl font-bold text-xs gap-1.5 transition-all border-emerald-500/40 bg-emerald-50/60 text-emerald-700 hover:bg-emerald-600 hover:text-white hover:border-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400 dark:hover:bg-emerald-600 dark:hover:text-white dark:hover:border-emerald-600",
                  isUnlocked && "bg-emerald-600 text-white font-black border-emerald-600 hover:bg-emerald-700 hover:text-white hover:border-emerald-700 dark:bg-emerald-600 dark:text-white"
                )}
              >
                <PhoneCall className="w-3.5 h-3.5 shrink-0" />
                <span>{isUnlocked ? (phoneNumber || "Call Now") : "Call / Reveal Number"}</span>
              </Button>
            )}
          </div>
        </div>
      </div>

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
    </>
  );
};

export default ArtistCard;
