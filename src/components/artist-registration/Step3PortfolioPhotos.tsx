
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

  const handleFileChange = (id: string, file: File) => {
    if (file.size > 15 * 1024 * 1024) {
      toast({ title: "File Too Large", description: "Image must be < 15MB.", variant: "destructive" });
      return;
    }
    setPhotos(prev => ({
      ...prev,
      [id]: { ...prev[id], file, previewUrl: URL.createObjectURL(file), uploadProgress: null }
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
                    <div className="flex flex-col items-center gap-2">
                      <Camera className={cn("h-10 w-10", hasError ? "text-destructive" : "text-muted-foreground")} />
                      {hasError && <AlertCircle className="h-5 w-5 text-destructive animate-bounce" />}
                    </div>
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
