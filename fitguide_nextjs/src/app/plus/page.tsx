import type { Metadata } from 'next';
import { SiteHeader } from '../../components/SiteHeader';
import { PlusView } from '../../features/plus/PlusView';

export const metadata: Metadata = { title: 'FitGuide PLUS', robots: { index: false } };

export default function PlusPage() {
  return (
    <div className="min-h-screen bg-noir-eclipse text-white font-poppins">
      <SiteHeader active="/plus" />
      <main id="main" className="max-w-[1400px] mx-auto px-4 md:px-8 py-10">
        <PlusView />
      </main>
    </div>
  );
}
