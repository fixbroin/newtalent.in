
"use client";

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { PlusCircle, Edit, Trash2, Loader2, CheckCircle, XCircle, Zap, PackageSearch } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { CityCategorySeoSetting, AreaCategorySeoSetting, FirestoreCategory, FirestoreCity, FirestoreArea } from '@/types/firestore';
import { db } from '@/lib/firebase';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, orderBy, query, Timestamp, where } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Skeleton } from '@/components/ui/skeleton';
import CitySeoForm from '@/components/admin/CitySeoForm';
import { triggerRefresh, submitPathToGoogleIndexing } from '@/lib/revalidateUtils';

const generateSeoSlug = (parts: (string | undefined)[]): string => {
    return parts.filter(Boolean).map(part => part!.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')).join('/');
};

export default function SeoOverridesPage() {
  const [cityCategorySettings, setCityCategorySettings] = useState<CityCategorySeoSetting[]>([]);
  const [areaCategorySettings, setAreaCategorySettings] = useState<AreaCategorySeoSetting[]>([]);
  const [categories, setCategories] = useState<FirestoreCategory[]>([]);
  const [cities, setCities] = useState<FirestoreCity[]>([]);
  const [areas, setAreas] = useState<FirestoreArea[]>([]);
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingSetting, setEditingSetting] = useState<any>(null);
  const [formType, setFormType] = useState<'cityCategory' | 'areaCategory' | 'city' | null>(null);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const cityCatSeoRef = collection(db, "cityCategorySeoSettings");
  const areaCatSeoRef = collection(db, "areaCategorySeoSettings");
  const citiesRef = collection(db, "cities");

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [catSnap, citySnap, areaSnap, cityCatSeoSnap, areaCatSeoSnap] = await Promise.all([
        getDocs(query(collection(db, "adminCategories"), orderBy("name"))),
        getDocs(query(citiesRef, orderBy("name"))),
        getDocs(query(collection(db, "areas"), orderBy("name"))),
        getDocs(query(cityCatSeoRef, orderBy("cityName"), orderBy("categoryName"))),
        getDocs(query(areaCatSeoRef, orderBy("cityName"), orderBy("areaName"), orderBy("categoryName"))),
      ]);
      setCategories(catSnap.docs.map(d => ({ ...d.data(), id: d.id } as FirestoreCategory)));
      setCities(citySnap.docs.map(d => ({ ...d.data(), id: d.id } as FirestoreCity)));
      setAreas(areaSnap.docs.map(d => ({ ...d.data(), id: d.id } as FirestoreArea)));
      setCityCategorySettings(cityCatSeoSnap.docs.map(d => ({ ...d.data(), id: d.id } as CityCategorySeoSetting)));
      setAreaCategorySettings(areaCatSeoSnap.docs.map(d => ({ ...d.data(), id: d.id } as AreaCategorySeoSetting)));
    } catch (error) {
      console.error("Error fetching SEO override data:", error);
      toast({ title: "Error", description: "Could not load SEO override data.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAddSetting = (type: 'cityCategory' | 'areaCategory' | 'city') => {
    setEditingSetting(null);
    setFormType(type);
    setIsFormOpen(true);
  };

  const handleEditSetting = (setting: any, type: 'cityCategory' | 'areaCategory' | 'city') => {
    setEditingSetting(setting);
    setFormType(type);
    setIsFormOpen(true);
  };

  const handleDeleteSetting = async (id: string, type: 'cityCategory' | 'areaCategory' | 'city') => {
    setIsSubmitting(true);
    const collectionRef = type === 'cityCategory' ? cityCatSeoRef : type === 'areaCategory' ? areaCatSeoRef : citiesRef;
    try {
      if (type === 'city') {
          await updateDoc(doc(citiesRef, id), {
              seo_title: null,
              seo_description: null,
              seo_keywords: null,
              h1_title: null,
              updatedAt: Timestamp.now()
          });
      } else {
          await deleteDoc(doc(collectionRef, id));
      }
      
      await triggerRefresh(type === 'city' ? 'cities' : 'global-cache');
      await triggerRefresh('sitemap');

      toast({ title: "Success", description: "SEO override deleted/reset successfully." });
      fetchData(); 
    } catch (error) {
      toast({ title: "Error", description: "Could not delete SEO override.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleToggleActive = async (setting: any, type: 'cityCategory' | 'areaCategory' | 'city') => {
    setIsSubmitting(true);
    const collectionRef = type === 'cityCategory' ? cityCatSeoRef : type === 'areaCategory' ? areaCatSeoRef : citiesRef;
    try {
        await updateDoc(doc(collectionRef, setting.id!), { isActive: !setting.isActive, updatedAt: Timestamp.now() });
        
        await triggerRefresh(type === 'city' ? 'cities' : 'global-cache');
        await triggerRefresh('sitemap');

        toast({ title: "Success", description: "Status updated."});
        fetchData();
    } catch (error) {
        toast({ title: "Error", description: "Could not update status.", variant: "destructive" });
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleCityFormSubmit = async (data: any) => {
      setIsSubmitting(true);
      try {
          const payload = {
              name: data.name,
              slug: data.slug || data.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
              seo_title: data.seo_title,
              seo_description: data.seo_description,
              seo_keywords: data.seo_keywords,
              h1_title: data.h1_title,
              isActive: data.isActive,
              updatedAt: Timestamp.now()
          };

          if (data.id && data.id !== 'new') {
              await updateDoc(doc(citiesRef, data.id), payload);
          } else {
              await addDoc(citiesRef, { ...payload, createdAt: Timestamp.now() });
          }
          
          await triggerRefresh('cities');
          await triggerRefresh('global-cache');
          await triggerRefresh('sitemap');

          if (payload.slug && payload.isActive) {
            submitPathToGoogleIndexing(`/${payload.slug}`, 'URL_UPDATED').catch(err => {
              console.error("Google Indexing error on city save:", err);
            });
          } else if (payload.slug && !payload.isActive) {
            submitPathToGoogleIndexing(`/${payload.slug}`, 'URL_DELETED').catch(err => {
              console.error("Google Indexing error on city save (inactive):", err);
            });
          }

          toast({ title: "Success", description: "City SEO settings saved." });
          setIsFormOpen(false); 
          fetchData();
      } catch (e) {
          toast({ title: "Error", description: (e as Error).message || "Could not save setting.", variant: "destructive" });
      } finally {
          setIsSubmitting(false);
      }
  };


  const handleCityCategoryFormSubmit = async (data: any) => {
    setIsSubmitting(true);
    const city = cities.find(c => c.id === data.cityId);
    const category = categories.find(c => c.id === data.categoryId);
    if (!city || !category) {
      toast({ title: "Error", description: "Selected city or category not found.", variant: "destructive" });
      setIsSubmitting(false);
      return;
    }
    
    // Prepare the payload for Firestore, excluding the client-side 'id' if it's a new document
    const basePayload: Omit<CityCategorySeoSetting, 'id' | 'createdAt' | 'updatedAt'> = {
        cityId: data.cityId,
        cityName: city.name,
        categoryId: data.categoryId,
        categoryName: category.name,
        slug: data.slug || generateSeoSlug([city.slug, category.slug]), 
        h1_title: data.h1_title,
        meta_title: data.meta_title,
        meta_description: data.meta_description,
        meta_keywords: data.meta_keywords,
        imageHint: data.imageHint,
        isActive: data.isActive,
    };

    try {
      if (data.id) { // Editing existing
        await updateDoc(doc(cityCatSeoRef, data.id), { ...basePayload, updatedAt: Timestamp.now() });
      } else { // Adding new
        // Check for duplicates before adding
        const q = query(cityCatSeoRef, where("cityId", "==", data.cityId), where("categoryId", "==", data.categoryId));
        const snap = await getDocs(q);
        if (!snap.empty) {
           toast({ title: "Duplicate Entry", description: "An SEO override for this city and category already exists.", variant: "destructive"});
           setIsSubmitting(false); return;
        }
        await addDoc(cityCatSeoRef, { ...basePayload, createdAt: Timestamp.now() });
      }

      await triggerRefresh('global-cache');
      await triggerRefresh('sitemap');

      const citySlug = city.slug;
      const categorySlug = category.slug;
      if (citySlug && categorySlug && basePayload.isActive) {
        submitPathToGoogleIndexing(`/${citySlug}/category/${categorySlug}`, 'URL_UPDATED').catch(err => {
          console.error("Google Indexing error on city-category save:", err);
        });
      } else if (citySlug && categorySlug && !basePayload.isActive) {
        submitPathToGoogleIndexing(`/${citySlug}/category/${categorySlug}`, 'URL_DELETED').catch(err => {
          console.error("Google Indexing error on city-category save (inactive):", err);
        });
      }

      toast({ title: "Success", description: "City-Category SEO setting saved." });
      setIsFormOpen(false); fetchData();
    } catch (e) {
      toast({ title: "Error", description: (e as Error).message || "Could not save setting.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleAreaCategoryFormSubmit = async (data: any) => {
    setIsSubmitting(true);
    const city = cities.find(c => c.id === data.cityId);
    const area = areas.find(a => a.id === data.areaId);
    const category = categories.find(c => c.id === data.categoryId);
    if (!city || !area || !category) {
      toast({ title: "Error", description: "Selected city, area, or category not found.", variant: "destructive" });
      setIsSubmitting(false);
      return;
    }
    
    const basePayload: Omit<AreaCategorySeoSetting, 'id' | 'createdAt' | 'updatedAt'> = {
      cityId: data.cityId, cityName: city.name, areaId: data.areaId, areaName: area.name,
      categoryId: data.categoryId, categoryName: category.name, 
      slug: data.slug || generateSeoSlug([city.slug, area.slug, category.slug]),
      h1_title: data.h1_title, meta_title: data.meta_title, meta_description: data.meta_description,
      meta_keywords: data.meta_keywords, imageHint: data.imageHint, isActive: data.isActive,
    };

    try {
      if (data.id) { // Editing existing
        await updateDoc(doc(areaCatSeoRef, data.id), { ...basePayload, updatedAt: Timestamp.now() });
      } else { // Adding new
        const q = query(areaCatSeoRef, where("areaId", "==", data.areaId), where("categoryId", "==", data.categoryId));
        const snap = await getDocs(q);
        if (!snap.empty) {
           toast({ title: "Duplicate Entry", description: "An SEO override for this area and category already exists.", variant: "destructive"});
           setIsSubmitting(false); return;
        }
        await addDoc(areaCatSeoRef, { ...basePayload, createdAt: Timestamp.now() });
      }

      await triggerRefresh('global-cache');
      await triggerRefresh('sitemap');

      const citySlug = city.slug;
      const areaSlug = area.slug;
      const categorySlug = category.slug;
      if (citySlug && areaSlug && categorySlug && basePayload.isActive) {
        submitPathToGoogleIndexing(`/${citySlug}/${areaSlug}/category/${categorySlug}`, 'URL_UPDATED').catch(err => {
          console.error("Google Indexing error on area-category save:", err);
        });
      } else if (citySlug && areaSlug && categorySlug && !basePayload.isActive) {
        submitPathToGoogleIndexing(`/${citySlug}/${areaSlug}/category/${categorySlug}`, 'URL_DELETED').catch(err => {
          console.error("Google Indexing error on area-category save (inactive):", err);
        });
      }

      toast({ title: "Success", description: "Area-Category SEO setting saved." });
      setIsFormOpen(false); fetchData();
    } catch (e) {
      toast({ title: "Error", description: (e as Error).message || "Could not save setting.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };


  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card><CardHeader><Skeleton className="h-8 w-1/2" /><Skeleton className="h-4 w-3/4 mt-2" /></CardHeader>
          <CardContent><Skeleton className="h-64 w-full" /></CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl flex items-center"><Zap className="mr-2 h-6 w-6 text-primary" />Advanced SEO Overrides</CardTitle>
          <CardDescription>Manage specific SEO settings for City-Category and Area-Category combinations.</CardDescription>
        </CardHeader>
      </Card>
      <Tabs defaultValue="city-homepage">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="city-homepage">City Homepages</TabsTrigger>
          <TabsTrigger value="city-category">City-Category SEO</TabsTrigger>
          <TabsTrigger value="area-category">Area-Category SEO</TabsTrigger>
        </TabsList>
        <TabsContent value="city-homepage">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div><CardTitle>City-Specific Homepages</CardTitle><CardDescription>Custom SEO and H1 for /[citySlug] pages.</CardDescription></div>
              <Button onClick={() => handleAddSetting('city')} disabled={isSubmitting}><PlusCircle className="mr-2 h-4 w-4"/>Add New City</Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>City Name</TableHead><TableHead>Slug</TableHead><TableHead>H1 Title</TableHead><TableHead className="text-center">Active</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                <TableBody>
                  {cities.map(city => (
                    <TableRow key={city.id}>
                      <TableCell className="font-bold">{city.name}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">/{city.slug}</TableCell>
                      <TableCell className="text-xs max-w-xs truncate" title={city.h1_title}>{city.h1_title || "Using global pattern"}</TableCell>
                      <TableCell className="text-center"><Switch checked={city.isActive} onCheckedChange={() => handleToggleActive(city, 'city')} disabled={isSubmitting}/></TableCell>
                      <TableCell className="text-right"><div className="flex justify-end gap-2"><Button variant="outline" size="sm" onClick={() => handleEditSetting(city, 'city')} disabled={isSubmitting}><Edit className="h-4 w-4 mr-2"/>SEO</Button></div></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="city-category">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div><CardTitle>City-Category Specific Settings</CardTitle><CardDescription>Overrides for /[city]/category/[categorySlug] pages.</CardDescription></div>
              <Button onClick={() => handleAddSetting('cityCategory')} disabled={isSubmitting || cities.length === 0 || categories.length === 0}><PlusCircle className="mr-2 h-4 w-4"/>Add New</Button>
            </CardHeader>
            <CardContent>
              {cityCategorySettings.length === 0 ? (
                 <div className="text-center py-10"><PackageSearch className="mx-auto h-12 w-12 text-muted-foreground mb-3" /><p className="text-muted-foreground">No City-Category SEO overrides found.</p></div>
              ) : (
                <Table>
                  <TableHeader><TableRow><TableHead>City</TableHead><TableHead>Category</TableHead><TableHead>Slug Segment</TableHead><TableHead>H1 Title</TableHead><TableHead className="text-center">Active</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {cityCategorySettings.map(setting => (
                      <TableRow key={setting.id}>
                        <TableCell>{setting.cityName}</TableCell><TableCell>{setting.categoryName}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{setting.slug}</TableCell>
                        <TableCell className="text-xs max-w-xs truncate" title={setting.h1_title}>{setting.h1_title || "Not set"}</TableCell>
                        <TableCell className="text-center"><Switch checked={setting.isActive} onCheckedChange={() => handleToggleActive(setting, 'cityCategory')} disabled={isSubmitting}/></TableCell>
                        <TableCell className="text-right"><div className="flex justify-end gap-2"><Button variant="outline" size="icon" onClick={() => handleEditSetting(setting, 'cityCategory')} disabled={isSubmitting}><Edit className="h-4 w-4"/></Button> <AlertDialog><AlertDialogTrigger asChild><Button variant="destructive" size="icon" disabled={isSubmitting}><Trash2 className="h-4 w-4"/></Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete Confirmation</AlertDialogTitle><AlertDialogDescription>Delete SEO override for {setting.cityName} - {setting.categoryName}?</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleDeleteSetting(setting.id!, 'cityCategory')} disabled={isSubmitting} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog></div></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="area-category">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div><CardTitle>Area-Category Specific Settings</CardTitle><CardDescription>Overrides for /[city]/[area]/[categorySlug] pages.</CardDescription></div>
              <Button onClick={() => handleAddSetting('areaCategory')} disabled={isSubmitting || cities.length === 0 || areas.length === 0 || categories.length === 0}><PlusCircle className="mr-2 h-4 w-4"/>Add New</Button>
            </CardHeader>
            <CardContent>
            {areaCategorySettings.length === 0 ? (
                <div className="text-center py-10"><PackageSearch className="mx-auto h-12 w-12 text-muted-foreground mb-3" /><p className="text-muted-foreground">No Area-Category SEO overrides found.</p></div>
            ) : (
                <Table>
                    <TableHeader><TableRow><TableHead>City</TableHead><TableHead>Area</TableHead><TableHead>Category</TableHead><TableHead>Slug Segment</TableHead><TableHead>H1 Title</TableHead><TableHead className="text-center">Active</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                    <TableBody>
                    {areaCategorySettings.map(setting => (
                        <TableRow key={setting.id}>
                        <TableCell>{setting.cityName}</TableCell><TableCell>{setting.areaName}</TableCell><TableCell>{setting.categoryName}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{setting.slug}</TableCell>
                        <TableCell className="text-xs max-w-xs truncate" title={setting.h1_title}>{setting.h1_title || "Not set"}</TableCell>
                        <TableCell className="text-center"><Switch checked={setting.isActive} onCheckedChange={() => handleToggleActive(setting, 'areaCategory')} disabled={isSubmitting}/></TableCell>
                        <TableCell className="text-right"><div className="flex justify-end gap-2"><Button variant="outline" size="icon" onClick={() => handleEditSetting(setting, 'areaCategory')} disabled={isSubmitting}><Edit className="h-4 w-4"/></Button> <AlertDialog><AlertDialogTrigger asChild><Button variant="destructive" size="icon" disabled={isSubmitting}><Trash2 className="h-4 w-4"/></Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete Confirmation</AlertDialogTitle><AlertDialogDescription>Delete SEO override for {setting.areaName} - {setting.categoryName}?</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleDeleteSetting(setting.id!, 'areaCategory')} disabled={isSubmitting} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog></div></TableCell>
                        </TableRow>
                    ))}
                    </TableBody>
                </Table>
            )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={isFormOpen} onOpenChange={(open) => { if (!isSubmitting) { setIsFormOpen(open); if (!open) { setEditingSetting(null); setFormType(null); } }}}>
        <DialogContent className="w-full max-w-xs sm:max-w-md md:max-w-lg lg:max-w-xl max-h-[90vh] overflow-y-auto p-0">
          <DialogHeader className="p-6 pb-4 border-b">
            <DialogTitle>{editingSetting ? 'Edit' : 'Add New'} {formType === 'city' ? 'City Homepage' : formType === 'cityCategory' ? 'City-Category' : 'Area-Category'} SEO Setting</DialogTitle>
            <DialogDescription>Fill in the details for the SEO override.</DialogDescription>
          </DialogHeader>
          <div className="p-6">
            {(formType !== 'city' && (cities.length === 0 || categories.length === 0)) || (formType === 'areaCategory' && areas.length === 0) ? (
                 <div className="py-8 text-center"><PackageSearch className="mx-auto h-10 w-10 text-muted-foreground mb-3" /><p className="text-destructive">Cannot add settings: Cities, Categories (and Areas for area-specific) must exist first.</p></div>
            ) : formType === 'city' ? (
              <CitySeoForm 
                initialData={editingSetting} 
                onSubmit={handleCityFormSubmit} 
                onCancel={() => setIsFormOpen(false)} 
                isSubmitting={isSubmitting} 
              />
            ) : formType === 'cityCategory' ? (
              <div className="py-8 text-center text-muted-foreground">CityCategorySeoForm Component Missing</div>
            ) : formType === 'areaCategory' ? (
              <div className="py-8 text-center text-muted-foreground">AreaCategorySeoForm Component Missing</div>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

    