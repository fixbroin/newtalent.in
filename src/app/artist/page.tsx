"use client";

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Briefcase, CheckCircle, Clock, Loader2, User, Calendar, Phone, ArrowRight, TrendingUp, UserPlus, MessageSquare, Star, UserCheck, Sparkles } from "lucide-react";
import type { ConnectionRequest } from '@/types/firestore';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, orderBy, Timestamp, addDoc, getDocs, limit } from "firebase/firestore";
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { useLoading } from '@/contexts/LoadingContext';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

const StatCard = ({ title, value, icon: Icon, colorClass, delay }: { title: string, value: string | number, icon: any, colorClass: string, delay: string }) => (
  <Card className="border-none shadow-sm bg-card/50 backdrop-blur-sm overflow-hidden group hover:shadow-md transition-all duration-300">
    <div className={cn("h-1 w-full", colorClass)} />
    <CardContent className="p-4 flex items-center justify-between">
      <div>
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{title}</p>
        <h3 className="text-2xl font-black mt-1">{value}</h3>
      </div>
      <div className={cn("p-2.5 rounded-xl bg-muted group-hover:scale-110 transition-transform duration-300", colorClass.replace('bg-', 'text-'))}>
        <Icon className="h-5 w-5" />
      </div>
    </CardContent>
  </Card>
);

