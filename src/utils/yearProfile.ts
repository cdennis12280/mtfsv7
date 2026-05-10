import type { YearProfile5 } from '../types/financial';

export type YearKey = keyof YearProfile5;

export const YEAR_KEYS: YearKey[] = ['y1', 'y2', 'y3', 'y4', 'y5'];

export function makeYearProfile(value: number): YearProfile5 {
  return { y1: value, y2: value, y3: value, y4: value, y5: value };
}

export function coerceYearProfile(value: YearProfile5 | number | unknown, fallback: YearProfile5 | number = 0): YearProfile5 {
  const fallbackProfile = typeof fallback === 'number' ? makeYearProfile(fallback) : fallback;
  if (value && typeof value === 'object') {
    const source = value as Partial<YearProfile5>;
    return {
      y1: Number.isFinite(Number(source.y1)) ? Number(source.y1) : fallbackProfile.y1,
      y2: Number.isFinite(Number(source.y2)) ? Number(source.y2) : fallbackProfile.y2,
      y3: Number.isFinite(Number(source.y3)) ? Number(source.y3) : fallbackProfile.y3,
      y4: Number.isFinite(Number(source.y4)) ? Number(source.y4) : fallbackProfile.y4,
      y5: Number.isFinite(Number(source.y5)) ? Number(source.y5) : fallbackProfile.y5,
    };
  }
  const scalar = Number(value);
  return Number.isFinite(scalar) ? makeYearProfile(scalar) : fallbackProfile;
}

export function y1(value: YearProfile5 | number): number {
  return typeof value === 'number' ? value : value.y1;
}

export function profileValue(value: YearProfile5 | number, year: number): number {
  if (typeof value === 'number') return value;
  const key = YEAR_KEYS[Math.max(0, Math.min(4, year - 1))];
  return value[key];
}

export function updateYearProfile(profile: YearProfile5 | number, year: YearKey, value: number): YearProfile5 {
  return { ...coerceYearProfile(profile), [year]: value };
}

export function updateAllYears(_profile: YearProfile5 | number, value: number): YearProfile5 {
  return makeYearProfile(value);
}

export function addToProfile(profile: YearProfile5 | number, delta: number): YearProfile5 {
  const p = coerceYearProfile(profile);
  return {
    y1: p.y1 + delta,
    y2: p.y2 + delta,
    y3: p.y3 + delta,
    y4: p.y4 + delta,
    y5: p.y5 + delta,
  };
}
