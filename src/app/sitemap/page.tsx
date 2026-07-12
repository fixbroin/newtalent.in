import { adminDb } from '@/lib/firebaseAdmin';
import type { FirestoreCategory, FirestoreCity, FirestoreArea, FirestoreService, FirestoreSubCategory, FirestoreBlogPost, ContentPage, ArtistApplication } from '@/types/firestore';
import Link from 'next/link';

import { Metadata } from 'next';
import { getBaseUrl } from '@/lib/config';
import { FileText, Layers, BookOpen, ChevronRight, MapPin, Users, Star } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { unstable_cache } from 'next/cache';
import { cache } from 'react';
import { serializeFirestoreData } from '@/lib/serializeUtils';

export const revalidate = false;

export const metadata: Metadata = {
  title: 'Sitemap - Newtalent Casting & Auditions',
  description: 'Explore all pages, cities, and categories on Newtalent. Your complete guide to Indias number one casting and audition platform.',
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: `${getBaseUrl()}/sitemap`,
  }
};

interface SitemapData {
  pages: Array<{ name: string; url: string }>;
  cities: FirestoreCity[];
  categories: FirestoreCategory[];
  artists: ArtistApplication[];
  blogs: FirestoreBlogPost[];
}

const getSitemapData = cache(async (): Promise<SitemapData> => {
  return unstable_cache(
    async () => {
      // Static Pages
      const staticPages = [
        { name: 'Home', url: '/' },
        { name: 'About Us', url: '/about-us' },
        { name: 'Contact Us', url: '/contact-us' },
        { name: 'All Categories', url: '/categories' },
        { name: 'FAQ', url: '/faq' },
        { name: 'Blog', url: '/blog' },
        { name: 'Join as an Artist', url: '/artist-registration' },
      ];
      
      const contentPagesSnap = await adminDb.collection('contentPages').get();
      const dynamicContentPages = contentPagesSnap.docs.map(doc => {
          const data = doc.data() as ContentPage;
          return { name: data.title, url: `/${data.slug}`};
      }).filter(page => !staticPages.some(p => p.url === page.url));

      // Fetch all data in parallel
      const [
        citiesSnap,
        categoriesSnap,
        artistsSnap,
        blogsSnap
      ] = await Promise.all([
        adminDb.collection('cities').where('isActive', '==', true).orderBy('name').get(),
        adminDb.collection('adminCategories').where('isActive', '==', true).orderBy('order').get(),
        adminDb.collection('ArtistApplications').where('status', '==', 'approved').limit(100).get(),
        adminDb.collection('blogPosts').where('isPublished', '==', true).orderBy('createdAt', 'desc').get()
      ]);

      const cities = citiesSnap.docs.map(doc => ({ id: doc.id, ...serializeFirestoreData<any>(doc.data()) } as FirestoreCity));
      const categories = categoriesSnap.docs.map(doc => ({ id: doc.id, ...serializeFirestoreData<any>(doc.data()) } as FirestoreCategory));
      const artists = artistsSnap.docs.map(doc => ({ id: doc.id, ...serializeFirestoreData<any>(doc.data()) } as ArtistApplication));
      const blogs = blogsSnap.docs.map(doc => ({ id: doc.id, ...serializeFirestoreData<any>(doc.data()) } as FirestoreBlogPost));

      return {
        pages: [...staticPages, ...dynamicContentPages],
        cities,
        categories,
        artists,
        blogs,
      };
    },
    ['visual-sitemap-data'],
    { 
      revalidate: false, 
      tags: ['sitemap', 'cities', 'categories', 'artists', 'blog', 'global-cache'] 
    }
  )();
});


