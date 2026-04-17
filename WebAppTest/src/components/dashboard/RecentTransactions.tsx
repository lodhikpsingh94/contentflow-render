import React from "react";
import { ArrowUpRight, ArrowDownLeft, Clock } from "lucide-react";

export default function RecentTransactions({ transactions = [] }) {
  const mockTransactions = transactions.length ? transactions : [
    {
      id: 1,
      description: "Starbucks Coffee",
      merchant: "Starbucks",
      amount: -4.95,
      type: "debit",
      category: "food",
      date: new Date().toISOString(),
      status: "completed"
    },
    {
      id: 2,
      description: "Salary Deposit",
      merchant: "Tech Corp",
      amount: 3500.00,
      type: "credit",
      category: "salary",
      date: new Date(Date.now() - 86400000).toISOString(),
      status: "completed"
    },
    {
      id: 3,
      description: "Netflix Subscription",
      merchant: "Netflix",
      amount: -15.99,
      type: "debit",
      category: "entertainment",
      date: new Date(Date.now() - 172800000).toISOString(),
      status: "completed"
    },
    {
      id: 4,
      description: "Amazon Purchase",
      merchant: "Amazon",
      amount: -89.99,
      type: "debit",
      category: "shopping",
      date: new Date(Date.now() - 259200000).toISOString(),
      status: "pending"
    }
  ];

  const getCategoryColor = (category) => {
    const colors = {
      food: "bg-orange-100 text-orange-700",
      salary: "bg-green-100 text-green-700",
      entertainment: "bg-purple-100 text-purple-700",
      shopping: "bg-blue-100 text-blue-700",
      transport: "bg-yellow-100 text-yellow-700",
      bills: "bg-red-100 text-red-700",
      transfer: "bg-gray-100 text-gray-700",
      investment: "bg-indigo-100 text-indigo-700"
    };
    return colors[category] || "bg-gray-100 text-gray-700";
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="mx-4 mb-6">
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Recent Transactions</h3>
          <button className="text-blue-600 text-sm font-medium hover:text-blue-700 transition-colors">
            See All
          </button>
        </div>
        
        <div className="space-y-4">
          {mockTransactions.map((transaction) => (
            <div key={transaction.id} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-xl transition-colors">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  transaction.amount > 0 ? "bg-green-100" : "bg-red-100"
                }`}>
                  {transaction.amount > 0 ? (
                    <ArrowDownLeft className="w-5 h-5 text-green-600" />
                  ) : (
                    <ArrowUpRight className="w-5 h-5 text-red-600" />
                  )}
                </div>
                <div>
                  <p className="font-medium text-gray-900">{transaction.merchant}</p>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-1 rounded-full ${getCategoryColor(transaction.category)}`}>
                      {transaction.category}
                    </span>
                    {transaction.status === "pending" && (
                      <span className="flex items-center gap-1 text-xs text-gray-500">
                        <Clock className="w-3 h-3" />
                        Pending
                      </span>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="text-right">
                <p className={`font-semibold ${
                  transaction.amount > 0 ? "text-green-600" : "text-gray-900"
                }`}>
                  {transaction.amount > 0 ? "+" : ""}${Math.abs(transaction.amount).toFixed(2)}
                </p>
                <p className="text-xs text-gray-500">{formatDate(transaction.date)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}