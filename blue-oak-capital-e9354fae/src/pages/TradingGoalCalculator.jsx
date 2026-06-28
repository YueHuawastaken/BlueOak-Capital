// src/pages/TradingGoalCalculator.jsx
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Target, Calculator, TrendingUp, Undo, Info, CheckCircle, AlertCircle, BarChart3 } from "lucide-react";

const formatCurrency = (value) => {
  if (isNaN(value)) return '$0.00';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

// Return presets for quick selection
const RETURN_PRESETS = {
  conservative: {
    label: 'Conservative',
    monthly: 0.5,
    annual: 6,
    description: 'Low-risk investments (Bonds, CDs)',
    icon: '🛡️'
  },
  moderate: {
    label: 'Moderate',
    monthly: 1.0,
    annual: 12,
    description: 'Balanced portfolio (60/40 stocks/bonds)',
    icon: '⚖️'
  },
  aggressive: {
    label: 'Aggressive',
    monthly: 1.5,
    annual: 18,
    description: 'Growth stocks, ETFs, aggressive strategy',
    icon: '🚀'
  },
  custom: {
    label: 'Custom',
    monthly: null,
    annual: null,
    description: 'Set your own return rate',
    icon: '✏️'
  }
};

export default function TradingGoalCalculator() {
  const [inputs, setInputs] = useState({
    financialGoal: '',
    initialCapital: '',
    returnRate: '',
    timeframeYears: '',
    currentMonthlyContribution: '',
  });

  const [returnType, setReturnType] = useState('annual');
  const [selectedPreset, setSelectedPreset] = useState('custom');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [projectionData, setProjectionData] = useState(null);

  // Apply preset
  const applyPreset = (presetKey) => {
    setSelectedPreset(presetKey);
    const preset = RETURN_PRESETS[presetKey];
    if (presetKey !== 'custom') {
      const value = returnType === 'monthly' ? preset.monthly : preset.annual;
      setInputs(prev => ({ ...prev, returnRate: value.toString() }));
    }
  };

  const handleInputChange = (e) => {
    const { id, value } = e.target;
    setInputs(prev => ({ ...prev, [id]: value }));
  };

  // Generate projection data for chart
  const generateProjection = (totalMonthlyContribution, monthlyRate, totalMonths, initialCapital) => {
    const data = [];
    let currentValue = initialCapital;
    
    // Add Year 0 data point
    data.push({
      year: 0,
      value: currentValue,
      contributions: currentValue,
      growth: 0
    });
    
    for (let i = 1; i <= totalMonths; i++) {
      currentValue = currentValue * (1 + monthlyRate) + totalMonthlyContribution;
      
      if (i % 12 === 0 || i === totalMonths) {
        const totalContributions = initialCapital + (totalMonthlyContribution * i);
        data.push({
          year: i / 12,
          value: currentValue,
          contributions: totalContributions,
          growth: currentValue - totalContributions
        });
      }
    }
    return data;
  };

  const handleCalculate = () => {
    setError('');
    setResult(null);
    setProjectionData(null);

    const { 
      financialGoal, 
      initialCapital, 
      returnRate, 
      timeframeYears,
      currentMonthlyContribution 
    } = inputs;

    const FV = parseFloat(financialGoal);
    const PV = parseFloat(initialCapital);
    const r_percent = parseFloat(returnRate);
    const t_years = parseFloat(timeframeYears);
    const existingContribution = parseFloat(currentMonthlyContribution) || 0;

    if (isNaN(FV) || FV <= 0 || isNaN(PV) || PV < 0 || isNaN(r_percent) || r_percent <= 0 || isNaN(t_years) || t_years <= 0) {
      setError("Please enter valid, positive numbers in all fields.");
      return;
    }

    // Convert to monthly rate based on return type
    let monthlyRate;
    if (returnType === 'annual') {
      monthlyRate = Math.pow(1 + r_percent / 100, 1/12) - 1;
    } else {
      monthlyRate = r_percent / 100;
    }

    const totalMonths = t_years * 12;

    // If there's an existing contribution, first calculate what that will grow to
    let existingFutureValue = PV;
    for (let i = 0; i < totalMonths; i++) {
      existingFutureValue = existingFutureValue * (1 + monthlyRate) + existingContribution;
    }

    // Calculate what's left to reach the goal
    const remainingGoal = Math.max(0, FV - existingFutureValue);
    
    // Calculate required additional monthly contribution
    const compoundFactor = Math.pow(1 + monthlyRate, totalMonths);
    let monthlyContribution = 0;
    let totalMonthlyContribution = existingContribution;

    if (remainingGoal > 0 && compoundFactor > 1) {
      const numerator = remainingGoal;
      const denominator = (compoundFactor - 1) / monthlyRate;
      monthlyContribution = numerator / denominator;
      totalMonthlyContribution = existingContribution + monthlyContribution;
    }

    // Calculate total contributions and growth
    const totalExistingContributions = existingContribution * totalMonths;
    const totalAdditionalContributions = monthlyContribution * totalMonths;
    const totalContributions = PV + totalExistingContributions + totalAdditionalContributions;
    
    // Calculate final value
    let finalValue = PV;
    for (let i = 0; i < totalMonths; i++) {
      finalValue = finalValue * (1 + monthlyRate) + totalMonthlyContribution;
    }
    
    const totalGrowth = finalValue - totalContributions;
    
    // Check if current contributions are enough
    const isCurrentEnough = existingFutureValue >= FV;

    // Find years to goal with current contributions
    let yearsToGoal = t_years;
    if (existingContribution > 0 && PV < FV) {
      let tempValue = PV;
      let months = 0;
      const maxMonths = 600; // 50 year limit
      while (tempValue < FV && months < maxMonths) {
        tempValue = tempValue * (1 + monthlyRate) + existingContribution;
        months++;
      }
      yearsToGoal = months / 12;
    }

    // Generate projection data
    const projection = generateProjection(
      totalMonthlyContribution, 
      monthlyRate, 
      totalMonths, 
      PV
    );
    setProjectionData(projection);

    // Set results
    if (isCurrentEnough) {
      setResult({
        monthlyContribution: 0,
        totalMonthlyContribution: existingContribution,
        totalContributions: PV + totalExistingContributions,
        totalGrowth: existingFutureValue - (PV + totalExistingContributions),
        existingContributions: existingContribution,
        yearsToGoal: yearsToGoal,
        isAchievable: true,
        message: "Your current contributions are sufficient!",
        finalValue: existingFutureValue,
        isCurrentEnough: true
      });
    } else if (monthlyContribution > 0) {
      setResult({
        monthlyContribution: monthlyContribution,
        totalMonthlyContribution: totalMonthlyContribution,
        totalContributions: totalContributions,
        totalGrowth: totalGrowth,
        existingContributions: existingContribution,
        yearsToGoal: t_years,
        isAchievable: true,
        message: `You need to contribute ${formatCurrency(monthlyContribution)} per month`,
        finalValue: finalValue,
        isCurrentEnough: false
      });
    } else {
      setError("Unable to calculate. Please adjust your inputs.");
    }
  };

  const handleReset = () => {
    setInputs({
      financialGoal: '',
      initialCapital: '',
      returnRate: '',
      timeframeYears: '',
      currentMonthlyContribution: '',
    });
    setResult(null);
    setError('');
    setProjectionData(null);
    setSelectedPreset('custom');
  };

  return (
    <div className="p-4 lg:p-8 bg-slate-50 min-h-screen">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl flex items-center justify-center">
              <Target className="w-8 h-8 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-slate-900">Goal Calculator</h1>
          <p className="text-slate-600 mt-2">Plan your path to financial freedom with realistic projections</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Input Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="w-5 h-5 text-blue-600" />
                Calculation Inputs
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Goal and Capital */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="financialGoal">Financial Goal ($)</Label>
                  <Input 
                    id="financialGoal" 
                    type="number" 
                    placeholder="e.g., 1000000" 
                    value={inputs.financialGoal} 
                    onChange={handleInputChange} 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="initialCapital">Starting Capital ($)</Label>
                  <Input 
                    id="initialCapital" 
                    type="number" 
                    placeholder="e.g., 50000" 
                    value={inputs.initialCapital} 
                    onChange={handleInputChange} 
                  />
                </div>
              </div>

              {/* Return Rate with Presets */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Expected Return</Label>
                  <div className="flex items-center gap-2">
                    <Button 
                      variant={returnType === 'monthly' ? 'default' : 'outline'} 
                      size="sm"
                      onClick={() => {
                        setReturnType('monthly');
                        if (selectedPreset !== 'custom') {
                          const preset = RETURN_PRESETS[selectedPreset];
                          setInputs(prev => ({ ...prev, returnRate: preset.monthly.toString() }));
                        }
                      }}
                      className="h-8 text-xs"
                    >
                      Monthly
                    </Button>
                    <Button 
                      variant={returnType === 'annual' ? 'default' : 'outline'} 
                      size="sm"
                      onClick={() => {
                        setReturnType('annual');
                        if (selectedPreset !== 'custom') {
                          const preset = RETURN_PRESETS[selectedPreset];
                          setInputs(prev => ({ ...prev, returnRate: preset.annual.toString() }));
                        }
                      }}
                      className="h-8 text-xs"
                    >
                      Annual
                    </Button>
                  </div>
                </div>

                {/* Return Presets */}
                <div className="grid grid-cols-4 gap-2">
                  {Object.entries(RETURN_PRESETS).map(([key, preset]) => (
                    <Button
                      key={key}
                      variant={selectedPreset === key ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => applyPreset(key)}
                      className="h-12 flex flex-col items-center justify-center text-xs"
                    >
                      <span>{preset.icon}</span>
                      <span>{preset.label}</span>
                    </Button>
                  ))}
                </div>

                <div className="space-y-2">
                  <Label>{returnType === 'monthly' ? 'Monthly Return (%)' : 'Annual Return (%)'}</Label>
                  <Input 
                    id="returnRate" 
                    type="number" 
                    step="0.1"
                    placeholder={returnType === 'monthly' ? 'e.g., 1.0' : 'e.g., 12'} 
                    value={inputs.returnRate} 
                    onChange={handleInputChange} 
                  />
                </div>
              </div>

              {/* Timeframe */}
              <div className="space-y-2">
                <Label htmlFor="timeframeYears">Time Horizon (Years)</Label>
                <Input 
                  id="timeframeYears" 
                  type="number" 
                  step="0.5"
                  placeholder="e.g., 10" 
                  value={inputs.timeframeYears} 
                  onChange={handleInputChange} 
                />
              </div>

              {/* Existing Monthly Contribution */}
              <div className="space-y-2">
                <Label htmlFor="currentMonthlyContribution">Current Monthly Contribution ($) <span className="text-xs text-slate-400">(optional)</span></Label>
                <Input 
                  id="currentMonthlyContribution" 
                  type="number" 
                  placeholder="e.g., 500" 
                  value={inputs.currentMonthlyContribution} 
                  onChange={handleInputChange} 
                />
                <p className="text-xs text-slate-400">
                  Enter what you're already contributing to see if you're on track
                </p>
              </div>

              {/* Buttons */}
              <div className="flex gap-4">
                <Button onClick={handleCalculate} className="w-full bg-blue-600 hover:bg-blue-700">
                  <Calculator className="w-4 h-4 mr-2" />
                  Calculate
                </Button>
                <Button onClick={handleReset} variant="outline" className="w-full">
                  <Undo className="w-4 h-4 mr-2" />
                  Reset
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Results Section */}
          <div className="space-y-8">
            {error && (
              <Alert variant={error.includes('🎉') ? 'default' : 'destructive'}>
                {error.includes('🎉') ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                <AlertTitle>{error.includes('🎉') ? 'Great News!' : 'Calculation Error'}</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {result && (
              <>
                {/* Main Result Card */}
                <Card className={result.isCurrentEnough ? 'bg-green-50 border-green-200' : 'bg-blue-50 border-blue-200'}>
                  <CardHeader>
                    <CardTitle className={`flex items-center gap-2 ${result.isCurrentEnough ? 'text-green-800' : 'text-blue-800'}`}>
                      {result.isCurrentEnough ? <CheckCircle className="w-5 h-5" /> : <Target className="w-5 h-5" />}
                      {result.isCurrentEnough ? '✓ On Track!' : 'Your Contribution Plan'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {result.isCurrentEnough ? (
                      <div>
                        <p className="text-slate-600">✅ Your current contributions are sufficient!</p>
                        <p className="text-sm text-slate-600 mt-2">
                          Your current contribution of {formatCurrency(result.existingContributions)}/month
                          will reach your goal in approximately {result.yearsToGoal.toFixed(1)} years
                        </p>
                        <div className="mt-4 p-3 bg-white rounded-lg">
                          <p className="text-sm text-slate-600">Projected final value:</p>
                          <p className="text-2xl font-bold text-green-700">{formatCurrency(result.finalValue)}</p>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <p className="text-slate-600">You need to contribute approximately</p>
                        <p className="text-4xl font-bold text-blue-700 my-2">{formatCurrency(result.monthlyContribution)}</p>
                        <p className="text-slate-600">per month to reach your goal.</p>
                        {result.existingContributions > 0 && (
                          <p className="text-sm text-slate-500 mt-2">
                            Including your current contribution of {formatCurrency(result.existingContributions)}
                          </p>
                        )}
                        <div className="mt-4 p-3 bg-white rounded-lg">
                          <p className="text-sm text-slate-600">Total monthly contribution:</p>
                          <p className="text-xl font-bold text-blue-700">{formatCurrency(result.totalMonthlyContribution)}</p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Detailed Summary */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="w-5 h-5" />
                      Detailed Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <div className="flex justify-between border-b pb-2">
                      <span className="font-semibold">Goal:</span>
                      <span className="font-bold">{formatCurrency(inputs.financialGoal)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Starting Capital:</span>
                      <span className="font-medium">{formatCurrency(inputs.initialCapital)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Time Horizon:</span>
                      <span className="font-medium">{inputs.timeframeYears} years</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Expected Return:</span>
                      <span className="font-medium">{inputs.returnRate}% {returnType === 'monthly' ? 'monthly' : 'annually'}</span>
                    </div>
                    
                    {result.existingContributions > 0 && (
                      <div className="flex justify-between text-blue-600">
                        <span>Current Monthly Contribution:</span>
                        <span className="font-medium">{formatCurrency(result.existingContributions)}</span>
                      </div>
                    )}
                    
                    {!result.isCurrentEnough && result.monthlyContribution > 0 && (
                      <div className="flex justify-between text-blue-600">
                        <span>Additional Contribution Needed:</span>
                        <span className="font-medium">{formatCurrency(result.monthlyContribution)}/month</span>
                      </div>
                    )}
                    
                    <div className="flex justify-between font-semibold border-t pt-2">
                      <span>Total Monthly Contribution:</span>
                      <span className="text-blue-700">{formatCurrency(result.totalMonthlyContribution)}</span>
                    </div>

                    <div className="flex justify-between font-semibold text-base border-t pt-3 mt-2">
                      <span>Total Compounded Value:</span>
                      <span className="text-green-700">{formatCurrency(result.finalValue || inputs.financialGoal)}</span>
                    </div>
                    
                    <div className="flex justify-between text-slate-600">
                      <span>Total Amount from Contributions:</span>
                      <span className="font-medium">{formatCurrency(result.totalContributions)}</span>
                    </div>
                    
                    <div className="flex justify-between text-green-700">
                      <span>Total Amount from Growth:</span>
                      <span className={`font-medium ${result.totalGrowth < 0 ? 'text-red-500' : 'text-green-700'}`}>
                        {formatCurrency(result.totalGrowth)}
                      </span>
                    </div>

                    {result.totalGrowth < 0 && (
                      <div className="bg-amber-50 p-2 rounded-lg text-xs text-amber-700">
                        ⚠️ Negative growth means your returns are not keeping up with inflation. Consider increasing your expected return or contributions.
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Projection Milestones */}
                {projectionData && projectionData.length > 1 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-sm">
                        <BarChart3 className="w-4 h-4" />
                        Projection Milestones
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-slate-50">
                            <tr>
                              <th className="text-left p-2 font-medium">Year</th>
                              <th className="text-right p-2 font-medium">Projected Value</th>
                              <th className="text-right p-2 font-medium">Contributions</th>
                              <th className="text-right p-2 font-medium">Growth</th>
                            </tr>
                          </thead>
                          <tbody>
                            {projectionData.map((data, idx) => (
                              <tr key={idx} className="border-t">
                                <td className="p-2 font-medium">Year {data.year}</td>
                                <td className="p-2 text-right">{formatCurrency(data.value)}</td>
                                <td className="p-2 text-right">{formatCurrency(data.contributions)}</td>
                                <td className={`p-2 text-right ${data.growth >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                                  {formatCurrency(data.growth)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </div>
        </div>

        {/* Explanation Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="w-5 h-5" />
              Understanding The Calculation
            </CardTitle>
          </CardHeader>
          <CardContent className="text-slate-600 space-y-3">
            <p>This calculator uses the future value of an annuity formula to determine the monthly contribution needed to reach your financial goal.</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              <div className="bg-blue-50 p-3 rounded-lg">
                <p className="font-semibold text-blue-800">Monthly vs Annual</p>
                <p className="text-sm">Toggle between monthly and annual returns based on your investment horizon.</p>
              </div>
              <div className="bg-green-50 p-3 rounded-lg">
                <p className="font-semibold text-green-800">Return Presets</p>
                <p className="text-sm">Quickly estimate with Conservative, Moderate, or Aggressive return scenarios.</p>
              </div>
              <div className="bg-purple-50 p-3 rounded-lg">
                <p className="font-semibold text-purple-800">Current Contributions</p>
                <p className="text-sm">See if you're already on track or need to increase your monthly savings.</p>
              </div>
            </div>
            <p className="text-xs text-slate-400 mt-4">
              <strong>Assumption:</strong> This calculation assumes consistent contributions and compound growth. Actual returns may vary.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}