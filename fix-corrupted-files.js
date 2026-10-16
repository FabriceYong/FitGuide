const fs = require('fs');
const path = require('path');

// Files to fix
const filesToFix = [
  {
    src: 'fitguide_web/src/features/workout/EnhancedWorkoutExecution.tsx',
    dest: 'fitguide_nextjs/src/features/workout/EnhancedWorkoutExecution.js'
  },
  {
    src: 'fitguide_web/src/features/dashboard/components/HomeTab.tsx',
    dest: 'fitguide_nextjs/src/features/dashboard/components/HomeTab.js'
  }
];

function convertTypeScriptToNextJS(content) {
  let js = content;

  // Remove TypeScript type imports
  js = js.replace(/import\s+type\s+\{[^}]+\}\s+from\s+['"][^'"]+['"];?\s*/g, '');

  // Remove interface/type definitions
  js = js.replace(/^(export\s+)?interface\s+\w+\s*\{[^}]*\}(\s*;?)/gm, '');
  js = js.replace(/^(export\s+)?type\s+\w+\s*=\s*[^;]+;/gm, '');

  // Remove React type annotation from FC
  js = js.replace(/:\s*React\.FC<\w+>/g, '');

  // Remove type annotations from parameters
  js = js.replace(/(\w+):\s*(\w+(\[\])?|\{[^}]+\}|[^,)]+)/g, '$1');

  // Remove return type annotations
  js = js.replace(/\):\s*\w+(\[\])?(\s*=>)/g, ')$2');
  js = js.replace(/\):\s*\w+(\s*\{)/g, ')$1');

  // Remove generic type parameters
  js = js.replace(/<[^>]+>/g, '');

  // Change import React to only import needed hooks
  js = js.replace(/import\s+React,\s*\{([^}]+)\}\s*from\s*['"]react['"];?/, 'import {$1} from \'react\';');
  js = js.replace(/import\s+React\s+from\s*['"]react['"];?/, '');

  // Replace import.meta.env with process.env.NEXT_PUBLIC_
  js = js.replace(/import\.meta\.env\.VITE_/g, 'process.env.NEXT_PUBLIC_');

  // Add 'use client' directive at the top
  if (!js.startsWith("'use client'")) {
    js = "'use client';\n\n" + js;
  }

  // Clean up multiple blank lines
  js = js.replace(/\n{3,}/g, '\n\n');

  return js;
}

console.log('🔧 Converting corrupted TypeScript files to Next.js JavaScript...\n');

filesToFix.forEach(({ src, dest }) => {
  const srcPath = path.join(__dirname, src);
  const destPath = path.join(__dirname, dest);

  console.log(`📄 Converting: ${src}`);

  try {
    // Read the TypeScript source
    const tsContent = fs.readFileSync(srcPath, 'utf-8');

    // Convert to JavaScript
    const jsContent = convertTypeScriptToNextJS(tsContent);

    // Write the JavaScript output
    fs.writeFileSync(destPath, jsContent, 'utf-8');

    console.log(`✅ Successfully converted to: ${dest}\n`);
  } catch (error) {
    console.error(`❌ Error converting ${src}:`, error.message, '\n');
  }
});

console.log('🎉 Conversion complete!');
