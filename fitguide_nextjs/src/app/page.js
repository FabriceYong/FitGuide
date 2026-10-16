'use client';

import { AuthProvider } from '../contexts/AuthContext';
import { AuthWrapper } from '../features/auth/AuthWrapper';
import { WorkoutProvider } from '../context/WorkoutContext';
import Dashboard from '../components/Dashboard';

export default function Home() {
  return (
    <AuthProvider>
      <AuthWrapper>
        <WorkoutProvider>
          <Dashboard />
        </WorkoutProvider>
      </AuthWrapper>
    </AuthProvider>
  );
}
