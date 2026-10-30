"use client";

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Settings, Save, Loader2, MailIcon, MapPin as MapIcon, PlaySquare, Users, CreditCard, Copy, Check, Webhook } from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc, Timestamp } from "firebase/firestore";
import { triggerRefresh } from '@/lib/revalidateUtils';
import type { AppSettings } from '@/types/firestore'; 
import { defaultAppSettings } from '@/config/appDefaults'; 
import { Input } from '@/components/ui/input';
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TooltipProvider } from '@/components/ui/tooltip';

const APP_CONFIG_COLLECTION = "webSettings";
const APP_CONFIG_DOC_ID = "applicationConfig";

export default function AdminSettingsPage() {
  const { toast } = useToast();
  const [settings, setSettings] = useState<AppSettings>(defaultAppSettings);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);
  const [copiedWebhookUrl, setCopiedWebhookUrl] = useState(false);
  const [siteOrigin, setSiteOrigin] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setSiteOrigin(window.location.origin);
    }
  }, []);

  const webhookUrl = `${siteOrigin || process.env.NEXT_PUBLIC_SITE_URL || 'https://newtalent.in'}/api/razorpay/webhook`;

  const loadSettingsFromFirestore = useCallback(async () => {
    setIsLoadingSettings(true);
    try {
      const settingsDocRef = doc(db, APP_CONFIG_COLLECTION, APP_CONFIG_DOC_ID);
      const docSnap = await getDoc(settingsDocRef);
      if (docSnap.exists()) {
        const firestoreData = docSnap.data() as Partial<AppSettings>;
        const mergedSettings = { 
          ...defaultAppSettings, 
          ...firestoreData,
          enableCOD: false, // Pay Later & Pay After Service completely removed
        };
        setSettings(mergedSettings);
      } else {
        setSettings({ ...defaultAppSettings, enableCOD: false });
      }
    } catch (e) {
      console.error("Failed to load settings from Firestore", e);
      toast({ title: "Error Loading Settings", description: "Could not load settings from database. Using defaults.", variant: "destructive" });
      setSettings({ ...defaultAppSettings, enableCOD: false }); 
    } finally {
      setIsLoadingSettings(false);
    }
  }, [toast]);

  useEffect(() => {
    loadSettingsFromFirestore();
  }, [loadSettingsFromFirestore]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setSettings(prev => {
      const newSettings = { ...prev };
      if (name === 'carouselAutoplayDelay' || name === 'maxArtistRadiusKm') {
        (newSettings as any)[name] = parseFloat(value) || 0;
      } else {
        (newSettings as any)[name] = value;
      }
      return newSettings;
    });
  };

  const handleSwitchChange = (name: keyof AppSettings | string, checked: boolean) => {
    setSettings(prev => ({
      ...prev,
      [name as keyof AppSettings]: checked
    }));
  };

  const handleSaveSettings = async (sectionName: string) => {
    setIsSaving(true);
    
    const settingsToSave: AppSettings = {
      ...defaultAppSettings, 
      ...settings, 
      enableCOD: false, // Ensure Pay Later remains disabled
      updatedAt: Timestamp.now(),
    };

    try {
      const settingsDocRef = doc(db, APP_CONFIG_COLLECTION, APP_CONFIG_DOC_ID);
      await setDoc(settingsDocRef, settingsToSave, { merge: true }); 
      await triggerRefresh('app-settings');
      await triggerRefresh('global-cache');
      
      toast({
        title: "Settings Saved",
        description: `${sectionName} settings have been saved to the database.`,
      });
    } catch (e) {
      console.error("Failed to save settings to Firestore", e);
      toast({
        title: "Error Saving Settings",
        description: "Could not save settings to the database.",
        variant: "destructive",
      });
    }
    await new Promise(resolve => setTimeout(resolve, 500)); 
    setIsSaving(false);
  };

  const handleCopyWebhookUrl = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopiedWebhookUrl(true);
    toast({ title: "Copied!", description: "Webhook URL copied to clipboard." });
    setTimeout(() => setCopiedWebhookUrl(false), 2000);
  };

  if (isLoadingSettings) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-200px)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-3 font-bold">Loading application settings...</p>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-6">
        <Card className="border shadow-sm rounded-3xl">
          <CardHeader>
            <CardTitle className="text-2xl font-black flex items-center gap-2">
              <Settings className="h-6 w-6 text-primary" /> Application Settings
            </CardTitle>
            <CardDescription>
              Configure application settings, payment gateway keys, webhook endpoints, and artist options.
            </CardDescription>
          </CardHeader>
        </Card>

        <Tabs defaultValue="general" className="w-full">
          <div className="relative mb-6">
            <TabsList className="h-12 w-full justify-start gap-2 bg-transparent p-0 overflow-x-auto no-scrollbar flex-nowrap border-b border-border rounded-none">
              <TabsTrigger 
                value="general"
                className="relative h-12 rounded-none border-b-2 border-transparent bg-transparent px-4 pb-3 pt-2 font-bold text-muted-foreground shadow-none data-[state=active]:border-primary data-[state=active]:text-primary whitespace-nowrap"
              >
                <Settings className="mr-2 h-4 w-4" /> General
              </TabsTrigger>
              <TabsTrigger 
                value="payment"
                className="relative h-12 rounded-none border-b-2 border-transparent bg-transparent px-4 pb-3 pt-2 font-bold text-muted-foreground shadow-none data-[state=active]:border-primary data-[state=active]:text-primary whitespace-nowrap"
              >
                <CreditCard className="mr-2 h-4 w-4" /> Payment Gateway & Webhook
              </TabsTrigger>
              <TabsTrigger 
                value="artist"
                className="relative h-12 rounded-none border-b-2 border-transparent bg-transparent px-4 pb-3 pt-2 font-bold text-muted-foreground shadow-none data-[state=active]:border-primary data-[state=active]:text-primary whitespace-nowrap"
              >
                <Users className="mr-2 h-4 w-4" /> Artist Settings
              </TabsTrigger>
            </TabsList>
          </div>

          {/* --- TAB 1: GENERAL SETTINGS (Minimum Booking Policy Removed) --- */}
          <TabsContent value="general" className="mt-0 focus-visible:outline-none">
            <Card className="border rounded-3xl shadow-sm">
              <CardHeader>
                <CardTitle className="text-xl font-bold">General Settings</CardTitle>
                <CardDescription>Basic application-wide configurations.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* User Profile Settings */}
                <div className="space-y-4 p-4 border rounded-2xl shadow-sm">
                  <h3 className="text-md font-bold flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary"/> User Profile Settings
                  </h3>
                  <div className="flex items-center justify-between rounded-xl border p-4">
                    <div className="space-y-0.5">
                      <Label htmlFor="allowUsernameEdit" className="text-base font-bold">Allow Username Editing</Label>
                      <p className="text-xs text-muted-foreground">
                        Enable or disable the ability for users to change their usernames in their profile.
                      </p>
                    </div>
                    <Switch
                      id="allowUsernameEdit"
                      name="allowUsernameEdit" 
                      checked={settings.allowUsernameEdit}
                      onCheckedChange={(checked) => handleSwitchChange('allowUsernameEdit', checked)}
                      disabled={isSaving}
                    />
                  </div>
                </div>

                {/* Homepage Hero Carousel */}
                <div className="space-y-4 p-4 border rounded-2xl shadow-sm">
                  <h3 className="text-md font-bold flex items-center gap-2">
                    <PlaySquare className="h-5 w-5 text-primary"/> Homepage Hero Carousel
                  </h3>
                  <div className="flex items-center justify-between rounded-xl border p-4">
                    <div className="space-y-0.5">
                      <Label htmlFor="enableHeroCarousel" className="text-base font-bold">Enable Hero Carousel</Label>
                      <p className="text-xs text-muted-foreground">
                        Show or hide the main slideshow on the homepage.
                      </p>
                    </div>
                    <Switch
                      id="enableHeroCarousel"
                      name="enableHeroCarousel" 
                      checked={settings.enableHeroCarousel}
                      onCheckedChange={(checked) => handleSwitchChange('enableHeroCarousel', checked)}
                      disabled={isSaving}
                    />
                  </div>
                  {settings.enableHeroCarousel && (
                    <div className="space-y-4 pl-4 border-l-2 border-primary ml-2 pt-2">
                      <div className="flex items-center justify-between rounded-xl border p-4">
                        <div className="space-y-0.5">
                          <Label htmlFor="enableCarouselAutoplay" className="text-base font-bold">Enable Autoplay</Label>
                          <p className="text-xs text-muted-foreground">
                            Automatically transition between slides.
                          </p>
                        </div>
                        <Switch
                          id="enableCarouselAutoplay"
                          name="enableCarouselAutoplay"
                          checked={settings.enableCarouselAutoplay}
                          onCheckedChange={(checked) => handleSwitchChange('enableCarouselAutoplay', checked)}
                          disabled={isSaving}
                        />
                      </div>
                      {settings.enableCarouselAutoplay && (
                        <div className="space-y-2">
                          <Label htmlFor="carouselAutoplayDelay" className="text-xs font-bold uppercase">Autoplay Delay (milliseconds)</Label>
                          <Input
                            id="carouselAutoplayDelay"
                            name="carouselAutoplayDelay"
                            type="number"
                            value={settings.carouselAutoplayDelay}
                            onChange={handleInputChange}
                            placeholder="e.g., 5000"
                            disabled={isSaving}
                            min="1000" 
                            className="rounded-xl font-bold"
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Google Maps Config */}
                <div className="space-y-4 p-4 border rounded-2xl shadow-sm">
                  <h3 className="text-md font-bold flex items-center gap-2">
                    <MapIcon className="h-5 w-5 text-primary"/> Google Maps Configuration
                  </h3>
                  <div className="space-y-2">
                    <Label htmlFor="googleMapsApiKey" className="text-xs font-bold uppercase">Google Maps API Key</Label>
                    <Input
                      id="googleMapsApiKey"
                      name="googleMapsApiKey"
                      type="text"
                      value={settings.googleMapsApiKey}
                      onChange={handleInputChange}
                      placeholder="Enter your Google Maps API Key"
                      disabled={isSaving}
                      className="rounded-xl font-mono text-xs"
                    />
                  </div>
                </div>

                {/* Email SMTP Config */}
                <div className="space-y-4 p-4 border rounded-2xl shadow-sm">
                  <h3 className="text-md font-bold flex items-center gap-2">
                    <MailIcon className="h-5 w-5 text-primary"/> Email Configuration (SMTP)
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="smtpHost" className="text-xs font-bold uppercase">SMTP Host</Label>
                      <Input id="smtpHost" name="smtpHost" value={settings.smtpHost} onChange={handleInputChange} placeholder="e.g., smtp.gmail.com" disabled={isSaving} className="rounded-xl font-bold"/>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="smtpPort" className="text-xs font-bold uppercase">SMTP Port</Label>
                      <Input id="smtpPort" name="smtpPort" type="text" value={settings.smtpPort} onChange={handleInputChange} placeholder="e.g., 587 or 465" disabled={isSaving} className="rounded-xl font-bold"/>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="senderEmail" className="text-xs font-bold uppercase">Sender Email Address</Label>
                    <Input id="senderEmail" name="senderEmail" type="email" value={settings.senderEmail} onChange={handleInputChange} placeholder="e.g., no-reply@newtalent.in" disabled={isSaving} className="rounded-xl font-bold"/>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="smtpUser" className="text-xs font-bold uppercase">SMTP Username</Label>
                      <Input id="smtpUser" name="smtpUser" value={settings.smtpUser} onChange={handleInputChange} placeholder="Your SMTP username" disabled={isSaving} className="rounded-xl font-bold"/>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="smtpPass" className="text-xs font-bold uppercase">SMTP Password</Label>
                      <Input id="smtpPass" name="smtpPass" type="password" value={settings.smtpPass} onChange={handleInputChange} placeholder="Your SMTP password" disabled={isSaving} className="rounded-xl font-bold"/>
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="border-t px-6 py-4">
                <Button onClick={() => handleSaveSettings("General")} disabled={isSaving} className="rounded-xl font-bold gap-2">
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Save General Settings
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>

          {/* --- TAB 2: PAYMENT GATEWAY & WEBHOOK --- */}
          <TabsContent value="payment">
            <Card className="border rounded-3xl shadow-sm">
              <CardHeader>
                <CardTitle className="text-xl font-bold flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-primary" /> Payment Gateway & Webhook Settings
                </CardTitle>
                <CardDescription>Configure Razorpay online payment gateway credentials and server-side webhook endpoint.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between rounded-2xl border p-4">
                  <div className="space-y-0.5">
                    <Label htmlFor="enableOnlinePayment" className="text-base font-bold">Enable Online Payments (Razorpay)</Label>
                    <p className="text-xs text-muted-foreground">
                      Allow customers and Hirers to pay using Razorpay (UPI, Credit/Debit Cards, NetBanking, Wallets).
                    </p>
                  </div>
                  <Switch
                    id="enableOnlinePayment"
                    name="enableOnlinePayment" 
                    checked={settings.enableOnlinePayment}
                    onCheckedChange={(checked) => handleSwitchChange('enableOnlinePayment', checked)}
                    disabled={isSaving}
                  />
                </div>

                {settings.enableOnlinePayment && (
                  <div className="space-y-4 pl-4 border-l-2 border-primary ml-2 pt-2">
                    <div className="space-y-2">
                      <Label htmlFor="razorpayKeyId" className="text-xs font-bold uppercase">Razorpay Key ID</Label>
                      <Input
                        id="razorpayKeyId"
                        name="razorpayKeyId"
                        value={settings.razorpayKeyId}
                        onChange={handleInputChange}
                        placeholder="rzp_live_xxxxxxxxxxxxxx"
                        disabled={isSaving}
                        className="rounded-xl font-mono text-xs"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="razorpayKeySecret" className="text-xs font-bold uppercase">Razorpay Key Secret</Label>
                      <Input
                        id="razorpayKeySecret"
                        name="razorpayKeySecret"
                        type="password"
                        value={settings.razorpayKeySecret}
                        onChange={handleInputChange}
                        placeholder="••••••••••••••••••••••"
                        disabled={isSaving}
                        className="rounded-xl font-mono text-xs"
                      />
                    </div>

                    {/* Razorpay Webhook Configuration */}
                    <div className="pt-4 border-t space-y-4">
                      <h4 className="text-sm font-bold flex items-center gap-2 text-primary">
                        <Webhook className="w-4 h-4" /> Razorpay Server-side Webhook Configuration
                      </h4>
                      
                      <div className="space-y-2">
                        <Label htmlFor="razorpayWebhookSecret" className="text-xs font-bold uppercase">Razorpay Webhook Secret ID</Label>
                        <Input
                          id="razorpayWebhookSecret"
                          name="razorpayWebhookSecret"
                          type="password"
                          value={settings.razorpayWebhookSecret || ''}
                          onChange={handleInputChange}
                          placeholder="Enter your Webhook Secret ID set in Razorpay Dashboard"
                          disabled={isSaving}
                          className="rounded-xl font-mono text-xs"
                        />
                        <p className="text-[11px] text-muted-foreground">
                          Secret key created when adding the Webhook in your Razorpay Dashboard. Used for server-side HMAC validation.
                        </p>
                      </div>

                      <div className="space-y-2 p-4 bg-muted/40 border border-primary/20 rounded-2xl">
                        <Label className="text-xs font-bold uppercase text-primary">Generated Webhook URL (For Razorpay Dashboard)</Label>
                        <div className="flex gap-2 items-center">
                          <Input
                            readOnly
                            value={webhookUrl}
                            className="rounded-xl font-mono text-xs bg-background"
                          />
                          <Button 
                            onClick={handleCopyWebhookUrl}
                            variant="outline"
                            className="rounded-xl font-bold shrink-0 gap-1"
                          >
                            {copiedWebhookUrl ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                            {copiedWebhookUrl ? "Copied" : "Copy URL"}
                          </Button>
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-1">
                          Copy this URL and paste it into <strong>Razorpay Dashboard &gt; Settings &gt; Webhooks</strong>. Select events: <code className="bg-background px-1 rounded">payment.captured</code>, <code className="bg-background px-1 rounded">order.paid</code>, <code className="bg-background px-1 rounded">payment.failed</code>.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
              <CardFooter className="border-t px-6 py-4">
                <Button onClick={() => handleSaveSettings("Payment")} disabled={isSaving} className="rounded-xl font-bold gap-2">
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Save Payment & Webhook Settings
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
          
          {/* --- TAB 3: ARTIST SETTINGS --- */}
          <TabsContent value="artist">
            <Card className="border rounded-3xl shadow-sm">
              <CardHeader>
                <CardTitle className="text-xl font-bold flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary" /> Artist Settings
                </CardTitle>
                <CardDescription>Configurations related to service Artists.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="maxArtistRadiusKm" className="text-xs font-bold uppercase">Max Artist Service Radius (km)</Label>
                  <Input
                    id="maxArtistRadiusKm"
                    name="maxArtistRadiusKm"
                    type="number"
                    value={settings.maxArtistRadiusKm}
                    onChange={handleInputChange}
                    placeholder="e.g., 30"
                    disabled={isSaving}
                    min="1"
                    className="rounded-xl font-bold"
                  />
                  <p className="text-xs text-muted-foreground">Sets the maximum service radius an Artist can select during registration.</p>
                </div>
              </CardContent>
              <CardFooter className="border-t px-6 py-4">
                <Button onClick={() => handleSaveSettings("Artist")} disabled={isSaving} className="rounded-xl font-bold gap-2">
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Save Artist Settings
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </TooltipProvider>
  );
}
