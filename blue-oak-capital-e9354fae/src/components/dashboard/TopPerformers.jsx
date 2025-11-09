import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Award } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function TopPerformers({ investments, loading }) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Top Performers</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array(3).fill(0).map((_, i) => (
              <div key={i} className="flex justify-between items-center">
                <div className="space-y-1">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-4 w-12" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const performersWithGains = investments.map(investment => {
    const currentPrice = investment.current_price || investment.purchase_price;
    const gainLossPercent = ((currentPrice - investment.purchase_price) / investment.purchase_price) * 100;
    return { ...investment, gainLossPercent };
  });

  const topPerformers = performersWithGains
    .sort((a, b) => b.gainLossPercent - a.gainLossPercent)
    .slice(0, 5);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Award className="w-5 h-5" />
          Top Performers
        </CardTitle>
      </CardHeader>
      <CardContent>
        {topPerformers.length === 0 ? (
          <div className="text-center py-8">
            <TrendingUp className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500">No investments to analyze yet</p>
          </div>
        ) : (
          <div className="space-y-4">
            {topPerformers.map((investment, index) => (
              <div key={investment.id} className="flex justify-between items-center">
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      index === 0 ? 'bg-yellow-100 text-yellow-800' : 
                      index === 1 ? 'bg-slate-100 text-slate-700' :
                      index === 2 ? 'bg-orange-100 text-orange-800' :
                      'bg-slate-50 text-slate-600'
                    }`}>
                      {index + 1}
                    </span>
                    <p className="font-medium text-slate-900">{investment.symbol}</p>
                  </div>
                  <p className="text-sm text-slate-500 ml-8">{investment.company_name}</p>
                </div>
                <div className="flex items-center gap-1">
                  {investment.gainLossPercent >= 0 ? (
                    <TrendingUp className="w-4 h-4 text-green-600" />
                  ) : (
                    <TrendingDown className="w-4 h-4 text-red-600" />
                  )}
                  <span className={`font-medium ${
                    investment.gainLossPercent >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {investment.gainLossPercent >= 0 ? '+' : ''}{investment.gainLossPercent.toFixed(1)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}