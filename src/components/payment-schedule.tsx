import { useId, useMemo, useState } from "react";
import { CalendarDays, ChevronDown } from "lucide-react";

import {
  formatMoney,
  formatScheduleDate,
  paymentSchedule,
  type Frequency,
  type Structure,
} from "@/lib/pricing";

interface Props {
  structure: Structure;
  frequency: Frequency;
  fundingDate: string | null;
}

/**
 * Client-facing amortization schedule: summary strip, quarter milestones and the
 * full per-payment table. Collapsed by default so the offer page stays calm.
 */
export function PaymentSchedule({ structure, frequency, fundingDate }: Props) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const schedule = useMemo(
    () => paymentSchedule(structure, fundingDate),
    [structure, fundingDate],
  );

  const dateLabel = (iso: string | null, index: number) =>
    iso ? formatScheduleDate(iso) : `Day ${index}`;

  return (
    <div className="mt-5 overflow-hidden rounded-xl border border-border">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={panelId}
        className="focus-ring flex min-h-11 w-full items-center justify-between gap-3 bg-secondary px-3.5 py-3 text-left"
      >
        <span className="inline-flex items-center gap-2 text-[13px] font-bold text-plum">
          <CalendarDays className="size-4 text-primary" aria-hidden />
          Show Payment Schedule
        </span>
        <ChevronDown
          className={`size-4 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden
        />
      </button>

      {open ? (
        <div id={panelId} className="p-3.5">
          <dl className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            <SummaryItem label="Payments" value={`${schedule.rows.length} ${frequency}`} />
            <SummaryItem
              label="Payment Amount"
              value={formatMoney(schedule.rows[0]?.payment ?? 0, 2)}
            />
            <SummaryItem
              label="First Payment"
              value={schedule.firstDate ? formatScheduleDate(schedule.firstDate) : "Pick a date"}
            />
            <SummaryItem
              label="Payoff Date"
              value={schedule.payoffDate ? formatScheduleDate(schedule.payoffDate) : "Pick a date"}
            />
          </dl>

          {!fundingDate ? (
            <p className="mt-3 rounded-[10px] border border-border bg-secondary px-3.5 py-2.5 text-xs text-muted-foreground">
              Choose a requested funding date above to see exact payment dates and your
              payoff date.
            </p>
          ) : null}

          <p className="mt-4 mb-1.5 text-xs font-bold tracking-wide uppercase text-muted-foreground">
            Progress Milestones
          </p>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[13px]">
              <caption className="sr-only">
                Payment progress at 25, 50, 75 and 100 percent paid
              </caption>
              <thead>
                <tr>
                  <Th>Paid</Th>
                  <Th>Payment #</Th>
                  <Th>Date</Th>
                  <Th>Paid To Date</Th>
                  <Th>Remaining</Th>
                </tr>
              </thead>
              <tbody>
                {schedule.milestones.map((m) => (
                  <tr key={m.percent}>
                    <Td className="font-bold text-primary">{m.percent}%</Td>
                    <Td>{m.row.index}</Td>
                    <Td>{dateLabel(m.row.date, m.row.index)}</Td>
                    <Td>{formatMoney(m.row.paidToDate, 2)}</Td>
                    <Td>{formatMoney(m.row.remaining, 2)}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="mt-4 mb-1.5 text-xs font-bold tracking-wide uppercase text-muted-foreground">
            Every Payment
          </p>
          <div className="max-h-80 overflow-y-auto overflow-x-auto rounded-[10px] border border-border">
            <table className="w-full border-collapse text-[13px]">
              <caption className="sr-only">
                Full {frequency} payment schedule with running balance
              </caption>
              <thead className="sticky top-0 bg-secondary">
                <tr>
                  <Th>#</Th>
                  <Th>Date</Th>
                  <Th>Payment</Th>
                  <Th>Paid To Date</Th>
                  <Th>Remaining</Th>
                </tr>
              </thead>
              <tbody>
                {schedule.rows.map((row) => (
                  <tr key={row.index}>
                    <Td>{row.index}</Td>
                    <Td>{dateLabel(row.date, row.index)}</Td>
                    <Td>{formatMoney(row.payment, 2)}</Td>
                    <Td>{formatMoney(row.paidToDate, 2)}</Td>
                    <Td>{formatMoney(row.remaining, 2)}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="mt-2.5 text-xs text-muted-foreground">
            Estimated schedule. Payments are collected on business days; the final payment
            settles any rounding.
          </p>
        </div>
      ) : null}
    </div>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[10px] border border-border bg-card px-3 py-2.5">
      <dt className="text-[11px] font-bold tracking-wide uppercase text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-0.5 text-[13px] font-extrabold text-plum capitalize">{value}</dd>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th
      scope="col"
      className="border-b border-border px-2.5 py-2 text-left text-[11px] font-bold tracking-wide uppercase text-muted-foreground"
    >
      {children}
    </th>
  );
}

function Td({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <td className={`border-b border-border px-2.5 py-2 last:text-right ${className}`}>
      {children}
    </td>
  );
}
