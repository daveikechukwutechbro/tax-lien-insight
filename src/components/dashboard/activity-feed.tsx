import { Link } from "@tanstack/react-router";
import type { ActivityItem } from "@/lib/backend";

export function ActivityRow({ item }: { item: ActivityItem }) {
  const body = item.body ? (
    <div className="truncate text-xs text-ink-muted">{item.body}</div>
  ) : null;
  return (
    <li className="flex items-start justify-between gap-3 border-b border-hairline pb-2 text-sm last:border-0">
      <div className="min-w-0 flex-1">
        {item.link ? (
          <Link to={item.link} className="font-500 text-navy hover:underline">{item.title}</Link>
        ) : (
          <span className="text-ink">{item.title}</span>
        )}
        {body}
      </div>
      <span className="shrink-0 text-xs text-ink-muted">{timeAgo(item.at)}</span>
    </li>
  );
}

export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}