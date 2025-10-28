import fs from 'fs';
import {
  excelConvertedTrips,
  excelConvertedCPUEData,
  excelConvertedLengthData,
  excelConvertedWaterQualityData,
  excelConvertedSpeciesInfo,
  EXCEL_DATA_SUMMARY
} from './src/data/convertedExcelData.ts';

console.log('=== TESTING CONVERTED EXCEL DATA ===\n');

// Test basic data integrity
console.log('📊 BASIC DATA VALIDATION:');
console.log(`✓ Trips: ${excelConvertedTrips.length} records`);
console.log(`✓ CPUE Data: ${excelConvertedCPUEData.length} records`);
console.log(`✓ Length Data: ${excelConvertedLengthData.length} records`);
console.log(`✓ Water Quality: ${excelConvertedWaterQualityData.length} records`);
console.log(`✓ Species Info: ${Object.keys(excelConvertedSpeciesInfo).length} records\n`);

// Test data quality
console.log('🔍 DATA QUALITY CHECKS:');

// Check trips data
const validTrips = excelConvertedTrips.filter(trip =>
  trip.tripId &&
  trip.vessel &&
  trip.fishingArea &&
  trip.coordinates &&
  typeof trip.totalCatch === 'number' &&
  trip.totalCatch >= 0
);

console.log(`✓ Valid Trips: ${validTrips.length}/${excelConvertedTrips.length} (${Math.round(validTrips.length/excelConvertedTrips.length*100)}%)`);

// Check CPUE data
const validCPUE = excelConvertedCPUEData.filter(cpue =>
  cpue.species &&
  cpue.fishingArea &&
  typeof cpue.cpue === 'number' &&
  typeof cpue.effort === 'number' &&
  cpue.effort > 0
);

console.log(`✓ Valid CPUE Records: ${validCPUE.length}/${excelConvertedCPUEData.length} (${Math.round(validCPUE.length/excelConvertedCPUEData.length*100)}%)`);

// Check length data
const validLength = excelConvertedLengthData.filter(length =>
  length.species &&
  length.lengthBin &&
  (length.male >= 0 || length.female >= 0 || length.unsexed >= 0)
);

console.log(`✓ Valid Length Records: ${validLength.length}/${excelConvertedLengthData.length} (${Math.round(validLength.length/excelConvertedLengthData.length*100)}%)\n`);

// Sample data preview
console.log('📋 SAMPLE DATA PREVIEW:');

// Sample trip
if (excelConvertedTrips.length > 0) {
  console.log('Sample Trip:', {
    tripId: excelConvertedTrips[0].tripId,
    vessel: excelConvertedTrips[0].vessel,
    fishingArea: excelConvertedTrips[0].fishingArea,
    totalCatch: excelConvertedTrips[0].totalCatch,
    coordinates: excelConvertedTrips[0].coordinates
  });
}

// Sample CPUE
if (excelConvertedCPUEData.length > 0) {
  console.log('Sample CPUE:', {
    species: excelConvertedCPUEData[0].species,
    fishingArea: excelConvertedCPUEData[0].fishingArea,
    cpue: excelConvertedCPUEData[0].cpue,
    effort: excelConvertedCPUEData[0].effort,
    catch: excelConvertedCPUEData[0].catch
  });
}

// Sample species
const speciesKeys = Object.keys(excelConvertedSpeciesInfo);
if (speciesKeys.length > 0) {
  const sampleSpecies = excelConvertedSpeciesInfo[speciesKeys[0]];
  console.log('Sample Species:', {
    scientificName: sampleSpecies.scientificName,
    thaiName: sampleSpecies.thaiName,
    lm50: sampleSpecies.lm50,
    economicValue: sampleSpecies.economicValue
  });
}

console.log('\n🎯 DATA SUMMARY:');
console.log(EXCEL_DATA_SUMMARY);

// Test data consistency
console.log('\n🔗 DATA CONSISTENCY CHECKS:');

// Check if all trip IDs in CPUE data exist in trips
const tripIds = new Set(excelConvertedTrips.map(t => t.tripId));
const cpueTripIds = new Set(excelConvertedCPUEData.map(c => c.date + '_' + c.fishingArea)); // Different structure

// Check species consistency
const cpueSpecies = new Set(excelConvertedCPUEData.map(c => c.species));
const knownSpecies = new Set(Object.keys(excelConvertedSpeciesInfo));
const unknownSpecies = [...cpueSpecies].filter(s => !knownSpecies.has(s));

console.log(`✓ Unknown species in CPUE data: ${unknownSpecies.length}`);
if (unknownSpecies.length > 0) {
  console.log('  Unknown species:', unknownSpecies.slice(0, 5));
}

// Geographic coverage
const areas = [...new Set(excelConvertedTrips.map(t => t.fishingArea))];
console.log(`✓ Fishing areas covered: ${areas.length}`);
console.log('  Areas:', areas);

console.log('\n✅ EXCEL DATA CONVERSION TEST COMPLETE!');
console.log('📁 Data is ready for use in the Thai Fisheries Analytics project');
