import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  BatteryCharging,
  Bell,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleDot,
  Clock3,
  Compass,
  Crosshair,
  Database,
  ExternalLink,
  Flame,
  Gauge,
  HardHat,
  Info,
  Laptop,
  Layers3,
  LocateFixed,
  LogOut,
  MapPinned,
  Menu,
  MessageSquareWarning,
  Navigation,
  Radio,
  RefreshCw,
  Route as RouteIcon,
  Search,
  Send,
  ShieldCheck,
  Siren,
  Smartphone,
  Signal,
  SlidersHorizontal,
  Sparkles,
  Target,
  UserRound,
  Users,
  Wifi,
  WifiOff,
  X,
  Zap,
} from "lucide-react";
import { calculateSearchPriority, priorityForScore } from "@shared/searchgrid";
import LiveVenueMap from "@/components/LiveVenueMap";
import TrafficRouteMap from "@/components/TrafficRouteMap";
import VolunteerLiveMap from "@/components/VolunteerLiveMap";
import CoordinationPlanPanel from "@/components/CoordinationPlanPanel";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin, startLoginInNewWindow } from "@/const";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useIncidentRealtime, type IncidentRealtimeEvent } from "@/hooks/useIncidentRealtime";
import { useOfflineSync } from "@/hooks/useOfflineSync";
import { useResilientTransport } from "@/hooks/useResilientTransport";
import AdminPanel from "@/pages/AdminPanel";

type Mode = "command" | "volunteer" | "admin";
type ZoneStatus = "searching" | "queued" | "covered" | "alert";
type Priority = "HIGH" | "MEDIUM" | "LOW";

type Zone = {
  id: string;
  name: string;
  score: number;
  baseScore: number;
  priority: Priority;
  status: ZoneStatus;
  assigned: string | null;
  volunteers: number;
  x: number;
  y: number;
  w: number;
  h: number;
  features: string[];
  color: string;
};

type Sighting = {
  id: number;
  label: string;
  location: string;
  time: string;
  source: string;
  confidence: number;
  status?: "new" | "under_review" | "verified" | "rejected";
  latitude?: number | null;
  longitude?: number | null;
};

const ZONE_SEEDS: Zone[] = [
  { id: "A", name: "Main Gate", score: 91, baseScore: 91, priority: "HIGH", status: "covered", assigned: "V02", volunteers: 2, x: 7, y: 67, w: 20, h: 20, features: ["Primary ingress", "High crowd flow", "Covered 4 min ago"], color: "coral" },
  { id: "B", name: "Food Court", score: 86, baseScore: 86, priority: "HIGH", status: "searching", assigned: "V07", volunteers: 3, x: 31, y: 14, w: 21, h: 25, features: ["Last seen 2 min ago", "Dense crowd", "Connected walkway"], color: "amber" },
  { id: "C", name: "Stage Plaza", score: 72, baseScore: 72, priority: "HIGH", status: "searching", assigned: "V03", volunteers: 2, x: 55, y: 12, w: 22, h: 26, features: ["Movement direction", "Open sightline", "Stage event active"], color: "orange" },
  { id: "D", name: "Children Area", score: 68, baseScore: 68, priority: "HIGH", status: "queued", assigned: "V11", volunteers: 2, x: 79, y: 14, w: 14, h: 25, features: ["High relevance", "Low obstruction", "North route"], color: "orange" },
  { id: "E", name: "West Walkway", score: 57, baseScore: 57, priority: "MEDIUM", status: "queued", assigned: "V14", volunteers: 1, x: 8, y: 42, w: 19, h: 17, features: ["Connected pathway", "Medium flow", "Partially searched"], color: "yellow" },
  { id: "F", name: "Central Lawn", score: 49, baseScore: 49, priority: "MEDIUM", status: "queued", assigned: "V09", volunteers: 2, x: 31, y: 43, w: 21, h: 21, features: ["Wide open area", "Cross-path junction", "Search next"], color: "yellow" },
  { id: "G", name: "East Walkway", score: 42, baseScore: 42, priority: "MEDIUM", status: "queued", assigned: "V18", volunteers: 1, x: 56, y: 43, w: 20, h: 21, features: ["Exit route", "Moderate flow", "No recent reports"], color: "blue" },
  { id: "H", name: "Medical Center", score: 36, baseScore: 36, priority: "LOW", status: "queued", assigned: "V21", volunteers: 1, x: 80, y: 44, w: 13, h: 19, features: ["Staffed checkpoint", "Low crowd", "Checked at 13:12"], color: "blue" },
  { id: "I", name: "Parking Loop", score: 30, baseScore: 30, priority: "LOW", status: "queued", assigned: "V04", volunteers: 1, x: 8, y: 76, w: 20, h: 15, features: ["Peripheral route", "Vehicle barrier", "Low probability"], color: "blue" },
  { id: "J", name: "Service Road", score: 27, baseScore: 27, priority: "LOW", status: "queued", assigned: "V16", volunteers: 1, x: 32, y: 70, w: 20, h: 13, features: ["Restricted access", "Low flow", "Perimeter route"], color: "blue" },
  { id: "K", name: "Gate B", score: 24, baseScore: 24, priority: "LOW", status: "queued", assigned: "V12", volunteers: 1, x: 57, y: 70, w: 19, h: 13, features: ["Secondary ingress", "Low flow", "Checked 3 min ago"], color: "blue" },
  { id: "L", name: "Restrooms", score: 18, baseScore: 18, priority: "LOW", status: "queued", assigned: "V20", volunteers: 1, x: 81, y: 69, w: 12, h: 14, features: ["Fixed feature", "Low flow", "Monitored"], color: "blue" },
];

const INITIAL_SIGHTINGS: Sighting[] = [
  { id: 1, label: "Possible sighting", location: "Food Court · north aisle", time: "2 min ago", source: "Volunteer V07", confidence: 82 },
  { id: 2, label: "Route update", location: "Main Gate · west approach", time: "6 min ago", source: "CCTV handoff", confidence: 64 },
  { id: 3, label: "Zone cleared", location: "Parking Loop", time: "9 min ago", source: "Volunteer V04", confidence: 93 },
];

const VOLUNTEERS = ["V02", "V03", "V04", "V07", "V09", "V11", "V12", "V14", "V16", "V18", "V20", "V21"];
const ROUTE_STEPS = ["Exit the north walkway", "Pass the stage plaza checkpoint", "Turn right at the food court", "Zone B is on the east aisle"];

function notifyUrgent(title: string, body: string) {
  if (typeof Notification !== "undefined" && Notification.permission === "granted") new Notification(title, { body, tag: "searchgrid-urgent" });
}

