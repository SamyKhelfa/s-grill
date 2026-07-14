"use client";

export default function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  const count = options.length;
  const index = Math.max(0, options.findIndex((o) => o.value === value));

  return (
    <div className="relative flex rounded-full bg-surface p-1">
      <div
        className="absolute inset-y-1 rounded-full bg-shu shadow-sm transition-transform duration-300"
        style={{
          left: "4px",
          width: `calc((100% - 8px) / ${count})`,
          transform: `translateX(${index * 100}%)`,
          transitionTimingFunction: "cubic-bezier(0.34, 1.56, 0.64, 1)",
        }}
      />
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={`relative z-10 flex-1 rounded-full py-1.5 text-sm font-medium transition-colors duration-200 ${
            o.value === value ? "text-paper" : "text-paper/50"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
