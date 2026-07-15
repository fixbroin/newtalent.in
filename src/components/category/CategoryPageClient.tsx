"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { 
  FirestoreCategory, 
  ArtistApplication,
} from '@/types/firestore';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Home as HomeIconLucide, Loader2, Construction, UserPlus, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, limit, doc, addDoc, Timestamp, onSnapshot } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import Breadcrumbs from '@/components/shared/Breadcrumbs';
import type { BreadcrumbItem } from '@/types/ui';
import { useLoading } from '@/contexts/LoadingContext';
import { cn, getTimestampMillis } from '@/lib/utils';
import type { FullCategoryData } from '@/lib/homepageUtils';
import ArtistCard from './ArtistCard';
import SubscriptionPlansDialog from './SubscriptionPlansDialog';
import { useFeaturesConfig } from '@/hooks/useFeaturesConfig';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Filter, X, MapPin as MapPinIcon } from 'lucide-react';
import type { FirestoreCity, FirestoreArea } from '@/types/firestore';
import { orderBy } from 'firebase/firestore';

interface CategoryPageClientProps {
  categorySlug: string;
  citySlug?: string;
  areaSlug?: string;
  breadcrumbItems?: BreadcrumbItem[];
  initialData?: FullCategoryData;
  initialH1Title?: string;
  otherCategories?: FirestoreCategory[];
}

import { sendConnectionRequestEmail } from '@/ai/flows/sendConnectionRequestEmailFlow';
import { useApplicationConfig } from '@/hooks/useApplicationConfig';
import { getCategorySeoContent } from '@/lib/categorySeoData';

