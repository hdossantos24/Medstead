import assert from "assert";
import {
  CALL_TYPES,
  normalizeCallEnum,
  parseReceivedAt,
  phiFieldsPresent,
  readCallBody,
} from "./call-center";

assert.strictEqual(normalizeCallEnum("organ_rescue", CALL_TYPES), "ORGAN_RESCUE");
assert.strictEqual(normalizeCallEnum("MEDICAL-CARGO", CALL_TYPES), "MEDICAL_CARGO");
assert.strictEqual(normalizeCallEnum("nope", CALL_TYPES), null);

const okDate = parseReceivedAt("2026-09-10T18:00:00.000Z");
assert.ok(okDate instanceof Date);
const bad = parseReceivedAt("not-a-date");
assert.ok(bad && typeof bad === "object" && "error" in bad);

assert.deepStrictEqual(phiFieldsPresent({ patientName: "x", callerName: "Desk" }), ["patientName"]);
assert.deepStrictEqual(phiFieldsPresent({ callerName: "Desk" }), []);

const fields = readCallBody({
  receivedAt: "2026-09-10T18:00:00.000Z",
  callerName: "Desk",
  callerPhone: "+1 555",
  callType: "organ_rescue",
  destination: "NAS",
  notes: "ops only",
});
assert.strictEqual(fields.callType, "organ_rescue");
assert.strictEqual(fields.urgency, "organ_clock");
assert.strictEqual(fields.source, "+1-954-228-4551");

console.log("call-center.test.ts: ok");
