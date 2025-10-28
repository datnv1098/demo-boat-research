Promise.all([
  import('./src/data/convertedExcelData.ts'),
  import('./src/data/mockData.ts')
]).then(([{ excelConvertedSpeciesInfo, excelConvertedCPUEData }, { FISHING_AREAS }]) => {
  console.log('=== TESTING CPUE DROPDOWN DISPLAY ===\n');

  // Simulate CPUEPage logic
  const speciesOptions = Object.keys(excelConvertedSpeciesInfo);
  const areaOptions = Object.keys(FISHING_AREAS);

  console.log(`📋 Total species options in dropdown: ${speciesOptions.length}`);
  console.log('First 10 species options:', speciesOptions.slice(0, 10));

  // Check which species have CPUE data
  const cpueSpecies = new Set(excelConvertedCPUEData.map(d => d.species));

  console.log(`\n📊 Species with CPUE data: ${cpueSpecies.size}`);
  console.log('CPUE species:', Array.from(cpueSpecies));

  // Test default selection
  const defaultSpecies = 'ปลาทู';
  const defaultArea = 'อ่าวไทยตอนบน (ชลบุรี-ประจวบคีรีขันธ์)';

  console.log(`\n🎯 Testing default selection:`);
  console.log(`  Species: ${defaultSpecies}`);
  console.log(`  Area: ${defaultArea}`);

  // Filter data like in CPUEPage
  const series = excelConvertedCPUEData
    .filter((d) => d.species === defaultSpecies && d.fishingArea === defaultArea)
    .map((d) => ({ x: d.month, y: d.cpue }));

  console.log(`\n📈 Filtered data points: ${series.length}`);
  if (series.length > 0) {
    console.log('Sample data points:', series.slice(0, 3));
  } else {
    console.log('❌ No data points found for default selection!');
    console.log('Available areas for default species:');
    const availableAreas = new Set(
      excelConvertedCPUEData
        .filter(d => d.species === defaultSpecies)
        .map(d => d.fishingArea)
    );
    console.log(Array.from(availableAreas));
  }

  // Test another species
  const testSpecies = 'ปลาเก๋า';
  const testSeries = excelConvertedCPUEData
    .filter((d) => d.species === testSpecies && d.fishingArea === defaultArea)
    .map((d) => ({ x: d.month, y: d.cpue }));

  console.log(`\n🧪 Testing "${testSpecies}": ${testSeries.length} data points`);

  // Check if issue is with area selection
  console.log(`\n🏞️ Available fishing areas in FISHING_AREAS: ${areaOptions.length}`);
  console.log('First 5 areas:', areaOptions.slice(0, 5));

  console.log(`\n🏞️ Available fishing areas in CPUE data:`);
  const cpueAreas = new Set(excelConvertedCPUEData.map(d => d.fishingArea));
  console.log(Array.from(cpueAreas));

}).catch(console.error);
