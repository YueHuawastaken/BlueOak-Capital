
// // src/pages/ForwardAnnuityCalculator.jsx
// import React, { useState, useEffect } from 'react';
// import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
// import { Input } from '@/components/ui/input';
// import { Label } from '@/components/ui/label';
// import { Button } from '@/components/ui/button';
// import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
// import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
// import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
// import {
//   Table,
//   TableBody,
//   TableCaption,
//   TableCell,
//   TableHead,
//   TableHeader,
//   TableRow,
// } from '@/components/ui/table';
// import { ScrollArea } from '@/components/ui/scroll-area';
// import {
//   Calculator,
//   DollarSign,
//   Percent,
//   Calendar,
//   TrendingUp,
//   TrendingDown,
//   Info,
//   AlertCircle,
//   CheckCircle,
//   BarChart3,
//   LineChart,
//   Undo,
//   Download,
//   ArrowRight,
//   ArrowLeftRight,
//   PiggyBank,
//   Target,
//   CalendarDays
// } from 'lucide-react';

// const formatCurrency = (value) => {
//   if (isNaN(value)) return '$0.00';
//   return new Intl.NumberFormat('en-US', {
//     style: 'currency',
//     currency: 'USD',
//     minimumFractionDigits: 2,
//     maximumFractionDigits: 2,
//   }).format(value);
// };

// const formatPercent = (value) => {
//   if (isNaN(value)) return '0.00%';
//   return value.toFixed(2) + '%';
// };

// export default function ForwardAnnuityCalculator() {
//   // Forward Pricing State
//   const [forwardInputs, setForwardInputs] = useState({
//     spotPrice: '100',
//     riskFreeRate: '5.0',
//     timeToMaturity: '1',
//     dividends: '',
//     storageCosts: '',
//     marketForwardPrice: '',
//     hasDividends: false,
//     hasStorage: false,
//   });
//   const [forwardResults, setForwardResults] = useState(null);

//   // Annuity State
//   const [annuityInputs, setAnnuityInputs] = useState({
//     payment: '1000',
//     interestRate: '5.0',
//     periods: '10',
//     growthRate: '2.0',
//     annuityType: 'ordinary',
//     calculationType: 'pv',
//     hasGrowth: false,
//   });
//   const [annuityResults, setAnnuityResults] = useState(null);
//   const [annuitySchedule, setAnnuitySchedule] = useState([]);

//   const [loading, setLoading] = useState(false);
//   const [activeTab, setActiveTab] = useState('forward');

//   // ==================== FORWARD PRICING ====================
//   const calculateForwardPrice = () => {
//     setLoading(true);
//     setTimeout(() => {
//       try {
//         const S = parseFloat(forwardInputs.spotPrice);
//         const r = parseFloat(forwardInputs.riskFreeRate) / 100;
//         const T = parseFloat(forwardInputs.timeToMaturity);
//         const hasDiv = forwardInputs.hasDividends;
//         const hasStorage = forwardInputs.hasStorage;
//         const div = hasDiv ? parseFloat(forwardInputs.dividends) || 0 : 0;
//         const storage = hasStorage ? parseFloat(forwardInputs.storageCosts) || 0 : 0;

//         if (isNaN(S) || isNaN(r) || isNaN(T) || S <= 0 || T <= 0) {
//           throw new Error('Please enter valid positive numbers for Spot Price, Rate, and Time.');
//         }

//         let fairPrice = S * Math.pow(1 + r, T);
//         let formulaUsed = 'F = S(1 + r)^T';
//         let adjustments = [];

//         if (hasDiv && div > 0) {
//           const pvDiv = div / Math.pow(1 + r, 0.5);
//           fairPrice = (S - pvDiv) * Math.pow(1 + r, T);
//           adjustments.push(`Subtracted PV of dividends ($${pvDiv.toFixed(2)})`);
//           formulaUsed = 'F = (S - PV(Div))(1 + r)^T';
//         }

//         if (hasStorage && storage > 0) {
//           const pvStorage = storage / Math.pow(1 + r, 1);
//           fairPrice = (S + pvStorage) * Math.pow(1 + r, T);
//           adjustments.push(`Added PV of storage costs ($${pvStorage.toFixed(2)})`);
//           formulaUsed = 'F = (S + PV(Storage))(1 + r)^T';
//         }

//         if (hasDiv && hasStorage && div > 0 && storage > 0) {
//           const pvDiv = div / Math.pow(1 + r, 0.5);
//           const pvStorage = storage / Math.pow(1 + r, 1);
//           fairPrice = (S - pvDiv + pvStorage) * Math.pow(1 + r, T);
//           formulaUsed = 'F = (S - PV(Div) + PV(Storage))(1 + r)^T';
//         }

//         const marketPrice = parseFloat(forwardInputs.marketForwardPrice);
//         let arbitrageSignal = null;
//         if (!isNaN(marketPrice) && marketPrice > 0) {
//           const diff = marketPrice - fairPrice;
//           const threshold = 0.01;
//           if (Math.abs(diff) > threshold) {
//             arbitrageSignal = {
//               type: diff > 0 ? 'overpriced' : 'underpriced',
//               message: diff > 0 
//                 ? `Market price (${formatCurrency(marketPrice)}) is ${formatCurrency(diff)} ABOVE fair price. SELL the overpriced forward.`
//                 : `Market price (${formatCurrency(marketPrice)}) is ${formatCurrency(Math.abs(diff))} BELOW fair price. BUY the underpriced forward.`,
//               profit: Math.abs(diff),
//             };
//           } else {
//             arbitrageSignal = {
//               type: 'fair',
//               message: 'Market price is aligned with fair price. No arbitrage opportunity.',
//               profit: 0,
//             };
//           }
//         }

//         setForwardResults({
//           fairPrice: fairPrice,
//           formulaUsed: formulaUsed,
//           adjustments: adjustments,
//           spotPrice: S,
//           riskFreeRate: r * 100,
//           timeToMaturity: T,
//           arbitrageSignal: arbitrageSignal,
//           marketPrice: marketPrice,
//         });
//       } catch (error) {
//         alert(error.message);
//       }
//       setLoading(false);
//     }, 300);
//   };

//   useEffect(() => {
//     calculateForwardPrice();
//   }, []);

//   // ==================== ANNUITY CALCULATOR ====================
//   const calculateAnnuity = () => {
//     setLoading(true);
//     setTimeout(() => {
//       try {
//         const C = parseFloat(annuityInputs.payment);
//         const r = parseFloat(annuityInputs.interestRate) / 100;
//         const n = parseFloat(annuityInputs.periods);
//         const hasGrowth = annuityInputs.hasGrowth;
//         const g = hasGrowth ? parseFloat(annuityInputs.growthRate) / 100 : 0;
//         const isDue = annuityInputs.annuityType === 'due';
//         const calcType = annuityInputs.calculationType;

//         if (isNaN(C) || isNaN(r) || isNaN(n) || C <= 0 || n <= 0 || r <= 0) {
//           throw new Error('Please enter valid positive numbers for Payment, Rate, and Periods.');
//         }

//         if (hasGrowth && r <= g) {
//           throw new Error('For growing annuities, Interest Rate must be greater than Growth Rate.');
//         }

//         let pv = 0;
//         let fv = 0;
//         let schedule = [];
//         let formulaUsed = '';

//         if (hasGrowth) {
//           formulaUsed = 'PV = C/(r-g) × [1 - (1+g)^n/(1+r)^n]';
//           const growthFactor = (1 + g) / (1 + r);
//           pv = (C / (r - g)) * (1 - Math.pow(growthFactor, n));
//           fv = pv * Math.pow(1 + r, n);
          
