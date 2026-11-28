
"use client";

import { Suspense, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import AuthShell from "@/components/AuthShell";
import { createClient } from "@/lib/supabase/client";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const verified = searchParams.get("verified") === "1";
  const verificationFailed =
    searchParams.get("verification") === "failed";

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");

    try {
      const supabase = createClient();

      const { error: authError } =
        await supabase.auth.signInWithPassword({
          email: email.trim().toLowerCase(),
          password,
        });

      if (authError) {
        if (
          authError.message
            .toLowerCase()
            .includes("email not confirmed")
        ) {
          setError(
            "Please verify your email address using the link sent to your inbox before signing in."
          );
        } else {
          setError(
            "Unable to sign in. Check your email and password."
          );
        }
        return;
      }

      const next = searchParams.get("next");
      const destination =
        next && next.startsWith("/") && !next.startsWith("//") && !next.includes("\\")
          ? next
          : "/";

      router.replace(destination);
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in with your email and password."
    >
      {verified && (
        <p role="status" className="auth-success">
          Your email has been verified successfully.
          You can now sign in.
        </p>
      )}

      {verificationFailed && (
        <p role="alert" className="auth-error">
          We couldn&apos;t verify your email link.
          It may have expired or already been used.
        </p>
      )}

      <form className="auth-form" onSubmit={submit}>
        <label>
          Email address
          <input
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
        </label>

        <label>
          Password
          <input
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
          />
        </label>

        {error && (
          <p className="auth-error" role="alert">
            {error}
          </p>
        )}

        <button
          className="auth-submit"
          type="submit"
          disabled={busy}
        >
          {busy ? "Signing in…" : "Sign In"}
        </button>
      </form>

      <p className="auth-foot">
        <Link href="/forgot-password">
          Forgot your password?
        </Link>
      </p>

      <p className="auth-foot">
        New to Mausam & Miles?{" "}
        <Link href="/signup">Create account</Link>
      </p>
    </AuthShell>
  );
}

export default function Login() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
