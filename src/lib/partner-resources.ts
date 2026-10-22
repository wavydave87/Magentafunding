import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";

/**
 * Opens a stored partner resource through a short-lived signed URL. Shared by
 * the internal Library and the partner-facing Resources screen so both open
 * files exactly the same way.
 */
export async function openResourceFile(storagePath: string) {
  const { data, error } = await supabase.storage
    .from("partner-resources")
    .createSignedUrl(storagePath, 120);
  if (error || !data?.signedUrl) {
    toast.error("That file could not be opened. Try again in a moment.");
    return;
  }
  window.open(data.signedUrl, "_blank", "noopener,noreferrer");
}

/** Opens either the linked URL or the stored file for a resource record. */
export async function openResource(resource: {
  kind: string;
  link_url?: string | null;
  storage_path?: string | null;
}) {
  if (resource.kind === "link" && resource.link_url) {
    window.open(resource.link_url, "_blank", "noopener,noreferrer");
    return;
  }
  if (resource.storage_path) {
    await openResourceFile(resource.storage_path);
    return;
  }
  toast.error("This resource has no file or link attached yet.");
}

/** Human-readable file size for resource detail rows. */
export function fileSizeLabel(bytes?: number | null) {
  if (!bytes || bytes <= 0) return null;
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value < 10 && unit > 0 ? value.toFixed(1) : Math.round(value)} ${units[unit]}`;
}
