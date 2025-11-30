"""
Universal PinkSync Estimator Framework

A comprehensive, industry-agnostic framework for cost estimation, AI inference analysis,
user management, and project delivery metrics across multiple industries.

This module extends the core PinkSyncEstimator with support for:
- 10+ industries with customizable cost multipliers
- AI inference cost analysis (tokens, GPU, memory)
- User management tiers (Free, Basic, Professional, Enterprise)
- Project delivery metrics and efficiency tracking
- Risk assessment and recommendations
- Cross-industry benchmarking

Dependencies:
    - pinksync_estimator: The base PinkSyncEstimator class must be available in the same
      directory or Python path. This module inherits from PinkSyncEstimator.
"""

import math
from typing import Dict, Any, List, Optional
from dataclasses import dataclass, field
from enum import Enum

try:
    from pinksync_estimator import PinkSyncEstimator
except ImportError as e:
    raise ImportError(
        "Cannot import PinkSyncEstimator. Ensure pinksync_estimator.py is in the Python path. "
        f"Original error: {e}"
    )


class Industry(Enum):
    """Supported industry types for the Universal PinkSync Estimator."""
    HEALTHCARE = "healthcare"
    FINANCE = "finance"
    EDUCATION = "education"
    GOVERNMENT = "government"
    RETAIL = "retail"
    MANUFACTURING = "manufacturing"
    TECHNOLOGY = "technology"
    LEGAL = "legal"
    REAL_ESTATE = "real_estate"
    ENTERTAINMENT = "entertainment"


class UserTier(Enum):
    """User management tiers with associated cost and feature levels."""
    FREE = "free"
    BASIC = "basic"
    PROFESSIONAL = "professional"
    ENTERPRISE = "enterprise"


class RiskLevel(Enum):
    """Risk levels for assessment and recommendations."""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


@dataclass
class IndustryConfig:
    """Configuration for industry-specific cost multipliers and settings."""
    name: str
    compliance_multiplier: float = 1.0
    security_multiplier: float = 1.0
    operational_multiplier: float = 1.0
    data_sensitivity_level: int = 1  # 1-5 scale
    regulatory_requirements: List[str] = field(default_factory=list)
    
    @property
    def total_multiplier(self) -> float:
        """Calculate the combined cost multiplier for this industry."""
        return self.compliance_multiplier * self.security_multiplier * self.operational_multiplier


@dataclass
class AIInferenceMetrics:
    """Metrics for AI inference cost analysis."""
    tokens_processed: int = 0
    input_tokens: int = 0
    output_tokens: int = 0
    gpu_utilization_percent: float = 0.0
    memory_usage_gb: float = 0.0
    inference_time_ms: float = 0.0
    model_name: str = ""
    batch_size: int = 1


@dataclass
class UserManagementMetrics:
    """Metrics for user management tier analysis."""
    tier: UserTier = UserTier.FREE
    total_users: int = 0
    active_users: int = 0
    monthly_active_users: int = 0
    churn_rate: float = 0.0
    engagement_rate: float = 0.0
    feature_adoption_rate: float = 0.0
    cost_per_user: float = 0.0


@dataclass
class ProjectDeliveryMetrics:
    """Metrics for project delivery analysis."""
    team_size: int = 1
    team_cost_per_hour: float = 50.0
    budget_allocated: float = 0.0
    budget_spent: float = 0.0
    estimated_hours: float = 0.0
    actual_hours: float = 0.0
    completion_percentage: float = 0.0
    on_time_delivery: bool = True
    quality_score: float = 100.0


@dataclass
class RiskAssessment:
    """Risk assessment results for a given analysis."""
    category: str
    level: RiskLevel
    score: float  # 0-100
    description: str
    recommendations: List[str] = field(default_factory=list)


# Default industry configurations with compliance, security, and operational multipliers
DEFAULT_INDUSTRY_CONFIGS: Dict[Industry, IndustryConfig] = {
    Industry.HEALTHCARE: IndustryConfig(
        name="Healthcare",
        compliance_multiplier=1.5,
        security_multiplier=1.6,
        operational_multiplier=1.2,
        data_sensitivity_level=5,
        regulatory_requirements=["HIPAA", "HITECH", "FDA 21 CFR Part 11"]
    ),
    Industry.FINANCE: IndustryConfig(
        name="Finance",
        compliance_multiplier=1.6,
        security_multiplier=1.7,
        operational_multiplier=1.3,
        data_sensitivity_level=5,
        regulatory_requirements=["SOX", "PCI-DSS", "GDPR", "Basel III"]
    ),
    Industry.EDUCATION: IndustryConfig(
        name="Education",
        compliance_multiplier=1.2,
        security_multiplier=1.2,
        operational_multiplier=1.0,
        data_sensitivity_level=3,
        regulatory_requirements=["FERPA", "COPPA"]
    ),
    Industry.GOVERNMENT: IndustryConfig(
        name="Government",
        compliance_multiplier=1.7,
        security_multiplier=1.8,
        operational_multiplier=1.4,
        data_sensitivity_level=5,
        regulatory_requirements=["FedRAMP", "FISMA", "NIST 800-53"]
    ),
    Industry.RETAIL: IndustryConfig(
        name="Retail",
        compliance_multiplier=1.1,
        security_multiplier=1.3,
        operational_multiplier=1.1,
        data_sensitivity_level=3,
        regulatory_requirements=["PCI-DSS", "GDPR", "CCPA"]
    ),
    Industry.MANUFACTURING: IndustryConfig(
        name="Manufacturing",
        compliance_multiplier=1.2,
        security_multiplier=1.2,
        operational_multiplier=1.3,
        data_sensitivity_level=2,
        regulatory_requirements=["ISO 9001", "ISO 27001"]
    ),
    Industry.TECHNOLOGY: IndustryConfig(
        name="Technology",
        compliance_multiplier=1.1,
        security_multiplier=1.4,
        operational_multiplier=1.0,
        data_sensitivity_level=3,
        regulatory_requirements=["SOC 2", "ISO 27001", "GDPR"]
    ),
    Industry.LEGAL: IndustryConfig(
        name="Legal",
        compliance_multiplier=1.5,
        security_multiplier=1.5,
        operational_multiplier=1.2,
        data_sensitivity_level=4,
        regulatory_requirements=["Attorney-Client Privilege", "ABA Guidelines"]
    ),
    Industry.REAL_ESTATE: IndustryConfig(
        name="Real Estate",
        compliance_multiplier=1.1,
        security_multiplier=1.2,
        operational_multiplier=1.1,
        data_sensitivity_level=2,
        regulatory_requirements=["RESPA", "Fair Housing Act"]
    ),
    Industry.ENTERTAINMENT: IndustryConfig(
        name="Entertainment",
        compliance_multiplier=1.0,
        security_multiplier=1.2,
        operational_multiplier=1.1,
        data_sensitivity_level=2,
        regulatory_requirements=["DMCA", "GDPR"]
    ),
}

