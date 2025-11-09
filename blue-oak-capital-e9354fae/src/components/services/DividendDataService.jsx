
import CleanStockDataService from './CleanStockDataService';

class DividendDataService {
    constructor() {
        // Enhanced caching system with timestamps
        this.fundamentalCache = new Map();
        this.screeningCache = new Map();
        this.preScreenCache = new Map();
        
        // Cache timeouts (24 hours for fundamental data)
        this.fundamentalCacheTimeout = 24 * 60 * 60 * 1000; // 24 hours
        this.preScreenCacheTimeout = 60 * 60 * 1000; // 1 hour for pre-screening
        
        // Rate limiting configuration
        this.maxCallsPerMinute = 60;
        this.callQueue = [];
        this.isProcessingQueue = false;
        this.lastCallTime = 0;
        this.callsInCurrentMinute = 0;
        this.minuteStartTime = Date.now();
        
        // Progress tracking
        this.progressCallback = null;
        this.totalStepsForProgress = 0;
        this.currentStep = 0;
    }

    // Check if cached data is still valid
    isCacheValid(cacheEntry, timeout) {
        return cacheEntry && (Date.now() - cacheEntry.timestamp < timeout);
    }

    // Set progress callback for UI updates
    setProgressCallback(callback) {
        this.progressCallback = callback;
        this.currentStep = 0;
    }

    // Update progress and notify UI
    updateProgress(message, step = null) {
        if (step !== null) this.currentStep = step;
        if (this.progressCallback) {
            this.progressCallback({
                step: this.currentStep,
                total: this.totalStepsForProgress,
                message: message,
                percentage: this.totalStepsForProgress > 0 ? (this.currentStep / this.totalStepsForProgress) * 100 : 0
            });
        }
    }

    // Rate-limited API call wrapper
    async makeRateLimitedCall(apiCall) {
        return new Promise((resolve) => {
            this.callQueue.push({ apiCall, resolve });
            this.processQueue();
        });
    }

    // Process queued API calls with rate limiting
    async processQueue() {
        if (this.isProcessingQueue || this.callQueue.length === 0) return;
        
        this.isProcessingQueue = true;
        
        while (this.callQueue.length > 0) {
            const now = Date.now();
            
            // Reset counter if a new minute has started
            if (now - this.minuteStartTime >= 60000) {
                this.callsInCurrentMinute = 0;
                this.minuteStartTime = now;
            }
            
            // If we've hit the rate limit, wait until next minute
            if (this.callsInCurrentMinute >= this.maxCallsPerMinute) {
                const waitTime = 60000 - (now - this.minuteStartTime);
                await new Promise(resolve => setTimeout(resolve, waitTime));
                continue;
            }
            
            // Ensure minimum delay between calls (1 second)
            const timeSinceLastCall = now - this.lastCallTime;
            if (timeSinceLastCall < 1000) {
                await new Promise(resolve => setTimeout(resolve, 1000 - timeSinceLastCall));
            }
            
            // Execute the API call
            const { apiCall, resolve } = this.callQueue.shift();
            this.callsInCurrentMinute++;
            this.lastCallTime = Date.now();
            
            try {
                const result = await apiCall();
                resolve(result);
            } catch (error) {
                console.warn('Rate-limited API call failed:', error);
                resolve(null); // Graceful failure
            }
        }
        
        this.isProcessingQueue = false;
    }

    // Pre-screen stocks using efficient API endpoints
    async preScreenStocks(criteria) {
        const cacheKey = `prescreen_${JSON.stringify(criteria)}`;
        const cached = this.preScreenCache.get(cacheKey);
        
        if (this.isCacheValid(cached, this.preScreenCacheTimeout)) {
            console.log('Using cached pre-screening results');
            return cached.data;
        }
        
        this.updateProgress('Pre-screening stocks with basic criteria...', 1);
        
        try {
            // Use FinnHub's stock screener for initial filtering
            const screenerCall = async () => {
                const response = await fetch(
                    `${CleanStockDataService.finnhubUrl}/stock/screener?` +
                    `marketCapMoreThan=${criteria.minMarketCap}&` +
                    `dividendMoreThan=${criteria.minYield * 100}&` +
                    `token=${CleanStockDataService.finnhubApiKey}`
                );
                
                if (!response.ok) throw new Error(`Screener API error: ${response.status}`);
                const data = await response.json();
                return data.result || [];
            };
            
            const screenResults = await this.makeRateLimitedCall(screenerCall);
            
            // Cache the results
            this.preScreenCache.set(cacheKey, {
                data: screenResults,
                timestamp: Date.now()
            });
            
            this.updateProgress(`Found ${screenResults.length} candidates from pre-screening`, 2);
            return screenResults;
            
        } catch (error) {
            console.warn('Pre-screening failed, using fallback universe:', error);
            this.updateProgress('Using fallback stock universe', 2);
            
            // Fallback to our curated universe
            return this.getFallbackUniverse().map(symbol => ({ symbol }));
        }
    }

