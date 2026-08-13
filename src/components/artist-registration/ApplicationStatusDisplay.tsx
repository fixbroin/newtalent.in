
"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, XCircle, Clock, AlertTriangle, Home } from 'lucide-react';
import type { ArtistApplicationStatus } from '@/types/firestore';

interface ApplicationStatusDisplayProps {
  status: ArtistApplicationStatus | 'approved' | 'rejected' | 'pending_review';
  message?: string; // For 'rejected' or 'needs_update'
}

export default function ApplicationStatusDisplay({ status, message }: ApplicationStatusDisplayProps) {
  let IconComponent;
  let titleText;
  let descriptionText;
  let cardVariant: "default" | "destructive" | "warning" = "default";

  switch (status) {
    case 'approved':
      IconComponent = CheckCircle2;
      titleText = "Application Approved!";
      descriptionText = "Congratulations! Your artist application has been approved. You can now access your profile.";
      cardVariant = "default";
      break;
    case 'rejected':
      IconComponent = XCircle;
      titleText = "Application Status";
      descriptionText = "We regret to inform you that your application could not be approved at this time.";
      cardVariant = "destructive";
      break;
    case 'pending_review':
      IconComponent = Clock;
      titleText = "Application Under Review";
      descriptionText = "Your application has been submitted and is currently under review. We will notify you once it's processed.";
      cardVariant = "default";
      break;
    case 'needs_update':
      IconComponent = AlertTriangle;
      titleText = "Application Needs Update";
      descriptionText = "There are some updates required for your application. Please review the comments and resubmit.";
      cardVariant = "warning";
      break;
    default: // Should not happen if status is properly managed
      IconComponent = AlertTriangle;
      titleText = "Unknown Application Status";
      descriptionText = "There was an issue determining your application status. Please contact support.";
      cardVariant = "warning";
  }

  return (
    <Card className={`text-center border-${cardVariant === 'destructive' ? 'destructive' : cardVariant === 'warning' ? 'yellow-500' : 'primary'} shadow-md`}>
      <CardHeader className="items-center">
        <IconComponent className={`h-16 w-16 mb-4 ${
          status === 'approved' ? 'text-green-500' :
          status === 'rejected' ? 'text-destructive' :
          status === 'pending_review' ? 'text-blue-500' :
          status === 'needs_update' ? 'text-yellow-500' : 'text-muted-foreground'
        }`} />
        <CardTitle className="text-2xl font-headline">{titleText}</CardTitle>
      </CardHeader>
      <CardContent>
        <CardDescription className="text-md text-muted-foreground">
          {descriptionText}
        </CardDescription>
        {message && (status === 'rejected' || status === 'needs_update') && (
          <div className="mt-4 p-3 bg-muted/50 border border-dashed rounded-md text-sm text-left">
            <p className="font-semibold mb-1">Admin Feedback:</p>
            <p className="whitespace-pre-wrap">{message}</p>
          </div>
        )}
        <div className="mt-8 flex flex-col gap-3">
          {status === 'approved' && (
            <>
              <div className="my-3 p-4 rounded-2xl bg-green-500/5 border border-green-500/10 text-left space-y-1.5">
                <h4 className="text-[11px] font-black uppercase text-green-600 tracking-widest">
                  🚀 Complete Your Artist Profile
                </h4>
                <p className="text-xs text-muted-foreground leading-normal">
                  To get maximum exposure to casting directors and producers, go to your profile settings to link your social media handles, add work certificates, and configure visibility preferences!
                </p>
              </div>
              <Link href="/profile" className="w-full"> 
                <Button size="lg" className="w-full font-bold rounded-xl bg-green-600 text-white hover:bg-green-700">Go to Profile</Button>
              </Link>
            </>
          )}
          {status === 'pending_review' && (
            <>
              <div className="my-3 p-4 rounded-2xl bg-primary/5 border border-primary/10 text-left space-y-1.5">
                <h4 className="text-[11px] font-black uppercase text-primary tracking-widest">
                  💡 Complete Your Profile Setup
                </h4>
                <p className="text-xs text-muted-foreground leading-normal">
                  While our admins review your registration, you can already link your social media profiles, upload course certificates, and configure mobile/email privacy settings!
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <Link href="/profile" className="flex-1">
                  <Button size="lg" className="w-full font-bold rounded-xl bg-primary text-white hover:bg-primary/90">
                    Set Up Profile Settings
                  </Button>
                </Link>
                <Link href="/" className="flex-1">
                  <Button variant="outline" size="lg" className="w-full font-bold rounded-xl">
                    <Home className="mr-2 h-5 w-5" /> Back to Home
                  </Button>
                </Link>
              </div>
            </>
          )}
          {status !== 'approved' && status !== 'pending_review' && (
            <Link href="/" className="w-full">
              <Button variant="outline" size="lg" className="w-full font-bold rounded-xl">
                <Home className="mr-2 h-5 w-5" /> Back to Home
              </Button>
            </Link>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
