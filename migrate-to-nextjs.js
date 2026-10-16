/**
 * Automated TypeScript to JavaScript Conversion Script
 * This script converts all TypeScript files in fitguide_web to JavaScript in fitguide_nextjs
 */

const fs = require('fs');
const path = require('path');

const SOURCE_DIR = path.join(__dirname, 'fitguide_web', 'src');
const TARGET_DIR = path.join(__dirname, 'fitguide_nextjs', 'src');

// Files and directories to skip
const SKIP_PATTERNS = [
  'test-debug.html',
  'App.test-simple.tsx',
  '.test.tsx',
  '.test.ts',
  '.spec.tsx',
  '.spec.ts',
];

// Conversion rules
const convertTypeScriptToJavaScript = (content, filePath) => {
  let jsContent = content;

  // Add 'use client' directive if file uses hooks or browser APIs
  const needsUseClient = (
    /useState|useEffect|useContext|useCallback|useMemo|useRef|useReducer/.test(content) ||
    /localStorage|sessionStorage|window|document/.test(content) ||
    /onClick|onChange|onSubmit|onKeyDown/.test(content)
  );

  if (needsUseClient && !content.includes("'use client'") && !content.includes('"use client"')) {
    jsContent = "'use client';\n\n" + jsContent;
  }

  // Remove all TypeScript-specific syntax

  // Remove type imports
  jsContent = jsContent.replace(/import\s+type\s+\{[^}]+\}\s+from\s+['"][^'"]+['"];?\n?/g, '');
  jsContent = jsContent.replace(/import\s+type\s+\*\s+as\s+\w+\s+from\s+['"][^'"]+['"];?\n?/g, '');

  // Remove interface declarations
  jsContent = jsContent.replace(/interface\s+\w+\s*\{[^}]*\}\s*/g, '');
  jsContent = jsContent.replace(/export\s+interface\s+\w+\s*\{[^}]*\}\s*/g, '');

  // Remove type declarations
  jsContent = jsContent.replace(/type\s+\w+\s*=\s*[^;]+;?\s*/g, '');
  jsContent = jsContent.replace(/export\s+type\s+\w+\s*=\s*[^;]+;?\s*/g, '');

  // Remove function parameter types
  jsContent = jsContent.replace(/(\w+)\s*:\s*[^,)=]+/g, '$1');

  // Remove return type annotations
  jsContent = jsContent.replace(/\)\s*:\s*[^{=>\n]+([{=>\n])/g, ')$1');

  // Remove variable type annotations
  jsContent = jsContent.replace(/const\s+(\w+)\s*:\s*[^=]+=/g, 'const $1 =');
  jsContent = jsContent.replace(/let\s+(\w+)\s*:\s*[^=]+=/g, 'let $1 =');
  jsContent = jsContent.replace(/var\s+(\w+)\s*:\s*[^=]+=/g, 'var $1 =');

  // Remove generic type parameters
  jsContent = jsContent.replace(/<[^>]+>/g, '');

  // Remove 'as' type assertions
  jsContent = jsContent.replace(/\s+as\s+\w+/g, '');

  // Remove React.FC, React.ReactNode, etc.
  jsContent = jsContent.replace(/:\s*React\.FC\w*/g, '');
  jsContent = jsContent.replace(/:\s*FC\w*/g, '');
  jsContent = jsContent.replace(/:\s*ReactNode/g, '');

  // Replace import.meta.env with process.env.NEXT_PUBLIC_
  jsContent = jsContent.replace(/import\.meta\.env\.VITE_/g, 'process.env.NEXT_PUBLIC_');

  // Clean up multiple blank lines
  jsContent = jsContent.replace(/\n\n\n+/g, '\n\n');

  // Clean up trailing spaces
  jsContent = jsContent.replace(/[ \t]+$/gm, '');

  return jsContent;
};

// Recursive function to process directory
const processDirectory = (sourceDir, targetDir) => {
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  const items = fs.readdirSync(sourceDir);

  items.forEach(item => {
    const sourcePath = path.join(sourceDir, item);
    const stats = fs.statSync(sourcePath);

    // Skip patterns
    if (SKIP_PATTERNS.some(pattern => item.includes(pattern))) {
      console.log(`⏭️  Skipping: ${sourcePath}`);
      return;
    }

    if (stats.isDirectory()) {
      // Recursively process subdirectory
      const newTargetDir = path.join(targetDir, item);
      processDirectory(sourcePath, newTargetDir);
    } else if (stats.isFile()) {
      // Process files
      if (item.endsWith('.tsx') || item.endsWith('.ts')) {
        // Convert TypeScript to JavaScript
        const content = fs.readFileSync(sourcePath, 'utf-8');
        const jsContent = convertTypeScriptToJavaScript(content, sourcePath);

        // Change extension
        const newFileName = item.replace(/\.tsx?$/, '.js');
        const targetPath = path.join(targetDir, newFileName);

        fs.writeFileSync(targetPath, jsContent, 'utf-8');
        console.log(`✅ Converted: ${sourcePath} → ${targetPath}`);
      } else if (item.endsWith('.css') || item.endsWith('.json') || item.endsWith('.svg') || item.endsWith('.png')) {
        // Copy non-TS files as-is
        const targetPath = path.join(targetDir, item);
        fs.copyFileSync(sourcePath, targetPath);
        console.log(`📋 Copied: ${sourcePath} → ${targetPath}`);
      }
    }
  });
};

// Main execution
console.log('🚀 Starting TypeScript to JavaScript conversion...\n');
console.log(`Source: ${SOURCE_DIR}`);
console.log(`Target: ${TARGET_DIR}\n`);

try {
  processDirectory(SOURCE_DIR, TARGET_DIR);
  console.log('\n✨ Conversion completed successfully!');
  console.log('\n📝 Next steps:');
  console.log('1. cd fitguide_nextjs');
  console.log('2. npm install');
  console.log('3. Create .env.local file with environment variables');
  console.log('4. npm run dev');
} catch (error) {
  console.error('\n❌ Error during conversion:', error);
  process.exit(1);
}
