
"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, ShieldOff } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc, Timestamp, collection, getDocs, query, orderBy, where, limit, addDoc } from "firebase/firestore";
import type {
  ArtistApplication,
  ArtistApplicationStatus,
  ArtistControlOptions,
  FirestoreCategory,
  FirestoreUser,
  PinCodeAreaMapping,
  FirestoreNotification,
} from '@/types/firestore';
import { FirestoreCity, FirestoreArea } from '@/types/firestore';
import ArtistRegistrationStepper from '@/components/artist-registration/ArtistRegistrationStepper';
import Step0AuthPrompt from '@/components/artist-registration/Step0AuthPrompt';
import ApplicationStatusDisplay from '@/components/artist-registration/ApplicationStatusDisplay';
import Step1CategorySkills from '@/components/artist-registration/Step1CategorySkills';
import Step2PersonalInfo from '@/components/artist-registration/Step2PersonalInfo';
import Step3PortfolioPhotos from '@/components/artist-registration/Step3PortfolioPhotos';
import Step4KycDocuments from '@/components/artist-registration/Step4KycDocuments';
import Step5WorkAreaSignature from '@/components/artist-registration/Step5WorkAreaSignature';
import { useApplicationConfig } from '@/hooks/useApplicationConfig';
import { useFeaturesConfig } from '@/hooks/useFeaturesConfig';
import { ADMIN_EMAIL } from '@/contexts/AuthContext';
import { sendNewArtistApplicationAdminEmail, type NewArtistApplicationAdminEmailInput } from "@/ai/flows/sendArtistApplicationAdminNotificationFlow";
import { getBaseUrl } from '@/lib/config';
import { useToast } from '@/hooks/use-toast';
import { useGlobalSettings } from '@/hooks/useGlobalSettings';
import { triggerRefresh, submitProfileToGoogleIndexing } from '@/lib/revalidateUtils';

const RegistrationCompleted = ({ isAdminEdit }: { isAdminEdit?: boolean }) => (
  <Card>
    <CardHeader>
      <CardTitle className="text-center text-2xl font-headline">
        {isAdminEdit ? "Application Updated" : "Application Submitted!"}
      </CardTitle>
    </CardHeader>
    <CardContent className="text-center">
      <p className="text-muted-foreground mb-6">
        {isAdminEdit 
          ? "The artist's application details have been successfully updated." 
          : "Thank you for submitting your artist application. We will review it and get back to you soon regarding the status."}
      </p>
      <Link href={isAdminEdit ? "/admin/artist-applications" : "/"}>
        <Button>{isAdminEdit ? "Back to Admin Panel" : "Back to Home"}</Button>
      </Link>
    </CardContent>
  </Card>
);

const Artist_APPLICATION_COLLECTION = "ArtistApplications";
const Artist_CONTROL_OPTIONS_COLLECTION = "ArtistControlOptions";

const removeUndefined = (obj: any): any => {
  if (Array.isArray(obj)) {
    return obj.map(removeUndefined);
  } else if (obj !== null && typeof obj === 'object' && !(obj instanceof Timestamp)) {
    return Object.fromEntries(
      Object.entries(obj)
        .filter(([_, v]) => v !== undefined)
        .map(([k, v]) => [k, removeUndefined(v)])
    );
  }
  return obj;
};

