#!/usr/bin/env python3
"""
Resource Validation and Analysis CLI Tool

Command-line interface for the resource validation and analysis system.
Provides automated scripts for resource validation, scaling analysis, 
performance monitoring, and benchmarking.
"""

import argparse
import json
import sys
from datetime import datetime
from typing import Dict, Any, Union

from resource_validator import (
    ResourceValidator, ResourceClaim, ResourceUsage, ResourceType
)
from micro_macro_analyzer import (
    MicroMacroAnalyzer, UserResourceMetrics
)
from performance_analyzer import (
    PerformanceAnalyzer, LatencyMetrics, ThroughputMetrics, 
    ResourceUtilization, LoadTestResult
)
from benchmarking import BenchmarkingTool, BenchmarkCategory
from reporting import ComprehensiveReportGenerator, ReportFormat


def load_json_file(filepath: str) -> Union[Dict[str, Any], list]:
    """Load data from JSON file and return as dict or list."""
    try:
        with open(filepath, 'r') as f:
            return json.load(f)
    except Exception as e:
        print(f"Error loading {filepath}: {e}", file=sys.stderr)
        sys.exit(1)


def save_output(filepath: str, content: str) -> None:
    """Save output to file."""
    try:
        with open(filepath, 'w') as f:
            f.write(content)
        print(f"Output saved to: {filepath}")
    except Exception as e:
        print(f"Error saving to {filepath}: {e}", file=sys.stderr)
        sys.exit(1)


def validate_resources(args):
    """Validate storage and compute resources."""
    print("Running resource validation...")
    
    # Load data
    data = load_json_file(args.input)
    
    validator = ResourceValidator(tolerance_percent=args.tolerance)
    
    # Process claims and usage data
    claims = []
    usages = []
    
    for item in data.get('resources', []):
        # Create claim
        claim = ResourceClaim(
            resource_type=ResourceType(item['type']),
            claimed_amount=item['claimed'],
            unit=item['unit'],
            billing_period_start=item['period_start'],
            billing_period_end=item['period_end'],
            cost=item['cost']
        )
        claims.append(claim)
        
        # Create usage
        usage = ResourceUsage(
            resource_type=ResourceType(item['type']),
            actual_amount=item['actual'],
            unit=item['unit'],
            measurement_period_start=item['period_start'],
            measurement_period_end=item['period_end'],
            samples_count=item.get('samples', 1)
        )
        usages.append(usage)
    
    # Perform batch validation
    results = validator.batch_validate(claims, usages)
    
    # Generate report
    if args.format == 'json':
        output = json.dumps(results, indent=2)
    else:
        output = validator.generate_validation_report(output_format='text')
    
    # Save or print
    if args.output:
        save_output(args.output, output)
    else:
        print(output)
    
    # Exit with appropriate code
    if results['overall_status'] == 'critical':
        sys.exit(2)
    elif results['overall_status'] in ['discrepancy', 'warning']:
        sys.exit(1)
    else:
        sys.exit(0)


def analyze_scaling(args):
    """Analyze micro-to-macro scaling."""
    print("Running scaling analysis...")
    
    # Load user samples
    data = load_json_file(args.input)
    
    analyzer = MicroMacroAnalyzer()
    
    # Add user samples
    for user_data in data.get('users', []):
        metrics = UserResourceMetrics(
            user_id=user_data['user_id'],
            storage_gb=user_data.get('storage_gb', 0),
            compute_hours=user_data.get('compute_hours', 0),
            bandwidth_gb=user_data.get('bandwidth_gb', 0),
            api_calls=user_data.get('api_calls', 0),
            ai_inference_tokens=user_data.get('ai_tokens', 0),
            cost_per_month=user_data.get('cost', 0),
            tier=user_data.get('tier', 'free'),
            active_days=user_data.get('active_days', 30)
        )
        analyzer.add_user_sample(metrics)
    
    # Generate projections
    if args.target_users:
        projection = analyzer.project_to_scale(args.target_users)
        result = {
            'projection': {
                'user_count': projection.user_count,
                'monthly_cost': projection.monthly_cost,
                'annual_cost': projection.annual_cost,
                'storage_tb': projection.total_storage_tb,
                'compute_hours': projection.total_compute_hours,
                'infrastructure': projection.infrastructure_requirements,
                'recommendations': projection.recommendations
            }
        }
    else:
        # Multiple scale projections
        report = analyzer.generate_scaling_report()
        result = report
    
    # Output
    output = json.dumps(result, indent=2)
    
    if args.output:
        save_output(args.output, output)
    else:
        print(output)


