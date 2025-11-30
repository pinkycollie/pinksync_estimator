"""
Tests for the Universal PinkSync Estimator Framework

This module contains comprehensive tests for the UniversalPinkSyncEstimator class,
covering industry-agnostic modeling, AI inference costs, user management, project
delivery metrics, risk assessment, and cross-industry benchmarking.
"""

import pytest
from universal_estimator import (
    UniversalPinkSyncEstimator,
    Industry,
    UserTier,
    RiskLevel,
    IndustryConfig,
    AIInferenceMetrics,
    UserManagementMetrics,
    ProjectDeliveryMetrics,
    DEFAULT_INDUSTRY_CONFIGS,
    USER_TIER_CONFIGS,
)


class TestUniversalPinkSyncEstimator:
    """Test cases for the UniversalPinkSyncEstimator class."""

    def test_initialization_default_industry(self):
        """Test that the estimator initializes with default industry (Technology)."""
        estimator = UniversalPinkSyncEstimator()
        assert estimator.industry == Industry.TECHNOLOGY
        assert estimator.industry_config.name == "Technology"

    def test_initialization_with_industry(self):
        """Test that the estimator initializes with a specified industry."""
        estimator = UniversalPinkSyncEstimator(industry=Industry.HEALTHCARE)
        assert estimator.industry == Industry.HEALTHCARE
        assert estimator.industry_config.name == "Healthcare"

    def test_set_industry(self):
        """Test changing the industry."""
        estimator = UniversalPinkSyncEstimator()
        estimator.set_industry(Industry.FINANCE)
        assert estimator.industry == Industry.FINANCE
        assert estimator.industry_config.name == "Finance"

    def test_set_custom_industry_config(self):
        """Test setting a custom industry configuration."""
        estimator = UniversalPinkSyncEstimator()
        custom_config = IndustryConfig(
            name="Custom Industry",
            compliance_multiplier=2.0,
            security_multiplier=2.0,
            operational_multiplier=2.0,
            data_sensitivity_level=5,
            regulatory_requirements=["Custom Reg 1", "Custom Reg 2"]
        )
        estimator.set_custom_industry_config(Industry.TECHNOLOGY, custom_config)
        assert estimator.industry_config.name == "Custom Industry"
        assert estimator.industry_config.total_multiplier == 8.0

    def test_get_industry_multiplier(self):
        """Test getting the industry multiplier."""
        estimator = UniversalPinkSyncEstimator(industry=Industry.TECHNOLOGY)
        multiplier = estimator.get_industry_multiplier()
        expected = 1.1 * 1.4 * 1.0  # Technology: compliance=1.1, security=1.4, operational=1.0
        assert multiplier == pytest.approx(expected, rel=1e-3)


