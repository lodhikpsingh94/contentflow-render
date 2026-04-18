import SecureStorage from '../utils/SecureStorage';

class UserManager {
    static prefs = new SecureStorage('user_prefs');
    static USER_ID_KEY = 'user_id';

    static initialize() {
        // Auto-initialize with default values if needed
        if (!this.getUserId()) {
            this.setUserId(this.generateUserId());
        }
    }

    static getUserId() {
        return this.prefs.getItem(this.USER_ID_KEY);
    }

    static setUserId(userId) {
        this.prefs.setItem(this.USER_ID_KEY, userId);
    }

    static generateUserId() {
        return 'user_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
    }

    static clear() {
        this.prefs.clear();
    }

    static setUserProperties(properties) {
        this.prefs.setItem('user_properties', JSON.stringify(properties));
    }

    static getUserProperties() {
        try {
            const properties = this.prefs.getItem('user_properties');
            return properties ? JSON.parse(properties) : {};
        } catch {
            return {};
        }
    }

    static updateUserProperty(key, value) {
        const properties = this.getUserProperties();
        properties[key] = value;
        this.setUserProperties(properties);
    }
}

// Auto-initialize
UserManager.initialize();

export default UserManager;