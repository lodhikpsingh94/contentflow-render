import React, { useEffect, useRef } from 'react';

interface BannerSlideProps {
  banner: any;
  children: React.ReactNode;
  onImpression: (banner: any) => void;
  onClick: (banner: any) => void;
  className?: string;
}

export default function BannerSlide({ banner, children, onImpression, onClick, className }: BannerSlideProps) {
  const bannerRef = useRef<HTMLDivElement>(null);
  const impressionSentRef = useRef(false);

  useEffect(() => {
    const currentRef = bannerRef.current;
    if (!currentRef) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        // 1. If banner enters the view (is visible > 50%)
        if (entry.isIntersecting) {
          if (!impressionSentRef.current) {
            onImpression(banner);
            impressionSentRef.current = true; // Mark as sent
          }
        } 
        // 2. If banner leaves the view
        else {
          // RESET the flag so it can fire again next time it scrolls into view
          impressionSentRef.current = false;
        }
      },
      {
        root: null, // Viewport
        threshold: 0.6, // Trigger when 60% of the banner is visible
      }
    );

    observer.observe(currentRef);

    return () => {
      observer.unobserve(currentRef);
    };
  }, [banner, onImpression]);

  return (
    <div ref={bannerRef} className={className} onClick={() => onClick(banner)}>
      {children}
    </div>
  );
}