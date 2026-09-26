import type { VenueNode } from "./coordination";

export type CrowdFlowScenario = "baseline" | "surge" | "evacuation";

export type MockCrowdFlowSample = {
  nodeId: string;
  zoneName: string;
  index: number;
  direction: "north" | "south" | "east" | "west" | "mixed";
  peoplePerMinute: number;
  capturedAt: number;
};

const directionFor = (index: number): MockCrowdFlowSample["direction"] => ["north", "east", "mixed", "south", "west"][index % 5] as MockCrowdFlowSample["direction"];

export function getMockCrowdFlow(nodes: VenueNode[], scenario: CrowdFlowScenario = "baseline", now = Date.now(), timelineMinute = 0): MockCrowdFlowSample[] {
  const multiplier = scenario === "surge" ? 1.65 : scenario === "evacuation" ? 0.7 : 1;
  const directionalBias = scenario === "surge" ? 1.2 : scenario === "evacuation" ? 1.45 : 1;
  return nodes.map((node, index) => ({
    nodeId: node.id,
    zoneName: node.name,
    index: Math.min(99, Math.max(1, Math.round(node.crowdFlow * 100 * multiplier + Math.sin((timelineMinute + index) / 2) * 8 + timelineMinute * (scenario === "surge" ? 1.4 : scenario === "evacuation" ? -0.8 : 0.5)))),
    direction: directionFor(index + (scenario === "evacuation" ? 1 : 0) + Math.floor(timelineMinute / 3)),
    peoplePerMinute: Math.max(1, Math.round((8 + node.crowdFlow * 42) * multiplier * directionalBias + timelineMinute * (scenario === "surge" ? 2 : scenario === "evacuation" ? -1 : 1))),
    capturedAt: now + timelineMinute * 60_000,
  }));
}

export function applyMockCrowdFlow(nodes: VenueNode[], scenario: CrowdFlowScenario = "baseline", timelineMinute = 0): VenueNode[] {
  const samples = getMockCrowdFlow(nodes, scenario, Date.now(), timelineMinute);
  return nodes.map((node) => {
    const sample = samples.find((item) => item.nodeId === node.id);
    return sample ? { ...node, crowdFlow: Math.min(0.99, sample.index / 100) } : node;
  });
}
