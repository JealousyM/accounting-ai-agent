import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Admin Dashboard - eKsięgowy AI',
  description: 'Administration panel for managing users and monitoring costs',
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
