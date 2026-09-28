"use client";

import React, { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { useAuth } from '@/hooks/useAuth';
import { useFeaturesConfig } from '@/hooks/useFeaturesConfig';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Check, Clock, ShieldCheck, Zap, Loader2, ArrowRight, UserCircle, PhoneCall, UserCheck } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import Breadcrumbs from '@/components/shared/Breadcrumbs';
import { useToast } from '@/hooks/use-toast';
import type { SubscriptionPlan } from '@/types/firestore';
import { cn } from '@/lib/utils';
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Separator } from '@/components/ui/separator';

export default function SubscriptionsPage() {
  const { user, firestoreUser } = useAuth();
  const { config: appConfig } = useFeaturesConfig();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  
  const initialType = searchParams.get('type') === 'contact' ? 'contact' : 'profile';
  const [activeTab, setActiveTab] = useState<'profile' | 'contact'>(initialType);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [isLoadingPlans, setIsLoadingPlans] = useState(true);
  const [isPurchasing, setIsPurchasing] = useState<string | null>(null);

  useEffect(() => {
    const typeParam = searchParams.get('type');
    if (typeParam === 'contact' || typeParam === 'profile') {
      setActiveTab(typeParam);
    }
  }, [searchParams]);

  useEffect(() => {
    const q = query(
      collection(db, "adminSubscriptionPlans"),
      where("isActive", "==", true),
      orderBy("order", "asc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedPlans = snapshot.docs.map(doc => ({ 
        id: doc.id, 
        planType: doc.data().planType || 'artist',
        ...doc.data() 
      } as SubscriptionPlan));
      setPlans(fetchedPlans);
      setIsLoadingPlans(false);
    }, (error) => {
      console.error("Error fetching plans:", error);
      setIsLoadingPlans(false);
    });

    return () => unsubscribe();
  }, []);

  const handlePurchase = (plan: SubscriptionPlan) => {
    if (!user) {
      toast({ title: "Login Required", description: "Please login to subscribe to a plan." });
      router.push(`/auth/login?returnUrl=${encodeURIComponent(window.location.pathname + window.location.search)}`);
      return;
    }
    
    setIsPurchasing(plan.id);
    const currentPath = window.location.pathname + window.location.search;
    router.push(`/checkout/payment?reason=subscription&planId=${plan.id}&returnUrl=${encodeURIComponent(currentPath)}`);
  };

  const activeArtistPlanId = firestoreUser?.currentSubscriptionId;
  const isArtistSubscribed = firestoreUser?.subscriptionActive;

  const activeHirePlanId = firestoreUser?.currentHireSubscriptionId;
  const isHireSubscribed = firestoreUser?.hireSubscriptionActive;
  const hireRevealLimit = firestoreUser?.contactRevealLimit || 0;
  const hireRevealsUsed = firestoreUser?.contactRevealsUsed || 0;
  const hireRemaining = Math.max(0, hireRevealLimit - hireRevealsUsed);

  const filteredPlans = plans.filter(p => {
    if (activeTab === 'contact') return p.planType === 'hire';
    return p.planType === 'artist' || !p.planType;
  });

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 sm:py-12 max-w-6xl">
        <Breadcrumbs items={[
          { label: 'Home', href: '/' },
          { label: 'Subscriptions' }
        ]} className="mb-8" />

        <div className="text-center mb-8">
          <Badge variant="outline" className="mb-4 px-4 py-1 border-primary/20 text-primary bg-primary/5 rounded-full font-bold">
            <Sparkles className="h-3.5 w-3.5 mr-2" /> PREMIUM PLANS
          </Badge>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-3">Choose Your Plan</h1>
          <p className="text-muted-foreground text-base md:text-lg max-w-2xl mx-auto">
            Select a plan to list your profile or unlock contact details for direct communication.
          </p>
        </div>

        {/* Tab Selector */}
        <div className="flex justify-center mb-10">
          <Tabs 
            value={activeTab} 
            onValueChange={(val) => {
              const newTab = val as 'profile' | 'contact';
              setActiveTab(newTab);
              router.replace(`/subscriptions?type=${newTab}`);
            }} 
            className="w-full max-w-md"
          >
            <TabsList className="grid w-full grid-cols-2 rounded-2xl p-1.5 bg-muted/80 border">
              <TabsTrigger value="profile" className="rounded-xl font-bold py-2.5 gap-2 text-sm">
                <UserCheck className="w-4 h-4" /> Profile Plans
              </TabsTrigger>
              <TabsTrigger value="contact" className="rounded-xl font-bold py-2.5 gap-2 text-sm">
                <PhoneCall className="w-4 h-4" /> Contact Plans
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Current Plan Status */}
        {user && (
          <Card className="mb-10 border-primary/20 bg-primary/5 overflow-hidden shadow-lg animate-in fade-in duration-500">
            <CardContent className="p-6 md:p-8">
              <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-5">
                  <div className="h-14 w-14 rounded-2xl bg-primary flex items-center justify-center text-primary-foreground shadow-lg shadow-primary/30 shrink-0">
                    {activeTab === 'contact' ? <PhoneCall className="h-7 w-7" /> : <ShieldCheck className="h-7 w-7" />}
                  </div>
                  <div>
                    <h2 className="text-xl md:text-2xl font-black tracking-tight">
                      {activeTab === 'contact' ? 'Contact Access Status' : 'Profile Listing Status'}
                    </h2>
                    <p className="text-muted-foreground text-sm font-medium">
                      {activeTab === 'contact'
                        ? isHireSubscribed 
                          ? `Remaining Contact Reveals: ${hireRemaining} / ${hireRevealLimit}`
                          : "You don't have an active contact reveal plan yet."
                        : isArtistSubscribed 
                          ? "You are currently on an active artist profile plan." 
                          : "You don't have an active profile subscription yet."}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {(activeTab === 'contact' ? isHireSubscribed : isArtistSubscribed) ? (
                    <div className="text-right">
                      <Badge className="bg-green-500 hover:bg-green-600 text-white font-bold px-4 py-1 mb-1">ACTIVE</Badge>
                      {activeTab === 'contact' && firestoreUser?.hireSubscriptionExpiresAt && (
                        <p className="text-xs font-bold text-muted-foreground flex items-center justify-end">
                          <Clock className="h-3 w-3 mr-1" /> 
                          Expires: {typeof (firestoreUser.hireSubscriptionExpiresAt as any).toDate === 'function' 
                            ? firestoreUser.hireSubscriptionExpiresAt.toDate().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                            : 'Active'}
                        </p>
                      )}
                      {activeTab === 'profile' && firestoreUser?.subscriptionExpiresAt && (
                        <p className="text-xs font-bold text-muted-foreground flex items-center justify-end">
                          <Clock className="h-3 w-3 mr-1" /> 
                          Expires: {typeof (firestoreUser.subscriptionExpiresAt as any).toDate === 'function' 
                            ? firestoreUser.subscriptionExpiresAt.toDate().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                            : 'Active'}
                        </p>
                      )}
                    </div>
                  ) : (
                    <Badge variant="outline" className="font-bold px-4 py-1 border-dashed">FREE USER</Badge>
                  )}
                  <Button variant="outline" className="rounded-xl font-bold" onClick={() => router.push('/profile')}>
                    <UserCircle className="h-4 w-4 mr-2" /> View Account
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {isLoadingPlans ? (
            [1, 2, 3].map(i => (
              <Card key={i} className="animate-pulse h-[450px]">
                <CardContent className="p-0" />
              </Card>
            ))
          ) : filteredPlans.length > 0 ? (
            filteredPlans.map((plan) => {
              const isCurrentActive = activeTab === 'contact' 
                ? (activeHirePlanId === plan.id && isHireSubscribed)
                : (activeArtistPlanId === plan.id && isArtistSubscribed);
              
              return (
                <Card 
                  key={plan.id} 
                  className={cn(
                    "flex flex-col h-full border-2 transition-all duration-300 relative overflow-hidden group",
                    isCurrentActive ? "border-primary shadow-xl shadow-primary/10" : "hover:border-primary/40 hover:shadow-lg"
                  )}
                >
                  {isCurrentActive && (
                    <div className="absolute top-0 right-0">
                      <div className="bg-primary text-primary-foreground text-[10px] font-black px-6 py-1 rotate-45 translate-x-4 translate-y-2 uppercase tracking-widest">
                        Current
                      </div>
                    </div>
                  )}
                  
                  <CardHeader className="p-6 md:p-8">
                    <CardTitle className="text-2xl font-black">{plan.name}</CardTitle>
                    <div className="flex items-baseline gap-1 mt-3">
                      <span className="text-4xl font-black">₹{plan.price}</span>
                      <span className="text-muted-foreground font-bold text-sm">/{plan.durationDays} days</span>
                    </div>
                    {plan.planType === 'hire' && (
                      <div className="mt-3">
                        <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 rounded-full font-bold">
                          <PhoneCall className="w-3 h-3 mr-1" /> {plan.revealLimit || 0} Contact Reveals
                        </Badge>
                      </div>
                    )}
                    <CardDescription className="mt-2 font-medium">Full access for {plan.durationDays} days</CardDescription>
                  </CardHeader>

                  <CardContent className="p-6 md:p-8 pt-0 flex-grow">
                    <Separator className="mb-6" />
                    <ul className="space-y-4">
                      {plan.features?.map((feature, i) => (
                        <li key={i} className="flex items-start gap-3">
                          <div className="mt-1 h-5 w-5 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
                            <Check className="h-3 w-3 text-emerald-600 stroke-[3px]" />
                          </div>
                          <span className="text-sm font-medium text-muted-foreground">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>

                  <CardFooter className="p-6 md:p-8 pt-0 mt-auto">
                    {isCurrentActive ? (
                      <Button className="w-full h-12 rounded-2xl bg-emerald-600 hover:bg-emerald-700 font-black cursor-default">
                        <ShieldCheck className="h-5 w-5 mr-2" /> Active Plan
                      </Button>
                    ) : (
                      <Button 
                        className="w-full h-12 rounded-2xl font-black group-hover:shadow-lg transition-all"
                        onClick={() => handlePurchase(plan)}
                        disabled={!!isPurchasing}
                      >
                        {isPurchasing === plan.id ? (
                          <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                          <>Get Started <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" /></>
                        )}
                      </Button>
                    )}
                  </CardFooter>
                </Card>
              );
            })
          ) : (
            <div className="col-span-full py-20 text-center bg-muted/20 rounded-3xl border-2 border-dashed">
              <Zap className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-bold">No {activeTab === 'contact' ? 'Contact' : 'Profile'} Plans Available</h3>
              <p className="text-muted-foreground">Admin has not configured plans for this category yet.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
