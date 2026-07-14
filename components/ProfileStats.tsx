"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { HaloufAwardRow } from "@/lib/types";

type FavoriteDish = { name: string; quantity: number };

export default function ProfileStats({
  userId,
  displayName,
  onClose,
}: {
  userId: string;
  displayName: string;
  onClose: () => void;
}) {
  const [me, setMe] = useState<HaloufAwardRow | null>(null);
  const [rank, setRank] = useState<number | null>(null);
  const [playerCount, setPlayerCount] = useState(0);
  const [favorite, setFavorite] = useState<FavoriteDish | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    (async () => {
      const [{ data: leaderboard }, { data: orderRows }] = await Promise.all([
        supabase.from("halouf_awards").select("*").order("total_calories", { ascending: false }),
        supabase
          .from("orders")
          .select("quantity, dishes(name)")
          .eq("user_id", userId)
          .gt("quantity", 0),
      ]);

      if (leaderboard) {
        const idx = leaderboard.findIndex((r) => r.user_id === userId);
        setMe(leaderboard[idx] ?? null);
        setRank(idx === -1 ? null : idx + 1);
        setPlayerCount(leaderboard.length);
      }

      if (orderRows) {
        const byDish = new Map<string, number>();
        for (const row of orderRows as unknown as { quantity: number; dishes: { name: string } | null }[]) {
          const name = row.dishes?.name;
          if (!name) continue;
          byDish.set(name, (byDish.get(name) ?? 0) + row.quantity);
        }
        let best: FavoriteDish | null = null;
        for (const [name, quantity] of byDish) {
          if (!best || quantity > best.quantity) best = { name, quantity };
        }
        setFavorite(best);
      }

      setLoading(false);
    })();
  }, [userId]);

  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col bg-ink p-4 text-paper">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="font-display text-lg font-bold text-gold">👤 {displayName}</h1>
        <button onClick={onClose} className="text-sm text-paper/60 underline">
          Retour
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-paper/50">Chargement…</p>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <Stat label="Calories (à vie)" value={`${(me?.total_calories ?? 0).toLocaleString("fr-FR")} kcal`} />
            <Stat label="Plats commandés" value={`${me?.total_quantity ?? 0}`} />
            <Stat label="Sorties" value={`${me?.outings_count ?? 0}`} />
            <Stat
              label="Classement Halouf"
              value={rank ? `#${rank} / ${playerCount}` : "—"}
            />
          </div>

          <div className="mt-2 rounded-xl bg-surface p-4">
            <p className="text-xs uppercase tracking-wide text-paper/50">Plat favori</p>
            {favorite ? (
              <p className="mt-1 text-base font-semibold text-paper">
                {favorite.name} <span className="text-gold">×{favorite.quantity}</span>
              </p>
            ) : (
              <p className="mt-1 text-sm text-paper/50">Pas encore de commande.</p>
            )}
          </div>
        </div>
      )}
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-surface p-4">
      <p className="text-xs uppercase tracking-wide text-paper/50">{label}</p>
      <p className="mt-1 text-lg font-semibold tabular-nums text-paper">{value}</p>
    </div>
  );
}
