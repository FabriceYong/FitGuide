import { notFound } from 'next/navigation';
import { SiteHeader } from '../../../components/SiteHeader';
import { ProgramDetail } from '../../../features/programs/ProgramDetail';
import { serverGet } from '../../../lib/server-api';

const getProgram = (slug) => serverGet(`/programs/${encodeURIComponent(slug)}`);

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const data = await getProgram(slug).catch(() => null);
  if (!data) return { title: 'Program not found' };
  const { program } = data;
  return {
    title: program.title,
    description: program.description,
    alternates: { canonical: `/programs/${program.slug}` },
    openGraph: { title: program.title, description: program.description },
  };
}

export default async function ProgramPage({ params }) {
  const { slug } = await params;
  const data = await getProgram(slug);
  if (!data) notFound();

  return (
    <div className="min-h-screen bg-noir-eclipse text-white font-poppins">
      <SiteHeader active="/programs" />
      <ProgramDetail program={data.program} workouts={data.workouts} />
    </div>
  );
}