//           for (let t = 1; t <= Math.min(n, 15); t++) {
//             const payment = C * Math.pow(1 + g, t - 1);
//             const pvPayment = payment / Math.pow(1 + r, t);
//             const fvPayment = pvPayment * Math.pow(1 + r, n);
//             schedule.push({
//               period: t,
//               payment: payment,
//               pv: pvPayment,
//               fv: fvPayment,
//             });
//           }
//         } else {
//           if (isDue) {
//             formulaUsed = 'PV = C × [1 - (1+r)^-n] / r × (1+r)';
//             const annuityFactor = (1 - Math.pow(1 + r, -n)) / r;
//             pv = C * annuityFactor * (1 + r);
//             fv = pv * Math.pow(1 + r, n);
//           } else {
//             formulaUsed = 'PV = C × [1 - (1+r)^-n] / r';
//             const annuityFactor = (1 - Math.pow(1 + r, -n)) / r;
//             pv = C * annuityFactor;
//             fv = pv * Math.pow(1 + r, n);
//           }
          
//           for (let t = 1; t <= Math.min(n, 15); t++) {
//             const pvPayment = C / Math.pow(1 + r, t);
//             const fvPayment = pvPayment * Math.pow(1 + r, n);
//             schedule.push({
//               period: t,
//               payment: C,
//               pv: pvPayment,
//               fv: fvPayment,
//             });
//           }
//         }

//         const isPerpetuity = n >= 50;
//         let perpetuityValue = null;
//         if (isPerpetuity) {
//           if (hasGrowth) {
//             perpetuityValue = C / (r - g);
//           } else {
//             perpetuityValue = C / r;
//             if (isDue) {
//               perpetuityValue = (C / r) * (1 + r);
//             }
//           }
//         }

//         const totalPayments = hasGrowth 
//           ? C * ((Math.pow(1 + g, n) - 1) / g) 
//           : C * n;

//         setAnnuityResults({
//           pv: pv,
//           fv: fv,
//           formulaUsed: formulaUsed,
//           isPerpetuity: isPerpetuity,
//           perpetuityValue: perpetuityValue,
//           totalPayments: totalPayments,
//           totalInterest: fv - totalPayments,
//         });
//         setAnnuitySchedule(schedule);
//       } catch (error) {
//         alert(error.message);
//       }
//       setLoading(false);
//     }, 300);
//   };

//   useEffect(() => {
//     calculateAnnuity();
//   }, []);

//   // ==================== HANDLERS ====================
//   const handleForwardInputChange = (e) => {
//     const { id, value } = e.target;
//     setForwardInputs(prev => ({ ...prev, [id]: value }));
//   };

//   const handleForwardCheckboxChange = (id, checked) => {
//     setForwardInputs(prev => ({ ...prev, [id]: checked }));
//   };

//   const handleAnnuityInputChange = (e) => {
//     const { id, value } = e.target;
//     setAnnuityInputs(prev => ({ ...prev, [id]: value }));
//   };

//   const handleAnnuitySelectChange = (id, value) => {
//     setAnnuityInputs(prev => ({ ...prev, [id]: value }));
//   };

//   const handleAnnuityCheckboxChange = (id, checked) => {
//     setAnnuityInputs(prev => ({ ...prev, [id]: checked }));
//   };

//   const resetForward = () => {
//     setForwardInputs({
//       spotPrice: '100',
//       riskFreeRate: '5.0',
//       timeToMaturity: '1',
//       dividends: '',
//       storageCosts: '',
//       marketForwardPrice: '',
//       hasDividends: false,
//       hasStorage: false,
//     });
//     setForwardResults(null);
//   };

//   const resetAnnuity = () => {
//     setAnnuityInputs({
//       payment: '1000',
//       interestRate: '5.0',
//       periods: '10',
//       growthRate: '2.0',
//       annuityType: 'ordinary',
//       calculationType: 'pv',
//       hasGrowth: false,
//     });
//     setAnnuityResults(null);
//     setAnnuitySchedule([]);
//   };

//   return (
//     <TooltipProvider>
//       <div className="p-4 lg:p-8 bg-slate-50 min-h-screen">
//         <div className="max-w-6xl mx-auto space-y-8">
//           {/* Header */}
//           <div className="text-center">
//             <div className="flex justify-center mb-4">
//               <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl flex items-center justify-center">
//                 <ArrowLeftRight className="w-8 h-8 text-white" />
//               </div>
//             </div>
//             <h1 className="text-3xl font-bold text-slate-900">Forward & Annuity Calculator</h1>
//             <p className="text-slate-600 mt-2">
//               Calculate forward prices, annuities, perpetuities, and time value of money
//             </p>
//           </div>

//           {/* Main Tabs */}
//           <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
//             <TabsList className="grid w-full grid-cols-2 max-w-md mx-auto">
//               <TabsTrigger value="forward">
//                 <ArrowLeftRight className="w-4 h-4 mr-2" />
//                 Forward Price
//               </TabsTrigger>
//               <TabsTrigger value="annuity">
//                 <PiggyBank className="w-4 h-4 mr-2" />
//                 Annuity Calculator
//               </TabsTrigger>
//             </TabsList>

//             {/* ============ FORWARD PRICING TAB ============ */}
//             <TabsContent value="forward" className="mt-6">
//               <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
//                 {/* Forward Inputs */}
//                 <Card>
//                   <CardHeader>
//                     <div className="flex justify-between items-center">
//                       <CardTitle className="flex items-center gap-2">
//                         <Calculator className="w-5 h-5 text-blue-600" />
//                         Forward Pricing
//                       </CardTitle>
//                       <Button variant="ghost" size="sm" onClick={resetForward}>
//                         <Undo className="w-4 h-4 mr-2" />
//                         Reset
//                       </Button>
//                     </div>
//                     <p className="text-sm text-slate-500">
//                       Calculate fair forward price using no-arbitrage pricing
//                     </p>
//                   </CardHeader>
//                   <CardContent className="space-y-6">
//                     {/* Spot Price */}
//                     <div className="space-y-2">
//                       <Label htmlFor="spotPrice" className="flex items-center gap-1">
//                         Spot Price (S)
//                         <Tooltip>
//                           <TooltipTrigger asChild>
//                             <Info className="w-4 h-4 text-slate-400 cursor-help" />
//                           </TooltipTrigger>
//                           <TooltipContent>
//                             <p className="max-w-xs text-xs">Current market price of the underlying asset.</p>
//                           </TooltipContent>
//                         </Tooltip>
//                       </Label>
//                       <Input
//                         id="spotPrice"
//                         type="number"
//                         step="0.01"
//                         placeholder="100"
//                         value={forwardInputs.spotPrice}
//                         onChange={handleForwardInputChange}
//                         className="font-mono"
//                       />
//                     </div>

//                     {/* Risk-Free Rate */}
//                     <div className="space-y-2">
//                       <Label htmlFor="riskFreeRate" className="flex items-center gap-1">
//                         Risk-Free Rate (%)
//                         <Tooltip>
//                           <TooltipTrigger asChild>
//                             <Info className="w-4 h-4 text-slate-400 cursor-help" />
//                           </TooltipTrigger>
//                           <TooltipContent>
//                             <p className="max-w-xs text-xs">Risk-free interest rate (e.g., Treasury yield).</p>
//                           </TooltipContent>
//                         </Tooltip>
//                       </Label>
//                       <Input
//                         id="riskFreeRate"
//                         type="number"
//                         step="0.1"
//                         placeholder="5.0"
//                         value={forwardInputs.riskFreeRate}
//                         onChange={handleForwardInputChange}
//                         className="font-mono"
//                       />
//                     </div>