class TestAIInferenceCosts:
    """Test cases for AI inference cost calculations."""

    def test_calculate_ai_inference_cost_basic(self):
        """Test basic AI inference cost calculation."""
        estimator = UniversalPinkSyncEstimator(industry=Industry.TECHNOLOGY)
        metrics = AIInferenceMetrics(
            input_tokens=1000,
            output_tokens=500,
            gpu_utilization_percent=50.0,
            memory_usage_gb=8.0,
            inference_time_ms=100.0,
            model_name="gpt-4"
        )
        
        result = estimator.calculate_ai_inference_cost(metrics)
        
        assert 'input_token_cost' in result
        assert 'output_token_cost' in result
        assert 'total_token_cost' in result
        assert 'gpu_cost' in result
        assert 'memory_cost' in result
        assert 'adjusted_cost' in result
        assert 'industry_multiplier' in result
        assert result['model_name'] == "gpt-4"
        assert result['tokens_processed'] == 1500

    def test_calculate_ai_inference_cost_with_industry_multiplier(self):
        """Test that AI costs are adjusted by industry multiplier."""
        tech_estimator = UniversalPinkSyncEstimator(industry=Industry.TECHNOLOGY)
        healthcare_estimator = UniversalPinkSyncEstimator(industry=Industry.HEALTHCARE)
        
        metrics = AIInferenceMetrics(
            input_tokens=1000,
            output_tokens=500,
            gpu_utilization_percent=50.0,
            memory_usage_gb=8.0,
            inference_time_ms=100.0,
            model_name="gpt-4"
        )
        
        tech_result = tech_estimator.calculate_ai_inference_cost(metrics)
        healthcare_result = healthcare_estimator.calculate_ai_inference_cost(metrics)
        
        # Healthcare should have higher adjusted cost due to higher multiplier
        assert healthcare_result['adjusted_cost'] > tech_result['adjusted_cost']
        assert healthcare_result['base_cost'] == tech_result['base_cost']

    def test_calculate_ai_efficiency_score_excellent(self):
        """Test AI efficiency score for excellent performance."""
        estimator = UniversalPinkSyncEstimator()
        result = estimator.calculate_ai_efficiency_score(
            accuracy=0.95,
            cost=0.5,
            speed_ms=500
        )
        
        assert result['grade'] == 'A'
        assert result['status'] == 'Excellent'
        assert result['total_score'] >= 90

    def test_calculate_ai_efficiency_score_poor(self):
        """Test AI efficiency score for poor performance."""
        estimator = UniversalPinkSyncEstimator()
        result = estimator.calculate_ai_efficiency_score(
            accuracy=0.5,
            cost=5.0,
            speed_ms=10000
        )
        
        assert result['total_score'] < 60
        assert len(result['recommendations']) > 0


class TestUserManagement:
    """Test cases for user management calculations."""

    def test_calculate_user_management_cost(self):
        """Test user management cost calculation."""
        estimator = UniversalPinkSyncEstimator()
        metrics = UserManagementMetrics(
            tier=UserTier.PROFESSIONAL,
            total_users=100,
            active_users=80,
            monthly_active_users=70,
            churn_rate=0.05,
            engagement_rate=0.75,
            feature_adoption_rate=0.60,
            cost_per_user=1.50
        )
        
        result = estimator.calculate_user_management_cost(metrics)
        
        assert result['tier'] == 'professional'
        assert result['total_users'] == 100
        assert result['active_users'] == 80
        assert 'total_monthly_cost' in result
        assert 'cost_per_active_user' in result
        assert 'tier_features' in result
        assert 'api_access' in result['tier_features']

    def test_calculate_user_engagement_score_healthy(self):
        """Test user engagement score for healthy metrics."""
        estimator = UniversalPinkSyncEstimator()
        metrics = UserManagementMetrics(
            tier=UserTier.PROFESSIONAL,
            total_users=100,
            active_users=85,
            monthly_active_users=80,
            churn_rate=0.02,
            engagement_rate=0.80,
            feature_adoption_rate=0.70,
            cost_per_user=1.50
        )
        
        result = estimator.calculate_user_engagement_score(metrics)
        
        assert result['health'] in ['Excellent', 'Good']
        assert result['total_score'] >= 60

    def test_calculate_user_engagement_score_at_risk(self):
        """Test user engagement score for at-risk metrics."""
        estimator = UniversalPinkSyncEstimator()
        metrics = UserManagementMetrics(
            tier=UserTier.FREE,
            total_users=100,
            active_users=20,
            monthly_active_users=10,
            churn_rate=0.20,
            engagement_rate=0.15,
            feature_adoption_rate=0.10,
            cost_per_user=0.0
        )
        
        result = estimator.calculate_user_engagement_score(metrics)
        
        assert result['health'] == 'At Risk'
        assert result['total_score'] < 40
        assert len(result['recommendations']) > 0


