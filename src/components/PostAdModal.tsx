import React from 'react';
import { PostAdView } from './PostAdView';
import { Ad, DivisionLocation, SubscriptionPackage, UserProfile } from '../types';

interface PostAdModalProps {
  isOpen: boolean;
  onClose: () => void;
  divisions: DivisionLocation[];
  onAdCreated: (newAd: Ad) => void;
  onAdUpdated?: (updatedAd: Ad) => void;
  editingAd?: Ad | null;
  currentUser?: UserProfile | null;
  packages?: SubscriptionPackage[];
  bkashNumber?: string;
  nagadNumber?: string;
  categoryPromoPricing?: Record<string, { top7: number; top30: number; boostMonth: number }>;
}

export const PostAdModal: React.FC<PostAdModalProps> = ({
  isOpen,
  onClose,
  ...props
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 max-w-[100vw]">
      <div className="w-full max-w-4xl max-h-[92vh] overflow-y-auto bg-white rounded-3xl shadow-2xl">
        <PostAdView onBack={onClose} {...props} />
      </div>
    </div>
  );
};

export { PostAdView };
