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
  ArrowUpRight,
  ArrowDownRight,
  DollarSign
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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

const identifyArbitrage = (marketPrice, theoreticalPrice, optionType) => {
  const difference = theoreticalPrice - marketPrice;
  const threshold = 0.01;

  if (Math.abs(difference) < threshold) {
    return {
      type: 'none',
      message: 'Prices are in alignment. No arbitrage opportunity detected.',
      action: 'No action needed',
      profit: 0,
      severity: 'info',
    };
  }

  if (difference > threshold) {
    return {
      type: 'buy',
      message: `${optionType} is UNDERPRICED. Buy ${optionType} and take the opposite synthetic position.`,
      action: `Buy ${optionType}`,
      profit: difference,
      severity: 'success',
    };
  } else {
    return {
      type: 'sell',
      message: `${optionType} is OVERPRICED. Sell ${optionType} and take the opposite synthetic position.`,
      action: `Sell ${optionType}`,
      profit: -difference,
      severity: 'warning',
    };
  }
};

// Generate arbitrage execution table - FIXED: Use plain text strings
const generateArbitrageTable = (S, K, c, p, pvK, opportunity) => {
  if (opportunity.type === 'none') return null;

  // Determine if we're selling or buying the put
  const isPutOverpriced = opportunity.type === 'sell';
  const isPutUnderpriced = opportunity.type === 'buy';
  
  let positions = [];
  let totalCashFlow = 0;

  if (isPutOverpriced) {
    // Sell Put - Overpriced PUT means SELL the put
    positions.push({
      action: 'Sell Put',
      description: `Receive premium from selling the put option at $${p.toFixed(2)}`,
      cashFlow: `+$${p.toFixed(2)}`,
      payoffSTLessK: `-($${K.toFixed(2)} - Stock Price)`,
      payoffSTGreaterK: '$0',
    });
    totalCashFlow += p;

    // Short Stock
    positions.push({
      action: 'Short Stock',
      description: `Borrow and sell the stock today at $${S.toFixed(2)}`,
      cashFlow: `+$${S.toFixed(2)}`,
      payoffSTLessK: '-Stock Price',
      payoffSTGreaterK: '-Stock Price',
    });
    totalCashFlow += S;

    // Buy Call
    positions.push({
      action: 'Buy Call',
      description: `Pay premium of $${c.toFixed(2)} to buy the call option`,
      cashFlow: `-$${c.toFixed(2)}`,
      payoffSTLessK: '$0',
      payoffSTGreaterK: `Stock Price - $${K.toFixed(2)}`,
    });
    totalCashFlow -= c;

    // Lend PV(K)
    positions.push({
      action: `Lend PV($${K.toFixed(2)})`,
      description: `Invest $${pvK.toFixed(2)} at risk-free rate to receive $${K.toFixed(2)} at maturity`,
      cashFlow: `-$${pvK.toFixed(2)}`,
      payoffSTLessK: `+$${K.toFixed(2)}`,
      payoffSTGreaterK: `+$${K.toFixed(2)}`,
    });
    totalCashFlow -= pvK;

  } else if (isPutUnderpriced) {
    // Buy Put - Underpriced PUT means BUY the put
    positions.push({
      action: 'Buy Put',
      description: `Pay premium of $${p.toFixed(2)} to buy the put option`,
      cashFlow: `-$${p.toFixed(2)}`,
      payoffSTLessK: `$${K.toFixed(2)} - Stock Price`,
      payoffSTGreaterK: '$0',
    });
    totalCashFlow -= p;

    // Buy Stock
    positions.push({
      action: 'Buy Stock',
      description: `Purchase the stock today at $${S.toFixed(2)}`,
      cashFlow: `-$${S.toFixed(2)}`,
      payoffSTLessK: '+Stock Price',
      payoffSTGreaterK: '+Stock Price',
    });
    totalCashFlow -= S;

    // Sell Call
    positions.push({
      action: 'Sell Call',
      description: `Receive premium of $${c.toFixed(2)} from selling the call option`,
      cashFlow: `+$${c.toFixed(2)}`,
      payoffSTLessK: '$0',
      payoffSTGreaterK: `-(Stock Price - $${K.toFixed(2)})`,
    });
    totalCashFlow += c;

    // Borrow PV(K)
    positions.push({
      action: `Borrow PV($${K.toFixed(2)})`,
      description: `Borrow $${pvK.toFixed(2)} today, repay $${K.toFixed(2)} at maturity`,
      cashFlow: `+$${pvK.toFixed(2)}`,
      payoffSTLessK: `-$${K.toFixed(2)}`,
      payoffSTGreaterK: `-$${K.toFixed(2)}`,
    });
    totalCashFlow += pvK;
  }

  // Calculate net payoffs for display using the current K value
  const payoffSTLessK = isPutOverpriced ? `+$${K.toFixed(2)} - Stock Price` : '$0';
  const payoffSTGreaterK = isPutOverpriced ? '$0' : `+Stock Price - $${K.toFixed(2)}`;

  return {
    positions,
    totalCashFlow: totalCashFlow.toFixed(2),
    payoffSTLessK,
    payoffSTGreaterK,
    profit: opportunity.profit.toFixed(2),
  };
};

