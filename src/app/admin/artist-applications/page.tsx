"use client";

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users2, Eye, Edit, Trash2, CheckCircle, XCircle, AlertTriangle, Loader2, PackageSearch, UserCircle } from "lucide-react";
import type { ArtistApplication, ArtistApplicationStatus, FirestoreNotification } from '@/types/firestore';
import { db, storage } from '@/lib/firebase';
import { triggerPushNotification } from '@/lib/fcmUtils';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, Timestamp, deleteDoc, addDoc, where, getDocs, limit, getDoc } from "firebase/firestore";
import { ref as storageRef, deleteObject } from "firebase/storage";
 
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import ArtistApplicationDetailsModal from '@/components/admin/ArtistApplicationDetailsModal';
import { Textarea } from '@/components/ui/textarea'; 
import { Label } from '@/components/ui/label'; 
import { useApplicationConfig } from '@/hooks/useApplicationConfig'; 
import { sendArtistApplicationStatusEmail } from '@/ai/flows/sendArtistApplicationStatusUpdateFlow'; 
import { getBaseUrl } from '@/lib/config'; 
import { Separator } from "@/components/ui/separator";
import { getTimestampMillis } from '@/lib/utils';
import { triggerRefresh, submitProfileToGoogleIndexing } from '@/lib/revalidateUtils';

const Artist_APPLICATION_COLLECTION = "ArtistApplications";
const applicationStatusOptions: ArtistApplicationStatus[] = ['pending_review', 'pending_step_1', 'pending_step_2', 'pending_step_3', 'pending_step_4', 'approved', 'rejected', 'needs_update'];

const formatApplicationTimestamp = (timestamp?: any): string => {
  const millis = getTimestampMillis(timestamp);
  if (!millis) return 'N/A';
  return new Date(millis).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true });
};

