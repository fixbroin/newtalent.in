import SubscriptionPageClient from '@/components/subscription/SubscriptionPageClient';

export const metadata = {
  title: 'Contact Subscriptions | NewTalent',
  description: 'Choose a contact reveal subscription plan to unlock phone numbers and emails.',
};

export default function ContactSubscriptionPage() {
  return <SubscriptionPageClient planType="contact" />;
}
