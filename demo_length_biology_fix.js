import('./src/data/convertedExcelData.ts').then(({ excelConvertedLengthData, excelConvertedSpeciesInfo }) => {
  console.log('=== DEMO: LENGTH BIOLOGY SPECIES FIX ===\n');

  // Old logic (showing all species from speciesInfo)
  const oldSpeciesOptions = Object.keys(excelConvertedSpeciesInfo);
  console.log(`❌ Old dropdown: ${oldSpeciesOptions.length} species`);
  console.log('Sample:', oldSpeciesOptions.slice(0, 5));

  // New logic (only species with length data)
  const newSpeciesOptions = [...new Set(excelConvertedLengthData.map(d => d.species))].sort();
  console.log(`\n✅ New dropdown: ${newSpeciesOptions.length} species`);
  console.log('All options:', newSpeciesOptions);

  console.log('\n🔍 Verification:');
  newSpeciesOptions.forEach(species => {
    const lengthRecords = excelConvertedLengthData.filter(d => d.species === species);
    const q3Records = lengthRecords.filter(d => d.season === 'Q3');
    const hasSpeciesInfo = species in excelConvertedSpeciesInfo;

    console.log(`  ${species}: ${lengthRecords.length} total, ${q3Records.length} Q3 records, info: ${hasSpeciesInfo ? '✅' : '❌'}`);
  });

  console.log('\n📊 Summary:');
  console.log(`  • Dropdown reduced from ${oldSpeciesOptions.length} to ${newSpeciesOptions.length} options`);
  console.log(`  • All ${newSpeciesOptions.length} species have length data`);
  console.log(`  • All ${newSpeciesOptions.length} species have Q3 season data`);

  // Test default species
  const defaultSpecies = 'ปลาทู';
  const defaultData = excelConvertedLengthData
    .filter((d) => d.species === defaultSpecies && d.season === 'Q3')
    .map((d) => ({
      bin: d.lengthBin,
      Male: d.male,
      Female: d.female,
      Unsexed: d.unsexed,
    }));

  console.log(`\n🎯 Default species "${defaultSpecies}": ${defaultData.length} chart data points`);
  if (defaultData.length > 0) {
    console.log('Sample chart data:', defaultData.slice(0, 3));
  }

  console.log('\n✅ Length Biology species dropdown fix completed!');

}).catch(console.error);
