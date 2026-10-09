import SubscriptionPageClient from '@/components/subscription/SubscriptionPageClient';

export const metadata = {
  title: 'Profile Subscriptions | NewTalent',
  description: 'Choose a subscription plan to list your artist profile and boost your visibility.',
};

export default function ProfileSubscriptionPage() {
  return <SubscriptionPageClient planType="profile" />;
}
