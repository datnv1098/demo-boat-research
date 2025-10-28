// ระบบตรวจสอบคุณภาพและความถูกต้องของข้อมูลประมงไทย
// Data Quality and Validation System for Thai Fisheries

import {
  realTrips,
  realCPUEData,
  realLengthData,
  realSpeciesInfo,
  realWaterQualityData,
  SPECIES_INFO,
  FISHING_AREAS
} from './mockData';
import {
  enhancedTrips,
  enhancedCPUEData,
  enhancedLengthData,
  validateMockDataConsistency
} from './enhancedMockData';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  summary: {
    totalRecords: number;
    validRecords: number;
    invalidRecords: number;
    completeness: number;
  };
}

// ตรวจสอบข้อมูล Trip
export const validateTripData = (trips: typeof realTrips): ValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];
  let validCount = 0;

  trips.forEach((trip, index) => {
    let isValid = true;

    // ตรวจสอบ tripId
    if (!trip.tripId || typeof trip.tripId !== 'string') {
      errors.push(`Trip ${index}: Invalid tripId`);
      isValid = false;
    }

    // ตรวจสอบ vessel
    if (!trip.vessel || typeof trip.vessel !== 'string') {
      errors.push(`Trip ${trip.tripId}: Invalid vessel name`);
      isValid = false;
    }

    // ตรวจสอบ fishingArea
    if (!trip.fishingArea || !FISHING_AREAS[trip.fishingArea as keyof typeof FISHING_AREAS]) {
      errors.push(`Trip ${trip.tripId}: Invalid fishing area`);
      isValid = false;
    }

    // ตรวจสอบ coordinates
    if (!trip.coordinates || typeof trip.coordinates.lat !== 'number' || typeof trip.coordinates.lon !== 'number') {
      errors.push(`Trip ${trip.tripId}: Invalid coordinates`);
      isValid = false;
    } else {
      // ตรวจสอบช่วงพิกัดประเทศไทย
      if (trip.coordinates.lat < 5.5 || trip.coordinates.lat > 20.5 ||
          trip.coordinates.lon < 97.0 || trip.coordinates.lon > 105.5) {
        warnings.push(`Trip ${trip.tripId}: Coordinates outside Thailand bounds`);
      }
    }

    // ตรวจสอบ duration
    if (typeof trip.duration !== 'number' || trip.duration <= 0 || trip.duration > 72) {
      errors.push(`Trip ${trip.tripId}: Invalid duration (must be 0-72 hours)`);
      isValid = false;
    }

    // ตรวจสอบ totalCatch
    if (typeof trip.totalCatch !== 'number' || trip.totalCatch < 0) {
      errors.push(`Trip ${trip.tripId}: Invalid catch weight`);
      isValid = false;
    } else if (trip.totalCatch > 2000) {
      warnings.push(`Trip ${trip.tripId}: Exceptionally high catch weight`);
    }

    // ตรวจสอบ dqScore
    if (typeof trip.dqScore !== 'number' || trip.dqScore < 0 || trip.dqScore > 100) {
      errors.push(`Trip ${trip.tripId}: Invalid data quality score`);
      isValid = false;
    }

    // ตรวจสอบ fuelConsumption
    if (typeof trip.fuelConsumption !== 'number' || trip.fuelConsumption < 0) {
      warnings.push(`Trip ${trip.tripId}: Invalid fuel consumption`);
    }

    // ตรวจสอบความสอดคล้องของวันที่
    if (trip.startDate && trip.endDate) {
      const start = new Date(trip.startDate);
      const end = new Date(trip.endDate);
      if (end < start) {
        errors.push(`Trip ${trip.tripId}: End date before start date`);
        isValid = false;
      }

      // ตรวจสอบความสอดคล้องกับ duration
      const calculatedDuration = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
      if (Math.abs(calculatedDuration - trip.duration) > 2) {
        warnings.push(`Trip ${trip.tripId}: Duration mismatch with dates`);
      }
    }

    if (isValid) validCount++;
  });

  const totalRecords = trips.length;
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    summary: {
      totalRecords,
      validRecords: validCount,
      invalidRecords: totalRecords - validCount,
      completeness: Math.round((validCount / totalRecords) * 100)
    }
  };
};

