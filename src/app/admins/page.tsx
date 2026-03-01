'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAdminStore } from '@/store/adminStore';

export default function AdminIndexPage() {
  const router = useRouter();
  const { isLoggedIn } = useAdminStore();

  useEffect(() => {
    if (isLoggedIn) {
      router.push('/admins/dashboard');
    } else {
      router.push('/admins/login');
    }
  }, [isLoggedIn, router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
    </div>
  );
}
