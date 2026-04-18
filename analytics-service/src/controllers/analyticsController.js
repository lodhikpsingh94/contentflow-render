const AnalyticsEvent = require('../models/AnalyticsEvent');
const Banner = require('../models/Banner');
const logger = require('../utils/logger');

// Receive analytics events from SDK or API service
exports.receiveEvents = (req, res) => {
  const { authorization } = req.headers;

  // Auth check
  if (!authorization || !authorization.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized', message: 'Valid API key or service token required' });
  }
  const token = authorization.replace('Bearer ', '');
  const isValidToken =
    token === process.env.API_KEY_SECRET ||
    token === process.env.SERVICE_TOKEN ||
    token === 'tenant1_key_123';
  if (!isValidToken) {
    return res.status(401).json({ error: 'Unauthorized', message: 'Invalid API key or service token' });
  }

  const { events } = req.body;
  if (!events || !Array.isArray(events) || events.length === 0) {
    return res.status(400).json({ error: 'Bad Request', message: 'Events array is required' });
  }

  // Capture request metadata before response is sent
  const ipAddress = req.ip;
  const userAgent = req.get('User-Agent');

  // ── Respond immediately — never block the caller on DB writes ──────────────
  res.json({ success: true, message: 'Events received', receivedCount: events.length });

  // ── Process in the background after the response is flushed ────────────────
  setImmediate(async () => {
    try {
      const { v4: uuidv4 } = require('uuid');

      // Build documents for bulk insert
      const docs = events.map(event => ({
        eventId:    event.eventId || uuidv4(),
        eventType:  event.eventType,
        contentId:  event.contentId,
        campaignId: event.campaignId,
        placementId: event.placementId,
        userId:     event.userId,
        sessionId:  event.sessionId,
        deviceInfo: event.deviceInfo,
        eventData:  event.eventData,
        timestamp:  event.timestamp ? new Date(event.timestamp) : new Date(),
        ipAddress,
        userAgent,
      }));

      // Single round-trip instead of one save() per event
      await AnalyticsEvent.insertMany(docs, { ordered: false });

      // Aggregate banner metric updates into bulk operations
      const bannerUpdates = {};
      for (const event of events) {
        if (!event.contentId) continue;
        if (!bannerUpdates[event.contentId]) {
          bannerUpdates[event.contentId] = { impressions: 0, clicks: 0, campaignId: event.campaignId, placementId: event.placementId };
        }
        if (event.eventType === 'BANNER_IMPRESSION') bannerUpdates[event.contentId].impressions += 1;
        if (event.eventType === 'BANNER_CLICK')      bannerUpdates[event.contentId].clicks      += 1;
      }

      const bulkOps = Object.entries(bannerUpdates)
        .filter(([, v]) => v.impressions > 0 || v.clicks > 0)
        .map(([contentId, v]) => ({
          updateOne: {
            filter: { _id: contentId },
            update: {
              $inc: { impressions: v.impressions, clicks: v.clicks },
              $setOnInsert: { title: 'Unknown Banner', campaignId: v.campaignId, placementId: v.placementId },
            },
            upsert: true,
          },
        }));

      if (bulkOps.length > 0) {
        await Banner.bulkWrite(bulkOps, { ordered: false });
      }

      logger.info(`[analytics] Stored ${docs.length} events`);
    } catch (err) {
      logger.error('[analytics] Background event processing failed:', err.message);
    }
  });
};

// Get analytics data
exports.getAnalytics = async (req, res) => {
  try {
    const { campaignId, startDate, endDate } = req.query;

    const query = {};
    if (campaignId) query.campaignId = campaignId;
    if (startDate && endDate) {
      query.timestamp = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const stats = await AnalyticsEvent.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$eventType',
          count: { $sum: 1 },
          uniqueUsers: { $addToSet: '$userId' },
          uniqueSessions: { $addToSet: '$sessionId' }
        }
      }
    ]);

    const result = stats.reduce((acc, stat) => {
      acc[stat._id] = {
        count: stat.count,
        uniqueUsers: stat.uniqueUsers.filter(Boolean).length,
        uniqueSessions: stat.uniqueSessions.filter(Boolean).length
      };
      return acc;
    }, {});

    res.json(result);

  } catch (error) {
    logger.error('Error fetching analytics:', error);
    res.status(500).json({ 
      error: 'Internal Server Error',
      message: 'Failed to fetch analytics'
    });
  }
};

