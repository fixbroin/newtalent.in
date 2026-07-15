
"use client";

import type { PropsWithChildren } from 'react';
import React, { Suspense, useEffect, useState, useRef, useCallback } from 'react'; // Added useRef, useCallback
import { usePathname, useRouter } from 'next/navigation';
import {
  SidebarProvider,
  Sidebar,
  SidebarContent,
  SidebarTrigger,
  SidebarInset,
} from '@/components/ui/sidebar';
import ArtistSidebarContent from '@/components/artist/ArtistSidebarContent';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import Logo from '@/components/shared/Logo';
import { useAuth } from '@/hooks/useAuth';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from '@/components/ui/button';
import { UserCircle, KeyRound, LogOut, Loader2, Bell, ChevronDown } from 'lucide-react';
import { auth, db } from '@/lib/firebase'; 
import { sendPasswordResetEmail } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { useLoading } from '@/contexts/LoadingContext';
import ThemeToggle from '@/components/shared/ThemeToggle';
import { doc, getDoc, collection, query, where, onSnapshot, orderBy, limit, Timestamp, updateDoc } from 'firebase/firestore';
import type { ArtistApplication, FirestoreNotification } from '@/types/firestore';
import { useUnreadNotificationsCount } from '@/hooks/useUnreadNotificationsCount'; 
import { useGlobalSettings } from '@/hooks/useGlobalSettings'; 
import ArtistBottomNavigationBar from '@/components/artist/ArtistBottomNavigationBar'; 
import { useIsMobile } from '@/hooks/use-mobile'; 
import { cn } from '@/lib/utils';

const ArtistPageLoader = () => (
  <div className="flex justify-center items-center min-h-[calc(100vh-120px)]">
    <Loader2 className="h-10 w-10 animate-spin text-primary" />
    <p className="ml-2 text-muted-foreground">Loading Artist Panel...</p>
  </div>
);

const ARTIST_APPLICATION_COLLECTION = "ArtistApplications";