# User tier configurations with cost and feature limits
USER_TIER_CONFIGS: Dict[UserTier, Dict[str, Any]] = {
    UserTier.FREE: {
        "monthly_cost": 0,
        "api_calls_limit": 100,
        "storage_gb": 1,
        "ai_tokens_monthly": 10000,
        "support_level": "community",
        "features": ["basic_sync", "basic_analytics"]
    },
    UserTier.BASIC: {
        "monthly_cost": 9.99,
        "api_calls_limit": 1000,
        "storage_gb": 10,
        "ai_tokens_monthly": 100000,
        "support_level": "email",
        "features": ["basic_sync", "basic_analytics", "scheduled_sync", "priority_queue"]
    },
    UserTier.PROFESSIONAL: {
        "monthly_cost": 29.99,
        "api_calls_limit": 10000,
        "storage_gb": 100,
        "ai_tokens_monthly": 500000,
        "support_level": "priority",
        "features": ["basic_sync", "basic_analytics", "scheduled_sync", "priority_queue",
                     "advanced_analytics", "custom_workflows", "api_access"]
    },
    UserTier.ENTERPRISE: {
        "monthly_cost": 99.99,
        "api_calls_limit": -1,  # Unlimited
        "storage_gb": 1000,
        "ai_tokens_monthly": -1,  # Unlimited
        "support_level": "dedicated",
        "features": ["basic_sync", "basic_analytics", "scheduled_sync", "priority_queue",
                     "advanced_analytics", "custom_workflows", "api_access",
                     "sso", "audit_logs", "sla_guarantee", "custom_integrations"]
    },
}


