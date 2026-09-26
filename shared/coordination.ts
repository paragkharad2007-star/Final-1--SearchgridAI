export type VenueNode = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  kind: "zone" | "gate" | "corridor" | "barrier";
  crowdFlow: number;
  blocked?: boolean;
};

export type LastSeenSignal = {
  lat: number;
  lng: number;
  recordedAt: number;
  headingDegrees: number;
  speedMps: number;
  confidence: number;
};

export type DriftZone = {
  id: string;
  center: { lat: number; lng: number };
  radiusMeters: number;
  probability: number;
  reasons: string[];
  source: "last_seen" | "flow" | "pathway";
};

export type SearchAssignment = {
  volunteerId: string;
  zoneId: string;
  priority: number;
  distanceMeters: number;
  reason: string;
};

export type OfflineAction = {
  id: string;
  type: "sighting" | "zone_completed" | "location";
  createdAt: number;
  payload: Record<string, unknown>;
};

export const DEMO_VENUE_NODES: VenueNode[] = [
  { id: "A", name: "Main Gate", lat: 13.0831, lng: 80.2702, kind: "gate", crowdFlow: 0.92 },
  { id: "B", name: "Food Court", lat: 13.0840, lng: 80.2711, kind: "zone", crowdFlow: 0.88 },
  { id: "C", name: "Stage Plaza", lat: 13.0845, lng: 80.2721, kind: "zone", crowdFlow: 0.84 },
  { id: "D", name: "Children Area", lat: 13.0851, lng: 80.2730, kind: "zone", crowdFlow: 0.66 },
  { id: "E", name: "West Walkway", lat: 13.0837, lng: 80.2694, kind: "corridor", crowdFlow: 0.74 },
  { id: "F", name: "Central Lawn", lat: 13.0834, lng: 80.2718, kind: "zone", crowdFlow: 0.59 },
  { id: "G", name: "East Walkway", lat: 13.0841, lng: 80.2735, kind: "corridor", crowdFlow: 0.51 },
  { id: "H", name: "Medical Center", lat: 13.0849, lng: 80.2740, kind: "zone", crowdFlow: 0.34 },
  { id: "I", name: "Parking Loop", lat: 13.0824, lng: 80.2698, kind: "zone", crowdFlow: 0.25 },
  { id: "J", name: "Service Road", lat: 13.0825, lng: 80.2715, kind: "barrier", crowdFlow: 0.18, blocked: true },
  { id: "K", name: "Gate B", lat: 13.0829, lng: 80.2735, kind: "gate", crowdFlow: 0.29 },
  { id: "L", name: "Restrooms", lat: 13.0843, lng: 80.2744, kind: "zone", crowdFlow: 0.21 },
];

const toRadians = (degrees: number) => degrees * Math.PI / 180;
const distanceMeters = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => {
  const earth = 6371000;
  const dLat = toRadians(b.lat - a.lat);
  const dLng = toRadians(b.lng - a.lng);
  const lat = toRadians((a.lat + b.lat) / 2);
  return Math.sqrt((earth * dLat) ** 2 + (earth * Math.cos(lat) * dLng) ** 2);
};

function projectSignal(signal: LastSeenSignal, minutes: number) {
  const travelMeters = Math.max(0, signal.speedMps) * minutes * 60;
  const bearing = toRadians(signal.headingDegrees);
  return {
    lat: signal.lat + (travelMeters * Math.cos(bearing)) / 111320,
    lng: signal.lng + (travelMeters * Math.sin(bearing)) / (111320 * Math.cos(toRadians(signal.lat))),
  };
}

export function estimateDriftZones(signal: LastSeenSignal, nodes: VenueNode[] = DEMO_VENUE_NODES): DriftZone[] {
  const projected = projectSignal(signal, 4);
  return nodes
    .filter((node) => !node.blocked)
    .map((node) => {
      const distanceToLastSeen = distanceMeters(signal, node);
      const distanceToProjected = distanceMeters(projected, node);
      const flow = Math.round(node.crowdFlow * 28);
      const pathwayBonus = node.kind === "corridor" || node.kind === "gate" ? 14 : 0;
      const directionMatch = distanceToProjected < distanceToLastSeen ? 16 : 0;
      const probability = Math.max(1, Math.min(99, Math.round(signal.confidence * 0.42 + flow + pathwayBonus + directionMatch - distanceToProjected / 85)));
      const reasons = [
        `${Math.round(distanceToLastSeen)}m from last-seen point`,
        `${Math.round(node.crowdFlow * 100)}% crowd-flow index`,
        node.kind === "corridor" || node.kind === "gate" ? "connected pathway or exit route" : "venue-layout adjacency",
      ];
      return {
        id: node.id,
        center: { lat: node.lat, lng: node.lng },
        radiusMeters: Math.round(35 + node.crowdFlow * 80),
        probability,
        reasons,
        source: directionMatch ? "pathway" : node.crowdFlow > 0.65 ? "flow" : "last_seen",
      } satisfies DriftZone;
    })
    .sort((a, b) => b.probability - a.probability)
    .slice(0, 6);
}

export function assignNonOverlappingZones(
  volunteers: Array<{ id: string; lat: number; lng: number; available?: boolean }>,
  driftZones: DriftZone[],
): SearchAssignment[] {
  const used = new Set<string>();
  return volunteers
    .filter((volunteer) => volunteer.available !== false)
    .map((volunteer) => {
      const candidate = driftZones
        .filter((zone) => !used.has(zone.id))
        .map((zone) => ({ zone, distanceMeters: Math.round(distanceMeters(volunteer, zone.center)) }))
        .sort((a, b) => (b.zone.probability - a.zone.probability) || (a.distanceMeters - b.distanceMeters))[0];
      if (!candidate) return undefined;
      used.add(candidate.zone.id);
      return {
        volunteerId: volunteer.id,
        zoneId: candidate.zone.id,
        priority: candidate.zone.probability,
        distanceMeters: candidate.distanceMeters,
        reason: `Highest unassigned probability zone; ${candidate.distanceMeters}m from volunteer`,
      } satisfies SearchAssignment;
    })
    .filter((assignment): assignment is SearchAssignment => Boolean(assignment));
}

export function buildOfflineBatch(actions: OfflineAction[]) {
  return actions.slice().sort((a, b) => a.createdAt - b.createdAt).map((action) => ({ ...action, syncedAt: Date.now() }));
}

export function hasOverlappingAssignments(assignments: SearchAssignment[]) {
  return new Set(assignments.map((assignment) => assignment.zoneId)).size !== assignments.length;
}
