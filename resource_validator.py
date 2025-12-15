"""
Resource Validation Module

This module provides validation tools for storage and compute resource claims.
It ensures that billed resources align with actual usage and provides detailed
analysis for discrepancies.
"""

import json
import math
from dataclasses import dataclass, field
from datetime import datetime
from typing import Dict, List, Any, Optional, Tuple
from enum import Enum


class ResourceType(Enum):
    """Types of resources that can be validated."""
    STORAGE = "storage"
    COMPUTE = "compute"
    BANDWIDTH = "bandwidth"
    API_CALLS = "api_calls"
    AI_INFERENCE = "ai_inference"


class ValidationStatus(Enum):
    """Status of resource validation."""
    VALID = "valid"
    WARNING = "warning"
    DISCREPANCY = "discrepancy"
    CRITICAL = "critical"


@dataclass
class ResourceClaim:
    """Represents a claimed resource usage."""
    resource_type: ResourceType
    claimed_amount: float
    unit: str
    billing_period_start: str
    billing_period_end: str
    cost: float
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class ResourceUsage:
    """Represents actual measured resource usage."""
    resource_type: ResourceType
    actual_amount: float
    unit: str
    measurement_period_start: str
    measurement_period_end: str
    samples_count: int
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class ValidationResult:
    """Result of resource validation."""
    resource_type: ResourceType
    status: ValidationStatus
    claimed: float
    actual: float
    variance: float
    variance_percent: float
    is_over_billed: bool
    is_under_billed: bool
    discrepancy_cost: float
    recommendations: List[str]
    timestamp: str
    details: Dict[str, Any] = field(default_factory=dict)


