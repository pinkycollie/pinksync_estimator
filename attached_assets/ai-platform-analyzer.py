import enum
from typing import Dict, List, Optional
from dataclasses import dataclass, field

class PlatformType(enum.Enum):
    SOCIAL_MEDIA = "social_media"
    MESSAGING = "messaging"
    PROFESSIONAL = "professional_network"
    CONTENT_PLATFORM = "content_creation"
    E_COMMERCE = "e_commerce"
    ENTERPRISE = "enterprise"

class ModelCapability(enum.Enum):
    NATURAL_LANGUAGE = "nlp"
    IMAGE_GENERATION = "image_gen"
    TRANSLATION = "translation"
    SENTIMENT_ANALYSIS = "sentiment"
    RECOMMENDATION = "recommendation"
    CHATBOT = "conversational"
    CODE_GENERATION = "code_gen"
    MULTIMODAL = "multimodal"

@dataclass
class PlatformIntegrationProfile:
    platform_type: PlatformType
    supported_capabilities: List[ModelCapability]
    technical_requirements: Dict[str, str] = field(default_factory=dict)
    api_complexity: int = 3  # 1-5 scale
    data_privacy_level: int = 3  # 1-5 scale
    user_engagement_metrics: Dict[str, float] = field(default_factory=dict)

class AIModelAnalyzer:
    def __init__(self):
        self.platform_profiles = {
            "facebook": PlatformIntegrationProfile(
                platform_type=PlatformType.SOCIAL_MEDIA,
                supported_capabilities=[
                    ModelCapability.NATURAL_LANGUAGE,
                    ModelCapability.SENTIMENT_ANALYSIS,
                    ModelCapability.RECOMMENDATION
                ],
                technical_requirements={
                    "authentication": "OAuth 2.0",
                    "api_version": "v15.0",
                    "rate_limits": "200 calls/hour"
                },
                api_complexity=4,
                data_privacy_level=3,
                user_engagement_metrics={
                    "avg_session_time": 40,
                    "daily_active_users": 1.9e9,
                    "user_interaction_depth": 0.65
                }
            ),
            "telegram": PlatformIntegrationProfile(
                platform_type=PlatformType.MESSAGING,
                supported_capabilities=[
                    ModelCapability.NATURAL_LANGUAGE,
                    ModelCapability.CHATBOT,
                    ModelCapability.TRANSLATION
                ],
                technical_requirements={
                    "authentication": "Bot API Token",
                    "webhook_support": "Yes",
                    "message_size_limit": "4096 chars"
                },
                api_complexity=2,
                data_privacy_level=4,
                user_engagement_metrics={
                    "avg_session_time": 25,
                    "daily_active_users": 700e6,
                    "user_interaction_depth": 0.55
                }
            )
        }
        
        self.huggingface_model_registry = {
            "nlp": {
                "bert": {
                    "capabilities": [ModelCapability.NATURAL_LANGUAGE],
                    "performance_metrics": {
                        "accuracy": 0.92,
                        "model_size": "110M params",
                        "inference_speed": "moderate"
                    },
                    "recommended_platforms": ["facebook", "linkedin"]
                },
                "gpt2": {
                    "capabilities": [ModelCapability.NATURAL_LANGUAGE, ModelCapability.CHATBOT],
                    "performance_metrics": {
                        "accuracy": 0.88,
                        "model_size": "345M params",
                        "inference_speed": "slow"
                    },
                    "recommended_platforms": ["telegram", "discord"]
                }
            },
            "image_generation": {
                "stable_diffusion": {
                    "capabilities": [ModelCapability.IMAGE_GENERATION],
                    "performance_metrics": {
                        "image_quality": 0.90,
                        "generation_speed": "moderate",
                        "style_diversity": 0.85
                    },
                    "recommended_platforms": ["instagram", "pinterest"]
                }
            }
        }
    
    def analyze_platform_compatibility(self, model_name: str, platform: str) -> Dict:
        """
        Analyze model compatibility with specific platform
        """
        platform_profile = self.platform_profiles.get(platform)
        model_info = self._find_model_info(model_name)
        
        if not platform_profile or not model_info:
            return {"error": "Platform or model not found"}
        
        compatibility_score = self._calculate_compatibility(
            platform_profile, 
            model_info.get('capabilities', []),
            model_info.get('performance_metrics', {})
        )
        
        return {
            "platform": platform,
            "model": model_name,
            "compatibility_score": compatibility_score,
            "recommended_use_cases": self._generate_use_cases(platform, model_name),
            "integration_complexity": platform_profile.api_complexity,
            "data_privacy_considerations": platform_profile.data_privacy_level
        }
    
    def _find_model_info(self, model_name: str) -> Optional[Dict]:
        """Find model information across categories"""
        for category in self.huggingface_model_registry.values():
            if model_name in category:
                return category[model_name]
        return None
    
    def _calculate_compatibility(
        self, 
        platform_profile: PlatformIntegrationProfile, 
        model_capabilities: List[ModelCapability],
        performance_metrics: Dict
    ) -> float:
        """Calculate platform-model compatibility"""
        capability_match = sum(
            1 for cap in model_capabilities 
            if cap in platform_profile.supported_capabilities
        ) / len(platform_profile.supported_capabilities)
        
        performance_factor = sum(
            float(value) for value in performance_metrics.values()
        ) / len(performance_metrics) if performance_metrics else 0.5
        
        return (capability_match + performance_factor) / 2
    
    def _generate_use_cases(self, platform: str, model_name: str) -> List[str]:
        """Generate potential use cases for platform-model combination"""
        platform_type = self.platform_profiles.get(platform).platform_type
        model_info = self._find_model_info(model_name)
        
        use_case_mappings = {
            PlatformType.SOCIAL_MEDIA: [
                "Content recommendation",
                "Sentiment analysis",
                "Personalized user engagement"
            ],
            PlatformType.MESSAGING: [
                "Conversational AI",
                "Language translation",
                "Customer support"
            ]
        }
        
        return use_case_mappings.get(platform_type, [])
    
    def recommend_model(
        self, 
        platform: str, 
        desired_capabilities: List[ModelCapability]
    ) -> Dict:
        """Recommend best-fit model for platform and capabilities"""
        recommendations = []
        
        for category in self.huggingface_model_registry.values():
            for model_name, model_info in category.items():
                if all(cap in model_info.get('capabilities', []) for cap in desired_capabilities):
                    compatibility = self.analyze_platform_compatibility(model_name, platform)
                    recommendations.append({
                        "model": model_name,
                        "compatibility": compatibility,
                        "performance": model_info.get('performance_metrics', {})
                    })
        
        return {
            "top_recommendations": sorted(
                recommendations, 
                key=lambda x: x['compatibility'].get('compatibility_score', 0), 
                reverse=True
            )[:3]
        }

# Example Usage
def main():
    analyzer = AIModelAnalyzer()
    
    # Analyze Facebook platform compatibility for BERT model
    facebook_analysis = analyzer.analyze_platform_compatibility("bert", "facebook")
    print("Facebook-BERT Compatibility:", facebook_analysis)
    
    # Recommend models for Telegram with NLP and Chatbot capabilities
    telegram_recommendations = analyzer.recommend_model(
        "telegram", 
        [ModelCapability.NATURAL_LANGUAGE, ModelCapability.CHATBOT]
    )
    print("Telegram Model Recommendations:", telegram_recommendations)

if __name__ == "__main__":
    main()