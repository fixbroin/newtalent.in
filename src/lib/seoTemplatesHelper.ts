// Reusable Offline SEO Templates & Generator Helpers for Cities, Categories, and Areas

export const DEFAULT_CATEGORY_NAMES = [
  "Male Actor",
  "Female Actor",
  "Child Actor",
  "Model",
  "Director",
  "Assistant Director",
  "Script Writer",
  "Dancer",
  "Music Talent",
  "Cinematographer",
  "Video Editor",
  "Singer",
  "Makeup Artist",
  "Voice Over Artist",
];

export function getCategoryListString(categories?: string[], limit: number = 4): string {
  const cats = (categories && categories.length > 0) ? categories : DEFAULT_CATEGORY_NAMES;
  const sliced = cats.slice(0, limit);
  if (sliced.length === 1) return `${sliced[0]}s`;
  if (sliced.length === 2) return `${sliced[0]}s & ${sliced[1]}s`;
  return `${sliced.slice(0, -1).map(c => `${c}s`).join(", ")} & ${sliced[sliced.length - 1]}s`;
}

export const CITY_TEMPLATES = [
  {
    h1: "Hire {topCategories} in {cityName} on NewTalent.in",
    title: "Verified Artists & {topCategories} in {cityName} | NewTalent.in",
    description: "Connect directly with casting directors, {topCategories} in {cityName} on NewTalent.in. Explore vetted creative professionals in {cityName} and nearby areas like {nearbyCities}.",
  },
  {
    h1: "Connect with Verified {topCategories} in {cityName} | NewTalent.in",
    title: "Best Castings & {topCategories} in {cityName} - NewTalent.in",
    description: "Discover vetted creative talents like {topCategories} in {cityName} for film, photography, and advertising. Book local talent easily across {cityName} and neighbouring areas like {nearbyCities} on NewTalent.in.",
  },
  {
    h1: "{cityName} Talent Directory: Hire {topCategories} on NewTalent.in",
    title: "Top {topCategories} in {cityName} | Directory | NewTalent.in",
    description: "Find verified {topCategories} in {cityName} on NewTalent.in. Hire the best local creatives for events and media shoots in {cityName} and surrounding {nearbyCities}.",
  },
  {
    h1: "Cast & Book Vetted Artists in {cityName} - NewTalent.in",
    title: "Artist Booking & Casting in {cityName} | NewTalent.in",
    description: "NewTalent.in helps you hire creative artists in {cityName} for event and film productions. Connect with premium local {topCategories} in {cityName} and nearby {nearbyCities}.",
  },
  {
    h1: "Hire Performers & {topCategories} in {cityName} Near You",
    title: "Hire Verified Artists & Performers in {cityName} | NewTalent.in",
    description: "Looking for artists near you in {cityName}? Discover verified {topCategories} in {cityName} on NewTalent.in for film and commercial bookings.",
  },
  {
    h1: "Film Auditions & Artist Booking in {cityName} | NewTalent.in",
    title: "Auditions & Artist Castings in {cityName} | NewTalent",
    description: "Explore audition opportunities and hire checked talent in {cityName}. Connect with {topCategories} in {cityName} and nearby {nearbyCities}.",
  },
  {
    h1: "Best Creative Talents & Performers in {cityName} | Hire Local Artists",
    title: "Best Artists & Creative Talents in {cityName} | NewTalent.in",
    description: "Hire verified {topCategories} in {cityName} through NewTalent.in. Premium local talent directory servicing {cityName} and nearby {nearbyCities}.",
  },
  {
    h1: "Verified Artist Directory in {cityName} | Auditions & Castings",
    title: "{cityName} Artist Directory & Audition Portal | NewTalent",
    description: "Find and book local performers, {topCategories} in {cityName}. NewTalent.in provides instant profiles and casting connections in {cityName} and {nearbyCities}.",
  },
  {
    h1: "{topCategories} & Production Crew in {cityName} | NewTalent.in",
    title: "Hire {topCategories} & Crew in {cityName} | NewTalent.in",
    description: "Explore vetted portfolios of {topCategories} in {cityName}. Hire top talent for feature films, ads, and events in {cityName} & {nearbyCities}.",
  },
  {
    h1: "Book Verified Performers & Artists in {cityName} | NewTalent",
    title: "Book Performers & Artists in {cityName} | NewTalent.in",
    description: "The ultimate directory for hiring verified {topCategories} in {cityName}. Direct connections for projects in {cityName} and {nearbyCities}.",
  },
  {
    h1: "Local Artist Hiring & Casting in {cityName} | NewTalent.in",
    title: "Local Artist Hiring & Casting in {cityName} | NewTalent",
    description: "Direct talent search in {cityName}. Hire {topCategories} with verified credentials on NewTalent.in across {cityName} and neighbouring {nearbyCities}.",
  },
  {
    h1: "Creative Talent Agency & Booking in {cityName} | NewTalent",
    title: "Creative Talent Booking Hub in {cityName} | NewTalent",
    description: "Streamline your casting in {cityName}. Book verified {topCategories} with ease on NewTalent.in in {cityName} and surrounding {nearbyCities}.",
  },
  {
    h1: "Hire Professional Artists in {cityName} | Casting Calls & Booking",
    title: "Professional Artists & Castings in {cityName} | NewTalent",
    description: "Connect with checked {topCategories} in {cityName} on NewTalent.in. Ideal for media, film, and commercial shoots in {cityName} & {nearbyCities}.",
  },
  {
    h1: "Best Artists & {topCategories} in {cityName} | NewTalent.in",
    title: "Top Rated Artists & {topCategories} in {cityName} | NewTalent.in",
    description: "Find top talent in {cityName} for films, OTT series, events, and fashion shoots. Book verified {topCategories} in {cityName} and nearby {nearbyCities}.",
  },
  {
    h1: "Verified Creative Network in {cityName} | Hire Artists",
    title: "Verified Creative Artist Network in {cityName} | NewTalent",
    description: "Join India's leading artist network in {cityName}. Browse verified portfolios of {topCategories} in {cityName} and {nearbyCities}.",
  },
  {
    h1: "Auditions, Castings & Artist Booking in {cityName} | NewTalent",
    title: "Castings & Artist Booking in {cityName} | NewTalent.in",
    description: "Discover verified {topCategories} for your next project in {cityName}. Direct messaging and fast hiring on NewTalent.in across {cityName} and {nearbyCities}.",
  }
];

