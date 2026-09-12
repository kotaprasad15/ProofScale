import React, { useState, useRef, useEffect } from "react";
import { trpc } from "../../utils/trpc";
import {
  Bell,
  CheckCheck,
  AlertTriangle,
  AlertOctagon,
  CheckCircle2,
  ExternalLink,
  Settings as SettingsIcon,
  Inbox
} from "lucide-react";

interface NotificationBellProps {
  orgId?: string | null;
  onNavigate?: (path: string) => void;
  onOpenSettings?: () => void;
}

function formatRelativeTime(dateString: string | Date): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return "just now";
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;
  const diffInDays = Math.floor(diffInHours / 24);
  return `${diffInDays}d ago`;
}

export function NotificationBell({ orgId, onNavigate, onOpenSettings }: NotificationBellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [filterUnread, setFilterUnread] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const utils = trpc.useUtils();

  const listQuery = trpc.notifications.list.useQuery(
    {
      orgId: orgId || undefined,
      isRead: filterUnread ? false : undefined,
      limit: 30
    },
    {
      refetchInterval: 30_000 // Polling fallback
    }
  );

  const markReadMutation = trpc.notifications.markRead.useMutation({
    onSuccess: () => {
      utils.notifications.list.invalidate();
    }
  });

  const unreadCount = listQuery.data?.unreadCount || 0;
  const items = listQuery.data?.items || [];

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleMarkAllRead = async () => {
    await markReadMutation.mutateAsync({
      orgId: orgId || undefined,
      all: true
    });
  };

  const handleItemClick = async (notif: { id: string; isRead: boolean; linkUrl?: string | null }) => {
    if (!notif.isRead) {
      await markReadMutation.mutateAsync({ id: notif.id });
    }
    setIsOpen(false);
    if (notif.linkUrl) {
      if (onNavigate) {
        onNavigate(notif.linkUrl);
      } else {
        window.location.href = notif.linkUrl;
      }
    }
  };

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      {/* Bell Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-xl text-text-muted hover:text-text-primary hover:bg-[var(--white-fill-sm)] transition cursor-pointer"
        title="Notifications"
        aria-label={`Notifications (${unreadCount} unread)`}
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-signal-rose text-[10px] font-bold text-white shadow-sm ring-2 ring-ink-950">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Popover Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-ink-900/95 backdrop-blur-xl border border-[var(--border)] shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
          {/* Header */}
          <div className="p-3.5 border-b border-[var(--border)] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider">
                Notifications
              </h3>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-signal-rose/10 border border-signal-rose/20 text-signal-rose text-[10px] font-mono font-semibold">
                  {unreadCount} new
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  disabled={markReadMutation.isPending}
                  className="px-2 py-1 rounded-lg text-[11px] font-medium text-text-muted hover:text-text-primary hover:bg-[var(--white-fill-sm)] transition flex items-center gap-1 cursor-pointer disabled:opacity-50"
                  title="Mark all as read"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  <span>Mark all read</span>
                </button>
              )}

              {onOpenSettings && (
                <button
                  onClick={() => {
                    setIsOpen(false);
                    onOpenSettings();
                  }}
                  className="p-1 rounded-lg text-text-faint hover:text-text-primary hover:bg-[var(--white-fill-sm)] transition cursor-pointer"
                  title="Notification Settings"
                >
                  <SettingsIcon className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Filter Pills */}
          <div className="px-3.5 py-2 bg-ink-950/40 border-b border-[var(--border)] flex items-center gap-2 text-xs">
            <button
              onClick={() => setFilterUnread(false)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition cursor-pointer ${
                !filterUnread
                  ? "bg-signal-indigo/15 text-signal-indigo border border-signal-indigo/25"
                  : "text-text-muted hover:text-text-primary"
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilterUnread(true)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition cursor-pointer ${
                filterUnread
                  ? "bg-signal-indigo/15 text-signal-indigo border border-signal-indigo/25"
                  : "text-text-muted hover:text-text-primary"
              }`}
            >
              Unread only
            </button>
          </div>

          {/* Notifications List */}
          <div className="max-h-[380px] overflow-y-auto divide-y divide-[var(--border)]">
            {listQuery.isLoading ? (
              <div className="p-8 text-center text-text-faint text-xs">
                Loading notifications...
              </div>
            ) : items.length === 0 ? (
              <div className="p-8 text-center space-y-2">
                <div className="w-10 h-10 rounded-full bg-[var(--white-fill-sm)] border border-[var(--border)] text-text-faint flex items-center justify-center mx-auto">
                  <Inbox className="w-5 h-5" />
                </div>
                <p className="text-xs font-semibold text-text-muted">
                  {filterUnread ? "No unread notifications" : "No notifications yet"}
                </p>
                <p className="text-[11px] text-text-faint">
                  Test runs and readiness tier transitions will appear here.
                </p>
              </div>
            ) : (
              items.map((notif) => {
                const isCritical = notif.severity === "critical";
                const isWarning = notif.severity === "warning";

                const iconColor = isCritical
                  ? "text-signal-rose"
                  : isWarning
                  ? "text-signal-amber"
                  : "text-signal-teal";

                return (
                  <div
                    key={notif.id}
                    onClick={() => handleItemClick(notif)}
                    className={`p-3.5 transition cursor-pointer flex items-start gap-3 hover:bg-[var(--white-fill-sm)] ${
                      !notif.isRead ? "bg-signal-indigo/[0.04]" : ""
                    }`}
                  >
                    <div className={`p-1.5 rounded-xl bg-[var(--white-fill-sm)] shrink-0 mt-0.5 ${iconColor}`}>
                      {isCritical ? (
                        <AlertOctagon className="w-4 h-4" />
                      ) : isWarning ? (
                        <AlertTriangle className="w-4 h-4" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs font-semibold text-text-primary truncate">
                          {notif.title}
                        </span>
                        {!notif.isRead && (
                          <span className="w-2 h-2 rounded-full bg-signal-indigo shrink-0" />
                        )}
                      </div>

                      <p className="text-xs text-text-muted mt-0.5 line-clamp-2 leading-relaxed">
                        {notif.body}
                      </p>

                      <div className="flex items-center justify-between mt-2 text-[10px] text-text-faint font-mono">
                        <span>{formatRelativeTime(notif.createdAt)}</span>
                        {notif.linkUrl && (
                          <span className="text-signal-indigo flex items-center gap-1 hover:underline">
                            View details <ExternalLink className="w-2.5 h-2.5" />
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
