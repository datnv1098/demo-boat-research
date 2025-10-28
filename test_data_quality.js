import { excelConvertedTrips } from './src/data/convertedExcelData.ts';

console.log('🛡️ TESTING ENHANCED DATA QUALITY PAGE');
console.log('='.repeat(50));

// Test data quality calculations
console.log('\n📊 BASIC DATA QUALITY METRICS:');
const totalTrips = excelConvertedTrips.length;
const avgDQScore = Math.round(
  excelConvertedTrips.reduce((a, b) => a + b.dqScore, 0) / totalTrips
);
const totalIssues = excelConvertedTrips.reduce((a, b) => a + (b.issues?.length || 0), 0);

console.log(`✓ Total trips: ${totalTrips}`);
console.log(`✓ Average DQ score: ${avgDQScore}/100 (${Math.round((avgDQScore/100)*100)}% compliance)`);
console.log(`✓ Total issues detected: ${totalIssues} (${Math.round((totalIssues/totalTrips)*100)}% of surveys)`);
console.log(`✓ Active vessels: ${new Set(excelConvertedTrips.map(t => t.vessel)).size}`);

// Test issue type analysis
console.log('\n🔍 ISSUE TYPE ANALYSIS:');
const issueTypes = {};
excelConvertedTrips.forEach(trip => {
  trip.issues?.forEach(issue => {
    issueTypes[issue] = (issueTypes[issue] || 0) + 1;
  });
});

console.log('Top issue types:');
Object.entries(issueTypes)
  .sort(([,a], [,b]) => b - a)
  .slice(0, 5)
  .forEach(([issue, count]) => {
    console.log(`  ${issue}: ${count} occurrences`);
  });

// Test data quality by fishing area
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

console.log('Area quality analysis:');
Object.entries(dqByArea)
  .sort(([,a], [,b]) => b.trips - a.trips)
  .forEach(([area, data]) => {
    const avgDQ = Math.round(data.totalDQ / data.trips);
    const compliance = Math.round((avgDQ / 100) * 100);
    console.log(`  ${area}:`);
    console.log(`    Trips: ${data.trips}, Avg DQ: ${avgDQ}/100 (${compliance}%)`);
    console.log(`    Issues: ${data.issues}, Issue rate: ${Math.round((data.issues/data.trips)*100)}%`);
  });

// Test monthly data quality trends
console.log('\n📅 MONTHLY DATA QUALITY TRENDS:');
const monthlyDQ = {};
excelConvertedTrips.forEach(trip => {
  const month = trip.startDate.substring(0, 7); // YYYY-MM
  if (!monthlyDQ[month]) {
    monthlyDQ[month] = { trips: 0, totalDQ: 0, issues: 0 };
  }
  monthlyDQ[month].trips++;
  monthlyDQ[month].totalDQ += trip.dqScore;
  monthlyDQ[month].issues += trip.issues?.length || 0;
});

const monthlyDQData = Object.entries(monthlyDQ)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([month, data]) => ({
    month,
    avgDQ: Math.round(data.totalDQ / data.trips),
    issueRate: Math.round((data.issues / data.trips) * 100) / 100
  }));

console.log('Monthly trends:');
monthlyDQData.forEach(data => {
  console.log(`  ${data.month}: DQ=${data.avgDQ}/100, Issues=${data.issueRate}/trip`);
});

// Test compliance categories
console.log('\n📋 COMPLIANCE CATEGORIES:');
const complianceStats = {
  excellent: 0, // >= 90
  good: 0,      // 70-89
  needs_improvement: 0 // < 70
};

excelConvertedTrips.forEach(trip => {
  if (trip.dqScore >= 90) complianceStats.excellent++;
  else if (trip.dqScore >= 70) complianceStats.good++;
  else complianceStats.needs_improvement++;
});

console.log(`Excellent (≥90): ${complianceStats.excellent} trips (${Math.round((complianceStats.excellent/totalTrips)*100)}%)`);
console.log(`Good (70-89): ${complianceStats.good} trips (${Math.round((complianceStats.good/totalTrips)*100)}%)`);
console.log(`Needs Improvement (<70): ${complianceStats.needs_improvement} trips (${Math.round((complianceStats.needs_improvement/totalTrips)*100)}%)`);

// Test chart data preparation
console.log('\n📈 CHART DATA PREPARATION:');
const issueChartData = Object.entries(issueTypes)
  .sort(([,a], [,b]) => b - a)
  .slice(0, 8)
  .map(([issue, count]) => ({
    issue: issue.length > 20 ? issue.substring(0, 20) + '...' : issue,
    count,
    percentage: Math.round((count / totalIssues) * 100)
  }));

console.log(`✓ Issue chart data: ${issueChartData.length} categories`);
console.log(`✓ Monthly trend data: ${monthlyDQData.length} months`);
console.log(`✓ Area analysis data: ${Object.keys(dqByArea).length} areas`);

console.log('\n🎯 SUMMARY:');
console.log('✅ Enhanced Data Quality page will display:');
console.log(`   - ${totalTrips} survey records with detailed quality metrics`);
console.log(`   - Monthly trends showing ${monthlyDQData.length} months of data`);
console.log(`   - Issue analysis with ${Object.keys(issueTypes).length} different problem types`);
console.log(`   - Area-by-area quality comparison for ${Object.keys(dqByArea).length} fishing zones`);
console.log(`   - Compliance categorization: ${complianceStats.excellent} excellent, ${complianceStats.good} good, ${complianceStats.needs_improvement} needs improvement`);

console.log('\n' + '='.repeat(50));
