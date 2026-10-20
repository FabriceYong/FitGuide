import type { Metadata } from 'next';
import { SiteHeader } from '../../components/SiteHeader';
import { NutritionView } from '../../features/nutrition/NutritionView';

export const metadata: Metadata = { title: 'Nutrition', robots: { index: false } };

export default function NutritionPage() {
  return (
    <div className="min-h-screen bg-noir-eclipse text-white font-poppins">
      <SiteHeader active="/nutrition" />
      <main id="main" className="max-w-[1400px] mx-auto px-4 md:px-8 py-10">
        <NutritionView />
      </main>
    </div>
  );
}
