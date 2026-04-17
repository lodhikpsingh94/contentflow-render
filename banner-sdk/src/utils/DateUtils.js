class DateUtils {
    static SERVER_FORMAT = "yyyy-MM-dd'T'HH:mm:ss'Z'";

    static parseServerDate(dateString) {
        try {
            // Handle ISO format with timezone
            if (dateString.includes('Z')) {
                return new Date(dateString);
            }
            // Handle without timezone (assume UTC)
            return new Date(dateString + 'Z');
        } catch (error) {
            console.error('Failed to parse date:', dateString, error);
            return null;
        }
    }

    static formatToServerDate(date) {
        try {
            return date.toISOString().split('.')[0] + 'Z';
        } catch (error) {
            console.error('Failed to format date:', date, error);
            return null;
        }
    }

    static isDateInRange(date, startDate, endDate) {
        const checkDate = new Date(date);
        const start = new Date(startDate);
        const end = new Date(endDate);
        return checkDate >= start && checkDate <= end;
    }

    static getDaysDifference(date1, date2) {
        const d1 = new Date(date1);
        const d2 = new Date(date2);
        const diffTime = Math.abs(d2 - d1);
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    static formatRelativeTime(date) {
        const now = new Date();
        const diffMs = now - new Date(date);
        const diffSecs = Math.floor(diffMs / 1000);
        const diffMins = Math.floor(diffSecs / 60);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffSecs < 60) return 'just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        
        return new Date(date).toLocaleDateString();
    }
}

export default DateUtils;