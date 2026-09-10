"use client";

import { useEffect, useState } from "react";
import { Button, Card } from "./ui";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function InstallHint() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [standalone, setStandalone] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const nav = window.navigator as Navigator & { standalone?: boolean };
    const stand =
      window.matchMedia("(display-mode: standalone)").matches || Boolean(nav.standalone);
    setStandalone(stand);
    const ua = window.navigator.userAgent;
    setIsIos(/iPad|iPhone|iPod/.test(ua));
    try {
      setDismissed(window.localStorage.getItem("medstead_install_dismissed") === "1");
    } catch {
      /* ignore */
    }

    const onBip = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onBip);

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        /* non-fatal */
      });
    }

    return () => window.removeEventListener("beforeinstallprompt", onBip);
  }, []);

  if (standalone || dismissed) return null;

  const dismiss = () => {
    setDismissed(true);
    try {
      window.localStorage.setItem("medstead_install_dismissed", "1");
    } catch {
      /* ignore */
    }
  };

  return (
    <Card className="mx-auto mt-8 max-w-6xl border-forest-600/20 bg-forest-100/40 p-5 sm:mx-4 md:mx-auto">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-forest-700">
            Install MedStead
          </p>
          <p className="mt-2 text-sm text-navy-800/80">
            {isIos
              ? "On iPhone/iPad: tap Share → Add to Home Screen for the full-screen freight app."
              : deferred
                ? "Install the MedStead app on this device for faster book & track."
                : "Add MedStead to your Home Screen / Install for a standalone freight app."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {deferred && (
            <Button
              type="button"
              variant="green"
              onClick={async () => {
                await deferred.prompt();
                setDeferred(null);
              }}
            >
              Install
            </Button>
          )}
          <Button type="button" variant="outline" onClick={dismiss}>
            Not now
          </Button>
        </div>
      </div>
    </Card>
  );
}
