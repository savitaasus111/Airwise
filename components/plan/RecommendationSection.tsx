'use client';

import type { Translations } from '@/lib/i18n';
import type { PlanRecommendationItem } from '@/lib/types';
import { ImpactExplainerBlock } from './ImpactExplainerBlock';

interface RecommendationSectionProps {
  heading: string;
  items: PlanRecommendationItem[];
  t: Translations;
}

export function RecommendationSection({ heading, items, t }: RecommendationSectionProps) {
  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{heading}</h2>
      <div className="grid gap-5 md:grid-cols-2">
        {items.map((item, idx) => (
          <article
            key={item.id || `${heading}-${idx}`}
            className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#131C26]"
          >
            <div>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-600 dark:text-slate-400">
                <span className="font-medium text-slate-800 dark:text-slate-300">
                  {item.timing}
                </span>
                <span aria-hidden="true">·</span>
                <span>{item.whoItAppliesTo}</span>
              </div>
              <h3 className="mt-2 text-base font-semibold text-slate-900 dark:text-slate-50">
                {item.title}
              </h3>
              <ul className="mt-3 space-y-2 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                {item.actionSteps.map((step, sIdx) => (
                  <li key={sIdx} className="flex items-start gap-2">
                    <span
                      className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-teal-700 dark:bg-teal-400"
                      aria-hidden="true"
                    />
                    <span>{step}</span>
                  </li>
                ))}
              </ul>
            </div>

            <ImpactExplainerBlock impact={item.impact} t={t} defaultOpen={idx === 0} />
          </article>
        ))}
      </div>
    </section>
  );
}
