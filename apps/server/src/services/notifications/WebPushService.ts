import webpush from "web-push";

interface PushPayload {
  title: string;
  body: string;
  linkUrl?: string;
  severity?: string;
  tag?: string;
}

export interface PushSendResult {
  success: boolean;
  isInvalid: boolean;
  statusCode?: number;
  error?: string;
}

export class WebPushService {
  private static vapidKeys = {
    publicKey: process.env.VAPID_PUBLIC_KEY || "",
    privateKey: process.env.VAPID_PRIVATE_KEY || "",
    subject: process.env.VAPID_SUBJECT || "mailto:admin@ratecap.dev"
  };

  private static isInitialized = false;

  private static ensureInitialized() {
    if (this.isInitialized) return;

    // If no keys provided in env, generate a deterministic or runtime pair
    if (!this.vapidKeys.publicKey || !this.vapidKeys.privateKey) {
      const generated = webpush.generateVAPIDKeys();
      this.vapidKeys.publicKey = generated.publicKey;
      this.vapidKeys.privateKey = generated.privateKey;
    }

    try {
      webpush.setVapidDetails(
        this.vapidKeys.subject,
        this.vapidKeys.publicKey,
        this.vapidKeys.privateKey
      );
      this.isInitialized = true;
    } catch (err: any) {
      console.warn("Failed to configure webpush VAPID details:", err.message);
    }
  }

  /**
   * Returns the VAPID Public Key for client subscription requests.
   */
  static getPublicKey(): string {
    this.ensureInitialized();
    return this.vapidKeys.publicKey;
  }

  /**
   * Sends web push notification to a specific device subscription.
   * On HTTP 410 (Gone) or 404, flags isInvalid = true so caller can mark subscription invalid.
   */
  static async sendPushNotification(
    subscription: { endpoint: string; p256dhKey: string; authKey: string },
    payload: PushPayload
  ): Promise<PushSendResult> {
    this.ensureInitialized();

    const pushSubscription: webpush.PushSubscription = {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: subscription.p256dhKey,
        auth: subscription.authKey
      }
    };

    try {
      await webpush.sendNotification(pushSubscription, JSON.stringify(payload));
      return { success: true, isInvalid: false, statusCode: 200 };
    } catch (err: any) {
      const statusCode = err?.statusCode || err?.status;
      const isGone = statusCode === 410 || statusCode === 404;

      return {
        success: false,
        isInvalid: isGone,
        statusCode,
        error: err?.message || String(err)
      };
    }
  }
}
