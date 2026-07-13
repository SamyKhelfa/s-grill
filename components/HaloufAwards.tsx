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
      .order("total_quantity", { ascending: false })
      .then(({ data }) => {
        setRows(data ?? []);
        setLoading(false);
      });
  }, []);

  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col p-4">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold">🐷 Halouf Awards</h1>
        <button onClick={onClose} className="text-sm text-neutral-500 underline">
          Retour
        </button>
      </div>

      <p className="mb-4 text-sm text-neutral-500">
        Classement à vie, toutes sorties confondues — le nombre total de plats commandés.
      </p>

      {loading ? (
        <p className="text-sm text-neutral-500">Chargement…</p>
      ) : rows.every((r) => r.total_quantity === 0) ? (
        <p className="text-sm text-neutral-500">Personne n&apos;a encore commandé quoi que ce soit.</p>
      ) : (
        <ol className="flex flex-col gap-2">
          {rows.map((r, i) => (
            <li
              key={r.user_id}
              className="flex items-center justify-between rounded-lg border border-neutral-200 px-3 py-2 dark:border-neutral-800"
            >
              <span className="flex items-center gap-2">
                <span className="w-6 text-center">{MEDALS[i] ?? `${i + 1}.`}</span>
                <span className="font-medium">{r.display_name}</span>
              </span>
              <span className="text-right text-sm text-neutral-500">
                <span className="font-semibold tabular-nums text-neutral-900 dark:text-neutral-100">
                  {r.total_quantity}
                </span>{" "}
                plats · {r.outings_count} sortie{r.outings_count > 1 ? "s" : ""} · {r.avg_per_outing}/sortie
              </span>
            </li>
          ))}
        </ol>
      )}
    </main>
  );
}
