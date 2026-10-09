"use client";

import React, { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PhoneCall, Sparkles, Loader2, UserCheck, ShieldAlert, ArrowRight, Ban, UserX } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Breadcrumbs from '@/components/shared/Breadcrumbs';
import ArtistCard from '@/components/category/ArtistCard';
import type { ArtistProfile } from '@/types/firestore';

export default function RevealedContactsPage() {
  const { user, firestoreUser, isLoading: authLoading } = useAuth();
  const router = useRouter();
  
  const [artists, setArtists] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedArtistForRequest, setSelectedArtistForRequest] = useState<any | null>(null);

  // Check subscription active state, expiration, and past subscription history
  const now = new Date();
  let isExpired = true;
  let hasEverSubscribed = false;

  if (firestoreUser?.hireSubscriptionExpiresAt) {
    hasEverSubscribed = true;
    const expiresDate = typeof (firestoreUser.hireSubscriptionExpiresAt as any).toDate === 'function'
      ? firestoreUser.hireSubscriptionExpiresAt.toDate()
      : new Date(firestoreUser.hireSubscriptionExpiresAt as any);
    isExpired = expiresDate < now;
  } else if (firestoreUser?.hireSubscriptionActive || (firestoreUser?.unlockedArtistIds && firestoreUser.unlockedArtistIds.length > 0)) {
    hasEverSubscribed = true;
  }

  const isSubscribed = !!firestoreUser?.hireSubscriptionActive && !isExpired;
  const unlockedIds = firestoreUser?.unlockedArtistIds || [];

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login?returnUrl=/revealed-contacts');
      return;
    }

    if (user && isSubscribed && unlockedIds.length > 0) {
      fetchUnlockedArtists(unlockedIds);
    } else {
      setIsLoading(false);
    }
  }, [user, authLoading, isSubscribed, unlockedIds.length]);

  const fetchUnlockedArtists = async (ids: string[]) => {
    setIsLoading(true);
    try {
      const fetched: any[] = [];
      const fetchedIds = new Set<string>();

      // 1. Direct getDoc for each ID (since many ArtistApplications doc IDs equal user UID)
      for (const id of ids) {
        try {
          const docRef = doc(db, 'ArtistApplications', id);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            fetched.push({ id: docSnap.id, ...docSnap.data() });
            fetchedIds.add(id);
            if (docSnap.data().userId) fetchedIds.add(docSnap.data().userId);
          }
        } catch (e) {
          console.error('Error fetching artist doc by id:', e);
        }
      }

      // 2. Query remaining IDs by userId field in chunks of 10
      const remainingIds = ids.filter(id => !fetchedIds.has(id));
      if (remainingIds.length > 0) {
        const chunkSize = 10;
        for (let i = 0; i < remainingIds.length; i += chunkSize) {
          const chunk = remainingIds.slice(i, i + chunkSize);
          const q = query(collection(db, 'ArtistApplications'), where('userId', 'in', chunk));
          const snapshot = await getDocs(q);
          snapshot.docs.forEach((docSnap) => {
            if (!fetchedIds.has(docSnap.id)) {
              fetched.push({ id: docSnap.id, ...docSnap.data() });
              fetchedIds.add(docSnap.id);
            }
          });
        }
      }

      setArtists(fetched);
    } catch (error) {
      console.error('Error fetching revealed artists:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
        <Loader2 className="w-10 h-10 animate-spin text-primary mb-3" />
        <p className="text-muted-foreground text-sm font-medium">Loading revealed contacts...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-16">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <Breadcrumbs
          items={[
            { label: 'Home', href: '/' },
            { label: 'Revealed Contacts' }
          ]}
          className="mb-6"
        />

        {/* Page Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8 bg-card border p-6 md:p-8 rounded-3xl shadow-sm">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 font-bold px-3 py-1 rounded-full">
                <PhoneCall className="w-3.5 h-3.5 mr-1.5" /> REVEALED CONTACTS
              </Badge>
            </div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight">Unlocked Artist Numbers</h1>
            <p className="text-muted-foreground text-sm md:text-base mt-1">
              View and directly call artist contacts unlocked during your active subscription.
            </p>
          </div>

          <Button
            onClick={() => router.push('/subscriptions/contact')}
            className="rounded-2xl font-bold gap-2 shrink-0"
          >
            <Sparkles className="w-4 h-4" /> Manage Subscription
          </Button>
        </div>

        {/* Subscription Notice: Never Subscribed vs Expired */}
        {!isSubscribed ? (
          !hasEverSubscribed ? (
            <div className="bg-[#faf6e9] border border-[#f3e5c8] dark:bg-amber-950/30 dark:border-amber-500/30 rounded-3xl p-8 md:p-12 text-center max-w-2xl mx-auto my-12 shadow-sm">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-8 h-8" />
              </div>
              <h3 className="text-2xl md:text-3xl font-black mb-2 text-foreground">Subscribe to Unlock Artist Contacts</h3>
              <p className="text-muted-foreground text-sm md:text-base leading-relaxed mb-6 max-w-lg mx-auto">
                Subscribe to a Contact Access Plan to directly reveal, call, and unlock any artist's phone number.
              </p>
              <Button
                size="lg"
                className="rounded-2xl font-black gap-2 shadow-lg shadow-primary/20 px-8 py-6 text-base"
                onClick={() => router.push('/subscriptions/contact')}
              >
                Subscribe Now <ArrowRight className="w-5 h-5" />
              </Button>
            </div>
          ) : (
            <div className="bg-[#faf6e9] border border-[#f3e5c8] dark:bg-amber-950/30 dark:border-amber-500/30 rounded-3xl p-8 md:p-12 text-center max-w-2xl mx-auto my-12 shadow-sm">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto mb-4">
                <ShieldAlert className="w-8 h-8" />
              </div>
              <h3 className="text-2xl md:text-3xl font-black mb-2 text-foreground">Subscription Expired or Inactive</h3>
              <p className="text-muted-foreground text-sm md:text-base leading-relaxed mb-6 max-w-lg mx-auto">
                Your revealed contacts expire when your Contact Access Plan expires. To view numbers again and unlock new contacts, please renew your subscription.
              </p>
              <Button
                size="lg"
                className="rounded-2xl font-black gap-2 shadow-lg shadow-primary/20 px-8 py-6 text-base"
                onClick={() => router.push('/subscriptions/contact')}
              >
                Renew Contact Subscription <ArrowRight className="w-5 h-5" />
              </Button>
            </div>
          )
        ) : isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-80 bg-muted/40 rounded-3xl animate-pulse" />
            ))}
          </div>
        ) : artists.length === 0 ? (
          <div className="bg-card border-2 border-dashed rounded-3xl p-12 text-center max-w-xl mx-auto my-12">
            <UserX className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-bold mb-2">No Unlocked Contacts Yet</h3>
            <p className="text-muted-foreground text-sm mb-6">
              You haven't revealed any artist mobile numbers yet. Explore artist profiles and click "Call / Reveal Number" to unlock direct access.
            </p>
            <Button
              className="rounded-2xl font-bold gap-2"
              onClick={() => router.push('/categories')}
            >
              Explore Artist Profiles <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {artists.map((artist) => (
              <ArtistCard
                key={artist.id}
                artist={artist}
                onRequest={(artistToRequest) => setSelectedArtistForRequest(artistToRequest)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
