"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { HaloufAwardRow } from "@/lib/types";

const MEDALS = ["🥇", "🥈", "🥉"];

export default function HaloufAwards({ onClose }: { onClose: () => void }) {
  const [rows, setRows] = useState<HaloufAwardRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("halouf_awards")
      .select("*")
      .order("total_calories", { ascending: false })
      .then(({ data }) => {
        setRows(data ?? []);
        setLoading(false);
      });
  }, []);

  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col bg-ink p-4 text-paper">
      <button
        onClick={onClose}
        className="-ml-1 mb-2 flex w-fit items-center gap-0.5 rounded-full py-1.5 pl-1 pr-3 text-sm font-medium text-gold active:opacity-60"
      >
        <span className="text-lg">‹</span> Retour
      </button>
      <h1 className="mb-4 font-display text-lg font-bold text-gold">🐷 Halouf Awards</h1>

      <p className="mb-1 text-sm text-paper/60">
        Classement à vie, toutes sorties confondues — en calories estimées, pas en nombre de plats.
      </p>
      <p className="mb-4 text-xs text-paper/40">
        Estimation indicative par plat, pas un calcul nutritionnel précis.
      </p>

      {loading ? (
        <p className="text-sm text-paper/50">Chargement…</p>
      ) : rows.every((r) => r.total_calories === 0) ? (
        <p className="text-sm text-paper/50">Personne n&apos;a encore commandé quoi que ce soit.</p>
      ) : (
        <ol className="flex flex-col gap-2">
          {rows.map((r, i) => (
            <li
              key={r.user_id}
              className={`flex items-center justify-between rounded-xl p-3 ${
                i === 0 ? "bg-shu/15" : "bg-surface"
              }`}
            >
              <span className="flex items-center gap-2">
                <span className="w-6 text-center text-lg">{MEDALS[i] ?? `${i + 1}.`}</span>
                <span className="font-medium">{r.display_name}</span>
              </span>
              <span className="text-right text-sm text-paper/60">
                <span className="font-semibold tabular-nums text-gold">
                  {r.total_calories.toLocaleString("fr-FR")}
                </span>{" "}
                kcal · {r.total_quantity} plats · {r.outings_count} sortie
                {r.outings_count > 1 ? "s" : ""}
              </span>
            </li>
          ))}
        </ol>
      )}
    </main>
  );
}
