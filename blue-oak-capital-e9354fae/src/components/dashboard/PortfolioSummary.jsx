import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function PortfolioSummary({ investments, loading }) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Portfolio Holdings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array(3).fill(0).map((_, i) => (
              <div key={i} className="flex justify-between">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-16" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (investments.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Portfolio Holdings</CardTitle>
        </CardHeader>
        <CardContent className="text-center py-8">
          <p className="text-slate-500">No investments yet. Add your first investment to get started.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Portfolio Holdings</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Symbol</TableHead>
              <TableHead>Shares</TableHead>
              <TableHead>Current Price</TableHead>
              <TableHead>Market Value</TableHead>
              <TableHead>Gain/Loss</TableHead>
              <TableHead>Sector</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {investments.map((investment) => {
              const currentPrice = investment.current_price || investment.purchase_price;
              const marketValue = investment.shares * currentPrice;
              const costBasis = investment.shares * investment.purchase_price;
              const gainLoss = marketValue - costBasis;
              const gainLossPercent = (gainLoss / costBasis) * 100;

              return (
                <TableRow key={investment.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{investment.symbol}</p>
                      <p className="text-sm text-slate-500">{investment.company_name}</p>
                    </div>
                  </TableCell>
                  <TableCell>{investment.shares}</TableCell>
                  <TableCell>${currentPrice.toFixed(2)}</TableCell>
                  <TableCell>${marketValue.toLocaleString('en-US', { maximumFractionDigits: 0 })}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {gainLoss >= 0 ? (
                        <TrendingUp className="w-4 h-4 text-green-600" />
                      ) : (
                        <TrendingDown className="w-4 h-4 text-red-600" />
                      )}
                      <span className={gainLoss >= 0 ? 'text-green-600' : 'text-red-600'}>
                        {gainLoss >= 0 ? '+' : ''}${gainLoss.toFixed(0)} ({gainLossPercent.toFixed(1)}%)
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {investment.sector && (
                      <Badge variant="secondary">{investment.sector}</Badge>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}