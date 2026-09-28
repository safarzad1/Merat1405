"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { EntekhabatCitys, GetEntekhabatHozeh } from "@/services/ApiServiceEntekhabat";
import { GetCitys } from "@/services/ApiService";
import {
  ChevronDown,
  ChevronLeft,
  Folder,
  FolderKey,
  FolderOpen,
} from "@/component/ResearchIcons";

type RawArea = {
  ID: number;
  PID: number;
  Name: string;
  Value: number;
  IsMahalIsHozeh?: number;
};

export type AreaKind = "province" | "constituency" | "county";

export type AreaSelection = {
  key: string;
  kind: AreaKind;
  name: string;
  provinceId: number;
  provinceName: string;
  codeHozeh: number;
  constituencyName?: string;
  countyId?: number;
  countyName?: string;
  pathLabel: string;
};

type AreaNode = AreaSelection & {
  markazHozeh?: number;
  children: AreaNode[];
  childrenLoaded: boolean;
};

type Props = {
  userMahal: number;
  codeEntekhabat: number;
  selectedKey?: string | null;
  onSelectionChange: (selection: AreaSelection | null) => void;
};

function arrayFromResponse(raw: any): any[] {
  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw?.data)) return raw.data;
  if (Array.isArray(raw?.items)) return raw.items;
  if (Array.isArray(raw?.rows)) return raw.rows;
  return [];
}

function normalizeAreas(raw: any): RawArea[] {
  return arrayFromResponse(raw)
    .map((x) => {
      const id = x?.ID ?? x?.Id ?? x?.id;
      const pid = x?.PID ?? x?.Pid ?? x?.pid ?? 0;
      const name = x?.Name ?? x?.name ?? x?.FullName ?? x?.Title ?? x?.title;
      const value = x?.Value ?? x?.value ?? x?.CityId ?? 0;
      const isMahalIsHozeh =
        x?.IsMahalIsHozeh ??
        x?.isMahalIsHozeh ??
        x?.IsMahalIsHoze ??
        x?.isMahalIsHoze ??
        0;

      if (id == null || name == null) return null;

      return {
        ID: Number(id),
        PID: Number(pid ?? 0),
        Name: String(name).trim(),
        Value: Number(value ?? 0),
        IsMahalIsHozeh: Number(isMahalIsHozeh ?? 0),
      } as RawArea;
    })
    .filter(Boolean) as RawArea[];
}

function replaceNode(nodes: AreaNode[], key: string, updater: (node: AreaNode) => AreaNode): AreaNode[] {
  return nodes.map((node) => {
    if (node.key === key) return updater(node);
    if (!node.children.length) return node;
    return { ...node, children: replaceNode(node.children, key, updater) };
  });
}