class UniversalPinkSyncEstimator(PinkSyncEstimator):
    """
    Universal PinkSync Estimator Framework
    
    A comprehensive, industry-agnostic framework for cost estimation, AI inference analysis,
    user management, and project delivery metrics across multiple industries.
    
    This class extends the core PinkSyncEstimator with:
    - Industry-specific cost multipliers for 10+ industries
    - AI inference cost analysis (tokens, GPU utilization, memory usage)
    - User management tier analysis (Free, Basic, Professional, Enterprise)
    - Project delivery metrics and efficiency tracking
    - Risk assessment and recommendations engine
    - Cross-industry benchmarking capabilities
    """
    
    # AI cost constants (USD per unit)
    COST_PER_INPUT_TOKEN = 0.00001  # $10 per 1M tokens
    COST_PER_OUTPUT_TOKEN = 0.00003  # $30 per 1M tokens
    COST_PER_GPU_HOUR = 2.50  # $2.50 per GPU hour
    COST_PER_MEMORY_GB_HOUR = 0.10  # $0.10 per GB-hour
    
    # Churn scoring constants
    # Churn threshold multiplier: at 20% churn rate (0.20), score becomes 0
    # Formula: score = 100 - (churn_rate * 100 * CHURN_THRESHOLD_MULTIPLIER)
    CHURN_THRESHOLD_MULTIPLIER = 5  # 100 / (0.20 * 100) = 5
    
    # Default accuracy for AI efficiency calculations when not provided
    DEFAULT_AI_ACCURACY = 0.92

    def __init__(self, industry: Industry = Industry.TECHNOLOGY):
        """
        Initialize the Universal PinkSync Estimator.
        
        :param industry: The target industry for cost calculations.
        :type industry: Industry
        """
        super().__init__()
        self.industry = industry
        self.industry_config = DEFAULT_INDUSTRY_CONFIGS.get(
            industry, DEFAULT_INDUSTRY_CONFIGS[Industry.TECHNOLOGY]
        )
        self._custom_industry_configs: Dict[Industry, IndustryConfig] = {}
    
    def set_industry(self, industry: Industry) -> None:
        """
        Set the target industry for cost calculations.
        
        :param industry: The target industry.
        :type industry: Industry
        """
        self.industry = industry
        if industry in self._custom_industry_configs:
            self.industry_config = self._custom_industry_configs[industry]
        else:
            self.industry_config = DEFAULT_INDUSTRY_CONFIGS.get(
                industry, DEFAULT_INDUSTRY_CONFIGS[Industry.TECHNOLOGY]
            )
    
    def set_custom_industry_config(self, industry: Industry, config: IndustryConfig) -> None:
        """
        Set a custom configuration for an industry.
        
        :param industry: The industry to configure.
        :type industry: Industry
        :param config: The custom configuration.
        :type config: IndustryConfig
        """
        self._custom_industry_configs[industry] = config
        if self.industry == industry:
            self.industry_config = config
    
    def get_industry_multiplier(self, industry: Optional[Industry] = None) -> float:
        """
        Get the total cost multiplier for an industry.
        
        :param industry: The industry to get the multiplier for. Uses current industry if None.
        :type industry: Optional[Industry]
        :returns: The total cost multiplier.
        :rtype: float
        """
        if industry is None:
            return self.industry_config.total_multiplier
        
        config = self._custom_industry_configs.get(
            industry, DEFAULT_INDUSTRY_CONFIGS.get(industry)
        )
        return config.total_multiplier if config else 1.0
    
    # =========================================================================
    # AI Inference Cost Analysis
    # =========================================================================
    
    def calculate_ai_inference_cost(self, metrics: AIInferenceMetrics) -> Dict[str, Any]:
        """
        Calculate comprehensive AI inference costs including tokens, GPU, and memory.
        
        :param metrics: AI inference metrics for cost calculation.
        :type metrics: AIInferenceMetrics
        :returns: Dictionary containing detailed cost breakdown.
        :rtype: Dict[str, Any]
        """
        # Token costs
        input_token_cost = metrics.input_tokens * self.COST_PER_INPUT_TOKEN
        output_token_cost = metrics.output_tokens * self.COST_PER_OUTPUT_TOKEN
        total_token_cost = input_token_cost + output_token_cost
        
        # GPU costs (convert ms to hours)
        inference_hours = metrics.inference_time_ms / (1000 * 3600)
        gpu_cost = inference_hours * self.COST_PER_GPU_HOUR * (metrics.gpu_utilization_percent / 100)
        
        # Memory costs
        memory_cost = metrics.memory_usage_gb * inference_hours * self.COST_PER_MEMORY_GB_HOUR
        
        # Base cost before industry multiplier
        base_cost = total_token_cost + gpu_cost + memory_cost
        
        # Apply industry multiplier
        adjusted_cost = base_cost * self.industry_config.total_multiplier
        
        return {
            'input_token_cost': input_token_cost,
            'output_token_cost': output_token_cost,
            'total_token_cost': total_token_cost,
            'gpu_cost': gpu_cost,
            'memory_cost': memory_cost,
            'base_cost': base_cost,
            'industry_multiplier': self.industry_config.total_multiplier,
            'adjusted_cost': adjusted_cost,
            'model_name': metrics.model_name,
            'tokens_processed': metrics.tokens_processed or (metrics.input_tokens + metrics.output_tokens),
            'cost_per_token': adjusted_cost / max(1, metrics.tokens_processed or (metrics.input_tokens + metrics.output_tokens))
        }
    
    def calculate_ai_efficiency_score(
        self,
        accuracy: float,
        cost: float,
        speed_ms: float,
        baseline_accuracy: float = 0.9,
        baseline_cost: float = 1.0,
        baseline_speed_ms: float = 1000.0
    ) -> Dict[str, Any]:
        """
        Calculate AI Efficiency Score incorporating accuracy, cost, and speed.
        
        The score is a weighted combination of:
        - Accuracy component (40%): How accurate the AI is compared to baseline
        - Cost component (30%): How cost-effective compared to baseline
        - Speed component (30%): How fast compared to baseline
        
        :param accuracy: Model accuracy (0.0 to 1.0).
        :param cost: Actual cost incurred.
        :param speed_ms: Inference speed in milliseconds.
        :param baseline_accuracy: Baseline accuracy for comparison.
        :param baseline_cost: Baseline cost for comparison.
        :param baseline_speed_ms: Baseline speed for comparison.
        :returns: Dictionary with score breakdown and recommendations.
        :rtype: Dict[str, Any]
        """
        # Calculate component scores (0-100 scale)
        accuracy_score = min(100, (accuracy / baseline_accuracy) * 100)
        
        # For cost and speed, lower is better, so we invert the ratio
        cost_score = min(100, (baseline_cost / max(0.001, cost)) * 100) if cost > 0 else 100
        speed_score = min(100, (baseline_speed_ms / max(1, speed_ms)) * 100)
        
        # Weighted combination
        weights = {'accuracy': 0.4, 'cost': 0.3, 'speed': 0.3}
        total_score = (
            accuracy_score * weights['accuracy'] +
            cost_score * weights['cost'] +
            speed_score * weights['speed']
        )
        
        # Determine efficiency grade
        if total_score >= 90:
            grade = 'A'
            status = 'Excellent'
        elif total_score >= 80:
            grade = 'B'
            status = 'Good'
        elif total_score >= 70:
            grade = 'C'
            status = 'Acceptable'
        elif total_score >= 60:
            grade = 'D'
            status = 'Needs Improvement'
        else:
            grade = 'F'
            status = 'Poor'
        
        return {
            'total_score': round(total_score, 2),
            'grade': grade,
            'status': status,
            'accuracy_score': round(accuracy_score, 2),
            'cost_score': round(cost_score, 2),
            'speed_score': round(speed_score, 2),
            'weights': weights,
            'recommendations': self._generate_ai_efficiency_recommendations(
                accuracy_score, cost_score, speed_score
            )
        }
    
    def _generate_ai_efficiency_recommendations(
        self,
        accuracy_score: float,
        cost_score: float,
        speed_score: float
    ) -> List[str]:
        """Generate recommendations based on AI efficiency scores."""
        recommendations = []
        
        if accuracy_score < 70:
            recommendations.append("Consider using a more powerful model or fine-tuning for better accuracy.")
        if cost_score < 70:
            recommendations.append("Optimize token usage or consider using a smaller, more cost-effective model.")
        if speed_score < 70:
            recommendations.append("Implement caching, batch processing, or use a faster inference endpoint.")
        
        if not recommendations:
            recommendations.append("AI performance is optimal. Continue monitoring for any degradation.")
        
        return recommendations
    
    # =========================================================================
    # User Management Analysis
    # =========================================================================
    
    def calculate_user_management_cost(self, metrics: UserManagementMetrics) -> Dict[str, Any]:
        """
        Calculate user management costs based on tier and usage.
        
        :param metrics: User management metrics.
        :type metrics: UserManagementMetrics
        :returns: Dictionary with cost breakdown and analysis.
        :rtype: Dict[str, Any]
        """
        tier_config = USER_TIER_CONFIGS.get(metrics.tier, USER_TIER_CONFIGS[UserTier.FREE])
        
        # Base platform cost
        base_monthly_cost = tier_config['monthly_cost'] * metrics.total_users
        
        # Per-user operational cost
        per_user_operational_cost = metrics.cost_per_user * metrics.active_users
        
        # Apply industry multiplier
        total_monthly_cost = (base_monthly_cost + per_user_operational_cost) * self.industry_config.total_multiplier
        
        # Calculate per-user metrics
        cost_per_active_user = total_monthly_cost / max(1, metrics.active_users)
        
        return {
            'tier': metrics.tier.value,
            'total_users': metrics.total_users,
            'active_users': metrics.active_users,
            'base_monthly_cost': base_monthly_cost,
            'operational_cost': per_user_operational_cost,
            'total_monthly_cost': round(total_monthly_cost, 2),
            'cost_per_active_user': round(cost_per_active_user, 2),
            'tier_features': tier_config['features'],
            'tier_limits': {
                'api_calls': tier_config['api_calls_limit'],
                'storage_gb': tier_config['storage_gb'],
                'ai_tokens': tier_config['ai_tokens_monthly']
            },
            'industry_multiplier': self.industry_config.total_multiplier
        }
    
    def calculate_user_engagement_score(self, metrics: UserManagementMetrics) -> Dict[str, Any]:
        """
        Calculate User Engagement Score analyzing churn, engagement, and feature adoption.
        
        :param metrics: User management metrics.
        :type metrics: UserManagementMetrics
        :returns: Dictionary with engagement score breakdown.
        :rtype: Dict[str, Any]
        """
        # Component scores (0-100 scale)
        # Churn score: lower churn is better (invert and scale using CHURN_THRESHOLD_MULTIPLIER)
        churn_score = max(0, 100 - (metrics.churn_rate * 100 * self.CHURN_THRESHOLD_MULTIPLIER))
        
        # Engagement score: direct percentage
        engagement_score = metrics.engagement_rate * 100
        
        # Feature adoption score: direct percentage
        feature_adoption_score = metrics.feature_adoption_rate * 100
        
        # Active user ratio
        active_ratio = metrics.active_users / max(1, metrics.total_users)
        active_user_score = active_ratio * 100
        
        # MAU ratio
        mau_ratio = metrics.monthly_active_users / max(1, metrics.total_users)
        mau_score = mau_ratio * 100
        
        # Weighted combination
        weights = {
            'churn': 0.25,
            'engagement': 0.25,
            'feature_adoption': 0.20,
            'active_users': 0.15,
            'mau': 0.15
        }
        
        total_score = (
            churn_score * weights['churn'] +
            engagement_score * weights['engagement'] +
            feature_adoption_score * weights['feature_adoption'] +
            active_user_score * weights['active_users'] +
            mau_score * weights['mau']
        )
        
        # Determine engagement level
        if total_score >= 80:
            level = 'Highly Engaged'
            health = 'Excellent'
        elif total_score >= 60:
            level = 'Engaged'
            health = 'Good'
        elif total_score >= 40:
            level = 'Moderately Engaged'
            health = 'Fair'
        else:
            level = 'Low Engagement'
            health = 'At Risk'
        
        return {
            'total_score': round(total_score, 2),
            'level': level,
            'health': health,
            'churn_score': round(churn_score, 2),
            'engagement_score': round(engagement_score, 2),
            'feature_adoption_score': round(feature_adoption_score, 2),
            'active_user_score': round(active_user_score, 2),
            'mau_score': round(mau_score, 2),
            'weights': weights,
            'recommendations': self._generate_engagement_recommendations(
                churn_score, engagement_score, feature_adoption_score
            )
        }
    
    def _generate_engagement_recommendations(
        self,
        churn_score: float,
        engagement_score: float,
        feature_adoption_score: float
    ) -> List[str]:
        """Generate recommendations based on engagement scores."""
        recommendations = []
        
        if churn_score < 60:
            recommendations.append("High churn rate detected. Implement retention strategies and gather user feedback.")
        if engagement_score < 60:
            recommendations.append("Low engagement. Consider gamification, better onboarding, or feature improvements.")
        if feature_adoption_score < 50:
            recommendations.append("Low feature adoption. Improve feature discovery through tutorials and in-app guidance.")
        
        if not recommendations:
            recommendations.append("User engagement is healthy. Focus on maintaining current satisfaction levels.")
        
        return recommendations
    
    # =========================================================================
    # Project Delivery Analysis
    # =========================================================================
    
    def calculate_project_delivery_cost(self, metrics: ProjectDeliveryMetrics) -> Dict[str, Any]:
        """
        Calculate project delivery costs and efficiency metrics.
        
        :param metrics: Project delivery metrics.
        :type metrics: ProjectDeliveryMetrics
        :returns: Dictionary with cost breakdown and efficiency analysis.
        :rtype: Dict[str, Any]
        """
        # Team costs
        estimated_team_cost = metrics.team_size * metrics.team_cost_per_hour * metrics.estimated_hours
        actual_team_cost = metrics.team_size * metrics.team_cost_per_hour * metrics.actual_hours
        
        # Apply industry multiplier
        adjusted_estimated_cost = estimated_team_cost * self.industry_config.total_multiplier
        adjusted_actual_cost = actual_team_cost * self.industry_config.total_multiplier
        
        # Budget analysis
        budget_variance = metrics.budget_allocated - metrics.budget_spent
        budget_utilization = (metrics.budget_spent / max(1, metrics.budget_allocated)) * 100
        
        # Efficiency metrics
        time_efficiency = (metrics.estimated_hours / max(1, metrics.actual_hours)) * 100 if metrics.actual_hours > 0 else 100
        cost_efficiency = (estimated_team_cost / max(1, actual_team_cost)) * 100 if actual_team_cost > 0 else 100
        
        return {
            'estimated_team_cost': round(estimated_team_cost, 2),
            'actual_team_cost': round(actual_team_cost, 2),
            'adjusted_estimated_cost': round(adjusted_estimated_cost, 2),
            'adjusted_actual_cost': round(adjusted_actual_cost, 2),
            'budget_allocated': metrics.budget_allocated,
            'budget_spent': metrics.budget_spent,
            'budget_variance': round(budget_variance, 2),
            'budget_utilization_percent': round(budget_utilization, 2),
            'time_efficiency_percent': round(time_efficiency, 2),
            'cost_efficiency_percent': round(cost_efficiency, 2),
            'completion_percentage': metrics.completion_percentage,
            'on_time_delivery': metrics.on_time_delivery,
            'quality_score': metrics.quality_score,
            'industry_multiplier': self.industry_config.total_multiplier
        }
    
    def calculate_delivery_performance_score(self, metrics: ProjectDeliveryMetrics) -> Dict[str, Any]:
        """
        Calculate delivery performance score including ROI.
        
        :param metrics: Project delivery metrics.
        :type metrics: ProjectDeliveryMetrics
        :returns: Dictionary with performance score breakdown and ROI.
        :rtype: Dict[str, Any]
        """
        # Time performance
        time_ratio = metrics.estimated_hours / max(1, metrics.actual_hours)
        time_score = min(100, time_ratio * 100) if metrics.actual_hours > 0 else 100
        
        # Budget performance
        budget_ratio = (metrics.budget_allocated - metrics.budget_spent) / max(1, metrics.budget_allocated)
        budget_score = max(0, min(100, 50 + (budget_ratio * 100)))  # 50 is break-even
        
        # Quality score (direct)
        quality_score = metrics.quality_score
        
        # Completion score
        completion_score = metrics.completion_percentage
        
        # On-time delivery bonus
        on_time_bonus = 10 if metrics.on_time_delivery else 0
        
        # Weighted combination
        weights = {
            'time': 0.25,
            'budget': 0.25,
            'quality': 0.30,
            'completion': 0.20
        }
        
        base_score = (
            time_score * weights['time'] +
            budget_score * weights['budget'] +
            quality_score * weights['quality'] +
            completion_score * weights['completion']
        )
        
        total_score = min(100, base_score + on_time_bonus)
        
        # Calculate ROI
        actual_cost = metrics.team_size * metrics.team_cost_per_hour * metrics.actual_hours
        roi_percentage = ((metrics.budget_allocated - actual_cost) / max(1, actual_cost)) * 100
        
        # Determine performance level
        if total_score >= 90:
            level = 'Outstanding'
        elif total_score >= 80:
            level = 'Excellent'
        elif total_score >= 70:
            level = 'Good'
        elif total_score >= 60:
            level = 'Satisfactory'
        else:
            level = 'Needs Improvement'
        
        return {
            'total_score': round(total_score, 2),
            'level': level,
            'time_score': round(time_score, 2),
            'budget_score': round(budget_score, 2),
            'quality_score': round(quality_score, 2),
            'completion_score': round(completion_score, 2),
            'on_time_bonus': on_time_bonus,
            'roi_percentage': round(roi_percentage, 2),
            'weights': weights,
            'recommendations': self._generate_delivery_recommendations(
                time_score, budget_score, quality_score, completion_score
            )
        }
    
    def _generate_delivery_recommendations(
        self,
        time_score: float,
        budget_score: float,
        quality_score: float,
        completion_score: float
    ) -> List[str]:
        """Generate recommendations based on delivery performance scores."""
        recommendations = []
        
        if time_score < 70:
            recommendations.append("Project is taking longer than estimated. Review estimation process and team capacity.")
        if budget_score < 50:
            recommendations.append("Budget overrun detected. Implement stricter cost controls and scope management.")
        if quality_score < 70:
            recommendations.append("Quality below target. Increase testing coverage and code review practices.")
        if completion_score < 80:
            recommendations.append("Low completion rate. Prioritize critical features and consider scope reduction.")
        
        if not recommendations:
            recommendations.append("Project delivery is on track. Maintain current practices and monitoring.")
        
        return recommendations
    
    # =========================================================================
    # Risk Assessment
    # =========================================================================
    
    def assess_risks(
        self,
        ai_metrics: Optional[AIInferenceMetrics] = None,
        user_metrics: Optional[UserManagementMetrics] = None,
        project_metrics: Optional[ProjectDeliveryMetrics] = None
    ) -> Dict[str, Any]:
        """
        Perform comprehensive risk assessment across AI, users, and project efficiency.
        
        :param ai_metrics: Optional AI inference metrics.
        :param user_metrics: Optional user management metrics.
        :param project_metrics: Optional project delivery metrics.
        :returns: Dictionary with risk assessments and recommendations.
        :rtype: Dict[str, Any]
        """
        risks: List[RiskAssessment] = []
        
        # AI risks
        if ai_metrics:
            risks.extend(self._assess_ai_risks(ai_metrics))
        
        # User risks
        if user_metrics:
            risks.extend(self._assess_user_risks(user_metrics))
        
        # Project risks
        if project_metrics:
            risks.extend(self._assess_project_risks(project_metrics))
        
        # Industry-specific risks
        risks.extend(self._assess_industry_risks())
        
        # Calculate overall risk score
        if risks:
            risk_scores = [r.score for r in risks]
            avg_risk_score = sum(risk_scores) / len(risk_scores)
            max_risk_score = max(risk_scores)
        else:
            avg_risk_score = 0
            max_risk_score = 0
        
        # Determine overall risk level
        if max_risk_score >= 80 or avg_risk_score >= 70:
            overall_level = RiskLevel.CRITICAL
        elif max_risk_score >= 60 or avg_risk_score >= 50:
            overall_level = RiskLevel.HIGH
        elif max_risk_score >= 40 or avg_risk_score >= 30:
            overall_level = RiskLevel.MEDIUM
        else:
            overall_level = RiskLevel.LOW
        
        # Compile all recommendations
        all_recommendations = []
        for risk in risks:
            all_recommendations.extend(risk.recommendations)
        
        return {
            'overall_level': overall_level.value,
            'overall_score': round(avg_risk_score, 2),
            'max_risk_score': round(max_risk_score, 2),
            'risk_count': len(risks),
            'risks': [
                {
                    'category': r.category,
                    'level': r.level.value,
                    'score': r.score,
                    'description': r.description,
                    'recommendations': r.recommendations
                }
                for r in risks
            ],
            'all_recommendations': list(set(all_recommendations)),
            'industry': self.industry.value,
            'regulatory_requirements': self.industry_config.regulatory_requirements
        }
    
    def _assess_ai_risks(self, metrics: AIInferenceMetrics) -> List[RiskAssessment]:
        """Assess risks related to AI inference."""
        risks = []
        
        # High GPU utilization risk
        if metrics.gpu_utilization_percent > 90:
            risks.append(RiskAssessment(
                category="AI Infrastructure",
                level=RiskLevel.HIGH,
                score=85,
                description="GPU utilization is critically high, risking service degradation.",
                recommendations=[
                    "Scale up GPU resources or implement load balancing.",
                    "Optimize model inference with batching or quantization."
                ]
            ))
        elif metrics.gpu_utilization_percent > 75:
            risks.append(RiskAssessment(
                category="AI Infrastructure",
                level=RiskLevel.MEDIUM,
                score=55,
                description="GPU utilization is elevated. Monitor for potential issues.",
                recommendations=["Plan for capacity expansion if utilization continues to increase."]
            ))
        
        # High memory usage risk
        if metrics.memory_usage_gb > 32:
            risks.append(RiskAssessment(
                category="AI Memory",
                level=RiskLevel.HIGH,
                score=75,
                description="Memory usage is high, risking out-of-memory errors.",
                recommendations=[
                    "Consider model optimization or smaller model variants.",
                    "Implement memory-efficient inference techniques."
                ]
            ))
        
        # Slow inference risk
        if metrics.inference_time_ms > 5000:
            risks.append(RiskAssessment(
                category="AI Performance",
                level=RiskLevel.MEDIUM,
                score=60,
                description="Inference time is slow, impacting user experience.",
                recommendations=[
                    "Use caching for common queries.",
                    "Consider faster model architectures or hardware upgrades."
                ]
            ))
        
        return risks
    
    def _assess_user_risks(self, metrics: UserManagementMetrics) -> List[RiskAssessment]:
        """Assess risks related to user management."""
        risks = []
        
        # High churn risk
        if metrics.churn_rate > 0.15:
            risks.append(RiskAssessment(
                category="User Retention",
                level=RiskLevel.CRITICAL,
                score=90,
                description="Churn rate is critically high. Immediate action required.",
                recommendations=[
                    "Conduct urgent user research to identify pain points.",
                    "Implement retention campaigns and loyalty programs.",
                    "Review pricing and value proposition."
                ]
            ))
        elif metrics.churn_rate > 0.08:
            risks.append(RiskAssessment(
                category="User Retention",
                level=RiskLevel.HIGH,
                score=70,
                description="Churn rate is above industry average.",
                recommendations=["Analyze churn reasons and address top issues."]
            ))
        
        # Low engagement risk
        if metrics.engagement_rate < 0.3:
            risks.append(RiskAssessment(
                category="User Engagement",
                level=RiskLevel.HIGH,
                score=65,
                description="User engagement is low, indicating potential value issues.",
                recommendations=[
                    "Improve onboarding experience.",
                    "Add engagement features like notifications and gamification."
                ]
            ))
        
        # Low feature adoption risk
        if metrics.feature_adoption_rate < 0.2:
            risks.append(RiskAssessment(
                category="Feature Adoption",
                level=RiskLevel.MEDIUM,
                score=50,
                description="Feature adoption is low. Users may not be aware of capabilities.",
                recommendations=[
                    "Create feature discovery mechanisms.",
                    "Develop tutorials and in-app guidance."
                ]
            ))
        
        return risks
    
    def _assess_project_risks(self, metrics: ProjectDeliveryMetrics) -> List[RiskAssessment]:
        """Assess risks related to project delivery."""
        risks = []
        
        # Budget overrun risk
        budget_utilization = (metrics.budget_spent / max(1, metrics.budget_allocated)) * 100
        if budget_utilization > 100:
            risks.append(RiskAssessment(
                category="Budget",
                level=RiskLevel.CRITICAL,
                score=95,
                description="Budget has been exceeded. Immediate financial review required.",
                recommendations=[
                    "Halt non-essential spending immediately.",
                    "Conduct budget review with stakeholders.",
                    "Identify cost reduction opportunities."
                ]
            ))
        elif budget_utilization > 85 and metrics.completion_percentage < 80:
            risks.append(RiskAssessment(
                category="Budget",
                level=RiskLevel.HIGH,
                score=75,
                description="Budget utilization is high with low completion. Risk of overrun.",
                recommendations=["Review remaining work and adjust scope if necessary."]
            ))
        
        # Schedule risk
        if not metrics.on_time_delivery and metrics.completion_percentage < 90:
            risks.append(RiskAssessment(
                category="Schedule",
                level=RiskLevel.HIGH,
                score=70,
                description="Project is behind schedule.",
                recommendations=[
                    "Add resources or reduce scope.",
                    "Prioritize critical path items."
                ]
            ))
        
        # Quality risk
        if metrics.quality_score < 60:
            risks.append(RiskAssessment(
                category="Quality",
                level=RiskLevel.HIGH,
                score=75,
                description="Quality score is below acceptable threshold.",
                recommendations=[
                    "Increase testing coverage.",
                    "Implement code review requirements.",
                    "Consider adding QA resources."
                ]
            ))
        
        return risks
    
    def _assess_industry_risks(self) -> List[RiskAssessment]:
        """Assess industry-specific risks based on configuration."""
        risks = []
        
        # High compliance requirements
        if self.industry_config.compliance_multiplier > 1.4:
            risks.append(RiskAssessment(
                category="Compliance",
                level=RiskLevel.MEDIUM,
                score=45,
                description=f"High compliance requirements for {self.industry_config.name} industry.",
                recommendations=[
                    f"Ensure compliance with: {', '.join(self.industry_config.regulatory_requirements)}",
                    "Conduct regular compliance audits."
                ]
            ))
        
        # High data sensitivity
        if self.industry_config.data_sensitivity_level >= 4:
            risks.append(RiskAssessment(
                category="Data Security",
                level=RiskLevel.MEDIUM,
                score=50,
                description=f"High data sensitivity level ({self.industry_config.data_sensitivity_level}/5) requires extra protection.",
                recommendations=[
                    "Implement data encryption at rest and in transit.",
                    "Regular security audits and penetration testing."
                ]
            ))
        
        return risks
    
    # =========================================================================
    # Cross-Industry Benchmarking
    # =========================================================================
    
    def compare_industries(
        self,
        base_cost: float,
        industries: Optional[List[Industry]] = None
    ) -> Dict[str, Any]:
        """
        Compare costs across multiple industries for benchmarking.
        
        :param base_cost: The base cost to compare across industries.
        :type base_cost: float
        :param industries: List of industries to compare. Uses all if None.
        :type industries: Optional[List[Industry]]
        :returns: Dictionary with industry comparison data.
        :rtype: Dict[str, Any]
        """
        if industries is None:
            industries = list(Industry)
        
        comparisons = []
        for industry in industries:
            config = self._custom_industry_configs.get(
                industry, DEFAULT_INDUSTRY_CONFIGS.get(industry)
            )
            if config:
                adjusted_cost = base_cost * config.total_multiplier
                comparisons.append({
                    'industry': industry.value,
                    'name': config.name,
                    'base_cost': base_cost,
                    'adjusted_cost': round(adjusted_cost, 2),
                    'multiplier': round(config.total_multiplier, 3),
                    'compliance_multiplier': config.compliance_multiplier,
                    'security_multiplier': config.security_multiplier,
                    'operational_multiplier': config.operational_multiplier,
                    'data_sensitivity_level': config.data_sensitivity_level,
                    'regulatory_requirements': config.regulatory_requirements
                })
        
        # Sort by adjusted cost
        comparisons.sort(key=lambda x: x['adjusted_cost'])
        
        # Calculate statistics
        costs = [c['adjusted_cost'] for c in comparisons]
        avg_cost = sum(costs) / len(costs) if costs else 0
        min_cost = min(costs) if costs else 0
        max_cost = max(costs) if costs else 0
        
        return {
            'base_cost': base_cost,
            'comparisons': comparisons,
            'statistics': {
                'average_cost': round(avg_cost, 2),
                'min_cost': round(min_cost, 2),
                'max_cost': round(max_cost, 2),
                'cost_range': round(max_cost - min_cost, 2),
                'industry_count': len(comparisons)
            },
            'lowest_cost_industry': comparisons[0]['industry'] if comparisons else None,
            'highest_cost_industry': comparisons[-1]['industry'] if comparisons else None
        }
    
    def get_normalized_metrics(
        self,
        metrics: Dict[str, float],
        industry: Optional[Industry] = None
    ) -> Dict[str, float]:
        """
        Normalize metrics to enable fair cross-industry comparisons.
        
        :param metrics: Dictionary of metric name to value.
        :type metrics: Dict[str, float]
        :param industry: Industry for normalization. Uses current if None.
        :type industry: Optional[Industry]
        :returns: Dictionary of normalized metrics (0-100 scale).
        :rtype: Dict[str, float]
        """
        multiplier = self.get_industry_multiplier(industry)
        
        normalized = {}
        for key, value in metrics.items():
            # Normalize by removing industry multiplier effect
            normalized_value = value / multiplier if multiplier > 0 else value
            normalized[key] = round(normalized_value, 4)
        
        return normalized
    
    # =========================================================================
    # Comprehensive Analysis
    # =========================================================================
    
    def generate_comprehensive_report(
        self,
        ai_metrics: Optional[AIInferenceMetrics] = None,
        user_metrics: Optional[UserManagementMetrics] = None,
        project_metrics: Optional[ProjectDeliveryMetrics] = None
    ) -> Dict[str, Any]:
        """
        Generate a comprehensive analysis report combining all metrics.
        
        :param ai_metrics: Optional AI inference metrics.
        :param user_metrics: Optional user management metrics.
        :param project_metrics: Optional project delivery metrics.
        :returns: Comprehensive report dictionary.
        :rtype: Dict[str, Any]
        """
        report = {
            'industry': self.industry.value,
            'industry_config': {
                'name': self.industry_config.name,
                'compliance_multiplier': self.industry_config.compliance_multiplier,
                'security_multiplier': self.industry_config.security_multiplier,
                'operational_multiplier': self.industry_config.operational_multiplier,
                'total_multiplier': round(self.industry_config.total_multiplier, 3),
                'data_sensitivity_level': self.industry_config.data_sensitivity_level,
                'regulatory_requirements': self.industry_config.regulatory_requirements
            },
            'timestamp': None,  # Can be set by caller
            'sections': {}
        }
        
        # AI Analysis Section
        if ai_metrics:
            ai_cost = self.calculate_ai_inference_cost(ai_metrics)
            ai_efficiency = self.calculate_ai_efficiency_score(
                accuracy=self.DEFAULT_AI_ACCURACY,
                cost=ai_cost['adjusted_cost'],
                speed_ms=ai_metrics.inference_time_ms
            )
            report['sections']['ai_analysis'] = {
                'cost_breakdown': ai_cost,
                'efficiency_score': ai_efficiency
            }
        
        # User Management Section
        if user_metrics:
            user_cost = self.calculate_user_management_cost(user_metrics)
            engagement_score = self.calculate_user_engagement_score(user_metrics)
            report['sections']['user_management'] = {
                'cost_analysis': user_cost,
                'engagement_score': engagement_score
            }
        
        # Project Delivery Section
        if project_metrics:
            project_cost = self.calculate_project_delivery_cost(project_metrics)
            delivery_score = self.calculate_delivery_performance_score(project_metrics)
            report['sections']['project_delivery'] = {
                'cost_analysis': project_cost,
                'performance_score': delivery_score
            }
        
        # Risk Assessment
        risk_assessment = self.assess_risks(ai_metrics, user_metrics, project_metrics)
        report['sections']['risk_assessment'] = risk_assessment
        
        # Executive Summary
        report['executive_summary'] = self._generate_executive_summary(report)
        
        return report
    
    def _generate_executive_summary(self, report: Dict[str, Any]) -> Dict[str, Any]:
        """Generate an executive summary from the comprehensive report."""
        summary = {
            'industry': report['industry'],
            'overall_health': 'Good',
            'key_metrics': {},
            'top_recommendations': [],
            'critical_risks': []
        }
        
        sections = report.get('sections', {})
        
        # Collect key metrics
        if 'ai_analysis' in sections:
            summary['key_metrics']['ai_efficiency_score'] = sections['ai_analysis']['efficiency_score']['total_score']
            summary['key_metrics']['ai_efficiency_grade'] = sections['ai_analysis']['efficiency_score']['grade']
        
        if 'user_management' in sections:
            summary['key_metrics']['engagement_score'] = sections['user_management']['engagement_score']['total_score']
            summary['key_metrics']['engagement_health'] = sections['user_management']['engagement_score']['health']
        
        if 'project_delivery' in sections:
            summary['key_metrics']['delivery_score'] = sections['project_delivery']['performance_score']['total_score']
            summary['key_metrics']['roi_percentage'] = sections['project_delivery']['performance_score']['roi_percentage']
        
        # Risk summary
        if 'risk_assessment' in sections:
            risk_data = sections['risk_assessment']
            summary['key_metrics']['risk_level'] = risk_data['overall_level']
            summary['key_metrics']['risk_score'] = risk_data['overall_score']
            
            # Get critical risks
            for risk in risk_data.get('risks', []):
                if risk['level'] in ['critical', 'high']:
                    summary['critical_risks'].append({
                        'category': risk['category'],
                        'level': risk['level'],
                        'description': risk['description']
                    })
            
            # Top recommendations
            summary['top_recommendations'] = risk_data.get('all_recommendations', [])[:5]
        
        # Determine overall health
        scores = [v for k, v in summary['key_metrics'].items() if isinstance(v, (int, float)) and 'score' in k.lower()]
        if scores:
            avg_score = sum(scores) / len(scores)
            if avg_score >= 80:
                summary['overall_health'] = 'Excellent'
            elif avg_score >= 60:
                summary['overall_health'] = 'Good'
            elif avg_score >= 40:
                summary['overall_health'] = 'Fair'
            else:
                summary['overall_health'] = 'At Risk'
        
        return summary
