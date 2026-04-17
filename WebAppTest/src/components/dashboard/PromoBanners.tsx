import React, { useState, useEffect } from "react";
import BannerSlide from './BannerSlide'; 
import { ChevronLeft, ChevronRight, Gift, ArrowRight } from "lucide-react";

export default function PromoBanners() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoScrolling, setIsAutoScrolling] = useState(true); // Control auto-scroll state
  const [banners, setBanners] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // --- 1. FETCH DATA ---
  useEffect(() => {
    const fetchBanners = async () => {
      const BannerSDK = (window as any).BannerSDK;

      if (!BannerSDK) {
        setLoading(false);
        return;
      }

      try {
        const sdk = BannerSDK.getInstance();
        const bannerData = await sdk.getActiveBanners("dashboard_top");
        
        if (bannerData && Array.isArray(bannerData)) {
          console.log("Banners loaded:", bannerData);
          setBanners(bannerData);
        }
      } catch (error) {
        console.error("SDK fetch error:", error);
      } finally {
        setLoading(false);
      }
    };

    setTimeout(fetchBanners, 500);
  }, []);

  // --- 2. AUTO SCROLL LOGIC ---
  useEffect(() => {
    // Only scroll if we have > 1 banner and auto-scroll is enabled
    if (!isAutoScrolling || banners.length <= 1) return;
    
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % banners.length);
    }, 4000); // Scroll every 4 seconds

    return () => clearInterval(interval);
  }, [isAutoScrolling, banners.length]);

  // --- 3. TRACKING ---
  const handleBannerClick = (banner: any) => {
    const BannerSDK = (window as any).BannerSDK;
    if (BannerSDK) {
        BannerSDK.getInstance().trackEvent('BANNER_CLICK', banner.id, {
            campaignId: banner.campaignId
        });
    }
    if (banner.actionUrl) window.open(banner.actionUrl, '_blank');
  };

  const handleBannerImpression = (banner: any) => {
    const BannerSDK = (window as any).BannerSDK;
    if (BannerSDK) {
        BannerSDK.getInstance().trackEvent('BANNER_IMPRESSION', banner.id, {
            campaignId: banner.campaignId
        });
        console.log(`Impression tracked for: ${banner.title}`);
    }
  };

  // --- 4. NAVIGATION ---
  const goToPrevious = () => {
    // setIsAutoScrolling(false); // Optional: Stop scrolling on manual nav
    setCurrentIndex((prev) => (prev - 1 + banners.length) % banners.length);
  };

  const goToNext = () => {
    // setIsAutoScrolling(false); // Optional: Stop scrolling on manual nav
    setCurrentIndex((prev) => (prev + 1) % banners.length);
  };

  // --- 5. RENDER CONTENT HELPER ---
  const renderBannerContent = (banner: any) => {
    const hasImage = !!banner.imageUrl;
    const hasTitle = !!banner.title;
    const hasDesc = !!banner.description;
    const hasCTA = !!banner.ctaText;

    const meta = banner.metadata || {};
    const rawBgColor = meta.styleColor || meta.bannerColor;
    const bgClass = !rawBgColor ? "bg-gradient-to-r from-blue-600 to-purple-600" : "";
    const bgStyle = rawBgColor ? { background: rawBgColor } : {};

    const ctaBg = meta.ctaBg || "bg-white";
    const ctaTextCol = meta.ctaTextCol || "text-gray-900";
    const ctaStyle = {
        ...(meta.ctaBg?.startsWith('#') ? { backgroundColor: meta.ctaBg } : {}),
        ...(meta.ctaTextCol?.startsWith('#') ? { color: meta.ctaTextCol } : {})
    };

    // SCENARIO 1: IMAGE ONLY
    if (hasImage && !hasTitle && !hasDesc && !hasCTA) {
      return (
        <div className="relative w-full h-48 rounded-2xl overflow-hidden cursor-pointer group">
          <img src={banner.imageUrl} alt="Promo" className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
        </div>
      );
    }

    // SCENARIO 2: IMAGE + OVERLAY
    if (hasImage) {
      return (
        <div className="relative h-48 w-full rounded-2xl overflow-hidden cursor-pointer group">
          <img src={banner.imageUrl} alt={banner.title} className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
          <div className="relative z-10 h-full flex flex-col justify-center px-8 w-full md:w-2/3">
            {hasTitle && <h3 className="text-2xl font-bold text-white mb-2 leading-tight drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]">{banner.title}</h3>}
            {hasDesc && <p className="text-sm text-white font-medium mb-5 line-clamp-2 drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]">{banner.description}</p>}
            {hasCTA && (
              <div>
                <button className={`px-5 py-2.5 rounded-xl text-sm font-bold shadow-lg hover:brightness-110 transition-all transform hover:-translate-y-0.5 flex items-center gap-2 inline-flex ${!meta.ctaBg?.startsWith('#') ? ctaBg : ''} ${!meta.ctaTextCol?.startsWith('#') ? ctaTextCol : ''}`} style={ctaStyle}>
                  {banner.ctaText} <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      );
    }

    // SCENARIO 3: TEXT ONLY
    return (
      <div className={`h-48 rounded-2xl p-8 text-white relative overflow-hidden cursor-pointer flex flex-col justify-center items-start ${bgClass}`} style={bgStyle}>
        <div className="relative z-10 max-w-lg">
          {hasTitle && <h3 className="text-2xl font-bold mb-2">{banner.title}</h3>}
          {hasDesc && <p className="text-base opacity-90 mb-6">{banner.description}</p>}
          {hasCTA && (
            <button className={`px-6 py-2.5 rounded-xl text-sm font-bold shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5 ${!meta.ctaBg?.startsWith('#') ? ctaBg : ''} ${!meta.ctaTextCol?.startsWith('#') ? ctaTextCol : ''}`} style={ctaStyle}>
              {banner.ctaText}
            </button>
          )}
        </div>
        <div className="absolute bottom-0 right-0 w-48 h-48 bg-white/10 rounded-full translate-y-10 translate-x-10"></div>
      </div>
    );
  };

  // --- RENDER COMPONENT ---
  if (loading) return <div className="mx-4 mb-6 h-48 bg-gray-100 rounded-2xl animate-pulse"></div>;
  if (banners.length === 0) return null;

  return (
    <div 
      className="relative mx-4 mb-6 group"
      // Stop scrolling when mouse enters, Resume when mouse leaves
      onMouseEnter={() => setIsAutoScrolling(false)}
      onMouseLeave={() => setIsAutoScrolling(true)}
    >
      <div className="overflow-hidden rounded-2xl shadow-lg">
        <div 
          className="flex transition-transform duration-500 ease-in-out h-48"
          style={{ transform: `translateX(-${currentIndex * 100}%)` }}
        >
          {banners.map((banner, index) => (
            <BannerSlide
              key={banner.id || index}
              banner={banner}
              onImpression={handleBannerImpression}
              onClick={handleBannerClick}
              className="min-w-full h-full"
            >
              {renderBannerContent(banner)}
            </BannerSlide>
          ))}
        </div>
      </div>

      {banners.length > 1 && (
        <>
          <button onClick={goToPrevious} className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/20 backdrop-blur-md rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/40">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button onClick={goToNext} className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/20 backdrop-blur-md rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/40">
            <ChevronRight className="w-5 h-5" />
          </button>
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex space-x-2 z-20">
            {banners.map((_, idx) => (
              <div key={idx} className={`w-2 h-2 rounded-full transition-all duration-300 ${idx === currentIndex ? 'bg-white w-6' : 'bg-white/50'}`} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}