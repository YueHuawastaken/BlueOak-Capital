import React from "react";
import { Button } from "@/components/ui/button";
import { Plus, Calculator, PieChart } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function QuickActions() {
  return (
    <div className="flex flex-wrap gap-3">
      <Link to={createPageUrl("Portfolio")}>
        <Button variant="outline" className="gap-2">
          <Plus className="w-4 h-4" />
          Add Investment
        </Button>
      </Link>
      <Link to={createPageUrl("Calculator")}>
        <Button variant="outline" className="gap-2">
          <Calculator className="w-4 h-4" />
          Analyze Stock
        </Button>
      </Link>
      <Link to={createPageUrl("DividendPlanner")}>
        <Button variant="outline" className="gap-2">
          <PieChart className="w-4 h-4" />
          Plan Dividends
        </Button>
      </Link>
    </div>
  );
}