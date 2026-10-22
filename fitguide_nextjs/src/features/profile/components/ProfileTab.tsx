'use client';

import { useId, useState, type FormEvent, type ReactNode } from 'react';
import Link from 'next/link';
import {
  Activity, AlertCircle, AlertTriangle, Camera, CheckCircle2, ChevronRight, Crown, Edit3, Globe, HeartPulse, KeyRound, Loader2, LogOut,
  PenTool, Ruler, Scale, Shield, Target, Trash2, TrendingUp, User, Utensils, Watch, type LucideIcon,
} from 'lucide-react';
import { PROFILE } from '@fitguide/shared';
import { apiRequest, assetUrl } from '../../../lib/api';
import { useAuth, type AuthUser } from '../../../contexts/AuthContext';
import { Modal } from '../../../components/Modal';
import { ConfirmDialog } from '../../../components/ConfirmDialog';
import { ParqModal } from '../../../components/ParqModal';
import { LanguageSwitcher } from '../../../components/LanguageSwitcher';
import { useStartSignUp } from '../../auth/AuthWrapper';
import type { TabId } from '../../dashboard/tabs';

const bmiOf = (weight?: number, height?: number) => (weight && height ? Math.round((weight / (height / 100) ** 2) * 10) / 10 : null);
const bmiLabel = (bmi: number | null) => {
  if (!bmi) return { label: '', color: '#9CA3AF' };
  if (bmi < 18.5) return { label: 'Underweight', color: '#93C5FD' };
  if (bmi < 25) return { label: 'Healthy', color: '#00C4B4' };
  if (bmi < 30) return { label: 'Overweight', color: '#FB923C' };
  return { label: 'Obesity', color: '#FCA5A5' };
};

const ACTIVITY_TEXT: Record<string, string> = {
  Inactive: 'Little daily movement',
  'Moderately Active': 'Light exercise most days',
  Active: 'Exercise 3+ days a week',
  'Very Active': 'Hard training most days',
};

