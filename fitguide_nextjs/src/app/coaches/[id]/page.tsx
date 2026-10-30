import type { Metadata } from 'next';
import { SiteHeader } from '../../../components/SiteHeader';
import { CoachProfileView } from '../../../features/coaches/CoachProfileView';

export const metadata: Metadata = { title: 'Coach' };

export default async function CoachPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <div className="min-h-screen bg-noir-eclipse text-white font-poppins">
      <SiteHeader active="/programs" />
      <main id="main" className="max-w-[1100px] mx-auto px-4 md:px-8 py-10">
        <CoachProfileView id={id} />
      </main>
    </div>
  );
}