const ArbitragePutCallParity = () => {
  // State for inputs
  const [ticker, setTicker] = useState('AAPL');
  const [stockPrice, setStockPrice] = useState(200.25);
  const [strikePrice, setStrikePrice] = useState(210);
  const [callPrice, setCallPrice] = useState(15.50);
  const [putPrice, setPutPrice] = useState(12.75);
  const [riskFreeRate, setRiskFreeRate] = useState(0.045);
  const [timeToMaturity, setTimeToMaturity] = useState(0.25);
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [arbitrageOpportunity, setArbitrageOpportunity] = useState(null);
  const [calculationHistory, setCalculationHistory] = useState([]);

  // Calculate results
  const calculateParity = () => {
    setIsLoading(true);

    // Use setTimeout to simulate calculation and prevent UI freeze
    setTimeout(() => {
      try {
        // Use the current state values
        const S = stockPrice;
        const K = strikePrice;
        const c = callPrice;
        const p = putPrice;
        const r = riskFreeRate;
        const T = timeToMaturity;

        const pvK = calculatePresentValue(K, r, T);
        const theoreticalPut = calculateTheoreticalPut(c, S, pvK);
        const theoreticalCall = calculateTheoreticalCall(p, S, pvK);

        const putArbitrage = identifyArbitrage(p, theoreticalPut, 'PUT');
        const callArbitrage = identifyArbitrage(c, theoreticalCall, 'CALL');

        const hasArbitrage = putArbitrage.type !== 'none' || callArbitrage.type !== 'none';
        const bestOpportunity = putArbitrage.type !== 'none' ? putArbitrage : callArbitrage;

        // Generate arbitrage execution table data with current values
        const arbitrageTable = generateArbitrageTable(
          S,
          K,
          c,
          p,
          pvK,
          bestOpportunity
        );

        const newResults = {
          pvK,
          theoreticalPut,
          theoreticalCall,
          differencePut: theoreticalPut - p,
          differenceCall: theoreticalCall - c,
          hasArbitrage,
          putArbitrage,
          callArbitrage,
          bestOpportunity,
          arbitrageTable,
          parityEquation: `${S.toFixed(2)} + ${p.toFixed(2)} = ${c.toFixed(2)} + ${pvK.toFixed(2)}`,
          leftSide: (S + p).toFixed(2),
          rightSide: (c + pvK).toFixed(2),
          // Store current values for display
          currentStockPrice: S,
          currentStrikePrice: K,
          currentCallPrice: c,
          currentPutPrice: p,
        };

        setResults(newResults);
        setArbitrageOpportunity(bestOpportunity);

        const historyEntry = {
          timestamp: new Date(),
          ticker,
          stockPrice: S,
          strikePrice: K,
          callPrice: c,
          putPrice: p,
          riskFreeRate: r,
          timeToMaturity: T,
          pvK,
          theoreticalPut,
          theoreticalCall,
          differencePut: theoreticalPut - p,
          differenceCall: theoreticalCall - c,
          hasArbitrage,
          bestOpportunity: bestOpportunity.message,
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
    setTicker('AAPL');
    setStockPrice(200.25);
    setStrikePrice(210);
    setCallPrice(15.50);
    setPutPrice(12.75);
    setRiskFreeRate(0.045);
    setTimeToMaturity(0.25);
    setResults(null);
    setArbitrageOpportunity(null);
  };

  // Auto-calculate on mount
  useEffect(() => {
    calculateParity();
  }, []);

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
          <Scale className="w-8 h-8 text-blue-600" />
          Arbitrage & Put-Call Parity Screener
        </h1>
        <p className="text-slate-600 mt-2">
          Identify risk-free arbitrage opportunities using the Put-Call Parity relationship: S + p = c + PV(K)
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-7 gap-6">
        {/* Input Section */}
        <div className="lg:col-span-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="w-5 h-5" />
                Input Parameters
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="ticker">Ticker Symbol</Label>
                  <Input
                    id="ticker"
                    value={ticker}
                    onChange={(e) => setTicker(e.target.value.toUpperCase())}
                    placeholder="AAPL"
                    className="font-mono"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="stockPrice">Current Stock Price (S)</Label>
                  <Input
                    id="stockPrice"
                    type="number"
                    step="0.01"
                    value={stockPrice}
                    onChange={(e) => setStockPrice(parseFloat(e.target.value) || 0)}
                    className="font-mono"
                  />
                </div>
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
                <div className="space-y-2">
                  <Label htmlFor="maturity">Time to Maturity (T)</Label>
                  <Select value={String(timeToMaturity)} onValueChange={(v) => setTimeToMaturity(parseFloat(v))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select maturity" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0.0833">1 Month</SelectItem>
                      <SelectItem value="0.1667">2 Months</SelectItem>
                      <SelectItem value="0.25">3 Months</SelectItem>
                      <SelectItem value="0.5">6 Months</SelectItem>
                      <SelectItem value="0.75">9 Months</SelectItem>
                      <SelectItem value="1">1 Year</SelectItem>
                      <SelectItem value="1.5">1.5 Years</SelectItem>
                      <SelectItem value="2">2 Years</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="callPrice">Call Option Price (c)</Label>
                  <Input
                    id="callPrice"
                    type="number"
                    step="0.01"
                    value={callPrice}
                    onChange={(e) => setCallPrice(parseFloat(e.target.value) || 0)}
                    className="font-mono"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="putPrice">Put Option Price (p)</Label>
                  <Input
                    id="putPrice"
                    type="number"
                    step="0.01"
                    value={putPrice}
                    onChange={(e) => setPutPrice(parseFloat(e.target.value) || 0)}
                    className="font-mono"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="riskFree">Risk-Free Interest Rate (r) %</Label>
                  <Input
                    id="riskFree"
                    type="number"
                    step="0.01"
                    value={riskFreeRate * 100}
                    onChange={(e) => setRiskFreeRate(parseFloat(e.target.value) / 100 || 0)}
                    className="font-mono"
                  />
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
                      Calculating...
                    </>
                  ) : (
                    'Calculate Parity'
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
                      Analysis Results
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Parity Equation */}
                    <div className="bg-slate-50 p-4 rounded-lg">
                      <p className="text-sm text-slate-600">Put-Call Parity Equation</p>
                      <p className="text-lg font-mono font-semibold text-slate-900">S + p = c + PV(K)</p>
                      <p className="text-sm font-mono mt-1">{stockPrice.toFixed(2)} + {putPrice.toFixed(2)} = {callPrice.toFixed(2)} + {results.pvK.toFixed(2)}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant={Math.abs(parseFloat(results.leftSide) - parseFloat(results.rightSide)) < 0.01 ? "success" : "destructive"}>
                          {Math.abs(parseFloat(results.leftSide) - parseFloat(results.rightSide)) < 0.01 ? '✓ Parity Holds' : '✗ Parity Broken'}
                        </Badge>
                      </div>
                    </div>

                    {/* Theoretical Prices */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="border rounded-lg p-3">
                        <p className="text-xs text-slate-500">Theoretical Put</p>
                        <p className="text-xl font-bold text-blue-600">${results.theoreticalPut.toFixed(2)}</p>
                        <p className={`text-xs ${results.differencePut > 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {results.differencePut > 0 ? '↑' : '↓'} ${Math.abs(results.differencePut).toFixed(2)}
                        </p>
                      </div>
                      <div className="border rounded-lg p-3">
                        <p className="text-xs text-slate-500">Theoretical Call</p>
                        <p className="text-xl font-bold text-blue-600">${results.theoreticalCall.toFixed(2)}</p>
                        <p className={`text-xs ${results.differenceCall > 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {results.differenceCall > 0 ? '↑' : '↓'} ${Math.abs(results.differenceCall).toFixed(2)}
                        </p>
                      </div>
                    </div>

                    {/* Arbitrage Opportunity */}
                    {arbitrageOpportunity && arbitrageOpportunity.type !== 'none' && (
                      <div className="pt-2">
                        <Separator />
                        <Alert variant={arbitrageOpportunity.type === 'buy' ? "default" : "warning"} className="mt-3">
                          <AlertCircle className="h-4 w-4" />
                          <AlertTitle className="font-bold text-sm">
                            {arbitrageOpportunity.type === 'buy' ? '📈 BUY OPPORTUNITY' : '📉 SELL OPPORTUNITY'}
                          </AlertTitle>
                          <AlertDescription className="text-sm mt-1">
                            {arbitrageOpportunity.message}
                          </AlertDescription>
                          <div className="flex gap-2 mt-2">
                            <Badge variant="outline" className="bg-green-50">
                              Profit: ${arbitrageOpportunity.profit.toFixed(2)}
                            </Badge>
                            <Badge variant="outline" className="bg-blue-50">
                              {arbitrageOpportunity.action}
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
                          <AlertTitle className="font-bold text-sm text-green-600">Prices Aligned</AlertTitle>
                          <AlertDescription className="text-sm text-green-700">
                            No arbitrage opportunity detected. Prices are in alignment with put-call parity.
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
                Arbitrage Execution Strategy
              </CardTitle>
              <p className="text-sm text-slate-500 mt-1">
                Follow these steps to execute the arbitrage and lock in a risk-free profit of ${results.arbitrageTable.profit} per share
              </p>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <UITable>
                  <TableCaption>
                    Initial cash flow is {parseFloat(results.arbitrageTable.totalCashFlow) > 0 ? 'positive' : 'negative'} 
                    (${results.arbitrageTable.totalCashFlow}), meaning you {parseFloat(results.arbitrageTable.totalCashFlow) > 0 ? 'receive' : 'pay'} money upfront. 
                    At maturity, the payoff is zero regardless of stock price, guaranteeing a risk-free profit of ${results.arbitrageTable.profit} per share.
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
                    {results.arbitrageTable.positions.map((position, index) => (
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
                    {/* Total Row */}
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
                      regardless of where the stock price ends up at maturity.
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-green-600">+${results.arbitrageTable.profit}</p>
                    <p className="text-xs text-green-700">Per Share</p>
                  </div>
                </div>
                <div className="mt-2 flex gap-2 flex-wrap">
                  <Badge variant="outline" className="bg-green-100 border-green-300 text-green-700">
                    Initial Cash {parseFloat(results.arbitrageTable.totalCashFlow) > 0 ? 'Inflow' : 'Outflow'}: ${results.arbitrageTable.totalCashFlow}
                  </Badge>
                  <Badge variant="outline" className="bg-blue-100 border-blue-300 text-blue-700">
                    Zero Risk at Maturity
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Educational Section & History */}
      <div className="grid grid-cols-1 lg:grid-cols-7 gap-6 mt-6">
        <div className="lg:col-span-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="w-5 h-5" />
                Understanding Put-Call Parity
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-slate-50 p-4 rounded-lg">
                <p className="text-sm font-semibold text-slate-900">What is Put-Call Parity?</p>
                <p className="text-sm text-slate-600 mt-1">
                  Put-Call Parity is a fundamental relationship that links the prices of European put and call options 
                  with the same strike price and expiration date. The formula is:
                </p>
                <div className="mt-2 p-3 bg-white rounded border border-slate-200 font-mono text-center">
                  S + p = c + PV(K)
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  Where: S = Stock Price, p = Put Price, c = Call Price, PV(K) = Present Value of Strike Price
                </p>
              </div>

              {arbitrageOpportunity && arbitrageOpportunity.type !== 'none' && (
                <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
                  <p className="text-sm font-semibold text-amber-800">Why This Arbitrage Works</p>
                  <p className="text-sm text-amber-700 mt-1">
                    When the put option is overpriced, you can:
                  </p>
                  <ol className="list-decimal list-inside text-sm text-amber-700 space-y-1 mt-2">
                    <li>Sell the overpriced put option</li>
                    <li>Short the stock (borrow and sell it)</li>
                    <li>Buy a call option as insurance</li>
                    <li>Lend the present value of the strike price at the risk-free rate</li>
                  </ol>
                  <p className="text-sm text-amber-700 mt-2">
                    At maturity, the payoff is zero regardless of stock price, but you keep the initial profit!
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
                Recent Calculations
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
                          <p className="text-xs text-slate-500">S: ${entry.stockPrice.toFixed(2)} K: ${entry.strikePrice.toFixed(2)}</p>
                        </div>
                        <div className="text-right">
                          <Badge variant={entry.hasArbitrage ? "destructive" : "success"} className="text-xs">
                            {entry.hasArbitrage ? '⚠️ Arbitrage' : '✅ Aligned'}
                          </Badge>
                          <p className="text-xs text-slate-400 mt-1">
                            {new Date(entry.timestamp).toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500 text-center py-8">No calculations yet</p>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-8 p-4 bg-slate-50 rounded-lg border border-slate-200">
        <p className="text-xs text-slate-500 text-center">
          💡 The put-call parity formula assumes European options, no dividends, and no transaction costs. 
          Real-world arbitrage opportunities may be limited by transaction costs, bid-ask spreads, 
          and early exercise features (American options).
        </p>
      </div>
    </div>
  );
};

export default ArbitragePutCallParity;