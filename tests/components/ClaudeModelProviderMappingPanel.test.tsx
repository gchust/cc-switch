import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ClaudeModelProviderMappingPanel } from "@/components/settings/ClaudeModelProviderMappingPanel";

Object.defineProperty(Element.prototype, "scrollIntoView", {
  configurable: true,
  value: vi.fn(),
});

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const mutateAsyncMock = vi.fn();
const refetchMappingsMock = vi.fn();
const refetchProvidersMock = vi.fn();
let savedMappings: Record<string, string> = {
  "deepseek-v3.1": "provider-a",
};
let mappingsError = false;
let providersError = false;
let mutationPending = false;

vi.mock("@/lib/query/proxy", () => ({
  useClaudeModelProviderMap: () => ({
    data: mappingsError ? undefined : savedMappings,
    isLoading: false,
    isError: mappingsError,
    refetch: refetchMappingsMock,
  }),
  useUpdateClaudeModelProviderMap: () => ({
    mutateAsync: mutateAsyncMock,
    isPending: mutationPending,
  }),
}));

vi.mock("@/lib/query/queries", () => ({
  useProvidersQuery: () => ({
    data: providersError
      ? undefined
      : {
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
              category: "official",
              settingsConfig: {},
            },
          },
          currentProviderId: "provider-a",
        },
    isLoading: false,
    isError: providersError,
    refetch: refetchProvidersMock,
  }),
}));

describe("ClaudeModelProviderMappingPanel", () => {
  beforeEach(() => {
    savedMappings = { "deepseek-v3.1": "provider-a" };
    mappingsError = false;
    providersError = false;
    mutationPending = false;
    mutateAsyncMock.mockReset();
    mutateAsyncMock.mockResolvedValue(true);
    refetchMappingsMock.mockReset();
    refetchProvidersMock.mockReset();
  });

  it("loads a saved route and saves a trimmed model ID", async () => {
    render(<ClaudeModelProviderMappingPanel />);

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
      expect(mutateAsyncMock).toHaveBeenCalledWith({
        "mimo-v2": "provider-a",
      }),
    );
  });

  it("clears all routes and persists an empty map", async () => {
    render(<ClaudeModelProviderMappingPanel />);

    await screen.findByRole("textbox", {
      name: "proxy.modelProviderMapping.modelId 1",
    });
    fireEvent.click(screen.getByRole("button", { name: "common.clear" }));
    fireEvent.click(screen.getByRole("button", { name: "common.save" }));

    await waitFor(() => expect(mutateAsyncMock).toHaveBeenCalledWith({}));
  });

  it("rejects duplicate exact model IDs", async () => {
    const user = userEvent.setup();
    render(<ClaudeModelProviderMappingPanel />);

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
    expect(mutateAsyncMock).not.toHaveBeenCalled();
  });

  it("does not offer the built-in official provider", async () => {
    const user = userEvent.setup();
    render(<ClaudeModelProviderMappingPanel />);

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
    render(<ClaudeModelProviderMappingPanel />);

    expect(
      screen.getByText("proxy.modelProviderMapping.loadFailed"),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "common.save" })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "common.retry" }));
    expect(refetchMappingsMock).toHaveBeenCalledOnce();
  });

  it("adopts a refreshed mapping when there are no local edits", async () => {
    const { rerender } = render(<ClaudeModelProviderMappingPanel />);

    const modelInput = await screen.findByRole("textbox", {
      name: "proxy.modelProviderMapping.modelId 1",
    });
    expect(modelInput).toHaveValue("deepseek-v3.1");

    savedMappings = { "mimo-v2": "provider-b" };
    rerender(<ClaudeModelProviderMappingPanel />);

    await waitFor(() =>
      expect(
        screen.getByRole("textbox", {
          name: "proxy.modelProviderMapping.modelId 1",
        }),
      ).toHaveValue("mimo-v2"),
    );
    expect(screen.getByRole("button", { name: "common.save" })).toBeDisabled();
  });

  it("disables save after an edit is reverted", async () => {
    render(<ClaudeModelProviderMappingPanel />);

    const modelInput = await screen.findByRole("textbox", {
      name: "proxy.modelProviderMapping.modelId 1",
    });
    fireEvent.change(modelInput, { target: { value: "mimo-v2" } });
    expect(screen.getByRole("button", { name: "common.save" })).toBeEnabled();

    fireEvent.change(modelInput, { target: { value: "deepseek-v3.1" } });
    expect(screen.getByRole("button", { name: "common.save" })).toBeDisabled();
  });

  it("locks row controls while a save is pending", async () => {
    mutationPending = true;
    render(<ClaudeModelProviderMappingPanel />);

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