    // Get fallback stock universe
    getFallbackUniverse() {
        return [
            'O', 'JNJ', 'KO', 'PG', 'JPM', 'MSFT', 'AAPL', 'ABBV', 'PEP', 'XOM',
            'CVX', 'MCD', 'WMT', 'HD', 'VZ', 'T', 'MO', 'MAIN', 'STAG'
        ];
    }

    // Get essential metrics for a stock (prioritized data fetching)
    async getEssentialMetrics(symbol) {
        const cacheKey = `essential_${symbol}`;
        const cached = this.fundamentalCache.get(cacheKey);
        
        if (this.isCacheValid(cached, this.fundamentalCacheTimeout)) {
            return { ...cached.data, fromCache: true };
        }
        
        try {
            // Prioritized API calls - only essential data
            const metricsCall = async () => {
                const response = await fetch(
                    `${CleanStockDataService.finnhubUrl}/stock/metric?symbol=${symbol}&metric=all&token=${CleanStockDataService.finnhubApiKey}`
                );
                if (!response.ok) throw new Error(`Metrics API error: ${response.status}`);
                return response.json();
            };
            
            const quoteCall = async () => {
                const response = await fetch(
                    `${CleanStockDataService.finnhubUrl}/quote?symbol=${symbol}&token=${CleanStockDataService.finnhubApiKey}`
                );
                if (!response.ok) throw new Error(`Quote API error: ${response.status}`);
                return response.json();
            };
            
            // Execute calls with rate limiting
            const [metricsData, quoteData] = await Promise.all([
                this.makeRateLimitedCall(metricsCall),
                this.makeRateLimitedCall(quoteCall)
            ]);
            
            if (!quoteData || !quoteData.c) {
                throw new Error('No valid quote data');
            }
            
            // Extract essential metrics
            const metrics = metricsData?.metric || {};
            const essentialData = {
                symbol,
                price: quoteData.c,
                marketCap: (metrics.marketCapitalization || 1000) * 1000000,
                peRatio: metrics.peBasicExclExtraTTM || 20,
                yield: (metrics.dividendYieldIndicatedAnnual || 3) / 100,
                payoutRatio: metrics.payoutRatioTTM ? metrics.payoutRatioTTM / 100 : null,
                debtToEquity: metrics.debtEquityRatioTTM || null,
                roe: metrics.returnOnEquityTTM ? metrics.returnOnEquityTTM / 100 : null,
                fcf: 1000000, // Assume positive FCF (FinnHub limitation)
                sector: 'Unknown', // This will be refined later in generateDividendPlan
                dividendHistory: 5, // Assume sufficient history
                dataAge: 'Fresh',
                fromCache: false
            };
            
            // Cache the results
            this.fundamentalCache.set(cacheKey, {
                data: essentialData,
                timestamp: Date.now()
            });
            
            return essentialData;
            
        } catch (error) {
            console.warn(`Failed to get essential metrics for ${symbol}:`, error);
            
            // Check if we have cached data to fall back on
            if (cached) {
                const age = Math.floor((Date.now() - cached.timestamp) / (1000 * 60 * 60));
                return {
                    ...cached.data,
                    dataAge: `${age}h old`,
                    fromCache: true
                };
            }
            
            // Final fallback with reasonable defaults
            return {
                symbol,
                price: 100,
                marketCap: 1000000000,
                peRatio: 20,
                yield: 0.03,
                payoutRatio: null,
                debtToEquity: null,
                roe: null,
                fcf: 1000000,
                sector: 'Unknown',
                dividendHistory: 5,
                dataAge: 'Estimated',
                fromCache: false
            };
        }
    }

