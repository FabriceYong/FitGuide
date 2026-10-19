import type { Metadata } from 'next';
import { SiteHeader } from '../../components/SiteHeader';
import { StudioView } from '../../features/admin/StudioView';

export const metadata: Metadata = { title: 'Creator studio', robots: { index: false } };

export default function StudioPage() {
  return (
    <div className="min-h-screen bg-noir-eclipse text-white font-poppins">
      <SiteHeader active="/studio" />
      <main className="max-w-[1400px] mx-auto px-4 md:px-8 py-10">
        <StudioView />
      </main>
    </div>
  );
}
