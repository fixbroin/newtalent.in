"use client";

import React, { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  doc, 
  updateDoc, 
  deleteDoc,
  getDoc,
  Timestamp,
  addDoc,
  or
} from 'firebase/firestore';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MessageSquare, Check, X, Clock, UserCheck, UserX, Loader2, Send } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import Breadcrumbs from '@/components/shared/Breadcrumbs';
import type { ConnectionRequest, FirestoreNotification } from '@/types/firestore';
import { triggerPushNotification } from '@/lib/fcmUtils';
import { cn } from '@/lib/utils';
import { useApplicationConfig } from '@/hooks/useApplicationConfig';
import { sendConnectionAcceptedEmail } from '@/ai/flows/sendConnectionAcceptedEmailFlow';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function ConnectionsPage() {
  const { user, firestoreUser } = useAuth();
  const { config: appConfig } = useApplicationConfig();
  const { toast } = useToast();
  const router = useRouter();
  const [requests, setRequests] = useState<ConnectionRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [requestToCancel, setRequestToCancel] = useState<ConnectionRequest | null>(null);

  useEffect(() => {
    if (!user) return;

    // Query requests where the current user is either sender or receiver
    const q = query(
      collection(db, "connectionRequests"),
      or(
        where("receiverId", "==", user.uid),
        where("senderId", "==", user.uid)
      )
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedRequests = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as ConnectionRequest));
      
      // Sort by createdAt descending
      fetchedRequests.sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());
      
      setRequests(fetchedRequests);
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching requests:", error);
      toast({ title: "Error", description: "Failed to load requests.", variant: "destructive" });
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const handleStatusUpdate = async (request: ConnectionRequest, newStatus: 'accepted' | 'rejected') => {
    setProcessingId(request.id);
    try {
      const requestRef = doc(db, "connectionRequests", request.id);
      await updateDoc(requestRef, {
        status: newStatus,
        updatedAt: Timestamp.now()
      });

      // Send notification to the sender
      const notificationData: any = {
        userId: request.senderId,
        title: `Request ${newStatus.charAt(0).toUpperCase() + newStatus.slice(1)}`,
        message: `${firestoreUser?.displayName || 'The artist'} has ${newStatus} your connection request.`,
        type: newStatus === 'accepted' ? 'success' : 'info',
        read: false,
        createdAt: Timestamp.now()
      };

      if (newStatus === 'accepted') {
        notificationData.href = `/chat?with=${user?.uid}`;
      }

      await addDoc(collection(db, "userNotifications"), notificationData);

      // Trigger Email Flow for Acceptance
      if (newStatus === 'accepted' && appConfig?.smtpHost) {
          let requestorEmail = request.senderEmail;
          let requestorName = request.senderName;

          // If email is missing (old request), try to fetch from user doc
          if (!requestorEmail) {
              try {
                  const senderDoc = await getDoc(doc(db, "users", request.senderId));
                  if (senderDoc.exists()) {
                      requestorEmail = senderDoc.data().email;
                  }
              } catch (e) { console.error("Error fetching sender email:", e); }
          }

          if (requestorEmail) {
              sendConnectionAcceptedEmail({
                  requestorName: requestorName || "User",
                  requestorEmail: requestorEmail,
                  artistName: firestoreUser?.displayName || "Artist",
                  smtpHost: appConfig.smtpHost,
                  smtpPort: appConfig.smtpPort,
                  smtpUser: appConfig.smtpUser,
                  smtpPass: appConfig.smtpPass,
                  senderEmail: appConfig.senderEmail,
                  siteName: appConfig.siteName,
                  logoUrl: appConfig.logoUrl,
              }).catch(err => console.error("Failed to send connection accepted email:", err));
          }
      }

      // Trigger Push Notification
      triggerPushNotification({
        userId: request.senderId,
        title: notificationData.title,
        body: notificationData.message,
        href: notificationData.href
      }).catch(err => console.error("Error sending push notification:", err));

      toast({ 
        title: `Request ${newStatus === 'accepted' ? 'Accepted' : 'Rejected'}`,
        description: `You have ${newStatus} the request from ${request.senderName}.`
      });
    } catch (error) {
      console.error(`Error ${newStatus} request:`, error);
      toast({ title: "Error", description: `Failed to ${newStatus} request.`, variant: "destructive" });
    } finally {
      setProcessingId(null);
    }
  };

  const handleCancelRequest = (request: ConnectionRequest) => {
    setRequestToCancel(request);
  };

  const confirmCancelRequest = async () => {
    if (!requestToCancel) return;
    const request = requestToCancel;
    setRequestToCancel(null);
    setProcessingId(request.id);
    try {
      const requestRef = doc(db, "connectionRequests", request.id);
      await deleteDoc(requestRef);
      toast({ 
        title: "Request Cancelled",
        description: `Your connection request to ${request.receiverName || 'Artist'} has been cancelled and deleted.`
      });
    } catch (error) {
      console.error("Error deleting connection request:", error);
      toast({ title: "Error", description: "Failed to cancel request.", variant: "destructive" });
    } finally {
      setProcessingId(null);
    }
  };

  const handleChat = (request: ConnectionRequest) => {
    const otherUserId = request.senderId === user?.uid ? request.receiverId : request.senderId;
    router.push(`/chat?with=${otherUserId}`);
  };

  const receivedRequests = requests.filter(r => r.receiverId === user?.uid);
  const sentRequests = requests.filter(r => r.senderId === user?.uid);
  
  const pendingReceived = receivedRequests.filter(r => r.status === 'pending');
  const pendingSent = sentRequests.filter(r => r.status === 'pending');
  const acceptedConnections = requests.filter(r => r.status === 'accepted');

  const RequestCard = ({ request, type }: { request: ConnectionRequest, type: 'sent' | 'received' }) => (
    <Card key={request.id} className="overflow-hidden transition-all hover:shadow-md border-muted/60">
      <CardContent className="p-5">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-12 w-12 border-2 border-primary/10">
              <AvatarFallback className="bg-primary/5 text-primary font-bold">
                {type === 'received' ? request.senderName.charAt(0) : request.receiverName?.charAt(0) || 'A'}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-bold text-lg leading-tight">
                  {type === 'received' ? request.senderName : request.receiverName || 'Artist'}
                </h4>
                {type === 'sent' && <Badge variant="secondary" className="text-[10px] py-0 h-4 uppercase">Sent</Badge>}
              </div>
              <p className="text-xs text-muted-foreground mt-1 flex items-center">
                <Clock className="w-3 h-3 mr-1" />
                {request.createdAt.toDate().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
              </p>
            </div>
          </div>
          <Badge variant={
            request.status === 'pending' ? 'destructive' : 
            request.status === 'accepted' ? 'default' : 'destructive'
          } className={cn(
            "capitalize py-1 px-3 rounded-full text-xs font-bold tracking-wide",
            request.status === 'accepted' && "bg-green-500 hover:bg-green-600",
            request.status === 'pending' && "bg-red-500 hover:bg-red-600 text-white"
          )}>
            {request.status}
          </Badge>
        </div>

        {type === 'received' && request.status === 'pending' && (
          <div className="flex gap-2 mt-6">
            <Button 
              className="flex-1 rounded-xl h-10 font-bold bg-primary hover:bg-primary/90"
              onClick={() => handleStatusUpdate(request, 'accepted')}
              disabled={!!processingId}
            >
              {processingId === request.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Check className="w-4 h-4 mr-2" /> Accept</>}
            </Button>
            <Button 
              variant="outline" 
              className="flex-1 rounded-xl h-10 font-bold border-destructive text-destructive hover:bg-destructive hover:text-white"
              onClick={() => handleStatusUpdate(request, 'rejected')}
              disabled={!!processingId}
            >
              <X className="w-4 h-4 mr-2" /> Reject
            </Button>
          </div>
        )}

        {request.status === 'accepted' && (
          <Button 
            className="w-full mt-6 rounded-xl h-10 font-bold"
            onClick={() => handleChat(request)}
          >
            <MessageSquare className="w-4 h-4 mr-2" /> Chat Now
          </Button>
        )}

        {type === 'sent' && request.status === 'pending' && (
           <div className="flex flex-col gap-2 mt-6">
              <div className="p-3 bg-muted/50 rounded-xl text-center">
                 <p className="text-xs font-medium text-muted-foreground italic">Waiting for artist to respond...</p>
              </div>
              <Button 
                variant="outline" 
                className="w-full rounded-xl h-10 font-bold border-destructive text-destructive hover:bg-destructive hover:text-white transition-all"
                onClick={() => handleCancelRequest(request)}
                disabled={processingId === request.id}
              >
                {processingId === request.id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <><UserX className="w-4 h-4 mr-2" /> Cancel Request</>
                )}
              </Button>
           </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <ProtectedRoute>
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <Breadcrumbs items={[
          { label: 'Home', href: '/' },
          { label: 'Connections' }
        ]} className="mb-6" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight">Connections</h1>
            <p className="text-muted-foreground mt-1">Manage your sent and received connection requests.</p>
          </div>
        </div>

        {/* Stats Summary Section */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="bg-primary/5 border-primary/10">
            <CardContent className="p-4 flex flex-col items-center justify-center">
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1 text-center">Total Sent</p>
              <p className="text-3xl font-black">{sentRequests.length}</p>
            </CardContent>
          </Card>
          <Card className="bg-primary/5 border-primary/10">
            <CardContent className="p-4 flex flex-col items-center justify-center">
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1 text-center">Total Received</p>
              <p className="text-3xl font-black">{receivedRequests.length}</p>
            </CardContent>
          </Card>
          <Card className="bg-amber-500/5 border-amber-500/10">
            <CardContent className="p-4 flex flex-col items-center justify-center text-amber-600">
              <p className="text-xs font-bold uppercase tracking-widest text-amber-600/60 mb-1 text-center">Pending</p>
              <p className="text-3xl font-black">
                {sentRequests.filter(r => r.status === 'pending').length + pendingReceived.length}
              </p>
            </CardContent>
          </Card>
          <Card className="bg-green-500/5 border-green-500/10">
            <CardContent className="p-4 flex flex-col items-center justify-center text-green-600">
              <p className="text-xs font-bold uppercase tracking-widest text-green-600/60 mb-1 text-center">Accepted</p>
              <p className="text-3xl font-black">
                {requests.filter(r => r.status === 'accepted').length}
              </p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="accepted" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-8 bg-muted/50 p-1 rounded-2xl h-14">
            <TabsTrigger value="accepted" className="rounded-xl font-bold h-12 data-[state=active]:bg-background data-[state=active]:shadow-sm">
              Accepted {acceptedConnections.length > 0 && (
                <Badge variant="secondary" className="ml-2 bg-green-500 text-white hover:bg-green-600 rounded-full">
                  {acceptedConnections.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="received" className="rounded-xl font-bold h-12 data-[state=active]:bg-background data-[state=active]:shadow-sm">
              Received {pendingReceived.length > 0 && (
                <Badge variant="destructive" className="ml-2 bg-red-500 text-white rounded-full">
                  {pendingReceived.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="sent" className="rounded-xl font-bold h-12 data-[state=active]:bg-background data-[state=active]:shadow-sm">
              Sent {pendingSent.length > 0 && (
                <Badge variant="outline" className="ml-2">
                  {pendingSent.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="accepted" className="space-y-6">
            {acceptedConnections.length > 0 ? (
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {acceptedConnections.map(r => {
                    const cardType = r.senderId === user?.uid ? 'sent' : 'received';
                    return <RequestCard key={r.id} request={r} type={cardType} />;
                  })}
               </div>
            ) : (
              <div className="text-center py-20 bg-muted/20 rounded-3xl border-2 border-dashed">
                <UserCheck className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-bold">No Connections Yet</h3>
                <p className="text-muted-foreground">Once connection requests are accepted, they will appear here.</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="received" className="space-y-6">
             <div className="space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground ml-1">Received Requests</h3>
                {isLoading ? (
                  <div className="flex justify-center py-10"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
                ) : pendingReceived.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {pendingReceived.map(r => <RequestCard key={r.id} request={r} type="received" />)}
                  </div>
                ) : (
                  <div className="text-center py-12 bg-muted/10 rounded-3xl border border-dashed">
                    <UserCheck className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
                    <p className="text-muted-foreground text-sm">No new requests to show.</p>
                  </div>
                )}
             </div>
          </TabsContent>

          <TabsContent value="sent" className="space-y-6">
            {pendingSent.length > 0 ? (
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {pendingSent.map(r => <RequestCard key={r.id} request={r} type="sent" />)}
               </div>
            ) : (
              <div className="text-center py-20 bg-muted/20 rounded-3xl border-2 border-dashed">
                <Send className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-bold">No Pending Sent Requests</h3>
                <p className="text-muted-foreground">When you request to connect with artists, they'll show up here.</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
        {/* Custom Confirmation Dialog for Cancellation */}
        <AlertDialog open={!!requestToCancel} onOpenChange={(open) => !open && setRequestToCancel(null)}>
          <AlertDialogContent className="rounded-2xl max-w-sm p-6 w-[calc(100%-2rem)] mx-auto">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-xl font-bold flex items-center gap-2">
                <UserX className="h-5 w-5 text-destructive" />
                Cancel Request?
              </AlertDialogTitle>
              <AlertDialogDescription className="text-muted-foreground text-sm mt-2">
                Are you sure you want to cancel and delete your connection request to <strong>{requestToCancel?.receiverName || 'Artist'}</strong>? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="mt-6 flex flex-row gap-2 sm:gap-0 justify-end">
              <AlertDialogCancel className="rounded-xl flex-1 font-bold border-muted-foreground/20 hover:bg-muted">
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction 
                onClick={confirmCancelRequest} 
                className="rounded-xl flex-1 font-bold bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete Request
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </ProtectedRoute>
  );
}
