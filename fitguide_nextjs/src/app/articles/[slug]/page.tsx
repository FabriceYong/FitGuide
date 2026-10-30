import type { Metadata } from 'next';
import { SiteHeader } from '../../../components/SiteHeader';
import { ArticleBySlug } from '../../../features/dashboard/components/ArticlePage';

export const metadata: Metadata = { title: 'Article' };

export default async function ArticleRoute({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return (
    <div className="min-h-screen bg-noir-eclipse text-white font-poppins">
      <SiteHeader active="/" />
      <main id="main" className="max-w-[1100px] mx-auto px-4 md:px-8 py-10">
        <ArticleBySlug slug={slug} />
      </main>
    </div>
  );
}
