
import React, { useState, useEffect } from "react";
import { ValuationAnalysis } from "@/api/entities";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import StockSearch from "../components/search/StockSearch";
import CleanStockDataService from "../components/services/CleanStockDataService";
import { 
  Calculator as CalcIcon, 
  TrendingUp, 
  AlertCircle, 
  CheckCircle, 
  Info, 
  HelpCircle, 
  Download, 
  AlertTriangle, 
  Wifi,
  BookOpen,
  Loader2,
  Target,
  Building2,
  TrendingDown,
  Undo
} from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

const COMPANY_PROFILES = {
  mature_giant: {
    label: "Mature Giant (Low Growth)",
    description: "e.g., Apple, Coca-Cola, Procter & Gamble",
    growthRange: [2, 4],
    defaultGrowth: 3,
    examples: "Large, established companies with stable, predictable cash flows"
  },
  growth_company: {
    label: "Growth Company (Moderate Growth)", 
    description: "e.g., Adobe, Nike, Costco",
    growthRange: [4, 7],
    defaultGrowth: 5.5,
    examples: "Established companies with strong competitive advantages and expansion opportunities"
  },
  high_growth: {
    label: "High-Growth Company",
    description: "e.g., Snowflake, Uber, promising biotech",
    growthRange: [7, 12],
    defaultGrowth: 9,
    examples: "Companies in rapid expansion phase with significant market opportunities"
  },
  cyclical: {
    label: "Cyclical Company",
    description: "e.g., Ford, Boeing, Caterpillar", 
    growthRange: [1, 6],
    defaultGrowth: 3.5,
    examples: "Companies whose performance fluctuates with economic cycles"
  },
  custom: {
    label: "Custom",
    description: "Enter your own assumptions",
    growthRange: [0, 20],
    defaultGrowth: 5,
    examples: "For experienced users who want full control over assumptions"
  }
};

const initialFormState = {
  symbol: '',
  company_name: '',
  current_price: '',
  fcf_per_share: '',
  total_fcf: '',
  shares_outstanding: '',
  eps: '',
  growth_rate: '5',
  discount_rate: '8',
  terminal_growth_rate: '2.5',
  projection_years: '10',
  company_profile: 'growth_company',
  analysis_notes: ''
};

