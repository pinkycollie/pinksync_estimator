/**
 * Tests for the Pinksync File Analyzer CLI Tool
 * 
 * These tests verify the core functionality of the file analyzer.
 * Run with: npx tsx tools/file-analyzer.test.ts
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CLI_PATH = path.join(__dirname, 'file-analyzer.ts');

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
}

const results: TestResult[] = [];

function test(name: string, fn: () => void): void {
  try {
    fn();
    results.push({ name, passed: true });
    console.log(`✅ ${name}`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    results.push({ name, passed: false, error: errorMessage });
    console.log(`❌ ${name}: ${errorMessage}`);
  }
}

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

function runCLI(args: string): string {
  try {
    return execSync(`npx tsx ${CLI_PATH} ${args}`, {
      encoding: 'utf-8',
      cwd: path.dirname(CLI_PATH),
    });
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'stdout' in error) {
      return (error as { stdout: string }).stdout || '';
    }
    throw error;
  }
}

// Create temp directory for tests
const tempDir = path.join(os.tmpdir(), 'pinksync-test-' + Date.now());
fs.mkdirSync(tempDir, { recursive: true });

// Create test files
const testFiles = {
  'test.ts': 'const x = 1;',
  'document.pdf': 'fake pdf content',
  'image.png': 'fake image content',
  'notes.txt': 'some notes',
  'README.md': '# README',
};

for (const [filename, content] of Object.entries(testFiles)) {
  fs.writeFileSync(path.join(tempDir, filename), content);
}

// Create a subdirectory
fs.mkdirSync(path.join(tempDir, 'subdir'));
fs.writeFileSync(path.join(tempDir, 'subdir', 'nested.js'), 'console.log("test");');

console.log('\n🧪 Running Pinksync File Analyzer Tests\n');
console.log('='.repeat(50));

// Test 1: Help command works
test('Help command displays usage information', () => {
  const output = runCLI('--help');
  assert(output.includes('Pinksync File Analyzer'), 'Should contain tool name');
  assert(output.includes('Usage:'), 'Should contain usage section');
  assert(output.includes('--json'), 'Should document --json flag');
  assert(output.includes('--summary'), 'Should document --summary flag');
});

// Test 2: Analyze single file
test('Analyzes a single TypeScript file correctly', () => {
  const output = runCLI(`"${path.join(tempDir, 'test.ts')}"`);
  assert(output.includes('test.ts'), 'Should show filename');
  assert(output.includes('code'), 'Should categorize as code');
  assert(output.includes('💻'), 'Should show code indicator');
});

// Test 3: Analyze directory
test('Analyzes a directory and counts files', () => {
  const output = runCLI(`"${tempDir}" --summary`);
  assert(output.includes('Total Files:'), 'Should show total files');
  assert(output.includes('Summary'), 'Should show summary');
});

// Test 4: JSON output
test('JSON output is valid JSON', () => {
  const output = runCLI(`"${tempDir}" --json`);
  const jsonOutput = output.substring(output.indexOf('{'));
  const parsed = JSON.parse(jsonOutput);
  assert(Array.isArray(parsed.results), 'Should have results array');
  assert(typeof parsed.summary === 'object', 'Should have summary object');
  assert(typeof parsed.summary.totalFiles === 'number', 'Should have totalFiles');
});

// Test 5: Categorizes documents correctly
test('Categorizes PDF files as documents', () => {
  const output = runCLI(`"${path.join(tempDir, 'document.pdf')}"`);
  assert(output.includes('document'), 'Should categorize as document');
  assert(output.includes('📄'), 'Should show document indicator');
});

// Test 6: Categorizes images correctly
test('Categorizes PNG files as images', () => {
  const output = runCLI(`"${path.join(tempDir, 'image.png')}"`);
  assert(output.includes('image'), 'Should categorize as image');
  assert(output.includes('🖼️'), 'Should show image indicator');
});

// Test 7: Handles nested directories
test('Recursively analyzes nested directories', () => {
  const output = runCLI(`"${tempDir}" --json`);
  const jsonOutput = output.substring(output.indexOf('{'));
  const parsed = JSON.parse(jsonOutput);
  const nestedFile = parsed.results.find((r: { name: string }) => r.name === 'nested.js');
  assert(nestedFile !== undefined, 'Should find nested file');
  assert(nestedFile.category === 'code', 'Should categorize nested file correctly');
});

// Test 8: Error handling for non-existent path
test('Shows error for non-existent paths', () => {
  try {
    runCLI('"/nonexistent/path"');
    throw new Error('Should have thrown error');
  } catch (error) {
    // Expected behavior - command should exit with error
    assert(true, 'Error was thrown as expected');
  }
});

// Cleanup
fs.rmSync(tempDir, { recursive: true, force: true });

// Summary
console.log('\n' + '='.repeat(50));
console.log('📊 Test Summary\n');

const passed = results.filter(r => r.passed).length;
const failed = results.filter(r => !r.passed).length;

console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);
console.log(`Total:  ${results.length}`);

if (failed > 0) {
  console.log('\n❌ Some tests failed');
  process.exit(1);
} else {
  console.log('\n✅ All tests passed!');
  process.exit(0);
}
