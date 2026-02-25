# Resource Validation and Analysis System

## Overview

This system provides comprehensive tools for validating and analyzing storage and compute resource usage, with capabilities for micro-to-macro scaling analysis, server-side performance monitoring, and industry benchmarking.

## Features

### 1. Resource Validation
- **Storage Validation**: Track and validate storage usage against billing claims
- **Compute Validation**: Monitor CPU/compute hours and compare to billing
- **Discrepancy Detection**: Identify over-billing and under-billing automatically
- **Cost Impact Analysis**: Calculate financial impact of resource discrepancies

### 2. Micro-to-Macro Scaling Analysis
- **Per-User Tracking**: Monitor resource consumption at individual user level
- **Scale Projections**: Project resource needs from 1 to 10 million users
- **Efficiency Modeling**: Account for economies of scale in cost projections
- **Infrastructure Planning**: Estimate server, storage, and database requirements

### 3. Server Performance Analysis
- **Latency Monitoring**: Track P50, P90, P95, P99 latency metrics
- **Throughput Analysis**: Monitor requests per second and error rates
- **Resource Utilization**: Track CPU, memory, disk, and network usage
- **Scaling Efficiency**: Evaluate how well systems scale under load

### 4. Benchmarking
- **Industry Standards**: Compare against AWS, GCP, and best practice benchmarks
- **Custom Baselines**: Create and track custom performance baselines
- **Multi-Metric Comparison**: Batch compare multiple metrics simultaneously
- **Variance Analysis**: Identify performance gaps and optimization opportunities

### 5. Comprehensive Reporting
- **Multi-Format Output**: Generate reports in JSON, Text, HTML, and Markdown
- **Anomaly Detection**: Automatically identify critical issues and discrepancies
- **Corrective Recommendations**: Provide actionable optimization suggestions
- **Detailed Logging**: Full audit trail with timestamps and metric details

## Installation

### Prerequisites
- Python 3.11 or higher
- Dependencies listed in `pyproject.toml`

### Setup

```bash
# Install dependencies
pip install -e .

# Or using the existing setup
cd /path/to/pinksync_estimator
pip install -r requirements.txt  # if available
```

## Usage

### Command Line Interface

The system provides a comprehensive CLI tool for all operations:

```bash
# Make the CLI executable
chmod +x analysis_cli.py

# View help
./analysis_cli.py --help

# List available benchmark standards
./analysis_cli.py list-standards

# List standards by category
./analysis_cli.py list-standards --category storage
```

### 1. Resource Validation

Validate storage and compute resources against billing claims:

```bash
# Validate resources from input file
./analysis_cli.py validate -i resources.json -o validation_report.json

# Generate text format report
./analysis_cli.py validate -i resources.json -f text -o report.txt

# Set custom tolerance (default: 5%)
./analysis_cli.py validate -i resources.json -t 10.0
```

**Input Format** (`resources.json`):
```json
{
  "resources": [
    {
      "type": "storage",
      "claimed": 1000.0,
      "actual": 950.0,
      "unit": "GB",
      "period_start": "2024-01-01",
      "period_end": "2024-01-31",
      "cost": 23.00,
      "samples": 744
    },
    {
      "type": "compute",
      "claimed": 500.0,
      "actual": 525.0,
      "unit": "CPU-hours",
      "period_start": "2024-01-01",
      "period_end": "2024-01-31",
      "cost": 48.00,
      "samples": 500
    }
  ]
}
```

### 2. Scaling Analysis

Analyze resource usage from individual users to millions:

```bash
# Analyze scaling across all standard levels
./analysis_cli.py scale -i users.json -o scaling_report.json

# Project to specific user count
./analysis_cli.py scale -i users.json -u 1000000 -o million_users.json
```

**Input Format** (`users.json`):
```json
{
  "users": [
    {
      "user_id": "user_001",
      "storage_gb": 5.2,
      "compute_hours": 0.5,
      "bandwidth_gb": 10.0,
      "api_calls": 1000,
      "ai_tokens": 50000,
      "cost": 1.50,
      "tier": "basic",
      "active_days": 28
    },
    {
      "user_id": "user_002",
      "storage_gb": 15.8,
      "compute_hours": 2.3,
      "bandwidth_gb": 45.0,
      "api_calls": 5000,
      "ai_tokens": 250000,
      "cost": 15.00,
      "tier": "professional",
      "active_days": 30
    }
  ]
}
```

### 3. Performance Analysis

Analyze server-side performance metrics:

```bash
# Analyze performance data
./analysis_cli.py performance -i performance.json -o perf_report.json
```

