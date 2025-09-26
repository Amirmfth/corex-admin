'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useTransition } from 'react';
import { toast } from 'sonner';

type PurchaseReceivePanelProps = {
  purchaseId: string;
  alreadyReceived: boolean;
};

export default function PurchaseReceivePanel({
  purchaseId,
  alreadyReceived,
}: PurchaseReceivePanelProps) {
  const t = useTranslations('purchases');
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleReceive() {
    startTransition(async () => {
      try {
        const response = await fetch(`/api/purchases/${purchaseId}/receive`, {
          method: 'POST',
        });

        const payload = await response.json().catch(() => ({}));

        if (!response.ok) {
          const message =
            typeof payload?.message === 'string' ? payload.message : t('receiveError');
          throw new Error(message);
        }

        if (response.status === 200 || payload?.alreadyReceived) {
          toast.info(t('alreadyReceivedNotice'));
        } else {
          toast.success(t('receiveSuccess'));
        }

        router.refresh();
      } catch (error) {
        const message = error instanceof Error ? error.message : t('receiveError');
        toast.error(message);
      }
    });
  }

  return (
    <aside className="space-y-4">
      <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-[var(--foreground)]">{t('receiveCardTitle')}</h2>
        <p className="mt-2 text-sm text-[var(--muted)]">{t('receiveCardSubtitle')}</p>
        <button
          type="button"
          onClick={handleReceive}
          className="mt-4 inline-flex items-center justify-center gap-2 rounded-full border border-transparent bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[var(--accent-foreground)] transition hover:bg-[var(--accent-hover)] disabled:cursor-not-allowed disabled:opacity-60"
          disabled={pending || alreadyReceived}
        >
          {pending ? t('receiving') : alreadyReceived ? t('receivedCta') : t('receiveCta')}
        </button>
        {alreadyReceived ? (
          <p className="mt-3 text-xs text-emerald-600">{t('receiveCompleteCopy')}</p>
        ) : (
          <p className="mt-3 text-xs text-[var(--muted)]">{t('receiveHint')}</p>
        )}
      </div>
      <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 text-sm text-[var(--muted)] shadow-sm">
        <h3 className="text-sm font-semibold text-[var(--foreground)]">{t('nextStepsTitle')}</h3>
        <ul className="mt-3 list-disc space-y-2 ps-5">
          <li>{t('nextStepsInventory')}</li>
          <li>{t('nextStepsSales')}</li>
        </ul>
      </div>
    </aside>
  );
}
