"use client";

import React, { useState, useEffect } from 'react';
import { 
  Plus, Edit, Trash2, Loader2, Check, X, 
  IndianRupee, Calendar, ListChecks, Activity
} from 'lucide-react';
import { 
  collection, query, getDocs, addDoc, updateDoc, 
  deleteDoc, doc, orderBy, Timestamp 
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { SubscriptionPlan } from '@/types/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';

export default function SubscriptionManager() {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    price: 0,
    durationDays: 30,
    features: [''],
    isActive: true,
    order: 0
  });

  const { toast } = useToast();

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    setIsLoading(true);
    try {
      const plansRef = collection(db, 'adminSubscriptionPlans');
      const q = query(plansRef, orderBy('order', 'asc'));
      const snapshot = await getDocs(q);
      const fetchedPlans = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SubscriptionPlan));
      setPlans(fetchedPlans);
    } catch (error) {
      console.error("Error fetching plans:", error);
      toast({ title: "Error", description: "Failed to load plans.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenAddDialog = () => {
    setEditingPlan(null);
    setFormData({
      name: '',
      price: 0,
      durationDays: 30,
      features: [''],
      isActive: true,
      order: plans.length
    });
    setIsDialogOpen(true);
  };

  const handleOpenEditDialog = (plan: SubscriptionPlan) => {
    setEditingPlan(plan);
    setFormData({
      name: plan.name,
      price: plan.price,
      durationDays: plan.durationDays,
      features: [...plan.features],
      isActive: plan.isActive,
      order: plan.order
    });
    setIsDialogOpen(true);
  };

  const handleAddFeature = () => {
    setFormData(prev => ({ ...prev, features: [...prev.features, ''] }));
  };

  const handleRemoveFeature = (index: number) => {
    setFormData(prev => ({ 
      ...prev, 
      features: prev.features.filter((_, i) => i !== index) 
    }));
  };

  const handleFeatureChange = (index: number, value: string) => {
    const newFeatures = [...formData.features];
    newFeatures[index] = value;
    setFormData(prev => ({ ...prev, features: newFeatures }));
  };

  const handleSave = async () => {
    if (!formData.name || formData.price < 0) {
      toast({ title: "Validation Error", description: "Please fill all required fields.", variant: "destructive" });
      return;
    }

    setIsSaving(true);
    try {
      const cleanFeatures = formData.features.filter(f => f.trim() !== '');
      const planData = {
        ...formData,
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
      
      setIsDialogOpen(false);
      fetchPlans();
    } catch (error) {
      console.error("Error saving plan:", error);
      toast({ title: "Error", description: "Failed to save plan.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this plan?")) return;
    
    try {
      await deleteDoc(doc(db, 'adminSubscriptionPlans', id));
      toast({ title: "Deleted", description: "Plan removed successfully." });
      fetchPlans();
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete plan.", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Subscription Plans</h2>
          <p className="text-muted-foreground">Manage the plans available for users to connect with artists.</p>
        </div>
        <Button onClick={handleOpenAddDialog} className="rounded-xl shadow-lg shadow-primary/20">
          <Plus className="w-4 h-4 mr-2" /> Add New Plan
        </Button>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-muted/20 rounded-3xl border-2 border-dashed">
          <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
          <p className="text-muted-foreground">Loading subscription plans...</p>
        </div>
      ) : plans.length === 0 ? (
        <div className="text-center py-20 bg-muted/20 rounded-3xl border-2 border-dashed">
          <Activity className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-xl font-bold">No Plans Created</h3>
          <p className="text-muted-foreground mb-6">Create your first subscription plan to start monetizing connections.</p>
          <Button onClick={handleOpenAddDialog} variant="outline" className="rounded-xl">
            <Plus className="w-4 h-4 mr-2" /> Add Your First Plan
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <Card key={plan.id} className="relative overflow-hidden border-2 rounded-3xl group transition-all duration-300 hover:shadow-xl">
              <CardHeader className="pb-4">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-xl font-black">{plan.name}</CardTitle>
                    <div className="flex items-center gap-1 mt-1">
                      <IndianRupee className="w-3 h-3 text-muted-foreground" />
                      <span className="text-2xl font-black">{plan.price}</span>
                      <span className="text-muted-foreground text-xs font-medium uppercase tracking-wider ml-1">/ {plan.durationDays} Days</span>
                    </div>
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
                <div className="flex gap-2 pt-4 border-t border-border/50">
                  <Button variant="outline" size="sm" className="flex-1 rounded-xl" onClick={() => handleOpenEditDialog(plan)}>
                    <Edit className="w-3.5 h-3.5 mr-2" /> Edit
                  </Button>
                  <Button variant="ghost" size="sm" className="flex-1 rounded-xl text-destructive hover:bg-destructive/10" onClick={() => handleDelete(plan.id)}>
                    <Trash2 className="w-3.5 h-3.5 mr-2" /> Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black">{editingPlan ? 'Edit Plan' : 'Create New Plan'}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 col-span-2">
                <Label htmlFor="name" className="text-xs font-bold uppercase tracking-wider">Plan Name</Label>
                <Input 
                  id="name" 
                  value={formData.name} 
                  onChange={(e) => setFormData({...formData, name: e.target.value})} 
                  placeholder="e.g. Gold Monthly"
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="price" className="text-xs font-bold uppercase tracking-wider">Price (₹)</Label>
                <div className="relative">
                  <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input 
                    id="price" 
                    type="number"
                    value={formData.price} 
                    onChange={(e) => setFormData({...formData, price: Number(e.target.value)})} 
                    className="pl-9 rounded-xl"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="duration" className="text-xs font-bold uppercase tracking-wider">Duration (Days)</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input 
                    id="duration" 
                    type="number"
                    value={formData.durationDays} 
                    onChange={(e) => setFormData({...formData, durationDays: Number(e.target.value)})} 
                    className="pl-9 rounded-xl"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <Label className="text-xs font-bold uppercase tracking-wider">Plan Features</Label>
                <Button variant="ghost" size="sm" onClick={handleAddFeature} className="text-primary hover:bg-primary/10 rounded-full h-8 px-3">
                  <Plus className="w-3 h-3 mr-1" /> Add
                </Button>
              </div>
              <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                {formData.features.map((feature, index) => (
                  <div key={index} className="flex gap-2">
                    <Input 
                      value={feature} 
                      onChange={(e) => handleFeatureChange(index, e.target.value)} 
                      placeholder="Enter a feature..."
                      className="rounded-xl flex-grow"
                    />
                    <Button variant="ghost" size="icon" onClick={() => handleRemoveFeature(index)} className="rounded-xl shrink-0 text-destructive hover:bg-destructive/10">
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-2xl border">
              <div className="space-y-0.5">
                <Label className="text-sm font-bold">Active Status</Label>
                <p className="text-xs text-muted-foreground">Disable this to hide the plan from users.</p>
              </div>
              <Switch 
                checked={formData.isActive} 
                onCheckedChange={(checked) => setFormData({...formData, isActive: checked})} 
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => setIsDialogOpen(false)} className="rounded-xl">Cancel</Button>
            <Button onClick={handleSave} className="rounded-xl px-8 shadow-lg shadow-primary/20" isLoading={isSaving}>
              {editingPlan ? 'Update Plan' : 'Create Plan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