export const CITY_CATEGORY_TEMPLATES = [
  {
    h1: "Hire Verified {categoryName}s in {cityName} - NewTalent.in",
    title: "Best {categoryName}s in {cityName} | Casting & Booking | NewTalent.in",
    description: "Connect with top verified {categoryName}s in {cityName} on NewTalent.in. Perfect for casting calls, shoots, and creative projects in {cityName} and nearby {nearbyCities}.",
  },
  {
    h1: "Top {categoryName}s in {cityName} for Castings & Media Projects | NewTalent.in",
    title: "{categoryName}s in {cityName} | Vetted Talents | NewTalent.in",
    description: "Discover professional {categoryName}s in {cityName} on NewTalent.in. Vetted portfolios ready for film, modeling, and advertising bookings in {cityName} and neighbouring {nearbyCities}.",
  },
  {
    h1: "Discover Verified {categoryName}s in {cityName} on NewTalent.in",
    title: "Verified {categoryName}s in {cityName} Directory - NewTalent.in",
    description: "Browse the ultimate directory of verified {categoryName}s in {cityName} on NewTalent.in. Book casting calls, modeling assignments, and creative projects in {cityName} and adjacent regions like {nearbyCities}.",
  },
  {
    h1: "Hire Local {categoryName}s in {cityName} for Film & Photography | NewTalent.in",
    title: "Professional {categoryName} Booking in {cityName} | NewTalent.in",
    description: "Book verified {categoryName}s in {cityName} through NewTalent.in - the premier local talent network. Direct messaging with creative professionals in {cityName} and nearby {nearbyCities}.",
  },
  {
    h1: "Find {categoryName}s Near You in {cityName} | NewTalent",
    title: "{categoryName}s Near You in {cityName} | NewTalent.in",
    description: "Looking for a {categoryName} near you in {cityName}? NewTalent.in links you with checked {categoryName}s ready for instant booking in {cityName} and surrounding {nearbyCities}.",
  },
  {
    h1: "{categoryName} Auditions & Castings in {cityName} | NewTalent.in",
    title: "{categoryName} Auditions & Castings in {cityName} | NewTalent",
    description: "Looking to hire a {categoryName} in {cityName}? NewTalent.in features verified {categoryName} portfolios for feature films, commercials, and events in {cityName} & {nearbyCities}.",
  },
  {
    h1: "Best {categoryName}s in {cityName} | Hire Local {categoryName}",
    title: "Hire Local {categoryName}s in {cityName} | NewTalent.in",
    description: "Book verified {categoryName}s in {cityName} through NewTalent.in. Direct portfolio search and instant booking options for projects in {cityName} and adjacent {nearbyCities}.",
  },
  {
    h1: "Professional {categoryName} Booking in {cityName} | NewTalent.in",
    title: "Hire Top {categoryName}s in {cityName} | NewTalent.in",
    description: "Find experienced {categoryName}s in {cityName} for movies, ads, and photo shoots. Connect directly with verified {categoryName}s in {cityName} and {nearbyCities} on NewTalent.in.",
  },
  {
    h1: "Verified {categoryName} Directory in {cityName} | NewTalent",
    title: "{categoryName} Directory & Casting Hub in {cityName} | NewTalent",
    description: "Browse the complete list of vetted {categoryName}s in {cityName}. Hire top talent with transparent profiles on NewTalent.in across {cityName} and {nearbyCities}.",
  },
  {
    h1: "Hire Experienced {categoryName}s in {cityName} | NewTalent.in",
    title: "Experienced {categoryName}s in {cityName} | NewTalent",
    description: "Connect with experienced {categoryName}s in {cityName} on NewTalent.in. Direct messaging, portfolio reviews, and booking for creative assignments in {cityName} and {nearbyCities}.",
  },
  {
    h1: "{categoryName} Casting & Talent Directory in {cityName} | NewTalent",
    title: "Cast Verified {categoryName}s in {cityName} | NewTalent.in",
    description: "Simplify your {categoryName} search in {cityName}. Book verified {categoryName}s for film, TV, and brand campaigns in {cityName} and nearby {nearbyCities} on NewTalent.in.",
  },
  {
    h1: "Hire {categoryName}s in {cityName} for Film, Ads & Events",
    title: "Hire {categoryName}s for Film & Ads in {cityName} | NewTalent",
    description: "Find talent fast. Hire verified {categoryName}s in {cityName} for events, video shoots, and movies. Servicing {cityName} and neighbouring {nearbyCities}.",
  },
  {
    h1: "Book Top {categoryName}s in {cityName} | NewTalent.in",
    title: "Book Vetted {categoryName}s in {cityName} | NewTalent.in",
    description: "Discover and hire professional {categoryName}s in {cityName} on NewTalent.in. Browse photos, audio/video demos, and work history in {cityName} & {nearbyCities}.",
  },
  {
    h1: "{categoryName} Jobs & Hiring in {cityName} | NewTalent.in",
    title: "{categoryName} Hiring & Booking in {cityName} | NewTalent",
    description: "Connect with leading {categoryName}s in {cityName}. Hire verified talent directly on NewTalent.in for your upcoming creative projects in {cityName} and {nearbyCities}.",
  },
  {
    h1: "Verified {categoryName} Profiles in {cityName} | NewTalent",
    title: "Verified {categoryName} Profiles in {cityName} | NewTalent",
    description: "Search verified {categoryName} profiles in {cityName} on NewTalent.in. Direct contact details and transparent booking for projects in {cityName} & {nearbyCities}.",
  }
];

