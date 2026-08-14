
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox"; 
import { Badge } from "@/components/ui/badge";
import type { ArtistApplication, ArtistControlOptions, LanguageOption, QualificationOption } from '@/types/firestore';
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Loader2, User, Mail, Phone, MapPin, BookOpen, Languages, Camera, Image as ImageIcon, Trash2, AlertCircle, ArrowLeft, ChevronRight, Check, Info } from "lucide-react";
import NextImage from 'next/image';
import { useToast } from "@/hooks/use-toast";
import { storage } from '@/lib/firebase';
import { ref as storageRefStandard, uploadBytesResumable, getDownloadURL, deleteObject } from "firebase/storage";
import { Progress } from "@/components/ui/progress";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useApplicationConfig } from "@/hooks/useApplicationConfig";
import axios from "axios";

const STORAGE_KEY = 'newtalent_reg_step2';

const generateRandomHexString = (length: number) => Array.from({ length }, () => Math.floor(Math.random() * 16).toString(16)).join('');
const isFirebaseStorageUrl = (url: string | null | undefined): boolean => !!url && typeof url === 'string' && url.includes("firebasestorage.googleapis.com");
const isValidImageSrc = (url: string | null | undefined): url is string => {
    if (!url || url.trim() === '') return false;
    return url.startsWith('blob:') || url.startsWith('data:') || url.startsWith('http:') || url.startsWith('https:') || url.startsWith('/');
};


const step2PersonalInfoSchema = z.object({
  fullName: z.string().min(2, "Full name is required.").max(100),
  email: z.string().email("Invalid email.").min(5, "Email is required."),
  mobileNumber: z.string().min(10, "Valid mobile number required.").max(15).regex(/^\+?[1-9]\d{1,14}$/, "Invalid phone format."),
  pinCode: z.string().length(6, "Pin Code must be 6 digits."),
  city: z.string().min(1, "City is required."),
  area: z.string().min(1, "Area is required."),
  height: z.string().min(1, "Height is required."),
  weight: z.string().min(1, "Weight is required."),
  skinTone: z.string().min(1, "Skin tone is required."),
  age: z.coerce.number().min(5, "Must be at least 5.").max(99, "Age seems incorrect."),
  qualificationId: z.string({ required_error: "Please select your qualification." }),
  alternateMobile: z.string().max(15).regex(/^\+?[1-9]\d{1,14}$/, "Invalid alternate phone format.").optional().or(z.literal('')),
  bio: z.string().max(500, "Bio cannot exceed 500 characters.").optional().or(z.literal('')),
  profilePhotoUrl: z.string().url("Invalid photo URL.").optional().nullable(),
});

type Step2FormData = z.infer<typeof step2PersonalInfoSchema>;

interface Step2PersonalInfoProps {
  onNext: (data: Partial<ArtistApplication>, uploadedPhotoUrl?: string | null) => void;
  onPrevious: () => void;
  initialData: Partial<ArtistApplication>;
  controlOptions: ArtistControlOptions | null;
  isSaving: boolean;
  userUid: string;
}

const SKIN_TONE_OPTIONS = ["Fair", "Very Fair", "Medium", "Olive", "Tan", "Brown", "Dark"];