export default function AdminArtistApplicationsPage() {
  const [applications, setApplications] = useState<ArtistApplication[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState<string | null>(null); 
  const [filterStatus, setFilterStatus] = useState<ArtistApplicationStatus | "all">("all");
  const { toast } = useToast();
  const router = useRouter();

  const [selectedApplication, setSelectedApplication] = useState<ArtistApplication | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [adminReviewNotes, setAdminReviewNotes] = useState("");
  const [showNotesInputFor, setShowNotesInputFor] = useState<string | null>(null); 
  const [pendingStatusForNotes, setPendingStatusForNotes] = useState<ArtistApplicationStatus | null>(null);

  const { config: appConfig, isLoading: isLoadingAppSettings } = useApplicationConfig();

  useEffect(() => {
    setIsLoading(true);
    const applicationsCollectionRef = collection(db, Artist_APPLICATION_COLLECTION);
    const q = query(applicationsCollectionRef, orderBy("createdAt", "desc"));
    
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const fetchedApplications = querySnapshot.docs.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data(),
      } as ArtistApplication));
      setApplications(fetchedApplications);
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching Artist applications: ", error);
      toast({ title: "Error", description: "Could not fetch Artist applications.", variant: "destructive" });
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [toast]);


  const filteredApplications = useMemo(() => {
    if (filterStatus === "all") {
      return applications;
    }
    return applications.filter(app => app.status === filterStatus);
  }, [applications, filterStatus]);

  const handleUpdateStatus = async (applicationId: string, newStatus: ArtistApplicationStatus, notes?: string) => {
    if (!applicationId) return;
    setIsUpdating(applicationId);
    try {
      const appDocRef = doc(db, Artist_APPLICATION_COLLECTION, applicationId);
      const appToUpdate = applications.find(app => app.id === applicationId);
      if (!appToUpdate) {
          toast({ title: "Error", description: "Application not found.", variant: "destructive"});
          setIsUpdating(null);
          return;
      }

      const updatePayload: Partial<ArtistApplication> = {
        status: newStatus,
        updatedAt: Timestamp.now(),
      };

      // If approved, denormalize username and update user role
      if (newStatus === 'approved') {
        const userDocRef = doc(db, 'users', appToUpdate.userId);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          const userData = userDocSnap.data();
          if (userData.username) {
            updatePayload.username = userData.username;
          }
          
          // Add artist role to user roles array if not already present
          const currentRoles = userData.roles || ['customer'];
          if (!currentRoles.includes('artist')) {
            await updateDoc(userDocRef, {
              roles: [...currentRoles, 'artist'],
              updatedAt: Timestamp.now()
            });
          }
        }

        // Ensure category data is present on the application for querying in category pages
        if (appToUpdate.workCategoryId) {
          updatePayload.workCategoryId = appToUpdate.workCategoryId;
          
          // Fetch category details if slug or name is missing
          if (!appToUpdate.workCategorySlug || !appToUpdate.workCategoryName) {
            try {
              const catDocRef = doc(db, 'adminCategories', appToUpdate.workCategoryId);
              const catDocSnap = await getDoc(catDocRef);
              if (catDocSnap.exists()) {
                const catData = catDocSnap.data();
                updatePayload.workCategorySlug = catData.slug;
                updatePayload.workCategoryName = catData.name;
              }
            } catch (e) {
              console.error("Error fetching category for denormalization:", e);
            }
          } else {
            updatePayload.workCategoryName = appToUpdate.workCategoryName;
            updatePayload.workCategorySlug = appToUpdate.workCategorySlug;
          }
        }
      }

      if (notes && (newStatus === 'rejected' || newStatus === 'needs_update')) {
        updatePayload.adminReviewNotes = notes;
      }
      
      await updateDoc(appDocRef, updatePayload);
      
      // Trigger SmartSync Revalidation
      await triggerRefresh('artists');
      await triggerRefresh('admin-stats');
      await triggerRefresh('global-cache'); // Added to clear homepage/category stale data
      if (appToUpdate.workCategorySlug) {
        await triggerRefresh(`category-${appToUpdate.workCategorySlug}`);
      }

      // Submit to Google Indexing API if approved
      if (newStatus === 'approved') {
        const categorySlug = updatePayload.workCategorySlug || appToUpdate.workCategorySlug;
        const artistUsername = updatePayload.username || appToUpdate.username;
        if (categorySlug && artistUsername) {
          submitProfileToGoogleIndexing(categorySlug, artistUsername).catch(err => {
            console.error("Google Indexing error on approval:", err);
          });
        }
      }

      toast({ title: "Success", description: `Application status updated to ${newStatus}.` });
      setShowNotesInputFor(null); 
      setAdminReviewNotes("");
      setPendingStatusForNotes(null);


      // Send email to Artist
      if (appConfig.smtpHost && appConfig.senderEmail && appToUpdate.email && appToUpdate.userId) {
        let emailMessageAction = "";
        let notificationType: "success" | "error" | "warning" = "warning";
        let notificationLink = `/artist-registration`; 

        switch(newStatus) {
            case 'approved':
                emailMessageAction = "Congratulations! Your application is approved. You can now access your Artist dashboard.";
                notificationType = "success";
                notificationLink = "/artist"; 
                break;
            case 'rejected':
                emailMessageAction = "Your application was not approved at this time." + (notes ? ` Feedback: ${notes}` : "");
                notificationType = "error";
                break;
            case 'needs_update':
                emailMessageAction = "Your application requires updates." + (notes ? ` Please address: ${notes}` : "");
                notificationType = "warning";
                break;
        }

        const emailInput = {
          ArtistName: appToUpdate.fullName || "Artist",
          ArtistEmail: appToUpdate.email,
          applicationStatus: newStatus,
          adminReviewNotes: notes,
          applicationUrl: `${getBaseUrl()}/artist-registration`, 
          smtpHost: appConfig.smtpHost,
          smtpPort: appConfig.smtpPort,
          smtpUser: appConfig.smtpUser,
          smtpPass: appConfig.smtpPass,
          senderEmail: appConfig.senderEmail,
        };
        try {
            await sendArtistApplicationStatusEmail(emailInput);
        } catch (emailError) {
            console.error("Failed to send Artist status update email:", emailError);
        }
        
        const ArtistNotification: any = {
            userId: appToUpdate.userId,
            title: `Application Status: ${newStatus.replace(/_/g, ' ')}`,
            message: emailMessageAction || `Your application status is now ${newStatus.replace(/_/g, ' ')}.`,
            type: notificationType,
            read: false,
            createdAt: Timestamp.now(),
        };
        if (notificationLink) ArtistNotification.href = notificationLink;
        await addDoc(collection(db, "userNotifications"), ArtistNotification);
        // Trigger Push Notification for the Artist
        triggerPushNotification({
          userId: appToUpdate.userId,
          title: ArtistNotification.title,
          body: ArtistNotification.message,
          href: ArtistNotification.href
        });
      }

    } catch (error) {
      toast({ title: "Error", description: (error as Error).message || "Could not update application status.", variant: "destructive" });
    } finally {
      setIsUpdating(null);
    }
  };
  
  const deleteStorageFile = async (url: string | null | undefined) => {
    if (!url || typeof url !== 'string' || !url.startsWith('http') || !url.includes('firebasestorage.googleapis.com')) {
      return;
    }
    try {
      const fileRef = storageRef(storage, url);
      await deleteObject(fileRef);
    } catch (error) {
      console.error(`Failed to delete storage file: ${url}`, error);
    }
  };

  const handleDeleteApplication = async (applicationId: string) => {
    if (!applicationId) return;
    setIsUpdating(applicationId);
    try {
        const appToDelete = applications.find(app => app.id === applicationId);
        if (appToDelete) {
            const urlsToDelete: string[] = [];

            if (appToDelete.profilePhotoUrl) urlsToDelete.push(appToDelete.profilePhotoUrl);
            if (appToDelete.faceCloseUpUrl) urlsToDelete.push(appToDelete.faceCloseUpUrl);
            if (appToDelete.midShotUrl) urlsToDelete.push(appToDelete.midShotUrl);
            if (appToDelete.rightProfileUrl) urlsToDelete.push(appToDelete.rightProfileUrl);
            if (appToDelete.leftProfileUrl) urlsToDelete.push(appToDelete.leftProfileUrl);
            if (appToDelete.frontProfileUrl) urlsToDelete.push(appToDelete.frontProfileUrl);
            if (appToDelete.backProfileUrl) urlsToDelete.push(appToDelete.backProfileUrl);
            if (appToDelete.signatureUrl) urlsToDelete.push(appToDelete.signatureUrl);

            if (appToDelete.aadhaar) {
              if (appToDelete.aadhaar.frontImageUrl) urlsToDelete.push(appToDelete.aadhaar.frontImageUrl);
              if (appToDelete.aadhaar.backImageUrl) urlsToDelete.push(appToDelete.aadhaar.backImageUrl);
            }

            if (appToDelete.pan) {
              if (appToDelete.pan.frontImageUrl) urlsToDelete.push(appToDelete.pan.frontImageUrl);
              if (appToDelete.pan.backImageUrl) urlsToDelete.push(appToDelete.pan.backImageUrl);
            }

            if (appToDelete.additionalDocuments && Array.isArray(appToDelete.additionalDocuments)) {
              for (const docItem of appToDelete.additionalDocuments) {
                if (docItem.frontImageUrl) urlsToDelete.push(docItem.frontImageUrl);
                if (docItem.backImageUrl) urlsToDelete.push(docItem.backImageUrl);
              }
            }

            if (appToDelete.certificates && Array.isArray(appToDelete.certificates)) {
              for (const cert of appToDelete.certificates) {
                if (cert.url) urlsToDelete.push(cert.url);
              }
            }

            if (appToDelete.bankDetails) {
              if (appToDelete.bankDetails.cancelledChequeUrl) urlsToDelete.push(appToDelete.bankDetails.cancelledChequeUrl);
            }

            // Delete all collected files in parallel, allowing successful deletions to continue if individual files are missing.
            await Promise.allSettled(urlsToDelete.map(deleteStorageFile));
        }

        await deleteDoc(doc(db, Artist_APPLICATION_COLLECTION, applicationId));

        // Trigger SmartSync Revalidation
        await triggerRefresh('artists');
        await triggerRefresh('admin-stats');
        await triggerRefresh('global-cache');
        
        // Also refresh the specific category if the artist was in one
        if (appToDelete?.workCategorySlug) {
            await triggerRefresh(`category-${appToDelete.workCategorySlug}`);
        }

        toast({title: "Success", description: "Artist application and all associated media deleted."});
    } catch (error) {
        toast({title: "Error", description: "Could not delete application.", variant: "destructive"});
    } finally {
        setIsUpdating(null);
    }
  };

  const handleViewDetails = (app: ArtistApplication) => {
    setSelectedApplication(app);
    setAdminReviewNotes(app.adminReviewNotes || ""); 
    setIsDetailsModalOpen(true);
  };

  const prepareActionWithNotes = (applicationId: string, newStatus: ArtistApplicationStatus) => {
    if (adminReviewNotes.trim() === "" && (newStatus === 'rejected' || newStatus === 'needs_update')) {
        toast({ title: "Notes Required", description: "Please provide notes for rejection or requesting updates.", variant: "destructive"});
        return;
    }
    handleUpdateStatus(applicationId, newStatus, adminReviewNotes);
  };
  
  const getStatusBadgeVariant = (status: ArtistApplicationStatus) => {
    switch (status) {
      case 'approved': return 'default'; 
      case 'pending_review': return 'secondary'; 
      case 'rejected': return 'destructive'; 
      case 'needs_update': return 'outline'; 
      default: return 'outline'; 
    }
  };

  const handleUpdateRank = async (applicationId: string, rank: string) => {
    const numRank = rank === "" ? null : parseInt(rank);
    if (isNaN(numRank as number) && rank !== "") return;

    try {
      const appDocRef = doc(db, Artist_APPLICATION_COLLECTION, applicationId);
      await updateDoc(appDocRef, {
        promotionIndex: numRank,
        updatedAt: Timestamp.now(),
      });
      await triggerRefresh('artists');
      await triggerRefresh('global-cache');
      toast({ title: "Success", description: "Promotion rank updated." });
    } catch (error) {
      toast({ title: "Error", description: "Could not update rank.", variant: "destructive" });
    }
  };

  const renderApplicationCard = (app: ArtistApplication) => (
    <Card key={app.id} className="mb-4 shadow-sm border overflow-hidden">
      <CardHeader className="p-4 bg-muted/20">
        <div className="flex justify-between items-start gap-2">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10 border border-border">
              <AvatarImage src={app.profilePhotoUrl || undefined} alt={app.fullName || "P"} />
              <AvatarFallback>{app.fullName ? app.fullName[0].toUpperCase() : <UserCircle />}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <CardTitle className="text-base font-bold truncate">{app.fullName || "N/A"}</CardTitle>
              <CardDescription className="text-xs truncate">{app.email || "No Email"}</CardDescription>
            </div>
          </div>
          <Badge variant={getStatusBadgeVariant(app.status)} className={`text-xs capitalize whitespace-nowrap ${app.status === 'approved' ? 'bg-green-500 text-white' : ''}`}>
            {app.status.replace(/_/g, ' ')}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-4 text-sm space-y-2">
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground font-medium">Category:</span>
          <span className="text-foreground">{app.workCategoryName || "N/A"}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground font-medium">Mobile:</span>
          <span className="text-foreground">{app.mobileNumber || "N/A"}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground font-medium">Submitted:</span>
          <span className="text-foreground">{formatApplicationTimestamp(app.submittedAt || app.createdAt)}</span>
        </div>
        <div className="flex justify-between items-center text-xs">
          <span className="text-muted-foreground font-medium">Promotion Rank:</span>
          <input
            type="number"
            className="w-12 h-7 text-xs border rounded px-1 focus:ring-1 focus:ring-primary outline-none"
            placeholder="-"
            defaultValue={app.promotionIndex || ""}
            onBlur={(e) => handleUpdateRank(app.id!, e.target.value)}
          />
        </div>
      </CardContent>
      <CardFooter className="p-4 pt-0 flex flex-wrap gap-2 justify-end border-t mt-2 pt-4">
        <Button variant="outline" size="sm" onClick={() => handleViewDetails(app)} className="h-8 text-xs">
          <Eye className="h-3.5 w-3.5 mr-1" /> Details
        </Button>
        <Button variant="outline" size="sm" onClick={() => router.push(`/artist-registration?editApplicationId=${app.id}`)} className="h-8 text-xs">
          <Edit className="h-3.5 w-3.5 mr-1" /> Edit
        </Button>
        {app.status !== 'approved' && (
          <Button variant="outline" size="sm" onClick={() => handleUpdateStatus(app.id!, 'approved')} className="h-8 text-xs text-green-600 border-green-200 hover:bg-green-50">
            <CheckCircle className="h-3.5 w-3.5 mr-1" /> Approve
          </Button>
        )}
        {app.status !== 'rejected' && (
          <Button variant="outline" size="sm" onClick={() => { setShowNotesInputFor(app.id!); setPendingStatusForNotes('rejected'); }} className="h-8 text-xs text-destructive border-destructive/20 hover:bg-destructive/10">
            <XCircle className="h-3.5 w-3.5 mr-1" /> Reject
          </Button>
        )}
        {app.status !== 'needs_update' && (
          <Button variant="outline" size="sm" onClick={() => { setShowNotesInputFor(app.id!); setPendingStatusForNotes('needs_update'); }} className="h-8 text-xs text-yellow-600 border-yellow-200 hover:bg-yellow-50">
            <AlertTriangle className="h-3.5 w-3.5 mr-1" /> Update
          </Button>
        )}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" size="icon" className="h-8 w-8">
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
              <AlertDialogDescription>Permanently delete application for {app.fullName || "this Artist"}?</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => handleDeleteApplication(app.id!)} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardFooter>
      {showNotesInputFor === app.id && (
        <div className="p-4 pt-0 space-y-3 bg-muted/10">
          <Separator />
          <div className="space-y-2">
            <Label className="text-xs font-semibold">Notes for Artist ({pendingStatusForNotes?.replace(/_/g, ' ')}):</Label>
            <Textarea
              placeholder="Explain why this action is being taken..."
              value={adminReviewNotes}
              onChange={(e) => setAdminReviewNotes(e.target.value)}
              className="text-xs min-h-[80px]"
            />
            <div className="flex gap-2 justify-end">
              <Button size="sm" variant="ghost" onClick={() => {setShowNotesInputFor(null); setAdminReviewNotes(""); setPendingStatusForNotes(null);}}>Cancel</Button>
              <Button size="sm" onClick={() => prepareActionWithNotes(app.id!, pendingStatusForNotes!)}>Confirm</Button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-2xl flex items-center">
              <Users2 className="mr-2 h-6 w-6 text-primary" /> Artist Applications
            </CardTitle>
            <CardDescription>
              Review and manage Artist registration applications.
            </CardDescription>
          </div>
          <div className="mt-4 sm:mt-0 w-full sm:w-auto sm:min-w-[200px]">
            <Select value={filterStatus} onValueChange={(value) => setFilterStatus(value as ArtistApplicationStatus | "all")}>
              <SelectTrigger><SelectValue placeholder="Filter by status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {applicationStatusOptions.map(status => (
                  <SelectItem key={status} value={status} className="capitalize">{status.replace(/_/g, ' ')}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          {isLoading || isLoadingAppSettings ? (
            <div className="flex justify-center items-center h-64"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>
          ) : filteredApplications.length === 0 ? (
            <div className="text-center py-10">
              <PackageSearch className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">
                {filterStatus === "all" ? "No Artist applications found yet." : `No applications found with status: ${filterStatus.replace(/_/g, ' ')}.`}
              </p>
            </div>
          ) : (
            <>
              {/* Desktop View */}
              <div className="hidden lg:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]">Avatar</TableHead>
                      <TableHead>Applicant</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Submitted</TableHead>
                      <TableHead>Rank</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredApplications.map((app) => (
                      <TableRow key={app.id}>
                        <TableCell>
                          <Avatar className="h-9 w-9">
                            <AvatarImage src={app.profilePhotoUrl || undefined} alt={app.fullName || "P"} />
                            <AvatarFallback>{app.fullName ? app.fullName[0].toUpperCase() : <UserCircle />}</AvatarFallback>
                          </Avatar>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{app.fullName || "N/A"}</div>
                          <div className="text-xs text-muted-foreground">{app.email}</div>
                          <div className="text-xs text-muted-foreground">{app.mobileNumber}</div>
                        </TableCell>
                        <TableCell className="text-sm">{app.workCategoryName || "N/A"}</TableCell>
                        <TableCell className="text-xs whitespace-nowrap">{formatApplicationTimestamp(app.submittedAt || app.createdAt)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              className="w-12 h-8 text-xs border rounded px-1 focus:ring-1 focus:ring-primary outline-none"
                              placeholder="-"
                              defaultValue={app.promotionIndex || ""}
                              onBlur={(e) => handleUpdateRank(app.id!, e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  handleUpdateRank(app.id!, (e.target as HTMLInputElement).value);
                                  (e.target as HTMLInputElement).blur();
                                }
                              }}
                            />
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getStatusBadgeVariant(app.status)} className={`text-[10px] capitalize ${app.status === 'approved' ? 'bg-green-500 text-white' : ''}`}>{app.status.replace(/_/g, ' ')}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end items-center gap-1.5">
                            <Button variant="outline" size="icon" onClick={() => handleViewDetails(app)} className="h-8 w-8" title="View Details">
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" size="icon" onClick={() => router.push(`/artist-registration?editApplicationId=${app.id}`)} className="h-8 w-8" title="Edit Application">
                              <Edit className="h-4 w-4" />
                            </Button>
                            
                            {app.status !== 'approved' && (
                              <Button variant="outline" size="icon" onClick={() => handleUpdateStatus(app.id!, 'approved')} className="h-8 w-8 text-green-600 border-green-200 hover:bg-green-50" title="Approve">
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                            )}
                            
                            {app.status !== 'rejected' && (
                              <Button variant="outline" size="icon" onClick={() => { setShowNotesInputFor(app.id!); setPendingStatusForNotes('rejected'); }} className="h-8 w-8 text-destructive border-destructive/20 hover:bg-destructive/10" title="Reject">
                                <XCircle className="h-4 w-4" />
                              </Button>
                            )}

                            {app.status !== 'needs_update' && (
                              <Button variant="outline" size="icon" onClick={() => { setShowNotesInputFor(app.id!); setPendingStatusForNotes('needs_update'); }} className="h-8 w-8 text-yellow-600 border-yellow-200 hover:bg-yellow-50" title="Request Update">
                                <AlertTriangle className="h-4 w-4" />
                              </Button>
                            )}

                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" title="Delete">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
                                  <AlertDialogDescription>Permanently delete application for {app.fullName || "this Artist"}?</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDeleteApplication(app.id!)} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                          {showNotesInputFor === app.id && (
                            <div className="mt-2 p-2 border rounded-md bg-muted/50 space-y-2 max-w-xs ml-auto text-left">
                                <Label className="text-xs font-semibold">Notes for Artist ({pendingStatusForNotes?.replace(/_/g, ' ')}):</Label>
                                <Textarea
                                    placeholder="Reason for rejection or update request..."
                                    value={adminReviewNotes}
                                    onChange={(e) => setAdminReviewNotes(e.target.value)}
                                    className="text-xs min-h-[60px]"
                                />
                                <div className="flex gap-2 justify-end">
                                    <Button size="xs" variant="ghost" onClick={() => {setShowNotesInputFor(null); setAdminReviewNotes(""); setPendingStatusForNotes(null);}}>Cancel</Button>
                                    <Button size="xs" onClick={() => prepareActionWithNotes(app.id!, pendingStatusForNotes!)}>Confirm</Button>
                                </div>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile View */}
              <div className="lg:hidden space-y-4">
                {filteredApplications.map(renderApplicationCard)}
              </div>
            </>
          )}
        </CardContent>
      </Card>
      {selectedApplication && (
        <ArtistApplicationDetailsModal
          application={selectedApplication}
          isOpen={isDetailsModalOpen}
          onClose={() => setIsDetailsModalOpen(false)}
          onUpdateStatus={(appId, newStatus, notesFromModal) => handleUpdateStatus(appId, newStatus, notesFromModal)}
          isLoadingStatusUpdate={!!isUpdating}
        />
      )}
    </div>
  );
}