export default function CategoryPageClient({ 
  categorySlug, 
  citySlug, 
  areaSlug, 
  breadcrumbItems: initialBreadcrumbItems, 
  initialData,
  initialH1Title,
  otherCategories = []
}: CategoryPageClientProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { user, firestoreUser, triggerAuthRedirect } = useAuth();
  const { showLoading } = useLoading();
  const { featuresConfig } = useFeaturesConfig();
  const { config: appConfig } = useApplicationConfig();
  
  const isArtist = firestoreUser?.roles?.includes('artist');

  useEffect(() => {
    if (!user) {
      setConnectionsMap({});
      return;
    }

    const q = query(
      collection(db, "connectionRequests"),
      where("senderId", "==", user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newMap: Record<string, 'pending' | 'accepted' | 'rejected' | null> = {};
      snapshot.forEach(docSnap => {
        const data = docSnap.data();
        newMap[data.receiverId] = data.status;
      });
      setConnectionsMap(newMap);
    });

    return () => unsubscribe();
  }, [user]);

  const [category, setCategory] = useState<FirestoreCategory | null>(initialData?.category || null);
  const seoContent = getCategorySeoContent(categorySlug, category?.name || 'Talent');
  const [artists, setArtists] = useState<ArtistApplication[]>(initialData?.artists || []);
  const [connectionsMap, setConnectionsMap] = useState<Record<string, 'pending' | 'accepted' | 'rejected' | null>>({});
  const [isLoading, setIsLoading] = useState(!initialData);
  const [isRequesting, setIsRequesting] = useState<string | null>(null);
  const [showSubscriptionPlans, setShowSubscriptionPlans] = useState(false);
  const [displayPageH1, setDisplayPageH1] = useState(initialH1Title || initialData?.category.h1_title || "Artists");

  // Filters state
  const [minAge, setMinAge] = useState<string>("");
  const [maxAge, setMaxAge] = useState<string>("");
  const [selectedCity, setSelectedCity] = useState<string>("all");
  const [selectedArea, setSelectedArea] = useState<string>("all");

  // Derive unique cities and areas from the artists list
  const availableCities = Array.from(new Set(artists.map(a => a.city).filter(Boolean))).sort();
  const availableAreas = Array.from(new Set(
    artists
      .filter(a => selectedCity === "all" || a.city === selectedCity)
      .map(a => a.area)
      .filter(Boolean)
  )).sort();

  useEffect(() => {
    if (!initialData) {
      fetchCategoryAndArtists();
    }
  }, [categorySlug, citySlug, areaSlug]);

  const filteredArtists = artists.filter(artist => {
    const age = artist.age || 0;
    const min = minAge ? parseInt(minAge) : 0;
    const max = maxAge ? parseInt(maxAge) : 100;
    
    if (age < min || age > max) return false;
    if (selectedCity !== "all" && artist.city !== selectedCity) return false;
    if (selectedArea !== "all" && artist.area !== selectedArea) return false;
    
    return true;
  });

  const fetchCategoryAndArtists = async () => {
    setIsLoading(true);
    try {
      // 1. Fetch Category
      const categoriesRef = collection(db, "adminCategories");
      const qCategory = query(categoriesRef, where("slug", "==", categorySlug), where("isActive", "==", true), limit(1));
      const categorySnapshot = await getDocs(qCategory);

      if (categorySnapshot.empty) {
        setIsLoading(false);
        return;
      }

      const foundCategory = { id: categorySnapshot.docs[0].id, ...categorySnapshot.docs[0].data() } as FirestoreCategory;
      setCategory(foundCategory);

      // 2. Fetch Artists
      let artistsQuery = query(
        collection(db, "ArtistApplications"),
        where("workCategoryId", "==", foundCategory.id),
        where("status", "==", "approved")
      );

      // Optionally filter by city/area if they are stored as strings in ArtistApplications
      // Note: In a real app, you might need to query by city ID or use a different field
      const artistsSnapshot = await getDocs(artistsQuery);
      let fetchedArtists = artistsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ArtistApplication));
      
      // Sort artists by promotionIndex
      fetchedArtists.sort((a, b) => {
        const aIndex = a.promotionIndex ?? 1000;
        const bIndex = b.promotionIndex ?? 1000;
        if (aIndex !== bIndex) return aIndex - bIndex;
        const aTime = getTimestampMillis(a.updatedAt) || 0;
        const bTime = getTimestampMillis(b.updatedAt) || 0;
        return bTime - aTime;
      });

      setArtists(fetchedArtists);
    } catch (error) {
      console.error("Error fetching category data:", error);
      toast({ title: "Error", description: "Failed to load artists.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRequest = async (artist: ArtistApplication) => {
    const existingStatus = connectionsMap[artist.userId];
    
    if (existingStatus === 'accepted') {
      router.push(`/chat?with=${artist.userId}`);
      return;
    }

    if (existingStatus === 'pending') {
      toast({ title: "Request Pending", description: "You have already sent a request to this artist." });
      return;
    }

    if (!user) {
      triggerAuthRedirect(window.location.pathname);
      return;
    }

    // Check subscription status
    if (appConfig?.isSubscriptionRequired && !firestoreUser?.subscriptionActive) {
      setShowSubscriptionPlans(true);
      return;
    }

    setIsRequesting(artist.id!);
    try {
      // Create a connection request
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

      // Trigger Email Flow
      if (appConfig?.smtpHost && artist.email) {
          sendConnectionRequestEmail({
              artistName: artist.fullName || "Artist",
              artistEmail: artist.email,
              senderName: firestoreUser?.displayName || "A user",
              requestorEmail: user.email || undefined,
              smtpHost: appConfig.smtpHost,
              smtpPort: appConfig.smtpPort,
              smtpUser: appConfig.smtpUser,
              smtpPass: appConfig.smtpPass,
              senderEmail: appConfig.senderEmail,
          }).catch(err => console.error("Failed to send connection request email:", err));
      }

      toast({ 
        title: "Request Sent!", 
        description: `Your request has been sent to ${artist.fullName}. You'll be notified when they accept.`,
      });
    } catch (error) {
      console.error("Error sending request:", error);
      toast({ title: "Request Failed", description: "Could not send connection request.", variant: "destructive" });
    } finally {
      setIsRequesting(null);
    }
  };

  const handleJoinAsArtist = (e: React.MouseEvent) => {
    if (!user) {
      e.preventDefault();
      triggerAuthRedirect('/artist-registration');
      return;
    }

    if (appConfig?.isSubscriptionRequired && !firestoreUser?.subscriptionActive) {
      e.preventDefault();
      setShowSubscriptionPlans(true);
      return;
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Skeleton className="h-8 w-48 mb-6" />
        <Skeleton className="h-10 w-full max-w-md mb-8" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="space-y-3">
              <Skeleton className="aspect-[4/5] w-full rounded-2xl" />
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!category) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <Construction className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
        <h2 className="text-2xl font-bold mb-2">Category Not Found</h2>
        <p className="text-muted-foreground mb-8">The category you are looking for doesn't exist or is inactive.</p>
        <Button onClick={() => router.push('/')}>Go Home</Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 pb-24">
      {initialBreadcrumbItems && <Breadcrumbs items={initialBreadcrumbItems} />}
      
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-8">
        <div className="flex items-start gap-4">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => router.back()} 
            className="hidden md:flex mt-1 rounded-xl border-primary/20 text-primary hover:bg-primary hover:text-white transition-colors h-9 text-xs shrink-0"
          >
            <ArrowLeft className="w-4 h-4 mr-2" /> Back
          </Button>
          <div>
            
            <h1 className="text-3xl md:text-5xl font-black tracking-tight text-foreground">
              {displayPageH1}
            </h1>
            <p className="text-muted-foreground text-lg mt-2">
              Explore and connect with verified {category.name.toLowerCase()} professionals.
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto shrink-0">
          {!isArtist && (
            <Link href="/artist-registration" onClick={handleJoinAsArtist} className="w-full md:w-auto">
              <Button className="w-full md:w-auto rounded-xl font-bold bg-primary text-white shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all border-none h-11 md:h-9 text-sm md:text-xs">
                 <UserPlus className="w-4 h-4 mr-2" /> Join as an Artist
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Filter Section */}
      <Card className="mb-8 rounded-3xl border-primary/10 shadow-sm overflow-hidden bg-card/50 backdrop-blur-sm">
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="filters" className="border-none">
            <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-primary/5 transition-colors">
              <div className="flex items-center gap-3 text-primary">
                <Filter className="w-5 h-5" />
                <span className="font-bold uppercase tracking-wider text-sm">Advanced Filters</span>
                {(minAge || maxAge || selectedCity || selectedArea) && (
                  <span className="flex h-2 w-2 rounded-full bg-primary animate-pulse" />
                )}
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-6 pt-2">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Age Filter */}
                <div className="space-y-3">
                  <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Age Range</Label>
                  <div className="flex items-center gap-2">
                    <Input 
                      type="number" 
                      placeholder="Min" 
                      value={minAge} 
                      onChange={(e) => setMinAge(e.target.value)}
                      className="rounded-xl bg-background border-primary/10 focus:ring-primary h-11"
                    />
                    <span className="text-muted-foreground">-</span>
                    <Input 
                      type="number" 
                      placeholder="Max" 
                      value={maxAge} 
                      onChange={(e) => setMaxAge(e.target.value)}
                      className="rounded-xl bg-background border-primary/10 focus:ring-primary h-11"
                    />
                  </div>
                </div>

                {/* City Filter */}
                <div className="space-y-3">
                  <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">City</Label>
                  <Select value={selectedCity} onValueChange={setSelectedCity}>
                    <SelectTrigger className="rounded-xl bg-background border-primary/10 h-11">
                      <SelectValue placeholder="All Cities" />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl border-primary/10">
                      <SelectItem value="all">All Cities</SelectItem>
                      {availableCities.filter(Boolean).map(city => (
                        <SelectItem key={city} value={city!}>{city}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Area Filter */}
                <div className="space-y-3">
                  <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Area</Label>
                  <Select 
                    value={selectedArea} 
                    onValueChange={setSelectedArea}
                    disabled={!selectedCity || selectedCity === "all"}
                  >
                    <SelectTrigger className="rounded-xl bg-background border-primary/10 h-11">
                      <SelectValue placeholder="All Areas" />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl border-primary/10">
                      <SelectItem value="all">All Areas</SelectItem>
                      {availableAreas.filter(Boolean).map(area => (
                        <SelectItem key={area} value={area!}>{area}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Reset Button */}
                <div className="flex items-end">
                  <Button 
                    variant="ghost" 
                    onClick={() => {
                      setMinAge("");
                      setMaxAge("");
                      setSelectedCity("all");
                      setSelectedArea("all");
                    }}
                    className="w-full h-11 rounded-xl gap-2 font-bold text-muted-foreground hover:text-primary hover:bg-primary/5 border border-dashed border-primary/20"
                  >
                    <X className="w-4 h-4" /> Reset Filters
                  </Button>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </Card>

      {filteredArtists.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8">
          {filteredArtists.map((artist) => (
            <ArtistCard 
              key={artist.id} 
              artist={artist} 
              onRequest={handleRequest}
              isLoading={isRequesting === artist.id}
              categorySlug={categorySlug}
              connectionStatus={connectionsMap[artist.userId] || null}
            />
          ))}
        </div>
      ) : (
        <div className="bg-muted/30 border-2 border-dashed rounded-3xl p-12 text-center flex flex-col items-center justify-center min-h-[400px]">
          <div className="bg-background p-4 rounded-2xl shadow-sm mb-6">
            <UserPlus className="h-10 w-10 text-muted-foreground" />
          </div>
          <h3 className="text-2xl font-bold mb-3">
            {artists.length > 0 ? "No artists match your filters" : "No artists available yet"}
          </h3>
          <p className="text-muted-foreground max-w-md mx-auto mb-8">
            {artists.length > 0 
              ? "Try adjusting your age or location filters to find more professionals."
              : `We are currently onboarding top-tier ${category.name.toLowerCase()} professionals in this area. Check back soon!`}
          </p>
          {artists.length > 0 ? (
            <Button 
              variant="outline" 
              onClick={() => {
                setMinAge("");
                setMaxAge("");
                setSelectedCity("all");
                setSelectedArea("all");
              }}
              className="rounded-2xl h-12 px-8 font-bold border-primary text-primary"
            >
              Clear All Filters
            </Button>
          ) : (
            !isArtist && (
              <Link href="/artist-registration" onClick={handleJoinAsArtist}>
                <Button className="rounded-2xl h-12 px-8 font-bold shadow-lg shadow-primary/20">
                   <UserPlus className="w-4 h-4 mr-2" />Join as an Artist
                </Button>
              </Link>
            )
          )}
        </div>
      )}

      {/* Subscription Plans Modal */}
      <SubscriptionPlansDialog 
        open={showSubscriptionPlans} 
        onOpenChange={setShowSubscriptionPlans}
        onSuccess={() => {
          toast({ title: "Success", description: "Subscription activated! You can now send requests." });
        }}
      />

      {/* Benefits Section */}
      <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="flex flex-col items-center text-center p-2 bg-card rounded-3xl border shadow-sm">
          <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center mb-4">
            <Sparkles className="w-6 h-6 text-primary" />
          </div>
          <h4 className="font-bold mb-2">Verified Talent</h4>
          <p className="text-sm text-muted-foreground">Every artist on our platform undergoes a rigorous KYC verification process.</p>
        </div>
        <div className="flex flex-col items-center text-center p-2 bg-card rounded-3xl border shadow-sm">
          <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center mb-4">
            <Construction className="w-6 h-6 text-primary" />
          </div>
          <h4 className="font-bold mb-2">Direct Connection</h4>
          <p className="text-sm text-muted-foreground">Skip the middleman. Chat directly with artists to discuss your specific needs.</p>
        </div>
        <div className="flex flex-col items-center text-center p-2 bg-card rounded-3xl border shadow-sm">
          <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center mb-4">
            <Sparkles className="w-6 h-6 text-primary" />
          </div>
          <h4 className="font-bold mb-2">Secure Platform</h4>
          <p className="text-sm text-muted-foreground">Our subscription model ensures a high-quality community for both artists and clients.</p>
        </div>
      </div>

      {/* Categories Interlinking */}
      {otherCategories && otherCategories.length > 0 && (
        <section className="mt-24 pt-16 border-t">
          <h3 className="text-xl font-black mb-8">Other Top Talent Categories</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {otherCategories.map((cat) => (
              <Link 
                key={cat.id} 
                href={`/category/${cat.slug}`}
                className="group p-4 rounded-2xl border bg-card hover:border-primary hover:bg-primary/5 transition-all text-center"
              >
                <div className="w-10 h-10 mx-auto bg-primary/10 rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <Sparkles className="w-5 h-5 text-primary" />
                </div>
                <p className="font-bold text-sm leading-tight">{cat.name}</p>
              </Link>
            ))}
            <Link 
              href="/categories"
              className="p-4 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center text-muted-foreground hover:text-primary hover:border-primary transition-all"
            >
              <p className="font-black text-sm uppercase tracking-widest">View All</p>
            </Link>
          </div>
        </section>
      )}

      {/* Rich SEO Content Section */}
      <section className="mt-24 pt-16 border-t">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <h2 className="text-3xl font-black tracking-tight">
            {seoContent.h2Title} {citySlug ? `in ${citySlug.charAt(0).toUpperCase() + citySlug.slice(1).replace(/-/g, ' ')}` : ''}
          </h2>
          <div className="prose prose-sm max-w-none text-muted-foreground leading-relaxed">
            <p>
              {(() => {
                if (!citySlug) return seoContent.descriptionHtml;
                const cityName = citySlug.charAt(0).toUpperCase() + citySlug.slice(1).replace(/-/g, ' ');
                return seoContent.descriptionHtml
                  .replace(/in India/gi, `in ${cityName}`)
                  .replace(/India's/gi, `${cityName}'s`)
                  .replace(/across India/gi, `in ${cityName}`)
                  .replace(/Indian film/gi, `${cityName} film`);
              })()}
            </p>
            <p>
              By joining the Newtalent network, {category?.name || 'artists'} can build professional portfolios, showcase their work through videos and images, and securely connect with industry leaders. Experience the future of professional cinema networking with our unique "Request & Accept" model, designed to foster trust and meaningful collaborations in the {citySlug ? `${citySlug.charAt(0).toUpperCase() + citySlug.slice(1).replace(/-/g, ' ')}` : 'vibrant Indian'} film ecosystem.
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-4 pt-4">
            <div className="px-4 py-2 bg-primary/5 rounded-full text-[10px] font-bold uppercase tracking-widest text-primary border border-primary/10">Casting Calls</div>
            <div className="px-4 py-2 bg-primary/5 rounded-full text-[10px] font-bold uppercase tracking-widest text-primary border border-primary/10">Film Auditions</div>
            <div className="px-4 py-2 bg-primary/5 rounded-full text-[10px] font-bold uppercase tracking-widest text-primary border border-primary/10">Acting Jobs</div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      {seoContent.faqs && seoContent.faqs.length > 0 && (
        <section className="mt-20 pt-16 border-t max-w-3xl mx-auto">
          <h3 className="text-2xl font-black tracking-tight text-center mb-8">Frequently Asked Questions</h3>
          <Accordion type="single" collapsible className="w-full">
            {seoContent.faqs.map((faq, index) => {
              const formatText = (txt: string) => {
                if (!citySlug) return txt;
                const cityName = citySlug.charAt(0).toUpperCase() + citySlug.slice(1).replace(/-/g, ' ');
                return txt
                  .replace(/in India/gi, `in ${cityName}`)
                  .replace(/India's/gi, `${cityName}'s`)
                  .replace(/across India/gi, `in ${cityName}`)
                  .replace(/Indian film/gi, `${cityName} film`);
              };
              return (
                <AccordionItem key={index} value={`faq-item-${index}`} className="border-primary/10">
                  <AccordionTrigger className="text-left font-bold text-slate-800 dark:text-slate-200 hover:no-underline">
                    {formatText(faq.question)}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground leading-relaxed">
                    {formatText(faq.answer)}
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        </section>
      )}
    </div>
  );
}
