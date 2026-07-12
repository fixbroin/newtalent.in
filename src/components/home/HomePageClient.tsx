"use client";

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { Button } from '@/components/ui/button';
import { useApplicationConfig } from '@/hooks/useApplicationConfig';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/useAuth';
import { useRouter, usePathname } from 'next/navigation';
import JsonLdScript from '@/components/shared/JsonLdScript';
import { replacePlaceholders } from '@/lib/seoUtils';
import { doc, getDoc, collection, query, where, limit, getDocs, orderBy, Timestamp, documentId, onSnapshot, addDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { GlobalWebSettings, FirestoreSEOSettings, FirestoreCity, FirestoreArea, FeaturesConfiguration, FirestoreService, FirestoreCategory, HomepageAd, AdPlacement, ArtistApplication, ConnectionRequest } from '@/types/firestore';
import Breadcrumbs from '@/components/shared/Breadcrumbs';
import type { BreadcrumbItem } from '@/types/ui';
import { useLoading } from '@/contexts/LoadingContext';
import AppImage from '@/components/ui/AppImage';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Sparkles, Clock, ListChecks, Loader2, FileText, ShoppingCart, Users, Ban, Percent, Info, UserPlus, Star } from 'lucide-react';
import AdBannerCard from '@/components/shared/AdBannerCard';
import { Carousel, CarouselContent, CarouselItem, type CarouselApi, CarouselPrevious, CarouselNext } from "@/components/ui/carousel";
import { getCache, setCache } from '@/lib/client-cache';
import Autoplay from "embla-carousel-autoplay";
import * as React from "react";
import QuantitySelector from '../shared/QuantitySelector';
import { getCartEntries, saveCartEntries, syncCartToFirestore } from '@/lib/cartManager';
import { useToast } from '@/hooks/use-toast';
import { getGuestId } from '@/lib/guestIdManager';
import { logUserActivity } from '@/lib/activityLogger';
import { Badge } from '@/components/ui/badge';
import type { HomepageData } from '@/lib/homepageUtils';
import { LazySection } from '@/components/shared/LazySection';
import CategoryCard from './CategoryCard';
import ArtistCard from '../category/ArtistCard';
import SubscriptionPlansDialog from '../category/SubscriptionPlansDialog';
import { useFeaturesConfig as useFeaturesHook } from '@/hooks/useFeaturesConfig';
import { ADMIN_EMAIL } from '@/contexts/AuthContext';

const isBot = (): boolean => {
  if (typeof window === 'undefined') return true;
  const botPatterns = [
    'bot', 'crawler', 'spider', 'crawling', 'googlebot', 'bingbot', 'yandexbot', 
    'slurp', 'duckduckbot', 'baiduspider', 'adsbot', 'mediapartners-google',
    'lighthouse', 'gtmetrix', 'pingdom', 'facebookexternalhit', 'whatsapp', 'linkedinbot'
  ];
  const ua = navigator.userAgent.toLowerCase();
  return botPatterns.some(pattern => ua.includes(pattern));
};

// Lazy load components
const HeroCarousel = dynamic(() => import('@/components/home/HeroCarousel').then((mod) => mod.HeroCarousel), {
  loading: () => <Skeleton className="h-[180px] sm:h-[250px] md:h-[300px] lg:h-[400px] xl:h-[450px] w-full rounded-lg" />,
});

const HomeCategoriesSection = dynamic(() => import('@/components/home/HomeCategoriesSection'), {
  ssr: true,
  loading: () => (
    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2 md:gap-4">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="overflow-hidden h-full flex flex-col group">
          <Skeleton className="w-full aspect-square bg-muted" />
          <div className="p-3 text-center"><Skeleton className="h-5 w-3/4 mx-auto bg-muted mt-1" /></div>
        </div>
      ))}
    </div>
  ),
});

