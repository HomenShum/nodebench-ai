const fs = require('fs');
const path = require('path');
const execSync = require('child_process').execSync;

const files = execSync('git grep -l "var(--accent-primary" src/').toString().trim().split('\n');

files.forEach(f => {
  if (!fs.existsSync(f)) return;
  let content = fs.readFileSync(f, 'utf8');
  let original = content;
  
  content = content.replace(/bg-\[var\(--accent-primary\)\]/g, 'bg-indigo-600');
  content = content.replace(/bg-\[var\(--accent-primary-hover\)\]/g, 'bg-indigo-700');
  content = content.replace(/bg-\[var\(--accent-primary-bg\)\]/g, 'bg-indigo-500\/10');
  content = content.replace(/text-\[var\(--accent-primary\)\]/g, 'text-indigo-600 dark:text-indigo-400');
  content = content.replace(/text-\[var\(--accent-primary-hover\)\]/g, 'text-indigo-700 dark:text-indigo-300');
  content = content.replace(/border-\[var\(--accent-primary\)\]/g, 'border-indigo-500\/30');
  content = content.replace(/ring-\[var\(--accent-primary\)\]/g, 'ring-indigo-500\/50');
  content = content.replace(/var\(--accent-primary\)/g, 'rgb(79, 70, 229)'); // For shadow-[0_0_20px_var(--accent-primary)]

  if (content !== original) {
    fs.writeFileSync(f, content, 'utf8');
    console.log('Updated ' + f);
  }
});
