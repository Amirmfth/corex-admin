import { redirect } from "next/navigation";

type SalesIndexProps = {
  params: Promise<{ locale: string }>;
};

export default async function SalesIndexPage({ params }: SalesIndexProps) {
  const { locale } = await params;
  redirect(`/${locale}/sales/new`);
}
