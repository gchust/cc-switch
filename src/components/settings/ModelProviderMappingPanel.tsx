import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Loader2, Plus, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useModelProviderMap,
  useUpdateModelProviderMap,
} from "@/lib/query/proxy";
import { useProvidersQuery } from "@/lib/query/queries";
import type {
  ModelProviderMap,
  ModelProviderRoutingApp,
} from "@/lib/api/settings";
import { CODEX_OFFICIAL_PROVIDER_ID } from "@/utils/providerCapabilities";
import { generateUUID } from "@/utils/uuid";

interface ModelProviderMappingPanelProps {
  appType: ModelProviderRoutingApp;
}

interface MappingRow {
  rowId: string;
  modelId: string;
  providerId: string;
}

const BUILT_IN_OFFICIAL_PROVIDER_IDS = new Set([
  "claude-official",
  "claude-desktop-official",
  CODEX_OFFICIAL_PROVIDER_ID,
  "gemini-official",
]);

function createRow(modelId = "", providerId = ""): MappingRow {
  return {
    rowId: generateUUID(),
    modelId,
    providerId,
  };
}

function mapToRows(mappings: ModelProviderMap): MappingRow[] {
  return Object.entries(mappings).map(([modelId, providerId]) =>
    createRow(modelId, providerId),
  );
}

function rowsToMap(rows: MappingRow[]): ModelProviderMap {
  return Object.fromEntries(
    rows.map((row) => [row.modelId.trim(), row.providerId]),
  );
}

function mappingsEqual(
  left: ModelProviderMap,
  right: ModelProviderMap,
): boolean {
  const sortedEntries = (mappings: ModelProviderMap) =>
    Object.entries(mappings).sort(([leftModel], [rightModel]) =>
      leftModel.localeCompare(rightModel),
    );

  return (
    JSON.stringify(sortedEntries(left)) === JSON.stringify(sortedEntries(right))
  );
}

