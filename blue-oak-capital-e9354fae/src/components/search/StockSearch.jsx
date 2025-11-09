import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, X } from 'lucide-react';
import CleanStockDataService from '../services/CleanStockDataService';
import { useDebounce } from '../hooks/useDebounce';

export default function StockSearch({ onStockSelect, initialQuery = '' }) {
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const debouncedQuery = useDebounce(query, 500);
  const searchRef = useRef(null);

  useEffect(() => {
    const fetchResults = async () => {
      if (debouncedQuery.length > 1) {
        setIsLoading(true);
        try {
          const searchResults = await CleanStockDataService.searchStocks(debouncedQuery);
          setResults(searchResults);
        } catch (error) {
          console.error('Search error:', error);
          setResults([]);
        } finally {
          setIsLoading(false);
          setActiveIndex(-1);
        }
      } else {
        setResults([]);
        setIsLoading(false);
      }
    };
    
    fetchResults();
  }, [debouncedQuery]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setIsFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (stock) => {
    setQuery(stock.company_name);
    onStockSelect(stock.symbol);
    setIsFocused(false);
    setResults([]);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((prev) => (prev < results.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev) => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === 'Enter' && activeIndex > -1) {
      e.preventDefault();
      handleSelect(results[activeIndex]);
    } else if (e.key === 'Escape') {
      setIsFocused(false);
    }
  };

  const showDropdown = isFocused && (query.length > 1);

  return (
    <div className="relative" ref={searchRef}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <Input
          type="text"
          placeholder="Search for a stock (e.g., AAPL or Apple)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onKeyDown={handleKeyDown}
          className="pl-10 pr-10"
        />
        {query && (
          <button
            onClick={() => {
              setQuery('');
              setResults([]);
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2"
          >
            <X className="w-4 h-4 text-slate-500 hover:text-slate-700" />
          </button>
        )}
      </div>

      {showDropdown && (
        <div className="absolute z-10 w-full mt-2 bg-white border border-slate-200 rounded-lg shadow-lg max-h-64 overflow-y-auto">
          {isLoading ? (
            <div className="p-2 space-y-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : results.length > 0 ? (
            <ul className="py-1">
              {results.map((stock, index) => (
                <li
                  key={stock.symbol}
                  onClick={() => handleSelect(stock)}
                  className={`px-4 py-3 cursor-pointer hover:bg-slate-100 border-b border-slate-100 last:border-b-0 ${
                    index === activeIndex ? 'bg-slate-100' : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-slate-900">{stock.symbol}</p>
                      <p className="text-sm text-slate-600 truncate max-w-64">
                        {stock.company_name}
                      </p>
                    </div>
                    {stock.sector && (
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                        {stock.sector}
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            debouncedQuery.length > 1 && !isLoading && (
              <div className="p-4 text-center text-slate-500">
                <p>No results found for "{debouncedQuery}"</p>
                <p className="text-xs mt-1">Try searching by stock symbol (e.g., AAPL) or company name</p>
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}