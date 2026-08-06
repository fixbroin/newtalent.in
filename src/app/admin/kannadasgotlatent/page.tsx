"use client";

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Search, Loader2, Play, ExternalLink, FileText, CheckCircle, XCircle, Clock, Award, Phone, Calendar, Image as ImageIcon, ChevronRight, Download, Upload, Trash2 } from "lucide-react";
import { db, auth } from '@/lib/firebase';
import { collection, query, orderBy, onSnapshot, doc, updateDoc } from "firebase/firestore";

interface KannadaGotLatentApp {
  id: string;
  fullName: string;
  stageName?: string;
  gender: string;
  dateOfBirth: string;
  age: number;
  mobileNumber: string;
  email: string;
  city: string;
  state: string;
  pinCode: string;
  talentCategory: string[];
  talentTitle: string;
  talentDescription: string;
  performedOnStageBefore: boolean;
  introVideoUrl: string;
  talentVideoUrl: string;
  externalVideoLink?: string;
  photos: string[];
  instagram?: string;
  youtube?: string;
  facebook?: string;
  otherSocial?: string;
  canTravel: boolean;
  preferredLanguages: string[];
  availableWeekends: boolean;
  availableWeekdays: boolean;
  emergencyName: string;
  emergencyRelationship: string;
  emergencyMobile: string;
  status: 'New' | 'Shortlisted' | 'Rejected' | 'Selected';
  internalNotes?: string;
  callScheduled?: boolean;
  auditionDate?: string | null;
  judgeComments?: string;
  createdAt: any;
}

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

