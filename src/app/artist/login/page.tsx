"use client";

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import Logo from '@/components/shared/Logo';
import { Mail, KeyRound, Loader2, Phone, ArrowLeft, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { db, auth } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { useApplicationConfig } from '@/hooks/useApplicationConfig';
import { useGlobalSettings } from '@/hooks/useGlobalSettings';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { Separator } from '@/components/ui/separator';
import { RecaptchaVerifier, signInWithPhoneNumber, GoogleAuthProvider, signInWithPopup, signOut, type ConfirmationResult } from 'firebase/auth';
import Link from 'next/link';

const emailSchema = z.object({
  email: z.string().email({ message: "Invalid email address." }),
  password: z.string().min(1, { message: "Password is required." }),
});

const phoneSchema = z.object({
  phone: z.string().min(10, { message: "Phone number must be at least 10 digits." }),
});

const otpSchema = z.object({
  otp: z.string().length(6, { message: "OTP must be exactly 6 digits." }),
});

type EmailFormValues = z.infer<typeof emailSchema>;
type PhoneFormValues = z.infer<typeof phoneSchema>;
type OtpFormValues = z.infer<typeof otpSchema>;

const GoogleIcon = () => (
  <svg className="mr-2 h-4 w-4" viewBox="0 0 48 48">
    <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"></path>
    <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"></path>
    <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"></path>
    <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.088,5.571l6.19,5.238C44.434,36.336,48,30.836,48,24C48,22.659,47.862,21.35,47.611,20.083z"></path>
  </svg>
);

export default function ArtistLoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { config, isLoading: isLoadingConfig } = useApplicationConfig();
  const { settings: globalSettings, isLoading: isLoadingSettings } = useGlobalSettings();

  const [isArtistVerifying, setIsArtistVerifying] = useState(false);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [recaptchaVerifier, setRecaptchaVerifier] = useState<RecaptchaVerifier | null>(null);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [phoneFormStage, setPhoneFormStage] = useState<'phone' | 'otp'>('phone');
  const [fullPhoneNumberForDisplay, setFullPhoneNumberForDisplay] = useState('');

  const emailForm = useForm<EmailFormValues>({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: "", password: "" },
  });

  const phoneForm = useForm<PhoneFormValues>({
    resolver: zodResolver(phoneSchema),
    defaultValues: { phone: "" },
  });

  const otpForm = useForm<OtpFormValues>({
    resolver: zodResolver(otpSchema),
    defaultValues: { otp: "" },
  });

  const checkArtistApprovalAndRedirect = async (uid: string) => {
    setIsArtistVerifying(true);
    try {
      const docRef = doc(db, "ArtistApplications", uid);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists() && docSnap.data()?.status === 'approved') {
        toast({ title: "Welcome back!", description: "Successfully logged in to the Artist Panel." });
        const redirect = searchParams.get('redirect') || '/artist';
        router.push(redirect);
      } else {
        await signOut(auth);
        toast({
          title: "Access Denied",
          description: "Your Artist application is not approved yet. Please wait for admin approval.",
          variant: "destructive"
        });
      }
    } catch (err: any) {
      await signOut(auth);
      toast({
        title: "Verification Failed",
        description: err.message || "An error occurred while verifying your artist status.",
        variant: "destructive"
      });
    } finally {
      setIsArtistVerifying(false);
    }
  };

  const onEmailSubmit = async (data: EmailFormValues) => {
    setIsArtistVerifying(true);
    try {
      // Directly log in
      const { signInWithEmailAndPassword } = await import('firebase/auth');
      const userCredential = await signInWithEmailAndPassword(auth, data.email, data.password);
      await checkArtistApprovalAndRedirect(userCredential.user.uid);
    } catch (err: any) {
      toast({ title: "Login Failed", description: err.message || "Invalid credentials.", variant: "destructive" });
      setIsArtistVerifying(false);
    }
  };

  const setupRecaptcha = async (): Promise<RecaptchaVerifier> => {
    if (recaptchaVerifier) return recaptchaVerifier;
    const verifier = new RecaptchaVerifier(auth, 'recaptcha-container-artist', {
      size: 'invisible',
      callback: () => {}
    });
    setRecaptchaVerifier(verifier);
    return verifier;
  };

  const onPhoneSubmit = async (data: PhoneFormValues) => {
    setIsSendingOtp(true);
    const countryCode = config.defaultOtpCountryCode || '+91';
    const fullPhone = `${countryCode}${data.phone}`;
    setFullPhoneNumberForDisplay(fullPhone);
    try {
      const verifier = await setupRecaptcha();
      const result = await signInWithPhoneNumber(auth, fullPhone, verifier);
      setConfirmationResult(result);
      setPhoneFormStage('otp');
      toast({ title: "OTP Sent", description: `Verification code sent to ${fullPhone}` });
    } catch (err: any) {
      toast({ title: "OTP Failed", description: err.message || "Failed to send code.", variant: "destructive" });
    } finally {
      setIsSendingOtp(false);
    }
  };

  const onOtpSubmit = async (data: OtpFormValues) => {
    if (!confirmationResult) return;
    setIsVerifyingOtp(true);
    try {
      const userCredential = await confirmationResult.confirm(data.otp);
      await checkArtistApprovalAndRedirect(userCredential.user.uid);
    } catch (err: any) {
      toast({ title: "OTP Verification Failed", description: "Invalid code entered.", variant: "destructive" });
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  const onGoogleSubmit = async () => {
    setIsArtistVerifying(true);
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      await checkArtistApprovalAndRedirect(result.user.uid);
    } catch (err: any) {
      if (err.code !== 'auth/popup-closed-by-user') {
        toast({ title: "Google Sign-In Failed", description: err.message, variant: "destructive" });
      }
      setIsArtistVerifying(false);
    }
  };

  const handlePhoneInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const prefix = config.defaultOtpCountryCode || "+91";
    let value = e.target.value;
    if (!value.startsWith(prefix)) {
      value = prefix;
    }
    phoneForm.setValue('phone', value.substring(prefix.length));
    e.target.value = value;
  };

  const handlePhoneKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const prefix = config.defaultOtpCountryCode || "+91";
    const input = e.target as HTMLInputElement;
    if (e.key === 'Backspace' && (input.value === prefix || input.selectionStart! <= prefix.length)) {
      e.preventDefault();
    }
  };

  const enabledMethods = [
    config.enableEmailPasswordLogin && 'email',
    config.enableOtpLogin && 'otp'
  ].filter(Boolean) as ('email' | 'otp')[];
  const defaultTab = config.defaultLoginMethod === 'otp' ? 'otp' : 'email';

  return (
    <div className="min-h-screen flex items-center justify-center bg-secondary/30 p-4">
      <div id="recaptcha-container-artist"></div>
      <div className="w-full max-w-md">
        <Card className="shadow-xl border-primary/10">
          <CardHeader className="text-center">
            <Logo 
              className="mx-auto mb-4" 
              size="large"
              logoUrl={globalSettings?.logoUrl}
              websiteName={globalSettings?.websiteName}
            />
            <CardTitle className="text-2xl font-black tracking-tight">Artist Portal Login</CardTitle>
            <CardDescription>Approved cast & crew technicians only.</CardDescription>
          </CardHeader>

          {phoneFormStage === 'otp' ? (
            <CardContent>
              <Form {...otpForm}>
                <form onSubmit={otpForm.handleSubmit(onOtpSubmit)} className="space-y-4">
                  <p className="text-sm text-center text-muted-foreground">
                    Enter the 6-digit OTP code sent to {fullPhoneNumberForDisplay}
                  </p>
                  <FormField
                    control={otpForm.control}
                    name="otp"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <div className="flex justify-center">
                            <InputOTP maxLength={6} {...field} autoComplete="one-time-code">
                              <InputOTPGroup>
                                <InputOTPSlot index={0} />
                                <InputOTPSlot index={1} />
                                <InputOTPSlot index={2} />
                              </InputOTPGroup>
                              <InputOTPGroup>
                                <InputOTPSlot index={3} />
                                <InputOTPSlot index={4} />
                                <InputOTPSlot index={5} />
                              </InputOTPGroup>
                            </InputOTP>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full" disabled={isVerifyingOtp}>
                    {isVerifyingOtp && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Verify & Login
                  </Button>
                  <Button variant="link" size="sm" onClick={() => { setPhoneFormStage('phone'); otpForm.reset(); }} className="w-full">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Go Back
                  </Button>
                </form>
              </Form>
            </CardContent>
          ) : (
            <CardContent className="space-y-4">
              {config.enableGoogleLogin && (
                <>
                  <Button variant="outline" className="w-full h-11 border-primary/10 hover:bg-secondary/10" onClick={onGoogleSubmit} disabled={isArtistVerifying}>
                    <GoogleIcon /> Continue with Google
                  </Button>
                  {enabledMethods.length > 0 && (
                    <div className="relative my-4">
                      <Separator />
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-2 text-xs text-muted-foreground">OR</div>
                    </div>
                  )}
                </>
              )}

              {enabledMethods.length > 1 ? (
                <Tabs defaultValue={defaultTab} className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="email">Email</TabsTrigger>
                    <TabsTrigger value="otp">Phone OTP</TabsTrigger>
                  </TabsList>
                  <TabsContent value="email" className="pt-4">
                    <Form {...emailForm}>
                      <form onSubmit={emailForm.handleSubmit(onEmailSubmit)} className="space-y-4">
                        <FormField control={emailForm.control} name="email" render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center"><Mail className="inline mr-2 h-4 w-4 text-muted-foreground" />Email</FormLabel>
                            <FormControl><Input type="email" placeholder="you@example.com" {...field} disabled={isArtistVerifying} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )}/>
                        <FormField control={emailForm.control} name="password" render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center"><KeyRound className="inline mr-2 h-4 w-4 text-muted-foreground" />Password</FormLabel>
                            <FormControl><Input type="password" placeholder="••••••••" {...field} disabled={isArtistVerifying} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )}/>
                        <Button type="submit" className="w-full" disabled={isArtistVerifying}>
                          {isArtistVerifying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          Login with Email
                        </Button>
                      </form>
                    </Form>
                  </TabsContent>
                  <TabsContent value="otp" className="pt-4">
                    <Form {...phoneForm}>
                      <form onSubmit={phoneForm.handleSubmit(onPhoneSubmit)} className="space-y-4">
                        <FormField control={phoneForm.control} name="phone" render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center"><Phone className="inline mr-2 h-4 w-4 text-muted-foreground" />Phone Number</FormLabel>
                            <FormControl>
                              <Input 
                                type="tel" 
                                placeholder="Enter mobile number" 
                                onChange={handlePhoneInputChange} 
                                onKeyDown={handlePhoneKeyDown} 
                                defaultValue={config.defaultOtpCountryCode}
                                disabled={isSendingOtp}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}/>
                        <Button type="submit" className="w-full" disabled={isSendingOtp}>
                          {isSendingOtp && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          Send OTP
                        </Button>
                      </form>
                    </Form>
                  </TabsContent>
                </Tabs>
              ) : enabledMethods[0] === 'email' ? (
                <Form {...emailForm}>
                  <form onSubmit={emailForm.handleSubmit(onEmailSubmit)} className="space-y-4">
                    <FormField control={emailForm.control} name="email" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center"><Mail className="inline mr-2 h-4 w-4 text-muted-foreground" />Email</FormLabel>
                        <FormControl><Input type="email" placeholder="you@example.com" {...field} disabled={isArtistVerifying} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}/>
                    <FormField control={emailForm.control} name="password" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center"><KeyRound className="inline mr-2 h-4 w-4 text-muted-foreground" />Password</FormLabel>
                        <FormControl><Input type="password" placeholder="••••••••" {...field} disabled={isArtistVerifying} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}/>
                    <Button type="submit" className="w-full" disabled={isArtistVerifying}>
                      {isArtistVerifying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Login with Email
                    </Button>
                  </form>
                </Form>
              ) : enabledMethods[0] === 'otp' ? (
                <Form {...phoneForm}>
                  <form onSubmit={phoneForm.handleSubmit(onPhoneSubmit)} className="space-y-4">
                    <FormField control={phoneForm.control} name="phone" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center"><Phone className="inline mr-2 h-4 w-4 text-muted-foreground" />Phone Number</FormLabel>
                        <FormControl>
                          <Input 
                            type="tel" 
                            placeholder="Enter mobile number" 
                            onChange={handlePhoneInputChange} 
                            onKeyDown={handlePhoneKeyDown} 
                            defaultValue={config.defaultOtpCountryCode}
                            disabled={isSendingOtp}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}/>
                    <Button type="submit" className="w-full" disabled={isSendingOtp}>
                      {isSendingOtp && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Send OTP
                    </Button>
                  </form>
                </Form>
              ) : (
                <p className="text-center text-sm text-muted-foreground">No login methods are currently enabled. Please contact support.</p>
              )}
            </CardContent>
          )}

          <CardFooter className="flex flex-col gap-2 pt-4 border-t border-border/40 text-center">
            <p className="text-xs text-muted-foreground">
              Are you a client?{' '}
              <Link href="/auth/login" className="text-primary hover:underline font-bold">
                Go to User Login
              </Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
