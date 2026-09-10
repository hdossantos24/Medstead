import { Badge } from "./ui";
import { FA_STATUS_LABEL, type FaStatus } from "@/lib/flightaware";

const TONE: Record<string, "green" | "blue" | "navy" | "amber"> = {
  ON_TIME: "green",
  ARRIVED: "green",
  SCHEDULED: "blue",
  EN_ROUTE: "blue",
  DELAYED: "amber",
  CANCELED: "amber",
  UNKNOWN: "navy",
  OFFLINE: "navy",
};

export function FaBadge({
  status,
  text,
}: {
  status?: string | null;
  text?: string | null;
}) {
  if (!status) return <Badge tone="navy">No monitor</Badge>;
  const label = FA_STATUS_LABEL[status as FaStatus] || status;
  const tone = TONE[status] || "navy";
  const detail = text && text !== label ? ` · ${text.slice(0, 36)}` : "";
  return <Badge tone={tone}>{label}{detail}</Badge>;
}
