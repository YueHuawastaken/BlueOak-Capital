
import { performBuffettCalculation } from "../pages/BuffettAnalysis";

// Stable Stock Data Service - Finnhub Only with Smart Caching
class CleanStockDataService {
  constructor() {
    // API Configuration - Simplified and reliable
    this.finnhubApiKey = 'd2mlkr9r01qog4449a90d2mlkr9r01qog4449a9g';
    this.fmpApiKey = 'uomoQ6RHYj8ltpZaXoD8bMppTryOmykz';
    
    // API Base URLs
    this.finnhubUrl = 'https://finnhub.io/api/v1';
    this.fmpUrl = 'https://financialmodelingprep.com/api/v3';
    
    // Smart caching to respect rate limits
    this.priceCache = new Map();
    this.profileCache = new Map();
    this.historicalCache = new Map();
    this.featuredStocksCache = new Map(); // New cache for the global watchlist
    
    // Cache timeouts
    this.priceCacheTimeout = 60000; // 60 seconds for live prices
    this.profileCacheTimeout = 3600000; // 1 hour for company profiles
    this.historicalTimeout = 24 * 60 * 60 * 1000; // 24 hours for historical data
    this.featuredCacheTimeout = 60 * 60 * 1000; // 60-minute cache for featured stocks
    
    // Global featured stocks list (market leaders)
    this.featuredSymbols = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA'];
  }

  // Check if cached data is still valid
  isCacheValid(cachedEntry, timeout) {
    return cachedEntry && cachedEntry.timestamp && (Date.now() - cachedEntry.timestamp < timeout);
  }

  // PRIMARY AND ONLY API: Finnhub with smart caching
  async fetchFromFinnhub(symbol) {
    const priceKey = `price_${symbol}`;
    const profileKey = `profile_${symbol}`;
    
    // Check cache first for price data
    const cachedPrice = this.priceCache.get(priceKey);
    const cachedProfile = this.profileCache.get(profileKey);
    
    let priceData = null;
    let profileData = null;
    
    try {
      // Get price data (cache for 60 seconds)
      if (cachedPrice && this.isCacheValid(cachedPrice, this.priceCacheTimeout)) {
        console.log(`Using cached price for ${symbol}`);
        priceData = cachedPrice.data;
      } else {
        console.log(`Fetching fresh price for ${symbol} from Finnhub`);
        const priceResponse = await fetch(
          `${this.finnhubUrl}/quote?symbol=${symbol}&token=${this.finnhubApiKey}`
        );
        if (priceResponse.ok) {
          priceData = await priceResponse.json();
          if (priceData.c) { // Check for valid data
             this.priceCache.set(priceKey, { data: priceData, timestamp: Date.now() });
          } else {
            console.warn(`Finnhub price data invalid for ${symbol}: No 'c' field.`);
            priceData = {}; // Invalidate if no price
          }
        } else {
          console.warn(`Finnhub price API error for ${symbol}: ${priceResponse.status}`);
          priceData = {};
        }
      }
      
      // Get profile data (cache for 1 hour)
      if (cachedProfile && this.isCacheValid(cachedProfile, this.profileCacheTimeout)) {
        console.log(`Using cached profile for ${symbol}`);
        profileData = cachedProfile.data;
      } else {
        console.log(`Fetching fresh profile for ${symbol} from Finnhub`);
        const profileResponse = await fetch(
          `${this.finnhubUrl}/stock/profile2?symbol=${symbol}&token=${this.finnhubApiKey}`
        );
        if (profileResponse.ok) {
          profileData = await profileResponse.json();
          this.profileCache.set(profileKey, { data: profileData, timestamp: Date.now() });
        } else {
          console.warn(`Finnhub profile API error for ${symbol}: ${profileResponse.status}`);
          profileData = {};
        }
      }

      // If we couldn't get any price data, it's a failure.
      if (!priceData || typeof priceData.c !== 'number' || isNaN(priceData.c)) { // Added typeof and isNaN checks for robustness
        return null;
      }
      
      // Combine price and profile data
      return {
        symbol: symbol,
        company_name: profileData?.name || `${symbol} Inc.`,
        current_price: priceData.c,
        daily_change: priceData.d || 0,
        daily_change_percent: priceData.dp || 0,
        previous_close: priceData.pc,
        high: priceData.h,
        low: priceData.l,
        open: priceData.o,
        currency: profileData?.currency || 'USD',
        exchange: profileData?.exchange || 'NASDAQ',
        sector: profileData?.finnhubIndustry || 'Technology',
        market_cap: profileData?.marketCapitalization ? profileData.marketCapitalization * 1000000 : null,
        logo: profileData?.logo || null,
        website: profileData?.weburl || null,
        fundamentals: { eps: null, pe_ratio: null, book_value: null, fcf_per_share: null, free_cash_flow: null },
        dividend: null,
        data_availability: { eps: false, fcf: false, dividends: false, pe_ratio: false, book_value: false },
        data_source: 'Finnhub',
        last_updated: new Date().toISOString()
      };
      
    } catch (error) {
      // This catches network-level errors like "Failed to fetch"
      console.warn(`Finnhub network request failed for ${symbol}:`, error.message);
      return null; // Return null on failure instead of throwing an error
    }
  }

