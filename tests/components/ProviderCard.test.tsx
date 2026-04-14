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

function renderCard(todayCost?: string, provider?: Provider) {
  return render(
    <ProviderCard
      provider={provider ?? createProvider()}
      isCurrent={false}
      appId="claude"
      onSwitch={vi.fn()}
      onEdit={vi.fn()}
      onDelete={vi.fn()}
      onConfigureUsage={vi.fn()}
      onOpenWebsite={vi.fn()}
      onDuplicate={vi.fn()}
      isProxyRunning={false}
      todayCost={todayCost}
    />,
  );
}

describe("ProviderCard", () => {
  it("renders today cost and tooltip for supported providers", async () => {
    renderCard("1.230000");

    expect(screen.getByText("今日成本")).toBeInTheDocument();
    expect(screen.getByText("$1.2300")).toBeInTheDocument();

    const todayCostButton = screen.getByRole("button", { name: /今日成本/i });
    fireEvent.focus(todayCostButton);

    expect(
      await screen.findByText(
        "按本地时区统计今天 00:00 至今，仅包含可归因到当前 Provider 的请求；不等于余额或套餐，也可能不覆盖会话导入、官方直连等场景。",
      ),
    ).toBeInTheDocument();
  });

  it("renders zero cost as $0.00", () => {
    renderCard("0.000000");

    expect(screen.getByText("$0.00")).toBeInTheDocument();
  });

  it("does not render today cost block when prop is missing", () => {
    renderCard(undefined, createProvider({ notes: "旧账号" }));

    expect(screen.queryByText("今日成本")).not.toBeInTheDocument();
  });
});