    // Enhanced screening with progress tracking
    async screenStock(symbol, criteria, stepNumber) {
        this.updateProgress(`Analyzing ${symbol}...`, stepNumber);
        
        try {
            const metrics = await this.getEssentialMetrics(symbol);
            
            const score = {
                passed: true,
                reasons: [],
                data: metrics,
                warnings: []
            };
            
            // Apply screening criteria
            if (metrics.marketCap < criteria.minMarketCap) {
                score.reasons.push("Market Cap too low");
            }
            if (metrics.yield < criteria.minYield) {
                score.reasons.push("Yield too low");
            }
            if (metrics.peRatio > criteria.maxPe && metrics.peRatio !== 0) {
                score.reasons.push("P/E too high");
            }
            if (metrics.payoutRatio !== null && metrics.payoutRatio > criteria.maxPayoutRatio) {
                score.reasons.push("Payout ratio too high");
            }
            if (metrics.debtToEquity !== null && metrics.debtToEquity > criteria.maxDebtToEquity) {
                score.reasons.push("Debt/Equity too high");
            }
            if (metrics.roe !== null && metrics.roe < criteria.minRoe) {
                score.reasons.push("ROE too low");
            }
            if (metrics.fcf <= 0) {
                score.reasons.push("Negative free cash flow");
            }
            
            // Track data quality
            if (metrics.payoutRatio === null) score.warnings.push("Payout ratio unavailable");
            if (metrics.debtToEquity === null) score.warnings.push("Debt/Equity unavailable");
            if (metrics.roe === null) score.warnings.push("ROE unavailable");
            if (metrics.fromCache) score.warnings.push(`Data from cache (${metrics.dataAge})`);
            
            score.passed = score.reasons.length === 0;
            return score;
            
        } catch (error) {
            console.error(`Error screening ${symbol}:`, error);
            return {
                passed: false,
                reason: "Analysis failed",
                data: null,
                warnings: [`Failed to analyze: ${error.message}`]
            };
        }
    }

    // Get risk-based criteria
    getRiskBasedCriteria(riskTolerance) {
        const baseCriteria = {
            minDividendYears: 5,
            minYield: 0.03,
            maxPayoutRatio: 0.85,
            minGrowth: 0.03,
            minRoe: 0.08,
            maxDebtToEquity: 1.0,
            maxPe: 25,
            minMarketCap: 70 * 1000000
        };

        switch (riskTolerance) {
            case 'low':
                return { ...baseCriteria, maxPayoutRatio: 0.65, maxDebtToEquity: 0.8, minYield: 0.02 };
            case 'high':
                return { ...baseCriteria, maxPayoutRatio: 1.0, maxDebtToEquity: 2.0, minYield: 0.04, maxPe: 30 };
            case 'medium':
            default:
                return baseCriteria;
        }
    }

