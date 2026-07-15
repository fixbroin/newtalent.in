
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import type { ArtistApplication, ArtistControlOptions } from '@/types/firestore';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, MapPin, Camera, Image as ImageIcon, Trash2, Check, Lock, ChevronRight, AlertCircle, FileText, CheckCircle, ChevronDown, ChevronsDown } from "lucide-react";
import NextImage from 'next/image';
import { useToast } from "@/hooks/use-toast";
import { storage, db } from '@/lib/firebase';
import { ref as storageRefStandard, uploadBytesResumable, getDownloadURL, deleteObject } from "firebase/storage";
import { Progress } from "@/components/ui/progress";
import { useEffect, useRef, useState } from "react";
import { Timestamp, doc, getDoc } from "firebase/firestore";
import { useApplicationConfig } from '@/hooks/useApplicationConfig';
import dynamic from 'next/dynamic';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const STORAGE_KEY = 'newtalent_reg_step5';

const MapAddressSelector = dynamic(() => import('@/components/checkout/MapAddressSelector'), {
  loading: () => <div className="flex items-center justify-center h-64 bg-muted rounded-md"><Loader2 className="h-8 w-8 animate-spin" /></div>,
  ssr: false
});

const generateRandomHexString = (length: number) => Array.from({ length }, () => Math.floor(Math.random() * 16).toString(16)).join('');
const isFirebaseStorageUrl = (url: string | null | undefined): boolean => !!url && typeof url === 'string' && url.includes("firebasestorage.googleapis.com");
const isValidImageSrc = (url: string | null | undefined): url is string => {
    if (!url || url.trim() === '') return false;
    return url.startsWith('blob:') || url.startsWith('data:') || url.startsWith('http:') || url.startsWith('https:') || url.startsWith('/');
};

const DEFAULT_MAP_CENTER = { lat: 12.9716, lng: 77.5946 }; // Bangalore

const createStep5Schema = () => z.object({
  workAreaCenter: z.object({
    lat: z.number().optional(),
    lng: z.number().optional(),
  }).optional(),
  termsConfirmation: z.boolean().refine(value => value === true, {
    message: "You must agree to the terms and conditions.",
  }),
});

type Step5FormData = z.infer<ReturnType<typeof createStep5Schema>>;

interface Step5WorkAreaSignatureProps {
  onSubmit: (data: Partial<ArtistApplication>) => void;
  onPrevious: () => void;
  initialData: Partial<ArtistApplication>;
  controlOptions: ArtistControlOptions | null;
  isSaving: boolean;
  userUid: string;
}