//                     {/* Time to Maturity */}
//                     <div className="space-y-2">
//                       <Label htmlFor="timeToMaturity" className="flex items-center gap-1">
//                         Time to Maturity (Years)
//                         <Tooltip>
//                           <TooltipTrigger asChild>
//                             <Info className="w-4 h-4 text-slate-400 cursor-help" />
//                           </TooltipTrigger>
//                           <TooltipContent>
//                             <p className="max-w-xs text-xs">Time until the forward contract matures.</p>
//                           </TooltipContent>
//                         </Tooltip>
//                       </Label>
//                       <Input
//                         id="timeToMaturity"
//                         type="number"
//                         step="0.1"
//                         placeholder="1"
//                         value={forwardInputs.timeToMaturity}
//                         onChange={handleForwardInputChange}
//                         className="font-mono"
//                       />
//                     </div>

//                     {/* Dividends Toggle - FIXED */}
//                     <div className="flex items-center gap-2">
//                       <input
//                         type="checkbox"
//                         id="hasDividends"
//                         checked={forwardInputs.hasDividends}
//                         onChange={(e) => handleForwardCheckboxChange('hasDividends', e.target.checked)}
//                         className="w-4 h-4 text-blue-600 rounded cursor-pointer"
//                       />
//                       <Label htmlFor="hasDividends" className="cursor-pointer">Asset Pays Dividends / Income</Label>
//                     </div>

//                     {forwardInputs.hasDividends && (
//                       <div className="space-y-2 pl-6">
//                         <Label htmlFor="dividends">Dividend / Income Amount ($)</Label>
//                         <Input
//                           id="dividends"
//                           type="number"
//                           step="0.01"
//                           placeholder="2.00"
//                           value={forwardInputs.dividends}
//                           onChange={handleForwardInputChange}
//                           className="font-mono"
//                         />
//                       </div>
//                     )}

//                     {/* Storage Costs Toggle - FIXED */}
//                     <div className="flex items-center gap-2">
//                       <input
//                         type="checkbox"
//                         id="hasStorage"
//                         checked={forwardInputs.hasStorage}
//                         onChange={(e) => handleForwardCheckboxChange('hasStorage', e.target.checked)}
//                         className="w-4 h-4 text-blue-600 rounded cursor-pointer"
//                       />
//                       <Label htmlFor="hasStorage" className="cursor-pointer">Has Storage Costs (Commodities)</Label>
//                     </div>

//                     {forwardInputs.hasStorage && (
//                       <div className="space-y-2 pl-6">
//                         <Label htmlFor="storageCosts">Storage Costs ($ per year)</Label>
//                         <Input
//                           id="storageCosts"
//                           type="number"
//                           step="0.01"
//                           placeholder="1.00"
//                           value={forwardInputs.storageCosts}
//                           onChange={handleForwardInputChange}
//                           className="font-mono"
//                         />
//                       </div>
//                     )}

//                     {/* Market Forward Price for Arbitrage - FIXED */}
//                     <div className="space-y-2 border-t pt-4">
//                       <Label htmlFor="marketForwardPrice" className="flex items-center gap-1">
//                         Market Forward Price (Optional)
//                         <Tooltip>
//                           <TooltipTrigger asChild>
//                             <Info className="w-4 h-4 text-slate-400 cursor-help" />
//                           </TooltipTrigger>
//                           <TooltipContent>
//                             <p className="max-w-xs text-xs">Enter the market price to check for arbitrage opportunities.</p>
//                           </TooltipContent>
//                         </Tooltip>
//                       </Label>
//                       <Input
//                         id="marketForwardPrice"
//                         type="number"
//                         step="0.01"
//                         placeholder="105.00"
//                         value={forwardInputs.marketForwardPrice}
//                         onChange={handleForwardInputChange}
//                         className="font-mono"
//                       />
//                     </div>

//                     <Button
//                       onClick={calculateForwardPrice}
//                       disabled={loading}
//                       className="w-full bg-blue-600 hover:bg-blue-700"
//                     >
//                       {loading ? 'Calculating...' : 'Calculate Forward Price'}
//                     </Button>
//                   </CardContent>
//                 </Card>

//                 {/* Forward Results */}
//                 <div className="space-y-6">
//                   {forwardResults && (
//                     <>
//                       <Card>
//                         <CardHeader>
//                           <CardTitle className="flex items-center gap-2">
//                             <DollarSign className="w-5 h-5" />
//                             Forward Price Result
//                           </CardTitle>
//                         </CardHeader>
//                         <CardContent>
//                           <div className="text-center">
//                             <p className="text-sm text-slate-600">Fair Forward Price</p>
//                             <p className="text-4xl font-bold text-blue-600">
//                               {formatCurrency(forwardResults.fairPrice)}
//                             </p>
//                             <p className="text-xs text-slate-400 mt-1">
//                               Formula: {forwardResults.formulaUsed}
//                             </p>
//                           </div>
//                           <div className="mt-4 border-t pt-4">
//                             <div className="grid grid-cols-2 gap-4 text-sm">
//                               <div>
//                                 <p className="text-slate-500">Spot Price</p>
//                                 <p className="font-semibold">{formatCurrency(forwardResults.spotPrice)}</p>
//                               </div>
//                               <div>
//                                 <p className="text-slate-500">Risk-Free Rate</p>
//                                 <p className="font-semibold">{formatPercent(forwardResults.riskFreeRate)}</p>
//                               </div>
//                               <div>
//                                 <p className="text-slate-500">Time to Maturity</p>
//                                 <p className="font-semibold">{forwardResults.timeToMaturity} years</p>
//                               </div>
//                               <div>
//                                 <p className="text-slate-500">Forward Premium</p>
//                                 <p className="font-semibold text-green-600">
//                                   {formatCurrency(forwardResults.fairPrice - forwardResults.spotPrice)}
//                                 </p>
//                               </div>
//                             </div>
//                           </div>
//                           {forwardResults.adjustments.length > 0 && (
//                             <div className="mt-4 p-3 bg-slate-50 rounded-lg">
//                               <p className="text-xs font-semibold text-slate-600">Adjustments Applied:</p>
//                               <ul className="text-xs text-slate-500 mt-1 list-disc list-inside">
//                                 {forwardResults.adjustments.map((adj, i) => (
//                                   <li key={i}>{adj}</li>
//                                 ))}
//                               </ul>
//                             </div>
//                           )}
//                         </CardContent>
//                       </Card>

//                       {/* Arbitrage Signal */}
//                       {forwardResults.arbitrageSignal && (
//                         <Alert className={
//                           forwardResults.arbitrageSignal.type === 'overpriced' ? 'border-red-200 bg-red-50' :
//                           forwardResults.arbitrageSignal.type === 'underpriced' ? 'border-green-200 bg-green-50' :
//                           'border-blue-200 bg-blue-50'
//                         }>
//                           {forwardResults.arbitrageSignal.type === 'overpriced' && <AlertCircle className="h-4 w-4 text-red-600" />}
//                           {forwardResults.arbitrageSignal.type === 'underpriced' && <CheckCircle className="h-4 w-4 text-green-600" />}
//                           {forwardResults.arbitrageSignal.type === 'fair' && <CheckCircle className="h-4 w-4 text-blue-600" />}
//                           <AlertTitle className={
//                             forwardResults.arbitrageSignal.type === 'overpriced' ? 'text-red-800' :
//                             forwardResults.arbitrageSignal.type === 'underpriced' ? 'text-green-800' :
//                             'text-blue-800'
//                           }>
//                             {forwardResults.arbitrageSignal.type === 'overpriced' && '🔴 SELL Opportunity'}
//                             {forwardResults.arbitrageSignal.type === 'underpriced' && '🟢 BUY Opportunity'}
//                             {forwardResults.arbitrageSignal.type === 'fair' && '⚖️ Fairly Priced'}
//                           </AlertTitle>
//                           <AlertDescription>
//                             {forwardResults.arbitrageSignal.message}
//                             {forwardResults.arbitrageSignal.profit > 0 && (
//                               <span className="font-bold block mt-1">
//                                 Potential Profit: {formatCurrency(forwardResults.arbitrageSignal.profit)} per unit
//                               </span>
//                             )}
//                           </AlertDescription>
//                         </Alert>
//                       )}
//                     </>
//                   )}
//                 </div>
//               </div>
//             </TabsContent>