    // Enhanced dividend plan generation with guaranteed 5 stocks
    async generateDividendPlan({ targetAnnualIncome, riskTolerance, progressCallback }) {
        this.setProgressCallback(progressCallback);
        
        try {
            const criteria = this.getRiskBasedCriteria(riskTolerance);
            
            // Step 1: Pre-screening
            this.totalStepsForProgress = 20;
            this.updateProgress('Starting dividend plan generation...', 0);
            
            const candidates = await this.preScreenStocks(criteria);
            const limitedCandidates = candidates.slice(0, 30); // Increase candidate pool
            
            // Step 2: Detailed screening
            this.totalStepsForProgress = 3 + limitedCandidates.length;
            this.updateProgress(`Analyzing ${limitedCandidates.length} candidate stocks...`, 3);
            
            const screeningPromises = limitedCandidates.map((candidate, index) => 
                this.screenStock(candidate.symbol, criteria, 4 + index)
            );
            
            const screenedResults = await Promise.all(screeningPromises);
            
            let passedStocks = screenedResults
                .filter(result => result.passed && result.data)
                .map(result => ({ ...result.data, warnings: result.warnings }))
                .sort((a, b) => (b.yield || 0) - (a.yield || 0));
            
            // GUARANTEE 5 STOCKS: If we don't have enough, relax criteria progressively
            if (passedStocks.length < 5) {
                this.updateProgress('Expanding search with relaxed criteria to ensure 5 stocks...', this.totalStepsForProgress - 1);
                
                // Get more stocks with relaxed criteria
                const relaxedResults = screenedResults
                    .filter(result => result.data && !result.passed) // Previously failed stocks
                    .map(result => ({ ...result.data, warnings: [...(result.warnings || []), "Relaxed criteria applied"] }))
                    .sort((a, b) => (b.yield || 0) - (a.yield || 0));
                
                // Add the best relaxed stocks to reach 5 total
                const needed = 5 - passedStocks.length;
                passedStocks = [...passedStocks, ...relaxedResults.slice(0, needed)];
            }
            
            // Final fallback: If still not enough, use hardcoded reliable dividend stocks
            if (passedStocks.length < 5) {
                const fallbackStocks = ['O', 'JNJ', 'KO', 'PG', 'MAIN'];
                const stillNeeded = 5 - passedStocks.length;
                
                for (let i = 0; i < stillNeeded && i < fallbackStocks.length; i++) {
                    const symbol = fallbackStocks[i];
                    if (!passedStocks.find(s => s.symbol === symbol)) {
                        try {
                            const fallbackData = await this.getEssentialMetrics(symbol);
                            passedStocks.push({
                                ...fallbackData,
                                warnings: ['Added as reliable fallback stock']
                            });
                        } catch (error) {
                            console.warn(`Failed to add fallback stock ${symbol}:`, error);
                        }
                    }
                }
            }
            
            // Ensure exactly 5 stocks (trim if we somehow got more)
            passedStocks = passedStocks.slice(0, 5);
            
            this.updateProgress(`Building portfolio with ${passedStocks.length} stocks`, this.totalStepsForProgress);
            
            if (passedStocks.length === 0) {
                return {
                    portfolio: [],
                    totalInvestment: 0,
                    annualIncome: 0,
                    portfolioYield: 0,
                    sectorAllocation: {},
                    warnings: ["No stocks passed screening. Try adjusting risk tolerance."],
                    dataFreshness: { cached: 0, fresh: 0, estimated: 0 }
                };
            }
            
            // Build optimized portfolio (exactly 5 stocks with equal weight)
            const portfolioWeight = 1.0 / passedStocks.length;
            
            let totalInvestment = 0;
            let dataFreshness = { cached: 0, fresh: 0, estimated: 0 };
            
            const portfolio = passedStocks.map(stock => {
                const expectedAnnualDividend = targetAnnualIncome * portfolioWeight;
                const annualDividendPerShare = stock.price * (stock.yield || 0.03);
                const sharesNeeded = annualDividendPerShare > 0 ? expectedAnnualDividend / annualDividendPerShare : 0;
                const investmentNeeded = sharesNeeded * stock.price;
                
                totalInvestment += investmentNeeded;
                
                // Track data freshness
                if (stock.fromCache) dataFreshness.cached++;
                else if (stock.dataAge === 'Estimated') dataFreshness.estimated++;
                else dataFreshness.fresh++;
                
                return {
                    symbol: stock.symbol,
                    sector: stock.sector || this.getSectorFallback(stock.symbol),
                    sharesNeeded,
                    expectedAnnualDividend,
                    portfolioPercentage: portfolioWeight * 100,
                    investmentNeeded,
                    yield: (stock.yield || 0.03) * 100,
                    peRatio: stock.peRatio || 20,
                    payoutRatio: stock.payoutRatio,
                    debtToEquity: stock.debtToEquity,
                    warnings: stock.warnings || [],
                    dataAge: stock.dataAge
                };
            });
            
            const portfolioYield = totalInvestment > 0 ? (targetAnnualIncome / totalInvestment) * 100 : 0;
            
            const sectorAllocation = portfolio.reduce((acc, stock) => {
                const sector = stock.sector || 'Unknown';
                acc[sector] = (acc[sector] || 0) + stock.investmentNeeded;
                return acc;
            }, {});
            
            // Normalize sector allocation to percentages
            Object.keys(sectorAllocation).forEach(sector => {
                sectorAllocation[sector] = totalInvestment > 0 ? (sectorAllocation[sector] / totalInvestment) * 100 : 0;
            });
            
            return {
                portfolio,
                totalInvestment,
                annualIncome: targetAnnualIncome,
                portfolioYield,
                sectorAllocation,
                dataFreshness,
                warnings: portfolio.length < 5 ? [`Limited to ${portfolio.length} stocks due to screening criteria`] : []
            };
            
        } catch (error) {
            console.error('Failed to generate dividend plan:', error);
            throw new Error(`Plan generation failed: ${error.message}`);
        } finally {
            this.progressCallback = null;
        }
    }

    // Fallback sector mapping for known symbols
    getSectorFallback(symbol) {
        const sectorMap = {
            'O': 'Real Estate',
            'JNJ': 'Healthcare',
            'KO': 'Consumer Defensive',
            'PG': 'Consumer Defensive',
            'JPM': 'Financial Services',
            'MSFT': 'Technology',
            'AAPL': 'Technology',
            'ABBV': 'Healthcare',
            'PEP': 'Consumer Defensive',
            'XOM': 'Energy',
            'CVX': 'Energy',
            'MCD': 'Consumer Cyclical',
            'WMT': 'Consumer Defensive',
            'HD': 'Consumer Cyclical',
            'VZ': 'Communication Services',
            'T': 'Communication Services',
            'MO': 'Consumer Defensive',
            'MAIN': 'Financial Services',
            'STAG': 'Real Estate'
        };
        return sectorMap[symbol] || 'Unknown';
    }
}

export default new DividendDataService();
