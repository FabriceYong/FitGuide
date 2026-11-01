'use client';

/**
 * Showing and entering weights and lengths in the user's units (the app's
 * core/units.dart). The API keeps everything in kg and cm.
 */
import { useAuth } from '../contexts/AuthContext';

export type Units = 'metric' | 'imperial';

export const LB_PER_KG = 2.20462;
export const CM_PER_INCH = 2.54;

const oneDecimal = (n: number) => Math.round(n * 10) / 10;

/** The signed-in user's (or guest's) units. */
export function useUnits(): Units {
  const { user } = useAuth();
  return user?.units === 'imperial' ? 'imperial' : 'metric';
}

/** "kg" or "lb". */
export const weightUnit = (units: Units) => (units === 'imperial' ? 'lb' : 'kg');
/** "kilograms" or "pounds", for screen readers. */
export const weightUnitName = (units: Units) => (units === 'imperial' ? 'pounds' : 'kilograms');
/** "cm" or "in", for body measurements. */
export const lengthUnit = (units: Units) => (units === 'imperial' ? 'in' : 'cm');

/** A weight in kg, in the user's unit (one decimal). */
export const weightIn = (kg: number, units: Units) => oneDecimal(units === 'imperial' ? kg * LB_PER_KG : kg);
/** A weight entered in the user's unit, in kg. */
export const kgFrom = (value: number, units: Units) => (units === 'imperial' ? Math.round((value / LB_PER_KG) * 10000) / 10000 : value);
/** "62.5 kg" or "137.8 lb". */
export const weightText = (kg: number, units: Units) => `${weightIn(kg, units)} ${weightUnit(units)}`;

/** A length in cm, in the user's unit (one decimal). */
export const lengthIn = (cm: number, units: Units) => oneDecimal(units === 'imperial' ? cm / CM_PER_INCH : cm);
/** A length entered in the user's unit, in cm. */
export const cmFrom = (value: number, units: Units) => (units === 'imperial' ? Math.round(value * CM_PER_INCH * 100) / 100 : value);

/** A height: "170 cm" or "5′ 7″". */
export function heightText(cm: number, units: Units) {
  if (units !== 'imperial') return `${cm} cm`;
  const inches = Math.round(cm / CM_PER_INCH);
  return `${Math.floor(inches / 12)}′ ${inches % 12}″`;
}

/** A body measurement field (weightKg, waistCm, bodyFatPct …) in the user's units. */
export const measureUnit = (key: string, units: Units) => (key.endsWith('Kg') ? weightUnit(units) : key.endsWith('Cm') ? lengthUnit(units) : '%');
export const measureIn = (key: string, value: number, units: Units) => (key.endsWith('Kg') ? weightIn(value, units) : key.endsWith('Cm') ? lengthIn(value, units) : value);
export const measureFrom = (key: string, value: number, units: Units) => (key.endsWith('Kg') ? kgFrom(value, units) : key.endsWith('Cm') ? cmFrom(value, units) : value);
export const measureText = (key: string, value: number, units: Units) => `${measureIn(key, value, units)} ${measureUnit(key, units)}`;
