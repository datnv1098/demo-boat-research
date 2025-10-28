import { excelConvertedTrips } from './src/data/convertedExcelData.ts';

console.log('🎛️  DEMO: ENHANCED DATA QUALITY PAGE');
console.log('='.repeat(60));

// Simulate DataQualityPage calculations
console.log('\n📊 CALCULATING DATA QUALITY METRICS...');

const totalTrips = excelConvertedTrips.length;
const avgDQScore = Math.round(
  excelConvertedTrips.reduce((a, b) => a + b.dqScore, 0) / totalTrips
);
const totalIssues = excelConvertedTrips.reduce((a, b) => a + (b.issues?.length || 0), 0);

console.log(`✓ Total surveys analyzed: ${totalTrips}`);
console.log(`✓ Average data quality score: ${avgDQScore}/100 (${Math.round((avgDQScore/100)*100)}% compliance)`);
console.log(`✓ Total issues detected: ${totalIssues} (${Math.round((totalIssues/totalTrips)*100)}% of surveys)`);

// Issue analysis
console.log('\n🔍 ISSUE ANALYSIS:');
const issueTypes = {};
excelConvertedTrips.forEach(trip => {
  trip.issues?.forEach(issue => {
    issueTypes[issue] = (issueTypes[issue] || 0) + 1;
  });
});

const topIssues = Object.entries(issueTypes)
  .sort(([,a], [,b]) => b - a)
  .slice(0, 3);

console.log('Top 3 issues:');
topIssues.forEach(([issue, count], index) => {
  console.log(`  ${index + 1}. "${issue}": ${count} occurrences`);
});

// Data quality by area
console.log('\n🗺️ DATA QUALITY BY FISHING AREA:');
const dqByArea = {};
excelConvertedTrips.forEach(trip => {
  if (!dqByArea[trip.fishingArea]) {
    dqByArea[trip.fishingArea] = { trips: 0, totalDQ: 0, issues: 0 };
  }
  dqByArea[trip.fishingArea].trips++;
  dqByArea[trip.fishingArea].totalDQ += trip.dqScore;
  dqByArea[trip.fishingArea].issues += trip.issues?.length || 0;
});

Object.entries(dqByArea)
  .sort(([,a], [,b]) => b.trips - a.trips)
  .forEach(([area, data]) => {
    const avgDQ = Math.round(data.totalDQ / data.trips);
    const compliance = Math.round((avgDQ / 100) * 100);
    console.log(`  ${area}: ${data.trips} surveys, ${avgDQ}/100 DQ (${compliance}% compliance), ${data.issues} issues`);
  });

// Monthly trends
console.log('\n📅 MONTHLY DATA QUALITY TRENDS:');
const monthlyDQ = {};
excelConvertedTrips.forEach(trip => {
  const month = trip.startDate.substring(0, 7);
  if (!monthlyDQ[month]) {
    monthlyDQ[month] = { trips: 0, totalDQ: 0, issues: 0 };
  }
  monthlyDQ[month].trips++;
  monthlyDQ[month].totalDQ += trip.dqScore;
  monthlyDQ[month].issues += trip.issues?.length || 0;
});

const monthlyTrends = Object.entries(monthlyDQ)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([month, data]) => ({
    month,
    avgDQ: Math.round(data.totalDQ / data.trips),
    issueRate: Math.round((data.issues / data.trips) * 100) / 100
  }));

monthlyTrends.slice(0, 6).forEach(trend => {
  console.log(`  ${trend.month}: DQ=${trend.avgDQ}/100, Issues=${trend.issueRate}/survey`);
});

// Sample trip records
console.log('\n📋 SAMPLE TRIP RECORDS:');
excelConvertedTrips.slice(0, 3).forEach((trip, index) => {
  const status = trip.dqScore >= 90 ? 'ดีเยี่ยม' : trip.dqScore >= 70 ? 'ดี' : 'ต้องปรับปรุง';
  console.log(`  ${index + 1}. ${trip.tripId} (${trip.vessel}) - ${trip.fishingArea}`);
  console.log(`     DQ Score: ${trip.dqScore}/100 (${status})`);
  console.log(`     Issues: ${trip.issues?.length || 0} (${trip.issues?.join(', ') || 'none'})`);
});

console.log('\n🎯 CONCLUSION:');
console.log('✅ Data Quality page will display:');
console.log(`   - Comprehensive metrics dashboard with ${totalTrips} surveys analyzed`);
console.log(`   - Monthly trends chart showing quality evolution over time`);
console.log(`   - Issue type analysis with ${Object.keys(issueTypes).length} different problem categories`);
console.log(`   - Area-by-area quality comparison across ${Object.keys(dqByArea).length} fishing zones`);
console.log(`   - Detailed trip records with color-coded quality status`);
console.log(`   - Compliance categorization with ${Math.round((excelConvertedTrips.filter(t => t.dqScore >= 90).length/totalTrips)*100)}% excellent ratings`);

console.log('\n🌐 ACCESS THE DATA QUALITY PAGE:');
console.log('   Navigate to: http://localhost:5173');
console.log('   Click tab: "คุณภาพข้อมูล & ควบคุมคุณภาพ"');

console.log('\n' + '='.repeat(60));
