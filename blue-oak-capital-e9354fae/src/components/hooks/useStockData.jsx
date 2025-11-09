
import { useState, useEffect, useCallback } from 'react';
import CleanStockDataService from '../services/CleanStockDataService';

// Hook for managing the global featured stocks watchlist
export function useWatchlist(initialData = [], initialLoading = true) {
  const [stocks, setStocks] = useState(initialData);
  const [loading, setLoading] = useState(initialLoading);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchStocks = useCallback(async (forceRefresh = false) => {
    try {
      setError(null);
      setLoading(true);
      const stockData = await CleanStockDataService.getFeaturedStocks(forceRefresh);
      setStocks(stockData);
      setLastUpdated(new Date());
      
      if (stockData.length === 0) {
        setError('No featured stock data available. Please try again later.');
      }
    } catch (err) {
      console.error('Error fetching featured stocks data:', err);
      setError('Failed to fetch market data. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  const refresh = useCallback(() => {
    fetchStocks(true); // Force a refresh, ignoring the cache
  }, [fetchStocks]);

  useEffect(() => {
    // Fetch only if initial data is not provided or empty
    if (stocks.length === 0 && initialLoading === true) { // Also check initialLoading to prevent immediate refetch if initial data comes from cache
        fetchStocks();
    }

    // Set up periodic refresh (every 60 minutes as per new requirement)
    const interval = setInterval(() => fetchStocks(false), 3600000); // 3600000ms = 60 minutes

    return () => clearInterval(interval);
  }, [fetchStocks, stocks.length, initialLoading]);

  return {
    stocks,
    loading,
    error,
    lastUpdated,
    refresh
  };
}

// Hook for market data (indices)
export function useMarketData() {
  const [indices, setIndices] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchMarketData = useCallback(async () => {
    try {
      setError(null);
      const marketData = await CleanStockDataService.getMarketIndices();
      setIndices(marketData);
    } catch (err) {
      console.error('Error fetching market data:', err);
      setError('Failed to fetch market indices.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMarketData();

    // Refresh market data every 5 minutes
    const interval = setInterval(fetchMarketData, 300000);

    return () => clearInterval(interval);
  }, [fetchMarketData]);

  return {
    indices,
    loading,
    error,
    refresh: fetchMarketData
  };
}

// Hook for individual stock data
export function useStock(symbol) {
  const [stock, setStock] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchStock = useCallback(async () => {
    if (!symbol) {
      setLoading(false);
      return;
    }

    try {
      setError(null);
      setLoading(true);
      const stockData = await CleanStockDataService.getStock(symbol);
      setStock(stockData);
    } catch (err) {
      console.error(`Error fetching stock data for ${symbol}:`, err);
      setError(`Failed to fetch data for ${symbol}`);
    } finally {
      setLoading(false);
    }
  }, [symbol]);

  useEffect(() => {
    fetchStock();
  }, [fetchStock]);

  return {
    stock,
    loading,
    error,
    refresh: fetchStock
  };
}
