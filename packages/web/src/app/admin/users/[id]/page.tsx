'use client';

import { AdminRoute } from '@/components/auth/ProtectedRoute';
import { UserDetailView } from '@/components/admin/user-detail';
import { useParams } from 'next/navigation';

export default function AdminUserDetailPage() {
  const params = useParams<{ id: string }>();
  return (
    <AdminRoute>
      <UserDetailView userId={params.id} />
    </AdminRoute>
  );
}
