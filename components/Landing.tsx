import Link from "next/link";

export default function Landing() {
  return (
    <main className="flex min-h-dvh flex-col bg-ink text-paper">
      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center gap-8 p-6">
        <div className="text-center">
          <p className="text-5xl">🍢</p>
          <h1 className="mt-3 font-display text-4xl font-bold tracking-wide text-gold">S-Grill</h1>
          <p className="mt-3 text-paper/70">
            La carte du japonais à volonté, entre amis. Chacun commande ce qu&apos;il veut, l&apos;appli
            additionne tout pour la feuille du resto.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <FeatureRow icon="🍣" text="Toute la carte, commande par round" />
          <FeatureRow icon="📋" text="Un total en direct pour tout le monde" />
          <FeatureRow icon="🐷" text="Le classement Halouf Awards, sans pitié" />
        </div>

        <div className="flex flex-col gap-3">
          <Link
            href="/login?mode=signup"
            className="rounded-xl bg-shu px-5 py-3 text-center font-medium text-paper shadow-lg shadow-shu/20 active:scale-[0.98]"
          >
            S&apos;inscrire
          </Link>
          <Link
            href="/login"
            className="rounded-xl border border-gold/30 px-5 py-3 text-center font-medium text-gold active:scale-[0.98]"
          >
            Se connecter
          </Link>
        </div>
      </div>
    </main>
  );
}

function FeatureRow({ icon, text }: { icon: string; text: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-surface p-3">
      <span className="text-2xl">{icon}</span>
      <span className="text-sm text-paper/80">{text}</span>
    </div>
  );
}
