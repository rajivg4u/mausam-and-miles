
"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import AuthShell from "@/components/AuthShell";
import { createClient } from "@/lib/supabase/client";
import { TRAVEL_PREFERENCES } from "@/lib/travel-preferences";

export default function Signup() {
  const [first, setFirst] = useState("");
  const [last, setLast] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [interests, setInterests] = useState<string[]>([]);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [emailSent, setEmailSent] = useState(false);

  const normalizedEmail = email.trim().toLowerCase();

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    if (!first.trim() || !last.trim()) {
      setError("Please enter your first and last name.");
      return;
    }

    if (password.length < 8) {
      setError("Password must contain at least 8 characters.");
      return;
    }

    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setBusy(true);

    try {
      const supabase = createClient();

      const { data, error: authError } =
        await supabase.auth.signUp({
          email: normalizedEmail,
          password,
          options: {
            emailRedirectTo:
              `${window.location.origin}/auth/callback`,
            data: {
              first_name: first.trim(),
              last_name: last.trim(),
              travel_preferences: interests,
            },
          },
        });

      if (authError) {
        setError(authError.message);
        return;
      }

      // With email confirmation enabled, Supabase
      // normally returns no active session.
      // If a session exists, confirmation may be disabled.
      if (data.session) {
        await supabase.auth.signOut();

        setError(
          "Your account was created, but email confirmation appears to be disabled. Please enable Confirm email in Supabase before continuing."
        );
        return;
      }

      // Do not assume the email was delivered.
      // Supabase may return a generic response for
      // an email address that is already registered.
      setEmailSent(true);

    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again."
      );
    } finally {
      setBusy(false);
    }
  }

  if (emailSent) {
    return (
      <AuthShell
        title="Check your email"
        subtitle="One more step before you can start exploring."
      >
        <div className="auth-form">
          <p>
            If your registration is eligible for confirmation,
            Supabase will send a verification link to:
          </p>

          <p>
            <strong>{normalizedEmail}</strong>
          </p>

          <p>
            Please check your inbox and spam folder.
            Click the confirmation link to verify
            that you have access to this email address.
          </p>

          <p>
            After verification, return to Mausam & Miles
            and sign in using your email and password.
          </p>

          <Link
            href="/login"
            className="auth-submit"
          >
            Go to Login
          </Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Create your account"
      subtitle="Discover places that match your weather and travel style."
    >
      <form
        onSubmit={submit}
        className="auth-form"
      >
        <div className="auth-two">
          <label>
            First name
            <input
              required
              maxLength={80}
              autoComplete="given-name"
              value={first}
              onChange={(e) =>
                setFirst(e.target.value)
              }
            />
          </label>

          <label>
            Last name
            <input
              required
              maxLength={80}
              autoComplete="family-name"
              value={last}
              onChange={(e) =>
                setLast(e.target.value)
              }
            />
          </label>
        </div>

        <label>
          Email address
          <input
            required
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) =>
              setEmail(e.target.value)
            }
            placeholder="you@example.com"
          />
        </label>

        <label>
          Password
          <input
            required
            minLength={8}
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) =>
              setPassword(e.target.value)
            }
            placeholder="Minimum 8 characters"
          />
        </label>

        <label>
          Confirm password
          <input
            required
            minLength={8}
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) =>
              setConfirm(e.target.value)
            }
            placeholder="Re-enter your password"
          />
        </label>

        <fieldset className="interest-field">
          <legend>
            What kind of places do you love?
          </legend>

          <p>
            Select as many as you like.
            You can change these later.
          </p>

          <div className="interest-grid">
            {TRAVEL_PREFERENCES.map((t) => (
              <label
                key={t.code}
                className={
                  "interest-chip " +
                  (interests.includes(t.code)
                    ? "chosen"
                    : "")
                }
              >
                <input
                  type="checkbox"
                  checked={interests.includes(t.code)}
                  onChange={(e) =>
                    setInterests((current) =>
                      e.target.checked
                        ? [...current, t.code]
                        : current.filter(
                            (x) => x !== t.code
                          )
                    )
                  }
                />

                <span>
                  {t.emoji} {t.label}
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        {error && (
          <p
            className="auth-error"
            role="alert"
          >
            {error}
          </p>
        )}

        <button
          className="auth-submit"
          type="submit"
          disabled={busy}
        >
          {busy
            ? "Creating account…"
            : "Create account & verify email"}
        </button>
      </form>

      <p className="auth-foot">
        Already registered?{" "}
        <Link href="/login">
          Sign in
        </Link>
      </p>
    </AuthShell>
  );
}
