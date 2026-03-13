declare module "web-push" {
  export interface PushSubscription {
    endpoint: string;
    keys: {
      p256dh: string;
      auth: string;
    };
  }

  export interface WebPushError extends Error {
    statusCode?: number;
    headers?: Record<string, string>;
    body?: string;
  }

  export function setVapidDetails(
    subject: string,
    publicKey: string,
    privateKey: string
  ): void;

  export function sendNotification(
    subscription: PushSubscription,
    payload?: string | Buffer,
    options?: unknown
  ): Promise<void>;

  const _default: {
    setVapidDetails: typeof setVapidDetails;
    sendNotification: typeof sendNotification;
  };

  export default _default;
}

