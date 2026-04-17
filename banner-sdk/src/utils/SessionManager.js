class SessionManager {
    // 1. Initialize with null/primitive values to avoid startup errors
    static sessionId = null;
    static lastActivityTime = 0;
    
    // 2. Define the generator method
    static generateSessionId() {
        return 'sess_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
    }
    
    // 3. Lazy initialization logic
    static getSessionId() {
        const now = Date.now();

        // If no session exists, or it expired (30 mins), create a new one
        if (!this.sessionId || (now - this.lastActivityTime > 30 * 60 * 1000)) {
            this.sessionId = this.generateSessionId();
            
            // Optional: Persist to sessionStorage so it survives page reloads
            try { 
                if (typeof sessionStorage !== 'undefined') {
                    sessionStorage.setItem('banner_session_id', this.sessionId);
                }
            } catch(e) {
                // Ignore storage errors (private mode, etc.)
            }
        }
        
        this.lastActivityTime = now;
        return this.sessionId;
    }
}

export default SessionManager;