const HomeBlogSection = dynamic(() => import('@/components/home/HomeBlogSection'), {
  loading: () => (
    <div className="flex w-full space-x-4 p-1 pb-3 overflow-hidden">
      {[...Array(4)].map((_, i) => (
        <Card key={i} className="w-[250px] sm:w-[280px] flex-shrink-0 snap-start">
          <Skeleton className="h-32 sm:h-36 w-full" />
          <CardContent className="p-2 sm:p-3">
            <Skeleton className="h-4 w-3/4 mb-2" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-1/2 mt-1" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
});

const WhyChooseUs = dynamic(() => import('@/components/home/WhyChooseUs'), {
  loading: () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-48 w-full rounded-lg" />)}
    </div>
  ),
});

const Testimonials = dynamic(() => import('@/components/home/Testimonials'), {
  loading: () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-56 w-full rounded-lg" />)}
    </div>
  ),
});



const SectionHeader: React.FC<{ 
  title: string; 
  icon?: React.ReactNode; 
  subtitle?: string; 
  centered?: boolean;
  isH1?: boolean;
}> = ({ title, icon, subtitle, centered = true, isH1 = false }) => {
  const TitleTag = isH1 ? 'h1' : 'h2';
  return (
    <div className={cn("mb-8 md:mb-12", centered ? "text-center" : "text-left")}>
      <TitleTag className={cn(
        "font-headline font-semibold text-foreground flex items-center gap-2", 
        isH1 ? "text-2xl md:text-4xl" : "text-xl md:text-3xl",
        centered ? "justify-center" : "justify-start"
      )}>
        {icon} {title}
      </TitleTag>
      {subtitle && <p className="text-muted-foreground mt-2 text-sm md:text-base max-w-2xl mx-auto">{subtitle}</p>}
    </div>
  );
};

const FEATURES_CONFIG_COLLECTION = "webSettings";
const FEATURES_CONFIG_DOC_ID = "featuresConfiguration";

const defaultFeaturesConfig: FeaturesConfiguration = {
  showMostPopularServices: true,
  showRecentlyAddedServices: true,
  showCategoryWiseServices: true,
  showBlogSection: true,
  showCustomServiceButton: false,
  homepageCategoryVisibility: {},
  ads: [],
};

interface HomePageClientProps {
  citySlug?: string;
  areaSlug?: string;
  breadcrumbItems?: BreadcrumbItem[];
  initialData?: HomepageData;
  initialH1Title?: string;
}

const ArtistCarousel: React.FC<{ 
  artists: ArtistApplication[], 
  onRequest: (artist: ArtistApplication) => void, 
  isRequesting: string | null,
  connectionsMap: Record<string, 'pending' | 'accepted' | 'rejected' | null>
}> = ({ artists, onRequest, isRequesting, connectionsMap }) => {
  const plugin = React.useRef(Autoplay({ 
    delay: 2500, 
    stopOnInteraction: false,
    playOnInit: true
  }));

  return (
    <Carousel
      opts={{
        align: "start",
        loop: true,
      }}
      plugins={[plugin.current]}
      className="w-full"
    >
      <CarouselContent className="-ml-2 md:-ml-4">
        {artists.map((artist) => (
          <CarouselItem key={artist.id} className="pl-2 md:pl-4 basis-[80%] sm:basis-1/2 md:basis-1/3 lg:basis-1/4 xl:basis-1/5">
            <div className="h-full">
              <ArtistCard 
                artist={artist} 
                onRequest={onRequest} 
                isLoading={isRequesting === artist.id}
                categorySlug={artist.workCategorySlug}
                connectionStatus={connectionsMap[artist.userId] || null}
              />
            </div>
          </CarouselItem>
        ))}
      </CarouselContent>
      <CarouselPrevious className="hidden md:flex -left-12" />
      <CarouselNext className="hidden md:flex -right-12" />
    </Carousel>
  );
};

import { sendConnectionRequestEmail } from '@/ai/flows/sendConnectionRequestEmailFlow';

export default function HomePageClient({ citySlug, areaSlug, breadcrumbItems, initialData, initialH1Title }: HomePageClientProps) {
  const { user, firestoreUser, triggerAuthRedirect } = useAuth();
  const { config: appConfig, isLoading: isLoadingAppSettings } = useApplicationConfig();
  const { toast } = useToast();
  const [isMounted, setIsMounted] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith('/admin');
  const isVisitorBot = React.useRef(isBot());
  const [structuredData, setStructuredData] = useState<Record<string, any> | null>(() => getCache<Record<string, any>>('structuredData', true) || null);
  const [seoSettings, setSeoSettings] = useState<FirestoreSEOSettings | null>(() => initialData?.seoSettings || getCache<FirestoreSEOSettings>('seoSettings', true) || null);
  const [pageH1, setPageH1] = useState<string | undefined>(() => initialH1Title || initialData?.seoSettings.homepageH1 || getCache<string>('pageH1', true) || undefined);
  const { showLoading } = useLoading();

  const [featuresConfig, setFeaturesConfig] = useState<FeaturesConfiguration>(() => initialData?.featuresConfig || getCache<FeaturesConfiguration>('featuresConfig', true) || defaultFeaturesConfig);
  const [popularArtists, setPopularArtists] = useState<ArtistApplication[]>(() => initialData?.popularArtists || getCache<ArtistApplication[]>('popularArtists', true) || []);
  const [recentArtists, setRecentArtists] = useState<ArtistApplication[]>(() => initialData?.recentArtists || getCache<ArtistApplication[]>('recentArtists', true) || []);
  const [connectionsMap, setConnectionsMap] = useState<Record<string, 'pending' | 'accepted' | 'rejected' | null>>({});
  
  const [activeAds, setActiveAds] = useState<HomepageAd[]>(() => (initialData?.featuresConfig.ads || getCache<FeaturesConfiguration>('featuresConfig', true)?.ads || []).filter(ad => ad.isActive).sort((a, b) => a.order - b.order));
  
  const [isLoadingPageData, setIsLoadingPageData] = useState(() => !initialData && !getCache('pageH1', true));
  const [isLoadingFeaturesConfig, setIsLoadingFeaturesConfig] = useState(() => !initialData && !getCache('featuresConfig', true));
  const [isLoadingPopular, setIsLoadingPopular] = useState(() => !initialData && !getCache('popularArtists', true));
  const [isLoadingRecent, setIsLoadingRecent] = useState(() => !initialData && !getCache('recentArtists', true));
  const [citiesWithAreas, setCitiesWithAreas] = useState<FirestoreCity[]>(() => initialData?.citiesWithAreas || getCache<FirestoreCity[]>('citiesWithAreas', true) || []);
  const [showSubscriptionPlans, setShowSubscriptionPlans] = useState(false);
  const [isRequesting, setIsRequesting] = useState<string | null>(null);

  const handleArtistRequest = async (artist: ArtistApplication) => {
    if (!user) {
      triggerAuthRedirect(pathname + (window.location.search || ""));
      return;
    }

    if (!isLoadingFeaturesConfig && featuresConfig?.isSubscriptionRequired && !firestoreUser?.subscriptionActive && user.email !== ADMIN_EMAIL) {
      setShowSubscriptionPlans(true);
      return;
    }

    setIsRequesting(artist.id!);
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
      toast({ title: "Request Failed", description: "Could not send request.", variant: "destructive" });
    } finally {
      setIsRequesting(null);
    }
  };

  const fetchPageSpecificData = useCallback(async () => {
    if (isVisitorBot.current && !isAdmin) {
      setIsLoadingPageData(false);
      return;
    }

    const cachedH1 = getCache<string>('pageH1');
    const cachedSeoSettings = getCache<FirestoreSEOSettings>('seoSettings');
    const cachedStructuredData = getCache<Record<string, any>>('structuredData');
    
    if (initialData && !citySlug && !areaSlug) {
      setPageH1(initialH1Title || initialData.seoSettings.homepageH1);
      setIsLoadingPageData(false);
      return;
    }

    if (cachedH1 && cachedSeoSettings && cachedStructuredData && !initialData) {
      setPageH1(cachedH1);
      setSeoSettings(cachedSeoSettings);
      setStructuredData(cachedStructuredData);
      setIsLoadingPageData(false);
      return;
    }
    
    setIsLoadingPageData(true);
    try {
      let currentSeoSettings = seoSettings;
      if (!currentSeoSettings) {
        const settingsDocRef = doc(db, 'seoSettings', 'global');
        const docSnap = await getDoc(settingsDocRef);
        if (docSnap.exists()) {
          currentSeoSettings = docSnap.data() as FirestoreSEOSettings;
          setSeoSettings(currentSeoSettings);
          setCache('seoSettings', currentSeoSettings);
        }
      }

      if (!currentSeoSettings) return;

      const fetchedSeoSettings = currentSeoSettings;
      let currentH1 = initialH1Title || fetchedSeoSettings.homepageH1;
      let fetchedCityData: FirestoreCity | null = null;
      let fetchedAreaData: FirestoreArea | null = null;
      let currentCityNameForLd = fetchedSeoSettings.structuredDataLocality;

      if (citySlug) {
        try {
          const cityQuery = query(collection(db, 'cities'), where('slug', '==', citySlug), where('isActive', '==', true), limit(1));
          const citySnap = await getDocs(cityQuery);
          if (!citySnap.empty) {
            fetchedCityData = {id: citySnap.docs[0].id, ...(citySnap.docs[0].data() as Omit<FirestoreCity, 'id'>)} as FirestoreCity;
            currentH1 = initialH1Title || fetchedCityData.h1_title || fetchedSeoSettings.homepageH1?.replace("Newtalent", fetchedCityData.name) || `Services in ${fetchedCityData.name}`;
            currentCityNameForLd = fetchedCityData.name;
          }
        } catch (e) { console.error("Error fetching city data for H1/LD:", e); }
      }

      if (citySlug && areaSlug && fetchedCityData) {
        try {
          const areaQuery = query(collection(db, 'areas'), where('slug', '==', areaSlug), where('cityId', '==', fetchedCityData.id), where('isActive', '==', true), limit(1));
          const areaSnap = await getDocs(areaQuery);
          if (!areaSnap.empty) {
            fetchedAreaData = {id: areaSnap.docs[0].id, ...(areaSnap.docs[0].data() as Omit<FirestoreArea, 'id'>)} as FirestoreArea;
            currentH1 = initialH1Title || fetchedAreaData.h1_title || `Services in ${fetchedAreaData.name}, ${fetchedCityData.name}`;
          }
        } catch (e) { console.error("Error fetching area data for H1/LD:", e); }
      }
      setPageH1(currentH1);
      setCache('pageH1', currentH1);

      const siteName = fetchedSeoSettings.siteName || 'Newtalent';
      const defaultOgImage = (process.env.NEXT_PUBLIC_BASE_URL || 'https://newtalent.in') + '/android-chrome-512x512.png';

      let webSettingsData: GlobalWebSettings | null = null;
      try {
        const webSettingsDocRef = doc(db, "webSettings", "global");
        const webSettingsSnap = await getDoc(webSettingsDocRef);
        if (webSettingsSnap.exists()) {
          webSettingsData = webSettingsSnap.data() as GlobalWebSettings;
        }
      } catch (e) { console.error("Error fetching webSettings for LD+JSON:", e); }

      const ogImage = webSettingsData?.websiteIconUrl || webSettingsData?.logoUrl || fetchedSeoSettings.structuredDataImage || defaultOgImage;
      const pageUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://newtalent.in';
      let specificPageUrl = pageUrl;
      if (citySlug && areaSlug) specificPageUrl = `${pageUrl}/${citySlug}/${areaSlug}`;
      else if (citySlug) specificPageUrl = `${pageUrl}/${citySlug}`;

      const ldData: Record<string, any> = {
        '@context': 'https://schema.org',
        '@type': fetchedSeoSettings.structuredDataType || 'LocalBusiness',
        name: fetchedAreaData?.name ? `${siteName} - ${fetchedAreaData.name}, ${fetchedCityData?.name}` : (fetchedCityData?.name ? `${siteName} - ${fetchedCityData.name}` : (fetchedSeoSettings.structuredDataName || siteName)),
        image: ogImage,
        url: specificPageUrl,
        telephone: webSettingsData?.contactMobile || fetchedSeoSettings.structuredDataTelephone,
        aggregateRating: {
          "@type": "AggregateRating",
          "ratingValue": "4.8",
          "reviewCount": "1250"
        }
      };
      if (webSettingsData?.contactEmail) ldData.email = webSettingsData.contactEmail;

      const addressData: Record<string, any> = { '@type': 'PostalAddress' };
      if (fetchedAreaData?.name) addressData.addressLocality = fetchedAreaData.name;
      else if (fetchedCityData?.name) addressData.addressLocality = fetchedCityData.name;
      else if (fetchedSeoSettings.structuredDataLocality) addressData.addressLocality = fetchedSeoSettings.structuredDataLocality;

      if (fetchedCityData?.name && fetchedAreaData?.name) addressData.addressRegion = fetchedCityData.name;
      else if (fetchedSeoSettings.structuredDataRegion) addressData.addressRegion = fetchedSeoSettings.structuredDataRegion;

      if (fetchedSeoSettings.structuredDataStreetAddress) addressData.streetAddress = fetchedSeoSettings.structuredDataStreetAddress;
      if (fetchedSeoSettings.structuredDataPostalCode) addressData.postalCode = fetchedSeoSettings.structuredDataPostalCode;
      addressData.addressCountry = fetchedSeoSettings.structuredDataCountry || 'IN';

      if (Object.keys(addressData).length > 1) {
        ldData.address = addressData;
      }

      if (fetchedSeoSettings.socialProfileUrls) {
        const sameAsUrls = Object.values(fetchedSeoSettings.socialProfileUrls).filter(url => url && url.trim() !== '');
        if (sameAsUrls.length > 0) {
          ldData.sameAs = sameAsUrls;
        }
      }
      setStructuredData(ldData);
      setCache('structuredData', ldData);
      setIsLoadingPageData(false);
    } catch (error) {
      console.error("Error in fetchPageSpecificData:", error);
      setIsLoadingPageData(false);
    }
  }, [citySlug, areaSlug, initialData, seoSettings, initialH1Title]);

  const setupRealtimeListeners = useCallback(() => {
    if (isVisitorBot.current) {
      setIsLoadingFeaturesConfig(false);
      setIsLoadingPopular(false);
      setIsLoadingRecent(false);
      return () => {};
    }

    const configDocRef = doc(db, FEATURES_CONFIG_COLLECTION, FEATURES_CONFIG_DOC_ID);
    const unsubscribeConfig = onSnapshot(configDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const config = { ...defaultFeaturesConfig, ...(docSnap.data() as Partial<FeaturesConfiguration>) };
        setFeaturesConfig(config);
        setCache('featuresConfig', config, true);
        setActiveAds((config.ads || []).filter(ad => ad.isActive).sort((a, b) => a.order - b.order));
        setIsLoadingFeaturesConfig(false);
      }
    }, (error) => console.error("Error listening to features config:", error));

    const popularQuery = query(collection(db, "ArtistApplications"), where("status", "==", "approved"), limit(10));
    const unsubscribePopular = onSnapshot(popularQuery, (snapshot) => {
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as ArtistApplication));
      setPopularArtists(data);
      setCache('popularArtists', data, true);
      setIsLoadingPopular(false);
    }, (error) => console.error("Error listening to popular artists:", error));

    const recentQuery = query(collection(db, "ArtistApplications"), where("status", "==", "approved"), orderBy("updatedAt", "desc"), limit(10));
    const unsubscribeRecent = onSnapshot(recentQuery, (snapshot) => {
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as ArtistApplication));
      setRecentArtists(data);
      setCache('recentArtists', data, true);
      setIsLoadingRecent(false);
    }, (error) => console.error("Error listening to recent artists:", error));

    return () => {
      unsubscribeConfig();
      unsubscribePopular();
      unsubscribeRecent();
    };
  }, []);

  useEffect(() => {
    setIsMounted(true);
    if (initialData) {
      setCache('featuresConfig', initialData.featuresConfig, true);
      setCache('popularArtists', initialData.popularArtists, true);
      setCache('recentArtists', initialData.recentArtists, true);
      setCache('seoSettings', initialData.seoSettings, true);
      setCache('citiesWithAreas', initialData.citiesWithAreas, true);
    }
    
    fetchPageSpecificData();

    const cleanupListeners = setupRealtimeListeners();

    return () => {
      if (cleanupListeners) cleanupListeners();
    };
  }, [initialData, fetchPageSpecificData, setupRealtimeListeners]);

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
        newMap[data.receiverId] = data.status as any;
      });
      setConnectionsMap(newMap);
    });

    return () => unsubscribe();
  }, [user]);

  const handleSimpleNavigation = useCallback((intendedHref: string) => {
    showLoading();
    router.push(intendedHref);
  }, [router, showLoading]);

  const handleViewAllCategoriesClick = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    handleSimpleNavigation("/categories");
  }, [handleSimpleNavigation]);

  const handleBookServiceCtaClick = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    handleSimpleNavigation("/artist-registration");
  }, [handleSimpleNavigation]);

  const displayHeroCarousel = !isLoadingAppSettings && (appConfig.enableHeroCarousel ?? true);
  const finalH1 = pageH1 || initialH1Title || (citySlug || areaSlug 
    ? `Professional Home Services in ${areaSlug || citySlug}`.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
    : "Discover Our Services");
  
  const renderAdsByPlacement = (placement: AdPlacement) => {
    const adsForPlacement = activeAds.filter(ad => ad.placement === placement);
    if (adsForPlacement.length === 0) return null;
    return (
      <div className="container mx-auto px-0 md:px-4 my-2 md:my-4 space-y-2">
        {adsForPlacement.map(ad => <AdBannerCard key={ad.id} ad={ad} />)}
      </div>
    );
  };

  const renderArtistGrid = (title: string, artists: ArtistApplication[], icon: React.ReactNode, isLoadingSection: boolean) => {
    if (isLoadingSection && artists.length === 0) {
      return (
        <section className="py-8 md:py-10">
          <div className="container mx-auto px-4">
            <h2 className="text-2xl md:text-3xl font-headline font-semibold text-center mb-8 md:mb-12 text-foreground flex items-center justify-center">
              {icon} {title}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-80 w-full rounded-2xl" />
              ))}
            </div>
          </div>
        </section>
      );
    }
    if (artists.length === 0 && !isLoadingSection) return null; 
    return (
      <section className="py-8 md:py-10">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl md:text-3xl font-headline font-semibold text-center mb-8 md:mb-12 text-foreground flex items-center justify-center">
            {icon} {title}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8">
            {artists.slice(0, 8).map((artist) => (
              <ArtistCard 
                key={artist.id} 
                artist={artist} 
                onRequest={handleArtistRequest} 
                isLoading={isRequesting === artist.id}
                categorySlug={artist.workCategorySlug}
                connectionStatus={connectionsMap[artist.userId] || null}
              />
            ))}
          </div>
        </div>
      </section>
    );
  };
  
  const renderArtistSection = (title: string, artists: ArtistApplication[], icon: React.ReactNode, isLoadingSection: boolean, placementForAdsAfter?: AdPlacement) => {
    if (isLoadingSection && artists.length === 0) {
      return (
        <section className="py-8 md:py-10">
          <div className="container mx-auto px-4">
            <h2 className="text-2xl md:text-3xl font-headline font-semibold text-center mb-8 md:mb-12 text-foreground flex items-center justify-center">
              {icon} {title}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-80 w-full rounded-2xl" />
              ))}
            </div>
          </div>
        </section>
      );
    }
    if (artists.length === 0 && !isLoadingSection) return null; 
    return (
      <>
        <section className="py-8 md:py-10">
          <div className="container mx-auto px-4">
            <h2 className="text-2xl md:text-3xl font-headline font-semibold text-center mb-8 md:mb-12 text-foreground flex items-center justify-center">
              {icon} {title}
            </h2>
            <ArtistCarousel 
              artists={artists} 
              onRequest={handleArtistRequest} 
              isRequesting={isRequesting}
              connectionsMap={connectionsMap}
            />
          </div>
        </section>
        {placementForAdsAfter && renderAdsByPlacement(placementForAdsAfter)}
      </>
    );
  };

  if (!isMounted || isLoadingPageData) {
    return (
      <div className="flex flex-col">
        <div className="container mx-auto px-4 pt-4 md:pt-6 mb-4 md:mb-6">
          <Skeleton className="h-5 w-1/3" />
        </div>
        <section className="py-6 md:py-10">
          <div className="container mx-auto px-4">
            <Skeleton className="h-[180px] sm:h-[250px] md:h-[300px] lg:h-[400px] xl:h-[450px] w-full rounded-lg" />
          </div>
        </section>
        <div className="container mx-auto px-4 my-6 md:my-8"><Skeleton className="h-24 w-full rounded-lg" /></div>
        <section className="py-8 md:py-10 bg-secondary/30">
          <div className="container mx-auto px-4">
            <div className="text-center mb-8 md:mb-12"><Skeleton className="h-8 w-1/2 mx-auto mb-2" /><Skeleton className="h-4 w-3/4 mx-auto" /></div>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2 md:gap-4">
              {[...Array(6)].map((_, i) => (<div key={i} className="overflow-hidden h-full flex flex-col group"><Skeleton className="w-full aspect-square bg-muted" /><div className="p-3 text-center"><Skeleton className="h-5 w-3/4 mx-auto bg-muted mt-1" /></div></div>))}
            </div>
          </div>
        </section>
      </div>
    );
  }

  return (
    <>
      {structuredData && <JsonLdScript data={structuredData} idSuffix={citySlug || areaSlug || 'homepage'} />}
      <div className="flex flex-col">
        {breadcrumbItems && breadcrumbItems.length > 0 && (
          <div className="container mx-auto px-4 pt-4 md:pt-6">
            <Breadcrumbs items={breadcrumbItems} />
          </div>
        )}
        {displayHeroCarousel && (
          <section className="py-6 md:py-10">
            <div className="container mx-auto px-4 overflow-hidden">
              <HeroCarousel />
            </div>
          </section>
        )}
        {renderAdsByPlacement('AFTER_HERO_CAROUSEL')}

        <section className="py-8 md:py-10 bg-secondary/30">
          <div className="container mx-auto px-4">
            <SectionHeader 
              title={finalH1} 
              isH1={true}
              subtitle={`Explore verified artists across categories like acting, singing, direction, and more.${citySlug ? ` in ${citySlug.charAt(0).toUpperCase() + citySlug.slice(1).replace(/-/g, ' ')}` : ''}${areaSlug ? `, ${areaSlug.charAt(0).toUpperCase() + areaSlug.slice(1).replace(/-/g, ' ')}` : ''}.`}
            />
            <HomeCategoriesSection />
            
            <div className="text-center mt-8 md:mt-12">
              <Button
                variant="outline"
                size="lg"
                onClick={handleViewAllCategoriesClick}
              >
                View All Categories
              </Button>
            </div>
          </div>
        </section>
        {renderAdsByPlacement('AFTER_CATEGORY_SECTIONS')}

        <LazySection>
          {renderArtistSection("New Talents Recently Joined", recentArtists, <Clock className="h-6 w-6 text-primary" />, isLoadingRecent, 'AFTER_RECENTLY_ADDED_SERVICES')}
        </LazySection>
        
        {featuresConfig.showMostPopularServices && (
          <LazySection>
            {renderArtistSection("Featured Artists", popularArtists, <Sparkles className="h-6 w-6 text-yellow-500" />, isLoadingPopular, 'AFTER_POPULAR_SERVICES')}
          </LazySection>
        )}

        <LazySection>
          <section className="py-8 md:py-10">
            <div className="container mx-auto px-4">
              <SectionHeader title="Why Choose Newtalent.in" />
              <WhyChooseUs />
            </div>
          </section>
        </LazySection>

        <LazySection>
          <section className="py-8 md:py-10 bg-secondary/30">
            <div className="container mx-auto px-4">
              <SectionHeader title="What Our Community Says" />
              <Testimonials />
            </div>
          </section>
        </LazySection>
        
        {featuresConfig.showBlogSection && (
          <LazySection>
            <HomeBlogSection />
          </LazySection>
        )}
        
        {renderAdsByPlacement('BEFORE_FOOTER_CTA')}
        <section className="py-8 md:py-10 text-center bg-primary text-primary-foreground">
          <div className="container mx-auto px-4">
            <h2 className="text-2xl md:text-3xl font-headline font-semibold mb-4">
              Start Your Journey in the Entertainment Industry
            </h2>
            <p className="text-lg mb-6 max-w-xl mx-auto">
              Create your artist profile, get discovered, or connect with talented creators across India.
            </p>
            <Button
              size="lg"
              variant="secondary"
              className="bg-background text-primary hover:bg-background/90"
              onClick={handleBookServiceCtaClick}
            >
              Create Artist Profile
            </Button>
          </div>
        </section>

        {/* Subscription Plans Modal */}
        <SubscriptionPlansDialog 
          open={showSubscriptionPlans} 
          onOpenChange={setShowSubscriptionPlans}
          onSuccess={() => toast({ title: "Success", description: "You can now connect with artists!" })}
        />

        {/* Rich SEO Content Section for Local Dominance */}
        <section className="container mx-auto px-4 mt-32 mb-20">
          <div className="bg-primary/5 rounded-[3rem] p-10 md:p-20 border border-primary/10">
            <div className="max-w-4xl mx-auto text-center space-y-8">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-full text-xs font-black uppercase tracking-widest text-primary shadow-sm">
                <Star className="w-3 h-3 fill-primary" /> India's Leading Film Network
              </div>
              <h2 className="text-3xl md:text-6xl font-black tracking-tight leading-tight">
                Building the Future of {citySlug ? citySlug.charAt(0).toUpperCase() + citySlug.slice(1) : 'Indian'} Cinema
              </h2>
              <div className="prose prose-lg max-w-none text-muted-foreground leading-relaxed">
                <p>
                  Newtalent is more than just a casting website; it is a professional social network designed for the pulse of the {citySlug ? citySlug.charAt(0).toUpperCase() + citySlug.slice(1) : 'Indian'} film industry. In {citySlug ? citySlug.charAt(0).toUpperCase() + citySlug.slice(1) : 'Bangalore and across the country'}, we are connecting directors with dancers, cinematographers with models, and singers with producers through a verified, secure platform.
                </p>
                <p>
                  Our mission is to foster meaningful professional relationships within the cinematic community. By utilizing our advanced "Request & Accept" connection model, we ensure that every interaction on our platform is intentional and high-value. Whether you are an established professional or a rising star, Newtalent provides the tools to showcase your portfolio and grow your industry presence.
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-8">
                 <div className="p-6 bg-white rounded-3xl shadow-sm border border-primary/5">
                    <p className="text-2xl font-black text-primary mb-1">100%</p>
                    <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Verified Artists</p>
                 </div>
                 <div className="p-6 bg-white rounded-3xl shadow-sm border border-primary/5">
                    <p className="text-2xl font-black text-primary mb-1">Secure</p>
                    <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Privacy First</p>
                 </div>
                 <div className="p-6 bg-white rounded-3xl shadow-sm border border-primary/5">
                    <p className="text-2xl font-black text-primary mb-1">No. 1</p>
                    <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Growth Network</p>
                 </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
