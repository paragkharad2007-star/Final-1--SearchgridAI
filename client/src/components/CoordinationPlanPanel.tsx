import { useState } from "react";
import { Activity, BrainCircuit, CheckCircle2, CloudOff, MapPinned, RefreshCw, Route, Users } from "lucide-react";
import { trpc } from "@/lib/trpc";
import type { CrowdFlowScenario } from "@shared/mockCrowdFlow";

export default function CoordinationPlanPanel() {
  const [open, setOpen] = useState(false);
  const [scenario, setScenario] = useState<CrowdFlowScenario>("baseline");
  const [timelineMinute, setTimelineMinute] = useState(0);
  const planQuery = trpc.incident.coordinationPlan.useQuery({ scenario, timelineMinute }, { enabled: open, retry: false });
  const plan = planQuery.data;
  return (
    <section className="coordination-panel panel-card">
      <div className="panel-header">
        <div><div className="panel-kicker"><BrainCircuit size={13} /> PREDICTIVE SEARCH PLANNER</div><h2>Drift zones & non-overlapping dispatch</h2></div>
        <button className="secondary-button small" onClick={() => setOpen((value) => !value)}>{open ? "Hide plan" : "Generate plan"}</button>
      </div>
      <div className="planner-summary">
        <span><MapPinned size={14} /> Venue layout aware</span><span><Activity size={14} /> Crowd-flow weighted</span><span><Users size={14} /> Conflict-free assignments</span><span><CloudOff size={14} /> Offline replay ready</span>
      </div>
      {open && <div className="planner-body"><div className="scenario-controls"><span className="planner-label">MOCK CROWD-FLOW SCENARIO</span><div className="scenario-buttons">{(["baseline", "surge", "evacuation"] as CrowdFlowScenario[]).map((item) => <button key={item} className={scenario === item ? "scenario-active" : ""} onClick={() => setScenario(item)}>{item === "baseline" ? "Baseline" : item === "surge" ? "Crowd surge" : "Evacuation"}</button>)}</div></div><div className="timeline-replay"><div className="timeline-head"><span><RefreshCw size={13} /> CROWD MOVEMENT REPLAY</span><strong>Minute +{timelineMinute}</strong></div><input aria-label="Replay crowd movement minute" type="range" min="0" max="10" step="1" value={timelineMinute} onChange={(event) => setTimelineMinute(Number(event.target.value))} /><div className="timeline-labels"><span>Last seen</span><span>+5 min</span><span>+10 min</span></div></div>{planQuery.isLoading ? <div className="planner-loading"><RefreshCw size={15} className="spin" /> Calculating drift corridor...</div> : plan ? <><div className="planner-explain"><Route size={15} /><span>Replay minute +{timelineMinute} projects the movement corridor forward and refreshes flow, drift probability, and assignments.</span></div><div className="flow-strip">{plan.crowdFlow.slice(0, 8).map((sample) => <div className="flow-cell" key={sample.nodeId}><div className="flow-bar"><span style={{ height: `${Math.max(10, sample.index)}%` }} /></div><strong>{sample.nodeId}</strong><small>{sample.index}% · {sample.peoplePerMinute}/min</small></div>)}</div><div className="flow-legend"><span className="planner-label">FLOW INTENSITY</span><span><i className="legend-swatch low" /> Low &lt;40%</span><span><i className="legend-swatch medium" /> Medium 40–69%</span><span><i className="legend-swatch high" /> High 70%+</span></div><div className="planner-grid"><div><div className="planner-label">TOP DRIFT ZONES</div>{plan.driftZones.slice(0, 4).map((zone) => <div className="drift-row" key={zone.id}><strong>Zone {zone.id}</strong><span>{zone.probability}%</span><small>{zone.reasons[1]} · {zone.source}</small></div>)}</div><div><div className="planner-label">DISPATCH PLAN</div>{plan.assignments.slice(0, 4).map((assignment) => <div className="drift-row" key={assignment.volunteerId}><strong>{assignment.volunteerId} → Zone {assignment.zoneId}</strong><span>{assignment.distanceMeters}m</span><small>{assignment.reason}</small></div>)}</div></div><div className="planner-foot"><CheckCircle2 size={14} /> {plan.assignments.length} volunteers assigned to {new Set(plan.assignments.map((item) => item.zoneId)).size} unique zones · {scenario} mock feed · model {plan.modelVersion}</div></> : <div className="planner-loading">Planning service unavailable. Existing local priorities remain active.</div>}</div>}
    </section>
  );
}
