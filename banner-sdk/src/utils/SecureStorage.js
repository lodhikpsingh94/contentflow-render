class SecureStorage {
    constructor(namespace) {
        this.namespace = namespace;
    }
    
    setItem(key, value) {
        const storageKey = `${this.namespace}_${key}`;
        try {
            localStorage.setItem(storageKey, value);
        } catch (e) {
            console.warn('LocalStorage not available, using memory storage');
            this.memoryStorage = this.memoryStorage || {};
            this.memoryStorage[storageKey] = value;
        }
    }
    
    getItem(key) {
        const storageKey = `${this.namespace}_${key}`;
        try {
            return localStorage.getItem(storageKey);
        } catch (e) {
            return this.memoryStorage ? this.memoryStorage[storageKey] : null;
        }
    }
    
    clear() {
        try {
            Object.keys(localStorage).forEach(key => {
                if (key.startsWith(this.namespace)) {
                    localStorage.removeItem(key);
                }
            });
        } catch (e) {
            if (this.memoryStorage) {
                Object.keys(this.memoryStorage).forEach(key => {
                    if (key.startsWith(this.namespace)) {
                        delete this.memoryStorage[key];
                    }
                });
            }
        }
    }
}

export default SecureStorage;