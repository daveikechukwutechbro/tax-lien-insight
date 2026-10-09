function readAdminFlag(): string | undefined {
  if (typeof process !== "undefined" && process.env?.VITE_ADMIN_ONLY) {
    return process.env.VITE_ADMIN_ONLY;
  }
  return import.meta.env?.VITE_ADMIN_ONLY;
}

export const ADMIN_SITE = readAdminFlag() === "1";