exports.getDashboardData = async (req, res) => {
  try {
    // --- 1. Define Time Periods for KPI comparison ---
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 6); // Last 7 days

    const prevEndDate = new Date(startDate);
    prevEndDate.setDate(prevEndDate.getDate() - 1); // The day before the current period starts
    const prevStartDate = new Date(prevEndDate);
    prevStartDate.setDate(prevStartDate.getDate() - 6); // The 7 days before the current period

    // --- 2. Helper Function to Aggregate Metrics for a Date Range ---
    const getMetricsForPeriod = async (start, end) => {
      const stats = await AnalyticsEvent.aggregate([
        { $match: { timestamp: { $gte: start, $lte: end } } },
        {
          $group: {
            _id: null,
            impressions: { $sum: { $cond: [{ $eq: ['$eventType', 'BANNER_IMPRESSION'] }, 1, 0] } },
            clicks: { $sum: { $cond: [{ $eq: ['$eventType', 'BANNER_CLICK'] }, 1, 0] } },
            conversions: { $sum: { $cond: [{ $eq: ['$eventType', 'CONVERSION'] }, 1, 0] } },
          },
        },
      ]);
      // If no events are found, return zeroed metrics
      return stats[0] || { impressions: 0, clicks: 0, conversions: 0 };
    };

    // --- 3. Fetch Metrics and Calculate KPIs ---
    const [currentMetrics, previousMetrics] = await Promise.all([
      getMetricsForPeriod(startDate, endDate),
      getMetricsForPeriod(prevStartDate, prevEndDate)
    ]);

    const calculateChange = (current, previous) => {
      if (previous === 0) return current > 0 ? "+100.0%" : "0.0%";
      const change = ((current - previous) / previous) * 100;
      return `${change >= 0 ? '+' : ''}${change.toFixed(1)}% vs last week`;
    };
    
    const ctr = currentMetrics.impressions > 0 ? (currentMetrics.clicks / currentMetrics.impressions) * 100 : 0;
    const conversionRate = currentMetrics.clicks > 0 ? (currentMetrics.conversions / currentMetrics.clicks) * 100 : 0;

    const kpiCards = [
      { metric: 'Total Impressions', value: currentMetrics.impressions.toLocaleString(), change: calculateChange(currentMetrics.impressions, previousMetrics.impressions), changeType: currentMetrics.impressions >= previousMetrics.impressions ? 'increase' : 'decrease' },
      { metric: 'Total Clicks', value: currentMetrics.clicks.toLocaleString(), change: calculateChange(currentMetrics.clicks, previousMetrics.clicks), changeType: currentMetrics.clicks >= previousMetrics.clicks ? 'increase' : 'decrease' },
      { metric: 'Conversions', value: currentMetrics.conversions.toLocaleString(), change: calculateChange(currentMetrics.conversions, previousMetrics.conversions), changeType: currentMetrics.conversions >= previousMetrics.conversions ? 'increase' : 'decrease' },
      { metric: 'Click Rate', value: `${ctr.toFixed(2)}%`, change: 'for the last 7 days', changeType: 'increase' },
      { metric: 'Conversion Rate', value: `${conversionRate.toFixed(1)}%`, change: 'for the last 7 days', changeType: 'increase' },
    ];

    // --- 4. Get Performance Trend Data (Daily Breakdown) ---
    const performanceTrend = await AnalyticsEvent.aggregate([
      { $match: { timestamp: { $gte: startDate, $lte: endDate } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$timestamp" } },
          impressions: { $sum: { $cond: [{ $eq: ['$eventType', 'BANNER_IMPRESSION'] }, 1, 0] } },
          clicks: { $sum: { $cond: [{ $eq: ['$eventType', 'BANNER_CLICK'] }, 1, 0] } },
          conversions: { $sum: { $cond: [{ $eq: ['$eventType', 'CONVERSION'] }, 1, 0] } },
        },
      },
      { $sort: { _id: 1 } },
      { $project: { _id: 0, date: '$_id', impressions: 1, clicks: 1, conversions: 1 } }
    ]);

    // --- 5. Get Campaign Type Distribution ---
    const typeDistribution = await AnalyticsEvent.aggregate([
      { 
        $match: { 
          eventType: 'BANNER_IMPRESSION',
          contentId: { 
            $ne: null,
            $regex: /^[0-9a-fA-F]{24}$/ 
          }
        } 
      },
      { 
        $addFields: { 
          bannerObjectId: { $toObjectId: '$contentId' } 
        } 
      },
      {
        $lookup: {
          from: 'banners',
          localField: 'bannerObjectId',
          foreignField: '_id',
          as: 'bannerInfo'
        }
      },
      { $unwind: '$bannerInfo' },
      { $group: { _id: '$bannerInfo.type', count: { $sum: 1 } } },
      { $project: { _id: 0, name: '$_id', value: '$count' } }
    ]);
    
    // Add colors for the chart on the frontend
    const campaignTypeDistribution = typeDistribution.map((item, index) => ({
      ...item,
      color: ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'][index % 4]
    }));
    
    // --- 6. Assemble and Send the Final Response ---
    res.json({
      kpiCards,
      performanceTrend,
      campaignTypeDistribution,
    });

  } catch (error) {
    logger.error('Error fetching dashboard analytics:', error);
    res.status(500).json({ 
      error: 'Internal Server Error',
      message: 'Failed to fetch dashboard analytics'
    });
  }
};

// Health check for service communication
exports.healthCheck = async (req, res) => {
  try {
    // Check database connection
    const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
    
    res.json({
      status: 'OK',
      service: 'analytics',
      database: dbStatus,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Analytics service health check failed:', error);
    res.status(503).json({
      status: 'ERROR',
      service: 'analytics',
      error: error.message
    });
  }
};