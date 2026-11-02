import type { Metadata } from 'next';
import { SiteHeader } from '../../components/SiteHeader';
import { GymFinderLoader } from '../../features/gyms/GymFinderLoader';

export const metadata: Metadata = {
  title: 'Find a gym near you',
  description: 'See the gyms around you on a map, nearest first, with directions.',
};

export default function GymsPage() {
  return (
    <div className="min-h-screen bg-noir-eclipse text-white font-poppins">
      <SiteHeader active="/gyms" />
      <main id="main" className="max-w-[1400px] mx-auto px-4 md:px-8 py-8 md:py-10">
        <GymFinderLoader />
      </main>
    </div>
  );
}