//             {/* ============ ANNUITY CALCULATOR TAB ============ */}
//             <TabsContent value="annuity" className="mt-6">
//               <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
//                 {/* Annuity Inputs */}
//                 <Card>
//                   <CardHeader>
//                     <div className="flex justify-between items-center">
//                       <CardTitle className="flex items-center gap-2">
//                         <PiggyBank className="w-5 h-5 text-blue-600" />
//                         Annuity Calculator
//                       </CardTitle>
//                       <Button variant="ghost" size="sm" onClick={resetAnnuity}>
//                         <Undo className="w-4 h-4 mr-2" />
//                         Reset
//                       </Button>
//                     </div>
//                     <p className="text-sm text-slate-500">
//                       Calculate PV, FV, and payment schedules for annuities
//                     </p>
//                   </CardHeader>
//                   <CardContent className="space-y-6">
//                     {/* Calculation Type */}
//                     <div className="space-y-2">
//                       <Label>Calculation Type</Label>
//                       <Select
//                         value={annuityInputs.calculationType}
//                         onValueChange={(value) => handleAnnuitySelectChange('calculationType', value)}
//                       >
//                         <SelectTrigger>
//                           <SelectValue />
//                         </SelectTrigger>
//                         <SelectContent>
//                           <SelectItem value="pv">Present Value (PV)</SelectItem>
//                           <SelectItem value="fv">Future Value (FV)</SelectItem>
//                           <SelectItem value="both">Both PV & FV</SelectItem>
//                         </SelectContent>
//                       </Select>
//                     </div>

//                     {/* Payment */}
//                     <div className="space-y-2">
//                       <Label htmlFor="payment">Payment Amount ($)</Label>
//                       <Input
//                         id="payment"
//                         type="number"
//                         step="0.01"
//                         placeholder="1000"
//                         value={annuityInputs.payment}
//                         onChange={handleAnnuityInputChange}
//                         className="font-mono"
//                       />
//                     </div>

//                     {/* Interest Rate */}
//                     <div className="space-y-2">
//                       <Label htmlFor="interestRate">Interest Rate (%)</Label>
//                       <Input
//                         id="interestRate"
//                         type="number"
//                         step="0.1"
//                         placeholder="5.0"
//                         value={annuityInputs.interestRate}
//                         onChange={handleAnnuityInputChange}
//                         className="font-mono"
//                       />
//                     </div>

//                     {/* Number of Periods */}
//                     <div className="space-y-2">
//                       <Label htmlFor="periods">Number of Periods</Label>
//                       <Input
//                         id="periods"
//                         type="number"
//                         step="1"
//                         placeholder="10"
//                         value={annuityInputs.periods}
//                         onChange={handleAnnuityInputChange}
//                         className="font-mono"
//                       />
//                     </div>

//                     {/* Growing Annuity Toggle - FIXED */}
//                     <div className="flex items-center gap-2">
//                       <input
//                         type="checkbox"
//                         id="hasGrowth"
//                         checked={annuityInputs.hasGrowth}
//                         onChange={(e) => handleAnnuityCheckboxChange('hasGrowth', e.target.checked)}
//                         className="w-4 h-4 text-blue-600 rounded cursor-pointer"
//                       />
//                       <Label htmlFor="hasGrowth" className="cursor-pointer">Growing Annuity</Label>
//                     </div>

//                     {annuityInputs.hasGrowth && (
//                       <div className="space-y-2 pl-6">
//                         <Label htmlFor="growthRate">Growth Rate (%)</Label>
//                         <Input
//                           id="growthRate"
//                           type="number"
//                           step="0.1"
//                           placeholder="2.0"
//                           value={annuityInputs.growthRate}
//                           onChange={handleAnnuityInputChange}
//                           className="font-mono"
//                         />
//                         <p className="text-xs text-slate-400">
//                           Interest Rate must be greater than Growth Rate.
//                         </p>
//                       </div>
//                     )}

//                     {/* Annuity Type */}
//                     <div className="space-y-2">
//                       <Label htmlFor="annuityType">Annuity Type</Label>
//                       <Select
//                         value={annuityInputs.annuityType}
//                         onValueChange={(value) => handleAnnuitySelectChange('annuityType', value)}
//                       >
//                         <SelectTrigger>
//                           <SelectValue />
//                         </SelectTrigger>
//                         <SelectContent>
//                           <SelectItem value="ordinary">Ordinary Annuity (Payments at end)</SelectItem>
//                           <SelectItem value="due">Annuity Due (Payments at beginning)</SelectItem>
//                         </SelectContent>
//                       </Select>
//                     </div>

//                     <Button
//                       onClick={calculateAnnuity}
//                       disabled={loading}
//                       className="w-full bg-blue-600 hover:bg-blue-700"
//                     >
//                       {loading ? 'Calculating...' : 'Calculate Annuity'}
//                     </Button>
//                   </CardContent>
//                 </Card>

//                 {/* Annuity Results */}
//                 <div className="space-y-6">
//                   {annuityResults && (
//                     <>
//                       <Card>
//                         <CardHeader>
//                           <CardTitle className="flex items-center gap-2">
//                             <DollarSign className="w-5 h-5" />
//                             Annuity Results
//                           </CardTitle>
//                         </CardHeader>
//                         <CardContent>
//                           <div className="grid grid-cols-2 gap-4">
//                             {(annuityInputs.calculationType === 'pv' || annuityInputs.calculationType === 'both') && (
//                               <div className="bg-blue-50 p-4 rounded-lg">
//                                 <p className="text-xs text-blue-600">Present Value (PV)</p>
//                                 <p className="text-2xl font-bold text-blue-700">
//                                   {formatCurrency(annuityResults.pv)}
//                                 </p>
//                               </div>
//                             )}
//                             {(annuityInputs.calculationType === 'fv' || annuityInputs.calculationType === 'both') && (
//                               <div className="bg-green-50 p-4 rounded-lg">
//                                 <p className="text-xs text-green-600">Future Value (FV)</p>
//                                 <p className="text-2xl font-bold text-green-700">
//                                   {formatCurrency(annuityResults.fv)}
//                                 </p>
//                               </div>
//                             )}
//                           </div>

//                           <div className="mt-4 border-t pt-4 space-y-2 text-sm">
//                             <div className="flex justify-between">
//                               <span className="text-slate-500">Formula Used:</span>
//                               <span className="font-mono text-xs">{annuityResults.formulaUsed}</span>
//                             </div>
//                             <div className="flex justify-between">
//                               <span className="text-slate-500">Total Payments:</span>
//                               <span className="font-semibold">{formatCurrency(annuityResults.totalPayments)}</span>
//                             </div>
//                             <div className="flex justify-between">
//                               <span className="text-slate-500">Total Interest Earned:</span>
//                               <span className="font-semibold text-green-600">{formatCurrency(annuityResults.totalInterest)}</span>
//                             </div>
//                           </div>

//                           {annuityResults.isPerpetuity && annuityResults.perpetuityValue && (
//                             <Alert className="mt-4 border-purple-200 bg-purple-50">
//                               <Info className="h-4 w-4 text-purple-600" />
//                               <AlertDescription className="text-purple-800">
//                                 <strong>Perpetuity Value:</strong> {formatCurrency(annuityResults.perpetuityValue)}
//                                 <br />
//                                 <span className="text-xs">For perpetual payments ({annuityInputs.periods}+ periods)</span>
//                               </AlertDescription>
//                             </Alert>
//                           )}
//                         </CardContent>
//                       </Card>

