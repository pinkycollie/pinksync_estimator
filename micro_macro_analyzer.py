"""
Micro to Macro Analysis Module

This module provides tools to track resource usage per user at microscopic scale
and extrapolate to macroeconomic scale for millions of users.
"""

import math
from dataclasses import dataclass, field
from datetime import datetime
from typing import Dict, List, Any, Optional, Tuple
from enum import Enum


class ScaleLevel(Enum):
    """Scale levels for analysis."""
    SINGLE_USER = "single_user"
    HUNDRED_USERS = "hundred_users"
    THOUSAND_USERS = "thousand_users"
    TEN_THOUSAND_USERS = "ten_thousand_users"
    HUNDRED_THOUSAND_USERS = "hundred_thousand_users"
    MILLION_USERS = "million_users"
    TEN_MILLION_USERS = "ten_million_users"


@dataclass
class UserResourceMetrics:
    """Resource metrics for a single user."""
    user_id: str
    storage_gb: float = 0.0
    compute_hours: float = 0.0
    bandwidth_gb: float = 0.0
    api_calls: int = 0
    ai_inference_tokens: int = 0
    cost_per_month: float = 0.0
    tier: str = "free"
    active_days: int = 0
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class ScaleProjection:
    """Projection of resource usage at different scales."""
    scale_level: ScaleLevel
    user_count: int
    total_storage_gb: float
    total_storage_tb: float
    total_compute_hours: float
    total_bandwidth_gb: float
    total_bandwidth_tb: float
    total_api_calls: int
    total_ai_tokens: int
    monthly_cost: float
    annual_cost: float
    infrastructure_requirements: Dict[str, Any]
    scaling_efficiency: float
    recommendations: List[str]


