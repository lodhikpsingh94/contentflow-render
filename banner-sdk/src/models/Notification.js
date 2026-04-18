class PushNotification {
    constructor({
        id,
        title,
        message,
        bannerId = null,
        deepLink = null,
        receivedAt = new Date(),
        read = false
    }) {
        this.id = id;
        this.title = title;
        this.message = message;
        this.bannerId = bannerId;
        this.deepLink = deepLink;
        this.receivedAt = new Date(receivedAt);
        this.read = read;
    }

    markAsRead() {
        this.read = true;
        return this;
    }

    static fromJSON(json) {
        return new PushNotification({
            ...json,
            receivedAt: new Date(json.receivedAt)
        });
    }

    toJSON() {
        return {
            id: this.id,
            title: this.title,
            message: this.message,
            bannerId: this.bannerId,
            deepLink: this.deepLink,
            receivedAt: this.receivedAt.toISOString(),
            read: this.read
        };
    }
}

export default PushNotification;