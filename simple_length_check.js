import('./src/data/convertedExcelData.ts').then(({ excelConvertedLengthData, excelConvertedSpeciesInfo, excelConvertedCPUEData }) => {
  console.log('=== CHECKING LENGTH BIOLOGY DATA ===\n');

  // Check total records and unique species
  const uniqueSpecies = [...new Set(excelConvertedLengthData.map(d => d.species))];
  const uniqueSeasons = [...new Set(excelConvertedLengthData.map(d => d.season))];

  console.log(`📊 Total length records: ${excelConvertedLengthData.length}`);
  console.log(`🐟 Unique species in length data: ${uniqueSpecies.length}`);
  console.log('Sample species:', uniqueSpecies.slice(0, 10));
  console.log(`📅 Unique seasons: ${uniqueSeasons}`);

  // Check Q3 data specifically
  const q3Data = excelConvertedLengthData.filter(d => d.season === 'Q3');
  console.log(`\n📊 Q3 season data: ${q3Data.length} records`);

  const q3Species = [...new Set(q3Data.map(d => d.species))];
  console.log(`🐟 Species with Q3 data: ${q3Species.length}`);
  console.log('Q3 species:', q3Species);

  // Check default species 'ปลาทู'
  const plaTuData = excelConvertedLengthData.filter(d => d.species === 'ปลาทู');
  const plaTuQ3Data = plaTuData.filter(d => d.season === 'Q3');

  console.log(`\n🎯 Default species 'ปลาทู':`);
  console.log(`  Total records: ${plaTuData.length}`);
  console.log(`  Q3 records: ${plaTuQ3Data.length}`);

  if (plaTuQ3Data.length > 0) {
    console.log('  ✅ Has Q3 data!');
    console.log('  Sample:', plaTuQ3Data.slice(0, 3).map(d => ({
      lengthBin: d.lengthBin,
      male: d.male,
      female: d.female,
      area: d.area
    })));
  } else {
    console.log('  ❌ No Q3 data for Pla Tu');
    const plaTuSeasons = [...new Set(plaTuData.map(d => d.season))];
    console.log(`  Available seasons: ${plaTuSeasons}`);
  }

  // Check current filtering logic
  console.log(`\n🔍 Current filtering logic test:`);
  const defaultSpecies = 'ปลาทู';
  const currentLengthDist = excelConvertedLengthData
    .filter((d) => d.species === defaultSpecies && d.season === 'Q3')
    .map((d) => ({
      bin: d.lengthBin,
      Male: d.male,
      Female: d.female,
      Unsexed: d.unsexed,
    }));

  console.log(`Filtered data points: ${currentLengthDist.length}`);
  if (currentLengthDist.length > 0) {
    console.log('Sample data:', currentLengthDist.slice(0, 3));
  }

  // Compare with CPUE species
  console.log(`\n📊 Comparison with CPUE data:`);
  const cpueSpecies = [...new Set(excelConvertedCPUEData.map(d => d.species))];
  const lengthSpecies = [...new Set(excelConvertedLengthData.map(d => d.species))];
  const overlap = cpueSpecies.filter(s => lengthSpecies.includes(s));

  console.log(`  CPUE species: ${cpueSpecies.length}`);
  console.log(`  Length species: ${lengthSpecies.length}`);
  console.log(`  Overlap: ${overlap.length} species`);
  console.log('  Overlapping species:', overlap);

}).catch(console.error);
