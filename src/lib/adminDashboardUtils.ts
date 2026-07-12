// src/lib/adminDashboardUtils.ts
'use server';

import { adminDb } from './firebaseAdmin';
import { unstable_cache, revalidateTag } from 'next/cache';
import { Timestamp } from 'firebase-admin/firestore';
import type { FirestoreBooking, FirestoreUser, FirestoreService, UserActivity } from '@/types/firestore';
import { serializeFirestoreData } from './serializeUtils';

export interface DashboardData {
  stats: {
    totalRevenue: number;
    activeArtists: number;
    activeUsers: number;
    newSignups: number;
    totalConnections: number;
  };
  analytics: {
    topCategories: any[];
    topSearchTerms: { term: string; count: number }[];
  };
  recentActivities: any[];
}

export const getDashboardData = unstable_cache(
  async (ArtistFeeType?: string, ArtistFeeValue?: number): Promise<DashboardData> => {
    try {
      // 1. Fetch Aggregate Stats (1 read)
      const statsDoc = await adminDb.collection('appConfiguration').doc('stats').get();
      const systemStats = statsDoc.exists ? statsDoc.data() : null;

      let totalRevenue = systemStats?.totalRevenue || 0;
      let totalConnections = systemStats?.totalConnections || 0;
      let activeUsers = systemStats?.totalUsers || 0;
      let activeArtists = systemStats?.totalArtists || 0;
      let newSignups = systemStats?.newSignups30d || 0;

      // 2. Fetch recent search activities
      const [searchActivitiesSnap, persistentSearchSnap] = await Promise.all([
        adminDb.collection('userActivities').where('eventType', '==', 'search').limit(100).get(),
        adminDb.collection('searchAnalytics').limit(100).get()
      ]);

      // If stats don't exist yet, we do a one-time scan to initialize them
      if (!systemStats) {
        console.log("Dashboard stats missing, performing full scan to initialize...");
        const [usersSnap, connectionsSnap, subsSnap] = await Promise.all([
          adminDb.collection('users').get(),
          adminDb.collection('connectionRequests').get(),
          adminDb.collection('userSubscriptions').get()
        ]);

        totalRevenue = 0;
        subsSnap.forEach(doc => {
            // In a real app, you'd fetch plan price or store it in userSubscriptions
            // For now let's assume we store 'amount' in userSubscriptions if we implemented it fully
            const data = doc.data();
            totalRevenue += (data.amount || 0); 
        });

        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        activeUsers = 0;
        activeArtists = 0;
        newSignups = 0;
        usersSnap.forEach(doc => {
          const data = doc.data() as FirestoreUser;
          if (data.isActive) activeUsers++;
          if (data.roles?.includes('artist')) activeArtists++;
          if (data.createdAt && data.createdAt.toDate() >= thirtyDaysAgo) newSignups++;
        });
        totalConnections = connectionsSnap.size;

        // Initialize the stats document
        adminDb.collection('appConfiguration').doc('stats').set({
          totalConnections,
          totalRevenue,
          totalUsers: usersSnap.size,
          totalArtists: activeArtists,
          newSignups30d: newSignups,
          updatedAt: Timestamp.now()
        }).catch(e => console.error("Error initializing stats:", e));
      }

      // 3. Analytics: Top Categories (By artist count)
      const categoriesSnap = await adminDb.collection('adminCategories').where('isActive', '==', true).get();
      const artistsSnap = await adminDb.collection('ArtistApplications').where('status', '==', 'approved').get();
      
      const categoryCounts: { [key: string]: number } = {};
      artistsSnap.forEach(doc => {
          const data = doc.data();
          if (data.workCategoryId) {
              categoryCounts[data.workCategoryId] = (categoryCounts[data.workCategoryId] || 0) + 1;
          }
      });

      const topCategories = categoriesSnap.docs.map(doc => {
          const data = doc.data();
          return {
              id: doc.id,
              name: data.name,
              count: categoryCounts[doc.id] || 0
          };
      }).sort((a, b) => b.count - a.count).slice(0, 10);

      // 4. Analytics: Search Hotspots
      const searchCounts: { [key: string]: number } = {};
      searchActivitiesSnap.forEach(doc => {
        const term = doc.data().eventData?.searchQuery?.toLowerCase().trim();
        if (term) searchCounts[term] = (searchCounts[term] || 0) + 1;
      });
      persistentSearchSnap.forEach(doc => {
        const term = doc.data().term?.toLowerCase().trim();
        if (term) searchCounts[term] = (searchCounts[term] || 0) + 1;
      });
      const topSearchTerms = Object.entries(searchCounts)
        .sort(([, a], [, b]) => b - a)
        .map(([term, count]) => ({ term, count }))
        .slice(0, 20);

      // 5. Recent Activities
      const [recentConnections, recentUsers] = await Promise.all([
        adminDb.collection('connectionRequests').orderBy('createdAt', 'desc').limit(5).get(),
        adminDb.collection('users').orderBy('createdAt', 'desc').limit(5).get()
      ]);

      const activities = [
        ...recentConnections.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            type: 'new_connection',
            timestamp: serializeFirestoreData<string>(data.createdAt),
            title: 'New Connection Request',
            description: `${data.senderName} → ${data.receiverName}`,
            href: `/admin/chat`, // Or direct to a connections view if you have one
          };
        }),
        ...recentUsers.docs.map(doc => {
          const data = doc.data() as FirestoreUser;
          return {
            id: doc.id,
            type: 'new_user_signup',
            timestamp: serializeFirestoreData<string>(data.createdAt),
            title: 'New User Signup',
            description: `${data.displayName || data.email}`,
            href: `/admin/users`,
          };
        })
      ].sort((a, b) => new Date(b.timestamp as string).getTime() - new Date(a.timestamp as string).getTime()).slice(0, 7);

      return serializeFirestoreData<DashboardData>({
        stats: {
          totalRevenue,
          totalConnections,
          activeUsers,
          activeArtists,
          newSignups
        },
        analytics: {
          topCategories,
          topSearchTerms
        },
        recentActivities: activities
      });
    } catch (error) {
      console.error("Error in getDashboardData:", error);
      throw error;
    }
  },
  ['admin-dashboard-stats'],
  { revalidate: 31536000, tags: ['admin-stats', 'global-cache'] }
);

