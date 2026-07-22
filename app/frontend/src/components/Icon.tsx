/**
 * Icon — the app's single icon vocabulary.
 *
 * Everything used to be an emoji: 🛰️ for the detection agent, 🚨 for a chronic
 * offender, ☀️ for the theme toggle, 🗺️ inside a button label. Emoji are a
 * *different typeface* rendered by the OS — they don't take your colour, don't
 * align to your baseline, don't scale with your type, and look different on
 * every machine. That mismatch is most of why the UI read as a toy.
 *
 * These are Lucide (already a dependency, previously unused): stroked, 1.5px,
 * `currentColor`, so an icon is simply text that happens to be a shape. Import
 * by NAME from this file rather than reaching into lucide-react directly, so
 * the vocabulary stays small and swapping a metaphor is one edit.
 */
export {
  Activity,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Bell,
  BookOpen,
  Building2,
  Camera,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  CircleCheck,
  ClipboardList,
  Construction,
  Cpu,
  Crosshair,
  Eye,
  FileSearch,
  FileText,
  FolderOpen,
  Flame,
  Gauge,
  Globe,
  Hexagon,
  Info,
  Layers,
  ListChecks,
  LoaderCircle,
  Map as MapIcon,
  MapPin,
  Megaphone,
  Moon,
  Play,
  RadioTower,
  RefreshCw,
  Route,
  SatelliteDish,
  ScanLine,
  Search,
  Settings,
  ShieldAlert,
  Siren,
  SlidersHorizontal,
  Sun,
  Target,
  TrendingUp,
  TriangleAlert,
  Truck,
  Users,
  Volume2,
  Wind,
  X,
  Zap,
} from "lucide-react";

/**
 * THE ICON SCALE. Three steps, and nothing else.
 *
 * Replacing emoji with Lucide is only half the job — an icon set drawn at 13
 * arbitrary sizes and 11 stroke widths is still "inconsistent icons", just in a
 * tidier pack. Optical weight is what the eye reads, and it is stroke-width
 * relative to size; drifting either one makes two glyphs on the same row look
 * like they came from different families.
 *
 * Stroke thins as the glyph grows so the *apparent* weight stays constant.
 *
 *   sm (12)  inside dense chrome — badges, meta rows, button labels at btn-sm
 *   md (15)  the default — buttons, nav, list rows, card headers
 *   lg (22)  standalone illustrative glyphs — empty states only
 *
 * Spread it, don't hand-write the numbers:  <Flame {...icon.sm} />
 * If a size here is wrong for a spot, the spot is usually what's wrong.
 */
export const icon = {
  sm: { size: 12, strokeWidth: 2 },
  md: { size: 15, strokeWidth: 1.7 },
  lg: { size: 22, strokeWidth: 1.4 },
} as const;
