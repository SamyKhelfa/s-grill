"use client";

export default function DishStepper({
  quantity,
  onChange,
}: {
  quantity: number;
  onChange: (next: number) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => onChange(Math.max(0, quantity - 1))}
        disabled={quantity <= 0}
        className="flex h-10 w-10 items-center justify-center rounded-full border border-gold/40 text-lg leading-none text-gold disabled:opacity-30"
      >
        −
      </button>
      <span className="w-6 text-center text-base font-semibold tabular-nums">{quantity}</span>
      <button
        type="button"
        onClick={() => onChange(quantity + 1)}
        className="flex h-10 w-10 items-center justify-center rounded-full bg-shu text-lg leading-none text-paper"
      >
        +
      </button>
    </div>
  );
}
