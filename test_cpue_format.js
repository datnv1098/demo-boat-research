import {
  excelConvertedCPUEData,
  excelConvertedSpeciesInfo
} from './src/data/convertedExcelData.ts';

console.log('🧪 TESTING CPUE FORMAT AND FILTERING');
console.log('='.repeat(50));

// Test CPUE data structure
console.log('\n📊 CPUE DATA STRUCTURE:');
console.log(`Total CPUE records: ${excelConvertedCPUEData.length}`);
console.log('Sample record:', excelConvertedCPUEData[0]);

// Test species filtering (like in App.tsx CPUEPage)
console.log('\n🔍 SPECIES FILTERING TEST:');
const testSpecies = 'ปลาทู';
const testArea = 'อ่าวไทยตอนบน (ชลบุรี-ประจวบคีรีขันธ์)';

const filteredData = excelConvertedCPUEData.filter(
  d => d.species === testSpecies && d.fishingArea === testArea
);

console.log(`✓ Filtered for "${testSpecies}" in "${testArea}": ${filteredData.length} records`);

if (filteredData.length > 0) {
  console.log('Sample filtered record:', filteredData[0]);

  // Test data transformation (like in App.tsx)
  const series = filteredData.map(d => ({ x: d.month, y: d.cpue }));
  console.log(`✓ Transformed to chart format: ${series.length} data points`);
  console.log('Sample chart point:', series[0]);
}

// Test species options (like in App.tsx)
console.log('\n📋 SPECIES OPTIONS TEST:');
const speciesOptions = Object.keys(excelConvertedSpeciesInfo);
console.log(`✓ Available species: ${speciesOptions.length}`);

const thaiSpeciesOptions = speciesOptions.filter(s =>
  excelConvertedSpeciesInfo[s] &&
  excelConvertedSpeciesInfo[s].scientificName
);

console.log(`✓ Species with scientific names: ${thaiSpeciesOptions.length}`);

// Test if "ปลาทู" exists in species options
const hasPlaToo = speciesOptions.includes('ปลาทู');
console.log(`✓ "ปลาทู" in species options: ${hasPlaToo}`);

if (hasPlaToo) {
  const plaTooInfo = excelConvertedSpeciesInfo['ปลาทู'];
  console.log('  Scientific name:', plaTooInfo.scientificName);
  console.log('  Thai name:', plaTooInfo.thaiName);
  console.log('  Economic value:', plaTooInfo.economicValue);
}

// Test area options
console.log('\n🗺️ AREA OPTIONS TEST:');
const allAreas = [...new Set(excelConvertedCPUEData.map(d => d.fishingArea))];
console.log(`✓ Available areas: ${allAreas.length}`);
console.log('Areas:', allAreas);

// Test chart data generation (like in App.tsx)
console.log('\n📈 CHART DATA GENERATION TEST:');
const sampleChartData = excelConvertedCPUEData
  .filter(d => d.species === testSpecies)
  .slice(-8)
  .map(d => ({ x: d.month, y: d.cpue }));

console.log(`✓ Sample chart data for "${testSpecies}": ${sampleChartData.length} points`);
if (sampleChartData.length > 0) {
  console.log('Chart data:', sampleChartData);
}

// Test data validation
console.log('\n✅ DATA VALIDATION:');
const validRecords = excelConvertedCPUEData.filter(d =>
  d.species &&
  d.fishingArea &&
  typeof d.cpue === 'number' &&
  d.cpue >= 0 &&
  d.month &&
  d.date
);

console.log(`✓ Valid CPUE records: ${validRecords.length}/${excelConvertedCPUEData.length}`);

// Test unique species in CPUE data
const uniqueSpecies = [...new Set(excelConvertedCPUEData.map(d => d.species))];
console.log(`✓ Unique species in CPUE data: ${uniqueSpecies.length}`);
console.log('Top 10 species:', uniqueSpecies.slice(0, 10));

console.log('\n🎯 CONCLUSION:');
if (filteredData.length > 0 && sampleChartData.length > 0) {
  console.log('✅ CPUE data format is correct and filtering works!');
  console.log('✅ App.tsx should be able to display CPUE charts properly.');
} else {
  console.log('❌ CPUE data has issues - filtering returned no results.');
}

console.log('\n' + '='.repeat(50));