class ResourceValidator:
    """
    Validates storage and compute resource claims against actual usage.
    
    This class provides methods to compare billed resources with actual usage,
    detect discrepancies, and generate recommendations for optimization.
    """
    
    # Validation thresholds (percentages)
    WARNING_THRESHOLD = 5.0  # 5% variance triggers warning
    DISCREPANCY_THRESHOLD = 10.0  # 10% variance is a discrepancy
    CRITICAL_THRESHOLD = 25.0  # 25% variance is critical
    
    def __init__(self, tolerance_percent: float = 5.0):
        """
        Initialize the resource validator.
        
        :param tolerance_percent: Acceptable variance percentage before flagging.
        """
        self.tolerance_percent = tolerance_percent
        self.validation_history: List[ValidationResult] = []
    
    def validate_storage(
        self,
        claim: ResourceClaim,
        usage: ResourceUsage
    ) -> ValidationResult:
        """
        Validate storage resource claims against actual usage.
        
        :param claim: The claimed storage usage.
        :param usage: The actual measured storage usage.
        :returns: ValidationResult with analysis.
        """
        if claim.resource_type != ResourceType.STORAGE:
            raise ValueError("Claim must be of type STORAGE")
        if usage.resource_type != ResourceType.STORAGE:
            raise ValueError("Usage must be of type STORAGE")
        
        # Normalize units if needed (both should be in same unit)
        claimed_normalized = self._normalize_storage(claim.claimed_amount, claim.unit)
        actual_normalized = self._normalize_storage(usage.actual_amount, usage.unit)
        
        # Calculate variance
        variance = claimed_normalized - actual_normalized
        variance_percent = (variance / claimed_normalized * 100) if claimed_normalized > 0 else 0
        
        # Determine status
        status = self._determine_status(abs(variance_percent))
        
        # Check over/under billing
        is_over_billed = variance < 0  # Billed less than used
        is_under_billed = variance > 0  # Billed more than used
        
        # Calculate discrepancy cost
        cost_per_unit = claim.cost / claimed_normalized if claimed_normalized > 0 else 0
        discrepancy_cost = abs(variance) * cost_per_unit
        
        # Generate recommendations
        recommendations = self._generate_storage_recommendations(
            variance_percent, is_over_billed, is_under_billed, claimed_normalized, actual_normalized
        )
        
        result = ValidationResult(
            resource_type=ResourceType.STORAGE,
            status=status,
            claimed=claimed_normalized,
            actual=actual_normalized,
            variance=variance,
            variance_percent=variance_percent,
            is_over_billed=is_over_billed,
            is_under_billed=is_under_billed,
            discrepancy_cost=discrepancy_cost,
            recommendations=recommendations,
            timestamp=datetime.now().isoformat(),
            details={
                'claim_period': f"{claim.billing_period_start} to {claim.billing_period_end}",
                'usage_period': f"{usage.measurement_period_start} to {usage.measurement_period_end}",
                'samples_count': usage.samples_count,
                'unit': 'GB',
                'cost_per_gb': cost_per_unit
            }
        )
        
        self.validation_history.append(result)
        return result
    
    def validate_compute(
        self,
        claim: ResourceClaim,
        usage: ResourceUsage
    ) -> ValidationResult:
        """
        Validate compute resource claims against actual usage.
        
        :param claim: The claimed compute usage.
        :param usage: The actual measured compute usage.
        :returns: ValidationResult with analysis.
        """
        if claim.resource_type != ResourceType.COMPUTE:
            raise ValueError("Claim must be of type COMPUTE")
        if usage.resource_type != ResourceType.COMPUTE:
            raise ValueError("Usage must be of type COMPUTE")
        
        # Normalize units (convert to CPU-hours)
        claimed_normalized = self._normalize_compute(claim.claimed_amount, claim.unit)
        actual_normalized = self._normalize_compute(usage.actual_amount, usage.unit)
        
        # Calculate variance
        variance = claimed_normalized - actual_normalized
        variance_percent = (variance / claimed_normalized * 100) if claimed_normalized > 0 else 0
        
        # Determine status
        status = self._determine_status(abs(variance_percent))
        
        # Check over/under billing
        is_over_billed = variance < 0
        is_under_billed = variance > 0
        
        # Calculate discrepancy cost
        cost_per_unit = claim.cost / claimed_normalized if claimed_normalized > 0 else 0
        discrepancy_cost = abs(variance) * cost_per_unit
        
        # Generate recommendations
        recommendations = self._generate_compute_recommendations(
            variance_percent, is_over_billed, is_under_billed, claimed_normalized, actual_normalized
        )
        
        result = ValidationResult(
            resource_type=ResourceType.COMPUTE,
            status=status,
            claimed=claimed_normalized,
            actual=actual_normalized,
            variance=variance,
            variance_percent=variance_percent,
            is_over_billed=is_over_billed,
            is_under_billed=is_under_billed,
            discrepancy_cost=discrepancy_cost,
            recommendations=recommendations,
            timestamp=datetime.now().isoformat(),
            details={
                'claim_period': f"{claim.billing_period_start} to {claim.billing_period_end}",
                'usage_period': f"{usage.measurement_period_start} to {usage.measurement_period_end}",
                'samples_count': usage.samples_count,
                'unit': 'CPU-hours',
                'cost_per_cpu_hour': cost_per_unit
            }
        )
        
        self.validation_history.append(result)
        return result
    
    def _normalize_storage(self, amount: float, unit: str) -> float:
        """Normalize storage to GB."""
        unit_lower = unit.lower()
        if unit_lower in ['gb', 'gigabyte', 'gigabytes']:
            return amount
        elif unit_lower in ['mb', 'megabyte', 'megabytes']:
            return amount / 1024
        elif unit_lower in ['tb', 'terabyte', 'terabytes']:
            return amount * 1024
        elif unit_lower in ['kb', 'kilobyte', 'kilobytes']:
            return amount / (1024 * 1024)
        else:
            return amount  # Assume GB if unknown
    
    def _normalize_compute(self, amount: float, unit: str) -> float:
        """Normalize compute to CPU-hours."""
        unit_lower = unit.lower()
        if unit_lower in ['cpu-hours', 'cpu_hours', 'cpuhours']:
            return amount
        elif unit_lower in ['cpu-minutes', 'cpu_minutes']:
            return amount / 60
        elif unit_lower in ['cpu-seconds', 'cpu_seconds']:
            return amount / 3600
        elif unit_lower in ['vcpu-hours', 'vcpu_hours']:
            return amount  # Treat vCPU same as CPU for now
        else:
            return amount  # Assume CPU-hours if unknown
    
    def _determine_status(self, variance_percent: float) -> ValidationStatus:
        """Determine validation status based on variance percentage."""
        if variance_percent < self.WARNING_THRESHOLD:
            return ValidationStatus.VALID
        elif variance_percent < self.DISCREPANCY_THRESHOLD:
            return ValidationStatus.WARNING
        elif variance_percent < self.CRITICAL_THRESHOLD:
            return ValidationStatus.DISCREPANCY
        else:
            return ValidationStatus.CRITICAL
    
    def _generate_storage_recommendations(
        self,
        variance_percent: float,
        is_over_billed: bool,
        is_under_billed: bool,
        claimed: float,
        actual: float
    ) -> List[str]:
        """Generate recommendations for storage validation."""
        recommendations = []
        
        if abs(variance_percent) < self.WARNING_THRESHOLD:
            recommendations.append("Storage billing is accurate within tolerance.")
            recommendations.append("Continue monitoring storage usage trends.")
        elif is_over_billed:
            recommendations.append(f"ALERT: Under-billing detected! Actual usage ({actual:.2f} GB) exceeds claimed ({claimed:.2f} GB).")
            recommendations.append("Review storage monitoring systems for accuracy.")
            recommendations.append("Adjust billing to reflect actual usage.")
        elif is_under_billed:
            recommendations.append(f"Over-billing detected: Claimed ({claimed:.2f} GB) exceeds actual usage ({actual:.2f} GB).")
            recommendations.append("Opportunity to reduce costs by rightsizing storage allocation.")
            recommendations.append("Implement storage cleanup policies for unused data.")
            recommendations.append("Consider tiered storage for archival data.")
        
        return recommendations
    
    def _generate_compute_recommendations(
        self,
        variance_percent: float,
        is_over_billed: bool,
        is_under_billed: bool,
        claimed: float,
        actual: float
    ) -> List[str]:
        """Generate recommendations for compute validation."""
        recommendations = []
        
        if abs(variance_percent) < self.WARNING_THRESHOLD:
            recommendations.append("Compute billing is accurate within tolerance.")
            recommendations.append("Maintain current resource monitoring practices.")
        elif is_over_billed:
            recommendations.append(f"ALERT: Under-billing detected! Actual usage ({actual:.2f} CPU-hours) exceeds claimed ({claimed:.2f} CPU-hours).")
            recommendations.append("Review compute metering systems immediately.")
            recommendations.append("Verify all workloads are properly tracked.")
        elif is_under_billed:
            recommendations.append(f"Over-billing detected: Claimed ({claimed:.2f} CPU-hours) exceeds actual usage ({actual:.2f} CPU-hours).")
            recommendations.append("Opportunity to reduce costs by optimizing resource allocation.")
            recommendations.append("Consider auto-scaling policies to match actual demand.")
            recommendations.append("Review and terminate idle instances.")
        
        return recommendations
    
    def batch_validate(
        self,
        claims: List[ResourceClaim],
        usages: List[ResourceUsage]
    ) -> Dict[str, Any]:
        """
        Validate multiple resource claims against usage data.
        
        :param claims: List of resource claims.
        :param usages: List of resource usage measurements.
        :returns: Dictionary with batch validation results.
        """
        results = []
        
        # Match claims with usages by resource type
        for claim in claims:
            matching_usage = next(
                (u for u in usages if u.resource_type == claim.resource_type),
                None
            )
            
            if matching_usage:
                if claim.resource_type == ResourceType.STORAGE:
                    result = self.validate_storage(claim, matching_usage)
                elif claim.resource_type == ResourceType.COMPUTE:
                    result = self.validate_compute(claim, matching_usage)
                else:
                    continue  # Skip unsupported types for now
                
                results.append(result)
        
        # Calculate summary statistics
        total_discrepancy_cost = sum(r.discrepancy_cost for r in results)
        critical_count = sum(1 for r in results if r.status == ValidationStatus.CRITICAL)
        discrepancy_count = sum(1 for r in results if r.status == ValidationStatus.DISCREPANCY)
        warning_count = sum(1 for r in results if r.status == ValidationStatus.WARNING)
        valid_count = sum(1 for r in results if r.status == ValidationStatus.VALID)
        
        return {
            'timestamp': datetime.now().isoformat(),
            'total_resources_validated': len(results),
            'summary': {
                'valid': valid_count,
                'warnings': warning_count,
                'discrepancies': discrepancy_count,
                'critical': critical_count,
                'total_discrepancy_cost': round(total_discrepancy_cost, 2)
            },
            'results': [self._result_to_dict(r) for r in results],
            'overall_status': 'critical' if critical_count > 0 else 
                            'discrepancy' if discrepancy_count > 0 else
                            'warning' if warning_count > 0 else 'valid'
        }
    
    def _result_to_dict(self, result: ValidationResult) -> Dict[str, Any]:
        """Convert ValidationResult to dictionary."""
        return {
            'resource_type': result.resource_type.value,
            'status': result.status.value,
            'claimed': round(result.claimed, 4),
            'actual': round(result.actual, 4),
            'variance': round(result.variance, 4),
            'variance_percent': round(result.variance_percent, 2),
            'is_over_billed': result.is_over_billed,
            'is_under_billed': result.is_under_billed,
            'discrepancy_cost': round(result.discrepancy_cost, 2),
            'recommendations': result.recommendations,
            'timestamp': result.timestamp,
            'details': result.details
        }
    
    def generate_validation_report(
        self,
        output_format: str = 'json'
    ) -> str:
        """
        Generate a comprehensive validation report from history.
        
        :param output_format: Format for the report ('json' or 'text').
        :returns: Formatted report string.
        """
        if not self.validation_history:
            return json.dumps({'message': 'No validation history available'}, indent=2)
        
        if output_format == 'json':
            return json.dumps({
                'report_timestamp': datetime.now().isoformat(),
                'total_validations': len(self.validation_history),
                'validations': [self._result_to_dict(r) for r in self.validation_history]
            }, indent=2)
        else:
            # Text format
            lines = [
                "=" * 80,
                "RESOURCE VALIDATION REPORT",
                "=" * 80,
                f"Generated: {datetime.now().isoformat()}",
                f"Total Validations: {len(self.validation_history)}",
                ""
            ]
            
            for i, result in enumerate(self.validation_history, 1):
                lines.extend([
                    f"\nValidation #{i}: {result.resource_type.value.upper()}",
                    "-" * 80,
                    f"Status: {result.status.value.upper()}",
                    f"Claimed: {result.claimed:.4f} {result.details.get('unit', 'units')}",
                    f"Actual: {result.actual:.4f} {result.details.get('unit', 'units')}",
                    f"Variance: {result.variance:+.4f} ({result.variance_percent:+.2f}%)",
                    f"Discrepancy Cost: ${result.discrepancy_cost:.2f}",
                    f"Over-billed: {result.is_over_billed}",
                    f"Under-billed: {result.is_under_billed}",
                    "\nRecommendations:"
                ])
                for rec in result.recommendations:
                    lines.append(f"  • {rec}")
            
            lines.append("\n" + "=" * 80)
            return "\n".join(lines)