/** The user's profile (used for recommendations, plans and calorie targets) and account links. */
export function ProfileTab({ onLogout, onNavigate }: { onLogout: () => void; onNavigate: (tab: TabId) => void }) {
  const { user, isGuest } = useAuth();
  const startSignUp = useStartSignUp();
  const [editing, setEditing] = useState(false);
  const [showParq, setShowParq] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const bmi = bmiOf(user?.weight, user?.height);
  const bmiInfo = bmiLabel(bmi);
  const toGo = user?.weight && user?.targetWeight ? Math.round(Math.abs(user.weight - user.targetWeight) * 10) / 10 : null;

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-10 text-left">
      <header className="flex flex-col items-center text-center pt-4">
        <div className="w-24 h-24 rounded-full border-2 border-lime-light flex items-center justify-center bg-obsidian-wave overflow-hidden">
          {user?.avatarUrl
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={assetUrl(user.avatarUrl) || ''} alt="" className="w-full h-full object-cover" />
            : <User className="w-10 h-10 text-white-70" aria-hidden="true" />}
        </div>
        <h1 className="text-2xl font-extrabold text-white mt-4">{user?.name || 'Your profile'}</h1>
        <p className="text-sm text-white-70 mt-1">
          {isGuest ? 'Guest (saved on this device only)' : user?.email}
          {user?.createdAt && ` · Member since ${new Date(user.createdAt).getFullYear()}`}
        </p>
        <div className="flex flex-wrap justify-center gap-2 mt-3">
          {user?.fitnessLevel && <Badge>{user.fitnessLevel}</Badge>}
          {user?.plan === 'plus' && <Badge color="#FCD34D">PLUS</Badge>}
          {user?.role && user.role !== 'user' && <Badge color="#C084FC">{user.role}</Badge>}
        </div>
        <div className="flex flex-wrap justify-center gap-3 mt-4">
          <button type="button" onClick={() => setEditing(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-obsidian-wave border border-white-30/20 text-white text-sm font-bold hover:border-lime-light/60">
            <Edit3 className="w-4 h-4" aria-hidden="true" /> Edit profile
          </button>
          {isGuest && (
            <button type="button" onClick={startSignUp} className="px-4 py-2 rounded-xl bg-lime-light text-noir-eclipse text-sm font-bold">Create an account</button>
          )}
        </div>
      </header>

      <section aria-labelledby="profile-body">
        <h2 id="profile-body" className="text-xs font-extrabold tracking-widest text-white-70 uppercase mb-3">Body</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <Stat icon={Ruler} color="#22D3EE" label="Height" value={user?.height ? `${user.height} cm` : '—'} />
          <Stat icon={Scale} color="#34D399" label="Weight" value={user?.weight ? `${user.weight} kg` : '—'} />
          <Stat icon={Target} color="#A78BFA" label="Target" value={user?.targetWeight ? `${user.targetWeight} kg` : '—'} sub={toGo ? `${toGo} kg to go` : undefined} />
          <Stat icon={Activity} color={bmiInfo.color} label="BMI" value={bmi ? String(bmi) : '—'} sub={bmiInfo.label} />
        </div>
        <p className="text-xs text-white-70 mt-2">Log your weight over time on the <button type="button" onClick={() => onNavigate('progress')} className="underline">Progress tab</button>.</p>
      </section>

      <section aria-labelledby="profile-goals" className="bg-obsidian-wave rounded-2xl p-4 space-y-3">
        <h2 id="profile-goals" className="text-xs font-extrabold tracking-widest text-white-70 uppercase">Training & nutrition</h2>
        <Row icon={Target} label="Goal" value={user?.goal || 'Not set'} />
        <Row icon={TrendingUp} label="Level" value={user?.fitnessLevel || 'Not set'} />
        <Row icon={Activity} label="Activity" value={user?.activityStatus ? `${user.activityStatus} · ${ACTIVITY_TEXT[user.activityStatus] || ''}` : 'Not set'} />
        <Row icon={Utensils} label="Diet" value={user?.diet || 'Not set'} />
        <p className="text-xs text-white-70">These shape your recommendations, generated plans and calorie targets.</p>
      </section>

      <section aria-labelledby="profile-account" className="space-y-2">
        <h2 id="profile-account" className="text-xs font-extrabold tracking-widest text-white-70 uppercase mb-3">Account</h2>
        <NavRow icon={Crown} title={user?.plan === 'plus' ? 'Your PLUS subscription' : 'FitGuide PLUS'} href="/plus" />
        <NavRow icon={Watch} title="Connected apps and health data" onClick={() => onNavigate('progress')} />
        <NavRow icon={HeartPulse} title="Health check (PAR-Q)" onClick={() => setShowParq(true)} />
        {(user?.role === 'creator' || user?.role === 'admin') && <NavRow icon={PenTool} title="Creator studio" href="/studio" />}
        {user?.role === 'admin' && <NavRow icon={Shield} title="Admin" href="/admin" />}
        <div className="flex items-center justify-between p-4 bg-obsidian-wave rounded-2xl">
          <span className="flex items-center gap-3 text-sm font-bold text-white"><Globe className="w-4 h-4" aria-hidden="true" /> Language</span>
          <LanguageSwitcher />
        </div>
        {!isGuest && (
          <>
            <NavRow icon={KeyRound} title="Change password" onClick={() => setChangingPassword(true)} />
            <NavRow icon={Trash2} title="Delete account" onClick={() => setConfirmDelete(true)} danger />
          </>
        )}
      </section>

      <button
        type="button"
        onClick={onLogout}
        className="w-full flex items-center justify-center gap-2 py-4 bg-obsidian-wave border border-red-500/40 rounded-2xl hover:bg-red-500/5 hover:border-red-500/80 font-bold text-red-300 text-sm"
      >
        <LogOut className="w-4 h-4" aria-hidden="true" /> {isGuest ? 'Leave guest mode' : 'Sign out'}
      </button>

      {editing && user && <EditProfile user={user} onClose={() => setEditing(false)} />}
      {showParq && <ParqModal onClose={() => setShowParq(false)} />}
      {changingPassword && <ChangePassword onClose={() => setChangingPassword(false)} />}
      {confirmDelete && (
        <ConfirmDialog
          title="Delete your account?"
          message={`This permanently deletes your profile, workout history, plans, progress, reviews and photos.${user?.plan === 'plus' ? ' Your PLUS subscription is cancelled right away.' : ''} It can’t be undone.`}
          confirmText="Continue"
          danger
          icon={<AlertTriangle className="w-8 h-8 text-red-300" />}
          onConfirm={() => setDeleting(true)}
          onClose={() => setConfirmDelete(false)}
        />
      )}
      {deleting && <DeleteAccount onClose={() => setDeleting(false)} />}
    </div>
  );
}

function Badge({ children, color = '#00C4B4' }: { children: ReactNode; color?: string }) {
  return <span className="px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider" style={{ background: `${color}22`, color }}>{children}</span>;
}

function Stat({ icon: Icon, color, label, value, sub }: { icon: LucideIcon; color: string; label: string; value: string; sub?: string }) {
  return (
    <div className="bg-obsidian-wave rounded-2xl p-3 flex flex-col items-center text-center">
      <Icon className="w-4 h-4 mb-1" style={{ color }} aria-hidden="true" />
      <p className="text-lg font-extrabold text-white">{value}</p>
      <p className="text-[11px] text-white-70">{label}</p>
      {sub && <p className="text-[11px]" style={{ color }}>{sub}</p>}
    </div>
  );
}

function Row({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <p className="flex items-center gap-3 text-sm">
      <Icon className="w-4 h-4 text-lime-light shrink-0" aria-hidden="true" />
      <span className="text-white-70 w-20 shrink-0">{label}</span>
      <span className="font-bold text-white">{value}</span>
    </p>
  );
}

function NavRow({ icon: Icon, title, href, onClick, danger = false }: { icon: LucideIcon; title: string; href?: string; onClick?: () => void; danger?: boolean }) {
  const inner = (
    <>
      <span className={`flex items-center gap-3 text-sm font-bold ${danger ? 'text-red-300' : 'text-white'}`}><Icon className="w-4 h-4" aria-hidden="true" /> {title}</span>
      <ChevronRight className="w-4 h-4 text-white-70" aria-hidden="true" />
    </>
  );
  const className = 'w-full flex items-center justify-between p-4 bg-obsidian-wave rounded-2xl hover:bg-white/5';
  return href ? <Link href={href} className={className}>{inner}</Link> : <button type="button" onClick={onClick} className={className}>{inner}</button>;
}

// ─── Password and account ────────────────────────────────────────────────────
const errorText = (err: unknown, fallback: string) => (err instanceof Error ? err.message : fallback);

function ChangePassword({ onClose }: { onClose: () => void }) {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [repeat, setRepeat] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const save = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (next !== repeat) {
      setError('The new passwords don’t match.');
      return;
    }
    setSaving(true);
    try {
      await apiRequest('/auth/password', { method: 'PUT', body: { currentPassword: current, newPassword: next }, auth: true });
      setDone(true);
    } catch (err) {
      setError(errorText(err, 'Could not change your password.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title="Change password" onClose={onClose} size="sm">
      {done ? (
        <div className="space-y-5">
          <p role="status" className="flex items-start gap-2 bg-lime-light/10 border border-lime-light/30 rounded-xl p-3 text-sm text-white">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-lime-light" aria-hidden="true" />
            Password changed. You’re still signed in here; other devices will need to sign in again.
          </p>
          <button type="button" onClick={onClose} className="w-full bg-lime-light text-noir-eclipse font-extrabold py-4 rounded-2xl uppercase tracking-wider text-xs">Done</button>
        </div>
      ) : (
        <form onSubmit={save} className="space-y-4">
          <PasswordField label="Current password" value={current} onChange={setCurrent} autoComplete="current-password" />
          <PasswordField label="New password" value={next} onChange={setNext} autoComplete="new-password" minLength={PROFILE.PASSWORD_MIN} hint={`At least ${PROFILE.PASSWORD_MIN} characters.`} />
          <PasswordField label="Repeat new password" value={repeat} onChange={setRepeat} autoComplete="new-password" minLength={PROFILE.PASSWORD_MIN} />
          {error && <FormError message={error} />}
          <button type="submit" disabled={saving} className="w-full bg-lime-light text-noir-eclipse font-extrabold py-4 rounded-2xl uppercase tracking-wider text-xs flex items-center justify-center gap-2 disabled:opacity-60">
            {saving ? <><Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> Saving…</> : 'Change password'}
          </button>
        </form>
      )}
    </Modal>
  );
}

function DeleteAccount({ onClose }: { onClose: () => void }) {
  const { logout } = useAuth();
  const [password, setPassword] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const remove = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setDeleting(true);
    try {
      await apiRequest('/auth/account', { method: 'DELETE', body: { password }, auth: true });
      logout();
    } catch (err) {
      setError(errorText(err, 'Could not delete your account.'));
      setDeleting(false);
    }
  };

  return (
    <Modal title="Delete account" onClose={onClose} size="sm">
      <form onSubmit={remove} className="space-y-4">
        <p className="text-sm text-white-70">Enter your password to permanently delete your FitGuide account and everything in it.</p>
        <PasswordField label="Password" value={password} onChange={setPassword} autoComplete="current-password" />
        {error && <FormError message={error} />}
        <button type="submit" disabled={deleting || !password} className="w-full bg-red-500 hover:bg-red-600 text-white font-extrabold py-4 rounded-2xl uppercase tracking-wider text-xs flex items-center justify-center gap-2 disabled:opacity-60">
          {deleting ? <><Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> Deleting…</> : 'Delete my account'}
        </button>
      </form>
    </Modal>
  );
}

function PasswordField({ label, value, onChange, autoComplete, minLength, hint }: {
  label: string; value: string; onChange: (v: string) => void; autoComplete: string; minLength?: number; hint?: string;
}) {
  const id = useId();
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-xs font-bold text-white-70 uppercase tracking-wider">{label}</label>
      <input
        id={id}
        type="password"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        minLength={minLength}
        required
        aria-describedby={hint ? `${id}-hint` : undefined}
        className="w-full bg-noir-eclipse border border-white-30/20 rounded-xl px-3.5 py-2.5 text-white text-sm focus:border-lime-light"
      />
      {hint && <p id={`${id}-hint`} className="text-xs text-white-70">{hint}</p>}
    </div>
  );
}

function FormError({ message }: { message: string }) {
  return (
    <p role="alert" className="flex items-start gap-2 bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-sm text-red-300">
      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" /> {message}
    </p>
  );
}

// ─── Edit form ───────────────────────────────────────────────────────────────
type Form = {
  name: string;
  gender: string;
  height: string;
  weight: string;
  targetWeight: string;
  birthYear: string;
  fitnessLevel: string;
  activityStatus: string;
  goal: string;
  diet: string;
  avatarUrl: string | null;
  showOnLeaderboards: boolean;
};

const toForm = (u: AuthUser): Form => ({
  name: u.name || '',
  gender: u.gender || 'Prefer not to say',
  height: u.height ? String(u.height) : '',
  weight: u.weight ? String(u.weight) : '',
  targetWeight: u.targetWeight ? String(u.targetWeight) : '',
  birthYear: u.birthYear ? String(u.birthYear) : '',
  fitnessLevel: u.fitnessLevel || 'Beginner',
  activityStatus: u.activityStatus || 'Active',
  goal: u.goal || 'Vitality',
  diet: u.diet || 'Flexible Balanced Plan',
  avatarUrl: u.avatarUrl || null,
  showOnLeaderboards: u.showOnLeaderboards ?? true,
});

function EditProfile({ user, onClose }: { user: AuthUser; onClose: () => void }) {
  const { isGuest, updateUser } = useAuth();
  const [form, setForm] = useState<Form>(() => toForm(user));
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const set = <K extends keyof Form>(key: K, value: Form[K]) => setForm((f) => ({ ...f, [key]: value }));
  const maxBirthYear = new Date().getFullYear() - PROFILE.MIN_AGE;

  const pickAvatar = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    if (isGuest) {
      set('avatarUrl', URL.createObjectURL(file)); // guests keep a local preview only
      return;
    }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('avatar', file);
      const data = await apiRequest('/upload/avatar', { method: 'POST', formData, auth: true });
      set('avatarUrl', data.avatarUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not upload the photo.');
    } finally {
      setUploading(false);
    }
  };

  const save = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    const numberOrNull = (s: string) => (s.trim() === '' ? null : Number(s));
    const changes = {
      ...form,
      name: form.name.trim(),
      height: numberOrNull(form.height),
      weight: numberOrNull(form.weight),
      targetWeight: numberOrNull(form.targetWeight),
      birthYear: numberOrNull(form.birthYear),
    };
    try {
      if (isGuest) {
        updateUser(changes as Partial<AuthUser>);
      } else {
        // The API rejects nulls for body measurements: leave empty ones unchanged.
        const body = Object.fromEntries(Object.entries(changes).filter(([k, v]) => v !== null || k === 'birthYear'));
        const data = await apiRequest('/auth/profile', { method: 'PUT', body, auth: true });
        updateUser(data.user);
      }
      setSaved(true);
      setTimeout(onClose, 900);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save your profile.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title="Edit profile" onClose={onClose} placement="sheet">
      <form onSubmit={save} className="space-y-5">
        <div className="flex justify-center">
          <div className="relative">
            <div className="w-20 h-20 rounded-full bg-noir-eclipse border-2 border-lime-light overflow-hidden flex items-center justify-center">
              {form.avatarUrl
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={assetUrl(form.avatarUrl) || ''} alt="Your avatar" className="w-full h-full object-cover" />
                : <User className="w-8 h-8 text-white-70" aria-hidden="true" />}
            </div>
            <label htmlFor="profile-avatar" className="absolute bottom-0 right-0 p-1.5 bg-lime-light text-noir-eclipse rounded-full cursor-pointer">
              {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" /> : <Camera className="w-3.5 h-3.5" aria-hidden="true" />}
              <span className="sr-only">Change profile photo</span>
            </label>
            <input id="profile-avatar" type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={(e) => pickAvatar(e.target.files?.[0])} className="sr-only" />
          </div>
        </div>

        <TextField label="Name" value={form.name} onChange={(v) => set('name', v)} required maxLength={PROFILE.NAME_MAX} />
        <div className="grid grid-cols-3 gap-3">
          <TextField label="Height (cm)" type="number" value={form.height} onChange={(v) => set('height', v)} min={PROFILE.HEIGHT_CM[0]} max={PROFILE.HEIGHT_CM[1]} />
          <TextField label="Weight (kg)" type="number" value={form.weight} onChange={(v) => set('weight', v)} min={PROFILE.WEIGHT_KG[0]} max={PROFILE.WEIGHT_KG[1]} step="0.1" />
          <TextField label="Target (kg)" type="number" value={form.targetWeight} onChange={(v) => set('targetWeight', v)} min={PROFILE.WEIGHT_KG[0]} max={PROFILE.WEIGHT_KG[1]} step="0.1" />
        </div>
        <TextField label="Birth year (for calorie targets)" type="number" value={form.birthYear} onChange={(v) => set('birthYear', v)} min={PROFILE.MIN_BIRTH_YEAR} max={maxBirthYear} />
        <Choices label="Gender" options={PROFILE.GENDERS} value={form.gender} onChange={(v) => set('gender', v)} />
        <Choices label="Fitness level" options={PROFILE.FITNESS_LEVELS} value={form.fitnessLevel} onChange={(v) => set('fitnessLevel', v)} />
        <Choices label="Activity" options={PROFILE.ACTIVITY_STATUSES} value={form.activityStatus} onChange={(v) => set('activityStatus', v)} />
        <Choices label="Main goal" options={PROFILE.GOALS} value={form.goal} onChange={(v) => set('goal', v)} />
        <Choices label="Diet" options={PROFILE.DIETS} value={form.diet} onChange={(v) => set('diet', v)} />

        {!isGuest && (
          <label className="flex items-center justify-between gap-3 bg-white/5 border border-white-30/15 rounded-xl px-4 py-3 cursor-pointer">
            <span className="text-sm font-bold text-white">
              Show me on leaderboards
              <span className="block text-xs font-normal text-white-70">Friends and challenge members see your first name and last initial.</span>
            </span>
            <input type="checkbox" checked={form.showOnLeaderboards} onChange={(e) => set('showOnLeaderboards', e.target.checked)} className="w-5 h-5 accent-lime-light" />
          </label>
        )}

        {error && (
          <p role="alert" className="flex items-start gap-2 bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-sm text-red-300">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" /> {error}
          </p>
        )}
        <button type="submit" disabled={saving || uploading} className="w-full bg-lime-light text-noir-eclipse font-extrabold py-4 rounded-2xl uppercase tracking-wider text-xs flex items-center justify-center gap-2 disabled:opacity-60">
          {saved ? <><CheckCircle2 className="w-4 h-4" aria-hidden="true" /> Saved</> : saving ? <><Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> Saving…</> : 'Save changes'}
        </button>
      </form>
    </Modal>
  );
}

function TextField({ label, value, onChange, type = 'text', ...rest }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean; maxLength?: number; min?: number; max?: number; step?: string;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-bold text-white-70 uppercase tracking-wider">{label}</span>
      <input
        type={type}
        inputMode={type === 'number' ? 'decimal' : undefined}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        {...rest}
        className="w-full bg-noir-eclipse border border-white-30/20 rounded-xl px-3.5 py-2.5 text-white text-sm focus:border-lime-light"
      />
    </label>
  );
}

function Choices({ label, options, value, onChange }: { label: string; options: readonly string[]; value: string; onChange: (v: string) => void }) {
  return (
    <fieldset className="space-y-2">
      <legend className="text-xs font-bold text-white-70 uppercase tracking-wider mb-2">{label}</legend>
      <div className="grid grid-cols-2 gap-2">
        {options.map((o) => (
          <button
            key={o}
            type="button"
            onClick={() => onChange(o)}
            aria-pressed={value === o}
            className={`py-2 px-3 rounded-xl text-xs font-bold border text-left ${value === o ? 'bg-lime-light/15 border-lime-light text-white' : 'bg-white/5 border-white-30/15 text-white-70'}`}
          >
            {o}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