**Input Format** (`performance.json`):
```json
{
  "latency": [
    {
      "p50": 45.2,
      "p90": 120.5,
      "p95": 180.3,
      "p99": 350.8,
      "min": 12.1,
      "max": 890.2,
      "avg": 85.6,
      "samples": 10000,
      "period_start": "2024-01-01T00:00:00",
      "period_end": "2024-01-01T23:59:59"
    }
  ],
  "throughput": [
    {
      "rps": 450.5,
      "successful": 27000,
      "failed": 30,
      "total": 27030,
      "period_start": "2024-01-01T00:00:00",
      "period_end": "2024-01-01T23:59:59"
    }
  ]
}
```

### 4. Benchmarking

Compare metrics against industry standards:

```bash
# Run benchmark comparisons
./analysis_cli.py benchmark -i metrics.json -o benchmark_report.json
```

**Input Format** (`metrics.json`):
```json
{
  "metrics": {
    "storage_cost_per_gb": 0.025,
    "compute_cost_per_hour": 0.055,
    "p95_latency_ms": 250,
    "error_rate_percent": 0.5
  },
  "standards": {
    "storage_cost_per_gb": "storage_cost_aws_s3_standard",
    "compute_cost_per_hour": "compute_cost_aws_t3_medium",
    "p95_latency_ms": "latency_p95_good",
    "error_rate_percent": "error_rate_acceptable"
  }
}
```

### 5. Comprehensive Report

Generate a complete analysis report:

```bash
# Generate JSON report
./analysis_cli.py report -i complete_data.json -o full_report.json

# Generate HTML report
./analysis_cli.py report -i complete_data.json -f html -o report.html

# Generate Markdown report
./analysis_cli.py report -i complete_data.json -f markdown -o report.md
```

## Python API Usage

All modules can be used programmatically in Python:

### Resource Validation Example

```python
from resource_validator import (
    ResourceValidator, ResourceClaim, ResourceUsage, ResourceType
)

# Create validator
validator = ResourceValidator(tolerance_percent=5.0)

# Define claim and usage
claim = ResourceClaim(
    resource_type=ResourceType.STORAGE,
    claimed_amount=1000.0,
    unit="GB",
    billing_period_start="2024-01-01",
    billing_period_end="2024-01-31",
    cost=23.00
)

usage = ResourceUsage(
    resource_type=ResourceType.STORAGE,
    actual_amount=950.0,
    unit="GB",
    measurement_period_start="2024-01-01",
    measurement_period_end="2024-01-31",
    samples_count=744
)

# Validate
result = validator.validate_storage(claim, usage)

print(f"Status: {result.status}")
print(f"Variance: {result.variance_percent:.2f}%")
print(f"Cost Impact: ${result.discrepancy_cost:.2f}")
for rec in result.recommendations:
    print(f"  - {rec}")
```

### Scaling Analysis Example

```python
from micro_macro_analyzer import MicroMacroAnalyzer, UserResourceMetrics

# Create analyzer
analyzer = MicroMacroAnalyzer()

# Add user samples
analyzer.add_user_sample(UserResourceMetrics(
    user_id="user_001",
    storage_gb=5.2,
    compute_hours=0.5,
    bandwidth_gb=10.0,
    api_calls=1000,
    ai_inference_tokens=50000,
    cost_per_month=1.50,
    tier="basic",
    active_days=28
))

# Project to 1 million users
projection = analyzer.project_to_scale(1_000_000)

print(f"Monthly Cost: ${projection.monthly_cost:,.2f}")
print(f"Annual Cost: ${projection.annual_cost:,.2f}")
print(f"Storage Needed: {projection.total_storage_tb:.2f} TB")
print(f"Compute Instances: {projection.infrastructure_requirements['compute_instances']}")
```

### Performance Analysis Example

```python
from performance_analyzer import PerformanceAnalyzer, LatencyMetrics

# Create analyzer
analyzer = PerformanceAnalyzer()

# Analyze latency
latency = LatencyMetrics(
    p50_ms=45.2,
    p90_ms=120.5,
    p95_ms=180.3,
    p99_ms=350.8,
    min_ms=12.1,
    max_ms=890.2,
    avg_ms=85.6,
    sample_count=10000,
    measurement_period_start="2024-01-01T00:00:00",
    measurement_period_end="2024-01-01T23:59:59"
)

result = analyzer.analyze_latency(latency)

print(f"Status: {result['status']}")
print(f"Description: {result['description']}")
for rec in result['recommendations']:
    print(f"  - {rec}")
```

### Benchmarking Example

