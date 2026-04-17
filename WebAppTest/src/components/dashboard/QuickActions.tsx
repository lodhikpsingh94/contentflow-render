import React from "react";
import { Send, Download, CreditCard, Zap, UserCheck } from "lucide-react";

const actions = [
  { name: "Send", icon: Send, color: "bg-blue-500", bgColor: "bg-blue-50" },
  { name: "Request", icon: Download, color: "bg-green-500", bgColor: "bg-green-50" },
  { name: "Pay Bills", icon: CreditCard, color: "bg-purple-500", bgColor: "bg-purple-50" },
  // --- SDK INTEGRATION: STEP 2 ---
  // Added a new action to test the SDK
  { name: "Verify KYC", icon: UserCheck, color: "bg-teal-500", bgColor: "bg-teal-50" }
];

export default function QuickActions() {

  const handleKYCClick = () => {
    // --- SDK INTEGRATION: STEP 3 ---
    // This is how you call a function from your SDK.
    // **ACTION REQUIRED**: Replace 'AwesomeFintechSDK' and 'performKYC' 
    // with your SDK's object and function names.
    if (window.AwesomeFintechSDK) {
      alert("SDK found! Calling performKYC()...");
      window.AwesomeFintechSDK.performKYC({
        userId: "user-12345",
        onSuccess: () => alert("KYC Verification Successful!"),
        onFailure: (error) => alert(`KYC Verification Failed: ${error}`),
      });
    } else {
      alert("SDK not loaded. Please check the script URL in Layout.js.");
    }
  };

  return (
    <div className="mx-4 mb-6">
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-4 gap-4">
          {actions.map((action) => {
            const IconComponent = action.icon;
            // Assign the correct onClick handler for the new action
            const onClickHandler = action.name === "Verify KYC" ? handleKYCClick : () => {};

            return (
              <button
                key={action.name}
                onClick={onClickHandler}
                className="flex flex-col items-center p-4 rounded-2xl hover:scale-105 transition-transform duration-200"
              >
                <div className={`w-12 h-12 ${action.bgColor} rounded-2xl flex items-center justify-center mb-3`}>
                  <IconComponent className={`w-6 h-6 ${action.color.replace('bg-', 'text-')}`} />
                </div>
                <span className="text-sm font-medium text-gray-700">{action.name}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}