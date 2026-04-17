import React from "react";
import { Settings, Bell, Shield, HelpCircle, LogOut, ChevronRight } from "lucide-react";

export default function Profile() {
  const menuItems = [
    { name: "Account Settings", icon: Settings, color: "text-blue-600" },
    { name: "Notifications", icon: Bell, color: "text-green-600" },
    { name: "Security", icon: Shield, color: "text-red-600" },
    { name: "Help & Support", icon: HelpCircle, color: "text-purple-600" },
  ];

  return (
    <div className="min-h-screen bg-gray-50 pt-6">
      <div className="max-w-md mx-auto">
        <div className="px-4 mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Profile</h2>
          <p className="text-gray-600 mt-1">Manage your account</p>
        </div>

        {/* Profile Card */}
        <div className="mx-4 mb-6">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center">
                <span className="text-white text-xl font-bold">JD</span>
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">John Doe</h3>
                <p className="text-gray-600">john.doe@example.com</p>
                <div className="flex items-center gap-2 mt-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm text-green-600">Verified Account</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Menu Items */}
        <div className="mx-4 mb-6">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            {menuItems.map((item, index) => {
              const IconComponent = item.icon;
              return (
                <button
                  key={item.name}
                  className={`w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors ${
                    index !== menuItems.length - 1 ? 'border-b border-gray-100' : ''
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">
                      <IconComponent className={`w-5 h-5 ${item.color}`} />
                    </div>
                    <span className="font-medium text-gray-900">{item.name}</span>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </button>
              );
            })}
          </div>
        </div>

        {/* Logout Button */}
        <div className="mx-4 mb-6">
          <button className="w-full bg-white border border-red-200 text-red-600 rounded-2xl p-4 flex items-center justify-center gap-3 hover:bg-red-50 transition-colors">
            <LogOut className="w-5 h-5" />
            <span className="font-medium">Logout</span>
          </button>
        </div>

        {/* App Info */}
        <div className="mx-4 text-center">
          <p className="text-gray-500 text-sm">AndroBank v1.0.0</p>
          <p className="text-gray-400 text-xs mt-1">Your trusted digital wallet</p>
        </div>

        <div className="h-4"></div>
      </div>
    </div>
  );
}