// ตรวจสอบข้อมูล CPUE
export const validateCPUEData = (cpueData: typeof realCPUEData): ValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];
  let validCount = 0;

  cpueData.forEach((record, index) => {
    let isValid = true;

    // ตรวจสอบ species
    if (!record.species || !SPECIES_INFO[record.species]) {
      errors.push(`CPUE ${index}: Unknown species "${record.species}"`);
      isValid = false;
    }

    // ตรวจสอบ fishingArea
    if (!record.fishingArea || !FISHING_AREAS[record.fishingArea as keyof typeof FISHING_AREAS]) {
      errors.push(`CPUE ${index}: Invalid fishing area`);
      isValid = false;
    }

    // ตรวจสอบ CPUE
    if (typeof record.cpue !== 'number' || record.cpue < 0) {
      errors.push(`CPUE ${index}: Invalid CPUE value`);
      isValid = false;
    } else if (record.cpue > 200) {
      warnings.push(`CPUE ${index}: Exceptionally high CPUE`);
    }

    // ตรวจสอบ effort
    if (typeof record.effort !== 'number' || record.effort <= 0 || record.effort > 48) {
      errors.push(`CPUE ${index}: Invalid effort hours`);
      isValid = false;
    }

    // ตรวจสอบ catch
    if (typeof record.catch !== 'number' || record.catch < 0) {
      errors.push(`CPUE ${index}: Invalid catch weight`);
      isValid = false;
    }

    // ตรวจสอบความสอดคล้อง CPUE
    const calculatedCPUE = record.effort > 0 ? record.catch / record.effort : 0;
    if (Math.abs(calculatedCPUE - record.cpue) > 0.5) {
      warnings.push(`CPUE ${index}: Catch calculation mismatch`);
    }

    if (isValid) validCount++;
  });

  const totalRecords = cpueData.length;
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    summary: {
      totalRecords,
      validRecords: validCount,
      invalidRecords: totalRecords - validCount,
      completeness: Math.round((validCount / totalRecords) * 100)
    }
  };
};

// ตรวจสอบข้อมูล Length Frequency
export const validateLengthData = (lengthData: typeof realLengthData): ValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];
  let validCount = 0;

  lengthData.forEach((record, index) => {
    let isValid = true;

    // ตรวจสอบ species
    if (!record.species || !SPECIES_INFO[record.species]) {
      errors.push(`Length ${index}: Unknown species "${record.species}"`);
      isValid = false;
    }

    // ตรวจสอบ lengthBin
    if (!record.lengthBin || !record.lengthBin.includes('-')) {
      errors.push(`Length ${index}: Invalid length bin format`);
      isValid = false;
    }

    // ตรวจสอบ counts
    const totalCount = (record.male || 0) + (record.female || 0) + (record.unsexed || 0);
    if (totalCount <= 0) {
      errors.push(`Length ${index}: No specimens recorded`);
      isValid = false;
    }

    // ตรวจสอบ length range
    const speciesInfo = SPECIES_INFO[record.species];
    if (speciesInfo) {
      const [min, max] = record.lengthBin.replace('cm', '').split('-').map(x => parseFloat(x));
      if (min > speciesInfo.maxLength || max < speciesInfo.lm50 * 0.1) {
        warnings.push(`Length ${index}: Length range outside species expectations`);
      }
    }

    if (isValid) validCount++;
  });

  const totalRecords = lengthData.length;
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    summary: {
      totalRecords,
      validRecords: validCount,
      invalidRecords: totalRecords - validCount,
      completeness: Math.round((validCount / totalRecords) * 100)
    }
  };
};

// ตรวจสอบข้อมูล Species
export const validateSpeciesData = (speciesData: typeof realSpeciesInfo): ValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];
  let validCount = 0;

  Object.entries(speciesData).forEach(([name, species], index) => {
    let isValid = true;

    // ตรวจสอบชื่อ
    if (!species.scientificName || !species.thaiName) {
      errors.push(`Species ${name}: Missing scientific or Thai name`);
      isValid = false;
    }

    // ตรวจสอบ biological parameters
    if (typeof species.lm50 !== 'number' || species.lm50 <= 0) {
      errors.push(`Species ${name}: Invalid lm50`);
      isValid = false;
    }

    if (typeof species.maxLength !== 'number' || species.maxLength <= 0) {
      errors.push(`Species ${name}: Invalid maxLength`);
      isValid = false;
    }

    if (species.lm50 >= species.maxLength) {
      warnings.push(`Species ${name}: lm50 should be less than maxLength`);
    }

    // ตรวจสอบ economic value
    const validValues = ['ต่ำ', 'ปานกลาง', 'สูง', 'สูงมาก'];
    if (!validValues.includes(species.economicValue)) {
      errors.push(`Species ${name}: Invalid economic value`);
      isValid = false;
    }

    if (isValid) validCount++;
  });

  const totalRecords = Object.keys(speciesData).length;
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    summary: {
      totalRecords,
      validRecords: validCount,
      invalidRecords: totalRecords - validCount,
      completeness: Math.round((validCount / totalRecords) * 100)
    }
  };
};

