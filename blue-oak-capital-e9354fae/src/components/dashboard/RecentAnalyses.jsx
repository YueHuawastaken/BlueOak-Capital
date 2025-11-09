import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calculator, TrendingUp } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";

export default function RecentAnalyses({ analyses, loading }) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Analyses</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array(3).fill(0).map((_, i) => (
              <div key={i} className="flex justify-between items-center p-3 border rounded">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-3 w-32" />
                </div>
                <Skeleton className="h-6 w-16" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (analyses.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="w-5 h-5" />
            Recent Analyses
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-8">
          <Calculator className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500">No stock analyses yet. Try the Intrinsic Value Calculator.</p>
        </CardContent>
      </Card>
    );
  }

  const getRecommendationColor = (recommendation) => {
    switch (recommendation) {
      case 'Strong Buy':
      case 'Buy':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'Hold':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Sell':
      case 'Strong Sell':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="w-5 h-5" />
          Recent Analyses
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {analyses.map((analysis) => (
            <div key={analysis.id} className="flex justify-between items-center p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
              <div>
                <div className="flex items-center gap-3">
                  <h4 className="font-semibold text-slate-900">{analysis.symbol}</h4>
                  <Badge 
                    variant="outline"
                    className={`${getRecommendationColor(analysis.recommendation)} border`}
                  >
                    {analysis.recommendation}
                  </Badge>
                </div>
                <p className="text-sm text-slate-600 mt-1">{analysis.company_name}</p>
                <p className="text-xs text-slate-500 mt-1">
                  {format(new Date(analysis.created_date), "MMM d, yyyy")}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-slate-600">Intrinsic Value</p>
                <p className="font-semibold text-slate-900">${analysis.intrinsic_value.toFixed(2)}</p>
                <p className="text-xs text-slate-500">vs ${analysis.current_price.toFixed(2)} current</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}