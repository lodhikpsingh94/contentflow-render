import React from "react";
import { TrendingUp, PieChart, BarChart3, DollarSign } from "lucide-react";

export default function Analytics() {
  const categories = [
    { name: "Food & Dining", amount: 1247, percentage: 28, color: "bg-orange-500" },
    { name: "Shopping", amount: 892, percentage: 20, color: "bg-blue-500" },
    { name: "Transportation", amount: 654, percentage: 15, color: "bg-green-500" },
    { name: "Entertainment", amount: 543, percentage: 12, color: "bg-purple-500" },
    { name: "Bills", amount: 1100, percentage: 25, color: "bg-red-500" }
  ];

  return (
    <div className="min-h-screen bg-gray-50 pt-6">
      <div className="max-w-md mx-auto">
        <div className="px-4 mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Analytics</h2>
          <p className="text-gray-600 mt-1">Your spending insights</p>
        </div>

        {/* Monthly Summary */}
        <div className="mx-4 mb-6">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">This Month</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-green-50 rounded-xl">
                <TrendingUp className="w-8 h-8 text-green-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-gray-900">$3,247</p>
                <p className="text-sm text-gray-600">Income</p>
              </div>
              <div className="text-center p-4 bg-red-50 rounded-xl">
                <DollarSign className="w-8 h-8 text-red-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-gray-900">$4,436</p>
                <p className="text-sm text-gray-600">Expenses</p>
              </div>
            </div>
          </div>
        </div>

        {/* Spending by Category */}
        <div className="mx-4 mb-6">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 mb-4">
              <PieChart className="w-5 h-5 text-blue-600" />
              <h3 className="text-lg font-semibold text-gray-900">Spending by Category</h3>
            </div>
            
            <div className="space-y-4">
              {categories.map((category, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-4 h-4 ${category.color} rounded-full`}></div>
                    <span className="text-gray-700">{category.name}</span>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">${category.amount}</p>
                    <p className="text-sm text-gray-500">{category.percentage}%</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Weekly Trend */}
        <div className="mx-4 mb-6">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="w-5 h-5 text-green-600" />
              <h3 className="text-lg font-semibold text-gray-900">Weekly Spending</h3>
            </div>
            
            <div className="flex items-end justify-between h-32">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, index) => {
                const heights = [60, 80, 45, 90, 70, 35, 55];
                return (
                  <div key={day} className="flex flex-col items-center gap-2">
                    <div 
                      className="bg-blue-500 rounded-t-lg w-6 transition-all duration-300"
                      style={{ height: `${heights[index]}px` }}
                    ></div>
                    <span className="text-xs text-gray-500">{day}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="h-4"></div>
      </div>
    </div>
  );
}