class TestProjectDelivery:
    """Test cases for project delivery calculations."""

    def test_calculate_project_delivery_cost(self):
        """Test project delivery cost calculation."""
        estimator = UniversalPinkSyncEstimator()
        metrics = ProjectDeliveryMetrics(
            team_size=5,
            team_cost_per_hour=75.0,
            budget_allocated=50000.0,
            budget_spent=40000.0,
            estimated_hours=500,
            actual_hours=480,
            completion_percentage=95.0,
            on_time_delivery=True,
            quality_score=90.0
        )
        
        result = estimator.calculate_project_delivery_cost(metrics)
        
        assert 'estimated_team_cost' in result
        assert 'actual_team_cost' in result
        assert 'budget_variance' in result
        assert 'time_efficiency_percent' in result
        assert result['on_time_delivery'] is True

    def test_calculate_delivery_performance_score(self):
        """Test delivery performance score calculation."""
        estimator = UniversalPinkSyncEstimator()
        metrics = ProjectDeliveryMetrics(
            team_size=5,
            team_cost_per_hour=75.0,
            budget_allocated=50000.0,
            budget_spent=40000.0,
            estimated_hours=500,
            actual_hours=480,
            completion_percentage=95.0,
            on_time_delivery=True,
            quality_score=90.0
        )
        
        result = estimator.calculate_delivery_performance_score(metrics)
        
        assert 'total_score' in result
        assert 'level' in result
        assert 'roi_percentage' in result
        assert result['on_time_bonus'] == 10

    def test_calculate_delivery_performance_score_overbudget(self):
        """Test delivery performance score when overbudget."""
        estimator = UniversalPinkSyncEstimator()
        metrics = ProjectDeliveryMetrics(
            team_size=5,
            team_cost_per_hour=75.0,
            budget_allocated=30000.0,
            budget_spent=45000.0,
            estimated_hours=400,
            actual_hours=600,
            completion_percentage=80.0,
            on_time_delivery=False,
            quality_score=60.0
        )
        
        result = estimator.calculate_delivery_performance_score(metrics)
        
        assert result['level'] in ['Needs Improvement', 'Satisfactory']
        assert len(result['recommendations']) > 0


class TestRiskAssessment:
    """Test cases for risk assessment."""

    def test_assess_risks_ai(self):
        """Test risk assessment for AI metrics."""
        estimator = UniversalPinkSyncEstimator()
        ai_metrics = AIInferenceMetrics(
            gpu_utilization_percent=95.0,
            memory_usage_gb=40.0,
            inference_time_ms=6000.0
        )
        
        result = estimator.assess_risks(ai_metrics=ai_metrics)
        
        assert result['risk_count'] > 0
        assert result['overall_level'] in ['medium', 'high', 'critical']
        assert len(result['all_recommendations']) > 0

    def test_assess_risks_user(self):
        """Test risk assessment for user metrics."""
        estimator = UniversalPinkSyncEstimator()
        user_metrics = UserManagementMetrics(
            churn_rate=0.20,
            engagement_rate=0.20,
            feature_adoption_rate=0.15
        )
        
        result = estimator.assess_risks(user_metrics=user_metrics)
        
        assert result['risk_count'] > 0
        # High churn should trigger critical risk
        critical_risks = [r for r in result['risks'] if r['level'] == 'critical']
        assert len(critical_risks) > 0

    def test_assess_risks_project(self):
        """Test risk assessment for project metrics."""
        estimator = UniversalPinkSyncEstimator()
        project_metrics = ProjectDeliveryMetrics(
            budget_allocated=30000.0,
            budget_spent=35000.0,
            completion_percentage=70.0,
            on_time_delivery=False,
            quality_score=50.0
        )
        
        result = estimator.assess_risks(project_metrics=project_metrics)
        
        assert result['risk_count'] > 0
        # Budget overrun should trigger critical risk
        budget_risks = [r for r in result['risks'] if r['category'] == 'Budget']
        assert len(budget_risks) > 0

    def test_assess_risks_comprehensive(self):
        """Test comprehensive risk assessment with all metrics."""
        estimator = UniversalPinkSyncEstimator(industry=Industry.HEALTHCARE)
        
        result = estimator.assess_risks(
            ai_metrics=AIInferenceMetrics(gpu_utilization_percent=80.0),
            user_metrics=UserManagementMetrics(churn_rate=0.05, engagement_rate=0.70),
            project_metrics=ProjectDeliveryMetrics(completion_percentage=90.0, quality_score=85.0)
        )
        
        assert 'regulatory_requirements' in result
        assert len(result['regulatory_requirements']) > 0


