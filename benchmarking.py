"""
Benchmarking Module

This module provides tools for comparing storage and compute claims against
industry standards and custom baselines.
"""

import json
from dataclasses import dataclass, field
from datetime import datetime
from typing import Dict, List, Any, Optional
from enum import Enum


class BenchmarkCategory(Enum):
    """Categories of benchmarks."""
    STORAGE = "storage"
    COMPUTE = "compute"
    LATENCY = "latency"
    THROUGHPUT = "throughput"
    COST = "cost"
    EFFICIENCY = "efficiency"


class ComparisonResult(Enum):
    """Result of benchmark comparison."""
    EXCEEDS_STANDARD = "exceeds_standard"
    MEETS_STANDARD = "meets_standard"
    BELOW_STANDARD = "below_standard"
    SIGNIFICANTLY_BELOW = "significantly_below"


@dataclass
class Benchmark:
    """Represents a benchmark standard."""
    name: str
    category: BenchmarkCategory
    value: float
    unit: str
    source: str  # e.g., "AWS Best Practices", "Custom Baseline"
    description: str
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class BenchmarkComparison:
    """Result of comparing a metric against a benchmark."""
    benchmark_name: str
    category: BenchmarkCategory
    actual_value: float
    benchmark_value: float
    unit: str
    variance: float
    variance_percent: float
    result: ComparisonResult
    recommendations: List[str]
    timestamp: str


