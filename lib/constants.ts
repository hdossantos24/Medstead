export const BRAND = "MedStead";
export const TAGLINE = "FASTER ACCESS. BETTER CARE.";
export const CONTACT_ORDERS = "Orders@medsteadgroup.com";
export const SITE_HOST = "medsteadtransport.com";
export const BOLT_STANDIN = "https://go.medsteadtransport.com";
export const MARKETING_DOOR = "https://www.medsteadgroup.com";

export const WAREHOUSE = {
  name: "WareSpace – MedStead",
  street: "700 NW 57th Ct, Unit C15",
  city: "Fort Lauderdale",
  state: "FL",
  zip: "33309",
  country: "United States",
  line: "WareSpace – MedStead, 700 NW 57th Ct, Unit C15, Fort Lauderdale, FL 33309, United States",
};

export function warehouseAddressFor(name: string) {
  return `${name} c/o WareSpace - MedStead, 700 NW 57th Ct, Unit C15, Fort Lauderdale, FL 33309, United States`;
}

export const SERVICES = [
  {
    id: "EXPRESS_AIR",
    title: "Express Air",
    badge: "Fastest",
    badgeTone: "blue" as const,
    window: "3–5 days",
    icon: "plane" as const,
    blurb: "Priority air freight delivered in 3–5 days for time-sensitive cargo.",
  },
  {
    id: "STANDARD_SEA",
    title: "Standard Sea",
    badge: "Best Value",
    badgeTone: "green" as const,
    window: "5–7 days",
    icon: "ship" as const,
    highlight: true,
    blurb: "Cost-effective ocean freight for bulky or heavy shipments in 5–7 days.",
  },
  {
    id: "PICKUP",
    title: "Pickup Points",
    badge: null,
    badgeTone: "blue" as const,
    window: "Freeport & Nassau",
    icon: "pin" as const,
    blurb: "Convenient pickup locations across Freeport & Nassau, Grand Bahama.",
  },
  {
    id: "CUSTOMS",
    title: "Customs Support",
    badge: "Included",
    badgeTone: "green" as const,
    window: "Documentation help",
    icon: "doc" as const,
    blurb: "Duty estimates and clearance assistance. MedStead is not a licensed customs broker.",
  },
  {
    id: "TRACKING",
    title: "Live Tracking",
    badge: "24/7",
    badgeTone: "blue" as const,
    window: "Warehouse to door",
    icon: "box" as const,
    blurb: "Real-time status updates from our Fort Lauderdale warehouse to your door.",
  },
  {
    id: "MEDICAL_REMOTE",
    title: "Hard-to-reach medical",
    badge: "Specialty",
    badgeTone: "green" as const,
    window: "Medical cargo",
    icon: "cross" as const,
    blurb: "Medical freight to destinations other carriers struggle to finish. Not a drug catalog.",
  },
] as const;

export const BOOKABLE_SERVICES = [
  {
    id: "EXPRESS_AIR",
    title: "Express Air",
    window: "3–5 days after release",
    detail: "Priority air for time-sensitive cargo.",
  },
  {
    id: "STANDARD_SEA",
    title: "Standard Sea",
    window: "5–7 days after release",
    detail: "Cost-effective ocean freight for bulky or heavy shipments.",
  },
  {
    id: "MEDICAL_REMOTE",
    title: "Hard-to-reach medical transport",
    window: "Quoted per lane",
    detail: "Medical cargo to remote and island destinations. Not a clinic shop.",
  },
] as const;

export type BookableServiceId = (typeof BOOKABLE_SERVICES)[number]["id"];

export const ORIGINS = [
  { code: "FLL", name: "Fort Lauderdale, FL, USA", city: "Fort Lauderdale", region: "FL", country: "United States" },
  { code: "MIA", name: "Miami, FL, USA", city: "Miami", region: "FL", country: "United States" },
  { code: "MSY", name: "New Orleans, LA, USA", city: "New Orleans", region: "LA", country: "United States" },
  { code: "OTH", name: "Other origin", city: "", region: "", country: "United States" },
] as const;

export const DESTINATIONS = [
  { code: "NAS", name: "Nassau, Bahamas", city: "Nassau", region: "", country: "Bahamas" },
  { code: "FPO", name: "Freeport, Bahamas", city: "Freeport", region: "Grand Bahama", country: "Bahamas" },
  { code: "BGI", name: "Bridgetown, Barbados", city: "Bridgetown", region: "", country: "Barbados" },
  { code: "KIN", name: "Kingston, Jamaica", city: "Kingston", region: "", country: "Jamaica" },
  { code: "GRU", name: "São Paulo, Brazil", city: "São Paulo", region: "", country: "Brazil" },
  { code: "MIA", name: "Miami, FL, USA", city: "Miami", region: "FL", country: "United States" },
  { code: "OTH", name: "Other destination", city: "", region: "", country: "" },
] as const;

export const PICKUP_POINTS = [
  { id: "NASSAU", label: "Nassau pickup" },
  { id: "FREEPORT", label: "Freeport pickup" },
  { id: "ADDRESS", label: "Deliver to an address" },
  { id: "WAREHOUSE", label: "Hold at Fort Lauderdale warehouse" },
] as const;

export const BOOKING_STATUSES = [
  "REQUESTED",
  "CONFIRMED",
  "INVOICE_ISSUED",
  "PAID",
  "RECEIVED",
  "IN_TRANSIT",
  "CUSTOMS",
  "READY_PICKUP",
  "DELIVERED",
] as const;

export type BookingStatus = (typeof BOOKING_STATUSES)[number];

export const STATUS_LABEL: Record<string, string> = {
  REQUESTED: "Requested",
  CONFIRMED: "Confirmed",
  INVOICE_ISSUED: "Invoice issued — pay later",
  PAID: "Payment received",
  RECEIVED: "Received at warehouse",
  IN_TRANSIT: "In transit",
  CUSTOMS: "Customs",
  READY_PICKUP: "Ready for pickup",
  DELIVERED: "Delivered",
};

export const SERVICE_LABEL: Record<string, string> = {
  EXPRESS_AIR: "Express Air",
  STANDARD_SEA: "Standard Sea",
  MEDICAL_REMOTE: "Hard-to-reach medical transport",
};

export const SERVICE_WINDOW: Record<string, string> = {
  EXPRESS_AIR: "3–5 days after release",
  STANDARD_SEA: "5–7 days after release",
  MEDICAL_REMOTE: "Quoted per lane",
};

export const INVOICE_STATUS_LABEL: Record<string, string> = {
  none: "No invoice yet",
  issued: "Invoice issued",
  pay_later: "Pay later",
  paid: "Paid",
};

export const PAYMENT_METHOD_LABEL: Record<string, string> = {
  wire: "Wire transfer",
  cash: "Cash",
};

export const FORBIDDEN_CARGO_TERMS = [
  "semaglutide",
  "tirzepatide",
  "retatrutide",
  "lilly",
  "incretin",
  "glp-1",
  "glp1",
  "peptide",
];

export const HOW_IT_WORKS = [
  {
    step: "01",
    title: "Create account",
    body: "Sign up so you can see bookings and your Fort Lauderdale warehouse address.",
  },
  {
    step: "02",
    title: "Book a shipment",
    body: "Tell us from/to, cargo, and timing. You get a confirmation and tracking ID — no card is charged.",
  },
  {
    step: "03",
    title: "Ship to FL",
    body: "Send packages to the WareSpace C15 warehouse, or ask us to coordinate pickup.",
  },
  {
    step: "04",
    title: "We deliver",
    body: "MedStead forwards the shipment. Track it here. Ops emails an invoice you can pay later.",
  },
];