export function ModelProviderMappingPanel({
  appType,
}: ModelProviderMappingPanelProps) {
  const { t } = useTranslation();
  const appName = appType === "claude" ? "Claude" : "Codex";
  const {
    data: mappings,
    isLoading: isMappingsLoading,
    isError: isMappingsError,
    refetch: refetchMappings,
  } = useModelProviderMap(appType);
  const {
    data: providerData,
    isLoading: isProvidersLoading,
    isError: isProvidersError,
    refetch: refetchProviders,
  } = useProvidersQuery(appType);
  const updateMappings = useUpdateModelProviderMap(appType);
  const [rows, setRows] = useState<MappingRow[]>([]);
  const [baselineMappings, setBaselineMappings] = useState<ModelProviderMap>();

  const providers = useMemo(
    () =>
      Object.values(providerData?.providers ?? {}).filter(
        (provider) =>
          provider.category !== "official" &&
          !BUILT_IN_OFFICIAL_PROVIDER_IDS.has(provider.id),
      ),
    [providerData?.providers],
  );
  const providerIds = useMemo(
    () => new Set(providers.map((provider) => provider.id)),
    [providers],
  );
  const normalizedMappings = useMemo(() => rowsToMap(rows), [rows]);
  const isDirty =
    baselineMappings !== undefined &&
    !mappingsEqual(normalizedMappings, baselineMappings);

  useEffect(() => {
    if (mappings === undefined) {
      return;
    }

    const currentMappings = rowsToMap(rows);
    if (
      baselineMappings === undefined ||
      mappingsEqual(currentMappings, baselineMappings)
    ) {
      setRows(mapToRows(mappings));
    }
    setBaselineMappings(mappings);
  }, [mappings]);

  const validationError = useMemo(() => {
    const normalizedModelIds = rows.map((row) => row.modelId.trim());
    if (rows.some((row) => !row.modelId.trim() || !row.providerId)) {
      return t("proxy.modelProviderMapping.incomplete");
    }
    if (new Set(normalizedModelIds).size !== normalizedModelIds.length) {
      return t("proxy.modelProviderMapping.duplicateModel");
    }
    const staleProvider = rows.find(
      (row) => row.providerId && !providerIds.has(row.providerId),
    );
    if (staleProvider) {
      return t("proxy.modelProviderMapping.missingProvider", {
        id: staleProvider.providerId,
      });
    }
    return null;
  }, [providerIds, rows, t]);

  const updateRow = (rowId: string, updates: Partial<MappingRow>) => {
    setRows((current) =>
      current.map((row) =>
        row.rowId === rowId ? { ...row, ...updates } : row,
      ),
    );
  };

  const handleSave = () => {
    void updateMappings.mutateAsync(normalizedMappings).catch(() => undefined);
  };

  if (
    (isMappingsLoading && mappings === undefined) ||
    (isProvidersLoading && providerData === undefined)
  ) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const mappingsUnavailable = isMappingsError && mappings === undefined;
  const providersUnavailable = isProvidersError && providerData === undefined;

  if (mappingsUnavailable || providersUnavailable) {
    return (
      <div className="flex items-start justify-between gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
        <div className="flex items-start gap-2">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            {t(
              mappingsUnavailable
                ? "proxy.modelProviderMapping.loadFailed"
                : "proxy.modelProviderMapping.providerLoadFailed",
              { app: appName },
            )}
          </span>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            if (mappingsUnavailable) {
              refetchMappings();
            }
            if (providersUnavailable) {
              refetchProviders();
            }
          }}
        >
          {t("common.retry")}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <p className="text-sm text-muted-foreground">
          {t(`proxy.modelProviderMapping.description.${appType}`)}
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={updateMappings.isPending}
          onClick={() => setRows((current) => [...current, createRow()])}
        >
          <Plus className="mr-2 h-4 w-4" />
          {t("proxy.modelProviderMapping.add")}
        </Button>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-lg border border-dashed border-muted-foreground/40 p-8 text-center">
          <p className="text-sm text-muted-foreground">
            {t("proxy.modelProviderMapping.empty")}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="hidden grid-cols-[1fr_1fr_36px] gap-2 px-1 text-xs font-medium text-muted-foreground md:grid">
            <span>
              {t("proxy.modelProviderMapping.modelId", { app: appName })}
            </span>
            <span>{t("proxy.modelProviderMapping.provider")}</span>
            <span />
          </div>

          {rows.map((row, index) => {
            const providerMissing =
              row.providerId !== "" && !providerIds.has(row.providerId);
            return (
              <div
                key={row.rowId}
                className="grid grid-cols-1 gap-2 md:grid-cols-[minmax(0,1fr)_minmax(200px,1fr)_36px]"
              >
                <Input
                  value={row.modelId}
                  disabled={updateMappings.isPending}
                  placeholder={t(
                    `proxy.modelProviderMapping.modelPlaceholder.${appType}`,
                  )}
                  className="font-mono"
                  aria-label={`${t("proxy.modelProviderMapping.modelId", {
                    app: appName,
                  })} ${index + 1}`}
                  onChange={(event) =>
                    updateRow(row.rowId, { modelId: event.target.value })
                  }
                />

                <Select
                  value={row.providerId}
                  disabled={isProvidersLoading || updateMappings.isPending}
                  onValueChange={(providerId) =>
                    updateRow(row.rowId, { providerId })
                  }
                >
                  <SelectTrigger
                    aria-label={`${t("proxy.modelProviderMapping.provider")} ${index + 1}`}
                  >
                    <SelectValue
                      placeholder={t(
                        "proxy.modelProviderMapping.providerPlaceholder",
                      )}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {providerMissing && (
                      <SelectItem value={row.providerId} disabled>
                        {t("proxy.modelProviderMapping.missingProvider", {
                          id: row.providerId,
                        })}
                      </SelectItem>
                    )}
                    {providers.map((provider) => (
                      <SelectItem key={provider.id} value={provider.id}>
                        {provider.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  disabled={updateMappings.isPending}
                  className="h-9 w-9 text-muted-foreground hover:text-destructive"
                  title={t("common.delete")}
                  aria-label={`${t("common.delete")} ${index + 1}`}
                  onClick={() =>
                    setRows((current) =>
                      current.filter(
                        (currentRow) => currentRow.rowId !== row.rowId,
                      ),
                    )
                  }
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            );
          })}
        </div>
      )}

      {validationError && rows.length > 0 && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{validationError}</span>
        </div>
      )}

      <div className="flex justify-end gap-3 pt-2">
        <Button
          type="button"
          variant="outline"
          disabled={rows.length === 0 || updateMappings.isPending}
          onClick={() => setRows([])}
        >
          {t("common.clear")}
        </Button>
        <Button
          type="button"
          disabled={
            !isDirty ||
            updateMappings.isPending ||
            isProvidersLoading ||
            validationError !== null
          }
          onClick={handleSave}
        >
          {updateMappings.isPending && (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          )}
          {t("common.save")}
        </Button>
      </div>
    </div>
  );
}