export const getArchivedBookings = unstable_cache(
  async (): Promise<FirestoreBooking[]> => {
    try {
      const q = adminDb.collection('bookings').orderBy('createdAt', 'desc');
      
      const offset = 10;
      const snapshot = await q.offset(offset).limit(50).get();
      
      return serializeFirestoreData(snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      } as FirestoreBooking)));
    } catch (error) {
      console.error("Error in getArchivedBookings:", error);
      return [];
    }
  },
  ['archived-bookings', 'bookings'],
  { revalidate: 31536000, tags: ['bookings', 'global-cache'] } // Lifetime cache
);

export const getArchivedUsers = unstable_cache(
  async (): Promise<FirestoreUser[]> => {
    try {
      const q = adminDb.collection('users').orderBy('createdAt', 'desc');
      
      const offset = 20;
      const snapshot = await q.offset(offset).limit(50).get();
      
      return serializeFirestoreData(snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      } as FirestoreUser)));
    } catch (error) {
      console.error("Error in getArchivedUsers:", error);
      return [];
    }
  },
  ['archived-users', 'users'],
  { revalidate: 31536000, tags: ['users', 'global-cache'] }
);

export const getArchivedActivities = unstable_cache(
  async (): Promise<UserActivity[]> => {
    try {
      const snapshot = await adminDb.collection('userActivities')
        .orderBy('timestamp', 'desc')
        .limit(100)
        .get();

      return serializeFirestoreData(snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      } as UserActivity)));
    } catch (error) {
      console.error("Error in getArchivedActivities:", error);
      return [];
    }
  },
  ['archived-activities'],
  { revalidate: 31536000, tags: ['activities', 'global-cache'] }
);

export async function clearSearchHotspots() {
  try {
    const batchSize = 500;
    
    // 1. Delete from searchAnalytics
    const searchAnalyticsSnap = await adminDb.collection('searchAnalytics').limit(batchSize).get();
    if (!searchAnalyticsSnap.empty) {
      const batch = adminDb.batch();
      searchAnalyticsSnap.docs.forEach((doc) => batch.delete(doc.ref));
      await batch.commit();
    }

    // 2. Delete from userActivities where eventType is 'search'
    const searchActivitiesSnap = await adminDb.collection('userActivities')
      .where('eventType', '==', 'search')
      .limit(batchSize)
      .get();
      
    if (!searchActivitiesSnap.empty) {
      const batch = adminDb.batch();
      searchActivitiesSnap.docs.forEach((doc) => batch.delete(doc.ref));
      await batch.commit();
    }

    revalidateTag('admin-dashboard-stats');
    return { success: true };
  } catch (error) {
    console.error("Error clearing search hotspots:", error);
    return { success: false, error: String(error) };
  }
}

