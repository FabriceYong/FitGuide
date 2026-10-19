import type { Metadata } from 'next';
import { SiteHeader } from '../../components/SiteHeader';
import { PlanView } from '../../features/plan/PlanView';

export const metadata: Metadata = { title: 'Your plan', robots: { index: false } };

export default function PlanPage() {
  return (
    <div className="min-h-screen bg-noir-eclipse text-white font-poppins">
      <SiteHeader active="/plan" />
      <main className="max-w-[1400px] mx-auto px-4 md:px-8 py-10">
        <PlanView />
      </main>
    </div>
  );
}
