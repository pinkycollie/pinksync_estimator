"""
Comprehensive Reporting Framework

This module provides tools for generating detailed reports with metrics,
anomalies, and discrepancies for all analyzed components.
"""

import json
from dataclasses import dataclass, field
from datetime import datetime
from typing import Dict, List, Any, Optional
from enum import Enum

# Import other modules
try:
    from resource_validator import ResourceValidator, ValidationResult
    from micro_macro_analyzer import MicroMacroAnalyzer, ScaleProjection
    from performance_analyzer import PerformanceAnalyzer
    from benchmarking import BenchmarkingTool, BenchmarkComparison
except ImportError:
    # Allow module to load even if imports fail (for testing)
    pass


class ReportFormat(Enum):
    """Output formats for reports."""
    JSON = "json"
    TEXT = "text"
    HTML = "html"
    MARKDOWN = "markdown"


class SeverityLevel(Enum):
    """Severity levels for anomalies and issues."""
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"


@dataclass
class Anomaly:
    """Represents an anomaly or discrepancy detected in analysis."""
    category: str
    severity: SeverityLevel
    description: str
    detected_at: str
    affected_metric: str
    expected_value: Optional[float] = None
    actual_value: Optional[float] = None
    recommendations: List[str] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class ReportSection:
    """A section within a comprehensive report."""
    title: str
    summary: str
    data: Dict[str, Any]
    anomalies: List[Anomaly]
    recommendations: List[str]
    timestamp: str


