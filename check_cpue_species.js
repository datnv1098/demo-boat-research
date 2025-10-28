import { excelConvertedCPUEData, excelConvertedSpeciesInfo } from './src/data/convertedExcelData.ts';

console.log('🔍 CHECKING CPUE SPECIES DISTRIBUTION');
console.log('='.repeat(50));

// Count records per species
const speciesCount = {};
excelConvertedCPUEData.forEach(record => {
  const species = record.species;
  speciesCount[species] = (speciesCount[species] || 0) + 1;
});

console.log('\n📊 Species distribution in CPUE data:');
Object.entries(speciesCount)
  .sort(([,a], [,b]) => b - a)
  .forEach(([species, count]) => {
    console.log(`${species}: ${count} records`);
  });

console.log(`\n📈 Total species with CPUE data: ${Object.keys(speciesCount).length}`);
console.log(`📈 Total CPUE records: ${excelConvertedCPUEData.length}`);

// Check species availability in species info
console.log('\n🔗 Species availability check:');
Object.keys(speciesCount).forEach(species => {
  const inSpeciesInfo = excelConvertedSpeciesInfo[species] !== undefined;
  const records = speciesCount[species];
  console.log(`${species}: ${records} records, Available in species info: ${inSpeciesInfo ? '✅' : '❌'}`);
});

// Check weight distribution
console.log('\n⚖️ Weight distribution analysis:');
const weightRanges = {
  '0-50kg': 0,
  '50-150kg': 0,
  '150kg+': 0
};

excelConvertedCPUEData.forEach(record => {
  const weight = record.catch;
  if (weight < 50) weightRanges['0-50kg']++;
  else if (weight < 150) weightRanges['50-150kg']++;
  else weightRanges['150kg+']++;
});

console.log('Weight distribution of catch data:');
Object.entries(weightRanges).forEach(([range, count]) => {
  console.log(`${range}: ${count} records`);
});

console.log('\n🎯 CONCLUSION:');
console.log(`Only ${Object.keys(speciesCount).length} species have CPUE data because the weight-based assignment logic only assigns to 3 categories.`);
console.log('To have more species with data, we need to expand the assignment logic or use different criteria.');

console.log('\n' + '='.repeat(50));
