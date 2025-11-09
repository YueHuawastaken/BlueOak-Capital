import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign,
  Activity,
  PieChart,
  Calculator,
  PiggyBank,
  Building2,
  Globe,
  Users,
  Calendar,
  BarChart3,
  Target,
  Percent
} from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function StockDetailsModal({ stock, open, onClose }) {
  const [activeTab, setActiveTab] = useState("overview");

  if (!stock) return null;

  const formatLargeNumber = (num) => {
    if (!num) return 'N/A';
    
    if (num >= 1e12) {
      return `$${(num / 1e12).toFixed(2)}T`;
    } else if (num >= 1e9) {
      return `$${(num / 1e9).toFixed(2)}B`;
    } else if (num >= 1e6) {
      return `$${(num / 1e6).toFixed(2)}M`;
    } else {
      return `$${num.toLocaleString()}`;
    }
  };

  const formatPercent = (num) => {
    if (!num && num !== 0) return 'N/A';
    return `${(num * 100).toFixed(2)}%`;
  };

  const overviewMetrics = [
    { label: 'Market Cap', value: formatLargeNumber(stock.market_cap), icon: PieChart, color: 'text-blue-600' },
    { label: 'P/E Ratio', value: stock.fundamentals?.pe_ratio ? stock.fundamentals.pe_ratio.toFixed(2) : 'N/A', icon: Activity, color: 'text-purple-600' },
    { label: 'Book Value', value: stock.fundamentals?.book_value ? `$${stock.fundamentals.book_value.toFixed(2)}` : 'N/A', icon: DollarSign, color: 'text-green-600' },
    { label: 'EPS', value: stock.fundamentals?.eps ? `$${stock.fundamentals.eps.toFixed(2)}` : 'N/A', icon: TrendingUp, color: 'text-amber-600' },
    { label: 'Beta', value: stock.fundamentals?.beta ? stock.fundamentals.beta.toFixed(2) : 'N/A', icon: Activity, color: 'text-red-600' },
    { label: 'Dividend Yield', value: stock.dividend?.dividend_yield ? `${stock.dividend.dividend_yield.toFixed(2)}%` : 'N/A', icon: Percent, color: 'text-emerald-600' }
  ];

  const financialMetrics = [
    { label: 'Revenue (TTM)', value: formatLargeNumber(stock.fundamentals?.revenue_ttm), category: 'Revenue' },
    { label: 'Gross Profit (TTM)', value: formatLargeNumber(stock.fundamentals?.gross_profit_ttm), category: 'Revenue' },
    { label: 'Operating Margin', value: formatPercent(stock.fundamentals?.operating_margin_ttm), category: 'Margins' },
    { label: 'Net Margin', value: formatPercent(stock.fundamentals?.net_margin_ttm), category: 'Margins' },
    { label: 'ROE', value: formatPercent(stock.fundamentals?.roe), category: 'Returns' },
    { label: 'ROA', value: formatPercent(stock.fundamentals?.roa), category: 'Returns' },
    { label: 'Free Cash Flow', value: formatLargeNumber(stock.fundamentals?.free_cash_flow), category: 'Cash Flow' },
    { label: 'Operating Cash Flow', value: formatLargeNumber(stock.fundamentals?.operating_cash_flow), category: 'Cash Flow' },
    { label: 'Debt/Equity', value: stock.fundamentals?.debt_to_equity ? stock.fundamentals.debt_to_equity.toFixed(2) : 'N/A', category: 'Leverage' },
    { label: 'Current Ratio', value: stock.fundamentals?.current_ratio ? stock.fundamentals.current_ratio.toFixed(2) : 'N/A', category: 'Liquidity' }
  ];

  const technicalMetrics = [
    { label: '52W High', value: stock.technical?.week_52_high ? `$${stock.technical.week_52_high.toFixed(2)}` : 'N/A' },
    { label: '52W Low', value: stock.technical?.week_52_low ? `$${stock.technical.week_52_low.toFixed(2)}` : 'N/A' },
    { label: '50D MA', value: stock.technical?.day_50_ma ? `$${stock.technical.day_50_ma.toFixed(2)}` : 'N/A' },
    { label: '200D MA', value: stock.technical?.day_200_ma ? `$${stock.technical.day_200_ma.toFixed(2)}` : 'N/A' },
    { label: 'RSI (14)', value: stock.technical?.rsi_14 ? stock.technical.rsi_14.toFixed(1) : 'N/A' },
    { label: 'Avg Volume (10D)', value: stock.technical?.volume_avg_10day ? `${(stock.technical.volume_avg_10day / 1000000).toFixed(1)}M` : 'N/A' }
  ];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-lg">{stock.symbol[0]}</span>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold">{stock.symbol}</h2>
                <Badge variant="outline">{stock.exchange}</Badge>
                <Badge variant="secondary">{stock.sector}</Badge>
              </div>
              <p className="text-slate-600 font-normal">{stock.company_name}</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold">${stock.current_price?.toFixed(2)}</p>
              <div className="flex items-center gap-1">
                {stock.daily_change >= 0 ? (
                  <TrendingUp className="w-4 h-4 text-green-600" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-red-600" />
                )}
                <span className={`text-sm ${stock.daily_change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {stock.daily_change >= 0 ? '+' : ''}${stock.daily_change?.toFixed(2)} ({stock.daily_change_percent >= 0 ? '+' : ''}{stock.daily_change_percent?.toFixed(2)}%)
                </span>
              </div>
            </div>
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="financials">Financials</TabsTrigger>
            <TabsTrigger value="dividends">Dividends</TabsTrigger>
            <TabsTrigger value="technical">Technical</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Company Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="w-5 h-5" />
                  Company Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Globe className="w-4 h-4 text-slate-500" />
                      <span className="text-sm text-slate-600">Industry:</span>
                      <span className="font-medium">{stock.industry}</span>
                    </div>
                    {stock.employees && (
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-slate-500" />
                        <span className="text-sm text-slate-600">Employees:</span>
                        <span className="font-medium">{stock.employees.toLocaleString()}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-slate-500" />
                      <span className="text-sm text-slate-600">Founded:</span>
                      <span className="font-medium">{stock.founded}</span>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-slate-500" />
                      <span className="text-sm text-slate-600">Headquarters:</span>
                      <span className="font-medium">{stock.headquarters}</span>
                    </div>
                    {stock.website && (
                      <div className="flex items-center gap-2">
                        <Globe className="w-4 h-4 text-slate-500" />
                        <span className="text-sm text-slate-600">Website:</span>
                        <a href={stock.website} target="_blank" rel="noopener noreferrer" 
                           className="font-medium text-blue-600 hover:text-blue-800">
                          {stock.website.replace('https://', '')}
                        </a>
                      </div>
                    )}
                  </div>
                </div>
                <p className="text-slate-700 mt-4 leading-relaxed">{stock.description}</p>
              </CardContent>
            </Card>

            {/* Key Metrics */}
            <Card>
              <CardHeader>
                <CardTitle>Key Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {overviewMetrics.map((metric, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border border-slate-200 rounded-lg">
                      <div className="flex items-center gap-3">
                        <metric.icon className={`w-4 h-4 ${metric.color}`} />
                        <span className="text-slate-700 text-sm">{metric.label}</span>
                      </div>
                      <span className="font-semibold text-slate-900">{metric.value}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="financials" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  Financial Performance
                </CardTitle>
              </CardHeader>
              <CardContent>
                {['Revenue', 'Margins', 'Returns', 'Cash Flow', 'Leverage', 'Liquidity'].map(category => (
                  <div key={category} className="mb-6">
                    <h4 className="font-semibold text-slate-900 mb-3 text-sm uppercase tracking-wider">{category}</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {financialMetrics
                        .filter(metric => metric.category === category)
                        .map((metric, index) => (
                          <div key={index} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                            <span className="text-slate-700">{metric.label}</span>
                            <span className="font-semibold text-slate-900">{metric.value}</span>
                          </div>
                        ))
                      }
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="dividends" className="space-y-6">
            {stock.dividend?.dividend_yield > 0 ? (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <PiggyBank className="w-5 h-5" />
                      Dividend Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                      <div className="bg-green-50 rounded-lg p-4">
                        <p className="text-sm text-green-600">Dividend Yield</p>
                        <p className="text-2xl font-bold text-green-900">{stock.dividend.dividend_yield.toFixed(2)}%</p>
                      </div>
                      <div className="bg-blue-50 rounded-lg p-4">
                        <p className="text-sm text-blue-600">Annual Dividend</p>
                        <p className="text-2xl font-bold text-blue-900">${stock.dividend.dividend_per_share.toFixed(2)}</p>
                      </div>
                      <div className="bg-purple-50 rounded-lg p-4">
                        <p className="text-sm text-purple-600">Payout Ratio</p>
                        <p className="text-2xl font-bold text-purple-900">{(stock.dividend.payout_ratio * 100).toFixed(1)}%</p>
                      </div>
                      <div className="bg-amber-50 rounded-lg p-4">
                        <p className="text-sm text-amber-600">5Y Growth</p>
                        <p className="text-2xl font-bold text-amber-900">{(stock.dividend.dividend_growth_5yr * 100).toFixed(1)}%</p>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-semibold text-slate-900 mb-3">Recent Dividend History</h4>
                      <div className="space-y-2">
                        {stock.dividend.dividend_history?.map((payment, index) => (
                          <div key={index} className="flex justify-between items-center p-3 border border-slate-200 rounded-lg">
                            <span className="text-slate-700">{new Date(payment.date).toLocaleDateString()}</span>
                            <span className="font-semibold text-slate-900">${payment.amount.toFixed(4)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card>
                <CardContent className="text-center py-12">
                  <PiggyBank className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500 text-lg">No Dividend Information</p>
                  <p className="text-slate-400">This stock does not currently pay dividends</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="technical" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5" />
                  Technical Analysis
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {technicalMetrics.map((metric, index) => (
                    <div key={index} className="flex justify-between items-center p-3 border border-slate-200 rounded-lg">
                      <span className="text-slate-700">{metric.label}</span>
                      <span className="font-semibold text-slate-900">{metric.value}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3 pt-4 border-t border-slate-200">
          <Link to={`${createPageUrl("Calculator")}?symbol=${stock.symbol}`} onClick={onClose}>
            <Button className="bg-blue-600 hover:bg-blue-700 gap-2">
              <Calculator className="w-4 h-4" />
              Analyze Intrinsic Value
            </Button>
          </Link>
          {stock.dividend?.dividend_yield > 0 && (
            <Link to={`${createPageUrl("DividendPlanner")}?symbol=${stock.symbol}`} onClick={onClose}>
              <Button variant="outline" className="gap-2">
                <PiggyBank className="w-4 h-4" />
                Plan Dividend Income
              </Button>
            </Link>
          )}
          <Link to={createPageUrl("Portfolio")} onClick={onClose}>
            <Button variant="outline" className="gap-2">
              <TrendingUp className="w-4 h-4" />
              Add to Portfolio
            </Button>
          </Link>
        </div>
      </DialogContent>
    </Dialog>
  );
}