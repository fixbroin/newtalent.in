import { doc, updateDoc, arrayUnion, increment, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { FirestoreUser } from '@/types/firestore';

export type ContactRevealStatus =
  | { status: 'not_logged_in' }
  | { status: 'already_unlocked' }
  | { status: 'can_unlock'; remaining: number; limit: number; used: number }
  | { status: 'limit_reached'; remaining: number; limit: number; used: number }
  | { status: 'no_subscription' };

/**
 * Validates whether a recruiter/hirer can reveal an artist's phone number.
 */
export function checkContactRevealStatus(
  user: FirestoreUser | null | undefined,
  artistUserId: string
): ContactRevealStatus {
  if (!user) {
    return { status: 'not_logged_in' };
  }

  // Check if artist is already in unlocked array
  if (user.unlockedArtistIds && user.unlockedArtistIds.includes(artistUserId)) {
    return { status: 'already_unlocked' };
  }

  // Check subscription active state and expiration
  const now = new Date();
  let isExpired = true;

  if (user.hireSubscriptionExpiresAt) {
    const expiresDate = typeof (user.hireSubscriptionExpiresAt as any).toDate === 'function'
      ? user.hireSubscriptionExpiresAt.toDate()
      : new Date(user.hireSubscriptionExpiresAt as any);
    isExpired = expiresDate < now;
  }

  const isSubscribed = !!user.hireSubscriptionActive && !isExpired;

  if (!isSubscribed) {
    return { status: 'no_subscription' };
  }

  const limit = user.contactRevealLimit || 0;
  const used = user.contactRevealsUsed || 0;
  const remaining = Math.max(0, limit - used);

  if (remaining <= 0) {
    return { status: 'limit_reached', remaining: 0, limit, used };
  }

  return { status: 'can_unlock', remaining, limit, used };
}

/**
 * Deducts 1 reveal credit and adds artistUserId to unlockedArtistIds array in Firestore.
 */
export async function unlockArtistContact(userId: string, artistUserId: string): Promise<boolean> {
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      unlockedArtistIds: arrayUnion(artistUserId),
      contactRevealsUsed: increment(1)
    });
    return true;
  } catch (error) {
    console.error('Error unlocking artist contact:', error);
    return false;
  }
}
