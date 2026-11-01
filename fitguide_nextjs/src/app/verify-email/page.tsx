import type { Metadata } from 'next';
import { VerifyEmailPage } from '../../features/auth/VerifyEmailPage';

// No referrer, so the token in this page's URL isn't sent to anything it loads.
export const metadata: Metadata = { title: 'Confirm your email', robots: { index: false }, referrer: 'no-referrer' };

/** Opened from the link in the "confirm your email" message. */
export default async function VerifyEmail({ searchParams }: { searchParams: Promise<{ token?: string | string[] }> }) {
  const { token } = await searchParams;
  return <VerifyEmailPage token={typeof token === 'string' ? token : ''} />;
}
