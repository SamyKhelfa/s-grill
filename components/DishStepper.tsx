"use client";

export default function DishStepper({
  quantity,
  onChange,
}: {
  quantity: number;
  onChange: (next: number) => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={() => onChange(Math.max(0, quantity - 1))}
        disabled={quantity <= 0}
        className="flex h-8 w-8 items-center justify-center rounded-full border border-neutral-300 text-lg leading-none disabled:opacity-30 dark:border-neutral-700"
      >
        −
      </button>
      <span className="w-5 text-center tabular-nums">{quantity}</span>
      <button
        type="button"
        onClick={() => onChange(quantity + 1)}
        className="flex h-8 w-8 items-center justify-center rounded-full border border-neutral-300 text-lg leading-none dark:border-neutral-700"
      >
        +
      </button>
    </div>
  );
}
