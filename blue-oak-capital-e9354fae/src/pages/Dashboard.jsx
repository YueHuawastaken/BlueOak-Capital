import React from "react";
import { Search, Wifi, BarChart3 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import LiveWatchlist from "../components/dashboard/LiveWatchlist";
import MarketPulse from "../components/dashboard/MarketPulse";
import StockSearch from "../components/search/StockSearch";
import { createPageUrl } from "@/utils";
import { useWatchlist, useMarketData } from "../components/hooks/useStockData";

export default function Dashboard() {
  const { stocks: featuredStocks, loading: featuredLoading } = useWatchlist();
  const { indices, loading: indicesLoading } = useMarketData();

  const handleStockSelect = (symbol) => {
    if (symbol) {
      window.location.assign(createPageUrl(`Calculator?symbol=${symbol}`));
    }
  };

  return (
    <div className="p-4 lg:p-8 space-y-8 bg-slate-50 min-h-screen">
      {/* Header */}
      <header>
        <div className="flex items-center gap-3 mb-2">
          <BarChart3 className="w-8 h-8 text-blue-600" />
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Market Dashboard</h1>
            <p className="text-slate-600">A real-time overview of key market indicators and leading stocks.</p>
          </div>
        </div>
      </header>

      {/* Quick Search */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="w-5 h-5 text-blue-600" />
            Quick Stock Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <StockSearch onStockSelect={handleStockSelect} />
          <p className="text-xs text-slate-500 mt-2">
            Search any stock to analyze its intrinsic value or see its performance.
          </p>
        </CardContent>
      </Card>
      
      {/* Market Pulse Section */}
      <MarketPulse 
        indices={indices} 
        featuredStocks={featuredStocks} 
        loading={indicesLoading || featuredLoading} 
      />
      
      {/* Live Watchlist of Top 5 Stocks */}
      <LiveWatchlist featuredStocks={featuredStocks} loading={featuredLoading} />
    </div>
  );
}