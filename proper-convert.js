const fs = require('fs');
const path = require('path');

// Files to convert
const files = [
  {
    src: 'fitguide_web/src/features/workout/EnhancedWorkoutExecution.tsx',
    dest: 'fitguide_nextjs/src/features/workout/EnhancedWorkoutExecution.js'
  },
  {
    src: 'fitguide_web/src/features/dashboard/components/HomeTab.tsx',
    dest: 'fitguide_nextjs/src/features/dashboard/components/HomeTab.js'
  }
];

function convertToJS(content) {
  let js = content;

  // 1. Remove all standalone interface and type definitions (multi-line)
  js = js.replace(/^export\s+interface\s+\w+\s*\{[\s\S]*?\n\}/gm, '');
  js = js.replace(/^interface\s+\w+\s*\{[\s\S]*?\n\}/gm, '');
  js = js.replace(/^export\s+type\s+\w+\s*=[\s\S]*?;\s*/gm, '');
  js = js.replace(/^type\s+\w+\s*=[\s\S]*?;\s*/gm, '');

  // 2. Remove import type statements
  js = js.replace(/import\s+type\s+\{[^}]+\}\s+from\s+['"][^'"]+['"];?\s*/g, '');

  // 3. Fix React import - change to use client
  js = js.replace(/import\s+React,\s*\{/g, "import {");
  js = js.replace(/import\s+React\s+from\s*['"]react['"];?/g, '');

  //  4. Remove FC type annotation
  js = js.replace(/:\s*React\.FC<\w+>/g, '');

  // 5. Remove type annotations from function parameters (aggressive)
  js = js.replace(/(\w+):\s*[^,)=]+/g, '$1');

  // 6. Remove return type annotations
  js = js.replace(/\):\s*\w+(\[\])?\s*=>/g, ') =>');
  js = js.replace(/\):\s*\w+(\[\])?\s*\{/g, ') {');

  // 7. Remove generic type parameters
  js = js.replace(/<[A-Za-z0-9_,\s]+>/g, '');

  // 8. Replace import.meta.env
  js = js.replace(/import\.meta\.env\.VITE_/g, 'process.env.NEXT_PUBLIC_');

  // 9. Add 'use client' directive
  if (!js.trim().startsWith("'use client'")) {
    js = "'use client';\n\n" + js;
  }

  // 10. Clean up multiple blank lines
  js = js.replace(/\n{4,}/g, '\n\n\n');

  return js;
}

console.log('🔧 Converting TypeScript to Next.js JavaScript...\n');

files.forEach(({ src, dest }) => {
  const srcPath = path.join(__dirname, src);
  const destPath = path.join(__dirname, dest);

  console.log(`📄 Converting: ${src}`);

  try {
    const tsContent = fs.readFileSync(srcPath, 'utf-8');
    const jsContent = convertToJS(tsContent);
    fs.writeFileSync(destPath, jsContent, 'utf-8');

    console.log(`✅ Converted to: ${dest}\n`);
  } catch (error) {
    console.error(`❌ Error: ${error.message}\n`);
  }
});

console.log('🎉 Done!');
