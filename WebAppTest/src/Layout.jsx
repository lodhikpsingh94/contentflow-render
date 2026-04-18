import React, { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Home, CreditCard, TrendingUp, User, Bell, FlaskConical } from "lucide-react";

export default function Layout({ children }) {
  const location = useLocation();
  
  const navigationItems = [
    { name: "Home", icon: Home, path: createPageUrl("Dashboard") },
    { name: "Cards", icon: CreditCard, path: createPageUrl("Cards") },
    { name: "Analytics", icon: TrendingUp, path: createPageUrl("Analytics") },
    { name: "Profile", icon: User, path: createPageUrl("Profile") },
    { name: "Test", icon: FlaskConical, path: createPageUrl("CampaignTest") },
  ];

  useEffect(() => {
    const initApp = async () => {
      // 1. Ensure User ID exists (simulate a logged-in user)
      let userId = localStorage.getItem('user_id');
      if (!userId) {
        userId = `user_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        localStorage.setItem('user_id', userId);
        console.log('New persistent user ID generated:', userId);
      } else {
        console.log('Existing user ID found:', userId);
      }

      // 2. Initialize Banner SDK
      // We use a polling mechanism to ensure the external script (/sdk.js) is loaded
      const checkAndInitSDK = () => {
        // Access the global object set by the SDK build
        if (window.BannerSDK) {
          try {
            // Initialize with your backend configuration
            window.BannerSDK.initialize({
              tenantId: 'tenant1', // Must match the tenantId in your MongoDB seed data
              apiKey: 'tenant1_key_123', // Optional if your API allows unauthenticated access for testing
              // In development the Vite proxy forwards /api → api-service, so
              // http://localhost:3010 works fine.  In production (Render) the frontend
              // and api-service live on different domains, so VITE_API_BASE_URL must be
              // set to the api-service Render URL (e.g. https://contentflow-api.onrender.com).
              endpoint: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000',
              cachePolicy: 'NONE', // 'NONE' for debugging, 'MODERATE' for production
              analyticsSamplingRate: 1.0,
              flushInterval: 10000, // Flush every 10 seconds
              batchSize: 10,        // Or flush when 10 events accumulate
            });

            // 3. Identify the user to the SDK
            // This triggers context setup and prepares the SDK for personalization
            window.BannerSDK.getInstance().identify(userId);
            
            console.log("✅ Banner SDK Initialized & User Identified successfully.");
            
          } catch (error) {
            console.error("❌ Failed to initialize Banner SDK:", error);
          }
        } else {
          // If script hasn't parsed yet, check again in 50ms
          console.log("Waiting for Banner SDK script to load...");
          setTimeout(checkAndInitSDK, 50);
        }
      };

      checkAndInitSDK();
    };

    initApp();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-4 py-4 sticky top-0 z-50">
        <div className="flex items-center justify-between max-w-md mx-auto">
          <div>
            <h1 className="text-xl font-bold text-gray-900">AndroBank</h1>
            <p className="text-xs text-gray-500">Your Digital Wallet</p>
          </div>
          <div className="relative">
            <Bell className="w-6 h-6 text-gray-600" />
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="pb-20">
        {children}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-4 py-2 z-50">
        <div className="max-w-md mx-auto">
          <div className="grid grid-cols-5 gap-1">
            {navigationItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.name}
                  to={item.path}
                  className={`flex flex-col items-center py-2 px-3 rounded-lg transition-colors ${
                    isActive
                      ? "text-blue-600 bg-blue-50"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  <item.icon className="w-5 h-5 mb-1" />
                  <span className="text-xs font-medium">{item.name}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </nav>
    </div>
  );
}