export const AREA_CATEGORY_TEMPLATES = [
  {
    h1: "Hire {categoryName}s in {areaName}, {cityName} - NewTalent.in",
    title: "Best {categoryName}s in {areaName}, {cityName} | Vetted Talent | NewTalent",
    description: "Find verified local {categoryName}s in {areaName}, {cityName} on NewTalent.in. Contact casting-ready talents for local projects near {areaName} and nearby areas like {nearbyCities}.",
  },
  {
    h1: "Top Vetted {categoryName}s in {areaName}, {cityName} | NewTalent.in",
    title: "Verified {categoryName}s in {areaName}, {cityName} | NewTalent.in",
    description: "Discover professional local {categoryName}s in {areaName}, {cityName} on NewTalent.in. Vetted talents available for local shoots and bookings in neighbouring {nearbyCities}.",
  },
  {
    h1: "Connect with {categoryName}s in {areaName}, {cityName} on NewTalent.in",
    title: "{categoryName} Directory in {areaName}, {cityName} | NewTalent.in",
    description: "Ultimate portal for hiring verified {categoryName}s in {areaName}, {cityName} on NewTalent.in. Search casting call opportunities and connect with artists near {areaName} and adjacent {nearbyCities}.",
  },
  {
    h1: "Book Local {categoryName}s in {areaName}, {cityName} - NewTalent.in",
    title: "Book {categoryName}s in {areaName}, {cityName} | Vetted Portfolios",
    description: "Browse portfolios of local {categoryName}s in {areaName}, {cityName} on NewTalent.in. Send direct booking invites to actors, models, and singers near {areaName} and adjacent {nearbyCities}.",
  },
  {
    h1: "Top {categoryName}s Near Me in {areaName}, {cityName} | NewTalent",
    title: "{categoryName}s Near Me in {areaName}, {cityName} | NewTalent",
    description: "Discover top-rated local {categoryName}s in {areaName}, {cityName} on NewTalent.in. Vetted portfolios ready for shoots and casting near {areaName} and adjacent {nearbyCities}.",
  },
  {
    h1: "{categoryName} Auditions & Castings in {areaName}, {cityName} | NewTalent",
    title: "{categoryName} Auditions & Castings in {areaName}, {cityName}",
    description: "Looking to hire a {categoryName} in {areaName}, {cityName}? NewTalent.in connects you with local verified {categoryName}s around {areaName} and nearby {nearbyCities}.",
  },
  {
    h1: "Best {categoryName}s in {areaName}, {cityName} | Hire Local Talent",
    title: "Best {categoryName}s in {areaName}, {cityName} | NewTalent",
    description: "Book verified {categoryName}s located in {areaName}, {cityName} on NewTalent.in. Instant direct messaging for local projects in {areaName} and nearby {nearbyCities}.",
  },
  {
    h1: "Hire Local {categoryName}s Near {areaName}, {cityName} | NewTalent",
    title: "Hire Local {categoryName}s Near {areaName}, {cityName}",
    description: "Direct local talent booking in {areaName}, {cityName}. Hire verified {categoryName}s for film, modeling, and brand projects near {areaName} and {nearbyCities} on NewTalent.in.",
  },
  {
    h1: "Verified {categoryName} Directory in {areaName}, {cityName}",
    title: "{categoryName} Directory in {areaName}, {cityName} | NewTalent",
    description: "Browse verified {categoryName} profiles located in {areaName}, {cityName} on NewTalent.in. Book casting-ready performers near {areaName} and nearby {nearbyCities}.",
  },
  {
    h1: "Find {categoryName}s Near You in {areaName}, {cityName}",
    title: "Find {categoryName}s Near You in {areaName}, {cityName}",
    description: "Find verified {categoryName}s near you in {areaName}, {cityName} on NewTalent.in. Directly book local talent for auditions and shoots in {areaName} and {nearbyCities}.",
  },
  {
    h1: "Professional {categoryName} Booking in {areaName}, {cityName}",
    title: "Professional {categoryName} Booking in {areaName}, {cityName}",
    description: "Explore portfolios of professional {categoryName}s in {areaName}, {cityName}. Send booking requests directly on NewTalent.in for shoots near {areaName} & {nearbyCities}.",
  },
  {
    h1: "{categoryName} Casting Calls in {areaName}, {cityName} | NewTalent",
    title: "{categoryName} Casting Calls in {areaName}, {cityName}",
    description: "Simplify your casting search in {areaName}, {cityName}. Book verified {categoryName}s for ad shoots, films, and events near {areaName} & {nearbyCities} on NewTalent.in.",
  },
  {
    h1: "Hire Vetted {categoryName}s in {areaName}, {cityName} | NewTalent.in",
    title: "Vetted {categoryName}s in {areaName}, {cityName} | NewTalent",
    description: "Connect with vetted {categoryName}s based in {areaName}, {cityName}. Browse photos, videos, and experience details for local bookings in {areaName} & {nearbyCities}.",
  },
  {
    h1: "Book {categoryName}s Near {areaName}, {cityName} | NewTalent",
    title: "Book {categoryName}s Near {areaName}, {cityName} | NewTalent",
    description: "Find top {categoryName}s in {areaName}, {cityName} for instant hire. NewTalent.in offers direct messaging with local talent in {areaName} and neighbouring {nearbyCities}.",
  },
  {
    h1: "Local {categoryName} Booking & Castings in {areaName}, {cityName}",
    title: "Local {categoryName} Booking in {areaName}, {cityName}",
    description: "Directly book verified {categoryName}s living in {areaName}, {cityName} on NewTalent.in. Instant connection for shoots in {areaName} & {nearbyCities}.",
  }
];

