
"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Camera, Trash2, AlertCircle, CheckCircle2 } from "lucide-react";
import type { ArtistApplication, ArtistControlOptions } from '@/types/firestore';
import { useState } from "react";
import NextImage from 'next/image';
import { useToast } from "@/hooks/use-toast";
import { storage } from '@/lib/firebase';
import { ref as storageRefStandard, uploadBytesResumable, getDownloadURL, deleteObject } from "firebase/storage";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

const generateRandomHexString = (length: number) => Array.from({ length }, () => Math.floor(Math.random() * 16).toString(16)).join('');
const isFirebaseStorageUrl = (url: string | null | undefined): boolean => !!url && typeof url === 'string' && url.includes("firebasestorage.googleapis.com");

interface FileUploadState {
  file: File | null;
  previewUrl: string | null;
  uploadProgress: number | null;
  existingUrl?: string | null;
}

interface Step3PortfolioPhotosProps {
  onNext: (data: Partial<ArtistApplication>) => void;
  onPrevious: () => void;
  initialData: Partial<ArtistApplication>;
  controlOptions: ArtistControlOptions | null;
  isSaving: boolean;
  userUid: string;
}

export default function Step3PortfolioPhotos({
  onNext,
  onPrevious,
  initialData,
  isSaving, 
  userUid,
}: Step3PortfolioPhotosProps) {
  const { toast } = useToast();
  const [isFormBusy, setIsFormBusy] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const [photos, setPhotos] = useState<Record<string, FileUploadState>>({
    faceCloseUp: { file: null, previewUrl: initialData.faceCloseUpUrl || null, uploadProgress: null, existingUrl: initialData.faceCloseUpUrl },
    midShot: { file: null, previewUrl: initialData.midShotUrl || null, uploadProgress: null, existingUrl: initialData.midShotUrl },
    rightProfile: { file: null, previewUrl: initialData.rightProfileUrl || null, uploadProgress: null, existingUrl: initialData.rightProfileUrl },
    leftProfile: { file: null, previewUrl: initialData.leftProfileUrl || null, uploadProgress: null, existingUrl: initialData.leftProfileUrl },
    frontProfile: { file: null, previewUrl: initialData.frontProfileUrl || null, uploadProgress: null, existingUrl: initialData.frontProfileUrl },
    backProfile: { file: null, previewUrl: initialData.backProfileUrl || null, uploadProgress: null, existingUrl: initialData.backProfileUrl },
  });

  const photoLabels: Record<string, string> = {
    faceCloseUp: "Close-up Face",
    midShot: "Mid Shot",
    rightProfile: "Right Full Profile",
    leftProfile: "Left Full Profile",
    frontProfile: "Front Full Profile",
    backProfile: "Back Full Profile"
  };

  const demoSilhouettes: Record<string, React.ReactNode> = {
    faceCloseUp: (
      <svg viewBox="0 0 100 133" fill="none" xmlns="http://www.w3.org/2000/svg" className="absolute inset-0 w-full h-full object-cover p-6 opacity-[0.14] text-muted-foreground pointer-events-none select-none">
        <path d="M50 25C40 25 32 32 32 45C32 58 40 68 50 68C60 68 68 58 68 45C68 32 60 25 50 25Z" fill="currentColor"/>
        <path d="M50 74C35 74 20 82 20 95C20 98 25 105 50 105C75 105 80 98 80 95C80 82 65 74 50 74Z" fill="currentColor"/>
      </svg>
    ),
    midShot: (
      <svg viewBox="0 0 100 133" fill="none" xmlns="http://www.w3.org/2000/svg" className="absolute inset-0 w-full h-full object-cover p-4 opacity-[0.14] text-muted-foreground pointer-events-none select-none">
        <path d="M50 20C42 20 35 27 35 38C35 49 42 58 50 58C58 58 65 49 65 38C65 27 58 20 50 20Z" fill="currentColor"/>
        <path d="M50 64C28 64 12 76 12 95V115H88V95C88 76 72 64 50 64Z" fill="currentColor"/>
      </svg>
    ),
    rightProfile: (
      <svg viewBox="0 0 100 133" fill="none" xmlns="http://www.w3.org/2000/svg" className="absolute inset-0 w-full h-full object-cover p-3 opacity-[0.14] text-muted-foreground pointer-events-none select-none">
        <path d="M48 20C40 20 34 26 34 36C34 44 38 48 44 51C45 54 44 56 46 58C48 60 52 59 55 58C58 57 59 53 58 50C62 47 64 41 64 36C64 26 56 20 48 20Z" fill="currentColor"/>
        <path d="M40 64C25 64 14 74 14 90V120H72C70 105 60 78 40 64Z" fill="currentColor"/>
      </svg>
    ),
    leftProfile: (
      <svg viewBox="0 0 100 133" fill="none" xmlns="http://www.w3.org/2000/svg" className="absolute inset-0 w-full h-full object-cover p-3 opacity-[0.14] text-muted-foreground pointer-events-none select-none scale-x-[-1]">
        <path d="M48 20C40 20 34 26 34 36C34 44 38 48 44 51C45 54 44 56 46 58C48 60 52 59 55 58C58 57 59 53 58 50C62 47 64 41 64 36C64 26 56 20 48 20Z" fill="currentColor"/>
        <path d="M40 64C25 64 14 74 14 90V120H72C70 105 60 78 40 64Z" fill="currentColor"/>
      </svg>
    ),
    frontProfile: (
      <svg viewBox="0 0 100 133" fill="none" xmlns="http://www.w3.org/2000/svg" className="absolute inset-0 w-full h-full object-cover p-2 opacity-[0.14] text-muted-foreground pointer-events-none select-none">
        <path d="M50 12C44 12 39 17 39 25C39 33 44 38 50 38C56 38 61 33 61 25C61 17 56 12 50 12Z" fill="currentColor"/>
        <path d="M50 43C32 43 22 52 22 66V125H78V66C78 52 68 43 50 43Z" fill="currentColor"/>
      </svg>
    ),
    backProfile: (
      <svg viewBox="0 0 100 133" fill="none" xmlns="http://www.w3.org/2000/svg" className="absolute inset-0 w-full h-full object-cover p-2 opacity-[0.14] text-muted-foreground pointer-events-none select-none">
        <path d="M50 12C44 12 39 17 39 25C39 33 44 38 50 38C56 38 61 33 61 25C61 17 56 12 50 12Z" fill="currentColor"/>
        <path d="M50 43C32 43 22 52 22 66V125H78V66C78 52 68 43 50 43Z" fill="currentColor"/>
        <path d="M42 25C42 35 45 44 50 44C55 44 58 35 58 25" stroke="#FFFFFF" strokeWidth="1" opacity="0.4"/>
      </svg>
    ),
  };

  const handleFileChange = async (id: string, file: File) => {
    if (file.size > 50 * 1024 * 1024) {
      toast({ title: "File Too Large", description: "Image must be < 50MB.", variant: "destructive" });
      return;
    }

    let processedFile = file;
    if (file.size > 1 * 1024 * 1024 && file.type.startsWith('image/')) {
      setIsFormBusy(true);
      try {
        const { compressImage } = await import('@/lib/imageCompression');
        processedFile = await compressImage(file);
      } catch (err) {
        console.error("Compression error:", err);
      } finally {
        setIsFormBusy(false);
      }
    }

    setPhotos(prev => ({
      ...prev,
      [id]: { ...prev[id], file: processedFile, previewUrl: URL.createObjectURL(processedFile), uploadProgress: null }
    }));
  };

  const handleRemoveFile = (id: string) => {
    setPhotos(prev => {
      const current = prev[id];
      if (current.previewUrl?.startsWith('blob:')) URL.revokeObjectURL(current.previewUrl);
      return { ...prev, [id]: { ...current, file: null, previewUrl: null, uploadProgress: null } };
    });
  };

  const uploadFile = async (
    id: string,
    fileState: FileUploadState,
    storagePath: string
  ): Promise<string | null> => {
    if (!fileState.file) {
      if (!fileState.previewUrl && fileState.existingUrl && isFirebaseStorageUrl(fileState.existingUrl)) {
        try { await deleteObject(storageRefStandard(storage, fileState.existingUrl)); }
        catch (e) { console.warn("Deletion failed", e); }
        return null;
      }
      return fileState.existingUrl || null;
    }

    const file = fileState.file;
    const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const finalPath = `${storagePath}_${generateRandomHexString(8)}.${extension}`;
    const fileRef = storageRefStandard(storage, finalPath);

    if (fileState.existingUrl && isFirebaseStorageUrl(fileState.existingUrl)) {
      try { await deleteObject(storageRefStandard(storage, fileState.existingUrl)); }
      catch (e) { console.warn("Old file cleanup failed", e); }
    }

    const uploadTask = uploadBytesResumable(fileRef, file);
    return new Promise((resolve, reject) => {
      uploadTask.on('state_changed',
        (snapshot) => setPhotos(prev => ({
          ...prev, [id]: { ...prev[id], uploadProgress: (snapshot.bytesTransferred / snapshot.totalBytes) * 100 }
        })),
        (error) => reject(error),
        async () => {
          try {
            const url = await getDownloadURL(uploadTask.snapshot.ref);
            resolve(url);
          } catch (e) { reject(e); }
        }
      );
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: string[] = [];
    
    // Only faceCloseUp is compulsory
    if (!photos.faceCloseUp.file && !photos.faceCloseUp.previewUrl) {
      errors.push(photoLabels.faceCloseUp);
    }

    if (errors.length > 0) {
      setValidationErrors(errors);
      toast({ title: "Validation Error", description: "Close-up Face photo is required.", variant: "destructive" });
      setTimeout(() => {
        const firstErrorEl = document.querySelector('.border-destructive, .text-destructive, [aria-invalid="true"]');
        if (firstErrorEl) {
          firstErrorEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 50);
      return;
    }

    setIsFormBusy(true);
    setValidationErrors([]);

    try {
      const uploadPromises = Object.keys(photos).map(id => 
        uploadFile(id, photos[id], `Artist_portfolio/${userUid}/${id}`)
      );

      const results = await Promise.all(uploadPromises);
      
      onNext({
        faceCloseUpUrl: results[0] || undefined,
        midShotUrl: results[1] || undefined,
        rightProfileUrl: results[2] || undefined,
        leftProfileUrl: results[3] || undefined,
        frontProfileUrl: results[4] || undefined,
        backProfileUrl: results[5] || undefined,
      });

    } catch (error) {
      toast({ title: "Upload Failed", description: "An error occurred while uploading photos.", variant: "destructive" });
    } finally {
      setIsFormBusy(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <Card className="border-none shadow-none">
        <CardHeader className="px-0">
          <CardTitle className="text-xl">Portfolio Photos</CardTitle>
          <p className="text-sm text-muted-foreground">Please provide clear photos in the following poses. Only Close-up Face is mandatory.</p>
        </CardHeader>
        <CardContent className="px-0 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {Object.keys(photos).map(id => {
            const fileState = photos[id];
            const label = photoLabels[id];
            const isCompulsory = id === 'faceCloseUp';
            const hasError = validationErrors.includes(label);

            return (
              <div key={id} className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className={cn("text-xs font-semibold", hasError && "text-destructive")}>
                    {label} {isCompulsory && <span className="text-destructive">*</span>}
                    {!isCompulsory && <span className="text-muted-foreground font-normal ml-1">(Optional)</span>}
                  </span>
                  {hasError && <Badge variant="destructive" className="h-4 px-1 text-[10px] animate-pulse">REQUIRED</Badge>}
                </div>
                
                <div 
                  onClick={() => !isFormBusy && !isSaving && document.getElementById(`input-${id}`)?.click()}
                  className={cn(
                    "relative aspect-[3/4] rounded-lg border-2 border-dashed transition-all flex flex-col items-center justify-center cursor-pointer overflow-hidden",
                    hasError ? "border-destructive bg-destructive/5" : "border-muted-foreground/25 hover:border-primary/50 bg-muted/30"
                  )}
                >
                  {fileState.previewUrl ? (
                    <>
                      <NextImage src={fileState.previewUrl} alt={label} fill className="object-cover" unoptimized={fileState.previewUrl.startsWith('blob:')} />
                      <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Camera className="h-8 w-8 text-white" />
                      </div>
                    </>
                  ) : (
                    <>
                      {demoSilhouettes[id]}
                      <div className="flex flex-col items-center gap-2 z-10">
                        <Camera className={cn("h-10 w-10", hasError ? "text-destructive" : "text-muted-foreground/60")} />
                        {hasError && <AlertCircle className="h-5 w-5 text-destructive animate-bounce" />}
                      </div>
                    </>
                  )}
                  
                  {fileState.uploadProgress !== null && (
                    <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center p-4">
                      <Loader2 className="h-8 w-8 text-white animate-spin mb-2" />
                      <Progress value={fileState.uploadProgress} className="h-1.5 w-full bg-white/20" />
                    </div>
                  )}
                </div>

                <input 
                  id={`input-${id}`}
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  onChange={e => e.target.files?.[0] && handleFileChange(id, e.target.files[0])}
                  disabled={isFormBusy || isSaving}
                />

                <div className="flex items-center gap-2">
                  <Button 
                    type="button" 
                    variant={hasError ? "destructive" : "outline"} 
                    size="sm" 
                    className="w-full h-8 text-[10px]"
                    onClick={() => document.getElementById(`input-${id}`)?.click()}
                    disabled={isFormBusy || isSaving}
                  >
                    {fileState.previewUrl ? "Change Photo" : "Upload Photo"}
                  </Button>
                  {fileState.previewUrl && (
                    <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive" onClick={() => handleRemoveFile(id)} disabled={isFormBusy || isSaving}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <CardFooter className="flex justify-between px-0">
        <Button type="button" variant="outline" onClick={onPrevious} disabled={isFormBusy || isSaving}>Previous</Button>
        <Button type="submit" disabled={isFormBusy || isSaving}>
          {isFormBusy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
          {isFormBusy ? "Uploading..." : "Save & Continue"}
        </Button>
      </CardFooter>
    </form>
  );
}
