const mongoose = require('mongoose');

const analyticsEventSchema = new mongoose.Schema({
  // Event identification
  eventId: {
    type: String,
    required: true,
    unique: true
  },
  eventType: {
    type: String,
    required: true,
    enum: [
      'BANNER_IMPRESSION',
      'BANNER_CLICK',
      'VIDEO_PLAY',
      'VIDEO_COMPLETE',
      'POPUP_SHOWN',
      'POPUP_DISMISSED',
      'PUSH_RECEIVED',
      'PUSH_OPENED'
    ]
  },
  
  // Content reference
  contentId: String,
  campaignId: String,
  placementId: String,
  
  // User information
  userId: String,
  sessionId: {
    type: String,
    required: true
  },
  
  // Device information
  deviceInfo: {
    platform: String,
    osVersion: String,
    deviceModel: String,
    sdkVersion: String,
    screenResolution: String,
    networkType: String,
    locale: String,
    userAgent: String,
    browser: String,
    browserVersion: String
  },
  
  // Event data
  eventData: mongoose.Schema.Types.Mixed,
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  
  // Geolocation
  ipAddress: String,
  country: String,
  region: String,
  city: String,
  
  // Performance metrics
  loadTime: Number,
  responseTime: Number,
  
  // Status
  processed: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Index for analytics queries
analyticsEventSchema.index({ eventType: 1, timestamp: 1 });
analyticsEventSchema.index({ campaignId: 1, timestamp: 1 });
analyticsEventSchema.index({ sessionId: 1 });
analyticsEventSchema.index({ userId: 1 });

// Static method for event aggregation
analyticsEventSchema.statics.getCampaignStats = function(campaignId, startDate, endDate) {
  return this.aggregate([
    {
      $match: {
        campaignId,
        timestamp: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: '$eventType',
        count: { $sum: 1 },
        uniqueUsers: { $addToSet: '$userId' },
        uniqueSessions: { $addToSet: '$sessionId' }
      }
    }
  ]);
};

module.exports = mongoose.model('AnalyticsEvent', analyticsEventSchema);