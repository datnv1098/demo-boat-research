import('./src/data/convertedExcelData.ts').then(({ excelConvertedSpeciesInfo, excelConvertedCPUEData }) => {
  console.log('=== CHECKING CPUE SPECIES DISPLAY ISSUE ===\n');

  // Check species info
  const speciesKeys = Object.keys(excelConvertedSpeciesInfo);
  console.log(`📊 Total species in excelConvertedSpeciesInfo: ${speciesKeys.length}`);
  console.log('Sample species:', speciesKeys.slice(0, 5));

  // Check CPUE data
  console.log(`\n📈 Total CPUE records: ${excelConvertedCPUEData.length}`);

  // Get unique species from CPUE data
  const cpueSpecies = new Set(excelConvertedCPUEData.map(d => d.species));
  console.log(`🐟 Unique species in CPUE data: ${cpueSpecies.size}`);
  console.log('CPUE species:', Array.from(cpueSpecies).slice(0, 5));

  // Check which species from speciesInfo are in CPUE data
  const speciesInBoth = speciesKeys.filter(s => cpueSpecies.has(s));
  console.log(`\n✅ Species in both datasets: ${speciesInBoth.length}`);

  const speciesOnlyInInfo = speciesKeys.filter(s => !cpueSpecies.has(s));
  console.log(`❌ Species only in speciesInfo: ${speciesOnlyInInfo.length}`);

  const speciesOnlyInCPUE = Array.from(cpueSpecies).filter(s => !speciesKeys.includes(s));
  console.log(`❓ Species only in CPUE data: ${speciesOnlyInCPUE.length}`);
  console.log('Species only in CPUE:', speciesOnlyInCPUE.slice(0, 5));

  // Check specific species data
  console.log('\n🔍 Checking specific species data:');
  ['ปลาทู', 'ปลาเก๋า', 'ปลาจะละเม็ด'].forEach(species => {
    const cpueRecords = excelConvertedCPUEData.filter(d => d.species === species);
    const hasSpeciesInfo = speciesKeys.includes(species);
    console.log(`  ${species}: ${cpueRecords.length} CPUE records, has species info: ${hasSpeciesInfo}`);
  });

  // Check default species
  const defaultSpecies = 'ปลาทู';
  const defaultCpueData = excelConvertedCPUEData.filter(d => d.species === defaultSpecies);
  console.log(`\n🎯 Default species "${defaultSpecies}": ${defaultCpueData.length} records`);

  if (defaultCpueData.length > 0) {
    const sampleRecord = defaultCpueData[0];
    console.log('Sample record:', {
      species: sampleRecord.species,
      fishingArea: sampleRecord.fishingArea,
      cpue: sampleRecord.cpue,
      month: sampleRecord.month
    });
  }

}).catch(console.error);
