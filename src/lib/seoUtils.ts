// src/lib/seoUtils.ts
import type { FirestoreSEOSettings } from '@/types/firestore';

// Define default SEO values
export const defaultSeoValues: FirestoreSEOSettings = {
  siteName: 'Newtalent – No. 1 Casting & Audition Platform | Movie & Film Auditions',
  defaultMetaTitleSuffix: ' | No. 1 Casting Platform India',
  defaultMetaDescription: 'Newtalent is India\'s number one casting platform for acting jobs, film auditions, movie auditions, and casting calls. Connect with top actors, directors, models, singers, and crew in Bangalore & India.',
  defaultMetaKeywords: 'actor near me, female actor Bangalore, film auditions, movie auditions, casting calls India, assistant director jobs, assistant director portfolio, cinematographer Bangalore, music director for short film, singer for movie, child actor auditions, model portfolio, voice over artist, screenplay writer, lyric writer, makeup artist for film, video editor freelance, dance choreographer, production manager, camera operator, casting agency, production house, short film actor, OTT auditions, Netflix auditions, Amazon Prime auditions, Telugu movie auditions, Kannada auditions, Tamil auditions, Malayalam auditions, Bollywood auditions, acting jobs bangalore',
  homepageMetaTitle: 'Newtalent – India\'s No. 1 Platform for Film Auditions, Casting Calls & Crew Jobs',
  homepageMetaDescription: 'Discover daily acting auditions, movie casting calls, and production crew jobs (assistant directors, cinematographers, editors) on India\'s leading entertainment network.',
  homepageMetaKeywords: 'actor near me, female actor Bangalore, film auditions, movie auditions, casting calls India, assistant director jobs, assistant director portfolio, cinematographer Bangalore, music director for short film, singer for movie, child actor auditions, model portfolio, voice over artist, screenplay writer, lyric writer, makeup artist for film, video editor freelance, dance choreographer, production manager, camera operator, casting agency, production house, short film actor, OTT auditions, Netflix auditions, Amazon Prime auditions, Telugu movie auditions, Kannada auditions, Tamil auditions, Malayalam auditions, Bollywood auditions, acting jobs bangalore',
  homepageH1: 'India\'s No. 1 Casting & Audition Platform',
  categoryPageTitlePattern: 'Best {{categoryName}} for Film Auditions & Casting Calls in India | Newtalent',
  categoryPageDescriptionPattern: 'Looking for professional {{categoryName}}? Discover top portfolios, showreels, and verified profiles for film auditions, casting calls, and acting jobs on India\'s No. 1 casting platform.',
  categoryPageKeywordsPattern: '{{categoryName}} auditions, film auditions, casting calls, acting jobs, movie casting, hire {{categoryName}}, new auditions, casting platform india',
  categoryPageH1Pattern: 'Top Professional {{categoryName}} in India',
  cityCategoryPageTitlePattern: 'No. 1 {{categoryName}} in {{cityName}} | Film Auditions & Casting Calls',
  cityCategoryPageDescriptionPattern: 'Hire the best {{categoryName}} in {{cityName}} for film auditions, casting calls, and acting jobs. Discover professional {{categoryName}} portfolios on India\'s leading casting network.',
  cityCategoryPageKeywordsPattern: '{{categoryName}} in {{cityName}}, hire {{categoryName}} {{cityName}}, best {{categoryName}} in {{cityName}}, {{cityName}} auditions, acting jobs in {{cityName}}',
  cityCategoryPageH1Pattern: 'Best {{categoryName}} in {{cityName}}',
  areaCategoryPageTitlePattern: 'Top {{categoryName}} in {{areaName}}, {{cityName}} | Film Auditions & Casting',
  areaCategoryPageDescriptionPattern: 'Need a professional {{categoryName}} in {{areaName}}, {{cityName}}? Discover top-rated artists for your movie auditions or film requirements in {{areaName}} on India\'s No. 1 platform.',
  areaCategoryPageKeywordsPattern: '{{categoryName}} in {{areaName}}, hire {{categoryName}} {{areaName}}, acting {{categoryName}} in {{areaName}}, auditions near {{areaName}}',
  areaCategoryPageH1Pattern: 'Expert {{categoryName}} in {{areaName}}, {{cityName}}',
  servicePageTitlePattern: '{{serviceName}} - Professional {{categoryName}} in {{cityName}} | Film Auditions & Portfolio',
  servicePageDescriptionPattern: 'View {{serviceName}}\'s professional {{categoryName}} portfolio on Newtalent. Connect directly for acting roles, film auditions, and casting calls in {{cityName}}, India.',
  servicePageKeywordsPattern: '{{serviceName}} actors, hire {{serviceName}} {{cityName}}, professional {{serviceName}} profiles, auditions, casting calls, acting jobs',
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
