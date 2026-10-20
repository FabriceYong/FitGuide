import { SiteHeader } from '../../components/SiteHeader';
import { ProgressView } from '../../features/progress/ProgressView';
import { HealthPanel } from '../../features/progress/HealthPanel';

export const metadata = { title: 'Your progress', robots: { index: false } };

export default function ProgressPage() {
  return (
    <div className="min-h-screen bg-noir-eclipse text-white font-poppins">
      <SiteHeader active="/progress" />
      <main id="main" className="max-w-[1400px] mx-auto px-4 md:px-8 py-10 space-y-12">
        <ProgressView />
        <HealthPanel />
      </main>
    </div>
  );
}
