import { Eye, EyeOff } from "lucide-react";

export function VisibilityToggle({
  visible,
  onToggle,
  label,
}: {
  visible: boolean;
  onToggle: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={visible}
      aria-label={visible ? `Hide this ${label} from the site` : `Show this ${label} on the site`}
      title={
        visible ? "Visible on the site — click to hide" : "Hidden from the site — click to show"
      }
      onClick={onToggle}
      className={
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-500 transition-colors " +
        (visible
          ? "border-success/30 bg-success-soft text-success hover:border-success"
          : "border-hairline bg-surface-alt text-ink-muted hover:border-navy hover:text-navy")
      }
    >
      {visible ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}
      {visible ? "Visible" : "Hidden"}
    </button>
  );
}
