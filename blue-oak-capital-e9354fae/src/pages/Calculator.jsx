// src/pages/Calculator.jsx
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Undo,
  PieChart,
  Percent,
  LineChart,
  BarChart,
  Table as TableIcon
} from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

const COMPANY_PROFILES = {
  mature_giant: {
    label: "Mature Giant (Low Growth)",
    description: "e.g., Apple, Coca-Cola, Procter & Gamble",
    growthRange: [2, 4],
    defaultGrowth: 3,
    examples: "Large, established companies with stable, predictable cash flows",
    peMultiplier: 15,
    pbMultiplier: 3,
    psMultiplier: 2
  },
  growth_company: {
    label: "Growth Company (Moderate Growth)", 
    description: "e.g., Adobe, Nike, Costco",
    growthRange: [4, 7],
    defaultGrowth: 5.5,
    examples: "Established companies with strong competitive advantages and expansion opportunities",
    peMultiplier: 25,
    pbMultiplier: 5,
    psMultiplier: 3
  },
  high_growth: {
    label: "High-Growth Company",
    description: "e.g., Snowflake, Uber, promising biotech",
    growthRange: [7, 12],
    defaultGrowth: 9,
    examples: "Companies in rapid expansion phase with significant market opportunities",
    peMultiplier: 40,
    pbMultiplier: 8,
    psMultiplier: 5
  },
  cyclical: {
    label: "Cyclical Company",
    description: "e.g., Ford, Boeing, Caterpillar", 
    growthRange: [1, 6],
    defaultGrowth: 3.5,
    examples: "Companies whose performance fluctuates with economic cycles",
    peMultiplier: 12,
    pbMultiplier: 2,
    psMultiplier: 1.5
  },
  custom: {
    label: "Custom",
    description: "Enter your own assumptions",
    growthRange: [0, 20],
    defaultGrowth: 5,
    examples: "For experienced users who want full control over assumptions",
    peMultiplier: 20,
    pbMultiplier: 4,
    psMultiplier: 2.5
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
  const [advancedResults, setAdvancedResults] = useState(null);
  const [activeTab, setActiveTab] = useState('valuation');

  // NEW: Calculate PVGO for DCF
  const calculatePVGOForDCF = (intrinsicValue, eps, requiredReturn) => {
    if (!eps || !requiredReturn || requiredReturn <= 0) return null;
    const noGrowthValue = eps / (requiredReturn / 100);
    const pvgo = intrinsicValue - noGrowthValue;
    const pvgoPercent = intrinsicValue > 0 ? (pvgo / intrinsicValue) * 100 : 0;
    return { 
      noGrowthValue, 
      pvgo, 
      pvgoPercent,
      valueFromAssets: noGrowthValue,
      valueFromGrowth: pvgo
    };
  };

  // NEW: Calculate implied growth from current price
  const calculateImpliedGrowthDCF = (currentPrice, baseFCF, discountRate, terminalGrowth, years) => {
    if (!currentPrice || !baseFCF || baseFCF <= 0) return null;
    
    let lowGrowth = 0.001;
    let highGrowth = 0.25;
    const discount = discountRate / 100;
    const tg = terminalGrowth / 100;
    
    const calculateDCFValue = (growthRate) => {
      let presentValue = 0;
      for (let year = 1; year <= years; year++) {
        const projectedFCF = baseFCF * Math.pow(1 + growthRate, year);
        presentValue += projectedFCF / Math.pow(1 + discount, year);
      }
      const finalYearFCF = baseFCF * Math.pow(1 + growthRate, years);
      const terminalValue = (finalYearFCF * (1 + tg)) / (discount - tg);
      const presentValueOfTerminal = terminalValue / Math.pow(1 + discount, years);
      return presentValue + presentValueOfTerminal;
    };

    try {
      for (let i = 0; i < 50; i++) {
        const midGrowth = (lowGrowth + highGrowth) / 2;
        const value = calculateDCFValue(midGrowth);
        if (value < currentPrice) {
          lowGrowth = midGrowth;
        } else {
          highGrowth = midGrowth;
        }
      }
      return (lowGrowth + highGrowth) / 2;
    } catch (error) {
      return null;
    }
  };

  // NEW: Generate Sensitivity Matrix
  const generateSensitivityMatrix = (baseFCF, baseGrowth, baseDiscount, terminalGrowth, years) => {
    if (!baseFCF || baseFCF <= 0) return null;
    
    const growthVariations = [-2, -1, 0, 1, 2];
    const discountVariations = [-1, -0.5, 0, 0.5, 1];
    const matrix = [];
    
    const calculateValue = (growth, discount) => {
      const g = growth / 100;
      const d = discount / 100;
      const tg = terminalGrowth / 100;
      let presentValue = 0;
      for (let year = 1; year <= years; year++) {
        const projectedFCF = baseFCF * Math.pow(1 + g, year);
        presentValue += projectedFCF / Math.pow(1 + d, year);
      }
      const finalYearFCF = baseFCF * Math.pow(1 + g, years);
      const terminalValue = (finalYearFCF * (1 + tg)) / (d - tg);
      const presentValueOfTerminal = terminalValue / Math.pow(1 + d, years);
      return presentValue + presentValueOfTerminal;
    };

    for (const gVar of growthVariations) {
      const row = [];
      for (const dVar of discountVariations) {
        const growth = baseGrowth + gVar;
        const discount = baseDiscount + dVar;
        const value = calculateValue(growth, discount);
        row.push({ growth, discount, value });
      }
      matrix.push(row);
    }
    return matrix;
  };

  // NEW: Calculate Terminal Value Sensitivity
  const calculateTerminalValueSensitivity = (baseFCF, growth, discount, terminalGrowth, years) => {
    if (!baseFCF || baseFCF <= 0) return null;
    
    const sensitivities = [];
    const terminalGrowths = [1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0];
    const g = growth / 100;
    const d = discount / 100;
    const baseTV = (baseFCF * Math.pow(1 + g, years) * (1 + terminalGrowth / 100)) / (d - terminalGrowth / 100);
    const basePVTV = baseTV / Math.pow(1 + d, years);
    
    for (const tg of terminalGrowths) {
      const tgDecimal = tg / 100;
      const tv = (baseFCF * Math.pow(1 + g, years) * (1 + tgDecimal)) / (d - tgDecimal);
      const pvTv = tv / Math.pow(1 + d, years);
      const percentOfBase = ((pvTv / basePVTV) * 100).toFixed(1);
      sensitivities.push({ 
        terminalGrowth: tg, 
        terminalValue: tv, 
        presentValue: pvTv,
        percentOfBase: parseFloat(percentOfBase)
      });
    }
    return sensitivities;
  };

  // NEW: Peer Comparison
  const getPeerComparison = (currentPrice, eps, companyProfile, intrinsicValue) => {
    if (!eps || eps <= 0) return null;
    
    const profile = COMPANY_PROFILES[companyProfile] || COMPANY_PROFILES.custom;
    const peRatio = currentPrice / eps;
    
    return {
      currentPE: peRatio,
      industryPE: profile.peMultiplier,
      peComparison: peRatio > profile.peMultiplier * 1.1 ? 'Above industry average' :
                    peRatio < profile.peMultiplier * 0.9 ? 'Below industry average' : 'In line with industry',
      pbMultiplier: profile.pbMultiplier,
      psMultiplier: profile.psMultiplier,
      fairValueEstimate: eps * profile.peMultiplier
    };
  };

  // NEW: Calculate WACC-like discount rate with spot rates
  const calculateDiscountRateWithRf = (rfRate, beta, marketRiskPremium) => {
    // CAPM: r = rf + beta * (rm - rf)
    const rf = parseFloat(rfRate) / 100 || 0.045;
    const betaValue = beta || 1.0;
    const mrp = marketRiskPremium || 0.06; // 6% default equity risk premium
    return (rf + betaValue * mrp) * 100;
  };

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

      try {
        const fmpData = await CleanStockDataService.getFmpQuote(symbol);
        if (fmpData) {
          currentPrice = fmpData.currentPrice?.toString() || currentPrice;
          eps = fmpData.eps?.toString() || eps;
        }

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

        const historicals = await CleanStockDataService.getHistoricalAnalysisData(symbol);
        if (historicals && historicals.historical_eps_growth) {
          growthRate = historicals.historical_eps_growth.toFixed(1);
        }

        setDataSource('FMP');
      } catch (fmpError) {
        console.warn('FMP failed, trying Finnhub:', fmpError);
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

    if (field === 'company_profile' && value !== 'custom') {
      const profile = COMPANY_PROFILES[value];
      setFormData(prev => ({
        ...prev,
        growth_rate: profile.defaultGrowth.toString()
      }));
    }

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

    validateInputs({ ...formData, [field]: value });
  };

  const handleReset = () => {
    setFormData(initialFormState);
    setResult(null);
    setYearlyProjections([]);
    setDataSource('');
    setValidationWarnings([]);
    setInitialSearchQuery('');
    setAdvancedResults(null);
  };

  const validateInputs = (data) => {
    const warnings = [];
    const profile = COMPANY_PROFILES[data.company_profile];
    const growthRate = parseFloat(data.growth_rate);
    const discountRate = parseFloat(data.discount_rate);
    const terminalGrowth = parseFloat(data.terminal_growth_rate);

    if (!isNaN(growthRate) && data.company_profile !== 'custom') {
      const [minGrowth, maxGrowth] = profile.growthRange;
      if (growthRate < minGrowth || growthRate > maxGrowth) {
        warnings.push(`Warning: A ${growthRate}% growth rate is ${growthRate > maxGrowth ? 'highly optimistic' : 'very conservative'} for a ${profile.label.toLowerCase()}. Consider a rate between ${minGrowth}-${maxGrowth}%.`);
      }
    }

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

    const baseCase = calculateScenario(baseGrowthRate, baseDiscountRate);
    const conservativeCase = calculateScenario(
      Math.max(0.01, baseGrowthRate - 0.02),
      baseDiscountRate + 0.01
    );
    const optimisticCase = calculateScenario(
      baseGrowthRate + 0.02,
      Math.max(0.05, baseDiscountRate - 0.005)
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
    setAdvancedResults(null);
    
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

      // --- NEW: Calculate Advanced Analytics ---
      
      // 1. PVGO
      const eps = parseFloat(formData.eps);
      const discountRate = parseFloat(formData.discount_rate);
      const pvgoResults = calculatePVGOForDCF(
        scenarioResults.baseCase.intrinsicValue, 
        eps, 
        discountRate
      );

      // 2. Implied Growth
      const baseFCF = parseFloat(formData.fcf_per_share);
      const growthRate = parseFloat(formData.growth_rate);
      const terminalGrowth = parseFloat(formData.terminal_growth_rate);
      const projectionYears = parseInt(formData.projection_years);
      const impliedGrowth = calculateImpliedGrowthDCF(
        currentPrice, 
        baseFCF, 
        discountRate, 
        terminalGrowth, 
        projectionYears
      );

      // 3. Sensitivity Matrix
      const sensitivityMatrix = generateSensitivityMatrix(
        baseFCF, 
        growthRate, 
        discountRate, 
        terminalGrowth, 
        projectionYears
      );

      // 4. Terminal Value Sensitivity
      const tvSensitivity = calculateTerminalValueSensitivity(
        baseFCF, 
        growthRate, 
        discountRate, 
        terminalGrowth, 
        projectionYears
      );

      // 5. Peer Comparison
      const peerComparison = getPeerComparison(
        currentPrice, 
        eps, 
        formData.company_profile,
        scenarioResults.baseCase.intrinsicValue
      );

      // 6. Discount Rate Components
      const discountRateComponents = {
        riskFreeRate: 4.5, // 10-year Treasury
        equityRiskPremium: 5.5,
        beta: 1.0,
        calculatedRate: 10.0
      };

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
        analysis_notes: formData.analysis_notes,
        // New fields
        pvgo: pvgoResults,
        impliedGrowth: impliedGrowth,
        sensitivityMatrix: sensitivityMatrix,
        tvSensitivity: tvSensitivity,
        peerComparison: peerComparison,
        discountRateComponents: discountRateComponents
      };

      setResult(analysisData);
      setAdvancedResults({
        pvgo: pvgoResults,
        impliedGrowth: impliedGrowth,
        sensitivityMatrix: sensitivityMatrix,
        tvSensitivity: tvSensitivity,
        peerComparison: peerComparison
      });
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
      // New fields
      pvgo: result.pvgo,
      implied_growth: result.impliedGrowth ? (result.impliedGrowth * 100).toFixed(2) + '%' : 'N/A',
      peer_comparison: result.peerComparison,
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

                <div className="bg-slate-50 rounded-lg p-4 border">
                  <h3 className="text-base font-semibold text-slate-900 mb-4 flex items-center gap-2">
                    <Building2 className="w-4 h-4" />
                    Company Data
                  </h3>
                  
                  <div className="space-y-4">
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

                    {/* NEW: Advanced Valuation Tabs */}
                    {advancedResults && (
                      <Card className="border-purple-200 bg-purple-50/30">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base flex items-center gap-2">
                            <BarChart className="w-4 h-4 text-purple-600" />
                            Advanced Valuation Analysis
                          </CardTitle>
                          <p className="text-xs text-slate-500">PVGO, Implied Growth, Sensitivity Matrix, and Peer Comparison</p>
                        </CardHeader>
                        <CardContent>
                          <Tabs defaultValue="pvgo" className="w-full">
                            <TabsList className="grid w-full grid-cols-4">
                              <TabsTrigger value="pvgo" className="text-xs">
                                <PieChart className="w-3 h-3 mr-1" />
                                PVGO
                              </TabsTrigger>
                              <TabsTrigger value="growth" className="text-xs">
                                <Target className="w-3 h-3 mr-1" />
                                Implied Growth
                              </TabsTrigger>
                              <TabsTrigger value="sensitivity" className="text-xs">
                                <TableIcon className="w-3 h-3 mr-1" />
                                Sensitivity
                              </TabsTrigger>
                              <TabsTrigger value="peers" className="text-xs">
                                <Building2 className="w-3 h-3 mr-1" />
                                Peers
                              </TabsTrigger>
                            </TabsList>

                            {/* PVGO Tab */}
                            <TabsContent value="pvgo" className="space-y-4 pt-4">
                              {advancedResults.pvgo ? (
                                <>
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
                                        {advancedResults.pvgo.pvgoPercent.toFixed(1)}% of intrinsic value
                                      </p>
                                    </div>
                                  </div>
                                  <div className="bg-slate-50 p-4 rounded-lg">
                                    <p className="text-sm text-slate-600">What this means:</p>
                                    <div className="mt-2 text-sm">
                                      <div className="flex justify-between border-b py-1">
                                        <span className="text-slate-500">Intrinsic Value:</span>
                                        <span className="font-medium">${result.intrinsic_value.toFixed(2)}</span>
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
                                          Most of the value comes from <strong>growth expectations</strong> ({advancedResults.pvgo.pvgoPercent.toFixed(1)}%). 
                                          Ensure growth assumptions are realistic.
                                        </AlertDescription>
                                      </Alert>
                                    ) : (
                                      <Alert className="mt-3 border-green-200 bg-green-50">
                                        <CheckCircle className="h-4 w-4 text-green-600" />
                                        <AlertDescription className="text-green-800">
                                          Value is primarily driven by <strong>current assets</strong>. 
                                          Less dependent on uncertain growth forecasts.
                                        </AlertDescription>
                                      </Alert>
                                    )}
                                  </div>
                                </>
                              ) : (
                                <p className="text-sm text-slate-500">Enter EPS to see PVGO analysis.</p>
                              )}
                            </TabsContent>

                            {/* Implied Growth Tab */}
                            <TabsContent value="growth" className="space-y-4 pt-4">
                              {advancedResults.impliedGrowth !== null ? (
                                <>
                                  <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-amber-50 p-4 rounded-lg">
                                      <p className="text-xs text-amber-600">Your Assumed Growth</p>
                                      <p className="text-xl font-bold text-amber-700">
                                        {result.growth_rate.toFixed(1)}%
                                      </p>
                                      <p className="text-xs text-amber-500">From your forecast</p>
                                    </div>
                                    <div className="bg-purple-50 p-4 rounded-lg">
                                      <p className="text-xs text-purple-600">Market's Implied Growth</p>
                                      <p className="text-xl font-bold text-purple-700">
                                        {(advancedResults.impliedGrowth * 100).toFixed(2)}%
                                      </p>
                                      <p className="text-xs text-purple-500">What the market is pricing in</p>
                                    </div>
                                  </div>
                                  <div className="bg-slate-50 p-4 rounded-lg">
                                    <p className="text-sm text-slate-600">Growth Gap Analysis:</p>
                                    <div className="mt-2 text-sm">
                                      <div className="flex justify-between border-b py-1">
                                        <span className="text-slate-500">Market's Implied Growth:</span>
                                        <span className="font-medium text-purple-600">{(advancedResults.impliedGrowth * 100).toFixed(2)}%</span>
                                      </div>
                                      <div className="flex justify-between border-b py-1">
                                        <span className="text-slate-500">Your Estimated Growth:</span>
                                        <span className="font-medium text-amber-600">{result.growth_rate.toFixed(1)}%</span>
                                      </div>
                                      <div className="flex justify-between py-1 font-semibold">
                                        <span className="text-slate-500">Growth Gap:</span>
                                        <span className={advancedResults.impliedGrowth * 100 > result.growth_rate ? 'text-red-600' : 'text-green-600'}>
                                          {((advancedResults.impliedGrowth * 100 - result.growth_rate).toFixed(2))}%
                                        </span>
                                      </div>
                                    </div>
                                    {advancedResults.impliedGrowth * 100 > result.growth_rate + 1 ? (
                                      <Alert className="mt-3 border-red-200 bg-red-50">
                                        <AlertTriangle className="h-4 w-4 text-red-600" />
                                        <AlertDescription className="text-red-800">
                                          Market expects growth {(advancedResults.impliedGrowth * 100 - result.growth_rate).toFixed(2)}% higher than your estimate. 
                                          Stock may be overvalued unless growth accelerates.
                                        </AlertDescription>
                                      </Alert>
                                    ) : advancedResults.impliedGrowth * 100 < result.growth_rate - 1 ? (
                                      <Alert className="mt-3 border-green-200 bg-green-50">
                                        <CheckCircle className="h-4 w-4 text-green-600" />
                                        <AlertDescription className="text-green-800">
                                          Market expects lower growth than your estimate. Potential undervaluation opportunity.
                                        </AlertDescription>
                                      </Alert>
                                    ) : (
                                      <Alert className="mt-3 border-blue-200 bg-blue-50">
                                        <Info className="h-4 w-4 text-blue-600" />
                                        <AlertDescription className="text-blue-800">
                                          Your growth estimate is close to market expectations. Fairly valued.
                                        </AlertDescription>
                                      </Alert>
                                    )}
                                  </div>
                                </>
                              ) : (
                                <p className="text-sm text-slate-500">Implied growth calculation requires valid inputs.</p>
                              )}
                            </TabsContent>

                            {/* Sensitivity Matrix Tab */}
                            <TabsContent value="sensitivity" className="space-y-4 pt-4">
                              {advancedResults.sensitivityMatrix && advancedResults.sensitivityMatrix.length > 0 ? (
                                <>
                                  <p className="text-xs text-slate-500">Intrinsic Value Matrix (Growth% × Discount%)</p>
                                  <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                      <thead className="bg-slate-50">
                                        <tr>
                                          <th className="p-2 text-left">Growth \ Discount</th>
                                          {advancedResults.sensitivityMatrix[0].map((col, idx) => (
                                            <th key={idx} className="p-2 text-right font-medium">
                                              {col.discount.toFixed(1)}%
                                            </th>
                                          ))}
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {advancedResults.sensitivityMatrix.map((row, idx) => (
                                          <tr key={idx} className="border-t">
                                            <td className="p-2 font-medium">{row[0].growth.toFixed(1)}%</td>
                                            {row.map((cell, cellIdx) => (
                                              <td key={cellIdx} className="p-2 text-right">
                                                <span className={
                                                  cell.value > result.current_price ? 'text-green-600 font-medium' : 
                                                  cell.value < result.current_price * 0.8 ? 'text-red-600' : 'text-amber-600'
                                                }>
                                                  ${cell.value.toFixed(0)}
                                                </span>
                                              </td>
                                            ))}
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                  <div className="flex justify-center gap-4 text-xs mt-2">
                                    <div><span className="text-green-600">●</span> > Current Price</div>
                                    <div><span className="text-amber-600">●</span> Near Current Price</div>
                                    <div><span className="text-red-600">●</span> &lt; 80% of Current Price</div>
                                  </div>
                                </>
                              ) : (
                                <p className="text-sm text-slate-500">Sensitivity matrix requires valid inputs.</p>
                              )}

                              {/* Terminal Value Sensitivity */}
                              {advancedResults.tvSensitivity && advancedResults.tvSensitivity.length > 0 && (
                                <div className="mt-4">
                                  <p className="text-xs text-slate-500 font-medium">Terminal Value Sensitivity</p>
                                  <div className="overflow-x-auto">
                                    <table className="w-full text-sm mt-2">
                                      <thead className="bg-slate-50">
                                        <tr>
                                          <th className="p-2 text-left">Terminal Growth</th>
                                          <th className="p-2 text-right">Terminal Value</th>
                                          <th className="p-2 text-right">PV of Terminal</th>
                                          <th className="p-2 text-right">% of Base</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {advancedResults.tvSensitivity.map((item, idx) => (
                                          <tr key={idx} className="border-t">
                                            <td className="p-2 font-medium">{item.terminalGrowth}%</td>
                                            <td className="p-2 text-right">${(item.terminalValue).toFixed(0)}</td>
                                            <td className="p-2 text-right">${item.presentValue.toFixed(2)}</td>
                                            <td className="p-2 text-right">
                                              <span className={item.percentOfBase > 105 ? 'text-green-600' : item.percentOfBase < 95 ? 'text-red-600' : 'text-amber-600'}>
                                                {item.percentOfBase}%
                                              </span>
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              )}
                            </TabsContent>

                            {/* Peer Comparison Tab */}
                            <TabsContent value="peers" className="space-y-4 pt-4">
                              {advancedResults.peerComparison ? (
                                <>
                                  <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-blue-50 p-4 rounded-lg">
                                      <p className="text-xs text-blue-600">Current P/E</p>
                                      <p className="text-xl font-bold text-blue-700">
                                        {advancedResults.peerComparison.currentPE.toFixed(1)}x
                                      </p>
                                    </div>
                                    <div className="bg-slate-50 p-4 rounded-lg">
                                      <p className="text-xs text-slate-600">Industry Average P/E</p>
                                      <p className="text-xl font-bold text-slate-700">
                                        {advancedResults.peerComparison.industryPE}x
                                      </p>
                                    </div>
                                  </div>
                                  <div className="bg-slate-50 p-4 rounded-lg">
                                    <p className="text-sm font-medium">Peer Comparison Assessment</p>
                                    <div className="mt-2 text-sm">
                                      <div className="flex justify-between border-b py-1">
                                        <span className="text-slate-500">Current P/E:</span>
                                        <span className="font-medium">{advancedResults.peerComparison.currentPE.toFixed(1)}x</span>
                                      </div>
                                      <div className="flex justify-between border-b py-1">
                                        <span className="text-slate-500">Industry P/E:</span>
                                        <span className="font-medium">{advancedResults.peerComparison.industryPE}x</span>
                                      </div>
                                      <div className="flex justify-between py-1 font-semibold">
                                        <span className="text-slate-500">Assessment:</span>
                                        <span className={advancedResults.peerComparison.peComparison.includes('Above') ? 'text-red-600' : advancedResults.peerComparison.peComparison.includes('Below') ? 'text-green-600' : 'text-amber-600'}>
                                          {advancedResults.peerComparison.peComparison}
                                        </span>
                                      </div>
                                      <div className="flex justify-between py-1 text-xs text-slate-500">
                                        <span>Fair Value Estimate:</span>
                                        <span>${advancedResults.peerComparison.fairValueEstimate.toFixed(2)}</span>
                                      </div>
                                    </div>
                                  </div>
                                </>
                              ) : (
                                <p className="text-sm text-slate-500">Enter EPS to see peer comparison.</p>
                              )}
                            </TabsContent>
                          </Tabs>
                        </CardContent>
                      </Card>
                    )}

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