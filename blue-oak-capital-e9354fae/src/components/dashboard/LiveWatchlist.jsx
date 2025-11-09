import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  TrendingUp, 
  TrendingDown, 
  Eye, 
  Calculator,
  PiggyBank,
  RefreshCw,
  Activity,
  AlertCircle,
  Star,
  WifiOff
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import StockDetailsModal from "./StockDetailsModal";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { useWatchlist } from "../hooks/useStockData";

export default function LiveWatchlist({ featuredStocks, loading: initialLoading }) {
  const { stocks, loading, error, lastUpdated, refresh } = useWatchlist(featuredStocks, initialLoading);
  const [selectedStock, setSelectedStock] = useState(null);

  const getChangeColor = (change) => {
    return change >= 0 ? 'text-green-600' : 'text-red-600';
  };

  const getChangeIcon = (change) => {
    return change >= 0 ? 
      <TrendingUp className="w-4 h-4 text-green-600" /> : 
      <TrendingDown className="w-4 h-4 text-red-600" />;
  };

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <WifiOff className="w-5 h-5 text-red-500" />
            Market Data Unavailable
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {error}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (loading && stocks.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="w-5 h-5 text-amber-500" />
            Featured Market Movers
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {Array(5).fill(0).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Star className="w-5 h-5 text-amber-500" />
                Featured Market Movers
              </CardTitle>
              <p className="text-sm text-slate-500 mt-1">
                A curated list of market-leading stocks. Data is cached for 60 minutes.
              </p>
            </div>
            <div className="flex items-center gap-2">
              {lastUpdated && (
                <div className="text-xs text-slate-500 flex items-center gap-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  Last updated: {lastUpdated.toLocaleTimeString()}
                </div>
              )}
               <Button 
                variant="ghost" 
                size="icon"
                onClick={refresh}
                disabled={loading}
                title="Force Refresh"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Stock</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Change</TableHead>
                  <TableHead>Market Cap</TableHead>
                  <TableHead>Sector</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stocks.map((stock) => (
                  <TableRow key={stock.symbol} className="hover:bg-slate-50 transition-colors">
                    <TableCell>
                      <div>
                        <p className="font-semibold text-slate-900">{stock.symbol}</p>
                        <p className="text-sm text-slate-500 truncate max-w-48">
                          {stock.company_name}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="font-semibold text-lg">
                      ${stock.current_price?.toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {getChangeIcon(stock.daily_change)}
                        <div className={`text-sm ${getChangeColor(stock.daily_change)}`}>
                          <p className="font-medium">
                            {stock.daily_change >= 0 ? '+' : ''}${stock.daily_change?.toFixed(2)}
                          </p>
                          <p className="text-xs">
                            ({stock.daily_change_percent >= 0 ? '+' : ''}{stock.daily_change_percent?.toFixed(2)}%)
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {stock.market_cap ? `$${(stock.market_cap / 1_000_000_000).toFixed(2)}B` : 'N/A'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{stock.sector}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedStock(stock)}
                          className="h-8 w-8 p-0"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Link to={`${createPageUrl("Calculator")}?symbol=${stock.symbol}`}>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            title="Analyze Intrinsic Value"
                          >
                            <Calculator className="w-4 h-4" />
                          </Button>
                        </Link>
                        <Link to={`${createPageUrl("DividendPlanner")}?symbol=${stock.symbol}`}>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              title="Plan Dividend Income"
                            >
                              <PiggyBank className="w-4 h-4" />
                            </Button>
                          </Link>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      <StockDetailsModal 
        stock={selectedStock}
        open={!!selectedStock}
        onClose={() => setSelectedStock(null)}
      />
    </>
  );
}