export default function Step5WorkAreaSignature({
  onSubmit,
  onPrevious,
  initialData,
  isSaving,
  userUid,
}: Step5WorkAreaSignatureProps) {
  const { toast } = useToast();
  const { config: appConfig, isLoading: isLoadingAppSettings } = useApplicationConfig();

  const [isMapModalOpen, setIsMapModalOpen] = useState(false);
  const [isTermsModalOpen, setIsTermsModalOpen] = useState(false);
  const [termsContent, setTermsContent] = useState("");
  const [canAgreeTerms, setCanAgreeTerms] = useState(false);
  const termsScrollRef = useRef<HTMLDivElement>(null);

  const step5Schema = createStep5Schema();
  
  const form = useForm<Step5FormData>({
    resolver: zodResolver(step5Schema),
    defaultValues: {
      workAreaCenter: initialData.workAreaCenter ? { lat: initialData.workAreaCenter.latitude, lng: initialData.workAreaCenter.longitude } : undefined,
      termsConfirmation: initialData.termsConfirmedAt ? true : false,
    },
  });

  useEffect(() => {
    const fetchTerms = async () => {
      try {
        const docRef = doc(db, "ArtistControlOptions", "termsAndConditions");
        const snap = await getDoc(docRef);
        if (snap.exists()) setTermsContent(snap.data().content || "");
      } catch (e) {
        console.error("Error loading terms:", e);
      }
    };
    fetchTerms();

    // Auto-open terms if not already confirmed
    const hasConfirmedTerms = !!initialData.termsConfirmedAt;
    if (!hasConfirmedTerms) {
      setIsTermsModalOpen(true);
    }

    // Auto-open map and request permission on mount if location not set
    /* 
    const hasLocation = !!initialData.workAreaCenter;

    if (!hasLocation) {
      setIsMapModalOpen(true);
      if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            form.setValue("workAreaCenter", {
              lat: position.coords.latitude,
              lng: position.coords.longitude
            }, { shouldValidate: true });
          },
          (error) => console.warn("Geolocation prompt error:", error),
          { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
        );
      }
    }
    */
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const data = JSON.parse(saved);
        form.reset({ ...initialData, ...data });
      } catch (e) {
        console.error("Error restoring Step 5 from storage:", e);
      }
    }
  }, [initialData, form]);

  useEffect(() => {
    const subscription = form.watch((value) => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
    });
    return () => subscription.unsubscribe();
  }, [form]);

  useEffect(() => {
    form.reset({
      workAreaCenter: initialData.workAreaCenter ? { lat: initialData.workAreaCenter.latitude, lng: initialData.workAreaCenter.longitude } : undefined,
      termsConfirmation: initialData.termsConfirmedAt ? true : false,
    });
  }, [initialData, form]);

  const handleMapAddressSelect = (addressData: any) => {
    if (addressData.latitude && addressData.longitude) {
      form.setValue("workAreaCenter", { lat: addressData.latitude, lng: addressData.longitude });
      setIsMapModalOpen(false);
      setIsTermsModalOpen(true); 
    }
  };

  const handleScrollTerms = () => {
    const el = termsScrollRef.current;
    if (el) {
      const isAtBottom = el.scrollHeight - el.scrollTop <= el.clientHeight + 5;
      if (isAtBottom) setCanAgreeTerms(true);
    }
  };

  useEffect(() => {
    if (isTermsModalOpen && termsScrollRef.current) {
      const el = termsScrollRef.current;
      if (el.scrollHeight <= el.clientHeight) {
        setCanAgreeTerms(true);
      }
    }
  }, [isTermsModalOpen, termsContent]);

  const handleAgreeTerms = () => {
    form.setValue("termsConfirmation", true, { shouldValidate: true });
    setIsTermsModalOpen(false);
    toast({ title: "Consent Recorded", description: "You have agreed to the terms and conditions." });
  };

  const handleSubmit = async (data: Step5FormData) => {
    if (!data.termsConfirmation) {
        form.setError("termsConfirmation", { type: "manual", message: "You must confirm the information." });
        return;
    }

    try {
      const applicationStepData: Partial<ArtistApplication> = {
        workAreaCenter: data.workAreaCenter?.lat && data.workAreaCenter?.lng ? {
          latitude: data.workAreaCenter.lat,
          longitude: data.workAreaCenter.lng,
        } : undefined,
        termsConfirmedAt: data.termsConfirmation ? Timestamp.now() : undefined,
      };
      onSubmit(applicationStepData);

    } catch (error) {
      console.error("Error in Step 5 submission:", error);
    }
  };

  const effectiveIsSaving = isSaving;
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)}>
        <CardContent className="space-y-6">
          <Card className="p-4 border bg-muted/10 shadow-sm">
            <CardHeader className="p-0 pb-3">
              <CardTitle className="text-lg flex items-center">
                <CheckCircle className="mr-2 h-5 w-5 text-primary"/>
                Final Declaration
              </CardTitle>
              <p className="text-[10px] text-muted-foreground mt-1">
                Please review and confirm the declaration below to submit your application.
              </p>
            </CardHeader>
          </Card>

          <div className="space-y-4 pt-4 border-t">
            <CardHeader className="p-0 pb-3">
              <CardTitle className="text-lg flex items-center">
                <FileText className="mr-2 h-5 w-5 text-primary"/>
                Declaration
              </CardTitle>
            </CardHeader>

            <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 mb-4">
              <p className="text-sm font-medium text-primary leading-relaxed">
                "I hereby declare that all the information provided by me in this application is true, complete, and correct. I understand that any false statement or omission of facts may lead to the rejection of my profile on NewTalent.in or termination of my access to the networking platform."
              </p>
            </div>
            
          </div>

          <div className="space-y-4 pt-4 border-t">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <FormLabel className="text-sm font-semibold">Terms & Conditions Confirmation</FormLabel>
                <Button type="button" variant="outline" size="sm" onClick={() => setIsTermsModalOpen(true)} className="h-8 text-xs">
                    <FileText className="mr-1.5 h-3.5 w-3.5" /> Read Terms Again
                </Button>
            </div>
            
            <FormField
                control={form.control}
                name="termsConfirmation"
                render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 shadow-sm bg-primary/5 border-primary/20">
                    <FormControl>
                    <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={effectiveIsSaving}
                        id="termsConfirmationStep5"
                    />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                    <FormLabel htmlFor="termsConfirmationStep5" className="cursor-pointer text-sm font-semibold text-primary">
                        I confirm that all the information provided above is true and accurate to the best of my knowledge.
                    </FormLabel>
                    <FormMessage />
                    </div>
                </FormItem>
                )}
            />
          </div>
        </CardContent>
        <CardFooter className="flex justify-between border-t pt-6 bg-muted/5">
          <Button type="button" variant="outline" onClick={onPrevious} disabled={effectiveIsSaving}>Previous</Button>
          <Button type="submit" disabled={effectiveIsSaving}>
            {effectiveIsSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {effectiveIsSaving ? "Submitting..." : "Submit Application"}
          </Button>
        </CardFooter>
      </form>

      {/* Popups Flow */}
      <Dialog open={isMapModalOpen} onOpenChange={() => {}}>
        <DialogContent 
          className="max-w-3xl w-[95vw] h-[80vh] p-0 flex flex-col [&>button]:hidden" 
          onPointerDownOutside={(e) => e.preventDefault()} 
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <DialogHeader className="p-4 border-b">
            <DialogTitle>Location Coordinates</DialogTitle>
            <DialogDescription>Please select your base location coordinates on the map to continue.</DialogDescription>
          </DialogHeader>
          <div className="flex-grow relative">
            {!isLoadingAppSettings && appConfig.googleMapsApiKey ? (
              <MapAddressSelector 
                apiKey={appConfig.googleMapsApiKey} 
                onAddressSelect={handleMapAddressSelect} 
                onClose={() => setIsMapModalOpen(false)} 
                initialCenter={initialData.workAreaCenter ? { lat: initialData.workAreaCenter.latitude, lng: initialData.workAreaCenter.longitude } : null} 
                onMountLocate={true}
              />
            ) : <div className="flex items-center justify-center h-full"><Loader2 className="animate-spin"/></div>}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isTermsModalOpen} onOpenChange={() => {}}>
        <DialogContent 
          className="max-w-xl w-[90vw] p-0 flex flex-col [&>button]:hidden" 
          onPointerDownOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <DialogHeader className="p-2 border-b bg-primary text-primary-foreground">
            <DialogTitle className="text-xl">Artist Terms & Conditions</DialogTitle>
            <DialogDescription className="text-primary-foreground/80">Please read and accept our terms to join the network.</DialogDescription>
          </DialogHeader>
          
          <div className="relative flex-grow min-h-0 border-b">
            <div 
              ref={termsScrollRef}
              onScroll={handleScrollTerms}
              className="overflow-y-auto max-h-[60vh] p-4 pr-6 text-sm leading-relaxed prose prose-sm dark:prose-invert select-none"
              dangerouslySetInnerHTML={{ __html: termsContent || "<p>Loading terms...</p>" }}
            />
            {!canAgreeTerms && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-primary text-primary-foreground px-3 py-1.5 rounded-full shadow-lg border border-primary-foreground/10 text-xs font-bold animate-bounce pointer-events-none select-none z-10 opacity-90">
                <ChevronsDown className="h-4 w-4 animate-pulse" />
                <span>READ & SCROLL DOWN</span>
              </div>
            )}
          </div>

          <DialogFooter className="p-2 bg-muted/50 flex flex-col gap-3">
            <div className="flex items-center space-x-2 text-xs text-muted-foreground italic">
              {!canAgreeTerms && <span>Please scroll to the bottom to enable the Agree button.</span>}
              {canAgreeTerms && <span className="text-green-600 flex items-center gap-1"><Check className="h-3 w-3"/> Content read. You may proceed.</span>}
            </div>
            <Button onClick={handleAgreeTerms} disabled={!canAgreeTerms} className="w-full shadow-sm">
              I Agree to the Terms & Conditions
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Form>
  );
}