class TestCrossIndustryBenchmarking:
    """Test cases for cross-industry benchmarking."""

    def test_compare_industries(self):
        """Test comparing costs across all industries."""
        estimator = UniversalPinkSyncEstimator()
        result = estimator.compare_industries(base_cost=1000.0)
        
        assert len(result['comparisons']) == 10  # All 10 industries
        assert 'statistics' in result
        assert result['statistics']['industry_count'] == 10
        assert result['lowest_cost_industry'] is not None
        assert result['highest_cost_industry'] is not None

    def test_compare_industries_subset(self):
        """Test comparing costs for a subset of industries."""
        estimator = UniversalPinkSyncEstimator()
        industries = [Industry.TECHNOLOGY, Industry.HEALTHCARE, Industry.FINANCE]
        result = estimator.compare_industries(base_cost=1000.0, industries=industries)
        
        assert len(result['comparisons']) == 3
        assert result['statistics']['industry_count'] == 3

    def test_compare_industries_sorted_by_cost(self):
        """Test that industry comparisons are sorted by adjusted cost."""
        estimator = UniversalPinkSyncEstimator()
        result = estimator.compare_industries(base_cost=1000.0)
        
        costs = [c['adjusted_cost'] for c in result['comparisons']]
        assert costs == sorted(costs)

    def test_get_normalized_metrics(self):
        """Test normalizing metrics across industries."""
        estimator = UniversalPinkSyncEstimator(industry=Industry.HEALTHCARE)
        metrics = {'cost': 1000.0, 'time': 500.0}
        
        normalized = estimator.get_normalized_metrics(metrics)
        
        # Normalized values should be less than original due to high multiplier
        assert normalized['cost'] < metrics['cost']
        assert normalized['time'] < metrics['time']


class TestComprehensiveReport:
    """Test cases for comprehensive report generation."""

    def test_generate_comprehensive_report(self):
        """Test generating a comprehensive report."""
        estimator = UniversalPinkSyncEstimator(industry=Industry.TECHNOLOGY)
        
        ai_metrics = AIInferenceMetrics(
            input_tokens=1000,
            output_tokens=500,
            gpu_utilization_percent=50.0,
            memory_usage_gb=8.0,
            inference_time_ms=100.0
        )
        
        user_metrics = UserManagementMetrics(
            tier=UserTier.PROFESSIONAL,
            total_users=100,
            active_users=80,
            monthly_active_users=70,
            churn_rate=0.05,
            engagement_rate=0.75,
            feature_adoption_rate=0.60
        )
        
        project_metrics = ProjectDeliveryMetrics(
            team_size=5,
            team_cost_per_hour=75.0,
            budget_allocated=50000.0,
            budget_spent=40000.0,
            estimated_hours=500,
            actual_hours=480,
            completion_percentage=95.0,
            on_time_delivery=True,
            quality_score=90.0
        )
        
        report = estimator.generate_comprehensive_report(
            ai_metrics=ai_metrics,
            user_metrics=user_metrics,
            project_metrics=project_metrics
        )
        
        assert report['industry'] == 'technology'
        assert 'industry_config' in report
        assert 'sections' in report
        assert 'ai_analysis' in report['sections']
        assert 'user_management' in report['sections']
        assert 'project_delivery' in report['sections']
        assert 'risk_assessment' in report['sections']
        assert 'executive_summary' in report

    def test_generate_comprehensive_report_partial(self):
        """Test generating a report with only some metrics."""
        estimator = UniversalPinkSyncEstimator()
        
        ai_metrics = AIInferenceMetrics(
            input_tokens=1000,
            output_tokens=500
        )
        
        report = estimator.generate_comprehensive_report(ai_metrics=ai_metrics)
        
        assert 'ai_analysis' in report['sections']
        assert 'user_management' not in report['sections']
        assert 'project_delivery' not in report['sections']


