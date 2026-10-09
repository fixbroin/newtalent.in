import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
import { Timestamp } from 'firebase-admin/firestore';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get('x-razorpay-signature');

    // 1. Get Webhook Secret from Firestore or Environment
    let webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || '';
    try {
      const configDoc = await adminDb.collection('webSettings').doc('applicationConfig').get();
      if (configDoc.exists) {
        const cData = configDoc.data();
        if (cData?.razorpayWebhookSecret) {
          webhookSecret = cData.razorpayWebhookSecret;
        }
      }
    } catch (err) {
      console.warn('Could not fetch applicationConfig for webhook secret:', err);
    }

    if (webhookSecret && signature) {
      const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(rawBody)
        .digest('hex');

      if (expectedSignature !== signature) {
        console.error('Razorpay Webhook Invalid Signature');
        return NextResponse.json({ success: false, error: 'Invalid signature' }, { status: 400 });
      }
    }

    const eventData = JSON.parse(rawBody);
    const event = eventData.event;
    const payload = eventData.payload;

    console.log(`[Razorpay Webhook Received] Event: ${event}`);

    // Handle Payment Captured / Order Paid
    if (event === 'payment.captured' || event === 'order.paid') {
      const paymentEntity = payload.payment?.entity;
      const orderEntity = payload.order?.entity;

      const orderId = paymentEntity?.order_id || orderEntity?.id;
      const paymentId = paymentEntity?.id;
      const notes = paymentEntity?.notes || orderEntity?.notes || {};

      // If it's a subscription payment
      if (notes.subscription_plan_id && notes.user_id) {
        const userId = notes.user_id;
        const planId = notes.subscription_plan_id;
        const planType = notes.plan_type || 'artist';

        // Check idempotency for paymentId
        if (paymentId) {
          const existingTxn = await adminDb.collection('userSubscriptions')
            .where('razorpayPaymentId', '==', paymentId)
            .limit(1)
            .get();

          if (!existingTxn.empty) {
            console.log(`Webhook: Payment ${paymentId} already processed.`);
            return NextResponse.json({ success: true, received: true, message: 'Already processed' });
          }
        }

        const planDoc = await adminDb.collection('adminSubscriptionPlans').doc(planId).get();
        const durationDays = planDoc.exists ? (planDoc.data()?.durationDays || 30) : 30;
        const revealLimit = planDoc.exists ? (planDoc.data()?.revealLimit || 10) : 10;
        const planName = planDoc.exists ? (planDoc.data()?.name || 'Subscription') : 'Subscription';
        const planPrice = planDoc.exists ? (planDoc.data()?.price || 0) : 0;

        const userRef = adminDb.collection('users').doc(userId);
        const userSnap = await userRef.get();
        const userData = userSnap.exists ? userSnap.data() : {};
        const now = new Date();

        let updateData: any = { updatedAt: Timestamp.fromDate(now) };
        let calculatedExpiresAt: Date;

        if (planType === 'hire') {
          const addedReveals = Number(revealLimit);
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
            newExpiresAt = new Date(existingExpiresAt.getTime() + (durationDays * 24 * 60 * 60 * 1000));
            newRevealLimit = existingLimit + addedReveals;
            newRevealsUsed = existingUsed;
          } else {
            newExpiresAt.setDate(now.getDate() + durationDays);
            newRevealLimit = addedReveals;
            newRevealsUsed = 0;
          }

          calculatedExpiresAt = newExpiresAt;

          updateData = {
            ...updateData,
            hireSubscriptionActive: true,
            hireSubscriptionId: planId,
            currentHireSubscriptionId: planId,
            hireSubscriptionName: planName,
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

          updateData = {
            ...updateData,
            subscriptionActive: true,
            currentSubscriptionId: planId,
            subscriptionPlanName: planName,
            subscriptionExpiresAt: Timestamp.fromDate(newExpiresAt),
            lastSubscriptionAt: Timestamp.fromDate(now)
          };
        }

        await userRef.set(updateData, { merge: true });

        await adminDb.collection('userSubscriptions').add({
          userId,
          userEmail: userData?.email || '',
          userName: userData?.displayName || 'User',
          planId,
          planName,
          planType,
          amount: planPrice,
          startDate: Timestamp.fromDate(now),
          endDate: Timestamp.fromDate(calculatedExpiresAt),
          status: 'active',
          razorpayOrderId: orderId || '',
          razorpayPaymentId: paymentId || '',
          createdAt: Timestamp.fromDate(now)
        });
      }

      // If it's a service booking order
      if (orderId) {
        const bookingsQuery = await adminDb.collection('bookings').where('razorpayOrderId', '==', orderId).get();
        if (!bookingsQuery.empty) {
          for (const docSnap of bookingsQuery.docs) {
            await docSnap.ref.update({
              paymentStatus: 'Paid',
              razorpayPaymentId: paymentId,
              updatedAt: Timestamp.fromDate(new Date())
            });
          }
        }
      }
    }

    return NextResponse.json({ success: true, received: true });
  } catch (error) {
    console.error('Razorpay Webhook Error:', error);
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}
