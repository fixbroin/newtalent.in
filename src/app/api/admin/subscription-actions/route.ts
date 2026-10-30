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
      const userRef = adminDb.collection('users').doc(targetUserId);
      const userDoc = await userRef.get();
      if (!userDoc.exists) {
        return NextResponse.json({ success: false, error: 'User document not found.' }, { status: 404 });
      }
      const userData = userDoc.data() || {};

      let updatePayload: any = { updatedAt: Timestamp.fromDate(now) };
      let calculatedExpiresAt: Date;

      if (type === 'hire') {
        const addedLimit = Number(limitCount);
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
        let newRevealLimit = addedLimit;
        let newRevealsUsed = 0;

        if (isCurrentlyActive && existingExpiresAt) {
          newExpiresAt = new Date(existingExpiresAt.getTime() + (Number(days) * 24 * 60 * 60 * 1000));
          newRevealLimit = existingLimit + addedLimit;
          newRevealsUsed = existingUsed;
        } else {
          newExpiresAt.setDate(now.getDate() + Number(days));
          newRevealLimit = addedLimit;
          newRevealsUsed = 0;
        }

        calculatedExpiresAt = newExpiresAt;

        updatePayload = {
          ...updatePayload,
          hireSubscriptionActive: true,
          hireSubscriptionId: planId || 'manual_admin',
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
          newExpiresAt = new Date(existingExpiresAt.getTime() + (Number(days) * 24 * 60 * 60 * 1000));
        } else {
          newExpiresAt.setDate(now.getDate() + Number(days));
        }

        calculatedExpiresAt = newExpiresAt;

        updatePayload = {
          ...updatePayload,
          subscriptionActive: true,
          currentSubscriptionId: planId || 'manual_admin',
          subscriptionPlanName: planName,
          subscriptionExpiresAt: Timestamp.fromDate(newExpiresAt),
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
        endDate: Timestamp.fromDate(calculatedExpiresAt),
        status: 'active',
        assignedByAdmin: true,
        createdAt: Timestamp.fromDate(now)
      });

      return NextResponse.json({
        success: true,
        message: `Assigned ${planName} (${type}) to user successfully. Expires on ${calculatedExpiresAt.toLocaleDateString('en-IN')}.`
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
          updatePayload.contactRevealLimit = 0;
          updatePayload.contactRevealsUsed = 0;
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

      // Fetch appConfig for SMTP & globalSettings for logo/site name
      const [appConfigSnap, globalSettingsSnap] = await Promise.all([
        adminDb.collection('webSettings').doc('applicationConfig').get(),
        adminDb.collection('webSettings').doc('globalSettings').get()
      ]);

      const appConfig = appConfigSnap.exists ? appConfigSnap.data() : {};
      const globalSettings = globalSettingsSnap.exists ? globalSettingsSnap.data() : {};

      const result = await sendSubscriptionExpiryEmail({
        userName: body.userName || 'Valued User',
        userEmail: targetEmail,
        smtpHost: appConfig?.smtpHost || process.env.SMTP_HOST,
        smtpPort: appConfig?.smtpPort ? String(appConfig.smtpPort) : process.env.SMTP_PORT,
        smtpUser: appConfig?.smtpUser || process.env.SMTP_USER,
        smtpPass: appConfig?.smtpPass || process.env.SMTP_PASS,
        senderEmail: appConfig?.senderEmail || process.env.SENDER_EMAIL,
        siteName: globalSettings?.websiteName || appConfig?.websiteName || 'Newtalent',
        logoUrl: globalSettings?.logoUrl || appConfig?.logoUrl || undefined
      });

      return NextResponse.json(result);
    }

    return NextResponse.json({ success: false, error: 'Unknown action.' }, { status: 400 });

  } catch (error) {
    console.error('Subscription Action Error:', error);
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}
