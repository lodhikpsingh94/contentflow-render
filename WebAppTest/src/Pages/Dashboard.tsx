import React, { useState, useEffect } from "react";
import { Transaction } from "@/entities/Transaction";
import PromoBanners from "../components/dashboard/PromoBanners";
import BalanceCard from "../components/dashboard/BalanceCard";
import QuickActions from "../components/dashboard/QuickActions";
import RecentTransactions from "../components/dashboard/RecentTransactions";
import WebSdkBanner from "../components/dashboard/WebSdkBanner"; // New component

export default function Dashboard() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTransactions();
  }, []);

  const loadTransactions = async () => {
    try {
      const data = await Transaction.list("-date", 10);
      setTransactions(data);
    } catch (error) {
      console.error("Error loading transactions:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-md mx-auto">
        {/* Welcome Message */}
        <div className="px-4 py-6">
          <h2 className="text-2xl font-bold text-gray-900">Good morning!</h2>
          <p className="text-gray-600 mt-1">Ready to manage your finances?</p>
        </div>

        {/* Balance Card */}
        <BalanceCard />

        {/* Web SDK Banner - Top placement */}
        {/* <WebSdkBanner placementId="dashboard_top" /> */}

        {/* Promo Banners */}
        <PromoBanners />

        {/* Quick Actions */}
        <QuickActions />

        {/* Web SDK Banner - Middle placement */}
        {/* <WebSdkBanner placementId="dashboard_middle" /> */}

        {/* Recent Transactions */}
        <RecentTransactions transactions={transactions} />

        {/* Web SDK Banner - Bottom placement */}
        {/* <WebSdkBanner placementId="dashboard_bottom" /> */}

        {/* Bottom Spacing for Navigation */}
        <div className="h-4"></div>
      </div>
    </div>
  );
}