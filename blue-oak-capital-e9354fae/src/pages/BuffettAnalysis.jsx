
// src/pages/BuffettAnalysis.jsx
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import StockSearch from "../components/search/StockSearch";
import CleanStockDataService from '../components/services/CleanStockDataService';
import { 
  BookOpen, 
  TrendingUp, 
  CheckCircle,
  DollarSign,
  Calculator,
  Info,
  Download,
  Loader2,
  AlertTriangle,
  BarChart,
  HelpCircle,
  Target,
  Undo,
  Award,
  AlertCircle,
  PieChart,
  Percent,
  LineChart,
  Building2
} from 'lucide-react';

const COMPANY_PROFILES = {
  mature_giant: {
    label: "Mature Giant (Low Growth)",
    defaultGrowth: 3.0,
    rationale: "Grows slightly above or in line with nominal GDP (2-4%). Examples: KO, PG, JNJ"
  },
  quality_compounder: {
    label: "Quality Compounder (Stable Growth)",
    defaultGrowth: 7.0,
    rationale: "Strong moat and pricing power to consistently grow faster than GDP (5-9%). Examples: AAPL, V, MSFT"
  },
  growth_company: {
    label: "Growth Company",
    defaultGrowth: 12.5,
    rationale: "Still gaining market share, strong industry tailwind (10-15%). Examples: MA, ADBE, LULU"
  },
  high_growth: {
    label: "High-Growth / Speculative",
    defaultGrowth: 18.0,
    rationale: "High potential but high risk (15%+). Be very skeptical of long-term forecasts. Examples: SNOW, UBER"
  },
  cyclical: {
    label: "Cyclical Company",
    defaultGrowth: 4.0,
    rationale: "Use average growth over a full economic cycle (7-10 years), not a flat rate. Examples: F, CAT, STLD"
  }
};

const DIVIDEND_SCENARIOS = {
  mature_high_payout: {
    label: "Mature, High Payout",
    defaultGrowth: 2.0,
    rationale: "Company has low growth and returns most cash to shareholders. Growth is just for inflation adjustment (1-3%)."
  },
  standard_payout: {
    label: "Standard Payout",
    useEpsBasedGrowth: true,
    adjustment: -1.5,
    rationale: "Most common scenario. Company grows dividend consistently but retains earnings for reinvestment (~1-2% below EPS Growth)."
  },
  low_payout_high_growth: {
    label: "Low Payout, High Growth",
    useEpsBasedGrowth: true,
    adjustment: 0,
    rationale: "Company rapidly growing with new dividend program. Growth can match or exceed EPS growth for a while."
  }
};

const DataRow = ({ label, value, tooltip, highlight = false }) => (
  <div className={`flex justify-between items-center text-sm py-2 border-b last:border-0 ${highlight ? 'bg-blue-50 -mx-2 px-2 rounded' : ''}`}>
    <div className="flex items-center gap-1.5">
      <span className={highlight ? 'font-semibold text-slate-700' : 'text-slate-600'}>{label}</span>
      {tooltip && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Info className="w-3 h-3 text-slate-400 cursor-pointer" />
          </TooltipTrigger>
          <TooltipContent><p className="max-w-xs text-xs">{tooltip}</p></TooltipContent>
        </Tooltip>
      )}
    </div>
    <span className={`font-semibold ${highlight ? 'text-blue-700' : 'text-slate-800'}`}>{value}</span>
  </div>
);

const BusinessQualityRow = ({ metric, calculation, value, assessment, color }) => (
  <tr className="border-b hover:bg-slate-50">
    <td className="p-3 font-medium text-slate-900">{metric}</td>
    <td className="p-3 text-xs text-slate-600 font-mono">{calculation}</td>
    <td className="p-3 font-bold text-lg">{value}</td>
    <td className={`p-3 font-medium ${color}`}>
      {assessment}
    </td>
  </tr>
);

export const performBuffettCalculation = (currentPrice, eps, dividend, epsGrowth, divGrowth, futurePE) => {
  if (currentPrice <= 0) return { irr: -1, totalFutureValue: 0, projectedFuturePrice: 0, totalDividends: 0 };

  const epsGrowthRate = epsGrowth / 100;
  const divGrowthRate = divGrowth / 100;

  const projectedEPS = eps * Math.pow(1 + epsGrowthRate, 10);
  const projectedFuturePrice = projectedEPS * futurePE;

  let totalDividends = 0;
  const cashFlows = [];
  for (let year = 1; year <= 10; year++) {
    const projectedDividend = dividend * Math.pow(1 + divGrowthRate, year);
    totalDividends += projectedDividend;
    cashFlows.push(projectedDividend);
  }
  cashFlows[9] += projectedFuturePrice;

  let lowRate = -0.99;
  let highRate = 2.0;
  let irr = 0;

  for (let i = 0; i < 100; i++) {
    const midRate = (lowRate + highRate) / 2;
    if (midRate === lowRate || midRate === highRate) break;

    let npv = 0;
    for (let j = 0; j < cashFlows.length; j++) {
      npv += cashFlows[j] / Math.pow(1 + midRate, j + 1);
    }

    if (npv > currentPrice) lowRate = midRate;
    else highRate = midRate;
  }
  irr = (lowRate + highRate) / 2;

  return { irr, totalFutureValue: projectedFuturePrice + totalDividends, projectedFuturePrice, totalDividends };
};

// NEW: Calculate PVGO (Present Value of Growth Opportunities)
const calculatePVGO = (stockPrice, eps, requiredReturn) => {
  const noGrowthValue = eps / requiredReturn;
  const pvgo = stockPrice - noGrowthValue;
  const pvgoPercent = (pvgo / stockPrice) * 100;
  return {
    noGrowthValue,
    pvgo,
    pvgoPercent,
    growthValue: pvgo,
    valueFromGrowth: pvgoPercent
  };
};

