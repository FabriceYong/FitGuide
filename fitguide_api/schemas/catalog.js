/**
 * Validation for catalog content edited through the admin CMS and the
 * creator studio (workouts, exercises and programs), and coach profiles.
 */
const { z } = require('zod');
const { CATALOG } = require('@fitguide/shared');

const slug = z.string().trim().toLowerCase().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'use lowercase letters, numbers and dashes').max(80);
const text = (max) => z.string().trim().max(max);
const list = (max = 30, itemMax = 200) => z.array(text(itemMax).min(1)).max(max).default([]);
const url = z.string().trim().url().max(500).nullish();

const step = z.object({
  instruction: text(1000).min(1),
  duration: z.number().int().min(0).max(3600).nullish(),
  exerciseName: text(100).nullish(),
  gifUrl: url,
  imageUrl: url,
  formCues: list(10),
  commonMistakes: list(10),
  breathingPattern: text(300).nullish(),
}).transform((s) => Object.fromEntries(Object.entries(s).filter(([, v]) => v != null)));

const workout = z.object({
  slug,
  title: text(100).min(3),
  description: text(1000).min(10),
  shortDescription: text(200).nullish(),
  category: z.enum(CATALOG.WORKOUT_CATEGORIES),
  difficulty: z.enum(CATALOG.DIFFICULTIES),
  duration: z.number().int().min(1).max(300),
  calories: z.number().int().min(0).max(3000).nullish(),
  intensity: z.enum(CATALOG.INTENSITIES).default('Moderate'),
  equipment: list(20, 60),
  targetMuscles: list(20, 60),
  benefits: list(20),
  tags: list(30, 40).transform((tags) => tags.map((t) => t.toLowerCase())),
  prerequisites: list(10),
  cautions: list(10),
  steps: z.array(step).max(100).default([]),
  modifications: z.array(z.object({ level: text(20).min(1), description: text(500).min(1) })).max(10).default([]),
  restPeriod: z.number().int().min(0).max(600).default(30),
  sets: z.number().int().min(1).max(20).default(1),
  reps: z.number().int().min(1).max(500).nullish(),
  thumbnailUrl: url,
  videoUrl: url,
  isPublished: z.boolean().default(true),
  isPremium: z.boolean().default(false),
});

const exercise = z.object({
  slug,
  name: text(100).min(2),
  aliases: list(20, 60).transform((a) => a.map((x) => x.toLowerCase())),
  category: z.enum(CATALOG.EXERCISE_CATEGORIES),
  trackingType: z.enum(CATALOG.TRACKING_TYPES),
  primaryMuscles: list(10, 60),
  equipment: list(10, 60),
  instructions: list(20, 500),
  formCues: list(10),
  commonMistakes: list(10),
});

const programDay = z.object({
  week: z.number().int().min(1).max(12),
  day: z.number().int().min(1).max(7),
  title: text(120).min(1),
  workoutSlug: slug,
  notes: text(300).nullish(),
});

const program = z.object({
  title: text(100).min(3),
  description: text(1000).min(10),
  level: z.enum(CATALOG.DIFFICULTIES),
  goal: text(60).min(2),
  weeks: z.number().int().min(1).max(12),
  daysPerWeek: z.number().int().min(1).max(7),
  inPerson: z.boolean().default(false),
  days: z.array(programDay).min(1).max(84),
}).superRefine((p, ctx) => {
  const seen = new Set();
  p.days.forEach((d, i) => {
    if (d.week > p.weeks) ctx.addIssue({ code: 'custom', path: ['days', i, 'week'], message: `week must be at most ${p.weeks}` });
    const key = `${d.week}:${d.day}`;
    if (seen.has(key)) ctx.addIssue({ code: 'custom', path: ['days', i], message: `week ${d.week} day ${d.day} is listed twice` });
    seen.add(key);
  });
});

// Empty strings clear an optional contact field.
const optional = (schema) => z.preprocess((v) => (typeof v === 'string' && !v.trim() ? null : v), schema.nullish());

const coachProfile = z.object({
  bio: text(1000).min(20, 'tell members about yourself in at least 20 characters'),
  specialties: list(10, 40),
  contactEmail: optional(z.string().trim().toLowerCase().email().max(200)),
  phone: optional(z.string().trim().regex(/^\+?[0-9 ()-]{6,40}$/, 'use digits, spaces, dashes and an optional leading +')),
  location: optional(text(120).min(2)),
}).refine((p) => p.contactEmail || p.phone, { message: 'add an email or a phone number members can reach you at', path: ['contactEmail'] });

module.exports = { schemas: { workout, exercise, program, programDay, coachProfile } };
