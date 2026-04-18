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
        // Fire once — when the banner first becomes visible.
        // Do NOT reset when it scrolls out; scrolling back should not
        // count as a new impression within the same page session.
        if (entry.isIntersecting && !impressionSentRef.current) {
          onImpression(banner);
          impressionSentRef.current = true;
          // Disconnect after firing — no need to keep observing
          observer.disconnect();
        }
      },
      {
        root: null,
        threshold: 0.6, // At least 60% visible before counting
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