/**
 * iOS Sync Protection
 * 
 * Prevents file corruption during iOS/iPhone synchronization.
 * Addresses the issue where TypeScript files get converted to MPEG format.
 * 
 * Key protections:
 * 1. File type validation before sync
 * 2. Automatic backup before any file modification
 * 3. Post-sync integrity verification
 * 4. Corruption detection and alerts
 */

import fs from 'fs';
import path from 'path';
import { FileIntegrityChecker } from '../../tools/file-integrity-checker';

interface SyncProtectionConfig {
  enableAutoBackup: boolean;
  enableValidation: boolean;
  enableMonitoring: boolean;
  excludePatterns: string[];
}

export class IosSyncProtection {
  private config: SyncProtectionConfig;
  private monitoringActive: boolean = false;

  constructor(config: Partial<SyncProtectionConfig> = {}) {
    this.config = {
      enableAutoBackup: config.enableAutoBackup ?? true,
      enableValidation: config.enableValidation ?? true,
      enableMonitoring: config.enableMonitoring ?? true,
      excludePatterns: config.excludePatterns ?? [
        'node_modules',
        '.git',
        'dist',
        'build',
        '.cache'
      ]
    };
  }

  /**
   * Validate file before iOS sync operation
   */
  async validateBeforeSync(filePath: string): Promise<boolean> {
    if (!this.config.enableValidation) {
      return true;
    }

    try {
      const report = await FileIntegrityChecker.checkFile(filePath);
      
      if (report.corrupted) {
        console.error(`❌ File is corrupted: ${filePath}`);
        console.error(`   Expected: ${report.expectedType}, Got: ${report.actualType}`);
        return false;
      }

      if (!report.isValid) {
        console.warn(`⚠️  File may have issues: ${filePath}`);
        return false;
      }

      return true;
    } catch (error) {
      console.error(`Error validating file ${filePath}:`, error);
      return false;
    }
  }

  /**
   * Create backup before iOS sync
   */
  async backupBeforeSync(filePath: string): Promise<string | null> {
    if (!this.config.enableAutoBackup) {
      return null;
    }

    try {
      const backupPath = await FileIntegrityChecker.createBackup(filePath);
      console.log(`✅ Backup created: ${backupPath}`);
      return backupPath;
    } catch (error) {
      console.error(`Failed to create backup for ${filePath}:`, error);
      return null;
    }
  }

  /**
   * Verify file integrity after iOS sync
   */
  async verifyAfterSync(filePath: string): Promise<boolean> {
    try {
      const report = await FileIntegrityChecker.checkFile(filePath);
      
      if (report.corrupted) {
        console.error(`🚨 CORRUPTION DETECTED: ${filePath}`);
        console.error(`   File type changed from expected ${report.expectedType} to ${report.actualType}`);
        console.error(`   This is likely due to iOS/iPhone sync converting the file to MPEG format`);
        return false;
      }

      return report.isValid;
    } catch (error) {
      console.error(`Error verifying file ${filePath}:`, error);
      return false;
    }
  }

  /**
   * Scan directory for corruption after iOS sync
   */
  async scanForCorruption(dirPath: string): Promise<string[]> {
    const corrupted: string[] = [];

    try {
      const results = await FileIntegrityChecker.scanDirectory(dirPath);
      
      for (const result of results) {
        if (result.corrupted) {
          corrupted.push(result.path);
          console.error(`🚨 Corrupted file found: ${result.path}`);
          console.error(`   Type: ${result.actualType} (expected ${result.expectedType})`);
        }
      }
    } catch (error) {
      console.error(`Error scanning directory ${dirPath}:`, error);
    }

    return corrupted;
  }

  /**
   * Generate iOS sync safety report
   */
  async generateSafetyReport(dirPath: string = process.cwd()): Promise<string> {
    const report = await FileIntegrityChecker.generateReport(dirPath);
    
    let safetyReport = '# iOS Sync Safety Report\n\n';
    safetyReport += `Generated: ${new Date().toISOString()}\n\n`;
    safetyReport += '## Protection Status\n\n';
    safetyReport += `- Auto-Backup: ${this.config.enableAutoBackup ? '✅ Enabled' : '❌ Disabled'}\n`;
    safetyReport += `- Validation: ${this.config.enableValidation ? '✅ Enabled' : '❌ Disabled'}\n`;
    safetyReport += `- Monitoring: ${this.config.enableMonitoring ? '✅ Enabled' : '❌ Disabled'}\n\n`;
    safetyReport += '## File Integrity\n\n';
    safetyReport += report;
    
    return safetyReport;
  }

  /**
   * Recommendations for preventing iOS sync corruption
   */
  static getRecommendations(): string {
    return `
# iOS Sync Corruption Prevention Recommendations

## Problem
TypeScript and source code files are being converted to MPEG format during iOS/iPhone synchronization.

## Solutions

### 1. Use Git for Version Control (RECOMMENDED)
- Commit changes to Git before syncing with iOS
- Use GitHub/GitLab for cloud backup
- Clone fresh on other devices instead of syncing

### 2. Disable iCloud Sync for Development Folders
- Go to Settings > Apple ID > iCloud > Manage Storage
- Disable iCloud Drive for development directories
- Keep code only in Git repositories

### 3. Use Alternative Sync Methods
- Dropbox (but still use Git as primary)
- Google Drive (with caution)
- Direct Git push/pull only

### 4. File Monitoring
- Run file integrity checks before committing
- Use automated validation in CI/CD pipeline
- Set up pre-commit hooks to detect corruption

### 5. Development Environment Best Practices
- Develop on Replit (cloud-based, no iOS sync issues)
- Use Vercel for frontend deployment
- Keep production code separate from iOS-synced folders

### 6. Emergency Recovery
- Always maintain Git backups
- Use file-integrity-checker to detect issues early
- Keep timestamped backups in .file-backups/

## Quick Commands

\`\`\`bash
# Scan for corrupted files
npm run integrity:scan

# Check specific file
npm run integrity:check path/to/file.ts

# Create backup
npm run integrity:backup path/to/file.ts

# Generate full report
npm run integrity:report
\`\`\`

## Warning Signs
- Files changing type unexpectedly
- TypeScript files becoming media files
- Build/compilation failures after syncing
- Git showing binary changes for text files
`;
  }
}

// Export singleton instance
export const iosSyncProtection = new IosSyncProtection();
