"""
Tests for Micro-Macro Analyzer Module

Run with: python -m pytest test_micro_macro_analyzer.py -v
"""

import pytest
from micro_macro_analyzer import (
    MicroMacroAnalyzer,
    UserResourceMetrics,
    ScaleLevel
)


class TestMicroMacroAnalyzer:
    """Test suite for MicroMacroAnalyzer class."""
    
    def test_add_user_sample(self):
        """Test adding user samples."""
        analyzer = MicroMacroAnalyzer()
        
        metrics = UserResourceMetrics(
            user_id="user_001",
            storage_gb=5.0,
            compute_hours=1.0,
            bandwidth_gb=10.0,
            api_calls=1000,
            ai_inference_tokens=50000,
            cost_per_month=10.0,
            tier="basic",
            active_days=30
        )
        
        assert len(analyzer.user_samples) == 0
        analyzer.add_user_sample(metrics)
        assert len(analyzer.user_samples) == 1
    
    def test_calculate_average_user_profile(self):
        """Test average user profile calculation."""
        analyzer = MicroMacroAnalyzer()
        
        # Add multiple users
        analyzer.add_user_sample(UserResourceMetrics(
            user_id="user_001",
            storage_gb=5.0,
            compute_hours=1.0,
            bandwidth_gb=10.0,
            api_calls=1000,
            ai_inference_tokens=50000,
            cost_per_month=10.0,
            tier="basic",
            active_days=30
        ))
        
        analyzer.add_user_sample(UserResourceMetrics(
            user_id="user_002",
            storage_gb=15.0,
            compute_hours=3.0,
            bandwidth_gb=30.0,
            api_calls=3000,
            ai_inference_tokens=150000,
            cost_per_month=30.0,
            tier="professional",
            active_days=30
        ))
        
        avg = analyzer.calculate_average_user_profile()
        
        assert avg.storage_gb == 10.0
        assert avg.compute_hours == 2.0
        assert avg.bandwidth_gb == 20.0
        assert avg.api_calls == 2000
        assert avg.ai_inference_tokens == 100000
        assert avg.cost_per_month == 20.0
    
    def test_project_to_single_user(self):
        """Test projection to single user scale."""
        analyzer = MicroMacroAnalyzer()
        
        analyzer.add_user_sample(UserResourceMetrics(
            user_id="user_001",
            storage_gb=5.0,
            compute_hours=1.0,
            bandwidth_gb=10.0,
            api_calls=1000,
            ai_inference_tokens=50000,
            cost_per_month=10.0,
            tier="basic",
            active_days=30
        ))
        
        projection = analyzer.project_to_scale(1)
        
        assert projection.user_count == 1
        assert projection.scale_level == ScaleLevel.SINGLE_USER
        assert projection.scaling_efficiency == 1.0
        assert projection.total_storage_gb == 5.0
        assert projection.total_compute_hours == 1.0
    
    def test_project_to_thousand_users(self):
        """Test projection to 1000 users."""
        analyzer = MicroMacroAnalyzer()
        
        analyzer.add_user_sample(UserResourceMetrics(
            user_id="user_001",
            storage_gb=5.0,
            compute_hours=1.0,
            bandwidth_gb=10.0,
            api_calls=1000,
            ai_inference_tokens=50000,
            cost_per_month=10.0,
            tier="basic",
            active_days=30
        ))
        
        projection = analyzer.project_to_scale(1000)
        
        assert projection.user_count == 1000
        assert projection.scale_level == ScaleLevel.THOUSAND_USERS
        assert projection.scaling_efficiency < 1.0  # Should have efficiency gains
        assert projection.monthly_cost > 0
        assert projection.annual_cost == projection.monthly_cost * 12
    
    def test_project_to_million_users(self):
        """Test projection to 1 million users."""
        analyzer = MicroMacroAnalyzer()
        
        analyzer.add_user_sample(UserResourceMetrics(
            user_id="user_001",
            storage_gb=5.0,
            compute_hours=1.0,
            bandwidth_gb=10.0,
            api_calls=1000,
            ai_inference_tokens=50000,
            cost_per_month=10.0,
            tier="basic",
            active_days=30
        ))
        
        projection = analyzer.project_to_scale(1_000_000)
        
        assert projection.user_count == 1_000_000
        assert projection.scale_level == ScaleLevel.MILLION_USERS
        assert projection.scaling_efficiency == analyzer.SCALE_1M_EFFICIENCY
        assert projection.monthly_cost > 0
        
        # Check infrastructure requirements are calculated
        assert 'compute_instances' in projection.infrastructure_requirements
        assert 'storage_nodes' in projection.infrastructure_requirements
        assert projection.infrastructure_requirements['compute_instances'] > 0
    
    def test_scaling_efficiency_decreases_with_scale(self):
        """Test that scaling efficiency improves (coefficient decreases) with scale."""
        analyzer = MicroMacroAnalyzer()
        
        analyzer.add_user_sample(UserResourceMetrics(
            user_id="user_001",
            storage_gb=5.0,
            compute_hours=1.0,
            bandwidth_gb=10.0,
            api_calls=1000,
            ai_inference_tokens=50000,
            cost_per_month=10.0,
            tier="basic",
            active_days=30
        ))
        
        proj_100 = analyzer.project_to_scale(100)
        proj_1k = analyzer.project_to_scale(1000)
        proj_1m = analyzer.project_to_scale(1_000_000)
        
        # Efficiency coefficient should decrease (more efficient) at larger scales
        assert proj_100.scaling_efficiency > proj_1k.scaling_efficiency
        assert proj_1k.scaling_efficiency > proj_1m.scaling_efficiency
    
    def test_project_multiple_scales(self):
        """Test projection across multiple scales."""
        analyzer = MicroMacroAnalyzer()
        
        analyzer.add_user_sample(UserResourceMetrics(
            user_id="user_001",
            storage_gb=5.0,
            compute_hours=1.0,
            bandwidth_gb=10.0,
            api_calls=1000,
            ai_inference_tokens=50000,
            cost_per_month=10.0,
            tier="basic",
            active_days=30
        ))
        
        projections = analyzer.project_multiple_scales()
        
        assert len(projections) == 7  # 1, 100, 1K, 10K, 100K, 1M, 10M
        
        # Verify projections are in ascending order
        for i in range(len(projections) - 1):
            assert projections[i].user_count < projections[i + 1].user_count
    
    def test_infrastructure_requirements(self):
        """Test infrastructure requirements calculation."""
        analyzer = MicroMacroAnalyzer()
        
        analyzer.add_user_sample(UserResourceMetrics(
            user_id="user_001",
            storage_gb=5.0,
            compute_hours=1.0,
            bandwidth_gb=10.0,
            api_calls=1000,
            ai_inference_tokens=50000,
            cost_per_month=10.0,
            tier="basic",
            active_days=30
        ))
        
        projection = analyzer.project_to_scale(10_000)
        infra = projection.infrastructure_requirements
        
        assert 'compute_instances' in infra
        assert 'storage_nodes' in infra
        assert 'api_instances' in infra
        assert 'database_instances' in infra
        assert 'cdn_required' in infra
        assert 'caching_layer_required' in infra
        
        assert infra['compute_instances'] >= 1
        assert infra['storage_nodes'] >= 1
    
    def test_recommendations_generated(self):
        """Test that recommendations are generated at different scales."""
        analyzer = MicroMacroAnalyzer()
        
        analyzer.add_user_sample(UserResourceMetrics(
            user_id="user_001",
            storage_gb=5.0,
            compute_hours=1.0,
            bandwidth_gb=10.0,
            api_calls=1000,
            ai_inference_tokens=50000,
            cost_per_month=10.0,
            tier="basic",
            active_days=30
        ))
        
        proj_small = analyzer.project_to_scale(100)
        proj_large = analyzer.project_to_scale(1_000_000)
        
        # Both should have recommendations
        assert len(proj_small.recommendations) > 0
        assert len(proj_large.recommendations) > 0
        
        # Large scale should have more sophisticated recommendations
        assert len(proj_large.recommendations) >= len(proj_small.recommendations)
    
    def test_scaling_report_generation(self):
        """Test scaling report generation."""
        analyzer = MicroMacroAnalyzer()
        
        analyzer.add_user_sample(UserResourceMetrics(
            user_id="user_001",
            storage_gb=5.0,
            compute_hours=1.0,
            bandwidth_gb=10.0,
            api_calls=1000,
            ai_inference_tokens=50000,
            cost_per_month=10.0,
            tier="basic",
            active_days=30
        ))
        
        report = analyzer.generate_scaling_report()
        
        assert 'timestamp' in report
        assert 'sample_size' in report
        assert 'average_user_profile' in report
        assert 'scale_projections' in report
        assert 'growth_analysis' in report
        assert 'executive_summary' in report
        
        assert report['sample_size'] == 1
        assert len(report['scale_projections']) > 0
    
    def test_cost_calculation(self):
        """Test that costs are calculated correctly."""
        analyzer = MicroMacroAnalyzer()
        
        analyzer.add_user_sample(UserResourceMetrics(
            user_id="user_001",
            storage_gb=10.0,
            compute_hours=1.0,
            bandwidth_gb=10.0,
            api_calls=1000,
            ai_inference_tokens=1_000_000,
            cost_per_month=0.0,
            tier="free",
            active_days=30
        ))
        
        projection = analyzer.project_to_scale(1000)
        
        # Cost should be positive
        assert projection.monthly_cost > 0
        assert projection.annual_cost > 0
        
        # Annual should be 12x monthly
        assert abs(projection.annual_cost - (projection.monthly_cost * 12)) < 0.01


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
