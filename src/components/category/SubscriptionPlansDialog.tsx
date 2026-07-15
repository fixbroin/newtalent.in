"use client";

import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Check, Loader2, Sparkles, Zap, ShieldCheck } from "lucide-react";
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { SubscriptionPlan } from '@/types/firestore';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

interface SubscriptionPlansDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const SubscriptionPlansDialog: React.FC<SubscriptionPlansDialogProps> = ({ open, onOpenChange, onSuccess }) => {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPurchasing, setIsPurchasing] = useState<string | null>(null);
  const { toast } = useToast();
  const { user, firestoreUser } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (open) {
      fetchPlans();
    }
  }, [open]);

  const fetchPlans = async () => {
    setIsLoading(true);
    try {
      const plansRef = collection(db, 'adminSubscriptionPlans');
      const q = query(plansRef, where('isActive', '==', true), orderBy('order', 'asc'));
      const snapshot = await getDocs(q);
      const fetchedPlans = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SubscriptionPlan));
      setPlans(fetchedPlans);
    } catch (error) {
      console.error("Error fetching plans:", error);
      toast({ title: "Error", description: "Failed to load subscription plans.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePurchase = (plan: SubscriptionPlan) => {
    if (!user) return;
    setIsPurchasing(plan.id);
    const currentPath = window.location.pathname;
    router.push(`/checkout/payment?reason=subscription&planId=${plan.id}&returnUrl=${encodeURIComponent(currentPath)}`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl p-0 overflow-hidden border-none shadow-2xl">
        <div className="bg-gradient-to-br from-primary/10 via-background to-background p-2 md:p-8">
          <DialogHeader className="mb-8">
            <div className="flex justify-center mb-4">
              <div className="bg-primary/20 p-3 rounded-full animate-pulse">
                <Sparkles className="w-8 h-8 text-primary" />
              </div>
            </div>
            <DialogTitle className="text-3xl font-black text-center mb-2">Upgrade Your Experience</DialogTitle>
            <DialogDescription className="text-center text-lg text-muted-foreground">
              Choose a plan to connect with artists and start your collaboration.
            </DialogDescription>
          </DialogHeader>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
              <p className="text-muted-foreground animate-pulse">Loading amazing plans for you...</p>
            </div>
          ) : plans.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-xl font-medium">No plans available right now.</p>
              <p className="text-muted-foreground">Please check back later.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {plans.map((plan) => (
                <div 
                  key={plan.id}
                  className={cn(
                    "relative flex flex-col bg-card border-2 rounded-3xl p-2 transition-all duration-300 hover:shadow-xl hover:scale-[1.02]",
                    plan.order === 1 ? "border-primary shadow-lg ring-1 ring-primary/20" : "border-border/50"
                  )}
                >
                  {plan.order === 1 && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-4 py-1 rounded-full text-xs font-bold tracking-wider uppercase shadow-md">
                      Most Popular
                    </div>
                  )}

                  <div className="mb-6">
                    <h3 className="text-xl font-black mb-1">{plan.name}</h3>
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-black">₹{plan.price}</span>
                      <span className="text-muted-foreground text-sm font-medium">/ {plan.durationDays} Days</span>
                    </div>
                  </div>

                  <ul className="space-y-4 mb-8 flex-grow">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <div className="bg-primary/10 p-1 rounded-full shrink-0">
                          <Check className="w-3 h-3 text-primary" />
                        </div>
                        <span className="text-sm font-medium leading-tight">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Button 
                    onClick={() => handlePurchase(plan)}
                    className={cn(
                      "w-full rounded-2xl h-12 text-base font-bold shadow-md",
                      plan.order === 1 ? "bg-primary hover:bg-primary/90" : "bg-secondary hover:bg-secondary/90 text-secondary-foreground"
                    )}
                    isLoading={isPurchasing === plan.id}
                  >
                    Get Started
                  </Button>
                  
                  <div className="mt-4 flex items-center justify-center gap-2 text-[10px] text-muted-foreground font-medium uppercase tracking-widest">
                    <ShieldCheck className="w-3 h-3" /> Secure Payment
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-10 p-4 bg-muted/50 rounded-2xl flex items-center gap-4 border border-border/30">
            <div className="bg-primary/20 p-2 rounded-xl">
               <Zap className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-bold">Why subscribe?</p>
              <p className="text-xs text-muted-foreground">Unlock direct chat with verified artists and manage your bookings effortlessly.</p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SubscriptionPlansDialog;
