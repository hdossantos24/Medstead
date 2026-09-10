import { EmployeeDesk } from "@/components/employee-desk";
import { ensureDefaultRules, requireStaffPage } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { STAFF_ROLES, type Permission, type StaffRole } from "@/lib/staff";

export const dynamic = "force-dynamic";
export const metadata = { title: "Flight ops · employees" };

export default async function EmployeesPage() {
  await requireStaffPage(["ADMIN"]);
  await ensureDefaultRules();
  const [employees, rules] = await Promise.all([
    prisma.user.findMany({
      where: { role: { in: [...STAFF_ROLES] } },
      orderBy: [{ role: "asc" }, { name: "asc" }],
      select: { id: true, name: true, email: true, phone: true, role: true, active: true, mustResetPassword: true },
    }),
    prisma.staffRule.findMany(),
  ]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-forest-700">Flight ops · admin</p>
      <h1 className="mt-3 text-3xl font-semibold text-navy-950">Employees</h1>
      <p className="mt-2 text-sm text-navy-800/70">
        Staff seats for the internal Flight ops desk. Imported Bolt seats arrive as inactive invites — set a credential in People before anyone signs in. Internal ops only.
      </p>
      <div className="mt-8">
        <EmployeeDesk
          employees={employees.map((e) => ({ ...e, role: e.role as StaffRole, mustResetPassword: e.mustResetPassword }))}
          rules={rules.map((r) => ({ role: r.role as StaffRole, key: r.key as Permission, allowed: r.allowed }))}
        />
      </div>
    </div>
  );
}
