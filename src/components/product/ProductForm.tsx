"use client";

import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";

import CategorySelect from "../common/CategorySelect";
import ImageUrlListInput from "../common/ImageUrlListInput";
import JsonEditor from "../common/JsonEditor";

type ProductFormInitialValues = {
  name?: string;
  brand?: string | null;
  model?: string | null;
  categoryId?: string | null;
  imageUrls?: string[];
  specsJson?: unknown;
};

type ProductFormProps = {
  mode: "create" | "edit";
  productId?: string;
  initialValues?: ProductFormInitialValues;
  redirectTo?: string;
};

type FormErrors = {
  name?: string;
  specsJson?: string;
  form?: string;
};

function serializeSpecs(value: unknown): string {
  if (value == null) {
    return "";
  }

  try {
    return JSON.stringify(value, null, 2);
  } catch (error) {
    console.error(error);
    return "";
  }
}

export default function ProductForm({ mode, productId, initialValues, redirectTo }: ProductFormProps) {
  const router = useRouter();
  const t = useTranslations("products.form");
  const locale = useLocale();
  const [name, setName] = useState(() => initialValues?.name ?? "");
  const [brand, setBrand] = useState(() => initialValues?.brand ?? "");
  const [model, setModel] = useState(() => initialValues?.model ?? "");
  const [categoryId, setCategoryId] = useState<string | null>(() => initialValues?.categoryId ?? null);
  const [imageUrls, setImageUrls] = useState<string[]>(() => initialValues?.imageUrls ?? []);
  const [specs, setSpecs] = useState(() => serializeSpecs(initialValues?.specsJson));
  const [errors, setErrors] = useState<FormErrors>({});
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextErrors: FormErrors = {};
    const trimmedName = name.trim();

    if (!trimmedName) {
      nextErrors.name = t("nameRequired");
    }

    let parsedSpecs: unknown = undefined;

    if (specs.trim()) {
      try {
        parsedSpecs = JSON.parse(specs);
      } catch (error) {
        console.error(error);
        nextErrors.specsJson = t("specsInvalid");
      }
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setErrors({});
    setPending(true);

    const payload: Record<string, unknown> = {
      name: trimmedName,
      brand: brand.trim() ? brand.trim() : null,
      model: model.trim() ? model.trim() : null,
      categoryId,
      imageUrls: imageUrls
        .map((url) => url.trim())
        .filter((url, index, array) => url.length > 0 && array.indexOf(url) === index),
    };

    if (specs.trim()) {
      payload.specsJson = parsedSpecs ?? null;
    } else if (mode === "edit") {
      payload.specsJson = null;
    }

    const endpoint = mode === "create" ? "/api/products" : `/api/products/${productId}`;
    const method = mode === "create" ? "POST" : "PATCH";

    try {
      const response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json", "Accept-Language": locale },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { message?: string } | null;
        const message = data?.message ?? t("submitError");
        setErrors({ form: message });
        toast.error(message);
        return;
      }

      if (mode === "create") {
        toast.success(t("createSuccess"));
        if (redirectTo) {
          router.push(redirectTo);
        } else {
          router.push("/products");
        }
      } else {
        toast.success(t("updateSuccess"));
        router.refresh();
      }
    } catch (error) {
      console.error(error);
      const message = t("submitError");
      setErrors({ form: message });
      toast.error(message);
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      {errors.form ? (
        <div className="rounded-xl border border-[var(--destructive)] bg-[var(--surface)] p-3 text-sm text-[var(--destructive)]">
          {errors.form}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-2">
          <label htmlFor="product-name" className="text-sm font-medium text-[var(--foreground)]">
            {t("nameLabel")}
          </label>
          <input
            id="product-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder={t("namePlaceholder")}
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm shadow-sm focus:border-[var(--accent)] focus:outline-none"
            required
          />
          {errors.name ? <p className="text-xs text-[var(--destructive)]">{errors.name}</p> : null}
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="product-brand" className="text-sm font-medium text-[var(--foreground)]">
            {t("brandLabel")}
          </label>
          <input
            id="product-brand"
            value={typeof brand === "string" ? brand : ""}
            onChange={(event) => setBrand(event.target.value)}
            placeholder={t("brandPlaceholder")}
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm shadow-sm focus:border-[var(--accent)] focus:outline-none"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="product-model" className="text-sm font-medium text-[var(--foreground)]">
            {t("modelLabel")}
          </label>
          <input
            id="product-model"
            value={typeof model === "string" ? model : ""}
            onChange={(event) => setModel(event.target.value)}
            placeholder={t("modelPlaceholder")}
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm shadow-sm focus:border-[var(--accent)] focus:outline-none"
          />
        </div>

        <CategorySelect
          id="product-category"
          label={t("categoryLabel")}
          value={categoryId}
          onChange={setCategoryId}
          placeholder={t("categoryPlaceholder")}
          noneLabel={t("categoryNone")}
          helperText={t("categoryHelper")}
          error={undefined}
          loadingLabel={t("categoryLoading")}
          retryLabel={t("categoryRetry")}
        />
      </div>

      <ImageUrlListInput
        id="product-images"
        label={t("imagesLabel")}
        value={imageUrls}
        onChange={setImageUrls}
        placeholder={t("imagesPlaceholder")}
        helperText={t("imagesHelper")}
        addLabel={t("imagesAdd")}
        removeLabel={t("imagesRemove")}
      />

      <JsonEditor
        id="product-specs"
        label={t("specsLabel")}
        value={specs}
        onChange={setSpecs}
        helperText={t("specsHelper")}
        error={errors.specsJson}
        validateLabel={t("specsValidate")}
        formatLabel={t("specsFormat")}
        validMessage={t("specsValid")}
        invalidMessage={t("specsInvalid")}
      />

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center gap-2 rounded-full border border-transparent bg-[var(--accent)] px-5 py-2 text-sm font-semibold text-[var(--accent-foreground)] transition hover:bg-[var(--accent-hover)] disabled:cursor-not-allowed disabled:opacity-70"
        >
          {pending ? t("submitting") : mode === "create" ? t("submitCreate") : t("submitUpdate")}
        </button>
      </div>
    </form>
  );
}
