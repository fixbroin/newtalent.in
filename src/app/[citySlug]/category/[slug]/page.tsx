
import { notFound } from 'next/navigation';
import { adminDb } from '@/lib/firebaseAdmin';
import { getCategoryFullData } from '@/lib/homepageUtils';
import { getBaseUrl } from '@/lib/config';
import { serializeFirestoreData } from '@/lib/serializeUtils';
import type { FirestoreCity, FirestoreCategory, FirestoreSEOSettings } from '@/types/firestore';
import CategoryPageClient from '@/components/category/CategoryPageClient';
import JsonLdScript from '@/components/shared/JsonLdScript';
import BreadcrumbSchema from '@/components/shared/BreadcrumbSchema';
import type { Metadata } from 'next';
import { replacePlaceholders } from '@/lib/seoUtils';
import { getGlobalSEOSettings } from '@/lib/seoServerUtils';
import { cache } from 'react';
import { unstable_cache } from 'next/cache';

export const revalidate = false;

const getCityData = cache(async (slug: string): Promise<FirestoreCity | null> => {
    return unstable_cache(
        async () => {
            try {
                const snapshot = await adminDb.collection('cities').where('slug', '==', slug).where('isActive', '==', true).limit(1).get();
                if (snapshot.empty) return null;
                return { id: snapshot.docs[0].id, ...serializeFirestoreData<any>(snapshot.docs[0].data()) } as FirestoreCity;
            } catch (error) {
                console.error(`Error fetching city data:`, error);
                return null;
            }
        },
        [`city-data-${slug}`],
        { tags: ['cities', `city-${slug}`, 'global-cache'] }
    )();
});

const getCategoryData = cache(async (slug: string): Promise<FirestoreCategory | null> => {
    return unstable_cache(
        async () => {
            try {
                const snapshot = await adminDb.collection('adminCategories').where('slug', '==', slug).where('isActive', '==', true).limit(1).get();
                if (snapshot.empty) return null;
                return { id: snapshot.docs[0].id, ...serializeFirestoreData<any>(snapshot.docs[0].data()) } as FirestoreCategory;
            } catch (error) {
                console.error(`Error fetching category data:`, error);
                return null;
            }
        },
        [`category-summary-${slug}`],
        { tags: ['categories', `category-summary-${slug}`, 'global-cache'] }
    )();
});

export async function generateMetadata(
    { params }: { params: Promise<{ citySlug: string, slug: string }> }
): Promise<Metadata> {
    const { citySlug, slug } = await params;
    const [city, category] = await Promise.all([getCityData(citySlug), getCategoryData(slug)]);
    if (!city || !category) return {};

    const seoSettings = await getGlobalSEOSettings();
    const appBaseUrl = getBaseUrl();
    const placeholderData = { cityName: city.name, categoryName: category.name };

    // Use specific city-category override if exists, or global pattern
    const title = replacePlaceholders(seoSettings.cityCategoryPageTitlePattern, placeholderData) || `${category.name} in ${city.name} | Newtalent`;
    const description = replacePlaceholders(seoSettings.cityCategoryPageDescriptionPattern, placeholderData) || `Find and hire top ${category.name} in ${city.name}.`;
    const keywords = (replacePlaceholders(seoSettings.cityCategoryPageKeywordsPattern, placeholderData) || "").split(',').map(k => k.trim()).filter(k => k);

    return {
        title,
        description,
        keywords: keywords.length > 0 ? keywords : undefined,
        robots: { index: true, follow: true },
        alternates: { canonical: `${appBaseUrl}/${citySlug}/category/${slug}` },
        openGraph: {
            title,
            description,
            url: `/${citySlug}/category/${slug}`,
            images: [{ url: `${appBaseUrl}/android-chrome-512x512.png`, width: 512, height: 512 }],
            type: 'website',
        }
    };
}

export default async function CityCategoryPage({ params }: { params: Promise<{ citySlug: string, slug: string }> }) {
    const { citySlug, slug } = await params;
    
    const [city, categoryData] = await Promise.all([
        getCityData(citySlug),
        getCategoryData(slug)
    ]);

    if (!city || !categoryData) {
        notFound();
    }

    const fullCategoryData = await getCategoryFullData(slug);
    const appBaseUrl = getBaseUrl();
    const breadcrumbItems = [
        { label: 'Home', href: '/' },
        { label: city.name, href: `/${citySlug}` },
        { label: categoryData.name }
    ];

    const schema = {
        "@context": "https://schema.org",
        "@type": "Service",
        "name": `${categoryData.name} in ${city.name}`,
        "description": `Professional ${categoryData.name} services in ${city.name}.`,
        "provider": {
            "@type": "LocalBusiness",
            "name": "Newtalent",
            "address": {
                "@type": "PostalAddress",
                "addressLocality": city.name,
                "addressCountry": "IN"
            }
        }
    };

    return (
        <>
            <JsonLdScript data={schema} idSuffix={`city-category-${city.id}-${categoryData.id}`} />
            <BreadcrumbSchema items={breadcrumbItems} />
            <CategoryPageClient 
                categorySlug={slug} 
                citySlug={citySlug}
                breadcrumbItems={breadcrumbItems} 
                initialData={fullCategoryData || undefined}
            />
        </>
    );
}
