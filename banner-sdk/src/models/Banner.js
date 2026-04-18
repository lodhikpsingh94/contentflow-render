class Banner {
    constructor({ id, campaignId, priority, startDate, endDate }) {
        this.id = id;
        this.campaignId = campaignId;
        this.priority = priority;
        this.startDate = new Date(startDate);
        this.endDate = new Date(endDate);
    }

    static createImageBanner({
        id,
        campaignId,
        priority,
        startDate,
        endDate,
        imageUrl,
        actionUrl = null,
        aspectRatio,
        title = '',
        description = '',
        openInNewTab = true
    }) {
        return {
            id,
            campaignId,
            priority,
            startDate: new Date(startDate),
            endDate: new Date(endDate),
            imageUrl,
            actionUrl,
            aspectRatio,
            title,
            description,
            openInNewTab,
            type: 'IMAGE_BANNER'
        };
    }

    static createVideoBanner({
        id,
        campaignId,
        priority,
        startDate,
        endDate,
        videoUrl,
        thumbnailUrl,
        autoPlay = false,
        muted = true,
        title = '',
        description = ''
    }) {
        return {
            id,
            campaignId,
            priority,
            startDate: new Date(startDate),
            endDate: new Date(endDate),
            videoUrl,
            thumbnailUrl,
            autoPlay,
            muted,
            title,
            description,
            type: 'VIDEO_BANNER'
        };
    }

    static createPopupMessage({
        id,
        campaignId,
        priority,
        startDate,
        endDate,
        title,
        message,
        imageUrl = null,
        actions = []
    }) {
        return {
            id,
            campaignId,
            priority,
            startDate: new Date(startDate),
            endDate: new Date(endDate),
            title,
            message,
            imageUrl,
            actions,
            type: 'POPUP_MESSAGE'
        };
    }

    static get ButtonStyle() {
        return {
            PRIMARY: 'PRIMARY',
            SECONDARY: 'SECONDARY',
            DESTRUCTIVE: 'DESTRUCTIVE'
        };
    }

    static createActionButton(text, actionUrl, style = 'PRIMARY') {
        return {
            text,
            actionUrl,
            style
        };
    }

    static isActive(banner) {
        const now = new Date();
        return now >= new Date(banner.startDate) && now <= new Date(banner.endDate);
    }

    static sortByPriority(banners) {
        return [...banners].sort((a, b) => b.priority - a.priority);
    }
}

export default Banner;