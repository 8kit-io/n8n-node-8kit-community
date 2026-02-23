/**
 * Local linter that replicates what @n8n/scan-community-package does,
 * but runs against the local dist/ directory instead of downloading from npm.
 *
 * Usage: node scripts/lint-package.mjs
 */

import { readdir, stat } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { ESLint } from 'eslint';

const DIST_DIR = resolve(process.cwd(), 'dist');

async function getJsFiles(dir) {
  const files = [];
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await getJsFiles(fullPath)));
    } else if (entry.name.endsWith('.js')) {
      files.push(fullPath);
    }
  }
  return files;
}

async function main() {
  // Verify dist/ exists
  try {
    await stat(DIST_DIR);
  } catch {
    console.error('ERROR: dist/ directory not found. Run `npm run build` first.');
    process.exit(1);
  }

  const jsFiles = await getJsFiles(DIST_DIR);
  console.log(`Found ${jsFiles.length} JS files in dist/\n`);

  // Import the plugin
  const pluginModule = await import('@n8n/eslint-plugin-community-nodes');
  const plugin = pluginModule.default || pluginModule;

  const eslint = new ESLint({
    cwd: DIST_DIR,
    allowInlineConfig: false,
    overrideConfigFile: true,
    overrideConfig: [
      {
        plugins: {
          '@n8n/community-nodes': plugin,
        },
        rules: {
          // n8n recommended rules
          '@n8n/community-nodes/no-restricted-globals': 'error',
          '@n8n/community-nodes/no-restricted-imports': 'error',
          '@n8n/community-nodes/credential-password-field': 'error',
          '@n8n/community-nodes/no-deprecated-workflow-functions': 'error',
          '@n8n/community-nodes/node-usable-as-tool': 'error',
          '@n8n/community-nodes/package-name-convention': 'error',
          '@n8n/community-nodes/credential-test-required': 'error',
          '@n8n/community-nodes/no-credential-reuse': 'error',
          '@n8n/community-nodes/icon-validation': 'error',
          '@n8n/community-nodes/resource-operation-pattern': 'warn',
          '@n8n/community-nodes/credential-documentation-url': 'error',
          // Additional rule that the scanner adds
          'no-console': 'error',
        },
      },
    ],
  });

  const results = await eslint.lintFiles(jsFiles);

  // Format results
  let totalErrors = 0;
  let totalWarnings = 0;

  for (const result of results) {
    if (result.errorCount > 0 || result.warningCount > 0) {
      const relPath = result.filePath.replace(`${DIST_DIR}/`, '');
      console.log(`\n${relPath}:`);
      for (const msg of result.messages) {
        const prefix = msg.severity === 2 ? 'ERROR' : 'WARN';
        console.log(`  ${prefix} [${msg.ruleId}] Line ${msg.line}: ${msg.message}`);
      }
      totalErrors += result.errorCount;
      totalWarnings += result.warningCount;
    }
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`Results: ${totalErrors} errors, ${totalWarnings} warnings`);
  console.log(`${'='.repeat(60)}`);

  if (totalErrors > 0) {
    console.log('\nFAILED: Fix errors above before submitting to n8n marketplace.');
    process.exit(1);
  } else if (totalWarnings > 0) {
    console.log('\nPASSED with warnings. Warnings are advisory but consider fixing them.');
    process.exit(0);
  } else {
    console.log('\nPASSED: Package is clean for n8n marketplace submission!');
    process.exit(0);
  }
}

main().catch((err) => {
  console.error('Lint script failed:', err);
  process.exit(1);
});