export const AREA_TEMPLATES = [
  {
    h1: "Hire {topCategories} in {areaName}, {cityName}",
    title: "Verified Artists & {topCategories} in {areaName}, {cityName} | NewTalent.in",
    description: "Connect with local {topCategories} in {areaName}, {cityName} on NewTalent.in. Explore vetted creative talents near {areaName} and nearby {nearbyCities}.",
  },
  {
    h1: "Find Artists Near You in {areaName}, {cityName} | NewTalent.in",
    title: "Artists Near You in {areaName}, {cityName} | NewTalent.in",
    description: "Looking for artists near you in {areaName}, {cityName}? NewTalent.in connects you directly with verified local {topCategories} around {areaName}.",
  },
  {
    h1: "{areaName}, {cityName} Creative Talent Directory | NewTalent",
    title: "{areaName}, {cityName} Talent Directory | NewTalent.in",
    description: "Browse verified artist portfolios in {areaName}, {cityName}. Book {topCategories} for local events and media productions in {areaName} & {nearbyCities}.",
  },
  {
    h1: "Auditions & Artist Castings in {areaName}, {cityName}",
    title: "Auditions & Castings in {areaName}, {cityName} | NewTalent",
    description: "Explore audition opportunities and local casting calls in {areaName}, {cityName}. Hire top {topCategories} near {areaName} on NewTalent.in.",
  }
];

