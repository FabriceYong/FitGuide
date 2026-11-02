import type { Metadata } from 'next';
import { SiteHeader } from '../../../../components/SiteHeader';
import { CrewView } from '../../../../features/community/CrewView';

export const metadata: Metadata = { title: 'Crew', robots: { index: false } };

export default async function CrewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <div className="min-h-screen bg-noir-eclipse text-white font-poppins">
      <SiteHeader active="/community" />
      <main id="main" className="max-w-[1400px] mx-auto px-4 md:px-8 py-10">
        <CrewView id={id} />
      </main>
    </div>
  );
}
