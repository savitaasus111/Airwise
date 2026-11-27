'use client';

import { useCallback, useRef, useState } from 'react';
import { Download } from 'lucide-react';
import { useDialogA11y } from '@/hooks/use-dialog-a11y';
import { usePWAInstall } from '@/hooks/use-pwa';

export function PWAInstallButton() {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);

  const closeGuide = useCallback(() => setShowIOSGuide(false), []);
  useDialogA11y(showIOSGuide, dialogRef, closeGuide);

  if (isInstalled) return null;

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={() => void install()}
        className="inline-flex min-h-[40px] shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg border border-teal-700 bg-white px-3 py-1.5 text-xs font-semibold text-teal-800 transition-colors hover:bg-teal-50 dark:border-teal-500 dark:bg-transparent dark:text-teal-300 dark:hover:bg-teal-950/60"
      >
        <Download className="h-3.5 w-3.5" aria-hidden="true" />
        <span>Install App</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          className="inline-flex min-h-[40px] shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
        >
          <Download className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Install on iOS</span>
        </button>

        {showIOSGuide && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="ios-install-title"
          >
            <div
              ref={dialogRef}
              className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-[#131C26]"
            >
              <h3
                id="ios-install-title"
                className="text-base font-semibold text-slate-900 dark:text-white"
              >
                Install AirWise on iPhone / iPad
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                1. Tap the <strong>Share</strong> icon in Safari.
                <br />
                2. Scroll down and choose <strong>Add to Home Screen</strong>.
              </p>
              <button
                type="button"
                onClick={closeGuide}
                className="mt-4 min-h-[44px] w-full rounded-lg bg-teal-700 py-2 text-sm font-medium text-white hover:bg-teal-800"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
}
