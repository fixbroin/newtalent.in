import PublicProfileClient from '@/components/artist/PublicProfileClient';
import { adminDb } from '@/lib/firebaseAdmin';
import type { ArtistApplication, FirestoreCategory } from '@/types/firestore';
import { notFound } from 'next/navigation';
import type { Metadata, ResolvingMetadata } from 'next';
import { serializeFirestoreData } from '@/lib/serializeUtils';
import { getBaseUrl } from '@/lib/config';
import { replacePlaceholders } from '@/lib/seoUtils';
import { getGlobalSEOSettings } from '@/lib/seoServerUtils';
import { cache } from 'react';
import { unstable_cache } from 'next/cache';
import JsonLdScript from '@/components/shared/JsonLdScript';

export const revalidate = false;

interface PageProps {
  params: Promise<{ slug: string; username: string }>;
}

const getArtistData = cache(async (username: string, categorySlug: string): Promise<ArtistApplication | null> => {
  return unstable_cache(
    async () => {
      try {
        const cleanUsername = username.toLowerCase();
        
        // 1. Fetch category to verify slug
        const catRef = adminDb.collection('adminCategories').where('slug', '==', categorySlug).limit(1);
        const catSnapshot = await catRef.get();
        if (catSnapshot.empty) return null;
        const categoryId = catSnapshot.docs[0].id;

        // 2. Fetch artist with matching username and categoryId
        const artistsRef = adminDb.collection('ArtistApplications');
        const q = artistsRef
            .where('username', '==', cleanUsername)
            .where('workCategoryId', '==', categoryId)
            .where('status', '==', 'approved')
            .limit(1);
        const snapshot = await q.get();
        
        if (snapshot.empty) return null;
        
        const doc = snapshot.docs[0];
        return { id: doc.id, ...serializeFirestoreData<any>(doc.data()) } as ArtistApplication;
      } catch (error) {
        console.error("Error fetching artist data:", error);
        return null;
      }
    },
    [`artist-profile-${username}-${categorySlug}`],
    { revalidate: false, tags: ['artists', `artist-${username}`, `category-${categorySlug}`, 'global-cache'] }
  )();
});

export async function generateMetadata(
  { params }: PageProps,
  parent: ResolvingMetadata
): Promise<Metadata> {
  const { slug, username } = await params;
  const artist = await getArtistData(username, slug);
  const seoSettings = await getGlobalSEOSettings();
  const appBaseUrl = getBaseUrl();
  
  if (!artist) return { title: 'Artist Not Found | Newtalent' };

  const placeholderData = { 
    serviceName: artist.fullName, 
    categoryName: artist.workCategoryName,
    cityName: artist.city || 'Bangalore'
  };

  const title = replacePlaceholders(seoSettings.servicePageTitlePattern, placeholderData) || `${artist.fullName} | ${artist.workCategoryName} on Newtalent`;
  const description = replacePlaceholders(seoSettings.servicePageDescriptionPattern, placeholderData) || artist.bio || `View ${artist.fullName}'s professional portfolio and connect with them.`;
  const keywords = replacePlaceholders(seoSettings.servicePageKeywordsPattern, placeholderData).split(',').map(k => k.trim());
  
  // Try to find the best image for sharing
  const rawOgImage = artist.profilePhotoUrl || artist.faceCloseUpUrl || artist.midShotUrl || `/default-image.png`;
  const ogImage = rawOgImage.startsWith('http') ? rawOgImage : `${appBaseUrl}${rawOgImage.startsWith('/') ? '' : '/'}${rawOgImage}`;

  return {
    title: title,
    description: description,
    keywords: keywords.length > 0 ? keywords : undefined,
    robots: {
      index: true,
      follow: true,
    },
    alternates: {
      canonical: `${appBaseUrl}/category/${slug}/${username}`,
    },
    openGraph: {
      title: `${artist.fullName} - ${artist.workCategoryName}`,
      description: description,
      url: `/category/${slug}/${username}`,
      images: [{ 
        url: ogImage, 
        width: 1200, 
        height: 630, 
        alt: artist.fullName 
      }],
      type: 'website',
      siteName: seoSettings.siteName || 'Newtalent',
    },
    twitter: {
      card: 'summary_large_image',
      title: title,
      description: description,
      images: [ogImage],
    }
  };
}

const getRelatedArtists = cache(async (categorySlug: string, currentUsername: string): Promise<ArtistApplication[]> => {
  return unstable_cache(
    async () => {
      try {
        const catRef = adminDb.collection('adminCategories').where('slug', '==', categorySlug).limit(1);
        const catSnapshot = await catRef.get();
        if (catSnapshot.empty) return [];
        const categoryId = catSnapshot.docs[0].id;

        const artistsRef = adminDb.collection('ArtistApplications');
        const q = artistsRef
            .where('workCategoryId', '==', categoryId)
            .where('status', '==', 'approved')
            .limit(10);
        const snapshot = await q.get();
        
        return snapshot.docs
          .map(doc => ({ id: doc.id, ...serializeFirestoreData<any>(doc.data()) } as ArtistApplication))
          .filter(a => a.username !== currentUsername.toLowerCase())
          .slice(0, 6);
      } catch (error) {
        console.error("Error fetching related artists:", error);
        return [];
      }
    },
    [`related-artists-${categorySlug}-${currentUsername}`],
    { revalidate: false, tags: ['artists', `category-${categorySlug}`, 'global-cache'] }
  )();
});

export default async function ArtistProfileUnderCategoryPage({ params }: PageProps) {
  const { slug, username } = await params;
  const [artist, relatedArtists] = await Promise.all([
    getArtistData(username, slug),
    getRelatedArtists(slug, username)
  ]);
  
  if (!artist) {
    notFound();
  }

  const appBaseUrl = getBaseUrl();
  const personSchema = {
    "@context": "https://schema.org",
    "@type": "Person",
    "name": artist.fullName,
    "jobTitle": artist.workCategoryName,
    "address": {
      "@type": "PostalAddress",
      "addressLocality": artist.city || "Bangalore",
      "addressRegion": "Karnataka",
      "addressCountry": "IN"
    },
    "url": `${appBaseUrl}/category/${slug}/${username}`,
    "image": artist.profilePhotoUrl || `${appBaseUrl}/default-image.png`,
    "description": artist.bio || `Professional ${artist.workCategoryName} based in ${artist.city || 'India'}. Connect with ${artist.fullName} on Newtalent.`
  };

  return (
    <>
      <JsonLdScript data={personSchema} idSuffix={`artist-${artist.id}`} />
      <PublicProfileClient artist={artist} relatedArtists={relatedArtists} categorySlug={slug} />
    </>
  );
}
