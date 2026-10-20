import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2, ChevronUp, ChevronDown, RotateCcw } from "lucide-react";
import { getAdminSiteContent, saveAdminSiteContent, type SiteContentSlug } from "@/lib/backend";
import { AdminPageHeader } from "@/components/admin/page-header";
import { Button } from "@/components/ui/button";
import {
  SITE_CONTENT_SCHEMAS,
  SITE_CONTENT_DEFAULTS,
  type ContentField,
} from "@/lib/site-content";

export const Route = createFileRoute("/admin/content/pages")({
  component: PagesEditor,
});

const EDITABLE = SITE_CONTENT_SCHEMAS.filter((s) => s.slug !== "settings");

function mergeSaved(
  defaults: Record<string, unknown>,
  saved: Record<string, unknown> | undefined,
): Record<string, unknown> {
  const out: Record<string, unknown> = JSON.parse(JSON.stringify(defaults));
  if (saved) {
    for (const [k, v] of Object.entries(saved)) {
      if (v !== undefined && v !== null) out[k] = v;
    }
  }
  return out;
}

function PagesEditor() {
  const nav = useNavigate();
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "content", "all"],
    queryFn: getAdminSiteContent,
  });
  const [slug, setSlug] = useState<SiteContentSlug>("home");

  const savedFor = (s: SiteContentSlug) =>
    (data?.find((c) => c.slug === s)?.body as Record<string, unknown> | undefined) ?? undefined;

  return (
    <div>
      <AdminPageHeader
        title="Page Content"
        description="Edit the copy shown on the public site. Changes appear immediately once saved."
        actions={
          <Button variant="outline" size="sm" onClick={() => nav({ to: "/admin/content/settings" })}>
            Site settings
          </Button>
        }
      />
      <div className="mt-6 grid gap-6 lg:grid-cols-[230px_1fr]">
        <nav className="flex flex-wrap gap-1 lg:flex-col">
          {EDITABLE.map((s) => (
            <button
              key={s.slug}
              type="button"
              onClick={() => setSlug(s.slug)}
              className={
                "rounded-md px-3 py-2 text-left text-sm font-500 transition-colors " +
                (s.slug === slug
                  ? "bg-navy text-primary-foreground"
                  : "text-ink hover:bg-surface-alt")
              }
            >
              {s.label}
            </button>
          ))}
        </nav>

        {isLoading || !data ? (
          <div className="rounded-xl border border-hairline bg-surface p-10 text-sm text-ink-muted">
            Loading content…
          </div>
        ) : (
          <PageForm key={slug} slug={slug} saved={savedFor(slug)} />
        )}
      </div>
    </div>
  );
}

export function PageForm({ slug, saved }: { slug: SiteContentSlug; saved?: Record<string, unknown> }) {
  const qc = useQueryClient();
  const schema = SITE_CONTENT_SCHEMAS.find((s) => s.slug === slug)!;
  const defaults = SITE_CONTENT_DEFAULTS[slug] as unknown as Record<string, unknown>;
  const [draft, setDraft] = useState<Record<string, unknown>>(() => mergeSaved(defaults, saved));

  const mutation = useMutation({
    mutationFn: () => saveAdminSiteContent(slug, draft),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "content"] });
      qc.invalidateQueries({ queryKey: ["site-content", slug] });
      toast.success(`${schema.label} saved`);
    },
    onError: (e: Error) => toast.error(e.message ?? "Failed to save"),
  });

  const set = (key: string, value: unknown) => setDraft((d) => ({ ...d, [key]: value }));

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        mutation.mutate();
      }}
      className="rounded-xl border border-hairline bg-surface p-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-600 text-navy">{schema.label}</h2>
          <p className="mt-0.5 text-sm text-ink-muted">{schema.description}</p>
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setDraft(mergeSaved(defaults, undefined));
              toast.message("Reset to defaults — remember to save");
            }}
          >
            <RotateCcw className="mr-1.5 size-3.5" /> Reset
          </Button>
          <Button type="submit" size="sm" disabled={mutation.isPending}>
            {mutation.isPending ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </div>

      <div className="mt-6 space-y-5">
        {schema.fields.map((field) => (
          <FieldEditor
            key={field.key}
            field={field}
            value={draft[field.key]}
            onChange={(v) => set(field.key, v)}
          />
        ))}
      </div>
    </form>
  );
}

