import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, TrendingDown, Activity, Zap } from "lucide-react";

const IndexCard = ({ symbol, data, loading }) => {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-20" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-7 w-28 mb-2" />
          <Skeleton className="h-4 w-20" />
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const isPositive = data.daily_change_percent >= 0;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">{symbol}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">${data.current_price?.toFixed(2)}</div>
        <div className="flex items-center gap-1 text-xs">
          {isPositive ? (
            <TrendingUp className="w-3 h-3 text-green-600" />
          ) : (
            <TrendingDown className="w-3 h-3 text-red-600" />
          )}
          <span className={isPositive ? "text-green-600" : "text-red-600"}>
            {isPositive ? '+' : ''}{data.daily_change_percent?.toFixed(2)}%
          </span>
        </div>
      </CardContent>
    </Card>
  );
};

const TopMoverCard = ({ stocks, loading }) => {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-24" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-7 w-20 mb-2" />
          <Skeleton className="h-4 w-24" />
        </CardContent>
      </Card>
    );
  }

  const topMover = stocks.reduce((max, stock) => 
    Math.abs(stock.daily_change_percent) > Math.abs(max.daily_change_percent) ? stock : max, 
    stocks[0] || {}
  );
  
  if (!topMover.symbol) return null;

  const isPositive = topMover.daily_change_percent >= 0;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-1">
          <Zap className="w-4 h-4 text-purple-600" />
          Top Mover
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{topMover.symbol}</div>
        <div className="flex items-center gap-1 text-xs">
          {isPositive ? (
            <TrendingUp className="w-3 h-3 text-green-600" />
          ) : (
            <TrendingDown className="w-3 h-3 text-red-600" />
          )}
          <span className={isPositive ? 'text-green-600' : 'text-red-600'}>
            {isPositive ? '+' : ''}{topMover.daily_change_percent?.toFixed(2)}%
          </span>
        </div>
      </CardContent>
    </Card>
  );
};

export default function MarketPulse({ indices, featuredStocks, loading }) {
  return (
    <div>
      <h2 className="text-xl font-semibold text-slate-800 mb-4">Market Pulse</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        <IndexCard symbol="S&P 500" data={indices.SPY} loading={loading} />
        <IndexCard symbol="NASDAQ" data={indices.QQQ} loading={loading} />
        <TopMoverCard stocks={featuredStocks} loading={loading} />
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-1">
              <Activity className="w-4 h-4 text-slate-500" />
              Data Source
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-green-600">Finnhub API</div>
            <p className="text-xs text-slate-500">Real-time market data</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}