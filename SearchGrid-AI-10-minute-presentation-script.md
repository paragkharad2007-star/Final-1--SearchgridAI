# SearchGrid AI — 10-Minute Hackathon Presentation Script

**Team:** Parag · Smit · Smarnika · Manav  
**Format:** Simple, short, demo-friendly  
**Target duration:** 9–10 minutes

---

## Presentation flow

| Time | Speaker | Section |
|---|---|---|
| 0:00–2:15 | Parag | Problem and vision |
| 2:15–4:30 | Smit | Solution and how it works |
| 4:30–7:15 | Smarnika | Live product demo |
| 7:15–9:15 | Manav | Impact, innovation, and scalability |
| 9:15–10:00 | All | Closing and winning statement |

---

# 1. Parag — Opening, problem, and vision

**[Walk to the front. Smile. Keep the opening energetic.]**

> Good morning everyone. We are **Parag, Smit, Smarnika, and Manav**, and our project is **SearchGrid AI**.
>
> Imagine a child, an elderly person, or a vulnerable individual goes missing in a crowded public place. The first few minutes are critical. But in many real situations, information is scattered across phone calls, messages, volunteers, and security teams.
>
> Coordinators do not immediately know three things: **where to search, who should search, and what new information can be trusted**.
>
> That delay can cost valuable time.
>
> SearchGrid AI turns a chaotic search into a coordinated, data-driven operation. It connects the coordinator, volunteers, live sightings, search zones, and status updates in one system.
>
> Our goal is simple:
>
> > **Help the right volunteer reach the right zone with the right information at the right time.**
>
> SearchGrid AI is designed for festivals, campuses, transport hubs, malls, emergency events, and any crowded venue where fast coordination matters.
>
> I’ll now hand over to Smit to explain how our solution works.

**[Transition: step aside and gesture toward Smit.]**

---

# 2. Smit — Solution and core workflow

> Thank you, Parag.
>
> SearchGrid AI has two connected experiences.
>
> First, the **Coordinator Command Center**. The coordinator can create an incident, select the active search, view the venue grid, monitor volunteers, and see incoming sightings in real time.
>
> Second, the **Volunteer PWA**. Volunteers can sign in, view their assignment, navigate to a zone, mark a zone as searched, and report a sighting from their phone.
>
> The workflow is straightforward:
>
> 1. The coordinator creates an incident.
> 2. The system divides the venue into search zones.
> 3. SearchGrid AI calculates priority using factors such as last-seen location, time, crowd flow, pathways, and new sightings.
> 4. Volunteers receive assignments on their phones.
> 5. A volunteer submits a sighting with location, confidence, and urgency.
> 6. The coordinator receives an alert, sees the sighting on the timeline and map, and reviews it as **Under review, Verified, or Rejected**.
> 7. The volunteer receives the updated status.
>
> This creates a complete feedback loop instead of a one-way alert.
>
> We also built role-based access. Volunteers cannot use coordinator controls, while coordinators can manage incidents and review reports. Sign-in, sign-out, volunteer profiles, availability, zone assignment, and approval are included in the workflow.
>
> Smarnika will now show this flow in the product.

---

# 3. Smarnika — Live product demo

**[Open the deployed SearchGrid AI website before presenting.]**

