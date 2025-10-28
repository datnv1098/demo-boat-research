import { excelConvertedCPUEData, excelConvertedSpeciesInfo } from './src/data/convertedExcelData.ts';

console.log('🧪 TESTING ALL CPUE SPECIES FOR CHART DISPLAY');
console.log('='.repeat(60));

const testArea = 'อ่าวไทยตอนบน (ชลบุรี-ประจวบคีรีขันธ์)';
const speciesWithData = ['ปลาทู', 'ปลาเก๋า', 'ปลาจะละเม็ด', 'หมึกกล้วย', 'กุ้งกุลาดำ', 'กุ้งแชบ๊วย', 'ปลาปากคม', 'ปลาสีกุน', 'ปลากะพง'];

console.log(`Testing area: ${testArea}\n`);

let totalWorkingSpecies = 0;

speciesWithData.forEach(species => {
  const filteredData = excelConvertedCPUEData.filter(
    d => d.species === species && d.fishingArea === testArea
  );

  const hasData = filteredData.length > 0;
  const inSpeciesInfo = excelConvertedSpeciesInfo[species] !== undefined;

  if (hasData && inSpeciesInfo) {
    totalWorkingSpecies++;
    console.log(`✅ ${species}: ${filteredData.length} records - CAN display chart`);

    // Show sample chart data
    const chartData = filteredData.slice(-5).map(d => ({ x: d.month, y: d.cpue }));
    console.log(`   Chart preview: ${chartData.length} points`);
  } else {
    console.log(`❌ ${species}: ${filteredData.length} records, Available: ${inSpeciesInfo} - CANNOT display chart`);
  }
});

console.log(`\n🎯 SUMMARY:`);
console.log(`Total species tested: ${speciesWithData.length}`);
console.log(`Species that can display charts: ${totalWorkingSpecies}`);
console.log(`Success rate: ${Math.round((totalWorkingSpecies / speciesWithData.length) * 100)}%`);

if (totalWorkingSpecies > 1) {
  console.log('\n✅ SUCCESS: Multiple species now have CPUE chart data!');
  console.log('Users can now select different species and see their CPUE trends.');
} else {
  console.log('\n❌ ISSUE: Still limited species with chart data.');
}

console.log('\n' + '='.repeat(60));
