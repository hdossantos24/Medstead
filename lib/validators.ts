import { z } from "zod";
import { BOOKABLE_SERVICES, PICKUP_POINTS } from "./constants";
import { forbiddenCargoMatch } from "./cargo";

const serviceIds = BOOKABLE_SERVICES.map((s) => s.id) as [string, ...string[]];
const pickupIds = PICKUP_POINTS.map((p) => p.id) as [string, ...string[]];

export const bookingInput = z
  .object({
    service: z.enum(serviceIds),
    originMode: z.enum(["WAREHOUSE", "OTHER"]),
    originCode: z.string().min(2).max(8),
    originCity: z.string().min(1).max(80),
    originRegion: z.string().max(80).optional().or(z.literal("")),
    originCountry: z.string().min(2).max(80),
    originAddress: z.string().max(200).optional().or(z.literal("")),
    destCode: z.string().min(2).max(8),
    destCity: z.string().min(1).max(80),
    destRegion: z.string().max(80).optional().or(z.literal("")),
    destCountry: z.string().min(2).max(80),
    destAddress: z.string().max(200).optional().or(z.literal("")),
    pickupPoint: z.enum(pickupIds),
    cargoDescription: z.string().min(4).max(500),
    weightLb: z.number().positive().max(20000),
    pieces: z.number().int().positive().max(500),
    lengthIn: z.number().positive().max(200).optional(),
    widthIn: z.number().positive().max(200).optional(),
    heightIn: z.number().positive().max(200).optional(),
    readyDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    timingNote: z.string().max(300).optional().or(z.literal("")),
    contactName: z.string().min(2).max(80),
    contactEmail: z.string().email(),
    contactPhone: z.string().min(7).max(40),
    notes: z.string().max(500).optional().or(z.literal("")),
  })
  .superRefine((val, ctx) => {
    const hit = forbiddenCargoMatch(val.cargoDescription);
    if (hit) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["cargoDescription"],
        message: "This storefront does not accept that cargo type. Contact Orders@medsteadgroup.com.",
      });
    }
    if (val.pickupPoint === "ADDRESS" && !val.destAddress) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["destAddress"],
        message: "Add a delivery address, or choose a pickup point.",
      });
    }
  });

export const signupInput = z.object({
  name: z.string().min(2).max(80),
  email: z.string().email(),
  phone: z.string().max(40).optional().or(z.literal("")),
  password: z.string().min(8).max(80),
});

export const loginInput = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const staffLoginInput = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const employeeInput = z.object({
  name: z.string().min(2).max(80),
  email: z.string().email(),
  phone: z.string().max(40).optional().or(z.literal("")),
  password: z.string().min(8).max(80).optional().or(z.literal("")),
  role: z.enum(["ADMIN", "STAFF", "PILOT", "CARGO"]),
  active: z.boolean().optional(),
});

export const assignmentInput = z.object({
  title: z.string().min(2).max(160),
  note: z.string().max(500).optional().or(z.literal("")),
  kind: z.enum(["NEXT_ACTION", "TRACKING_UPDATE", "INVOICE", "RECEIVE_CARGO", "FLIGHT_TRIP"]),
  assigneeId: z.string().min(1),
  bookingCode: z.string().max(80).optional().or(z.literal("")),
  movementCode: z.string().max(80).optional().or(z.literal("")),
  dueAt: z.string().optional().or(z.literal("")),
});

export const staffRuleInput = z.object({
  role: z.enum(["ADMIN", "STAFF", "PILOT", "CARGO"]),
  key: z.enum([
    "manage_employees",
    "assign_work",
    "update_tracking",
    "issue_invoice",
    "view_all_bookings",
    "view_cargo_queue",
    "view_trips",
    "manage_schedule",
  ]),
  allowed: z.boolean(),
});
