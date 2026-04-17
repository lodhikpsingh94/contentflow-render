class DeepLinkHandler {
    static open(url, target = '_blank') {
        try {
            if (url.startsWith('http://') || url.startsWith('https://')) {
                window.open(url, target);
            } else if (url.startsWith('mailto:')) {
                window.location.href = url;
            } else if (url.startsWith('tel:')) {
                window.location.href = url;
            } else {
                console.warn('Unsupported URL scheme:', url);
            }
        } catch (error) {
            console.error('Failed to open deep link:', url, error);
        }
    }

    static isSupported(url) {
        const supportedSchemes = ['http:', 'https:', 'mailto:', 'tel:'];
        try {
            const parsedUrl = new URL(url);
            return supportedSchemes.includes(parsedUrl.protocol);
        } catch {
            return false;
        }
    }

    static getDomain(url) {
        try {
            const parsedUrl = new URL(url);
            return parsedUrl.hostname;
        } catch {
            return null;
        }
    }
}

export default DeepLinkHandler;