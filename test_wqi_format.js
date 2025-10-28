// Test Water Quality Index formatting
const testValue = 92.29007855802955;
const formattedValue = testValue.toFixed(2);

console.log('=== WATER QUALITY INDEX FORMAT TEST ===');
console.log(`Original: ${testValue}`);
console.log(`Formatted: ${formattedValue}`);
console.log(`Expected: 92.29`);
console.log(`✅ Success: ${formattedValue === '92.29'}`);

// Test edge cases
const testCases = [
  92.29007855802955,
  75.123456789,
  100.0,
  0.123456,
  50.999999
];

console.log('\n=== EDGE CASES ===');
testCases.forEach(value => {
  const formatted = value.toFixed(2);
  console.log(`${value} → ${formatted}`);
});

console.log('\n✅ Water Quality Index formatting test completed!');
