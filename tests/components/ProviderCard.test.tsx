import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { Provider } from "@/types";
import { ProviderCard } from "@/components/providers/ProviderCard";

vi.mock("@/components/providers/ProviderActions", () => ({
  ProviderActions: () => <div data-testid="provider-actions" />,
}));

vi.mock("@/components/ProviderIcon", () => ({
  ProviderIcon: () => <div data-testid="provider-icon" />,
}));

vi.mock("@/components/UsageFooter", () => ({
  default: () => null,
}));

vi.mock("@/components/SubscriptionQuotaFooter", () => ({
  default: () => null,
}));

vi.mock("@/components/CopilotQuotaFooter", () => ({
  default: () => null,
}));

vi.mock("@/components/CodexOauthQuotaFooter", () => ({
  default: () => null,
}));

vi.mock("@/components/providers/ProviderHealthBadge", () => ({
  ProviderHealthBadge: () => null,
}));

vi.mock("@/components/providers/FailoverPriorityBadge", () => ({
  FailoverPriorityBadge: () => null,
}));

vi.mock("@/lib/query/failover", () => ({
  useProviderHealth: () => ({ data: null }),
}));

vi.mock("@/lib/query/queries", () => ({
  useUsageQuery: () => ({ data: null }),
}));

function createProvider(overrides: Partial<Provider> = {}): Provider {
  return {
    id: overrides.id ?? "provider-1",
    name: overrides.name ?? "Rawchat",
    settingsConfig: overrides.settingsConfig ?? {},
    notes: overrides.notes,
    websiteUrl: overrides.websiteUrl ?? "https://rawchat.cn/codex",
    meta: overrides.meta,
  };
}

function renderCard(
  options: {
    showTodayStats?: boolean;
    todayStats?: {
      totalCost: string;
      requestCount: number;
      totalTokens: number;
    };
    provider?: Provider;
  } = {},
) {
  return render(
    <ProviderCard
      provider={options.provider ?? createProvider()}
      isCurrent={false}
      appId="claude"
      onSwitch={vi.fn()}
      onEdit={vi.fn()}
      onDelete={vi.fn()}
      onConfigureUsage={vi.fn()}
      onOpenWebsite={vi.fn()}
      onDuplicate={vi.fn()}
      isProxyRunning={false}
      showTodayStats={options.showTodayStats}
      todayStats={options.todayStats}
    />,
  );
}

describe("ProviderCard", () => {
  it("renders today summary and tooltip for supported providers", async () => {
    renderCard({
      showTodayStats: true,
      todayStats: {
        totalCost: "1.230000",
        requestCount: 128,
        totalTokens: 18388,
      },
    });

    expect(screen.getByText("今日")).toBeInTheDocument();
    expect(
      screen.getByText("$1.2300 · 128 次 · 18.4k tok"),
    ).toBeInTheDocument();

    const todayStatsButton = screen.getByRole("button", { name: /今日/i });
    fireEvent.focus(todayStatsButton);

    expect(await screen.findByRole("tooltip")).toHaveTextContent("今日成本");
    expect(screen.getByRole("tooltip")).toHaveTextContent("$1.2300");
    expect(screen.getByRole("tooltip")).toHaveTextContent("今日请求");
    expect(screen.getByRole("tooltip")).toHaveTextContent("128");
    expect(screen.getByRole("tooltip")).toHaveTextContent("今日 Tokens");
    expect(screen.getByRole("tooltip")).toHaveTextContent("18,388");
  });

  it("renders zero summary values as explicit zeros", () => {
    renderCard({
      showTodayStats: true,
      todayStats: {
        totalCost: "0.000000",
        requestCount: 0,
        totalTokens: 0,
      },
    });

    expect(screen.getByText("$0.00 · 0 次 · 0 tok")).toBeInTheDocument();
  });

  it("renders missing today stats as -- placeholders", () => {
    renderCard({
      showTodayStats: true,
      provider: createProvider({ notes: "旧账号" }),
    });

    expect(screen.getByText("今日")).toBeInTheDocument();
    expect(screen.getByText("-- · -- · --")).toBeInTheDocument();
  });

  it("does not render today summary block when disabled", () => {
    renderCard({
      showTodayStats: false,
      provider: createProvider({ notes: "旧账号" }),
    });

    expect(screen.queryByText("今日")).not.toBeInTheDocument();
  });
});
