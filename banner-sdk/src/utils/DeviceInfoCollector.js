class DeviceInfoCollector {
    static getDeviceInfo() {
        return {
            platform: 'Web',
            osVersion: navigator.platform,
            deviceModel: navigator.userAgent,
            sdkVersion: '1.0.0',
            screenResolution: `${window.screen.width}x${window.screen.height}`,
            networkType: this.getNetworkType(),
            locale: navigator.language
        };
    }
    
    static getNetworkType() {
        if ('connection' in navigator) {
            return navigator.connection.effectiveType || 'unknown';
        }
        return 'unknown';
    }
}

export default DeviceInfoCollector;