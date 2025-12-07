/**
 * File Integrity Checker
 * 
 * This utility helps prevent file corruption issues, particularly
 * the TypeScript-to-MPEG conversion problem observed with iOS/iPhone syncing.
 * 
 * It validates file types, detects corruption, and provides backup mechanisms.
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

interface FileIntegrityReport {
  path: string;
  isValid: boolean;
  expectedType: string;
  actualType: string;
  size: number;
  corrupted: boolean;
  error?: string;
}

export class FileIntegrityChecker {
  private static readonly SOURCE_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.json', '.md'];
  private static readonly BACKUP_DIR = '.file-backups';

  /**
   * Check if a file has been corrupted (e.g., TypeScript file converted to MPEG)
   */
  static async checkFile(filePath: string): Promise<FileIntegrityReport> {
    try {
      const stats = fs.statSync(filePath);
      const ext = path.extname(filePath);
      const expectedType = this.getExpectedMimeType(ext);
      
      // Use 'file' command to detect actual file type
      let actualType = 'unknown';
      try {
        actualType = execSync(`file -b --mime-type "${filePath}"`, { encoding: 'utf-8' }).trim();
      } catch (e) {
        console.warn(`Could not determine file type for ${filePath}`);
      }

      const isValid = this.validateFileType(ext, actualType);
      const corrupted = this.isCorrupted(ext, actualType);

      return {
        path: filePath,
        isValid,
        expectedType,
        actualType,
        size: stats.size,
        corrupted
      };
    } catch (error) {
      return {
        path: filePath,
        isValid: false,
        expectedType: 'unknown',
        actualType: 'error',
        size: 0,
        corrupted: true,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Scan directory for corrupted files
   */
  static async scanDirectory(dirPath: string, recursive: boolean = true): Promise<FileIntegrityReport[]> {
    const results: FileIntegrityReport[] = [];
    const items = fs.readdirSync(dirPath);

    for (const item of items) {
      const fullPath = path.join(dirPath, item);
      
      // Skip node_modules, .git, dist, etc.
      if (item === 'node_modules' || item === '.git' || item === 'dist' || item === 'build') {
        continue;
      }

      const stats = fs.statSync(fullPath);
      
      if (stats.isDirectory() && recursive) {
        const subResults = await this.scanDirectory(fullPath, recursive);
        results.push(...subResults);
      } else if (stats.isFile()) {
        const ext = path.extname(item);
        if (this.SOURCE_EXTENSIONS.includes(ext)) {
          const report = await this.checkFile(fullPath);
          results.push(report);
        }
      }
    }

    return results;
  }

  /**
   * Create backup of a file before modification
   */
  static async createBackup(filePath: string): Promise<string> {
    const backupDir = path.join(process.cwd(), this.BACKUP_DIR);
    
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = path.basename(filePath);
    const backupPath = path.join(backupDir, `${timestamp}-${fileName}`);

    fs.copyFileSync(filePath, backupPath);
    
    return backupPath;
  }

  /**
   * Restore file from backup
   */
  static async restoreFromBackup(backupPath: string, originalPath: string): Promise<void> {
    if (!fs.existsSync(backupPath)) {
      throw new Error(`Backup file not found: ${backupPath}`);
    }

    fs.copyFileSync(backupPath, originalPath);
  }

  /**
   * Get expected MIME type based on file extension
   */
  private static getExpectedMimeType(ext: string): string {
    const mimeTypes: Record<string, string> = {
      '.ts': 'text/plain',
      '.tsx': 'text/plain',
      '.js': 'application/javascript',
      '.jsx': 'application/javascript',
      '.json': 'application/json',
      '.md': 'text/plain',
      '.txt': 'text/plain'
    };

    return mimeTypes[ext] || 'text/plain';
  }

  /**
   * Validate if actual file type matches expected type
   */
  private static validateFileType(ext: string, actualType: string): boolean {
    // Text-based files should be text/* or application/javascript
    if (this.SOURCE_EXTENSIONS.includes(ext)) {
      return actualType.startsWith('text/') || 
             actualType.includes('javascript') ||
             actualType.includes('json') ||
             actualType.includes('xml');
    }

    return true;
  }

  /**
   * Check if file is corrupted (e.g., video/audio/image when it should be text)
   */
  private static isCorrupted(ext: string, actualType: string): boolean {
    if (this.SOURCE_EXTENSIONS.includes(ext)) {
      // Source code files should never be video, audio, or image files
      if (actualType.includes('video/') || 
          actualType.includes('audio/') || 
          actualType.includes('image/') ||
          actualType.includes('mpeg') ||
          actualType.includes('mp4') ||
          actualType.includes('mp3')) {
        return true;
      }
    }

    return false;
  }

  /**
   * Generate integrity report for repository
   */
  static async generateReport(dirPath: string = process.cwd()): Promise<string> {
    const results = await this.scanDirectory(dirPath);
    const corrupted = results.filter(r => r.corrupted);
    const invalid = results.filter(r => !r.isValid && !r.corrupted);

    let report = '# File Integrity Report\n\n';
    report += `Generated: ${new Date().toISOString()}\n\n`;
    report += `## Summary\n\n`;
    report += `- Total files scanned: ${results.length}\n`;
    report += `- Valid files: ${results.filter(r => r.isValid).length}\n`;
    report += `- Corrupted files: ${corrupted.length}\n`;
    report += `- Invalid files: ${invalid.length}\n\n`;

    if (corrupted.length > 0) {
      report += `## ⚠️ CORRUPTED FILES (CRITICAL)\n\n`;
      report += `These files have been converted to incorrect formats:\n\n`;
      for (const file of corrupted) {
        report += `- **${file.path}**\n`;
        report += `  - Expected: ${file.expectedType}\n`;
        report += `  - Actual: ${file.actualType}\n`;
        report += `  - Size: ${file.size} bytes\n\n`;
      }
    }

    if (invalid.length > 0) {
      report += `## Invalid Files\n\n`;
      for (const file of invalid) {
        report += `- ${file.path}: ${file.actualType}\n`;
      }
      report += `\n`;
    }

    return report;
  }
}

// CLI usage
if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0];

  async function main() {
    switch (command) {
      case 'scan':
        const dirToScan = args[1] || process.cwd();
        const report = await FileIntegrityChecker.generateReport(dirToScan);
        console.log(report);
        
        // Write report to file
        fs.writeFileSync('file-integrity-report.md', report);
        console.log('\nReport saved to: file-integrity-report.md');
        break;

      case 'check':
        if (!args[1]) {
          console.error('Usage: ts-node file-integrity-checker.ts check <file-path>');
          process.exit(1);
        }
        const result = await FileIntegrityChecker.checkFile(args[1]);
        console.log(JSON.stringify(result, null, 2));
        break;

      case 'backup':
        if (!args[1]) {
          console.error('Usage: ts-node file-integrity-checker.ts backup <file-path>');
          process.exit(1);
        }
        const backupPath = await FileIntegrityChecker.createBackup(args[1]);
        console.log(`Backup created: ${backupPath}`);
        break;

      default:
        console.log('File Integrity Checker - Usage:');
        console.log('  scan [directory]     - Scan directory for corrupted files');
        console.log('  check <file>         - Check single file integrity');
        console.log('  backup <file>        - Create backup of file');
    }
  }

  main().catch(console.error);
}
