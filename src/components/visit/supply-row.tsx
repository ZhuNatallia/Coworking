"use client";

import { Minus, PackageCheck, Plus, ShoppingBag } from "lucide-react";
import { useState, useTransition } from "react";
import { deliverRequest, setSupplyState } from "@/app/actions/visits";
import { cx } from "@/components/ui-core";
import { useI18n } from "@/lib/i18n/client";
import type { SupplyStatus, SupplyUnit } from "@/lib/types";

export interface SupplyRowProps {
  id: string;
  visitId: string;
  name: string;
  unit: SupplyUnit;
  quantity: number | null;
  status: SupplyStatus | null;
  /** Open "take with you" request for this office and supply. */
  request: { id: string; fromThisVisit: boolean; byName: string | null; date: string | null } | null;
}

const STATUS_STYLE: Record<SupplyStatus, string> = {
  ok: "border-brand-600 bg-brand-600 text-white",
  low: "border-warn-700 bg-warn-50 text-warn-700",
  out: "border-danger-700 bg-danger-50 text-danger-700",
};

export function SupplyRow({ id, visitId, name, unit, quantity: q0, status: s0, request: r0 }: SupplyRowProps) {
  const { t, fmt } = useI18n();
  const [quantity, setQuantity] = useState(q0);
  const [status, setStatus] = useState(s0);
  const [request, setRequest] = useState(r0);
  const [error, setError] = useState(false);
  const [pending, startTransition] = useTransition();
  const step = unit === "kg" || unit === "l" ? 0.5 : 1;

  function save(nextQuantity: number | null, nextStatus: SupplyStatus | null) {
    const prev = { quantity, status, request };
    setQuantity(nextQuantity);
    setStatus(nextStatus);
    setError(false);
    startTransition(async () => {
      try {
        const res = await setSupplyState(id, nextQuantity, nextStatus);
        setRequest(res.requestId ? { id: res.requestId, fromThisVisit: res.fromThisVisit, byName: request?.byName ?? null, date: request?.date ?? null } : null);
      } catch {
        setQuantity(prev.quantity);
        setStatus(prev.status);
        setRequest(prev.request);
        setError(true);
      }
    });
  }

  function deliver() {
    if (!request) return;
    const prev = { status, request };
    setStatus("ok");
    setRequest(null);
    startTransition(async () => {
      try {
        await deliverRequest(request.id, visitId);
      } catch {
        setStatus(prev.status);
        setRequest(prev.request);
        setError(true);
      }
    });
  }

  const changeQty = (delta: number) => {
    const next = Math.max(0, Math.round(((quantity ?? 0) + delta) * 10) / 10);
    save(next, status);
  };

  return (
    <div className="flex flex-col gap-2.5 py-3">
      <div className="flex items-center gap-3">
        <p className="min-w-0 flex-1 font-semibold">{name}</p>
        <div className="flex items-center rounded-xl border border-line bg-white">
          <button type="button" onClick={() => changeQty(-step)} className="flex size-10 items-center justify-center text-muted" aria-label={t("supply.less", { name })}>
            <Minus className="size-4" />
          </button>
          <input
            inputMode="decimal"
            aria-label={t("supply.amount", { name })}
            value={quantity ?? ""}
            placeholder="—"
            onChange={(e) => {
              const raw = e.target.value.replace(",", ".");
              if (raw === "") return setQuantity(null);
              const n = Number(raw);
              if (Number.isFinite(n) && n >= 0) setQuantity(n);
            }}
            onBlur={() => quantity !== q0 && save(quantity, status)}
            className="w-10 bg-transparent text-center text-[16px] font-semibold outline-none"
          />
          <button type="button" onClick={() => changeQty(step)} className="flex size-10 items-center justify-center text-muted" aria-label={t("supply.more", { name })}>
            <Plus className="size-4" />
          </button>
        </div>
        <span className="w-16 text-sm text-muted">{fmt.unit(quantity, unit)}</span>
      </div>

      <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label={t("supply.status", { name })}>
        {(["ok", "low", "out"] as const).map((s) => (
          <button
            key={s}
            type="button"
            role="radio"
            aria-checked={status === s}
            onClick={() => save(quantity, s)}
            className={cx(
              "min-h-11 rounded-xl border px-1 text-sm font-semibold transition",
              status === s ? STATUS_STYLE[s] : "border-line bg-white text-ink",
            )}
          >
            {t(`supplyStatus.${s}`)}
          </button>
        ))}
      </div>

      {request && (
        <div className="flex items-center gap-2 rounded-xl bg-warn-50 px-3 py-2 text-sm text-warn-700">
          <ShoppingBag className="size-4 shrink-0" />
          <span className="flex-1">
            {request.fromThisVisit
              ? t("supply.added")
              : `${request.byName ? t("supply.inListBy", { name: request.byName }) : t("supply.inList")}${request.date ? `, ${request.date}` : ""}`}
          </span>
          {!request.fromThisVisit && (
            <button
              type="button"
              onClick={deliver}
              disabled={pending}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-brand-600 px-3 font-semibold text-white"
            >
              <PackageCheck className="size-4" />
              {t("supply.delivered")}
            </button>
          )}
        </div>
      )}
      {error && <p className="text-sm text-danger-700">{t("common.saveError")}</p>}
    </div>
  );
}