def analyze_performance(args):
    """Analyze server performance."""
    print("Running performance analysis...")
    
    # Load performance data
    data = load_json_file(args.input)
    
    analyzer = PerformanceAnalyzer()
    
    # Process latency data
    if 'latency' in data:
        for lat_data in data['latency']:
            metrics = LatencyMetrics(
                p50_ms=lat_data['p50'],
                p90_ms=lat_data['p90'],
                p95_ms=lat_data['p95'],
                p99_ms=lat_data['p99'],
                min_ms=lat_data['min'],
                max_ms=lat_data['max'],
                avg_ms=lat_data['avg'],
                sample_count=lat_data['samples'],
                measurement_period_start=lat_data['period_start'],
                measurement_period_end=lat_data['period_end']
            )
            analyzer.latency_history.append(metrics)
    
    # Process throughput data
    if 'throughput' in data:
        for tp_data in data['throughput']:
            metrics = ThroughputMetrics(
                requests_per_second=tp_data['rps'],
                successful_requests=tp_data['successful'],
                failed_requests=tp_data['failed'],
                total_requests=tp_data['total'],
                success_rate=tp_data['successful'] / tp_data['total'] if tp_data['total'] > 0 else 0,
                error_rate=tp_data['failed'] / tp_data['total'] if tp_data['total'] > 0 else 0,
                measurement_period_start=tp_data['period_start'],
                measurement_period_end=tp_data['period_end']
            )
            analyzer.throughput_history.append(metrics)
    
    # Generate report
    report = analyzer.generate_performance_report()
    output = json.dumps(report, indent=2)
    
    if args.output:
        save_output(args.output, output)
    else:
        print(output)


def run_benchmarking(args):
    """Run benchmarking comparisons."""
    print("Running benchmarking analysis...")
    
    # Load metrics to compare
    data = load_json_file(args.input)
    
    tool = BenchmarkingTool()
    
    # Perform comparisons
    metrics = data.get('metrics', {})
    standard_mappings = data.get('standards', {})
    
    results = tool.batch_compare(metrics, standard_mappings)
    
    # Output
    output = json.dumps(results, indent=2)
    
    if args.output:
        save_output(args.output, output)
    else:
        print(output)


def generate_comprehensive_report(args):
    """Generate comprehensive analysis report."""
    print("Generating comprehensive report...")
    
    # Load data
    data = load_json_file(args.input)
    
    report_gen = ComprehensiveReportGenerator()
    
    # Add validation section if data exists
    if 'validation' in data:
        validator = ResourceValidator()
        # Process validation data (simplified)
        for item in data['validation']:
            claim = ResourceClaim(
                resource_type=ResourceType(item['type']),
                claimed_amount=item['claimed'],
                unit=item['unit'],
                billing_period_start=item['period_start'],
                billing_period_end=item['period_end'],
                cost=item['cost']
            )
            usage = ResourceUsage(
                resource_type=ResourceType(item['type']),
                actual_amount=item['actual'],
                unit=item['unit'],
                measurement_period_start=item['period_start'],
                measurement_period_end=item['period_end'],
                samples_count=item.get('samples', 1)
            )
            if item['type'] == 'storage':
                validator.validate_storage(claim, usage)
            elif item['type'] == 'compute':
                validator.validate_compute(claim, usage)
        
        report_gen.add_validation_section(validator)
    
    # Add scaling section if data exists
    if 'users' in data:
        analyzer = MicroMacroAnalyzer()
        for user_data in data['users']:
            metrics = UserResourceMetrics(
                user_id=user_data['user_id'],
                storage_gb=user_data.get('storage_gb', 0),
                compute_hours=user_data.get('compute_hours', 0),
                bandwidth_gb=user_data.get('bandwidth_gb', 0),
                api_calls=user_data.get('api_calls', 0),
                ai_inference_tokens=user_data.get('ai_tokens', 0),
                cost_per_month=user_data.get('cost', 0),
                tier=user_data.get('tier', 'free'),
                active_days=user_data.get('active_days', 30)
            )
            analyzer.add_user_sample(metrics)
        analyzer.project_multiple_scales()
        report_gen.add_scaling_section(analyzer)
    
    # Generate report in specified format
    format_map = {
        'json': ReportFormat.JSON,
        'text': ReportFormat.TEXT,
        'html': ReportFormat.HTML,
        'markdown': ReportFormat.MARKDOWN
    }
    
    output = report_gen.generate_report(
        format=format_map.get(args.format, ReportFormat.JSON),
        title=args.title
    )
    
    if args.output:
        save_output(args.output, output)
    else:
        print(output)