// Helper to generate 20+ localized, search-intent heavy keywords using system categories
export const generateKeywordsList = (
  cityName: string, 
  categoryName?: string, 
  areaName?: string, 
  nearbyAreas?: string,
  categoryList?: string[]
): string => {
  const keywords: string[] = [];
  const catsToUse = (categoryList && categoryList.length > 0) ? categoryList : DEFAULT_CATEGORY_NAMES;

  if (categoryName && areaName) {
    keywords.push(
      `${areaName} ${categoryName}s`,
      `hire ${categoryName}s in ${areaName}`,
      `verified ${categoryName}s in ${areaName}`,
      `book ${categoryName}s in ${areaName} ${cityName}`,
      `best ${categoryName}s in ${areaName}`,
      `${categoryName} near me in ${areaName}`,
      `${categoryName} near you in ${areaName}`,
      `nearby ${categoryName}s in ${areaName}`,
      `casting calls for ${categoryName}s in ${areaName}`,
      `${categoryName} auditions ${areaName} ${cityName}`,
      `${areaName} ${cityName} creative talents`,
      `hire local ${categoryName}s ${areaName}`,
      `NewTalent ${areaName}`,
      `casting directors in ${areaName} ${cityName}`,
      `professional ${categoryName} bookings ${areaName}`,
      `entertainment jobs in ${areaName}`,
      `${areaName} talent directory`,
      `portfolio booking for ${categoryName}s in ${areaName}`,
      `acting and modeling in ${areaName}`,
      `hire artists near ${areaName}`
    );
  } else if (categoryName) {
    keywords.push(
      `${cityName} ${categoryName}s`,
      `hire ${categoryName}s in ${cityName}`,
      `verified ${categoryName}s in ${cityName}`,
      `book ${categoryName}s in ${cityName}`,
      `best ${categoryName}s in ${cityName}`,
      `${categoryName} near me in ${cityName}`,
      `${categoryName} near you in ${cityName}`,
      `nearby ${categoryName}s in ${cityName}`,
      `casting calls for ${categoryName}s in ${cityName}`,
      `${categoryName} auditions ${cityName}`,
      `${cityName} creative talents`,
      `hire local ${categoryName}s ${cityName}`,
      `NewTalent ${cityName}`,
      `casting directors looking for ${categoryName}s in ${cityName}`,
      `professional ${categoryName} bookings ${cityName}`,
      `entertainment jobs in ${cityName}`,
      `${cityName} talent directory`,
      `portfolio booking for ${categoryName}s in ${cityName}`,
      `production crew ${cityName}`,
      `acting and modeling in ${cityName}`,
      `hire artists in ${cityName}`,
      `NewTalent.in castings ${cityName}`
    );
  } else if (areaName) {
    catsToUse.slice(0, 8).forEach(cat => {
      keywords.push(
        `${cat}s in ${areaName}`,
        `hire ${cat} in ${areaName} ${cityName}`,
        `${cat} near me in ${areaName}`,
        `${cat} near you in ${areaName}`
      );
    });
    keywords.push(
      `artists in ${areaName}`,
      `hire talent in ${areaName} ${cityName}`,
      `nearby artists in ${areaName}`,
      `verified talents in ${areaName}`,
      `NewTalent ${areaName}`,
      `casting directors in ${areaName}`,
      `creative professionals in ${areaName}`,
      `auditions in ${areaName}`,
      `artist directory ${areaName}`,
      `media jobs in ${areaName} ${cityName}`,
      `hire local artists in ${areaName}`,
      `talent casting platform ${areaName}`,
      `casting calls in ${areaName}`
    );
  } else {
    catsToUse.slice(0, 10).forEach(cat => {
      keywords.push(
        `${cat}s in ${cityName}`,
        `hire ${cat} in ${cityName}`,
        `${cat} near me in ${cityName}`,
        `${cat} near you in ${cityName}`
      );
    });
    keywords.push(
      `${cityName} artists`,
      `hire talent in ${cityName}`,
      `nearby artists in ${cityName}`,
      `verified talents in ${cityName}`,
      `NewTalent ${cityName}`,
      `casting directors in ${cityName}`,
      `entertainment hub ${cityName}`,
      `creative professionals in ${cityName}`,
      `auditions in ${cityName}`,
      `production crew hire ${cityName}`,
      `artist directory ${cityName}`,
      `media jobs in ${cityName}`,
      `hire local artists in ${cityName}`,
      `talent casting platform ${cityName}`,
      `NewTalent.in network ${cityName}`,
      `casting calls in ${cityName}`
    );
  }

  if (nearbyAreas) {
    keywords.push(
      `artists near ${nearbyAreas}`,
      `creative talent around ${nearbyAreas}`,
      `casting calls near ${nearbyAreas}`,
      `book local talent in ${nearbyAreas}`
    );
  }

  return keywords.join(", ");
};