function sightingPosition(location: string): [number, number] {
  const value = location.toLowerCase();
  if (value.includes("stage")) return [13.0845, 80.2718];
  if (value.includes("gate") || value.includes("main")) return [13.0819, 80.2692];
  if (value.includes("lawn") || value.includes("central")) return [13.0821, 80.2708];
  if (value.includes("parking")) return [13.0807, 80.2725];
  return [13.0831, 80.2702];
}

function requestUrgentNotifications(onDone: (message: string) => void) {
  if (typeof Notification === "undefined") { onDone("Browser notifications are not available"); return; }
  if (Notification.permission === "granted") { onDone("Urgent alerts are already enabled"); return; }
  if (!window.isSecureContext) { onDone("Alerts require a secure HTTPS connection"); return; }
  Notification.requestPermission().then((permission) => onDone(permission === "granted" ? "Urgent alerts enabled" : permission === "denied" ? "Alerts are blocked. Allow notifications for this site in browser settings, then try again." : "Choose Allow when your browser asks for alert permission.")).catch(() => onDone("The browser blocked the alert prompt. Allow notifications for this site in browser settings, then retry."));
}

function formatClock(date: Date) {
  return date.toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true });
}

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function IconBadge({ children, tone = "slate" }: { children: React.ReactNode; tone?: "mint" | "red" | "amber" | "slate" | "blue" }) {
  return <span className={cn("icon-badge", `icon-badge-${tone}`)}>{children}</span>;
}

function LivePill({ children, tone = "mint" }: { children: React.ReactNode; tone?: "mint" | "red" | "amber" | "blue" }) {
  return <span className={cn("live-pill", `live-pill-${tone}`)}>{children}</span>;
}

function ScoreBar({ score, compact = false }: { score: number; compact?: boolean }) {
  return (
    <div className={cn("score-bar", compact && "score-bar-compact")}>
      <div className="score-bar-track"><span style={{ width: `${score}%` }} /></div>
      <strong>{score}%</strong>
    </div>
  );
}

function VenueMap({ zones, selectedId, onSelect, volunteerLocations, sightingMarkers }: { zones: Zone[]; selectedId: string; onSelect: (zone: Zone) => void; volunteerLocations: Record<string, { lat: number; lng: number; accuracy: number }>; sightingMarkers: Array<{ id: number; label: string; position: [number, number]; confidence: number; status?: string }> }) {
  return <LiveVenueMap zones={zones} selectedId={selectedId} volunteerLocations={volunteerLocations} sightingMarkers={sightingMarkers} onSelect={(mapZone) => onSelect(zones.find((zone) => zone.id === mapZone.id) ?? zones[0])} />;
}

