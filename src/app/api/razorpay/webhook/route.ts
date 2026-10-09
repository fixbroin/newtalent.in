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

        const planDoc = await adminDb.collection('adminSubscriptionPlans').doc(planId).get();
        const durationDays = planDoc.exists ? (planDoc.data()?.durationDays || 30) : 30;
        const revealLimit = planDoc.exists ? (planDoc.data()?.revealLimit || 10) : 10;
        const planName = planDoc.exists ? (planDoc.data()?.name || 'Subscription') : 'Subscription';

        const now = new Date();
        const expiresAt = new Date();
        expiresAt.setDate(now.getDate() + durationDays);

        let updateData: any = { updatedAt: Timestamp.fromDate(now) };
        if (planType === 'hire') {
          updateData = {
            ...updateData,
            hireSubscriptionActive: true,
            hireSubscriptionId: planId,
            hireSubscriptionName: planName,
            hireSubscriptionExpiresAt: Timestamp.fromDate(expiresAt),
            contactRevealLimit: revealLimit,
            contactRevealsUsed: 0
          };
        } else {
          updateData = {
            ...updateData,
            subscriptionActive: true,
            currentSubscriptionId: planId,
            subscriptionPlanName: planName,
            subscriptionExpiresAt: Timestamp.fromDate(expiresAt)
          };
        }

        await adminDb.collection('users').doc(userId).set(updateData, { merge: true });

        await adminDb.collection('userSubscriptions').add({
          userId,
          planId,
          planName,
          planType,
          status: 'active',
          razorpayOrderId: orderId,
          razorpayPaymentId: paymentId,
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
