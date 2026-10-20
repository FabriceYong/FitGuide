import type { Metadata } from 'next';
import { SiteHeader } from '../../components/SiteHeader';
import { CommunityView } from '../../features/community/CommunityView';

export const metadata: Metadata = { title: 'Community', robots: { index: false } };

export default function CommunityPage() {
  return (
    <div className="min-h-screen bg-noir-eclipse text-white font-poppins">
      <SiteHeader active="/community" />
      <main id="main" className="max-w-[1400px] mx-auto px-4 md:px-8 py-10">
        <CommunityView />
      </main>
    </div>
  );
}