class BenchmarkingTool:
    """
    Tool for comparing resource metrics against industry standards and baselines.
    
    This class provides:
    - Industry-standard benchmarks for various metrics
    - Custom baseline creation and management
    - Comparative analysis with recommendations
    - Benchmarking reports
    """
    
    # Industry standard benchmarks
    INDUSTRY_STANDARDS = {
        # Storage benchmarks (cost per GB/month)
        'storage_cost_aws_s3_standard': Benchmark(
            name='AWS S3 Standard Storage',
            category=BenchmarkCategory.STORAGE,
            value=0.023,
            unit='$/GB/month',
            source='AWS Pricing 2024',
            description='Standard S3 storage pricing'
        ),
        'storage_cost_aws_s3_ia': Benchmark(
            name='AWS S3 Infrequent Access',
            category=BenchmarkCategory.STORAGE,
            value=0.0125,
            unit='$/GB/month',
            source='AWS Pricing 2024',
            description='S3 Infrequent Access storage pricing'
        ),
        'storage_cost_gcp_standard': Benchmark(
            name='GCP Cloud Storage Standard',
            category=BenchmarkCategory.STORAGE,
            value=0.020,
            unit='$/GB/month',
            source='GCP Pricing 2024',
            description='GCP standard storage pricing'
        ),
        
        # Compute benchmarks (cost per CPU-hour)
        'compute_cost_aws_t3_medium': Benchmark(
            name='AWS t3.medium',
            category=BenchmarkCategory.COMPUTE,
            value=0.0416,
            unit='$/CPU-hour',
            source='AWS Pricing 2024',
            description='AWS t3.medium on-demand pricing (2 vCPU)'
        ),
        'compute_cost_aws_c5_large': Benchmark(
            name='AWS c5.large',
            category=BenchmarkCategory.COMPUTE,
            value=0.085,
            unit='$/CPU-hour',
            source='AWS Pricing 2024',
            description='AWS c5.large on-demand pricing (2 vCPU)'
        ),
        'compute_cost_gcp_n1_standard_2': Benchmark(
            name='GCP n1-standard-2',
            category=BenchmarkCategory.COMPUTE,
            value=0.095,
            unit='$/CPU-hour',
            source='GCP Pricing 2024',
            description='GCP n1-standard-2 on-demand pricing (2 vCPU)'
        ),
        
        # Latency benchmarks (milliseconds)
        'latency_p95_excellent': Benchmark(
            name='Excellent P95 Latency',
            category=BenchmarkCategory.LATENCY,
            value=100,
            unit='ms',
            source='Industry Best Practices',
            description='Excellent P95 response time for web services'
        ),
        'latency_p95_good': Benchmark(
            name='Good P95 Latency',
            category=BenchmarkCategory.LATENCY,
            value=300,
            unit='ms',
            source='Industry Best Practices',
            description='Good P95 response time for web services'
        ),
        'latency_p99_excellent': Benchmark(
            name='Excellent P99 Latency',
            category=BenchmarkCategory.LATENCY,
            value=200,
            unit='ms',
            source='Industry Best Practices',
            description='Excellent P99 response time for web services'
        ),
        
        # Throughput benchmarks (requests per second per CPU)
        'throughput_per_cpu_web': Benchmark(
            name='Web Service Throughput',
            category=BenchmarkCategory.THROUGHPUT,
            value=100,
            unit='req/s/CPU',
            source='Industry Best Practices',
            description='Typical web service throughput per CPU'
        ),
        'throughput_per_cpu_api': Benchmark(
            name='API Service Throughput',
            category=BenchmarkCategory.THROUGHPUT,
            value=500,
            unit='req/s/CPU',
            source='Industry Best Practices',
            description='Typical API service throughput per CPU'
        ),
        
        # Efficiency benchmarks
        'cpu_utilization_target': Benchmark(
            name='Target CPU Utilization',
            category=BenchmarkCategory.EFFICIENCY,
            value=70,
            unit='%',
            source='Industry Best Practices',
            description='Target CPU utilization for efficient resource use'
        ),
        'error_rate_acceptable': Benchmark(
            name='Acceptable Error Rate',
            category=BenchmarkCategory.EFFICIENCY,
            value=1.0,
            unit='%',
            source='Industry Best Practices',
            description='Acceptable error rate for production services'
        ),
    }
    
    def __init__(self):
        """Initialize the benchmarking tool."""
        self.custom_baselines: Dict[str, Benchmark] = {}
        self.comparison_history: List[BenchmarkComparison] = []
    
    def add_custom_baseline(
        self,
        name: str,
        category: BenchmarkCategory,
        value: float,
        unit: str,
        description: str = "",
        metadata: Optional[Dict[str, Any]] = None
    ) -> Benchmark:
        """
        Add a custom baseline for comparison.
        
        :param name: Name of the baseline.
        :param category: Category of the benchmark.
        :param value: Baseline value.
        :param unit: Unit of measurement.
        :param description: Description of the baseline.
        :param metadata: Additional metadata.
        :returns: Created Benchmark object.
        """
        baseline = Benchmark(
            name=name,
            category=category,
            value=value,
            unit=unit,
            source='Custom Baseline',
            description=description,
            metadata=metadata or {}
        )
        
        self.custom_baselines[name] = baseline
        return baseline
    
    def compare_against_standard(
        self,
        metric_name: str,
        actual_value: float,
        standard_key: str
    ) -> BenchmarkComparison:
        """
        Compare a metric against an industry standard.
        
        :param metric_name: Name of the metric being compared.
        :param actual_value: Actual measured value.
        :param standard_key: Key of the industry standard benchmark.
        :returns: BenchmarkComparison result.
        """
        if standard_key not in self.INDUSTRY_STANDARDS:
            raise ValueError(f"Unknown industry standard: {standard_key}")
        
        benchmark = self.INDUSTRY_STANDARDS[standard_key]
        return self._compare_values(metric_name, actual_value, benchmark)
    
    def compare_against_baseline(
        self,
        metric_name: str,
        actual_value: float,
        baseline_name: str
    ) -> BenchmarkComparison:
        """
        Compare a metric against a custom baseline.
        
        :param metric_name: Name of the metric being compared.
        :param actual_value: Actual measured value.
        :param baseline_name: Name of the custom baseline.
        :returns: BenchmarkComparison result.
        """
        if baseline_name not in self.custom_baselines:
            raise ValueError(f"Unknown custom baseline: {baseline_name}")
        
        benchmark = self.custom_baselines[baseline_name]
        return self._compare_values(metric_name, actual_value, benchmark)
    
    def _compare_values(
        self,
        metric_name: str,
        actual_value: float,
        benchmark: Benchmark
    ) -> BenchmarkComparison:
        """
        Compare actual value against a benchmark.
        
        :param metric_name: Name of the metric.
        :param actual_value: Actual value.
        :param benchmark: Benchmark to compare against.
        :returns: BenchmarkComparison result.
        """
        variance = actual_value - benchmark.value
        variance_percent = (variance / benchmark.value * 100) if benchmark.value != 0 else 0
        
        # Determine result based on category and variance
        result = self._determine_comparison_result(
            benchmark.category, variance_percent
        )
        
        # Generate recommendations
        recommendations = self._generate_benchmark_recommendations(
            metric_name, benchmark, actual_value, variance_percent, result
        )
        
        comparison = BenchmarkComparison(
            benchmark_name=benchmark.name,
            category=benchmark.category,
            actual_value=actual_value,
            benchmark_value=benchmark.value,
            unit=benchmark.unit,
            variance=variance,
            variance_percent=variance_percent,
            result=result,
            recommendations=recommendations,
            timestamp=datetime.now().isoformat()
        )
        
        self.comparison_history.append(comparison)
        return comparison
    
    def _determine_comparison_result(
        self,
        category: BenchmarkCategory,
        variance_percent: float
    ) -> ComparisonResult:
        """
        Determine comparison result based on category and variance.
        
        For cost metrics: lower is better
        For performance metrics: depends on the metric
        """
        if category == BenchmarkCategory.COST:
            # For cost, lower is better
            if variance_percent < -20:
                return ComparisonResult.EXCEEDS_STANDARD
            elif variance_percent < 0:
                return ComparisonResult.MEETS_STANDARD
            elif variance_percent < 20:
                return ComparisonResult.BELOW_STANDARD
            else:
                return ComparisonResult.SIGNIFICANTLY_BELOW
        
        elif category in [BenchmarkCategory.LATENCY]:
            # For latency, lower is better
            if variance_percent < -20:
                return ComparisonResult.EXCEEDS_STANDARD
            elif variance_percent < 10:
                return ComparisonResult.MEETS_STANDARD
            elif variance_percent < 50:
                return ComparisonResult.BELOW_STANDARD
            else:
                return ComparisonResult.SIGNIFICANTLY_BELOW
        
        elif category in [BenchmarkCategory.THROUGHPUT, BenchmarkCategory.EFFICIENCY]:
            # For throughput/efficiency, higher is often better
            if variance_percent > 20:
                return ComparisonResult.EXCEEDS_STANDARD
            elif variance_percent > -10:
                return ComparisonResult.MEETS_STANDARD
            elif variance_percent > -30:
                return ComparisonResult.BELOW_STANDARD
            else:
                return ComparisonResult.SIGNIFICANTLY_BELOW
        
        else:
            # Default: within 10% is acceptable
            if abs(variance_percent) < 10:
                return ComparisonResult.MEETS_STANDARD
            elif abs(variance_percent) < 30:
                return ComparisonResult.BELOW_STANDARD
            else:
                return ComparisonResult.SIGNIFICANTLY_BELOW
    
    def _generate_benchmark_recommendations(
        self,
        metric_name: str,
        benchmark: Benchmark,
        actual_value: float,
        variance_percent: float,
        result: ComparisonResult
    ) -> List[str]:
        """Generate recommendations based on benchmark comparison."""
        recommendations = []
        
        if result == ComparisonResult.EXCEEDS_STANDARD:
            recommendations.append(f"{metric_name} exceeds industry standard by {abs(variance_percent):.1f}%.")
            recommendations.append("Current performance is excellent. Document best practices.")
        
        elif result == ComparisonResult.MEETS_STANDARD:
            recommendations.append(f"{metric_name} meets industry standard (variance: {variance_percent:+.1f}%).")
            recommendations.append("Continue monitoring to maintain performance.")
        
        elif result == ComparisonResult.BELOW_STANDARD:
            recommendations.append(f"WARNING: {metric_name} is {abs(variance_percent):.1f}% below standard.")
            
            if benchmark.category == BenchmarkCategory.COST:
                recommendations.append("Cost is above benchmark. Review pricing and consider optimization:")
                recommendations.append("  • Negotiate volume discounts with providers")
                recommendations.append("  • Use reserved instances or savings plans")
                recommendations.append("  • Implement auto-scaling to match demand")
            
            elif benchmark.category == BenchmarkCategory.LATENCY:
                recommendations.append("Latency exceeds acceptable threshold. Optimize performance:")
                recommendations.append("  • Implement caching strategies")
                recommendations.append("  • Optimize database queries")
                recommendations.append("  • Use CDN for static content")
            
            elif benchmark.category == BenchmarkCategory.THROUGHPUT:
                recommendations.append("Throughput is below standard. Increase capacity:")
                recommendations.append("  • Scale horizontally with more instances")
                recommendations.append("  • Optimize application code")
                recommendations.append("  • Implement load balancing")
        
        elif result == ComparisonResult.SIGNIFICANTLY_BELOW:
            recommendations.append(f"CRITICAL: {metric_name} is significantly below standard ({abs(variance_percent):.1f}% variance).")
            recommendations.append("Immediate action required:")
            
            if benchmark.category == BenchmarkCategory.COST:
                recommendations.append("  • Conduct comprehensive cost audit")
                recommendations.append("  • Consider alternative providers or architectures")
                recommendations.append("  • Implement aggressive cost reduction measures")
            
            else:
                recommendations.append("  • Architecture review required")
                recommendations.append("  • Consider service redesign or technology changes")
                recommendations.append("  • Engage performance engineering expertise")
        
        return recommendations
    
    def batch_compare(
        self,
        metrics: Dict[str, float],
        standard_mappings: Dict[str, str]
    ) -> Dict[str, Any]:
        """
        Compare multiple metrics against standards in batch.
        
        :param metrics: Dictionary of metric_name -> actual_value.
        :param standard_mappings: Dictionary of metric_name -> standard_key.
        :returns: Dictionary with batch comparison results.
        """
        comparisons = []
        
        for metric_name, actual_value in metrics.items():
            if metric_name in standard_mappings:
                standard_key = standard_mappings[metric_name]
                try:
                    comparison = self.compare_against_standard(
                        metric_name, actual_value, standard_key
                    )
                    comparisons.append(comparison)
                except ValueError as e:
                    # Skip if standard not found
                    continue
        
        # Summarize results
        exceeds_count = sum(1 for c in comparisons if c.result == ComparisonResult.EXCEEDS_STANDARD)
        meets_count = sum(1 for c in comparisons if c.result == ComparisonResult.MEETS_STANDARD)
        below_count = sum(1 for c in comparisons if c.result == ComparisonResult.BELOW_STANDARD)
        significantly_below_count = sum(1 for c in comparisons if c.result == ComparisonResult.SIGNIFICANTLY_BELOW)
        
        return {
            'timestamp': datetime.now().isoformat(),
            'metrics_compared': len(comparisons),
            'summary': {
                'exceeds_standard': exceeds_count,
                'meets_standard': meets_count,
                'below_standard': below_count,
                'significantly_below': significantly_below_count
            },
            'comparisons': [self._comparison_to_dict(c) for c in comparisons],
            'overall_status': 'critical' if significantly_below_count > 0 else
                            'warning' if below_count > 0 else
                            'good' if meets_count > 0 else 'excellent'
        }
    
    def _comparison_to_dict(self, comparison: BenchmarkComparison) -> Dict[str, Any]:
        """Convert BenchmarkComparison to dictionary."""
        return {
            'benchmark_name': comparison.benchmark_name,
            'category': comparison.category.value,
            'actual_value': round(comparison.actual_value, 4),
            'benchmark_value': round(comparison.benchmark_value, 4),
            'unit': comparison.unit,
            'variance': round(comparison.variance, 4),
            'variance_percent': round(comparison.variance_percent, 2),
            'result': comparison.result.value,
            'recommendations': comparison.recommendations,
            'timestamp': comparison.timestamp
        }
    
    def list_available_standards(
        self,
        category: Optional[BenchmarkCategory] = None
    ) -> List[Dict[str, Any]]:
        """
        List available industry standards.
        
        :param category: Optional category filter.
        :returns: List of available standards.
        """
        standards = []
        
        for key, benchmark in self.INDUSTRY_STANDARDS.items():
            if category is None or benchmark.category == category:
                standards.append({
                    'key': key,
                    'name': benchmark.name,
                    'category': benchmark.category.value,
                    'value': benchmark.value,
                    'unit': benchmark.unit,
                    'source': benchmark.source,
                    'description': benchmark.description
                })
        
        return standards
    
    def generate_benchmarking_report(
        self,
        include_history: bool = True
    ) -> Dict[str, Any]:
        """
        Generate comprehensive benchmarking report.
        
        :param include_history: Whether to include full comparison history.
        :returns: Dictionary with benchmarking report.
        """
        report = {
            'timestamp': datetime.now().isoformat(),
            'available_standards': len(self.INDUSTRY_STANDARDS),
            'custom_baselines': len(self.custom_baselines),
            'total_comparisons': len(self.comparison_history)
        }
        
        if include_history and self.comparison_history:
            report['comparisons'] = [
                self._comparison_to_dict(c) for c in self.comparison_history
            ]
            
            # Summary statistics
            results_count = {}
            for c in self.comparison_history:
                result_key = c.result.value
                results_count[result_key] = results_count.get(result_key, 0) + 1
            
            report['summary'] = {
                'by_result': results_count,
                'latest_comparison': self._comparison_to_dict(self.comparison_history[-1])
            }
        
        # List custom baselines
        if self.custom_baselines:
            report['custom_baselines_list'] = [
                {
                    'name': name,
                    'category': b.category.value,
                    'value': b.value,
                    'unit': b.unit,
                    'description': b.description
                }
                for name, b in self.custom_baselines.items()
            ]
        
        return report
