
import { notFound } from 'next/navigation';
import { adminDb } from '@/lib/firebaseAdmin';
import { getCategoryFullData } from '@/lib/homepageUtils';
import { getBaseUrl } from '@/lib/config';
import { serializeFirestoreData } from '@/lib/serializeUtils';
import type { FirestoreCity, FirestoreArea, FirestoreCategory, FirestoreSEOSettings, AreaCategorySeoSetting } from '@/types/firestore';
import CategoryPageClient from '@/components/category/CategoryPageClient';
import JsonLdScript from '@/components/shared/JsonLdScript';
import BreadcrumbSchema from '@/components/shared/BreadcrumbSchema';
import type { Metadata } from 'next';
import { replacePlaceholders } from '@/lib/seoUtils';
import { getGlobalSEOSettings } from '@/lib/seoServerUtils';
import { cache } from 'react';
import { unstable_cache } from 'next/cache';

export const dynamic = 'force-dynamic';
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

const getAreaData = cache(async (slug: string, cityId: string): Promise<FirestoreArea | null> => {
    return unstable_cache(
        async () => {
            try {
                const snapshot = await adminDb.collection('areas').where('slug', '==', slug).where('cityId', '==', cityId).where('isActive', '==', true).limit(1).get();
                if (snapshot.empty) return null;
                return { id: snapshot.docs[0].id, ...serializeFirestoreData<any>(snapshot.docs[0].data()) } as FirestoreArea;
            } catch (error) {
                console.error(`Error fetching area data:`, error);
                return null;
            }
        },
        [`area-data-${cityId}-${slug}`],
        { tags: ['areas', `area-${slug}`, 'global-cache'] }
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

const getAreaCategorySeoOverride = cache(async (cityId: string, areaId: string, categoryId: string): Promise<AreaCategorySeoSetting | null> => {
    return unstable_cache(
        async () => {
            try {
                const snapshot = await adminDb.collection('areaCategorySeoSettings')
                    .where('cityId', '==', cityId)
                    .where('areaId', '==', areaId)
                    .where('categoryId', '==', categoryId)
                    .where('isActive', '==', true)
                    .limit(1)
                    .get();
                if (snapshot.empty) return null;
                return { id: snapshot.docs[0].id, ...serializeFirestoreData<any>(snapshot.docs[0].data()) } as AreaCategorySeoSetting;
            } catch (error) {
                console.error(`Error fetching area-category SEO override:`, error);
                return null;
            }
        },
        [`area-category-seo-${cityId}-${areaId}-${categoryId}`],
        { tags: ['global-cache'] }
    )();
});

export async function generateMetadata(
    { params }: { params: Promise<{ citySlug: string, areaSlug: string, slug: string }> }
): Promise<Metadata> {
    const { citySlug, areaSlug, slug } = await params;
    const [city, category] = await Promise.all([getCityData(citySlug), getCategoryData(slug)]);
    if (!city || !category) return {};
    const area = await getAreaData(areaSlug, city.id);
    if (!area) return {};

    const [seoSettings, override] = await Promise.all([
        getGlobalSEOSettings(),
        getAreaCategorySeoOverride(city.id, area.id, category.id)
    ]);
    const appBaseUrl = getBaseUrl();
    const placeholderData = { cityName: city.name, areaName: area.name, categoryName: category.name };

    const title = override?.meta_title || replacePlaceholders(seoSettings.areaCategoryPageTitlePattern, placeholderData) || `${category.name} in ${area.name}, ${city.name} | Newtalent`;
    const description = override?.meta_description || replacePlaceholders(seoSettings.areaCategoryPageDescriptionPattern, placeholderData) || `Professional ${category.name} in ${area.name}, ${city.name}.`;
    const keywords = (override?.meta_keywords || replacePlaceholders(seoSettings.areaCategoryPageKeywordsPattern, placeholderData) || "").split(',').map(k => k.trim()).filter(k => k);

    return {
        title,
        description,
        keywords: keywords.length > 0 ? keywords : undefined,
        robots: { index: true, follow: true },
        alternates: { canonical: `${appBaseUrl}/${citySlug}/${areaSlug}/category/${slug}` },
        openGraph: {
            title,
            description,
            url: `/${citySlug}/${areaSlug}/category/${slug}`,
            images: [{ url: `${appBaseUrl}/android-chrome-512x512.png`, width: 512, height: 512 }],
            type: 'website',
        }
    };
}

export default async function AreaCategoryPage({ params }: { params: Promise<{ citySlug: string, areaSlug: string, slug: string }> }) {
    const { citySlug, areaSlug, slug } = await params;
    
    const [city, categoryData] = await Promise.all([
        getCityData(citySlug),
        getCategoryData(slug)
    ]);

    if (!city || !categoryData) notFound();
    const area = await getAreaData(areaSlug, city.id);
    if (!area) notFound();

    const [fullCategoryData, seoSettings, override] = await Promise.all([
        getCategoryFullData(slug),
        getGlobalSEOSettings(),
        getAreaCategorySeoOverride(city.id, area.id, categoryData.id)
    ]);

    const placeholderData = { cityName: city.name, areaName: area.name, categoryName: categoryData.name };
    const h1Title = override?.h1_title || replacePlaceholders(seoSettings.areaCategoryPageH1Pattern, placeholderData) || `Top ${categoryData.name} in ${area.name}, ${city.name}`;

    const breadcrumbItems = [
        { label: 'Home', href: '/' },
        { label: city.name, href: `/${citySlug}` },
        { label: area.name, href: `/${citySlug}/${areaSlug}` },
        { label: categoryData.name }
    ];

    const schema = {
        "@context": "https://schema.org",
        "@type": "Service",
        "name": `${categoryData.name} in ${area.name}, ${city.name}`,
        "description": `Professional ${categoryData.name} services in ${area.name}, ${city.name}.`,
        "provider": {
            "@type": "LocalBusiness",
            "name": "Newtalent",
            "address": {
                "@type": "PostalAddress",
                "addressLocality": area.name,
                "addressRegion": city.name,
                "addressCountry": "IN"
            }
        }
    };

    return (
        <>
            <JsonLdScript data={schema} idSuffix={`area-category-${city.id}-${area.id}-${categoryData.id}`} />
            <BreadcrumbSchema items={breadcrumbItems} />
            <CategoryPageClient 
                categorySlug={slug} 
                citySlug={citySlug}
                areaSlug={areaSlug}
                breadcrumbItems={breadcrumbItems} 
                initialData={fullCategoryData || undefined}
                initialH1Title={h1Title}
            />
        </>
    );
}
