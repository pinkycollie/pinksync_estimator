"""
Performance Analysis Module

This module provides tools for analyzing server-side performance metrics including
latency, throughput, and scaling efficiency.
"""

import statistics
from dataclasses import dataclass, field
from datetime import datetime
from typing import Dict, List, Any, Optional, Tuple
from enum import Enum


class PerformanceStatus(Enum):
    """Status of performance metrics."""
    EXCELLENT = "excellent"
    GOOD = "good"
    ACCEPTABLE = "acceptable"
    DEGRADED = "degraded"
    CRITICAL = "critical"


@dataclass
class LatencyMetrics:
    """Latency measurements for a service."""
    p50_ms: float  # Median
    p90_ms: float  # 90th percentile
    p95_ms: float  # 95th percentile
    p99_ms: float  # 99th percentile
    min_ms: float
    max_ms: float
    avg_ms: float
    sample_count: int
    measurement_period_start: str
    measurement_period_end: str


@dataclass
class ThroughputMetrics:
    """Throughput measurements for a service."""
    requests_per_second: float
    successful_requests: int
    failed_requests: int
    total_requests: int
    success_rate: float
    error_rate: float
    measurement_period_start: str
    measurement_period_end: str


@dataclass
class ResourceUtilization:
    """Resource utilization metrics."""
    cpu_percent: float
    memory_percent: float
    disk_io_mbps: float
    network_io_mbps: float
    timestamp: str


@dataclass
class LoadTestResult:
    """Result of a load test."""
    test_name: str
    concurrent_users: int
    duration_seconds: float
    total_requests: int
    successful_requests: int
    failed_requests: int
    avg_response_time_ms: float
    p95_response_time_ms: float
    p99_response_time_ms: float
    requests_per_second: float
    errors_per_second: float
    resource_utilization: ResourceUtilization
    timestamp: str


