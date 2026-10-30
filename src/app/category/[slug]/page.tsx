import CategoryPageClient from '@/components/category/CategoryPageClient';
import { adminDb } from '@/lib/firebaseAdmin';
import type { FirestoreCategory, FirestoreService } from '@/types/firestore';
import type { BreadcrumbItem } from '@/types/ui';
import JsonLdScript from '@/components/shared/JsonLdScript';
import BreadcrumbSchema from '@/components/shared/BreadcrumbSchema';
import { getBaseUrl } from '@/lib/config';
import { getCategoryFullData, getAggregateRating } from '@/lib/homepageUtils';
import type { Metadata, ResolvingMetadata } from 'next';
import { replacePlaceholders } from '@/lib/seoUtils';
import { getGlobalSEOSettings } from '@/lib/seoServerUtils';
import { cache } from 'react';
import { unstable_cache } from 'next/cache';

import { serializeFirestoreData } from '@/lib/serializeUtils';
import { getCategorySeoContent } from '@/lib/categorySeoData';

export const dynamic = 'force-dynamic';
export const revalidate = false;

interface CategoryPageProps {
  params: Promise<{ slug: string }>;
}

const getCategoryDataForPage = cache(async (slug: string): Promise<{category: FirestoreCategory} | null> => {
  return unstable_cache(
    async () => {
      try {
        const catRef = adminDb.collection('adminCategories');
        const q = catRef.where('slug', '==', slug).where('isActive', '==', true).limit(1);
        const snapshot = await q.get();
        if (snapshot.empty) return null;
        const doc = snapshot.docs[0];
        const category = { id: doc.id, ...serializeFirestoreData<any>(doc.data()) } as FirestoreCategory;

        return { category };
      } catch (error) {
        console.error('Error fetching category data for page component:', error);
        return null;
      }
    },
    [`category-summary-${slug}`],
    { tags: ['categories', `category-summary-${slug}`, 'global-cache'] }
  )();
});

export async function generateMetadata(
  { params }: CategoryPageProps,
  parent: ResolvingMetadata
): Promise<Metadata> {
  const { slug } = await params;
  const data = await getCategoryDataForPage(slug);
  
  if (!data) return {};

  const seoSettings = await getGlobalSEOSettings();
  const appBaseUrl = getBaseUrl();
  const placeholderData = { categoryName: data.category.name };

  const title = replacePlaceholders(data.category.metaTitle || seoSettings.categoryPageTitlePattern, placeholderData) || `${data.category.name} Services | Newtalent`;
  const description = replacePlaceholders(data.category.metaDescription || seoSettings.categoryPageDescriptionPattern, placeholderData) || `Professional ${data.category.name} services near you.`;
  const keywords = (replacePlaceholders(data.category.metaKeywords || seoSettings.categoryPageKeywordsPattern, placeholderData) || `${data.category.name}, best ${data.category.name}`).split(',').map(k => k.trim()).filter(k => k);

  const rawOgImage = data.category.imageUrl || seoSettings.structuredDataImage || `/default-image.png`;
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
      canonical: `${appBaseUrl}/category/${slug}`,
    },
    openGraph: {
      title: title,
      description: description,
      url: `/category/${slug}`,
      images: [{ url: ogImage, width: 1200, height: 630, alt: title }],
      type: 'website',
    },
  };
}

const getOtherCategories = cache(async (currentSlug: string): Promise<FirestoreCategory[]> => {
  return unstable_cache(
    async () => {
      try {
        const categoriesSnapshot = await adminDb.collection('adminCategories')
          .where('isActive', '==', true)
          .orderBy('order', 'asc')
          .limit(10)
          .get();
        return categoriesSnapshot.docs
          .map(doc => ({ id: doc.id, ...serializeFirestoreData<any>(doc.data()) } as FirestoreCategory))
          .filter(c => c.slug !== currentSlug);
      } catch (error) {
        console.error("Error fetching other categories:", error);
        return [];
      }
    },
    [`other-categories-${currentSlug}`],
    { revalidate: false, tags: ['categories', 'global-cache'] }
  )();
});

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { slug } = await params;
  
  const [data, fullCategoryData, otherCategories] = await Promise.all([
    getCategoryDataForPage(slug),
    getCategoryFullData(slug),
    getOtherCategories(slug)
  ]);
  
  const appBaseUrl = getBaseUrl();
  const breadcrumbItems: BreadcrumbItem[] = [{ label: "Home", href: "/" }];
  
  if (data) {
    breadcrumbItems.push({ label: data.category.name });
    
    const rawSchemaImage = data.category.imageUrl || `/android-chrome-512x512.png`;
    const schemaImage = rawSchemaImage.startsWith('http') ? rawSchemaImage : `${appBaseUrl}${rawSchemaImage.startsWith('/') ? '' : '/'}${rawSchemaImage}`;
    
    const categorySchema = {
      "@context": "https://schema.org",
      "@type": "Service",
      "name": `${data.category.name} Services`,
      "description": data.category.seo_description || `Professional ${data.category.name} services near you.`,
      "image": schemaImage,
      "provider": {
        "@type": "LocalBusiness",
        "name": "Newtalent"
      }
    };

    const seoContent = getCategorySeoContent(slug, data.category.name);
    const faqSchema = {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": seoContent.faqs.map(faq => ({
        "@type": "Question",
        "name": faq.question,
        "acceptedAnswer": {
          "@type": "Answer",
          "text": faq.answer
        }
      }))
    };

    return (
      <>
        <JsonLdScript data={categorySchema} idSuffix={`category-${data.category.id}`} />
        {seoContent.faqs && seoContent.faqs.length > 0 && (
          <JsonLdScript data={faqSchema} idSuffix={`faq-category-${data.category.id}`} />
        )}
        <BreadcrumbSchema items={breadcrumbItems} />
        <CategoryPageClient 
            categorySlug={slug} 
            breadcrumbItems={breadcrumbItems} 
            initialData={fullCategoryData || undefined}
            otherCategories={otherCategories}
        />
      </>
    );
  } else {
    breadcrumbItems.push({ label: "Category Not Found" });
    return <CategoryPageClient categorySlug={slug} breadcrumbItems={breadcrumbItems} />;
  }
}