export default function AdminKannadasGotLatentDashboard() {
  const { toast } = useToast();
  const [applications, setApplications] = useState<KannadaGotLatentApp[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters and search states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('All');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  // Selected application for review
  const [selectedApp, setSelectedApp] = useState<KannadaGotLatentApp | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Review fields for the active modal
  const [reviewStatus, setReviewStatus] = useState<'New' | 'Shortlisted' | 'Rejected' | 'Selected'>('New');
  const [reviewNotes, setReviewNotes] = useState('');
  const [callScheduled, setCallScheduled] = useState(false);
  const [auditionDate, setAuditionDate] = useState('');
  const [judgeComments, setJudgeComments] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Delete confirmation states
  const [appToDelete, setAppToDelete] = useState<KannadaGotLatentApp | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Banner config states
  const [bannerUrl, setBannerUrl] = useState<string>('/kannadasgotlatent.png');
  const [bannerUploading, setBannerUploading] = useState(false);
  const [bannerProgress, setBannerProgress] = useState<number | null>(null);

  // Load and listen to active banner setting
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'kannadaGotLatent'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.bannerUrl) {
          setBannerUrl(data.bannerUrl);
        }
      }
    });
    return () => unsub();
  }, []);

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];

    setBannerUploading(true);
    setBannerProgress(0);

    try {
      const token = await auth.currentUser?.getIdToken();
      const formData = new FormData();
      formData.append('file', file);

      const xhr = new XMLHttpRequest();
      xhr.open('POST', '/api/admin/kannadasgotlatent/upload-banner');
      if (token) {
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      }

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percentage = Math.round((event.loaded / event.total) * 100);
          setBannerProgress(percentage);
        }
      };

      const uploadPromise = new Promise<{ success: boolean; url?: string; error?: string }>((resolve, reject) => {
        xhr.onload = () => {
          if (xhr.status === 200) {
            try {
              resolve(JSON.parse(xhr.responseText));
            } catch (err) {
              reject(new Error('Invalid response from server'));
            }
          } else {
            try {
              const res = JSON.parse(xhr.responseText);
              reject(new Error(res.error || `Upload failed with status ${xhr.status}`));
            } catch {
              reject(new Error(`Upload failed with status ${xhr.status}`));
            }
          }
        };
        xhr.onerror = () => reject(new Error('Network error during upload'));
      });

      xhr.send(formData);

      const res = await uploadPromise;
      if (res.success && res.url) {
        toast({ title: 'Success', description: 'Campaign banner updated successfully.' });
      } else {
        throw new Error(res.error || 'Banner upload failed');
      }
    } catch (err: any) {
      toast({ title: 'Upload Failed', description: err.message, variant: 'destructive' });
    } finally {
      setBannerUploading(false);
      setBannerProgress(null);
    }
  };

  const handleDeleteApplication = async () => {
    if (!appToDelete) return;
    setIsDeleting(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      const headers: HeadersInit = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch(`/api/admin/kannadasgotlatent?id=${appToDelete.id}`, {
        method: 'DELETE',
        headers,
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to delete application');
      }

      toast({ title: 'Deleted', description: `Application for ${appToDelete.fullName} has been deleted.` });
      setAppToDelete(null);
      if (selectedApp && selectedApp.id === appToDelete.id) {
        setIsModalOpen(false);
        setSelectedApp(null);
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setIsDeleting(false);
    }
  };

  const downloadCandidatePDF = (app: KannadaGotLatentApp) => {
    window.open(`/admin/kannadasgotlatent/print?id=${app.id}`, '_blank');
  };

  // Real-time listener for applications
  useEffect(() => {
    setIsLoading(true);
    const colRef = collection(db, 'kannadaGotLatentApplications');
    const q = query(colRef, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data()
      } as KannadaGotLatentApp));
      setApplications(list);
      setIsLoading(false);
    }, (error) => {
      console.error('Error fetching applications:', error);
      toast({ title: 'Error', description: 'Could not load applications from database.', variant: 'destructive' });
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [toast]);

  // Open modal and load reviews state
  const handleOpenReview = (app: KannadaGotLatentApp) => {
    setSelectedApp(app);
    setReviewStatus(app.status || 'New');
    setReviewNotes(app.internalNotes || '');
    setCallScheduled(app.callScheduled || false);
    setAuditionDate(app.auditionDate || '');
    setJudgeComments(app.judgeComments || '');
    setIsModalOpen(true);
  };

  // Save changes to Firestore
  const handleSaveReview = async () => {
    if (!selectedApp) return;

    setIsSaving(true);
    try {
      const docRef = doc(db, 'kannadaGotLatentApplications', selectedApp.id);
      await updateDoc(docRef, {
        status: reviewStatus,
        internalNotes: reviewNotes,
        callScheduled: callScheduled,
        auditionDate: auditionDate || null,
        judgeComments: judgeComments,
      });

      // Update selectedApp local ref to reflect changes
      setSelectedApp(prev => prev ? {
        ...prev,
        status: reviewStatus,
        internalNotes: reviewNotes,
        callScheduled: callScheduled,
        auditionDate: auditionDate || null,
        judgeComments: judgeComments,
      } : null);

      toast({ title: 'Application Updated', description: `Successfully reviewed candidate ${selectedApp.fullName}.` });
      setIsModalOpen(false);
    } catch (err: any) {
      toast({ title: 'Save Failed', description: err.message, variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  // Filter application list
  const filteredApps = useMemo(() => {
    return applications.filter(app => {
      const matchesSearch = 
        app.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (app.stageName && app.stageName.toLowerCase().includes(searchQuery.toLowerCase())) ||
        app.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
        app.email.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = selectedStatus === 'All' || app.status === selectedStatus;
      
      const matchesCategory = selectedCategory === 'All' || (app.talentCategory && app.talentCategory.includes(selectedCategory));

      return matchesSearch && matchesStatus && matchesCategory;
    });
  }, [applications, searchQuery, selectedStatus, selectedCategory]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Selected':
        return <Badge className="bg-emerald-500 text-white font-bold hover:bg-emerald-600 rounded-lg">Selected</Badge>;
      case 'Shortlisted':
        return <Badge className="bg-amber-500 text-white font-bold hover:bg-amber-600 rounded-lg">Shortlisted</Badge>;
      case 'Rejected':
        return <Badge className="bg-rose-500 text-white font-bold hover:bg-rose-600 rounded-lg">Rejected</Badge>;
      default:
        return <Badge className="bg-sky-500 text-white font-bold hover:bg-sky-600 rounded-lg">New</Badge>;
    }
  };

  const formatShortDate = (timestamp: any) => {
    if (!timestamp) return 'N/A';
    if (typeof timestamp.toDate === 'function') {
      return timestamp.toDate().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    }
    return new Date(timestamp).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  return (
    <div className="space-y-6 p-1">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-primary">Kannada's Got Latent Applications</h1>
          <p className="text-sm text-muted-foreground">Manage and audit participant registrations for the talent show campaign.</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge className="bg-muted text-foreground hover:bg-muted font-bold text-xs p-2 rounded-lg">
            Total Candidates: {applications.length}
          </Badge>
        </div>
      </div>

      <Tabs defaultValue="applications" className="w-full space-y-6">
        <TabsList className="grid w-full grid-cols-2 max-w-sm h-12 p-1 bg-muted/50 rounded-xl">
          <TabsTrigger value="applications" className="rounded-lg font-bold text-xs">
            Applications
          </TabsTrigger>
          <TabsTrigger value="banner" className="rounded-lg font-bold text-xs">
            Banner Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="banner" className="space-y-6 mt-0">
          {/* Campaign Banner Config Card */}
          <Card className="rounded-2xl border shadow-sm bg-card overflow-hidden">
            <CardHeader className="bg-muted/10 border-b pb-3.5">
              <CardTitle className="text-sm font-bold flex items-center gap-1.5 text-primary">
                <ImageIcon className="h-4 w-4" /> Active Campaign Banner
              </CardTitle>
              <CardDescription>Upload a custom banner to change the visual header of the Kannada's Got Latent application page.</CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 flex flex-col md:flex-row gap-6 items-center">
              <div className="w-full md:w-3/5 border rounded-xl overflow-hidden bg-muted/5 shadow-sm max-w-lg aspect-[5/2] relative flex items-center justify-center">
                <img 
                  src={bannerUrl} 
                  alt="Current Banner" 
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="w-full md:w-2/5 flex flex-col gap-3 justify-center">
                <span className="text-xs text-muted-foreground font-semibold">Banner Image Requirements:</span>
                <ul className="text-xs text-muted-foreground list-disc pl-4 space-y-1">
                  <li>Recommended ratio: ~ 2.5:1 (horizontal banner)</li>
                  <li>Supported format: PNG, JPG, JPEG, WEBP</li>
                  <li>Maximum file size: 10MB</li>
                </ul>
                <div className="relative shrink-0 mt-2">
                  <Button type="button" variant="outline" className="w-full rounded-xl flex items-center justify-center gap-1.5" disabled={bannerUploading}>
                    {bannerUploading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin text-primary" /> Updating banner ({bannerProgress}%)
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 text-primary" /> Upload New Banner
                      </>
                    )}
                  </Button>
                  <Input 
                    type="file" 
                    accept="image/*" 
                    onChange={handleBannerUpload}
                    disabled={bannerUploading}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                </div>
                {bannerProgress !== null && (
                  <div className="w-full bg-muted h-1.5 rounded-full overflow-hidden mt-1">
                    <div className="bg-primary h-full transition-all duration-300" style={{ width: `${bannerProgress}%` }} />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="applications" className="space-y-6 mt-0">
          {/* Filters Card */}
          <Card className="rounded-2xl border shadow-sm bg-card">
            <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Search by name, city, email..." 
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-9 rounded-xl text-sm"
                />
              </div>

              {/* Status filter */}
              <div>
                <select 
                  value={selectedStatus} 
                  onChange={e => setSelectedStatus(e.target.value)}
                  className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="All">All Statuses</option>
                  <option value="New">New</option>
                  <option value="Shortlisted">Shortlisted</option>
                  <option value="Selected">Selected</option>
                  <option value="Rejected">Rejected</option>
                </select>
              </div>

              {/* Category filter */}
              <div>
                <select 
                  value={selectedCategory} 
                  onChange={e => setSelectedCategory(e.target.value)}
                  className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="All">All Talent Categories</option>
                  {TALENT_CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
            </CardContent>
          </Card>

          {/* Main Datatable */}
          <Card className="rounded-2xl border shadow-sm overflow-hidden">
            <CardContent className="p-0">
              {isLoading ? (
                <div className="flex flex-col justify-center items-center py-20 gap-3">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <span className="text-xs text-muted-foreground font-semibold uppercase">Loading applications...</span>
                </div>
              ) : filteredApps.length === 0 ? (
                <div className="text-center py-20 space-y-2">
                  <FileText className="mx-auto h-12 w-12 text-muted-foreground/60" />
                  <h3 className="font-bold text-lg">No Applications Found</h3>
                  <p className="text-sm text-muted-foreground">Try tweaking your search terms or filters.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-muted/30">
                      <TableRow>
                        <TableHead>Applicant Name</TableHead>
                        <TableHead>Categories</TableHead>
                        <TableHead>City & Age</TableHead>
                        <TableHead className="text-center">Media Uploads</TableHead>
                        <TableHead>Submitted On</TableHead>
                        <TableHead className="text-center">Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredApps.map(app => (
                        <TableRow key={app.id} className="hover:bg-muted/10">
                          <TableCell>
                            <div className="font-bold">{app.fullName}</div>
                            {app.stageName && (
                              <div className="text-[11px] text-muted-foreground italic">Stage: "{app.stageName}"</div>
                            )}
                            <div className="text-xs font-mono text-muted-foreground mt-0.5">{app.mobileNumber}</div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1 max-w-[200px]">
                              {app.talentCategory?.map(cat => (
                                <Badge key={cat} variant="outline" className="text-[10px] py-0.5 px-1.5">{cat}</Badge>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm font-medium">{app.city}</div>
                            <div className="text-xs text-muted-foreground font-mono">{app.age} Years Old</div>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex justify-center gap-1.5">
                              {app.introVideoUrl && (
                                <Badge variant="secondary" className="text-[10px] gap-1 py-0.5" title="Introduction Video Uploaded">
                                  <Play className="h-2.5 w-2.5 text-primary fill-primary" /> Intro
                                </Badge>
                              )}
                              {(app.talentVideoUrl || app.externalVideoLink) && (
                                <Badge variant="secondary" className="text-[10px] gap-1 py-0.5" title="Performance Available">
                                  <Play className="h-2.5 w-2.5 text-primary fill-primary" /> Talent
                                </Badge>
                              )}
                              {app.photos && app.photos.length > 0 && (
                                <Badge variant="secondary" className="text-[10px] gap-1 py-0.5" title="Uploaded Profile Images">
                                  <ImageIcon className="h-2.5 w-2.5 text-primary" /> {app.photos.length}
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-xs font-mono">
                            {formatShortDate(app.createdAt)}
                          </TableCell>
                          <TableCell className="text-center">
                            {getStatusBadge(app.status)}
                          </TableCell>
                          <TableCell className="text-right">
                        <div className="flex justify-end items-center gap-1.5">
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => downloadCandidatePDF(app)}
                            title="Download PDF Profile"
                            className="h-8 w-8 rounded-xl hover:text-primary transition-colors border"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenReview(app)}
                            className="rounded-xl hover:bg-primary/5 hover:text-primary transition-colors border"
                          >
                            Review <ChevronRight className="h-4 w-4 ml-1" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => setAppToDelete(app)}
                            title="Delete Application"
                            className="h-8 w-8 rounded-xl text-destructive hover:bg-destructive/5 border hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Review Modal Dialog */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl">
          <DialogHeader className="border-b pb-4">
            <DialogTitle className="text-xl font-bold flex items-center justify-between">
              <span>Registration Profile: {selectedApp?.fullName}</span>
              {selectedApp && getStatusBadge(selectedApp.status)}
            </DialogTitle>
            <DialogDescription>
              Submit ID: <span className="font-mono">{selectedApp?.id}</span> | Registered on: {selectedApp && formatShortDate(selectedApp.createdAt)}
            </DialogDescription>
          </DialogHeader>

          {selectedApp && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
              
              {/* Questionnaire details (Left 2 columns) */}
              <div className="md:col-span-2 space-y-6 pr-0 md:pr-4 border-r border-dashed border-muted">
                
                {/* Basic Section */}
                <div className="space-y-3">
                  <h3 className="text-sm font-black uppercase text-primary tracking-wider">1. Candidate Information</h3>
                  <div className="grid grid-cols-2 gap-3 p-3 bg-muted/20 border rounded-xl text-sm">
                    <div>
                      <span className="text-[11px] text-muted-foreground block">Full Name</span>
                      <span className="font-bold">{selectedApp.fullName}</span>
                    </div>
                    <div>
                      <span className="text-[11px] text-muted-foreground block">Stage Name</span>
                      <span className="font-semibold">{selectedApp.stageName || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-[11px] text-muted-foreground block">Gender</span>
                      <span>{selectedApp.gender}</span>
                    </div>
                    <div>
                      <span className="text-[11px] text-muted-foreground block">Date of Birth (Age)</span>
                      <span className="font-mono">{selectedApp.dateOfBirth} ({selectedApp.age} years)</span>
                    </div>
                    <div>
                      <span className="text-[11px] text-muted-foreground block">Mobile</span>
                      <a href={`tel:${selectedApp.mobileNumber}`} className="text-primary hover:underline font-mono flex items-center gap-1">
                        <Phone className="h-3 w-3" /> {selectedApp.mobileNumber}
                      </a>
                    </div>
                    <div>
                      <span className="text-[11px] text-muted-foreground block">Email</span>
                      <a href={`mailto:${selectedApp.email}`} className="text-primary hover:underline break-all">{selectedApp.email}</a>
                    </div>
                    <div className="col-span-2">
                      <span className="text-[11px] text-muted-foreground block">City & Address Mapping</span>
                      <span>{selectedApp.city}, {selectedApp.state} - {selectedApp.pinCode}</span>
                    </div>
                  </div>
                </div>

                {/* Talent Section */}
                <div className="space-y-3">
                  <h3 className="text-sm font-black uppercase text-primary tracking-wider">2. Talent Information</h3>
                  <div className="p-3 bg-muted/20 border rounded-xl text-sm space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-[11px] text-muted-foreground block">Categories</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {selectedApp.talentCategory?.map(cat => (
                            <Badge key={cat} variant="outline" className="text-[10px]">{cat}</Badge>
                          ))}
                        </div>
                      </div>
                      <div>
                        <span className="text-[11px] text-muted-foreground block">Has Stage Experience?</span>
                        <span className="font-semibold mt-1 inline-block">{selectedApp.performedOnStageBefore ? 'Yes, has performed on stage' : 'No prior stage performance'}</span>
                      </div>
                    </div>
                    <div>
                      <span className="text-[11px] text-muted-foreground block">Talent Title</span>
                      <span className="font-bold">{selectedApp.talentTitle}</span>
                    </div>
                    <div>
                      <span className="text-[11px] text-muted-foreground block">Talent Description</span>
                      <p className="text-xs text-muted-foreground leading-normal whitespace-pre-line mt-1 p-2.5 bg-background rounded-lg border">{selectedApp.talentDescription}</p>
                    </div>
                  </div>
                </div>

                {/* Media Section */}
                <div className="space-y-3">
                  <h3 className="text-sm font-black uppercase text-primary tracking-wider">3. Performance Videos & Profile Images</h3>
                  <div className="space-y-4">
                    
                    {/* Intro Video */}
                    {selectedApp.introVideoUrl && (
                      <div className="space-y-1.5 border rounded-xl p-3 bg-muted/10">
                        <span className="text-xs font-bold flex items-center gap-1 text-primary">
                          <Play className="h-3.5 w-3.5 fill-primary" /> 1. Introduction Video (30-60s)
                        </span>
                        <div className="aspect-video w-full rounded-lg overflow-hidden bg-black border">
                          <video src={selectedApp.introVideoUrl} controls preload="none" className="h-full w-full object-contain" />
                        </div>
                        <div className="flex justify-end">
                          <a 
                            href={selectedApp.introVideoUrl} 
                            download 
                            className="inline-flex items-center gap-1 text-xs text-primary hover:underline font-semibold mt-1"
                          >
                            <Download className="h-3 w-3" /> Download Intro Video
                          </a>
                        </div>
                      </div>
                    )}

                    {/* Talent Video */}
                    {selectedApp.talentVideoUrl && (
                      <div className="space-y-1.5 border rounded-xl p-3 bg-muted/10">
                        <span className="text-xs font-bold flex items-center gap-1 text-primary">
                          <Play className="h-3.5 w-3.5 fill-primary" /> 2. Performance Video (up to 2m)
                        </span>
                        <div className="aspect-video w-full rounded-lg overflow-hidden bg-black border">
                          <video src={selectedApp.talentVideoUrl} controls preload="none" className="h-full w-full object-contain" />
                        </div>
                        <div className="flex justify-end">
                          <a 
                            href={selectedApp.talentVideoUrl} 
                            download 
                            className="inline-flex items-center gap-1 text-xs text-primary hover:underline font-semibold mt-1"
                          >
                            <Download className="h-3 w-3" /> Download Talent Video
                          </a>
                        </div>
                      </div>
                    )}

                    {/* External Link */}
                    {selectedApp.externalVideoLink && (
                      <div className="p-3 bg-primary/5 border border-primary/20 rounded-xl text-sm flex justify-between items-center">
                        <div>
                          <span className="text-xs text-muted-foreground block">External Performance Reel URL</span>
                          <span className="font-semibold break-all text-xs font-mono">{selectedApp.externalVideoLink}</span>
                        </div>
                        <a 
                          href={selectedApp.externalVideoLink} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="flex items-center gap-1 text-xs bg-primary text-white font-bold py-1.5 px-3 rounded-lg hover:bg-primary/95 shrink-0 ml-2"
                        >
                          Watch <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    )}

                    {/* Profile Images Preview */}
                    {selectedApp.photos && selectedApp.photos.length > 0 && (
                      <div className="space-y-1.5">
                        <span className="text-xs font-bold flex items-center gap-1 text-primary">
                          <ImageIcon className="h-3.5 w-3.5" /> Profile Images ({selectedApp.photos.length})
                        </span>
                        <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 p-3 bg-muted/10 border rounded-xl">
                          {selectedApp.photos.map((photoUrl, idx) => (
                            <a 
                              key={photoUrl} 
                              href={photoUrl} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className="aspect-square rounded-lg overflow-hidden border bg-background hover:opacity-85 transition-opacity"
                            >
                              <img src={photoUrl} alt={`Profile Image ${idx + 1}`} className="h-full w-full object-cover" />
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                  </div>
                </div>

                {/* Additional Info */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  
                  {/* Social media links */}
                  <div className="space-y-2 border rounded-xl p-3 bg-muted/10">
                    <span className="text-xs font-bold text-muted-foreground uppercase block">4. Social Media Links</span>
                    <div className="text-xs space-y-1.5">
                      {selectedApp.instagram && (
                        <div>
                          <span className="text-[10px] text-muted-foreground block">Instagram:</span>
                          <a href={selectedApp.instagram} target="_blank" rel="noopener" className="text-primary hover:underline font-mono truncate block">{selectedApp.instagram}</a>
                        </div>
                      )}
                      {selectedApp.youtube && (
                        <div>
                          <span className="text-[10px] text-muted-foreground block">YouTube:</span>
                          <a href={selectedApp.youtube} target="_blank" rel="noopener" className="text-primary hover:underline font-mono truncate block">{selectedApp.youtube}</a>
                        </div>
                      )}
                      {selectedApp.facebook && (
                        <div>
                          <span className="text-[10px] text-muted-foreground block">Facebook:</span>
                          <a href={selectedApp.facebook} target="_blank" rel="noopener" className="text-primary hover:underline font-mono truncate block">{selectedApp.facebook}</a>
                        </div>
                      )}
                      {selectedApp.otherSocial && (
                        <div>
                          <span className="text-[10px] text-muted-foreground block">Other URL:</span>
                          <a href={selectedApp.otherSocial} target="_blank" rel="noopener" className="text-primary hover:underline font-mono truncate block">{selectedApp.otherSocial}</a>
                        </div>
                      )}
                      {!selectedApp.instagram && !selectedApp.youtube && !selectedApp.facebook && !selectedApp.otherSocial && (
                        <span className="text-muted-foreground italic">No links provided</span>
                      )}
                    </div>
                  </div>

                  {/* Availability */}
                  <div className="space-y-2 border rounded-xl p-3 bg-muted/10">
                    <span className="text-xs font-bold text-muted-foreground uppercase block">5. Availability</span>
                    <div className="text-xs space-y-1.5">
                      <div>
                        <span className="text-muted-foreground">Can Travel for Shoot: </span>
                        <span className="font-bold">{selectedApp.canTravel ? 'Yes' : 'No'}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Preferred Languages: </span>
                        <span className="font-bold">{selectedApp.preferredLanguages?.join(', ')}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Weekend recording: </span>
                        <span className="font-bold">{selectedApp.availableWeekends ? 'Yes' : 'No'}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Weekday recording: </span>
                        <span className="font-bold">{selectedApp.availableWeekdays ? 'Yes' : 'No'}</span>
                      </div>
                    </div>
                  </div>

                </div>

                {/* Emergency Contact */}
                <div className="space-y-2 border border-rose-100 rounded-xl p-3 bg-rose-50/10">
                  <span className="text-xs font-bold text-rose-500 uppercase block">6. Emergency Contact</span>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <span className="text-[10px] text-muted-foreground block">Name</span>
                      <span className="font-semibold">{selectedApp.emergencyName}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground block">Relationship</span>
                      <span>{selectedApp.emergencyRelationship}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground block">Emergency Mobile</span>
                      <a href={`tel:${selectedApp.emergencyMobile}`} className="text-primary hover:underline font-mono">{selectedApp.emergencyMobile}</a>
                    </div>
                  </div>
                </div>

              </div>

              {/* Review and Status Updating columns (Right 1 column) */}
              <div className="space-y-6">
                <h3 className="text-sm font-black uppercase text-primary tracking-wider flex items-center gap-1.5">
                  <Award className="h-4 w-4" /> Registration & Judge Review
                </h3>

                <div className="p-4 bg-muted/20 border rounded-xl space-y-4">
                  {/* Status Selection */}
                  <div className="space-y-1.5">
                    <Label htmlFor="revStatus">Registration Status</Label>
                    <select 
                      id="revStatus" 
                      value={reviewStatus} 
                      onChange={e => setReviewStatus(e.target.value as any)}
                      className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <option value="New">New</option>
                      <option value="Shortlisted">Shortlisted</option>
                      <option value="Selected">Selected</option>
                      <option value="Rejected">Rejected</option>
                    </select>
                  </div>

                  {/* Call Scheduled Switch */}
                  <div className="flex items-center justify-between border rounded-lg p-2.5 bg-background">
                    <div className="space-y-0.5 text-xs">
                      <Label className="font-bold flex items-center gap-1"><Clock className="h-3.5 w-3.5 text-muted-foreground" /> Call Scheduled</Label>
                      <p className="text-[10px] text-muted-foreground">Toggle if show team contacted applicant</p>
                    </div>
                    <Switch checked={callScheduled} onCheckedChange={setCallScheduled} />
                  </div>

                  {/* Audition Date Picker */}
                  <div className="space-y-1.5">
                    <Label htmlFor="audDate" className="flex items-center gap-1 text-xs font-bold">
                      <Calendar className="h-3.5 w-3.5 text-muted-foreground" /> Performance Date
                    </Label>
                    <Input 
                      id="audDate" 
                      type="date" 
                      value={auditionDate || ''} 
                      onChange={e => setAuditionDate(e.target.value)} 
                      className="rounded-lg text-sm"
                    />
                  </div>

                  {/* Internal notes */}
                  <div className="space-y-1.5">
                    <Label htmlFor="notes">Reviewer / Internal Notes</Label>
                    <Textarea 
                      id="notes" 
                      rows={4} 
                      placeholder="Enter internal details, follow up records, etc." 
                      value={reviewNotes} 
                      onChange={e => setReviewNotes(e.target.value)}
                      className="text-xs"
                    />
                  </div>

                  {/* Judge Comments */}
                  <div className="space-y-1.5">
                    <Label htmlFor="comments">Judge comments</Label>
                    <Textarea 
                      id="comments" 
                      rows={4} 
                      placeholder="Add reviews or score comments." 
                      value={judgeComments} 
                      onChange={e => setJudgeComments(e.target.value)}
                      className="text-xs"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-2 pt-2 border-t mt-4">
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      onClick={() => downloadCandidatePDF(selectedApp)}
                      className="flex-grow rounded-xl flex items-center justify-center gap-1.5"
                    >
                      <Download className="h-4 w-4" /> Download PDF Profile
                    </Button>
                    <Button 
                      variant="destructive" 
                      onClick={() => setAppToDelete(selectedApp)}
                      className="rounded-xl flex items-center justify-center"
                      title="Delete Application"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <Button 
                    variant="outline" 
                    className="flex-grow rounded-xl"
                    onClick={() => setIsModalOpen(false)}
                    disabled={isSaving}
                  >
                    Cancel
                  </Button>
                  <Button 
                    className="flex-grow rounded-xl font-bold" 
                    onClick={handleSaveReview}
                    disabled={isSaving}
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...
                      </>
                    ) : (
                      'Save Review'
                    )}
                  </Button>
                </div>
              </div>

            </div>
          )}
        </DialogContent>
      </Dialog>
      {/* Delete Confirmation Dialog */}
      <Dialog open={appToDelete !== null} onOpenChange={(open) => { if (!open) setAppToDelete(null); }}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2 text-destructive">
              <XCircle className="h-5 w-5" /> Delete Registration
            </DialogTitle>
            <DialogDescription className="pt-2 text-sm leading-relaxed">
              Are you sure you want to delete the registration of <strong className="text-foreground">{appToDelete?.fullName}</strong> (Registration ID: #{appToDelete?.id})?
              <br/><br/>
              <span className="text-destructive font-semibold">⚠️ Warning: This will permanently delete the registration doc from the database AND wipe out all uploaded videos/photos from the local server disk. This action cannot be undone.</span>
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3 pt-4 border-t mt-4">
            <Button variant="outline" onClick={() => setAppToDelete(null)} disabled={isDeleting} className="rounded-xl">
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteApplication} disabled={isDeleting} className="rounded-xl font-bold flex items-center gap-1.5">
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Deleting...
                </>
              ) : (
                'Confirm Delete'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
