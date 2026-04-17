import React, { useState, useEffect } from "react";

interface WebSdkBannerProps {
  placementId: string;
  className?: string;
}

export default function WebSdkBanner({ placementId, className = "" }: WebSdkBannerProps) {
  const [banner, setBanner] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchBanner = async () => {
      if (!window.BannerSDK) {
        setError("Banner SDK not available");
        setLoading(false);
        return;
      }

      try {
        const sdk = window.BannerSDK.getInstance();
        const banners = await sdk.getActiveBanners(placementId);
        
        if (banners && banners.length > 0) {
          // Get the highest priority banner
          const highestPriorityBanner = banners.reduce((prev, current) => 
            (prev.priority > current.priority) ? prev : current
          );
          
          setBanner(highestPriorityBanner);
        }
      } catch (err) {
        setError("Failed to load banner");
        console.error("Banner loading error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchBanner();
  }, [placementId]);

  const handleBannerClick = () => {
    if (banner && window.BannerSDK) {
      try {
        const sdk = window.BannerSDK.getInstance();
        sdk.handleBannerClick(banner);
        
        // Open action URL if available
        if (banner.actionUrl) {
          window.open(banner.actionUrl, banner.openInNewTab ? '_blank' : '_self');
        }
      } catch (error) {
        console.error("Failed to handle banner click:", error);
      }
    }
  };

  if (loading) {
    return (
      <div className={`mx-4 mb-4 bg-gray-100 rounded-lg p-4 animate-pulse ${className}`}>
        <div className="h-4 bg-gray-300 rounded w-3/4 mb-2"></div>
        <div className="h-3 bg-gray-300 rounded w-1/2"></div>
      </div>
    );
  }

  if (error || !banner) {
    return null; // Don't render anything if no banner or error
  }

  return (
    <div className={`mx-4 mb-4 ${className}`}>
      <div 
        className="bg-white rounded-lg p-4 shadow-sm border border-gray-200 cursor-pointer hover:shadow-md transition-shadow"
        onClick={handleBannerClick}
      >
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h4 className="font-semibold text-gray-900 text-sm mb-1">
              {banner.title}
            </h4>
            <p className="text-gray-600 text-xs">
              {banner.description}
            </p>
          </div>
          {banner.imageUrl && (
            <div className="ml-3">
              <img 
                src={banner.imageUrl} 
                alt={banner.title}
                className="w-12 h-12 object-cover rounded"
              />
            </div>
          )}
        </div>
        
        {banner.ctaText && (
          <div className="mt-2">
            <span className="text-blue-600 text-xs font-medium">
              {banner.ctaText} →
            </span>
          </div>
        )}
      </div>
    </div>
  );
}