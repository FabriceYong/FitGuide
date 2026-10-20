import type { Metadata } from 'next';
import { SiteHeader } from '../../components/SiteHeader';
import { AdminView } from '../../features/admin/AdminView';

export const metadata: Metadata = { title: 'Admin', robots: { index: false } };

export default function AdminPage() {
  return (
    <div className="min-h-screen bg-noir-eclipse text-white font-poppins">
      <SiteHeader active="/admin" />
      <main id="main" className="max-w-[1400px] mx-auto px-4 md:px-8 py-10">
        <AdminView />
      </main>
    </div>
  );
}
