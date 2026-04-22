/**
 * farmConstants.js — Application-wide enum values for the Sheep Farm Management System.
 *
 * These are production constants, NOT mock data. They mirror backend enum validations.
 * Renamed from data/mockData.js (P3-08 / F-71).
 */

// ============ ANIMALS ============
export const animalTypes = ['Sheep', 'Goat'];
export const breedTypes = ['Dumba', 'Kajli', 'Beetal', 'Teddy', 'Barbari', 'Nachi', 'Rakhshani', 'Lohi', 'Dorper', 'Sannen', 'Boer', 'Mundri', 'Thalli', 'Cross', 'others'];
export const animalSubcategories = ['Fattening', 'Production', 'Breeding', 'Heifer'];
export const sexOptions = ['Male', 'Female'];
export const countries = ['Pakistan', 'Afghanistan', 'Iran', 'Australia'];
export const animalStatuses = ['Active', 'Quarantine', 'Sold', 'Dead', 'Returned', 'Slaughtered'];

// ============ PENS ============
export const penTypes = ['Fattening', 'Production', 'Quarantine', 'Heifer', 'Dry', 'Close-up'];

// ============ STOCK ============
export const stockCategories = ['Feeding', 'Medication', 'Farm Accessories', 'Semen', 'Seeds', 'Fertilizers', 'Pesticides'];
export const stockUnits = ['kg', 'gm', 'ltr', 'ml', 'nos'];

// ============ EMPLOYEES ============
export const departments = ['Operations', 'Health', 'Finance', 'Administration'];
export const designations = ['Farm Manager', 'Veterinarian', 'Farm Worker', 'Accountant', 'Supervisor', 'Security'];
export const banks = ['HBL', 'MCB', 'UBL', 'Allied Bank', 'Bank Alfalah', 'Meezan Bank', 'Faysal Bank'];

// ============ HEALTH & VETERINARY ============
export const treatmentTypes = ['Treatment', 'Protocol'];
export const diagnosisTypes = [
  'Intrauterine',
  'Dystokia',
  'Wound',
  'Theleria',
  'Mastitis',
  'Pneumonia',
  'Diarrhea',
  'Bloat',
  'Foot Rot',
  'Pink Eye',
  'Parasitic Infection',
  'Respiratory Infection',
  'Fever',
  'Other',
];
export const dewormingTypes = ['Albendazole', 'Levamisole', 'Thunder', 'Ivermectin', 'Fenbendazole'];
export const hoofDiagnosis = [
  'Foot Rot',
  'Laminitis',
  'White Line Disease',
  'Sole Ulcer',
  'Heel Erosion',
  'Interdigital Dermatitis',
  'Digital Dermatitis',
  'Overgrown Hooves',
  'Cracked Hooves',
  'Abscess',
  'Routine Trimming',
  'Other',
];
export const shearingTypes = [
  'Full Body',
  'Belly Only',
  'Crutching',
  'Wigging',
  'Pre-Lambing',
  'Routine',
  'Other',
];
