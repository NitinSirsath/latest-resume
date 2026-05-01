const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');

const FORBIDDEN_PATTERNS = [
  {
    regex: /localStorage/g,
    message: "Forbidden: Do not use localStorage in the extension. Use chrome.storage.local instead.",
    includePath: /^apps\/extension\//,
  },
  {
    regex: /(import\s+.*from\s+['"]fs['"]|require\(['"]fs['"]\))/g,
    message: "Forbidden: Do not use Node.js 'fs' API in Supabase Edge Functions (Deno runtime).",
    includePath: /^supabase\/functions\//,
  },
  {
    regex: /process\.env/g,
    message: "Forbidden: Do not use process.env in Supabase Edge Functions. Use Deno.env.get().",
    includePath: /^supabase\/functions\//,
  },
  {
    regex: /:\s*any\b/g,
    message: "Forbidden: Do not use 'any' type. Use strict types from @resumetailor/types.",
    includePath: /\.(ts|tsx)$/,
    excludePath: /^scripts\//,
  }
];

function walkDir(dir, callback) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (file === 'node_modules' || file === '.git' || file === 'dist' || file === '.turbo') continue;
    
    if (fs.statSync(fullPath).isDirectory()) {
      walkDir(fullPath, callback);
    } else {
      callback(fullPath);
    }
  }
}

let errorsFound = 0;

walkDir(ROOT_DIR, (filePath) => {
  const relativePath = path.relative(ROOT_DIR, filePath);
  
  // Only check specific text files
  if (!/\.(ts|tsx|js|jsx)$/.test(relativePath)) return;

  const content = fs.readFileSync(filePath, 'utf-8');
  
  for (const rule of FORBIDDEN_PATTERNS) {
    if (rule.includePath && !rule.includePath.test(relativePath)) continue;
    if (rule.excludePath && rule.excludePath.test(relativePath)) continue;

    let match;
    while ((match = rule.regex.exec(content)) !== null) {
      // Basic check to see if it's commented out (naive but helpful)
      const lines = content.substring(0, match.index).split('\n');
      const line = lines[lines.length - 1];
      if (line.trim().startsWith('//') || line.trim().startsWith('/*')) continue;

      console.error(`❌ [${relativePath}] ${rule.message}`);
      errorsFound++;
    }
  }
});

if (errorsFound > 0) {
  console.error(`\nReview failed: Found ${errorsFound} forbidden patterns.`);
  process.exit(1);
} else {
  console.log('✅ AI Pattern Review Passed.');
}
