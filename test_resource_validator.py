"""
Tests for Resource Validation Module

Run with: python -m pytest test_resource_validator.py -v
"""

import pytest
from datetime import datetime
from resource_validator import (
    ResourceValidator,
    ResourceClaim,
    ResourceUsage,
    ResourceType,
    ValidationStatus
)


class TestResourceValidator:
    """Test suite for ResourceValidator class."""
    
    def test_validate_storage_exact_match(self):
        """Test storage validation with exact match."""
        validator = ResourceValidator(tolerance_percent=5.0)
        
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
            actual_amount=1000.0,
            unit="GB",
            measurement_period_start="2024-01-01",
            measurement_period_end="2024-01-31",
            samples_count=744
        )
        
        result = validator.validate_storage(claim, usage)
        
        assert result.status == ValidationStatus.VALID
        assert result.variance == 0.0
        assert result.variance_percent == 0.0
        assert not result.is_over_billed
        assert not result.is_under_billed
    
    def test_validate_storage_under_billing(self):
        """Test storage validation with under-billing (actual > claimed)."""
        validator = ResourceValidator(tolerance_percent=5.0)
        
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
            actual_amount=1200.0,  # 20% more than claimed
            unit="GB",
            measurement_period_start="2024-01-01",
            measurement_period_end="2024-01-31",
            samples_count=744
        )
        
        result = validator.validate_storage(claim, usage)
        
        assert result.status == ValidationStatus.DISCREPANCY
        assert result.variance < 0  # Negative variance means under-billing
        assert result.is_over_billed  # Using more than billed
        assert not result.is_under_billed
        assert result.discrepancy_cost > 0
    
    def test_validate_storage_over_billing(self):
        """Test storage validation with over-billing (actual < claimed)."""
        validator = ResourceValidator(tolerance_percent=5.0)
        
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
            actual_amount=800.0,  # 20% less than claimed
            unit="GB",
            measurement_period_start="2024-01-01",
            measurement_period_end="2024-01-31",
            samples_count=744
        )
        
        result = validator.validate_storage(claim, usage)
        
        assert result.status == ValidationStatus.DISCREPANCY
        assert result.variance > 0  # Positive variance means over-billing
        assert not result.is_over_billed
        assert result.is_under_billed  # Billed more than used
        assert result.discrepancy_cost > 0
    
    def test_validate_compute_resources(self):
        """Test compute resource validation."""
        validator = ResourceValidator(tolerance_percent=5.0)
        
        claim = ResourceClaim(
            resource_type=ResourceType.COMPUTE,
            claimed_amount=500.0,
            unit="CPU-hours",
            billing_period_start="2024-01-01",
            billing_period_end="2024-01-31",
            cost=48.00
        )
        
        usage = ResourceUsage(
            resource_type=ResourceType.COMPUTE,
            actual_amount=525.0,  # 5% more
            unit="CPU-hours",
            measurement_period_start="2024-01-01",
            measurement_period_end="2024-01-31",
            samples_count=500
        )
        
        result = validator.validate_compute(claim, usage)
        
        assert result.status == ValidationStatus.WARNING  # Just at threshold
        assert result.resource_type == ResourceType.COMPUTE
        assert result.variance < 0
    
    def test_unit_normalization_storage(self):
        """Test storage unit normalization."""
        validator = ResourceValidator()
        
        # Test GB to GB
        assert validator._normalize_storage(1000, "GB") == 1000
        
        # Test TB to GB
        assert validator._normalize_storage(1, "TB") == 1024
        
        # Test MB to GB
        assert validator._normalize_storage(1024, "MB") == 1
    
    def test_unit_normalization_compute(self):
        """Test compute unit normalization."""
        validator = ResourceValidator()
        
        # Test CPU-hours
        assert validator._normalize_compute(100, "CPU-hours") == 100
        
        # Test CPU-minutes to hours
        assert validator._normalize_compute(60, "CPU-minutes") == 1
        
        # Test CPU-seconds to hours
        assert validator._normalize_compute(3600, "CPU-seconds") == 1
    
    def test_batch_validation(self):
        """Test batch validation of multiple resources."""
        validator = ResourceValidator(tolerance_percent=5.0)
        
        claims = [
            ResourceClaim(
                resource_type=ResourceType.STORAGE,
                claimed_amount=1000.0,
                unit="GB",
                billing_period_start="2024-01-01",
                billing_period_end="2024-01-31",
                cost=23.00
            ),
            ResourceClaim(
                resource_type=ResourceType.COMPUTE,
                claimed_amount=500.0,
                unit="CPU-hours",
                billing_period_start="2024-01-01",
                billing_period_end="2024-01-31",
                cost=48.00
            )
        ]
        
        usages = [
            ResourceUsage(
                resource_type=ResourceType.STORAGE,
                actual_amount=1000.0,
                unit="GB",
                measurement_period_start="2024-01-01",
                measurement_period_end="2024-01-31",
                samples_count=744
            ),
            ResourceUsage(
                resource_type=ResourceType.COMPUTE,
                actual_amount=500.0,
                unit="CPU-hours",
                measurement_period_start="2024-01-01",
                measurement_period_end="2024-01-31",
                samples_count=500
            )
        ]
        
        results = validator.batch_validate(claims, usages)
        
        assert results['total_resources_validated'] == 2
        assert results['summary']['valid'] == 2
        assert results['summary']['total_discrepancy_cost'] == 0.0
        assert results['overall_status'] == 'valid'
    
    def test_validation_recommendations(self):
        """Test that recommendations are generated."""
        validator = ResourceValidator(tolerance_percent=5.0)
        
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
            actual_amount=700.0,  # Significant over-billing
            unit="GB",
            measurement_period_start="2024-01-01",
            measurement_period_end="2024-01-31",
            samples_count=744
        )
        
        result = validator.validate_storage(claim, usage)
        
        assert len(result.recommendations) > 0
        assert any("over-billing" in rec.lower() for rec in result.recommendations)
    
    def test_validation_history(self):
        """Test that validation history is maintained."""
        validator = ResourceValidator()
        
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
            actual_amount=1000.0,
            unit="GB",
            measurement_period_start="2024-01-01",
            measurement_period_end="2024-01-31",
            samples_count=744
        )
        
        assert len(validator.validation_history) == 0
        
        validator.validate_storage(claim, usage)
        
        assert len(validator.validation_history) == 1
        assert validator.validation_history[0].resource_type == ResourceType.STORAGE
    
    def test_validation_report_generation(self):
        """Test report generation."""
        validator = ResourceValidator()
        
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
            actual_amount=1000.0,
            unit="GB",
            measurement_period_start="2024-01-01",
            measurement_period_end="2024-01-31",
            samples_count=744
        )
        
        validator.validate_storage(claim, usage)
        
        # Test JSON report
        json_report = validator.generate_validation_report(output_format='json')
        assert 'report_timestamp' in json_report
        assert 'validations' in json_report
        
        # Test text report
        text_report = validator.generate_validation_report(output_format='text')
        assert 'RESOURCE VALIDATION REPORT' in text_report
        assert 'STORAGE' in text_report


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
