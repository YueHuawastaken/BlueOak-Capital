// src/pages/BondPricing.jsx
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Calculator, 
  DollarSign, 
  Percent, 
  Calendar, 
  TrendingUp, 
  TrendingDown, 
  Info, 
  AlertCircle, 
  CheckCircle,
  BarChart3,
  LineChart,
  Undo,
  Download,
  PieChart
} from 'lucide-react';

const formatCurrency = (value) => {
  if (isNaN(value)) return '$0.00';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

const formatPercent = (value) => {
  if (isNaN(value)) return '0.00%';
  return value.toFixed(2) + '%';
};

export default function BondPricing() {
  // State for inputs
  const [inputs, setInputs] = useState({
    faceValue: '1000',
    couponRate: '5.0',
    yearsToMaturity: '10',
    ytm: '6.0',
    paymentFrequency: 'annual',
    marketPrice: '',
  });

  const [results, setResults] = useState(null);
  const [ytmResults, setYtmResults] = useState(null);
  const [activeTab, setActiveTab] = useState('price');
  const [loading, setLoading] = useState(false);

  // Calculate Bond Price
  const calculateBondPrice = () => {
    setLoading(true);
    setTimeout(() => {
      try {
        const F = parseFloat(inputs.faceValue);
        const c = parseFloat(inputs.couponRate) / 100;
        const y = parseFloat(inputs.ytm) / 100;
        const n = parseFloat(inputs.yearsToMaturity);
        const freq = inputs.paymentFrequency === 'annual' ? 1 : 2;

        if (isNaN(F) || isNaN(c) || isNaN(y) || isNaN(n) || F <= 0 || n <= 0) {
          throw new Error('Please enter valid positive numbers.');
        }

        const coupon = F * c / freq;
        const periods = n * freq;
        const rate = y / freq;

        // Bond Price Formula: P = C × [1 - (1+r)^-n] / r + F / (1+r)^n
        const price = coupon * (1 - Math.pow(1 + rate, -periods)) / rate + F / Math.pow(1 + rate, periods);

        const currentYield = (F * c) / price * 100;
        const isPremium = price > F;
        const isDiscount = price < F;
        const isPar = Math.abs(price - F) < 0.01;

        // Generate cash flow schedule
        const cashFlows = [];
        for (let t = 1; t <= periods; t++) {
          const isFinal = t === periods;
          const cf = isFinal ? coupon + F : coupon;
          const pv = cf / Math.pow(1 + rate, t);
          cashFlows.push({
            period: t,
            year: (t / freq).toFixed(2),
            cashFlow: cf,
            presentValue: pv,
          });
        }

        // Calculate Duration
        let macaulayDuration = 0;
        let priceForDuration = 0;
        for (let t = 1; t <= periods; t++) {
          const isFinal = t === periods;
          const cf = isFinal ? coupon + F : coupon;
          const pv = cf / Math.pow(1 + rate, t);
          priceForDuration += pv;
          macaulayDuration += t * pv;
        }
        macaulayDuration = macaulayDuration / priceForDuration / freq;
        const modifiedDuration = macaulayDuration / (1 + rate);

        // Price change for 1% yield change
        const priceChange1pct = -modifiedDuration * 0.01 * price;

        setResults({
          price: price,
          currentYield: currentYield,
          isPremium: isPremium,
          isDiscount: isDiscount,
          isPar: isPar,
          status: isPar ? 'Par Bond' : isPremium ? 'Premium Bond' : 'Discount Bond',
          couponPayment: coupon,
          totalCoupons: coupon * periods,
          totalCashFlow: coupon * periods + F,
          cashFlows: cashFlows,
          macaulayDuration: macaulayDuration,
          modifiedDuration: modifiedDuration,
          priceChange1pct: priceChange1pct,
        });
      } catch (error) {
        alert(error.message);
      }
      setLoading(false);
    }, 300);
  };

  // Calculate YTM from Price
  const calculateYTM = () => {
    setLoading(true);
    setTimeout(() => {
      try {
        const F = parseFloat(inputs.faceValue);
        const c = parseFloat(inputs.couponRate) / 100;
        const n = parseFloat(inputs.yearsToMaturity);
        const P = parseFloat(inputs.marketPrice);
        const freq = inputs.paymentFrequency === 'annual' ? 1 : 2;

        if (isNaN(F) || isNaN(c) || isNaN(n) || isNaN(P) || F <= 0 || n <= 0 || P <= 0) {
          throw new Error('Please enter valid positive numbers for all fields.');
        }

        const coupon = F * c / freq;
        const periods = n * freq;

        // Newton-Raphson method to find YTM
        let ytm = 0.05; // Initial guess
        let tolerance = 1e-8;
        let maxIterations = 100;

        for (let i = 0; i < maxIterations; i++) {
          let price = 0;
          let derivative = 0;
          for (let t = 1; t <= periods; t++) {
            const cf = t === periods ? coupon + F : coupon;
            const factor = Math.pow(1 + ytm, -t);
            price += cf * factor;
            derivative += -t * cf * Math.pow(1 + ytm, -t - 1);
          }
          const diff = price - P;
          if (Math.abs(diff) < tolerance) {
            break;
          }
          ytm = ytm - diff / derivative;
        }

        const annualYTM = ytm * freq * 100;

        setYtmResults({
          ytm: annualYTM,
          isValid: annualYTM > 0,
        });
      } catch (error) {
        alert(error.message);
      }
      setLoading(false);
    }, 300);
  };

  const handleInputChange = (e) => {
    const { id, value } = e.target;
    setInputs(prev => ({ ...prev, [id]: value }));
  };

  const handleSelectChange = (id, value) => {
    setInputs(prev => ({ ...prev, [id]: value }));
  };

  const handleReset = () => {
    setInputs({
      faceValue: '1000',
      couponRate: '5.0',
      yearsToMaturity: '10',
      ytm: '6.0',
      paymentFrequency: 'annual',
      marketPrice: '',
    });
    setResults(null);
    setYtmResults(null);
    setActiveTab('price');
  };

  const exportResults = () => {
    if (!results) return;
    const exportData = {
      bond_price_analysis: {
        face_value: inputs.faceValue,
        coupon_rate: inputs.couponRate,
        years_to_maturity: inputs.yearsToMaturity,
        ytm: inputs.ytm,
        payment_frequency: inputs.paymentFrequency,
        price: results.price,
        current_yield: results.currentYield,
        status: results.status,
        macaulay_duration: results.macaulayDuration,
        modified_duration: results.modifiedDuration,
        price_change_1pct: results.priceChange1pct,
      }
    };
    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Bond_Analysis_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
  };

  // Auto-calculate on mount
  useEffect(() => {
    calculateBondPrice();
  }, []);

  return (
    <TooltipProvider>
      <div className="p-4 lg:p-8 bg-slate-50 min-h-screen">
        <div className="max-w-6xl mx-auto space-y-8">
          {/* Header */}
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl flex items-center justify-center">
                <DollarSign className="w-8 h-8 text-white" />
              </div>
            </div>
            <h1 className="text-3xl font-bold text-slate-900">Bond Pricing & YTM Calculator</h1>
            <p className="text-slate-600 mt-2">
              Calculate bond prices, yields, duration, and interest rate risk
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Input Section */}
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="flex items-center gap-2">
                    <Calculator className="w-5 h-5 text-blue-600" />
                    Bond Inputs
                  </CardTitle>
                  <Button variant="ghost" size="sm" onClick={handleReset}>
                    <Undo className="w-4 h-4 mr-2" />
                    Reset
                  </Button>
                </div>
                <p className="text-sm text-slate-500">
                  Enter bond parameters to calculate price, YTM, and duration
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Face Value */}
                <div className="space-y-2">
                  <Label htmlFor="faceValue" className="flex items-center gap-1">
                    Face Value (Par Value)
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="w-4 h-4 text-slate-400 cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="max-w-xs text-xs">The amount the bond will pay at maturity. Usually $1,000.</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </Label>
                  <Input
                    id="faceValue"
                    type="number"
                    step="0.01"
                    placeholder="1000"
                    value={inputs.faceValue}
                    onChange={handleInputChange}
                    className="font-mono"
                  />
                </div>

                {/* Coupon Rate */}
                <div className="space-y-2">
                  <Label htmlFor="couponRate" className="flex items-center gap-1">
                    Coupon Rate (%)
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="w-4 h-4 text-slate-400 cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="max-w-xs text-xs">Annual interest rate paid by the bond.</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </Label>
                  <Input
                    id="couponRate"
                    type="number"
                    step="0.1"
                    placeholder="5.0"
                    value={inputs.couponRate}
                    onChange={handleInputChange}
                    className="font-mono"
                  />
                </div>

                {/* Years to Maturity */}
                <div className="space-y-2">
                  <Label htmlFor="yearsToMaturity" className="flex items-center gap-1">
                    Years to Maturity
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="w-4 h-4 text-slate-400 cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="max-w-xs text-xs">Number of years until the bond matures.</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </Label>
                  <Input
                    id="yearsToMaturity"
                    type="number"
                    step="0.5"
                    placeholder="10"
                    value={inputs.yearsToMaturity}
                    onChange={handleInputChange}
                    className="font-mono"
                  />
                </div>

                {/* Payment Frequency */}
                <div className="space-y-2">
                  <Label htmlFor="paymentFrequency">Payment Frequency</Label>
                  <Select
                    value={inputs.paymentFrequency}
                    onValueChange={(value) => handleSelectChange('paymentFrequency', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="annual">Annual</SelectItem>
                      <SelectItem value="semi-annual">Semi-Annual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Tabs for Price or YTM calculation */}
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="price">
                      <Calculator className="w-4 h-4 mr-2" />
                      Price from YTM
                    </TabsTrigger>
                    <TabsTrigger value="ytm">
                      <Percent className="w-4 h-4 mr-2" />
                      YTM from Price
                    </TabsTrigger>
                  </TabsList>

                  {/* Price from YTM Tab */}
                  <TabsContent value="price" className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <Label htmlFor="ytm" className="flex items-center gap-1">
                        Yield to Maturity (YTM %)
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="w-4 h-4 text-slate-400 cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="max-w-xs text-xs">Total return expected if held to maturity.</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </Label>
                      <Input
                        id="ytm"
                        type="number"
                        step="0.1"
                        placeholder="6.0"
                        value={inputs.ytm}
                        onChange={handleInputChange}
                        className="font-mono"
                      />
                    </div>
                    <Button
                      onClick={calculateBondPrice}
                      disabled={loading}
                      className="w-full bg-blue-600 hover:bg-blue-700"
                    >
                      {loading ? 'Calculating...' : 'Calculate Bond Price'}
                    </Button>
                  </TabsContent>

                  {/* YTM from Price Tab */}
                  <TabsContent value="ytm" className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <Label htmlFor="marketPrice" className="flex items-center gap-1">
                        Market Price ($)
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="w-4 h-4 text-slate-400 cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="max-w-xs text-xs">Current market price of the bond.</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </Label>
                      <Input
                        id="marketPrice"
                        type="number"
                        step="0.01"
                        placeholder="950.00"
                        value={inputs.marketPrice}
                        onChange={handleInputChange}
                        className="font-mono"
                      />
                    </div>
                    <Button
                      onClick={calculateYTM}
                      disabled={loading}
                      className="w-full bg-blue-600 hover:bg-blue-700"
                    >
                      {loading ? 'Calculating...' : 'Calculate YTM'}
                    </Button>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            {/* Results Section */}
            <div className="space-y-6">
              {results && (
                <>
                  {/* Price Result */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <DollarSign className="w-5 h-5" />
                        Bond Price & Status
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-center">
                        <p className="text-sm text-slate-600">Bond Price</p>
                        <p className="text-4xl font-bold text-blue-600">{formatCurrency(results.price)}</p>
                        <div className="mt-2">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                            results.isPar ? 'bg-gray-100 text-gray-800' :
                            results.isPremium ? 'bg-green-100 text-green-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {results.isPar ? '⚖️ Par Bond' : results.isPremium ? '📈 Premium Bond' : '📉 Discount Bond'}
                          </span>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4 mt-4 border-t pt-4">
                        <div>
                          <p className="text-xs text-slate-500">Current Yield</p>
                          <p className="text-lg font-semibold text-green-600">{formatPercent(results.currentYield)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">Annual Coupon</p>
                          <p className="text-lg font-semibold">{formatCurrency(results.couponPayment * (inputs.paymentFrequency === 'annual' ? 1 : 2))}</p>
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter className="flex justify-between border-t pt-4">
                      <Button variant="outline" size="sm" onClick={exportResults}>
                        <Download className="w-4 h-4 mr-2" />
                        Export
                      </Button>
                      <div className="text-xs text-slate-500">
                        {results.isPremium ? 'Coupon Rate > YTM' : results.isDiscount ? 'Coupon Rate < YTM' : 'Coupon Rate = YTM'}
                      </div>
                    </CardFooter>
                  </Card>

                  {/* Duration & Risk */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <BarChart3 className="w-5 h-5" />
                        Duration & Interest Rate Risk
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-blue-50 p-3 rounded-lg">
                          <p className="text-xs text-blue-600">Macaulay Duration</p>
                          <p className="text-xl font-bold text-blue-700">{results.macaulayDuration.toFixed(2)} years</p>
                          <p className="text-xs text-blue-500">Weighted avg time to cash flows</p>
                        </div>
                        <div className="bg-purple-50 p-3 rounded-lg">
                          <p className="text-xs text-purple-600">Modified Duration</p>
                          <p className="text-xl font-bold text-purple-700">{results.modifiedDuration.toFixed(2)}</p>
                          <p className="text-xs text-purple-500">Price sensitivity to yield</p>
                        </div>
                      </div>
                      <div className="mt-4 p-3 bg-amber-50 rounded-lg border border-amber-200">
                        <p className="text-sm text-amber-700">
                          {results.priceChange1pct < 0 ? '📉' : '📈'} If YTM increases by 1%, price changes by{' '}
                          <span className="font-bold">{formatCurrency(results.priceChange1pct)}</span>
                          <span className="text-xs text-amber-600 block mt-1">
                            Modified Duration × 1% × Price
                          </span>
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Cash Flow Schedule */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <PieChart className="w-5 h-5" />
                        Cash Flow Schedule
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="max-h-48 overflow-y-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-slate-50 sticky top-0">
                            <tr>
                              <th className="text-left p-2">Period</th>
                              <th className="text-right p-2">Year</th>
                              <th className="text-right p-2">Cash Flow</th>
                              <th className="text-right p-2">Present Value</th>
                            </tr>
                          </thead>
                          <tbody>
                            {results.cashFlows.slice(0, 10).map((cf, idx) => (
                              <tr key={idx} className="border-b">
                                <td className="p-2">{cf.period}</td>
                                <td className="text-right p-2">{cf.year}</td>
                                <td className="text-right p-2">{formatCurrency(cf.cashFlow)}</td>
                                <td className="text-right p-2">{formatCurrency(cf.presentValue)}</td>
                              </tr>
                            ))}
                            {results.cashFlows.length > 10 && (
                              <tr>
                                <td colSpan={4} className="text-center text-xs text-slate-400 p-2">
                                  ... and {results.cashFlows.length - 10} more periods
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                      <div className="grid grid-cols-2 gap-4 mt-4 border-t pt-4 text-sm">
                        <div>
                          <p className="text-slate-500">Total Coupons</p>
                          <p className="font-semibold">{formatCurrency(results.totalCoupons)}</p>
                        </div>
                        <div>
                          <p className="text-slate-500">Total Cash Flow</p>
                          <p className="font-semibold">{formatCurrency(results.totalCashFlow)}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}

              {ytmResults && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Percent className="w-5 h-5" />
                      YTM Result
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center">
                      <p className="text-sm text-slate-600">Yield to Maturity</p>
                      <p className={`text-4xl font-bold ${ytmResults.isValid ? 'text-green-600' : 'text-red-600'}`}>
                        {ytmResults.isValid ? formatPercent(ytmResults.ytm) : 'N/A'}
                      </p>
                      {ytmResults.isValid && (
                        <p className="text-sm text-slate-500 mt-2">
                          The bond yields {formatPercent(ytmResults.ytm)} if held to maturity
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {!results && !ytmResults && (
                <Card className="flex items-center justify-center h-96">
                  <div className="text-center text-slate-500">
                    <DollarSign className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                    <p>Enter bond parameters and click Calculate</p>
                    <p className="text-sm">Results will appear here</p>
                  </div>
                </Card>
              )}
            </div>
          </div>

          {/* Educational Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="w-5 h-5" />
                Understanding Bond Pricing & YTM
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="font-semibold text-blue-800">Bond Price</p>
                  <p className="text-sm text-blue-700 mt-1">
                    Price = Coupon × [1 - (1+YTM)^-n] / YTM + Face Value / (1+YTM)^n
                  </p>
                  <p className="text-xs text-blue-600 mt-2">
                    As YTM ↑, Price ↓ (and vice versa)
                  </p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <p className="font-semibold text-green-800">Bond Status</p>
                  <p className="text-sm text-green-700 mt-1">
                    • Premium: Coupon Rate &gt; YTM → Price &gt; Face Value
                    <br />
                    • Par: Coupon Rate = YTM → Price = Face Value
                    <br />
                    • Discount: Coupon Rate &lt; YTM → Price &lt; Face Value
                  </p>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <p className="font-semibold text-purple-800">Duration & Risk</p>
                  <p className="text-sm text-purple-700 mt-1">
                    • Macaulay Duration: Weighted avg time to receive cash flows
                    <br />
                    • Modified Duration: Price sensitivity to interest rates
                    <br />
                    • Higher Duration = Higher Interest Rate Risk
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </TooltipProvider>
  );
}