// NEW: Calculate Gordon Growth Model value
const calculateGordonGrowth = (dividend, requiredReturn, growthRate) => {
  if (requiredReturn <= growthRate) return null;
  return dividend / (requiredReturn - growthRate);
};

// NEW: Calculate implied growth from current price
const calculateImpliedGrowth = (stockPrice, dividend, requiredReturn) => {
  const impliedGrowth = requiredReturn - (dividend / stockPrice);
  return impliedGrowth;
};

export default function BuffettAnalysis() {
  const initialFormState = {
    symbol: '',
    companyName: '',
    currentPrice: '',
    eps: '',
    dividendAnnual: '',
    bookValuePerSquare: '',
    companyProfile: 'quality_compounder',
    epsGrowthRate: '7.0',
    dividendScenario: 'standard_payout', 
    dividendGrowthRate: '5.0',
    conservativePE: '15.0',
    maxPE: '25.0',
    avgPE: '20.0',
    tenYearYield: '4.5',
    // NEW: Required return for PVGO and GGM
    requiredReturn: '8.0',
  };

  const [manualData, setManualData] = useState(initialFormState);
  const [fetching, setFetching] = useState(false);
  const [dataSource, setDataSource] = useState({ quote: '', historical: '' });
  const [analysisResult, setAnalysisResult] = useState(null);
  const [businessQuality, setBusinessQuality] = useState(null);
  // NEW: PVGO and GGM results
  const [advancedResults, setAdvancedResults] = useState(null);
  // NEW: Active tab
  const [activeTab, setActiveTab] = useState('valuation');

  useEffect(() => {
    const conservative = parseFloat(manualData.conservativePE);
    const max = parseFloat(manualData.maxPE);
    if (!isNaN(conservative) && !isNaN(max) && max >= conservative) {
      const avg = ((conservative + max) / 2).toFixed(1);
      setManualData(prev => {
        if (prev.avgPE !== avg) {
          return { ...prev, avgPE: avg };
        }
        return prev;
      });
    }
  }, [manualData.conservativePE, manualData.maxPE]);

  const handleInputChange = (e) => {
    const { id, value } = e.target;
    setManualData(prev => ({ ...prev, [id]: value }));
  };

  const handleProfileChange = (profileKey) => {
    const profile = COMPANY_PROFILES[profileKey];
    if (profile) {
      const newEpsGrowth = profile.defaultGrowth;

      setManualData(prev => {
        const updatedManualData = {
          ...prev,
          companyProfile: profileKey,
          epsGrowthRate: newEpsGrowth.toString()
        };

        const currentDividendScenario = DIVIDEND_SCENARIOS[updatedManualData.dividendScenario];
        if (currentDividendScenario) {
          let newDividendGrowth;
          if (currentDividendScenario.useEpsBasedGrowth && !isNaN(newEpsGrowth)) {
            newDividendGrowth = Math.max(0, newEpsGrowth + currentDividendScenario.adjustment);
          } else {
            newDividendGrowth = currentDividendScenario.defaultGrowth;
          }
          updatedManualData.dividendGrowthRate = newDividendGrowth.toFixed(1);
        }
        return updatedManualData;
      });
    }
  };

  const handleDividendScenarioChange = (scenarioKey) => {
    const scenario = DIVIDEND_SCENARIOS[scenarioKey];
    const currentEpsGrowth = parseFloat(manualData.epsGrowthRate);

    if (scenario) {
      let newDividendGrowth;

      if (scenario.useEpsBasedGrowth && !isNaN(currentEpsGrowth)) {
        newDividendGrowth = Math.max(0, currentEpsGrowth + scenario.adjustment);
      } else {
        newDividendGrowth = scenario.defaultGrowth;
      }

      setManualData(prev => ({
        ...prev,
        dividendScenario: scenarioKey,
        dividendGrowthRate: newDividendGrowth.toFixed(1)
      }));
    }
  };

  const handleStockSelect = async (symbol) => {
    if (!symbol) return;

    setFetching(true);
    setAnalysisResult(null);
    setBusinessQuality(null);
    setAdvancedResults(null);

    const fetchErrorMsg = "Manual Input Required";
    let currentPrice = fetchErrorMsg;
    let eps = fetchErrorMsg;
    let bookValuePerSquare = fetchErrorMsg;
    let dividendAnnual = fetchErrorMsg;
    let quoteSource = '';
    let companyName = `${symbol} Inc.`;

    try {
      const fmpData = await CleanStockDataService.getFmpQuote(symbol);
      
      if (fmpData.currentPrice !== undefined && fmpData.currentPrice !== null) currentPrice = fmpData.currentPrice.toString();
      if (fmpData.eps !== undefined && fmpData.eps !== null) eps = fmpData.eps.toString();
      if (fmpData.bookValue !== undefined && fmpData.bookValue !== null) bookValuePerSquare = fmpData.bookValue.toString();
      if (fmpData.dividendAnnual !== undefined && fmpData.dividendAnnual !== null) dividendAnnual = fmpData.dividendAnnual.toString();
      if (fmpData.companyName) companyName = fmpData.companyName;
      
      quoteSource = 'FMP';
    } catch (fmpError) {
      console.warn('FMP quote/fundamentals failed, falling back to Finnhub:', fmpError);
      try {
        const finnhubData = await CleanStockDataService.getStock(symbol);
        if (finnhubData) {
          if (finnhubData.current_price !== undefined && finnhubData.current_price !== null) currentPrice = finnhubData.current_price.toString();
          if (finnhubData.company_name) companyName = finnhubData.company_name;
          quoteSource = 'Finnhub (Limited Data)';
        }
      } catch (finnhubError) {
        console.error('Finnhub quote also failed:', finnhubError);
        quoteSource = 'All APIs Failed - Manual Input Required';
      }
    }

    let suggestedGrowth = '6.0';
    let suggestedConservativePE = '15.0';
    let suggestedMaxPE = '25.0';
    let growthSource = 'Conservative Estimates';
    let peSource = 'Conservative Estimates';

    try {
      const historicals = await CleanStockDataService.getHistoricalAnalysisData(symbol);
      
      if (historicals && historicals.source && historicals.source.includes('Failed')) {
          growthSource = 'Conservative Defaults (API Unavailable)';
          peSource = 'Conservative Defaults (API Unavailable)';
      } else if (historicals) {
          suggestedGrowth = historicals.historical_eps_growth.toFixed(1);
          suggestedConservativePE = historicals.conservative_pe_ratio.toFixed(1);
          suggestedMaxPE = historicals.max_pe_ratio.toFixed(1);
          growthSource = historicals.growth_calculated ? 'FMP Historical' : 'Fallback Estimate';
          peSource = historicals.pe_calculated ? 'FMP Historical' : 'Fallback Estimate';
      }
    } catch (historicalError) {
      console.warn('Historical data fetch failed:', historicalError);
      growthSource = 'Conservative Defaults (API Unavailable)';
      peSource = 'Conservative Defaults (API Unavailable)';
    }

    const conservativePENum = parseFloat(suggestedConservativePE);
    const maxPENum = parseFloat(suggestedMaxPE);
    const estimatedAvgPE = ((conservativePENum + maxPENum) / 2).toFixed(1);

    setManualData(prev => {
      const newState = {
        ...prev,
        symbol: symbol,
        companyName: companyName,
        currentPrice: currentPrice,
        eps: eps,
        dividendAnnual: dividendAnnual,
        bookValuePerSquare: bookValuePerSquare,
        epsGrowthRate: suggestedGrowth, 
        conservativePE: suggestedConservativePE,
        maxPE: suggestedMaxPE,
        avgPE: estimatedAvgPE
      };

      const scenario = DIVIDEND_SCENARIOS[newState.dividendScenario];
      if (scenario) {
        let newDividendGrowth;
        const newEpsGrowthNum = parseFloat(suggestedGrowth);
        if (scenario.useEpsBasedGrowth && !isNaN(newEpsGrowthNum)) {
          newDividendGrowth = Math.max(0, newEpsGrowthNum + scenario.adjustment);
        } else {
          newDividendGrowth = scenario.defaultGrowth;
        }
        newState.dividendGrowthRate = newDividendGrowth.toFixed(1);
      }
      return newState;
    });

    setDataSource({
      quote: quoteSource,
      growth: growthSource,
      pe: peSource
    });

    setFetching(false);
  };

  const calculateBusinessQuality = () => {
    const currentPrice = parseFloat(manualData.currentPrice);
    const eps = parseFloat(manualData.eps);
    const dividend = parseFloat(manualData.dividendAnnual);
    const bookValue = parseFloat(manualData.bookValuePerSquare);
    const tenYearYield = parseFloat(manualData.tenYearYield);
    const requiredReturn = parseFloat(manualData.requiredReturn) / 100;

    if (isNaN(currentPrice) || isNaN(eps) || isNaN(dividend) || isNaN(bookValue)) {
      return null;
    }

    const roe = (eps / bookValue) * 100;
    const earningsYield = (eps / currentPrice) * 100;
    const payoutRatio = (dividend / eps) * 100;

    // NEW: Compare ROE vs Required Return
    const roe_vs_r = roe / 100 - requiredReturn;

    const roeAssessment = roe > 100 ?
      { text: `Verify Data ❗ ROE >100% often indicates incorrect Book Value input or negative equity. Investigate immediately.`, color: 'text-amber-600' } :
      roe >= 20 ?
      { text: `Exceptional ✅ >20% is Buffett's sweet spot. Shows wide moat and excellent management.`, color: 'text-green-700' } :
      roe >= 15 ?
      { text: `Good ✅ Solid company with competitive advantages.`, color: 'text-green-600' } :
      roe >= 10 ?
      { text: `Acceptable ⚠️ Average company. Not bad, but not exceptional.`, color: 'text-yellow-600' } :
      { text: `Poor ❌ Not generating good returns on capital. Likely no moat or operational issues.`, color: 'text-red-600' };

    let earningsYieldAssessment;
    if (!isNaN(tenYearYield)) {
      if (earningsYield > tenYearYield) {
        earningsYieldAssessment = { 
          text: `Cheap ✅ Earnings yield (${earningsYield.toFixed(1)}%) > 10-Yr Treasury (${tenYearYield.toFixed(1)}%). Potential value indicator.`, 
          color: 'text-green-700' 
        };
      } else if (Math.abs(earningsYield - tenYearYield) <= 0.5) {
        earningsYieldAssessment = { 
          text: `Fair ⚠️ Earnings yield (${earningsYield.toFixed(1)}%) ≈ 10-Yr Treasury (${tenYearYield.toFixed(1)}%). Fairly valued.`, 
          color: 'text-yellow-600' 
        };
      } else {
        earningsYieldAssessment = { 
          text: `Expensive ❌ Earnings yield (${earningsYield.toFixed(1)}%) < 10-Yr Treasury (${tenYearYield.toFixed(1)}%). Not adequately compensated for stock risk.`, 
          color: 'text-red-600' 
        };
      }
    } else {
      earningsYieldAssessment = { 
        text: `${earningsYield.toFixed(1)}% - Enter 10-Yr Treasury yield above to compare.`, 
        color: 'text-slate-600' 
      };
    }

    const payoutRatioAssessment = dividend === 0 ?
      { text: `N/A ➖ No dividend. Company reinvests all earnings. Not good or bad.`, color: 'text-slate-600' } :
      payoutRatio > 100 ?
      { text: `Danger ❗ >100% - Paying more than earned. Not sustainable.`, color: 'text-red-700' } :
      payoutRatio > 75 ?
      { text: `At Risk ❌ >75% - May be unsustainable long-term. Common in REITs/MLPs with different structures.`, color: 'text-red-600' } :
      payoutRatio > 60 ?
      { text: `Caution 🟡 60-75% - Consuming most profits. Little room for error or growth.`, color: 'text-yellow-600' } :
      payoutRatio > 35 ?
      { text: `Safe ✅ 35-60% - Dividend likely secure.`, color: 'text-green-600' } :
      { text: `Very Safe ✅ <35% - Ample room to maintain and grow dividend, even in downturns.`, color: 'text-green-700' };

    // NEW: ROE vs Required Return Assessment
    let roeVsRAssessment;
    if (roe_vs_r > 0.05) {
      roeVsRAssessment = {
        text: `Excellent ✅ ROE (${roe.toFixed(1)}%) significantly exceeds required return (${(requiredReturn * 100).toFixed(1)}%). Company creates substantial value.`,
        color: 'text-green-700'
      };
    } else if (roe_vs_r > 0) {
      roeVsRAssessment = {
        text: `Good ✅ ROE (${roe.toFixed(1)}%) exceeds required return (${(requiredReturn * 100).toFixed(1)}%). Company creates value.`,
        color: 'text-green-600'
      };
    } else if (roe_vs_r > -0.02) {
      roeVsRAssessment = {
        text: `Neutral ⚠️ ROE (${roe.toFixed(1)}%) ≈ required return (${(requiredReturn * 100).toFixed(1)}%). No value creation.`,
        color: 'text-yellow-600'
      };
    } else {
      roeVsRAssessment = {
        text: `Destructive ❌ ROE (${roe.toFixed(1)}%) < required return (${(requiredReturn * 100).toFixed(1)}%). Destroying shareholder value.`,
        color: 'text-red-600'
      };
    }

    return {
      roe: { value: roe.toFixed(1) + '%', assessment: roeAssessment },
      earningsYield: { value: earningsYield.toFixed(1) + '%', assessment: earningsYieldAssessment },
      payoutRatio: { value: payoutRatio.toFixed(0) + '%', assessment: payoutRatioAssessment },
      roeVsR: { value: roe.toFixed(1) + '% vs ' + (requiredReturn * 100).toFixed(1) + '%', assessment: roeVsRAssessment }
    };
  };

  const handleManualCalculation = () => {
    const {
        currentPrice, eps, dividendAnnual, epsGrowthRate, dividendGrowthRate,
        conservativePE, maxPE, avgPE, requiredReturn, tenYearYield
    } = manualData;

    const price = parseFloat(currentPrice);
    const currentEPS = parseFloat(eps);
    const currentDiv = parseFloat(dividendAnnual);
    const epsGrowth = parseFloat(epsGrowthRate);
    const divGrowth = parseFloat(dividendGrowthRate);
    const reqReturn = parseFloat(requiredReturn) / 100;

    if ([price, currentEPS, currentDiv, epsGrowth, divGrowth].some(isNaN)) {
        alert("Please ensure Price, EPS, Dividend, and Growth Rates are valid numbers.");
        return;
    }

    const scenarios = [];

    const basePE = parseFloat(conservativePE);
    if (!isNaN(basePE)) {
      const baseResult = performBuffettCalculation(price, currentEPS, currentDiv, epsGrowth, divGrowth, basePE);
      scenarios.push({
        label: "Conservative (10-Yr Min P/E)",
        pe: basePE,
        result: baseResult,
        futurePrice: baseResult.projectedFuturePrice
      });
    }

    const maxPENum = parseFloat(maxPE);
    if (!isNaN(maxPENum)) {
      const maxResult = performBuffettCalculation(price, currentEPS, currentDiv, epsGrowth, divGrowth, maxPENum);
      scenarios.push({
        label: "Max P/E (10-Yr High)",
        pe: maxPENum,
        result: maxResult,
        futurePrice: maxResult.projectedFuturePrice
      });
    }

    const avgPENum = parseFloat(avgPE);
    if (!isNaN(avgPENum)) {
      const avgResult = performBuffettCalculation(price, currentEPS, currentDiv, epsGrowth, divGrowth, avgPENum);
      scenarios.push({
        label: "Average P/E (High+Low)/2",
        pe: avgPENum,
        result: avgResult,
        futurePrice: avgResult.projectedFuturePrice
      });
    }

    setAnalysisResult(scenarios);

    const quality = calculateBusinessQuality();
    setBusinessQuality(quality);

    // NEW: Calculate Advanced Results (PVGO, GGM, Implied Growth)
    const stockPrice = price;
    const dividend = currentDiv;
    const growthRate = epsGrowth / 100;
    const requiredReturnDecimal = reqReturn;
    const epsValue = currentEPS;

    // PVGO Calculation
    const pvgoResults = calculatePVGO(stockPrice, epsValue, requiredReturnDecimal);

    // Gordon Growth Model
    const ggmValue = calculateGordonGrowth(dividend, requiredReturnDecimal, growthRate);

    // Implied Growth Rate from Current Price
    const impliedGrowth = calculateImpliedGrowth(stockPrice, dividend, requiredReturnDecimal);

    // Compare current price to GGM value
    const isOvervalued = ggmValue !== null && stockPrice > ggmValue * 1.1;

    setAdvancedResults({
      pvgo: pvgoResults,
      ggmValue: ggmValue,
      impliedGrowth: impliedGrowth,
      isOvervalued: isOvervalued,
      growthRateUsed: growthRate,
      requiredReturnUsed: requiredReturnDecimal,
      dividendUsed: dividend,
      epsUsed: epsValue
    });
  };

  const handleFocus = (fieldName) => {
    if (manualData[fieldName] === "Manual Input Required") {
      setManualData(prev => ({ ...prev, [fieldName]: '' }));
    }
  };

  const selectedProfile = COMPANY_PROFILES[manualData.companyProfile];
  const selectedDividendScenario = DIVIDEND_SCENARIOS[manualData.dividendScenario];

  return (
    <TooltipProvider>
      <div className="p-4 lg:p-8 bg-slate-50 min-h-screen">
        <div className="max-w-5xl mx-auto space-y-8">

          <div className="text-center">
            <div className="flex justify-center mb-4">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl flex items-center justify-center">
                    <BookOpen className="w-8 h-8 text-white" />
                </div>
            </div>
            <h1 className="text-3xl font-bold text-slate-900">Buffett-Style Return Analyzer</h1>
            <p className="text-slate-600 mt-2">
                Estimate your annualized return based on P/E reversion and growth assumptions.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
            {/* INPUTS */}
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                    <CardTitle className="flex items-center gap-2">
                        <DollarSign className="w-5 h-5 text-blue-600" />
                        Analysis Inputs
                    </CardTitle>
                    <Button variant="ghost" size="sm" onClick={() => setManualData(initialFormState)}>
                        <Undo className="w-4 h-4 mr-2"/>
                        Reset
                    </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <Label>Find Stock</Label>
                  <StockSearch
                    onStockSelect={handleStockSelect}
                  />
                  {fetching && (
                    <div className="flex items-center gap-2 mt-2 text-blue-600">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="text-sm">Fetching data...</span>
                    </div>
                  )}
                </div>

                {(dataSource.quote || dataSource.growth || dataSource.pe) && (
                    <Alert className={dataSource.quote && dataSource.quote.includes('Failed') ? 'border-red-200 bg-red-50' : 'text-xs'}>
                        <Info className={`h-4 w-4 ${dataSource.quote && dataSource.quote.includes('Failed') ? 'text-red-600' : ''}`} />
                        <AlertDescription className={dataSource.quote && dataSource.quote.includes('Failed') ? 'text-red-800' : ''}>
                            <strong>Data Sources:</strong> Quote: <span className="font-semibold">{dataSource.quote}</span>, Growth: <span className="font-semibold">{dataSource.growth}</span>, P/E: <span className="font-semibold">{dataSource.pe}</span>
                            <br />
                            {dataSource.quote && dataSource.quote.includes('Failed') && (
                              <span className="text-sm mt-1">⚠️ API services are currently unavailable. Please enter data manually for accurate analysis.</span>
                            )}
                            {!dataSource.quote?.includes('Failed') && <span className="text-sm">All inputs are editable and can be overridden.</span>}
                        </AlertDescription>
                    </Alert>
                )}

                <div className="space-y-4 p-4 border rounded-lg bg-slate-50">
                    <h4 className="font-semibold text-slate-800">Stock Information</h4>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="symbol">Stock Symbol</Label>
                            <Input id="symbol" placeholder="e.g., AAPL" value={manualData.symbol} onChange={handleInputChange}/>
                        </div>
                        <div>
                            <Label htmlFor="currentPrice">Current Price ($)</Label>
                            <Input id="currentPrice" type="number" step="0.01" placeholder="239.62" value={manualData.currentPrice} onChange={handleInputChange} onFocus={() => handleFocus('currentPrice')}/>
                        </div>
                    </div>
                    {manualData.companyName && <p className="text-sm text-slate-500">{manualData.companyName}</p>}
                </div>

                <div className="space-y-4 p-4 border rounded-lg bg-slate-50">
                    <h4 className="font-semibold text-slate-800">Key Metrics</h4>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="eps">EPS (TTM)</Label>
                            <Input id="eps" type="number" step="0.01" placeholder="6.55" value={manualData.eps} onChange={handleInputChange} onFocus={() => handleFocus('eps')}/>
                        </div>
                        <div>
                            <Label htmlFor="dividendAnnual">Annual Dividend ($)</Label>
                            <Input id="dividendAnnual" type="number" step="0.01" placeholder="0.96" value={manualData.dividendAnnual} onChange={handleInputChange} onFocus={() => handleFocus('dividendAnnual')}/>
                        </div>
                        <div>
                            <Label htmlFor="bookValuePerSquare">Book Value per Share ($)</Label>
                            <Input id="bookValuePerSquare" type="number" step="0.01" placeholder="4.80" value={manualData.bookValuePerSquare} onChange={handleInputChange} onFocus={() => handleFocus('bookValuePerSquare')}/>
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <Label htmlFor="tenYearYield">10-Yr Treasury Yield (%)</Label>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Info className="w-3 h-3 text-slate-400" />
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>Current 10-Year US Treasury yield for earnings yield comparison. Check financial websites for the latest rate.</p>
                                    </TooltipContent>
                                </Tooltip>
                            </div>
                            <Input id="tenYearYield" type="number" step="0.1" placeholder="4.5" value={manualData.tenYearYield} onChange={handleInputChange}/>
                        </div>
                        <div className="col-span-2">
                            <div className="flex items-center gap-2">
                                <Label htmlFor="requiredReturn">Required Return / Cost of Equity (%)</Label>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Info className="w-3 h-3 text-slate-400" />
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>Minimum return investors expect. Often uses 10-Yr Treasury + equity risk premium (~4-6%). Used for PVGO and GGM calculations.</p>
                                    </TooltipContent>
                                </Tooltip>
                            </div>
                            <Input id="requiredReturn" type="number" step="0.1" placeholder="8.0" value={manualData.requiredReturn} onChange={handleInputChange}/>
                        </div>
                    </div>
                </div>

                <div className="space-y-4 p-4 border rounded-lg bg-slate-50">
                    <h4 className="font-semibold text-slate-800">Growth Assumptions</h4>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="companyProfile">Company Profile & EPS Growth Guide</Label>
                        <Select value={manualData.companyProfile} onValueChange={handleProfileChange}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(COMPANY_PROFILES).map(([key, profile]) => (
                              <SelectItem key={key} value={key}>{profile.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {selectedProfile && (
                            <p className="text-xs text-slate-500 mt-1.5">{selectedProfile.rationale}</p>
                        )}
                      </div>
                      
                      <div>
                        <Label htmlFor="dividendScenario">Dividend Growth Scenario</Label>
                        <Select value={manualData.dividendScenario} onValueChange={handleDividendScenarioChange}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(DIVIDEND_SCENARIOS).map(([key, scenario]) => (
                              <SelectItem key={key} value={key}>{scenario.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {selectedDividendScenario && (
                            <p className="text-xs text-slate-500 mt-1.5">{selectedDividendScenario.rationale}</p>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="epsGrowthRate">EPS Growth Rate (%)</Label>
                            <Input id="epsGrowthRate" type="number" step="0.1" value={manualData.epsGrowthRate} onChange={handleInputChange}/>
                        </div>
                        <div>
                            <Label htmlFor="dividendGrowthRate">Dividend Growth (%)</Label>
                            <Input id="dividendGrowthRate" type="number" step="0.1" value={manualData.dividendGrowthRate} onChange={handleInputChange}/>
                        </div>
                      </div>
                    </div>
                </div>

                <div className="space-y-4 p-4 border rounded-lg bg-slate-50">
                    <h4 className="font-semibold text-slate-800">Future P/E Scenarios</h4>
                    <div className="grid grid-cols-1 gap-4">
                        <div>
                            <Label htmlFor="conservativePE" className="flex items-center gap-1.5">
                                Conservative P/E (10-Yr Lowest)
                                <Tooltip>
                                    <TooltipTrigger asChild><Info className="w-3 h-3 text-slate-400" /></TooltipTrigger>
                                    <TooltipContent><p>Use the lowest P/E ratio from the last 10 years for conservative analysis.</p></TooltipContent>
                                </Tooltip>
                            </Label>
                            <Input id="conservativePE" type="number" step="0.1" value={manualData.conservativePE} onChange={handleInputChange}/>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="maxPE">Max P/E (10-Yr Highest)</Label>
                                <Input id="maxPE" type="number" step="0.1" value={manualData.maxPE} onChange={handleInputChange}/>
                            </div>
                            <div>
                                <Label htmlFor="avgPE">Average P/E</Label>
                                <Input id="avgPE" type="number" step="0.1" value={manualData.avgPE} readOnly className="bg-slate-100" />
                            </div>
                        </div>
                    </div>
                </div>
              </CardContent>
              <CardFooter>
                 <Button onClick={handleManualCalculation} className="w-full bg-blue-600 hover:bg-blue-700">
                  <Calculator className="w-4 h-4 mr-2" />
                  Calculate Expected Returns
                </Button>
              </CardFooter>
            </Card>

            {/* RESULTS */}
            <div className="space-y-6">
              {/* Business Quality Dashboard */}
              {businessQuality && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Award className="w-5 h-5 text-purple-600"/>
                        Business Quality Dashboard (Auto-Calculated)
                    </CardTitle>
                    <p className="text-sm text-slate-600">Key metrics to assess business quality before valuation</p>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-slate-50">
                          <tr>
                            <th className="text-left p-3 font-semibold">Metric</th>
                            <th className="text-left p-3 font-semibold">Calculation</th>
                            <th className="text-left p-3 font-semibold">Value</th>
                            <th className="text-left p-3 font-semibold">Assessment</th>
                          </tr>
                        </thead>
                        <tbody>
                          <BusinessQualityRow
                            metric="Return on Equity (ROE)"
                            calculation={`(${manualData.eps} / ${manualData.bookValuePerSquare}) × 100`}
                            value={businessQuality.roe.value}
                            assessment={businessQuality.roe.assessment.text}
                            color={businessQuality.roe.assessment.color}
                          />
                          <BusinessQualityRow
                            metric="Earnings Yield"
                            calculation={`(${manualData.eps} / ${manualData.currentPrice}) × 100`}
                            value={businessQuality.earningsYield.value}
                            assessment={businessQuality.earningsYield.assessment.text}
                            color={businessQuality.earningsYield.assessment.color}
                          />
                          <BusinessQualityRow
                            metric="Payout Ratio"
                            calculation={`(${manualData.dividendAnnual} / ${manualData.eps}) × 100`}
                            value={businessQuality.payoutRatio.value}
                            assessment={businessQuality.payoutRatio.assessment.text}
                            color={businessQuality.payoutRatio.assessment.color}
                          />
                          <BusinessQualityRow
                            metric="ROE vs Required Return"
                            calculation={`ROE vs r`}
                            value={businessQuality.roeVsR.value}
                            assessment={businessQuality.roeVsR.assessment.text}
                            color={businessQuality.roeVsR.assessment.color}
                          />
                        </tbody>
                      </table>
                    </div>
                    <Alert className="mt-4 border-purple-200 bg-purple-50">
                      <AlertCircle className="h-4 w-4 text-purple-600" />
                      <AlertDescription className="text-purple-800">
                        <strong>Investment Principle:</strong> Proceed with valuation only if the business quality metrics meet your investment standards. Quality first, then price.
                      </AlertDescription>
                    </Alert>
                  </CardContent>
                </Card>
              )}

              {/* NEW: Advanced Valuation Tabs (PVGO, GGM, etc.) */}
              {advancedResults && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart className="w-5 h-5 text-blue-600" />
                      Advanced Valuation Analysis
                    </CardTitle>
                    <p className="text-sm text-slate-600">PVGO, Gordon Growth Model, and more</p>
                  </CardHeader>
                  <CardContent>
                    <Tabs defaultValue="pvgo" className="w-full">
                      <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="pvgo">
                          <PieChart className="w-4 h-4 mr-2" />
                          PVGO
                        </TabsTrigger>
                        <TabsTrigger value="ggm">
                          <Percent className="w-4 h-4 mr-2" />
                          Gordon Growth
                        </TabsTrigger>
                        <TabsTrigger value="comparison">
                          <LineChart className="w-4 h-4 mr-2" />
                          Comparison
                        </TabsTrigger>
                      </TabsList>

                      {/* PVGO Tab */}
                      <TabsContent value="pvgo" className="space-y-4 pt-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="bg-blue-50 p-4 rounded-lg">
                            <p className="text-xs text-blue-600">No-Growth Value</p>
                            <p className="text-xl font-bold text-blue-700">
                              ${advancedResults.pvgo.noGrowthValue.toFixed(2)}
                            </p>
                            <p className="text-xs text-blue-500">EPS / Required Return</p>
                          </div>
                          <div className="bg-purple-50 p-4 rounded-lg">
                            <p className="text-xs text-purple-600">PVGO (Growth Value)</p>
                            <p className="text-xl font-bold text-purple-700">
                              ${advancedResults.pvgo.pvgo.toFixed(2)}
                            </p>
                            <p className="text-xs text-purple-500">
                              {advancedResults.pvgo.pvgoPercent.toFixed(1)}% of current price
                            </p>
                          </div>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-lg">
                          <p className="text-sm text-slate-600">What this means:</p>
                          <div className="mt-2 text-sm">
                            <div className="flex justify-between border-b py-1">
                              <span className="text-slate-500">Current Price:</span>
                              <span className="font-medium">${parseFloat(manualData.currentPrice).toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between border-b py-1">
                              <span className="text-slate-500">From Current Assets:</span>
                              <span className="font-medium">${advancedResults.pvgo.noGrowthValue.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between py-1 font-semibold">
                              <span className="text-slate-500">From Future Growth (PVGO):</span>
                              <span className="text-purple-600">${advancedResults.pvgo.pvgo.toFixed(2)}</span>
                            </div>
                          </div>
                          {advancedResults.pvgo.pvgoPercent > 50 ? (
                            <Alert className="mt-3 border-blue-200 bg-blue-50">
                              <AlertTriangle className="h-4 w-4 text-blue-600" />
                              <AlertDescription className="text-blue-800">
                                Most of the price comes from <strong>growth expectations</strong> ({advancedResults.pvgo.pvgoPercent.toFixed(1)}%). 
                                Ensure growth assumptions are realistic.
                              </AlertDescription>
                            </Alert>
                          ) : (
                            <Alert className="mt-3 border-green-200 bg-green-50">
                              <CheckCircle className="h-4 w-4 text-green-600" />
                              <AlertDescription className="text-green-800">
                                Price is primarily driven by <strong>current earnings</strong>. 
                                Less dependent on uncertain growth forecasts.
                              </AlertDescription>
                            </Alert>
                          )}
                        </div>
                      </TabsContent>

                      {/* GGM Tab */}
                      <TabsContent value="ggm" className="space-y-4 pt-4">
                        {advancedResults.ggmValue !== null ? (
                          <>
                            <div className="grid grid-cols-2 gap-4">
                              <div className="bg-green-50 p-4 rounded-lg">
                                <p className="text-xs text-green-600">GGM Intrinsic Value</p>
                                <p className="text-xl font-bold text-green-700">
                                  ${advancedResults.ggmValue.toFixed(2)}
                                </p>
                                <p className="text-xs text-green-500">D₁ / (r - g)</p>
                              </div>
                              <div className="bg-slate-50 p-4 rounded-lg">
                                <p className="text-xs text-slate-600">Current Price</p>
                                <p className="text-xl font-bold text-slate-700">
                                  ${parseFloat(manualData.currentPrice).toFixed(2)}
                                </p>
                              </div>
                            </div>
                            <div className="grid grid-cols-3 gap-2 text-sm">
                              <div className="bg-slate-50 p-2 rounded text-center">
                                <p className="text-xs text-slate-500">Dividend (D₁)</p>
                                <p className="font-semibold">${advancedResults.dividendUsed.toFixed(2)}</p>
                              </div>
                              <div className="bg-slate-50 p-2 rounded text-center">
                                <p className="text-xs text-slate-500">Required Return (r)</p>
                                <p className="font-semibold">{(advancedResults.requiredReturnUsed * 100).toFixed(1)}%</p>
                              </div>
                              <div className="bg-slate-50 p-2 rounded text-center">
                                <p className="text-xs text-slate-500">Growth Rate (g)</p>
                                <p className="font-semibold">{(advancedResults.growthRateUsed * 100).toFixed(1)}%</p>
                              </div>
                            </div>
                            {advancedResults.isOvervalued ? (
                              <Alert className="border-red-200 bg-red-50">
                                <AlertTriangle className="h-4 w-4 text-red-600" />
                                <AlertTitle className="text-red-800">Overvalued by GGM</AlertTitle>
                                <AlertDescription className="text-red-700">
                                  Current price (${parseFloat(manualData.currentPrice).toFixed(2)}) exceeds GGM value (${advancedResults.ggmValue.toFixed(2)}) by {((parseFloat(manualData.currentPrice) / advancedResults.ggmValue - 1) * 100).toFixed(0)}%.
                                </AlertDescription>
                              </Alert>
                            ) : (
                              <Alert className="border-green-200 bg-green-50">
                                <CheckCircle className="h-4 w-4 text-green-600" />
                                <AlertDescription className="text-green-800">
                                  Current price is at or below GGM value. May be undervalued.
                                </AlertDescription>
                              </Alert>
                            )}
                          </>
                        ) : (
                          <Alert>
                            <AlertTriangle className="h-4 w-4" />
                            <AlertDescription>
                              GGM requires growth rate ({advancedResults.growthRateUsed * 100}%) to be less than required return ({(advancedResults.requiredReturnUsed * 100)}%).
                              Adjust assumptions or use a different model.
                            </AlertDescription>
                          </Alert>
                        )}
                      </TabsContent>

                      {/* Comparison Tab */}
                      <TabsContent value="comparison" className="space-y-4 pt-4">
                        <div className="space-y-3">
                          <div className="flex justify-between items-center border-b pb-2">
                            <span className="text-slate-600">Current Price</span>
                            <span className="font-bold text-red-600">${parseFloat(manualData.currentPrice).toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between items-center border-b pb-2">
                            <span className="text-slate-600">GGM Value</span>
                            <span className={`font-bold ${advancedResults.ggmValue !== null ? 'text-green-600' : 'text-slate-400'}`}>
                              {advancedResults.ggmValue !== null ? `$${advancedResults.ggmValue.toFixed(2)}` : 'N/A'}
                            </span>
                          </div>
                          <div className="flex justify-between items-center border-b pb-2">
                            <span className="text-slate-600">No-Growth Value</span>
                            <span className="font-bold text-blue-600">${advancedResults.pvgo.noGrowthValue.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between items-center border-b pb-2">
                            <span className="text-slate-600">PVGO (Growth Premium)</span>
                            <span className="font-bold text-purple-600">${advancedResults.pvgo.pvgo.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between items-center pt-2">
                            <span className="text-slate-600">Implied Growth Rate</span>
                            <span className="font-bold text-amber-600">{(advancedResults.impliedGrowth * 100).toFixed(2)}%</span>
                          </div>
                        </div>
                        <Alert className="mt-2 bg-slate-50">
                          <Info className="h-4 w-4" />
                          <AlertDescription className="text-xs text-slate-600">
                            <strong>Implied Growth:</strong> The growth rate the market is pricing in. 
                            If it's much higher than your estimated growth ({advancedResults.growthRateUsed * 100}%), 
                            the stock may be overvalued.
                          </AlertDescription>
                        </Alert>
                      </TabsContent>
                    </Tabs>
                  </CardContent>
                </Card>
              )}

              {!analysisResult && !businessQuality && !advancedResults && (
                <Card className="flex items-center justify-center h-96">
                  <div className="text-center text-slate-500">
                    <Target className="w-12 h-12 mx-auto mb-4"/>
                    <p>Results will appear here after calculation.</p>
                  </div>
                </Card>
              )}

              {analysisResult && analysisResult.length > 0 && (
                <>
                <Card>
                  <CardHeader>
                    <CardTitle>Base Case Result</CardTitle>
                    <Alert className="bg-blue-50 border-blue-200 mt-4">
                      <CheckCircle className="h-4 w-4 text-blue-600" />
                      <AlertTitle className="text-blue-800">Expected Annualized Return (IRR)</AlertTitle>
                      <AlertDescription className="text-2xl font-bold">
                        {(analysisResult[0].result.irr * 100).toFixed(1)}%
                      </AlertDescription>
                    </Alert>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <DataRow label="Future P/E Used" value={analysisResult[0].pe.toFixed(1)} />
                    <DataRow label="Projected Future Price" value={analysisResult[0].result.projectedFuturePrice.toLocaleString('en-US', {style:'currency', currency:'USD'})} />
                    <DataRow label="Projected Total Dividends" value={analysisResult[0].result.totalDividends.toLocaleString('en-US', {style:'currency', currency:'USD'})} />
                    <DataRow label="Total Future Value" value={analysisResult[0].result.totalFutureValue.toLocaleString('en-US', {style:'currency', currency:'USD'})} />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <HelpCircle className="w-5 h-5"/>
                        Scenario Analysis Matrix
                    </CardTitle>
                    <p className="text-sm text-slate-600">"What's My Return If..."</p>
                  </CardHeader>
                  <CardContent>
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-2">Future P/E Scenario</th>
                          <th className="text-right p-2">Future Price</th>
                          <th className="text-right p-2">Expected Return</th>
                        </tr>
                      </thead>
                      <tbody>
                        {analysisResult.map((res, i) => (
                          <tr key={i} className={`border-b last:border-0 ${i === 0 ? 'bg-blue-50 font-semibold' : ''}`}>
                            <td className="p-2">{res.label} ({res.pe.toFixed(1)})</td>
                            <td className="text-right p-2">{res.futurePrice.toLocaleString('en-US', {style:'currency', currency:'USD'})}</td>
                            <td className="text-right p-2 font-bold">{(res.result.irr * 100).toFixed(1)}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </CardContent>
                   <CardFooter>
                      <Alert>
                        <Info className="h-4 w-4"/>
                        <AlertDescription>
                            This model's result is highly sensitive to your Future P/E assumption. A higher assumed P/E will result in a higher expected return.
                        </AlertDescription>
                      </Alert>
                  </CardFooter>
                </Card>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}