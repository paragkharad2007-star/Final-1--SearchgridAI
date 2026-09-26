import { describe, expect, it } from "vitest";
import { DEMO_VENUE_NODES } from "../shared/coordination";
import { applyMockCrowdFlow, getMockCrowdFlow } from "../shared/mockCrowdFlow";

describe("mock crowd-flow feed", () => {
  it("returns deterministic telemetry for every venue node", () => {
    const samples = getMockCrowdFlow(DEMO_VENUE_NODES, "baseline", 123);
    expect(samples).toHaveLength(DEMO_VENUE_NODES.length);
    expect(samples[0]?.capturedAt).toBe(123);
    expect(samples.every((sample) => sample.peoplePerMinute > 0)).toBe(true);
  });

  it("raises flow during a crowd surge and lowers it during evacuation", () => {
    const baseline = getMockCrowdFlow(DEMO_VENUE_NODES, "baseline");
    const surge = getMockCrowdFlow(DEMO_VENUE_NODES, "surge");
    const evacuation = getMockCrowdFlow(DEMO_VENUE_NODES, "evacuation");
    expect(surge[1]!.index).toBeGreaterThan(baseline[1]!.index);
    expect(evacuation[1]!.index).toBeLessThan(surge[1]!.index);
  });

  it("feeds scenario values into venue nodes", () => {
    const nodes = applyMockCrowdFlow(DEMO_VENUE_NODES, "surge");
    expect(nodes[1]!.crowdFlow).toBeGreaterThan(DEMO_VENUE_NODES[1]!.crowdFlow);
  });

  it("changes telemetry when the replay slider advances", () => {
    const start = getMockCrowdFlow(DEMO_VENUE_NODES, "baseline", 1000, 0);
    const later = getMockCrowdFlow(DEMO_VENUE_NODES, "baseline", 1000, 6);
    expect(later[0]!.capturedAt).toBe(start[0]!.capturedAt + 360000);
    expect(later.some((sample, index) => sample.index !== start[index]!.index)).toBe(true);
  });
});
