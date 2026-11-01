'use client';

import { useState } from 'react';
import { AlertCircle, Download, Loader2 } from 'lucide-react';
import { Modal } from '../../../components/Modal';
import { downloadFile } from '../../../lib/api';
import { localToday } from '../../../services/trainingService';

const DOWNLOADS = [
  { path: '/auth/export', file: 'fitguide-data.json', title: 'Everything (JSON)', text: 'Your profile, workouts, measurements, plans, food log, health data, friends and coach chat.' },
  { path: '/auth/export/workouts.csv', file: 'fitguide-workouts.csv', title: 'Workouts (CSV)', text: 'One row per logged set, for a spreadsheet.' },
  { path: '/auth/export/body-metrics.csv', file: 'fitguide-body.csv', title: 'Body measurements (CSV)', text: 'Weight and measurements by date.' },
];

/** "Download my data": save a copy of the account's data (the app's data_export.dart). */
export function DataExport({ onClose }: { onClose: () => void }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Saved as fitguide-data-2026-11-01.json and so on.
  const download = async (path: string, file: string) => {
    const name = file.replace('.', `-${localToday()}.`);
    setBusy(path);
    setDone(null);
    setError(null);
    try {
      await downloadFile(path, name);
      setDone(`Saved ${name}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not download the file. Please try again.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <Modal title="Download my data" onClose={onClose} size="sm">
      <div className="space-y-3">
        <p className="text-sm text-white-70">A copy of what FitGuide keeps about you. Weights are in kg and lengths in cm in every file.</p>
        <ul className="space-y-2">
          {DOWNLOADS.map((d) => (
            <li key={d.path} className="flex items-center gap-3 bg-noir-eclipse rounded-xl p-3.5">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-white">{d.title}</p>
                <p className="text-xs text-white-70">{d.text}</p>
              </div>
              <button
                type="button"
                onClick={() => download(d.path, d.file)}
                disabled={busy !== null}
                aria-label={`Download ${d.title}`}
                className="shrink-0 h-10 px-3.5 rounded-lg bg-white/10 hover:bg-white/15 text-white text-sm font-semibold flex items-center gap-1.5 disabled:opacity-60"
              >
                {busy === d.path ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : <Download className="w-4 h-4" aria-hidden="true" />} Save
              </button>
            </li>
          ))}
        </ul>
        <p role="status" className="text-sm text-lime-light min-h-5">{done}</p>
        {error && (
          <p role="alert" className="flex items-start gap-2 bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-sm text-red-300">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" /> {error}
          </p>
        )}
      </div>
    </Modal>
  );
}
