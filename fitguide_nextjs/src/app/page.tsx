'use client';

import { AuthWrapper } from '../features/auth/AuthWrapper';
import { WorkoutProvider } from '../context/WorkoutContext';
import Dashboard from '../components/Dashboard';

export default function Home() {
  return (
    <AuthWrapper>
      <WorkoutProvider>
        <Dashboard />
      </WorkoutProvider>
    </AuthWrapper>
  );
}
