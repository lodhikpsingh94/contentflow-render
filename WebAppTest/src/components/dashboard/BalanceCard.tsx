import React, { useState } from "react";
import { Eye, EyeOff, TrendingUp, TrendingDown } from "lucide-react";

export default function BalanceCard({ balance = 12547.89, previousBalance = 11890.45 }) {
  const [showBalance, setShowBalance] = useState(true);
  const difference = balance - previousBalance;
  const percentChange = ((difference / previousBalance) * 100).toFixed(1);
  const isPositive = difference > 0;

  return (
    <div className="mx-4 mb-6">
      <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl p-6 text-white relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-blue-100 text-sm font-medium">Total Balance</p>
              <div className="flex items-center gap-3">
                <h2 className="text-3xl font-bold">
                  {showBalance ? `$${balance.toLocaleString()}` : "••••••"}
                </h2>
                <button
                  onClick={() => setShowBalance(!showBalance)}
                  className="text-blue-200 hover:text-white transition-colors"
                >
                  {showBalance ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <div className={`flex items-center gap-1 px-2 py-1 rounded-lg ${
              isPositive ? "bg-green-500/20" : "bg-red-500/20"
            }`}>
              {isPositive ? (
                <TrendingUp className="w-3 h-3 text-green-300" />
              ) : (
                <TrendingDown className="w-3 h-3 text-red-300" />
              )}
              <span className={`text-xs font-medium ${
                isPositive ? "text-green-300" : "text-red-300"
              }`}>
                {isPositive ? "+" : ""}{percentChange}%
              </span>
            </div>
            <p className="text-blue-200 text-sm">vs last month</p>
          </div>
        </div>
        
        {/* Decorative Elements */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16"></div>
        <div className="absolute bottom-0 left-0 w-20 h-20 bg-white/5 rounded-full translate-y-10 -translate-x-10"></div>
      </div>
    </div>
  );
}