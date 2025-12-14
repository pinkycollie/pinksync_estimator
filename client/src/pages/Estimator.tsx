import { useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExternalLink, Code, Calculator } from "lucide-react";

export default function Estimator() {
  useEffect(() => {
    document.title = "PinkSync Universal Estimator";
  }, []);

  return (
    <div className="container py-10">
      <div className="flex flex-col gap-8">
        <div>
          <h1 className="text-4xl font-bold tracking-tight mb-2">
            🩷 PinkSync Universal Estimator
          </h1>
          <p className="text-xl text-muted-foreground">
            Industry-agnostic cost estimation, AI inference analysis, and project delivery metrics
          </p>
        </div>

        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              About the Estimator
            </CardTitle>
            <CardDescription>
              The PinkSync Universal Estimator is the original platform created for forecasting resource usage, 
              timing, and costs for data synchronization and AI inference within the MBTQ ecosystem.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm">
              This comprehensive framework provides:
            </p>
            <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground ml-4">
              <li><strong>Industry-specific cost multipliers</strong> for Healthcare, Finance, Education, Government, Retail, Manufacturing, Technology, Legal, Real Estate, and Entertainment</li>
              <li><strong>AI inference cost analysis</strong> including tokens, GPU utilization, and memory usage</li>
              <li><strong>User management tier analysis</strong> (Free, Basic, Professional, Enterprise)</li>
              <li><strong>Project delivery metrics</strong> and efficiency tracking</li>
              <li><strong>Risk assessment and recommendations</strong> engine</li>
              <li><strong>Cross-industry benchmarking</strong> capabilities</li>
            </ul>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ExternalLink className="h-5 w-5" />
                Interactive Dashboard
              </CardTitle>
              <CardDescription>
                Access the full-featured HTML5 dashboard with interactive visualizations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild className="w-full">
                <a href="/index.html" target="_blank" rel="noopener noreferrer">
                  Open Estimator Dashboard
                  <ExternalLink className="ml-2 h-4 w-4" />
                </a>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Code className="h-5 w-5" />
                Python API
              </CardTitle>
              <CardDescription>
                Use the Python modules for programmatic access to estimation capabilities
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-muted p-4 rounded-md text-sm font-mono">
                <div className="text-muted-foreground mb-2"># Import the estimator</div>
                <div>from pinksync_estimator import PinkSyncEstimator</div>
                <div className="text-muted-foreground mt-2 mb-2"># Or use the universal framework</div>
                <div>from universal_estimator import UniversalPinkSyncEstimator</div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Core Modules</CardTitle>
            <CardDescription>
              Python modules available for cost estimation and analysis
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="border rounded-lg p-4">
                <h3 className="font-semibold mb-2">pinksync_estimator.py</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Core engine for forecasting resource usage, timing, and costs for data synchronization and AI inference
                </p>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li>• calculate_sync_time()</li>
                  <li>• calculate_total_cost()</li>
                  <li>• generate_recommendation()</li>
                </ul>
              </div>
              
              <div className="border rounded-lg p-4">
                <h3 className="font-semibold mb-2">universal_estimator.py</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Comprehensive framework extending the core estimator with multi-industry support
                </p>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li>• calculate_ai_inference_cost()</li>
                  <li>• calculate_user_management_cost()</li>
                  <li>• calculate_project_delivery_cost()</li>
                  <li>• assess_risks()</li>
                  <li>• compare_industries()</li>
                  <li>• generate_comprehensive_report()</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Supported Industries</CardTitle>
            <CardDescription>
              Industry-specific configurations with compliance, security, and operational multipliers
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {[
                { name: 'Healthcare', emoji: '🏥', mult: '2.88x' },
                { name: 'Finance', emoji: '💰', mult: '3.53x' },
                { name: 'Education', emoji: '🎓', mult: '1.44x' },
                { name: 'Government', emoji: '🏛️', mult: '4.28x' },
                { name: 'Retail', emoji: '🛒', mult: '1.57x' },
                { name: 'Manufacturing', emoji: '🏭', mult: '1.87x' },
                { name: 'Technology', emoji: '💻', mult: '1.54x' },
                { name: 'Legal', emoji: '⚖️', mult: '2.70x' },
                { name: 'Real Estate', emoji: '🏠', mult: '1.45x' },
                { name: 'Entertainment', emoji: '🎬', mult: '1.32x' },
              ].map((industry) => (
                <div 
                  key={industry.name}
                  className="border rounded-lg p-3 text-center hover:border-primary/50 transition-colors"
                >
                  <div className="text-2xl mb-1">{industry.emoji}</div>
                  <div className="text-sm font-semibold">{industry.name}</div>
                  <div className="text-xs text-muted-foreground">{industry.mult}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>User Management Tiers</CardTitle>
            <CardDescription>
              Analyze costs and limits across different user tiers
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[
                { name: 'Free', price: '$0', calls: '100', storage: '1 GB', tokens: '10K' },
                { name: 'Basic', price: '$9.99', calls: '1K', storage: '10 GB', tokens: '100K' },
                { name: 'Professional', price: '$29.99', calls: '10K', storage: '100 GB', tokens: '500K' },
                { name: 'Enterprise', price: '$99.99', calls: 'Unlimited', storage: '1 TB', tokens: 'Unlimited' },
              ].map((tier) => (
                <div 
                  key={tier.name}
                  className="border rounded-lg p-4 hover:border-primary/50 transition-colors"
                >
                  <h3 className="font-semibold text-lg mb-2">{tier.name}</h3>
                  <div className="text-2xl font-bold text-primary mb-3">{tier.price}<span className="text-sm text-muted-foreground">/mo</span></div>
                  <ul className="text-xs space-y-1 text-muted-foreground">
                    <li>• {tier.calls} API calls</li>
                    <li>• {tier.storage} storage</li>
                    <li>• {tier.tokens} AI tokens</li>
                  </ul>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
