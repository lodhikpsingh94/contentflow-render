export const BannerSDK = {
  initialize: (config: any) => {
    console.log('Banner SDK initialized with config:', config);
    return BannerSDK;
  },
  getInstance: () => BannerSDK,
  getActiveBanners: async (placementId: string) => {
    console.log('Fetching banners for placement:', placementId);
    // Mock banners
    return [
      {
        id: '1',
        title: 'Special Offer',
        description: 'Get 5% cashback on all purchases',
        priority: 1,
        actionUrl: 'https://example.com/offer',
        ctaText: 'Claim Now',
        imageUrl: 'https://via.placeholder.com/300x150',
        campaignType: 'cashback'
      }
    ];
  },
  handleBannerClick: (banner: any) => {
    console.log('Banner click tracked:', banner);
  }
};

// Make available globally for components
if (typeof window !== 'undefined') {
  window.BannerSDK = BannerSDK;
}