export default function ArtistRegistrationPage() {
  const { user, firestoreUser, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const isUserProfileEdit = searchParams.get('edit') === 'profile';
  const editApplicationId = searchParams.get('editApplicationId');
  const isEditModeByAdmin = !!(editApplicationId && user?.email === ADMIN_EMAIL);
  const editingApplicationIdForAdmin = isEditModeByAdmin ? editApplicationId : null;

  const [currentStep, setCurrentStep] = useState(0);
  const [applicationData, setApplicationData] = useState<Partial<ArtistApplication>>({});
  const [applicationStatus, setApplicationStatus] = useState<ArtistApplicationStatus | null>(null);
  const [isLoadingPage, setIsLoadingPage] = useState(true);
  const [isSavingStep, setIsSavingStep] = useState(false);

  const [controlOptions, setControlOptions] = useState<ArtistControlOptions | null>(null);
  const [isLoadingControls, setIsLoadingControls] = useState(true);
  const [userFirestoreData, setUserFirestoreData] = useState<Partial<FirestoreUser> | null>(null);

  const { config: appConfig, isLoading: isLoadingAppConfig } = useApplicationConfig();
  const { featuresConfig, isLoading: isLoadingFeaturesConfig } = useFeaturesConfig();
  const { settings: globalSettings } = useGlobalSettings();

  const formContainerRef = useRef<HTMLDivElement>(null);
  const prevStepRef = useRef<number | null>(null);

  useEffect(() => {
    if (isLoadingPage) return;

    const isInitialOrRefresh = prevStepRef.current === null;
    
    if (!isInitialOrRefresh) {
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
    
    prevStepRef.current = currentStep;
  }, [currentStep, isLoadingPage]);

  const fetchControlOptions = useCallback(async () => {
    setIsLoadingControls(true);
    try {
      const fetchArrayOption = async (docId: string, fieldName: string) => {
        const docRef = doc(db, Artist_CONTROL_OPTIONS_COLLECTION, docId);
        const docSnap = await getDoc(docRef);
        return docSnap.exists() ? (docSnap.data()[fieldName] as any[] || []) : [];
      };

      const categoriesSnap = await getDocs(query(collection(db, "adminCategories"), orderBy("order", "asc")));
      const fetchedCategories = categoriesSnap.docs.map(d => ({...d.data(), id: d.id } as FirestoreCategory));

      const citiesSnap = await getDocs(query(collection(db, "cities"), where("isActive", "==", true), orderBy("name", "asc")));
      const fetchedCities = citiesSnap.docs.map(d => ({...d.data(), id: d.id } as FirestoreCity));

      const areasSnap = await getDocs(query(collection(db, "areas"), where("isActive", "==", true), orderBy("name", "asc")));
      const fetchedAreas = areasSnap.docs.map(d => ({...d.data(), id: d.id } as FirestoreArea));

      const [experienceLevels, skillLevels, qualificationOptions, languageOptions, additionalDocTypesDoc, pinCodeMappingsDoc] = await Promise.all([
        fetchArrayOption("experienceLevels", "levels"),
        fetchArrayOption("skillLevels", "levels"),
        fetchArrayOption("qualificationOptions", "options"),
        fetchArrayOption("languageOptions", "options"),
        getDoc(doc(db, Artist_CONTROL_OPTIONS_COLLECTION, "additionalDocTypes")),
        getDoc(doc(db, Artist_CONTROL_OPTIONS_COLLECTION, "pinCodeAreaMappings")),
      ]);
      
      const additionalDocTypes = additionalDocTypesDoc.exists() ? (additionalDocTypesDoc.data().options as any[] || []) : [];
      const isKycEnabled = additionalDocTypesDoc.exists() ? (additionalDocTypesDoc.data().isKycEnabled ?? true) : true;
      const fetchedPinCodeMappings = pinCodeMappingsDoc.exists() ? (pinCodeMappingsDoc.data().mappings as PinCodeAreaMapping[] || []) : [];

      setControlOptions({
        categories: fetchedCategories,
        cities: fetchedCities,
        areas: fetchedAreas,
        experienceLevels,
        skillLevels,
        qualificationOptions,
        languageOptions,
        additionalDocTypes,
        isKycEnabled,
        pinCodeAreaMappings: fetchedPinCodeMappings.sort((a, b) => a.order - b.order),
      });
    } catch (error) {
      console.error("Error fetching control options:", error);
    } finally {
      setIsLoadingControls(false);
    }
  }, []);

  const fetchApplicationAndUserData = useCallback(async () => {
    const targetUserId = isEditModeByAdmin ? editingApplicationIdForAdmin : user?.uid;
    if (!targetUserId) {
      setIsLoadingPage(false);
      return;
    }
    setIsLoadingPage(true);
    try {
      const userDocRef = doc(db, "users", targetUserId);
      const userDocSnap = await getDoc(userDocRef);
      if (userDocSnap.exists()) {
        setUserFirestoreData(userDocSnap.data() as FirestoreUser);
      }

      const appDocRef = doc(db, Artist_APPLICATION_COLLECTION, targetUserId);
      const docSnap = await getDoc(appDocRef);
      if (docSnap.exists()) {
        const data = docSnap.data() as ArtistApplication;
        setApplicationData(data);
        setApplicationStatus(data.status);
        if (!isEditModeByAdmin) {
          if (isUserProfileEdit) {
            setCurrentStep(1);
          } else if (data.status === 'approved') {
            // No action needed
          } else if (data.status.startsWith('pending_step_')) {
            setCurrentStep(parseInt(data.status.replace('pending_step_', ''), 10));
          } else if (data.status === 'needs_update') {
            setCurrentStep(1); 
          }
        } else {
            setCurrentStep(1);
        }
      } else {
        if (isEditModeByAdmin) {
          toast({ title: "Error", description: "Application not found for editing.", variant: "destructive" });
          router.push('/admin/artist-applications');
          return;
        }
        setCurrentStep(1);
      }
    } catch (error) {
      console.error("Error fetching Artist application:", error);
    } finally {
      setIsLoadingPage(false);
    }
  }, [user, isEditModeByAdmin, editingApplicationIdForAdmin, router, toast]);

  useEffect(() => {
    if (!authLoading && !isLoadingAppConfig && !isLoadingFeaturesConfig) {
      if (user || (isEditModeByAdmin && editingApplicationIdForAdmin)) {
        
        // Subscription Gate Check
        const isAdmin = user?.email === ADMIN_EMAIL;
        if (!isAdmin && !isEditModeByAdmin && featuresConfig?.isSubscriptionRequired && !firestoreUser?.subscriptionActive) {
            toast({ 
                title: "Subscription Required", 
                description: "You need an active subscription to join as an artist.",
                variant: "destructive"
            });
            router.push('/subscriptions');
            return;
        }

        if (currentStep === 0) setCurrentStep(1); 
        fetchApplicationAndUserData();
        fetchControlOptions();
      } else {
        setCurrentStep(0);
        setIsLoadingPage(false);
        setIsLoadingControls(false);
      }
    }
  }, [user, firestoreUser, authLoading, fetchApplicationAndUserData, fetchControlOptions, isLoadingAppConfig, isLoadingFeaturesConfig, featuresConfig, isEditModeByAdmin, editingApplicationIdForAdmin, toast, router]);

  const handleSaveStep = async (stepData: Partial<ArtistApplication>, nextStepStatus: ArtistApplicationStatus) => {
    const targetUserIdForSave = editingApplicationIdForAdmin || user?.uid;
    if (!targetUserIdForSave) return;
    setIsSavingStep(true);
  
    const currentStatusForSave = isEditModeByAdmin ? (applicationData.status || 'pending_review') : nextStepStatus;

    const currentAppData: Partial<ArtistApplication> = {
      ...applicationData,
      ...stepData,
      status: currentStatusForSave,
      userId: targetUserIdForSave,
      username: userFirestoreData?.username || applicationData.username, // Denormalize username for profile linking
      updatedAt: Timestamp.now(),
    };
  
    if (!currentAppData.createdAt && !isEditModeByAdmin) {
      currentAppData.createdAt = Timestamp.now();
    }
    setApplicationData(currentAppData);
  
    try {
      const appDocRef = doc(db, Artist_APPLICATION_COLLECTION, targetUserIdForSave);
      await setDoc(appDocRef, removeUndefined(currentAppData), { merge: true });

      // Trigger SmartSync Revalidation if profile is already approved
      if (currentAppData.status === 'approved') {
        await triggerRefresh('artists');
        if (currentAppData.workCategorySlug) {
            await triggerRefresh(`category-${currentAppData.workCategorySlug}`);
        }
        if (currentAppData.workCategorySlug && currentAppData.username) {
            submitProfileToGoogleIndexing(currentAppData.workCategorySlug, currentAppData.username).catch(err => {
                console.error("Google Indexing error in stepper save:", err);
            });
        }
      }
    } catch (error) {
      console.error("Error saving step data:", error);
    } finally {
      setIsSavingStep(false);
    }
  };

  const isKycStepActive = !!(controlOptions?.isKycEnabled && (controlOptions?.additionalDocTypes?.filter(opt => opt.isActive).length > 0));

  const selectedCategory = controlOptions?.categories?.find(c => c.id === applicationData.workCategoryId);
  const isPortfolioStepActive = selectedCategory ? (selectedCategory.isPortfolioRequired ?? true) : true;

  const handleNextStep = async (stepDataFromComponent: Partial<ArtistApplication>) => {
    let nextStep = currentStep + 1;
    
    // Check if we need to skip portfolio step (Step 3)
    if (nextStep === 3 && !isPortfolioStepActive) {
      nextStep = 4;
    }
    
    // Check if we need to skip KYC step (Step 4)
    if (nextStep === 4 && !isKycStepActive) {
      nextStep = 5;
    }

    const nextArtistStepStatus = `pending_step_${nextStep}` as ArtistApplicationStatus;
    await handleSaveStep(stepDataFromComponent, nextArtistStepStatus);
    setCurrentStep(nextStep);
  };

  const handlePreviousStep = () => {
    if (currentStep > 1) {
      let prevStep = currentStep - 1;
      
      // Check if we need to skip KYC step (Step 4)
      if (prevStep === 4 && !isKycStepActive) {
        prevStep = 3;
      }
      
      // Check if we need to skip portfolio step (Step 3)
      if (prevStep === 3 && !isPortfolioStepActive) {
        prevStep = 2;
      }

      setCurrentStep(prevStep);
    }
  };
  
  const handleFinalSubmitApplication = async (finalStepData: Partial<ArtistApplication>) => {
    const targetUserIdForSubmit = editingApplicationIdForAdmin || user?.uid;
    if (!targetUserIdForSubmit) return;
    setIsSavingStep(true);

    const completeFinalData: Partial<ArtistApplication> = {
      ...applicationData, ...finalStepData,
      updatedAt: Timestamp.now(),
    };
    
    if (isEditModeByAdmin) {
      completeFinalData.status = applicationData.status || 'pending_review';
    } else {
      completeFinalData.status = 'pending_review';
      if (!applicationData.submittedAt) completeFinalData.submittedAt = Timestamp.now();
    }
    setApplicationData(completeFinalData);

    try {
      const appDocRef = doc(db, Artist_APPLICATION_COLLECTION, targetUserIdForSubmit);
      await setDoc(appDocRef, removeUndefined(completeFinalData), { merge: true });

      // Trigger SmartSync Revalidation if profile is already approved (Admin Edit case)
      if (completeFinalData.status === 'approved') {
        await triggerRefresh('artists');
        if (completeFinalData.workCategorySlug) {
            await triggerRefresh(`category-${completeFinalData.workCategorySlug}`);
        }
        if (completeFinalData.workCategorySlug && completeFinalData.username) {
            submitProfileToGoogleIndexing(completeFinalData.workCategorySlug, completeFinalData.username).catch(err => {
                console.error("Google Indexing error in admin submit:", err);
            });
        }
      }

      localStorage.removeItem('newtalent_reg_step1');
      localStorage.removeItem('newtalent_reg_step2');
      localStorage.removeItem('newtalent_reg_step3');
      localStorage.removeItem('newtalent_reg_step4');
      localStorage.removeItem('newtalent_reg_step5');

      if (isEditModeByAdmin) {
        toast({ title: "Application Updated", description: "Artist application details saved by admin." });
        router.push('/admin/artist-applications');
      } else {
        setApplicationStatus('pending_review');
        setCurrentStep(6);

        const adminQuery = query(collection(db, "users"), where("email", "==", ADMIN_EMAIL), limit(1));
        const adminSnapshot = await getDocs(adminQuery);
        if (!adminSnapshot.empty) {
          const adminUid = adminSnapshot.docs[0].id;
          const adminNotificationData: FirestoreNotification = {
            userId: adminUid, title: "New Artist Application",
            message: `Artist ${completeFinalData.fullName || user?.email} has submitted an application.`,
            type: "admin_alert", href: `/admin/artist-applications?appId=${targetUserIdForSubmit}`,
            read: false, createdAt: Timestamp.now(),
          };
          await addDoc(collection(db, "userNotifications"), adminNotificationData);
        }

        if (appConfig.smtpHost && appConfig.senderEmail) {
          const emailInput: NewArtistApplicationAdminEmailInput = {
            applicationId: targetUserIdForSubmit,
            ArtistName: completeFinalData.fullName || user?.displayName || "N/A",
            ArtistEmail: completeFinalData.email || user?.email || "no-reply@newtalent.in",
            ArtistCategory: completeFinalData.workCategoryName || "N/A",
            applicationUrl: `${getBaseUrl()}/admin/artist-applications?appId=${targetUserIdForSubmit}`,
            smtpHost: appConfig.smtpHost, smtpPort: appConfig.smtpPort,
            smtpUser: appConfig.smtpUser, smtpPass: appConfig.smtpPass, senderEmail: appConfig.senderEmail,
            siteName: globalSettings.websiteName || "Newtalent",
            logoUrl: (globalSettings.logoUrl && globalSettings.logoUrl.startsWith('http'))
              ? globalSettings.logoUrl
              : `${getBaseUrl()}${globalSettings.logoUrl ? (globalSettings.logoUrl.startsWith('/') ? globalSettings.logoUrl : '/' + globalSettings.logoUrl) : '/android-chrome-512x512.png'}`,
            ArtistMobile: completeFinalData.mobileNumber || "N/A",
            ArtistGender: completeFinalData.gender || "N/A",
            ArtistExperience: completeFinalData.experienceLevelLabel || "N/A",
            ArtistLocation: completeFinalData.city && completeFinalData.area ? `${completeFinalData.area}, ${completeFinalData.city}` : (completeFinalData.city || completeFinalData.area || "N/A"),
            ArtistAge: completeFinalData.age || undefined,
            ArtistHeight: completeFinalData.height || "N/A",
            ArtistWeight: completeFinalData.weight || "N/A",
            ArtistSkinTone: completeFinalData.skinTone || "N/A",
            ArtistQualification: completeFinalData.qualificationLabel || "N/A",
            ArtistLanguages: completeFinalData.languagesSpokenLabels?.join(', ') || "N/A",
          };
          try { 
            const result = await sendNewArtistApplicationAdminEmail(emailInput); 
            if (result && !result.success) {
              console.error("Email flow reported failure:", result.message);
            } else if (!result) {
              console.error("Email flow returned no result.");
            }
          } catch (emailError) { 
            console.error("EMAIL ERROR FULL:", emailError); 
          }
        }
      }
    } catch (error) {
      console.error("Error during final application submission:", error);
      toast({ title: "Error", description: `Could not submit application.`, variant: "destructive" });
    } finally {
      setIsSavingStep(false);
    }
  };

  if (authLoading || isLoadingPage || isLoadingControls || isLoadingAppConfig) {
    return (<div className="min-h-screen flex items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>);
  }

  if (!appConfig.isArtistRegistrationEnabled && user?.email !== ADMIN_EMAIL && !isEditModeByAdmin) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <ShieldOff className="mx-auto h-24 w-24 text-muted-foreground mb-6" />
        <h1 className="text-3xl font-bold text-foreground mb-4">Registrations Closed</h1>
        <p className="text-lg text-muted-foreground mb-8">We are not accepting new artist registrations at this time. Please check back later.</p>
        <Link href="/"><Button variant="outline">Go Back to Home</Button></Link>
      </div>
    );
  }

  const renderStepContent = () => {
    if (!isEditModeByAdmin && !isUserProfileEdit && applicationStatus === 'approved') return <ApplicationStatusDisplay status="approved" />;
    if (!isEditModeByAdmin && applicationStatus === 'rejected') return <ApplicationStatusDisplay status="rejected" message={applicationData.adminReviewNotes} />;
    if (!isEditModeByAdmin && !isUserProfileEdit && applicationStatus === 'pending_review') return <ApplicationStatusDisplay status="pending_review" />;

    switch (currentStep) {
      case 0: 
        if (user) return <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
        return <Step0AuthPrompt redirectUrl={isUserProfileEdit ? "/artist-registration?edit=profile" : "/artist-registration"} />;
      case 1: return <Step1CategorySkills onNext={handleNextStep} initialData={applicationData} controlOptions={controlOptions} isSaving={isSavingStep} />;
      case 2: return <Step2PersonalInfo onNext={handleNextStep} onPrevious={handlePreviousStep} initialData={applicationData} controlOptions={controlOptions} isSaving={isSavingStep} userUid={editingApplicationIdForAdmin || user?.uid || ""} />;
      case 3: return <Step3PortfolioPhotos onNext={handleNextStep} onPrevious={handlePreviousStep} initialData={applicationData} controlOptions={controlOptions} isSaving={isSavingStep} userUid={editingApplicationIdForAdmin || user?.uid || ""} />;
      case 4: return <Step4KycDocuments onNext={handleNextStep} onPrevious={handlePreviousStep} initialData={applicationData} controlOptions={controlOptions} isSaving={isSavingStep} userUid={editingApplicationIdForAdmin || user?.uid || ""} />;
      case 5: return <Step5WorkAreaSignature onSubmit={handleFinalSubmitApplication} onPrevious={handlePreviousStep} initialData={applicationData} controlOptions={controlOptions} isSaving={isSavingStep} userUid={editingApplicationIdForAdmin || user?.uid || ""} />;
      case 6: return <RegistrationCompleted isAdminEdit={isEditModeByAdmin} />;
      default: return <Card><CardContent className="pt-6">Loading step...</CardContent></Card>;
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 min-h-screen" ref={formContainerRef}>
      <Card className="max-w-3xl mx-auto shadow-xl scroll-mt-20">
        <CardHeader>
          <CardTitle className="text-2xl md:text-3xl font-headline text-center">
            {isEditModeByAdmin ? "Edit Artist Application" : "Artist Registration"}
          </CardTitle>
          {currentStep > 0 && currentStep < 6 && applicationStatus?.startsWith('pending_step_') && !isEditModeByAdmin && (
  <CardDescription className="text-center">
    Complete the steps below to join our network.
  </CardDescription>
)}
          {currentStep > 0 && currentStep < 6 && isEditModeByAdmin && (
  <CardDescription className="text-center">
    Editing application for: {applicationData.fullName || editingApplicationIdForAdmin}
  </CardDescription>
)}
        </CardHeader>
        <CardContent>
          {currentStep > 0 && currentStep < 6 && (applicationStatus?.startsWith('pending_step_') || isEditModeByAdmin) && (
            <ArtistRegistrationStepper 
              currentStep={currentStep} 
              isKycEnabled={isKycStepActive} 
              isPortfolioEnabled={isPortfolioStepActive} 
            />
          )}
          <div className="mt-6">
            {renderStepContent()}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

