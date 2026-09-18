import { useRouter } from "@tanstack/react-router";

export function SmartBackButton({
  to,
  label = "← Back",
  className,
}: {
  to: string;
  label?: string;
  className?: string;
}) {
  const router = useRouter();
  const canGoBack = typeof window !== "undefined" && (window.history.state?.idx ?? 0) > 0;
  const onClick = () => {
    if (canGoBack) router.history.back();
    else router.navigate({ to });
  };
  return (
    <button type="button" onClick={onClick} className={className}>
      {label}
    </button>
  );
}