class TestIndustryConfigs:
    """Test cases for default industry configurations."""

    def test_all_industries_have_configs(self):
        """Test that all industries have default configurations."""
        for industry in Industry:
            assert industry in DEFAULT_INDUSTRY_CONFIGS

    def test_industry_configs_have_required_fields(self):
        """Test that all industry configs have required fields."""
        for industry, config in DEFAULT_INDUSTRY_CONFIGS.items():
            assert config.name is not None
            assert config.compliance_multiplier > 0
            assert config.security_multiplier > 0
            assert config.operational_multiplier > 0
            assert 1 <= config.data_sensitivity_level <= 5
            assert isinstance(config.regulatory_requirements, list)

    def test_industry_config_total_multiplier(self):
        """Test that total multiplier is calculated correctly."""
        config = IndustryConfig(
            name="Test",
            compliance_multiplier=1.5,
            security_multiplier=2.0,
            operational_multiplier=1.2
        )
        expected = 1.5 * 2.0 * 1.2
        assert config.total_multiplier == pytest.approx(expected)


class TestUserTierConfigs:
    """Test cases for user tier configurations."""

    def test_all_tiers_have_configs(self):
        """Test that all user tiers have configurations."""
        for tier in UserTier:
            assert tier in USER_TIER_CONFIGS

    def test_tier_configs_have_required_fields(self):
        """Test that all tier configs have required fields."""
        for tier, config in USER_TIER_CONFIGS.items():
            assert 'monthly_cost' in config
            assert 'api_calls_limit' in config
            assert 'storage_gb' in config
            assert 'ai_tokens_monthly' in config
            assert 'support_level' in config
            assert 'features' in config

    def test_tier_pricing_progression(self):
        """Test that tier pricing increases with tier level."""
        free_cost = USER_TIER_CONFIGS[UserTier.FREE]['monthly_cost']
        basic_cost = USER_TIER_CONFIGS[UserTier.BASIC]['monthly_cost']
        pro_cost = USER_TIER_CONFIGS[UserTier.PROFESSIONAL]['monthly_cost']
        enterprise_cost = USER_TIER_CONFIGS[UserTier.ENTERPRISE]['monthly_cost']
        
        assert free_cost < basic_cost < pro_cost < enterprise_cost


class TestBackwardsCompatibility:
    """Test cases for backwards compatibility with base PinkSyncEstimator."""

    def test_inherits_sync_time_calculation(self):
        """Test that sync time calculation from parent class works."""
        estimator = UniversalPinkSyncEstimator()
        result = estimator.calculate_sync_time(
            data_size_gb=10.0,
            bandwidth_mbps=100.0,
            file_count=1000,
            latency_ms=5.0
        )
        
        assert 'total_seconds' in result
        assert 'transfer_seconds' in result
        assert 'overhead_seconds' in result

    def test_inherits_total_cost_calculation(self):
        """Test that total cost calculation from parent class works."""
        estimator = UniversalPinkSyncEstimator()
        result = estimator.calculate_total_cost(
            data_size_gb=10.0,
            cost_per_gb=0.12,
            file_count=100,
            ai_cost_per_run=0.05
        )
        
        assert 'total_cost' in result
        assert 'transfer_cost' in result
        assert 'ai_cost' in result

    def test_inherits_recommendation_generation(self):
        """Test that recommendation generation from parent class works."""
        estimator = UniversalPinkSyncEstimator()
        result = estimator.generate_recommendation(
            total_cost=100.0,
            ai_cost=80.0
        )
        
        assert 'ratio' in result
        assert 'flag' in result
        assert 'message' in result


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