// Helper for offline City SEO generation
export const generateCitySeoOffline = (
  cityName: string, 
  nearbyCities: string = "neighbouring regions",
  categoryList?: string[]
) => {
  const topCategoriesStr = getCategoryListString(categoryList, 4);
  const randomIndex = Math.floor(Math.random() * CITY_TEMPLATES.length);
  const tmpl = CITY_TEMPLATES[randomIndex];
  const replaceVars = (text: string) => 
    text.replace(/\{cityName\}/g, cityName)
        .replace(/\{nearbyCities\}/g, nearbyCities)
        .replace(/\{topCategories\}/g, topCategoriesStr);

  return {
    h1_title: replaceVars(tmpl.h1),
    seo_title: replaceVars(tmpl.title),
    seo_description: replaceVars(tmpl.description),
    seo_keywords: generateKeywordsList(cityName, undefined, undefined, nearbyCities, categoryList),
  };
};

// Helper for offline City-Category SEO generation
export const generateCityCategorySeoOffline = (
  cityName: string, 
  categoryName: string, 
  nearbyCities: string = "neighbouring regions",
  categoryList?: string[]
) => {
  const randomIndex = Math.floor(Math.random() * CITY_CATEGORY_TEMPLATES.length);
  const tmpl = CITY_CATEGORY_TEMPLATES[randomIndex];
  const replaceVars = (text: string) => 
    text.replace(/\{cityName\}/g, cityName)
        .replace(/\{categoryName\}/g, categoryName)
        .replace(/\{nearbyCities\}/g, nearbyCities);

  return {
    h1_title: replaceVars(tmpl.h1),
    seo_title: replaceVars(tmpl.title),
    seo_description: replaceVars(tmpl.description),
    seo_keywords: generateKeywordsList(cityName, categoryName, undefined, nearbyCities, categoryList),
  };
};

