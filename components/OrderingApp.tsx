"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import DishStepper from "@/components/DishStepper";
import AddDishForm from "@/components/AddDishForm";
import HaloufAwards from "@/components/HaloufAwards";
import ProfileStats from "@/components/ProfileStats";
import SegmentedControl from "@/components/SegmentedControl";
import { categoryAccent, categoryIcon } from "@/lib/categoryStyle";
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
  const [panel, setPanel] = useState<"none" | "halouf" | "profile">("none");
  const [showCart, setShowCart] = useState(false);
  const [totalsScope, setTotalsScope] = useState<"round" | "outing">("round");

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
    const relevant =
      totalsScope === "round" ? orders.filter((o) => o.round_id === activeRoundId) : orders;
    for (const o of relevant) {
      map.set(o.dish_id, (map.get(o.dish_id) ?? 0) + o.quantity);
    }
    return map;
  }, [orders, totalsScope, activeRoundId]);

  const myRoundItems = useMemo(() => {
    const dishById = new Map(dishes.map((d) => [d.id, d]));
    return orders
      .filter((o) => o.round_id === activeRoundId && o.user_id === userId && o.quantity > 0)
      .map((o) => {
        const dish = dishById.get(o.dish_id);
        return {
          dishId: o.dish_id,
          name: dish?.name ?? "?",
          quantity: o.quantity,
          calories: o.quantity * (dish?.calories_estimate ?? 0),
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [orders, dishes, activeRoundId, userId]);

  const myRoundStats = useMemo(
    () => ({
      quantity: myRoundItems.reduce((sum, item) => sum + item.quantity, 0),
      calories: myRoundItems.reduce((sum, item) => sum + item.calories, 0),
    }),
    [myRoundItems]
  );

  const MAX_ROUNDS = 3;
  const lastRound = rounds.at(-1) ?? null;
  const lastRoundHasOrders = orders.some((o) => o.round_id === lastRound?.id && o.quantity > 0);
  const atMaxRounds = rounds.length >= MAX_ROUNDS;
  const canAddRound = lastRoundHasOrders && !atMaxRounds;

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
    if (!outing || !canAddRound) return;
    const nextNumber = (rounds.at(-1)?.round_number ?? 0) + 1;
    const { data: newRound } = await supabase
      .from("rounds")
      .insert({ outing_id: outing.id, round_number: nextNumber })
      .select()
      .single();
    if (newRound) setActiveRoundId(newRound.id);
    await loadOuting();
  }

  async function resetMyOrders() {
    if (!activeRoundId) return;
    const roundNumber = rounds.find((r) => r.id === activeRoundId)?.round_number;
    if (!confirm(`Remettre à zéro vos plats sélectionnés pour le round ${roundNumber} ? Les commandes des autres ne sont pas touchées.`))
      return;

    setOrders((prev) =>
      prev.filter((o) => !(o.round_id === activeRoundId && o.user_id === userId))
    );

    await supabase.from("orders").delete().eq("round_id", activeRoundId).eq("user_id", userId);
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

  if (loading) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-ink text-paper/60">
        Chargement…
      </main>
    );
  }

  if (panel === "halouf") {
    return <HaloufAwards onClose={() => setPanel("none")} />;
  }

  if (panel === "profile") {
    return <ProfileStats userId={userId} displayName={displayName} onClose={() => setPanel("none")} />;
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col bg-ink text-paper">
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-gold/20 bg-ink/95 px-4 py-3 backdrop-blur">
        <div>
          <h1 className="font-display text-xl font-bold tracking-wide text-gold">S-Grill 🍢</h1>
          <button
            onClick={() => setPanel("profile")}
            className="-ml-2 rounded-full px-2 py-0.5 text-xs text-paper/60 active:bg-surface-2"
          >
            {displayName}
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPanel("halouf")}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-2 text-lg active:scale-95"
          >
            🐷
          </button>
          {outing && activeRoundId && (
            <button
              onClick={() => setShowCart((v) => !v)}
              className="relative flex h-10 w-10 items-center justify-center rounded-full bg-surface-2 text-lg active:scale-95"
            >
              🛒
              {myRoundStats.quantity > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-shu px-1 text-[10px] font-bold text-paper">
                  {myRoundStats.quantity}
                </span>
              )}
            </button>
          )}
        </div>

        {showCart && (
          <div className="absolute right-4 top-full z-30 mt-2 w-72 max-w-[calc(100vw-2rem)] rounded-xl bg-surface-2 p-3 shadow-xl shadow-black/40 ring-1 ring-gold/20">
            <div className="mb-2 flex items-center justify-between border-b border-gold/10 pb-2">
              <p className="text-sm font-semibold text-gold">
                Round {rounds.find((r) => r.id === activeRoundId)?.round_number}
              </p>
              <button
                onClick={() => setShowCart(false)}
                className="flex h-7 w-7 items-center justify-center rounded-full bg-surface text-sm text-paper/60 active:scale-95"
              >
                ✕
              </button>
            </div>
            {myRoundItems.length === 0 ? (
              <p className="py-3 text-center text-sm text-paper/50">Rien commandé pour l&apos;instant.</p>
            ) : (
              <ul className="max-h-64 divide-y divide-gold/10 overflow-y-auto">
                {myRoundItems.map((item) => (
                  <li key={item.dishId} className="flex items-center justify-between py-1.5 text-sm">
                    <span className="flex-1 truncate pr-2">{item.name}</span>
                    <span className="tabular-nums text-paper/50">×{item.quantity}</span>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-2 flex items-center justify-between border-t border-gold/10 pt-2 text-sm">
              <span className="text-paper/60">Total</span>
              <span className="font-semibold tabular-nums text-gold">
                {myRoundStats.calories.toLocaleString("fr-FR")} kcal
              </span>
            </div>
          </div>
        )}
      </header>

      {!outing ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
          <p className="text-paper/60">Aucune sortie en cours.</p>
          <button
            onClick={startOuting}
            className="rounded-xl bg-shu px-5 py-3 font-medium text-paper shadow-lg shadow-shu/20 active:scale-[0.98]"
          >
            Démarrer une sortie
          </button>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-2 overflow-x-auto border-b border-gold/10 px-4 py-2.5">
            {rounds.map((r) => (
              <button
                key={r.id}
                onClick={() => setActiveRoundId(r.id)}
                className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium active:scale-95 ${
                  activeRoundId === r.id ? "bg-shu text-paper" : "bg-surface text-paper/60"
                }`}
              >
                Round {r.round_number}
              </button>
            ))}
            <button
              onClick={addRound}
              disabled={!canAddRound}
              title={
                atMaxRounds
                  ? "Maximum 3 rounds par sortie"
                  : lastRoundHasOrders
                    ? undefined
                    : "Passez au moins une commande dans le round en cours avant d'en ouvrir un nouveau"
              }
              className="shrink-0 rounded-full border border-dashed border-gold/40 px-3.5 py-1.5 text-sm text-gold active:scale-95 disabled:cursor-not-allowed disabled:opacity-30"
            >
              + Round
            </button>
            <button
              onClick={resetMyOrders}
              className="ml-auto flex shrink-0 items-center gap-1 rounded-full bg-surface px-3 py-1.5 text-xs text-paper/60 active:scale-95"
            >
              ↺ Réinitialiser
            </button>
          </div>

          <div className="mx-4 my-2">
            <SegmentedControl
              value={view}
              onChange={setView}
              options={[
                { value: "order", label: "Commander" },
                { value: "totals", label: "Totaux" },
              ]}
            />
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {view === "order" ? (
              <div className="flex flex-col gap-6">
                {categories.map((cat, i) => {
                  const list = dishesByCategory.get(cat.id) ?? [];
                  if (list.length === 0) return null;
                  const accent = categoryAccent(i);
                  return (
                    <section key={cat.id} className="flex flex-col gap-2">
                      <h2
                        className={`inline-flex w-fit items-center gap-2 rounded-full px-3 py-1 text-sm font-semibold ${
                          accent === "shu" ? "bg-shu/15 text-shu" : "bg-gold/15 text-gold"
                        }`}
                      >
                        <span>{categoryIcon(cat.name)}</span>
                        {cat.name}
                      </h2>
                      {list.map((d) => (
                        <div
                          key={d.id}
                          className="flex items-center gap-3 rounded-xl bg-surface p-3"
                        >
                          <span
                            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-2xl ${
                              accent === "shu" ? "bg-shu/15" : "bg-gold/15"
                            }`}
                          >
                            {categoryIcon(cat.name)}
                          </span>
                          <span className="flex-1 text-sm">
                            {d.name}
                            {d.evening_and_holidays_only && (
                              <span className="ml-1 text-xs text-paper/40">(soir/J-F)</span>
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
                    className="rounded-xl border border-dashed border-gold/30 py-3 text-sm font-medium text-gold active:scale-[0.98]"
                  >
                    + Ajouter un plat hors carte
                  </button>
                )}
              </div>
            ) : (
              <div className="flex flex-col gap-6">
                <SegmentedControl
                  value={totalsScope}
                  onChange={setTotalsScope}
                  options={[
                    {
                      value: "round",
                      label: `Round ${rounds.find((r) => r.id === activeRoundId)?.round_number ?? ""}`,
                    },
                    { value: "outing", label: "Toute la sortie" },
                  ]}
                />

                {categories.map((cat, i) => {
                  const list = (dishesByCategory.get(cat.id) ?? []).filter(
                    (d) => (totalsPerDish.get(d.id) ?? 0) > 0
                  );
                  if (list.length === 0) return null;
                  const accent = categoryAccent(i);
                  return (
                    <section key={cat.id} className="flex flex-col gap-1">
                      <h2
                        className={`inline-flex w-fit items-center gap-2 rounded-full px-3 py-1 text-sm font-semibold ${
                          accent === "shu" ? "bg-shu/15 text-shu" : "bg-gold/15 text-gold"
                        }`}
                      >
                        <span>{categoryIcon(cat.name)}</span>
                        {cat.name}
                      </h2>
                      {list.map((d) => (
                        <div key={d.id} className="flex items-center justify-between px-1 py-1.5 text-sm">
                          <span>{d.name}</span>
                          <span className="font-semibold tabular-nums text-gold">
                            {totalsPerDish.get(d.id)}
                          </span>
                        </div>
                      ))}
                    </section>
                  );
                })}
                {totalsPerDish.size === 0 && (
                  <p className="text-center text-sm text-paper/50">
                    {totalsScope === "round"
                      ? "Aucune commande pour ce round."
                      : "Aucune commande pour le moment."}
                  </p>
                )}
                <button
                  onClick={closeOuting}
                  className="mt-4 rounded-xl border border-gold/20 py-3 text-sm font-medium text-paper/60 active:scale-[0.98]"
                >
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