function CommandCenter({ onModeChange, mode }: { onModeChange: (mode: Mode) => void; mode: Mode }) {
  const { user } = useAuth();
  const isCoordinator = user?.role === "admin";
  const incidentListQuery = trpc.incident.list.useQuery(undefined, { enabled: isCoordinator, refetchInterval: 5000, retry: false });
  const [selectedIncidentCode, setSelectedIncidentCode] = useState("");
  const selectedIncidentInput = useMemo(() => selectedIncidentCode ? { code: selectedIncidentCode } : undefined, [selectedIncidentCode]);
  const incidentQuery = trpc.incident.current.useQuery(selectedIncidentInput, { refetchInterval: 5000 });
  const reportMutation = trpc.incident.reportSighting.useMutation();
  const reviewMutation = trpc.incident.reviewSighting.useMutation();
  const createMutation = trpc.incident.create.useMutation();
  const markMutation = trpc.incident.markZoneSearched.useMutation();
  const [zones, setZones] = useState<Zone[]>(ZONE_SEEDS);
  const [selectedId, setSelectedId] = useState("B");
  const [sightings, setSightings] = useState<Sighting[]>(INITIAL_SIGHTINGS);
  const [elapsed, setElapsed] = useState(2);
  const [now, setNow] = useState(() => new Date());
  const [showIncidentForm, setShowIncidentForm] = useState(false);
  const [incidentCode, setIncidentCode] = useState("");
  const [incidentTitle, setIncidentTitle] = useState("");
  const [incidentVenue, setIncidentVenue] = useState("");
  const [incidentZone, setIncidentZone] = useState("");
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [toast, setToast] = useState("");
  const [sightingBoost, setSightingBoost] = useState(12);
  const [volunteerLocations, setVolunteerLocations] = useState<Record<string, { lat: number; lng: number; accuracy: number }>>({});
  const dashboardIncident = incidentQuery.data?.incident;
  const dashboardIncidentCode = dashboardIncident?.code ?? selectedIncidentCode ?? "CX1008";

  useEffect(() => {
    const firstActive = incidentListQuery.data?.find((incident) => incident.status === "active");
    if (firstActive && (!selectedIncidentCode || !incidentListQuery.data?.some((incident) => incident.code === selectedIncidentCode))) {
      setSelectedIncidentCode(firstActive.code);
    }
  }, [incidentListQuery.data, selectedIncidentCode]);

  const handleRealtime = useCallback((event: IncidentRealtimeEvent) => {
    if (event.type === "sighting_reported") {
      const payload = event.payload as { id?: number; label?: string; zone?: string; source?: string; confidence?: number; latitude?: number; longitude?: number };
      setSightings((current) => [{ id: payload.id ?? Date.now(), label: payload.label ?? "Live sighting", location: payload.zone ?? "Venue update", time: "just now", source: payload.source ?? "Live volunteer", confidence: payload.confidence ?? 75, status: "new" as const, latitude: payload.latitude as number | undefined, longitude: payload.longitude as number | undefined }, ...current].slice(0, 4));
      setSelectedId("B");
      setZones((current) => current.map((zone) => zone.id === "B" ? { ...zone, score: Math.min(99, zone.score + 8), priority: priorityForScore(Math.min(99, zone.score + 8)), status: "alert" } : zone));
      setSightingBoost((value) => Math.min(30, value + 4));
      setToast("Live sighting received · AI priorities recalculated");
      if ((payload.confidence ?? 0) >= 80 || Boolean((event.payload as { urgent?: boolean }).urgent)) notifyUrgent("Urgent SEARCHGRID sighting", `${payload.label ?? "Possible sighting"} · ${payload.zone ?? "Venue update"}`);
    }
    if (event.type === "zone_completed") {
      const zone = String(event.payload.zone ?? "");
      setZones((current) => current.map((item) => item.id === zone || item.name === zone ? { ...item, status: "covered", score: Math.max(8, item.score - 26), priority: priorityForScore(Math.max(8, item.score - 26)) } : item));
      setToast(`Live update · ${zone} marked searched`);
    }
    if (event.type === "ai_recalculated" || event.type === "assignment_changed") setToast("Live operations update · assignments refreshed");
    if (event.type === "sighting_reviewed") setToast(`Sighting review updated · ${String(event.payload.status ?? "status changed").replace("_", " ")}`);
    if (event.type === "volunteer_location_updated") {
      const payload = event.payload as { volunteerId?: string; lat?: number; lng?: number; accuracy?: number };
      if (payload.volunteerId && payload.lat !== undefined && payload.lng !== undefined) setVolunteerLocations((current) => ({ ...current, [payload.volunteerId as string]: { lat: payload.lat as number, lng: payload.lng as number, accuracy: payload.accuracy ?? 0 } }));
    }
  }, []);

  useIncidentRealtime(dashboardIncidentCode, handleRealtime);

  useEffect(() => {
    const rows = incidentQuery.data?.sightings;
    if (!rows?.length) return;
    setSightings(rows.map((row) => { const enhanced = row as typeof row & { status?: Sighting["status"]; latitude?: number | null; longitude?: number | null }; return { id: enhanced.id, label: enhanced.label, location: enhanced.zone, time: new Date(enhanced.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }), source: enhanced.source, confidence: enhanced.confidence, status: enhanced.status, latitude: enhanced.latitude, longitude: enhanced.longitude }; }));
  }, [incidentQuery.data]);

  useEffect(() => {
    const clock = window.setInterval(() => setNow(new Date()), 1000);
    const demo = window.setInterval(() => {
      setElapsed((value) => value + 1);
      setZones((current) => current.map((zone) => {
        if (zone.status === "covered") return zone;
        const score = calculateSearchPriority(zone, sightingBoost, elapsed + 1);
        return { ...zone, score, priority: priorityForScore(score) };
      }));
    }, 7000);
    return () => { window.clearInterval(clock); window.clearInterval(demo); };
  }, [elapsed, sightingBoost]);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(""), 3500);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const selected = zones.find((zone) => zone.id === selectedId) ?? zones[1];
  const rankedZones = useMemo(() => [...zones].sort((a, b) => b.score - a.score), [zones]);
  const coveredCount = zones.filter((zone) => zone.status === "covered").length;
  const activeCount = zones.filter((zone) => zone.status === "searching").length;
  const highPriorityCount = zones.filter((zone) => zone.priority === "HIGH" && zone.status !== "covered").length;
  const sightingMarkers = sightings.map((item) => ({ id: item.id, label: item.label, position: [item.latitude ?? sightingPosition(item.location)[0], item.longitude ?? sightingPosition(item.location)[1]] as [number, number], confidence: item.confidence, status: item.status }));

  const recalculate = (reason: string) => {
    if (!isCoordinator) { setToast("Coordinator access required for search-plan controls"); return; }
    setIsRecalculating(true);
    setSightingBoost((value) => Math.min(26, value + 4));
    window.setTimeout(() => {
      setZones((current) => current.map((zone) => {
        const score = calculateSearchPriority(zone, sightingBoost + 4, elapsed);
        return { ...zone, score, priority: priorityForScore(score), status: zone.status === "covered" ? "covered" : zone.id === "B" ? "alert" : zone.status };
      }));
      setIsRecalculating(false);
      setToast(`AI model recalculated · ${reason}`);
    }, 700);
  };

  const markSearched = (id: string) => {
    setZones((current) => current.map((zone) => zone.id === id ? { ...zone, status: "covered", score: Math.max(8, zone.score - 26), priority: priorityForScore(Math.max(8, zone.score - 26)) } : zone));
    setToast(`Zone ${id} marked searched · assignments replanned`);
    markMutation.mutate({ zone: id }, { onError: () => setToast(`Zone ${id} marked locally · sign in to broadcast to the team`) });
  };

  const reportSighting = () => {
    const sighting: Sighting = { id: Date.now(), label: "New possible sighting", location: "Central Lawn · east path", time: "just now", source: "Coordinator demo", confidence: 76 };
    setSightings((current) => [sighting, ...current].slice(0, 4));
    setSelectedId("B");
    reportMutation.mutate({ incidentCode: dashboardIncidentCode, zone: sighting.location, label: sighting.label, source: user?.name ?? "Coordinator demo", confidence: sighting.confidence }, { onError: () => setToast("Sighting added locally · sign in to broadcast live") });
    recalculate("new sighting near Central Lawn");
  };

  const reviewSighting = (id: number, status: "under_review" | "verified" | "rejected") => {
    reviewMutation.mutate({ id, status }, { onSuccess: () => { setSightings((current) => current.map((item) => item.id === id ? { ...item, status } : item)); void incidentQuery.refetch(); setToast(`Sighting marked ${status.replace("_", " ")}`); }, onError: (error) => setToast(error.message || "Unable to update sighting review") });
  };

  const createNewIncident = () => {
    if (!isCoordinator) { setToast("Coordinator access required to create an incident"); return; }
    const code = incidentCode.trim().toUpperCase();
    const title = incidentTitle.trim();
    const venue = incidentVenue.trim();
    const lastSeenZone = incidentZone.trim();
    if (!code || !title || !venue || !lastSeenZone) {
      setToast("Complete the incident code, title, venue, and last-seen zone");
      return;
    }
    createMutation.mutate({ code, title, venue, lastSeenZone }, {
      onSuccess: () => {
        setShowIncidentForm(false);
        setSelectedIncidentCode(code);
        void incidentListQuery.refetch();
        setToast(`Incident ${code} created · search coordination is ready`);
        setIncidentCode("");
        setIncidentTitle("");
        setIncidentVenue("");
        setIncidentZone("");
      },
      onError: (error) => setToast(error.message || "Coordinator access is required to create an incident"),
    });
  };

  const coordinatorAccess = () => {
    if (!user) {
      startLogin();
      return;
    }
    if (user.role !== "admin") {
      setToast("Coordinator access required · ask an admin to promote this account");
      return;
    }
    setToast("Coordinator access active · incident controls are enabled");
  };

  const roleLabel = user?.role === "admin" ? "COORDINATOR" : user ? "VOLUNTEER" : "DEMO OPS";

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand-lockup"><div className="brand-mark"><Crosshair size={21} strokeWidth={2.2} /></div><div><div className="brand-name">SEARCHGRID <span>AI</span></div><div className="brand-subtitle">EMERGENCY SEARCH COORDINATION</div></div></div>
        <div className="topbar-center"><LivePill><span className="status-dot" /> SYSTEM ONLINE</LivePill><span className="incident-label"><Siren size={14} /> {dashboardIncident?.title ?? "MISSING PERSON"} — {dashboardIncident?.status?.toUpperCase() ?? "ACTIVE"}</span></div>
        <div className="topbar-actions"><div className="time-readout"><span>{formatClock(now)}</span><small>LOCAL TIME · UTC+05:30</small></div><button className="icon-button" aria-label="Enable urgent notifications" onClick={() => requestUrgentNotifications(setToast)}><Bell size={17} /><i /></button><button className={cn("coordinator-access-button", user?.role === "admin" && "coordinator-access-active")} onClick={coordinatorAccess}><ShieldCheck size={14} /> <span>{user?.role === "admin" ? "COORDINATOR SIGNED IN" : user ? "VOLUNTEER ACCOUNT" : "COORDINATOR SIGN IN"}</span></button></div>
      </header>

      <div className="view-switcher"><div className="view-switcher-inner"><button className={cn(mode === "command" && "active")} onClick={() => onModeChange("command")}><Laptop size={15} /> Command Center</button><button className={cn(mode === "volunteer" && "active")} onClick={() => onModeChange("volunteer")}><Smartphone size={15} /> Volunteer PWA</button><button className={cn(mode === "admin" && "active", !isCoordinator && "role-disabled")} disabled={!isCoordinator} title={isCoordinator ? "Open coordinator controls" : "Coordinator access required"} onClick={() => onModeChange("admin")}><ShieldCheck size={15} /> Admin</button></div><div className="sync-strip"><Wifi size={13} /> Live sync <span>•</span> Last update {formatClock(now)}</div></div>

      <main className="dashboard-content">
        <div className="page-heading"><div><p className="eyebrow">INCIDENT  /  {dashboardIncidentCode}  /  ROUND 1</p><h1>{dashboardIncident?.venue ?? "City Festival Ground"} <span>·</span> <em>Live Operations</em></h1></div><div className="heading-actions">{isCoordinator && <label className="incident-selector"><span>ACTIVE INCIDENT</span><select value={selectedIncidentCode} onChange={(event) => { setSelectedIncidentCode(event.target.value); setSightings([]); }} disabled={incidentListQuery.isLoading}><option value="">Select incident</option>{(incidentListQuery.data ?? []).filter((incident) => incident.status === "active").map((incident) => <option key={incident.code} value={incident.code}>{incident.code} · {incident.title}</option>)}</select></label>}<button className="secondary-button" disabled={!isCoordinator} title={isCoordinator ? "Create a new incident" : "Coordinator access required"} onClick={() => setShowIncidentForm(true)}><SlidersHorizontal size={16} /> Create incident</button><button className="primary-button" onClick={reportSighting}><MessageSquareWarning size={16} /> Report sighting</button></div></div>

        <div className="kpi-grid">
          <div className="kpi-card accent-red"><div className="kpi-top"><span>SEARCH PRIORITY</span><IconBadge tone="red"><Flame size={16} /></IconBadge></div><div className="kpi-value">HIGH <ArrowUpRight size={20} /></div><div className="kpi-foot"><span className="trend-up">+14%</span> since last update</div></div>
          <div className="kpi-card accent-mint"><div className="kpi-top"><span>ACTIVE VOLUNTEERS</span><IconBadge tone="mint"><Users size={16} /></IconBadge></div><div className="kpi-value">24 <small>/ 31</small></div><div className="kpi-foot"><span className="trend-up">77%</span> availability</div></div>
          <div className="kpi-card accent-blue"><div className="kpi-top"><span>ZONES COVERED</span><IconBadge tone="blue"><MapPinned size={16} /></IconBadge></div><div className="kpi-value">{coveredCount} <small>/ {zones.length}</small></div><div className="kpi-foot"><div className="mini-progress"><span style={{ width: `${(coveredCount / zones.length) * 100}%` }} /></div><span>{Math.round((coveredCount / zones.length) * 100)}%</span></div></div>
          <div className="kpi-card accent-amber"><div className="kpi-top"><span>TOP PRIORITY ZONE</span><IconBadge tone="amber"><Target size={16} /></IconBadge></div><div className="kpi-value">Zone {rankedZones[0].id} <small>— {rankedZones[0].score}%</small></div><div className="kpi-foot"><span className="trend-neutral">{rankedZones[0].name}</span> · reassigned 32s ago</div></div>
        </div>

        <div className="command-grid">
          <section className="map-panel panel-card"><div className="panel-header"><div><div className="panel-kicker"><Radio size={13} /> PROBABILITY HEATMAP</div><h2>Venue search grid</h2></div><div className="panel-header-actions"><button className={cn("secondary-button small", isRecalculating && "button-loading")} onClick={() => recalculate("manual refresh")}><RefreshCw size={14} className={cn(isRecalculating && "spin")} /> {isRecalculating ? "Recalculating" : "Recalculate"}</button><button className="icon-button subtle" aria-label="Map options"><Menu size={16} /></button></div></div><div className="map-meta"><span><span className="pulse-dot" /> AI PRIORITIES LIVE</span><span>12 zones · {activeCount} actively searching</span><span>Coverage {coveredCount}/{zones.length}</span></div><VenueMap zones={zones} selectedId={selectedId} volunteerLocations={volunteerLocations} sightingMarkers={sightingMarkers} onSelect={(zone) => setSelectedId(zone.id)} /><div className="map-caption"><Info size={14} /><span>AI predictions are search priorities, not guaranteed locations.</span><button onClick={() => setToast("The model blends distance, time, crowd flow, pathway, sighting, venue feature and searched-area penalty.")}>How scoring works <ChevronRight size={13} /></button></div></section>

          <aside className="zone-panel panel-card"><div className="panel-header"><div><div className="panel-kicker"><Target size={13} /> SELECTED ZONE</div><h2>Zone {selected.id}</h2></div><span className={cn("status-tag", selected.status)}>{selected.status === "searching" ? "SEARCHING" : selected.status === "covered" ? "COVERED" : selected.status === "alert" ? "UPDATED" : "QUEUED"}</span></div><div className="zone-detail-name">{selected.name}</div><div className="priority-score"><span>AI SEARCH PRIORITY</span><strong>{selected.score}%</strong><ScoreBar score={selected.score} /></div><div className="why-block"><div className="why-title"><Sparkles size={14} /> WHY THIS ZONE?</div><ul>{selected.features.map((feature) => <li key={feature}><CheckCircle2 size={14} /> {feature}</li>)}</ul></div><div className="assignment-block"><div className="assignment-label">ASSIGNED SEARCH TEAM <span>{selected.volunteers} volunteers</span></div><div className="assigned-person"><div className="person-avatar">{selected.assigned ?? "—"}</div><div><strong>{selected.assigned ?? "Unassigned"}</strong><small>{selected.status === "searching" ? "On route · 180 m away" : "Available for dispatch"}</small></div><button className="icon-button subtle"><Navigation size={15} /></button></div></div><button className="full-button" onClick={() => markSearched(selected.id)} disabled={selected.status === "covered"}>{selected.status === "covered" ? <><CheckCircle2 size={16} /> Zone already covered</> : <><Check size={16} /> Mark zone searched</>}</button><div className="replan-note"><Zap size={13} /><span>Assignments update automatically when new sighting data arrives.</span></div></aside>
        </div>

        <div className="lower-grid"><section className="activity-panel panel-card"><div className="panel-header"><div><div className="panel-kicker"><Activity size={13} /> LIVE ACTIVITY</div><h2>Incident timeline</h2></div><LivePill tone="blue">{highPriorityCount} high priority</LivePill></div><div className="activity-list">{sightings.map((item, index) => <div className={cn("activity-row", index === 0 && "latest")} key={item.id}><div className={cn("activity-icon", index === 0 ? "activity-icon-red" : "activity-icon-blue")}><MessageSquareWarning size={15} /></div><div className="activity-copy"><strong>{item.label} <span>{item.confidence}% confidence</span></strong><p>{item.location}</p><small>{item.source} · {item.time}</small>{item.status && <span className={cn("sighting-status", `sighting-status-${item.status}`)}>{item.status.replace("_", " ")}</span>}</div>{isCoordinator && <div className="sighting-review-actions"><button onClick={() => reviewSighting(item.id, "under_review")} disabled={reviewMutation.isPending || item.status === "under_review"}>Review</button><button onClick={() => reviewSighting(item.id, "verified")} disabled={reviewMutation.isPending || item.status === "verified"}>Verify</button><button onClick={() => reviewSighting(item.id, "rejected")} disabled={reviewMutation.isPending || item.status === "rejected"}>Reject</button></div>}<button className="icon-button subtle"><ChevronRight size={15} /></button></div>)}</div><button className="link-button" onClick={() => setToast("Activity log is live for this demo incident.")}>View full activity log <ArrowUpRight size={14} /></button></section><section className="assignment-panel panel-card"><div className="panel-header"><div><div className="panel-kicker"><Users size={13} /> SMART ASSIGNMENTS</div><h2>Search queue</h2></div><button className="secondary-button small" onClick={() => recalculate("assignment refresh")}><RefreshCw size={14} /> Replan all</button></div><div className="queue-list">{rankedZones.slice(0, 5).map((zone, index) => <div className="queue-row" key={zone.id}><span className="queue-rank">0{index + 1}</span><div className={cn("queue-priority", zone.priority.toLowerCase())}>{zone.priority}</div><div className="queue-zone"><strong>Zone {zone.id} <span>· {zone.name}</span></strong><small>{zone.assigned ?? "Unassigned"} · {zone.status === "covered" ? "Complete" : index === 0 ? "Dispatch now" : "Queued"}</small></div><ScoreBar score={zone.score} compact /><ChevronRight size={15} className="queue-chevron" /></div>)}</div></section></div>
        <CoordinationPlanPanel disabled={!isCoordinator} />

        <div className="bottom-notice"><div className="notice-icon"><ShieldCheck size={18} /></div><div><strong>Safety protocol enabled</strong><span>All volunteer locations are visible to coordinators only. Never use this score as a guaranteed location.</span></div><div className="notice-status"><span className="status-dot" /> Secure channel</div></div>
      </main>

      {toast && <div className="toast"><CheckCircle2 size={17} /><span>{toast}</span><button onClick={() => setToast("")}><X size={14} /></button></div>}
      {showIncidentForm && <div className="modal-backdrop" onClick={() => setShowIncidentForm(false)}><form className="incident-modal incident-create-modal" onSubmit={(event) => { event.preventDefault(); createNewIncident(); }} onClick={(event) => event.stopPropagation()}><div className="modal-header"><div><div className="panel-kicker">COORDINATOR ACTION</div><h2>Create a new incident</h2></div><button type="button" className="icon-button subtle" aria-label="Close create incident form" onClick={() => setShowIncidentForm(false)}><X size={17} /></button></div><p className="incident-form-intro">Start a dedicated search operation and make the incident available to your volunteer team.</p><div className="incident-form-grid"><label><span>INCIDENT CODE</span><input value={incidentCode} onChange={(event) => setIncidentCode(event.target.value)} placeholder="e.g. CX1012" maxLength={32} autoFocus /></label><label><span>INCIDENT TITLE</span><input value={incidentTitle} onChange={(event) => setIncidentTitle(event.target.value)} placeholder="e.g. Missing person — Maya K." /></label><label><span>VENUE</span><input value={incidentVenue} onChange={(event) => setIncidentVenue(event.target.value)} placeholder="e.g. City Festival Ground" /></label><label><span>LAST-SEEN ZONE</span><input value={incidentZone} onChange={(event) => setIncidentZone(event.target.value)} placeholder="e.g. North entrance" /></label></div><div className="modal-note"><AlertTriangle size={15} /><span>Creating an incident requires coordinator access. The start time is recorded automatically.</span></div><div className="incident-form-actions"><button type="button" className="secondary-button" onClick={() => setShowIncidentForm(false)}>Cancel</button><button type="submit" className="full-button" disabled={createMutation.isPending}>{createMutation.isPending ? "Creating incident…" : "Start incident"}</button></div></form></div>}
    </div>
  );
}