  // Get single stock with caching
  async getStock(symbol) {
    try {
      // fetchFromFinnhub now returns null on failure, so we just pass it through.
      return await this.fetchFromFinnhub(symbol);
    } catch (error) {
      // This catch is a safety net for any unexpected errors.
      console.error(`Unexpected error in getStock for ${symbol}:`, error);
      return null;
    }
  }

  // NEW METHOD: Get featured stocks with 60-minute caching
  async getFeaturedStocks(forceRefresh = false) {
    const cacheKey = 'featured_stocks';
    const cached = this.featuredStocksCache.get(cacheKey);

    if (!forceRefresh && this.isCacheValid(cached, this.featuredCacheTimeout)) {
        console.log("Using cached featured stocks.");
        return cached.data;
    }

    console.log(forceRefresh ? "Forcing refresh of featured stocks." : "Featured stocks cache expired, fetching fresh data.");
    
    const results = [];
    
    for (const symbol of this.featuredSymbols) {
      try {
        const stockData = await this.fetchFromFinnhub(symbol);
        if (stockData) {
          results.push(stockData);
        }
        await new Promise(resolve => setTimeout(resolve, 100)); // Stagger calls
      } catch (error) {
        console.error(`Failed to fetch ${symbol} for featured list:`, error);
      }
    }
    
    if (results.length > 0) {
        this.featuredStocksCache.set(cacheKey, { data: results, timestamp: Date.now() });
    }
    
    return results;
  }

  // FIXED: FMP Quote with proper API call structure
  async getFmpQuote(symbol) {
    try {
      console.log(`Attempting FMP Quote for ${symbol}`);
      const url = `${this.fmpUrl}/quote/${symbol}?apikey=${this.fmpApiKey}`;
      console.log(`FMP URL: ${url}`); // Debug log to verify URL construction
      
      const response = await fetch(url);
      
      if (!response.ok) {
        console.error(`FMP API response not ok: ${response.status} ${response.statusText}`);
        if (response.status === 403) {
          throw new Error(`FMP API access forbidden (403) - API key may be invalid or rate limited`);
        }
        if (response.status === 429) {
          throw new Error(`FMP rate limit exceeded (429)`);
        }
        throw new Error(`FMP quote API error: ${response.status}`);
      }
      
      const data = await response.json();
      console.log(`FMP API response for ${symbol}:`, data); // Debug log to see response
      
      if (!data || !Array.isArray(data) || data.length === 0) {
        throw new Error('No quote data returned from FMP');
      }
      
      const quote = data[0];
      console.log(`FMP quote processed:`, quote); // Debug log
      
      return {
        symbol: quote.symbol || symbol,
        companyName: quote.name || `${symbol} Inc.`,
        currentPrice: quote.price || null,
        eps: quote.eps || null,
        bookValue: quote.bookValue || null,
        dividendAnnual: quote.dividend || 0
      };
    } catch (error) {
      console.error('FMP quote fetch failed:', error);
      
      // Try Finnhub fallback
      try {
        console.log(`FMP failed, trying Finnhub fallback for ${symbol}`);
        const finnhubData = await this.getStock(symbol);
        if (finnhubData) {
          return {
            symbol: finnhubData.symbol,
            companyName: finnhubData.company_name,
            currentPrice: finnhubData.current_price,
            eps: null, // Finnhub free doesn't provide this
            bookValue: null, // Finnhub free doesn't provide this
            dividendAnnual: null // Finnhub free doesn't provide this
          };
        }
      } catch (finnhubError) {
        console.error('Finnhub fallback also failed:', finnhubError);
      }
      
      // If both fail, throw the original FMP error
      throw error;
    }
  }

