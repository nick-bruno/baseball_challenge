export function Wordmark({ compact = false }: { compact?: boolean }) {
  return (
    <div className="text-center">
      <h1
        className={`font-display painted leading-none text-cream ${
          compact ? "text-[2.1rem]" : "text-[3.4rem]"
        }`}
      >
        <span className="text-beer">9</span>
        <span className="text-cream-dim">–</span>
        <span className="text-mustard">9</span>
        <span className="text-cream-dim">–</span>
        <span className="text-stitch">9</span>
      </h1>
      <p
        className={`font-display uppercase tracking-sign text-cream-dim ${
          compact ? "mt-1 text-[0.6rem]" : "mt-2 text-[0.72rem]"
        }`}
      >
        The Challenge
      </p>
      {!compact && (
        <p className="mt-3 font-score text-[0.78rem] uppercase tracking-[0.14em] text-cream-dim">
          9 Beers · 9 Hot Dogs · 9 Innings
        </p>
      )}
    </div>
  );
}
