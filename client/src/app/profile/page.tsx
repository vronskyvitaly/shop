import type { Metadata } from 'next';
import { Suspense } from 'react';
import { ProfileSkeleton, ProfileView } from '@/features/auth/components/profile-view';

export const metadata: Metadata = { title: 'Профиль' };

export default function ProfilePage() {
  return (
    <Suspense fallback={<ProfileSkeleton />}>
      <ProfileView />
    </Suspense>
  );
}