//                       {/* Payment Schedule */}
//                       {annuitySchedule.length > 0 && (
//                         <Card>
//                           <CardHeader>
//                             <CardTitle className="flex items-center gap-2 text-sm">
//                               <CalendarDays className="w-4 h-4" />
//                               Payment Schedule (First {Math.min(annuitySchedule.length, 15)} Periods)
//                             </CardTitle>
//                           </CardHeader>
//                           <CardContent>
//                             <ScrollArea className="h-48">
//                               <Table>
//                                 <TableHeader>
//                                   <TableRow>
//                                     <TableHead>Period</TableHead>
//                                     <TableHead className="text-right">Payment</TableHead>
//                                     <TableHead className="text-right">PV of Payment</TableHead>
//                                     <TableHead className="text-right">FV of Payment</TableHead>
//                                   </TableRow>
//                                 </TableHeader>
//                                 <TableBody>
//                                   {annuitySchedule.map((row) => (
//                                     <TableRow key={row.period}>
//                                       <TableCell>{row.period}</TableCell>
//                                       <TableCell className="text-right">{formatCurrency(row.payment)}</TableCell>
//                                       <TableCell className="text-right">{formatCurrency(row.pv)}</TableCell>
//                                       <TableCell className="text-right">{formatCurrency(row.fv)}</TableCell>
//                                     </TableRow>
//                                   ))}
//                                   {annuitySchedule.length > 15 && (
//                                     <TableRow>
//                                       <TableCell colSpan={4} className="text-center text-slate-400 text-sm">
//                                         ... and {annuitySchedule.length - 15} more periods
//                                       </TableCell>
//                                     </TableRow>
//                                   )}
//                                 </TableBody>
//                               </Table>
//                             </ScrollArea>
//                           </CardContent>
//                         </Card>
//                       )}
//                     </>
//                   )}
//                 </div>
//               </div>
//             </TabsContent>
//           </Tabs>

//           {/* Educational Section */}
//           <Card>
//             <CardHeader>
//               <CardTitle className="flex items-center gap-2">
//                 <Info className="w-5 h-5" />
//                 Understanding Forward Pricing & Annuities
//               </CardTitle>
//             </CardHeader>
//             <CardContent>
//               <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
//                 <div className="bg-blue-50 p-4 rounded-lg">
//                   <p className="font-semibold text-blue-800">Forward Pricing</p>
//                   <p className="text-sm text-blue-700 mt-1">
//                     <strong>F = S(1 + r)^T</strong>
//                     <br />
//                     • With Dividends: F = (S - PV(Div))(1 + r)^T
//                     <br />
//                     • With Storage: F = (S + PV(Storage))(1 + r)^T
//                     <br />
//                     • If market price ≠ fair price → Arbitrage!
//                   </p>
//                 </div>
//                 <div className="bg-green-50 p-4 rounded-lg">
//                   <p className="font-semibold text-green-800">Annuities</p>
//                   <p className="text-sm text-green-700 mt-1">
//                     <strong>PV = C × [1 - (1+r)^-n] / r</strong>
//                     <br />
//                     • Ordinary Annuity: Payments at end
//                     <br />
//                     • Annuity Due: Payments at beginning
//                     <br />
//                     • Growing Annuity: Payments grow at rate g
//                   </p>
//                 </div>
//                 <div className="bg-purple-50 p-4 rounded-lg">
//                   <p className="font-semibold text-purple-800">Perpetuities</p>
//                   <p className="text-sm text-purple-700 mt-1">
//                     <strong>PV = C / r</strong>
//                     <br />
//                     • Forever recurring payments
//                     <br />
//                     • Growing Perpetuity: PV = C / (r - g)
//                     <br />
//                     • Common in dividend valuation models
//                   </p>
//                 </div>
//               </div>
//             </CardContent>
//           </Card>
//         </div>
//       </div>
//     </TooltipProvider>
//   );
// }

// src/pages/ForwardAnnuityCalculator.jsx
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
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
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
  ArrowRight,
  ArrowLeftRight,
  PiggyBank,
  Target,
  CalendarDays
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

