"use client";

import { useState, useEffect, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Upload, Trash2, CheckCircle2, Film, Image as ImageIcon, Sparkles, Search, ArrowLeft, RefreshCw, XCircle, Clock } from 'lucide-react';
import Image from 'next/image';
import { db } from '@/lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';

const TALENT_CATEGORIES = [
  'Singing',
  'Dancing',
  'Stand-up Comedy',
  'Mimicry',
  'Magic',
  'Beatboxing',
  'Rap',
  'Instrument',
  'Acting',
  'Storytelling',
  'Other'
];

const PREFERRED_LANGUAGES = ['Kannada', 'English', 'Hindi'];

export default function KannadasGotLatentPage() {
  const { toast } = useToast();
  
  // Submission & Checking States
  const [submittedId, setSubmittedId] = useState<string | null>(null);
  const [fetchedStatus, setFetchedStatus] = useState<any | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);
  const [searchId, setSearchId] = useState('');
  const [showStatusChecker, setShowStatusChecker] = useState(false);
  
  // Form fields
  const [fullName, setFullName] = useState('');
  const [stageName, setStageName] = useState('');
  const [gender, setGender] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [age, setAge] = useState<number | null>(null);
  const [mobileNumber, setMobileNumber] = useState('');
  const [email, setEmail] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('Karnataka');
  const [pinCode, setPinCode] = useState('');

  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [talentTitle, setTalentTitle] = useState('');
  const [talentDescription, setTalentDescription] = useState('');
  const [performedOnStageBefore, setPerformedOnStageBefore] = useState<string>('no');

  const [introVideoUrl, setIntroVideoUrl] = useState('');
  const [talentVideoUrl, setTalentVideoUrl] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [bannerUrl, setBannerUrl] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('kannadasgotlatent_banner_cache') || '/kannadasgotlatent.png';
    }
    return '/kannadasgotlatent.png';
  });
  const [bannerLoaded, setBannerLoaded] = useState(() => {
    if (typeof window !== 'undefined') {
      return !!localStorage.getItem('kannadasgotlatent_banner_cache');
    }
    return false;
  });
  const [prevBannerUrl, setPrevBannerUrl] = useState(bannerUrl);

  if (bannerUrl !== prevBannerUrl) {
    setPrevBannerUrl(bannerUrl);
    setBannerLoaded(false);
  }

  const [instagram, setInstagram] = useState('');
  const [youtube, setYoutube] = useState('');
  const [facebook, setFacebook] = useState('');
  const [otherSocial, setOtherSocial] = useState('');

  const [canTravel, setCanTravel] = useState<string>('yes');
  const [languages, setLanguages] = useState<string[]>(['Kannada']);
  const [availableWeekends, setAvailableWeekends] = useState(true);
  const [availableWeekdays, setAvailableWeekdays] = useState(false);

  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyRelationship, setEmergencyRelationship] = useState('');
  const [emergencyMobile, setEmergencyMobile] = useState('');

  const [confirmCorrect, setConfirmCorrect] = useState(false);
  const [ownContent, setOwnContent] = useState(false);
  const [allowPublish, setAllowPublish] = useState(false);
  const [understandNotGuaranteed, setUnderstandNotGuaranteed] = useState(false);

  // Upload progress states
  const [introProgress, setIntroProgress] = useState<number | null>(null);
  const [talentProgress, setTalentProgress] = useState<number | null>(null);
  const [photosProgress, setPhotosProgress] = useState<number | null>(null);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // Validation errors state
  const [errors, setErrors] = useState<Record<string, boolean>>({});

  const getErrorClass = (field: string) => {
    return errors[field] ? "border-red-500 ring-red-500 focus-visible:ring-red-500 focus:border-red-500 border-2" : "";
  };

  const handleFieldChange = (field: string, value: any, setter: (val: any) => void) => {
    setter(value);
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: false }));
    }
  };

  // Load and listen to active banner setting
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'kannadaGotLatent'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.bannerUrl) {
          setBannerUrl(data.bannerUrl);
          localStorage.setItem('kannadasgotlatent_banner_cache', data.bannerUrl);
        }
      }
    });
    return () => unsub();
  }, []);

  // 1. Restore submission state & draft inputs on mount
  useEffect(() => {
    setIsMounted(true);
    
    // Check if user has a saved submission ID
    const savedId = localStorage.getItem('kannadasgotlatent_submitted_id');
    if (savedId) {
      setSubmittedId(savedId);
      fetchLiveStatus(savedId);
    }

    // Load form draft
    const savedDraft = localStorage.getItem('kannadasgotlatent_form_draft');
    if (savedDraft) {
      try {
        const draft = JSON.parse(savedDraft);
        if (draft.fullName) setFullName(draft.fullName);
        if (draft.stageName) setStageName(draft.stageName);
        if (draft.gender) setGender(draft.gender);
        if (draft.dateOfBirth) setDateOfBirth(draft.dateOfBirth);
        if (draft.mobileNumber) setMobileNumber(draft.mobileNumber);
        if (draft.email) setEmail(draft.email);
        if (draft.city) setCity(draft.city);
        if (draft.state) setState(draft.state);
        if (draft.pinCode) setPinCode(draft.pinCode);
        if (draft.selectedCategories) setSelectedCategories(draft.selectedCategories);
        if (draft.talentTitle) setTalentTitle(draft.talentTitle);
        if (draft.talentDescription) setTalentDescription(draft.talentDescription);
        if (draft.performedOnStageBefore) setPerformedOnStageBefore(draft.performedOnStageBefore);
        if (draft.introVideoUrl) setIntroVideoUrl(draft.introVideoUrl);
        if (draft.talentVideoUrl) setTalentVideoUrl(draft.talentVideoUrl);
        if (draft.photos) setPhotos(draft.photos);
        if (draft.instagram) setInstagram(draft.instagram);
        if (draft.youtube) setYoutube(draft.youtube);
        if (draft.facebook) setFacebook(draft.facebook);
        if (draft.otherSocial) setOtherSocial(draft.otherSocial);
        if (draft.canTravel) setCanTravel(draft.canTravel);
        if (draft.languages) setLanguages(draft.languages);
        if (draft.availableWeekends !== undefined) setAvailableWeekends(draft.availableWeekends);
        if (draft.availableWeekdays !== undefined) setAvailableWeekdays(draft.availableWeekdays);
        if (draft.emergencyName) setEmergencyName(draft.emergencyName);
        if (draft.emergencyRelationship) setEmergencyRelationship(draft.emergencyRelationship);
        if (draft.emergencyMobile) setEmergencyMobile(draft.emergencyMobile);
      } catch (e) {
        console.error("Failed to parse form draft from localStorage", e);
      }
    }
  }, []);

  // 2. Persist form values to localStorage on any modification
  useEffect(() => {
    if (!isMounted || submittedId) return;

    const draft = {
      fullName, stageName, gender, dateOfBirth, mobileNumber, email, city, state, pinCode,
      selectedCategories, talentTitle, talentDescription, performedOnStageBefore,
      introVideoUrl, talentVideoUrl, photos,
      instagram, youtube, facebook, otherSocial,
      canTravel, languages, availableWeekends, availableWeekdays,
      emergencyName, emergencyRelationship, emergencyMobile
    };
    localStorage.setItem('kannadasgotlatent_form_draft', JSON.stringify(draft));
  }, [
    fullName, stageName, gender, dateOfBirth, mobileNumber, email, city, state, pinCode,
    selectedCategories, talentTitle, talentDescription, performedOnStageBefore,
    introVideoUrl, talentVideoUrl, photos,
    instagram, youtube, facebook, otherSocial,
    canTravel, languages, availableWeekends, availableWeekdays,
    emergencyName, emergencyRelationship, emergencyMobile,
    isMounted, submittedId
  ]);

  // Fetch applicant status in real-time
  const fetchLiveStatus = async (appId: string) => {
    setStatusLoading(true);
    try {
      const res = await fetch(`/api/kannadasgotlatent/status?id=${appId}`);
      if (!res.ok) {
        throw new Error('Application details not found.');
      }
      const data = await res.json();
      if (data.success && data.application) {
        setFetchedStatus(data.application);
      } else {
        throw new Error(data.error || 'Failed to retrieve application status');
      }
    } catch (err: any) {
      console.error(err);
      toast({ title: 'Lookup Failed', description: err.message, variant: 'destructive' });
      // If we got 404, maybe local storage is stale
      if (err.message.includes('not found')) {
        setFetchedStatus({ status: 'Not Found', id: appId });
      }
    } finally {
      setStatusLoading(false);
    }
  };

  // Search ID manually (for users whose cache was cleared)
  const handleCheckStatusSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchId.trim()) return;

    setStatusLoading(true);
    try {
      const res = await fetch(`/api/kannadasgotlatent/status?id=${searchId.trim()}`);
      if (!res.ok) {
        throw new Error('Application ID not found. Verify your ID.');
      }
      const data = await res.json();
      if (data.success && data.application) {
        setSubmittedId(data.application.id);
        setFetchedStatus(data.application);
        localStorage.setItem('kannadasgotlatent_submitted_id', data.application.id);
        toast({ title: 'Profile Found', description: `Loaded status for application #${data.application.id}.` });
        setShowStatusChecker(false);
      } else {
        throw new Error(data.error || 'Could not locate matching application.');
      }
    } catch (err: any) {
      toast({ title: 'Invalid ID', description: err.message, variant: 'destructive' });
    } finally {
      setStatusLoading(false);
    }
  };

  // Reset status and allow applying again
  const handleApplyAgain = () => {
    localStorage.removeItem('kannadasgotlatent_submitted_id');
    setSubmittedId(null);
    setFetchedStatus(null);
  };

  // Auto-calculate age on Date of Birth change
  useEffect(() => {
    if (dateOfBirth) {
      const birthDate = new Date(dateOfBirth);
      const today = new Date();
      let calculatedAge = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        calculatedAge--;
      }
      setAge(calculatedAge >= 0 ? calculatedAge : 0);
    } else {
      setAge(null);
    }
  }, [dateOfBirth]);

  // Word counter
  const wordCount = useMemo(() => {
    const cleanStr = talentDescription.trim();
    if (!cleanStr) return 0;
    return cleanStr.split(/\s+/).length;
  }, [talentDescription]);

  // Checkbox handlers
  const handleCategoryToggle = (category: string) => {
    setSelectedCategories(prev => {
      const next = prev.includes(category) ? prev.filter(c => c !== category) : [...prev, category];
      if (errors.selectedCategories && next.length > 0) {
        setErrors(e => ({ ...e, selectedCategories: false }));
      }
      return next;
    });
  };

  const handleLanguageToggle = (lang: string) => {
    setLanguages(prev => 
      prev.includes(lang) ? prev.filter(l => l !== lang) : [...prev, lang]
    );
  };

  // Upload handler using XMLHttpRequest for real-time progress
  const uploadFile = (file: File, onProgress: (pct: number) => void): Promise<string> => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', '/api/kannadasgotlatent/upload');

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percentage = Math.round((event.loaded / event.total) * 100);
          onProgress(percentage);
        }
      };

      xhr.onload = () => {
        if (xhr.status === 200) {
          try {
            const response = JSON.parse(xhr.responseText);
            if (response.success) {
              resolve(response.url);
            } else {
              reject(new Error(response.error || 'Upload failed'));
            }
          } catch (e) {
            reject(new Error('Invalid response format'));
          }
        } else {
          reject(new Error(`Upload failed (Status: ${xhr.status})`));
        }
      };

      xhr.onerror = () => reject(new Error('Network upload error'));

      const formData = new FormData();
      formData.append('file', file);
      xhr.send(formData);
    });
  };

  const handleFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
    type: 'intro' | 'talent' | 'photos'
  ) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (type === 'intro') {
      const file = files[0];
      setIntroProgress(0);
      try {
        const url = await uploadFile(file, setIntroProgress);
        setIntroVideoUrl(url);
        toast({ title: 'Success', description: 'Introduction video link updated.' });
      } catch (err: any) {
        toast({ title: 'Upload Failed', description: err.message, variant: 'destructive' });
      } finally {
        setIntroProgress(null);
      }
    } else if (type === 'talent') {
      const file = files[0];
      setTalentProgress(0);
      try {
        const url = await uploadFile(file, setTalentProgress);
        setTalentVideoUrl(url);
        toast({ title: 'Success', description: 'Talent video link captured.' });
      } catch (err: any) {
        toast({ title: 'Upload Failed', description: err.message, variant: 'destructive' });
      } finally {
        setTalentProgress(null);
      }
    } else if (type === 'photos') {
      const newFiles = Array.from(files);
      const totalPhotos = photos.length + newFiles.length;
      if (totalPhotos > 5) {
        toast({ title: 'Limit Exceeded', description: 'You can upload maximum 5 profile images.', variant: 'destructive' });
        return;
      }

      setPhotosProgress(0);
      try {
        const uploadedUrls: string[] = [];
        let completed = 0;
        for (const file of newFiles) {
          const url = await uploadFile(file, (pct) => {
            const batchPct = Math.round(((completed + pct / 100) / newFiles.length) * 100);
            setPhotosProgress(batchPct);
          });
          uploadedUrls.push(url);
          completed++;
        }
        setPhotos(prev => {
          const next = [...prev, ...uploadedUrls];
          if (errors.photos && next.length >= 1) {
            setErrors(prevErrors => ({ ...prevErrors, photos: false }));
          }
          return next;
        });
        toast({ title: 'Success', description: `${newFiles.length} profile images uploaded.` });
      } catch (err: any) {
        toast({ title: 'Upload Failed', description: err.message, variant: 'destructive' });
      } finally {
        setPhotosProgress(null);
      }
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, boolean> = {};

    if (!fullName.trim()) newErrors.fullName = true;
    if (!gender) newErrors.gender = true;
    if (!dateOfBirth) newErrors.dateOfBirth = true;
    
    const mobileRegex = /^[0-9]{10}$/;
    if (!mobileRegex.test(mobileNumber)) newErrors.mobileNumber = true;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) newErrors.email = true;

    if (!city.trim()) newErrors.city = true;
    if (!state.trim()) newErrors.state = true;
    
    const pinRegex = /^[0-9]{6}$/;
    if (!pinRegex.test(pinCode)) newErrors.pinCode = true;

    if (selectedCategories.length === 0) newErrors.selectedCategories = true;
    if (!talentTitle.trim()) newErrors.talentTitle = true;
    if (!talentDescription.trim() || wordCount > 300) newErrors.talentDescription = true;

    // At least one video (Intro or Talent)
    if (!introVideoUrl.trim() && !talentVideoUrl.trim()) {
      newErrors.videos = true;
    }

    // At least 1 profile image
    if (photos.length === 0) {
      newErrors.photos = true;
    }

    if (!emergencyName.trim()) newErrors.emergencyName = true;
    if (!emergencyRelationship.trim()) newErrors.emergencyRelationship = true;
    if (!mobileRegex.test(emergencyMobile)) newErrors.emergencyMobile = true;

    if (!confirmCorrect) newErrors.confirmCorrect = true;
    if (!ownContent) newErrors.ownContent = true;
    if (!allowPublish) newErrors.allowPublish = true;
    if (!understandNotGuaranteed) newErrors.understandNotGuaranteed = true;

    setErrors(newErrors);
    const hasErrors = Object.keys(newErrors).length > 0;
    
    if (hasErrors) {
      const firstErrorField = Object.keys(newErrors)[0];
      let elementId = firstErrorField;
      if (firstErrorField === 'videos') elementId = 'intro';
      if (firstErrorField === 'photos') elementId = 'photos-container';
      if (firstErrorField === 'selectedCategories') elementId = 'categories-container';
      
      const element = document.getElementById(elementId);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }

    return !hasErrors;
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isSubmitting) return;

    const isValid = validateForm();
    if (!isValid) {
      toast({ 
        title: 'Validation Failed', 
        description: 'Please fill in all required fields correctly (marked in red).', 
        variant: 'destructive' 
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        fullName,
        stageName,
        gender,
        dateOfBirth,
        age,
        mobileNumber,
        email,
        city,
        state,
        pinCode,
        talentCategory: selectedCategories,
        talentTitle,
        talentDescription,
        performedOnStageBefore: performedOnStageBefore === 'yes',
        introVideoUrl,
        talentVideoUrl: talentVideoUrl.startsWith('/uploads') ? talentVideoUrl : '',
        externalVideoLink: !talentVideoUrl.startsWith('/uploads') ? talentVideoUrl : '',
        photos,
        instagram,
        youtube,
        facebook,
        otherSocial,
        canTravel: canTravel === 'yes',
        preferredLanguages: languages,
        availableWeekends,
        availableWeekdays,
        emergencyName,
        emergencyRelationship,
        emergencyMobile,
        confirmCorrect,
        ownContent,
        allowPublish,
        understandNotGuaranteed,
      };

      const res = await fetch('/api/kannadasgotlatent/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (data.success && data.applicationId) {
        // Clear draft & set submission ID
        localStorage.removeItem('kannadasgotlatent_form_draft');
        localStorage.setItem('kannadasgotlatent_submitted_id', data.applicationId);
        setSubmittedId(data.applicationId);
        fetchLiveStatus(data.applicationId);
        toast({ title: 'Success', description: 'Registration details submitted successfully!' });
      } else {
        throw new Error(data.error || 'Submission failed');
      }
    } catch (err: any) {
      toast({ title: 'Submission Error', description: err.message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusDisplay = (status: string) => {
    switch (status) {
      case 'Selected':
        return (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl p-6 text-center max-w-md mx-auto shadow-sm">
            <h3 className="text-xl font-extrabold flex items-center justify-center gap-1.5"><CheckCircle2 className="text-emerald-500 h-6 w-6" /> Congratulations!</h3>
            <p className="text-sm font-semibold mt-2">You have been selected for the main stage of Kannada's Got Latent!</p>
            {fetchedStatus?.auditionDate && (
              <p className="text-xs text-emerald-700 bg-emerald-100/50 py-1.5 px-3 rounded-lg mt-3 font-mono font-bold inline-block">
                Recording Date: {fetchedStatus.auditionDate}
              </p>
            )}
          </div>
        );
      case 'Shortlisted':
        return (
          <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-2xl p-6 text-center max-w-md mx-auto shadow-sm">
            <h3 className="text-xl font-extrabold flex items-center justify-center gap-1.5"><AwardBadge className="text-amber-500 h-6 w-6" /> Profile Shortlisted</h3>
            <p className="text-sm font-semibold mt-2">Our team has shortlisted your profile. We will contact you soon for scheduling.</p>
          </div>
        );
      case 'Rejected':
        return (
          <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl p-6 text-center max-w-md mx-auto shadow-sm">
            <h3 className="text-xl font-extrabold flex items-center justify-center gap-1.5"><XCircle className="text-rose-500 h-6 w-6" /> Status Update</h3>
            <p className="text-sm font-semibold mt-2">Unfortunately, your performance was not selected for this season. Keep practicing!</p>
          </div>
        );
      case 'Not Found':
        return (
          <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl p-6 text-center max-w-md mx-auto shadow-sm">
            <h3 className="text-xl font-extrabold flex items-center justify-center gap-1.5"><XCircle className="text-rose-500 h-6 w-6" /> Not Found</h3>
            <p className="text-sm font-semibold mt-2">Registration #{fetchedStatus?.id} was not found. If this is an error, clear your cache and try registering again.</p>
          </div>
        );
      default:
        return (
          <div className="bg-sky-50 border border-sky-200 text-sky-800 rounded-2xl p-6 text-center max-w-md mx-auto shadow-sm">
            <h3 className="text-xl font-extrabold flex items-center justify-center gap-1.5"><Clock className="text-sky-500 h-6 w-6 animate-pulse" /> Pending Review</h3>
            <p className="text-sm font-semibold mt-2">Your application is successfully logged and is currently pending review by our judge panel.</p>
          </div>
        );
    }
  };

  // Prevent SSR rendering issues with localStorage
  if (!isMounted) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  // Submitted / Status Tracking screen
  if (submittedId && fetchedStatus) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <Card className="border-t-4 border-primary rounded-2xl shadow-xl overflow-hidden bg-card/60 backdrop-blur-md">
          <div className="w-full border-b relative min-h-[100px] bg-muted overflow-hidden">
            {!bannerLoaded && (
              <div className="absolute inset-0 bg-muted-foreground/10 animate-pulse" />
            )}
            <img 
              src={bannerUrl} 
              alt="Kannada's Got Latent Banner" 
              onLoad={() => setBannerLoaded(true)}
              className={cn(
                "w-full h-auto object-contain transition-opacity duration-300",
                bannerLoaded ? "opacity-100" : "opacity-0"
              )}
            />
          </div>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center px-6 space-y-6">
            <div className="space-y-1">
              <h1 className="text-3xl font-extrabold text-foreground tracking-tight">
                🎉 Registration Status
              </h1>
              <p className="text-sm font-mono text-muted-foreground">
                Registration Number: <span className="font-bold text-foreground">#{fetchedStatus.id}</span>
              </p>
            </div>

            {statusLoading ? (
              <div className="flex flex-col justify-center items-center py-10 gap-2">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="text-xs text-muted-foreground">Fetching live details...</span>
              </div>
            ) : (
              <div className="w-full">
                {getStatusDisplay(fetchedStatus.status)}
              </div>
            )}

            <div className="w-full border-t pt-6 space-y-3">
              <div className="text-sm max-w-md mx-auto text-muted-foreground">
                Candidate: <span className="font-bold text-foreground">{fetchedStatus.fullName}</span> | Talent: <span className="font-bold text-foreground">{fetchedStatus.talentTitle}</span>
              </div>
            </div>

            <div className="flex flex-wrap justify-center gap-4 pt-4">
              <Button 
                onClick={() => fetchLiveStatus(submittedId)} 
                variant="outline" 
                className="rounded-xl flex items-center gap-2"
                disabled={statusLoading}
              >
                <RefreshCw className={`h-4 w-4 ${statusLoading ? 'animate-spin' : ''}`} /> Refresh Status
              </Button>
              <Button onClick={handleApplyAgain} variant="secondary" className="rounded-xl">
                Clear & Apply Again
              </Button>
              <Button onClick={() => window.location.href = '/'} className="rounded-xl font-bold">
                Back to Homepage
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Status Checker View
  if (showStatusChecker) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 space-y-6">
        <Card className="rounded-2xl border shadow-xl bg-card/70 backdrop-blur-md">
          <CardHeader>
            <Button variant="ghost" className="self-start gap-1 p-0 h-6 mb-2 hover:bg-transparent" onClick={() => setShowStatusChecker(false)}>
              <ArrowLeft className="h-4 w-4" /> Back to Registration
            </Button>
            <CardTitle className="text-2xl font-black text-primary">Track Registration Status</CardTitle>
            <CardDescription>Enter your registration reference number to check status.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCheckStatusSearch} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="searchAppId">Registration ID <span className="text-destructive">*</span></Label>
                <Input 
                  id="searchAppId" 
                  placeholder="e.g. 1001" 
                  value={searchId} 
                  onChange={e => setSearchId(e.target.value)} 
                  required 
                  className="rounded-xl font-mono"
                />
              </div>

              <Button 
                type="submit" 
                className="w-full rounded-xl font-bold h-11"
                disabled={statusLoading}
              >
                {statusLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Verifying...
                  </>
                ) : (
                  <>
                    <Search className="mr-2 h-4 w-4" /> Check Status
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      {/* Banner */}
      <div className="w-full rounded-2xl overflow-hidden shadow-lg border relative min-h-[150px] sm:min-h-[220px] bg-muted">
        {!bannerLoaded && (
          <div className="absolute inset-0 bg-muted-foreground/10 animate-pulse" />
        )}
        <img 
          src={bannerUrl} 
          alt="Kannada's Got Latent Banner" 
          onLoad={() => setBannerLoaded(true)}
          className={cn(
            "w-full h-auto object-contain transition-opacity duration-300",
            bannerLoaded ? "opacity-100" : "opacity-0"
          )}
        />
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-center bg-primary/5 border border-primary/20 p-4 rounded-2xl gap-3">
        <div className="text-center sm:text-left space-y-0.5">
          <h4 className="font-bold text-sm text-foreground">Already Registered for Kannada's Got Latent?</h4>
          <p className="text-[11px] text-muted-foreground">Lookup status details or check registration status.</p>
        </div>
        <Button onClick={() => setShowStatusChecker(true)} variant="outline" size="sm" className="rounded-xl shrink-0 gap-1.5 font-bold border-primary text-primary hover:bg-primary/5">
          <Search className="h-3.5 w-3.5" /> Check Registration Status
        </Button>
      </div>

      <div className="text-center space-y-2">
        <h1 className="text-3xl font-black tracking-tight sm:text-4xl flex items-center justify-center gap-2 text-primary">
          <Sparkles className="h-8 w-8 text-primary animate-pulse" /> Kannada's Got Latent Registration
        </h1>
        <p className="text-muted-foreground text-sm max-w-lg mx-auto">
          Fill out the form below to register and show your talent on Kannada's Got Latent. Selected performers will show their talent on stage!
        </p>
      </div>

      <form onSubmit={handleFormSubmit} className="space-y-6">
        {/* SECTION 1: Basic Information */}
        <Card className="rounded-2xl shadow-sm border bg-card/60 backdrop-blur-md">
          <CardHeader className="border-b bg-muted/20">
            <CardTitle className="text-lg font-bold">1. Basic Information</CardTitle>
            <CardDescription>Provide your personal details to get started.</CardDescription>
          </CardHeader>
          <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="fullName">Full Name <span className="text-destructive">*</span></Label>
              <Input id="fullName" placeholder="Enter your official name" value={fullName} onChange={e => handleFieldChange('fullName', e.target.value, setFullName)} className={getErrorClass('fullName')} required />
            </div>

            <div className="space-y-1">
              <Label htmlFor="stageName">Stage Name (Optional)</Label>
              <Input id="stageName" placeholder="Enter your performance alias" value={stageName} onChange={e => setStageName(e.target.value)} />
            </div>

            <div className="space-y-1">
              <Label htmlFor="gender">Gender <span className="text-destructive">*</span></Label>
              <select 
                id="gender" 
                value={gender} 
                onChange={e => handleFieldChange('gender', e.target.value, setGender)} 
                required 
                className={`flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 ${getErrorClass('gender')}`}
              >
                <option value="">Select Gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Non-binary">Non-binary</option>
                <option value="Prefer not to say">Prefer not to say</option>
              </select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="dob">Date of Birth <span className="text-destructive">*</span></Label>
              <Input id="dob" type="date" value={dateOfBirth} onChange={e => handleFieldChange('dateOfBirth', e.target.value, setDateOfBirth)} className={getErrorClass('dateOfBirth')} required />
            </div>

            <div className="space-y-1">
              <Label htmlFor="age">Age (Auto-calculated)</Label>
              <Input id="age" type="text" value={age !== null ? `${age} Years Old` : 'Select Date of Birth'} disabled className="bg-muted font-mono" />
            </div>

            <div className="space-y-1">
              <Label htmlFor="mobile">Mobile Number <span className="text-destructive">*</span></Label>
              <Input id="mobile" type="tel" placeholder="Enter 10 digit number" value={mobileNumber} onChange={e => handleFieldChange('mobileNumber', e.target.value, setMobileNumber)} className={getErrorClass('mobileNumber')} required />
            </div>

            <div className="space-y-1 md:col-span-2">
              <Label htmlFor="email">Email Address <span className="text-destructive">*</span></Label>
              <Input id="email" type="email" placeholder="example@email.com" value={email} onChange={e => handleFieldChange('email', e.target.value, setEmail)} className={getErrorClass('email')} required />
            </div>

            <div className="space-y-1">
              <Label htmlFor="city">City <span className="text-destructive">*</span></Label>
              <Input id="city" placeholder="e.g. Bangalore" value={city} onChange={e => handleFieldChange('city', e.target.value, setCity)} className={getErrorClass('city')} required />
            </div>

            <div className="space-y-1">
              <Label htmlFor="state">State <span className="text-destructive">*</span></Label>
              <Input id="state" value={state} onChange={e => handleFieldChange('state', e.target.value, setState)} className={getErrorClass('state')} required />
            </div>

            <div className="space-y-1">
              <Label htmlFor="pincode">PIN Code <span className="text-destructive">*</span></Label>
              <Input id="pincode" placeholder="e.g. 560100" value={pinCode} onChange={e => handleFieldChange('pinCode', e.target.value, setPinCode)} className={getErrorClass('pinCode')} required />
            </div>
          </CardContent>
        </Card>

        {/* SECTION 2: Talent Information */}
        <Card className="rounded-2xl shadow-sm border bg-card/60 backdrop-blur-md">
          <CardHeader className="border-b bg-muted/20">
            <CardTitle className="text-lg font-bold">2. Talent Information</CardTitle>
            <CardDescription>Tell us what makes your performance unique.</CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="space-y-2">
              <Label>Select Talent Categories (Select all that apply) <span className="text-destructive">*</span></Label>
              <div id="categories-container" className={`grid grid-cols-2 sm:grid-cols-3 gap-3 p-3 bg-muted/20 border rounded-xl ${errors.selectedCategories ? 'border-red-500 border-2' : ''}`}>
                {TALENT_CATEGORIES.map(category => (
                  <div key={category} className="flex items-center gap-2">
                    <Checkbox 
                      id={`cat-${category}`} 
                      checked={selectedCategories.includes(category)}
                      onCheckedChange={() => handleCategoryToggle(category)}
                    />
                    <Label htmlFor={`cat-${category}`} className="text-sm font-medium cursor-pointer">{category}</Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="talentTitle">Talent Title <span className="text-destructive">*</span></Label>
              <Input id="talentTitle" placeholder="e.g. Instrumental Guitarist / Freestyle Dancer" value={talentTitle} onChange={e => handleFieldChange('talentTitle', e.target.value, setTalentTitle)} className={getErrorClass('talentTitle')} required />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between items-center mb-1">
                <Label htmlFor="talentDesc">Describe your talent <span className="text-destructive">*</span></Label>
                <span className={`text-xs ${wordCount > 300 ? 'text-destructive font-bold' : 'text-muted-foreground'}`}>
                  {wordCount} / 300 Words
                </span>
              </div>
              <Textarea 
                id="talentDesc" 
                placeholder="Give details about your talent, experience, and style. Limit to 300 words."
                rows={6}
                value={talentDescription}
                onChange={e => handleFieldChange('talentDescription', e.target.value, setTalentDescription)}
                className={getErrorClass('talentDescription')}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Have you performed on stage before? <span className="text-destructive">*</span></Label>
              <RadioGroup value={performedOnStageBefore} onValueChange={setPerformedOnStageBefore} className="flex gap-6 mt-1">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="yes" id="stage-yes" />
                  <Label htmlFor="stage-yes" className="cursor-pointer">Yes, I have</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="no" id="stage-no" />
                  <Label htmlFor="stage-no" className="cursor-pointer">No, I haven't</Label>
                </div>
              </RadioGroup>
            </div>
          </CardContent>
        </Card>

        {/* SECTION 3: Video Submission */}
        <Card className="rounded-2xl shadow-sm border bg-card/60 backdrop-blur-md">
          <CardHeader className="border-b bg-muted/20">
            <CardTitle className="text-lg font-bold">3. Video & Media Submission</CardTitle>
            <CardDescription>Provide performance footage and profile images. Please provide an Introduction Video, a Performance Video/Link, or both (at least one is required).</CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            
            {/* Intro Video */}
            <div id="intro" className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <Film className="h-4 w-4 text-primary" /> 1. Introduction Video Link (30-60s)
              </Label>
              <div className="flex gap-2">
                <div className="relative flex-grow">
                  <Input 
                    placeholder="Auto-captured on upload, or paste a URL" 
                    value={introVideoUrl} 
                    onChange={e => {
                      setIntroVideoUrl(e.target.value);
                      if (errors.videos) setErrors(prev => ({ ...prev, videos: false }));
                    }}
                    className={`font-mono text-xs pr-10 ${errors.videos ? 'border-red-500 border-2 ring-red-500 focus-visible:ring-red-500' : ''}`}
                  />
                  {introVideoUrl && (
                    <button 
                      type="button"
                      className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-destructive"
                      onClick={() => {
                        setIntroVideoUrl('');
                        if (errors.videos) setErrors(prev => ({ ...prev, videos: false }));
                      }}
                      title="Clear URL"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <div className="relative shrink-0">
                  <Button type="button" variant="secondary" className={`rounded-xl flex items-center gap-1 ${errors.videos ? 'border-red-500 border-2' : ''}`} disabled={introProgress !== null}>
                    {introProgress !== null ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" /> {introProgress}%
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4" /> Upload
                      </>
                    )}
                  </Button>
                  <Input 
                    type="file" 
                    accept="video/*" 
                    onChange={e => handleFileChange(e, 'intro')}
                    disabled={introProgress !== null}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                </div>
              </div>
              {introProgress !== null && (
                <div className="w-full bg-muted h-1.5 rounded-full overflow-hidden mt-1">
                  <div className="bg-primary h-full transition-all duration-300" style={{ width: `${introProgress}%` }} />
                </div>
              )}
            </div>

            {/* Talent Video */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <Film className="h-4 w-4 text-primary" /> 2. Performance Video Link / YouTube or Instagram URL
              </Label>
              <div className="flex gap-2">
                <div className="relative flex-grow">
                  <Input 
                    placeholder="Paste YouTube, Instagram reel URL, or upload file" 
                    value={talentVideoUrl} 
                    onChange={e => {
                      setTalentVideoUrl(e.target.value);
                      if (errors.videos) setErrors(prev => ({ ...prev, videos: false }));
                    }}
                    className={`font-mono text-xs pr-10 ${errors.videos ? 'border-red-500 border-2 ring-red-500 focus-visible:ring-red-500' : ''}`}
                  />
                  {talentVideoUrl && (
                    <button 
                      type="button"
                      className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-destructive"
                      onClick={() => {
                        setTalentVideoUrl('');
                        if (errors.videos) setErrors(prev => ({ ...prev, videos: false }));
                      }}
                      title="Clear URL"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <div className="relative shrink-0">
                  <Button type="button" variant="secondary" className={`rounded-xl flex items-center gap-1 ${errors.videos ? 'border-red-500 border-2' : ''}`} disabled={talentProgress !== null}>
                    {talentProgress !== null ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" /> {talentProgress}%
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4" /> Upload
                      </>
                    )}
                  </Button>
                  <Input 
                    type="file" 
                    accept="video/*" 
                    onChange={e => handleFileChange(e, 'talent')}
                    disabled={talentProgress !== null}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                </div>
              </div>
              {talentProgress !== null && (
                <div className="w-full bg-muted h-1.5 rounded-full overflow-hidden mt-1">
                  <div className="bg-primary h-full transition-all duration-300" style={{ width: `${talentProgress}%` }} />
                </div>
              )}
              {errors.videos && (
                <p className="text-xs text-red-500 font-bold mt-1">⚠️ Performance requires providing at least one video or external link.</p>
              )}
              <p className="text-[10px] text-muted-foreground">Upload a 2-minute talent video directly, or paste a link to your performance reel.</p>
            </div>

            {/* Photos */}
            <div id="photos-container" className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <ImageIcon className="h-4 w-4 text-primary" /> Upload 1–5 Profile Images <span className="text-destructive">*</span>
              </Label>
              <div className="flex flex-col gap-4">
                {photos.length > 0 && (
                  <div className={`grid grid-cols-3 sm:grid-cols-5 gap-3 p-3 bg-muted/20 border rounded-xl ${errors.photos ? 'border-red-500 border-2 ring-red-500' : ''}`}>
                    {photos.map((url, idx) => (
                      <div key={url} className="relative group aspect-square rounded-lg overflow-hidden border">
                        <img src={url} alt={`Preview ${idx + 1}`} className="object-cover h-full w-full" />
                        <Button 
                          type="button" 
                          variant="destructive" 
                          size="icon" 
                          className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => {
                            const nextPhotos = photos.filter(p => p !== url);
                            setPhotos(nextPhotos);
                            if (nextPhotos.length === 0 && errors.photos) {
                              setErrors(e => ({ ...e, photos: true }));
                            }
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                {photos.length < 5 && (
                  <div className={`relative border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center hover:bg-muted/10 transition-colors ${errors.photos ? 'border-red-500 border-2 bg-red-50/5 ring-red-500' : ''}`}>
                    <Input 
                      type="file" 
                      accept="image/*" 
                      multiple 
                      onChange={e => handleFileChange(e, 'photos')}
                      disabled={photosProgress !== null}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                    {photosProgress !== null ? (
                      <div className="flex flex-col items-center gap-2 w-full max-w-xs">
                        <Loader2 className="h-8 w-8 text-primary animate-spin" />
                        <span className="text-xs font-bold text-muted-foreground">Uploading: {photosProgress}%</span>
                        <div className="w-full bg-muted h-2 rounded-full overflow-hidden">
                          <div className="bg-primary h-full transition-all duration-300" style={{ width: `${photosProgress}%` }} />
                        </div>
                      </div>
                    ) : (
                      <>
                        <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                        <span className="text-sm font-bold text-center">Click to add profile images ({photos.length} of 5 added)</span>
                        <span className="text-[11px] text-muted-foreground">Select multiple profile images (Minimum 1, Maximum 5)</span>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>

          </CardContent>
        </Card>

        {/* SECTION 4: Social Media (Optional) */}
        <Card className="rounded-2xl shadow-sm border bg-card/60 backdrop-blur-md">
          <CardHeader className="border-b bg-muted/20">
            <CardTitle className="text-lg font-bold">4. Social Media (Optional)</CardTitle>
            <CardDescription>Provide links to your online portfolios.</CardDescription>
          </CardHeader>
          <CardContent className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="insta">Instagram Link</Label>
              <Input id="insta" placeholder="instagram.com/yourprofile" value={instagram} onChange={e => setInstagram(e.target.value)} />
            </div>

            <div className="space-y-1">
              <Label htmlFor="youtubeLink">YouTube Channel</Label>
              <Input id="youtubeLink" placeholder="youtube.com/@channel" value={youtube} onChange={e => setYoutube(e.target.value)} />
            </div>

            <div className="space-y-1">
              <Label htmlFor="fb">Facebook Profile</Label>
              <Input id="fb" placeholder="facebook.com/yourprofile" value={facebook} onChange={e => setFacebook(e.target.value)} />
            </div>

            <div className="space-y-1">
              <Label htmlFor="otherSocial">Other Portfolios / Websites</Label>
              <Input id="otherSocial" placeholder="LinkedIn, personal site, etc." value={otherSocial} onChange={e => setOtherSocial(e.target.value)} />
            </div>
          </CardContent>
        </Card>

        {/* SECTION 5: Availability */}
        <Card className="rounded-2xl shadow-sm border bg-card/60 backdrop-blur-md">
          <CardHeader className="border-b bg-muted/20">
            <CardTitle className="text-lg font-bold">5. Availability & Travel</CardTitle>
            <CardDescription>Coordinate scheduling and recording locations.</CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="space-y-2">
              <Label>Can you travel to our shooting location? <span className="text-destructive">*</span></Label>
              <RadioGroup value={canTravel} onValueChange={setCanTravel} className="flex gap-6 mt-1">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="yes" id="travel-yes" />
                  <Label htmlFor="travel-yes" className="cursor-pointer">Yes, I can travel</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="no" id="travel-no" />
                  <Label htmlFor="travel-no" className="cursor-pointer">No, I can't travel</Label>
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label>Preferred Language(s) <span className="text-destructive">*</span></Label>
              <div className="flex gap-6 p-3 bg-muted/20 border rounded-xl">
                {PREFERRED_LANGUAGES.map(lang => (
                  <div key={lang} className="flex items-center gap-2">
                    <Checkbox 
                      id={`lang-${lang}`} 
                      checked={languages.includes(lang)}
                      onCheckedChange={() => handleLanguageToggle(lang)}
                    />
                    <Label htmlFor={`lang-${lang}`} className="text-sm font-medium cursor-pointer">{lang}</Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-center justify-between border rounded-xl p-4">
                <div className="space-y-0.5">
                  <Label className="text-sm font-bold">Available on Weekends?</Label>
                  <p className="text-[11px] text-muted-foreground">Saturday & Sunday recordings</p>
                </div>
                <Switch checked={availableWeekends} onCheckedChange={setAvailableWeekends} />
              </div>

              <div className="flex items-center justify-between border rounded-xl p-4">
                <div className="space-y-0.5">
                  <Label className="text-sm font-bold">Available on Weekdays?</Label>
                  <p className="text-[11px] text-muted-foreground">Monday to Friday recordings</p>
                </div>
                <Switch checked={availableWeekdays} onCheckedChange={setAvailableWeekdays} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* SECTION 6: Emergency Contact */}
        <Card className="rounded-2xl shadow-sm border bg-card/60 backdrop-blur-md">
          <CardHeader className="border-b bg-muted/20">
            <CardTitle className="text-lg font-bold">6. Emergency Contact</CardTitle>
            <CardDescription>Who should we reach in case of an emergency?</CardDescription>
          </CardHeader>
          <CardContent className="p-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1">
              <Label htmlFor="emName">Contact Name <span className="text-destructive">*</span></Label>
              <Input id="emName" placeholder="Full Name" value={emergencyName} onChange={e => handleFieldChange('emergencyName', e.target.value, setEmergencyName)} className={getErrorClass('emergencyName')} required />
            </div>

            <div className="space-y-1">
              <Label htmlFor="emRel">Relationship <span className="text-destructive">*</span></Label>
              <Input id="emRel" placeholder="e.g. Parent / Spouse" value={emergencyRelationship} onChange={e => handleFieldChange('emergencyRelationship', e.target.value, setEmergencyRelationship)} className={getErrorClass('emergencyRelationship')} required />
            </div>

            <div className="space-y-1">
              <Label htmlFor="emPhone">Mobile Number <span className="text-destructive">*</span></Label>
              <Input id="emPhone" type="tel" placeholder="Contact number" value={emergencyMobile} onChange={e => handleFieldChange('emergencyMobile', e.target.value, setEmergencyMobile)} className={getErrorClass('emergencyMobile')} required />
            </div>
          </CardContent>
        </Card>

        {/* SECTION 7: Declaration */}
        <Card className="rounded-2xl shadow-sm border bg-card/60 backdrop-blur-md">
          <CardHeader className="border-b bg-muted/20">
            <CardTitle className="text-lg font-bold">7. Declaration</CardTitle>
            <CardDescription>Please review and confirm terms before submitting.</CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className={`flex items-start gap-2.5 p-3 rounded-lg border transition-colors ${errors.confirmCorrect ? 'border-red-500 bg-red-50/5 border-2' : 'border-transparent'}`}>
              <Checkbox id="dec1" checked={confirmCorrect} onCheckedChange={(val) => handleFieldChange('confirmCorrect', !!val, setConfirmCorrect)} className="mt-1" />
              <Label htmlFor="dec1" className="text-xs leading-normal cursor-pointer">
                I confirm all information provided in this application form is correct and truthful.
              </Label>
            </div>

            <div className={`flex items-start gap-2.5 p-3 rounded-lg border transition-colors ${errors.ownContent ? 'border-red-500 bg-red-50/5 border-2' : 'border-transparent'}`}>
              <Checkbox id="dec2" checked={ownContent} onCheckedChange={(val) => handleFieldChange('ownContent', !!val, setOwnContent)} className="mt-1" />
              <Label htmlFor="dec2" className="text-xs leading-normal cursor-pointer">
                I confirm that I own all rights to the uploaded media content and performance videos.
              </Label>
            </div>

            <div className={`flex items-start gap-2.5 p-3 rounded-lg border transition-colors ${errors.allowPublish ? 'border-red-500 bg-red-50/5 border-2' : 'border-transparent'}`}>
              <Checkbox id="dec3" checked={allowPublish} onCheckedChange={(val) => handleFieldChange('allowPublish', !!val, setAllowPublish)} className="mt-1" />
              <Label htmlFor="dec3" className="text-xs leading-normal cursor-pointer">
                I allow Kannada's Got Latent to record, edit, and publish my performance on social media and other platforms if I am selected.
              </Label>
            </div>

            <div className={`flex items-start gap-2.5 p-3 rounded-lg border transition-colors ${errors.understandNotGuaranteed ? 'border-red-500 bg-red-50/5 border-2' : 'border-transparent'}`}>
              <Checkbox id="dec4" checked={understandNotGuaranteed} onCheckedChange={(val) => handleFieldChange('understandNotGuaranteed', !!val, setUnderstandNotGuaranteed)} className="mt-1" />
              <Label htmlFor="dec4" className="text-xs leading-normal cursor-pointer">
                I understand that submitting this registration form does not guarantee selection for the stage show.
              </Label>
            </div>
          </CardContent>
        </Card>

        {/* Action Button */}
        <div className="flex justify-center pt-4">
          <Button 
            type="submit" 
            size="lg" 
            disabled={isSubmitting} 
            className="w-full sm:w-64 rounded-xl font-bold text-base h-12 shadow-lg transition-transform hover:scale-[1.02]"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Submitting...
              </>
            ) : (
              'Apply Now'
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}

// Simple placeholder award badge component for Shortlist representation
function AwardBadge({ className }: { className?: string }) {
  return (
    <svg 
      className={className} 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      <circle cx="12" cy="8" r="7" />
      <path d="M8.21 13.89 7 23l5-3 5 3-1.21-9.12" />
    </svg>
  );
}