export default function ArtistLayout({ children }: PropsWithChildren) {
  const { user: artistUser, isLoading: authIsLoading, logOut: handleLogoutAuth } = useAuth();
  const { toast } = useToast();
  const pathname = usePathname();
  const router = useRouter();
  const { showLoading, hideLoading } = useLoading();
  const [isArtistApproved, setIsArtistApproved] = useState<boolean | null>(() => {
    if (typeof window !== 'undefined') {
      const cached = sessionStorage.getItem(`artist_approved_${artistUser?.uid}`);
      return cached === 'true' ? true : cached === 'false' ? false : null;
    }
    return null;
  });
  const [isCheckingApproval, setIsCheckingApproval] = useState(false); 

  const { count: unreadArtistNotificationsCount, isLoading: isLoadingArtistNotifications } = useUnreadNotificationsCount(artistUser?.uid); 
  const { settings: globalSettings, isLoading: isLoadingGlobalSettings } = useGlobalSettings();
  const artistNotificationAudioRef = useRef<HTMLAudioElement | null>(null);
  const artistOrderAudioRef = useRef<HTMLAudioElement | null>(null); // Added for order sound
  const previousArtistUnreadCountRef = useRef<number>(0);
  const isMobile = useIsMobile(); 

  useEffect(() => {
    // Dynamically update manifest
    const manifestLink = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
    if (manifestLink) {
      manifestLink.href = '/manifest-artist.json';
    } else {
      const newManifestLink = document.createElement('link');
      newManifestLink.rel = 'manifest';
      newManifestLink.href = '/manifest-artist.json';
      document.head.appendChild(newManifestLink);
    }
  }, []);
  const handleChangePassword = async () => {
    if (artistUser && artistUser.email) {
      try {
        await sendPasswordResetEmail(auth, artistUser.email);
        toast({ title: "Password Reset Email Sent", description: "Check your inbox for a password reset link." });
      } catch (error: any) {
        toast({ title: "Error", description: error.message || "Could not send password reset email.", variant: "destructive" });
      }
    } else {
      toast({ title: "Error", description: "Artist email not found.", variant: "destructive" });
    }
  };

  const navigateToArtistNotifications = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    showLoading();
    router.push('/artist/notifications'); 
  };

  useEffect(() => {
    return () => {
      hideLoading();
    };
  }, [pathname, artistUser, hideLoading]);

  if (pathname === '/artist/login') {
    return <>{children}</>;
  }

  if (authIsLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-3 text-muted-foreground">Loading Artist Panel...</p>
      </div>
    );
  }

  if (artistUser && (isCheckingApproval || isArtistApproved === null)) {
     return (
        <div className="flex justify-center items-center min-h-screen bg-background">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="ml-3 text-muted-foreground">Verifying artist status...</p>
        </div>
      );
  }
  
  return (
    <ProtectedRoute>
      <div className="flex flex-col min-h-screen">
        <SidebarProvider defaultOpen={true}>
          <Sidebar collapsible="icon" variant="sidebar" className="border-r bg-card text-card-foreground">
            <ArtistSidebarContent />
          </Sidebar>
          <SidebarInset className="bg-muted/30 overflow-x-hidden flex-grow">
            <header className="bg-background/95 backdrop-blur-xl sticky top-0 z-40 border-b border-border/40 transition-all duration-300 h-16 flex items-center justify-between px-4 sm:px-6">
              <div className="flex items-center gap-3">
                <SidebarTrigger className="hidden md:inline-flex text-muted-foreground hover:text-primary transition-colors" />
                <div className="md:hidden flex items-center">
                   <SidebarTrigger className="mr-2 text-muted-foreground hover:text-primary" />
                   <Logo logoUrl={globalSettings?.logoUrl} websiteName={globalSettings?.websiteName} size="normal" />
                </div>
                <h1 className="hidden sm:block text-lg font-bold tracking-tight">Artist Panel</h1>
              </div>

              <div className="flex items-center gap-2">
                <ThemeToggle />
                
                {artistUser && isArtistApproved && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="relative rounded-full bg-muted/50 hover:bg-primary hover:text-primary-foreground shadow-none h-10 w-10 transition-all duration-300"
                    aria-label="Artist Notifications"
                    onClick={navigateToArtistNotifications}
                  >
                    <Bell className="h-5 w-5" />
                    {!isLoadingArtistNotifications && unreadArtistNotificationsCount > 0 && (
                      <span className="absolute top-0 right-0 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white border-2 border-background">
                        {unreadArtistNotificationsCount > 9 ? '9+' : unreadArtistNotificationsCount}
                      </span>
                    )}
                  </Button>
                )}

                {artistUser && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="relative flex items-center gap-2.5 h-11 px-2 pr-3 rounded-full border border-border/40 bg-card hover:bg-muted/50 hover:border-primary/20 transition-all duration-300 shadow-sm group">
                        <Avatar className="h-8 w-8 border-2 border-primary/20 group-hover:border-primary transition-colors">
                          <AvatarImage src={artistUser.photoURL || undefined} alt={artistUser.displayName || artistUser.email || "Artist"} />
                          <AvatarFallback className="bg-primary/10 text-primary font-bold">
                            {artistUser.email ? artistUser.email[0].toUpperCase() : <UserCircle size={20} />}
                          </AvatarFallback>
                        </Avatar>
                        <div className="hidden lg:flex flex-col items-start leading-none gap-1">
                           <span className="text-xs font-bold truncate max-w-[100px]">{artistUser.displayName || "Artist"}</span>
                           <span className="text-[9px] font-medium text-muted-foreground uppercase tracking-widest">Technician</span>
                        </div>
                        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-64 mt-2 rounded-2xl p-2 shadow-2xl border-border/40" align="end" forceMount>
                      <DropdownMenuLabel className="font-normal p-4">
                        <div className="flex flex-col space-y-2">
                          <p className="text-base font-bold leading-none">{artistUser.displayName || "Artist"}</p>
                          <p className="text-xs leading-none text-muted-foreground truncate">
                            {artistUser.email}
                          </p>
                        </div>
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator className="mx-2" />
                      <div className="py-2">
                        <DropdownMenuItem asChild className="rounded-xl px-4 py-3 cursor-pointer">
                          <Link href="/artist/profile" onClick={() => showLoading()}>
                            <div className="bg-primary/10 p-2 rounded-lg mr-3 text-primary">
                              <UserCircle className="h-4 w-4" />
                            </div>
                            <span className="font-medium">Profile & Settings</span>
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={handleChangePassword} className="rounded-xl px-4 py-3 cursor-pointer">
                          <div className="bg-muted p-2 rounded-lg mr-3">
                            <KeyRound className="h-4 w-4" />
                          </div>
                          <span className="font-medium">Change Password</span>
                        </DropdownMenuItem>
                      </div>
                      <DropdownMenuSeparator className="mx-2" />
                      <DropdownMenuItem onClick={() => { showLoading(); handleLogoutAuth(); }} className="rounded-xl px-4 py-3 cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10">
                        <div className="bg-destructive/10 p-2 rounded-lg mr-3">
                          <LogOut className="h-4 w-4" />
                        </div>
                        <span className="font-medium">Sign out</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </header>
            <main className={cn("p-2 sm:p-4 md:p-2 relative", { "pb-20": isMobile })}>
              <Suspense fallback={<ArtistPageLoader />}>
                {children}
              </Suspense>
            </main>
          </SidebarInset>
          {isMobile && isArtistApproved && <ArtistBottomNavigationBar />}
        </SidebarProvider>
      </div>
    </ProtectedRoute>
  );
}