class PerformanceAnalyzer:
    """
    Analyzes server-side performance metrics including latency, throughput,
    and scaling efficiency.
    
    This class provides tools to:
    - Analyze latency trends and identify bottlenecks
    - Track throughput and capacity
    - Evaluate scaling efficiency under load
    - Generate performance reports and recommendations
    """
    
    # Performance thresholds (milliseconds)
    EXCELLENT_LATENCY_P95 = 100
    GOOD_LATENCY_P95 = 300
    ACCEPTABLE_LATENCY_P95 = 1000
    DEGRADED_LATENCY_P95 = 3000
    
    # Throughput thresholds
    EXCELLENT_ERROR_RATE = 0.001  # 0.1%
    GOOD_ERROR_RATE = 0.01  # 1%
    ACCEPTABLE_ERROR_RATE = 0.05  # 5%
    
    # Resource utilization thresholds
    HEALTHY_CPU_THRESHOLD = 70.0
    WARNING_CPU_THRESHOLD = 85.0
    CRITICAL_CPU_THRESHOLD = 95.0
    
    def __init__(self):
        """Initialize the performance analyzer."""
        self.latency_history: List[LatencyMetrics] = []
        self.throughput_history: List[ThroughputMetrics] = []
        self.load_test_results: List[LoadTestResult] = []
    
    def analyze_latency(self, metrics: LatencyMetrics) -> Dict[str, Any]:
        """
        Analyze latency metrics and determine performance status.
        
        :param metrics: Latency metrics to analyze.
        :returns: Dictionary with analysis results.
        """
        self.latency_history.append(metrics)
        
        # Determine status based on P95 latency
        if metrics.p95_ms <= self.EXCELLENT_LATENCY_P95:
            status = PerformanceStatus.EXCELLENT
            description = "Latency is excellent. System is highly responsive."
        elif metrics.p95_ms <= self.GOOD_LATENCY_P95:
            status = PerformanceStatus.GOOD
            description = "Latency is good. System performance is acceptable."
        elif metrics.p95_ms <= self.ACCEPTABLE_LATENCY_P95:
            status = PerformanceStatus.ACCEPTABLE
            description = "Latency is acceptable but could be improved."
        elif metrics.p95_ms <= self.DEGRADED_LATENCY_P95:
            status = PerformanceStatus.DEGRADED
            description = "Latency is degraded. Performance optimization needed."
        else:
            status = PerformanceStatus.CRITICAL
            description = "Latency is critical. Immediate action required."
        
        # Calculate variability
        latency_range = metrics.max_ms - metrics.min_ms
        variability_ratio = latency_range / metrics.avg_ms if metrics.avg_ms > 0 else 0
        
        # Check for long tail
        tail_ratio = metrics.p99_ms / metrics.p50_ms if metrics.p50_ms > 0 else 0
        has_long_tail = tail_ratio > 5.0
        
        # Generate recommendations
        recommendations = self._generate_latency_recommendations(
            metrics, status, variability_ratio, has_long_tail
        )
        
        return {
            'status': status.value,
            'description': description,
            'metrics': {
                'p50_ms': round(metrics.p50_ms, 2),
                'p90_ms': round(metrics.p90_ms, 2),
                'p95_ms': round(metrics.p95_ms, 2),
                'p99_ms': round(metrics.p99_ms, 2),
                'avg_ms': round(metrics.avg_ms, 2),
                'min_ms': round(metrics.min_ms, 2),
                'max_ms': round(metrics.max_ms, 2)
            },
            'analysis': {
                'variability_ratio': round(variability_ratio, 2),
                'has_long_tail': has_long_tail,
                'tail_ratio': round(tail_ratio, 2),
                'sample_count': metrics.sample_count
            },
            'recommendations': recommendations,
            'timestamp': datetime.now().isoformat()
        }
    
    def analyze_throughput(self, metrics: ThroughputMetrics) -> Dict[str, Any]:
        """
        Analyze throughput metrics and capacity.
        
        :param metrics: Throughput metrics to analyze.
        :returns: Dictionary with analysis results.
        """
        self.throughput_history.append(metrics)
        
        # Determine status based on error rate
        if metrics.error_rate <= self.EXCELLENT_ERROR_RATE:
            status = PerformanceStatus.EXCELLENT
            description = "Throughput is excellent with minimal errors."
        elif metrics.error_rate <= self.GOOD_ERROR_RATE:
            status = PerformanceStatus.GOOD
            description = "Throughput is good with acceptable error rate."
        elif metrics.error_rate <= self.ACCEPTABLE_ERROR_RATE:
            status = PerformanceStatus.ACCEPTABLE
            description = "Throughput is acceptable but error rate is elevated."
        else:
            status = PerformanceStatus.CRITICAL
            description = "Throughput has critical error rate. Immediate attention needed."
        
        # Calculate capacity metrics
        theoretical_max_rps = metrics.requests_per_second / (1 - metrics.error_rate) if metrics.error_rate < 1 else metrics.requests_per_second
        capacity_utilization = (metrics.requests_per_second / theoretical_max_rps * 100) if theoretical_max_rps > 0 else 0
        
        # Generate recommendations
        recommendations = self._generate_throughput_recommendations(
            metrics, status, capacity_utilization
        )
        
        return {
            'status': status.value,
            'description': description,
            'metrics': {
                'requests_per_second': round(metrics.requests_per_second, 2),
                'success_rate': round(metrics.success_rate * 100, 2),
                'error_rate': round(metrics.error_rate * 100, 4),
                'total_requests': metrics.total_requests,
                'successful_requests': metrics.successful_requests,
                'failed_requests': metrics.failed_requests
            },
            'analysis': {
                'estimated_max_rps': round(theoretical_max_rps, 2),
                'capacity_utilization_percent': round(capacity_utilization, 2)
            },
            'recommendations': recommendations,
            'timestamp': datetime.now().isoformat()
        }
    
    def analyze_resource_utilization(
        self,
        utilization: ResourceUtilization
    ) -> Dict[str, Any]:
        """
        Analyze resource utilization metrics.
        
        :param utilization: Resource utilization metrics.
        :returns: Dictionary with analysis results.
        """
        # Determine CPU status
        if utilization.cpu_percent < self.HEALTHY_CPU_THRESHOLD:
            cpu_status = PerformanceStatus.GOOD
            cpu_description = "CPU utilization is healthy."
        elif utilization.cpu_percent < self.WARNING_CPU_THRESHOLD:
            cpu_status = PerformanceStatus.ACCEPTABLE
            cpu_description = "CPU utilization is elevated. Monitor for increases."
        elif utilization.cpu_percent < self.CRITICAL_CPU_THRESHOLD:
            cpu_status = PerformanceStatus.DEGRADED
            cpu_description = "CPU utilization is high. Consider scaling."
        else:
            cpu_status = PerformanceStatus.CRITICAL
            cpu_description = "CPU utilization is critical. Scale immediately."
        
        # Similar analysis for memory
        if utilization.memory_percent < self.HEALTHY_CPU_THRESHOLD:
            memory_status = PerformanceStatus.GOOD
        elif utilization.memory_percent < self.WARNING_CPU_THRESHOLD:
            memory_status = PerformanceStatus.ACCEPTABLE
        elif utilization.memory_percent < self.CRITICAL_CPU_THRESHOLD:
            memory_status = PerformanceStatus.DEGRADED
        else:
            memory_status = PerformanceStatus.CRITICAL
        
        # Generate recommendations
        recommendations = self._generate_resource_recommendations(
            utilization, cpu_status, memory_status
        )
        
        return {
            'cpu': {
                'status': cpu_status.value,
                'description': cpu_description,
                'utilization_percent': round(utilization.cpu_percent, 2)
            },
            'memory': {
                'status': memory_status.value,
                'utilization_percent': round(utilization.memory_percent, 2)
            },
            'io': {
                'disk_mbps': round(utilization.disk_io_mbps, 2),
                'network_mbps': round(utilization.network_io_mbps, 2)
            },
            'recommendations': recommendations,
            'timestamp': utilization.timestamp
        }
    
    def analyze_scaling_efficiency(
        self,
        load_tests: List[LoadTestResult]
    ) -> Dict[str, Any]:
        """
        Analyze scaling efficiency by comparing performance at different load levels.
        
        :param load_tests: List of load test results at different scales.
        :returns: Dictionary with scaling analysis.
        """
        if len(load_tests) < 2:
            return {
                'error': 'Need at least 2 load test results for scaling analysis',
                'timestamp': datetime.now().isoformat()
            }
        
        # Sort by concurrent users
        sorted_tests = sorted(load_tests, key=lambda t: t.concurrent_users)
        
        # Calculate scaling metrics
        scaling_metrics = []
        for i in range(1, len(sorted_tests)):
            prev = sorted_tests[i-1]
            curr = sorted_tests[i]
            
            user_ratio = curr.concurrent_users / prev.concurrent_users
            throughput_ratio = curr.requests_per_second / prev.requests_per_second if prev.requests_per_second > 0 else 0
            latency_ratio = curr.avg_response_time_ms / prev.avg_response_time_ms if prev.avg_response_time_ms > 0 else 0
            
            # Ideal scaling: throughput increases linearly with users, latency stays constant
            throughput_efficiency = (throughput_ratio / user_ratio) * 100 if user_ratio > 0 else 0
            latency_degradation = ((latency_ratio - 1) * 100) if latency_ratio > 0 else 0
            
            # Overall scaling score (higher is better)
            scaling_score = throughput_efficiency - (latency_degradation * 0.5)
            
            scaling_metrics.append({
                'from_users': prev.concurrent_users,
                'to_users': curr.concurrent_users,
                'user_increase_ratio': round(user_ratio, 2),
                'throughput_increase_ratio': round(throughput_ratio, 2),
                'latency_increase_ratio': round(latency_ratio, 2),
                'throughput_efficiency_percent': round(throughput_efficiency, 2),
                'latency_degradation_percent': round(latency_degradation, 2),
                'scaling_score': round(scaling_score, 2)
            })
        
        # Determine overall scaling efficiency
        avg_scaling_score = statistics.mean([m['scaling_score'] for m in scaling_metrics])
        
        if avg_scaling_score >= 90:
            scaling_status = PerformanceStatus.EXCELLENT
            scaling_description = "System scales excellently with near-linear performance."
        elif avg_scaling_score >= 75:
            scaling_status = PerformanceStatus.GOOD
            scaling_description = "System scales well with acceptable degradation."
        elif avg_scaling_score >= 60:
            scaling_status = PerformanceStatus.ACCEPTABLE
            scaling_description = "System scales adequately but optimization possible."
        elif avg_scaling_score >= 40:
            scaling_status = PerformanceStatus.DEGRADED
            scaling_description = "System scaling is degraded. Performance optimization needed."
        else:
            scaling_status = PerformanceStatus.CRITICAL
            scaling_description = "System scaling is poor. Architecture review required."
        
        # Generate recommendations
        recommendations = self._generate_scaling_recommendations(
            scaling_metrics, scaling_status
        )
        
        return {
            'status': scaling_status.value,
            'description': scaling_description,
            'average_scaling_score': round(avg_scaling_score, 2),
            'scaling_metrics': scaling_metrics,
            'load_tests_analyzed': len(sorted_tests),
            'recommendations': recommendations,
            'timestamp': datetime.now().isoformat()
        }
    
    def calculate_performance_trends(
        self,
        lookback_periods: int = 10
    ) -> Dict[str, Any]:
        """
        Calculate performance trends over time.
        
        :param lookback_periods: Number of historical periods to analyze.
        :returns: Dictionary with trend analysis.
        """
        if len(self.latency_history) < 2:
            return {
                'error': 'Insufficient data for trend analysis',
                'timestamp': datetime.now().isoformat()
            }
        
        # Get recent latency data
        recent_latency = self.latency_history[-lookback_periods:]
        
        # Calculate trends
        p95_values = [m.p95_ms for m in recent_latency]
        avg_values = [m.avg_ms for m in recent_latency]
        
        # Linear regression for trend
        p95_trend = self._calculate_trend(p95_values)
        avg_trend = self._calculate_trend(avg_values)
        
        # Throughput trends
        throughput_trend = None
        if len(self.throughput_history) >= 2:
            recent_throughput = self.throughput_history[-lookback_periods:]
            rps_values = [m.requests_per_second for m in recent_throughput]
            error_rate_values = [m.error_rate for m in recent_throughput]
            
            throughput_trend = {
                'rps_trend': self._calculate_trend(rps_values),
                'error_rate_trend': self._calculate_trend(error_rate_values)
            }
        
        return {
            'latency_trends': {
                'p95_trend': p95_trend,
                'avg_trend': avg_trend,
                'periods_analyzed': len(recent_latency)
            },
            'throughput_trends': throughput_trend,
            'timestamp': datetime.now().isoformat()
        }
    
    def _calculate_trend(self, values: List[float]) -> Dict[str, Any]:
        """Calculate trend direction and magnitude."""
        if len(values) < 2:
            return {'direction': 'insufficient_data', 'change_percent': 0}
        
        # Simple trend: compare first half to second half
        mid = len(values) // 2
        first_half_avg = statistics.mean(values[:mid])
        second_half_avg = statistics.mean(values[mid:])
        
        change = second_half_avg - first_half_avg
        change_percent = (change / first_half_avg * 100) if first_half_avg > 0 else 0
        
        if abs(change_percent) < 5:
            direction = 'stable'
        elif change_percent > 0:
            direction = 'increasing'
        else:
            direction = 'decreasing'
        
        return {
            'direction': direction,
            'change_percent': round(change_percent, 2),
            'first_half_avg': round(first_half_avg, 2),
            'second_half_avg': round(second_half_avg, 2)
        }
    
    def _generate_latency_recommendations(
        self,
        metrics: LatencyMetrics,
        status: PerformanceStatus,
        variability: float,
        has_long_tail: bool
    ) -> List[str]:
        """Generate recommendations for latency optimization."""
        recommendations = []
        
        if status == PerformanceStatus.EXCELLENT:
            recommendations.append("Latency performance is excellent. Continue monitoring.")
        
        elif status in [PerformanceStatus.ACCEPTABLE, PerformanceStatus.DEGRADED, PerformanceStatus.CRITICAL]:
            recommendations.append("Implement caching for frequently accessed data.")
            recommendations.append("Review database query performance and add indexes.")
            recommendations.append("Consider using a CDN for static assets.")
            recommendations.append("Profile application code to identify bottlenecks.")
        
        if variability > 3.0:
            recommendations.append("High latency variability detected. Investigate inconsistent performance.")
            recommendations.append("Check for resource contention or background jobs.")
        
        if has_long_tail:
            recommendations.append("Long tail latency detected (P99 >> P50).")
            recommendations.append("Investigate outlier requests and optimize slow paths.")
            recommendations.append("Consider implementing request timeouts and circuit breakers.")
        
        return recommendations
    
    def _generate_throughput_recommendations(
        self,
        metrics: ThroughputMetrics,
        status: PerformanceStatus,
        capacity_utilization: float
    ) -> List[str]:
        """Generate recommendations for throughput optimization."""
        recommendations = []
        
        if status == PerformanceStatus.CRITICAL:
            recommendations.append("CRITICAL: High error rate detected. Investigate immediately.")
            recommendations.append("Check logs for error patterns and root causes.")
            recommendations.append("Verify system dependencies are healthy.")
        
        if metrics.error_rate > 0.01:
            recommendations.append("Implement retry logic with exponential backoff.")
            recommendations.append("Add circuit breakers for failing dependencies.")
        
        if capacity_utilization > 80:
            recommendations.append("System is at high capacity. Consider horizontal scaling.")
            recommendations.append("Implement load shedding or rate limiting.")
        
        if metrics.requests_per_second > 1000:
            recommendations.append("High throughput detected. Ensure monitoring is comprehensive.")
            recommendations.append("Consider implementing request queueing for burst traffic.")
        
        return recommendations
    
    def _generate_resource_recommendations(
        self,
        utilization: ResourceUtilization,
        cpu_status: PerformanceStatus,
        memory_status: PerformanceStatus
    ) -> List[str]:
        """Generate recommendations for resource optimization."""
        recommendations = []
        
        if cpu_status in [PerformanceStatus.DEGRADED, PerformanceStatus.CRITICAL]:
            recommendations.append("CPU utilization is high. Scale horizontally or vertically.")
            recommendations.append("Profile CPU usage to identify inefficient code paths.")
            recommendations.append("Consider implementing auto-scaling based on CPU metrics.")
        
        if memory_status in [PerformanceStatus.DEGRADED, PerformanceStatus.CRITICAL]:
            recommendations.append("Memory utilization is high. Check for memory leaks.")
            recommendations.append("Optimize data structures and caching strategies.")
            recommendations.append("Consider upgrading to instances with more memory.")
        
        if utilization.disk_io_mbps > 100:
            recommendations.append("High disk I/O detected. Consider using SSD storage.")
            recommendations.append("Implement read/write caching to reduce disk access.")
        
        if utilization.network_io_mbps > 500:
            recommendations.append("High network I/O detected. Optimize data transfer.")
            recommendations.append("Consider using compression for network traffic.")
        
        return recommendations
    
    def _generate_scaling_recommendations(
        self,
        scaling_metrics: List[Dict[str, Any]],
        status: PerformanceStatus
    ) -> List[str]:
        """Generate recommendations for scaling improvements."""
        recommendations = []
        
        if status == PerformanceStatus.EXCELLENT:
            recommendations.append("System scales excellently. Current architecture is effective.")
        
        elif status in [PerformanceStatus.GOOD, PerformanceStatus.ACCEPTABLE]:
            recommendations.append("System scales adequately but optimization is possible.")
            recommendations.append("Consider implementing connection pooling.")
            recommendations.append("Review database connection and query patterns.")
        
        elif status in [PerformanceStatus.DEGRADED, PerformanceStatus.CRITICAL]:
            recommendations.append("CRITICAL: Poor scaling efficiency detected.")
            recommendations.append("Architecture review recommended - consider microservices.")
            recommendations.append("Implement database read replicas and write sharding.")
            recommendations.append("Add caching layer (Redis/Memcached).")
            recommendations.append("Review and optimize locking and concurrency patterns.")
        
        # Check for specific patterns
        for metric in scaling_metrics:
            if metric['latency_degradation_percent'] > 50:
                recommendations.append(f"Significant latency degradation at {metric['to_users']} users. Investigate bottlenecks.")
            
            if metric['throughput_efficiency_percent'] < 70:
                recommendations.append(f"Poor throughput scaling at {metric['to_users']} users. Review resource allocation.")
        
        return recommendations
    
    def generate_performance_report(self) -> Dict[str, Any]:
        """
        Generate comprehensive performance report.
        
        :returns: Dictionary with complete performance analysis.
        """
        report = {
            'timestamp': datetime.now().isoformat(),
            'summary': {}
        }
        
        # Latency summary
        if self.latency_history:
            latest_latency = self.latency_history[-1]
            latency_analysis = self.analyze_latency(latest_latency)
            report['latency'] = latency_analysis
        
        # Throughput summary
        if self.throughput_history:
            latest_throughput = self.throughput_history[-1]
            throughput_analysis = self.analyze_throughput(latest_throughput)
            report['throughput'] = throughput_analysis
        
        # Trends
        if len(self.latency_history) >= 2:
            trends = self.calculate_performance_trends()
            report['trends'] = trends
        
        # Scaling analysis
        if len(self.load_test_results) >= 2:
            scaling = self.analyze_scaling_efficiency(self.load_test_results)
            report['scaling'] = scaling
        
        # Overall assessment
        report['summary'] = self._generate_performance_summary(report)
        
        return report
    
    def _generate_performance_summary(self, report: Dict[str, Any]) -> Dict[str, Any]:
        """Generate overall performance summary."""
        summary = {
            'overall_status': 'unknown',
            'key_findings': [],
            'priority_actions': []
        }
        
        # Determine overall status from components
        statuses = []
        if 'latency' in report:
            statuses.append(report['latency']['status'])
        if 'throughput' in report:
            statuses.append(report['throughput']['status'])
        
        if statuses:
            if 'critical' in statuses:
                summary['overall_status'] = 'critical'
            elif 'degraded' in statuses:
                summary['overall_status'] = 'degraded'
            elif 'acceptable' in statuses:
                summary['overall_status'] = 'acceptable'
            elif 'good' in statuses:
                summary['overall_status'] = 'good'
            else:
                summary['overall_status'] = 'excellent'
        
        # Collect key findings
        if 'latency' in report:
            p95 = report['latency']['metrics']['p95_ms']
            summary['key_findings'].append(f"P95 latency: {p95:.2f}ms")
        
        if 'throughput' in report:
            rps = report['throughput']['metrics']['requests_per_second']
            error_rate = report['throughput']['metrics']['error_rate']
            summary['key_findings'].append(f"Throughput: {rps:.2f} req/s with {error_rate:.2f}% error rate")
        
        return summary