export default function Step2PersonalInfo({
  onNext,
  onPrevious,
  initialData,
  controlOptions,
  isSaving,
  userUid,
}: Step2PersonalInfoProps) {
  const { toast } = useToast();
  const { user, firestoreUser } = useAuth();
  const { config: appConfig } = useApplicationConfig();
  const [currentImagePreview, setCurrentImagePreview] = useState<string | null>(initialData.profilePhotoUrl || null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [statusMessage, setStatusMessage] = useState("");
  const [showPhotoError, setShowPhotoError] = useState(false);
  const [isQualificationDialogOpen, setIsQualificationDialogOpen] = useState(false);
  const [isSkinToneDialogOpen, setIsSkinToneDialogOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [isFetchingAddress, setIsFetchingAddress] = useState(false);
  const [detectedAddress, setDetectedAddress] = useState("");

  const form = useForm<Step2FormData>({
    resolver: zodResolver(step2PersonalInfoSchema),
    defaultValues: {
      fullName: initialData?.fullName || firestoreUser?.displayName || user?.displayName || "",
      email: initialData?.email || firestoreUser?.email || user?.email || "",
      mobileNumber: initialData?.mobileNumber || firestoreUser?.mobileNumber || user?.phoneNumber || "",
      pinCode: initialData?.pinCode || "",
      city: initialData?.city || "",
      area: initialData?.area || "",
      height: initialData?.height || "",
      weight: initialData?.weight || "",
      skinTone: initialData?.skinTone || "",
      age: initialData?.age ?? undefined, 
      qualificationId: initialData?.qualificationId || undefined,
      alternateMobile: initialData?.alternateMobile || "",
      bio: initialData?.bio || "",
      profilePhotoUrl: initialData?.profilePhotoUrl || null,
    },
  });

  const watchedPinCode = form.watch('pinCode');
  const watchedFields = form.watch();
  const bioManuallyEdited = useRef(!!initialData.bio);

  useEffect(() => {
    if (bioManuallyEdited.current) return;

    const categoryName = initialData.workCategoryName || "";
    const experienceLevel = initialData.experienceLevelLabel || "";
    const gender = initialData.gender || "";
    const fullName = watchedFields.fullName || "";
    
    const parts: string[] = [];
    
    if (fullName) {
      parts.push(`Hello, I am ${fullName}.`);
    }
    
    const descriptionDetails: string[] = [];
    if (gender) descriptionDetails.push(gender.toLowerCase());
    if (categoryName) descriptionDetails.push(categoryName);
    
    if (descriptionDetails.length > 0) {
      let intro = `I am a ${descriptionDetails.join(" ")}`;
      if (experienceLevel) {
        intro += ` with ${experienceLevel.toLowerCase()} of experience`;
      }
      const location = watchedFields.area && watchedFields.city ? `${watchedFields.area}, ${watchedFields.city}` : (watchedFields.city || "");
      if (location) {
        intro += `, based in ${location}`;
      }
      intro += ".";
      parts.push(intro);
    }
    
    const physicalStats: string[] = [];
    if (watchedFields.age) physicalStats.push(`${watchedFields.age} years old`);
    if (watchedFields.height) physicalStats.push(`${watchedFields.height} cm tall`);
    if (watchedFields.weight) physicalStats.push(`weighing ${watchedFields.weight} kg`);
    if (watchedFields.skinTone) physicalStats.push(`with a ${watchedFields.skinTone.toLowerCase()} skin tone`);
    
    if (physicalStats.length > 0) {
      parts.push(`I am ${physicalStats.join(", ")}.`);
    }
    
    const qualificationLabel = controlOptions?.qualificationOptions?.find(q => q.id === watchedFields.qualificationId)?.label;
    if (qualificationLabel) {
      parts.push(`I have completed my ${qualificationLabel}.`);
    }
    
    const selectedLangIds = initialData.languagesSpokenIds || [];
    const standardLangs = controlOptions?.languageOptions
      .filter(lang => selectedLangIds.includes(lang.id) && lang.id !== 'other')
      .map(lang => lang.label) || [];
      
    if (selectedLangIds.includes('other') && initialData.otherLanguageText) {
      standardLangs.push(initialData.otherLanguageText);
    }
    const languagesList = standardLangs.join(", ");
      
    if (languagesList) {
      parts.push(`I speak ${languagesList}.`);
    }
    
    const generatedBio = parts.join(" ");
    form.setValue("bio", generatedBio, { shouldValidate: true });
  }, [
    watchedFields.fullName,
    watchedFields.city,
    watchedFields.area,
    watchedFields.height,
    watchedFields.weight,
    watchedFields.skinTone,
    watchedFields.age,
    watchedFields.qualificationId,
    initialData.workCategoryName,
    initialData.experienceLevelLabel,
    initialData.gender,
    initialData.languagesSpokenIds,
    initialData.otherLanguageText,
    controlOptions
  ]);

  const handleResetBio = () => {
    bioManuallyEdited.current = false;
    const categoryName = initialData.workCategoryName || "";
    const experienceLevel = initialData.experienceLevelLabel || "";
    const gender = initialData.gender || "";
    const fullName = watchedFields.fullName || "";
    
    const parts: string[] = [];
    
    if (fullName) {
      parts.push(`Hello, I am ${fullName}.`);
    }
    
    const descriptionDetails: string[] = [];
    if (gender) descriptionDetails.push(gender.toLowerCase());
    if (categoryName) descriptionDetails.push(categoryName);
    
    if (descriptionDetails.length > 0) {
      let intro = `I am a ${descriptionDetails.join(" ")}`;
      if (experienceLevel) {
        intro += ` with ${experienceLevel.toLowerCase()} of experience`;
      }
      const location = watchedFields.area && watchedFields.city ? `${watchedFields.area}, ${watchedFields.city}` : (watchedFields.city || "");
      if (location) {
        intro += `, based in ${location}`;
      }
      intro += ".";
      parts.push(intro);
    }
    
    const physicalStats: string[] = [];
    if (watchedFields.age) physicalStats.push(`${watchedFields.age} years old`);
    if (watchedFields.height) physicalStats.push(`${watchedFields.height} cm tall`);
    if (watchedFields.weight) physicalStats.push(`weighing ${watchedFields.weight} kg`);
    if (watchedFields.skinTone) physicalStats.push(`with a ${watchedFields.skinTone.toLowerCase()} skin tone`);
    
    if (physicalStats.length > 0) {
      parts.push(`I am ${physicalStats.join(", ")}.`);
    }
    
    const qualificationLabel = controlOptions?.qualificationOptions?.find(q => q.id === watchedFields.qualificationId)?.label;
    if (qualificationLabel) {
      parts.push(`I have completed my ${qualificationLabel}.`);
    }
    
    const selectedLangIds = initialData.languagesSpokenIds || [];
    const standardLangs = controlOptions?.languageOptions
      .filter(lang => selectedLangIds.includes(lang.id) && lang.id !== 'other')
      .map(lang => lang.label) || [];
      
    if (selectedLangIds.includes('other') && initialData.otherLanguageText) {
      standardLangs.push(initialData.otherLanguageText);
    }
    const languagesList = standardLangs.join(", ");
      
    if (languagesList) {
      parts.push(`I speak ${languagesList}.`);
    }
    
    const generatedBio = parts.join(" ");
    form.setValue("bio", generatedBio, { shouldValidate: true });
    
    toast({
      title: "Bio Reset",
      description: "Bio has been reset to the default autogenerated template.",
    });
  };

  useEffect(() => {
    const fetchAddress = async () => {
      if (watchedPinCode?.length === 6 && appConfig?.googleMapsApiKey) {
        setIsFetchingAddress(true);
        try {
          const response = await axios.get(
            `https://maps.googleapis.com/maps/api/geocode/json?address=${watchedPinCode}&key=${appConfig.googleMapsApiKey}&components=country:IN`
          );

          if (response.data.status === "OK" && response.data.results.length > 0) {
            const result = response.data.results[0];
            const addressComponents = result.address_components;
            
            let locality = "";
            let sublocality = "";
            let state = "";

            for (const component of addressComponents) {
              const types = component.types;
              if (types.includes("locality")) locality = component.long_name;
              if (types.includes("sublocality_level_1")) sublocality = component.long_name;
              if (types.includes("administrative_area_level_1")) state = component.long_name;
            }

            const finalCity = locality || state || "";
            const finalArea = sublocality || locality || "";

            form.setValue('city', finalCity, { shouldValidate: true });
            form.setValue('area', finalArea, { shouldValidate: true });
            setDetectedAddress(result.formatted_address || `${finalArea}, ${finalCity}`);
          } else {
            console.warn("Geocoding failed:", response.data.status);
            setDetectedAddress("");
          }
        } catch (error) {
          console.error("Error fetching address from Pin Code:", error);
          setDetectedAddress("");
        } finally {
          setIsFetchingAddress(false);
        }
      } else if (watchedPinCode?.length < 6) {
        setDetectedAddress("");
        if (form.getValues('city') || form.getValues('area')) {
            form.setValue('city', "");
            form.setValue('area', "");
        }
      }
    };

    fetchAddress();
  }, [watchedPinCode, appConfig, form]);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const isEditMode = typeof window !== 'undefined' && 
    (window.location.search.includes('editApplicationId=') || window.location.search.includes('edit='));

  // Load from Local Storage on mount
  useEffect(() => {
    if (!isMounted || isEditMode) return;
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const data = JSON.parse(saved);
        form.reset({ ...form.getValues(), ...data });
        if (data.profilePhotoUrl) {
          setCurrentImagePreview(data.profilePhotoUrl);
        }
      } catch (e) {
        console.error("Error restoring Step 2 from storage:", e);
      }
    }
  }, [isMounted, form, isEditMode]);

  // Auto-save to Local Storage on change
  useEffect(() => {
    if (isEditMode) return;
    const subscription = form.watch((value) => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
    });
    return () => subscription.unsubscribe();
  }, [form, isEditMode]);
  
  // Sync with initialData and firestoreUser for auto-fill
  useEffect(() => {
    if (!isMounted) return;

    const currentValues = form.getValues();
    // Only auto-fill if fields are currently empty (prevents overwriting user's active typing)
    const shouldFill = !currentValues.fullName && !currentValues.mobileNumber;

    if (shouldFill || initialData?.fullName) {
        form.reset({
            fullName: initialData.fullName || firestoreUser?.displayName || user?.displayName || "",
            email: initialData.email || firestoreUser?.email || user?.email || "",
            mobileNumber: initialData.mobileNumber || firestoreUser?.mobileNumber || user?.phoneNumber || "",
            pinCode: initialData.pinCode || "",
            city: initialData.city || "",
            area: initialData.area || "",
            height: initialData.height || "",
            weight: initialData.weight || "",
            skinTone: initialData.skinTone || "",
            age: initialData.age ?? undefined, 
            qualificationId: initialData.qualificationId || undefined,
            alternateMobile: initialData.alternateMobile || "",
            bio: initialData.bio || "",
            profilePhotoUrl: initialData.profilePhotoUrl || null,
        });
        setCurrentImagePreview(initialData.profilePhotoUrl || null);
    }
  }, [initialData, firestoreUser, user, form, isMounted]);


  const handleFileSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      let file = event.target.files[0];
      if (file.size > 50 * 1024 * 1024) {
        toast({ title: "File Too Large", description: "Image must be < 50MB.", variant: "destructive" });
        if (fileInputRef.current) fileInputRef.current.value = "";
        setSelectedFile(null); setCurrentImagePreview(form.getValues('profilePhotoUrl') || initialData.profilePhotoUrl || null); return;
      }

      if (file.size > 1 * 1024 * 1024 && file.type.startsWith('image/')) {
        setStatusMessage("Compressing image...");
        try {
          const { compressImage } = await import('@/lib/imageCompression');
          file = await compressImage(file);
        } catch (err) {
          console.error("Compression error:", err);
        } finally {
          setStatusMessage("");
        }
      }

      setSelectedFile(file); setCurrentImagePreview(URL.createObjectURL(file));
      form.setValue('profilePhotoUrl', null, { shouldValidate: false });
      setShowPhotoError(false);
    } else {
      setSelectedFile(null); setCurrentImagePreview(form.getValues('profilePhotoUrl') || initialData.profilePhotoUrl || null);
    }
  };

  const handleRemoveImage = () => {
    if (selectedFile && currentImagePreview?.startsWith('blob:')) URL.revokeObjectURL(currentImagePreview);
    setSelectedFile(null); setCurrentImagePreview(null);
    form.setValue('profilePhotoUrl', null, { shouldValidate: true });
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async (data: Step2FormData) => {
    if (!selectedFile && !data.profilePhotoUrl && !initialData.profilePhotoUrl) {
        setShowPhotoError(true);
        toast({ title: "Profile Photo Required", description: "Please upload your passport size profile photo to continue.", variant: "destructive" });
        return;
    }

    let finalPhotoUrl = data.profilePhotoUrl || null;

    if (selectedFile) {
      setStatusMessage("Uploading profile photo..."); setUploadProgress(0);
      try {
        if (initialData.profilePhotoUrl && isFirebaseStorageUrl(initialData.profilePhotoUrl)) {
          try { await deleteObject(storageRefStandard(storage, initialData.profilePhotoUrl)); }
          catch (e) { console.warn("Old profile photo not deleted:", e); }
        }

        const extension = selectedFile.name.split('.').pop()?.toLowerCase() || 'jpg';
        const randomString = generateRandomHexString(8);
        const fileName = `profile_photo_${randomString}.${extension}`;
        const imagePath = `Artist_profiles/${userUid}/${fileName}`;
        const imageRef = storageRefStandard(storage, imagePath);
        const uploadTask = uploadBytesResumable(imageRef, selectedFile);

        finalPhotoUrl = await new Promise<string>((resolve, reject) => {
          uploadTask.on('state_changed',
            (snapshot) => setUploadProgress((snapshot.bytesTransferred / snapshot.totalBytes) * 100),
            (error) => reject(error),
            async () => { try { resolve(await getDownloadURL(uploadTask.snapshot.ref)); } catch (e) { reject(e); } }
          );
        });
        setStatusMessage("Photo uploaded.");
      } catch (uploadError) {
        toast({ title: "Photo Upload Failed", description: (uploadError as Error).message || "Could not upload photo.", variant: "destructive" });
        setStatusMessage(""); setUploadProgress(null); return; 
      }
    } else if (!finalPhotoUrl && initialData.profilePhotoUrl && isFirebaseStorageUrl(initialData.profilePhotoUrl)) {
        setStatusMessage("Removing profile photo...");
        try { await deleteObject(storageRefStandard(storage, initialData.profilePhotoUrl)); finalPhotoUrl = null; }
        catch (e) { console.warn("Old profile photo not deleted:", e); }
        setStatusMessage("Photo removed.");
    }
    
    const qualification = controlOptions?.qualificationOptions.find(q => q.id === data.qualificationId);
    const cityName = controlOptions?.cities?.find(c => c.id === data.city)?.name;
    const areaName = controlOptions?.areas?.find(a => a.id === data.area)?.name;

    const selectedLangIds = initialData.languagesSpokenIds || [];
    const languages = controlOptions?.languageOptions.filter(lang => selectedLangIds.includes(lang.id));

    const applicationStepData: Partial<ArtistApplication> = {
      ...data,
      city: cityName || data.city,
      area: areaName || data.area,
      age: Number(data.age) || undefined, 
      profilePhotoUrl: (finalPhotoUrl as string | undefined) || undefined,
      qualificationLabel: qualification?.label,
      languagesSpokenIds: selectedLangIds,
      languagesSpokenLabels: languages?.map(l => l.label) || [],
    };
    onNext(applicationStepData, finalPhotoUrl === undefined ? initialData.profilePhotoUrl : finalPhotoUrl);
  };

  const displayPreviewUrl = isValidImageSrc(currentImagePreview) ? currentImagePreview : null;
  const effectiveIsSaving = isSaving || statusMessage.startsWith("Uploading") || statusMessage.startsWith("Compressing");


  if (!controlOptions) {
    return <Card><CardContent className="pt-6 text-center"><Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" /> Loading options...</CardContent></Card>;
  }

  const handleInvalid = () => {
    setTimeout(() => {
      const firstErrorEl = document.querySelector('[aria-invalid="true"], .border-destructive, .text-destructive');
      if (firstErrorEl) {
        const rect = firstErrorEl.getBoundingClientRect();
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        window.scrollTo({ top: rect.top + scrollTop - 100, behavior: 'smooth' });
        
        const inputEl = firstErrorEl.querySelector('input, textarea, select') || firstErrorEl;
        if (inputEl instanceof HTMLElement && typeof inputEl.focus === 'function') {
          inputEl.focus();
        }
      }
    }, 50);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit, handleInvalid)}>
        <CardContent className="space-y-6">
          <FormField control={form.control} name="fullName" render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center"><User className="mr-2 h-4 w-4 text-muted-foreground"/>Full Name <span className="text-destructive ml-1">*</span></FormLabel>
              <FormControl><Input placeholder="Your full name" {...field} disabled={effectiveIsSaving}/></FormControl>
              <FormMessage />
            </FormItem>
          )}/>
          <FormField control={form.control} name="email" render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center"><Mail className="mr-2 h-4 w-4 text-muted-foreground"/>Email <span className="text-destructive ml-1">*</span></FormLabel>
              <FormControl><Input type="email" placeholder="your.email@example.com" {...field} disabled={effectiveIsSaving} /></FormControl>
              <FormMessage />
            </FormItem>
          )}/>
          <FormField control={form.control} name="mobileNumber" render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center"><Phone className="mr-2 h-4 w-4 text-muted-foreground"/>Mobile Number <span className="text-destructive ml-1">*</span></FormLabel>
              <FormControl><Input type="tel" placeholder="+91 XXXXX XXXXX" {...field} disabled={effectiveIsSaving} /></FormControl>
              <FormMessage />
            </FormItem>
          )}/>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="pinCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center"><MapPin className="mr-2 h-4 w-4 text-muted-foreground"/>Pin Code <span className="text-destructive ml-1">*</span></FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input 
                        placeholder="6-digit Pin Code" 
                        {...field} 
                        maxLength={6}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                          field.onChange(val);
                        }}
                        disabled={effectiveIsSaving} 
                      />
                      {isFetchingAddress && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="flex flex-col justify-end pb-1.5">
              {detectedAddress && (
                <div className="flex items-start gap-2 text-sm text-muted-foreground bg-muted/30 p-2 rounded-md border border-dashed animate-in fade-in slide-in-from-top-1">
                  <Check className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                  <div className="flex flex-col">
                    <span className="font-semibold text-foreground">Detected Address:</span>
                    <span>{detectedAddress}</span>
                  </div>
                </div>
              )}
              {isFetchingAddress && <span className="text-xs text-muted-foreground animate-pulse ml-2">Fetching location details...</span>}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <FormField control={form.control} name="height" render={({ field }) => (
              <FormItem>
                <FormLabel>Height <span className="text-destructive ml-1">*</span></FormLabel>
                <FormControl><Input placeholder={"e.g., 5'8\""} {...field} disabled={effectiveIsSaving}/></FormControl>
                <FormMessage />
              </FormItem>
            )}/>
            <FormField control={form.control} name="weight" render={({ field }) => (
              <FormItem>
                <FormLabel>Weight (kg) <span className="text-destructive ml-1">*</span></FormLabel>
                <FormControl><Input placeholder="e.g., 65" {...field} disabled={effectiveIsSaving}/></FormControl>
                <FormMessage />
              </FormItem>
            )}/>
            <FormField
              control={form.control}
              name="skinTone"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Skin Tone <span className="text-destructive ml-1">*</span></FormLabel>
                  <Dialog open={isSkinToneDialogOpen} onOpenChange={setIsSkinToneDialogOpen}>
                    <DialogTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-between h-11 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                          disabled={effectiveIsSaving}
                        >
                          <span className="truncate">
                            {field.value || "Select skin tone"}
                          </span>
                          <ChevronRight className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </FormControl>
                    </DialogTrigger>
                    <DialogContent className="p-0 max-w-[90vw] sm:max-w-md">
                      <DialogHeader className="p-4 border-b">
                        <DialogTitle>Select Skin Tone</DialogTitle>
                      </DialogHeader>
                      <ScrollArea className="h-64">
                        <div className="p-2 space-y-1">
                          {SKIN_TONE_OPTIONS.map((opt) => (
                            <Button
                              key={opt}
                              variant="ghost"
                              className="w-full justify-between font-normal h-11 px-3"
                              onClick={() => {
                                field.onChange(opt);
                                setIsSkinToneDialogOpen(false);
                              }}
                            >
                              <span>{opt}</span>
                              {field.value === opt && <Check className="h-4 w-4 text-primary" />}
                            </Button>
                          ))}
                        </div>
                      </ScrollArea>
                    </DialogContent>
                  </Dialog>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField 
            control={form.control} 
            name="age" 
            render={({ field }) => {
              const inputValue = field.value === undefined || field.value === null ? '' : String(field.value);
              return (
                <FormItem>
                  <FormLabel>Age <span className="text-destructive ml-1">*</span></FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      placeholder="e.g., 25" 
                      {...field} 
                      value={inputValue}
                      onChange={(e) => {
                        field.onChange(e.target.value === '' ? null : e.target.value); 
                      }}
                      disabled={effectiveIsSaving}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              );
            }}
          />

          <FormField
            control={form.control}
            name="qualificationId"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel className="flex items-center"><BookOpen className="mr-2 h-4 w-4 text-muted-foreground"/>Highest Qualification <span className="text-destructive ml-1">*</span></FormLabel>
                <Dialog open={isQualificationDialogOpen} onOpenChange={setIsQualificationDialogOpen}>
                  <DialogTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-between h-11 text-left font-normal",
                          !field.value && "text-muted-foreground"
                        )}
                        disabled={effectiveIsSaving}
                      >
                        <span className="truncate">
                          {field.value
                            ? controlOptions.qualificationOptions.find((opt) => opt.id === field.value)?.label
                            : "Select your qualification"}
                        </span>
                        <ChevronRight className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </FormControl>
                  </DialogTrigger>
                  <DialogContent className="p-0 max-w-[90vw] sm:max-w-md">
                    <DialogHeader className="p-4 border-b">
                      <DialogTitle>Select Qualification</DialogTitle>
                    </DialogHeader>
                    <ScrollArea className="h-72">
                      <div className="p-2 space-y-1">
                        {controlOptions.qualificationOptions.map((opt) => (
                          <Button
                            key={opt.id}
                            variant="ghost"
                            className="w-full justify-between font-normal h-11 px-3"
                            onClick={() => {
                              field.onChange(opt.id);
                              setIsQualificationDialogOpen(false);
                            }}
                          >
                            <span>{opt.label}</span>
                            {field.value === opt.id && <Check className="h-4 w-4 text-primary" />}
                          </Button>
                        ))}
                      </div>
                    </ScrollArea>
                  </DialogContent>
                </Dialog>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField control={form.control} name="alternateMobile" render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center"><Phone className="mr-2 h-4 w-4 text-muted-foreground"/>Alternate Mobile (Optional)</FormLabel>
              <FormControl><Input type="tel" placeholder="+91 XXXXX XXXXX" {...field} disabled={effectiveIsSaving}/></FormControl>
              <FormMessage />
            </FormItem>
          )}/>
          
          <FormField
            control={form.control}
            name="bio"
            render={({ field }) => (
              <FormItem>
                <div className="flex justify-between items-center">
                  <FormLabel className="flex items-center"><Info className="mr-2 h-4 w-4 text-muted-foreground"/>Bio / About Me</FormLabel>
                  <Button 
                    type="button" 
                    variant="link" 
                    size="sm" 
                    onClick={handleResetBio} 
                    className="h-auto p-0 text-xs font-semibold text-primary hover:text-primary/80"
                    disabled={effectiveIsSaving}
                  >
                    Reset to Default Template
                  </Button>
                </div>
                <FormControl>
                  <Textarea 
                    placeholder="Briefly describe your professional background..." 
                    {...field}
                    onChange={(e) => {
                      bioManuallyEdited.current = true;
                      field.onChange(e);
                    }}
                    disabled={effectiveIsSaving}
                    rows={4}
                  />
                </FormControl>
                <FormDescription>Tell us a bit about your work experience and expertise (Autogenerated default template provided, feel free to customize).</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="space-y-4">
            <div className="flex justify-between items-center border-b pb-2">
              <FormLabel className={cn("text-base font-bold flex items-center", showPhotoError && "text-destructive")}>
                <Camera className="mr-2 h-5 w-5 text-primary" /> Passport Size Profile Photo <span className="text-destructive ml-1">*</span>
              </FormLabel>
              {showPhotoError && <Badge variant="destructive" className="h-5 px-2 text-[10px] animate-pulse">REQUIRED</Badge>}
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              Please upload a clear, professional passport-size photo. Do not upload selfies, casual photos, group photos, or pictures with filters. The photo should show your face clearly facing forward against a plain light background.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 py-4 justify-items-center">
              {/* Left Side: YOUR PHOTO */}
              <div className="flex flex-col items-center w-full max-w-[200px]">
                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Your Photo</span>
                <div 
                  onClick={() => !effectiveIsSaving && fileInputRef.current?.click()}
                  className={cn(
                    "relative aspect-square w-full rounded-2xl border-2 border-dashed transition-all flex flex-col items-center justify-center cursor-pointer overflow-hidden bg-muted/30 shadow-sm",
                    showPhotoError ? "border-destructive bg-destructive/5 animate-pulse" : "border-muted-foreground/25 hover:border-primary/50"
                  )}
                >
                  {displayPreviewUrl ? (
                    <>
                      <NextImage src={displayPreviewUrl} alt="Profile preview" fill className="object-cover" data-ai-hint="person profile" unoptimized={displayPreviewUrl.startsWith('blob:')} sizes="200px"/>
                      <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Camera className="h-8 w-8 text-white" />
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center gap-2 p-4 text-center">
                      <Camera className={cn("h-8 w-8 text-muted-foreground", showPhotoError && "text-destructive")} />
                      <span className="text-[10px] font-bold text-muted-foreground">CLICK TO UPLOAD</span>
                    </div>
                  )}
                  
                  {uploadProgress !== null && selectedFile && (
                    <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center p-2">
                      <Loader2 className="h-6 w-6 text-white animate-spin mb-1" />
                      <Progress value={uploadProgress} className="h-1 w-10/12 bg-white/20" />
                      <span className="text-[9px] text-white mt-1 font-bold">{Math.round(uploadProgress)}%</span>
                    </div>
                  )}
                </div>
                <span className="text-[10px] text-muted-foreground mt-2 text-center">
                  Max size: 50MB
                </span>
              </div>

              {/* Right Side: EXAMPLE / DEMO */}
              <div className="flex flex-col items-center w-full max-w-[200px]">
                <span className="text-[11px] font-bold text-green-600 uppercase tracking-wider mb-2 flex items-center">
                  <Check className="h-3.5 w-3.5 mr-1" /> Example / Demo
                </span>
                <div className="relative aspect-square w-full rounded-2xl border border-border overflow-hidden bg-muted shadow-sm">
                  <NextImage 
                    src="/indian_passport_demo.png" 
                    alt="Formal Passport Size Demo" 
                    fill 
                    className="object-cover"
                    sizes="200px"
                  />
                </div>
                <span className="text-[10px] text-muted-foreground mt-2 text-center font-medium">
                  Formal Passport Size
                </span>
              </div>
            </div>

            <FormControl>
              <Input 
                type="file" 
                accept="image/png, image/jpeg, image/webp" 
                onChange={handleFileSelected} 
                ref={fileInputRef} 
                className="hidden" 
                disabled={effectiveIsSaving}
              />
            </FormControl>

            {showPhotoError && (
              <div className="text-center text-xs font-bold text-destructive animate-pulse mt-2 flex items-center justify-center">
                <ArrowLeft className="h-3 w-3 mr-1 animate-bounce" /> Passport Size Profile Photo is required.
              </div>
            )}

            {(displayPreviewUrl || selectedFile) && !showPhotoError && (
              <div className="flex justify-center mt-2">
                <Button type="button" variant="ghost" size="sm" onClick={handleRemoveImage} disabled={effectiveIsSaving} className="text-xs text-destructive hover:bg-destructive/5">
                  <Trash2 className="h-3 w-3 mr-1" /> Remove Photo
                </Button>
              </div>
            )}
          </div>

        </CardContent>
        <CardFooter className="flex justify-between">
          <Button type="button" variant="outline" onClick={onPrevious} disabled={effectiveIsSaving}>Previous</Button>
          <Button type="submit" disabled={effectiveIsSaving}>
            {effectiveIsSaving && !statusMessage.startsWith("Uploading") && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
             {statusMessage && statusMessage.startsWith("Uploading") ? statusMessage : effectiveIsSaving ? "Saving..." : "Save & Continue"}
          </Button>
        </CardFooter>
      </form>
    </Form>
  );
}