export default function ForwardAnnuityCalculator() {
  // Forward Pricing State
  const [forwardInputs, setForwardInputs] = useState({
    spotPrice: '100',
    riskFreeRate: '5.0',
    timeToMaturity: '1',
    dividends: '',
    storageCosts: '',
    marketForwardPrice: '',
    hasDividends: false,
    hasStorage: false,
  });
  const [forwardResults, setForwardResults] = useState(null);

  // Annuity State
  const [annuityInputs, setAnnuityInputs] = useState({
    payment: '1000',
    interestRate: '4.9',
    periods: '10',
    growthRate: '2.0',
    annuityType: 'ordinary',
    calculationType: 'pv',
    hasGrowth: false,
  });
  const [annuityResults, setAnnuityResults] = useState(null);
  const [annuitySchedule, setAnnuitySchedule] = useState([]);

  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('forward');

  // ==================== FORWARD PRICING ====================
  const calculateForwardPrice = () => {
    setLoading(true);
    setTimeout(() => {
      try {
        const S = parseFloat(forwardInputs.spotPrice);
        const r = parseFloat(forwardInputs.riskFreeRate) / 100;
        const T = parseFloat(forwardInputs.timeToMaturity);
        const hasDiv = forwardInputs.hasDividends;
        const hasStorage = forwardInputs.hasStorage;
        const div = hasDiv ? parseFloat(forwardInputs.dividends) || 0 : 0;
        const storage = hasStorage ? parseFloat(forwardInputs.storageCosts) || 0 : 0;

        if (isNaN(S) || isNaN(r) || isNaN(T) || S <= 0 || T <= 0) {
          throw new Error('Please enter valid positive numbers for Spot Price, Rate, and Time.');
        }

        let fairPrice = S * Math.pow(1 + r, T);
        let formulaUsed = 'F = S(1 + r)^T';
        let adjustments = [];

        if (hasDiv && div > 0) {
          const pvDiv = div / Math.pow(1 + r, 0.5);
          fairPrice = (S - pvDiv) * Math.pow(1 + r, T);
          adjustments.push(`Subtracted PV of dividends ($${pvDiv.toFixed(2)})`);
          formulaUsed = 'F = (S - PV(Div))(1 + r)^T';
        }

        if (hasStorage && storage > 0) {
          const pvStorage = storage / Math.pow(1 + r, 1);
          fairPrice = (S + pvStorage) * Math.pow(1 + r, T);
          adjustments.push(`Added PV of storage costs ($${pvStorage.toFixed(2)})`);
          formulaUsed = 'F = (S + PV(Storage))(1 + r)^T';
        }

        if (hasDiv && hasStorage && div > 0 && storage > 0) {
          const pvDiv = div / Math.pow(1 + r, 0.5);
          const pvStorage = storage / Math.pow(1 + r, 1);
          fairPrice = (S - pvDiv + pvStorage) * Math.pow(1 + r, T);
          formulaUsed = 'F = (S - PV(Div) + PV(Storage))(1 + r)^T';
        }

        const marketPrice = parseFloat(forwardInputs.marketForwardPrice);
        let arbitrageSignal = null;
        if (!isNaN(marketPrice) && marketPrice > 0) {
          const diff = marketPrice - fairPrice;
          const threshold = 0.01;
          if (Math.abs(diff) > threshold) {
            arbitrageSignal = {
              type: diff > 0 ? 'overpriced' : 'underpriced',
              message: diff > 0 
                ? `Market price (${formatCurrency(marketPrice)}) is ${formatCurrency(diff)} ABOVE fair price. SELL the overpriced forward.`
                : `Market price (${formatCurrency(marketPrice)}) is ${formatCurrency(Math.abs(diff))} BELOW fair price. BUY the underpriced forward.`,
              profit: Math.abs(diff),
            };
          } else {
            arbitrageSignal = {
              type: 'fair',
              message: 'Market price is aligned with fair price. No arbitrage opportunity.',
              profit: 0,
            };
          }
        }

        setForwardResults({
          fairPrice: fairPrice,
          formulaUsed: formulaUsed,
          adjustments: adjustments,
          spotPrice: S,
          riskFreeRate: r * 100,
          timeToMaturity: T,
          arbitrageSignal: arbitrageSignal,
          marketPrice: marketPrice,
        });
      } catch (error) {
        alert(error.message);
      }
      setLoading(false);
    }, 300);
  };

  useEffect(() => {
    calculateForwardPrice();
  }, []);

  // ==================== ANNUITY CALCULATOR ====================
  const calculateAnnuity = () => {
    setLoading(true);
    setTimeout(() => {
      try {
        const C = parseFloat(annuityInputs.payment);
        const r = parseFloat(annuityInputs.interestRate) / 100;
        const n = parseFloat(annuityInputs.periods);
        const hasGrowth = annuityInputs.hasGrowth;
        const g = hasGrowth ? parseFloat(annuityInputs.growthRate) / 100 : 0;
        const isDue = annuityInputs.annuityType === 'due';
        const calcType = annuityInputs.calculationType;

        if (isNaN(C) || isNaN(r) || isNaN(n) || C <= 0 || n <= 0 || r <= 0) {
          throw new Error('Please enter valid positive numbers for Payment, Rate, and Periods.');
        }

        if (hasGrowth && r <= g) {
          throw new Error('For growing annuities, Interest Rate must be greater than Growth Rate.');
        }

        let pv = 0;
        let fv = 0;
        let schedule = [];
        let formulaUsed = '';

        // Generate payment schedule first (for both annuity types)
        // This is the key fix: For annuity due, first payment is at time 0 (now)
        for (let t = 0; t < n; t++) {
          const period = t + 1;
          let payment;
          if (hasGrowth) {
            payment = C * Math.pow(1 + g, t);
          } else {
            payment = C;
          }

          // For annuity due: payment at beginning of period (time t)
          // For ordinary annuity: payment at end of period (time t+1)
          const timeIndex = isDue ? t : t + 1;
          
          const pvPayment = payment / Math.pow(1 + r, timeIndex);
          const fvPayment = pvPayment * Math.pow(1 + r, n);

          schedule.push({
            period: period,
            payment: payment,
            pv: pvPayment,
            fv: fvPayment,
          });
        }

        // Calculate total PV and FV from schedule
        pv = schedule.reduce((sum, row) => sum + row.pv, 0);
        fv = schedule.reduce((sum, row) => sum + row.fv, 0);

        // Build formula string
        if (hasGrowth) {
          if (isDue) {
            formulaUsed = 'PV = C(1+r)/(r-g) × [1 - ((1+g)/(1+r))^n] (Annuity Due)';
          } else {
            formulaUsed = 'PV = C/(r-g) × [1 - ((1+g)/(1+r))^n] (Ordinary)';
          }
        } else {
          if (isDue) {
            formulaUsed = 'PV = C × [1 - (1+r)^-n] / r × (1+r) (Annuity Due)';
          } else {
            formulaUsed = 'PV = C × [1 - (1+r)^-n] / r (Ordinary)';
          }
        }

        const isPerpetuity = n >= 50;
        let perpetuityValue = null;
        if (isPerpetuity) {
          if (hasGrowth) {
            perpetuityValue = C / (r - g);
          } else {
            perpetuityValue = C / r;
            if (isDue) {
              perpetuityValue = (C / r) * (1 + r);
            }
          }
        }

        const totalPayments = schedule.reduce((sum, row) => sum + row.payment, 0);
        const totalInterest = fv - totalPayments;

        setAnnuityResults({
          pv: pv,
          fv: fv,
          formulaUsed: formulaUsed,
          isPerpetuity: isPerpetuity,
          perpetuityValue: perpetuityValue,
          totalPayments: totalPayments,
          totalInterest: totalInterest,
        });
        setAnnuitySchedule(schedule);
      } catch (error) {
        alert(error.message);
      }
      setLoading(false);
    }, 300);
  };

  useEffect(() => {
    calculateAnnuity();
  }, []);

  // ==================== HANDLERS ====================
  const handleForwardInputChange = (e) => {
    const { id, value } = e.target;
    setForwardInputs(prev => ({ ...prev, [id]: value }));
  };

  const handleForwardCheckboxChange = (id, checked) => {
    setForwardInputs(prev => ({ ...prev, [id]: checked }));
  };

  const handleAnnuityInputChange = (e) => {
    const { id, value } = e.target;
    setAnnuityInputs(prev => ({ ...prev, [id]: value }));
  };

  const handleAnnuitySelectChange = (id, value) => {
    setAnnuityInputs(prev => ({ ...prev, [id]: value }));
  };

  const handleAnnuityCheckboxChange = (id, checked) => {
    setAnnuityInputs(prev => ({ ...prev, [id]: checked }));
  };

  const resetForward = () => {
    setForwardInputs({
      spotPrice: '100',
      riskFreeRate: '5.0',
      timeToMaturity: '1',
      dividends: '',
      storageCosts: '',
      marketForwardPrice: '',
      hasDividends: false,
      hasStorage: false,
    });
    setForwardResults(null);
  };

  const resetAnnuity = () => {
    setAnnuityInputs({
      payment: '1000',
      interestRate: '4.9',
      periods: '10',
      growthRate: '2.0',
      annuityType: 'ordinary',
      calculationType: 'pv',
      hasGrowth: false,
    });
    setAnnuityResults(null);
    setAnnuitySchedule([]);
  };

  return (
    <TooltipProvider>
      <div className="p-4 lg:p-8 bg-slate-50 min-h-screen">
        <div className="max-w-6xl mx-auto space-y-8">
          {/* Header */}
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl flex items-center justify-center">
                <ArrowLeftRight className="w-8 h-8 text-white" />
              </div>
            </div>
            <h1 className="text-3xl font-bold text-slate-900">Forward & Annuity Calculator</h1>
            <p className="text-slate-600 mt-2">
              Calculate forward prices, annuities, perpetuities, and time value of money
            </p>
          </div>

          {/* Main Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 max-w-md mx-auto">
              <TabsTrigger value="forward">
                <ArrowLeftRight className="w-4 h-4 mr-2" />
                Forward Price
              </TabsTrigger>
              <TabsTrigger value="annuity">
                <PiggyBank className="w-4 h-4 mr-2" />
                Annuity Calculator
              </TabsTrigger>
            </TabsList>

            {/* ============ FORWARD PRICING TAB ============ */}
            <TabsContent value="forward" className="mt-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Forward Inputs */}
                <Card>
                  <CardHeader>
                    <div className="flex justify-between items-center">
                      <CardTitle className="flex items-center gap-2">
                        <Calculator className="w-5 h-5 text-blue-600" />
                        Forward Pricing
                      </CardTitle>
                      <Button variant="ghost" size="sm" onClick={resetForward}>
                        <Undo className="w-4 h-4 mr-2" />
                        Reset
                      </Button>
                    </div>
                    <p className="text-sm text-slate-500">
                      Calculate fair forward price using no-arbitrage pricing
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="spotPrice" className="flex items-center gap-1">
                        Spot Price (S)
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="w-4 h-4 text-slate-400 cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="max-w-xs text-xs">Current market price of the underlying asset.</p>
                          </TooltipContent>
                        </Tooltip>
                      </Label>
                      <Input
                        id="spotPrice"
                        type="number"
                        step="0.01"
                        placeholder="100"
                        value={forwardInputs.spotPrice}
                        onChange={handleForwardInputChange}
                        className="font-mono"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="riskFreeRate" className="flex items-center gap-1">
                        Risk-Free Rate (%)
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="w-4 h-4 text-slate-400 cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="max-w-xs text-xs">Risk-free interest rate (e.g., Treasury yield).</p>
                          </TooltipContent>
                        </Tooltip>
                      </Label>
                      <Input
                        id="riskFreeRate"
                        type="number"
                        step="0.1"
                        placeholder="5.0"
                        value={forwardInputs.riskFreeRate}
                        onChange={handleForwardInputChange}
                        className="font-mono"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="timeToMaturity" className="flex items-center gap-1">
                        Time to Maturity (Years)
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="w-4 h-4 text-slate-400 cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="max-w-xs text-xs">Time until the forward contract matures.</p>
                          </TooltipContent>
                        </Tooltip>
                      </Label>
                      <Input
                        id="timeToMaturity"
                        type="number"
                        step="0.1"
                        placeholder="1"
                        value={forwardInputs.timeToMaturity}
                        onChange={handleForwardInputChange}
                        className="font-mono"
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="hasDividends"
                        checked={forwardInputs.hasDividends}
                        onChange={(e) => handleForwardCheckboxChange('hasDividends', e.target.checked)}
                        className="w-4 h-4 text-blue-600 rounded cursor-pointer"
                      />
                      <Label htmlFor="hasDividends" className="cursor-pointer">Asset Pays Dividends / Income</Label>
                    </div>

                    {forwardInputs.hasDividends && (
                      <div className="space-y-2 pl-6">
                        <Label htmlFor="dividends">Dividend / Income Amount ($)</Label>
                        <Input
                          id="dividends"
                          type="number"
                          step="0.01"
                          placeholder="2.00"
                          value={forwardInputs.dividends}
                          onChange={handleForwardInputChange}
                          className="font-mono"
                        />
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="hasStorage"
                        checked={forwardInputs.hasStorage}
                        onChange={(e) => handleForwardCheckboxChange('hasStorage', e.target.checked)}
                        className="w-4 h-4 text-blue-600 rounded cursor-pointer"
                      />
                      <Label htmlFor="hasStorage" className="cursor-pointer">Has Storage Costs (Commodities)</Label>
                    </div>

                    {forwardInputs.hasStorage && (
                      <div className="space-y-2 pl-6">
                        <Label htmlFor="storageCosts">Storage Costs ($ per year)</Label>
                        <Input
                          id="storageCosts"
                          type="number"
                          step="0.01"
                          placeholder="1.00"
                          value={forwardInputs.storageCosts}
                          onChange={handleForwardInputChange}
                          className="font-mono"
                        />
                      </div>
                    )}

                    <div className="space-y-2 border-t pt-4">
                      <Label htmlFor="marketForwardPrice" className="flex items-center gap-1">
                        Market Forward Price (Optional)
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="w-4 h-4 text-slate-400 cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="max-w-xs text-xs">Enter the market price to check for arbitrage opportunities.</p>
                          </TooltipContent>
                        </Tooltip>
                      </Label>
                      <Input
                        id="marketForwardPrice"
                        type="number"
                        step="0.01"
                        placeholder="105.00"
                        value={forwardInputs.marketForwardPrice}
                        onChange={handleForwardInputChange}
                        className="font-mono"
                      />
                    </div>

                    <Button
                      onClick={calculateForwardPrice}
                      disabled={loading}
                      className="w-full bg-blue-600 hover:bg-blue-700"
                    >
                      {loading ? 'Calculating...' : 'Calculate Forward Price'}
                    </Button>
                  </CardContent>
                </Card>

                {/* Forward Results */}
                <div className="space-y-6">
                  {forwardResults && (
                    <>
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <DollarSign className="w-5 h-5" />
                            Forward Price Result
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-center">
                            <p className="text-sm text-slate-600">Fair Forward Price</p>
                            <p className="text-4xl font-bold text-blue-600">
                              {formatCurrency(forwardResults.fairPrice)}
                            </p>
                            <p className="text-xs text-slate-400 mt-1">
                              Formula: {forwardResults.formulaUsed}
                            </p>
                          </div>
                          <div className="mt-4 border-t pt-4">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <p className="text-slate-500">Spot Price</p>
                                <p className="font-semibold">{formatCurrency(forwardResults.spotPrice)}</p>
                              </div>
                              <div>
                                <p className="text-slate-500">Risk-Free Rate</p>
                                <p className="font-semibold">{formatPercent(forwardResults.riskFreeRate)}</p>
                              </div>
                              <div>
                                <p className="text-slate-500">Time to Maturity</p>
                                <p className="font-semibold">{forwardResults.timeToMaturity} years</p>
                              </div>
                              <div>
                                <p className="text-slate-500">Forward Premium</p>
                                <p className="font-semibold text-green-600">
                                  {formatCurrency(forwardResults.fairPrice - forwardResults.spotPrice)}
                                </p>
                              </div>
                            </div>
                          </div>
                          {forwardResults.adjustments.length > 0 && (
                            <div className="mt-4 p-3 bg-slate-50 rounded-lg">
                              <p className="text-xs font-semibold text-slate-600">Adjustments Applied:</p>
                              <ul className="text-xs text-slate-500 mt-1 list-disc list-inside">
                                {forwardResults.adjustments.map((adj, i) => (
                                  <li key={i}>{adj}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </CardContent>
                      </Card>

                      {forwardResults.arbitrageSignal && (
                        <Alert className={
                          forwardResults.arbitrageSignal.type === 'overpriced' ? 'border-red-200 bg-red-50' :
                          forwardResults.arbitrageSignal.type === 'underpriced' ? 'border-green-200 bg-green-50' :
                          'border-blue-200 bg-blue-50'
                        }>
                          {forwardResults.arbitrageSignal.type === 'overpriced' && <AlertCircle className="h-4 w-4 text-red-600" />}
                          {forwardResults.arbitrageSignal.type === 'underpriced' && <CheckCircle className="h-4 w-4 text-green-600" />}
                          {forwardResults.arbitrageSignal.type === 'fair' && <CheckCircle className="h-4 w-4 text-blue-600" />}
                          <AlertTitle className={
                            forwardResults.arbitrageSignal.type === 'overpriced' ? 'text-red-800' :
                            forwardResults.arbitrageSignal.type === 'underpriced' ? 'text-green-800' :
                            'text-blue-800'
                          }>
                            {forwardResults.arbitrageSignal.type === 'overpriced' && '🔴 SELL Opportunity'}
                            {forwardResults.arbitrageSignal.type === 'underpriced' && '🟢 BUY Opportunity'}
                            {forwardResults.arbitrageSignal.type === 'fair' && '⚖️ Fairly Priced'}
                          </AlertTitle>
                          <AlertDescription>
                            {forwardResults.arbitrageSignal.message}
                            {forwardResults.arbitrageSignal.profit > 0 && (
                              <span className="font-bold block mt-1">
                                Potential Profit: {formatCurrency(forwardResults.arbitrageSignal.profit)} per unit
                              </span>
                            )}
                          </AlertDescription>
                        </Alert>
                      )}
                    </>
                  )}
                </div>
              </div>
            </TabsContent>

            {/* ============ ANNUITY CALCULATOR TAB ============ */}
            <TabsContent value="annuity" className="mt-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Annuity Inputs */}
                <Card>
                  <CardHeader>
                    <div className="flex justify-between items-center">
                      <CardTitle className="flex items-center gap-2">
                        <PiggyBank className="w-5 h-5 text-blue-600" />
                        Annuity Calculator
                      </CardTitle>
                      <Button variant="ghost" size="sm" onClick={resetAnnuity}>
                        <Undo className="w-4 h-4 mr-2" />
                        Reset
                      </Button>
                    </div>
                    <p className="text-sm text-slate-500">
                      Calculate PV, FV, and payment schedules for annuities
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-2">
                      <Label>Calculation Type</Label>
                      <Select
                        value={annuityInputs.calculationType}
                        onValueChange={(value) => handleAnnuitySelectChange('calculationType', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pv">Present Value (PV)</SelectItem>
                          <SelectItem value="fv">Future Value (FV)</SelectItem>
                          <SelectItem value="both">Both PV & FV</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="payment">Payment Amount ($)</Label>
                      <Input
                        id="payment"
                        type="number"
                        step="0.01"
                        placeholder="1000"
                        value={annuityInputs.payment}
                        onChange={handleAnnuityInputChange}
                        className="font-mono"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="interestRate">Interest Rate (%)</Label>
                      <Input
                        id="interestRate"
                        type="number"
                        step="0.1"
                        placeholder="5.0"
                        value={annuityInputs.interestRate}
                        onChange={handleAnnuityInputChange}
                        className="font-mono"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="periods">Number of Periods</Label>
                      <Input
                        id="periods"
                        type="number"
                        step="1"
                        placeholder="10"
                        value={annuityInputs.periods}
                        onChange={handleAnnuityInputChange}
                        className="font-mono"
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="hasGrowth"
                        checked={annuityInputs.hasGrowth}
                        onChange={(e) => handleAnnuityCheckboxChange('hasGrowth', e.target.checked)}
                        className="w-4 h-4 text-blue-600 rounded cursor-pointer"
                      />
                      <Label htmlFor="hasGrowth" className="cursor-pointer">Growing Annuity</Label>
                    </div>

                    {annuityInputs.hasGrowth && (
                      <div className="space-y-2 pl-6">
                        <Label htmlFor="growthRate">Growth Rate (%)</Label>
                        <Input
                          id="growthRate"
                          type="number"
                          step="0.1"
                          placeholder="2.0"
                          value={annuityInputs.growthRate}
                          onChange={handleAnnuityInputChange}
                          className="font-mono"
                        />
                        <p className="text-xs text-slate-400">
                          Interest Rate must be greater than Growth Rate.
                        </p>
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label htmlFor="annuityType">Annuity Type</Label>
                      <Select
                        value={annuityInputs.annuityType}
                        onValueChange={(value) => handleAnnuitySelectChange('annuityType', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ordinary">Ordinary Annuity (Payments at end)</SelectItem>
                          <SelectItem value="due">Annuity Due (Payments at beginning)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <Button
                      onClick={calculateAnnuity}
                      disabled={loading}
                      className="w-full bg-blue-600 hover:bg-blue-700"
                    >
                      {loading ? 'Calculating...' : 'Calculate Annuity'}
                    </Button>
                  </CardContent>
                </Card>

                {/* Annuity Results */}
                <div className="space-y-6">
                  {annuityResults && (
                    <>
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <DollarSign className="w-5 h-5" />
                            Annuity Results
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-2 gap-4">
                            {(annuityInputs.calculationType === 'pv' || annuityInputs.calculationType === 'both') && (
                              <div className="bg-blue-50 p-4 rounded-lg">
                                <p className="text-xs text-blue-600">Present Value (PV)</p>
                                <p className="text-2xl font-bold text-blue-700">
                                  {formatCurrency(annuityResults.pv)}
                                </p>
                              </div>
                            )}
                            {(annuityInputs.calculationType === 'fv' || annuityInputs.calculationType === 'both') && (
                              <div className="bg-green-50 p-4 rounded-lg">
                                <p className="text-xs text-green-600">Future Value (FV)</p>
                                <p className="text-2xl font-bold text-green-700">
                                  {formatCurrency(annuityResults.fv)}
                                </p>
                              </div>
                            )}
                          </div>

                          <div className="mt-4 border-t pt-4 space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-slate-500">Formula Used:</span>
                              <span className="font-mono text-xs">{annuityResults.formulaUsed}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-500">Total Payments:</span>
                              <span className="font-semibold">{formatCurrency(annuityResults.totalPayments)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-500">Total Interest Earned:</span>
                              <span className="font-semibold text-green-600">{formatCurrency(annuityResults.totalInterest)}</span>
                            </div>
                          </div>

                          {annuityResults.isPerpetuity && annuityResults.perpetuityValue && (
                            <Alert className="mt-4 border-purple-200 bg-purple-50">
                              <Info className="h-4 w-4 text-purple-600" />
                              <AlertDescription className="text-purple-800">
                                <strong>Perpetuity Value:</strong> {formatCurrency(annuityResults.perpetuityValue)}
                                <br />
                                <span className="text-xs">For perpetual payments ({annuityInputs.periods}+ periods)</span>
                              </AlertDescription>
                            </Alert>
                          )}
                        </CardContent>
                      </Card>

                      {/* Payment Schedule */}
                      {annuitySchedule.length > 0 && (
                        <Card>
                          <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-sm">
                              <CalendarDays className="w-4 h-4" />
                              Payment Schedule (First {Math.min(annuitySchedule.length, 15)} Periods)
                            </CardTitle>
                            {annuityInputs.annuityType === 'due' && (
                              <p className="text-xs text-blue-600">💰 First payment is NOW (time 0) for Annuity Due</p>
                            )}
                          </CardHeader>
                          <CardContent>
                            <ScrollArea className="h-48">
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Period</TableHead>
                                    <TableHead className="text-right">Payment</TableHead>
                                    <TableHead className="text-right">PV of Payment</TableHead>
                                    <TableHead className="text-right">FV of Payment</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {annuitySchedule.slice(0, 15).map((row) => (
                                    <TableRow key={row.period}>
                                      <TableCell>{row.period}</TableCell>
                                      <TableCell className="text-right">{formatCurrency(row.payment)}</TableCell>
                                      <TableCell className="text-right">{formatCurrency(row.pv)}</TableCell>
                                      <TableCell className="text-right">{formatCurrency(row.fv)}</TableCell>
                                    </TableRow>
                                  ))}
                                  {annuitySchedule.length > 15 && (
                                    <TableRow>
                                      <TableCell colSpan={4} className="text-center text-slate-400 text-sm">
                                        ... and {annuitySchedule.length - 15} more periods
                                      </TableCell>
                                    </TableRow>
                                  )}
                                </TableBody>
                              </Table>
                            </ScrollArea>
                          </CardContent>
                        </Card>
                      )}
                    </>
                  )}
                </div>
              </div>
            </TabsContent>
          </Tabs>

          {/* Educational Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="w-5 h-5" />
                Understanding Forward Pricing & Annuities
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="font-semibold text-blue-800">Forward Pricing</p>
                  <p className="text-sm text-blue-700 mt-1">
                    <strong>F = S(1 + r)^T</strong>
                    <br />
                    • With Dividends: F = (S - PV(Div))(1 + r)^T
                    <br />
                    • With Storage: F = (S + PV(Storage))(1 + r)^T
                    <br />
                    • If market price ≠ fair price → Arbitrage!
                  </p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <p className="font-semibold text-green-800">Annuities</p>
                  <p className="text-sm text-green-700 mt-1">
                    <strong>PV = C × [1 - (1+r)^-n] / r</strong>
                    <br />
                    • Ordinary Annuity: Payments at end
                    <br />
                    • Annuity Due: Payments at beginning (multiply by 1+r)
                    <br />
                    • Growing Annuity: Payments grow at rate g
                  </p>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <p className="font-semibold text-purple-800">Perpetuities</p>
                  <p className="text-sm text-purple-700 mt-1">
                    <strong>PV = C / r</strong>
                    <br />
                    • Forever recurring payments
                    <br />
                    • Growing Perpetuity: PV = C / (r - g)
                    <br />
                    • Common in dividend valuation models
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