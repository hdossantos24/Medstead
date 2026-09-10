"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { PERMISSION_LABEL, ROLE_LABEL, type Permission, type StaffRole } from "@/lib/staff";
import { Badge, Button, Card, Field, Input, Select } from "./ui";

type Employee = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: StaffRole;
  active: boolean;
  mustResetPassword?: boolean;
};

type Rule = { role: StaffRole; key: Permission; allowed: boolean };

export function EmployeeDesk({
  employees,
  rules,
}: {
  employees: Employee[];
  rules: Rule[];
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<StaffRole>("STAFF");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function createEmployee(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await fetch("/api/ops/employees", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password, role }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(data.error || "Could not create employee");
      return;
    }
    setName("");
    setEmail("");
    setPassword("");
    router.refresh();
  }

  async function patchEmployee(id: string, body: Record<string, unknown>) {
    const res = await fetch(`/api/ops/employees/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Update failed");
      return;
    }
    router.refresh();
  }

  async function toggleRule(roleName: StaffRole, key: Permission, allowed: boolean) {
    await fetch("/api/ops/rules", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: roleName, key, allowed }),
    });
    router.refresh();
  }

  const keys = Object.keys(PERMISSION_LABEL) as Permission[];

  return (
    <div className="grid gap-8">
      <Card className="p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-forest-700">New employee</p>
        <form className="mt-4 grid gap-3 sm:grid-cols-2" onSubmit={createEmployee}>
          <Field label="Name">
            <Input value={name} onChange={(e) => setName(e.target.value)} required />
          </Field>
          <Field label="Work email">
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </Field>
          <Field label="Temporary password" hint="They sign in at /ops with email + password.">
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
          </Field>
          <Field label="Role">
            <Select value={role} onChange={(e) => setRole(e.target.value as StaffRole)}>
              <option value="ADMIN">Admin</option>
              <option value="STAFF">Staff</option>
              <option value="PILOT">Pilot</option>
              <option value="CARGO">Cargo</option>
            </Select>
          </Field>
          <div className="sm:col-span-2">
            {error && <p className="mb-2 text-sm text-red-700">{error}</p>}
            <Button type="submit" disabled={busy}>
              {busy ? "Saving…" : "Create employee"}
            </Button>
          </div>
        </form>
      </Card>

      {employees.some((e) => e.mustResetPassword) ? (
        <Card className="border-amber-300/80 bg-amber-50/80 p-4">
          <p className="text-sm font-semibold text-navy-950">
            {employees.filter((e) => e.mustResetPassword).length} seat
            {employees.filter((e) => e.mustResetPassword).length === 1 ? "" : "s"} still need a password
          </p>
          <p className="mt-1 text-xs text-navy-800/65">
            Imported Flight Ops invites stay locked until an admin sets a credential here (share out of band — no email).
          </p>
        </Card>
      ) : null}

      <div className="grid gap-3">
        {employees.map((emp) => (
          <Card key={emp.id} className="p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-navy-950">{emp.name}</p>
                <p className="text-sm text-navy-800/60">{emp.email}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge tone={emp.active ? "green" : "amber"}>{emp.active ? ROLE_LABEL[emp.role] : "Disabled"}</Badge>
                {emp.mustResetPassword ? <Badge tone="amber">Invite · set password</Badge> : null}
              </div>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <Field label="Role">
                <Select
                  defaultValue={emp.role}
                  onChange={(e) => patchEmployee(emp.id, { name: emp.name, email: emp.email, role: e.target.value })}
                >
                  <option value="ADMIN">Admin</option>
                  <option value="STAFF">Staff</option>
                  <option value="PILOT">Pilot</option>
                  <option value="CARGO">Cargo</option>
                </Select>
              </Field>
              <div className="flex flex-wrap items-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => patchEmployee(emp.id, { name: emp.name, email: emp.email, role: emp.role, active: !emp.active })}
                >
                  {emp.active ? "Disable" : "Enable"}
                </Button>
                <Button
                  type="button"
                  variant={emp.mustResetPassword ? "green" : "outline"}
                  onClick={() => {
                    const label = emp.mustResetPassword
                      ? "Set a temporary password (8+ characters), then enable this seat. Share it out of band."
                      : "Reset password (8+ characters). Share the new password out of band.";
                    const password = window.prompt(label);
                    if (!password || password.length < 8) {
                      setError("Password must be at least 8 characters.");
                      return;
                    }
                    patchEmployee(emp.id, {
                      name: emp.name,
                      email: emp.email,
                      role: emp.role,
                      password,
                      active: emp.mustResetPassword ? true : emp.active,
                    });
                  }}
                >
                  {emp.mustResetPassword ? "Set password & enable" : "Reset password"}
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Card className="p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-forest-700">Role rules</p>
        <p className="mt-2 text-sm text-navy-800/65">Simple v1 toggles. Same rules apply when the airline app assigns work.</p>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="text-xs uppercase tracking-wide text-navy-800/50">
                <th className="py-2 pr-3">Permission</th>
                {(["ADMIN", "STAFF", "PILOT", "CARGO"] as StaffRole[]).map((r) => (
                  <th key={r} className="px-2 py-2">
                    {ROLE_LABEL[r]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {keys.map((key) => (
                <tr key={key} className="border-t border-navy-900/8">
                  <td className="py-2 pr-3 text-navy-950">{PERMISSION_LABEL[key]}</td>
                  {(["ADMIN", "STAFF", "PILOT", "CARGO"] as StaffRole[]).map((r) => {
                    const allowed = rules.find((row) => row.role === r && row.key === key)?.allowed ?? false;
                    return (
                      <td key={r} className="px-2 py-2">
                        <input
                          type="checkbox"
                          className="h-5 w-5"
                          checked={allowed}
                          onChange={(e) => toggleRule(r, key, e.target.checked)}
                          aria-label={`${ROLE_LABEL[r]} ${PERMISSION_LABEL[key]}`}
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
