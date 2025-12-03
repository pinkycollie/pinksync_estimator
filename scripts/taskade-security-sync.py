#!/usr/bin/env python3
"""
Taskade Security Sync - MBTQ.dev Ecosystem
Sends security scan results to Taskade webhook for tracking and notification.

Usage:
    python3 taskade-security-sync.py parse --type trivy --file trivy-results.json
    python3 taskade-security-sync.py parse --type bandit --file bandit-report.json
    python3 taskade-security-sync.py parse --type npm --file npm-audit.json
    python3 taskade-security-sync.py summary --files trivy-results.json,bandit-report.json,npm-audit.json
"""

import argparse
import json
import os
import sys
from datetime import datetime
from typing import Any, Dict

try:
    import requests
except ImportError:
    print("ERROR: 'requests' package is required. Install with: pip install requests")
    sys.exit(1)

# Taskade webhook URL from environment (must be set)
TASKADE_WEBHOOK_URL = os.environ.get('TASKADE_WEBHOOK')
if not TASKADE_WEBHOOK_URL:
    print("ERROR: TASKADE_WEBHOOK environment variable must be set")
    sys.exit(1)

# Repository info
REPO_NAME = os.environ.get('GITHUB_REPOSITORY', 'pinkycollie/pinksync_estimator')
WORKFLOW_NAME = os.environ.get('GITHUB_WORKFLOW', 'Security Scan')
RUN_ID = os.environ.get('GITHUB_RUN_ID', 'local')
RUN_URL = f"https://github.com/{REPO_NAME}/actions/runs/{RUN_ID}"


def parse_trivy_results(filepath: str) -> Dict[str, Any]:
    """Parse Trivy container/filesystem scan results."""
    try:
        with open(filepath, 'r') as f:
            data = json.load(f)
        
        vulnerabilities = []
        summary = {'critical': 0, 'high': 0, 'medium': 0, 'low': 0, 'unknown': 0}
        
        results = data.get('Results', [])
        for result in results:
            target = result.get('Target', 'unknown')
            vulns = result.get('Vulnerabilities', [])
            
            for vuln in vulns:
                severity = vuln.get('Severity', 'UNKNOWN').lower()
                summary[severity] = summary.get(severity, 0) + 1
                
                vulnerabilities.append({
                    'id': vuln.get('VulnerabilityID', 'N/A'),
                    'package': vuln.get('PkgName', 'N/A'),
                    'version': vuln.get('InstalledVersion', 'N/A'),
                    'fixed_version': vuln.get('FixedVersion', 'Not available'),
                    'severity': severity,
                    'title': vuln.get('Title', 'No title'),
                    'target': target
                })
        
        return {
            'scanner': 'trivy',
            'scan_type': 'container/filesystem',
            'total_vulnerabilities': len(vulnerabilities),
            'summary': summary,
            'vulnerabilities': vulnerabilities[:20],  # Limit to top 20
            'has_more': len(vulnerabilities) > 20
        }
    except FileNotFoundError:
        return {
            'scanner': 'trivy',
            'scan_type': 'container/filesystem',
            'total_vulnerabilities': 0,
            'summary': {'critical': 0, 'high': 0, 'medium': 0, 'low': 0, 'unknown': 0},
            'vulnerabilities': [],
            'has_more': False,
            'error': f'File not found: {filepath}'
        }
    except json.JSONDecodeError as e:
        return {
            'scanner': 'trivy',
            'scan_type': 'container/filesystem',
            'total_vulnerabilities': 0,
            'summary': {'critical': 0, 'high': 0, 'medium': 0, 'low': 0, 'unknown': 0},
            'vulnerabilities': [],
            'has_more': False,
            'error': f'Invalid JSON: {str(e)}'
        }