class ComprehensiveReportGenerator:
    """
    Generates comprehensive reports combining all analysis components.
    
    This class provides:
    - Unified reporting across all analysis modules
    - Anomaly detection and highlighting
    - Multi-format output (JSON, Text, HTML, Markdown)
    - Detailed logs with timestamps and metrics
    - Corrective recommendations
    """
    
    def __init__(self):
        """Initialize the report generator."""
        self.sections: List[ReportSection] = []
        self.anomalies: List[Anomaly] = []
        self.report_metadata = {
            'created_at': datetime.now().isoformat(),
            'generator_version': '1.0.0'
        }
    
    def add_validation_section(
        self,
        validator: 'ResourceValidator'
    ) -> None:
        """
        Add resource validation section to the report.
        
        :param validator: ResourceValidator instance with validation history.
        """
        if not validator.validation_history:
            return
        
        # Detect anomalies in validation results
        anomalies = self._detect_validation_anomalies(validator.validation_history)
        self.anomalies.extend(anomalies)
        
        # Compile recommendations
        recommendations = []
        for result in validator.validation_history:
            recommendations.extend(result.recommendations)
        recommendations = list(set(recommendations))  # Remove duplicates
        
        # Create summary
        total = len(validator.validation_history)
        discrepancies = sum(1 for r in validator.validation_history 
                          if r.status.value in ['discrepancy', 'critical'])
        total_cost_variance = sum(r.discrepancy_cost for r in validator.validation_history)
        
        summary = (
            f"Validated {total} resources. "
            f"Found {discrepancies} discrepancies with total cost impact of ${total_cost_variance:.2f}."
        )
        
        section = ReportSection(
            title="Resource Validation",
            summary=summary,
            data={
                'total_resources': total,
                'discrepancies_found': discrepancies,
                'total_cost_variance': round(total_cost_variance, 2),
                'validation_results': [
                    validator._result_to_dict(r) for r in validator.validation_history
                ]
            },
            anomalies=anomalies,
            recommendations=recommendations,
            timestamp=datetime.now().isoformat()
        )
        
        self.sections.append(section)
    
    def add_scaling_section(
        self,
        analyzer: 'MicroMacroAnalyzer'
    ) -> None:
        """
        Add micro-macro scaling analysis section to the report.
        
        :param analyzer: MicroMacroAnalyzer instance with projections.
        """
        if not analyzer.projections:
            return
        
        # Detect anomalies in scaling projections
        anomalies = self._detect_scaling_anomalies(analyzer.projections)
        self.anomalies.extend(anomalies)
        
        # Compile recommendations from projections
        recommendations = []
        for projection in analyzer.projections:
            recommendations.extend(projection.recommendations)
        recommendations = list(set(recommendations))[:10]  # Top 10 unique
        
        # Create summary
        avg_profile = analyzer.calculate_average_user_profile()
        largest_projection = max(analyzer.projections, key=lambda p: p.user_count)
        
        summary = (
            f"Analyzed {len(analyzer.user_samples)} user samples. "
            f"Projected to {largest_projection.user_count:,} users with "
            f"${largest_projection.monthly_cost:,.2f}/month cost."
        )
        
        section = ReportSection(
            title="Scaling Analysis (Micro to Macro)",
            summary=summary,
            data=analyzer.generate_scaling_report(),
            anomalies=anomalies,
            recommendations=recommendations,
            timestamp=datetime.now().isoformat()
        )
        
        self.sections.append(section)
    
    def add_performance_section(
        self,
        analyzer: 'PerformanceAnalyzer'
    ) -> None:
        """
        Add performance analysis section to the report.
        
        :param analyzer: PerformanceAnalyzer instance with performance data.
        """
        if not analyzer.latency_history and not analyzer.throughput_history:
            return
        
        # Detect performance anomalies
        anomalies = self._detect_performance_anomalies(analyzer)
        self.anomalies.extend(anomalies)
        
        # Generate performance report
        perf_report = analyzer.generate_performance_report()
        
        # Compile recommendations
        recommendations = []
        if 'latency' in perf_report:
            recommendations.extend(perf_report['latency'].get('recommendations', []))
        if 'throughput' in perf_report:
            recommendations.extend(perf_report['throughput'].get('recommendations', []))
        recommendations = list(set(recommendations))
        
        # Create summary
        summary_parts = []
        if analyzer.latency_history:
            latest = analyzer.latency_history[-1]
            summary_parts.append(f"P95 latency: {latest.p95_ms:.2f}ms")
        if analyzer.throughput_history:
            latest = analyzer.throughput_history[-1]
            summary_parts.append(f"Throughput: {latest.requests_per_second:.2f} req/s")
        
        summary = "Performance analysis: " + ", ".join(summary_parts)
        
        section = ReportSection(
            title="Server Performance Analysis",
            summary=summary,
            data=perf_report,
            anomalies=anomalies,
            recommendations=recommendations,
            timestamp=datetime.now().isoformat()
        )
        
        self.sections.append(section)
    
    def add_benchmarking_section(
        self,
        tool: 'BenchmarkingTool'
    ) -> None:
        """
        Add benchmarking comparison section to the report.
        
        :param tool: BenchmarkingTool instance with comparison history.
        """
        if not tool.comparison_history:
            return
        
        # Detect benchmarking anomalies
        anomalies = self._detect_benchmarking_anomalies(tool.comparison_history)
        self.anomalies.extend(anomalies)
        
        # Compile recommendations
        recommendations = []
        for comparison in tool.comparison_history:
            recommendations.extend(comparison.recommendations)
        recommendations = list(set(recommendations))[:10]
        
        # Create summary
        total_comparisons = len(tool.comparison_history)
        below_standard = sum(
            1 for c in tool.comparison_history 
            if c.result.value in ['below_standard', 'significantly_below']
        )
        
        summary = (
            f"Compared {total_comparisons} metrics against industry standards. "
            f"{below_standard} metrics below standard."
        )
        
        section = ReportSection(
            title="Benchmarking Against Industry Standards",
            summary=summary,
            data=tool.generate_benchmarking_report(include_history=True),
            anomalies=anomalies,
            recommendations=recommendations,
            timestamp=datetime.now().isoformat()
        )
        
        self.sections.append(section)
    
    def _detect_validation_anomalies(
        self,
        validation_results: List['ValidationResult']
    ) -> List[Anomaly]:
        """Detect anomalies in validation results."""
        anomalies = []
        
        for result in validation_results:
            if result.status.value == 'critical':
                anomalies.append(Anomaly(
                    category='resource_validation',
                    severity=SeverityLevel.CRITICAL,
                    description=f"Critical discrepancy in {result.resource_type.value}",
                    detected_at=result.timestamp,
                    affected_metric=result.resource_type.value,
                    expected_value=result.claimed,
                    actual_value=result.actual,
                    recommendations=result.recommendations
                ))
            
            elif result.status.value == 'discrepancy':
                anomalies.append(Anomaly(
                    category='resource_validation',
                    severity=SeverityLevel.ERROR,
                    description=f"Discrepancy in {result.resource_type.value}: {result.variance_percent:+.1f}%",
                    detected_at=result.timestamp,
                    affected_metric=result.resource_type.value,
                    expected_value=result.claimed,
                    actual_value=result.actual,
                    recommendations=result.recommendations
                ))
            
            # Check for consistent over/under billing
            if result.discrepancy_cost > 1000:
                anomalies.append(Anomaly(
                    category='cost_anomaly',
                    severity=SeverityLevel.WARNING,
                    description=f"High cost discrepancy: ${result.discrepancy_cost:.2f}",
                    detected_at=result.timestamp,
                    affected_metric=f"{result.resource_type.value}_cost",
                    recommendations=[
                        "Review billing methodology",
                        "Audit resource metering systems"
                    ]
                ))
        
        return anomalies
    
    def _detect_scaling_anomalies(
        self,
        projections: List['ScaleProjection']
    ) -> List[Anomaly]:
        """Detect anomalies in scaling projections."""
        anomalies = []
        
        for projection in projections:
            # Check for poor scaling efficiency
            if projection.scaling_efficiency > 0.90:  # Less than 10% efficiency gain
                anomalies.append(Anomaly(
                    category='scaling_efficiency',
                    severity=SeverityLevel.WARNING,
                    description=f"Poor scaling efficiency at {projection.user_count:,} users",
                    detected_at=datetime.now().isoformat(),
                    affected_metric='scaling_efficiency',
                    actual_value=projection.scaling_efficiency,
                    recommendations=projection.recommendations
                ))
            
            # Check for high costs
            if projection.monthly_cost > 100000:
                anomalies.append(Anomaly(
                    category='high_cost',
                    severity=SeverityLevel.WARNING,
                    description=f"High projected cost: ${projection.monthly_cost:,.2f}/month at {projection.user_count:,} users",
                    detected_at=datetime.now().isoformat(),
                    affected_metric='monthly_cost',
                    actual_value=projection.monthly_cost,
                    recommendations=[
                        "Implement cost optimization strategies",
                        "Negotiate enterprise pricing",
                        "Consider reserved capacity"
                    ]
                ))
            
            # Check infrastructure requirements
            infra = projection.infrastructure_requirements
            if infra.get('compute_instances', 0) > 100:
                anomalies.append(Anomaly(
                    category='infrastructure_scale',
                    severity=SeverityLevel.INFO,
                    description=f"Large infrastructure required: {infra['compute_instances']} compute instances",
                    detected_at=datetime.now().isoformat(),
                    affected_metric='compute_instances',
                    actual_value=infra['compute_instances'],
                    recommendations=[
                        "Consider containerization for better density",
                        "Implement auto-scaling",
                        "Review resource allocation"
                    ]
                ))
        
        return anomalies
    
    def _detect_performance_anomalies(
        self,
        analyzer: 'PerformanceAnalyzer'
    ) -> List[Anomaly]:
        """Detect performance anomalies."""
        anomalies = []
        
        # Check latency
        if analyzer.latency_history:
            latest = analyzer.latency_history[-1]
            
            if latest.p95_ms > analyzer.DEGRADED_LATENCY_P95:
                anomalies.append(Anomaly(
                    category='performance',
                    severity=SeverityLevel.CRITICAL if latest.p95_ms > 5000 else SeverityLevel.ERROR,
                    description=f"High P95 latency: {latest.p95_ms:.2f}ms",
                    detected_at=datetime.now().isoformat(),
                    affected_metric='p95_latency',
                    actual_value=latest.p95_ms,
                    recommendations=[
                        "Optimize slow queries and code paths",
                        "Implement caching",
                        "Scale infrastructure"
                    ]
                ))
            
            # Check for high variability
            if latest.max_ms > latest.avg_ms * 10:
                anomalies.append(Anomaly(
                    category='performance',
                    severity=SeverityLevel.WARNING,
                    description=f"High latency variability: max {latest.max_ms:.2f}ms vs avg {latest.avg_ms:.2f}ms",
                    detected_at=datetime.now().isoformat(),
                    affected_metric='latency_variability',
                    recommendations=[
                        "Investigate outlier requests",
                        "Check for resource contention",
                        "Implement request timeouts"
                    ]
                ))
        
        # Check throughput and errors
        if analyzer.throughput_history:
            latest = analyzer.throughput_history[-1]
            
            if latest.error_rate > analyzer.ACCEPTABLE_ERROR_RATE:
                anomalies.append(Anomaly(
                    category='reliability',
                    severity=SeverityLevel.CRITICAL if latest.error_rate > 0.10 else SeverityLevel.ERROR,
                    description=f"High error rate: {latest.error_rate*100:.2f}%",
                    detected_at=datetime.now().isoformat(),
                    affected_metric='error_rate',
                    actual_value=latest.error_rate * 100,
                    recommendations=[
                        "Investigate error patterns",
                        "Check service dependencies",
                        "Implement circuit breakers"
                    ]
                ))
        
        return anomalies
    
    def _detect_benchmarking_anomalies(
        self,
        comparisons: List['BenchmarkComparison']
    ) -> List[Anomaly]:
        """Detect anomalies in benchmark comparisons."""
        anomalies = []
        
        for comparison in comparisons:
            if comparison.result.value == 'significantly_below':
                anomalies.append(Anomaly(
                    category='benchmark',
                    severity=SeverityLevel.CRITICAL,
                    description=f"Significantly below {comparison.benchmark_name}",
                    detected_at=comparison.timestamp,
                    affected_metric=comparison.category.value,
                    expected_value=comparison.benchmark_value,
                    actual_value=comparison.actual_value,
                    recommendations=comparison.recommendations,
                    metadata={
                        'variance_percent': comparison.variance_percent,
                        'unit': comparison.unit
                    }
                ))
            
            elif comparison.result.value == 'below_standard':
                anomalies.append(Anomaly(
                    category='benchmark',
                    severity=SeverityLevel.WARNING,
                    description=f"Below {comparison.benchmark_name}",
                    detected_at=comparison.timestamp,
                    affected_metric=comparison.category.value,
                    expected_value=comparison.benchmark_value,
                    actual_value=comparison.actual_value,
                    recommendations=comparison.recommendations,
                    metadata={
                        'variance_percent': comparison.variance_percent,
                        'unit': comparison.unit
                    }
                ))
        
        return anomalies
    
    def generate_report(
        self,
        format: ReportFormat = ReportFormat.JSON,
        title: str = "Comprehensive Resource and Performance Analysis Report"
    ) -> str:
        """
        Generate comprehensive report in specified format.
        
        :param format: Output format for the report.
        :param title: Title of the report.
        :returns: Formatted report string.
        """
        if format == ReportFormat.JSON:
            return self._generate_json_report(title)
        elif format == ReportFormat.TEXT:
            return self._generate_text_report(title)
        elif format == ReportFormat.MARKDOWN:
            return self._generate_markdown_report(title)
        elif format == ReportFormat.HTML:
            return self._generate_html_report(title)
        else:
            raise ValueError(f"Unsupported format: {format}")
    
    def _generate_json_report(self, title: str) -> str:
        """Generate JSON format report."""
        report = {
            'title': title,
            'metadata': self.report_metadata,
            'executive_summary': self._generate_executive_summary(),
            'sections': [
                {
                    'title': section.title,
                    'summary': section.summary,
                    'data': section.data,
                    'anomalies': [self._anomaly_to_dict(a) for a in section.anomalies],
                    'recommendations': section.recommendations,
                    'timestamp': section.timestamp
                }
                for section in self.sections
            ],
            'all_anomalies': [self._anomaly_to_dict(a) for a in self.anomalies],
            'critical_anomalies_count': sum(1 for a in self.anomalies if a.severity == SeverityLevel.CRITICAL),
            'total_sections': len(self.sections)
        }
        
        return json.dumps(report, indent=2)
    
    def _generate_text_report(self, title: str) -> str:
        """Generate plain text format report."""
        lines = [
            "=" * 80,
            title.upper(),
            "=" * 80,
            f"Generated: {self.report_metadata['created_at']}",
            "",
            "EXECUTIVE SUMMARY",
            "-" * 80
        ]
        
        # Add executive summary
        summary = self._generate_executive_summary()
        lines.append(summary['overview'])
        lines.append(f"\nTotal Sections: {len(self.sections)}")
        lines.append(f"Critical Anomalies: {summary['critical_anomalies']}")
        lines.append(f"Total Anomalies: {summary['total_anomalies']}")
        
        # Add each section
        for section in self.sections:
            lines.extend([
                "",
                "=" * 80,
                section.title.upper(),
                "=" * 80,
                f"Timestamp: {section.timestamp}",
                "",
                section.summary,
                ""
            ])
            
            if section.anomalies:
                lines.append("\nANOMALIES DETECTED:")
                for anomaly in section.anomalies:
                    lines.append(f"  [{anomaly.severity.value.upper()}] {anomaly.description}")
            
            if section.recommendations:
                lines.append("\nRECOMMENDATIONS:")
                for rec in section.recommendations[:5]:  # Top 5
                    lines.append(f"  • {rec}")
        
        # Add anomaly summary
        if self.anomalies:
            lines.extend([
                "",
                "=" * 80,
                "ALL ANOMALIES SUMMARY",
                "=" * 80
            ])
            
            for severity in [SeverityLevel.CRITICAL, SeverityLevel.ERROR, SeverityLevel.WARNING]:
                severity_anomalies = [a for a in self.anomalies if a.severity == severity]
                if severity_anomalies:
                    lines.append(f"\n{severity.value.upper()} ({len(severity_anomalies)}):")
                    for anomaly in severity_anomalies:
                        lines.append(f"  • {anomaly.description}")
        
        lines.append("\n" + "=" * 80)
        return "\n".join(lines)
    
    def _generate_markdown_report(self, title: str) -> str:
        """Generate Markdown format report."""
        lines = [
            f"# {title}",
            "",
            f"**Generated:** {self.report_metadata['created_at']}",
            "",
            "## Executive Summary",
            ""
        ]
        
        # Add executive summary
        summary = self._generate_executive_summary()
        lines.append(summary['overview'])
        lines.extend([
            "",
            f"- **Total Sections:** {len(self.sections)}",
            f"- **Critical Anomalies:** {summary['critical_anomalies']}",
            f"- **Total Anomalies:** {summary['total_anomalies']}",
            ""
        ])
        
        # Add table of contents
        lines.extend([
            "## Table of Contents",
            ""
        ])
        for i, section in enumerate(self.sections, 1):
            lines.append(f"{i}. [{section.title}](#{section.title.lower().replace(' ', '-')})")
        lines.append("")
        
        # Add each section
        for section in self.sections:
            lines.extend([
                f"## {section.title}",
                "",
                f"**Timestamp:** {section.timestamp}",
                "",
                section.summary,
                ""
            ])
            
            if section.anomalies:
                lines.append("### Anomalies Detected")
                lines.append("")
                for anomaly in section.anomalies:
                    emoji = "🔴" if anomaly.severity == SeverityLevel.CRITICAL else "⚠️" if anomaly.severity == SeverityLevel.ERROR else "ℹ️"
                    lines.append(f"{emoji} **[{anomaly.severity.value.upper()}]** {anomaly.description}")
                lines.append("")
            
            if section.recommendations:
                lines.append("### Recommendations")
                lines.append("")
                for rec in section.recommendations[:5]:
                    lines.append(f"- {rec}")
                lines.append("")
        
        # Add anomaly summary
        if self.anomalies:
            lines.extend([
                "## All Anomalies Summary",
                ""
            ])
            
            for severity in [SeverityLevel.CRITICAL, SeverityLevel.ERROR, SeverityLevel.WARNING]:
                severity_anomalies = [a for a in self.anomalies if a.severity == severity]
                if severity_anomalies:
                    lines.append(f"### {severity.value.upper()} ({len(severity_anomalies)})")
                    lines.append("")
                    for anomaly in severity_anomalies:
                        lines.append(f"- {anomaly.description}")
                    lines.append("")
        
        return "\n".join(lines)
    
    def _generate_html_report(self, title: str) -> str:
        """Generate HTML format report."""
        # Basic HTML structure
        html = f"""<!DOCTYPE html>
<html>
<head>
    <title>{title}</title>
    <style>
        body {{ font-family: Arial, sans-serif; margin: 20px; line-height: 1.6; }}
        h1 {{ color: #333; border-bottom: 3px solid #4CAF50; padding-bottom: 10px; }}
        h2 {{ color: #555; border-bottom: 2px solid #ddd; padding-bottom: 5px; margin-top: 30px; }}
        h3 {{ color: #666; }}
        .summary {{ background: #f9f9f9; padding: 15px; border-left: 4px solid #4CAF50; margin: 20px 0; }}
        .section {{ margin: 30px 0; padding: 20px; border: 1px solid #ddd; border-radius: 5px; }}
        .anomaly {{ padding: 10px; margin: 10px 0; border-left: 4px solid; border-radius: 3px; }}
        .critical {{ background: #ffebee; border-color: #d32f2f; }}
        .error {{ background: #fff3e0; border-color: #f57c00; }}
        .warning {{ background: #fff9c4; border-color: #fbc02d; }}
        .info {{ background: #e3f2fd; border-color: #1976d2; }}
        .recommendations {{ background: #e8f5e9; padding: 15px; border-radius: 5px; margin: 15px 0; }}
        .recommendations ul {{ margin: 10px 0; }}
        .timestamp {{ color: #999; font-size: 0.9em; }}
    </style>
</head>
<body>
    <h1>{title}</h1>
    <p class="timestamp">Generated: {self.report_metadata['created_at']}</p>
"""
        
        # Executive summary
        summary = self._generate_executive_summary()
        html += f"""
    <div class="summary">
        <h2>Executive Summary</h2>
        <p>{summary['overview']}</p>
        <ul>
            <li><strong>Total Sections:</strong> {len(self.sections)}</li>
            <li><strong>Critical Anomalies:</strong> {summary['critical_anomalies']}</li>
            <li><strong>Total Anomalies:</strong> {summary['total_anomalies']}</li>
        </ul>
    </div>
"""
        
        # Sections
        for section in self.sections:
            html += f"""
    <div class="section">
        <h2>{section.title}</h2>
        <p class="timestamp">{section.timestamp}</p>
        <p>{section.summary}</p>
"""
            
            if section.anomalies:
                html += "<h3>Anomalies Detected</h3>"
                for anomaly in section.anomalies:
                    severity_class = anomaly.severity.value
                    html += f"""
        <div class="anomaly {severity_class}">
            <strong>[{anomaly.severity.value.upper()}]</strong> {anomaly.description}
        </div>
"""
            
            if section.recommendations:
                html += """
        <div class="recommendations">
            <h3>Recommendations</h3>
            <ul>
"""
                for rec in section.recommendations[:5]:
                    html += f"                <li>{rec}</li>\n"
                html += """
            </ul>
        </div>
"""
            
            html += "    </div>\n"
        
        html += """
</body>
</html>
"""
        return html
    
    def _generate_executive_summary(self) -> Dict[str, Any]:
        """Generate executive summary of the report."""
        critical_count = sum(1 for a in self.anomalies if a.severity == SeverityLevel.CRITICAL)
        error_count = sum(1 for a in self.anomalies if a.severity == SeverityLevel.ERROR)
        warning_count = sum(1 for a in self.anomalies if a.severity == SeverityLevel.WARNING)
        
        overview = f"Analysis completed with {len(self.sections)} sections. "
        
        if critical_count > 0:
            overview += f"CRITICAL: {critical_count} critical issues require immediate attention. "
        if error_count > 0:
            overview += f"{error_count} errors detected. "
        if warning_count > 0:
            overview += f"{warning_count} warnings flagged. "
        
        if critical_count == 0 and error_count == 0:
            overview += "Overall system health is good."
        
        return {
            'overview': overview,
            'total_anomalies': len(self.anomalies),
            'critical_anomalies': critical_count,
            'error_anomalies': error_count,
            'warning_anomalies': warning_count,
            'sections_analyzed': len(self.sections)
        }
    
    def _anomaly_to_dict(self, anomaly: Anomaly) -> Dict[str, Any]:
        """Convert Anomaly to dictionary."""
        return {
            'category': anomaly.category,
            'severity': anomaly.severity.value,
            'description': anomaly.description,
            'detected_at': anomaly.detected_at,
            'affected_metric': anomaly.affected_metric,
            'expected_value': anomaly.expected_value,
            'actual_value': anomaly.actual_value,
            'recommendations': anomaly.recommendations,
            'metadata': anomaly.metadata
        }
