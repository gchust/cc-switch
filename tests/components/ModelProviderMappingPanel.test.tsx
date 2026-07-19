import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ModelProviderMappingPanel } from "@/components/settings/ModelProviderMappingPanel";
import { ModelProviderRoutingTabs } from "@/components/settings/ProxyTabContent";

Object.defineProperty(Element.prototype, "scrollIntoView", {
  configurable: true,
  value: vi.fn(),
});

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

type RoutingApp = "claude" | "codex";

const mutateAsyncMocks = {
  claude: vi.fn(),
  codex: vi.fn(),
};
const refetchMappingsMock = vi.fn();
const refetchProvidersMock = vi.fn();
const useModelProviderMapMock = vi.fn((appType: RoutingApp) => ({
  data: mappingsError ? undefined : savedMappings[appType],
  isLoading: false,
  isError: mappingsError,
  refetch: refetchMappingsMock,
}));
const useUpdateModelProviderMapMock = vi.fn((appType: RoutingApp) => ({
  mutateAsync: mutateAsyncMocks[appType],
  isPending: mutationPending,
}));
const useProvidersQueryMock = vi.fn((appType: RoutingApp) => ({
  data: providersError ? undefined : providersByApp[appType],
  isLoading: false,
  isError: providersError,
  refetch: refetchProvidersMock,
}));
let savedMappings: Record<RoutingApp, Record<string, string>> = {
  claude: { "deepseek-v3.1": "provider-a" },
  codex: { "gpt-5.3-codex": "codex-provider-a" },
};
let mappingsError = false;
let providersError = false;
let mutationPending = false;

const providersByApp = {
  claude: {
    providers: {
      "provider-a": {
        id: "provider-a",
        name: "Provider A",
        settingsConfig: {},
      },
      "provider-b": {
        id: "provider-b",
        name: "Provider B",
        settingsConfig: {},
      },
      "claude-official": {
        id: "claude-official",
        name: "Claude Official",
        category: "third_party",
        settingsConfig: {},
      },
    },
    currentProviderId: "provider-a",
  },
  codex: {
    providers: {
      "codex-provider-a": {
        id: "codex-provider-a",
        name: "Codex Provider A",
        settingsConfig: {},
      },
      "codex-provider-b": {
        id: "codex-provider-b",
        name: "Codex Provider B",
        settingsConfig: {},
      },
      "codex-official": {
        id: "codex-official",
        name: "OpenAI Official",
        category: "third_party",
        settingsConfig: {},
      },
      "codex-category-official": {
        id: "codex-category-official",
        name: "Category Official",
        category: "official",
        settingsConfig: {},
      },
      "claude-official": {
        id: "claude-official",
        name: "Codex Custom With Claude Seed ID",
        category: "custom",
        settingsConfig: {},
      },
    },
    currentProviderId: "codex-provider-a",
  },
};

vi.mock("@/lib/query/proxy", () => ({
  useModelProviderMap: (appType: RoutingApp) =>
    useModelProviderMapMock(appType),
  useUpdateModelProviderMap: (appType: RoutingApp) =>
    useUpdateModelProviderMapMock(appType),
}));

vi.mock("@/lib/query/queries", () => ({
  useProvidersQuery: (appType: RoutingApp) => useProvidersQueryMock(appType),
}));

