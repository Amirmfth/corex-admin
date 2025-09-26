import { Plus } from "lucide-react";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import CategoryForm from "@/components/category/CategoryForm";
import CategoryTree from "@/components/category/CategoryTree";
import type { CategoryTreeNode } from "@/components/category/types";
import PageHeader from "@/components/PageHeader";

import { routing, type AppLocale } from "../../../../../i18n/routing";

export const dynamic = "force-dynamic";

async function fetchCategoriesTree(): Promise<CategoryTreeNode[]> {
  const headerList = await headers();
  const protocol = headerList.get("x-forwarded-proto") ?? "http";
  const host = headerList.get("host");

  if (!host) {
    throw new Error("Missing host header");
  }

  try {
    const response = await fetch(`${protocol}://${host}/api/categories`, {
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error("Failed to load categories");
    }

    return (await response.json()) as CategoryTreeNode[];
  } catch (error) {
    console.error(error);
    return [];
  }
}

interface CategoriesPageProps {
  params: Promise<{ locale: string }>;
}

export default async function CategoriesPage({ params }: CategoriesPageProps) {
  const { locale } = await params;

  if (!(routing.locales as readonly string[]).includes(locale)) {
    notFound();
  }

  const typedLocale = locale as AppLocale;

  const [t, categories] = await Promise.all([
    getTranslations({ locale: typedLocale, namespace: "categories" }),
    fetchCategoriesTree(),
  ]);

  return (
    <section className="flex flex-col gap-6">
      <PageHeader
        title={t("title")}
        description={t("subtitle")}
        actions={
          <CategoryForm
            mode="create"
            categories={categories}
            trigger={
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-full border border-transparent bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[var(--accent-foreground)] transition hover:bg-[var(--accent-hover)]"
              >
                <Plus className="size-4" aria-hidden />
                <span>{t("actions.addRoot")}</span>
              </button>
            }
          />
        }
      />

      <CategoryTree categories={categories} />
    </section>
  );
}
