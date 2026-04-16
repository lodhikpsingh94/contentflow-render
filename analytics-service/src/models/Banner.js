const mongoose = require('mongoose');

const bannerSchema = new mongoose.Schema({
    // --- FIX START ---
  // Explicitly define _id as String to accept UUIDs from Campaign Service
  _id: {
    type: String,
    required: true
  },
  // --- FIX END ---

  // Basic information
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['IMAGE', 'VIDEO', 'POPUP', 'TEXT'],
    default: 'IMAGE'
  },
  
  // Content
  videoUrl: {
    type: String,
    required: function() {
      return this.type === 'VIDEO';
    }
  },
  thumbnailUrl: String,
  
  // Actions
  actionUrl: String,
  ctaText: {
    type: String,
    default: 'Learn More'
  },
  openInNewTab: {
    type: Boolean,
    default: true
  },
  
  // Targeting
  placementId: {
    type: String,
    required: true,
    index: true
  },
  segmentId: {
    type: String,
    required: true,
    index: true
  },
  priority: {
    type: Number,
    default: 1,
    min: 1,
    max: 10
  },
  campaignId: {
    type: String,
    required: true,
    index: true
  },
  
  // Analytics
  impressions: {
    type: Number,
    default: 0
  },
  clicks: {
    type: Number,
    default: 0
  },
  conversionRate: Number,
  
}, {
  timestamps: true,
  _id: false // Disable auto-generation of _id since we provide it
});

// Index for active banners by placement
bannerSchema.index({ 
  placementId: 1, 
  startDate: 1, 
  endDate: 1 
});

module.exports = mongoose.model('Banner', bannerSchema);