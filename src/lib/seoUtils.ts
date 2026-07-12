// src/lib/seoUtils.ts
import type { FirestoreSEOSettings } from '@/types/firestore';

// Define default SEO values
export const defaultSeoValues: FirestoreSEOSettings = {
  siteName: 'Newtalent – No. 1 Casting & Audition Platform in India & Bangalore',
  defaultMetaTitleSuffix: ' | No. 1 Casting Platform India',
  defaultMetaDescription: 'Newtalent is India\'s number one platform for acting jobs, film auditions, and casting calls. Discover top actors, models, and performers in Bangalore and across India.',
  defaultMetaKeywords: 'acting jobs bangalore, film auditions india, casting calls bangalore, number one casting website india, actor profiles, hire actors bangalore, acting auditions, film industry, acting agencies in bangalore',
  homepageMetaTitle: 'Newtalent – India\'s No. 1 Platform for Acting Auditions & Casting in Bangalore',
  homepageMetaDescription: 'Join India\'s top casting platform. Find daily acting auditions, film casting calls, and acting jobs in Bangalore and across India. The number one destination for actors and filmmakers.',
  homepageMetaKeywords: 'audition bangalore, actor jobs india, film casting bangalore, no 1 audition site india, acting auditions bangalore, hire actors, casting agency bangalore, movie auditions, serial auditions in bangalore',
  homepageH1: 'India\'s No. 1 Casting & Audition Platform',
  categoryPageTitlePattern: 'Best {{categoryName}} for Film & TV in India | No. 1 Casting | Newtalent',
  categoryPageDescriptionPattern: 'Looking for the best {{categoryName}} in India? Find top professional {{categoryName}} for your next film or acting project on India\'s number one casting platform.',
  categoryPageKeywordsPattern: 'best {{categoryName}} in india, hire {{categoryName}} bangalore, professional {{categoryName}}, acting {{categoryName}}, {{categoryName}} auditions',
  categoryPageH1Pattern: 'Top Professional {{categoryName}} in India',
  cityCategoryPageTitlePattern: 'No. 1 {{categoryName}} in {{cityName}} | Film & Acting Auditions',
  cityCategoryPageDescriptionPattern: 'Hire the best {{categoryName}} in {{cityName}}. Discover professional {{categoryName}} for your next film or casting call on Newtalent, the leading platform in India.',
  cityCategoryPageKeywordsPattern: '{{categoryName}} in {{cityName}}, hire {{categoryName}} {{cityName}}, best {{categoryName}} in {{cityName}}, {{cityName}} auditions, acting jobs in {{cityName}}',
  cityCategoryPageH1Pattern: 'Best {{categoryName}} in {{cityName}}',
  areaCategoryPageTitlePattern: 'Top {{categoryName}} in {{areaName}}, {{cityName}} | Acting & Film Cast',
  areaCategoryPageDescriptionPattern: 'Need a professional {{categoryName}} in {{areaName}}, {{cityName}}? Discover top-rated artists for your film or acting requirements in {{areaName}} on India\'s No. 1 platform.',
  areaCategoryPageKeywordsPattern: '{{categoryName}} in {{areaName}}, hire {{categoryName}} {{areaName}}, acting {{categoryName}} in {{areaName}}, auditions near {{areaName}}',
  areaCategoryPageH1Pattern: 'Expert {{categoryName}} in {{areaName}}, {{cityName}}',
  servicePageTitlePattern: '{{serviceName}} Profiles | Best Professional {{categoryName}} | Newtalent',
  servicePageDescriptionPattern: 'Connect with professional {{serviceName}} in {{cityName}}. Explore acting profiles, view film portfolios, and hire experts for your creative projects.',
  servicePageKeywordsPattern: '{{serviceName}} actors, hire {{serviceName}} {{cityName}}, professional {{serviceName}} profiles, auditions, casting calls',
  servicePageH1Pattern: 'Professional {{serviceName}}',
  areaPageTitlePattern: 'Best Actors & Artists in {{areaName}}, {{cityName}} | Discover Top Talents',
  areaPageDescriptionPattern: 'Looking for professional actors or artists in {{areaName}}, {{cityName}}? Newtalent connects you with top-rated performers for acting and film roles in your local area.',
  areaPageKeywordsPattern: 'actors in {{areaName}}, auditions {{areaName}}, find casting near me {{areaName}}, film casting {{areaName}}',
  areaPageH1Pattern: 'Top Professional Talent in {{areaName}}, {{cityName}}',
  cityPageTitlePattern: 'Discover Top Actors & Film Talent in {{cityName}} | No. 1 Audition Platform',
  cityPageDescriptionPattern: 'Newtalent is the No. 1 platform to discover and hire professional actors and artists in {{cityName}}. Connect with top-rated talent for films and auditions.',
  cityPageKeywordsPattern: 'actors in {{cityName}}, auditions {{cityName}}, find film talent {{cityName}}, acting jobs, casting calls {{cityName}}',
  cityPageH1Pattern: 'Professional Actors & Talent in {{cityName}}',
  structuredDataType: 'Organization',
  structuredDataName: 'Newtalent',
  structuredDataStreetAddress: '#44, G S Palya Road, Konappana Agrahara, Electronic City Phase 2',
  structuredDataLocality: 'Bangalore',
  structuredDataRegion: 'Karnataka',
  structuredDataPostalCode: '560100',
  structuredDataCountry: 'IN',
  structuredDataTelephone: '+91-7353113455',
  structuredDataImage: 'https://newtalent.in/android-chrome-512x512.png',
  socialProfileUrls: {
    facebook: 'https://www.facebook.com/newtalent.in',
    twitter: 'https://x.com/newtalent_in',
    instagram: 'https://www.instagram.com/newtalent.in/',
    linkedin: 'https://www.linkedin.com/company/newtalent-in',
    youtube: 'https://www.youtube.com/@newtalent-in',
  },
};

/**
 * Utility to replace placeholders in a string.
 * @param template The string with placeholders like {{name}}
 * @param data An object containing values for the placeholders
 * @returns The string with placeholders replaced
 */
export function replacePlaceholders(
  template: string | undefined | null,
  data: Record<string, string | number | undefined | null>
): string {
  if (!template) return '';
  
  let result = template;
  try {
    for (const key in data) {
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        const placeholderValue = data[key];
        if (placeholderValue !== undefined && placeholderValue !== null) {
           result = result.replace(new RegExp(`{{${key}}}`, 'g'), String(placeholderValue));
        } else {
           result = result.replace(new RegExp(`{{${key}}}`, 'g'), '');
        }
      }
    }
  } catch (e) {
    return template;
  }
  return result.trim();
}