def parse_bandit_results(filepath: str) -> Dict[str, Any]:
    """Parse Bandit Python security scan results."""
    try:
        with open(filepath, 'r') as f:
            data = json.load(f)
        
        results = data.get('results', [])
        metrics = data.get('metrics', {}).get('_totals', {})
        
        issues = []
        summary = {'high': 0, 'medium': 0, 'low': 0}
        
        for result in results:
            severity = result.get('issue_severity', 'LOW').lower()
            summary[severity] = summary.get(severity, 0) + 1
            
            issues.append({
                'id': result.get('test_id', 'N/A'),
                'name': result.get('test_name', 'N/A'),
                'severity': severity,
                'confidence': result.get('issue_confidence', 'N/A'),
                'file': result.get('filename', 'N/A'),
                'line': result.get('line_number', 0),
                'description': result.get('issue_text', 'No description')
            })
        
        return {
            'scanner': 'bandit',
            'scan_type': 'python_security',
            'total_issues': len(issues),
            'summary': summary,
            'metrics': {
                'loc': metrics.get('loc', 0),
                'nosec': metrics.get('nosec', 0)
            },
            'issues': issues[:20],
            'has_more': len(issues) > 20
        }
    except FileNotFoundError:
        return {
            'scanner': 'bandit',
            'scan_type': 'python_security',
            'total_issues': 0,
            'summary': {'high': 0, 'medium': 0, 'low': 0},
            'metrics': {'loc': 0, 'nosec': 0},
            'issues': [],
            'has_more': False,
            'error': f'File not found: {filepath}'
        }
    except json.JSONDecodeError as e:
        return {
            'scanner': 'bandit',
            'scan_type': 'python_security',
            'total_issues': 0,
            'summary': {'high': 0, 'medium': 0, 'low': 0},
            'metrics': {'loc': 0, 'nosec': 0},
            'issues': [],
            'has_more': False,
            'error': f'Invalid JSON: {str(e)}'
        }


def parse_npm_audit_results(filepath: str) -> Dict[str, Any]:
    """Parse npm audit results."""
    try:
        with open(filepath, 'r') as f:
            data = json.load(f)
        
        # Handle different npm audit output formats
        if 'vulnerabilities' in data:
            # npm audit --json format (npm 7+)
            vulns = data.get('vulnerabilities', {})
            metadata = data.get('metadata', {})
            
            summary = {
                'critical': 0,
                'high': 0,
                'moderate': 0,
                'low': 0,
                'info': 0
            }
            
            vulnerabilities = []
            for pkg_name, vuln_info in vulns.items():
                severity = vuln_info.get('severity', 'info').lower()
                summary[severity] = summary.get(severity, 0) + 1
                
                vulnerabilities.append({
                    'package': pkg_name,
                    'severity': severity,
                    'via': vuln_info.get('via', []),
                    'effects': vuln_info.get('effects', []),
                    'range': vuln_info.get('range', 'N/A'),
                    'fix_available': vuln_info.get('fixAvailable', False)
                })
            
            return {
                'scanner': 'npm_audit',
                'scan_type': 'npm_dependencies',
                'total_vulnerabilities': len(vulnerabilities),
                'summary': summary,
                'dependencies': metadata.get('dependencies', {}).get('total', 0),
                'vulnerabilities': vulnerabilities[:20],
                'has_more': len(vulnerabilities) > 20
            }
        elif 'advisories' in data:
            # Older npm audit format
            advisories = data.get('advisories', {})
            metadata = data.get('metadata', {}).get('vulnerabilities', {})
            
            summary = {
                'critical': metadata.get('critical', 0),
                'high': metadata.get('high', 0),
                'moderate': metadata.get('moderate', 0),
                'low': metadata.get('low', 0),
                'info': metadata.get('info', 0)
            }
            
            vulnerabilities = []
            for adv_id, advisory in advisories.items():
                vulnerabilities.append({
                    'id': adv_id,
                    'package': advisory.get('module_name', 'N/A'),
                    'severity': advisory.get('severity', 'info'),
                    'title': advisory.get('title', 'No title'),
                    'url': advisory.get('url', 'N/A'),
                    'patched_versions': advisory.get('patched_versions', 'N/A')
                })
            
            return {
                'scanner': 'npm_audit',
                'scan_type': 'npm_dependencies',
                'total_vulnerabilities': len(vulnerabilities),
                'summary': summary,
                'vulnerabilities': vulnerabilities[:20],
                'has_more': len(vulnerabilities) > 20
            }
        else:
            return {
                'scanner': 'npm_audit',
                'scan_type': 'npm_dependencies',
                'total_vulnerabilities': 0,
                'summary': {'critical': 0, 'high': 0, 'moderate': 0, 'low': 0},
                'message': 'No vulnerabilities found or empty audit'
            }
            
    except FileNotFoundError:
        return {
            'scanner': 'npm_audit',
            'scan_type': 'npm_dependencies',
            'total_vulnerabilities': 0,
            'summary': {'critical': 0, 'high': 0, 'moderate': 0, 'low': 0},
            'vulnerabilities': [],
            'has_more': False,
            'error': f'File not found: {filepath}'
        }
    except json.JSONDecodeError as e:
        return {
            'scanner': 'npm_audit',
            'scan_type': 'npm_dependencies',
            'total_vulnerabilities': 0,
            'summary': {'critical': 0, 'high': 0, 'moderate': 0, 'low': 0},
            'vulnerabilities': [],
            'has_more': False,
            'error': f'Invalid JSON: {str(e)}'
        }


