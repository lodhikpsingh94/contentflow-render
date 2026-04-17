import React, { useState, useEffect } from "react";
import { Card } from "@/entities/Card";
import { Plus, CreditCard, Eye, EyeOff } from "lucide-react";

export default function Cards() {
  const [cards, setCards] = useState([]);
  const [showBalances, setShowBalances] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCards();
  }, []);

  const loadCards = async () => {
    try {
      const data = await Card.list("-created_date");
      setCards(data);
    } catch (error) {
      console.error("Error loading cards:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleBalance = (cardId) => {
    setShowBalances(prev => ({
      ...prev,
      [cardId]: !prev[cardId]
    }));
  };

  const getCardGradient = (color) => {
    const gradients = {
      blue: "from-blue-600 to-blue-700",
      purple: "from-purple-600 to-purple-700", 
      green: "from-green-600 to-green-700",
      orange: "from-orange-600 to-orange-700",
      pink: "from-pink-600 to-pink-700"
    };
    return gradients[color] || gradients.blue;
  };

  // Mock cards if none exist
  const mockCards = cards.length ? cards : [
    {
      id: "1",
      card_number: "•••• 4829",
      card_type: "debit",
      card_name: "Primary Debit",
      balance: 12547.89,
      color: "blue",
      is_primary: true
    },
    {
      id: "2", 
      card_number: "•••• 7391",
      card_type: "credit",
      card_name: "Travel Rewards",
      balance: 8450.00,
      limit: 15000.00,
      color: "purple",
      is_primary: false
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 pt-6">
      <div className="max-w-md mx-auto">
        <div className="px-4 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">My Cards</h2>
              <p className="text-gray-600 mt-1">{mockCards.length} active cards</p>
            </div>
            <button className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center hover:bg-blue-700 transition-colors">
              <Plus className="w-6 h-6 text-white" />
            </button>
          </div>
        </div>

        <div className="px-4 space-y-4">
          {mockCards.map((card) => (
            <div
              key={card.id}
              className={`bg-gradient-to-br ${getCardGradient(card.color)} rounded-2xl p-6 text-white relative overflow-hidden`}
            >
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <p className="text-white/70 text-sm">{card.card_name}</p>
                    <p className="text-lg font-mono font-bold">{card.card_number}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {card.is_primary && (
                      <span className="bg-white/20 text-xs px-2 py-1 rounded-lg">PRIMARY</span>
                    )}
                    <CreditCard className="w-6 h-6" />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white/70 text-sm mb-1">
                      {card.card_type === 'credit' ? 'Available Credit' : 'Balance'}
                    </p>
                    <div className="flex items-center gap-3">
                      <p className="text-2xl font-bold">
                        {showBalances[card.id] ? `$${card.balance.toLocaleString()}` : "••••••"}
                      </p>
                      <button
                        onClick={() => toggleBalance(card.id)}
                        className="text-white/70 hover:text-white transition-colors"
                      >
                        {showBalances[card.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {card.card_type === 'credit' && card.limit && (
                      <p className="text-white/70 text-sm mt-1">
                        Limit: ${card.limit.toLocaleString()}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-white/70 text-sm">{card.card_type.toUpperCase()}</p>
                    <p className="text-sm">CARD</p>
                  </div>
                </div>
              </div>

              {/* Decorative Elements */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16"></div>
              <div className="absolute bottom-0 left-0 w-20 h-20 bg-white/5 rounded-full translate-y-10 -translate-x-10"></div>
            </div>
          ))}
        </div>

        <div className="px-4 mt-8">
          <button className="w-full bg-white border-2 border-dashed border-gray-300 rounded-2xl py-8 flex flex-col items-center justify-center text-gray-500 hover:border-blue-300 hover:text-blue-600 transition-colors">
            <Plus className="w-8 h-8 mb-2" />
            <span className="font-medium">Add New Card</span>
            <span className="text-sm">Link your existing card</span>
          </button>
        </div>

        <div className="h-4"></div>
      </div>
    </div>
  );
}