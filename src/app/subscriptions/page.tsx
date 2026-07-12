"use client";

import React, { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, orderBy, onSnapshot, doc } from 'firebase/firestore';
import { useAuth } from '@/hooks/useAuth';
import { useFeaturesConfig } from '@/hooks/useFeaturesConfig';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Check, Clock, ShieldCheck, Zap, Star, Loader2, ArrowRight, UserCircle, MessageSquare } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Breadcrumbs from '@/components/shared/Breadcrumbs';
import { useToast } from '@/hooks/use-toast';
import type { SubscriptionPlan, UserSubscription } from '@/types/firestore';
import { cn } from '@/lib/utils';

export default function SubscriptionsPage() {
  const { user, firestoreUser } = useAuth();
  const { config: appConfig } = useFeaturesConfig();
  const router = useRouter();
  const { toast } = useToast();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [isLoadingPlans, setIsLoadingPlans] = useState(true);
  const [isPurchasing, setIsPurchasing] = useState<string | null>(null);

  useEffect(() => {
    const q = query(
      collection(db, "adminSubscriptionPlans"),
      where("isActive", "==", true),
      orderBy("order", "asc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setPlans(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SubscriptionPlan)));
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
      router.push(`/auth/login?returnUrl=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    
    setIsPurchasing(plan.id);
    const currentPath = window.location.pathname;
    router.push(`/checkout/payment?reason=subscription&planId=${plan.id}&returnUrl=${encodeURIComponent(currentPath)}`);
  };

  const activePlanId = firestoreUser?.currentSubscriptionId;
  const isSubscribed = firestoreUser?.subscriptionActive;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 sm:py-12 max-w-6xl">
        <Breadcrumbs items={[
          { label: 'Home', href: '/' },
          { label: 'Subscriptions' }
        ]} className="mb-8" />

        <div className="text-center mb-12">
          <Badge variant="outline" className="mb-4 px-4 py-1 border-primary/20 text-primary bg-primary/5 rounded-full font-bold">
            <Sparkles className="h-3.5 w-3.5 mr-2" /> PREMIUM PLANS
          </Badge>
          <h1 className="text-4xl md:text-6xl font-black tracking-tight mb-4">Choose Your Plan</h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Unlock professional connections and grow your artistic career with Newtalent's subscription plans.
          </p>
        </div>

        {/* Current Plan Status */}
        {user && (
          <Card className="mb-12 border-primary/20 bg-primary/5 overflow-hidden shadow-lg animate-in fade-in slide-in-from-bottom-4 duration-700">
            <CardContent className="p-6 md:p-8">
              <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-6">
                  <div className="h-16 w-16 rounded-2xl bg-primary flex items-center justify-center text-primary-foreground shadow-lg shadow-primary/30">
                    <ShieldCheck className="h-8 w-8" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black tracking-tight">Your Subscription Status</h2>
                    <p className="text-muted-foreground font-medium">
                      {isSubscribed 
                        ? `You are currently on a premium plan.` 
                        : "You don't have an active subscription yet."}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  {isSubscribed ? (
                    <div className="text-right">
                      <Badge className="bg-green-500 hover:bg-green-600 text-white font-bold px-4 py-1 mb-1">ACTIVE</Badge>
                      {firestoreUser.subscriptionExpiresAt && (
                        <p className="text-xs font-bold text-muted-foreground flex items-center justify-end">
                          <Clock className="h-3 w-3 mr-1" /> 
                          Expires: {firestoreUser.subscriptionExpiresAt.toDate().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </p>
                      )}
                    </div>
                  ) : (
                    <Badge variant="outline" className="font-bold px-4 py-1 border-dashed">FREE USER</Badge>
                  )}
                  <Button variant="outline" className="rounded-xl font-bold" onClick={() => router.push('/profile')}>
                    <UserCircle className="h-4 w-4 mr-2" /> View Profile
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
              <Card key={i} className="animate-pulse h-[500px]">
                <CardContent className="p-0" />
              </Card>
            ))
          ) : plans.length > 0 ? (
            plans.map((plan) => {
              const isActivePlan = activePlanId === plan.id && isSubscribed;
              
              return (
                <Card 
                  key={plan.id} 
                  className={cn(
                    "flex flex-col h-full border-2 transition-all duration-300 relative overflow-hidden group",
                    isActivePlan ? "border-primary shadow-xl shadow-primary/10" : "hover:border-primary/40 hover:shadow-lg"
                  )}
                >
                  {isActivePlan && (
                    <div className="absolute top-0 right-0">
                      <div className="bg-primary text-primary-foreground text-[10px] font-black px-6 py-1 rotate-45 translate-x-4 translate-y-2 uppercase tracking-widest">
                        Current
                      </div>
                    </div>
                  )}
                  
                  <CardHeader className="p-8">
                    <CardTitle className="text-2xl font-black">{plan.name}</CardTitle>
                    <div className="flex items-baseline gap-1 mt-4">
                      <span className="text-4xl font-black">₹{plan.price}</span>
                      <span className="text-muted-foreground font-bold">/{plan.durationDays} days</span>
                    </div>
                    <CardDescription className="mt-2 font-medium">Full access for {plan.durationDays} days</CardDescription>
                  </CardHeader>

                  <CardContent className="p-8 pt-0 flex-grow">
                    <Separator className="mb-6" />
                    <ul className="space-y-4">
                      {plan.features.map((feature, i) => (
                        <li key={i} className="flex items-start gap-3">
                          <div className="mt-1 h-5 w-5 rounded-full bg-green-500/10 flex items-center justify-center shrink-0">
                            <Check className="h-3 w-3 text-green-600 stroke-[3px]" />
                          </div>
                          <span className="text-sm font-medium text-muted-foreground">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>

                  <CardFooter className="p-8 pt-0 mt-auto">
                    {isActivePlan ? (
                      <Button className="w-full h-12 rounded-2xl bg-green-500 hover:bg-green-600 font-black cursor-default">
                        <ShieldCheck className="h-5 w-5 mr-2" /> Current Plan
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
              <h3 className="text-xl font-bold">No Plans Available</h3>
              <p className="text-muted-foreground">Check back later for updated subscription offers.</p>
            </div>
          )}
        </div>

        {/* Benefits Section */}
        <div className="mt-24 grid grid-cols-1 md:grid-cols-3 gap-12">
          <div className="text-center">
            <div className="h-14 w-14 rounded-2xl bg-blue-500/10 flex items-center justify-center mx-auto mb-6 text-blue-600">
              <MessageSquare className="h-7 w-7" />
            </div>
            <h4 className="text-xl font-bold mb-3">Direct Chat</h4>
            <p className="text-muted-foreground text-sm leading-relaxed">Connect directly with industry professionals and artists without any intermediaries.</p>
          </div>
          <div className="text-center">
            <div className="h-14 w-14 rounded-2xl bg-purple-500/10 flex items-center justify-center mx-auto mb-6 text-purple-600">
              <Star className="h-7 w-7" />
            </div>
            <h4 className="text-xl font-bold mb-3">Priority Listing</h4>
            <p className="text-muted-foreground text-sm leading-relaxed">Get featured at the top of category searches and increase your visibility to talent seekers.</p>
          </div>
          <div className="text-center">
            <div className="h-14 w-14 rounded-2xl bg-amber-500/10 flex items-center justify-center mx-auto mb-6 text-amber-600">
              <ShieldCheck className="h-7 w-7" />
            </div>
            <h4 className="text-xl font-bold mb-3">Verified Status</h4>
            <p className="text-muted-foreground text-sm leading-relaxed">A verified badge on your profile builds trust and professionalism in the community.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

const Separator = ({ className }: { className?: string }) => (
  <div className={cn("h-px w-full bg-border", className)} />
);