describe("ModelProviderMappingPanel", () => {
  beforeEach(() => {
    savedMappings = {
      claude: { "deepseek-v3.1": "provider-a" },
      codex: { "gpt-5.3-codex": "codex-provider-a" },
    };
    mappingsError = false;
    providersError = false;
    mutationPending = false;
    Object.values(mutateAsyncMocks).forEach((mock) => {
      mock.mockReset();
      mock.mockResolvedValue(true);
    });
    refetchMappingsMock.mockReset();
    refetchProvidersMock.mockReset();
    useModelProviderMapMock.mockClear();
    useUpdateModelProviderMapMock.mockClear();
    useProvidersQueryMock.mockClear();
  });

  it("loads a saved route and saves a trimmed model ID", async () => {
    render(<ModelProviderMappingPanel appType="claude" />);

    const modelInput = await screen.findByRole("textbox", {
      name: "proxy.modelProviderMapping.modelId 1",
    });
    expect(modelInput).toHaveValue("deepseek-v3.1");
    expect(
      screen.getByRole("combobox", {
        name: "proxy.modelProviderMapping.provider 1",
      }),
    ).toHaveTextContent("Provider A");

    fireEvent.change(modelInput, { target: { value: "  mimo-v2  " } });
    fireEvent.click(screen.getByRole("button", { name: "common.save" }));

    await waitFor(() =>
      expect(mutateAsyncMocks.claude).toHaveBeenCalledWith({
        "mimo-v2": "provider-a",
      }),
    );
  });

  it("clears all routes and persists an empty map", async () => {
    render(<ModelProviderMappingPanel appType="claude" />);

    await screen.findByRole("textbox", {
      name: "proxy.modelProviderMapping.modelId 1",
    });
    fireEvent.click(screen.getByRole("button", { name: "common.clear" }));
    fireEvent.click(screen.getByRole("button", { name: "common.save" }));

    await waitFor(() =>
      expect(mutateAsyncMocks.claude).toHaveBeenCalledWith({}),
    );
  });

  it("rejects duplicate exact model IDs", async () => {
    const user = userEvent.setup();
    render(<ModelProviderMappingPanel appType="claude" />);

    await user.click(
      screen.getByRole("button", {
        name: "proxy.modelProviderMapping.add",
      }),
    );
    fireEvent.change(
      screen.getByRole("textbox", {
        name: "proxy.modelProviderMapping.modelId 2",
      }),
      { target: { value: " deepseek-v3.1 " } },
    );

    await user.click(
      screen.getByRole("combobox", {
        name: "proxy.modelProviderMapping.provider 2",
      }),
    );
    await user.click(await screen.findByRole("option", { name: "Provider B" }));

    expect(
      screen.getByText("proxy.modelProviderMapping.duplicateModel"),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "common.save" })).toBeDisabled();
    expect(mutateAsyncMocks.claude).not.toHaveBeenCalled();
  });

  it("does not offer the built-in official provider", async () => {
    const user = userEvent.setup();
    render(<ModelProviderMappingPanel appType="claude" />);

    await user.click(
      await screen.findByRole("combobox", {
        name: "proxy.modelProviderMapping.provider 1",
      }),
    );

    expect(
      screen.getByRole("option", { name: "Provider A" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("option", { name: "Claude Official" }),
    ).toBeNull();
  });

  it("blocks editing when saved routes fail to load", () => {
    mappingsError = true;
    render(<ModelProviderMappingPanel appType="claude" />);

    expect(
      screen.getByText("proxy.modelProviderMapping.loadFailed"),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "common.save" })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "common.retry" }));
    expect(refetchMappingsMock).toHaveBeenCalledOnce();
  });

  it("adopts a refreshed mapping when there are no local edits", async () => {
    const { rerender } = render(<ModelProviderMappingPanel appType="claude" />);

    const modelInput = await screen.findByRole("textbox", {
      name: "proxy.modelProviderMapping.modelId 1",
    });
    expect(modelInput).toHaveValue("deepseek-v3.1");

    savedMappings.claude = { "mimo-v2": "provider-b" };
    rerender(<ModelProviderMappingPanel appType="claude" />);

    await waitFor(() =>
      expect(
        screen.getByRole("textbox", {
          name: "proxy.modelProviderMapping.modelId 1",
        }),
      ).toHaveValue("mimo-v2"),
    );
    expect(screen.getByRole("button", { name: "common.save" })).toBeDisabled();
  });

  it("keeps refreshed server state as the baseline while editing", async () => {
    const { rerender } = render(<ModelProviderMappingPanel appType="claude" />);

    const modelInput = await screen.findByRole("textbox", {
      name: "proxy.modelProviderMapping.modelId 1",
    });
    fireEvent.change(modelInput, { target: { value: "local-draft" } });

    savedMappings.claude = { "server-refresh": "provider-b" };
    rerender(<ModelProviderMappingPanel appType="claude" />);

    expect(modelInput).toHaveValue("local-draft");
    fireEvent.change(modelInput, { target: { value: "deepseek-v3.1" } });
    expect(screen.getByRole("button", { name: "common.save" })).toBeEnabled();

    fireEvent.change(modelInput, { target: { value: "server-refresh" } });
    await userEvent.setup().click(
      screen.getByRole("combobox", {
        name: "proxy.modelProviderMapping.provider 1",
      }),
    );
    await userEvent
      .setup()
      .click(await screen.findByRole("option", { name: "Provider B" }));
    expect(screen.getByRole("button", { name: "common.save" })).toBeDisabled();
  });

  it("disables save after an edit is reverted", async () => {
    render(<ModelProviderMappingPanel appType="claude" />);

    const modelInput = await screen.findByRole("textbox", {
      name: "proxy.modelProviderMapping.modelId 1",
    });
    fireEvent.change(modelInput, { target: { value: "mimo-v2" } });
    expect(screen.getByRole("button", { name: "common.save" })).toBeEnabled();

    fireEvent.change(modelInput, { target: { value: "deepseek-v3.1" } });
    expect(screen.getByRole("button", { name: "common.save" })).toBeDisabled();
  });

  it("uses Codex-specific queries and saves only the Codex map", async () => {
    render(<ModelProviderMappingPanel appType="codex" />);

    expect(useModelProviderMapMock).toHaveBeenCalledWith("codex");
    expect(useUpdateModelProviderMapMock).toHaveBeenCalledWith("codex");
    expect(useProvidersQueryMock).toHaveBeenCalledWith("codex");
    expect(useModelProviderMapMock).not.toHaveBeenCalledWith("claude");
    expect(useProvidersQueryMock).not.toHaveBeenCalledWith("claude");

    const modelInput = await screen.findByRole("textbox", {
      name: "proxy.modelProviderMapping.modelId 1",
    });
    expect(modelInput).toHaveValue("gpt-5.3-codex");
    expect(
      screen.getByRole("combobox", {
        name: "proxy.modelProviderMapping.provider 1",
      }),
    ).toHaveTextContent("Codex Provider A");

    fireEvent.change(modelInput, { target: { value: "  gpt-5.4  " } });
    fireEvent.click(screen.getByRole("button", { name: "common.save" }));

    await waitFor(() =>
      expect(mutateAsyncMocks.codex).toHaveBeenCalledWith({
        "gpt-5.4": "codex-provider-a",
      }),
    );
    expect(mutateAsyncMocks.claude).not.toHaveBeenCalled();
  });

  it("filters official providers by category and reserved IDs", async () => {
    const user = userEvent.setup();
    render(<ModelProviderMappingPanel appType="codex" />);

    await user.click(
      await screen.findByRole("combobox", {
        name: "proxy.modelProviderMapping.provider 1",
      }),
    );

    expect(
      screen.getByRole("option", { name: "Codex Provider A" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("option", {
        name: "Codex Custom With Claude Seed ID",
      }),
    ).toBeNull();
    expect(
      screen.queryByRole("option", { name: "OpenAI Official" }),
    ).toBeNull();
    expect(
      screen.queryByRole("option", { name: "Category Official" }),
    ).toBeNull();
  });

  it("preserves unsaved mappings while switching app tabs", async () => {
    const user = userEvent.setup();
    render(<ModelProviderRoutingTabs />);

    const activePanel = () => {
      const panel = document.querySelector<HTMLElement>(
        '[role="tabpanel"][data-state="active"]',
      );
      expect(panel).not.toBeNull();
      return panel!;
    };

    const claudeInput = within(activePanel()).getByRole("textbox", {
      name: "proxy.modelProviderMapping.modelId 1",
    });
    fireEvent.change(claudeInput, { target: { value: "unsaved-claude" } });

    await user.click(screen.getByRole("tab", { name: "Codex" }));
    expect(
      within(activePanel()).getByRole("textbox", {
        name: "proxy.modelProviderMapping.modelId 1",
      }),
    ).toHaveValue("gpt-5.3-codex");

    await user.click(screen.getByRole("tab", { name: "Claude" }));
    expect(
      within(activePanel()).getByRole("textbox", {
        name: "proxy.modelProviderMapping.modelId 1",
      }),
    ).toHaveValue("unsaved-claude");
  });

  it("locks row controls while a save is pending", async () => {
    mutationPending = true;
    render(<ModelProviderMappingPanel appType="claude" />);

    expect(
      await screen.findByRole("textbox", {
        name: "proxy.modelProviderMapping.modelId 1",
      }),
    ).toBeDisabled();
    expect(
      screen.getByRole("combobox", {
        name: "proxy.modelProviderMapping.provider 1",
      }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "proxy.modelProviderMapping.add" }),
    ).toBeDisabled();
  });
});
