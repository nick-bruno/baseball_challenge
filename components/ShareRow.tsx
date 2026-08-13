"use client";

import { useCallback, useEffect, useState } from "react";
import QRCode from "qrcode";

type Props = { code: string };

/**
 * Getting people into the room is the one flow that has to work in a loud,
 * dark stadium — hence a QR code alongside the link, so nobody has to hear a
 * six-character code shouted across three seats.
 */
export function ShareRow({ code }: Props) {
  const [qr, setQr] = useState<string | null>(null);
  const [showQr, setShowQr] = useState(false);
  const [copied, setCopied] = useState(false);

  // Read from window at call time rather than into state — the origin isn't
  // known during SSR, and storing it would only invite a hydration mismatch.
  const shareUrl = useCallback(
    () => `${window.location.origin}/room/${code}`,
    [code],
  );

  useEffect(() => {
    if (!showQr || qr) return;
    QRCode.toDataURL(shareUrl(), {
      width: 460,
      margin: 1,
      color: { dark: "#071510ff", light: "#f2e8d5ff" },
    })
      .then(setQr)
      .catch(() => setQr(null));
  }, [showQr, qr, shareUrl]);

  const share = async () => {
    const url = shareUrl();
    if (navigator.share) {
      try {
        await navigator.share({
          title: "The 9-9-9 Challenge",
          text: `Join my 9-9-9 challenge — room ${code}`,
          url,
        });
        return;
      } catch {
        // Share sheet dismissed; fall through to clipboard.
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard blocked — the code is displayed above regardless */
    }
  };

  return (
    <section className="panel rounded-xl px-4 py-3">
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-display text-[0.62rem] uppercase tracking-sign text-cream-dim">
            Room Code
          </p>
          <p className="font-score text-2xl font-semibold leading-tight tracking-[0.22em] text-chalk painted">
            {code}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowQr((v) => !v)}
          aria-expanded={showQr}
          className="grid h-11 w-11 shrink-0 place-items-center rounded-lg border border-cream/20 text-lg text-cream-dim transition active:scale-90"
          aria-label="Show QR code"
        >
          ▦
        </button>

        <button
          type="button"
          onClick={share}
          className="h-11 shrink-0 rounded-lg border border-beer/45 bg-beer/15 px-4 font-score text-xs font-semibold uppercase tracking-sign text-beer transition active:scale-95"
        >
          {copied ? "Copied" : "Invite"}
        </button>
      </div>

      {showQr && (
        <div className="rise mt-3 flex flex-col items-center gap-2 border-t border-field-edge pt-3">
          {qr ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={qr}
              alt={`QR code linking to room ${code}`}
              className="h-44 w-44 rounded-lg"
            />
          ) : (
            <div className="grid h-44 w-44 place-items-center rounded-lg bg-cream/5 font-score text-xs text-cream-dim">
              Generating…
            </div>
          )}
          <p className="text-center font-score text-[0.68rem] text-cream-dim">
            Point a camera at this to join
          </p>
        </div>
      )}
    </section>
  );
}
