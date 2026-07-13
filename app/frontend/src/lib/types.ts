/** TypeScript interfaces matching all JSON contracts from the AQ Intelligence Platform backend.
 * Aligned with data contracts defined in docs/architecture.md and agent outputs.
 */

// ─── Spatial ──────────────────────────────────────────────────────────────────

export interface Ward {
  cell: string;
  ward_id: string;
  ward_name: string;
}

export interface WardsResponse {
  synthetic: boolean;
  n_wards: number;
  cells: Ward[];
}

// ─── Fusion Field ─────────────────────────────────────────────────────────────

export interface FusionCell {
  cell: string;
  ward_id: string;
  pm25: number;       // pm25_hat from the model
  interval?: number;
  hour?: string;      // ISO timestamp
  ts?: string;
}

export interface FusionResponse {
  ts: string;
  n_hours: number;
  cells: FusionCell[];
}

// ─── Hotspots ─────────────────────────────────────────────────────────────────

export type HotspotKind = "chronic" | "emerging" | "acute";
export type SourceCategory = "industrial" | "construction" | "waste_burning" | "traffic";

export interface Hotspot {
  cell: string;
  ward_id: string;
  ward_name: string;
  zone_id: string;
  kind: HotspotKind;
  cell_kind: string;
  attributable: boolean;
  severity: number;       // [0, 1]
  pm25_med: number;
  nearest_candidate_km: number;
  z_w24h: number;
  z_w7d: number;
  z_w30d: number;
  fires_6h: number;
  detection_basis: string;
  ts: string;
}

// ─── Attribution ──────────────────────────────────────────────────────────────

export interface SourceCandidate {
  name: string;
  type: SourceCategory;
  distance_km: number;
  wind_alignment: number;
}

export interface PollutantReading {
  value: number;
  city_percentile: number;
}

export interface FireActivity {
  fire_hours: number;
  fire_hour_fraction: number;
  frp_p90: number;
}

export interface Meteorology {
  wind_from_deg: number;
  wind_ms: number;
  blh_m: number;
  hour_local: number;
  air_trapped: boolean;
}

export interface EvidenceProfile {
  cell: string;
  ts: string;
  ward_id: string;
  pm25_estimate: number;
  candidates: SourceCandidate[];
  pollutant_signature: Record<string, PollutantReading>;
  fire_activity: FireActivity;
  landuse_context: Record<string, number>;
  meteorology: Meteorology;
  hotspot_kind: HotspotKind;
  evidence_window_hours: number;
}

export interface Attribution {
  cell: string;
  ts: string;
  ward_id: string;
  pm25_estimate: number;
  primary_source: SourceCategory;
  confidence: number;     // [0, 1]
  scores: Record<SourceCategory, number>;
  reason: string;
  evidence_factors: string[];
  evidence: EvidenceProfile;
  explained_by: string;
  zone_id: string;
}

// ─── Action Queue (EPS) ───────────────────────────────────────────────────────

export type ActionStatus = "pending" | "dispatched" | "actioned" | "resolved";

export interface EPSComponents {
  severity: number;
  attribution_conf: number;
  actionability: number;
  vulnerability: number;
}

export interface Action {
  action_id: string;
  cell: string;
  ward: string;
  eps: number;
  components: EPSComponents;
  source: SourceCategory;
  legal_basis: string;
  status: ActionStatus;
}

// ─── Dispatch ─────────────────────────────────────────────────────────────────

export interface DispatchStop {
  seq: number;
  cell: string;
  ward: string;
  eps: number;
}

export interface DispatchRoute {
  team_id: string;
  route_km: number;
  coverage_pct: number;
  stops: DispatchStop[];
}

// ─── Forecast ─────────────────────────────────────────────────────────────────

export interface ForecastCell {
  cell: string;
  horizon_h: number;      // 24 | 48 | 72
  pm25_hat: number;
  urgency: boolean;       // worsening met conditions
}

// ─── Ledger ───────────────────────────────────────────────────────────────────

export interface LedgerEntry {
  memo_id: string;
  dispatched_at: string;
  actioned_at: string;
  counterfactual: number;
  realized: number;
  impact: number;         // realized - counterfactual (negative = improvement)
  response_hours: number;
}

// ─── Audit ────────────────────────────────────────────────────────────────────

export interface BlindSpot {
  cell: string;
  ward_id: string;
  satellite_signal: number;
  rank: number;
}

export interface SensorFlag {
  cell: string;
  ward_id: string;
  station_name: string;
  reason: "flat_while_satellite_spikes" | "no_data";
}

export interface AuditResponse {
  blind_spots: BlindSpot[];
  sensor_flags: SensorFlag[];
  placement_recommendations: BlindSpot[];
}

// ─── LOSO Validation ──────────────────────────────────────────────────────────

export interface LOSOStation {
  rmse: number;
  r2: number;
  n: number;
}

export interface LOSOOverall {
  rmse: number;
  r2: number;
  n_stations: number;
  mean_pm25: number;
  naive_citymean_rmse: number;
}

export interface LOSOResponse {
  overall: LOSOOverall;
  per_station: Record<string, LOSOStation>;
}

// ─── Citizen Reports ──────────────────────────────────────────────────────────

export type ReportCategory = "waste_burning" | "construction_dust" | "industrial" | "traffic" | "other";
export type ReportStatus = "submitted" | "under_review" | "corroborated" | "action_taken" | "resolved";

export interface CitizenReport {
  report_id: string;
  ward_id: string;
  ward_name: string;
  category: ReportCategory;
  description?: string;
  photo_url?: string;
  status: ReportStatus;
  created_at: string;
  updated_at: string;
  status_message?: string;
}

export interface CreateReportPayload {
  ward_id: string;
  category: ReportCategory;
  description?: string;
  photo?: File;
  lat?: number;
  lon?: number;
}

// ─── Agent Pipeline ───────────────────────────────────────────────────────────

export type AgentName =
  | "detection"
  | "attribution"
  | "forecast"
  | "prioritisation"
  | "memo"
  | "advisory";

export type AgentStatus = "idle" | "running" | "done" | "error";

export interface AgentState {
  name: AgentName;
  status: AgentStatus;
  duration_ms?: number;
  error?: string;
}

export interface PipelineRunResult {
  run_id: string;
  started_at: string;
  completed_at: string;
  agents: AgentState[];
}

// ─── Map Layer State ──────────────────────────────────────────────────────────

export type LayerId =
  | "fusion"
  | "stations"
  | "satellite"
  | "hotspots"
  | "fires"
  | "wind"
  | "wards"
  | "blindspots"
  | "dispatch";

export type SatelliteChannel = "no2_col" | "so2_col" | "aai";

export interface LayerVisibility {
  fusion: boolean;
  stations: boolean;
  satellite: boolean;
  hotspots: boolean;
  fires: boolean;
  wind: boolean;
  wards: boolean;
  blindspots: boolean;
  dispatch: boolean;
}

export interface MapFilters {
  ward_ids: string[];
  source_types: SourceCategory[];
  persistence_types: HotspotKind[];
  attributable_only: boolean;
  date?: string;
  forecast_horizon: 0 | 24 | 48 | 72;
  satellite_channel: SatelliteChannel;
}