def send_to_taskade(payload: Dict[str, Any]) -> bool:
    """Send results to Taskade webhook."""
    try:
        response = requests.post(
            TASKADE_WEBHOOK_URL,
            json=payload,
            headers={'Content-Type': 'application/json'},
            timeout=30
        )
        
        if response.ok:
            print(f"✅ Successfully sent to Taskade webhook")
            return True
        else:
            print(f"❌ Taskade webhook failed: {response.status_code} - {response.text}")
            return False
    except requests.exceptions.RequestException as e:
        print(f"❌ Failed to send to Taskade: {str(e)}")
        return False


def parse_scan(scan_type: str, filepath: str) -> None:
    """Parse a single scan result and send to Taskade."""
    print(f"\n🔍 Parsing {scan_type} results from {filepath}...")
    
    parsers = {
        'trivy': parse_trivy_results,
        'bandit': parse_bandit_results,
        'npm': parse_npm_audit_results
    }
    
    if scan_type not in parsers:
        print(f"❌ Unknown scan type: {scan_type}")
        print(f"   Supported types: {', '.join(parsers.keys())}")
        sys.exit(1)
    
    results = parsers[scan_type](filepath)
    
    # Build webhook payload
    payload = {
        'event': 'security.scan.complete',
        'timestamp': datetime.utcnow().isoformat() + 'Z',
        'source': 'pinksync_estimator',
        'repository': REPO_NAME,
        'workflow': WORKFLOW_NAME,
        'run_id': RUN_ID,
        'run_url': RUN_URL,
        'scan_results': results
    }
    
    # Print summary
    if 'error' in results:
        print(f"⚠️  {results['scanner']}: {results['error']}")
    else:
        total = results.get('total_vulnerabilities', results.get('total_issues', 0))
        summary = results.get('summary', {})
        print(f"📊 {results['scanner']}: {total} issues found")
        print(f"   Summary: {json.dumps(summary)}")
    
    # Send to Taskade
    send_to_taskade(payload)


def send_summary(files: str) -> None:
    """Parse multiple files and send a combined summary."""
    print("\n📋 Generating combined security summary...")
    
    file_list = [f.strip() for f in files.split(',') if f.strip()]
    all_results = []
    
    for filepath in file_list:
        # Detect type from filename
        if 'trivy' in filepath.lower():
            results = parse_trivy_results(filepath)
        elif 'bandit' in filepath.lower():
            results = parse_bandit_results(filepath)
        elif 'npm' in filepath.lower():
            results = parse_npm_audit_results(filepath)
        else:
            print(f"⚠️  Unknown file type: {filepath}")
            continue
        
        all_results.append(results)
    
    # Build combined summary
    combined_summary = {
        'critical': 0,
        'high': 0,
        'medium': 0,
        'moderate': 0,
        'low': 0
    }
    
    total_issues = 0
    for result in all_results:
        if 'error' not in result:
            total_issues += result.get('total_vulnerabilities', result.get('total_issues', 0))
            for key, value in result.get('summary', {}).items():
                if key in combined_summary:
                    combined_summary[key] += value
    
    payload = {
        'event': 'security.scan.summary',
        'timestamp': datetime.utcnow().isoformat() + 'Z',
        'source': 'pinksync_estimator',
        'repository': REPO_NAME,
        'workflow': WORKFLOW_NAME,
        'run_id': RUN_ID,
        'run_url': RUN_URL,
        'summary': {
            'total_issues': total_issues,
            'severity_breakdown': combined_summary,
            'scanners_run': len(all_results),
            'scan_details': all_results
        }
    }
    
    print(f"📊 Combined Summary: {total_issues} total issues")
    print(f"   Breakdown: {json.dumps(combined_summary)}")
    
    send_to_taskade(payload)


def main():
    parser = argparse.ArgumentParser(
        description='Taskade Security Sync - Send security scan results to Taskade'
    )
    subparsers = parser.add_subparsers(dest='command', help='Commands')
    
    # Parse command
    parse_parser = subparsers.add_parser('parse', help='Parse a single scan result')
    parse_parser.add_argument('--type', required=True, choices=['trivy', 'bandit', 'npm'],
                              help='Type of security scan')
    parse_parser.add_argument('--file', required=True, help='Path to scan results file')
    
    # Summary command
    summary_parser = subparsers.add_parser('summary', help='Send combined summary')
    summary_parser.add_argument('--files', required=True,
                                help='Comma-separated list of result files')
    
    args = parser.parse_args()
    
    if args.command == 'parse':
        parse_scan(args.type, args.file)
    elif args.command == 'summary':
        send_summary(args.files)
    else:
        parser.print_help()
        sys.exit(1)


if __name__ == '__main__':
    main()
