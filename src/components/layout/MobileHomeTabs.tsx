"use client";

import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useLoading } from '@/contexts/LoadingContext';
import { motion } from 'framer-motion';
import { Home, UserPlus, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function MobileHomeTabs() {
  const pathname = usePathname();
  const router = useRouter();
  const { firestoreUser, user, triggerAuthRedirect } = useAuth();
  const { showLoading } = useLoading();

  const isArtist = firestoreUser?.roles?.includes('artist');

  const tabs = [
    { id: 'home', label: 'Home', href: '/', icon: Home, isProtected: false },
    ...(!isArtist ? [{ id: 'artist', label: 'Join as Artist', href: '/artist-registration', icon: UserPlus, isProtected: true }] : []),
    { id: 'script', label: 'Script Writing', href: '/script-writing', icon: FileText, isProtected: true }
  ];

  const handleTabClick = (href: string, isProtected: boolean) => {
    if (pathname === href) return;

    if (isProtected && !user) {
      triggerAuthRedirect(href);
      return;
    }

    showLoading();
    router.push(href);
  };

  return (
    <div className="md:hidden bg-background/95 backdrop-blur-xl border-b border-border/40 h-12 w-full flex items-center justify-around px-2 select-none">
      {tabs.map((tab) => {
        const isActive = pathname === tab.href;
        const Icon = tab.icon;

        return (
          <button
            key={tab.id}
            onClick={() => handleTabClick(tab.href, tab.isProtected)}
            className="flex-grow flex-shrink-0 flex-1 relative flex flex-col items-center justify-center h-full text-xs font-semibold focus:outline-none transition-colors"
          >
            <div
              className={cn(
                "flex items-center gap-1.5 transition-all duration-300",
                isActive 
                  ? "text-primary scale-105 font-bold" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </div>
            {isActive && (
              <motion.div
                layoutId="activeMobileHomeTabUnderline"
                className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-primary rounded-t-full"
                transition={{ type: "spring", stiffness: 350, damping: 30 }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
