import assert from "assert";
import {
  defaultAllowed,
  homePathForRole,
  isStaffRole,
  mapImportedEmployeeRole,
  PIN_PERMISSIONS,
  ruleAllowed,
} from "./staff";
import { bookingNextKind, inCargoLane, queueFromDesk } from "./staff-queue";
import { DOCUMENT_KINDS, MOVEMENT_KINDS, nextMovementCode } from "./airline-seam";

assert.strictEqual(isStaffRole("ADMIN"), true);
assert.strictEqual(isStaffRole("CUSTOMER"), false);
assert.strictEqual(homePathForRole("ADMIN"), "/ops");
assert.strictEqual(homePathForRole("STAFF"), "/ops/orders");
assert.strictEqual(homePathForRole("PILOT"), "/ops/trips");
assert.strictEqual(homePathForRole("CARGO"), "/ops/orders?lane=cargo");
assert.strictEqual(homePathForRole("CUSTOMER"), "/account");

assert.strictEqual(mapImportedEmployeeRole("medstead_admin"), "ADMIN");
assert.strictEqual(mapImportedEmployeeRole("ops"), "STAFF");
assert.strictEqual(mapImportedEmployeeRole("warehouse"), "CARGO");
assert.strictEqual(mapImportedEmployeeRole("pilot"), "PILOT");
assert.strictEqual(mapImportedEmployeeRole("customer"), null);

assert.strictEqual(defaultAllowed("ADMIN", "manage_employees"), true);
assert.strictEqual(defaultAllowed("STAFF", "manage_employees"), false);
assert.strictEqual(defaultAllowed("PILOT", "view_trips"), true);
assert.strictEqual(defaultAllowed("CARGO", "issue_invoice"), false);
assert.ok(!PIN_PERMISSIONS.includes("manage_employees"));

assert.strictEqual(
  ruleAllowed("STAFF", "issue_invoice", [{ role: "STAFF", key: "issue_invoice", allowed: false }]),
  false,
);
assert.strictEqual(ruleAllowed("STAFF", "issue_invoice", []), true);

assert.strictEqual(bookingNextKind({ status: "REQUESTED", invoiceStatus: "none" }), "confirm_booking");
assert.strictEqual(bookingNextKind({ status: "CONFIRMED", invoiceStatus: "none" }), "issue_invoice");
assert.strictEqual(bookingNextKind({ status: "PAID", invoiceStatus: "paid" }), "mark_received");
assert.strictEqual(bookingNextKind({ status: "DELIVERED", invoiceStatus: "paid" }), null);
assert.ok(inCargoLane({ status: "RECEIVED", originMode: "OTHER" }));
assert.ok(!inCargoLane({ status: "REQUESTED", originMode: "OTHER" }));

const staffQueue = queueFromDesk({
  role: "STAFF",
  userId: "u1",
  bookings: [
    {
      bookingCode: "MS-1",
      contactName: "Alex",
      destLabel: "Nassau",
      status: "REQUESTED",
      invoiceStatus: "none",
    },
  ],
  assignments: [],
});
assert.ok(staffQueue.some((i) => i.kind === "confirm_booking"));

const pilotQueue = queueFromDesk({
  role: "PILOT",
  userId: "p1",
  bookings: [
    {
      bookingCode: "MS-1",
      contactName: "Alex",
      destLabel: "Nassau",
      status: "REQUESTED",
      invoiceStatus: "none",
    },
  ],
  assignments: [
    {
      id: "a1",
      title: "Trip brief FLL-NAS",
      note: null,
      kind: "FLIGHT_TRIP",
      status: "OPEN",
      assigneeId: "p1",
      movement: { movementCode: "MS-20260902-FLL-NAS-1001", originCode: "FLL", destCode: "NAS", kind: "CARGO" },
    },
  ],
});
assert.strictEqual(pilotQueue[0]?.kind, "acknowledge_brief");
assert.ok(!pilotQueue.some((i) => i.bookingCode === "MS-1" && i.kind === "confirm_booking"));

assert.deepStrictEqual([...DOCUMENT_KINDS], [
  "COMMERCIAL_INVOICE",
  "PACKING_LIST",
  "AIR_WAYBILL",
  "CUSTOMS_DECLARATION",
  "MANIFEST",
]);
assert.deepStrictEqual([...MOVEMENT_KINDS], ["CARGO", "PASSENGER"]);
assert.match(nextMovementCode("CARGO", "FLL", "NAS", new Date("2026-09-02T00:00:00Z")), /^MS-20260902-FLL-NAS-\d{4}$/);
assert.match(nextMovementCode("PASSENGER", "FLL", "NAS", new Date("2026-09-02T00:00:00Z")), /^MTG-20260902-FLL-NAS-\d{4}$/);

console.log("staff tests ok");
