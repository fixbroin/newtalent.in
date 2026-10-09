import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
import { Timestamp } from 'firebase-admin/firestore';
import { sendSubscriptionExpiryEmail } from '@/ai/flows/sendSubscriptionExpiryEmailFlow';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, userId, planId, planType, durationDays, revealLimit, userEmail } = body;

    if (!action) {
      return NextResponse.json({ success: false, error: 'Action is required.' }, { status: 400 });
    }

    // --- Action: ASSIGN SUBSCRIPTION MANUALLY ---
    if (action === 'assign') {
      let targetUserId = userId;

      // If userEmail provided instead of userId, search user
      if (!targetUserId && userEmail) {
        const userQuery = await adminDb.collection('users').where('email', '==', userEmail.trim().toLowerCase()).limit(1).get();
        if (!userQuery.empty) {
          targetUserId = userQuery.docs[0].id;
        } else {
          return NextResponse.json({ success: false, error: `No user found with email ${userEmail}` }, { status: 404 });
        }
      }

      if (!targetUserId) {
        return NextResponse.json({ success: false, error: 'User ID or valid User Email is required.' }, { status: 400 });
      }

      let planName = 'Custom Admin Subscription';
      let days = durationDays || 30;
      let type = planType || 'artist';
      let limitCount = revealLimit || 10;
      let price = 0;

      if (planId) {
        const planDoc = await adminDb.collection('adminSubscriptionPlans').doc(planId).get();
        if (planDoc.exists) {
          const pData = planDoc.data();
          planName = pData?.name || planName;
          days = pData?.durationDays || days;
          type = pData?.planType || type;
          limitCount = pData?.revealLimit || limitCount;
          price = pData?.price || 0;
        }
      }

      const now = new Date();
      const expiresAt = new Date();
      expiresAt.setDate(now.getDate() + Number(days));

      const userRef = adminDb.collection('users').doc(targetUserId);
      const userDoc = await userRef.get();
      if (!userDoc.exists) {
        return NextResponse.json({ success: false, error: 'User document not found.' }, { status: 404 });
      }

      let updatePayload: any = { updatedAt: Timestamp.fromDate(now) };

      if (type === 'hire') {
        updatePayload = {
          ...updatePayload,
          hireSubscriptionActive: true,
          hireSubscriptionId: planId || 'manual_admin',
          hireSubscriptionName: planName,
          hireSubscriptionExpiresAt: Timestamp.fromDate(expiresAt),
          contactRevealLimit: Number(limitCount),
          contactRevealsUsed: 0,
          lastHireSubscriptionAt: Timestamp.fromDate(now)
        };
      } else {
        updatePayload = {
          ...updatePayload,
          subscriptionActive: true,
          currentSubscriptionId: planId || 'manual_admin',
          subscriptionPlanName: planName,
          subscriptionExpiresAt: Timestamp.fromDate(expiresAt),
          lastSubscriptionAt: Timestamp.fromDate(now)
        };
      }

      await userRef.set(updatePayload, { merge: true });

      // Record transaction
      await adminDb.collection('userSubscriptions').add({
        userId: targetUserId,
        userEmail: userDoc.data()?.email || userEmail || '',
        userName: userDoc.data()?.displayName || 'User',
        planId: planId || 'manual_admin',
        planName,
        planType: type,
        amount: price,
        startDate: Timestamp.fromDate(now),
        endDate: Timestamp.fromDate(expiresAt),
        status: 'active',
        assignedByAdmin: true,
        createdAt: Timestamp.fromDate(now)
      });

      return NextResponse.json({
        success: true,
        message: `Assigned ${planName} (${type}) to user successfully. Expires on ${expiresAt.toLocaleDateString('en-IN')}.`
      });
    }

    // --- Action: DEACTIVATE SUBSCRIPTION ---
    if (action === 'deactivate') {
      if (!userId) {
        return NextResponse.json({ success: false, error: 'User ID is required.' }, { status: 400 });
      }

      const userRef = adminDb.collection('users').doc(userId);
      const targetType = planType || 'artist';

      let updatePayload: any = { updatedAt: Timestamp.now() };
      if (targetType === 'hire') {
        updatePayload.hireSubscriptionActive = false;
      } else {
        updatePayload.subscriptionActive = false;
      }

      await userRef.set(updatePayload, { merge: true });

      return NextResponse.json({
        success: true,
        message: `Deactivated ${targetType} subscription for user.`
      });
    }

    // --- Action: DELETE SUBSCRIPTION RECORD ---
    if (action === 'delete') {
      const { subscriptionRecordId } = body;
      if (subscriptionRecordId) {
        await adminDb.collection('userSubscriptions').doc(subscriptionRecordId).delete();
      }
      if (userId) {
        const targetType = planType || 'artist';
        const userRef = adminDb.collection('users').doc(userId);
        let updatePayload: any = { updatedAt: Timestamp.now() };
        if (targetType === 'hire') {
          updatePayload.hireSubscriptionActive = false;
          updatePayload.hireSubscriptionId = null;
          updatePayload.hireSubscriptionName = null;
          updatePayload.hireSubscriptionExpiresAt = null;
        } else {
          updatePayload.subscriptionActive = false;
          updatePayload.currentSubscriptionId = null;
          updatePayload.subscriptionPlanName = null;
          updatePayload.subscriptionExpiresAt = null;
        }
        await userRef.set(updatePayload, { merge: true });
      }
      return NextResponse.json({ success: true, message: 'Subscription record deleted.' });
    }

    // --- Action: SEND EXPIRY / RENEWAL EMAIL ---
    if (action === 'send_expiry_email') {
      const targetEmail = userEmail;
      if (!targetEmail) {
        return NextResponse.json({ success: false, error: 'Target user email is required.' }, { status: 400 });
      }

      // Fetch global settings for SMTP if available
      const settingsDoc = await adminDb.collection('adminSettings').doc('global').get();
      const settings = settingsDoc.exists ? settingsDoc.data() : {};

      const result = await sendSubscriptionExpiryEmail({
        userName: body.userName || 'Valued User',
        userEmail: targetEmail,
        smtpHost: settings?.smtpHost || process.env.SMTP_HOST,
        smtpPort: settings?.smtpPort || process.env.SMTP_PORT,
        smtpUser: settings?.smtpUser || process.env.SMTP_USER,
        smtpPass: settings?.smtpPass || process.env.SMTP_PASS,
        senderEmail: settings?.senderEmail || process.env.SENDER_EMAIL,
        siteName: settings?.websiteName || 'Newtalent',
        logoUrl: settings?.logoUrl || undefined
      });

      return NextResponse.json(result);
    }

    return NextResponse.json({ success: false, error: 'Unknown action.' }, { status: 400 });

  } catch (error) {
    console.error('Subscription Action Error:', error);
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}
