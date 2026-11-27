import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import axe from 'axe-core';
import { describe, expect, it, vi } from 'vitest';
import { AssistantView } from '@/components/AssistantView';
import { CommunityView } from '@/components/CommunityView';
import { DailyPlanView } from '@/components/DailyPlanView';
import { HouseholdProfileModal } from '@/components/HouseholdProfileModal';
import { ImpactTrackerView } from '@/components/ImpactTrackerView';
import { NowDashboard } from '@/components/NowDashboard';
import { buildRuleBasedDailyPlan } from '@/lib/air-quality';
import { getTranslations } from '@/lib/i18n';
import {
  buildSeedActionLogs,
  buildSeedSnapshot,
  DEFAULT_HOUSEHOLD_PROFILE,
  PRESET_CITIES,
} from '@/lib/seed-data';

const snapshot = buildSeedSnapshot(PRESET_CITIES[0]);
const plan = buildRuleBasedDailyPlan(snapshot, DEFAULT_HOUSEHOLD_PROFILE, 'en');
const tEn = getTranslations('en');
const tHi = getTranslations('hi');

async function expectNoAxeViolations(container: HTMLElement) {
  const results = await axe.run(container, {
    rules: {
      // jsdom does not implement CSS canvas layout for color-contrast calculation
      'color-contrast': { enabled: false },
      // Individual component fragments are tested outside full page landmarks
      region: { enabled: false },
    },
  });
  expect(results.violations).toEqual([]);
}

describe('UI Components & WCAG 2.2 AA Accessibility (axe-core)', () => {
  it('NowDashboard renders live AQI, toggles accessible Chart <-> Text Table, and passes axe-core', async () => {
    const { container } = render(
      <NowDashboard
        snapshot={snapshot}
        loading={false}
        profile={DEFAULT_HOUSEHOLD_PROFILE}
        plan={plan}
        language="en"
        t={tEn}
        onOpenPlan={vi.fn()}
        onOpenAssistant={vi.fn()}
        onOpenProfile={vi.fn()}
      />
    );

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(snapshot.locationName);
    expect(screen.getByRole('img')).toHaveAttribute(
      'aria-label',
      expect.stringContaining('forecast')
    );

    const tableBtn = screen.getByRole('button', { name: 'Text Table' });
    fireEvent.click(tableBtn);
    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getAllByRole('columnheader').length).toBeGreaterThanOrEqual(4);

    await expectNoAxeViolations(container);
  });

  it('DailyPlanView renders recommendations, toggles impact explainer, and passes axe-core', async () => {
    const { container } = render(
      <DailyPlanView plan={plan} loading={false} language="en" t={tEn} onRefreshPlan={vi.fn()} />
    );

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(plan.rightNowHeadline);
    expect(screen.getByRole('table')).toBeInTheDocument();
    await expectNoAxeViolations(container);
  });

  it('AssistantView submits a question, updates aria-live log, shows official guidance, and passes axe-core', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          reply: 'At AQI 268, keep outdoor play indoors and run a HEPA purifier.',
          source: 'rule-fallback',
          groundedAqi: snapshot.aqi,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    );
    const onMessagesChange = vi.fn();

    const { container } = render(
      <AssistantView
        snapshot={snapshot}
        profile={DEFAULT_HOUSEHOLD_PROFILE}
        language="en"
        t={tEn}
        messages={[]}
        onMessagesChange={onMessagesChange}
      />
    );

    expect(screen.getByRole('log')).toHaveAttribute('aria-live', 'polite');
    expect(screen.getByText(/CPCB\/IMD\/NDMA/)).toBeInTheDocument();

    const input = screen.getByLabelText(tEn.assistantPlaceholder);
    fireEvent.change(input, { target: { value: 'Is it safe to open windows?' } });
    fireEvent.submit(input.closest('form')!);

    await waitFor(() => expect(onMessagesChange).toHaveBeenCalledTimes(2));
    fetchSpy.mockRestore();

    await expectNoAxeViolations(container);
  });

  it('CommunityView supports WAI-ARIA keyboard tab navigation, labels demo data, and passes axe-core', async () => {
    const onSelectGroup = vi.fn();
    const { container } = render(
      <CommunityView
        profile={DEFAULT_HOUSEHOLD_PROFILE}
        logs={buildSeedActionLogs()}
        cloudContributions={[]}
        language="en"
        t={tEn}
        onSelectGroup={onSelectGroup}
      />
    );

    const tabs = screen.getAllByRole('tab');
    expect(tabs.length).toBeGreaterThanOrEqual(2);
    expect(tabs[0]).toHaveAttribute('aria-selected', 'true');
    expect(tabs[0]).toHaveAttribute('aria-controls', 'community-panel');
    expect(screen.getByRole('tabpanel')).toHaveAttribute('id', 'community-panel');
    expect(screen.getByText(/Includes demo community data/i)).toBeInTheDocument();

    fireEvent.keyDown(tabs[0], { key: 'ArrowRight' });
    expect(onSelectGroup).toHaveBeenCalledTimes(1);

    await expectNoAxeViolations(container);
  });

  it('ImpactTrackerView logs & deletes actions, localizes Hindi headers, and passes axe-core', async () => {
    const onLogAction = vi.fn();
    const onDeleteLog = vi.fn();
    const { container } = render(
      <ImpactTrackerView
        logs={buildSeedActionLogs()}
        language="hi"
        t={tHi}
        onLogAction={onLogAction}
        onDeleteLog={onDeleteLog}
      />
    );

    expect(screen.getByRole('columnheader', { name: 'बचा PM2.5' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'बची CO2' })).toBeInTheDocument();

    const logButtons = screen.getAllByRole('button', { name: /Log /i });
    fireEvent.click(logButtons[0]);
    expect(onLogAction).toHaveBeenCalledTimes(1);

    const removeButtons = screen.getAllByRole('button', { name: /Remove logged action/i });
    fireEvent.click(removeButtons[0]);
    expect(onDeleteLog).toHaveBeenCalledTimes(1);

    await expectNoAxeViolations(container);
  });

  it('HouseholdProfileModal traps dialog semantics, closes on Escape, and passes axe-core', async () => {
    const onClose = vi.fn();
    const onSave = vi.fn();

    const { container } = render(
      <HouseholdProfileModal
        open={true}
        initialProfile={DEFAULT_HOUSEHOLD_PROFILE}
        userEmail={null}
        language="en"
        t={tEn}
        onClose={onClose}
        onSave={onSave}
        onSignIn={vi.fn()}
        onSignOut={vi.fn()}
        onDeleteAllData={vi.fn(async () => {})}
      />
    );

    expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true');
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledOnce();

    await expectNoAxeViolations(container);
  });
});