```python
from benchmarking import BenchmarkingTool

# Create tool
tool = BenchmarkingTool()

# Compare against industry standard
comparison = tool.compare_against_standard(
    metric_name="Storage Cost",
    actual_value=0.025,
    standard_key="storage_cost_aws_s3_standard"
)

print(f"Result: {comparison.result.value}")
print(f"Variance: {comparison.variance_percent:+.2f}%")
for rec in comparison.recommendations:
    print(f"  - {rec}")
```

### Comprehensive Reporting Example

```python
from reporting import ComprehensiveReportGenerator, ReportFormat

# Create report generator
report_gen = ComprehensiveReportGenerator()

# Add sections (validator, analyzer, etc.)
report_gen.add_validation_section(validator)
report_gen.add_scaling_section(analyzer)
report_gen.add_performance_section(perf_analyzer)
report_gen.add_benchmarking_section(bench_tool)

# Generate report
html_report = report_gen.generate_report(
    format=ReportFormat.HTML,
    title="Q1 2024 Resource Analysis"
)

# Save to file
with open('report.html', 'w') as f:
    f.write(html_report)
```

## Module Reference

### resource_validator.py
- `ResourceValidator`: Main validation class
- `ResourceClaim`: Represents billed resource claims
- `ResourceUsage`: Represents actual measured usage
- `ValidationResult`: Results of validation with recommendations

### micro_macro_analyzer.py
- `MicroMacroAnalyzer`: Scaling analysis engine
- `UserResourceMetrics`: Per-user resource metrics
- `ScaleProjection`: Projection results at specific scale

### performance_analyzer.py
- `PerformanceAnalyzer`: Performance monitoring and analysis
- `LatencyMetrics`: Latency measurements (P50-P99)
- `ThroughputMetrics`: Throughput and error rate metrics
- `ResourceUtilization`: CPU, memory, disk, network usage

### benchmarking.py
- `BenchmarkingTool`: Industry standard comparisons
- `Benchmark`: Benchmark definition
- `BenchmarkComparison`: Comparison results

### reporting.py
- `ComprehensiveReportGenerator`: Unified report generation
- `ReportSection`: Individual report sections
- `Anomaly`: Detected anomalies and issues

## Best Practices

### Data Collection
1. **Sample Size**: Collect at least 100 samples for statistical significance
2. **Time Periods**: Use consistent measurement periods (e.g., monthly)
3. **Granularity**: Balance detail vs. data volume (hourly or daily aggregates)

### Validation
1. **Tolerance**: Set tolerance based on measurement accuracy (typically 5-10%)
2. **Regular Audits**: Run validation weekly or monthly
3. **Action Thresholds**: Define when discrepancies require immediate action

### Scaling Analysis
1. **Representative Samples**: Ensure user samples represent actual usage patterns
2. **Multiple Tiers**: Include users from all subscription tiers
3. **Seasonal Variation**: Account for usage fluctuations

### Performance Monitoring
1. **Continuous Tracking**: Monitor latency and throughput continuously
2. **Alerting**: Set up alerts for performance degradation
3. **Load Testing**: Regular load tests to verify scaling behavior

### Benchmarking
1. **Relevant Standards**: Choose benchmarks appropriate for your use case
2. **Custom Baselines**: Create baselines from your own historical data
3. **Regular Updates**: Review and update benchmarks quarterly

## Troubleshooting

### Common Issues

**Issue**: Validation shows high variance but data looks correct
- **Solution**: Check unit consistency (GB vs TB, CPU-hours vs CPU-minutes)
- **Solution**: Verify measurement periods align exactly

**Issue**: Scaling projections seem unrealistic
- **Solution**: Ensure user samples are representative
- **Solution**: Check for outliers skewing averages
- **Solution**: Verify efficiency multipliers are appropriate

**Issue**: Performance analysis shows unexpected results
- **Solution**: Confirm latency percentiles are calculated correctly
- **Solution**: Check for timezone issues in timestamps
- **Solution**: Verify sample counts are sufficient

**Issue**: Benchmark comparisons all fail
- **Solution**: Verify standard keys match available standards
- **Solution**: Check metric units match benchmark units
- **Solution**: Use `list-standards` to see available benchmarks

## Examples

See the `/examples` directory for complete working examples:
- `example_validation.json`: Sample resource validation data
- `example_scaling.json`: Sample user metrics for scaling
- `example_performance.json`: Sample performance data
- `example_benchmarking.json`: Sample benchmarking data
- `example_comprehensive.json`: Complete dataset for full reporting

## Support and Contributing

For issues, questions, or contributions, please refer to the main project documentation.

## License

This module is part of the PinkSync Estimator project and follows the same MIT license.
