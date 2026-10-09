"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, Edit, Trash2, Loader2, Check, X, 
  IndianRupee, Calendar, ListChecks, Activity, PhoneCall, UserCheck,
  Search, Mail, AlertTriangle, ShieldCheck, ShieldAlert, Send, UserPlus,
  RefreshCw, Filter, Ban, Eye
} from 'lucide-react';
import { 
  collection, query, getDocs, addDoc, updateDoc, 
  deleteDoc, doc, orderBy, Timestamp, where, limit 
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { SubscriptionPlan, FirestoreUser } from '@/types/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface UserSubscriptionRecord {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  userPhone?: string;
  type: 'artist' | 'hire';
  planName: string;
  status: 'active' | 'expired' | 'deactivated' | 'failed';
  amount?: number;
  startDate?: Date | null;
  endDate?: Date | null;
  contactRevealLimit?: number;
  contactRevealsUsed?: number;
  rawDoc?: any;
}

export default function SubscriptionManager() {
  const [mainTab, setMainTab] = useState<'plans' | 'subscribers'>('subscribers');
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [activePlanTab, setActivePlanTab] = useState<'artist' | 'hire'>('artist');
  const [isLoadingPlans, setIsLoadingPlans] = useState(true);
  
  // Subscribers state
  const [subscribers, setSubscribers] = useState<UserSubscriptionRecord[]>([]);
  const [isLoadingSubscribers, setIsLoadingSubscribers] = useState(true);
  const [subscriberSearch, setSubscriberSearch] = useState('');
  const [subscriberTypeFilter, setSubscriberTypeFilter] = useState<'all' | 'artist' | 'hire'>('all');
  const [subscriberStatusFilter, setSubscriberStatusFilter] = useState<'all' | 'active' | 'expired' | 'deactivated' | 'failed'>('all');
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  // Plan dialog form state
  const [isPlanDialogOpen, setIsPlanDialogOpen] = useState(false);
  const [isSavingPlan, setIsSavingPlan] = useState(false);
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
  const [planFormData, setPlanFormData] = useState({
    name: '',
    price: 0,
    durationDays: 30,
    revealLimit: 10,
    planType: 'artist' as 'artist' | 'hire',
    features: [''],
    isActive: true,
    order: 0
  });

  // Assign Subscription Dialog state
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [assignSearch, setAssignSearch] = useState('');
  const [searchedUsers, setSearchedUsers] = useState<FirestoreUser[]>([]);
  const [isSearchingUsers, setIsSearchingUsers] = useState(false);
  const [selectedUser, setSelectedUser] = useState<FirestoreUser | null>(null);
  const [assignForm, setAssignForm] = useState({
    planId: '',
    planType: 'artist' as 'artist' | 'hire',
    durationDays: 30,
    revealLimit: 10
  });
  const [isAssigning, setIsAssigning] = useState(false);

  const { toast } = useToast();

  useEffect(() => {
    fetchPlans();
    fetchSubscribers();
  }, []);

  const seedDefaultPlans = async () => {
    try {
      const plansRef = collection(db, 'adminSubscriptionPlans');
      const defaultPlansData = [
        // 3 Artist Profile Plans
        {
          name: 'Starter Profile',
          price: 49,
          durationDays: 30,
          revealLimit: 0,
          planType: 'artist',
          features: ['Priority artist listing', 'Portfolio & video showcase', 'Direct recruiter visibility'],
          isActive: true,
          order: 1,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now()
        },
        {
          name: 'Pro Profile',
          price: 99,
          durationDays: 30,
          revealLimit: 0,
          planType: 'artist',
          features: ['Top tier search ranking', 'Verified artist badge', 'Unlimited media uploads', 'Priority casting reach'],
          isActive: true,
          order: 2,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now()
        },
        {
          name: 'Yearly Profile',
          price: 499,
          durationDays: 365,
          revealLimit: 0,
          planType: 'artist',
          features: ['365 Days top placement', 'Maximum visibility to recruiters', 'VIP profile badge', '24/7 Priority support'],
          isActive: true,
          order: 3,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now()
        },
        // 3 Contact Reveal Plans
        {
          name: 'Starter Contact',
          price: 1,
          durationDays: 30,
          revealLimit: 10,
          planType: 'hire',
          features: ['Unlock 10 direct phone numbers & emails', 'Direct WhatsApp & calling access', '30 days validity'],
          isActive: true,
          order: 1,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now()
        },
        {
          name: 'Gold Contact',
          price: 199,
          durationDays: 30,
          revealLimit: 25,
          planType: 'hire',
          features: ['Unlock 25 direct phone numbers & emails', 'Direct WhatsApp & calling access', 'Express casting support'],
          isActive: true,
          order: 2,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now()
        },
        {
          name: 'Yearly Contact',
          price: 499,
          durationDays: 365,
          revealLimit: 60,
          planType: 'hire',
          features: ['Unlock 60 direct phone numbers & emails', 'Direct WhatsApp & calling access', 'Full 365 days validity', 'Dedicated account manager'],
          isActive: true,
          order: 3,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now()
        }
      ];

      for (const plan of defaultPlansData) {
        await addDoc(plansRef, plan);
      }
      toast({ title: "Default Plans Seeded", description: "Created 3 Artist Profile Plans and 3 Recruiter Contact Plans." });
      fetchPlans();
    } catch (err) {
      console.error("Error seeding default plans:", err);
      toast({ title: "Error", description: "Failed to seed default plans.", variant: "destructive" });
    }
  };

  const fetchPlans = async () => {
    setIsLoadingPlans(true);
    try {
      const plansRef = collection(db, 'adminSubscriptionPlans');
      const q = query(plansRef, orderBy('order', 'asc'));
      const snapshot = await getDocs(q);
      const fetchedPlans = snapshot.docs.map(doc => ({ 
        id: doc.id, 
        planType: doc.data().planType || 'artist',
        ...doc.data() 
      } as SubscriptionPlan));

      if (fetchedPlans.length === 0) {
        await seedDefaultPlans();
      } else {
        setPlans(fetchedPlans);
      }
    } catch (error) {
      console.error("Error fetching plans:", error);
    } finally {
      setIsLoadingPlans(false);
    }
  };

  const fetchSubscribers = async () => {
    setIsLoadingSubscribers(true);
    try {
      const recordsMap = new Map<string, UserSubscriptionRecord>();
      const usersRef = collection(db, 'users');
      const now = new Date();

      // Parallel targeted queries for subscribers across the entire database
      const [artistSnap, hireSnap, txnSnap] = await Promise.all([
        getDocs(query(usersRef, where('subscriptionActive', '==', true))),
        getDocs(query(usersRef, where('hireSubscriptionActive', '==', true))),
        getDocs(query(collection(db, 'userSubscriptions'), orderBy('createdAt', 'desc'), limit(500)))
      ]);

      const processUserDoc = (docSnap: any) => {
        const data = docSnap.data() as FirestoreUser;
        const userName = data.displayName || 'Unnamed User';
        const userEmail = data.email || '';
        const userPhone = data.mobileNumber || '';

        // Check Profile Subscription
        if (data.subscriptionActive || data.subscriptionExpiresAt || data.subscriptionPlanName) {
          const expDate = data.subscriptionExpiresAt 
            ? (typeof (data.subscriptionExpiresAt as any).toDate === 'function' 
                ? (data.subscriptionExpiresAt as any).toDate() 
                : new Date(data.subscriptionExpiresAt as any))
            : null;

          let status: 'active' | 'expired' | 'deactivated' = 'expired';
          if (data.subscriptionActive) {
            status = expDate && expDate < now ? 'expired' : 'active';
          } else if (expDate) {
            status = expDate < now ? 'expired' : 'deactivated';
          }

          recordsMap.set(`${docSnap.id}_artist`, {
            id: `${docSnap.id}_artist`,
            userId: docSnap.id,
            userName,
            userEmail,
            userPhone,
            type: 'artist',
            planName: data.subscriptionPlanName || 'Artist Profile Plan',
            status,
            startDate: data.lastSubscriptionAt 
              ? (typeof (data.lastSubscriptionAt as any).toDate === 'function' ? (data.lastSubscriptionAt as any).toDate() : new Date(data.lastSubscriptionAt as any))
              : null,
            endDate: expDate,
            rawDoc: data
          });
        }

        // Check Hire / Contact Reveal Subscription
        if (data.hireSubscriptionActive || data.hireSubscriptionExpiresAt || data.hireSubscriptionName) {
          const expDate = data.hireSubscriptionExpiresAt 
            ? (typeof (data.hireSubscriptionExpiresAt as any).toDate === 'function' 
                ? (data.hireSubscriptionExpiresAt as any).toDate() 
                : new Date(data.hireSubscriptionExpiresAt as any))
            : null;

          let status: 'active' | 'expired' | 'deactivated' = 'expired';
          if (data.hireSubscriptionActive) {
            status = expDate && expDate < now ? 'expired' : 'active';
          } else if (expDate) {
            status = expDate < now ? 'expired' : 'deactivated';
          }

          recordsMap.set(`${docSnap.id}_hire`, {
            id: `${docSnap.id}_hire`,
            userId: docSnap.id,
            userName,
            userEmail,
            userPhone,
            type: 'hire',
            planName: data.hireSubscriptionName || 'Recruiter Reveal Plan',
            status,
            startDate: (data as any).lastHireSubscriptionAt 
              ? (typeof ((data as any).lastHireSubscriptionAt as any).toDate === 'function' ? ((data as any).lastHireSubscriptionAt as any).toDate() : new Date((data as any).lastHireSubscriptionAt as any))
              : null,
            endDate: expDate,
            contactRevealLimit: data.contactRevealLimit || 0,
            contactRevealsUsed: data.contactRevealsUsed || 0,
            rawDoc: data
          });
        }
      };

      artistSnap.docs.forEach(processUserDoc);
      hireSnap.docs.forEach(processUserDoc);

      // Process transaction log entries
      txnSnap.docs.forEach(docSnap => {
        const tData = docSnap.data();
        const key = `${tData.userId}_${tData.planType || 'artist'}`;
        if (!recordsMap.has(key)) {
          recordsMap.set(docSnap.id, {
            id: docSnap.id,
            userId: tData.userId || '',
            userName: tData.userName || 'User',
            userEmail: tData.userEmail || '',
            userPhone: '',
            type: tData.planType || 'artist',
            planName: tData.planName || 'Subscription',
            status: tData.status === 'active' ? 'active' : tData.status === 'failed' ? 'failed' : 'expired',
            amount: tData.amount || 0,
            startDate: tData.startDate ? (typeof tData.startDate.toDate === 'function' ? tData.startDate.toDate() : new Date(tData.startDate)) : null,
            endDate: tData.endDate ? (typeof tData.endDate.toDate === 'function' ? tData.endDate.toDate() : new Date(tData.endDate)) : null,
            rawDoc: tData
          });
        }
      });

      setSubscribers(Array.from(recordsMap.values()));
    } catch (error) {
      console.error("Error fetching subscribers:", error);
      toast({ title: "Error", description: "Failed to load subscribers list.", variant: "destructive" });
    } finally {
      setIsLoadingSubscribers(false);
    }
  };

  // Filtered subscribers
  const filteredSubscribers = useMemo(() => {
    return subscribers.filter(sub => {
      // Type Filter
      if (subscriberTypeFilter !== 'all' && sub.type !== subscriberTypeFilter) return false;
      // Status Filter
      if (subscriberStatusFilter !== 'all' && sub.status !== subscriberStatusFilter) return false;
      // Search term
      if (subscriberSearch.trim()) {
        const term = subscriberSearch.toLowerCase().trim();
        const searchDigits = term.replace(/\D/g, '');
        const last10Search = searchDigits.length >= 10 ? searchDigits.slice(-10) : searchDigits;

        const matchName = sub.userName.toLowerCase().includes(term);
        const matchEmail = sub.userEmail.toLowerCase().includes(term);
        let matchPhone = false;
        if (sub.userPhone) {
          const userPhoneDigits = sub.userPhone.replace(/\D/g, '');
          const last10User = userPhoneDigits.length >= 10 ? userPhoneDigits.slice(-10) : userPhoneDigits;
          matchPhone = sub.userPhone.toLowerCase().includes(term) ||
            (searchDigits.length > 0 && userPhoneDigits.includes(searchDigits)) ||
            (last10Search.length === 10 && last10User === last10Search);
        }
        const matchPlan = sub.planName.toLowerCase().includes(term);
        return matchName || matchEmail || matchPhone || matchPlan;
      }
      return true;
    });
  }, [subscribers, subscriberTypeFilter, subscriberStatusFilter, subscriberSearch]);

  // Admin Actions: Deactivate / Delete / Send Expiry Email
  const handleDeactivateSubscription = async (sub: UserSubscriptionRecord) => {
    if (!confirm(`Are you sure you want to deactivate ${sub.planName} for ${sub.userName}?`)) return;
    setActionInProgress(sub.id);
    try {
      const res = await fetch('/api/admin/subscription-actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'deactivate', userId: sub.userId, planType: sub.type })
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: "Deactivated", description: data.message });
        fetchSubscribers();
      } else {
        toast({ title: "Error", description: data.error, variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to deactivate subscription.", variant: "destructive" });
    } finally {
      setActionInProgress(null);
    }
  };

  const handleDeleteSubscription = async (sub: UserSubscriptionRecord) => {
    if (!confirm(`Are you sure you want to delete subscription record for ${sub.userName}?`)) return;
    setActionInProgress(sub.id);
    try {
      const res = await fetch('/api/admin/subscription-actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', userId: sub.userId, planType: sub.type, subscriptionRecordId: sub.id })
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: "Deleted", description: data.message });
        fetchSubscribers();
      } else {
        toast({ title: "Error", description: data.error, variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete subscription.", variant: "destructive" });
    } finally {
      setActionInProgress(null);
    }
  };

  const handleSendExpiryEmail = async (sub: UserSubscriptionRecord) => {
    if (!sub.userEmail) {
      toast({ title: "Error", description: "User email address is missing.", variant: "destructive" });
      return;
    }
    setActionInProgress(sub.id);
    try {
      const res = await fetch('/api/admin/subscription-actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send_expiry_email',
          userName: sub.userName,
          userEmail: sub.userEmail
        })
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: "Email Sent!", description: `Subscription expiry HTML email sent to ${sub.userEmail}.` });
      } else {
        toast({ title: "Email Warning", description: data.message || "Email could not be delivered.", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to send email.", variant: "destructive" });
    } finally {
      setActionInProgress(null);
    }
  };

  // Plan Handlers
  const handleOpenAddPlanDialog = () => {
    setEditingPlan(null);
    setPlanFormData({
      name: '',
      price: 0,
      durationDays: 30,
      revealLimit: activePlanTab === 'hire' ? 25 : 0,
      planType: activePlanTab,
      features: [''],
      isActive: true,
      order: plans.filter(p => (p.planType || 'artist') === activePlanTab).length
    });
    setIsPlanDialogOpen(true);
  };

  const handleOpenEditPlanDialog = (plan: SubscriptionPlan) => {
    setEditingPlan(plan);
    setPlanFormData({
      name: plan.name,
      price: plan.price,
      durationDays: plan.durationDays,
      revealLimit: plan.revealLimit || (plan.planType === 'hire' ? 10 : 0),
      planType: plan.planType || 'artist',
      features: plan.features ? [...plan.features] : [''],
      isActive: plan.isActive,
      order: plan.order
    });
    setIsPlanDialogOpen(true);
  };

  const handleSavePlan = async () => {
    if (!planFormData.name || planFormData.price < 0) {
      toast({ title: "Validation Error", description: "Please fill all required fields.", variant: "destructive" });
      return;
    }

    setIsSavingPlan(true);
    try {
      const cleanFeatures = planFormData.features.filter(f => f.trim() !== '');
      const planData = {
        ...planFormData,
        features: cleanFeatures,
        updatedAt: Timestamp.now()
      };

      if (editingPlan) {
        await updateDoc(doc(db, 'adminSubscriptionPlans', editingPlan.id), planData);
        toast({ title: "Updated", description: "Plan updated successfully." });
      } else {
        await addDoc(collection(db, 'adminSubscriptionPlans'), {
          ...planData,
          createdAt: Timestamp.now()
        });
        toast({ title: "Created", description: "New plan created successfully." });
      }
      
      setIsPlanDialogOpen(false);
      fetchPlans();
    } catch (error) {
      console.error("Error saving plan:", error);
      toast({ title: "Error", description: "Failed to save plan.", variant: "destructive" });
    } finally {
      setIsSavingPlan(false);
    }
  };

  const handleDeletePlan = async (id: string) => {
    if (!confirm("Are you sure you want to delete this plan?")) return;
    try {
      await deleteDoc(doc(db, 'adminSubscriptionPlans', id));
      toast({ title: "Deleted", description: "Plan removed successfully." });
      fetchPlans();
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete plan.", variant: "destructive" });
    }
  };

  // User Search for Manual Assigning
  const handleSearchUsers = async () => {
    if (!assignSearch.trim()) return;
    setIsSearchingUsers(true);
    try {
      const term = assignSearch.trim();
      const lowerTerm = term.toLowerCase();
      const searchDigits = term.replace(/\D/g, '');
      const last10Search = searchDigits.length >= 10 ? searchDigits.slice(-10) : searchDigits;

      const usersRef = collection(db, 'users');
      const foundMap = new Map<string, FirestoreUser>();

      const queries: Promise<any>[] = [];

      // 1. Email queries (exact & prefix range)
      if (lowerTerm.includes('@') || lowerTerm.includes('.')) {
        queries.push(getDocs(query(usersRef, where('email', '==', lowerTerm))));
        queries.push(getDocs(query(usersRef, where('email', '>=', lowerTerm), where('email', '<=', lowerTerm + '\uf8ff'))));
      } else {
        queries.push(getDocs(query(usersRef, where('email', '>=', lowerTerm), where('email', '<=', lowerTerm + '\uf8ff'))));
      }

      // 2. Phone queries (various format prefixes)
      if (last10Search.length >= 5) {
        queries.push(getDocs(query(usersRef, where('mobileNumber', '==', last10Search))));
        queries.push(getDocs(query(usersRef, where('mobileNumber', '==', `+91${last10Search}`))));
        queries.push(getDocs(query(usersRef, where('mobileNumber', '==', `91${last10Search}`))));
        queries.push(getDocs(query(usersRef, where('mobileNumber', '==', `0${last10Search}`))));
      }

      // 3. Name queries (exact & range)
      queries.push(getDocs(query(usersRef, where('displayName', '>=', term), where('displayName', '<=', term + '\uf8ff'))));
      if (term !== lowerTerm) {
        queries.push(getDocs(query(usersRef, where('displayName', '>=', lowerTerm), where('displayName', '<=', lowerTerm + '\uf8ff'))));
      }

      // 4. Fallback broad query to capture any extra documents
      queries.push(getDocs(query(usersRef, limit(500))));

      const snapshots = await Promise.all(queries);

      snapshots.forEach(snap => {
        snap.docs.forEach((d: any) => {
          const u = { id: d.id, ...d.data() } as FirestoreUser;
          const matchName = u.displayName && u.displayName.toLowerCase().includes(lowerTerm);
          const matchEmail = u.email && u.email.toLowerCase().includes(lowerTerm);
          let matchPhone = false;
          if (u.mobileNumber) {
            const userPhoneDigits = u.mobileNumber.replace(/\D/g, '');
            const last10User = userPhoneDigits.length >= 10 ? userPhoneDigits.slice(-10) : userPhoneDigits;
            matchPhone = u.mobileNumber.toLowerCase().includes(lowerTerm) ||
              (searchDigits.length > 0 && userPhoneDigits.includes(searchDigits)) ||
              (last10Search.length >= 5 && last10User.includes(last10Search));
          }
          if (matchName || matchEmail || matchPhone) {
            foundMap.set(u.id, u);
          }
        });
      });

      setSearchedUsers(Array.from(foundMap.values()));
    } catch (err) {
      console.error("Error searching users:", err);
    } finally {
      setIsSearchingUsers(false);
    }
  };

  const handleAssignSubscription = async () => {
    if (!selectedUser) {
      toast({ title: "Validation Error", description: "Please select a user to assign subscription.", variant: "destructive" });
      return;
    }
    setIsAssigning(true);
    try {
      const res = await fetch('/api/admin/subscription-actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'assign',
          userId: selectedUser.id,
          userEmail: selectedUser.email,
          planId: assignForm.planId,
          planType: assignForm.planType,
          durationDays: assignForm.durationDays,
          revealLimit: assignForm.revealLimit
        })
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: "Subscription Assigned!", description: data.message });
        setIsAssignDialogOpen(false);
        setSelectedUser(null);
        fetchSubscribers();
      } else {
        toast({ title: "Error", description: data.error, variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to assign subscription.", variant: "destructive" });
    } finally {
      setIsAssigning(false);
    }
  };

  const currentTabPlans = plans.filter(p => (p.planType || 'artist') === activePlanTab);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-card border p-6 rounded-3xl shadow-sm">
        <div>
          <h2 className="text-2xl font-black tracking-tight flex items-center gap-2">
            <Activity className="w-6 h-6 text-primary" /> Subscriptions & Memberships
          </h2>
          <p className="text-muted-foreground text-sm mt-1">
            Manage profile listing subscriptions for artists, recruiter contact reveal plans, subscriber history, and manual subscription assignment.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            onClick={() => setIsAssignDialogOpen(true)}
            variant="outline"
            className="rounded-xl font-bold border-primary text-primary hover:bg-primary/10 gap-2"
          >
            <UserPlus className="w-4 h-4" /> Assign Subscription
          </Button>
          <Button 
            onClick={handleOpenAddPlanDialog} 
            className="rounded-xl font-bold gap-2 shadow-lg shadow-primary/20"
          >
            <Plus className="w-4 h-4" /> Create Plan
          </Button>
        </div>
      </div>

      {/* Main Mode Tabs */}
      <Tabs value={mainTab} onValueChange={(val) => setMainTab(val as any)} className="w-full">
        <TabsList className="grid w-full sm:w-[500px] grid-cols-2 rounded-2xl p-1 bg-muted">
          <TabsTrigger value="subscribers" className="rounded-xl font-bold gap-2">
            <UserCheck className="w-4 h-4" /> Subscriber Records ({subscribers.length})
          </TabsTrigger>
          <TabsTrigger value="plans" className="rounded-xl font-bold gap-2">
            <ListChecks className="w-4 h-4" /> Subscription Plans ({plans.length})
          </TabsTrigger>
        </TabsList>

        {/* --- TAB 1: SUBSCRIBERS LIST & MANAGEMENT --- */}
        <TabsContent value="subscribers" className="mt-6 space-y-6">
          <Card className="border rounded-3xl shadow-sm overflow-hidden">
            <CardHeader className="bg-muted/30 pb-4">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <CardTitle className="text-lg font-bold">Subscribers & Subscriptions</CardTitle>
                  <CardDescription>Track active, expired, deactivated, or attempted subscriptions across user accounts.</CardDescription>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={fetchSubscribers} 
                  disabled={isLoadingSubscribers}
                  className="rounded-xl font-bold gap-2 text-xs"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingSubscribers ? 'animate-spin' : ''}`} /> Refresh
                </Button>
              </div>

              {/* Filters & Search */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
                  <Input
                    placeholder="Search by user name, email, phone..."
                    value={subscriberSearch}
                    onChange={(e) => setSubscriberSearch(e.target.value)}
                    className="pl-9 h-10 rounded-xl text-xs"
                  />
                </div>

                <Select value={subscriberTypeFilter} onValueChange={(val: any) => setSubscriberTypeFilter(val)}>
                  <SelectTrigger className="h-10 rounded-xl text-xs font-bold">
                    <SelectValue placeholder="Subscription Type" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="all">All Types (Profile & Contact Reveal)</SelectItem>
                    <SelectItem value="artist">Artist Profile Subscriptions</SelectItem>
                    <SelectItem value="hire">Recruiter Contact Reveal Subscriptions</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={subscriberStatusFilter} onValueChange={(val: any) => setSubscriberStatusFilter(val)}>
                  <SelectTrigger className="h-10 rounded-xl text-xs font-bold">
                    <SelectValue placeholder="Subscription Status" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="active">Active Subscriptions</SelectItem>
                    <SelectItem value="expired">Expired Subscriptions</SelectItem>
                    <SelectItem value="deactivated">Deactivated</SelectItem>
                    <SelectItem value="failed">Failed / Attempted</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              {isLoadingSubscribers ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <Loader2 className="w-8 h-8 animate-spin text-primary mb-2" />
                  <p className="text-xs text-muted-foreground">Loading subscriber records...</p>
                </div>
              ) : filteredSubscribers.length === 0 ? (
                <div className="text-center py-16 px-4">
                  <AlertTriangle className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
                  <p className="font-bold text-sm">No subscriber records match your filters.</p>
                  <p className="text-xs text-muted-foreground mt-1">Try clearing search terms or selecting 'All Statuses'.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-muted/20">
                      <TableRow>
                        <TableHead className="font-bold text-xs uppercase">Subscriber</TableHead>
                        <TableHead className="font-bold text-xs uppercase">Subscription Type</TableHead>
                        <TableHead className="font-bold text-xs uppercase">Plan & Limits</TableHead>
                        <TableHead className="font-bold text-xs uppercase">Status</TableHead>
                        <TableHead className="font-bold text-xs uppercase">Expiry Date</TableHead>
                        <TableHead className="font-bold text-xs uppercase text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredSubscribers.map((sub) => {
                        const isExp = sub.status === 'expired';
                        const isAct = sub.status === 'active';
                        const isDeact = sub.status === 'deactivated';

                        return (
                          <TableRow key={sub.id} className="hover:bg-muted/10 transition-colors">
                            <TableCell className="font-medium">
                              <div>
                                <p className="font-bold text-sm text-foreground">{sub.userName}</p>
                                <p className="text-xs text-muted-foreground">{sub.userEmail || 'No Email'}</p>
                                {sub.userPhone && <p className="text-[11px] text-muted-foreground font-mono">{sub.userPhone}</p>}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge 
                                variant="outline" 
                                className={`rounded-full text-[10px] font-bold ${
                                  sub.type === 'hire' 
                                    ? 'bg-amber-500/10 text-amber-600 border-amber-500/20' 
                                    : 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20'
                                }`}
                              >
                                {sub.type === 'hire' ? 'Contact Reveal' : 'Profile Plan'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div>
                                <p className="font-bold text-xs">{sub.planName}</p>
                                {sub.type === 'hire' && (
                                  <p className="text-[11px] text-muted-foreground font-medium mt-0.5">
                                    Reveals: {sub.contactRevealsUsed || 0} / {sub.contactRevealLimit || 0} used
                                  </p>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge 
                                variant={isAct ? "default" : isExp ? "secondary" : "destructive"} 
                                className="rounded-full text-[10px] font-bold uppercase"
                              >
                                {sub.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs">
                              {sub.endDate ? (
                                <div className={isExp ? 'text-destructive font-bold' : ''}>
                                  <p>{sub.endDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                                  {isExp && <span className="text-[10px] uppercase font-bold text-destructive">Expired</span>}
                                </div>
                              ) : (
                                <span className="text-muted-foreground">N/A</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                {/* Send Expiry / Renewal HTML Email */}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  title="Send Expiry / Renewal HTML Email"
                                  onClick={() => handleSendExpiryEmail(sub)}
                                  disabled={actionInProgress === sub.id || !sub.userEmail}
                                  className="h-8 px-2 text-xs font-bold text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 rounded-lg gap-1"
                                >
                                  {actionInProgress === sub.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                                  <span className="hidden xl:inline">Email Expiry</span>
                                </Button>

                                {/* Deactivate */}
                                {isAct && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    title="Deactivate Subscription"
                                    onClick={() => handleDeactivateSubscription(sub)}
                                    disabled={actionInProgress === sub.id}
                                    className="h-8 px-2 text-xs font-bold text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30 rounded-lg gap-1"
                                  >
                                    <Ban className="w-3.5 h-3.5" />
                                    <span className="hidden xl:inline">Deactivate</span>
                                  </Button>
                                )}

                                {/* Delete */}
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  title="Delete Subscription Record"
                                  onClick={() => handleDeleteSubscription(sub)}
                                  disabled={actionInProgress === sub.id}
                                  className="h-8 w-8 text-destructive hover:bg-destructive/10 rounded-lg"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* --- TAB 2: SUBSCRIPTION PLAN CREATOR & EDITOR --- */}
        <TabsContent value="plans" className="mt-6 space-y-6">
          <Tabs value={activePlanTab} onValueChange={(val) => setActivePlanTab(val as 'artist' | 'hire')} className="w-full">
            <TabsList className="grid w-full sm:w-[400px] grid-cols-2 rounded-2xl p-1 bg-muted">
              <TabsTrigger value="artist" className="rounded-xl font-bold gap-2">
                <UserCheck className="w-4 h-4" /> Artist Profile Plans
              </TabsTrigger>
              <TabsTrigger value="hire" className="rounded-xl font-bold gap-2">
                <PhoneCall className="w-4 h-4" /> Recruiter / Hire Plans
              </TabsTrigger>
            </TabsList>

            <TabsContent value={activePlanTab} className="mt-6">
              {isLoadingPlans ? (
                <div className="flex flex-col items-center justify-center py-20 bg-muted/20 rounded-3xl border-2 border-dashed">
                  <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
                  <p className="text-muted-foreground">Loading subscription plans...</p>
                </div>
              ) : currentTabPlans.length === 0 ? (
                <div className="text-center py-20 bg-muted/20 rounded-3xl border-2 border-dashed">
                  <Activity className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-xl font-bold">No {activePlanTab === 'hire' ? 'Recruiter / Hire' : 'Artist'} Plans Created</h3>
                  <p className="text-muted-foreground mb-6">
                    {activePlanTab === 'hire'
                      ? 'Create recruiter subscription plans to monetize artist contact reveals (X numbers).'
                      : 'Create subscription plans for artists to list their profiles.'}
                  </p>
                  <Button onClick={handleOpenAddPlanDialog} variant="outline" className="rounded-xl">
                    <Plus className="w-4 h-4 mr-2" /> Add Your First {activePlanTab === 'hire' ? 'Recruiter Plan' : 'Artist Plan'}
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {currentTabPlans.map((plan) => (
                    <Card key={plan.id} className="relative overflow-hidden border-2 rounded-3xl group transition-all duration-300 hover:shadow-xl">
                      <CardHeader className="pb-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle className="text-xl font-black">{plan.name}</CardTitle>
                            <div className="flex items-center gap-1 mt-1">
                              <IndianRupee className="w-3.5 h-3.5 text-muted-foreground" />
                              <span className="text-2xl font-black">{plan.price}</span>
                              <span className="text-muted-foreground text-xs font-medium uppercase tracking-wider ml-1">/ {plan.durationDays} Days</span>
                            </div>
                            {plan.planType === 'hire' && (
                              <div className="mt-2">
                                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 rounded-full font-bold text-xs">
                                  <PhoneCall className="w-3 h-3 mr-1" /> {plan.revealLimit || 0} Contact Reveals
                                </Badge>
                              </div>
                            )}
                          </div>
                          <Badge variant={plan.isActive ? "default" : "secondary"} className="rounded-full">
                            {plan.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3 mb-6">
                          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Features:</p>
                          <ul className="space-y-2">
                            {plan.features.map((feature, i) => (
                              <li key={i} className="flex items-start gap-2 text-sm">
                                <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                                <span>{feature}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div className="flex items-center justify-end gap-2 pt-4 border-t">
                          <Button variant="outline" size="sm" onClick={() => handleOpenEditPlanDialog(plan)} className="rounded-xl">
                            <Edit className="w-3.5 h-3.5 mr-1" /> Edit
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDeletePlan(plan.id)} className="rounded-xl text-destructive hover:bg-destructive/10">
                            <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </TabsContent>
      </Tabs>

      {/* --- MODAL: CREATE / EDIT SUBSCRIPTION PLAN --- */}
      <Dialog open={isPlanDialogOpen} onOpenChange={setIsPlanDialogOpen}>
        <DialogContent className="max-w-md rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-black">
              {editingPlan ? 'Edit Subscription Plan' : `Add ${planFormData.planType === 'hire' ? 'Recruiter' : 'Artist'} Plan`}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 my-2">
            <div>
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-1">Plan Name</Label>
              <Input 
                value={planFormData.name}
                onChange={(e) => setPlanFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g. Pro Recruiter Plan"
                className="rounded-xl font-bold"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-1">Price (₹)</Label>
                <Input 
                  type="number"
                  value={planFormData.price}
                  onChange={(e) => setPlanFormData(prev => ({ ...prev, price: Number(e.target.value) }))}
                  className="rounded-xl font-bold"
                />
              </div>
              <div>
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-1">Duration (Days)</Label>
                <Input 
                  type="number"
                  value={planFormData.durationDays}
                  onChange={(e) => setPlanFormData(prev => ({ ...prev, durationDays: Number(e.target.value) }))}
                  className="rounded-xl font-bold"
                />
              </div>
            </div>

            {planFormData.planType === 'hire' && (
              <div>
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-1">Contact Reveal Limit</Label>
                <Input 
                  type="number"
                  value={planFormData.revealLimit}
                  onChange={(e) => setPlanFormData(prev => ({ ...prev, revealLimit: Number(e.target.value) }))}
                  placeholder="Number of numbers user can reveal"
                  className="rounded-xl font-bold"
                />
              </div>
            )}

            <div>
              <div className="flex justify-between items-center mb-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Included Features</Label>
                <Button type="button" variant="ghost" size="sm" onClick={() => setPlanFormData(prev => ({ ...prev, features: [...prev.features, ''] }))} className="h-6 text-xs text-primary">
                  + Add Feature
                </Button>
              </div>
              <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                {planFormData.features.map((feat, idx) => (
                  <div key={idx} className="flex gap-2">
                    <Input
                      value={feat}
                      onChange={(e) => {
                        const newF = [...planFormData.features];
                        newF[idx] = e.target.value;
                        setPlanFormData(prev => ({ ...prev, features: newF }));
                      }}
                      placeholder={`Feature #${idx + 1}`}
                      className="rounded-xl text-xs"
                    />
                    {planFormData.features.length > 1 && (
                      <Button type="button" variant="ghost" size="icon" onClick={() => setPlanFormData(prev => ({ ...prev, features: prev.features.filter((_, i) => i !== idx) }))} className="h-9 w-9 text-destructive shrink-0">
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t">
              <Label className="text-xs font-bold">Active Status</Label>
              <Switch 
                checked={planFormData.isActive}
                onCheckedChange={(checked) => setPlanFormData(prev => ({ ...prev, isActive: checked }))}
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => setIsPlanDialogOpen(false)} disabled={isSavingPlan} className="rounded-xl">Cancel</Button>
            <Button onClick={handleSavePlan} disabled={isSavingPlan} className="rounded-xl font-bold gap-2">
              {isSavingPlan && <Loader2 className="w-4 h-4 animate-spin" />} Save Plan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* --- MODAL: ASSIGN SUBSCRIPTION MANUALLY --- */}
      <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
        <DialogContent className="max-w-lg rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-black flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-primary" /> Assign Subscription to User
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Directly grant active Profile or Contact Reveal subscription to any registered user.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 my-2">
            {/* User Search / Selection */}
            <div>
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-1">1. Find User</Label>
              {selectedUser ? (
                <div className="p-3 bg-primary/10 border border-primary/20 rounded-2xl flex items-center justify-between">
                  <div>
                    <p className="font-bold text-sm">{selectedUser.displayName || 'User'}</p>
                    <p className="text-xs text-muted-foreground">{selectedUser.email || selectedUser.mobileNumber}</p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedUser(null)} className="h-8 text-xs font-bold text-destructive">
                    Change User
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Input 
                      value={assignSearch}
                      onChange={(e) => setAssignSearch(e.target.value)}
                      placeholder="Type name, email, or phone number..."
                      className="rounded-xl text-xs font-bold flex-1"
                      onKeyDown={(e) => e.key === 'Enter' && handleSearchUsers()}
                    />
                    <Button onClick={handleSearchUsers} disabled={isSearchingUsers} className="rounded-xl font-bold gap-1">
                      {isSearchingUsers ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />} Search
                    </Button>
                  </div>

                  {searchedUsers.length > 0 && (
                    <div className="border rounded-2xl max-h-40 overflow-y-auto divide-y bg-background">
                      {searchedUsers.map((u) => (
                        <div 
                          key={u.id} 
                          onClick={() => setSelectedUser(u)}
                          className="p-2.5 hover:bg-muted/50 cursor-pointer text-xs flex justify-between items-center transition-colors"
                        >
                          <div>
                            <p className="font-bold">{u.displayName || 'User'}</p>
                            <p className="text-muted-foreground">{u.email || u.mobileNumber}</p>
                          </div>
                          <Badge variant="outline" className="text-[10px] font-bold">Select</Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Plan Type Selection */}
            <div>
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-1">2. Select Subscription Type</Label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setAssignForm(prev => ({ ...prev, planType: 'artist' }))}
                  className={`p-3 rounded-2xl border-2 text-left font-bold text-xs transition-all ${
                    assignForm.planType === 'artist' 
                      ? 'border-primary bg-primary/5 text-primary' 
                      : 'border-border text-muted-foreground'
                  }`}
                >
                  <UserCheck className="w-4 h-4 mb-1" />
                  Artist Profile Plan
                </button>

                <button
                  type="button"
                  onClick={() => setAssignForm(prev => ({ ...prev, planType: 'hire' }))}
                  className={`p-3 rounded-2xl border-2 text-left font-bold text-xs transition-all ${
                    assignForm.planType === 'hire' 
                      ? 'border-primary bg-primary/5 text-primary' 
                      : 'border-border text-muted-foreground'
                  }`}
                >
                  <PhoneCall className="w-4 h-4 mb-1" />
                  Recruiter Contact Reveal
                </button>
              </div>
            </div>

            {/* Plan Preset or Custom Duration */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-1">Duration (Days)</Label>
                <Input 
                  type="number"
                  value={assignForm.durationDays}
                  onChange={(e) => setAssignForm(prev => ({ ...prev, durationDays: Number(e.target.value) }))}
                  className="rounded-xl font-bold"
                />
              </div>

              {assignForm.planType === 'hire' && (
                <div>
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-1">Reveal Limit</Label>
                  <Input 
                    type="number"
                    value={assignForm.revealLimit}
                    onChange={(e) => setAssignForm(prev => ({ ...prev, revealLimit: Number(e.target.value) }))}
                    className="rounded-xl font-bold"
                  />
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => setIsAssignDialogOpen(false)} disabled={isAssigning} className="rounded-xl">Cancel</Button>
            <Button 
              onClick={handleAssignSubscription} 
              disabled={isAssigning || !selectedUser} 
              className="rounded-xl font-bold gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {isAssigning && <Loader2 className="w-4 h-4 animate-spin" />} Assign Subscription Now
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
