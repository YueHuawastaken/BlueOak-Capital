

import React from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { 
  LayoutDashboard, 
  Calculator, 
  PiggyBank, 
  Target, // Replaced TrendingUp with Target
  User,
  Menu,
  X,
  BookOpen
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

const navigationItems = [
  {
    title: "Dashboard",
    url: createPageUrl("Dashboard"),
    icon: LayoutDashboard,
  },
  {
    title: "Buffett Analysis",
    url: createPageUrl("BuffettAnalysis"),
    icon: BookOpen,
  },
  {
    title: "Intrinsic Calculator",
    url: createPageUrl("Calculator"),
    icon: Calculator,
  },
  {
    title: "Dividend Planner",
    url: createPageUrl("DividendPlanner"),
    icon: PiggyBank,
  },
  {
    title: "Goal Calculator", // Changed from "Portfolio"
    url: createPageUrl("TradingGoalCalculator"), // Changed URL
    icon: Target, // Changed icon
  },
];

export default function Layout({ children, currentPageName }) {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Desktop Sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-72 lg:flex-col">
        <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-white border-r border-slate-200 px-6 pb-4">
          <div className="flex h-16 shrink-0 items-center">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center">
                <Target className="w-6 h-6 text-white" /> {/* Changed icon */}
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900">BlueOak</h1>
                <p className="text-xs text-slate-500">Investment Platform</p>
              </div>
            </div>
          </div>
          <nav className="flex flex-1 flex-col">
            <ul className="flex flex-1 flex-col gap-y-2">
              {navigationItems.map((item) => (
                <li key={item.title}>
                  <Link
                    to={item.url}
                    className={`group flex gap-x-3 rounded-lg p-3 text-sm font-medium leading-6 transition-all duration-200 ${
                      location.pathname === item.url
                        ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-600'
                        : 'text-slate-700 hover:text-blue-700 hover:bg-slate-50'
                    }`}
                  >
                    <item.icon className="h-5 w-5 shrink-0" />
                    {item.title}
                  </Link>
                </li>
              ))}
            </ul>
            <div className="mt-auto pt-4 border-t border-slate-200">
              <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors duration-200">
                <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center">
                  <User className="w-4 h-4 text-slate-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">Investment Pro</p>
                  <p className="text-xs text-slate-500 truncate">Premium Account</p>
                </div>
              </div>
            </div>
          </nav>
        </div>
      </div>

      {/* Mobile menu button */}
      <div className="sticky top-0 z-40 flex items-center gap-x-6 bg-white px-4 py-4 shadow-sm lg:hidden">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setMobileMenuOpen(true)}
        >
          <Menu className="h-6 w-6" />
        </Button>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center">
            <Target className="w-4 h-4 text-white" /> {/* Changed icon */}
          </div>
          <h1 className="text-lg font-bold text-slate-900">BlueOak</h1>
        </div>
      </div>

      {/* Mobile sidebar */}
      {mobileMenuOpen && (
        <div className="relative z-50 lg:hidden">
          <div className="fixed inset-0 bg-slate-900/80" onClick={() => setMobileMenuOpen(false)} />
          <div className="fixed inset-0 flex">
            <div className="relative mr-16 flex w-full max-w-xs flex-1">
              <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-white px-6 pb-4">
                <div className="flex h-16 shrink-0 items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center">
                      <Target className="w-4 h-4 text-white" /> {/* Changed icon */}
                    </div>
                    <h1 className="text-lg font-bold text-slate-900">BlueOak</h1>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <X className="h-5 w-5" />
                  </Button>
                </div>
                <nav className="flex flex-1 flex-col">
                  <ul className="flex flex-1 flex-col gap-y-2">
                    {navigationItems.map((item) => (
                      <li key={item.title}>
                        <Link
                          to={item.url}
                          onClick={() => setMobileMenuOpen(false)}
                          className={`group flex gap-x-3 rounded-lg p-3 text-sm font-medium leading-6 transition-all duration-200 ${
                            location.pathname === item.url
                              ? 'bg-blue-50 text-blue-700'
                              : 'text-slate-700 hover:text-blue-700 hover:bg-slate-50'
                          }`}
                        >
                          <item.icon className="h-5 w-5 shrink-0" />
                          {item.title}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </nav>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="lg:pl-72">
        <main className="min-h-screen">
          {children}
        </main>
      </div>
    </div>
  );
}

