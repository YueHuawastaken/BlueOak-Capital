import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Target, Calculator, TrendingUp, Undo, Info, CheckCircle, AlertCircle } from "lucide-react";

const formatCurrency = (value) => {
    if (isNaN(value)) return '$0.00';
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
    }).format(value);
};

export default function TradingGoalCalculator() {
    const [inputs, setInputs] = useState({
        financialGoal: '',
        initialCapital: '',
        monthlyReturn: '',
        timeframeYears: ''
    });

    const [result, setResult] = useState(null);
    const [error, setError] = useState('');

    const handleInputChange = (e) => {
        const { id, value } = e.target;
        setInputs(prev => ({ ...prev, [id]: value }));
    };

    const handleCalculate = () => {
        setError('');
        setResult(null);

        const { financialGoal, initialCapital, monthlyReturn, timeframeYears } = inputs;
        const FV = parseFloat(financialGoal);
        const PV = parseFloat(initialCapital);
        const r_percent = parseFloat(monthlyReturn);
        const t_years = parseFloat(timeframeYears);

        if (isNaN(FV) || FV <= 0 || isNaN(PV) || PV < 0 || isNaN(r_percent) || r_percent <= 0 || isNaN(t_years) || t_years <= 0) {
            setError("Please enter valid, positive numbers in all fields.");
            return;
        }

        const r = r_percent / 100; // monthly rate as decimal
        const n = t_years * 12; // number of periods (months)

        const compoundFactor = Math.pow(1 + r, n);
        const numerator = FV - PV * compoundFactor;
        const denominator = (compoundFactor - 1) / r;

        if (denominator === 0) {
            setError("Cannot calculate with the given inputs. Please adjust the return rate or timeframe.");
            return;
        }

        const monthlyContribution = numerator / denominator;

        if (monthlyContribution <= 0) {
            setError("Your financial goal is achievable with your initial capital and growth rate alone. No monthly contribution is needed!");
            setResult(null);
            return;
        }
        
        const totalContributions = monthlyContribution * n;
        const totalGrowth = FV - (PV + totalContributions);

        setResult({
            monthlyContribution,
            totalContributions,
            totalGrowth,
            inputs: { FV, PV, r_percent, t_years, n }
        });
    };

    const handleReset = () => {
        setInputs({
            financialGoal: '',
            initialCapital: '',
            monthlyReturn: '',
            timeframeYears: ''
        });
        setResult(null);
        setError('');
    };

    return (
        <div className="p-4 lg:p-8 bg-slate-50 min-h-screen">
            <div className="max-w-4xl mx-auto space-y-8">
                {/* Header */}
                <div className="text-center">
                    <div className="flex justify-center mb-4">
                        <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl flex items-center justify-center">
                            <Target className="w-8 h-8 text-white" />
                        </div>
                    </div>
                    <h1 className="text-3xl font-bold text-slate-900">Trading Goal Calculator</h1>
                    <p className="text-slate-600 mt-2">Determine the monthly contribution needed to reach your financial goal.</p>
                </div>

                {/* Calculator Section */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Calculator className="w-5 h-5 text-blue-600" />
                                Calculation Inputs
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-2">
                                <Label htmlFor="financialGoal">What is your financial goal?</Label>
                                <Input id="financialGoal" type="number" placeholder="e.g., 200000" value={inputs.financialGoal} onChange={handleInputChange} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="initialCapital">How much capital do you start with?</Label>
                                <Input id="initialCapital" type="number" placeholder="e.g., 7200" value={inputs.initialCapital} onChange={handleInputChange} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="monthlyReturn">What is your estimated average monthly return (%)?</Label>
                                <Input id="monthlyReturn" type="number" placeholder="e.g., 5" value={inputs.monthlyReturn} onChange={handleInputChange} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="timeframeYears">How many years to reach your goal?</Label>
                                <Input id="timeframeYears" type="number" placeholder="e.g., 2" value={inputs.timeframeYears} onChange={handleInputChange} />
                            </div>
                            <div className="flex gap-4">
                                <Button onClick={handleCalculate} className="w-full bg-blue-600 hover:bg-blue-700">Calculate</Button>
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
                            <Alert variant="destructive">
                                <AlertCircle className="h-4 w-4" />
                                <AlertTitle>Calculation Error</AlertTitle>
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        )}
                        {result && (
                            <Card className="bg-green-50 border-green-200">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2 text-green-800">
                                        <CheckCircle className="w-5 h-5" />
                                        Your Contribution Plan
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="text-center">
                                    <p className="text-slate-600">You need to contribute approximately</p>
                                    <p className="text-4xl font-bold text-green-700 my-2">{formatCurrency(result.monthlyContribution)}</p>
                                    <p className="text-slate-600">per month to reach your goal.</p>
                                </CardContent>
                            </Card>
                        )}
                        {result && (
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <TrendingUp className="w-5 h-5" />
                                        Detailed Summary
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3 text-sm">
                                    <p>To reach your goal of <span className="font-semibold">{formatCurrency(result.inputs.FV)}</span> in <span className="font-semibold">{result.inputs.t_years}</span> years:</p>
                                    <div className="flex justify-between border-t pt-3">
                                        <span>Starting Capital:</span>
                                        <span className="font-medium">{formatCurrency(result.inputs.PV)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Estimated Monthly Return:</span>
                                        <span className="font-medium">{result.inputs.r_percent}%</span>
                                    </div>
                                    <div className="flex justify-between font-semibold text-base border-t pt-3 mt-2">
                                        <span>Total Compounded Value:</span>
                                        <span>{formatCurrency(result.inputs.FV)}</span>
                                    </div>
                                    <div className="flex justify-between text-slate-600">
                                        <span>Total Amount from Contributions:</span>
                                        <span className="font-medium">{formatCurrency(result.totalContributions)}</span>
                                    </div>
                                    <div className="flex justify-between text-green-700">
                                        <span>Total Amount from Growth:</span>
                                        <span className="font-medium">{formatCurrency(result.totalGrowth)}</span>
                                    </div>
                                </CardContent>
                            </Card>
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
                        <p>This calculator is based on the future value of an annuity formula, which shows how your money can grow over time with consistent contributions and compound interest.</p>
                        <p><strong>The Power of Compounding:</strong> The "Total Amount from Growth" in your summary shows the profit generated not just from your capital, but from the reinvested profits themselves. Over time, this effect can accelerate your wealth creation significantly.</p>
                        <p className="font-semibold">Assumption: This calculation assumes that all profits are reinvested each month and that the average monthly return rate remains consistent.</p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}