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
      added_by: userId,
    });

    setSaving(false);
    if (error) return setError(error.message);
    setName("");
    onAdded();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-2 rounded-lg border border-dashed border-neutral-300 p-3 dark:border-neutral-700"
    >
      <p className="text-sm font-medium">Ajouter un plat hors carte</p>
      <input
        className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-900"
        placeholder="Nom du plat"
        value={name}
        onChange={(e) => setName(e.target.value)}
        autoFocus
        required
      />
      <select
        className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-900"
        value={categoryId}
        onChange={(e) => setCategoryId(e.target.value)}
      >
        {categories.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={saving}
          className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
        >
          Ajouter
        </button>
        <button type="button" onClick={onCancel} className="px-3 py-1.5 text-sm text-neutral-500">
          Annuler
        </button>
      </div>
      <p className="text-xs text-neutral-500">
        Ce plat restera dans la carte pour toutes les prochaines sorties.
      </p>
    </form>
  );
}
