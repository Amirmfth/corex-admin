import { routing, type AppLocale } from "../i18n/routing";

function matchLocale(candidate: string | null | undefined): AppLocale | null {
  if (!candidate) {
    return null;
  }

  const trimmed = candidate.trim().toLowerCase();

  if (!trimmed) {
    return null;
  }

  const locales = routing.locales as readonly string[];

  if ((locales as readonly string[]).includes(trimmed)) {
    return trimmed as AppLocale;
  }

  const base = trimmed.split("-")[0];

  if ((locales as readonly string[]).includes(base)) {
    return base as AppLocale;
  }

  return null;
}

function localeFromCookie(header: string | null): AppLocale | null {
  if (!header) {
    return null;
  }

  const cookies = header.split(";");

  for (const cookie of cookies) {
    const [rawName, ...rawValueParts] = cookie.split("=");
    const name = rawName?.trim();

    if (name?.toUpperCase() !== "NEXT_LOCALE") {
      continue;
    }

    const value = rawValueParts.join("=");
    const decoded = value ? decodeURIComponent(value) : value;
    const matched = matchLocale(decoded);

    if (matched) {
      return matched;
    }
  }

  return null;
}

function localeFromAcceptLanguage(header: string | null): AppLocale | null {
  if (!header) {
    return null;
  }

  const parts = header.split(",");

  for (const part of parts) {
    const [language] = part.split(";");
    const matched = matchLocale(language);

    if (matched) {
      return matched;
    }
  }

  return null;
}

export function resolveRequestLocale(request: Request): AppLocale {
  return (
    localeFromCookie(request.headers.get("cookie")) ??
    localeFromAcceptLanguage(request.headers.get("accept-language")) ??
    routing.defaultLocale
  );
}
