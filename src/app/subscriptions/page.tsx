"use client";

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import SubscriptionPageClient from '@/components/subscription/SubscriptionPageClient';
import { Loader2 } from 'lucide-react';

function SubscriptionsContent() {
  const searchParams = useSearchParams();
  const typeParam = searchParams.get('type');
  const planType: 'profile' | 'contact' = typeParam === 'contact' ? 'contact' : 'profile';

  return <SubscriptionPageClient planType={planType} />;
}

export default function SubscriptionsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    }>
      <SubscriptionsContent />
    </Suspense>
  );
}