function FieldEditor({
  field,
  value,
  onChange,
}: {
  field: ContentField;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  const inputCls =
    "w-full rounded-md border border-hairline bg-background px-3 py-2 text-sm focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/15";

  if (field.type === "items") {
    const items = Array.isArray(value) ? (value as Record<string, unknown>[]) : [];
    const blank = () =>
      Object.fromEntries(field.fields.map((f) => [f.key, ""])) as Record<string, unknown>;
    const replace = (next: Record<string, unknown>[]) => onChange(next);
    const move = (i: number, dir: -1 | 1) => {
      const j = i + dir;
      if (j < 0 || j >= items.length) return;
      const next = [...items];
      [next[i], next[j]] = [next[j], next[i]];
      replace(next);
    };
    return (
      <div>
        <Label label={field.label} help={field.help} />
        <div className="mt-2 space-y-3">
          {items.map((item, i) => (
            <div key={i} className="rounded-lg border border-hairline bg-background/60 p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-600 uppercase tracking-wider text-ink-muted">
                  {field.itemLabel} {i + 1}
                </span>
                <div className="flex items-center gap-1">
                  <IconBtn onClick={() => move(i, -1)} disabled={i === 0} label="Move up">
                    <ChevronUp className="size-3.5" />
                  </IconBtn>
                  <IconBtn
                    onClick={() => move(i, 1)}
                    disabled={i === items.length - 1}
                    label="Move down"
                  >
                    <ChevronDown className="size-3.5" />
                  </IconBtn>
                  <IconBtn
                    onClick={() => replace(items.filter((_, k) => k !== i))}
                    label="Remove"
                  >
                    <Trash2 className="size-3.5" />
                  </IconBtn>
                </div>
              </div>
              <div className="space-y-2">
                {field.fields.map((f) => (
                  <label key={f.key} className="block">
                    <span className="text-xs font-500 text-ink-muted">{f.label}</span>
                    {f.type === "textarea" ? (
                      <textarea
                        rows={3}
                        className={`mt-1 ${inputCls}`}
                        placeholder={f.placeholder}
                        value={String(item[f.key] ?? "")}
                        onChange={(e) => {
                          const next = [...items];
                          next[i] = { ...next[i], [f.key]: e.target.value };
                          replace(next);
                        }}
                      />
                    ) : (
                      <input
                        className={`mt-1 ${inputCls}`}
                        placeholder={f.placeholder}
                        value={String(item[f.key] ?? "")}
                        onChange={(e) => {
                          const next = [...items];
                          next[i] = { ...next[i], [f.key]: e.target.value };
                          replace(next);
                        }}
                      />
                    )}
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-3"
          onClick={() => replace([...items, blank()])}
        >
          <Plus className="mr-1.5 size-3.5" /> Add {field.itemLabel.toLowerCase()}
        </Button>
      </div>
    );
  }

  if (field.type === "toggle") {
    const on = value === true;
    return (
      <div className="flex items-center justify-between gap-4 rounded-lg border border-hairline bg-background/60 px-3 py-2.5">
        <Label label={field.label} help={field.help} />
        <button
          type="button"
          role="switch"
          aria-checked={on}
          aria-label={field.label}
          onClick={() => onChange(!on)}
          className={
            "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors " +
            (on ? "bg-navy" : "bg-muted-foreground/40")
          }
        >
          <span
            className={
              "inline-block size-5 rounded-full bg-white shadow transition-transform " +
              (on ? "translate-x-[22px]" : "translate-x-0.5")
            }
          />
        </button>
      </div>
    );
  }

  return (
    <label className="block">
      <Label label={field.label} help={field.help} />
      {field.type === "textarea" ? (
        <textarea
          rows={4}
          className={`mt-2 ${inputCls}`}
          placeholder={field.placeholder}
          value={String(value ?? "")}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <input
          className={`mt-2 ${inputCls}`}
          placeholder={field.placeholder}
          value={String(value ?? "")}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </label>
  );
}

function Label({ label, help }: { label: string; help?: string }) {
  return (
    <div>
      <span className="text-sm font-600 text-navy">{label}</span>
      {help ? <span className="ml-2 text-xs text-ink-muted">{help}</span> : null}
    </div>
  );
}

function IconBtn({
  children,
  onClick,
  disabled,
  label,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="grid size-7 place-items-center rounded-md border border-hairline text-ink-muted transition-colors hover:border-navy hover:text-navy disabled:opacity-30"
    >
      {children}
    </button>
  );
}
