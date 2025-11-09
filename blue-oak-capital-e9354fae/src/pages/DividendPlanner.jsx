
import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { PiggyBank, TrendingUp, Info, Zap, Loader2, AlertTriangle, LineChart, Calendar, Target, Repeat } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import DividendDataService from "../components/services/DividendDataService";
import { ResponsiveContainer, LineChart as RechartsLineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend } from 'recharts';

// Removed COLORS constant as it was for PieChart
// Removed CustomTooltip component as it was for PieChart

const MetricCell = ({ value, unit = '', isPercent = false, threshold = null, direction = 'lower' }) => {
    if (value === null || value === undefined) {
        return <span className="text-slate-400">N/A</span>;
    }

    const formattedValue = isPercent ? `${(value * 100).toFixed(1)}%` : value.toFixed(1);
    let colorClass = 'text-slate-700';
    if (threshold !== null) {
        if ((direction === 'lower' && value < threshold) || (direction === 'higher' && value > threshold)) {
            colorClass = 'text-green-600';
        } else {
            colorClass = 'text-red-600';
        }
    }

    return <span className={colorClass}>{formattedValue}{unit}</span>;
};

const formatCurrency = (value) => {
  if (value === null || value === undefined) return 'N/A';
  const numValue = parseFloat(value);
  if (isNaN(numValue)) return 'N/A';

  if (numValue >= 1_000_000) return `$${(numValue / 1_000_000).toFixed(1)}M`;
  if (numValue >= 1_000) return `$${(numValue / 1_000).toFixed(0)}K`;
  return `$${numValue.toFixed(0)}`;
};

