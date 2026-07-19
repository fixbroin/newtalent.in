"use client";

import React from 'react';
import Link from 'next/link';
import { User, MapPin, CheckCircle, Info, MessageSquare, Clock, Ban, X } from 'lucide-react';
import type { ArtistApplication } from '@/types/firestore';
import AppImage from '@/components/ui/AppImage';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';

interface ArtistCardProps {
  artist: ArtistApplication;
  onRequest: (artist: ArtistApplication) => void;
  isLoading?: boolean;
  categorySlug?: string;
  connectionStatus?: 'pending' | 'accepted' | 'rejected' | null;
  isBlocked?: boolean;
}

const ArtistCard: React.FC<ArtistCardProps> = ({ artist, onRequest, isLoading, categorySlug, connectionStatus, isBlocked }) => {
  const { user, triggerAuthRedirect } = useAuth();
  const isSelf = user?.uid === artist.userId;
  const profileUrl = artist.username 
    ? (categorySlug ? `/category/${categorySlug}/${artist.username}` : `/${artist.username}`) 
    : null;
  const mainImage = artist.profilePhotoUrl || "/default-image.png";

  const handleAboutClick = (e: React.MouseEvent) => {
    if (!user) {
      e.preventDefault();
      const currentPath = window.location.pathname + window.location.search;
      triggerAuthRedirect(currentPath);
    }
  };

  const getButtonContent = () => {
    if (connectionStatus === 'accepted') {
      return <><MessageSquare className="w-4 h-4 mr-2" /> Chat</>;
    }
    if (connectionStatus === 'pending') {
      return <><Clock className="w-4 h-4 mr-2" /> Requested</>;
    }
    return <><MessageSquare className="w-4 h-4 mr-2" /> Request</>;
  };

  return (
    <div className="bg-card border rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 flex flex-col h-full group">
      {/* Image Section */}
      {profileUrl ? (
        <Link href={profileUrl} onClick={handleAboutClick} className="relative aspect-square w-full bg-muted flex items-center justify-center cursor-pointer overflow-hidden">
          <AppImage 
            src={mainImage} 
            alt={artist.fullName || "Artist"} 
            fill 
            className="object-contain w-full h-full transition-transform duration-500 group-hover:scale-105"
          />
          {artist.status === 'approved' && (
            <div className="absolute top-3 right-3 z-10">
              <Badge className="bg-green-500/90 hover:bg-green-600 text-white border-none backdrop-blur-sm">
                <CheckCircle className="w-3 h-3 mr-1" /> Verified
              </Badge>
            </div>
          )}
        </Link>
      ) : (
        <div className="relative aspect-square w-full bg-muted flex items-center justify-center">
          <AppImage 
            src={mainImage} 
            alt={artist.fullName || "Artist"} 
            fill 
            className="object-contain w-full h-full transition-transform duration-500 group-hover:scale-105"
          />
          {artist.status === 'approved' && (
            <div className="absolute top-3 right-3">
              <Badge className="bg-green-500/90 hover:bg-green-600 text-white border-none backdrop-blur-sm">
                <CheckCircle className="w-3 h-3 mr-1" /> Verified
              </Badge>
            </div>
          )}
        </div>
      )}

      {/* Content Section */}
      <div className="p-4 flex flex-col flex-grow">
        <div className="mb-2">
          <h3 className="font-bold text-lg leading-tight line-clamp-1 text-foreground hover:text-primary transition-colors">
            {profileUrl ? (
              <Link href={profileUrl} onClick={handleAboutClick}>
                {artist.fullName || "New Talent"}
              </Link>
            ) : (
              artist.fullName || "New Talent"
            )}
          </h3>
          <p className="text-sm text-primary font-medium">{artist.workCategoryName || "Professional"}</p>
        </div>

        <div className="flex items-center justify-between text-muted-foreground text-xs mb-4">
          <div className="flex items-center min-w-0">
            <MapPin className="w-3 h-3 mr-1 shrink-0" />
            <span className="line-clamp-1">{artist.area || artist.city || "Available Near You"}</span>
          </div>
          {artist.age && (
            <span className="ml-2 shrink-0 font-bold text-primary bg-primary/5 px-1.5 py-0.5 rounded text-[10px] border border-primary/10">
              {artist.age} YRS
            </span>
          )}
        </div>

        {artist.bio && (
          <p className="text-sm text-muted-foreground line-clamp-2 mb-4 italic">
            "{artist.bio}"
          </p>
        )}

        {/* Buttons Section */}
        <div className="mt-auto flex flex-row gap-2 w-full">
          {profileUrl ? (
            <Button asChild variant="outline" size="sm" className="flex-1 h-9 rounded-xl border-primary/20 hover:border-primary hover:bg-primary/5 hover:text-primary px-2 sm:px-4">
              <Link href={profileUrl} onClick={handleAboutClick}>
                <Info className="w-3.5 h-3.5 mr-1.5 shrink-0" /> 
                <span className="text-xs sm:text-sm">About</span>
              </Link>
            </Button>
          ) : (
            <Button variant="outline" size="sm" className="flex-1 h-9 rounded-xl border-primary/20 opacity-50 cursor-not-allowed px-2 sm:px-4" disabled>
              <Info className="w-3.5 h-3.5 mr-1.5 shrink-0" /> 
              <span className="text-xs sm:text-sm">About</span>
            </Button>
          )}

          {!isSelf && (
            <Button 
              size="sm" 
              variant={isBlocked ? 'secondary' : connectionStatus === 'accepted' ? 'default' : connectionStatus === 'pending' ? 'secondary' : 'default'}
              className={cn(
                "flex-1 h-9 rounded-xl px-2 sm:px-4 transition-all duration-300",
                connectionStatus === 'pending' && "bg-muted text-muted-foreground border-none cursor-not-allowed opacity-80",
                connectionStatus === 'rejected' && "bg-destructive/10 text-destructive border-none cursor-not-allowed opacity-80",
                isBlocked && "bg-muted text-muted-foreground border-none cursor-not-allowed opacity-85"
              )}
              onClick={() => connectionStatus !== 'pending' && connectionStatus !== 'rejected' && !isBlocked && onRequest(artist)}
              isLoading={isLoading}
              disabled={connectionStatus === 'pending' || connectionStatus === 'rejected' || isBlocked}
            >
              {isBlocked ? (
                <><Ban className="w-3.5 h-3.5 mr-1.5 shrink-0" /> <span className="text-xs sm:text-sm">Blocked</span></>
              ) : connectionStatus === 'accepted' ? (
                <><MessageSquare className="w-3.5 h-3.5 mr-1.5 shrink-0" /> <span className="text-xs sm:text-sm">Chat</span></>
              ) : connectionStatus === 'pending' ? (
                <><Clock className="w-3.5 h-3.5 mr-1.5 shrink-0" /> <span className="text-xs sm:text-sm">Requested</span></>
              ) : connectionStatus === 'rejected' ? (
                <><X className="w-3.5 h-3.5 mr-1.5 shrink-0" /> <span className="text-xs sm:text-sm">Rejected</span></>
              ) : (
                <><MessageSquare className="w-3.5 h-3.5 mr-1.5 shrink-0" /> <span className="text-xs sm:text-sm">Request</span></>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ArtistCard;
