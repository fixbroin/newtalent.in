import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: "Register for Kannada's Got Latent 🎤🔥 | Show Your Talent",
  description: "The stage where anyone can become a star! Showcase your unique talent in 2 minutes, impress the judges, score yourself, and win. Register now.",
  keywords: [
    "Kannada's Got Latent",
    "Kannadas Got Latent Registration",
    "Kannada Talent Show",
    "Show Your Talent",
    "Comedy Roast Show",
    "Standup Comedy",
    "Singers",
    "Dancers",
    "Magicians",
    "Beatboxers",
    "Storytellers",
    "Mimicry Artists",
    "Register to Perform"
  ],
  openGraph: {
    title: "Kannada's Got Latent 🎤🔥 | Register & Perform",
    description: "Welcome to Kannada's Got Latent, the stage where anyone can become a star! Perform your talent in 2 minutes, impress the judges, score yourself, and win. Register today!",
    url: "https://newtalent.in/kannadasgotlatent",
    siteName: "Newtalent",
    images: [
      {
        url: '/kannadasgotlatent.png',
        width: 1200,
        height: 630,
        alt: "Kannada's Got Latent Registration Banner",
      }
    ],
    locale: 'en_IN',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: "Kannada's Got Latent 🎤🔥 | Register & Perform",
    description: "Register to perform on Kannada's Got Latent! Showcase your talent in 2 minutes, impress the judges, score yourself, and win.",
    images: ['/kannadasgotlatent.png'],
  }
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
