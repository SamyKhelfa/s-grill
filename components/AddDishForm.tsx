"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Category } from "@/lib/types";

export default function AddDishForm({
  categories,
  userId,
  onAdded,
  onCancel,
}: {
  categories: Category[];
  userId: string;
  onAdded: () => void;
  onCancel: () => void;
}) {
  const supabase = createClient();
  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? "");
  const [calories, setCalories] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !categoryId) return;
    setSaving(true);
    setError(null);

    const { error } = await supabase.from("dishes").insert({
      name: name.trim(),
      category_id: categoryId,
      is_custom: true,
      calories_estimate: Number(calories) || 0,
      added_by: userId,
    });

    setSaving(false);
    if (error) return setError(error.message);
    setName("");
    setCalories("");
    onAdded();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-2 rounded-xl border border-dashed border-gold/30 bg-surface p-3"
    >
      <p className="text-sm font-medium text-gold">Ajouter un plat hors carte</p>
      <input
        className="rounded-md border border-gold/20 bg-ink px-2 py-1.5 text-sm text-paper placeholder:text-paper/40"
        placeholder="Nom du plat"
        value={name}
        onChange={(e) => setName(e.target.value)}
        autoFocus
        required
      />
      <select
        className="rounded-md border border-gold/20 bg-ink px-2 py-1.5 text-sm text-paper"
        value={categoryId}
        onChange={(e) => setCategoryId(e.target.value)}
      >
        {categories.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
      <input
        className="rounded-md border border-gold/20 bg-ink px-2 py-1.5 text-sm text-paper placeholder:text-paper/40"
        type="number"
        min={0}
        step={10}
        placeholder="Estimation calories (ex: 250)"
        value={calories}
        onChange={(e) => setCalories(e.target.value)}
        required
      />
      {error && <p className="text-xs text-shu">{error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={saving}
          className="rounded-md bg-shu px-3 py-1.5 text-sm font-medium text-paper disabled:opacity-50"
        >
          Ajouter
        </button>
        <button type="button" onClick={onCancel} className="px-3 py-1.5 text-sm text-paper/50">
          Annuler
        </button>
      </div>
      <p className="text-xs text-paper/40">
        Ce plat restera dans la carte pour toutes les prochaines sorties, et comptera dans les
        Halouf Awards selon l&apos;estimation renseignée.
      </p>
    </form>
  );
}
