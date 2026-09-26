import {
  assignNonOverlappingZones,
  buildOfflineBatch,
  DEMO_VENUE_NODES,
  estimateDriftZones,
  type LastSeenSignal,
  type OfflineAction,
} from "../shared/coordination";
import { applyMockCrowdFlow, getMockCrowdFlow, type CrowdFlowScenario } from "../shared/mockCrowdFlow";

const DEFAULT_SIGNAL: LastSeenSignal = {
  lat: 13.0840,
  lng: 80.2711,
  recordedAt: Date.now() - 4 * 60_000,
  headingDegrees: 38,
  speedMps: 1.15,
  confidence: 82,
};

export function createCoordinationPlan(input?: Partial<LastSeenSignal> & { scenario?: CrowdFlowScenario; timelineMinute?: number }) {
  const { scenario = "baseline", timelineMinute = 0, ...signalInput } = input ?? {};
  const signal = { ...DEFAULT_SIGNAL, ...signalInput };
  const venueNodes = applyMockCrowdFlow(DEMO_VENUE_NODES, scenario, timelineMinute);
  const driftZones = estimateDriftZones(signal, venueNodes);
  const volunteers = [
    { id: "V02", lat: 13.0831, lng: 80.2702 },
    { id: "V03", lat: 13.0845, lng: 80.2721 },
    { id: "V07", lat: 13.0840, lng: 80.2711 },
    { id: "V11", lat: 13.0851, lng: 80.2730 },
    { id: "V14", lat: 13.0837, lng: 80.2694 },
    { id: "V18", lat: 13.0841, lng: 80.2735 },
  ];
  return {
    signal,
    venueNodes,
    crowdFlow: getMockCrowdFlow(venueNodes, scenario, Date.now(), timelineMinute),
    scenario,
    timelineMinute,
    driftZones,
    assignments: assignNonOverlappingZones(volunteers, driftZones),
    generatedAt: Date.now(),
    modelVersion: "drift-v1-explainable",
  };
}

export function syncOfflineActions(actions: OfflineAction[]) {
  return { accepted: buildOfflineBatch(actions), rejected: [], syncedAt: Date.now() };
}
