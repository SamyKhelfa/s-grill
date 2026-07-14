"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import BackButton from "@/components/BackButton";

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const [mode, setMode] = useState<"signin" | "signup">(
    searchParams.get("mode") === "signup" ? "signup" : "signin"
  );
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
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-6 bg-ink p-6 text-paper">
      <div>
        <BackButton href="/" />
        <h1 className="mt-2 font-display text-2xl font-bold text-gold">S-Grill 🍢</h1>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        {mode === "signup" && (
          <input
            className="rounded-xl border border-gold/20 bg-surface px-3 py-3 placeholder:text-paper/40"
            placeholder="Prénom"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            required
          />
        )}
        <input
          className="rounded-xl border border-gold/20 bg-surface px-3 py-3 placeholder:text-paper/40"
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          className="rounded-xl border border-gold/20 bg-surface px-3 py-3 placeholder:text-paper/40"
          type="password"
          placeholder="Mot de passe"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength={6}
          required
        />

        {error && <p className="text-sm text-shu">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="rounded-xl bg-shu px-3 py-3 font-medium text-paper shadow-lg shadow-shu/20 active:scale-[0.98] disabled:opacity-50"
        >
          {loading ? "..." : mode === "signin" ? "Se connecter" : "S'inscrire"}
        </button>
      </form>

      <button
        className="rounded-full py-1.5 text-sm text-paper/50 active:opacity-60"
        onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
      >
        {mode === "signin" ? "Pas encore de compte ? S'inscrire" : "Déjà un compte ? Se connecter"}
      </button>
    </main>
  );
}
