"use client";
import type { MapFilters, HotspotKind, SourceCategory } from "@/lib/types";
import { PERSISTENCE_LABELS, SOURCE_LABELS } from "@/lib/constants";

interface Props {
  filters: MapFilters;
  onWards: (ids: string[]) => void;
  onSources: (s: SourceCategory[]) => void;
  onPersistence: (p: HotspotKind[]) => void;
  onReset: () => void;
}

const PERSISTENCE_OPTIONS: HotspotKind[] = ["chronic", "emerging", "acute"];
const SOURCE_OPTIONS: SourceCategory[] = ["industrial", "waste_burning", "construction", "traffic"];

// The chip's active colour is the DATA colour of the thing it filters, passed
// through --tint. That is the one place colour is allowed to be loud here,
// because it matches what the map draws.
const PERSIST_TINT: Record<HotspotKind, string> = {
  chronic:  "var(--persist-chronic)",
  emerging: "var(--persist-emerging)",
  acute:    "var(--persist-acute)",
};
const SOURCE_TINT: Record<SourceCategory, string> = {
  industrial:    "var(--source-industrial)",
  waste_burning: "var(--source-waste-burning)",
  construction:  "var(--source-construction)",
  traffic:       "var(--source-traffic)",
};

function ChipGroup<T extends string>({
  label, options, selected, onToggle, labels, tints,
}: {
  label: string;
  options: T[];
  selected: T[];
  onToggle: (val: T) => void;
  labels: Record<T, string>;
  tints?: Partial<Record<T, string>>;
}) {
  return (
    <fieldset style={{ border: "none" }}>
      <legend className="section-label" style={{ marginBottom: 6 }}>{label}</legend>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
        {options.map((opt) => {
          const active = selected.includes(opt);
          return (
            <button
              key={opt}
              type="button"
              className="chip"
              data-active={active}
              aria-pressed={active}
              onClick={() => onToggle(opt)}
              style={tints?.[opt] ? ({ ["--tint" as string]: tints[opt] }) : undefined}
            >
              {labels[opt]}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

function toggle<T>(arr: T[], val: T): T[] {
  return arr.includes(val) ? arr.filter((v) => v !== val) : [...arr, val];
}

export default function FilterBar({ filters, onSources, onPersistence, onReset }: Props) {
  const activeCount = filters.source_types.length + filters.persistence_types.length;

  return (
    <div
      className="glass"
      style={{
        borderRadius: "var(--radius-lg)",
        overflow: "hidden",
        minWidth: 176,
        boxShadow: "var(--shadow-md)",
      }}
    >
      <div
        style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: "8px 12px", borderBottom: "1px solid var(--border-subtle)",
        }}
      >
        <span className="section-label">
          Filters{activeCount > 0 && ` · ${activeCount}`}
        </span>
        {activeCount > 0 && (
          <button
            onClick={onReset}
            style={{
              background: "none", border: "none", cursor: "pointer", padding: 0,
              fontSize: "0.7rem", color: "var(--accent)", fontFamily: "inherit",
              fontWeight: 520,
            }}
          >
            Clear
          </button>
        )}
      </div>

      <div style={{ padding: "10px 12px", display: "flex", flexDirection: "column", gap: 12 }}>
        <ChipGroup
          label="Persistence"
          options={PERSISTENCE_OPTIONS}
          selected={filters.persistence_types}
          onToggle={(v) => onPersistence(toggle(filters.persistence_types, v))}
          labels={PERSISTENCE_LABELS}
          tints={PERSIST_TINT}
        />
        <ChipGroup
          label="Source type"
          options={SOURCE_OPTIONS}
          selected={filters.source_types}
          onToggle={(v) => onSources(toggle(filters.source_types, v))}
          labels={SOURCE_LABELS}
          tints={SOURCE_TINT}
        />
      </div>
    </div>
  );
}