export default function Calculator() {
  const [formData, setFormData] = useState(initialFormState);

  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [initialSearchQuery, setInitialSearchQuery] = useState('');
  const [yearlyProjections, setYearlyProjections] = useState([]);
  const [dataSource, setDataSource] = useState('');
  const [validationWarnings, setValidationWarnings] = useState([]);

  // Function to fetch stock data for pre-filling the calculator
  const fetchStockForCalculator = async (symbol) => {
    setFetching(true);
    try {
      const fetchErrorMsg = "Couldn't fetch data, Manual Input";
      let currentPrice = fetchErrorMsg;
      let totalFCF = fetchErrorMsg;
      let sharesOutstanding = fetchErrorMsg;
      let eps = fetchErrorMsg;
      let growthRate = '5';
      let discountRate = '8';
      let companyName = '';

      // Try FMP first
      try {
        const fmpData = await CleanStockDataService.getFmpQuote(symbol);
        if (fmpData) {
          currentPrice = fmpData.currentPrice?.toString() || currentPrice;
          eps = fmpData.eps?.toString() || eps;
        }

        // Get FCF and shares from FMP cash flow statement
        const cashFlowResponse = await fetch(
          `${CleanStockDataService.fmpUrl}/cash-flow-statement/${symbol}?period=annual&limit=1&apikey=${CleanStockDataService.fmpApiKey}`
        );
        if (!cashFlowResponse.ok) {
            throw new Error(`FMP cash flow statement failed with status: ${cashFlowResponse.status}`);
        }
        const cashFlowData = await cashFlowResponse.json();
        if (cashFlowData && cashFlowData.length > 0) {
          const latestCashFlow = cashFlowData[0];
          totalFCF = latestCashFlow.freeCashFlow ? (latestCashFlow.freeCashFlow / 1000000).toFixed(0) : totalFCF;
          sharesOutstanding = latestCashFlow.weightedAverageShsOutstanding ? (latestCashFlow.weightedAverageShsOutstanding / 1000000).toFixed(0) : sharesOutstanding;
        }

        // Get historical growth rate
        const historicals = await CleanStockDataService.getHistoricalAnalysisData(symbol);
        if (historicals && historicals.historical_eps_growth) {
          growthRate = historicals.historical_eps_growth.toFixed(1);
        }

        setDataSource('FMP');
      } catch (fmpError) {
        console.warn('FMP failed, trying Finnhub:', fmpError);
        
        // Fallback to Finnhub
        try {
          const finnhubData = await CleanStockDataService.getStock(symbol);
          if (finnhubData) {
            currentPrice = finnhubData.current_price?.toString() || currentPrice;
            companyName = finnhubData.company_name || `${symbol} Inc.`;
          }
          setDataSource('Finnhub (Limited data)');
        } catch (finnhubError) {
          console.error('Both APIs failed:', finnhubError);
          setDataSource('Manual input required');
        }
      }

      if (!companyName) {
        companyName = `${symbol} Corporation`;
      }

      // Calculate FCF per share if we have both values
      let fcfPerShare = fetchErrorMsg;
      if (totalFCF !== fetchErrorMsg && sharesOutstanding !== fetchErrorMsg) {
        const totalFCFNum = parseFloat(totalFCF) * 1000000;
        const sharesNum = parseFloat(sharesOutstanding) * 1000000;
        if (totalFCFNum && sharesNum && sharesNum > 0) {
          fcfPerShare = (totalFCFNum / sharesNum).toFixed(2);
        }
      }

      setFormData(prev => ({
        ...prev,
        symbol: symbol,
        company_name: companyName,
        current_price: currentPrice,
        fcf_per_share: fcfPerShare,
        total_fcf: totalFCF,
        shares_outstanding: sharesOutstanding,
        eps: eps,
        growth_rate: growthRate,
        discount_rate: discountRate
      }));

      setInitialSearchQuery(symbol);
    } catch (error) {
      console.error("Failed to fetch stock data:", error);
      setDataSource('Fetch failed - Manual input required');
    } finally {
      setFetching(false);
    }
  };

  // Pre-fill form if symbol is provided in URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const symbol = urlParams.get('symbol');
    
    if (symbol) {
      fetchStockForCalculator(symbol.toUpperCase());
    }
  }, []);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Handle company profile changes
    if (field === 'company_profile' && value !== 'custom') {
      const profile = COMPANY_PROFILES[value];
      setFormData(prev => ({
        ...prev,
        growth_rate: profile.defaultGrowth.toString()
      }));
    }

    // Recalculate FCF per share if total FCF or shares outstanding changes
    if (field === 'total_fcf' || field === 'shares_outstanding') {
      const totalFCF = field === 'total_fcf' ? parseFloat(value) : parseFloat(formData.total_fcf);
      const shares = field === 'shares_outstanding' ? parseFloat(value) : parseFloat(formData.shares_outstanding);
      
      if (!isNaN(totalFCF) && !isNaN(shares) && shares > 0) {
        const fcfPerShare = ((totalFCF * 1000000) / (shares * 1000000)).toFixed(2);
        setFormData(prev => ({
          ...prev,
          fcf_per_share: fcfPerShare
        }));
      }
    }

    // Validate inputs
    validateInputs({ ...formData, [field]: value });
  };

  const handleReset = () => {
    setFormData(initialFormState);
    setResult(null);
    setYearlyProjections([]);
    setDataSource('');
    setValidationWarnings([]);
    setInitialSearchQuery('');
  };

  const validateInputs = (data) => {
    const warnings = [];
    const profile = COMPANY_PROFILES[data.company_profile];
    const growthRate = parseFloat(data.growth_rate);
    const discountRate = parseFloat(data.discount_rate);
    const terminalGrowth = parseFloat(data.terminal_growth_rate);

    // Growth rate validation based on company profile
    if (!isNaN(growthRate) && data.company_profile !== 'custom') {
      const [minGrowth, maxGrowth] = profile.growthRange;
      if (growthRate < minGrowth || growthRate > maxGrowth) {
        warnings.push(`Warning: A ${growthRate}% growth rate is ${growthRate > maxGrowth ? 'highly optimistic' : 'very conservative'} for a ${profile.label.toLowerCase()}. Consider a rate between ${minGrowth}-${maxGrowth}%.`);
      }
    }

    // Terminal growth validation
    if (!isNaN(terminalGrowth) && !isNaN(discountRate)) {
      if (terminalGrowth >= discountRate) {
        warnings.push('Critical Error: Terminal Growth Rate must be less than Discount Rate, otherwise the model breaks (terminal value goes to infinity).');
      } else if (terminalGrowth > 3.5) {
        warnings.push('Warning: Terminal Growth Rate above 3.5% is optimistic for long-term GDP growth expectations.');
      }
    }

    setValidationWarnings(warnings);
  };

  const handleFocus = (fieldName) => {
    if (formData[fieldName] === "Couldn't fetch data, Manual Input") {
      setFormData(prev => ({ ...prev, [fieldName]: '' }));
    }
  };

  const calculateDCFScenarios = () => {
    const currentFCF = parseFloat(formData.fcf_per_share);
    const baseGrowthRate = parseFloat(formData.growth_rate) / 100;
    const baseDiscountRate = parseFloat(formData.discount_rate) / 100;
    const terminalGrowthRate = parseFloat(formData.terminal_growth_rate) / 100;
    const years = parseInt(formData.projection_years);

    // Validation
    if (isNaN(currentFCF) || currentFCF <= 0) {
      throw new Error('FCF per share must be a positive number. Consider using the Buffett Analysis for negative FCF companies.');
    }
    if (isNaN(baseGrowthRate) || isNaN(baseDiscountRate) || isNaN(terminalGrowthRate)) {
      throw new Error('Growth Rate, Discount Rate, and Terminal Growth Rate must be valid numbers.');
    }
    if (baseDiscountRate <= terminalGrowthRate) {
      throw new Error('Discount Rate must be greater than Terminal Growth Rate.');
    }

    const calculateScenario = (growthRate, discountRate) => {
      let presentValue = 0;
      const projections = [];

      for (let year = 1; year <= years; year++) {
        const projectedFCF = currentFCF * Math.pow(1 + growthRate, year);
        const presentValueOfYear = projectedFCF / Math.pow(1 + discountRate, year);
        presentValue += presentValueOfYear;
        
        projections.push({
          year,
          projectedFCF: projectedFCF,
          presentValue: presentValueOfYear
        });
      }

      // Terminal value calculation
      const finalYearFCF = currentFCF * Math.pow(1 + growthRate, years);
      const terminalValue = (finalYearFCF * (1 + terminalGrowthRate)) / (discountRate - terminalGrowthRate);
      const presentValueOfTerminal = terminalValue / Math.pow(1 + discountRate, years);

      const totalIntrinsicValue = presentValue + presentValueOfTerminal;

      return {
        intrinsicValue: totalIntrinsicValue,
        presentValueOfCashFlows: presentValue,
        presentValueOfTerminal: presentValueOfTerminal,
        terminalValue: terminalValue,
        baseValue: currentFCF,
        projections: projections,
        growthRate: growthRate,
        discountRate: discountRate
      };
    };

    // Calculate three scenarios
    const baseCase = calculateScenario(baseGrowthRate, baseDiscountRate);
    const conservativeCase = calculateScenario(
      Math.max(0.01, baseGrowthRate - 0.02), // 2% lower growth, min 1%
      baseDiscountRate + 0.01 // 1% higher discount rate
    );
    const optimisticCase = calculateScenario(
      baseGrowthRate + 0.02, // 2% higher growth
      Math.max(0.05, baseDiscountRate - 0.005) // 0.5% lower discount rate, min 5%
    );

    setYearlyProjections(baseCase.projections);

    return {
      baseCase,
      conservativeCase,
      optimisticCase,
      valuationRange: {
        min: conservativeCase.intrinsicValue,
        max: optimisticCase.intrinsicValue,
        base: baseCase.intrinsicValue
      }
    };
  };

  const getRecommendation = (currentPrice, valuationRange) => {
    const baseValue = valuationRange.base;
    const minValue = valuationRange.min;
    const marginOfSafety = (baseValue - currentPrice) / currentPrice;
    const conservativeMargin = (minValue - currentPrice) / currentPrice;
    
    if (conservativeMargin > 0.25) return { recommendation: "Strong Buy", color: "green", marginOfSafety };
    if (conservativeMargin > 0.10) return { recommendation: "Buy", color: "green", marginOfSafety };
    if (marginOfSafety > -0.10) return { recommendation: "Hold", color: "yellow", marginOfSafety };
    if (marginOfSafety > -0.25) return { recommendation: "Sell", color: "red", marginOfSafety };
    return { recommendation: "Strong Sell", color: "red", marginOfSafety };
  };

  const handleCalculate = async () => {
    setLoading(true);
    setResult(null);
    
    try {
      if (!formData.current_price || formData.current_price.trim() === '' || formData.current_price === "Couldn't fetch data, Manual Input") {
        throw new Error("Please enter a current stock price.");
      }

      const currentPrice = parseFloat(formData.current_price);
      if (isNaN(currentPrice) || currentPrice <= 0) {
        throw new Error("Current Price must be a positive number.");
      }

      const scenarioResults = calculateDCFScenarios();
      const recommendationData = getRecommendation(currentPrice, scenarioResults.valuationRange);

      const companyName = formData.company_name || `${formData.symbol} Corporation`;

      const analysisData = {
        symbol: formData.symbol,
        company_name: companyName,
        current_price: currentPrice,
        intrinsic_value: scenarioResults.baseCase.intrinsicValue,
        discount_rate: parseFloat(formData.discount_rate),
        growth_rate: parseFloat(formData.growth_rate),
        terminal_growth_rate: parseFloat(formData.terminal_growth_rate),
        fcf_per_share: parseFloat(formData.fcf_per_share),
        total_fcf: parseFloat(formData.total_fcf) || null,
        shares_outstanding: parseFloat(formData.shares_outstanding) || null,
        eps: parseFloat(formData.eps) || null,
        recommendation: recommendationData.recommendation,
        margin_of_safety: recommendationData.marginOfSafety,
        dcf_breakdown: scenarioResults.baseCase,
        scenarios: scenarioResults,
        company_profile: formData.company_profile,
        data_source: dataSource,
        analysis_notes: formData.analysis_notes
      };

      await ValuationAnalysis.create(analysisData);
      setResult(analysisData);
    } catch (error) {
      console.error('Error calculating intrinsic value:', error);
      alert(`Calculation error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const exportResults = () => {
    if (!result) return;
    
    const exportData = {
      symbol: result.symbol,
      company_name: result.company_name,
      analysis_date: new Date().toISOString().split('T')[0],
      current_price: result.current_price,
      valuation_range: {
        conservative: result.scenarios.conservativeCase.intrinsicValue,
        base_case: result.intrinsic_value,
        optimistic: result.scenarios.optimisticCase.intrinsicValue
      },
      margin_of_safety: (result.margin_of_safety * 100).toFixed(2) + '%',
      recommendation: result.recommendation,
      company_profile: result.company_profile,
      dcf_model: 'Free Cash Flow - Sensitivity Analysis',
      key_metrics: {
        fcf_per_share: result.fcf_per_share,
        total_fcf_millions: result.total_fcf,
        shares_outstanding_millions: result.shares_outstanding,
        eps: result.eps
      },
      dcf_parameters: {
        growth_rate: result.growth_rate + '%',
        discount_rate: result.discount_rate + '%',
        terminal_growth_rate: result.terminal_growth_rate + '%',
        projection_years: formData.projection_years
      },
      data_source: result.data_source
    };

    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], {type: 'application/json'});
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${result.symbol}_DCF_Sensitivity_Analysis_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
  };

  const canCalculate = formData.symbol && 
                     formData.current_price && 
                     formData.current_price.trim() !== '' &&
                     formData.current_price !== "Couldn't fetch data, Manual Input" &&
                     formData.fcf_per_share &&
                     formData.fcf_per_share !== "Couldn't fetch data, Manual Input" &&
                     parseFloat(formData.fcf_per_share) > 0 &&
                     formData.growth_rate && 
                     formData.discount_rate &&
                     validationWarnings.filter(w => w.includes('Critical Error')).length === 0 &&
                     !loading;

  const fcfInvalid = !formData.fcf_per_share || 
                     formData.fcf_per_share === "Couldn't fetch data, Manual Input" || 
                     parseFloat(formData.fcf_per_share) <= 0;

  const selectedProfile = COMPANY_PROFILES[formData.company_profile];

  return (
    <TooltipProvider>
      <div className="p-4 lg:p-8 bg-slate-50 min-h-screen">
        <div className="max-w-5xl mx-auto space-y-8">
          {/* Header */}
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl flex items-center justify-center">
                <CalcIcon className="w-8 h-8 text-white" />
              </div>
            </div>
            <h1 className="text-3xl font-bold text-slate-900">Advanced DCF Calculator</h1>
            <p className="text-slate-600 mt-2">Professional DCF analysis with sensitivity scenarios and company-specific guidance</p>
            <div className="flex items-center justify-center gap-2 mt-2">
              <Wifi className="w-4 h-4 text-green-600" />
              <span className="text-xs text-green-600 font-medium">Live Market Data</span>
            </div>
            <div className="mt-3 p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800">
                <Info className="w-4 h-4 inline mr-1" />
                This calculator provides valuation ranges through sensitivity analysis rather than false precision from a single number.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Input Form */}
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5" />
                    Company Analysis Input
                  </CardTitle>
                  <Button variant="ghost" size="sm" onClick={handleReset}>
                    <Undo className="w-4 h-4 mr-2"/>
                    Reset
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-8">
                {/* Stock Search */}
                <div>
                  <Label>Find Stock</Label>
                  <StockSearch 
                    onStockSelect={fetchStockForCalculator} 
                    initialQuery={initialSearchQuery} 
                  />
                  {fetching && (
                    <div className="flex items-center gap-2 mt-2 text-blue-600">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="text-sm">Fetching data...</span>
                    </div>
                  )}
                  {dataSource && (
                    <p className="text-xs text-slate-500 mt-1">Data source: {dataSource}</p>
                  )}
                </div>

                {/* Company Profile Selection */}
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                  <Label className="text-base font-semibold">Company Profile & Growth Stage</Label>
                  <Select
                    value={formData.company_profile}
                    onValueChange={(value) => handleInputChange('company_profile', value)}
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(COMPANY_PROFILES).map(([key, profile]) => (
                        <SelectItem key={key} value={key}>
                          <div>
                            <p className="font-medium">{profile.label}</p>
                            <p className="text-xs text-slate-600">{profile.description}</p>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedProfile && (
                    <div className="mt-2 text-xs text-blue-700">
                      <p><strong>Typical Growth Range:</strong> {selectedProfile.growthRange[0]}% - {selectedProfile.growthRange[1]}%</p>
                      <p><strong>Examples:</strong> {selectedProfile.examples}</p>
                    </div>
                  )}
                </div>

                {/* Company Data Section */}
                <div className="bg-slate-50 rounded-lg p-4 border">
                  <h3 className="text-base font-semibold text-slate-900 mb-4 flex items-center gap-2">
                    <Building2 className="w-4 h-4" />
                    Company Data
                  </h3>
                  
                  <div className="space-y-4">
                    {/* Display Symbol and Company Name */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="symbol">Stock Symbol *</Label>
                        <Input
                          id="symbol"
                          placeholder="e.g. AAPL"
                          value={formData.symbol}
                          onChange={(e) => handleInputChange('symbol', e.target.value.toUpperCase())}
                        />
                      </div>
                      {formData.company_name && (
                        <div>
                          <Label htmlFor="company_name">Company Name</Label>
                          <Input
                            id="company_name"
                            value={formData.company_name}
                            readOnly
                            disabled
                            className="bg-slate-100"
                          />
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="current_price">Current Price ($) *</Label>
                        <Input
                          id="current_price"
                          type="text"
                          placeholder="150.00"
                          value={formData.current_price}
                          onChange={(e) => handleInputChange('current_price', e.target.value)}
                          onFocus={() => handleFocus('current_price')}
                          disabled={loading}
                          required
                        />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <Label htmlFor="fcf_per_share">FCF per Share ($) *</Label>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="w-4 h-4 text-slate-400" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Free Cash Flow divided by shares outstanding. Primary DCF driver.</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                        <Input
                          id="fcf_per_share"
                          type="text"
                          placeholder="8.50"
                          value={formData.fcf_per_share}
                          onChange={(e) => handleInputChange('fcf_per_share', e.target.value)}
                          onFocus={() => handleFocus('fcf_per_share')}
                          disabled={loading}
                          required
                          className={fcfInvalid ? 'border-orange-300' : ''}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <Label htmlFor="eps">EPS (TTM) - Reference</Label>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="w-4 h-4 text-slate-400" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>For reference only. DCF uses FCF as primary driver.</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <Input
                        id="eps"
                        type="text"
                        placeholder="6.05"
                        value={formData.eps}
                        onChange={(e) => handleInputChange('eps', e.target.value)}
                        onFocus={() => handleFocus('eps')}
                        disabled={loading}
                      />
                    </div>

                    {/* FCF Calculation Details */}
                    {(formData.total_fcf || formData.shares_outstanding) && (
                      <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                        <p className="text-sm font-medium text-blue-900 mb-2">FCF Calculation Details:</p>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <Label htmlFor="total_fcf">Total FCF (Millions)</Label>
                            <Input
                              id="total_fcf"
                              type="text"
                              placeholder="9,500"
                              value={formData.total_fcf}
                              onChange={(e) => handleInputChange('total_fcf', e.target.value)}
                              onFocus={() => handleFocus('total_fcf')}
                              className="mt-1"
                            />
                          </div>
                          <div>
                            <Label htmlFor="shares_outstanding">Shares Outstanding (Millions)</Label>
                            <Input
                              id="shares_outstanding"
                              type="text"
                              placeholder="1,200"
                              value={formData.shares_outstanding}
                              onChange={(e) => handleInputChange('shares_outstanding', e.target.value)}
                              onFocus={() => handleFocus('shares_outstanding')}
                              className="mt-1"
                            />
                          </div>
                        </div>
                        {formData.total_fcf !== "Couldn't fetch data, Manual Input" && 
                         formData.shares_outstanding !== "Couldn't fetch data, Manual Input" && 
                         formData.total_fcf && formData.shares_outstanding && (
                          <p className="text-xs text-blue-600 mt-2">
                            FCF per share = ${formData.total_fcf}M ÷ {formData.shares_outstanding}M shares = ${formData.fcf_per_share}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Forecast Assumptions Section */}
                <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                  <h3 className="text-base font-semibold text-slate-900 mb-4 flex items-center gap-2">
                    <Target className="w-4 h-4" />
                    Forecast Assumptions
                  </h3>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <Label htmlFor="growth_rate">Growth Rate (%)</Label>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="w-4 h-4 text-slate-400" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Expected annual FCF growth rate. Suggested range: {selectedProfile.growthRange[0]}%-{selectedProfile.growthRange[1]}% for {selectedProfile.label}</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <Input
                        id="growth_rate"
                        type="number"
                        step="0.1"
                        placeholder="8.0"
                        value={formData.growth_rate}
                        onChange={(e) => handleInputChange('growth_rate', e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="projection_years">Projection Years</Label>
                      <Input
                        id="projection_years"
                        type="number"
                        min="5"
                        max="15"
                        placeholder="10"
                        value={formData.projection_years}
                        onChange={(e) => handleInputChange('projection_years', e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {/* Risk Assumptions Section */}
                <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
                  <h3 className="text-base font-semibold text-slate-900 mb-4 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    Risk Assumptions
                  </h3>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <Label htmlFor="discount_rate">Discount Rate (%)</Label>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="w-4 h-4 text-slate-400" />
                          </TooltipTrigger>
                          <TooltipContent>
        
                          <p>Your required return. For stable companies, it's often 8-9%. For riskier companies, use 10-12% or more</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <Input
                        id="discount_rate"
                        type="number"
                        step="0.1"
                        placeholder="12.0"
                        value={formData.discount_rate}
                        onChange={(e) => handleInputChange('discount_rate', e.target.value)}
                      />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <Label htmlFor="terminal_growth_rate">Terminal Growth (%)</Label>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="w-4 h-4 text-slate-400" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Long-term growth rate. Usually 2-3% (GDP growth). Must be less than discount rate.</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <Input
                        id="terminal_growth_rate"
                        type="number"
                        step="0.1"
                        placeholder="2.5"
                        value={formData.terminal_growth_rate}
                        onChange={(e) => handleInputChange('terminal_growth_rate', e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {/* Validation Warnings */}
                {validationWarnings.length > 0 && (
                  <div className="space-y-2">
                    {validationWarnings.map((warning, index) => (
                      <Alert key={index} variant={warning.includes('Critical Error') ? 'destructive' : 'default'} className="text-sm">
                        {warning.includes('Critical Error') ? (
                          <AlertCircle className="h-4 w-4" />
                        ) : (
                          <AlertTriangle className="h-4 w-4" />
                        )}
                        <AlertDescription>{warning}</AlertDescription>
                      </Alert>
                    ))}
                  </div>
                )}

                <div>
                  <Label htmlFor="analysis_notes">Analysis Notes (Optional)</Label>
                  <Textarea
                    id="analysis_notes"
                    placeholder="Add any additional notes about your analysis..."
                    rows={3}
                    value={formData.analysis_notes}
                    onChange={(e) => handleInputChange('analysis_notes', e.target.value)}
                  />
                </div>

                <Button 
                  onClick={handleCalculate}
                  disabled={!canCalculate}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  {loading ? 'Calculating...' : 'Calculate DCF with Sensitivity Analysis'}
                </Button>

                {fcfInvalid && (
                  <div className="text-center">
                    <Link to={`${createPageUrl("BuffettAnalysis")}?symbol=${formData.symbol}`}>
                      <Button variant="outline" className="w-full">
                        <BookOpen className="w-4 h-4 mr-2" />
                        Switch to Buffett Analysis
                      </Button>
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Results */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Advanced DCF Analysis Results</CardTitle>
                  {result && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={exportResults}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Export
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {!result ? (
                  <div className="text-center py-12">
                    <CalcIcon className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-500">Enter stock data and click "Calculate" to see advanced DCF results with sensitivity analysis</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="text-center">
                      <h3 className="text-lg font-semibold text-slate-900 mb-2">
                        {result.company_name ? `${result.company_name} (${result.symbol})` : result.symbol} - Advanced DCF Analysis
                      </h3>
                      
                      {/* Valuation Range Display */}
                      <div className="bg-gradient-to-r from-red-50 via-yellow-50 to-green-50 rounded-lg p-4 mb-4">
                        <p className="text-sm text-slate-600 mb-2">Intrinsic Value Range (Sensitivity Analysis)</p>
                        <div className="flex items-center justify-center space-x-4">
                          <div className="text-center">
                            <p className="text-xs text-red-700">Conservative</p>
                            <p className="text-lg font-bold text-red-700">${result.scenarios.conservativeCase.intrinsicValue.toFixed(2)}</p>
                          </div>
                          <div className="text-center bg-white rounded-lg p-2 border-2 border-blue-500">
                            <p className="text-xs text-blue-700">Base Case</p>
                            <p className="text-xl font-bold text-blue-700">${result.intrinsic_value.toFixed(2)}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-xs text-green-700">Optimistic</p>
                            <p className="text-lg font-bold text-green-700">${result.scenarios.optimisticCase.intrinsicValue.toFixed(2)}</p>
                          </div>
                        </div>
                        <div className="mt-3 text-center">
                          <p className="text-sm text-slate-600">Current Price: <span className="font-bold">${result.current_price.toFixed(2)}</span></p>
                        </div>
                      </div>
                    </div>

                    <Alert className={`${
                      result.recommendation === 'Strong Buy' || result.recommendation === 'Buy' 
                        ? 'border-green-200 bg-green-50' 
                        : result.recommendation === 'Hold'
                        ? 'border-yellow-200 bg-yellow-50'
                        : 'border-red-200 bg-red-50'
                    }`}>
                      {result.recommendation === 'Strong Buy' || result.recommendation === 'Buy' ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-amber-600" />
                      )}
                      <AlertDescription>
                        <strong>Recommendation: {result.recommendation}</strong>
                        <br />
                        <strong>Margin of Safety: {(result.margin_of_safety * 100).toFixed(2)}%</strong>
                        <br />
                        Valuation range suggests the stock is {
                          result.current_price < result.scenarios.conservativeCase.intrinsicValue ? 'likely undervalued' :
                          result.current_price > result.scenarios.optimisticCase.intrinsicValue ? 'likely overvalued' :
                          'fairly valued within range'
                        }.
                      </AlertDescription>
                    </Alert>

                    {/* Scenario Comparison Table */}
                    <div className="border-t pt-4">
                      <h4 className="font-semibold text-slate-900 mb-3">Scenario Analysis</h4>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-slate-50">
                            <tr>
                              <th className="text-left p-2">Scenario</th>
                              <th className="text-right p-2">Growth Rate</th>
                              <th className="text-right p-2">Discount Rate</th>
                              <th className="text-right p-2">Intrinsic Value</th>
                              <th className="text-right p-2">vs. Current</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr className="border-b">
                              <td className="p-2 font-medium text-red-700">Conservative</td>
                              <td className="text-right p-2">{(result.scenarios.conservativeCase.growthRate * 100).toFixed(1)}%</td>
                              <td className="text-right p-2">{(result.scenarios.conservativeCase.discountRate * 100).toFixed(1)}%</td>
                              <td className="text-right p-2 font-medium">${result.scenarios.conservativeCase.intrinsicValue.toFixed(2)}</td>
                              <td className="text-right p-2">
                                {result.scenarios.conservativeCase.intrinsicValue > result.current_price ? (
                                  <span className="text-green-600">+{((result.scenarios.conservativeCase.intrinsicValue / result.current_price - 1) * 100).toFixed(1)}%</span>
                                ) : (
                                  <span className="text-red-600">{((result.scenarios.conservativeCase.intrinsicValue / result.current_price - 1) * 100).toFixed(1)}%</span>
                                )}
                              </td>
                            </tr>
                            <tr className="border-b bg-blue-50">
                              <td className="p-2 font-medium text-blue-700">Base Case</td>
                              <td className="text-right p-2">{result.growth_rate.toFixed(1)}%</td>
                              <td className="text-right p-2">{result.discount_rate.toFixed(1)}%</td>
                              <td className="text-right p-2 font-medium">${result.intrinsic_value.toFixed(2)}</td>
                              <td className="text-right p-2">
                                {result.intrinsic_value > result.current_price ? (
                                  <span className="text-green-600">+{((result.intrinsic_value / result.current_price - 1) * 100).toFixed(1)}%</span>
                                ) : (
                                  <span className="text-red-600">{((result.intrinsic_value / result.current_price - 1) * 100).toFixed(1)}%</span>
                                )}
                              </td>
                            </tr>
                            <tr className="border-b">
                              <td className="p-2 font-medium text-green-700">Optimistic</td>
                              <td className="text-right p-2">{(result.scenarios.optimisticCase.growthRate * 100).toFixed(1)}%</td>
                              <td className="text-right p-2">{(result.scenarios.optimisticCase.discountRate * 100).toFixed(1)}%</td>
                              <td className="text-right p-2 font-medium">${result.scenarios.optimisticCase.intrinsicValue.toFixed(2)}</td>
                              <td className="text-right p-2">
                                {result.scenarios.optimisticCase.intrinsicValue > result.current_price ? (
                                  <span className="text-green-600">+{((result.scenarios.optimisticCase.intrinsicValue / result.current_price - 1) * 100).toFixed(1)}%</span>
                                ) : (
                                  <span className="text-red-600">{((result.scenarios.optimisticCase.intrinsicValue / result.current_price - 1) * 100).toFixed(1)}%</span>
                                )}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Key Financial Metrics */}
                    <div className="grid grid-cols-2 gap-4 text-sm border-t pt-4">
                      <div>
                        <p className="text-slate-600">FCF per Share (TTM)</p>
                        <p className="font-semibold">${result.fcf_per_share.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-slate-600">Company Profile</p>
                        <p className="font-semibold">{COMPANY_PROFILES[result.company_profile].label}</p>
                      </div>
                      {result.total_fcf && (
                        <>
                          <div>
                            <p className="text-slate-600">Total FCF</p>
                            <p className="font-semibold">${result.total_fcf}M</p>
                          </div>
                          <div>
                            <p className="text-slate-600">Shares Outstanding</p>
                            <p className="font-semibold">{result.shares_outstanding}M</p>
                          </div>
                        </>
                      )}
                    </div>

                    {/* DCF Breakdown */}
                    {result.dcf_breakdown && (
                      <div className="border-t pt-4">
                        <h4 className="font-semibold text-slate-900 mb-3">Base Case DCF Breakdown</h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span>Base FCF per Share:</span>
                            <span className="font-medium">${result.dcf_breakdown.baseValue.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Present Value of Cash Flows:</span>
                            <span className="font-medium">${result.dcf_breakdown.presentValueOfCashFlows.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Present Value of Terminal Value:</span>
                            <span className="font-medium">${result.dcf_breakdown.presentValueOfTerminal.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between font-semibold border-t pt-2">
                            <span>Base Case Intrinsic Value:</span>
                            <span>${result.intrinsic_value.toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Yearly Projections Table */}
                    {yearlyProjections.length > 0 && (
                      <div className="border-t pt-4">
                        <h4 className="font-semibold text-slate-900 mb-3">Base Case - Yearly FCF Projections</h4>
                        <div className="max-h-48 overflow-y-auto">
                          <table className="w-full text-sm">
                            <thead className="bg-slate-50 sticky top-0">
                              <tr>
                                <th className="text-left p-2">Year</th>
                                <th className="text-right p-2">Projected FCF</th>
                                <th className="text-right p-2">Present Value</th>
                              </tr>
                            </thead>
                            <tbody>
                              {yearlyProjections.map((projection) => (
                                <tr key={projection.year} className="border-b">
                                  <td className="p-2">{projection.year}</td>
                                  <td className="text-right p-2">${projection.projectedFCF.toFixed(2)}</td>
                                  <td className="text-right p-2">${projection.presentValue.toFixed(2)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {result.analysis_notes && (
                      <div className="border-t pt-4">
                        <p className="text-sm text-slate-600 mb-2">Notes:</p>
                        <p className="text-sm text-slate-800">{result.analysis_notes}</p>
                      </div>
                    )}

                    <div className="text-xs text-slate-500 text-center">
                      Data source: {result.data_source} • Model: Advanced DCF with Sensitivity Analysis
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
