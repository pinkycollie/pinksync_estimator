# Examples Directory

This directory contains example data files for testing and demonstrating the Resource Validation and Analysis System.

## Example Files

### 1. example_validation.json
Sample data for resource validation.

**Usage:**
```bash
# Validate resources and generate text report
python3 ../analysis_cli.py validate -i example_validation.json -f text

# Validate with JSON output
python3 ../analysis_cli.py validate -i example_validation.json -o validation_report.json
```

### 2. example_scaling.json
Sample user data for scaling analysis (micro to macro).

**Usage:**
```bash
# Project to 1 million users
python3 ../analysis_cli.py scale -i example_scaling.json -u 1000000

# Generate projections across all standard scales
python3 ../analysis_cli.py scale -i example_scaling.json -o scaling_report.json
```

### 3. example_performance.json
Sample performance metrics (latency and throughput).

**Usage:**
```bash
# Analyze performance data
python3 ../analysis_cli.py performance -i example_performance.json -o perf_report.json
```

### 4. example_benchmarking.json
Sample metrics for benchmarking against industry standards.

**Usage:**
```bash
# Compare metrics against standards
python3 ../analysis_cli.py benchmark -i example_benchmarking.json -o benchmark_report.json
```

## Quick Start

Run all examples:

```bash
cd examples

# 1. Resource Validation
echo "=== Resource Validation ==="
python3 ../analysis_cli.py validate -i example_validation.json -f text | head -50

# 2. Scaling Analysis
echo -e "\n=== Scaling to 1M Users ==="
python3 ../analysis_cli.py scale -i example_scaling.json -u 1000000 | python3 -c "import sys, json; d=json.load(sys.stdin); print(f\"Monthly Cost: \${d['projection']['monthly_cost']:,.2f}\"); print(f\"Storage: {d['projection']['storage_tb']:.2f} TB\"); print(f\"Compute Instances: {d['projection']['infrastructure']['compute_instances']}\")"

# 3. Performance Analysis
echo -e "\n=== Performance Analysis ==="
python3 ../analysis_cli.py performance -i example_performance.json | python3 -c "import sys, json; d=json.load(sys.stdin); print(f\"Latency P95: {d['latency']['metrics']['p95_ms']:.2f}ms\"); print(f\"Throughput: {d['throughput']['metrics']['requests_per_second']:.2f} req/s\")"

# 4. Benchmarking
echo -e "\n=== Benchmarking ==="
python3 ../analysis_cli.py benchmark -i example_benchmarking.json | python3 -c "import sys, json; d=json.load(sys.stdin); print(f\"Metrics Compared: {d['metrics_compared']}\"); print(f\"Status: {d['overall_status']}\")"

# 5. List Available Standards
echo -e "\n=== Available Standards ==="
python3 ../analysis_cli.py list-standards --category storage
```

## Customizing Examples

You can modify these JSON files to test with your own data. Each file follows a specific schema:

### Validation Schema
```json
{
  "resources": [
    {
      "type": "storage" | "compute",
      "claimed": <number>,
      "actual": <number>,
      "unit": "GB" | "CPU-hours",
      "period_start": "YYYY-MM-DD",
      "period_end": "YYYY-MM-DD",
      "cost": <number>,
      "samples": <integer>
    }
  ]
}
```

### Scaling Schema
```json
{
  "users": [
    {
      "user_id": <string>,
      "storage_gb": <number>,
      "compute_hours": <number>,
      "bandwidth_gb": <number>,
      "api_calls": <integer>,
      "ai_tokens": <integer>,
      "cost": <number>,
      "tier": "free" | "basic" | "professional" | "enterprise",
      "active_days": <integer>
    }
  ]
}
```

### Performance Schema
```json
{
  "latency": [
    {
      "p50": <number>,
      "p90": <number>,
      "p95": <number>,
      "p99": <number>,
      "min": <number>,
      "max": <number>,
      "avg": <number>,
      "samples": <integer>,
      "period_start": "ISO8601 timestamp",
      "period_end": "ISO8601 timestamp"
    }
  ],
  "throughput": [
    {
      "rps": <number>,
      "successful": <integer>,
      "failed": <integer>,
      "total": <integer>,
      "period_start": "ISO8601 timestamp",
      "period_end": "ISO8601 timestamp"
    }
  ]
}
```

### Benchmarking Schema
```json
{
  "metrics": {
    "<metric_name>": <number>
  },
  "standards": {
    "<metric_name>": "<standard_key>"
  }
}
```

## Expected Output

Each command produces detailed output with:
- Analysis results
- Status indicators (valid, warning, critical)
- Recommendations
- Cost impact calculations
- Infrastructure requirements (for scaling)

See the main [RESOURCE_ANALYSIS_GUIDE.md](../RESOURCE_ANALYSIS_GUIDE.md) for complete documentation.