export default function DividendPlanner() {
  const [plannerData, setPlannerData] = useState({
    targetIncome: '1000',
    riskTolerance: 'medium',
    initialInvestment: '25000',
    timeHorizon: '20'
  });

  const [timelineInputs, setTimelineInputs] = useState({
    monthlyContribution: '500',
    dividendGrowthRate: 3,
    priceAppreciationRate: 5,
    isCompounding: true,
  });

  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [timelineProjection, setTimelineProjection] = useState(null);
  const [screeningProgress, setScreeningProgress] = useState(null);

  const handleCalculateTimeline = useCallback(() => {
    if (!results) return;

    const initialCapital = parseFloat(plannerData.initialInvestment) || 0;
    const monthlyContribution = parseFloat(timelineInputs.monthlyContribution) || 0;
    const targetAnnualIncome = parseFloat(plannerData.targetIncome) * 12;
    const portfolioYield = (results.portfolioYield || 0) / 100;
    const dividendGrowth = timelineInputs.dividendGrowthRate / 100;
    const priceAppreciation = timelineInputs.priceAppreciationRate / 100;

    let capital = initialCapital;
    let currentYield = portfolioYield;
    const projectionData = [{ year: 0, capital: initialCapital, income: initialCapital * currentYield }];
    let years_to_goal = -1;

    for (let year = 1; year <= parseInt(plannerData.timeHorizon); year++) {
      // Add contributions for the year
      capital += monthlyContribution * 12;

      // Calculate dividends for the year based on the start-of-year capital
      const annualDividends = capital * currentYield;

      // Reinvest dividends if compounding is on
      if (timelineInputs.isCompounding) {
        capital += annualDividends;
      }
      
      // Apply share price appreciation to the entire capital base
      capital *= (1 + priceAppreciation);

      // Apply dividend growth to the yield rate for next year
      currentYield *= (1 + dividendGrowth);

      const generatedIncome = capital * currentYield;
      projectionData.push({ year, capital, income: generatedIncome });
      
      if (generatedIncome >= targetAnnualIncome && years_to_goal === -1) {
        years_to_goal = year;
      }
    }

    setTimelineProjection({
      data: projectionData,
      yearsToGoal: years_to_goal,
    });
  }, [plannerData.initialInvestment, plannerData.targetIncome, plannerData.timeHorizon, results, timelineInputs.monthlyContribution, timelineInputs.dividendGrowthRate, timelineInputs.priceAppreciationRate, timelineInputs.isCompounding]);

  useEffect(() => {
    if (results) {
      handleCalculateTimeline();
    }
  }, [results, timelineInputs, handleCalculateTimeline]);

  const handleGeneratePlan = async () => {
    setLoading(true);
    setError(null);
    setResults(null);
    setScreeningProgress({ step: 0, total: 1, message: 'Initializing...', percentage: 0 });
    
    try {
      const plan = await DividendDataService.generateDividendPlan({
        targetAnnualIncome: parseFloat(plannerData.targetIncome) * 12,
        riskTolerance: plannerData.riskTolerance,
        progressCallback: setScreeningProgress
      });

      if (plan.portfolio.length === 0) {
        setError("Could not find enough suitable stocks matching the criteria. Please try a different risk tolerance.");
      } else {
        setResults(plan);
      }
    } catch (err) {
      console.error("Error generating plan:", err);
      setError(err.message || "An unexpected error occurred while generating the plan.");
    } finally {
      setLoading(false);
      setScreeningProgress(null);
    }
  };

  // Removed allocationData calculation as Sector Allocation is removed

  return (
    <TooltipProvider>
      <div className="p-4 lg:p-8 bg-slate-50 min-h-screen">
        {/* Header */}
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-gradient-to-br from-green-600 to-green-700 rounded-2xl flex items-center justify-center">
              <PiggyBank className="w-8 h-8 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-slate-900">Intelligent Dividend Planner</h1>
          <p className="text-slate-600 mt-2">Generate a diversified portfolio to meet your passive income goals.</p>
        </div>

        {/* User Input Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-green-600" />
              Set Your Dividend Goals
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div>
                <Label htmlFor="targetIncome">Target Monthly Income ($)</Label>
                <Input
                  id="targetIncome"
                  type="number"
                  placeholder="1000"
                  value={plannerData.targetIncome}
                  onChange={(e) => setPlannerData(prev => ({ ...prev, targetIncome: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="riskTolerance">Risk Tolerance</Label>
                <Select
                  value={plannerData.riskTolerance}
                  onValueChange={(value) => setPlannerData(prev => ({ ...prev, riskTolerance: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low Risk (Stable, Lower Yield)</SelectItem>
                    <SelectItem value="medium">Medium Risk (Balanced)</SelectItem>
                    <SelectItem value="high">High Risk (Higher Yield, More Volatility)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="initialInvestment">Current Investment Capital ($)</Label>
                <Input
                  id="initialInvestment"
                  type="number"
                  placeholder="25000"
                  value={plannerData.initialInvestment}
                  onChange={(e) => setPlannerData(prev => ({ ...prev, initialInvestment: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="timeHorizon">Max Time Horizon (Years)</Label>
                 <Input
                  id="timeHorizon"
                  type="number"
                  placeholder="20"
                  value={plannerData.timeHorizon}
                  onChange={(e) => setPlannerData(prev => ({ ...prev, timeHorizon: e.target.value }))}
                />
              </div>
            </div>

            <Button
              onClick={handleGeneratePlan}
              disabled={loading}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <TrendingUp className="w-4 h-4 mr-2" />
              )}
              {loading ? 'Analyzing Stocks...' : 'Generate Dividend Plan'}
            </Button>
          </CardContent>
        </Card>
        
        {/* Progress Indicator */}
        {loading && screeningProgress && (
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-blue-900">{screeningProgress.message}</p>
                    <p className="text-xs text-blue-700">
                      Step {screeningProgress.step} of {screeningProgress.total} • API-optimized screening in progress
                    </p>
                  </div>
                </div>
                <div className="w-full bg-blue-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${screeningProgress.percentage}%` }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {error && (
            <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
            </Alert>
        )}

        {/* Results Dashboard */}
        {results && (
          <div className="space-y-8">
            {/* Summary Cards with Data Freshness Indicator */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Required Investment</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-green-700">${results.totalInvestment.toLocaleString('en-US', { maximumFractionDigits: 0 })}</p>
                  <p className="text-slate-500">to generate ${results.annualIncome.toLocaleString()}/year.</p>
                </CardContent>
              </Card>
               <Card>
                <CardHeader>
                  <CardTitle>Projected Portfolio Yield</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-green-700">{results.portfolioYield.toFixed(2)}%</p>
                  <p className="text-slate-500">Average yield across portfolio.</p>
                </CardContent>
              </Card>
               <Card>
                <CardHeader>
                  <CardTitle>Number of Holdings</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-green-700">{results.portfolio.length}</p>
                   <p className="text-slate-500">Aims for a focused 5-stock portfolio.</p> {/* Updated text */}
                   {results.dataFreshness && (
                    <div className="mt-2 text-xs text-slate-600">
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span>{results.dataFreshness.fresh} fresh</span>
                        {results.dataFreshness.cached > 0 && (
                          <>
                            <div className="w-2 h-2 bg-amber-500 rounded-full ml-2"></div>
                            <span>{results.dataFreshness.cached} cached</span>
                          </>
                        )}
                        {results.dataFreshness.estimated > 0 && (
                          <>
                            <div className="w-2 h-2 bg-red-500 rounded-full ml-2"></div>
                            <span>{results.dataFreshness.estimated} estimated</span>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
            
            {/* Portfolio Details */}
            {/* Adjusted grid to no longer account for Sector Allocation column */}
            <div className="grid grid-cols-1 lg:grid-cols-1 gap-8">
              <div className="lg:col-span-1"> {/* This will now span the full width */}
                <Card>
                  <CardHeader>
                    <CardTitle>Recommended Portfolio</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                           <tr className="border-b">
                            <th className="text-left p-2">Stock</th>
                            <th className="text-right p-2">Shares</th>
                            <th className="text-right p-2">Annual Div</th>
                            <th className="text-right p-2">Portfolio %</th>
                            <th className="text-right p-2">Yield</th>
                            <th className="text-right p-2">P/E</th>
                            <th className="text-right p-2">Payout Ratio</th>
                            <th className="text-right p-2">Debt/Equity</th>
                          </tr>
                        </thead>
                        <tbody>
                          {results.portfolio.map(stock => (
                            <tr key={stock.symbol} className="border-b last:border-0 hover:bg-slate-50">
                              <td className="p-2">
                                <div className="flex items-center gap-2">
                                  <p className="font-semibold">{stock.symbol}</p>
                                  {stock.warnings && stock.warnings.length > 0 && (
                                    <Tooltip>
                                      <TooltipTrigger>
                                        <AlertTriangle className="w-4 h-4 text-amber-500" />
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <ul className="list-disc list-inside">
                                          {stock.warnings.map((w, i) => <li key={i}>{w}</li>)}
                                        </ul>
                                      </TooltipContent>
                                    </Tooltip>
                                  )}
                                  {stock.dataAge && stock.dataAge !== 'Fresh' && (
                                    <Tooltip>
                                      <TooltipTrigger>
                                        <div className={`w-2 h-2 rounded-full ${
                                          stock.dataAge.includes('Cached') ? 'bg-amber-500' : 'bg-red-500'
                                        }`}></div>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        Data age: {stock.dataAge}
                                      </TooltipContent>
                                    </Tooltip>
                                  )}
                                </div>
                                <p className="text-xs text-slate-500">{stock.sector}</p>
                              </td>
                              <td className="text-right p-2 font-medium">{stock.sharesNeeded.toFixed(0)}</td>
                              <td className="text-right p-2 text-green-600 font-medium">${stock.expectedAnnualDividend.toLocaleString('en-US', { maximumFractionDigits: 0 })}</td>
                              <td className="text-right p-2">{stock.portfolioPercentage.toFixed(1)}%</td>
                              <td className="text-right p-2"><MetricCell value={stock.yield} unit="%" threshold={3} direction="higher" /></td>
                              <td className="text-right p-2"><MetricCell value={stock.peRatio} threshold={25} direction="lower" /></td>
                              <td className="text-right p-2"><MetricCell value={stock.payoutRatio} isPercent threshold={0.85} direction="lower" /></td>
                              <td className="text-right p-2"><MetricCell value={stock.debtToEquity} threshold={1.0} direction="lower" /></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </div>
              {/* Removed Sector Allocation Card */}
            </div>

            {/* Timeline Projection */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <LineChart className="w-5 h-5 text-purple-600" />
                  Projected Timeline to Goal
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Timeline Inputs */}
                <div className="lg:col-span-1 space-y-6">
                  <div>
                    <Label htmlFor="monthlyContribution">Additional Monthly Contribution ($)</Label>
                    <Input
                      id="monthlyContribution"
                      type="number"
                      placeholder="500"
                      value={timelineInputs.monthlyContribution}
                      onChange={(e) => setTimelineInputs(prev => ({ ...prev, monthlyContribution: e.target.value }))}
                    />
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <Label htmlFor="dividendGrowthRate">Est. Annual Dividend Growth</Label>
                      <span className="font-semibold">{timelineInputs.dividendGrowthRate}%</span>
                    </div>
                    <Slider
                      id="dividendGrowthRate"
                      min={0} max={10} step={0.5}
                      value={[timelineInputs.dividendGrowthRate]}
                      onValueChange={(val) => setTimelineInputs(prev => ({ ...prev, dividendGrowthRate: val[0] }))}
                    />
                  </div>

                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <Label htmlFor="priceAppreciationRate">Est. Annual Share Price Growth</Label>
                      <span className="font-semibold">{timelineInputs.priceAppreciationRate}%</span>
                    </div>
                    <Slider
                      id="priceAppreciationRate"
                      min={0} max={15} step={0.5}
                      value={[timelineInputs.priceAppreciationRate]}
                      onValueChange={(val) => setTimelineInputs(prev => ({ ...prev, priceAppreciationRate: val[0] }))}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-slate-100 rounded-lg">
                    <Label htmlFor="isCompounding" className="flex items-center gap-2 cursor-pointer">
                      <Repeat className="w-4 h-4"/> Reinvest Dividends (Compound)
                    </Label>
                    <Switch
                      id="isCompounding"
                      checked={timelineInputs.isCompounding}
                      onCheckedChange={(checked) => setTimelineInputs(prev => ({ ...prev, isCompounding: checked }))}
                    />
                  </div>
                </div>

                {/* Timeline Chart & Summary */}
                <div className="lg:col-span-2">
                  {timelineProjection && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4 text-center">
                        <div className="p-4 bg-purple-50 rounded-lg">
                          <p className="text-sm text-purple-800">Est. Time to Goal</p>
                          <p className="text-2xl font-bold text-purple-900">
                            {timelineProjection.yearsToGoal > 0 ? `${timelineProjection.yearsToGoal} Years` : `> ${plannerData.timeHorizon} Yrs`}
                          </p>
                        </div>
                        <div className="p-4 bg-green-50 rounded-lg">
                          <p className="text-sm text-green-800">Monthly Investment</p>
                          <p className="text-2xl font-bold text-green-900">
                            ${parseFloat(timelineInputs.monthlyContribution || 0).toLocaleString()}
                          </p>
                        </div>
                      </div>

                      <ResponsiveContainer width="100%" height={250}>
                        <RechartsLineChart data={timelineProjection.data}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="year" label={{ value: 'Years', position: 'insideBottom', offset: -5 }} />
                          <YAxis tickFormatter={formatCurrency} label={{ value: 'Value ($)', angle: -90, position: 'insideLeft' }} />
                          <RechartsTooltip formatter={(value) => formatCurrency(value)} />
                          <Legend />
                          <Line type="monotone" dataKey="capital" name="Projected Capital" stroke="#8884d8" strokeWidth={2} />
                          <Line type="monotone" dataKey="income" name="Projected Annual Income" stroke="#82ca9d" strokeWidth={2} />
                        </RechartsLineChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Screening Criteria Showcase */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Info className="w-5 h-5 text-blue-600"/>
                  Our Dividend Stock Screening Criteria
                </CardTitle>
                <p className="text-sm text-slate-600 mt-2">
                  Based on established dividend investing principles from "The Complete Dividend Investing Book"
                </p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="border-l-4 border-green-500 pl-4">
                      <h4 className="font-semibold text-green-700">Dividend Quality Filters</h4>
                      <div className="space-y-2 mt-2 text-sm">
                        <div className="flex justify-between">
                          <span>Minimum dividend history:</span>
                          <span className="font-medium">≥ 5 years</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Dividend yield threshold:</span>
                          <span className="font-medium">≥ 3%</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Payout ratio (conservative):</span>
                          <span className="font-medium">≤ 65-85%</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="border-l-4 border-blue-500 pl-4">
                      <h4 className="font-semibold text-blue-700">Financial Health Metrics</h4>
                      <div className="space-y-2 mt-2 text-sm">
                        <div className="flex justify-between">
                          <span>Free cash flow:</span>
                          <span className="font-medium text-green-600">Must be &gt; 0</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Return on equity (ROE):</span>
                          <span className="font-medium">≥ 8%</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Debt-to-equity ratio:</span>
                          <span className="font-medium">≤ 1.0</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="border-l-4 border-purple-500 pl-4">
                      <h4 className="font-semibold text-purple-700">Valuation & Growth Criteria</h4>
                      <div className="space-y-2 mt-2 text-sm">
                        <div className="flex justify-between">
                          <span>Price-to-earnings ratio:</span>
                          <span className="font-medium">≤ 25</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Revenue/earnings growth:</span>
                          <span className="font-medium">≥ 3% annually</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Market capitalization:</span>
                          <span className="font-medium">≥ $70M</span>
                        </div>
                      </div>
                    </div>

                    <div className="border-l-4 border-amber-500 pl-4">
                      <h4 className="font-semibold text-amber-700">Risk Management</h4>
                      <div className="space-y-2 mt-2 text-sm">
                        {/* Removed Sector diversification line */}
                        <div className="flex justify-between">
                          <span>Portfolio limit:</span>
                          <span className="font-medium">Exactly 5 stocks</span> {/* Updated text for clarity */}
                        </div>
                        <div className="flex justify-between">
                          <span>Data transparency:</span>
                          <span className="font-medium">Flag missing metrics</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div> {/* End of grid for criteria */}

                {/* These divs were moved out of the grid and have col-span added */}
                <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200 col-span-1 md:col-span-2">
                  <div className="flex items-start gap-2">
                    <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div className="text-sm">
                      <p className="font-semibold text-blue-800 mb-2">What These Criteria Mean for You:</p>
                      <ul className="space-y-1 text-blue-700">
                        <li>• <strong>Dividend History:</strong> Companies with consistent 5+ year dividend payments demonstrate reliability</li>
                        <li>• <strong>Payout Ratio:</strong> Lower ratios leave room for dividend growth and provide safety during downturns</li>
                        <li>• <strong>Free Cash Flow:</strong> Positive FCF ensures the company generates real cash to pay dividends</li>
                        <li>• <strong>Debt Management:</strong> Lower debt reduces financial risk and dividend cut probability</li>
                        <li>• <strong>Growth Metrics:</strong> Revenue and earnings growth support sustainable dividend increases</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="mt-4 p-4 bg-amber-50 rounded-lg border border-amber-200 col-span-1 md:col-span-2">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                    <div className="text-sm">
                      <p className="font-semibold text-amber-800 mb-1">Data Limitations & Your Due Diligence:</p>
                      <p className="text-amber-700">
                        When financial data is missing (marked as "N/A" or flagged with warnings), we include stocks that meet available criteria. 
                        However, <strong>you should verify all missing metrics manually</strong> before investing. Use sources like company annual reports, 
                        SEC filings, or comprehensive financial databases to fill in the gaps.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Data Quality & API Efficiency Notice */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Info className="w-5 h-5 text-blue-600"/>
                  API-Efficient Data Collection
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="border-l-4 border-green-500 pl-4">
                      <h4 className="font-semibold text-green-700">Smart Caching System</h4>
                      <p className="text-sm text-slate-600 mt-1">
                        Fundamental data is cached for 24 hours to minimize API costs while ensuring data freshness.
                      </p>
                    </div>
                    
                    <div className="border-l-4 border-blue-500 pl-4">
                      <h4 className="font-semibold text-blue-700">Rate-Limited Processing</h4>
                      <p className="text-sm text-slate-600 mt-1">
                        API calls are intelligently queued and rate-limited to respect FinnHub's constraints (60 calls/minute).
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="border-l-4 border-purple-500 pl-4">
                      <h4 className="font-semibold text-purple-700">Pre-Screening Optimization</h4>
                      <p className="text-sm text-slate-600 mt-1">
                        Basic filters are applied first using efficient screener endpoints before detailed analysis.
                      </p>
                    </div>

                    <div className="border-l-4 border-amber-500 pl-4">
                      <h4 className="font-semibold text-amber-700">Fallback Mechanisms</h4>
                      <p className="text-sm text-slate-600 mt-1">
                        If fresh data isn't available, cached or estimated values are used with clear indicators.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-start gap-2">
                    <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div className="text-sm">
                      <p className="font-semibold text-blue-800 mb-1">Data Freshness Legend:</p>
                      <div className="grid grid-cols-3 gap-4 text-blue-700">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                          <span>Fresh (&lt; 1 hour)</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-amber-500 rounded-full"></div>
                          <span>Cached (&lt; 24 hours)</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                          <span>Estimated (fallback)</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Educational Components */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Info className="w-5 h-5"/>
                        Investment Principles & Disclaimer
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                    <p>This portfolio was generated based on established dividend investing criteria, focusing on companies with consistent dividend history, healthy financials (low debt, positive cash flow), and reasonable valuation. The goal is a balance of yield and safety.</p>
                    <Alert className="bg-amber-50 border-amber-200">
                        <AlertTriangle className="h-4 w-4 text-amber-600"/>
                        <AlertDescription className="text-amber-800">
                            <strong>Disclaimer:</strong> This is a computer-generated recommendation and not financial advice. The stock market involves risk, and data may have inaccuracies. You must conduct your own thorough research before making any investment decisions.
                        </AlertDescription>
                    </Alert>
                </CardContent>
            </Card>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
