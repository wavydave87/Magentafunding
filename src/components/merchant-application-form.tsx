/**
 * Field definitions and renderer for the merchant referral application.
 * Kept declarative so the wizard route stays readable.
 */
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import type { DraftPayload } from "@/lib/merchant-application";

type FieldType = "text" | "email" | "tel" | "number" | "date" | "textarea" | "select" | "checkbox";

export interface FieldDef {
  key: string;
  label: string;
  type?: FieldType;
  wide?: boolean;
  options?: string[];
  maxLength?: number;
  hint?: string;
  placeholder?: string;
}

const ENTITIES = [
  "Sole Proprietorship",
  "LLC",
  "S-Corporation",
  "C-Corporation",
  "Partnership",
  "Non-Profit",
];

const POSITIONS = ["None", "1 open position", "2 open positions", "3 or more"];

export const STEP_FIELDS: Record<number, FieldDef[]> = {
  1: [
    { key: "legal_business_name", label: "Legal business name", wide: true, maxLength: 160 },
    { key: "dba", label: "DBA / trading name", maxLength: 160 },
    { key: "website", label: "Website", maxLength: 160, placeholder: "https://" },
    { key: "business_address", label: "Business address", wide: true, maxLength: 200 },
    { key: "city", label: "City", maxLength: 80 },
    { key: "state", label: "State", maxLength: 40 },
    { key: "zip", label: "ZIP", maxLength: 12 },
    { key: "legal_entity", label: "Entity type", type: "select", options: ENTITIES },
    { key: "ein", label: "EIN", maxLength: 20, hint: "Nine digits, no dashes needed." },
    { key: "date_business_started", label: "Date business started", type: "date" },
    { key: "industry", label: "Industry", maxLength: 80 },
    {
      key: "business_description",
      label: "What does the business do?",
      type: "textarea",
      wide: true,
      maxLength: 500,
    },
  ],
  2: [
    { key: "owner_first_name", label: "Owner first name", maxLength: 80 },
    { key: "owner_last_name", label: "Owner last name", maxLength: 80 },
    { key: "owner_title", label: "Title", maxLength: 80 },
    { key: "owner_ownership_percent", label: "Ownership %", type: "number" },
    { key: "owner_email", label: "Owner email", type: "email", maxLength: 160 },
    { key: "owner_phone", label: "Owner phone", type: "tel", maxLength: 40 },
    { key: "owner_home_address", label: "Home address", wide: true, maxLength: 200 },
    { key: "owner_city", label: "City", maxLength: 80 },
    { key: "owner_state", label: "State", maxLength: 40 },
    { key: "owner_zip", label: "ZIP", maxLength: 12 },
  ],
  3: [
    { key: "requested_amount", label: "Funding needed ($)", type: "number" },
    {
      key: "funding_timeframe",
      label: "How soon do you need it?",
      type: "select",
      options: ["Immediately", "Within 1 week", "Within 30 days", "Just exploring"],
    },
    {
      key: "use_of_funds",
      label: "How will you use the funds?",
      type: "textarea",
      wide: true,
      maxLength: 500,
    },
  ],
  4: [
    { key: "average_monthly_revenue", label: "Average monthly revenue ($)", type: "number" },
    { key: "existing_balances", label: "Current outstanding balances ($)", type: "number" },
    {
      key: "existing_positions",
      label: "Existing funding positions",
      type: "select",
      options: POSITIONS,
    },
    {
      key: "funding_history",
      label: "Previous business funding",
      type: "textarea",
      wide: true,
      maxLength: 400,
      hint: "Optional — who you've funded with before and how it went.",
    },
  ],
  5: [
    { key: "contact_first_name", label: "Contact first name", maxLength: 80 },
    { key: "contact_last_name", label: "Contact last name", maxLength: 80 },
    { key: "contact_email", label: "Contact email", type: "email", maxLength: 160 },
    { key: "contact_phone", label: "Contact phone", type: "tel", maxLength: 40 },
    {
      key: "best_time_to_reach",
      label: "Best time to reach you",
      type: "select",
      options: ["Morning", "Afternoon", "Evening", "Anytime"],
    },
  ],
  6: [
    {
      key: "bank_connection_ready",
      label: "I can connect my business bank account for verification",
      type: "checkbox",
      wide: true,
    },
    {
      key: "statements_ready",
      label: "I have my last three months of bank statements ready",
      type: "checkbox",
      wide: true,
    },
    {
      key: "document_notes",
      label: "Anything we should know before we ask for documents?",
      type: "textarea",
      wide: true,
      maxLength: 400,
    },
  ],
  7: [],
};

interface Props {
  step: number;
  payload: DraftPayload;
  invalid: Set<string>;
  onChange: (key: string, value: string | boolean) => void;
}

export function StepFields({ step, payload, invalid, onChange }: Props) {
  const fields = STEP_FIELDS[step] ?? [];
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {fields.map((field) => {
        const id = `field-${field.key}`;
        const value = payload[field.key];
        const isInvalid = invalid.has(field.key);

        if (field.type === "checkbox") {
          return (
            <label
              key={field.key}
              htmlFor={id}
              className="flex items-start gap-3 rounded-lg border border-border/70 p-3 sm:col-span-2"
            >
              <Checkbox
                id={id}
                checked={value === true || value === "true"}
                onCheckedChange={(checked) => onChange(field.key, checked === true)}
              />
              <span className="text-sm leading-snug">{field.label}</span>
            </label>
          );
        }

        return (
          <div
            key={field.key}
            className={cn("grid gap-1.5", (field.wide || field.type === "textarea") && "sm:col-span-2")}
          >
            <Label htmlFor={id}>{field.label}</Label>
            {field.type === "textarea" ? (
              <Textarea
                id={id}
                rows={3}
                {...(field.maxLength ? { maxLength: field.maxLength } : {})}
                value={String(value ?? "")}
                aria-invalid={isInvalid}
                onChange={(e) => onChange(field.key, e.target.value)}
              />
            ) : field.type === "select" ? (
              <select
                id={id}
                className="h-11 rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring aria-[invalid=true]:border-coral"
                value={String(value ?? "")}
                aria-invalid={isInvalid}
                onChange={(e) => onChange(field.key, e.target.value)}
              >
                <option value="">Select one</option>
                {(field.options ?? []).map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            ) : (
              <Input
                id={id}
                type={field.type ?? "text"}
                {...(field.maxLength ? { maxLength: field.maxLength } : {})}
                {...(field.placeholder ? { placeholder: field.placeholder } : {})}
                value={String(value ?? "")}
                aria-invalid={isInvalid}
                onChange={(e) => onChange(field.key, e.target.value)}
              />
            )}
            {field.hint ? (
              <p className="text-xs text-muted-foreground">{field.hint}</p>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

/** Flattened label/value pairs for the review step. */
export function reviewRows(payload: DraftPayload): Array<{ label: string; value: string }> {
  const rows: Array<{ label: string; value: string }> = [];
  for (let step = 1; step <= 6; step += 1) {
    for (const field of STEP_FIELDS[step] ?? []) {
      const raw = payload[field.key];
      if (raw === undefined || raw === null || raw === "" || raw === false) continue;
      rows.push({ label: field.label, value: raw === true ? "Yes" : String(raw) });
    }
  }
  return rows;
}