// Helper for offline Area-Category SEO generation
export const generateAreaCategorySeoOffline = (
  cityName: string, 
  areaName: string, 
  categoryName: string, 
  nearbyCities: string = "neighbouring areas",
  categoryList?: string[]
) => {
  const randomIndex = Math.floor(Math.random() * AREA_CATEGORY_TEMPLATES.length);
  const tmpl = AREA_CATEGORY_TEMPLATES[randomIndex];
  const replaceVars = (text: string) => 
    text.replace(/\{cityName\}/g, cityName)
        .replace(/\{areaName\}/g, areaName)
        .replace(/\{categoryName\}/g, categoryName)
        .replace(/\{nearbyCities\}/g, nearbyCities);

  return {
    h1_title: replaceVars(tmpl.h1),
    seo_title: replaceVars(tmpl.title),
    seo_description: replaceVars(tmpl.description),
    seo_keywords: generateKeywordsList(cityName, categoryName, areaName, nearbyCities, categoryList),
  };
};

// Helper for offline Area SEO generation
export const generateAreaSeoOffline = (
  cityName: string, 
  areaName: string, 
  nearbyCities: string = "neighbouring areas",
  categoryList?: string[]
) => {
  const topCategoriesStr = getCategoryListString(categoryList, 4);
  const randomIndex = Math.floor(Math.random() * AREA_TEMPLATES.length);
  const tmpl = AREA_TEMPLATES[randomIndex];
  const replaceVars = (text: string) => 
    text.replace(/\{cityName\}/g, cityName)
        .replace(/\{areaName\}/g, areaName)
        .replace(/\{nearbyCities\}/g, nearbyCities)
        .replace(/\{topCategories\}/g, topCategoriesStr);

  return {
    h1_title: replaceVars(tmpl.h1),
    seo_title: replaceVars(tmpl.title),
    seo_description: replaceVars(tmpl.description),
    seo_keywords: generateKeywordsList(cityName, undefined, areaName, nearbyCities, categoryList),
  };
};
