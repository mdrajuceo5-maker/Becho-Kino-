import { DivisionLocation } from '../types';
import geoData from './bangladeshGeoData.json';

export interface GeoUpazila {
  en: string;
  bn: string;
}

export interface GeoDistrict {
  district: string;
  districtBn: string;
  upazilas: GeoUpazila[];
}

export interface GeoDivision {
  division: string;
  divisionBn: string;
  districts: GeoDistrict[];
}

export const RAW_BANGLADESH_GEO_DATA: GeoDivision[] = geoData as GeoDivision[];

/**
 * Startup Validation Function:
 * Asserts exactly 8 Divisions, 64 Districts, and exactly 499 Upazilas.
 * Strictly no Thana, Union, Ward, or synthetic sub-areas.
 */
export function validateBangladeshGeoData(): {
  isValid: boolean;
  totalDivisions: number;
  totalDistricts: number;
  totalUpazilas: number;
} {
  let districtCount = 0;
  let upazilaCount = 0;

  for (const div of RAW_BANGLADESH_GEO_DATA) {
    districtCount += div.districts.length;
    for (const dist of div.districts) {
      upazilaCount += dist.upazilas.length;
    }
  }

  const isValid = RAW_BANGLADESH_GEO_DATA.length === 8 && districtCount === 64 && upazilaCount === 499;

  if (isValid) {
    console.info(`[BechoKino Geo-Data Validated] 8 Divisions, 64 Districts, exactly 499 Upazilas confirmed.`);
  } else {
    console.warn(`[BechoKino Geo-Data Warning] Count mismatch: ${RAW_BANGLADESH_GEO_DATA.length} Divisions, ${districtCount} Districts, ${upazilaCount} Upazilas.`);
  }

  return {
    isValid,
    totalDivisions: RAW_BANGLADESH_GEO_DATA.length,
    totalDistricts: districtCount,
    totalUpazilas: upazilaCount
  };
}

// Auto-run startup validation
export const GEO_VALIDATION_RESULT = validateBangladeshGeoData();

/**
 * Formatted BANGLADESH_DIVISIONS compatible with DivisionLocation interface
 */
export const BANGLADESH_DIVISIONS: DivisionLocation[] = RAW_BANGLADESH_GEO_DATA.map((div) => ({
  name: `${div.divisionBn} (${div.division})`,
  districts: div.districts.map((dist) => ({
    name: `${dist.districtBn} (${dist.district})`,
    upazilas: dist.upazilas.map((u) => u.bn)
  }))
}));

export const CATEGORIES_LIST = [
  { id: 'all', name: 'সব বিজ্ঞাপন', icon: 'Layers' },
  { id: 'ইলেকট্রনিক', name: 'ইলেকট্রনিক', icon: 'Tv' },
  { id: 'কম্পিউটার এন্ড ল্যাপটপ', name: 'কম্পিউটার এন্ড ল্যাপটপ', icon: 'Laptop' },
  { id: 'মোবাইল', name: 'মোবাইল', icon: 'Smartphone' },
  { id: 'আসবাবপত্র', name: 'আসবাবপত্র', icon: 'Armchair' },
  { id: 'বাইক', name: 'বাইক', icon: 'Bike' },
  { id: 'মোটরসাইকেল', name: 'মোটরসাইকেল', icon: 'Bike' }
];

export const DEFAULT_CATEGORY_PROMO_PRICES: Record<string, { top7: number; top30: number; boostMonth: number }> = {
  'মোবাইল': { top7: 299, top30: 599, boostMonth: 1199 },
  'ইলেকট্রনিক': { top7: 299, top30: 599, boostMonth: 1199 },
  'কম্পিউটার এন্ড ল্যাপটপ': { top7: 399, top30: 799, boostMonth: 1399 },
  'আসবাবপত্র': { top7: 349, top30: 699, boostMonth: 1299 },
  'বাইক': { top7: 499, top30: 999, boostMonth: 1899 },
  'মোটরসাইকেল': { top7: 499, top30: 999, boostMonth: 1899 },
  'default': { top7: 399, top30: 799, boostMonth: 1399 }
};
