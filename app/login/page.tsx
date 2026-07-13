"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error } =
      mode === "signup"
        ? await supabase.auth.signUp({
            email,
            password,
            options: { data: { display_name: displayName } },
          })
        : await supabase.auth.signInWithPassword({ email, password });

    setLoading(false);
    if (error) return setError(error.message);
    router.push("/");
    router.refresh();
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-6 p-6">
      <h1 className="text-2xl font-semibold">S-Grill 🍢</h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        {mode === "signup" && (
          <input
            className="rounded-lg border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900"
            placeholder="Prénom"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            required
          />
        )}
        <input
          className="rounded-lg border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900"
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          className="rounded-lg border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900"
          type="password"
          placeholder="Mot de passe"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength={6}
          required
        />

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-red-600 px-3 py-2 font-medium text-white disabled:opacity-50"
        >
          {loading ? "..." : mode === "signin" ? "Se connecter" : "S'inscrire"}
        </button>
      </form>

      <button
        className="text-sm text-neutral-500 underline"
        onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
      >
        {mode === "signin" ? "Pas encore de compte ? S'inscrire" : "Déjà un compte ? Se connecter"}
      </button>
    </main>
  );
}
