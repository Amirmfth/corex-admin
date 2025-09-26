import { redirect } from "next/navigation";

type LocaleParams = {
  params: Promise<{ locale: string }>;
};

export default async function LocaleRootPage({ params }: LocaleParams) {
  const { locale } = await params;
  redirect(`/${locale}/items`);
}
