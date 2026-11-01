import type { Metadata } from 'next';
import { ResetPasswordPage } from '../../features/auth/ResetPasswordPage';

// No referrer, so the token in this page's URL isn't sent to anything it loads.
export const metadata: Metadata = { title: 'Reset password', robots: { index: false }, referrer: 'no-referrer' };

/** Opened from the link in a "forgot password" email. */
export default async function ResetPassword({ searchParams }: { searchParams: Promise<{ token?: string | string[] }> }) {
  const { token } = await searchParams;
  return <ResetPasswordPage token={typeof token === 'string' ? token : ''} />;
}
