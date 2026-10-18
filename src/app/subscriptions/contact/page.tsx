import SubscriptionPageClient from '@/components/subscription/SubscriptionPageClient';

export const metadata = {
  title: 'Contact Subscriptions | Connect Film Circle',
  description: 'Choose a contact reveal subscription plan to unlock phone numbers and emails.',
};

export default function ContactSubscriptionPage() {
  return <SubscriptionPageClient planType="contact" />;
}