// ตรวจสอบข้อมูลคุณภาพน้ำ
export const validateWaterQualityData = (wqData: typeof realWaterQualityData): ValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];
  let validCount = 0;

  wqData.forEach((record, index) => {
    let isValid = true;

    // ตรวจสอบ tripId
    if (!record.tripId) {
      errors.push(`Water Quality ${index}: Missing tripId`);
      isValid = false;
    }

    // ตรวจสอบ temperature
    ['surface', 'middle', 'bottom'].forEach(layer => {
      const temp = record.temperature[layer];
      if (typeof temp !== 'number' || temp < 10 || temp > 40) {
        errors.push(`Water Quality ${index}: Invalid ${layer} temperature`);
        isValid = false;
      }
    });

    // ตรวจสอบ salinity
    ['surface', 'middle', 'bottom'].forEach(layer => {
      const sal = record.salinity[layer];
      if (typeof sal !== 'number' || sal < 0 || sal > 50) {
        errors.push(`Water Quality ${index}: Invalid ${layer} salinity`);
        isValid = false;
      }
    });

    // ตรวจสอบ pH
    ['surface', 'middle', 'bottom'].forEach(layer => {
      const ph = record.pH[layer];
      if (typeof ph !== 'number' || ph < 4 || ph > 11) {
        errors.push(`Water Quality ${index}: Invalid ${layer} pH`);
        isValid = false;
      }
    });

    // ตรวจสอบ dissolved oxygen
    ['surface', 'middle', 'bottom'].forEach(layer => {
      const do2 = record.dissolvedOxygen[layer];
      if (typeof do2 !== 'number' || do2 < 0 || do2 > 20) {
        errors.push(`Water Quality ${index}: Invalid ${layer} dissolved oxygen`);
        isValid = false;
      }
    });

    // ตรวจสอบ transparency
    if (typeof record.transparency !== 'number' || record.transparency < 0 || record.transparency > 50) {
      errors.push(`Water Quality ${index}: Invalid transparency`);
      isValid = false;
    }

    if (isValid) validCount++;
  });

  const totalRecords = wqData.length;
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    summary: {
      totalRecords,
      validRecords: validCount,
      invalidRecords: totalRecords - validCount,
      completeness: Math.round((validCount / totalRecords) * 100)
    }
  };
};

// ฟังก์ชันตรวจสอบข้อมูลทั้งหมด
export const validateAllData = () => {
  console.log('🔍 กำลังตรวจสอบคุณภาพข้อมูล...\n');

  const results = {
    trips: validateTripData(realTrips),
    cpue: validateCPUEData(realCPUEData),
    length: validateLengthData(realLengthData),
    species: validateSpeciesData(realSpeciesInfo),
    waterQuality: validateWaterQualityData(realWaterQualityData),
    enhanced: validateMockDataConsistency()
  };

  // แสดงผลการตรวจสอบ
  Object.entries(results).forEach(([dataType, result]) => {
    console.log(`📊 ${dataType.toUpperCase()} DATA:`);
    console.log(`   ✓ Valid: ${result.summary.validRecords}/${result.summary.totalRecords} (${result.summary.completeness}%)`);

    if (result.errors.length > 0) {
      console.log(`   ❌ Errors: ${result.errors.length}`);
      result.errors.slice(0, 3).forEach(error => console.log(`      - ${error}`));
      if (result.errors.length > 3) console.log(`      ... and ${result.errors.length - 3} more`);
    }

    if (result.warnings.length > 0) {
      console.log(`   ⚠️  Warnings: ${result.warnings.length}`);
      result.warnings.slice(0, 2).forEach(warning => console.log(`      - ${warning}`));
    }
    console.log('');
  });

  // สรุปผลการตรวจสอบ
  const totalValid = Object.values(results).every(r => r.isValid);
  const totalErrors = Object.values(results).reduce((sum, r) => sum + r.errors.length, 0);
  const totalWarnings = Object.values(results).reduce((sum, r) => sum + r.warnings.length, 0);

  console.log('🎯 SUMMARY:');
  console.log(`   Overall Status: ${totalValid ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`   Total Errors: ${totalErrors}`);
  console.log(`   Total Warnings: ${totalWarnings}`);

  return results;
};

// ฟังก์ชันสร้างรายงานการตรวจสอบ
export const generateValidationReport = () => {
  const results = validateAllData();

  return {
    timestamp: new Date().toISOString(),
    summary: {
      overallStatus: Object.values(results).every(r => r.isValid) ? 'passed' : 'failed',
      totalErrors: Object.values(results).reduce((sum, r) => sum + r.errors.length, 0),
      totalWarnings: Object.values(results).reduce((sum, r) => sum + r.warnings.length, 0)
    },
    details: results,
    recommendations: generateRecommendations(results)
  };
};

const generateRecommendations = (results: any) => {
  const recommendations = [];

  if (results.trips.errors.length > 0) {
    recommendations.push('ตรวจสอบและแก้ไขข้อมูล Trip ที่มีปัญหาพิกัดและน้ำหนักจับ');
  }

  if (results.cpue.errors.length > 0) {
    recommendations.push('ตรวจสอบความสอดคล้องของข้อมูล CPUE และ effort hours');
  }

  if (results.species.errors.length > 0) {
    recommendations.push('เพิ่มข้อมูล biological parameters ที่หายไปสำหรับสายพันธุ์ต่างๆ');
  }

  if (results.waterQuality.errors.length > 0) {
    recommendations.push('ตรวจสอบช่วงค่าของพารามิเตอร์คุณภาพน้ำให้ถูกต้อง');
  }

  if (recommendations.length === 0) {
    recommendations.push('ข้อมูลทั้งหมดผ่านการตรวจสอบ คุณภาพข้อมูลดีเยี่ยม!');
  }

  return recommendations;
};

// Export สำหรับใช้ในระบบ
export { validateAllData as runDataValidation };