function VolunteerView({ onModeChange }: { onModeChange: (mode: Mode) => void }) {
  const { user, logout } = useAuth();
  const incidentQuery = trpc.incident.current.useQuery(undefined, { refetchInterval: 5000, retry: false });
  const profileQuery = trpc.volunteer.profile.useQuery(undefined, { enabled: Boolean(user), retry: false });
  const mySightingsQuery = trpc.volunteer.mySightings.useQuery(undefined, { enabled: Boolean(user), refetchInterval: 5000, retry: false });
  const currentIncident = incidentQuery.data?.incident;
  const activeIncidentCode = currentIncident?.code ?? "CX1008";
  const activeZone = currentIncident?.lastSeenZone ?? "B";
  const reportMutation = trpc.incident.reportSighting.useMutation();
  const markMutation = trpc.incident.markZoneSearched.useMutation();
  const locationMutation = trpc.volunteer.updateLocation.useMutation();
  const [searched, setSearched] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportKind, setReportKind] = useState<"possible" | "help" | "safety">("possible");
  const [reportConfidence, setReportConfidence] = useState(76);
  const [profileOpen, setProfileOpen] = useState(false);
  const [switchDialogOpen, setSwitchDialogOpen] = useState(false);
  const [profileForm, setProfileForm] = useState({ fullName: user?.name ?? "", phone: "", emergencyContact: "", skills: "", availability: "available" as "available" | "unavailable" });
  const [offline, setOffline] = useState(false);
  const [routeOpen, setRouteOpen] = useState(false);
  const [routeOrigin, setRouteOrigin] = useState<{ lat: number; lng: number } | undefined>(undefined);
  const [livePosition, setLivePosition] = useState<{ lat: number; lng: number; accuracy: number } | undefined>(undefined);
  const [toast, setToast] = useState("");
  const offlineSync = useOfflineSync();
  const resilientTransport = useResilientTransport();
  const profileMutation = trpc.volunteer.saveProfile.useMutation({ onSuccess: () => { void profileQuery.refetch(); setProfileOpen(false); setToast("Volunteer profile submitted · awaiting coordinator approval"); }, onError: (error) => setToast(error.message || "Unable to submit volunteer profile") });
  const handleRealtime = useCallback((event: IncidentRealtimeEvent) => {
    if (event.type === "zone_completed") setToast("Command center updated this zone");
    if (event.type === "assignment_changed") setToast("Assignment changed · refresh your mission");
    if (event.type === "sighting_reviewed" && event.payload.reportedBy === user?.openId) { void mySightingsQuery.refetch(); setToast(`Coordinator updated your sighting · ${String(event.payload.status ?? "status changed").replace("_", " ")}`); }
  }, [mySightingsQuery.refetch, user?.openId]);
  useIncidentRealtime(activeIncidentCode, handleRealtime);

  useEffect(() => {
    if (!profileQuery.data) return;
    setProfileForm({ fullName: profileQuery.data.fullName, phone: profileQuery.data.phone, emergencyContact: profileQuery.data.emergencyContact, skills: profileQuery.data.skills, availability: profileQuery.data.availability });
  }, [profileQuery.data]);

  useEffect(() => {
    if (offline || !navigator.geolocation) return;
    let watchId: number | undefined;
    let cancelled = false;
    const startWatch = () => {
      if (cancelled) return;
      watchId = navigator.geolocation.watchPosition((position) => {
        setLivePosition({ lat: position.coords.latitude, lng: position.coords.longitude, accuracy: position.coords.accuracy });
        locationMutation.mutate({ lat: position.coords.latitude, lng: position.coords.longitude, accuracy: position.coords.accuracy });
      }, (error) => { if (error.code === 2) setToast("Your device could not determine a location. Tap Navigate to retry."); else if (error.code === 3) setToast("GPS timed out. Tap Navigate to retry or continue with the map route."); }, { enableHighAccuracy: true, maximumAge: 10000, timeout: 10000 });
    };
    if (navigator.permissions?.query) navigator.permissions.query({ name: "geolocation" }).then((permission) => { if (permission.state === "granted") startWatch(); });
    return () => { cancelled = true; if (watchId !== undefined) navigator.geolocation.clearWatch(watchId); };
  }, [offline]);

  const completeSearch = () => {
    setSearched(true);
    if (offline || !offlineSync.isOnline) {
      offlineSync.enqueue("zone_completed", { zone: activeZone });
      resilientTransport.relay({ id: `zone-${Date.now()}`, kind: "zone_completed", payload: { zone: activeZone }, createdAt: Date.now() });
      setToast(`${activeZone} saved offline · will sync automatically when connectivity returns`);
    } else {
      setToast(`${activeZone} marked searched · command center synced`);
      markMutation.mutate({ zone: activeZone }, { onError: () => { offlineSync.enqueue("zone_completed", { zone: activeZone }); resilientTransport.relay({ id: `zone-${Date.now()}`, kind: "zone_completed", payload: { zone: activeZone }, createdAt: Date.now() }); setToast("Search queued for offline sync"); } });
    }
  };
  const signOut = async () => {
    setProfileOpen(false);
    try {
      await logout();
      setToast("Signed out of this device");
    } catch {
      setToast("Unable to sign out. Please try again.");
    }
  };
  const confirmVolunteerSwitch = () => setSwitchDialogOpen(true);
  const openVolunteerLogin = () => {
    startLoginInNewWindow();
    setToast("Volunteer login opened in a new window. Use Incognito or another browser profile to keep this coordinator session active.");
  };
  const switchToVolunteer = async () => {
    setToast("Signing out coordinator session before volunteer sign in…");
    try {
      await logout();
      startLogin();
    } catch {
      setToast("Unable to switch sessions. Please sign out and try again.");
    }
  };
  const startNavigation = () => {
    const destination = "https://www.google.com/maps/dir/?api=1&destination=13.0831,80.2702&travelmode=walking";
    if (!navigator.geolocation) { setRouteOpen(true); setToast("GPS is unavailable. Showing the venue route without live position."); window.open(destination, "_blank", "noopener,noreferrer"); return; }
    navigator.geolocation.getCurrentPosition((position) => { const nextPosition = { lat: position.coords.latitude, lng: position.coords.longitude, accuracy: position.coords.accuracy }; setLivePosition(nextPosition); setRouteOrigin(nextPosition); setRouteOpen(true); setToast("GPS locked · live traffic route to Zone B is active"); window.open(destination, "_blank", "noopener,noreferrer"); }, (error) => { setRouteOpen(true); window.open(destination, "_blank", "noopener,noreferrer"); if (error.code === 1) setToast("Location is blocked. Allow Location for this site in browser settings; the venue route is still open."); else if (error.code === 2) setToast("Location unavailable. The venue route is still open; retry Navigate outdoors."); else setToast("GPS timed out. The venue route is still open; tap Navigate to retry."); }, { enableHighAccuracy: true, timeout: 8000, maximumAge: 10000 });
  };
  return <div className="volunteer-shell"><header className="volunteer-topbar"><button className="volunteer-brand" onClick={() => onModeChange("command")}><span className="brand-mark"><Crosshair size={19} /></span><span>SEARCHGRID <b>AI</b></span></button><div className="volunteer-status"><span className="status-dot" /> {offline || !offlineSync.isOnline ? "OFFLINE MODE" : `LIVE SYNC · ${user?.name ?? "DEMO"}`} {user && <small className="account-identity">· {user.email ?? user.openId} · {user.role === "admin" ? "Coordinator" : "Volunteer"}</small>} {offlineSync.pendingCount > 0 && <small className="pending-sync">· {offlineSync.pendingCount} queued</small>}<small className="transport-status">· {resilientTransport.transportLabel}</small></div><button className={cn("secondary-button volunteer-signin-button", user && "volunteer-signed-in")} onClick={() => { if (!user) startLogin(); }} aria-label={user ? (user.role === "admin" ? "Coordinator signed in" : "Volunteer signed in") : "Sign in as volunteer"} aria-pressed={Boolean(user)}><UserRound size={15} /> {user ? (user.role === "admin" ? "Coordinator signed in" : "Volunteer signed in") : "Volunteer sign in"}</button>{user?.role === "admin" && <button className="secondary-button volunteer-switch-button" onClick={confirmVolunteerSwitch} aria-label="Confirm coordinator switch to volunteer"><UserRound size={15} /> Volunteer sign in</button>}<button className="secondary-button volunteer-new-window-button" onClick={openVolunteerLogin} aria-label="Open volunteer login in a new window"><ExternalLink size={15} /> Open volunteer login</button>{user && user.role !== "admin" && <button className="secondary-button volunteer-profile-button" onClick={() => setProfileOpen(true)}><UserRound size={15} /> Profile</button>}{user && <button className="secondary-button volunteer-signout-button" onClick={() => void signOut()} aria-label="Sign out"><LogOut size={15} /> Sign out</button>}<button className="icon-button subtle" aria-label="Enable urgent notifications" onClick={() => requestUrgentNotifications(setToast)}><Bell size={17} /></button><button className="icon-button subtle" onClick={() => setOffline((value) => !value)}>{offline ? <WifiOff size={17} /> : <Wifi size={17} />}</button></header><main className="volunteer-main"><div className="volunteer-incident"><div><span className="eyebrow">ACTIVE SEARCH · {activeIncidentCode}</span><h1>{currentIncident?.title ?? "Waiting for an active incident"}</h1><p>{currentIncident?.venue ?? "No active venue"} · started {currentIncident ? new Date(currentIncident.lastSeenAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}</p></div><div className="volunteer-siren"><Siren size={19} /><span>ACTIVE</span></div></div><div className="mission-card"><div className="mission-top"><div><span className="panel-kicker">YOUR ASSIGNMENT</span><h2>{activeZone}</h2></div><button className="live-pill live-pill-red search-now-button" onClick={completeSearch} disabled={searched}>{searched ? <><CheckCircle2 size={13} /> SEARCHED</> : <><Target size={13} /> SEARCH NOW</>}</button></div><div className="mission-score"><div className="mission-score-number">86<span>%</span></div><div><strong>AI SEARCH PRIORITY</strong><p>Highest probability area right now</p></div></div><div className="assignment-route"><div className="route-icon"><RouteIcon size={20} /></div><div><strong>180 m to your zone</strong><p>Take the north walkway · approx. 2 min</p></div><button className="primary-button" onClick={startNavigation}><Navigation size={16} /> Navigate</button></div><div className="mission-reasons"><span><Check size={13} /> Last seen nearby</span><span><Check size={13} /> High crowd flow</span><span><Check size={13} /> Connected pathway</span></div></div><div className="volunteer-map-mini"><div className="mini-map-grid" /><div className="mini-route" /><div className="mini-location"><span /><small>YOU</small></div><div className="mini-destination"><Target size={17} /><small>ZONE B</small></div><div className="mini-map-label food">FOOD COURT</div><div className="mini-map-label stage">STAGE</div><div className="mini-map-cta"><Compass size={15} /><span>North walkway</span><strong>2 min</strong></div></div><VolunteerLiveMap position={livePosition} />{routeOpen && <><div className="route-steps"><div className="route-steps-head"><span><RouteIcon size={14} /> TURN-BY-TURN WALKING ROUTE</span><button onClick={() => setRouteOpen(false)}><X size={14} /></button></div>{ROUTE_STEPS.map((step, index) => <div className="route-step" key={step}><b>{index + 1}</b><span>{step}</span></div>)}<small>Route preview via Google Maps · keep your team channel open</small></div><TrafficRouteMap origin={routeOrigin} /></>}<div className="volunteer-actions"><button className="full-button" onClick={completeSearch} disabled={searched}>{searched ? <><CheckCircle2 size={17} /> Search logged</> : <><Check size={17} /> Mark zone searched</>}</button><button className="secondary-button full-button-secondary" onClick={() => setReportOpen(true)}><MessageSquareWarning size={17} /> Report a sighting</button></div>{user && mySightingsQuery.data?.[0] && <div className="volunteer-sighting-status"><div><span className="panel-kicker">LATEST SIGHTING UPDATE</span><strong>{mySightingsQuery.data[0].label}</strong><small>{mySightingsQuery.data[0].zone} · {new Date(mySightingsQuery.data[0].createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</small></div><span className={cn("sighting-status", `sighting-status-${mySightingsQuery.data[0].status}`)}>{mySightingsQuery.data[0].status.replace("_", " ")}</span></div>}<div className="volunteer-status-card"><div className="status-card-row"><IconBadge tone="mint"><BatteryCharging size={16} /></IconBadge><div><strong>Device ready</strong><span>Battery 84% · GPS accuracy high</span></div><CheckCircle2 size={16} className="check-green" /></div><div className="status-card-row"><IconBadge tone="blue"><RefreshCw size={16} /></IconBadge><div><strong>{offline || !offlineSync.isOnline ? "Waiting to sync" : offlineSync.pendingCount ? "Syncing queued actions" : "All changes synced"}</strong><span>{offlineSync.pendingCount ? `${offlineSync.pendingCount} action(s) stored safely on this device` : offline || !offlineSync.isOnline ? "Will send when connection returns" : "Last sync just now"}</span></div><button className={cn("sync-indicator-button", (offline || !offlineSync.isOnline) && "sync-offline")} onClick={() => void offlineSync.flush()} title="Sync queued actions"><span className={cn("sync-indicator", (offline || !offlineSync.isOnline) && "sync-offline")} />{offlineSync.pendingCount > 0 ? "SYNC" : ""}</button></div></div><div className="volunteer-disclaimer"><Info size={14} /><span>AI predictions are search priorities, not guaranteed locations. Stay with your team and follow coordinator instructions.</span></div></main><nav className="volunteer-nav"><button className="active"><Target size={18} /><span>Mission</span></button><button><MapPinned size={18} /><span>Map</span></button><button onClick={() => onModeChange("command")}><Radio size={18} /><span>Command</span></button>{user && user.role !== "admin" && <button onClick={() => setProfileOpen(true)}><UserRound size={18} /><span>Profile</span></button>}</nav>{toast && <div className="toast mobile-toast"><CheckCircle2 size={17} /><span>{toast}</span></div>}{profileOpen && <div className="modal-backdrop" onClick={() => setProfileOpen(false)}><form className="incident-modal volunteer-profile-modal" onSubmit={(event) => { event.preventDefault(); if (!user) { startLogin(); return; } profileMutation.mutate(profileForm); }} onClick={(event) => event.stopPropagation()}><div className="modal-header"><div><div className="panel-kicker">VOLUNTEER PROFILE</div><h2>Your field profile</h2></div><button type="button" className="icon-button subtle" aria-label="Close volunteer profile" onClick={() => setProfileOpen(false)}><X size={17} /></button></div><p className="profile-intro">Submit your details so the coordinator can check availability, assign a zone, and approve you for the search.</p><div className="profile-form-grid"><label><span>FULL NAME</span><input value={profileForm.fullName} onChange={(event) => setProfileForm({ ...profileForm, fullName: event.target.value })} placeholder="Your name" /></label><label><span>PHONE</span><input value={profileForm.phone} onChange={(event) => setProfileForm({ ...profileForm, phone: event.target.value })} placeholder="Mobile number" /></label><label><span>EMERGENCY CONTACT</span><input value={profileForm.emergencyContact} onChange={(event) => setProfileForm({ ...profileForm, emergencyContact: event.target.value })} placeholder="Name and phone" /></label><label><span>AVAILABILITY</span><select value={profileForm.availability} onChange={(event) => setProfileForm({ ...profileForm, availability: event.target.value as "available" | "unavailable" })}><option value="available">Available for deployment</option><option value="unavailable">Not currently available</option></select></label><label className="profile-wide"><span>SKILLS / EXPERIENCE</span><textarea value={profileForm.skills} onChange={(event) => setProfileForm({ ...profileForm, skills: event.target.value })} placeholder="First aid, crowd navigation, local knowledge…" rows={4} /></label></div>{profileQuery.data && <div className="profile-status-note"><strong>Status: {profileQuery.data.status}</strong>{profileQuery.data.assignedZone && <span>Assigned zone: {profileQuery.data.assignedZone}</span>}{profileQuery.data.status === "approved" && <span>Your coordinator has approved you for field work.</span>}</div>}<button type="submit" className="full-button" disabled={profileMutation.isPending}>{profileMutation.isPending ? "Submitting profile…" : "Submit for coordinator review"}</button></form></div>}{reportOpen && <div className="modal-backdrop" onClick={() => setReportOpen(false)}><div className="incident-modal volunteer-report-modal" onClick={(event) => event.stopPropagation()}><div className="modal-header"><div><div className="panel-kicker">QUICK REPORT</div><h2>Report a sighting</h2></div><button className="icon-button subtle" onClick={() => setReportOpen(false)}><X size={17} /></button></div><button className={cn("report-option", reportKind === "possible" && "active")} onClick={() => setReportKind("possible")}><CircleDot size={17} /><span><strong>Possible sighting</strong><small>Someone matching the description</small></span>{reportKind === "possible" && <Check size={16} />}</button><button className={cn("report-option", reportKind === "help" && "active")} onClick={() => setReportKind("help")}><MapPinned size={17} /><span><strong>Area needs help</strong><small>Request another volunteer here</small></span>{reportKind === "help" && <Check size={16} />}</button><button className={cn("report-option", reportKind === "safety" && "active")} onClick={() => setReportKind("safety")}><AlertTriangle size={17} /><span><strong>Safety issue</strong><small>Blocked path or urgent concern</small></span>{reportKind === "safety" && <Check size={16} />}</button><label className="report-confidence"><span>CONFIDENCE <strong>{reportConfidence}%</strong></span><input type="range" min="0" max="100" step="1" value={reportConfidence} onChange={(event) => setReportConfidence(Number(event.target.value))} /></label><button className="full-button" onClick={() => { if (offline || !offlineSync.isOnline) { offlineSync.enqueue("sighting", { incidentCode: activeIncidentCode, zone: activeZone, label: "Possible sighting", source: user?.name ?? "Volunteer demo", confidence: 76, latitude: livePosition?.lat, longitude: livePosition?.lng }); setToast("Report saved offline · will sync when connectivity returns"); } else { reportMutation.mutate({ incidentCode: activeIncidentCode, zone: activeZone, label: reportKind === "possible" ? "Possible sighting" : reportKind === "help" ? "Area needs help" : "Safety issue", source: user?.name ?? "Volunteer demo", confidence: reportConfidence, urgent: reportKind === "safety", latitude: livePosition?.lat, longitude: livePosition?.lng }, { onSuccess: () => { void mySightingsQuery.refetch(); setToast("Report sent · coordinator notified"); }, onError: (error) => setToast(error.message || "Unable to send report") }); } setReportOpen(false); }}><Send size={16} /> Send report</button></div></div>}{switchDialogOpen && <AlertDialog open={switchDialogOpen} onOpenChange={setSwitchDialogOpen}><AlertDialogContent className="account-switch-dialog"><AlertDialogHeader><AlertDialogTitle>Switch to volunteer account?</AlertDialogTitle><AlertDialogDescription>This will sign out the current coordinator session on this browser and start volunteer sign in. To keep both accounts active, use “Open volunteer login” with Incognito or another browser profile instead.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Stay as coordinator</AlertDialogCancel><AlertDialogAction onClick={() => void switchToVolunteer()}>Sign out and continue</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>}</div>;
}

export default function Home() {
  const [mode, setMode] = useState<Mode>(() => window.location.hash === "#volunteer" ? "volunteer" : window.location.hash === "#admin" ? "admin" : "command");
  const changeMode = (nextMode: Mode) => { setMode(nextMode); window.history.replaceState({}, "", nextMode === "volunteer" ? "#volunteer" : nextMode === "admin" ? "#admin" : "#command"); };
  return mode === "volunteer" ? <VolunteerView onModeChange={changeMode} /> : mode === "admin" ? <AdminPanel onBack={() => changeMode("command")} /> : <CommandCenter mode={mode} onModeChange={changeMode} />;
}
