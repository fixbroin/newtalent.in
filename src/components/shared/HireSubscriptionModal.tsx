"use client";

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, PhoneCall, Check, Lock, Sparkles, ShieldCheck, IndianRupee } from 'lucide-react';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { SubscriptionPlan } from '@/types/firestore';
import { useRouter } from 'next/navigation';

interface HireSubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  reason?: 'no_subscription' | 'limit_reached';
  usedCount?: number;
  limitCount?: number;
}

export default function HireSubscriptionModal({
  isOpen,
  onClose,
  reason = 'no_subscription',
  usedCount = 0,
  limitCount = 0
}: HireSubscriptionModalProps) {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    if (isOpen) {
      fetchHirePlans();
    }
  }, [isOpen]);

  const fetchHirePlans = async () => {
    setIsLoading(true);
    try {
      const plansRef = collection(db, 'adminSubscriptionPlans');
      // Fetch plans where planType is 'hire'
      const q = query(plansRef, where('planType', '==', 'hire'), where('isActive', '==', true), orderBy('order', 'asc'));
      const snapshot = await getDocs(q);
      const fetchedPlans = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SubscriptionPlan));
      setPlans(fetchedPlans);
    } catch (error) {
      console.error('Error fetching hire subscription plans:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectPlan = (plan: SubscriptionPlan) => {
    onClose();
    // Navigate to payment page with subscription parameters
    router.push(`/checkout/payment?reason=subscription&planId=${plan.id}`);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl sm:rounded-3xl p-6">
        <DialogHeader className="text-center sm:text-left">
          <div className="mx-auto sm:mx-0 w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-3">
            <PhoneCall className="w-6 h-6" />
          </div>
          <DialogTitle className="text-2xl font-black tracking-tight">
            {reason === 'limit_reached' ? 'Reveal Limit Exhausted' : 'Unlock Recruiter & Hiring Contact Plan'}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground text-sm mt-1">
            {reason === 'limit_reached'
              ? `You have revealed ${usedCount} out of ${limitCount} numbers in your current plan. Please renew or upgrade your plan to contact more artists.`
              : 'Subscribe to a Recruiter Plan to reveal verified mobile numbers and directly contact artists.'}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary mb-3" />
            <p className="text-muted-foreground text-sm">Loading subscription plans...</p>
          </div>
        ) : plans.length === 0 ? (
          <div className="text-center py-10 bg-muted/20 rounded-2xl border border-dashed p-6">
            <Lock className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <h4 className="font-bold text-lg">No Recruiter Plans Available</h4>
            <p className="text-muted-foreground text-sm mt-1">
              Admin has not configured recruiter subscription plans yet. Please try again later.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-4 max-h-[60vh] overflow-y-auto pr-1">
            {plans.map((plan) => (
              <Card
                key={plan.id}
                className="relative overflow-hidden border-2 rounded-2xl flex flex-col justify-between transition-all hover:border-primary hover:shadow-lg"
              >
                <CardContent className="p-5 flex flex-col h-full justify-between">
                  <div>
                    <div className="flex items-start justify-between">
                      <h4 className="font-black text-lg">{plan.name}</h4>
                      <Badge className="bg-primary/10 text-primary border-primary/20 rounded-full font-bold">
                        {plan.revealLimit || 0} Contacts
                      </Badge>
                    </div>

                    <div className="flex items-baseline gap-1 my-3">
                      <IndianRupee className="w-4 h-4 text-muted-foreground" />
                      <span className="text-3xl font-black">{plan.price}</span>
                      <span className="text-xs text-muted-foreground font-medium">/ {plan.durationDays} Days</span>
                    </div>

                    <div className="space-y-2 mb-4">
                      <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                        <PhoneCall className="w-3.5 h-3.5 text-primary" />
                        <span>Reveal & Call {plan.revealLimit || 0} Artist Numbers</span>
                      </div>
                      {plan.features?.map((feature, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                          <span>{feature}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <Button
                    onClick={() => handleSelectPlan(plan)}
                    className="w-full rounded-xl font-bold gap-2 mt-2 shadow-md shadow-primary/20"
                  >
                    <Sparkles className="w-4 h-4" /> Subscribe Now
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <DialogFooter className="sm:justify-between items-center text-xs text-muted-foreground border-t pt-4">
          <div className="flex items-center gap-1.5 mx-auto sm:mx-0">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>Direct dial verified contacts anytime.</span>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} className="rounded-xl">
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
