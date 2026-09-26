import { describe, expect, it } from "vitest";
import { assignNonOverlappingZones, DEMO_VENUE_NODES, estimateDriftZones, hasOverlappingAssignments } from "../shared/coordination";

describe("CX1008 coordination model", () => {
  it("projects a last-seen signal into explainable drift zones", () => {
    const zones = estimateDriftZones({ lat: 13.084, lng: 80.2711, recordedAt: Date.now() - 240000, headingDegrees: 38, speedMps: 1.15, confidence: 82 });
    expect(zones.length).toBeGreaterThan(0);
    expect(zones[0]?.reasons.length).toBeGreaterThanOrEqual(3);
    expect(zones[0]?.radiusMeters).toBeGreaterThan(0);
  });

  it("uses venue flow and excludes blocked layout nodes", () => {
    const zones = estimateDriftZones({ lat: 13.084, lng: 80.2711, recordedAt: Date.now(), headingDegrees: 0, speedMps: 0, confidence: 70 }, DEMO_VENUE_NODES);
    expect(zones.every((zone) => zone.id !== "J")).toBe(true);
    expect(zones.some((zone) => zone.source === "flow" || zone.source === "pathway")).toBe(true);
  });

  it("assigns unique zones to available volunteers", () => {
    const zones = estimateDriftZones({ lat: 13.084, lng: 80.2711, recordedAt: Date.now(), headingDegrees: 45, speedMps: 1, confidence: 80 });
    const assignments = assignNonOverlappingZones([{ id: "V1", lat: 13.084, lng: 80.2711 }, { id: "V2", lat: 13.0845, lng: 80.2721 }, { id: "V3", lat: 13.0831, lng: 80.2702 }], zones);
    expect(assignments).toHaveLength(3);
    expect(hasOverlappingAssignments(assignments)).toBe(false);
  });
});
