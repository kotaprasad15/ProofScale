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

      {/* Popover Dropdown (100% Solid Opaque Background) */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-white dark:bg-[#0E131F] border-2 border-slate-300 dark:border-white/15 shadow-2xl shadow-black/25 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
          {/* Header */}
          <div className="p-3.5 bg-slate-50 dark:bg-[#141A28] border-b-2 border-slate-200 dark:border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold text-black dark:text-white uppercase tracking-wider">
                Notifications
              </h3>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-signal-rose/15 border border-signal-rose/30 text-signal-rose text-[10px] font-mono font-bold">
                  {unreadCount} new
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  disabled={markReadMutation.isPending}
                  className="px-2 py-1 rounded-lg text-[11px] font-bold text-slate-700 dark:text-text-muted hover:text-black dark:hover:text-white hover:bg-slate-200 dark:hover:bg-white/10 transition flex items-center gap-1 cursor-pointer disabled:opacity-50"
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
                  className="p-1 rounded-lg text-slate-600 dark:text-text-faint hover:text-black dark:hover:text-white hover:bg-slate-200 dark:hover:bg-white/10 transition cursor-pointer"
                  title="Notification Settings"
                >
                  <SettingsIcon className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Filter Pills */}
          <div className="px-3.5 py-2 bg-slate-100 dark:bg-[#111724] border-b border-slate-200 dark:border-white/10 flex items-center gap-2 text-xs">
            <button
              onClick={() => setFilterUnread(false)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                !filterUnread
                  ? "bg-slate-950 text-white dark:bg-signal-indigo dark:text-white shadow-xs"
                  : "text-slate-700 dark:text-text-muted hover:text-black dark:hover:text-white"
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilterUnread(true)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                filterUnread
                  ? "bg-slate-950 text-white dark:bg-signal-indigo dark:text-white shadow-xs"
                  : "text-slate-700 dark:text-text-muted hover:text-black dark:hover:text-white"
              }`}
            >
              Unread only
            </button>
          </div>

          {/* Notifications List */}
          <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-100 dark:divide-white/[0.08] bg-white dark:bg-[#0E131F]">
            {listQuery.isLoading ? (
              <div className="p-8 text-center text-slate-500 dark:text-text-faint text-xs font-mono">
                Loading notifications...
              </div>
            ) : items.length === 0 ? (
              <div className="p-8 text-center space-y-2 bg-white dark:bg-[#0E131F]">
                <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-white/[0.06] border border-slate-200 dark:border-white/10 text-slate-500 dark:text-text-faint flex items-center justify-center mx-auto">
                  <Inbox className="w-5 h-5" />
                </div>
                <p className="text-xs font-bold text-black dark:text-white">
                  {filterUnread ? "No unread notifications" : "No notifications yet"}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-text-faint">
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
                    className={`p-3.5 transition cursor-pointer flex items-start gap-3 hover:bg-slate-50 dark:hover:bg-white/[0.06] ${
                      !notif.isRead
                        ? "bg-indigo-50/80 dark:bg-signal-indigo/[0.12] border-l-4 border-signal-indigo"
                        : "bg-white dark:bg-[#0E131F]"
                    }`}
                  >
                    <div className={`p-1.5 rounded-xl bg-slate-100 dark:bg-white/[0.08] shrink-0 mt-0.5 ${iconColor}`}>
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
                        <span className="text-xs font-bold text-black dark:text-white truncate">
                          {notif.title}
                        </span>
                        {!notif.isRead && (
                          <span className="w-2 h-2 rounded-full bg-signal-indigo shrink-0" />
                        )}
                      </div>

                      <p className="text-xs text-slate-700 dark:text-slate-300 mt-0.5 line-clamp-2 leading-relaxed font-medium">
                        {notif.body}
                      </p>

                      <div className="flex items-center justify-between mt-2 text-[10px] text-slate-500 dark:text-text-faint font-mono">
                        <span>{formatRelativeTime(notif.createdAt)}</span>
                        {notif.linkUrl && (
                          <span className="text-signal-indigo font-semibold flex items-center gap-1 hover:underline">
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
