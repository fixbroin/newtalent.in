import { NextRequest, NextResponse } from 'next/server';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { initFirebaseAdmin } from '@/lib/firebase-admin';
import nodemailer from 'nodemailer';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    // Basic verification
    const {
      fullName,
      email,
      mobileNumber,
      dateOfBirth,
      gender,
      city,
      state,
      pinCode,
      talentCategory,
      talentTitle,
      talentDescription,
      performedOnStageBefore,
      introVideoUrl,
      talentVideoUrl,
      externalVideoLink,
      photos,
      canTravel,
      preferredLanguages,
      availableWeekends,
      availableWeekdays,
      emergencyName,
      emergencyRelationship,
      emergencyMobile,
      confirmCorrect,
      ownContent,
      allowPublish,
      understandNotGuaranteed,
    } = body;

    if (!fullName || !email || !mobileNumber || !dateOfBirth || !gender || !city || !state || !pinCode) {
      return NextResponse.json({ success: false, error: 'Missing required basic information' }, { status: 400 });
    }

    if (!talentCategory || talentCategory.length === 0 || !talentTitle || !talentDescription) {
      return NextResponse.json({ success: false, error: 'Missing talent information' }, { status: 400 });
    }

    // Auto-calculate age from dateOfBirth
    const dob = new Date(dateOfBirth);
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const monthDiff = today.getMonth() - dob.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
      age--;
    }

    initFirebaseAdmin();
    const db = getFirestore();

    const applicationData = {
      fullName,
      stageName: body.stageName || '',
      gender,
      dateOfBirth,
      age,
      mobileNumber,
      email,
      city,
      state,
      pinCode,
      talentCategory,
      talentTitle,
      talentDescription,
      performedOnStageBefore: !!performedOnStageBefore,
      introVideoUrl: introVideoUrl || '',
      talentVideoUrl: talentVideoUrl || '',
      externalVideoLink: externalVideoLink || '',
      photos: photos || [],
      instagram: body.instagram || '',
      youtube: body.youtube || '',
      facebook: body.facebook || '',
      otherSocial: body.otherSocial || '',
      canTravel: !!canTravel,
      preferredLanguages: preferredLanguages || [],
      availableWeekends: !!availableWeekends,
      availableWeekdays: !!availableWeekdays,
      emergencyName: emergencyName || '',
      emergencyRelationship: emergencyRelationship || '',
      emergencyMobile: emergencyMobile || '',
      confirmCorrect: !!confirmCorrect,
      ownContent: !!ownContent,
      allowPublish: !!allowPublish,
      understandNotGuaranteed: !!understandNotGuaranteed,
      // Metadata/Admin controls
      status: 'New',
      internalNotes: '',
      callScheduled: false,
      auditionDate: null,
      judgeComments: '',
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };

    const counterRef = db.collection('counters').doc('kannadaGotLatentApplicationsCounter');
    let applicationId = '';

    await db.runTransaction(async (transaction) => {
      const counterDoc = await transaction.get(counterRef);
      let lastId = 1000;
      if (counterDoc.exists) {
        lastId = counterDoc.data()?.lastId || 1000;
      }
      const nextId = lastId + 1;
      applicationId = nextId.toString();

      // Update counter update
      transaction.set(counterRef, { lastId: nextId });

      // Save application document with nextId as the document ID
      const appRef = db.collection('kannadaGotLatentApplications').doc(applicationId);
      transaction.set(appRef, {
        ...applicationData,
        applicationId,
      });
    });

    // Send thank you email notification asynchronously
    try {
      const appConfigRef = db.collection('webSettings').doc('applicationConfig');
      const appConfigSnap = await appConfigRef.get();
      
      const emailSubject = `Registration Successful: Kannada's Got Latent (ID: #${applicationId})`;
      const htmlBody = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body { margin: 0; padding: 0; background-color: #f6f9fc; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
        .container { max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.05); }
        .header { background-color: #0f766e; padding: 32px 24px; text-align: center; color: #ffffff; }
        .header h1 { margin: 0; font-size: 24px; font-weight: 800; }
        .content { padding: 40px 32px; color: #334155; line-height: 1.6; }
        .content p { margin: 0 0 16px 0; font-size: 15px; }
        .application-box { background-color: #f0fdfa; border: 1.5px dashed #0d9488; border-radius: 12px; padding: 24px; text-align: center; margin: 24px 0; }
        .application-id { font-size: 28px; font-weight: 900; color: #0f766e; font-family: monospace; margin: 8px 0; letter-spacing: 1px; }
        .footer { text-align: center; padding: 32px 24px; font-size: 12px; color: #94a3b8; border-top: 1px solid #f1f5f9; background-color: #fafafa; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Kannada's Got Latent</h1>
        </div>
        <div class="content">
            <p>Dear ${fullName},</p>
            <p>Thank you for registering to perform on <strong>Kannada's Got Latent</strong>! We have received your entry details successfully.</p>
            <p>Our team is actively reviewing registrations, and we will contact you soon with more details.</p>
            
            <div class="application-box">
                <div style="font-size: 13px; font-weight: bold; color: #0d9488; text-transform: uppercase;">Your Registration ID</div>
                <div class="application-id">#${applicationId}</div>
                <div style="font-size: 11px; color: #64748b;">Keep this ID to track your registration status.</div>
            </div>

            <p>If you have any questions or need to update your details, please reach out to us referencing your Registration ID.</p>
            <p>Best regards,<br><strong>Show Team</strong><br>Kannada's Got Latent</p>
        </div>
        <div class="footer">
            <p>&copy; ${new Date().getFullYear()} Newtalent.in. All rights reserved.</p>
            <p>This is an automated notification. Please do not reply directly.</p>
        </div>
    </div>
</body>
</html>
      `;

      if (appConfigSnap.exists) {
        const appConfig = appConfigSnap.data();
        const { smtpHost, smtpPort, smtpUser, smtpPass, senderEmail, siteName = 'Newtalent' } = appConfig || {};
        
        if (smtpHost && smtpPort && smtpUser && smtpPass && senderEmail) {
          const portNumber = parseInt(smtpPort, 10);
          if (!isNaN(portNumber)) {
            const transporter = nodemailer.createTransport({
              host: smtpHost,
              port: portNumber,
              secure: portNumber === 465,
              auth: { user: smtpUser, pass: smtpPass },
            });

            transporter.sendMail({
              from: `${siteName} <${senderEmail}>`,
              to: email,
              subject: emailSubject,
              html: htmlBody,
            }).then(() => {
              console.log(`[Registration Email] Thank you email sent successfully to ${email} for registration #${applicationId}`);
            }).catch((err) => {
              console.error('[Registration Email] Failed to send thank you email:', err);
            });
          }
        } else {
          console.warn('[Registration Email] SMTP configuration incomplete. Email notification skipped.');
        }
      }
    } catch (err) {
      console.error('[Registration Email] Error initializing thank you email flow:', err);
    }

    return NextResponse.json({
      success: true,
      applicationId,
    });
  } catch (error: any) {
    console.error('Submit registration error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Failed to submit registration' }, { status: 500 });
  }
}
