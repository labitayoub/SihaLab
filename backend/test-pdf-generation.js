// Test script to verify PDF generation with sample data
const testResults = [
  {
    testName: 'Glycémie',
    resultValue: '1.2',
    unit: 'g/L',
    normalRange: '0.7-1.1',
    isAbnormal: true
  },
  {
    testName: 'Cholestérol',
    resultValue: '2.0',
    unit: 'g/L',
    normalRange: '1.5-2.5',
    isAbnormal: false
  }
];

console.log('Test results:', JSON.stringify(testResults, null, 2));
console.log('Results count:', testResults.length);
console.log('First result:', testResults[0]);
