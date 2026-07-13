"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import DishStepper from "@/components/DishStepper";
import AddDishForm from "@/components/AddDishForm";
import type { Category, Dish, Order, Outing, Round } from "@/lib/types";

export default function OrderingApp({
  userId,
  displayName,
}: {
  userId: string;
  displayName: string;
}) {
  const supabase = useMemo(() => createClient(), []);

  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [outing, setOuting] = useState<Outing | null>(null);
  const [rounds, setRounds] = useState<Round[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [activeRoundId, setActiveRoundId] = useState<string | null>(null);
  const [view, setView] = useState<"order" | "totals">("order");
  const [showAddDish, setShowAddDish] = useState(false);

  const loadMenu = useCallback(async () => {
    const [{ data: cats }, { data: dishRows }] = await Promise.all([
      supabase.from("categories").select("*").order("sort_order"),
      supabase.from("dishes").select("*").order("name"),
    ]);
    setCategories(cats ?? []);
    setDishes(dishRows ?? []);
  }, [supabase]);

  const loadOuting = useCallback(async () => {
    const { data: outingRow } = await supabase
      .from("outings")
      .select("*")
      .is("closed_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    setOuting(outingRow ?? null);

    if (!outingRow) {
      setRounds([]);
      setOrders([]);
      setActiveRoundId(null);
      return;
    }

    const { data: roundRows } = await supabase
      .from("rounds")
      .select("*")
      .eq("outing_id", outingRow.id)
      .order("round_number");

    setRounds(roundRows ?? []);
    setActiveRoundId((current) => {
      if (current && roundRows?.some((r) => r.id === current)) return current;
      return roundRows?.[roundRows.length - 1]?.id ?? null;
    });

    const roundIds = (roundRows ?? []).map((r) => r.id);
    if (roundIds.length === 0) {
      setOrders([]);
      return;
    }

    const { data: orderRows } = await supabase.from("orders").select("*").in("round_id", roundIds);
    setOrders(orderRows ?? []);
  }, [supabase]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await Promise.all([loadMenu(), loadOuting()]);
      setLoading(false);
    })();
  }, [loadMenu, loadOuting]);

  useEffect(() => {
    const channel = supabase
      .channel("s-grill-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => loadOuting())
      .on("postgres_changes", { event: "*", schema: "public", table: "rounds" }, () => loadOuting())
      .on("postgres_changes", { event: "*", schema: "public", table: "outings" }, () => loadOuting())
      .on("postgres_changes", { event: "*", schema: "public", table: "dishes" }, () => loadMenu())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, loadOuting, loadMenu]);

  const dishesByCategory = useMemo(() => {
    const map = new Map<string, Dish[]>();
    for (const d of dishes) {
      const list = map.get(d.category_id) ?? [];
      list.push(d);
      map.set(d.category_id, list);
    }
    return map;
  }, [dishes]);

  const myQuantity = useCallback(
    (dishId: string) =>
      orders.find((o) => o.round_id === activeRoundId && o.user_id === userId && o.dish_id === dishId)
        ?.quantity ?? 0,
    [orders, activeRoundId, userId]
  );

  const totalsPerDish = useMemo(() => {
    const map = new Map<string, number>();
    for (const o of orders) {
      map.set(o.dish_id, (map.get(o.dish_id) ?? 0) + o.quantity);
    }
    return map;
  }, [orders]);

  const lastRound = rounds.at(-1) ?? null;
  const lastRoundHasOrders = orders.some((o) => o.round_id === lastRound?.id && o.quantity > 0);

  async function startOuting() {
    const { data: newOuting, error } = await supabase
      .from("outings")
      .insert({ created_by: userId })
      .select()
      .single();
    if (error || !newOuting) return;

    await supabase.from("rounds").insert({ outing_id: newOuting.id, round_number: 1 });
    await loadOuting();
  }

  async function addRound() {
    if (!outing || !lastRoundHasOrders) return;
    const nextNumber = (rounds.at(-1)?.round_number ?? 0) + 1;
    const { data: newRound } = await supabase
      .from("rounds")
      .insert({ outing_id: outing.id, round_number: nextNumber })
      .select()
      .single();
    if (newRound) setActiveRoundId(newRound.id);
    await loadOuting();
  }

  async function resetRounds() {
    if (!outing) return;
    if (
      !confirm(
        "Réinitialiser les rounds ? Toutes les commandes de cette sortie seront supprimées et on repart d'un round 1 vide."
      )
    )
      return;

    const roundIds = rounds.map((r) => r.id);
    if (roundIds.length > 0) {
      await supabase.from("rounds").delete().in("id", roundIds);
    }
    await supabase.from("rounds").insert({ outing_id: outing.id, round_number: 1 });
    await loadOuting();
  }

  async function closeOuting() {
    if (!outing) return;
    if (!confirm("Clôturer cette sortie ? Une nouvelle sortie pourra être démarrée ensuite.")) return;
    await supabase.from("outings").update({ closed_at: new Date().toISOString() }).eq("id", outing.id);
  }

  async function setQuantity(dishId: string, quantity: number) {
    if (!activeRoundId) return;
    const roundId = activeRoundId;

    // Update locally right away instead of waiting for the realtime round-trip,
    // otherwise the stepper looks unresponsive and repeated clicks all read the same stale quantity.
    setOrders((prev) => {
      const idx = prev.findIndex(
        (o) => o.round_id === roundId && o.user_id === userId && o.dish_id === dishId
      );
      if (idx === -1) {
        return [...prev, { id: `optimistic-${dishId}`, round_id: roundId, user_id: userId, dish_id: dishId, quantity }];
      }
      const next = [...prev];
      next[idx] = { ...next[idx], quantity };
      return next;
    });

    await supabase.from("orders").upsert(
      { round_id: roundId, user_id: userId, dish_id: dishId, quantity },
      { onConflict: "round_id,user_id,dish_id" }
    );
  }

  async function signOut() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  if (loading) {
    return (
      <main className="flex min-h-dvh items-center justify-center text-neutral-500">Chargement…</main>
    );
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-neutral-200 bg-white/90 px-4 py-3 backdrop-blur dark:border-neutral-800 dark:bg-black/90">
        <div>
          <h1 className="text-lg font-semibold">S-Grill 🍢</h1>
          <p className="text-xs text-neutral-500">{displayName}</p>
        </div>
        <button onClick={signOut} className="text-xs text-neutral-500 underline">
          Déconnexion
        </button>
      </header>

      {!outing ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
          <p className="text-neutral-500">Aucune sortie en cours.</p>
          <button onClick={startOuting} className="rounded-lg bg-red-600 px-4 py-2 font-medium text-white">
            Démarrer une sortie
          </button>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-2 overflow-x-auto border-b border-neutral-200 px-4 py-2 dark:border-neutral-800">
            {rounds.map((r) => (
              <button
                key={r.id}
                onClick={() => setActiveRoundId(r.id)}
                className={`shrink-0 rounded-full px-3 py-1 text-sm ${
                  activeRoundId === r.id
                    ? "bg-red-600 text-white"
                    : "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300"
                }`}
              >
                Round {r.round_number}
              </button>
            ))}
            <button
              onClick={addRound}
              disabled={!lastRoundHasOrders}
              title={
                lastRoundHasOrders
                  ? undefined
                  : "Passez au moins une commande dans le round en cours avant d'en ouvrir un nouveau"
              }
              className="shrink-0 rounded-full border border-dashed border-neutral-300 px-3 py-1 text-sm text-neutral-500 disabled:cursor-not-allowed disabled:opacity-40 dark:border-neutral-700"
            >
              + Round
            </button>
            <button
              onClick={resetRounds}
              className="ml-auto shrink-0 text-sm text-neutral-400 underline"
            >
              Réinitialiser
            </button>
          </div>

          <div className="flex border-b border-neutral-200 dark:border-neutral-800">
            <button
              onClick={() => setView("order")}
              className={`flex-1 py-2 text-sm font-medium ${
                view === "order" ? "border-b-2 border-red-600" : "text-neutral-500"
              }`}
            >
              Commander
            </button>
            <button
              onClick={() => setView("totals")}
              className={`flex-1 py-2 text-sm font-medium ${
                view === "totals" ? "border-b-2 border-red-600" : "text-neutral-500"
              }`}
            >
              Totaux (feuille resto)
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {view === "order" ? (
              <div className="flex flex-col gap-6">
                {categories.map((cat) => {
                  const list = dishesByCategory.get(cat.id) ?? [];
                  if (list.length === 0) return null;
                  return (
                    <section key={cat.id} className="flex flex-col gap-2">
                      <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
                        {cat.name}
                      </h2>
                      {list.map((d) => (
                        <div key={d.id} className="flex items-center justify-between gap-2 py-1">
                          <span className="text-sm">
                            {d.name}
                            {d.evening_and_holidays_only && (
                              <span className="ml-1 text-xs text-neutral-400">(soir/J-F)</span>
                            )}
                          </span>
                          <DishStepper
                            quantity={myQuantity(d.id)}
                            onChange={(next) => setQuantity(d.id, next)}
                          />
                        </div>
                      ))}
                    </section>
                  );
                })}

                {showAddDish ? (
                  <AddDishForm
                    categories={categories}
                    userId={userId}
                    onAdded={() => {
                      setShowAddDish(false);
                      loadMenu();
                    }}
                    onCancel={() => setShowAddDish(false)}
                  />
                ) : (
                  <button
                    onClick={() => setShowAddDish(true)}
                    className="rounded-lg border border-dashed border-neutral-300 py-2 text-sm text-neutral-500 dark:border-neutral-700"
                  >
                    + Ajouter un plat hors carte
                  </button>
                )}
              </div>
            ) : (
              <div className="flex flex-col gap-6">
                {categories.map((cat) => {
                  const list = (dishesByCategory.get(cat.id) ?? []).filter(
                    (d) => (totalsPerDish.get(d.id) ?? 0) > 0
                  );
                  if (list.length === 0) return null;
                  return (
                    <section key={cat.id} className="flex flex-col gap-1">
                      <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
                        {cat.name}
                      </h2>
                      {list.map((d) => (
                        <div key={d.id} className="flex items-center justify-between text-sm">
                          <span>{d.name}</span>
                          <span className="font-semibold tabular-nums">{totalsPerDish.get(d.id)}</span>
                        </div>
                      ))}
                    </section>
                  );
                })}
                {orders.length === 0 && (
                  <p className="text-center text-sm text-neutral-500">Aucune commande pour le moment.</p>
                )}
                <button onClick={closeOuting} className="mt-4 text-sm text-neutral-500 underline">
                  Clôturer cette sortie
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </main>
  );
}