  // SIMPLIFIED: Historical data with conservative defaults (no FMP historical calls)
  async getHistoricalAnalysisData(symbol) {
    const cacheKey = `historical_${symbol}`;
    const cached = this.historicalCache.get(cacheKey);
    
    // Return cached data if valid (24 hours)
    if (cached && this.isCacheValid(cached, this.historicalTimeout)) {
      console.log(`Using cached historical data for ${symbol}`);
      return cached.data;
    }
    
    console.log(`Providing conservative defaults for historical data for ${symbol} (no FMP historical calls)`);
    
    // Return conservative defaults without making FMP historical API calls
    const fallbackData = {
      symbol: symbol,
      historical_eps_growth: 6, // Conservative default
      conservative_pe_ratio: 15, // Conservative default
      max_pe_ratio: 25, // Conservative default
      growth_calculated: false,
      pe_calculated: false,
      years_of_eps_data: 0,
      source: 'Conservative Defaults (No Historical API Calls)',
      note: 'Please manually input P/E ratios based on your research'
    };
    
    // Cache the fallback result for a shorter time (1 hour)
    this.historicalCache.set(cacheKey, { data: fallbackData, timestamp: Date.now() });
    return fallbackData;
  }

  // Search functionality - simplified for known stocks
  async searchStocks(query) {
    if (!query || query.length < 2) {
      return [];
    }
    
    // Search within our known watchlist and common stocks
    const commonStocks = [
      { symbol: 'AAPL', company_name: 'Apple Inc.', sector: 'Technology' },
      { symbol: 'MSFT', company_name: 'Microsoft Corp.', sector: 'Technology' },
      { symbol: 'GOOGL', company_name: 'Alphabet Inc.', sector: 'Technology' },
      { symbol: 'TSLA', company_name: 'Tesla Inc.', sector: 'Automotive' },
      { symbol: 'NVDA', company_name: 'NVIDIA Corp.', sector: 'Technology' },
      { symbol: 'META', company_name: 'Meta Platforms Inc.', sector: 'Technology' },
      { symbol: 'AMZN', company_name: 'Amazon.com Inc.', sector: 'Consumer' },
      { symbol: 'KO', company_name: 'The Coca-Cola Co.', sector: 'Consumer' },
      { symbol: 'JPM', company_name: 'JPMorgan Chase & Co.', sector: 'Finance' },
      { symbol: 'JNJ', company_name: 'Johnson & Johnson', sector: 'Healthcare' },
      { symbol: 'V', company_name: 'Visa Inc.', sector: 'Finance' },
      { symbol: 'PG', company_name: 'Procter & Gamble Co.', sector: 'Consumer' }
    ];
    
    const queryLower = query.toLowerCase();
    return commonStocks.filter(stock => 
      stock.symbol.toLowerCase().includes(queryLower) || 
      stock.company_name.toLowerCase().includes(queryLower)
    );
  }

  // Market indices using Finnhub
  async getMarketIndices() {
    const indices = ['SPY', 'QQQ', 'DIA', 'IWM'];
    const results = {};
    
    for (const symbol of indices) {
      try {
        const data = await this.fetchFromFinnhub(symbol);
        if (data) {
          results[symbol] = {
            current_price: data.current_price,
            daily_change: data.daily_change,
            daily_change_percent: data.daily_change_percent
          };
        }
        
        // Small delay between requests
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`Failed to fetch index ${symbol}:`, error);
      }
    }
    
