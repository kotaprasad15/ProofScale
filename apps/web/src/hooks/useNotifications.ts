import { useState, useEffect, useCallback, useRef } from "react";
import { trpc } from "../utils/trpc";

export interface InAppToast {
  id: string;
  title: string;
  body: string;
  severity: "info" | "warning" | "critical";
  linkUrl?: string;
  createdAt: string;
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function getOrCreateDeviceId(): string {
  let deviceId = localStorage.getItem("rc_device_id");
  if (!deviceId) {
    deviceId = `dev_${Math.random().toString(36).substring(2, 11)}_${Date.now().toString(36)}`;
    localStorage.setItem("rc_device_id", deviceId);
  }
  return deviceId;
}

export function useNotifications(userId?: string, orgId?: string) {
  const [toasts, setToasts] = useState<InAppToast[]>([]);
  const [pushPermission, setPushPermission] = useState<NotificationPermission>(() => {
    return typeof window !== "undefined" && "Notification" in window ? Notification.permission : "default";
  });
  const [isPushSupported, setIsPushSupported] = useState<boolean>(false);
  const [isSubscribingPush, setIsSubscribingPush] = useState<boolean>(false);

  const utils = trpc.useUtils();
  const pushSubscribeMutation = trpc.notifications.pushSubscribe.useMutation();
  const getVapidKeyQuery = trpc.notifications.getVapidPublicKey.useQuery(undefined, {
    enabled: false
  });

  const apiBase = import.meta.env.VITE_API_URL
    ? import.meta.env.VITE_API_URL.replace(/\/$/, "")
    : "";

  const deviceIdRef = useRef<string>(getOrCreateDeviceId());

  // Check Web Push support on mount
  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window) {
      setIsPushSupported(true);
      if ("Notification" in window) {
        setPushPermission(Notification.permission);
      }
    }
  }, []);

  // Dismiss a toast by ID
  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Send presence heartbeat to server
  const sendHeartbeat = useCallback((visible: boolean) => {
    if (!userId) return;
    const deviceId = deviceIdRef.current;

    fetch(`${apiBase}/api/presence/heartbeat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId,
        deviceId,
        visible
      }),
      keepalive: true
    }).catch(() => {
      // Non-critical, ignore transient network drops
    });
  }, [userId, apiBase]);

  // Presence tracking lifecycle
  useEffect(() => {
    if (!userId) return;

    // Send initial heartbeat
    sendHeartbeat(document.visibilityState === "visible");

    // Periodic heartbeat every 20 seconds
    const interval = setInterval(() => {
      sendHeartbeat(document.visibilityState === "visible");
    }, 20_000);

    // Visibility change handler
    const handleVisibilityChange = () => {
      sendHeartbeat(document.visibilityState === "visible");
    };

    // Page unload / hide handler
    const handlePageHide = () => {
      sendHeartbeat(false);
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("pagehide", handlePageHide);
    window.addEventListener("beforeunload", handlePageHide);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("pagehide", handlePageHide);
      window.removeEventListener("beforeunload", handlePageHide);
    };
  }, [userId, sendHeartbeat]);

  // SSE Stream for In-App Notifications
  useEffect(() => {
    if (!userId) return;

    const streamUrl = `${apiBase}/api/notifications/stream?userId=${encodeURIComponent(userId)}`;
    let eventSource: EventSource | null = null;
    let reconnectTimeout: any = null;

    const connectStream = () => {
      try {
        eventSource = new EventSource(streamUrl);

        eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (!data || !data.title) return;

            // Invalidate notification queries to refresh unread count and popover
            utils.notifications.list.invalidate();

            // Display toast only if current tab is actively visible
            if (document.visibilityState === "visible") {
              const newToast: InAppToast = {
                id: data.id || `toast_${Date.now()}`,
                title: data.title,
                body: data.body,
                severity: data.severity || "info",
                linkUrl: data.linkUrl,
                createdAt: data.createdAt || new Date().toISOString()
              };

              setToasts((prev) => [newToast, ...prev.slice(0, 4)]);

              // Auto-dismiss after 7 seconds
              setTimeout(() => {
                dismissToast(newToast.id);
              }, 7000);
            }
          } catch {
            // Non-JSON ping
          }
        };

        eventSource.onerror = () => {
          if (eventSource) {
            eventSource.close();
            eventSource = null;
          }
          // Reconnect after 5 seconds
          reconnectTimeout = setTimeout(connectStream, 5000);
        };
      } catch (err) {
        reconnectTimeout = setTimeout(connectStream, 5000);
      }
    };

    connectStream();

    return () => {
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [userId, apiBase, utils, dismissToast]);

  // Web Push Subscription Request
  const subscribeToWebPush = useCallback(async () => {
    if (!isPushSupported || !("Notification" in window)) {
      return { success: false, error: "Web Push not supported in this browser." };
    }

    setIsSubscribingPush(true);
    try {
      const permission = await Notification.requestPermission();
      setPushPermission(permission);

      if (permission !== "granted") {
        setIsSubscribingPush(false);
        return { success: false, error: "Notification permission was denied." };
      }

      // Register or retrieve service worker
      const registration = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
      await navigator.serviceWorker.ready;

      // Fetch VAPID public key
      const { data: vapidData } = await getVapidKeyQuery.refetch();
      const vapidPublicKey = vapidData?.publicKey;
      if (!vapidPublicKey) {
        throw new Error("Failed to retrieve VAPID public key from server.");
      }

      // Convert key and subscribe
      const convertedVapidKey = urlBase64ToUint8Array(vapidPublicKey);
      let subscription = await registration.pushManager.getSubscription();

      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: convertedVapidKey
        });
      }

      const subscriptionJson = subscription.toJSON();
      if (!subscriptionJson.endpoint || !subscriptionJson.keys?.p256dh || !subscriptionJson.keys?.auth) {
        throw new Error("Invalid push subscription structure returned by browser.");
      }

      // Send to server
      await pushSubscribeMutation.mutateAsync({
        endpoint: subscriptionJson.endpoint,
        keys: {
          p256dh: subscriptionJson.keys.p256dh,
          auth: subscriptionJson.keys.auth
        }
      });

      setIsSubscribingPush(false);
      return { success: true };
    } catch (err: any) {
      setIsSubscribingPush(false);
      return { success: false, error: err.message || "Failed to enable Web Push." };
    }
  }, [isPushSupported, getVapidKeyQuery, pushSubscribeMutation]);

  return {
    toasts,
    dismissToast,
    pushPermission,
    isPushSupported,
    isSubscribingPush,
    subscribeToWebPush
  };
}
