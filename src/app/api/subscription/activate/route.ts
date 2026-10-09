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

    // 1. Verify Razorpay Signature
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

    // 2. Fetch Plan Details
    const planDoc = await adminDb.collection('adminSubscriptionPlans').doc(planId).get();
    if (!planDoc.exists) {
      return NextResponse.json({ success: false, error: 'Subscription plan not found.' }, { status: 404 });
    }
    const planData = planDoc.data();
    const durationDays = planData?.durationDays || 30;
    const planType = planData?.planType || 'artist';

    // 3. Update User Subscription based on Plan Type
    const userRef = adminDb.collection('users').doc(userId);
    const now = new Date();
    const expiresAt = new Date();
    expiresAt.setDate(now.getDate() + durationDays);

    let subscriptionData: any = {
      updatedAt: Timestamp.fromDate(now)
    };

    if (planType === 'hire') {
      subscriptionData = {
        ...subscriptionData,
        hireSubscriptionActive: true,
        hireSubscriptionId: planId,
        hireSubscriptionName: planData?.name,
        hireSubscriptionExpiresAt: Timestamp.fromDate(expiresAt),
        contactRevealLimit: planData?.revealLimit || 10,
        contactRevealsUsed: 0,
        lastHireSubscriptionAt: Timestamp.fromDate(now)
      };
    } else {
      subscriptionData = {
        ...subscriptionData,
        subscriptionActive: true,
        currentSubscriptionId: planId,
        subscriptionPlanName: planData?.name,
        subscriptionExpiresAt: Timestamp.fromDate(expiresAt),
        lastSubscriptionAt: Timestamp.fromDate(now)
      };
    }

    await userRef.set(subscriptionData, { merge: true });

    // 4. Record the subscription transaction
    await adminDb.collection('userSubscriptions').add({
      userId,
      planId,
      planName: planData?.name,
      planType: planType,
      amount: planData?.price,
      startDate: Timestamp.fromDate(now),
      endDate: Timestamp.fromDate(expiresAt),
      status: 'active',
      razorpayOrderId: razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
      createdAt: Timestamp.fromDate(now)
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Subscription activated successfully.',
      expiresAt: expiresAt.toISOString()
    });

  } catch (error) {
    console.error('Error activating subscription:', error);
    return NextResponse.json({ success: false, error: 'Internal server error.' }, { status: 500 });
  }
}
