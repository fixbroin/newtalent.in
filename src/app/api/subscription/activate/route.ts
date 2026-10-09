import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
import { Timestamp } from 'firebase-admin/firestore';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
  try {
    const { 
      userId, 
      planId, 
      razorpay_order_id, 
      razorpay_payment_id, 
      razorpay_signature 
    } = await req.json();

    if (!userId || !planId || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return NextResponse.json({ success: false, error: 'Missing required fields.' }, { status: 400 });
    }

    // 1. Check idempotency: if payment already activated, return success immediately
    try {
      const existingTxn = await adminDb.collection('userSubscriptions')
        .where('razorpayPaymentId', '==', razorpay_payment_id)
        .limit(1)
        .get();

      if (!existingTxn.empty) {
        return NextResponse.json({ 
          success: true, 
          message: 'Subscription was already activated for this payment.'
        });
      }
    } catch (e) {
      console.warn('Idempotency check warning:', e);
    }

    // 2. Verify Razorpay Signature
    let razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET || '';
    try {
      const configSnap = await adminDb.collection('webSettings').doc('applicationConfig').get();
      if (configSnap.exists) {
        const cData = configSnap.data();
        if (cData?.razorpayKeySecret) razorpayKeySecret = cData.razorpayKeySecret;
      }
    } catch (err) {
      console.warn("Could not fetch applicationConfig for Razorpay Key Secret:", err);
    }

    if (!razorpayKeySecret) {
      console.error("RAZORPAY_KEY_SECRET is not configured in Admin Settings or Environment variables.");
      return NextResponse.json({ success: false, error: 'Payment configuration error.' }, { status: 500 });
    }

    const body = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expectedSignature = crypto
      .createHmac('sha256', razorpayKeySecret)
      .update(body.toString())
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      return NextResponse.json({ success: false, error: 'Invalid payment signature.' }, { status: 400 });
    }

    // 3. Fetch Plan Details
    const planDoc = await adminDb.collection('adminSubscriptionPlans').doc(planId).get();
    if (!planDoc.exists) {
      return NextResponse.json({ success: false, error: 'Subscription plan not found.' }, { status: 404 });
    }
    const planData = planDoc.data();
    const durationDays = planData?.durationDays || 30;
    const planType = planData?.planType || 'artist';

    // 4. Update User Subscription based on Plan Type
    const userRef = adminDb.collection('users').doc(userId);
    const userSnap = await userRef.get();
    const userData = userSnap.exists ? userSnap.data() : {};
    const now = new Date();

    let subscriptionData: any = {
      updatedAt: Timestamp.fromDate(now)
    };

    let calculatedExpiresAt: Date;

    if (planType === 'hire') {
      const addedReveals = Number(planData?.revealLimit || 10);
      let existingLimit = Number(userData?.contactRevealLimit || 0);
      let existingUsed = Number(userData?.contactRevealsUsed || 0);
      let existingExpiresAt: Date | null = null;

      if (userData?.hireSubscriptionExpiresAt) {
        existingExpiresAt = typeof userData.hireSubscriptionExpiresAt.toDate === 'function'
          ? userData.hireSubscriptionExpiresAt.toDate()
          : new Date(userData.hireSubscriptionExpiresAt);
      }

      const isCurrentlyActive = !!(userData?.hireSubscriptionActive && existingExpiresAt && existingExpiresAt.getTime() > now.getTime());

      let newExpiresAt = new Date();
      let newRevealLimit = addedReveals;
      let newRevealsUsed = 0;

      if (isCurrentlyActive && existingExpiresAt) {
        // Extend active expiration date by plan duration
        newExpiresAt = new Date(existingExpiresAt.getTime() + (durationDays * 24 * 60 * 60 * 1000));
        // Add new reveals cumulatively to existing limit
        newRevealLimit = existingLimit + addedReveals;
        newRevealsUsed = existingUsed;
      } else {
        // Expired or new subscription: start fresh from today
        newExpiresAt.setDate(now.getDate() + durationDays);
        newRevealLimit = addedReveals;
        newRevealsUsed = 0;
      }

      calculatedExpiresAt = newExpiresAt;

      subscriptionData = {
        ...subscriptionData,
        hireSubscriptionActive: true,
        hireSubscriptionId: planId,
        hireSubscriptionName: planData?.name,
        hireSubscriptionExpiresAt: Timestamp.fromDate(newExpiresAt),
        contactRevealLimit: newRevealLimit,
        contactRevealsUsed: newRevealsUsed,
        lastHireSubscriptionAt: Timestamp.fromDate(now)
      };
    } else {
      let existingExpiresAt: Date | null = null;
      if (userData?.subscriptionExpiresAt) {
        existingExpiresAt = typeof userData.subscriptionExpiresAt.toDate === 'function'
          ? userData.subscriptionExpiresAt.toDate()
          : new Date(userData.subscriptionExpiresAt);
      }

      const isCurrentlyActive = !!(userData?.subscriptionActive && existingExpiresAt && existingExpiresAt.getTime() > now.getTime());
      let newExpiresAt = new Date();

      if (isCurrentlyActive && existingExpiresAt) {
        newExpiresAt = new Date(existingExpiresAt.getTime() + (durationDays * 24 * 60 * 60 * 1000));
      } else {
        newExpiresAt.setDate(now.getDate() + durationDays);
      }

      calculatedExpiresAt = newExpiresAt;

      subscriptionData = {
        ...subscriptionData,
        subscriptionActive: true,
        currentSubscriptionId: planId,
        subscriptionPlanName: planData?.name,
        subscriptionExpiresAt: Timestamp.fromDate(newExpiresAt),
        lastSubscriptionAt: Timestamp.fromDate(now)
      };
    }

    await userRef.set(subscriptionData, { merge: true });

    // 5. Record the subscription transaction
    await adminDb.collection('userSubscriptions').add({
      userId,
      userEmail: userData?.email || '',
      userName: userData?.displayName || 'User',
      planId,
      planName: planData?.name,
      planType: planType,
      amount: planData?.price || 0,
      startDate: Timestamp.fromDate(now),
      endDate: Timestamp.fromDate(calculatedExpiresAt),
      status: 'active',
      razorpayOrderId: razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
      createdAt: Timestamp.fromDate(now)
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Subscription activated successfully.',
      expiresAt: calculatedExpiresAt.toISOString()
    });

  } catch (error) {
    console.error('Error activating subscription:', error);
    return NextResponse.json({ success: false, error: 'Internal server error.' }, { status: 500 });
  }
}
