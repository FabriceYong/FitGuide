/**
 * Migration Verification Script
 * Checks for common issues in the converted Next.js codebase
 */

const fs = require('fs');
const path = require('path');

const NEXTJS_SRC = path.join(__dirname, 'fitguide_nextjs', 'src');

let errors = [];
let warnings = [];
let info = [];

// Check for common issues
function checkFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const relativePath = path.relative(NEXTJS_SRC, filePath);

  // Check for TypeScript remnants
  if (content.match(/:\s*(string|number|boolean|any|void|never)\b/)) {
    warnings.push(`${relativePath}: Contains possible TypeScript type annotations`);
  }

  if (content.includes('interface ') || content.includes('type ')) {
    warnings.push(`${relativePath}: Contains TypeScript interface or type declarations`);
  }

  // Check for import.meta.env (should be process.env.NEXT_PUBLIC_)
  if (content.includes('import.meta.env')) {
    errors.push(`${relativePath}: Still uses import.meta.env (should be process.env.NEXT_PUBLIC_)`);
  }

  // Check if client components have 'use client'
  const usesHooks = /useState|useEffect|useContext|useCallback|useMemo|useRef|useReducer/.test(content);
  const usesBrowserAPI = /localStorage|sessionStorage|window\.|document\./.test(content);
  const hasUseClient = content.includes("'use client'") || content.includes('"use client"');

  if ((usesHooks || usesBrowserAPI) && !hasUseClient) {
    warnings.push(`${relativePath}: Uses hooks/browser APIs but missing 'use client' directive`);
  }

  // Check for proper imports
  if (content.includes("from 'react'") || content.includes('from "react"')) {
    info.push(`${relativePath}: Uses React imports ✓`);
  }
}

// Recursively scan directory
function scanDirectory(dir) {
  const items = fs.readdirSync(dir);

  items.forEach(item => {
    const fullPath = path.join(dir, item);
    const stats = fs.statSync(fullPath);

    if (stats.isDirectory()) {
      scanDirectory(fullPath);
    } else if (item.endsWith('.js') || item.endsWith('.jsx')) {
      checkFile(fullPath);
    }
  });
}

// Check required files exist
function checkRequiredFiles() {
  const required = [
    'fitguide_nextjs/package.json',
    'fitguide_nextjs/next.config.js',
    'fitguide_nextjs/tailwind.config.js',
    'fitguide_nextjs/src/app/layout.js',
    'fitguide_nextjs/src/app/page.js',
    'fitguide_nextjs/src/app/globals.css',
    'fitguide_nextjs/src/contexts/AuthContext.js',
    'fitguide_nextjs/src/contexts/WorkoutContext.js',
    'fitguide_nextjs/src/components/Dashboard.js',
  ];

  required.forEach(file => {
    const fullPath = path.join(__dirname, file);
    if (fs.existsSync(fullPath)) {
      info.push(`Required file exists: ${file} ✓`);
    } else {
      errors.push(`Missing required file: ${file}`);
    }
  });
}

// Check package.json dependencies
function checkDependencies() {
  const packagePath = path.join(__dirname, 'fitguide_nextjs', 'package.json');
  if (fs.existsSync(packagePath)) {
    const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf-8'));

    const requiredDeps = ['next', 'react', 'react-dom'];
    requiredDeps.forEach(dep => {
      if (pkg.dependencies[dep]) {
        info.push(`Dependency ${dep}: ${pkg.dependencies[dep]} ✓`);
      } else {
        errors.push(`Missing dependency: ${dep}`);
      }
    });

    // Check React version compatibility
    const reactVersion = pkg.dependencies.react;
    if (reactVersion && reactVersion.includes('19.')) {
      errors.push(`React version ${reactVersion} is incompatible with Next.js 14 - should be ^18.3.1`);
    }
  } else {
    errors.push('package.json not found');
  }
}

// Main execution
console.log('🔍 Running migration verification...\n');

checkRequiredFiles();
checkDependencies();

if (fs.existsSync(NEXTJS_SRC)) {
  console.log('📁 Scanning source files...\n');
  scanDirectory(NEXTJS_SRC);
} else {
  errors.push('Source directory not found: ' + NEXTJS_SRC);
}

// Report
console.log('\n' + '='.repeat(60));
console.log('📊 VERIFICATION REPORT');
console.log('='.repeat(60) + '\n');

if (errors.length > 0) {
  console.log('❌ ERRORS (' + errors.length + ')');
  errors.forEach(err => console.log('  • ' + err));
  console.log('');
}

if (warnings.length > 0) {
  console.log('⚠️  WARNINGS (' + warnings.length + ')');
  warnings.slice(0, 10).forEach(warn => console.log('  • ' + warn));
  if (warnings.length > 10) {
    console.log(`  ... and ${warnings.length - 10} more`);
  }
  console.log('');
}

console.log('ℹ️  INFO (' + info.length + ')');
info.slice(0, 5).forEach(i => console.log('  • ' + i));
if (info.length > 5) {
  console.log(`  ... and ${info.length - 5} more`);
}

console.log('\n' + '='.repeat(60));
if (errors.length === 0) {
  console.log('✅ VERIFICATION PASSED - No critical errors found!');
} else {
  console.log('❌ VERIFICATION FAILED - Please fix errors above');
}
console.log('='.repeat(60) + '\n');

process.exit(errors.length > 0 ? 1 : 0);
