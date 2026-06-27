// src/pages/ArbitragePut-CallParity.jsx
import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Info, 
  History, 
  Target,
  Scale,
  Calculator,
  AlertCircle,
  CheckCircle,
  Table,
  Calendar,
  DollarSign,
  HelpCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { motion, AnimatePresence } from 'framer-motion';
import { Separator } from '@/components/ui/separator';
import {
  Table as UITable,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

// Helper functions
const calculatePresentValue = (strikePrice, riskFreeRate, timeToMaturity) => {
  return strikePrice * Math.exp(-riskFreeRate * timeToMaturity);
};

const calculateTheoreticalPut = (callPrice, stockPrice, presentValueK) => {
  return callPrice + presentValueK - stockPrice;
};

const calculateTheoreticalCall = (putPrice, stockPrice, presentValueK) => {
  return stockPrice + putPrice - presentValueK;
};

// Identify arbitrage using BID/ASK prices
const identifyArbitrageWithSpread = (S, K, callBid, callAsk, putBid, putAsk, pvK) => {
  // When SELLING options, you get the BID price
  // When BUYING options, you pay the ASK price
  
  // Strategy 1: Sell Put + Short Stock + Buy Call + Lend PV(K)
  // This works if PUT is overpriced
  const sellPutBuyCallProfit = putBid + S - callAsk - pvK;
  
  // Strategy 2: Buy Put + Buy Stock + Sell Call + Borrow PV(K)
  // This works if PUT is underpriced
  const buyPutSellCallProfit = pvK + callBid - putAsk - S;
  
  let opportunity = null;
  
  // Check Strategy 1: Put overpriced
  if (sellPutBuyCallProfit > 0.01) {
    opportunity = {
      type: 'sell_put',
      action: 'Sell Put',
      description: 'PUT option is OVERPRICED',
      profit: sellPutBuyCallProfit,
      steps: [
        `Sell Put at BID $${putBid.toFixed(2)}`,
        `Short Stock at $${S.toFixed(2)}`,
        `Buy Call at ASK $${callAsk.toFixed(2)}`,
        `Lend PV(K) at $${pvK.toFixed(2)}`
      ],
      initialCashFlow: sellPutBuyCallProfit,
      severity: 'warning'
    };
  }
  
  // Check Strategy 2: Put underpriced
  if (buyPutSellCallProfit > 0.01) {
    // Only take if better than Strategy 1 or Strategy 1 doesn't exist
    if (!opportunity || buyPutSellCallProfit > opportunity.profit) {
      opportunity = {
        type: 'buy_put',
        action: 'Buy Put',
        description: 'PUT option is UNDERPRICED',
        profit: buyPutSellCallProfit,
        steps: [
          `Buy Put at ASK $${putAsk.toFixed(2)}`,
          `Buy Stock at $${S.toFixed(2)}`,
          `Sell Call at BID $${callBid.toFixed(2)}`,
          `Borrow PV(K) at $${pvK.toFixed(2)}`
        ],
        initialCashFlow: buyPutSellCallProfit,
        severity: 'success'
      };
    }
  }
  
  // No arbitrage
  if (!opportunity) {
    return {
      type: 'none',
      action: 'No Arbitrage',
      description: 'Prices are in alignment',
      profit: 0,
      steps: [],
      initialCashFlow: 0,
      severity: 'info'
    };
  }
  
  return opportunity;
};

// Generate arbitrage execution table
const generateArbitrageTable = (S, K, callBid, callAsk, putBid, putAsk, pvK, opportunity) => {
  if (opportunity.type === 'none') return null;
  
  let positions = [];
  let totalCashFlow = 0;
  
  if (opportunity.type === 'sell_put') {
    // Sell Put + Short Stock + Buy Call + Lend PV(K)
    positions.push({
      action: 'Sell Put',
      description: `Sell put option at BID price $${putBid.toFixed(2)}`,
      cashFlow: `+$${putBid.toFixed(2)}`,
      payoffSTLessK: `-($${K.toFixed(2)} - Sₜ)`,
      payoffSTGreaterK: '$0',
    });
    totalCashFlow += putBid;
    
    positions.push({
      action: 'Short Stock',
      description: `Borrow and sell stock at $${S.toFixed(2)}`,
      cashFlow: `+$${S.toFixed(2)}`,
      payoffSTLessK: '-Sₜ',
      payoffSTGreaterK: '-Sₜ',
    });
    totalCashFlow += S;
    
    positions.push({
      action: 'Buy Call',
      description: `Buy call option at ASK price $${callAsk.toFixed(2)}`,
      cashFlow: `-$${callAsk.toFixed(2)}`,
      payoffSTLessK: '$0',
      payoffSTGreaterK: `Sₜ - $${K.toFixed(2)}`,
    });
    totalCashFlow -= callAsk;
    
    positions.push({
      action: `Lend PV($${K.toFixed(2)})`,
      description: `Invest $${pvK.toFixed(2)} at risk-free rate`,
      cashFlow: `-$${pvK.toFixed(2)}`,
      payoffSTLessK: `+$${K.toFixed(2)}`,
      payoffSTGreaterK: `+$${K.toFixed(2)}`,
    });
    totalCashFlow -= pvK;
    
  } else if (opportunity.type === 'buy_put') {
    // Buy Put + Buy Stock + Sell Call + Borrow PV(K)
    positions.push({
      action: 'Buy Put',
      description: `Buy put option at ASK price $${putAsk.toFixed(2)}`,
      cashFlow: `-$${putAsk.toFixed(2)}`,
      payoffSTLessK: `$${K.toFixed(2)} - Sₜ`,
      payoffSTGreaterK: '$0',
    });
    totalCashFlow -= putAsk;
    
    positions.push({
      action: 'Buy Stock',
      description: `Buy stock at $${S.toFixed(2)}`,
      cashFlow: `-$${S.toFixed(2)}`,
      payoffSTLessK: '+Sₜ',
      payoffSTGreaterK: '+Sₜ',
    });
    totalCashFlow -= S;
    
    positions.push({
      action: 'Sell Call',
      description: `Sell call option at BID price $${callBid.toFixed(2)}`,
      cashFlow: `+$${callBid.toFixed(2)}`,
      payoffSTLessK: '$0',
      payoffSTGreaterK: `-(Sₜ - $${K.toFixed(2)})`,
    });
    totalCashFlow += callBid;
    
    positions.push({
      action: `Borrow PV($${K.toFixed(2)})`,
      description: `Borrow $${pvK.toFixed(2)} at risk-free rate`,
      cashFlow: `+$${pvK.toFixed(2)}`,
      payoffSTLessK: `-$${K.toFixed(2)}`,
      payoffSTGreaterK: `-$${K.toFixed(2)}`,
    });
    totalCashFlow += pvK;
  }
  
  const payoffSTLessK = opportunity.type === 'sell_put' ? `+$${K.toFixed(2)} - Sₜ` : '$0';
  const payoffSTGreaterK = opportunity.type === 'sell_put' ? '$0' : `+Sₜ - $${K.toFixed(2)}`;
  
  return {
    positions,
    totalCashFlow: totalCashFlow.toFixed(2),
    payoffSTLessK,
    payoffSTGreaterK,
    profit: opportunity.profit.toFixed(2),
  };
};

const ArbitragePutCallParity = () => {
  // State for inputs - MATCHING BROKERAGE ACCOUNT
  const [ticker, setTicker] = useState('AVGO');
  const [stockPrice, setStockPrice] = useState(365.02);
  const [strikePrice, setStrikePrice] = useState(372.50);
  const [daysToExpiry, setDaysToExpiry] = useState(90);
  const [callBid, setCallBid] = useState(3.75);
  const [callAsk, setCallAsk] = useState(6.40);
  const [putBid, setPutBid] = useState(11.15);
  const [putAsk, setPutAsk] = useState(13.40);
  const [riskFreeRate, setRiskFreeRate] = useState(4.5);
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [arbitrageOpportunity, setArbitrageOpportunity] = useState(null);
  const [calculationHistory, setCalculationHistory] = useState([]);
  
  // Calculate results
  const calculateParity = () => {
    setIsLoading(true);
    
    setTimeout(() => {
      try {
        const S = stockPrice;
        const K = strikePrice;
        const T = daysToExpiry / 365;
        const r = riskFreeRate / 100;
        
        const pvK = calculatePresentValue(K, r, T);
        const theoreticalPut = calculateTheoreticalPut((callBid + callAsk) / 2, S, pvK);
        const theoreticalCall = calculateTheoreticalCall((putBid + putAsk) / 2, S, pvK);
        
        // Use BID/ASK to find arbitrage
        const opportunity = identifyArbitrageWithSpread(S, K, callBid, callAsk, putBid, putAsk, pvK);
        
        // Generate execution table
        const arbitrageTable = generateArbitrageTable(S, K, callBid, callAsk, putBid, putAsk, pvK, opportunity);
        
        const newResults = {
          pvK,
          theoreticalPut,
          theoreticalCall,
          midCall: (callBid + callAsk) / 2,
          midPut: (putBid + putAsk) / 2,
          differencePut: theoreticalPut - ((putBid + putAsk) / 2),
          differenceCall: theoreticalCall - ((callBid + callAsk) / 2),
          hasArbitrage: opportunity.type !== 'none',
          opportunity,
          arbitrageTable,
          parityEquation: `${S.toFixed(2)} + ${((putBid + putAsk) / 2).toFixed(2)} = ${((callBid + callAsk) / 2).toFixed(2)} + ${pvK.toFixed(2)}`,
          leftSide: (S + ((putBid + putAsk) / 2)).toFixed(2),
          rightSide: (((callBid + callAsk) / 2) + pvK).toFixed(2),
          daysToExpiry,
        };
        
        setResults(newResults);
        setArbitrageOpportunity(opportunity);
        
        // Save history
        const historyEntry = {
          timestamp: new Date(),
          ticker,
          stockPrice: S,
          strikePrice: K,
          daysToExpiry,
          callBid,
          callAsk,
          putBid,
          putAsk,
          pvK,
          theoreticalPut,
          theoreticalCall,
          hasArbitrage: opportunity.type !== 'none',
          profit: opportunity.profit,
          action: opportunity.action,
        };
        setCalculationHistory(prev => [historyEntry, ...prev].slice(0, 10));
        
        setIsLoading(false);
      } catch (error) {
        console.error('Calculation error:', error);
        setIsLoading(false);
      }
    }, 500);
  };
  
  const resetForm = () => {
    setTicker('AVGO');
    setStockPrice(365.02);
    setStrikePrice(372.50);
    setDaysToExpiry(90);
    setCallBid(3.75);
    setCallAsk(6.40);
    setPutBid(11.15);
    setPutAsk(13.40);
    setRiskFreeRate(4.5);
    setResults(null);
    setArbitrageOpportunity(null);
  };
  
  useEffect(() => {
    calculateParity();
  }, []);
  
  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
          <Scale className="w-8 h-8 text-blue-600" />
          Put-Call Parity Arbitrage Screener
        </h1>
        <p className="text-slate-600 mt-2">
          Find risk-free arbitrage opportunities using real brokerage data
        </p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-7 gap-6">
        {/* Input Section */}
        <div className="lg:col-span-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="w-5 h-5" />
                Brokerage Inputs
              </CardTitle>
              <p className="text-sm text-slate-500 mt-1">
                Enter the values from your brokerage option chain
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Ticker */}
                <div className="space-y-2">
                  <Label htmlFor="ticker">Ticker Symbol</Label>
                  <Input
                    id="ticker"
                    value={ticker}
                    onChange={(e) => setTicker(e.target.value.toUpperCase())}
                    placeholder="AVGO"
                    className="font-mono"
                  />
                </div>
                
                {/* Stock Price */}
                <div className="space-y-2">
                  <Label htmlFor="stockPrice">Stock Price (S)</Label>
                  <Input
                    id="stockPrice"
                    type="number"
                    step="0.01"
                    value={stockPrice}
                    onChange={(e) => setStockPrice(parseFloat(e.target.value) || 0)}
                    className="font-mono"
                  />
                </div>
                
                {/* Strike Price */}
                <div className="space-y-2">
                  <Label htmlFor="strikePrice">Strike Price (K)</Label>
                  <Input
                    id="strikePrice"
                    type="number"
                    step="0.01"
                    value={strikePrice}
                    onChange={(e) => setStrikePrice(parseFloat(e.target.value) || 0)}
                    className="font-mono"
                  />
                </div>
                
                {/* Days to Expiry */}
                <div className="space-y-2">
                  <Label htmlFor="daysToExpiry" className="flex items-center gap-1">
                    Days to Expiry
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <HelpCircle className="w-4 h-4 text-slate-400 cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="max-w-xs text-xs">
                            Enter the number of days until expiration from your brokerage option chain
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </Label>
                  <Input
                    id="daysToExpiry"
                    type="number"
                    step="1"
                    value={daysToExpiry}
                    onChange={(e) => setDaysToExpiry(parseInt(e.target.value) || 0)}
                    className="font-mono"
                  />
                  <p className="text-xs text-slate-400">
                    T = {daysToExpiry} days = {(daysToExpiry / 365).toFixed(4)} years
                  </p>
                </div>
                
                {/* Call Bid */}
                <div className="space-y-2">
                  <Label htmlFor="callBid" className="flex items-center gap-1">
                    Call BID
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <HelpCircle className="w-4 h-4 text-slate-400 cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="max-w-xs text-xs">
                            BID = Price you can SELL the call at<br/>
                            (What buyers are willing to pay)
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </Label>
                  <Input
                    id="callBid"
                    type="number"
                    step="0.01"
                    value={callBid}
                    onChange={(e) => setCallBid(parseFloat(e.target.value) || 0)}
                    className="font-mono"
                  />
                </div>
                
                {/* Call Ask */}
                <div className="space-y-2">
                  <Label htmlFor="callAsk" className="flex items-center gap-1">
                    Call ASK
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <HelpCircle className="w-4 h-4 text-slate-400 cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="max-w-xs text-xs">
                            ASK = Price you can BUY the call at<br/>
                            (What sellers want to receive)
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </Label>
                  <Input
                    id="callAsk"
                    type="number"
                    step="0.01"
                    value={callAsk}
                    onChange={(e) => setCallAsk(parseFloat(e.target.value) || 0)}
                    className="font-mono"
                  />
                </div>
                
                {/* Put Bid */}
                <div className="space-y-2">
                  <Label htmlFor="putBid" className="flex items-center gap-1">
                    Put BID
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <HelpCircle className="w-4 h-4 text-slate-400 cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="max-w-xs text-xs">
                            BID = Price you can SELL the put at<br/>
                            (What buyers are willing to pay)
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </Label>
                  <Input
                    id="putBid"
                    type="number"
                    step="0.01"
                    value={putBid}
                    onChange={(e) => setPutBid(parseFloat(e.target.value) || 0)}
                    className="font-mono"
                  />
                </div>
                
                {/* Put Ask */}
                <div className="space-y-2">
                  <Label htmlFor="putAsk" className="flex items-center gap-1">
                    Put ASK
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <HelpCircle className="w-4 h-4 text-slate-400 cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="max-w-xs text-xs">
                            ASK = Price you can BUY the put at<br/>
                            (What sellers want to receive)
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </Label>
                  <Input
                    id="putAsk"
                    type="number"
                    step="0.01"
                    value={putAsk}
                    onChange={(e) => setPutAsk(parseFloat(e.target.value) || 0)}
                    className="font-mono"
                  />
                </div>
                
                {/* Risk-Free Rate */}
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="riskFree">Risk-Free Rate (r) %</Label>
                  <Input
                    id="riskFree"
                    type="number"
                    step="0.01"
                    value={riskFreeRate}
                    onChange={(e) => setRiskFreeRate(parseFloat(e.target.value) || 0)}
                    className="font-mono"
                  />
                  <p className="text-xs text-slate-400">
                    Current 10-year Treasury yield: ~4.5%
                  </p>
                </div>
              </div>
              
              <div className="flex gap-3 mt-6">
                <Button 
                  onClick={calculateParity} 
                  disabled={isLoading}
                  className="flex-1"
                  size="lg"
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                      Analyzing...
                    </>
                  ) : (
                    'Find Arbitrage Opportunity'
                  )}
                </Button>
                <Button variant="outline" onClick={resetForm} size="lg">
                  Reset
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Results Section */}
        <div className="lg:col-span-3">
          <AnimatePresence mode="wait">
            {results && (
              <motion.div
                key="results"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Target className="w-5 h-5" />
                      Arbitrage Analysis
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Put-Call Parity Check */}
                    <div className="bg-slate-50 p-4 rounded-lg">
                      <p className="text-sm text-slate-600">Put-Call Parity Equation</p>
                      <p className="text-sm font-mono mt-1">
                        {stockPrice.toFixed(2)} + {results.midPut.toFixed(2)} = {results.midCall.toFixed(2)} + {results.pvK.toFixed(2)}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant={results.hasArbitrage ? "destructive" : "success"}>
                          {results.hasArbitrage ? '⚠️ Arbitrage Found!' : '✓ Parity Holds'}
                        </Badge>
                        {results.hasArbitrage && (
                          <Badge variant="outline" className="bg-green-50">
                            Profit: ${arbitrageOpportunity?.profit?.toFixed(2) || '0.00'}/share
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    {/* Theoretical Prices */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="border rounded-lg p-3">
                        <p className="text-xs text-slate-500">Theoretical Put</p>
                        <p className="text-xl font-bold text-blue-600">${results.theoreticalPut?.toFixed(2) || '0.00'}</p>
                        <p className={`text-xs ${results.differencePut > 0 ? 'text-red-600' : 'text-green-600'}`}>
                          Market: ${results.midPut?.toFixed(2) || '0.00'}
                        </p>
                      </div>
                      <div className="border rounded-lg p-3">
                        <p className="text-xs text-slate-500">Theoretical Call</p>
                        <p className="text-xl font-bold text-blue-600">${results.theoreticalCall?.toFixed(2) || '0.00'}</p>
                        <p className={`text-xs ${results.differenceCall > 0 ? 'text-red-600' : 'text-green-600'}`}>
                          Market: ${results.midCall?.toFixed(2) || '0.00'}
                        </p>
                      </div>
                    </div>
                    
                    {/* Arbitrage Opportunity */}
                    {arbitrageOpportunity && arbitrageOpportunity.type !== 'none' && (
                      <div className="pt-2">
                        <Separator />
                        <Alert variant={arbitrageOpportunity.severity === 'warning' ? "destructive" : "default"} className="mt-3">
                          <AlertCircle className="h-4 w-4" />
                          <AlertTitle className="font-bold text-sm">
                            {arbitrageOpportunity.type === 'sell_put' ? '📉 SELL PUT OPPORTUNITY' : '📈 BUY PUT OPPORTUNITY'}
                          </AlertTitle>
                          <AlertDescription className="text-sm mt-1">
                            {arbitrageOpportunity.description}
                          </AlertDescription>
                          <div className="flex gap-2 mt-2 flex-wrap">
                            <Badge variant="outline" className="bg-green-50">
                              Profit: ${arbitrageOpportunity.profit?.toFixed(2) || '0.00'}/share
                            </Badge>
                            <Badge variant="outline" className="bg-blue-50">
                              ${((arbitrageOpportunity.profit || 0) * 100).toFixed(2)}/contract
                            </Badge>
                          </div>
                        </Alert>
                      </div>
                    )}
                    
                    {arbitrageOpportunity && arbitrageOpportunity.type === 'none' && (
                      <div className="pt-2">
                        <Separator />
                        <Alert variant="default" className="mt-3 bg-green-50 border-green-200">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <AlertTitle className="font-bold text-sm text-green-600">No Arbitrage Detected</AlertTitle>
                          <AlertDescription className="text-sm text-green-700">
                            Prices are aligned with put-call parity. No risk-free opportunity available.
                          </AlertDescription>
                        </Alert>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
      
      {/* Arbitrage Execution Table */}
      {results && results.arbitrageTable && (
        <div className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Table className="w-5 h-5" />
                How to Execute the Arbitrage
              </CardTitle>
              <p className="text-sm text-slate-500 mt-1">
                Follow these steps to lock in a risk-free profit of ${results.arbitrageTable.profit} per share (${(parseFloat(results.arbitrageTable.profit) * 100).toFixed(2)} per contract)
              </p>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <UITable>
                  <TableCaption>
                    Initial cash flow: ${results.arbitrageTable.totalCashFlow} per share
                    {parseFloat(results.arbitrageTable.totalCashFlow) > 0 ? ' (You receive money upfront!)' : ' (You pay money upfront)'}
                  </TableCaption>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[120px]">Action</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Initial Cash Flow</TableHead>
                      <TableHead className="text-right">Payoff if Sₜ &lt; K</TableHead>
                      <TableHead className="text-right">Payoff if Sₜ ≥ K</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {results.arbitrageTable.positions && results.arbitrageTable.positions.map((position, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">
                          <Badge variant="outline" className={
                            position.cashFlow.startsWith('+') ? 'bg-green-50 border-green-200 text-green-700' :
                            'bg-red-50 border-red-200 text-red-700'
                          }>
                            {position.action}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-slate-600">{position.description}</TableCell>
                        <TableCell className={`text-right font-mono font-medium ${
                          position.cashFlow.startsWith('+') ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {position.cashFlow}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">{position.payoffSTLessK}</TableCell>
                        <TableCell className="text-right font-mono text-sm">{position.payoffSTGreaterK}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-slate-50 font-bold">
                      <TableCell colSpan={2} className="text-right">Total</TableCell>
                      <TableCell className={`text-right font-mono text-lg ${
                        parseFloat(results.arbitrageTable.totalCashFlow) > 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        ${results.arbitrageTable.totalCashFlow}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {results.arbitrageTable.payoffSTLessK}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {results.arbitrageTable.payoffSTGreaterK}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </UITable>
              </div>
              
              {/* Profit Summary */}
              <div className="mt-4 p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-green-800">💰 Risk-Free Profit Summary</p>
                    <p className="text-xs text-green-700 mt-1">
                      This arbitrage guarantees a profit of ${results.arbitrageTable.profit} per share
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-green-600">+${results.arbitrageTable.profit}</p>
                    <p className="text-xs text-green-700">Per Share</p>
                    <p className="text-sm font-semibold text-green-600">+${(parseFloat(results.arbitrageTable.profit) * 100).toFixed(2)}</p>
                    <p className="text-xs text-green-700">Per Contract (100 shares)</p>
                  </div>
                </div>
                <div className="mt-2 flex gap-2 flex-wrap">
                  <Badge variant="outline" className="bg-green-100 border-green-300 text-green-700">
                    {parseFloat(results.arbitrageTable.totalCashFlow) > 0 ? '💰 Initial Cash Inflow' : '💳 Initial Cash Outflow'}: ${results.arbitrageTable.totalCashFlow}
                  </Badge>
                  <Badge variant="outline" className="bg-blue-100 border-blue-300 text-blue-700">
                    ✓ Zero Risk at Maturity
                  </Badge>
                  <Badge variant="outline" className="bg-purple-100 border-purple-300 text-purple-700">
                    📊 1 Contract = 100 Shares
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      
      {/* Educational Section */}
      <div className="grid grid-cols-1 lg:grid-cols-7 gap-6 mt-6">
        <div className="lg:col-span-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="w-5 h-5" />
                Understanding Your Brokerage Data
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-slate-50 p-4 rounded-lg">
                <p className="text-sm font-semibold text-slate-900">What You're Looking At:</p>
                <div className="mt-2 space-y-2 text-sm text-slate-600">
                  <div className="flex items-start gap-2">
                    <Badge variant="outline" className="mt-0.5">BID</Badge>
                    <span>Price you can <strong>SELL</strong> at (what buyers will pay)</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Badge variant="outline" className="mt-0.5">ASK</Badge>
                    <span>Price you can <strong>BUY</strong> at (what sellers want)</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Badge variant="outline" className="mt-0.5">× #</Badge>
                    <span>Number of contracts available at that price</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Badge variant="outline" className="mt-0.5">1 Contract</Badge>
                    <span>= 100 shares of the underlying stock</span>
                  </div>
                </div>
              </div>
              
              {arbitrageOpportunity && arbitrageOpportunity.type !== 'none' && (
                <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
                  <p className="text-sm font-semibold text-amber-800">Why This Works</p>
                  <p className="text-sm text-amber-700 mt-1">
                    The put option is {arbitrageOpportunity.type === 'sell_put' ? 'overpriced' : 'underpriced'}. 
                    By taking the opposite positions, you lock in a risk-free profit:
                  </p>
                  <ol className="list-decimal list-inside text-sm text-amber-700 space-y-1 mt-2">
                    {arbitrageOpportunity.steps && arbitrageOpportunity.steps.map((step, i) => (
                      <li key={i}>{step}</li>
                    ))}
                  </ol>
                  <p className="text-sm text-amber-700 mt-2">
                    At maturity, all positions cancel out, leaving you with the initial profit!
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        
        <div className="lg:col-span-3">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="w-5 h-5" />
                Recent Scans
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[200px]">
                {calculationHistory.length > 0 ? (
                  <div className="space-y-2">
                    {calculationHistory.slice(0, 5).map((entry, index) => (
                      <div key={index} className="flex items-center justify-between p-2 border-b border-slate-100 hover:bg-slate-50 rounded">
                        <div>
                          <p className="font-mono text-sm font-medium">{entry.ticker}</p>
                          <p className="text-xs text-slate-500">
                            S: ${entry.stockPrice?.toFixed(2) || '0.00'} K: ${entry.strikePrice?.toFixed(2) || '0.00'}
                          </p>
                          <p className="text-xs text-slate-400">
                            {entry.daysToExpiry} days to expiry
                          </p>
                        </div>
                        <div className="text-right">
                          <Badge variant={entry.hasArbitrage ? "destructive" : "success"} className="text-xs">
                            {entry.hasArbitrage ? '⚠️ Arbitrage' : '✅ Aligned'}
                          </Badge>
                          {entry.hasArbitrage && (
                            <p className="text-xs text-green-600 font-medium mt-1">
                              +${entry.profit?.toFixed(2) || '0.00'}/share
                            </p>
                          )}
                          <p className="text-xs text-slate-400 mt-1">
                            {new Date(entry.timestamp).toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500 text-center py-8">No scans yet</p>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>
      
      {/* Footer */}
      <div className="mt-8 p-4 bg-slate-50 rounded-lg border border-slate-200">
        <p className="text-xs text-slate-500 text-center">
          💡 <strong>Real-World Note:</strong> This calculator uses BID/ASK prices to identify realistic arbitrage opportunities. 
          Always consider transaction costs, margin requirements, and liquidity before executing any trade. 
          American options may have early exercise premiums that affect pricing.
        </p>
      </div>
    </div>
  );
};

export default ArbitragePutCallParity;