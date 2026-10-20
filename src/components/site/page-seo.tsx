import { useEffect } from "react";

/**
 * Client-side page SEO: sets `document.title` and the meta description so the
 * admin-controlled SEO fields per page take effect after hydration. The
 * server-rendered defaults come from the root route's settings loader.
 */
export function PageSeo({ title, description }: { title?: string; description?: string }) {
  useEffect(() => {
    if (title) document.title = title;
    if (description) {
      let el = document.querySelector('meta[name="description"]');
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute("name", "description");
        document.head.appendChild(el);
      }
      el.setAttribute("content", description);
    }
  }, [title, description]);
  return null;
}