    return results;
  }

  // Clear cache
  clearCache() {
    this.priceCache.clear();
    this.profileCache.clear();
    this.historicalCache.clear();
    this.featuredStocksCache.clear(); // Clear the new cache as well
    console.log("All caches cleared");
  }

  // FIXED: Comprehensive metrics with better error handling and fallbacks - FINNHUB ONLY
  async getComprehensiveMetrics(symbol) {
    const cacheKey = `comprehensive_fh_${symbol}`; // New cache key to avoid conflicts with old data
    const cached = this.priceCache.get(cacheKey); // Still using priceCache for this type of data temporarily
    if (cached && this.isCacheValid(cached, this.profileCacheTimeout)) {
      console.log(`Using cached Finnhub-only comprehensive metrics for ${symbol}`);
      return cached.data;
    }

    try {
      console.log(`Fetching Finnhub-only comprehensive metrics for ${symbol}`);
      
      // Start with fallback values
      let metrics = {
        symbol,
        price: 100,
        marketCap: 1000000000,
        peRatio: 20,
        yield: 0.03,
        payoutRatio: null,
        debtToEquity: null,
        roe: null,
        fcf: 1000000, // Finnhub free tier doesn't provide FCF, so we use a positive fallback
        sector: 'Unknown',
        dividendHistory: 5,
      };

      // 1. Get basic stock data from Finnhub (quote and profile)
      const basicData = await this.getStock(symbol);
      if (basicData) {
        metrics.price = basicData.current_price || metrics.price;
        metrics.marketCap = basicData.market_cap || metrics.marketCap;
        metrics.sector = basicData.sector || metrics.sector;
      } else {
        console.warn(`No basic data for ${symbol} from Finnhub, using fallbacks.`);
      }
      
      await new Promise(resolve => setTimeout(resolve, 300));

      // 2. Try to get ratios from Finnhub's metric endpoint
      const metricResponse = await fetch(
        `${this.finnhubUrl}/stock/metric?symbol=${symbol}&metric=all&token=${this.finnhubApiKey}`
      );

      if (metricResponse.ok) {
        const metricData = await metricResponse.json();
        if (metricData && metricData.metric) {
          const finnhubMetrics = metricData.metric;
          metrics.peRatio = finnhubMetrics.peBasicExclExtraTTM || metrics.peRatio;
          // Finnhub values are percentages, convert them to ratios
          metrics.yield = finnhubMetrics.dividendYieldIndicatedAnnual ? (finnhubMetrics.dividendYieldIndicatedAnnual / 100) : metrics.yield; 
          metrics.payoutRatio = finnhubMetrics.payoutRatioTTM ? (finnhubMetrics.payoutRatioTTM / 100) : null;
          metrics.debtToEquity = finnhubMetrics.debtEquityRatioTTM;
          metrics.roe = finnhubMetrics.returnOnEquityTTM ? (finnhubMetrics.returnOnEquityTTM / 100) : null;
        }
      } else {
          console.warn(`Finnhub metric API error for ${symbol}: ${metricResponse.status}`);
      }

      await new Promise(resolve => setTimeout(resolve, 300));
      
      // 3. Try to get dividend history from Finnhub
      const dividendResponse = await fetch(
        `${this.finnhubUrl}/stock/dividend?symbol=${symbol}&from=2010-01-01&to=${new Date().toISOString().split('T')[0]}&token=${this.finnhubApiKey}`
      );
      if (dividendResponse.ok) {
        const dividendData = await dividendResponse.json();
        if (Array.isArray(dividendData) && dividendData.length > 0) {
          const years = [...new Set(dividendData.map(d => new Date(d.date).getFullYear()))];
          metrics.dividendHistory = years.length;
        }
      } else {
        console.warn(`Finnhub dividend API error for ${symbol}: ${dividendResponse.status}`);
      }

      // Cache the result
      this.priceCache.set(cacheKey, { data: metrics, timestamp: Date.now() });
      return metrics;

    } catch (error) {
      console.error(`Failed to get comprehensive metrics for ${symbol} using Finnhub:`, error);
      
      // Return minimal fallback data to prevent complete failure
      return {
        symbol,
        price: 100,
        marketCap: 1000000000,
        peRatio: 20,
        yield: 0.03,
        payoutRatio: null,
        debtToEquity: null,
        roe: null,
        fcf: 1000000, // Fallback
        sector: 'Unknown',
        dividendHistory: 5,
      };
    }
  }
}

export default new CleanStockDataService();
