import Link from "next/link";
import { Wordmark } from "./Wordmark";

type Props = {
  title: string;
  body: string;
  showHomeLink?: boolean;
};

export function StatusScreen({ title, body, showHomeLink = true }: Props) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center gap-6 px-6 text-center">
      <Wordmark compact />
      <div>
        <h2 className="font-display text-xl text-cream painted">{title}</h2>
        <p className="mt-2 font-score text-sm leading-relaxed text-cream-dim">{body}</p>
      </div>
      {showHomeLink && (
        <Link
          href="/"
          className="rounded-lg border border-cream/25 px-5 py-3 font-display text-[0.7rem] uppercase tracking-sign text-cream transition active:scale-95"
        >
          Back to the gate
        </Link>
      )}
    </main>
  );
}
