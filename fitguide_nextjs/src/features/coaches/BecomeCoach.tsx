'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Modal } from '../../components/Modal';
import { applyToCoach, fetchMyApplication } from '../../services/coachService';
import type { CoachApplication } from '../../services/adminService';
import { CoachProfileForm, emptyCoachProfile } from './CoachProfileForm';

/** The "Become a coach" dialog: apply, or see how the application is going. */
export function BecomeCoach({ onClose }: { onClose: () => void }) {
  const [application, setApplication] = useState<CoachApplication | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    fetchMyApplication().then(setApplication).catch((err: Error) => setError(err.message));
  }, []);

  const showForm = application === null || editing;

  return (
    <Modal title="Become a FitGuide coach" onClose={onClose} size="lg">
      {error ? <p role="alert" className="text-sm text-red-300">{error}</p>
        : application === undefined ? <Loader2 className="w-5 h-5 animate-spin" />
          : showForm ? (
            <div className="space-y-4">
              <p className="text-sm text-white-70">
                Coaches write workouts and multi-week programs for the FitGuide catalog and can train members in person.
                The FitGuide team reviews every application.
              </p>
              <CoachProfileForm
                initial={application || emptyCoachProfile()}
                submitLabel={application ? 'Send again' : 'Send application'}
                onSubmit={async (input) => {
                  setApplication(await applyToCoach(input));
                  setEditing(false);
                }}
              />
            </div>
          ) : (
            <div className="space-y-4" role="status">
              {application?.status === 'pending' && (
                <p className="text-sm">Thanks! Your application is <strong>waiting for review</strong>. You&apos;ll get coach tools in the studio as soon as it&apos;s approved.</p>
              )}
              {application?.status === 'declined' && (
                <>
                  <p className="text-sm">Your application wasn&apos;t approved this time.</p>
                  {application.reviewNote && <p className="text-sm text-amber-200">Reviewer: {application.reviewNote}</p>}
                </>
              )}
              {application?.status === 'approved' && <p className="text-sm">You&apos;re a FitGuide coach. Open the studio from your profile.</p>}
              {application?.status !== 'approved' && (
                <button type="button" onClick={() => setEditing(true)} className="px-4 py-2 rounded-xl bg-white/10 font-bold text-sm">
                  {application?.status === 'declined' ? 'Update and apply again' : 'Edit application'}
                </button>
              )}
            </div>
          )}
    </Modal>
  );
}