function uniqueBy<T>(items: T[], getKey: (item: T) => string | number): T[] {
  const seen = new Set<string | number>();
  return items.filter((item) => {
    const key = getKey(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function kindLabel(kind: AreaKind) {
  if (kind === "province") return "استان";
  if (kind === "constituency") return "حوزه";
  return "شهرستان";
}

function TreeRows({
  nodes,
  expanded,
  loadingKeys,
  selectedKey,
  onToggle,
  onSelect,
  level = 0,
}: {
  nodes: AreaNode[];
  expanded: Set<string>;
  loadingKeys: Set<string>;
  selectedKey?: string | null;
  onToggle: (node: AreaNode) => void;
  onSelect: (node: AreaNode) => void;
  level?: number;
}) {
  return (
    <div className="davtalab-area-tree-level">
      {nodes.map((node) => {
        const isOpen = expanded.has(node.key);
        const isSelected = selectedKey === node.key;
        const isLoading = loadingKeys.has(node.key);
        const canExpand = node.kind === "province" || node.children.length > 0;
        const IconComp = isOpen && canExpand ? FolderOpen : node.kind === "province" ? FolderKey : Folder;

        return (
          <div key={node.key} className="davtalab-area-tree-node">
            <div
              className={`davtalab-tree-row davtalab-tree-row-${node.kind}${isSelected ? " selected" : ""}`}
              style={{ paddingRight: 7 + level * 16 }}
              onClick={() => onSelect(node)}
            >
              {canExpand ? (
                <button
                  type="button"
                  className="davtalab-tree-toggle"
                  onClick={(event) => {
                    event.stopPropagation();
                    onToggle(node);
                  }}
                  title={isOpen ? "بستن زیرشاخه" : "نمایش زیرشاخه"}
                  aria-label={isOpen ? "بستن زیرشاخه" : "نمایش زیرشاخه"}
                >
                  {isLoading ? (
                    <span className="davtalab-tree-spinner" aria-hidden="true" />
                  ) : isOpen ? (
                    <ChevronDown size={15} />
                  ) : (
                    <ChevronLeft size={15} />
                  )}
                </button>
              ) : (
                <span className="davtalab-tree-toggle-spacer" />
              )}

              <span className={`davtalab-tree-icon davtalab-tree-icon-${node.kind}`} aria-hidden="true">
                <IconComp size={16} />
              </span>

              <span className="davtalab-tree-label" title={node.name}>{node.name}</span>
              <span className={`davtalab-tree-kind davtalab-tree-kind-${node.kind}`}>{kindLabel(node.kind)}</span>
            </div>

            {isOpen && node.children.length > 0 ? (
              <div className="davtalab-tree-children">
                <TreeRows
                  nodes={node.children}
                  expanded={expanded}
                  loadingKeys={loadingKeys}
                  selectedKey={selectedKey}
                  onToggle={onToggle}
                  onSelect={onSelect}
                  level={level + 1}
                />
              </div>
            ) : null}

            {isOpen && isLoading ? <div className="davtalab-tree-loading">در حال دریافت زیرشاخه‌ها...</div> : null}
          </div>
        );
      })}
    </div>
  );
}

export default function ElectionAreaTree({
  userMahal,
  codeEntekhabat,
  selectedKey,
  onSelectionChange,
}: Props) {
  const router = useRouter();
  const [nodes, setNodes] = useState<AreaNode[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [loadingKeys, setLoadingKeys] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const provinceCount = useMemo(() => nodes.length, [nodes]);

  useEffect(() => {
    if (!userMahal) {
      setNodes([]);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        setError("");
        onSelectionChange(null);

        const response = await EntekhabatCitys(codeEntekhabat, userMahal);
        if ((response as any)?.status === 401) {
          router.push("/Login");
          return;
        }

        if (cancelled) return;

        const normalized = normalizeAreas((response as any)?.data ?? response);
        let provinceRows = normalized.filter((item) => Number(item.IsMahalIsHozeh ?? 0) === 1);

        if (!provinceRows.length) {
          provinceRows = normalized.filter((item) => item.PID === 0 || item.PID === 1);
        }

        const provinces = uniqueBy(provinceRows, (item) => item.Value || item.ID).map<AreaNode>((item) => {
          const provinceId = Number(item.Value || item.ID);
          return {
            key: `province:${provinceId}`,
            kind: "province",
            name: item.Name,
            provinceId,
            provinceName: item.Name,
            codeHozeh: 0,
            pathLabel: `استان ${item.Name}`,
            children: [],
            childrenLoaded: false,
          };
        });

        setNodes(provinces);
        setExpanded(new Set());
      } catch (err: any) {
        if (!cancelled) {
          setError(err?.message ?? "خطا در دریافت تقسیمات انتخاباتی");
          setNodes([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userMahal, codeEntekhabat, router, onSelectionChange]);

  const loadProvinceChildren = async (province: AreaNode) => {
    if (province.childrenLoaded || loadingKeys.has(province.key)) return;

    setLoadingKeys((prev) => new Set(prev).add(province.key));
    setError("");

    try {
      const [hozehResponse, citiesResponse] = await Promise.all([
        GetEntekhabatHozeh(province.provinceId),
        GetCitys(province.provinceId),
      ]);

      if ((hozehResponse as any)?.status === 401 || (citiesResponse as any)?.status === 401) {
        router.push("/Login");
        return;
      }

      const hozehRows = arrayFromResponse((hozehResponse as any)?.data ?? hozehResponse).filter(
        (row) => Number(row?.CodeEntekhabat ?? codeEntekhabat) === codeEntekhabat,
      );
      const cityRows = arrayFromResponse((citiesResponse as any)?.data ?? citiesResponse);

      const constituencyNodes = uniqueBy(
        hozehRows.filter((row) => row?.CodeHozeh != null),
        (row) => Number(row.CodeHozeh),
      ).map<AreaNode>((row) => {
        const codeHozeh = Number(row?.CodeHozeh ?? 0);
        const markazHozeh = Number(row?.MarkazHozeh ?? 0);
        const constituencyName = String(row?.NameHozeh ?? `حوزه ${codeHozeh}`).trim();

        const counties = uniqueBy(
          cityRows.filter((city) => {
            const cityId = Number(city?.CityId ?? city?.cityId ?? 0);
            const cityIdHozeh = Number(city?.CityIdHozeh ?? city?.cityIdHozeh ?? 0);
            return markazHozeh > 0 && (cityId === markazHozeh || cityIdHozeh === markazHozeh);
          }),
          (city) => Number(city?.CityId ?? city?.cityId ?? 0),
        ).map<AreaNode>((city) => {
          const countyId = Number(city?.CityId ?? city?.cityId ?? 0);
          const countyName = String(city?.Name ?? city?.FullName ?? city?.name ?? countyId).trim();
          return {
            key: `county:${province.provinceId}:${codeHozeh}:${countyId}`,
            kind: "county",
            name: countyName,
            provinceId: province.provinceId,
            provinceName: province.provinceName,
            codeHozeh,
            constituencyName,
            countyId,
            countyName,
            pathLabel: `استان ${province.provinceName} / حوزه ${constituencyName} / شهرستان ${countyName}`,
            children: [],
            childrenLoaded: true,
          };
        });

        return {
          key: `constituency:${province.provinceId}:${codeHozeh}`,
          kind: "constituency",
          name: constituencyName,
          provinceId: province.provinceId,
          provinceName: province.provinceName,
          codeHozeh,
          constituencyName,
          markazHozeh,
          pathLabel: `استان ${province.provinceName} / حوزه ${constituencyName}`,
          children: counties,
          childrenLoaded: true,
        };
      });

      setNodes((prev) =>
        replaceNode(prev, province.key, (node) => ({
          ...node,
          children: constituencyNodes,
          childrenLoaded: true,
        })),
      );
    } catch (err: any) {
      setError(err?.message ?? "خطا در دریافت حوزه‌ها و شهرستان‌ها");
    } finally {
      setLoadingKeys((prev) => {
        const next = new Set(prev);
        next.delete(province.key);
        return next;
      });
    }
  };

  const handleToggle = async (node: AreaNode) => {
    if (node.kind === "county") return;

    if (expanded.has(node.key)) {
      setExpanded((prev) => {
        const next = new Set(prev);
        next.delete(node.key);
        return next;
      });
      return;
    }

    if (node.kind === "province" && !node.childrenLoaded) {
      await loadProvinceChildren(node);
    }

    setExpanded((prev) => {
      const next = new Set(prev);
      next.add(node.key);
      return next;
    });
  };

  const handleSelect = (node: AreaNode) => {
    onSelectionChange({
      key: node.key,
      kind: node.kind,
      name: node.name,
      provinceId: node.provinceId,
      provinceName: node.provinceName,
      codeHozeh: node.codeHozeh,
      constituencyName: node.constituencyName,
      countyId: node.countyId,
      countyName: node.countyName,
      pathLabel: node.pathLabel,
    });
  };

  return (
    <aside className="davtalab-tree-panel">
      <div className="davtalab-tree-header davtalab-tree-header-hierarchy">
        <div>
          <strong>تقسیمات انتخاباتی</strong>
          <span>استان ← حوزه ← شهرستان</span>
        </div>
        <span className="davtalab-tree-count" title="تعداد استان‌ها">{provinceCount}</span>
      </div>

      <div className="davtalab-tree-legend" aria-label="سطوح تقسیمات انتخاباتی">
        <span className="province">استان</span>
        <i>›</i>
        <span className="constituency">حوزه</span>
        <i>›</i>
        <span className="county">شهرستان</span>
      </div>

      <div className="davtalab-tree-scroll">
        {loading ? <div className="davtalab-empty-state">در حال دریافت استان‌ها...</div> : null}
        {!loading && error ? <div className="davtalab-tree-error">{error}</div> : null}
        {!loading && !error && nodes.length === 0 ? (
          <div className="davtalab-empty-state">داده‌ای برای نمایش وجود ندارد.</div>
        ) : null}
        {!loading && nodes.length > 0 ? (
          <TreeRows
            nodes={nodes}
            expanded={expanded}
            loadingKeys={loadingKeys}
            selectedKey={selectedKey}
            onToggle={handleToggle}
            onSelect={handleSelect}
          />
        ) : null}
      </div>
    </aside>
  );
}
