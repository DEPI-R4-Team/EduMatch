import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Bell,
  BookOpenCheck,
  CheckCheck,
  CircleDollarSign,
  ClipboardList,
  FileText,
  MessageSquareQuote,
  ShieldCheck,
  UserCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getMyNotifications,
  getUnreadCount,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/services/notifications.service";
import type { Notification, NotificationType } from "@/types/notification";

const POLL_INTERVAL_MS = 30_000;

const typeIcons: Partial<Record<NotificationType, typeof Bell>> = {
  application_received: FileText,
  application_accepted: ClipboardList,
  application_rejected: FileText,
  application_message_received: MessageSquareQuote,
  payment_received: CircleDollarSign,
  payment_released: CircleDollarSign,
  payment_refunded: CircleDollarSign,
  session_started: BookOpenCheck,
  session_marked_completed: BookOpenCheck,
  session_completed: BookOpenCheck,
  review_received: MessageSquareQuote,
  instructor_verified: ShieldCheck,
  instructor_rejected: ShieldCheck,
  user_suspended: UserCheck,
  user_activated: UserCheck,
};

const typeTones: Partial<Record<NotificationType, string>> = {
  application_received: "text-[#8b5cf6]",
  application_accepted: "text-emerald-300",
  application_rejected: "text-red-400",
  application_message_received: "text-[#8b5cf6]",
  payment_received: "text-amber-400",
  payment_released: "text-emerald-300",
  payment_refunded: "text-red-400",
  session_started: "text-[#8b5cf6]",
  session_marked_completed: "text-amber-400",
  session_completed: "text-emerald-300",
  review_received: "text-[#8b5cf6]",
  instructor_verified: "text-emerald-300",
  instructor_rejected: "text-red-400",
  user_suspended: "text-red-400",
  user_activated: "text-emerald-300",
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function badgeCount(count: number) {
  return count > 99 ? "99+" : String(count);
}

export function NotificationsDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const loadNotifications = useCallback(async () => {
    try {
      const [items, count] = await Promise.all([
        getMyNotifications({ limit: 8 }),
        getUnreadCount(),
      ]);
      setNotifications(items);
      setUnreadCount(count.unread_count);
      setError("");
    } catch {
      setError("Cannot load notifications.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadNotifications();
    const intervalId = window.setInterval(() => void loadNotifications(), POLL_INTERVAL_MS);
    return () => window.clearInterval(intervalId);
  }, [loadNotifications]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  async function handleMarkAllRead() {
    try {
      await markAllNotificationsRead();
      await loadNotifications();
    } catch {
      setError("Cannot load notifications.");
    }
  }

  async function handleNotificationClick(notification: Notification) {
    try {
      if (!notification.is_read) {
        await markNotificationRead(notification.id);
      }
      await loadNotifications();
      setIsOpen(false);
      if (notification.link_url) {
        navigate(notification.link_url);
      }
    } catch {
      setError("Cannot load notifications.");
    }
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        aria-label="Notifications"
        className="relative flex size-10 items-center justify-center rounded-xl border border-[#27272A] bg-[#18181B] text-zinc-200 transition-colors hover:bg-white/5"
        onClick={() => setIsOpen((prev) => !prev)}
        type="button"
      >
        <Bell className="size-4" />
        {unreadCount > 0 ? (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#8b5cf6] px-1 text-[10px] font-bold text-zinc-100">
            {badgeCount(unreadCount)}
          </span>
        ) : null}
      </button>

      {isOpen ? (
        <div className="absolute top-12 right-0 mt-2 w-80 bg-[#18181B] border border-[#27272A] rounded-2xl shadow-[0_10px_50px_rgba(0,0,0,0.7)] z-[100] overflow-hidden backdrop-blur-xl">
          <div className="flex items-center justify-between gap-md border-b border-[#27272A] px-lg py-md">
            <h3 className="text-headline-md text-zinc-100">Notifications</h3>
            {unreadCount > 0 ? (
              <button
                className="flex shrink-0 items-center gap-xs text-body-sm text-[#a78bfa] transition hover:text-zinc-100"
                onClick={() => void handleMarkAllRead()}
                type="button"
              >
                <CheckCheck className="size-4" />
                Mark all read
              </button>
            ) : null}
          </div>

          <div className="max-h-[400px] overflow-y-auto">
            {loading ? (
              <div className="px-lg py-xl text-center text-body-sm text-zinc-400">Loading notifications...</div>
            ) : error ? (
              <div className="px-lg py-xl text-center text-body-sm text-red-400">{error}</div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center px-lg py-xl text-center">
                <div className="mb-md flex size-12 items-center justify-center rounded-full border border-[#8b5cf6]/20 bg-[#8b5cf6]/10 text-[#8b5cf6]">
                  <Bell className="size-5" />
                </div>
                <p className="text-body-md font-medium text-zinc-100">No notifications yet.</p>
              </div>
            ) : (
              notifications.map((notification) => {
                const Icon = typeIcons[notification.type] ?? Bell;

                return (
                  <button
                    className={cn(
                      "flex w-full gap-sm border-b border-[#27272A] px-lg py-md text-left transition-colors last:border-b-0 hover:bg-[#09090B]/60",
                      !notification.is_read && "bg-[#8b5cf6]/5",
                    )}
                    key={notification.id}
                    onClick={() => void handleNotificationClick(notification)}
                    type="button"
                  >
                    <div
                      className={cn(
                        "mt-xs flex size-8 shrink-0 items-center justify-center rounded-full border border-[#27272A] bg-[#09090B]",
                        typeTones[notification.type] ?? "text-[#8b5cf6]",
                      )}
                    >
                      <Icon className="size-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-sm">
                        <p className={cn("text-body-sm text-zinc-100", !notification.is_read && "font-medium")}>
                          {notification.title}
                        </p>
                        {!notification.is_read ? <span className="mt-1.5 size-2 shrink-0 rounded-full bg-[#8b5cf6]" /> : null}
                      </div>
                      <p className="mt-xs line-clamp-2 text-body-sm text-zinc-400">{notification.message}</p>
                      <p className="mt-xs text-label-md text-zinc-500">{formatDate(notification.created_at)}</p>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          <div className="border-t border-[#27272A] px-lg py-sm">
            <Link className="text-body-sm text-[#a78bfa] transition hover:text-zinc-100" to="/notifications">
              View all notifications
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