export default function ArtistDashboardPage() {
  const { user: artistUser, firestoreUser, isLoading: authIsLoading } = useAuth();
  const { toast } = useToast();
  const [connections, setConnections] = useState<ConnectionRequest[]>([]);
  const [isLoadingConnections, setIsLoadingConnections] = useState(true);

  useEffect(() => {
    if (!artistUser || authIsLoading) {
      if (!authIsLoading && !artistUser) {
        setIsLoadingConnections(false);
      }
      return;
    }
    
    // Fetch Connection Requests
    setIsLoadingConnections(true);
    const qConnections = query(
      collection(db, "connectionRequests"),
      where("receiverId", "==", artistUser.uid)
    );

    const unsubscribeConnections = onSnapshot(qConnections, (snapshot) => {
      setConnections(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as ConnectionRequest)));
      setIsLoadingConnections(false);
    }, (error) => {
      console.error("Error fetching connection requests:", error);
      setIsLoadingConnections(false);
    });

    return () => {
      unsubscribeConnections();
    };
  }, [artistUser, authIsLoading]);

  const pendingConnections = useMemo(() => connections.filter(c => c.status === 'pending'), [connections]);
  const acceptedConnections = useMemo(() => connections.filter(c => c.status === 'accepted'), [connections]);

  if (authIsLoading || isLoadingConnections) {
    return (
      <div className="flex flex-col justify-center items-center h-[60vh] space-y-4">
        <div className="relative h-16 w-16">
          <Loader2 className="h-16 w-16 animate-spin text-primary" />
          <User className="h-6 w-6 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
        </div>
        <p className="text-muted-foreground font-medium animate-pulse">Syncing your dashboard...</p>
      </div>
    );
  }

  const artistFirstName = artistUser?.displayName?.split(' ')[0] || "Artist";

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-700">
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <Badge variant="outline" className="mb-2 px-3 py-1 border-primary/20 text-primary bg-primary/5 rounded-full font-bold">
            <TrendingUp className="h-3 w-3 mr-1.5" /> ARTIST DASHBOARD
          </Badge>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-foreground">
            Welcome back, <span className="text-primary">{artistFirstName}!</span>
          </h1>
          <p className="text-muted-foreground mt-1 font-medium">Manage your profile and connections with talent seekers.</p>
        </div>
        <div className="flex gap-2">
            <Button variant="outline" size="sm" asChild className="rounded-full font-bold border-muted-foreground/20">
            <Link href="/artist/profile"><User className="mr-2 h-4 w-4" /> Edit Profile</Link>
            </Button>
            <Button size="sm" asChild className="rounded-full font-bold shadow-lg shadow-primary/20">
            <Link href={`/${firestoreUser?.username || ''}`}><ArrowRight className="mr-2 h-4 w-4" /> View Public Profile</Link>
            </Button>
        </div>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="New Requests" value={pendingConnections.length} icon={UserPlus} colorClass="bg-primary" delay="0" />
        <StatCard title="Total Connections" value={acceptedConnections.length} icon={MessageSquare} colorClass="bg-purple-500" delay="50ms" />
        <StatCard title="Profile Views" value={0} icon={TrendingUp} colorClass="bg-blue-500" delay="100ms" />
        <StatCard title="My Rating" value="5.0" icon={Star} colorClass="bg-yellow-500" delay="200ms" />
      </div>

      <Separator className="bg-muted/50" />

      {/* Connection Requests Section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-black flex items-center gap-2">
            <div className="h-8 w-1.5 rounded-full bg-purple-500" />
            Pending Connection Requests
            <Badge className="ml-2 bg-purple-500/10 text-purple-500 border-none font-bold">{pendingConnections.length}</Badge>
          </h2>
          {pendingConnections.length > 0 && (
            <Button variant="ghost" size="sm" asChild className="text-purple-600 hover:text-purple-700 hover:bg-purple-50 font-bold">
              <Link href="/artist/connections">View All <ArrowRight className="ml-1 h-4 w-4" /></Link>
            </Button>
          )}
        </div>
        {pendingConnections.length > 0 ? (
          <div className="grid gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
            {pendingConnections.slice(0, 3).map((conn) => (
              <Card key={conn.id} className="border-none shadow-md bg-card/50 backdrop-blur-sm overflow-hidden group">
                <div className="h-1 w-full bg-purple-500" />
                <CardHeader className="p-4 pb-2">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 font-bold">
                      {conn.senderName.charAt(0)}
                    </div>
                    <div>
                      <CardTitle className="text-sm font-bold">{conn.senderName}</CardTitle>
                      <CardDescription className="text-[10px]">Wants to connect with you</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardFooter className="p-4 pt-0">
                  <Button size="sm" className="w-full bg-purple-600 hover:bg-purple-700" asChild>
                    <Link href="/artist/connections">Review Request</Link>
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 px-6 text-center border-2 border-dashed rounded-3xl bg-muted/5">
            <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <UserCheck className="h-8 w-8 text-muted-foreground/30" />
            </div>
            <h3 className="text-lg font-bold">No pending requests</h3>
            <p className="text-sm text-muted-foreground max-w-xs mx-auto">When talent seekers want to connect with you, they will appear here.</p>
          </div>
        )}
      </section>

      {/* Quick Tips / Engagement Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-8">
          <Card className="border-none bg-primary/5 shadow-sm overflow-hidden">
              <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2"><Sparkles className="h-5 w-5 text-primary" /> Profile Tip</CardTitle>
              </CardHeader>
              <CardContent>
                  <p className="text-sm text-muted-foreground">Keep your portfolio updated with your latest work to increase your chances of being discovered by top recruiters.</p>
              </CardContent>
              <CardFooter>
                  <Button variant="link" asChild className="p-0 h-auto font-bold text-primary"><Link href="/artist/profile">Update Portfolio →</Link></Button>
              </CardFooter>
          </Card>

          <Card className="border-none bg-purple-500/5 shadow-sm overflow-hidden">
              <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2"><MessageSquare className="h-5 w-5 text-purple-500" /> Active Connections</CardTitle>
              </CardHeader>
              <CardContent>
                  <p className="text-sm text-muted-foreground">You have {acceptedConnections.length} active connections. Check your inbox for new messages and collaboration opportunities.</p>
              </CardContent>
              <CardFooter>
                  <Button variant="link" asChild className="p-0 h-auto font-bold text-purple-600"><Link href="/artist/connections">View Connections →</Link></Button>
              </CardFooter>
          </Card>
      </div>
    </div>
  );
}
