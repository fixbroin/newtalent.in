import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Application ID is required' }, { status: 400 });
    }

    const docRef = adminDb.collection('kannadaGotLatentApplications').doc(id);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return NextResponse.json({ success: false, error: 'Application not found' }, { status: 404 });
    }

    const data = docSnap.data();
    if (!data) {
      return NextResponse.json({ success: false, error: 'Application data is empty' }, { status: 404 });
    }

    // Return ONLY public status-tracking fields to protect applicant privacy
    return NextResponse.json({
      success: true,
      application: {
        id: docSnap.id,
        fullName: data.fullName,
        stageName: data.stageName || '',
        status: data.status || 'New',
        auditionDate: data.auditionDate || null,
        talentTitle: data.talentTitle,
        talentCategory: data.talentCategory,
      }
    });

  } catch (error: any) {
    console.error('Error fetching application status:', error);
    return NextResponse.json({ success: false, error: error.message || 'Server error' }, { status: 500 });
  }
}
