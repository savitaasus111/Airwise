'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, Info } from 'lucide-react';
import type { Translations } from '@/lib/i18n';
import type { ImpactExplainer } from '@/lib/types';

interface ImpactExplainerBlockProps {
  impact: ImpactExplainer;
  t: Translations;
  defaultOpen?: boolean;
}

export function ImpactExplainerBlock({
  impact,
  t,
  defaultOpen = false,
}: ImpactExplainerBlockProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="mt-4 border-t border-slate-100 pt-3 dark:border-slate-800">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        className="flex min-h-[40px] w-full items-center justify-between gap-2 text-left text-xs font-semibold text-teal-800 hover:text-teal-950 dark:text-teal-300 dark:hover:text-teal-200"
      >
        <span className="inline-flex items-center gap-1.5">
          <Info className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>{t.whyThisMatters}</span>
          <span className="font-normal text-slate-600 dark:text-slate-400">
            · {t.approximateTag}
          </span>
        </span>
        {open ? (
          <ChevronUp className="h-4 w-4 shrink-0" aria-hidden="true" />
        ) : (
          <ChevronDown className="h-4 w-4 shrink-0" aria-hidden="true" />
        )}
      </button>

      {open && (
        <dl className="mt-2.5 grid gap-3 text-xs sm:grid-cols-2">
          <div>
            <dt className="font-medium text-slate-600 dark:text-slate-400">
              {t.exposureReductionLabel}
            </dt>
            <dd className="mt-0.5 font-mono font-medium text-slate-900 dark:text-slate-100">
              {impact.pm25ExposureReduction}
            </dd>
          </div>
          <div>
            <dt className="font-medium text-slate-600 dark:text-slate-400">
              {t.emissionsSavedLabel}
            </dt>
            <dd className="mt-0.5 font-mono font-medium text-slate-900 dark:text-slate-100">
              {impact.emissionsSaved}
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="font-medium text-slate-600 dark:text-slate-400">
              {t.healthReasonLabel}
            </dt>
            <dd className="mt-0.5 leading-relaxed text-slate-700 dark:text-slate-300">
              {impact.healthReasoning}
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="font-medium text-slate-600 dark:text-slate-400">{t.assumptionsLabel}</dt>
            <dd className="mt-0.5 leading-relaxed text-slate-600 dark:text-slate-400">
              {impact.assumptions}
            </dd>
          </div>
        </dl>
      )}
    </div>
  );
}