class MicroMacroAnalyzer:
    """
    Analyzes resource usage from microscopic (per-user) to macroeconomic (millions of users) scale.
    
    This class provides tools to:
    - Track individual user resource consumption
    - Project resource needs at various scales
    - Identify scaling inefficiencies
    - Provide cost projections and optimization recommendations
    """
    
    # Scaling efficiency constants
    BASE_EFFICIENCY = 1.0  # No optimization
    SCALE_100_EFFICIENCY = 0.95  # 5% efficiency gain
    SCALE_1K_EFFICIENCY = 0.90  # 10% efficiency gain
    SCALE_10K_EFFICIENCY = 0.85  # 15% efficiency gain
    SCALE_100K_EFFICIENCY = 0.80  # 20% efficiency gain
    SCALE_1M_EFFICIENCY = 0.75  # 25% efficiency gain
    SCALE_10M_EFFICIENCY = 0.70  # 30% efficiency gain
    
    # Infrastructure cost multipliers ($/month per resource unit)
    STORAGE_COST_PER_GB = 0.023  # $0.023/GB/month (AWS S3 standard)
    COMPUTE_COST_PER_HOUR = 0.096  # ~$0.096/CPU-hour (t3.medium equivalent)
    BANDWIDTH_COST_PER_GB = 0.09  # $0.09/GB egress
    API_COST_PER_1K_CALLS = 0.01  # $0.01 per 1000 API calls
    AI_TOKEN_COST_PER_1M = 10.0  # $10 per 1M tokens
    
    def __init__(self):
        """Initialize the micro-macro analyzer."""
        self.user_samples: List[UserResourceMetrics] = []
        self.projections: List[ScaleProjection] = []
    
    def add_user_sample(self, metrics: UserResourceMetrics) -> None:
        """
        Add a user sample to the analysis dataset.
        
        :param metrics: User resource metrics to add.
        """
        self.user_samples.append(metrics)
    
    def calculate_average_user_profile(self) -> UserResourceMetrics:
        """
        Calculate the average resource profile across all user samples.
        
        :returns: Average user metrics.
        """
        if not self.user_samples:
            return UserResourceMetrics(user_id="average", tier="unknown")
        
        count = len(self.user_samples)
        
        avg_storage = sum(u.storage_gb for u in self.user_samples) / count
        avg_compute = sum(u.compute_hours for u in self.user_samples) / count
        avg_bandwidth = sum(u.bandwidth_gb for u in self.user_samples) / count
        avg_api_calls = sum(u.api_calls for u in self.user_samples) / count
        avg_ai_tokens = sum(u.ai_inference_tokens for u in self.user_samples) / count
        avg_cost = sum(u.cost_per_month for u in self.user_samples) / count
        avg_active_days = sum(u.active_days for u in self.user_samples) / count
        
        # Determine most common tier
        tier_counts = {}
        for u in self.user_samples:
            tier_counts[u.tier] = tier_counts.get(u.tier, 0) + 1
        most_common_tier = max(tier_counts, key=tier_counts.get)
        
        return UserResourceMetrics(
            user_id="average_profile",
            storage_gb=avg_storage,
            compute_hours=avg_compute,
            bandwidth_gb=avg_bandwidth,
            api_calls=int(avg_api_calls),
            ai_inference_tokens=int(avg_ai_tokens),
            cost_per_month=avg_cost,
            tier=most_common_tier,
            active_days=int(avg_active_days),
            metadata={
                'sample_size': count,
                'calculated_at': datetime.now().isoformat()
            }
        )
    
    def project_to_scale(
        self,
        target_user_count: int,
        base_metrics: Optional[UserResourceMetrics] = None
    ) -> ScaleProjection:
        """
        Project resource usage to a specific user scale.
        
        :param target_user_count: Number of users to project to.
        :param base_metrics: Base user metrics (uses average if None).
        :returns: Scale projection with resource estimates.
        """
        if base_metrics is None:
            base_metrics = self.calculate_average_user_profile()
        
        # Determine scale level and efficiency
        scale_level, efficiency = self._get_scale_efficiency(target_user_count)
        
        # Calculate base projections (linear scale)
        base_storage = base_metrics.storage_gb * target_user_count
        base_compute = base_metrics.compute_hours * target_user_count
        base_bandwidth = base_metrics.bandwidth_gb * target_user_count
        base_api_calls = base_metrics.api_calls * target_user_count
        base_ai_tokens = base_metrics.ai_inference_tokens * target_user_count
        
        # Apply scaling efficiency (reduced resource per user at scale)
        total_storage = base_storage * efficiency
        total_compute = base_compute * efficiency
        total_bandwidth = base_bandwidth * efficiency
        total_api_calls = int(base_api_calls * efficiency)
        total_ai_tokens = int(base_ai_tokens * efficiency)
        
        # Calculate costs
        storage_cost = total_storage * self.STORAGE_COST_PER_GB
        compute_cost = total_compute * self.COMPUTE_COST_PER_HOUR
        bandwidth_cost = total_bandwidth * self.BANDWIDTH_COST_PER_GB
        api_cost = (total_api_calls / 1000) * self.API_COST_PER_1K_CALLS
        ai_cost = (total_ai_tokens / 1_000_000) * self.AI_TOKEN_COST_PER_1M
        
        monthly_cost = storage_cost + compute_cost + bandwidth_cost + api_cost + ai_cost
        annual_cost = monthly_cost * 12
        
        # Calculate infrastructure requirements
        infrastructure = self._calculate_infrastructure_requirements(
            total_storage, total_compute, total_bandwidth, total_api_calls
        )
        
        # Generate recommendations
        recommendations = self._generate_scale_recommendations(
            scale_level, efficiency, monthly_cost, infrastructure
        )
        
        projection = ScaleProjection(
            scale_level=scale_level,
            user_count=target_user_count,
            total_storage_gb=round(total_storage, 2),
            total_storage_tb=round(total_storage / 1024, 2),
            total_compute_hours=round(total_compute, 2),
            total_bandwidth_gb=round(total_bandwidth, 2),
            total_bandwidth_tb=round(total_bandwidth / 1024, 2),
            total_api_calls=total_api_calls,
            total_ai_tokens=total_ai_tokens,
            monthly_cost=round(monthly_cost, 2),
            annual_cost=round(annual_cost, 2),
            infrastructure_requirements=infrastructure,
            scaling_efficiency=efficiency,
            recommendations=recommendations
        )
        
        self.projections.append(projection)
        return projection
    
    def project_multiple_scales(
        self,
        base_metrics: Optional[UserResourceMetrics] = None
    ) -> List[ScaleProjection]:
        """
        Project resource usage across multiple standard scale levels.
        
        :param base_metrics: Base user metrics (uses average if None).
        :returns: List of projections for different scales.
        """
        scale_targets = [1, 100, 1_000, 10_000, 100_000, 1_000_000, 10_000_000]
        projections = []
        
        for target in scale_targets:
            projection = self.project_to_scale(target, base_metrics)
            projections.append(projection)
        
        return projections
    
    def _get_scale_efficiency(self, user_count: int) -> Tuple[ScaleLevel, float]:
        """
        Get scale level and efficiency multiplier for user count.
        
        :param user_count: Number of users.
        :returns: Tuple of (ScaleLevel, efficiency_multiplier).
        """
        if user_count >= 10_000_000:
            return ScaleLevel.TEN_MILLION_USERS, self.SCALE_10M_EFFICIENCY
        elif user_count >= 1_000_000:
            return ScaleLevel.MILLION_USERS, self.SCALE_1M_EFFICIENCY
        elif user_count >= 100_000:
            return ScaleLevel.HUNDRED_THOUSAND_USERS, self.SCALE_100K_EFFICIENCY
        elif user_count >= 10_000:
            return ScaleLevel.TEN_THOUSAND_USERS, self.SCALE_10K_EFFICIENCY
        elif user_count >= 1_000:
            return ScaleLevel.THOUSAND_USERS, self.SCALE_1K_EFFICIENCY
        elif user_count >= 100:
            return ScaleLevel.HUNDRED_USERS, self.SCALE_100_EFFICIENCY
        else:
            return ScaleLevel.SINGLE_USER, self.BASE_EFFICIENCY
    
    def _calculate_infrastructure_requirements(
        self,
        storage_gb: float,
        compute_hours: float,
        bandwidth_gb: float,
        api_calls: int
    ) -> Dict[str, Any]:
        """
        Calculate infrastructure requirements based on resource usage.
        
        :returns: Dictionary with infrastructure specifications.
        """
        # Storage infrastructure
        storage_servers = math.ceil(storage_gb / 10_000)  # 10TB per storage node
        
        # Compute infrastructure (assume 730 hours/month)
        concurrent_cpus = math.ceil(compute_hours / 730)
        compute_instances = math.ceil(concurrent_cpus / 4)  # 4 vCPUs per instance
        
        # API infrastructure (assume 1000 req/s per instance)
        api_rps = api_calls / (30 * 24 * 3600)  # Convert monthly to req/s
        api_instances = math.ceil(api_rps / 1000)
        
        # Database requirements
        db_size_gb = storage_gb * 0.1  # Metadata ~10% of storage
        db_instances = math.ceil(db_size_gb / 1000)  # 1TB per DB instance
        
        # Load balancers
        load_balancers = 1 if compute_instances > 1 or api_instances > 1 else 0
        
        return {
            'storage_nodes': storage_servers,
            'storage_capacity_tb': round(storage_gb / 1024, 2),
            'compute_instances': compute_instances,
            'total_vcpus': concurrent_cpus,
            'api_instances': api_instances,
            'estimated_api_rps': round(api_rps, 2),
            'database_instances': db_instances,
            'database_size_gb': round(db_size_gb, 2),
            'load_balancers': load_balancers,
            'cdn_required': bandwidth_gb > 10_000,
            'caching_layer_required': api_calls > 10_000_000
        }
    
    def _generate_scale_recommendations(
        self,
        scale_level: ScaleLevel,
        efficiency: float,
        monthly_cost: float,
        infrastructure: Dict[str, Any]
    ) -> List[str]:
        """
        Generate recommendations based on scale analysis.
        
        :returns: List of recommendations.
        """
        recommendations = []
        
        # Scale-specific recommendations
        if scale_level in [ScaleLevel.SINGLE_USER, ScaleLevel.HUNDRED_USERS]:
            recommendations.append("At this scale, focus on product-market fit rather than optimization.")
            recommendations.append("Use managed services to minimize operational overhead.")
        
        elif scale_level == ScaleLevel.THOUSAND_USERS:
            recommendations.append("Start implementing basic caching strategies.")
            recommendations.append("Monitor usage patterns to identify optimization opportunities.")
            recommendations.append("Consider reserved instances for predictable workloads.")
        
        elif scale_level == ScaleLevel.TEN_THOUSAND_USERS:
            recommendations.append("Implement CDN for static content delivery.")
            recommendations.append("Use auto-scaling groups for compute resources.")
            recommendations.append("Establish database read replicas for performance.")
        
        elif scale_level == ScaleLevel.HUNDRED_THOUSAND_USERS:
            recommendations.append("Implement multi-region deployment for redundancy.")
            recommendations.append("Use dedicated cache clusters (Redis/Memcached).")
            recommendations.append("Negotiate enterprise pricing with cloud providers.")
            recommendations.append("Implement comprehensive monitoring and alerting.")
        
        elif scale_level in [ScaleLevel.MILLION_USERS, ScaleLevel.TEN_MILLION_USERS]:
            recommendations.append("CRITICAL: Enterprise-grade architecture required.")
            recommendations.append("Implement microservices architecture for scalability.")
            recommendations.append("Use database sharding and partitioning strategies.")
            recommendations.append("Establish dedicated SRE team for operations.")
            recommendations.append("Implement sophisticated cost optimization strategies.")
            recommendations.append("Consider hybrid or multi-cloud strategy.")
        
        # Cost-based recommendations
        if monthly_cost > 100_000:
            recommendations.append(f"HIGH COST ALERT: Monthly cost is ${monthly_cost:,.2f}. Implement aggressive cost optimization.")
        
        # Infrastructure-based recommendations
        if infrastructure.get('cdn_required'):
            recommendations.append("Implement CDN to reduce bandwidth costs and improve performance.")
        
        if infrastructure.get('caching_layer_required'):
            recommendations.append("Deploy distributed caching layer to reduce database load and API costs.")
        
        if infrastructure['compute_instances'] > 50:
            recommendations.append("Consider containerization (Kubernetes) for better resource utilization.")
        
        return recommendations
    
    def generate_scaling_report(self) -> Dict[str, Any]:
        """
        Generate comprehensive scaling report with all projections.
        
        :returns: Dictionary with complete scaling analysis.
        """
        if not self.user_samples:
            return {
                'error': 'No user samples available for analysis',
                'timestamp': datetime.now().isoformat()
            }
        
        avg_profile = self.calculate_average_user_profile()
        
        # Generate projections if not already done
        if not self.projections:
            self.project_multiple_scales()
        
        # Calculate growth metrics
        growth_analysis = self._analyze_growth_trajectory()
        
        return {
            'timestamp': datetime.now().isoformat(),
            'sample_size': len(self.user_samples),
            'average_user_profile': {
                'storage_gb': round(avg_profile.storage_gb, 4),
                'compute_hours': round(avg_profile.compute_hours, 4),
                'bandwidth_gb': round(avg_profile.bandwidth_gb, 4),
                'api_calls': avg_profile.api_calls,
                'ai_tokens': avg_profile.ai_inference_tokens,
                'cost_per_month': round(avg_profile.cost_per_month, 2),
                'tier': avg_profile.tier,
                'active_days': avg_profile.active_days
            },
            'scale_projections': [
                {
                    'scale_level': p.scale_level.value,
                    'user_count': p.user_count,
                    'total_storage_tb': p.total_storage_tb,
                    'total_compute_hours': p.total_compute_hours,
                    'total_bandwidth_tb': p.total_bandwidth_tb,
                    'monthly_cost': p.monthly_cost,
                    'annual_cost': p.annual_cost,
                    'scaling_efficiency': p.scaling_efficiency,
                    'infrastructure': p.infrastructure_requirements,
                    'recommendations': p.recommendations
                }
                for p in self.projections
            ],
            'growth_analysis': growth_analysis,
            'executive_summary': self._generate_executive_summary()
        }
    
    def _analyze_growth_trajectory(self) -> Dict[str, Any]:
        """Analyze cost and resource growth across scale projections."""
        if len(self.projections) < 2:
            return {}
        
        # Sort projections by user count
        sorted_projections = sorted(self.projections, key=lambda p: p.user_count)
        
        # Calculate growth rates
        cost_growth_rates = []
        for i in range(1, len(sorted_projections)):
            prev = sorted_projections[i-1]
            curr = sorted_projections[i]
            
            user_multiplier = curr.user_count / prev.user_count
            cost_multiplier = curr.monthly_cost / prev.monthly_cost if prev.monthly_cost > 0 else 0
            
            # Efficiency is how much less the cost grows compared to user growth
            efficiency_gain = 1 - (cost_multiplier / user_multiplier) if user_multiplier > 0 else 0
            
            cost_growth_rates.append({
                'from_users': prev.user_count,
                'to_users': curr.user_count,
                'user_multiplier': round(user_multiplier, 2),
                'cost_multiplier': round(cost_multiplier, 2),
                'efficiency_gain_percent': round(efficiency_gain * 100, 2)
            })
        
        return {
            'growth_stages': cost_growth_rates,
            'optimal_scale': self._find_optimal_scale(sorted_projections)
        }
    
    def _find_optimal_scale(self, projections: List[ScaleProjection]) -> Dict[str, Any]:
        """Find the optimal scale point with best cost efficiency."""
        if not projections:
            return {}
        
        # Calculate cost per user for each scale
        cost_per_user_data = []
        for p in projections:
            cpu = p.monthly_cost / p.user_count if p.user_count > 0 else 0
            cost_per_user_data.append((p.user_count, cpu, p.scale_level.value))
        
        # Find minimum cost per user
        min_cpu = min(cost_per_user_data, key=lambda x: x[1])
        
        return {
            'optimal_user_count': min_cpu[0],
            'optimal_scale_level': min_cpu[2],
            'cost_per_user': round(min_cpu[1], 4),
            'reasoning': 'This scale achieves the best balance between economies of scale and operational efficiency.'
        }
    
    def _generate_executive_summary(self) -> Dict[str, Any]:
        """Generate executive summary of scaling analysis."""
        if not self.projections:
            return {}
        
        # Get projections at key milestones
        single_user = next((p for p in self.projections if p.user_count == 1), None)
        thousand = next((p for p in self.projections if p.user_count == 1_000), None)
        million = next((p for p in self.projections if p.user_count == 1_000_000), None)
        
        summary = {
            'key_insights': []
        }
        
        if single_user:
            summary['single_user_monthly_cost'] = single_user.monthly_cost
        
        if thousand:
            summary['thousand_users_monthly_cost'] = thousand.monthly_cost
            summary['thousand_users_annual_cost'] = thousand.annual_cost
        
        if million:
            summary['million_users_monthly_cost'] = million.monthly_cost
            summary['million_users_annual_cost'] = million.annual_cost
            
            if thousand:
                scale_efficiency = 1 - (million.monthly_cost / (thousand.monthly_cost * 1000))
                summary['scaling_efficiency_1k_to_1m'] = round(scale_efficiency * 100, 2)
                summary['key_insights'].append(
                    f"Scaling from 1K to 1M users achieves {scale_efficiency*100:.1f}% cost efficiency through economies of scale."
                )
        
        # Infrastructure insights
        if million:
            infra = million.infrastructure_requirements
            summary['key_insights'].append(
                f"At 1M users, requires {infra['compute_instances']} compute instances, "
                f"{infra['storage_nodes']} storage nodes, and {infra['database_instances']} database instances."
            )
        
        return summary
