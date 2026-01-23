const report = require('./lighthouse-report.json');

console.log('\n🚀 LIGHTHOUSE ANALYSIS - HITL Analytics Dashboard\n');
console.log('═══════════════════════════════════════════════════\n');

// Scores
console.log('📊 OVERALL SCORES:');
console.log(`  Performance:    ${(report.categories.performance.score * 100).toFixed(0)}/100 ${ report.categories.performance.score >= 0.9 ? '✅' : report.categories.performance.score >= 0.5 ? '⚠️' : '❌'}`);
console.log(`  Accessibility:  ${(report.categories.accessibility.score * 100).toFixed(0)}/100 ${report.categories.accessibility.score >= 0.9 ? '✅' : report.categories.accessibility.score >= 0.5 ? '⚠️' : '❌'}`);
console.log('');

// Core Web Vitals
console.log('⚡ CORE WEB VITALS:');
console.log(`  FCP:  ${report.audits['first-contentful-paint'].displayValue.padEnd(10)} (target: < 1.8s)`);
console.log(`  LCP:  ${report.audits['largest-contentful-paint'].displayValue.padEnd(10)} (target: < 2.5s)`);
console.log(`  TBT:  ${report.audits['total-blocking-time'].displayValue.padEnd(10)} (target: < 200ms)`);
console.log(`  CLS:  ${report.audits['cumulative-layout-shift'].displayValue.padEnd(10)} (target: < 0.1) ✅`);
console.log('');

// Top opportunities
console.log('💡 TOP PERFORMANCE OPPORTUNITIES:\n');
const opportunities = Object.values(report.audits)
  .filter(a => a.details && a.details.type === 'opportunity' && a.score !== null && a.score < 1)
  .sort((a,b) => (b.details.overallSavingsMs || 0) - (a.details.overallSavingsMs || 0))
  .slice(0, 6);

opportunities.forEach((opp, i) => {
  const savings = opp.details.overallSavingsMs ? (opp.details.overallSavingsMs/1000).toFixed(1) + 's' : 'N/A';
  console.log(`${i+1}. ${opp.title}`);
  console.log(`   💰 Potential savings: ${savings}`);

  // Show specific items if available
  if (opp.details.items && opp.details.items.length > 0) {
    const item = opp.details.items[0];
    if (item.url) {
      const url = item.url.split('/').pop() || item.url;
      console.log(`   📦 Primary: ${url.substring(0, 60)}...`);
    }
    if (item.totalBytes) {
      console.log(`   📊 Size: ${(item.totalBytes / 1024).toFixed(0)} KB`);
    }
    if (item.wastedBytes) {
      console.log(`   ♻️  Waste: ${(item.wastedBytes / 1024).toFixed(0)} KB`);
    }
  }
  console.log('');
});

// Accessibility issues
console.log('♿ ACCESSIBILITY ISSUES:\n');
const a11yIssues = Object.values(report.audits)
  .filter(a => a.scoreDisplayMode === 'binary' && a.score === 0 && a.id.includes('aria') || a.id.includes('color-contrast') || a.id.includes('label'))
  .slice(0, 5);

if (a11yIssues.length > 0) {
  a11yIssues.forEach((issue, i) => {
    console.log(`${i+1}. ${issue.title}`);
    if (issue.details && issue.details.items) {
      console.log(`   ⚠️  ${issue.details.items.length} elements affected`);
    }
  });
} else {
  console.log('  ✅ No critical accessibility issues found!');
}

console.log('\n═══════════════════════════════════════════════════\n');
