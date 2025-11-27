#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

function walk(dir, cb) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (['node_modules', '.git', 'uploads'].includes(e.name)) continue;
      walk(full, cb);
    } else {
      cb(full);
    }
  }
}

function extractPermissionsFromSeed(content) {
  const results = new Set();
  const needle = 'permissions';
  let idx = 0;
  while (true) {
    idx = content.indexOf(needle, idx);
    if (idx === -1) break;
    // find the first '[' after this
    const br = content.indexOf('[', idx);
    if (br === -1) break;
    // find matching closing bracket
    let i = br + 1;
    let depth = 1;
    while (i < content.length && depth > 0) {
      const ch = content[i];
      if (ch === '[') depth++;
      else if (ch === ']') depth--;
      i++;
    }
    const block = content.slice(br + 1, i - 1);
    const re = /['"]([^'"\n]+?)['"]/g;
    let m;
    while ((m = re.exec(block))) results.add(m[1]);
    idx = i;
  }
  return Array.from(results).sort();
}

function extractRequirePermissionsFromFile(content) {
  const re = /requirePermission\s*\(\s*['"]([^'"\)]+)['"]\s*\)/g;
  const out = new Set();
  let m;
  while ((m = re.exec(content))) out.add(m[1]);
  return Array.from(out);
}

function scan() {
  const used = new Set();
  walk(ROOT, file => {
    const rel = path.relative(ROOT, file);
    if (!file.endsWith('.js')) return;
    if (rel === path.join('scripts','permission_audit.js')) return;
    try {
      const c = fs.readFileSync(file, 'utf8');
      const perms = extractRequirePermissionsFromFile(c);
      perms.forEach(p => used.add(p));
    } catch (e) {
      // ignore
    }
  });

  // Read seeded permissions from scripts/seedRoles.js
  let seeded = [];
  const seedPath = path.join(ROOT, 'scripts', 'seedRoles.js');
  try {
    const seedContent = fs.readFileSync(seedPath, 'utf8');
    seeded = extractPermissionsFromSeed(seedContent);
  } catch (e) {
    // no seed file
  }

  const usedArr = Array.from(used).sort();
  const seededArr = seeded.sort();

  const missingInSeed = usedArr.filter(x => !seededArr.includes(x));
  const unusedSeeded = seededArr.filter(x => !usedArr.includes(x));

  console.log('\nPermission audit report');
  console.log('Root:', ROOT);
  console.log('\nPermissions referenced in code (requirePermission):');
  if (usedArr.length) usedArr.forEach(p => console.log('  -', p)); else console.log('  (none)');

  console.log('\nPermissions seeded in scripts/seedRoles.js:');
  if (seededArr.length) seededArr.forEach(p => console.log('  -', p)); else console.log('  (none found)');

  console.log('\nPermissions referenced in code but NOT found in seedRoles.js:');
  if (missingInSeed.length) missingInSeed.forEach(p => console.log('  -', p)); else console.log('  (none)');

  console.log('\nPermissions seeded but NOT referenced by requirePermission in code:');
  if (unusedSeeded.length) unusedSeeded.forEach(p => console.log('  -', p)); else console.log('  (none)');

  console.log('\nSummary:');
  console.log('  referenced in code:', usedArr.length);
  console.log('  seeded in seedRoles.js:', seededArr.length);
  console.log('  missing in seed:', missingInSeed.length);
  console.log('  seeded but unused:', unusedSeeded.length);
  console.log('\nDone.');
}

scan();
