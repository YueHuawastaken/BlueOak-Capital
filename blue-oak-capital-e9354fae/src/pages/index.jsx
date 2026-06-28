

// src/pages/index.jsx
import Layout from "./Layout.jsx";
import Dashboard from "./Dashboard";
import Calculator from "./Calculator";
import DividendPlanner from "./DividendPlanner";
import BuffettAnalysis from "./BuffettAnalysis";
import TradingGoalCalculator from "./TradingGoalCalculator";
import ArbitragePutCallParity from "./ArbitragePut-CallParity";
import BondPricing from "./BondPricing";
import ForwardAnnuityCalculator from "./ForwardAnnuityCalculator"; // NEW

import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';

const PAGES = {
    Dashboard: Dashboard,
    Calculator: Calculator,
    DividendPlanner: DividendPlanner,
    BuffettAnalysis: BuffettAnalysis,
    TradingGoalCalculator: TradingGoalCalculator,
    ArbitragePutCallParity: ArbitragePutCallParity,
    BondPricing: BondPricing,
    ForwardAnnuityCalculator: ForwardAnnuityCalculator, // NEW
}

function _getCurrentPage(url) {
    if (url.endsWith('/')) {
        url = url.slice(0, -1);
    }
    let urlLastPart = url.split('/').pop();
    if (urlLastPart.includes('?')) {
        urlLastPart = urlLastPart.split('?')[0];
    }

    const pageName = Object.keys(PAGES).find(page => page.toLowerCase() === urlLastPart.toLowerCase());
    return pageName || Object.keys(PAGES)[0];
}

function PagesContent() {
    const location = useLocation();
    const currentPage = _getCurrentPage(location.pathname);
    
    return (
        <Layout currentPageName={currentPage}>
            <Routes>            
                <Route path="/" element={<Dashboard />} />
                <Route path="/Dashboard" element={<Dashboard />} />
                <Route path="/Calculator" element={<Calculator />} />
                <Route path="/DividendPlanner" element={<DividendPlanner />} />
                <Route path="/BuffettAnalysis" element={<BuffettAnalysis />} />
                <Route path="/TradingGoalCalculator" element={<TradingGoalCalculator />} />
                <Route path="/ArbitragePutCallParity" element={<ArbitragePutCallParity />} />
                <Route path="/BondPricing" element={<BondPricing />} />
                <Route path="/ForwardAnnuityCalculator" element={<ForwardAnnuityCalculator />} /> {/* NEW */}
            </Routes>
        </Layout>
    );
}

export default function Pages() {
    return (
        <Router>
            <PagesContent />
        </Router>
    );
}