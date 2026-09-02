"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Button, Field, Input } from "./ui";

export function AuthTabs({ initial }: { initial: "login" | "signup" }) {
  const params = useSearchParams();
  const tab = (params.get("tab") === "signup" ? "signup" : initial) as "login" | "signup";
  const router = useRouter();

  return (
    <div>
      <div className="mb-6 flex gap-2">
        <Button
          type="button"
          variant={tab === "login" ? "navy" : "outline"}
          onClick={() => router.replace("/account?tab=login")}
        >
          Login
        </Button>
        <Button
          type="button"
          variant={tab === "signup" ? "green" : "outline"}
          onClick={() => router.replace("/account?tab=signup")}
        >
          Sign up free
        </Button>
      </div>
      {tab === "signup" ? <SignupForm /> : <LoginForm />}
    </div>
  );
}

function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  return (
    <form
      className="grid gap-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError("");
        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });
        const data = await res.json();
        setBusy(false);
        if (!res.ok) {
          setError(data.error || "Could not sign in");
          return;
        }
        router.refresh();
        router.push(data.home || "/account");
      }}
    >
      <Field label="Email">
        <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </Field>
      <Field label="Password">
        <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
      </Field>
      {error && <p className="text-sm text-red-700">{error}</p>}
      <Button type="submit" disabled={busy}>
        {busy ? "Signing in…" : "Login"}
      </Button>
    </form>
  );
}

function SignupForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  return (
    <form
      className="grid gap-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError("");
        const res = await fetch("/api/auth/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, email, phone, password }),
        });
        const data = await res.json();
        setBusy(false);
        if (!res.ok) {
          setError(data.error || "Could not create account");
          return;
        }
        router.refresh();
        router.push(data.home || "/account");
      }}
    >
      <Field label="Full name">
        <Input value={name} onChange={(e) => setName(e.target.value)} required />
      </Field>
      <Field label="Email">
        <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </Field>
      <Field label="Phone">
        <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
      </Field>
      <Field label="Password" hint="At least 8 characters.">
        <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
      </Field>
      {error && <p className="text-sm text-red-700">{error}</p>}
      <Button type="submit" disabled={busy}>
        {busy ? "Creating…" : "Create account"}
      </Button>
    </form>
  );
}

export function LogoutButton() {
  const router = useRouter();
  return (
    <Button
      type="button"
      variant="outline"
      onClick={async () => {
        await fetch("/api/auth/logout", { method: "POST" });
        router.refresh();
        router.push("/account");
      }}
    >
      Sign out
    </Button>
  );
}
