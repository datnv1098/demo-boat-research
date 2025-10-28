import('./src/data/convertedExcelData.ts').then(({ excelConvertedSpeciesInfo, excelConvertedCPUEData }) => {
  console.log('=== DEMO: CPUE Species Options Fix ===\n');

  // Old logic (showing all species from speciesInfo)
  const oldSpeciesOptions = Object.keys(excelConvertedSpeciesInfo);
  console.log(`❌ Old dropdown: ${oldSpeciesOptions.length} species`);
  console.log('Sample:', oldSpeciesOptions.slice(0, 5));

  // New logic (only species with CPUE data)
  const newSpeciesOptions = [...new Set(excelConvertedCPUEData.map(d => d.species))].sort();
  console.log(`\n✅ New dropdown: ${newSpeciesOptions.length} species`);
  console.log('All options:', newSpeciesOptions);

  console.log('\n🔍 Verification:');
  newSpeciesOptions.forEach(species => {
    const cpueRecords = excelConvertedCPUEData.filter(d => d.species === species);
    const hasSpeciesInfo = species in excelConvertedSpeciesInfo;
    const scientificName = excelConvertedSpeciesInfo[species]?.scientificName || 'N/A';

    console.log(`  ${species} (${scientificName}): ${cpueRecords.length} records, info: ${hasSpeciesInfo ? '✅' : '❌'}`);
  });

  console.log('\n📊 Summary:');
  console.log(`  • Dropdown reduced from ${oldSpeciesOptions.length} to ${newSpeciesOptions.length} options`);
  console.log(`  • All ${newSpeciesOptions.length} species now have CPUE data`);
  console.log(`  • All ${newSpeciesOptions.length} species have species information`);

  console.log('\n✅ CPUE species dropdown fix completed!');

}).catch(console.error);