> I’ll demonstrate the main journey in a few steps.
>
> **Step one: Create an incident.**
>
> In the Command Center, the coordinator creates an incident with a code, title, venue, and last-seen zone. The new incident becomes available to the connected volunteer experience.
>
> **Step two: Assign and monitor.**
>
> The Command Center shows the active incident, search priority, active volunteers, covered zones, and the venue heatmap. The highest-priority zone is clearly visible, so the coordinator can act immediately instead of scanning multiple tools.
>
> **Step three: Volunteer view.**
>
> On the Volunteer PWA, the volunteer sees the active search, assigned zone, route, and search action. The interface is mobile-first and can be opened in a separate browser or incognito window for a different volunteer account.
>
> **Step four: Report a sighting.**
>
> The volunteer taps **Report a sighting**. They choose the report type, set confidence, and send the report with the current location. A safety issue can be flagged as urgent.
>
> **Step five: Coordinator review.**
>
> The coordinator receives the update in the live timeline. The sighting appears as a map marker, the affected zone priority increases, and the coordinator can choose **Review**, **Verify**, or **Reject**.
>
> **Step six: Volunteer receives the result.**
>
> The volunteer sees the latest sighting status in the PWA. This is important because the system does not stop at collecting information—it closes the loop with the person in the field.
>
> In one flow, we have connected incident creation, field reporting, live coordination, map visibility, review, and feedback.
>
> I’ll hand over to Manav to explain why this matters and how we can scale it.

**[Demo tip: If live login is slow, use the prepared preview and narrate the intended flow. Do not spend presentation time troubleshooting.]**

---

# 4. Manav — Impact, innovation, and scalability

> Thank you, Smarnika.
>
> The value of SearchGrid AI is not only that it looks like a dashboard. The value is that it improves the decisions made during a high-pressure search.
>
> **Our impact is practical:**
>
> - Faster response to new information.
> - Less confusion between coordinators and volunteers.
> - Better prioritization of limited search teams.
> - A clear record of every sighting and review decision.
> - A mobile experience that works for volunteers in the field.
>
> **Our key innovation is the closed-loop design.** Many systems collect reports. SearchGrid AI also prioritizes zones, assigns people, shows reports on a map, supports coordinator review, and sends the result back to the volunteer.
>
> The platform is also designed to grow. In the next version, we can add:
>
> - Photo and video evidence with secure storage.
> - Stronger geofencing and live GPS tracking.
> - SMS or WhatsApp alerts for urgent incidents.
> - Analytics for response time and zone coverage.
> - Integration with CCTV, campus security, and emergency services.
>
> We built this as a realistic foundation rather than a static prototype. The system includes authentication, database persistence, role permissions, real-time events, incident history, and a production-ready web deployment.
>
> Most importantly, the design keeps people in control. AI suggests search priorities, but the coordinator makes the final operational decision.
>
> That makes SearchGrid AI useful, explainable, and safer for real-world adoption.

---

# 5. All members — Closing

## Parag

> A missing-person response should not depend on scattered messages and guesswork.

## Smit

> SearchGrid AI gives coordinators one clear operational picture.

## Smarnika

> It gives volunteers simple, actionable instructions in the field.

## Manav

> And it turns every sighting into a verified, trackable decision.

## All together

> **SearchGrid AI: Search smarter. Coordinate faster. Bring people home.**
>
> Thank you. We are happy to take your questions.

---

# Likely judge questions and short answers

### 1. Is this only a visual prototype?

> No. The project includes authentication, database-backed incidents and sightings, role-based permissions, real-time updates, review statuses, volunteer profiles, and a production deployment.

### 2. How does AI decide the priority zone?

> It combines last-seen information with time, distance, crowd flow, venue pathways, zone features, searched-area penalties, and new sighting confidence. The result is a priority recommendation for the coordinator.

### 3. What happens if a volunteer reports something false?

> The report includes confidence and source information. The coordinator reviews it as Under review, Verified, or Rejected. AI assists the process; it does not make the final decision.

### 4. What makes it different from a normal alert app?

> SearchGrid AI is a closed loop: it creates the incident, prioritizes zones, assigns volunteers, receives sightings, places them on the map, supports review, and sends the outcome back to the field.

### 5. What is the next feature you would build?

> Secure photo evidence upload with metadata and an evidence trail, because visual confirmation can help coordinators verify sightings faster.

---

# Delivery tips

- Speak slowly; do not read every word on the screen.
- Keep the demo focused on one incident and one sighting.
- Make the map, timeline, and review buttons visible during the demo.
- If something fails, continue narrating the intended flow instead of troubleshooting live.
- End with the slogan together—the synchronized closing is memorable.
