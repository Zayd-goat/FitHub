import type { DistanceUnit, WeightUnit } from '../components/UI';

export const kgToDisplay = (kg: number, unit: WeightUnit) => unit === 'lb' ? kg / 0.45359237 : kg;
export const displayToKg = (value: number, unit: WeightUnit) => unit === 'lb' ? value * 0.45359237 : value;
export const kmToDisplay = (km: number, unit: DistanceUnit) => unit === 'mi' ? km / 1.609344 : km;
export const displayToKm = (value: number, unit: DistanceUnit) => unit === 'mi' ? value * 1.609344 : value;
export const formatWeight = (kg: number, unit: WeightUnit, decimals = 1) => `${kgToDisplay(kg, unit).toFixed(decimals).replace(/\.0$/, '')} ${unit}`;
export const formatDistance = (km: number, unit: DistanceUnit, decimals = 2) => `${kmToDisplay(km, unit).toFixed(decimals).replace(/\.00$/, '').replace(/(\.\d)0$/, '$1')} ${unit}`;

export const formatPace = (minPerKm: number, unit: DistanceUnit, decimals = 2) => {
  const value = unit === 'mi' ? minPerKm * 1.609344 : minPerKm;
  return `${value.toFixed(decimals)} min/${unit}`;
};