def list_standards(args):
    """List available benchmark standards."""
    tool = BenchmarkingTool()
    
    category_filter = None
    if args.category:
        try:
            category_filter = BenchmarkCategory(args.category)
        except ValueError:
            print(f"Invalid category: {args.category}", file=sys.stderr)
            sys.exit(1)
    
    standards = tool.list_available_standards(category_filter)
    
    if args.format == 'json':
        print(json.dumps(standards, indent=2))
    else:
        print("\nAvailable Benchmark Standards:")
        print("=" * 80)
        for std in standards:
            print(f"\nKey: {std['key']}")
            print(f"Name: {std['name']}")
            print(f"Category: {std['category']}")
            print(f"Value: {std['value']} {std['unit']}")
            print(f"Source: {std['source']}")
            print(f"Description: {std['description']}")


def main():
    """Main CLI entry point."""
    parser = argparse.ArgumentParser(
        description='Resource Validation and Analysis System',
        formatter_class=argparse.RawDescriptionHelpFormatter
    )
    
    subparsers = parser.add_subparsers(dest='command', help='Available commands')
    
    # Validate command
    validate_parser = subparsers.add_parser('validate', help='Validate resource claims')
    validate_parser.add_argument('-i', '--input', required=True, help='Input JSON file')
    validate_parser.add_argument('-o', '--output', help='Output file (default: stdout)')
    validate_parser.add_argument('-f', '--format', choices=['json', 'text'], default='json', help='Output format')
    validate_parser.add_argument('-t', '--tolerance', type=float, default=5.0, help='Tolerance percentage (default: 5.0)')
    validate_parser.set_defaults(func=validate_resources)
    
    # Scale command
    scale_parser = subparsers.add_parser('scale', help='Analyze scaling (micro to macro)')
    scale_parser.add_argument('-i', '--input', required=True, help='Input JSON file with user samples')
    scale_parser.add_argument('-o', '--output', help='Output file (default: stdout)')
    scale_parser.add_argument('-u', '--target-users', type=int, help='Target user count for projection')
    scale_parser.set_defaults(func=analyze_scaling)
    
    # Performance command
    perf_parser = subparsers.add_parser('performance', help='Analyze server performance')
    perf_parser.add_argument('-i', '--input', required=True, help='Input JSON file with performance data')
    perf_parser.add_argument('-o', '--output', help='Output file (default: stdout)')
    perf_parser.set_defaults(func=analyze_performance)
    
    # Benchmark command
    bench_parser = subparsers.add_parser('benchmark', help='Compare against industry standards')
    bench_parser.add_argument('-i', '--input', required=True, help='Input JSON file with metrics')
    bench_parser.add_argument('-o', '--output', help='Output file (default: stdout)')
    bench_parser.set_defaults(func=run_benchmarking)
    
    # Report command
    report_parser = subparsers.add_parser('report', help='Generate comprehensive report')
    report_parser.add_argument('-i', '--input', required=True, help='Input JSON file with all data')
    report_parser.add_argument('-o', '--output', help='Output file (default: stdout)')
    report_parser.add_argument('-f', '--format', choices=['json', 'text', 'html', 'markdown'], default='json', help='Output format')
    report_parser.add_argument('-t', '--title', default='Resource and Performance Analysis Report', help='Report title')
    report_parser.set_defaults(func=generate_comprehensive_report)
    
    # List standards command
    list_parser = subparsers.add_parser('list-standards', help='List available benchmark standards')
    list_parser.add_argument('-c', '--category', help='Filter by category')
    list_parser.add_argument('-f', '--format', choices=['json', 'text'], default='text', help='Output format')
    list_parser.set_defaults(func=list_standards)
    
    args = parser.parse_args()
    
    if not args.command:
        parser.print_help()
        sys.exit(1)
    
    # Execute command
    args.func(args)


if __name__ == '__main__':
    main()