export default async function SitemapPage() {
  const data = await getSitemapData();

  return (
    <div className="min-h-screen bg-muted/10 pb-20">
      <div className="container mx-auto px-4 py-12">
        <div className="mb-16 text-center">
            <div className="inline-flex items-center justify-center p-2 px-4 bg-primary/10 rounded-full text-primary text-xs font-black uppercase tracking-widest mb-4">
              Website Index
            </div>
            <h1 className="text-4xl md:text-7xl font-black text-foreground mb-4 tracking-tight">Sitemap</h1>
            <p className="text-muted-foreground max-w-2xl mx-auto font-medium">Explore India\'s number one casting platform. Every city, every category, and every talent in one place.</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {/* Section 1: Main Pages */}
          <Card className="border-none shadow-xl rounded-[2rem] bg-card overflow-hidden">
            <CardHeader className="bg-primary/5 pb-4">
                <CardTitle className="text-lg font-black flex items-center gap-2 uppercase tracking-tight"><FileText className="h-5 w-5 text-primary"/>Quick Links</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
                <ul className="space-y-4 text-sm">
                    {data.pages.map(page => (
                    <li key={page.url} className="flex items-center group">
                        <ChevronRight className="h-3 w-3 text-primary opacity-0 group-hover:opacity-100 transition-all -ml-4 group-hover:ml-0 mr-1" />
                        <Link href={page.url} className="text-muted-foreground hover:text-primary transition-colors font-bold uppercase tracking-tighter">{page.name}</Link>
                    </li>
                    ))}
                </ul>
            </CardContent>
          </Card>

          {/* Section 2: Cities */}
          <Card className="border-none shadow-xl rounded-[2rem] bg-card overflow-hidden">
            <CardHeader className="bg-blue-500/5 pb-4">
                <CardTitle className="text-lg font-black flex items-center gap-2 uppercase tracking-tight"><MapPin className="h-5 w-5 text-blue-600"/>Top Cities</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
                <ul className="space-y-4 text-sm">
                    {data.cities.map(city => (
                    <li key={city.id} className="flex items-center group">
                        <ChevronRight className="h-3 w-3 text-blue-600 opacity-0 group-hover:opacity-100 transition-all -ml-4 group-hover:ml-0 mr-1" />
                        <Link href={`/${city.slug}`} className="text-muted-foreground hover:text-blue-600 transition-colors font-bold uppercase tracking-tighter">{city.name}</Link>
                    </li>
                    ))}
                </ul>
            </CardContent>
          </Card>
          
          {/* Section 3: Categories */}
          <Card className="border-none shadow-xl rounded-[2rem] bg-card overflow-hidden">
            <CardHeader className="bg-orange-500/5 pb-4">
                <CardTitle className="text-lg font-black flex items-center gap-2 uppercase tracking-tight"><Layers className="h-5 w-5 text-orange-600"/>Categories</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
                <ul className="space-y-4 text-sm">
                    {data.categories.map(cat => (
                    <li key={cat.id} className="flex items-center group">
                        <ChevronRight className="h-3 w-3 text-orange-600 opacity-0 group-hover:opacity-100 transition-all -ml-4 group-hover:ml-0 mr-1" />
                        <Link href={`/category/${cat.slug}`} className="text-muted-foreground hover:text-orange-600 transition-colors font-bold uppercase tracking-tighter">{cat.name}</Link>
                    </li>
                    ))}
                </ul>
            </CardContent>
          </Card>

          {/* Section 4: Blog */}
          <Card className="border-none shadow-xl rounded-[2rem] bg-card overflow-hidden">
            <CardHeader className="bg-purple-500/5 pb-4">
                <CardTitle className="text-lg font-black flex items-center gap-2 uppercase tracking-tight"><BookOpen className="h-5 w-5 text-purple-600"/>Blog Index</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
                <ul className="space-y-4 text-sm">
                    {data.blogs.slice(0, 8).map(blog => (
                    <li key={blog.id} className="flex items-start group">
                        <ChevronRight className="h-3 w-3 text-purple-600 opacity-0 group-hover:opacity-100 transition-all -ml-4 group-hover:ml-0 mr-1 mt-1" />
                        <Link href={`/blog/${blog.slug}`} className="text-muted-foreground hover:text-purple-600 transition-colors font-bold uppercase tracking-tighter leading-tight truncate">{blog.title}</Link>
                    </li>
                    ))}
                    <li>
                      <Link href="/blog" className="text-[10px] font-black uppercase text-primary hover:underline">View All Articles</Link>
                    </li>
                </ul>
            </CardContent>
          </Card>
        </div>

        {/* Big Artists Section */}
        <section className="mt-20">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div className="flex items-center gap-4">
                    <div className="h-14 w-14 rounded-[1.5rem] bg-primary/10 flex items-center justify-center text-primary shadow-inner"><Users className="h-7 w-7"/></div>
                    <div>
                      <h2 className="text-3xl font-black tracking-tight uppercase">Featured Talent Index</h2>
                      <p className="text-muted-foreground text-sm font-medium">Browse our approved professional actor and artist profiles.</p>
                    </div>
                </div>
                <Link href="/categories" className="text-xs font-black uppercase tracking-widest px-6 py-3 bg-white border-2 rounded-2xl hover:bg-primary hover:text-white hover:border-primary transition-all shadow-sm">
                  Browse by category
                </Link>
            </div>
            
            <div className="bg-card p-10 rounded-[3rem] shadow-2xl border border-primary/5">
                {data.artists.length === 0 ? (
                  <div className="text-center py-10 opacity-50 font-bold uppercase tracking-widest text-sm">No artists indexed yet.</div>
                ) : (
                  <ul className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-x-12 gap-y-6">
                  {data.artists.map(artist => (
                      <li key={artist.id} className="flex items-start gap-2 group border-b border-muted py-2">
                          <Star className="h-3 w-3 text-primary mt-1 opacity-20 group-hover:opacity-100 transition-all group-hover:scale-125" />
                          <Link 
                            href={`/category/${artist.workCategorySlug || 'artist'}/${artist.username}`} 
                            className="text-muted-foreground hover:text-primary text-sm font-black transition-colors leading-tight uppercase tracking-tighter"
                          >
                            {artist.fullName}
                          </Link>
                      </li>
                  ))}
                  </ul>
                )}
                <div className="mt-12 text-center pt-8 border-t border-dashed">
                    <p className="text-xs text-muted-foreground font-medium mb-4 uppercase tracking-[0.3em]">Deep Indexing Engine Active</p>
                    
                </div>
            </div>
        </section>
      </div>
    </div>
  );
}
