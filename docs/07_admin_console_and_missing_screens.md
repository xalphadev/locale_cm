# Admin/Moderator Console + Remaining Screens (UX/UI ภาค 2)

> **เวอร์ชัน:** v1 (ผ่าน subsystem-logic + flow-completeness review) · **วันที่:** 2026-06-14
> ภาคต่อของ [doc 06](06_ux_ui_design.md) — back-office (Next.js+Refine) สำหรับ role S1–S6 + หน้าจอที่ critique เดิมชี้ว่าขาด. ใช้ design system เดียวกับ doc 06 §1, ตรรกะจาก doc 03 (S1–S6) + ledger doc 02/02b, RBAC SYSTEM_PLAN §4

**สารบัญ:** §7 Console Shell + Moderation Queue · §8 Merchant Verify + Support/Dispute · §9 Finance/Payout + Observability/Recon · §10 Missing Consumer/Merchant Screens · §11 DPO/PDPA + City Manager + Analyst

---

## 7. Admin Console Shell & Moderation Queue

> **เวอร์ชัน:** v2 (UX/UI blueprint — back-office · critique-folded) · **วันที่:** 2026-06-14
> ขอบเขต section นี้: (a) **Console Shell** (left-nav role-gated + top-bar scope/PII/step-up + role-aware home — รวม Owner/P.Admin/Brand home) · (b) **Change-Proposal Review Queue** (จอ moat: diff + evidence + EXIF/GPS-80m/pHash verdict chips + photo-vs-pin map + approve/reject/request-more ภายใต้ author≠moderator SoD) · (c) **Review/UGC Moderation Queue** (reported reviews · removal/reweight/shadow-ban · defamation/PDPA takedown · merchant right-to-respond) · (d) **Media Pending** queue · (e) **Agent-dispute (appeal)** review queue · (f) **Settings · Roles** (console RBAC + SoD-at-grant) · (g) empty / SLA-breach / bulk / loading / error states.
>
> **Platform:** web · Next.js + Refine (CRUD/table/filter/auth/accessControl scaffolding) · ใช้ **token ชุดเดียวกับ doc 06 §1** ผ่าน CSS variables — แต่ **admin = denser + utilitarian + data-table-heavy** (ไม่ใช่ paper-warm hero ของ consumer). amber `--brand-primary #E8852C` ใช้เฉพาะ **active-nav + primary CTA** เท่านั้น (§1.2 กฎเหล็ก #2 ยังบังคับ); jade `--brand-secondary #1E8E7E` = link/secondary/`--focus-ring`; verdict/severity/SLA ใช้ **semantic token ของ doc 06 §1.2 ตามชื่อตัวแปร** (`--success`/`--warning`/`--danger`/`--info`/`--hold`) ไม่ re-pin hex ในนี้ และ **ไม่แตะ brand-amber/Coin-gold**.
>
> **Color-token discipline (locked — fold critique L-minor "state-color token drift"):** admin surface **อ้าง doc 06 §1.2 semantic table ด้วยชื่อตัวแปร เท่านั้น** ไม่ re-pin hex ในนี้ เพื่อกัน drift จาก consumer canonical. mapping ที่ใช้ทั้ง section: PASS/approve/healthy = `--success` · caution/SLA-warm/needs-fix = `--warning` (ochre `#C77A0F`, แยกจาก brand amber) · FAIL/breach/danger/reject = `--danger` · info/link/hint = `--info`/jade · neutral-hold/draft/slate = `--hold`. **เลขเงิน (฿) = `--ink-900` เสมอ** (§1.7). semantic ทั้งหมดจับคู่ **icon + label + ค่าจริง** ไม่พึ่งสีเดียว (§1.7 a11y).
>
> **หลักการกำกับทั้ง section (locked, สอดคล้อง doc 03 + doc 04 + SYSTEM_PLAN §4):**
> 1. **Author ≠ Moderator (hard SoD).** `change_proposals.proposal_sod CHECK(reviewed_by <> proposed_by)` + defense-in-depth ใน `apply_proposal` edge-fn (doc 04 §3.3/C4). UI **ต้องซ่อน/disable** ปุ่ม approve เมื่อ `viewer == proposed_by` และแสดงเหตุผลชัด — ไม่ปล่อยให้กดแล้ว error ทีหลัง.
> 2. **Content-lane approval = Content Moderator owns (creator≠approver ทั้งสาย content).** Change Proposal approve **สงวนให้ Content Moderator (+ Owner/Admin platform-superuser)** — **City Manager ไม่ approve change_proposal เอง** เพราะ CityMgr provision agent + วาง task + seed place เอง → ถ้า approve ของในสายตัวเอง = creator≈approver ในสาย content (SYSTEM_PLAN §4.3 role 6 owns; doc 03 S5 SoD). CityMgr เห็น proposal queue **read/escalate-only** (drill + ดัน escalate ไป Moderator) — ดู §7.1 matrix + residual-risk note.
> 3. **Moderator ไม่เคยเขียน live ตรง.** approve → เรียก `apply_proposal` (service_role) = writer ตัวเดียวของ live `places` + `places.version++` + `places_history` snapshot + `data_freshness` + `tasks.status='approved'`. ไม่มี client write path เข้า `places` live (RLS doc 04 §3.3).
> 4. **2 lane คนละ table แม้ console เดียว (doc 03 S5.2.2):** Tab A `change_proposals` (place forward-edit) · Tab B/C `content_reports`+`moderation_actions` (UGC takedown/reweight — reversible via `prev_state`) — **ห้าม cross** เพื่อรักษา legal posture.
> 5. **PII masked-by-default ทุกที่ (doc 06 §1.4 ABAC `PII_MASK`; tiering = doc §8.4).** unmask = active context + reason + `S*` step-up + audit; DPO เฝ้าได้. **sensitive-tier (KYC / payment-instrument incl. bank-account / location-trajectory) = DPO-approve เท่านั้น** — CS/Finance/Moderator unmask เองไม่ได้แม้มี ticket (route ไป DPO pending-unmask queue §11.1; ดู residual-risk).
> 6. **ทุก high-impact action เขียน `audit_log` อัตโนมัติ** (Refine afterMutation hook → service-role audit emit) + **step-up (aal2)** ตาม SYSTEM_PLAN §4.7 `S*` set: approve/release payout, approve seed-new-place/activate, manual-freeze (ทุก scope) + release/override (dual-Owner), PII-unmask, erasure-execute, role-grant. money-out + freeze-governance = **high severity** ใน audit taxonomy (fold critique L-minor "payout.approve severity").

---

### 7.1 (a) Console Shell — left-nav role-gated · top-bar scope/PII/step-up · role-aware home

> **เป้าหมาย operator:** เปิดมาแล้ว **เห็นเฉพาะสิ่งที่ตัวเองมีสิทธิ์** ทันที (ไม่มี dead menu), รู้ scope (เมือง/territory) ที่กำลังทำงานอยู่, รู้ว่า PII กำลัง masked, และรู้ว่า step-up (aal2) ยัง valid อีกกี่นาที. Single web app, role-gated — sections **ปรากฏ/หาย** ตาม `roles[]` + `scope_*` claims (doc 06 §S3.2 JWT), ไม่ใช่แค่ disable.

```
┌─ TOP BAR (sticky, h=56) ──────────────────────────────────────────────────────────────────┐
│ [Soi Hop·Admin]  🏙 เมือง: Chiang Mai ▾   📍 Territory: Nimman ▾  │ 🔍 ค้นหา proposal/ticket/place… │
│                  (scope switcher — กรอง RLS ทุก query)            │                                │
│  ──────────────────────────────────────────────────────────────  │  🛡 PII: MASKED  ⏱ aal2 8:12  👤 │
│  TH/EN/简体 ▾                                                     │  (🔓 ถ้า unmask)  (step-up นับถอย)  rin@..▾ │
└────────────────────────────────────────────────────────────────────────────────────────────┘
┌─ LEFT NAV (role-gated · w=224 · sections ปรากฏตาม role) ─┬─ CONTENT AREA ─────────────────────────┐
│  ⌂ Home (role-aware)                          [ALL]      │                                          │
│  ── MODERATION ────────────                              │   <role-aware home — ดู variants ล่าง>   │
│  ⚖ Change Proposals      ●12   [Moderator·Admin·Owner]   │                                          │
│       └ (CityMgr เห็น read/escalate เท่านั้น)            │   การ์ดงานเรียงตาม SLA-age + scope        │
│  🚩 UGC Reports          ●5    [Moderator·Admin]         │                                          │
│  🖼 Media Pending        ●3    [Moderator]               │   เมนูที่ role ไม่มีสิทธิ์ = **ไม่ render**   │
│  ⚖ Agent Disputes        ●2    [Moderator·Admin]         │   (ไม่ใช่ 🔒 disable) → ลด attack surface │
│  ── MERCHANTS ─────────────                              │   + ไม่ teach ว่ามี action อะไรอยู่         │
│  🏪 Verify · Gate 1 ID   ●4    [Support·CityMgr·Admin]   │                                          │
│  🏦 Verify · Gate 2 Fin  ●2    [Finance·Admin]           │   ─────────────────────────────────────  │
│  🗺 Onboarding Pipeline        [CityMgr·Admin]           │   Banner scope อยู่บนสุดเสมอ:             │
│  ── FINANCE ───────────────                             │   "กำลังดู: Chiang Mai › Nimman ·         │
│  💸 Payout Batches             [Finance·Owner]           │    {role} · ข้อมูล PII ปกปิด"             │
│  ⚖ Solvency / Recon            [Finance·Owner·Analyst○]  │                                          │
│  ── TRUST & SAFETY ────────                             │                                          │
│  🎫 Support Tickets      ●21   [Support·CityMgr○·Admin]  │                                          │
│  🕵 Fraud Cases          ●7    [Support·Finance·Owner]   │                                          │
│  🧊 Freeze Control             [Owner●·Admin○]           │                                          │
│  ── COMPLIANCE ────────────                             │                                          │
│  🔐 DSAR / Erasure             [DPO]                     │                                          │
│  📜 Audit Log                  [DPO·Owner]               │                                          │
│  ── INSIGHTS ──────────────                            │                                          │
│  📈 Analytics / API            [Analyst·Owner·Brand]     │                                          │
│  🎁 Sponsor Campaigns          [Brand·Admin]             │                                          │
│  ─────────────────────────                              │                                          │
│  ⚙ Settings · Roles            [Owner·Admin]            │                                          │
└──────────────────────────────────────────────────────────┴──────────────────────────────────────────┘
```

**Role → section visibility matrix (canonical back-office subset = 9 console roles · sync SYSTEM_PLAN §4.3/§4.4 + doc 06 §S3.2 `roles[]`):**

| section ↓ \ role → | Owner | P.Admin | Moderator | CityMgr | Brand | Support | Finance | Analyst | DPO |
|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| Change Proposals (Tab A) — **approve** | ● | ● | ● | **○ read/escalate** | – | – | – | – | – |
| UGC Reports (Tab B/C) | ● | ● | ● | ○ack-legal | – | ○handoff | – | – | – |
| Media Pending | ● | ● | ● | – | – | – | – | – | – |
| Agent Disputes (appeal) | ● | ● | ●(≠rejecting-mod) | – | – | – | – | – | – |
| Verify Gate 1 (ID) | ● | ● | – | ●(scope) | – | ● | – | – | – |
| Verify Gate 2 (Finance) | ● | ● | – | – | – | – | ● | – | – |
| Onboarding Pipeline / Density | ● | ● | – | ●(scope) | – | – | – | ○read | – |
| Payout Batches | ● | – | – | – | – | – | ● | – | – |
| Solvency / Recon | ● | ○ | – | – | – | – | ● | ○read | – |
| Support Tickets | ● | ● | – | ○(scope·read/handoff) | – | ● | – | – | – |
| Fraud Cases | ● | ● | – | ○ | – | ● | ● | – | – |
| Freeze Control | ●(+release) | **○ view+manual-freeze** | – | – | – | – | – | – | – |
| DSAR / Erasure · Audit Log | ● | ○ | – | – | – | – | – | – | ● |
| Analytics / API · Sponsor | ● | ● | – | ●(scope) | ●(own·k≥5) | – | – | ● | – |
| Settings · Roles | ● | ● | – | – | – | – | – | – | – |

> `●`=full · `○`=limited (ack/read/handoff/view) · `–`=section ไม่ render. **scope** = RLS กรองด้วย `scope_city`/`scope_territory`; CityMgr เห็นเฉพาะเมือง/territory ตัวเอง.
>
> **★ FIX (critique L-critical — SoD Change-Proposal ownership):** v1 ให้ CityMgr `●(scope)` approve Change Proposals → ขัด SYSTEM_PLAN §4.3 (Content Moderator owns) + ทำลาย creator≠approver ในสาย content (CityMgr provision agent/seed place เองแล้ว approve ของตัวเอง). v2 = **CityMgr `○ read/escalate-only`**: เห็น queue (RLS select doc 04 §3.3) เพื่อ drill/ดัน escalate ไป Moderator แต่ **ไม่มีปุ่ม approve/reject** ในมือ. approve สงวนให้ Moderator/Admin/Owner. *(residual-risk: SYSTEM_PLAN §4.4 `moderate_change`=S ของ CityMgr และ doc 04 edge-fn `ASSERT reviewer ∈ {Content Moderator, City Manager}` ต้องถูก reconcile ให้ **ตัด City Manager ออกจาก approve-set** — accessControlProvider + apply_proposal authorization ต้อง deny CityMgr ที่ capability `moderate_change`. ดู residual-risk #1.)*
>
> **★ FIX (critique L-major — Freeze override role mismatch):** v1 ให้ Freeze Control `[Owner·Admin]` ทั้งคู่ `●`. v2 **split capability:** Owner `●` (view + manual-freeze + **release/override ภายใต้ dual-Owner** — สอง Owner คนละคน, DB CHECK A≠B, step-up ทั้งคู่, doc 03 S6.1.7) · P.Admin `○` (**view + manual-freeze เท่านั้น**, ไม่มีปุ่ม release/override — P.Admin คนเดียวไม่มีทางครบ "two distinct Owners" → ปุ่ม release ต้อง hide ไม่ใช่ disabled dead-end). *(การ gate ปุ่ม Release/Override ที่ตัวจอ = งาน §9.d — ดู forward-handoff.)*
>
> **SoD ระดับ nav (City Manager):** ถ้า role = CityMgr และ payee = agent ที่ตัวเอง provisioned → **Payout Batches ไม่โผล่** สำหรับ agent นั้น (creator≠approver, SYSTEM_PLAN §4.7 / doc 03 SEAM-3) — ดู §8 (Finance section).
>
> **Brand/Sponsor reachability (fold critique C-critical):** Brand เห็น 2 section (Sponsor Campaigns + Analytics own-scope) → ทั้งคู่ต้องมีจอจริง (Sponsor Campaigns console + Brand home §7.1 variant 4) ใต้ RLS `scope_own` (funder/campaign ตัวเองเท่านั้น, analytics k≥5 reuse §11.3a). ไม่มี orphan CTA.

**TOP-BAR components + behaviour:**

```
🏙 เมือง ▾  →  scope switcher: เปลี่ยน city → reload ทุก query ด้วย scope_city ใหม่ (RLS) + reset count badges
📍 Territory ▾ → ปรากฏเฉพาะ role ที่ scope ระดับ territory (CityMgr/Moderator-by-territory)
🔍 ค้นหา     →  global search: proposal#/ticket#/place/merchant — ผลปกปิด PII (ชื่อย่อ/masked phone)
🛡 PII: MASKED →  indicator สถานะปัจจุบัน. คลิก → panel อธิบาย tiering: standard-field = unmask ต่อ record +
                  reason + step-up ; **sensitive-tier (KYC/bank/trajectory) = ต้องขอ DPO approve** (ปุ่ม
                  "[ ขอ DPO → ]" เปิด DPO pending-unmask request §11.1 — ไม่ self-step-up).
                  เมื่อ unmask active ที่ record ใด → 🔓 PII: UNMASKED (record#) · ochre warning + countdown
⏱ aal2 8:12  →  step-up status: aal1 = "🔒 ยืนยันตัวตน" (slate) ; aal2 = countdown สด (success→warning <2:00)
                  high-impact action ใด ๆ ถ้า aal2 หมดอายุ → modal step-up ก่อนทำต่อ (ไม่ทิ้ง dead-end, ไม่ logout)
```

**Role-aware Home — 6 variants (home เปลี่ยนตาม primary role · fold critique C-critical Brand + L/C-major Owner/P.Admin):**

```
[HOME — CONTENT MODERATOR]              [HOME — CITY MANAGER · Nimman]        [HOME — FINANCE]
┌──────────────────────────────┐       ┌──────────────────────────────┐     ┌──────────────────────────┐
│ คิวของฉันวันนี้                │       │ Nimman Density Gate           │     │ Solvency snapshot         │
│ ⚖ Change Proposals   12        │       │ ████████░░ 78% coverage       │     │ coin_backing ≥ liability ✓ │
│   └ ⚠ 2 เกิน SLA (>X ชม.)     │       │ (baseline 100 · escrow-on 41) │     │ escrow exposure ฿1.2M     │
│ 🚩 UGC Reports        5         │       │ ── pipeline ──                │     │ ── รออนุมัติ ──            │
│   └ 🔴 1 LEGAL (24h)          │       │ 🏪 รอ verify Gate1: 4         │     │ 💸 payout batch #88        │
│ 🖼 Media Pending      3         │       │ ⚖ proposals (read): 12        │     │   maker=somchai · รอ approve │
│ ⚖ Agent Disputes      2         │       │   └ [ escalate → Mod ]        │     │   ⚠ SoD: คุณ≠maker ✓        │
│ ── ของฉันที่ตัดสินวันนี้ ──    │       │ 🗺 agent roster: 12 active    │     │ ⚖ recon breaks: 1 (>2วัน)  │
│ approve 18 · reject 3          │       │ 🕵 fraud (territory): 2        │     │ 🧊 freeze: NORMAL          │
│ avg review 2m10s               │       │ ── ของฉัน ──                  │     │ [ ทบทวน batch #88 → ]     │
│ [ ไปคิว Change Proposals → ]   │       │ ⚠ คุณ provision agent #A12 →  │     └──────────────────────────┘
└──────────────────────────────┘       │   ไม่อนุมัติ payout เขา (SoD) │
                                        └──────────────────────────────┘

[HOME — PLATFORM OWNER (super-role)]         [HOME — PLATFORM ADMIN]              [HOME — BRAND/SPONSOR]
┌──────────────────────────────────┐         ┌──────────────────────────────┐    ┌──────────────────────────┐
│ 🚨 Platform Health                │         │ งานที่ฉันทำได้วันนี้           │    │ แคมเปญของฉัน (own-scope)   │
│ 🧊 freeze: NORMAL (0 active)      │         │ ⚖ Change Proposals   12       │    │ 🎁 "Yi Peng Hop" · LIVE   │
│ 💰 solvency buffer: +฿340k ✓     │         │ 🚩 UGC Reports        5       │    │   budget ฿80k · ใช้ ฿52k   │
│ 🔴 Tier-1 alerts: 0               │         │ 🖼 Media · ⚖ Disputes  3·2     │    │   escrow status: FUNDED ✓ │
│ ── รอ dual-Owner ของฉัน ──        │         │ 🏪 Gate1 ID           4       │    │ 🎯 quest sponsorship: 6   │
│ 🧊 freeze release #FR-12          │         │ 🗺 Onboarding (scope)         │    │   redeemed 214 / cap 400  │
│   เสนอโดย owner-A · รอคุณ co-sign │         │ ⚙ Settings·Roles → grant      │    │ ── analytics (k≥5) ──     │
│   [ ทบทวน + co-sign → ] 🔒🔒      │         │ ── ที่ฉันทำไม่ได้ (เทา) ──     │    │ footfall ▲ · ROI 1.8x     │
│ 💸 payout #88 (>threshold)        │         │ 💸 payout approve (Owner only)│    │ [ ดู campaign detail → ]  │
│   maker=fin·approver=คุณ ✓        │         │ 🧊 freeze release (Owner only)│    │ (ไม่เห็น raw PII / movement)│
│ [ payout · solvency · audit ]     │         └──────────────────────────────┘    └──────────────────────────┘
└──────────────────────────────────┘
```

> **Owner home (fold critique L-major + C-major):** super-role landing = platform-health (freeze state + solvency buffer + Tier-1 alert count, doc 03 S6.7) **+ "รอ dual-Owner ของฉัน" inbox** = จุดที่ owner-B ค้นพบ/co-sign freeze-release / solvency-override ที่ owner-A เสนอ (out-of-band approval entry point — ดู forward-handoff §9.d owner-B inbox) **+ payout >threshold ที่รอ Owner approve**. **P.Admin home** = cross-section work counts ที่ทำได้จริง + เทา action ที่สงวนให้ Owner (payout-release/freeze-release) เพื่อ orient ว่า "ไม่มีประตู" ไม่ใช่ dead-end. **Brand home** = own-scope campaign list + budget/escrow + quest sponsorship + analytics k≥5 (ไม่มี raw PII/movement, SYSTEM_PLAN §4.3 role 8).

- **components:** TopBar (scope/search/PII-tier-indicator/step-up/locale/profile), LeftNav (collapsible groups + live count badges จาก realtime subscription), ScopeBanner (sticky), RoleHome (Refine `<Dashboard>` ต่อ role · 6 variants), DualOwnerInbox (Owner only).
- **operator goal:** orient ใน <5 วินาที — scope ปัจจุบัน + งานค้างของ role + SLA pressure + สถานะความปลอดภัย (PII/step-up); Owner เห็น platform-health + pending co-sign.
- **action/state effect:** scope switch = re-query (ไม่เขียน). ไม่มี ledger txn ที่ shell layer.
- **SoD/step-up/PII/audit:** PII tier-indicator + step-up countdown persistent บน top-bar; nav visibility = role-gated (ไม่ render = ไม่มีประตู); CityMgr home แสดง **SoD reminder** เมื่อ provision agent (กัน self-approve payout) + proposals read-only; Owner home มี dual-Owner co-sign inbox.
- **empty/loading/error:** count badge loading = skeleton dot; scope ไม่มีข้อมูล = "ยังไม่มีงานใน scope นี้"; query error = banner retry + "ติดต่อ Platform Admin ถ้าเห็นซ้ำ"; **session aal1 หมดอายุกลางทาง** = modal re-auth (ไม่ logout ทิ้งงาน).

---

### 7.2 (b) Change-Proposal Review Queue — ⭐ THE DATA-MOAT HUMAN GATE

> **ทำไมจอนี้สำคัญสุดของ back-office:** นี่คือ **ประตูมนุษย์เดียว** ที่ป้องกันไม่ให้ข้อมูลปลอม/ซ้ำ/spoof เข้าสู่ moat data. Agent/Merchant **ไม่เคยเขียน live** — ทุก edit = `change_proposals(status='pending')`. Content Moderator เทียบ diff + evidence + verdict chips + photo-vs-pin → approve เรียก `apply_proposal` (live write ตัวเดียว) → version bump + `places_history`. **ถ้าจอนี้เลอะ → moat พัง / Density Gate ไปไม่ถึง / consumer freshness โกหก.** (doc 04 §1.7 #2, C4) · **approve owner = Content Moderator (+Owner/Admin) เท่านั้น — CityMgr read/escalate** (§7.1 #2).

#### 7.2.1 List view — เรียงตาม SLA-age (oldest-first), scope-filtered

```
┌─ Change Proposals · Chiang Mai › Nimman ───────────────────────────────────────── ⚖ Tab A ─┐
│ [ทั้งหมด 12] [pending 9] [needs-fix 2] [approved] [rejected]   ⚙ออโต้: low-risk auto-approve ✓ │
│ เรียง: ▾ SLA-age (เก่าสุดก่อน)   กรอง: [target▾][proposer-role▾][risk▾]   ☐ เลือกทั้งหมด        │
├──┬───────────────┬──────────────────┬──────────┬─────────────┬──────────┬────────┬────────────┤
│☐ │ SLA           │ proposal          │ target    │ proposer    │ verdicts  │ risk   │ action     │
├──┼───────────────┼──────────────────┼──────────┼─────────────┼──────────┼────────┼────────────┤
│☐ │ 🔴 -2:14 BREACH│ #CP-7741 แก้เวลา  │ Ristr8to │ 🧑agent A12  │📍✓📷✓🕓✓#️⃣✓│ low   │ [ ตรวจ → ] │
│☐ │ 🟠 1:48 left   │ #CP-7755 ราคา    │ Graph Café│ 🏪merchant   │📍✓📷✓🕓✓#️⃣⚠│ med   │ [ ตรวจ → ] │
│☐ │ 🟢 6:02 left   │ #CP-7760 ร้านใหม่ │ (new·null)│ 🧑agent A07  │📍✓📷✓🕓✓#️⃣✓│ low*  │ [ ตรวจ → ] │
│☐ │ 🟢 7:30 left   │ #CP-7762 รูปหน้าร้าน│ Cottontree│ 🧑agent A12 │📍✓📷✓🕓✗#️⃣✓│ high  │ [ ตรวจ → ] │
│██│ 🟡 needs-fix   │ #CP-7740 อัปรูป   │ Cottontree│ 🧑agent A12  │ (รอ agent) │ —     │ — (ค้าง)   │
└──┴───────────────┴──────────────────┴──────────┴─────────────┴──────────┴────────┴────────────┘
   * #CP-7760 proposer = A07 → ถ้า viewer == A07 แถวนี้ **เทาออก + ป้าย "คุณส่งเอง — ตรวจไม่ได้ (SoD)"**
     (SLA color: 🔴=--danger · 🟠=--warning · 🟢=--success · 🟡 needs-fix=--warning · เทา=--hold)
   ⚙ auto-approve low-risk: proposal ที่ verdict ครบ 4/4 + risk=low + field ∈ trusted-set (hours/phone) +
      proposer.quality_score สูง → ระบบ apply เอง (ลง audit "auto_approved") → **ไม่เข้าคิวมนุษย์** (ดู note)
```

> **auto-approve-low-risk note (เหตุผล cost — doc 03 S5.2.3 / §6.4 pattern):** ถ้าทุก proposal เข้า moderator manual จะไม่ scale. **risk engine** ดัน auto-approve เฉพาะ: verdict ครบ 4/4 (📍📷🕓#️⃣ เขียวหมด) **และ** field อยู่ใน trusted-set (เวลาเปิด-ปิด/เบอร์โทร — ไม่ใช่ชื่อ/พิกัด/หมวด) **และ** `proposer.quality_score` สูง **และ** ไม่ใช่ seed-new-place/activate. ทุก auto-approve ยังเดิน `apply_proposal` + เขียน audit `actor='system' reason='auto_approved_low_risk'` (reversible). **seed-new-place / merchant-activate / verdict ไม่ครบ / risk≥med → บังคับมนุษย์เสมอ.** มนุษย์แตะเฉพาะที่ model ไม่มั่นใจ.

#### 7.2.2 Review detail — diff + evidence + verdict chips + photo-vs-pin map + actions

```
┌─ #CP-7741 · แก้เวลาเปิด–ปิด · Ristr8to Coffee ──────────────────── 🔴 SLA -2:14 BREACH ──[✕]─┐
│ proposer: 🧑 Field Agent A12 (Somchai S.) · quality 0.94 · ส่ง 2ชม.ที่แล้ว · task #T-3320      │
│ ┌─ SoD GUARD ───────────────────────────────────────────────────────────────────────────┐ │
│ │ ✓ คุณ (rin@·Moderator) ≠ ผู้เสนอ (A12) — อนุมัติได้  [proposal_sod: reviewed_by<>proposed_by]│ │
│ └───────────────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                            │
│ ┌─ BEFORE → AFTER DIFF (diff jsonb) ───────────────────────────────────────────────────┐  │
│ │ field            │ before (live v7)        │ after (เสนอ)              │               │  │
│ │ hours.mon_fri    │ 08:00–17:00             │ 07:30–18:00      ~แก้      │ ← highlight ~  │  │
│ │ hours.sat_sun    │ — (ปิด)                 │ 08:00–18:00      +เพิ่ม    │ ← highlight +  │  │
│ │ phone            │ 053-xxx-xxx (ไม่แตะ)    │ (ไม่เปลี่ยน)               │               │  │
│ └──────────────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                            │
│ ┌─ EVIDENCE MEDIA (evidence_media_ids[]) ──────┐  ┌─ PHOTO ⟷ PIN MAP COMPARE ───────────┐ │
│ │ [📷 ป้ายเวลา]  [📷 หน้าร้าน]   [+ pHash near] │  │   📍 places.geo (live pin)            │ │
│ │  fresh-camera   fresh-camera     2 รูปใกล้เคียง│  │      └─●─┐ 38 ม.                       │ │
│ │  EXIF 14:02 วันนี้                            │  │         └─◎ evidence_geo (จุดถ่าย)     │ │
│ │  [ดูเต็ม·เทียบ side-by-side]                  │  │   ⟳ วงรัศมี 80 ม. (geofence) — จุดถ่าย │ │
│ │                                              │  │     อยู่ในวง ✓ · ภาพตรงกับหน้าร้าน?    │ │
│ └──────────────────────────────────────────────┘  └───────────────────────────────────────┘ │
│                                                                                            │
│ ┌─ ANTI-FRAUD VERDICT CHIPS (server re-verified — client เชื่อไม่ได้) ─────────────────┐  │
│ │  📍 GPS ≤80m   ● PASS  (38 ม. · ST_DWithin)                          (--success)      │  │
│ │  📷 fresh-cam  ● PASS  (in-app camera · ไม่มี gallery import)         (--success)      │  │
│ │  🕓 EXIF time  ● PASS  (ถ่าย 14:02 วันนี้ · ≤N นาที · GPS-in-EXIF ≈ device) (--success) │  │
│ │  #️⃣ pHash dedup ● PASS  (ไม่ซ้ำรูปเดิม/agent อื่น · nearest distance 0.41) (--success)  │  │
│ │  ── ถ้าใด --danger = ฟ้าผ่า: 🕓 ✗ FAIL "EXIF 3 วันก่อน — ไม่ใช่รูปสด" → ห้าม approve ── │  │
│ └──────────────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                            │
│ ─ MODERATOR DECISION ──────────────────────────────────────────────────────────────────── │
│  [ ✅ อนุมัติ Approve ]   [ 🟠 ขอแก้ Request-more ]   [ 🔴 ปฏิเสธ Reject + เหตุ ]            │
│   apply_proposal →         →agent superseded loop      →reason_code (เลือก) → agent appeal   │
│   live+version++           (lock คงไว้)                                                     │
└────────────────────────────────────────────────────────────────────────────────────────────┘
```

**Decision → system effect (เขียนชัดต่อปุ่ม):**

| ปุ่ม | สิ่งที่เกิด (state / writer) | SoD/step-up | audit |
|---|---|---|---|
| ✅ **Approve** | `apply_proposal` edge-fn (service_role): flip `status='approved'`, copy `diff`→`places`, `places.version++`, close `places_history.valid_to` + insert snapshot(`change_proposal_id`), update `data_freshness.last_verified_*`, set `tasks.status='approved'` → ปลด `pay_accrual` (agent) | **ASSERT reviewer≠proposer** (fn ทำซ้ำ DB CHECK) + **ASSERT reviewer.role ∈ {Moderator,Admin,Owner}** (ตัด CityMgr); approve ของ seed-new-place/activate = high-impact → **step-up aal2** | `audit_log{approve, proposal#, reviewed_by, version}` |
| 🟠 **Request-more** | `proposal_status='superseded'` + `reason_note_i18n` → agent ได้ needs-fix card (§4.4) ส่งใหม่ **โดยไม่เสีย lock** | reviewer≠proposer | `audit_log{request_more, reason}` |
| 🔴 **Reject** | `status='rejected'` + `reason_code` (มาตรฐาน: `GPS_TOO_FAR`/`STALE_PHOTO`/`DUP_PHASH`/`OFF_TOPIC`…) → กระทบ `agents.quality_score` → agent เปิด **appeal** (§4.4a → `support_ticket kind='agent_dispute'` → Agent-Dispute queue §7.5) | reviewer≠proposer | `audit_log{reject, reason_code}` |

- **components:** SoD-guard banner, DiffViewer (jsonb before/after + `~`/`+`/`-` highlight), EvidenceGallery (fresh-camera thumbs + pHash-neighbor strip + side-by-side lightbox), VerdictChipRow (4–5 chips · icon+label+ค่าจริง · ไม่พึ่งสีเดียว §1.7), PhotoPinMap (Mapbox · live pin `places.geo` + evidence `◎` + 80m radius ring), DecisionBar (3 ปุ่ม + reason-code picker).
- **operator goal:** ตัดสินใน ~2 นาที ว่า "ข้อมูลนี้ของจริง/สด/ไม่ซ้ำ/ตรงพิกัด" → ปล่อยขึ้น live หรือไม่.
- **action/state effect:** ดูตารางบน — **live write เกิดผ่าน `apply_proposal` เท่านั้น** (ไม่มี direct `UPDATE places` จาก moderator).
- **SoD/step-up/PII/audit:** SoD banner บนสุด (เขียวถ้าผ่าน / **บล็อกปุ่ม approve + อธิบายถ้า viewer==proposer หรือ viewer.role==CityMgr**); seed/activate = step-up; proposer ชื่อแสดง masked เว้น role มีสิทธิ์; ทุกปุ่มเขียน audit.
- **empty/loading/error/SLA:** verdict chip **loading** = "⟳ กำลัง re-verify ฝั่ง server…" (ห้าม approve ก่อน verdict กลับ); **verdict ใด FAIL (--danger)** = ปุ่ม Approve **disabled** + tooltip "verdict ไม่ครบ — ต้อง reject หรือ request-more"; **SLA breach** = แถบหัว --danger + นับลบ + ดันขึ้นบนคิว + escalate City Manager; **apply_proposal error** (version conflict — live เปลี่ยนระหว่างรอ) = "live ถูกแก้ไปแล้ว (v7→v8) ตรวจ diff ใหม่" + refresh diff (กัน lost-update); **media โหลดไม่ได้** = placeholder + "หลักฐานโหลดไม่ขึ้น — request-more แทนการเดา".

---

### 7.3 (c) Review / UGC Moderation Queue — reported reviews · removal/reweight/shadow-ban · defamation/PDPA · right-to-respond

> **คนละ lane คนละ table จาก 7.2 (doc 03 S5.2.2):** Tab B/C เขียน `content_reports` + `moderation_actions` (append-only, reversible ผ่าน `prev_state`) — **ไม่ใช่ `change_proposals`**. semantics: "ขอให้รีวิว/รูปที่มีอยู่ถูกจัดการ" (takedown/reweight, legal exposure) ≠ "แก้ live data ของ place". S1 (Support) ที่อยากลบรีวิว **ต้องเปิด `content_report` เข้า S5** ไม่เขียน `moderation_status` เอง (doc 03 S1↔S5 conflict resolved → S5 owns).

#### 7.3.1 UGC Reports list — เรียงตาม severity × SLA

```
┌─ UGC Reports · Chiang Mai ──────────────────────────────────────────────────── 🚩 Tab B ─┐
│ [ทั้งหมด 5] [legal 1] [high 1] [medium 3] [escalated]   เรียง: ▾ severity × SLA-age          │
├──┬──────────────┬─────────────────────────┬──────────────┬───────────────┬─────────────────┤
│☐ │ SLA / sev     │ target                   │ reason_code   │ reported_by    │ action          │
├──┼──────────────┼─────────────────────────┼──────────────┼───────────────┼─────────────────┤
│☐ │ 🔴 LEGAL 24h │ review #RV-8812          │ defamation    │ 🏪 merchant    │ [ legal review→]│
│  │   -0:40 left │ "...ใส่สารเสพติด..."     │ (ม.326/328)   │ (Ristr8to)    │  ห้ามลบทันที     │
│☐ │ 🟠 HIGH 48h  │ review #RV-8790          │ extortion     │ 🤖 auto+🏪     │ [ ตรวจ → ]      │
│  │             │ "1★ ถ้าไม่ให้ฟรี"        │ (ม.337)       │               │                 │
│☐ │ 🟡 MED 72h   │ review #RV-8770          │ fake_no_visit │ 🤖 auto-detect │ [ ตรวจ → ]      │
│☐ │ 🟡 MED 72h   │ review_photo #PH-5521    │ off_topic     │ 👤 customer    │ [ ตรวจ → ]      │
│☐ │ 🟢 auto-soft │ review #RV-8765 (spam)   │ spam          │ 🤖 (conf สูง)  │ auto-reweight→0 │
└──┴──────────────┴─────────────────────────┴──────────────┴───────────────┴─────────────────┘
   (SLA color: 🔴 LEGAL=--danger · 🟠 HIGH=--warning · 🟡 MED=--warning · 🟢 auto=--success)
   auto-triage (doc 03 S5.2.3): legal→24h+escalate CityMgr · high→48h · medium→72h · low+conf สูง→auto-reweight
   (ไม่กิน moderator) · spam ปริมาณมาก = auto-shadow/reweight (reversible via moderation_actions.prev_state)
```

#### 7.3.2 UGC review detail — content + verified-visitor + actions + right-to-respond

```
┌─ #RV-8790 · review บน Graph Café ──────────────────────────────── 🟠 HIGH · SLA 48h ──[✕]─┐
│ reason_code: extortion (ม.337)  · severity=high · reporter: 🤖 auto + 🏪 merchant            │
│ ┌─ SoD GUARD ──────────────────────────────────────────────────────────────────────────┐ │
│ │ ✓ คุณ ≠ ผู้เขียนรีวิว · ✓ คุณ ≠ ผู้ report — moderate ได้ (author≠moderator, doc 03 SoD) │ │
│ └───────────────────────────────────────────────────────────────────────────────────────┘ │
│ ┌─ CONTENT ───────────────────────────────────────────────────────────────────────────┐  │
│ │ ★☆☆☆☆  "ให้ฟรีกาแฟไม่งั้นรีวิว 1 ดาวทุกวัน"   — 2 วันก่อน                            │  │
│ │ 🛡 verified-visitor: ✗ ไม่มี check-in (weak signal) · reviewer_reputation 0.31         │  │
│ │ trust_weight ปัจจุบัน: 0.30 (flagged-soft) · penalty_multiplier 0.3                     │  │
│ │ 👤 ผู้เขียน: user p***@gmail.com (masked · standard-tier) · [🔓 unmask + reason + step-up]│  │
│ └──────────────────────────────────────────────────────────────────────────────────────┘  │
│ ┌─ MERCHANT RIGHT-TO-RESPOND (doc 03 S5.4 linkage) ───────────────────────────────────┐  │
│ │ 🏪 Graph Café ตอบกลับ (moderation_status=pending): "ไม่เคยมีลูกค้าชื่อนี้ในระบบ POS"  │  │
│ │ [ดู merchant_response] · [ลิงก์ dispute → support_ticket (S1)]                        │  │
│ └──────────────────────────────────────────────────────────────────────────────────────┘  │
│ ─ MODERATION ACTION (เขียน moderation_actions — append-only, reversible) ───────────────── │
│  [🗑 Remove]  [⚖ Reweight→0]  [🙈 Shadow-ban]  [✏ Request-edit]  [✓ Uphold/no-action]      │
│  [⚖️ Escalate-legal]  [📑 Takedown-CCA (มีคำสั่งศาล/ม.337 evidence-pack)]                   │
│   ทุกปุ่ม → moderation_action{action, reason_code, prev_state(snapshot), actor} → recompute │
│   place rating (doc 03 S5.5.6) · reversible ผ่าน [↩ Reinstate] เพราะเก็บ prev_state          │
└────────────────────────────────────────────────────────────────────────────────────────────┘
```

**defamation/PDPA pathway (notice-and-action — ไม่ใช่ auto-takedown):**

```
report=defamation → ❌ ไม่ลบทันที (กันร้านใช้ปุ่ม report ปิดปากรีวิวจริง = reputation laundering / SLAPP)
   → เข้า LEGAL lane (SLA 24h) → moderator + Thai-lawyer playbook (doc 03 S5.3.2):
        ├─ ผิดกฎหมายชัด / มีคำสั่งศาล  → Remove + escalate_legal + เก็บ evidence-pack (takedown_cca)
        ├─ ก้ำกึ่ง                     → คงไว้ + ให้สิทธิ merchant respond (S5.4) + uphold
        └─ doxxing เปิด PII บุคคลที่ 3 → trip PDPA tiered breach runbook (no rigid 72h · 15-day valve ·
                                          skip-notify ถ้า no-risk หลัง redact) → ส่ง DPO ประเมิน (§11.1 DPO)
```

- **components:** SoD-guard, ContentCard (rating+text+verified-visitor badge+trust_weight+reputation), MaskedAuthor (unmask trigger · standard-tier = self-step-up; ถ้าผู้เขียนต้อง KYC-tier ใช้ DPO route), RightToRespondPanel (merchant_response + dispute link), ActionBar (8 reversible actions + reason-code), LegalEscalationNotice.
- **operator goal:** ตัดสินว่าจัดการ UGC อย่างไร **โดยไม่ over-censor (SLAPP) และไม่ปล่อยของผิดกฎหมาย** — ทุก action reversible.
- **action/state effect:** **ไม่มี ledger txn** (content moderation นอก ledger); เขียน `moderation_actions` (append-only) + อาจ trigger rating recompute + (extortion/false_claim) เก็บ evidence-pack ม.337/share `dispute_verdicts` กับ S1.
- **SoD/step-up/PII/audit:** author≠moderator + reporter≠moderator (SoD banner); **unmask ผู้เขียน standard-tier = reason + step-up + audit** (มักไม่จำเป็นใน UGC — ทำเฉพาะ extortion/legal); ทุก action ลง `moderation_actions` (= audit ในตัว) + `prev_state` ให้ reinstate.
- **empty/loading/error/SLA:** คิวว่าง = "ไม่มี UGC report ค้าง — ดี"; **LEGAL SLA breach** = --danger + escalate CityMgr ทันที + cannot-auto-resolve; **merchant ยังไม่ตอบ** = "รอ right-to-respond (นาฬิกา SLA pause)" ; **reinstate หลัง remove** = ใช้ `prev_state` (ถ้า prev_state หาย = error "กู้คืนไม่ได้ — escalate").

---

### 7.4 (d) Media Pending queue — photo approval (reuse verdict-chip engine จาก §7.2)

> **เติม orphan nav (fold critique C-major "Media Pending referenced-but-not-drawn"):** §7.1 nav + Moderator home มี `🖼 Media Pending ●3` เป็น lane มี count badge เอง → ต้องมีจอจริง (doc 03 S5.6 = "Tab C: Media"). lane นี้ = รูปที่ส่งมา **ลอย ๆ ไม่ผูก place-field diff** (เช่น เปลี่ยนรูปหน้าร้าน, อัปรูปเมนู, รูปแนบรีวิว pending) — ใช้ **verdict-chip engine ชุดเดียวกับ §7.2** (EXIF/GPS-80m/pHash/fresh-cam) + approve/reject/request-more. รูปที่ผูก place-field อยู่ใน §7.2 evidence flow แล้ว; lane นี้รับเฉพาะ media-only submission.

```
┌─ Media Pending · Chiang Mai › Nimman ────────────────────────────────────────── 🖼 Tab C ─┐
│ [ทั้งหมด 3] [pending 3] [approved] [rejected]   เรียง: ▾ SLA-age   กรอง: [type▾][proposer▾]   │
├──┬──────────────┬────────────────────┬──────────┬─────────────┬──────────────┬──────────────┤
│☐ │ SLA          │ media               │ target    │ proposer    │ verdicts      │ action       │
├──┼──────────────┼────────────────────┼──────────┼─────────────┼──────────────┼──────────────┤
│☐ │ 🟢 5:10 left │ 📷 #PH-6601 หน้าร้าน│ Ristr8to │ 🧑agent A12  │📍✓📷✓🕓✓#️⃣✓ │ [ ตรวจ → ]   │
│☐ │ 🟠 1:30 left │ 📷 #PH-6604 เมนู    │ Graph Café│ 🏪merchant   │📍✓📷✓🕓✓#️⃣⚠ │ [ ตรวจ → ]   │
│☐ │ 🟡 needs-fix │ 📷 #PH-6598 ป้าย   │ Cottontree│ 🧑agent A07  │📍✗ (นอก80ม.) │ [ ตรวจ → ]   │
└──┴──────────────┴────────────────────┴──────────┴─────────────┴──────────────┴──────────────┘

┌─ #PH-6604 · รูปเมนู · Graph Café ───────────────────────────────── 🟠 SLA 1:30 ──[✕]─┐
│ proposer: 🏪 merchant · ส่ง 1ชม.ที่แล้ว · ┌─ SoD: ✓ คุณ ≠ ผู้ส่ง (author≠moderator) ─┐ │
│                                          └───────────────────────────────────────────┘ │
│ ┌─ MEDIA PREVIEW ──────────────┐  ┌─ VERDICT CHIPS (server re-verified) ──────────────┐│
│ │ [ 📷 รูปเต็ม + pHash neighbors]│  │ 📍 GPS ≤80m  ● PASS (52 ม.)            (--success)││
│ │  EXIF 11:20 วันนี้            │  │ 📷 fresh-cam ● PASS (in-app)           (--success)││
│ │  [ดู side-by-side รูปเดิม]    │  │ 🕓 EXIF time ● PASS (≤N นาที)          (--success)││
│ │                              │  │ #️⃣ pHash    ⚠ WARN (คล้ายรูปเดิม 0.78 — ดูซ้ำ?) ││
│ └──────────────────────────────┘  └────────────────────────────────────────────────────┘│
│ ─ DECISION ────────────────────────────────────────────────────────────────────────────│
│  [ ✅ Approve (swap รูป live) ]   [ 🟠 Request-more ]   [ 🔴 Reject + reason_code ]       │
│   media-attach → places.media / review_photo  ·  ทุกปุ่มเขียน audit · reject → quality_score│
└──────────────────────────────────────────────────────────────────────────────────────────┘
```

- **components:** reuse VerdictChipRow + EvidenceGallery + DecisionBar จาก §7.2 (ลด build cost — doc 03 S5.6 "tooling เดียว"); MediaPreview (lightbox + pHash-neighbor strip).
- **operator goal:** ตัดสินว่ารูป "สด/ตรงพิกัด/ไม่ซ้ำ" ก่อน swap เข้า live media — เร็ว reuse engine เดิม.
- **action/state effect:** approve = attach media → `places.media` / `review_photo` (ไม่ใช่ live place-field diff — ไม่ผ่าน apply_proposal version bump เว้นแต่รูปเป็น versioned field); reject → `quality_score`; ไม่มี ledger txn.
- **SoD/step-up/PII/audit:** author≠moderator (SoD banner เหมือน §7.2); ทุก action audit; step-up ไม่บังคับ (media swap ไม่ใช่ seed/activate) เว้น media ผูก seed-new-place.
- **empty/loading/error/SLA:** คิวว่าง = "ไม่มีรูปค้างตรวจ"; verdict loading = lock approve จน verdict กลับ; pHash WARN (ซ้ำ) = ไม่บล็อก approve แต่เตือนให้ดู side-by-side; FAIL (--danger, เช่น GPS นอก 80ม.) = approve disabled → request-more/reject; **เลือก: ถ้าทีม build รวม media review เข้า §7.2 evidence flow เต็ม → ลบ nav 🖼 ออกกัน orphan** (critique-offered alternative — ที่นี่เลือก *วาดจอ* เพราะ media-only submission มีจริงนอก place-field diff).

---

### 7.5 (e) Agent-Dispute (appeal) review queue — SoD: reviewer ≠ rejecting-moderator

> **เติม dead-end handoff (fold critique C-critical "Handoff Chain D — agent appeal landing"):** §4.4a → §10.3 agent appeal สร้าง `support_tickets(kind='agent_dispute')` และสัญญาว่า reviewed by **someone ≠ rejecting moderator** (SoD). เดิมไม่มีจอ back-office รับ → appeal ตายเมื่อออกจากมือถือ agent. v2 เพิ่ม **Agent-Dispute lane** ใน moderation console (route-target ใน §7.1 nav + Moderator/Admin home) — เป็น lane ที่ 4 ของ Content Moderator, **บล็อก rejecting-moderator** (SoD guard เหมือน §7.2), แสดง proposal/reason_code เดิม, และ wire OVERTURNED → `apply_proposal` + re-accrue / UPHELD → close.

```
┌─ Agent Disputes (appeals) · Chiang Mai ──────────────────────────────────────── ⚖ Tab D ─┐
│ [ทั้งหมด 2] [open 2] [overturned] [upheld]   เรียง: ▾ SLA-age   กรอง: [reason_code▾][agent▾]  │
├──┬──────────────┬──────────────────────┬──────────────┬──────────────┬────────────────────┤
│☐ │ SLA          │ dispute               │ original      │ rejecting-mod │ action             │
├──┼──────────────┼──────────────────────┼──────────────┼──────────────┼────────────────────┤
│☐ │ 🟠 1:20 left │ #AD-3120 อุทธรณ์ reject│ #CP-7762      │ moderator nok │ [ ทบทวน → ]        │
│☐ │ 🟢 6:40 left │ #AD-3125 อุทธรณ์ reject│ #CP-7701      │ moderator rin │ ⚠ คุณคือผู้ reject → │
│  │             │                       │ (STALE_PHOTO) │ (= คุณ)       │   ตรวจไม่ได้ (SoD)  │
└──┴──────────────┴──────────────────────┴──────────────┴──────────────┴────────────────────┘
   ⚠ แถวที่ rejecting-mod == viewer → **เทาออก + "คุณคือผู้ปฏิเสธเดิม — ทบทวนไม่ได้ (SoD)"** → route หา mod อื่น

┌─ #AD-3120 · อุทธรณ์การปฏิเสธ #CP-7762 · agent A12 ──────────────── 🟠 SLA -1:20 ──[✕]─┐
│ ┌─ SoD GUARD ──────────────────────────────────────────────────────────────────────┐ │
│ │ ✓ คุณ (rin@) ≠ ผู้ปฏิเสธเดิม (nok@) — ทบทวน appeal ได้ (reviewer≠rejecting-moderator)│ │
│ └────────────────────────────────────────────────────────────────────────────────────┘ │
│ ┌─ ORIGINAL REJECTION ──────────────┐  ┌─ AGENT'S APPEAL (§4.4a) ─────────────────────┐│
│ │ proposal #CP-7762 รูปหน้าร้าน      │  │ "รูปถ่ายวันนั้นจริง EXIF อาจเพี้ยนเพราะ..."  ││
│ │ reason_code: STALE_PHOTO           │  │ + แนบหลักฐานเพิ่ม [📷 ใหม่] · quality 0.91   ││
│ │ rejected by nok@ · 1วันก่อน        │  │ verdict re-run: 🕓 ✓ PASS (เพี้ยนจริง)       ││
│ │ verdict เดิม: 🕓 ✗ FAIL            │  │                                              ││
│ └────────────────────────────────────┘  └──────────────────────────────────────────────┘│
│ ─ DECISION ────────────────────────────────────────────────────────────────────────────│
│  [ ✅ OVERTURNED — กลับคำ ]              [ ✓ UPHELD — ยืนตามเดิม + เหตุ ]                 │
│   → re-open proposal → apply_proposal     → close dispute · reason_note → agent แจ้งผล    │
│   → re-accrue AGENT_PAYOUT (§9) +          (quality_score ไม่คืน)                          │
│   restore quality_score · audit{overturn}  audit{uphold}                                  │
└──────────────────────────────────────────────────────────────────────────────────────────┘
```

- **components:** SoD-guard (reviewer≠rejecting-moderator), OriginalRejectionPanel (proposal + reason_code + verdict เดิม), AppealPanel (agent text + แนบหลักฐาน + verdict re-run), DecisionBar (overturn/uphold).
- **operator goal:** ทบทวนว่า reject เดิมถูกต้องไหม **โดยคนที่ไม่ใช่ผู้ปฏิเสธเดิม** — ปิด loop ความเป็นธรรมต่อ agent.
- **action/state effect:** OVERTURNED → re-open proposal → `apply_proposal` (live) + **re-accrue `AGENT_PAYOUT`** (canonical txn, §9 ledger discipline) + restore `quality_score`; UPHELD → close ticket (ไม่คืน score). ทั้งคู่ audit.
- **SoD/step-up/PII/audit:** reviewer ≠ rejecting-moderator (hard SoD guard + เทาแถวถ้า viewer==rejecting-mod); overturn ที่ wire money (re-accrue) = audit + ถ้า re-accrue ข้าม threshold → ตาม payout SoD ปกติ (§9); PII ของ agent masked ตาม tier.
- **empty/loading/error/SLA:** คิวว่าง = "ไม่มี appeal ค้าง"; SLA breach = --danger + escalate; **proposal เดิมถูก apply ไปแล้วโดยทาง superseded** = "proposal นี้มี version ใหม่แล้ว — ทบทวน context ปัจจุบัน"; re-accrue fail (freeze active) = block + "ระบบ freeze — overturn บันทึกแล้ว, re-accrue ค้างจน unfreeze".

---

### 7.6 (f) Settings · Roles — console RBAC grant/revoke + SoD-at-grant-time

> **เติม undrawn privileged surface (fold critique C/L-major "Settings · Roles referenced-but-not-drawn"):** §7.1 nav มี `⚙ Settings · Roles [Owner·Admin]` และ audit มี `role.grant` (step-up) แต่ไม่มีจอ. นี่คือ **จุดหลักที่ SoD separations ถูกสถาปนา** (กันคนเดียวถือทั้ง Gate1-identity+Gate2-finance, หรือ moderation-author+moderator). เดิมมีแค่ agent-invite (§4.0a / §11.2.b); console-role admin = ต้องวาด. grant/revoke 9 console roles + scope (city/territory) + **SoD-at-grant guard** + step-up + `role.grant` audit.

```
┌─ Settings · Roles · Console RBAC ──────────────────────────────────────── ⚙ [Owner·Admin] ─┐
│ [ผู้ใช้คอนโซล 14] [pending invite 2]   🔍 ค้นหา   [ + เชิญ/มอบ role ]                          │
├────────────────┬──────────────────────────────┬──────────────────────┬─────────────────────┤
│ user           │ roles[]                       │ scope                 │ action              │
├────────────────┼──────────────────────────────┼──────────────────────┼─────────────────────┤
│ rin@           │ Content Moderator             │ Chiang Mai            │ [ แก้ ] [ เพิกถอน ] │
│ nok@           │ Content Moderator · CityMgr   │ Chiang Mai › Nimman   │ [ แก้ ] [ เพิกถอน ] │
│ somchai@       │ Finance/Payout                │ global (การเงิน)      │ [ แก้ ] [ เพิกถอน ] │
│ ploy@          │ Support/CS                    │ global (per-ticket)   │ [ แก้ ] [ เพิกถอน ] │
│ dpo@           │ DPO                           │ global (compliance)   │ [ แก้ ] [ เพิกถอน ] │
└────────────────┴──────────────────────────────┴──────────────────────┴─────────────────────┘

┌─ มอบ role ให้ "nok@" ───────────────────────────────────────────────────────────[✕]─┐
│ roles (เลือกได้หลาย):  ☑ Content Moderator   ☑ City Manager   ☐ Finance/Payout         │
│                       ☐ Support  ☐ Analyst  ☐ Brand  ☐ DPO  ☐ Platform Admin          │
│ scope:  เมือง [Chiang Mai ▾]   territory [Nimman ▾]                                     │
│ ┌─ SoD-AT-GRANT GUARD (เช็คก่อน commit) ──────────────────────────────────────────┐  │
│ │ ✓ ไม่ถือ Gate1-identity (Support/CityMgr) + Gate2-finance (Finance) พร้อมกัน      │  │
│ │ ⚠ nok@ ถือ City Manager + Content Moderator → **content-lane conflict:**         │  │
│ │   CityMgr provision agent/seed place; Moderator approve proposal →               │  │
│ │   ต้องไม่ approve proposal ในสายที่ตัวเอง seed. → บังคับ scope แยก หรือ           │  │
│ │   approve gating (CityMgr=read-only ใน §7.1) ครอบอยู่แล้ว ✓ [ ยอมรับเงื่อนไข ]   │  │
│ │ ✗ ถ้าเลือก Finance + ปุ่ม approve_payout scope เดียวกับ create_payout → BLOCK     │  │
│ │   "creator≠approver — มอบไม่ได้" (SYSTEM_PLAN §4.7)                              │  │
│ └────────────────────────────────────────────────────────────────────────────────┘  │
│ [ 🔒 ยืนยัน + step-up (aal2) → มอบ role ]   ← role.grant = high-impact (audit + MFA)   │
└──────────────────────────────────────────────────────────────────────────────────────┘
```

- **components:** RoleTable (user × roles[] × scope), GrantModal (multi-role checkbox + scope picker), SoDGrantGuard (เช็ค Gate1≠Gate2, create≠approve payout, content-lane conflict), StepUpConfirm.
- **operator goal:** มอบ/เพิกถอน console role อย่างปลอดภัย — **กันการสถาปนา SoD violation ตั้งแต่ตอน grant** (จุดต้นทางของทุก separation).
- **action/state effect:** grant/revoke เขียน `user_roles` + `roles` (ไม่ใช่ ledger); ไม่มี money txn. `grant_role` = `S*` (step-up) เฉพาะ Owner/Admin (SYSTEM_PLAN §4.4).
- **SoD/step-up/PII/audit:** **SoD-at-grant guard** บล็อก/เตือน conflict (Gate1+Gate2, create+approve payout, content-lane); ทุก grant = **step-up aal2 + `audit_log{role.grant, target, roles, scope, by}`** (SYSTEM_PLAN §4.7); grantor≠payout-approver reminder (§11.2.b SEAM-3 — กัน grant ตัวเองสิทธิ์ approve เงินที่ตัว provision).
- **empty/loading/error:** ไม่มี user = "ยังไม่มีผู้ใช้คอนโซลใน scope"; grant ที่ violate hard-SoD = BLOCK + อธิบาย (ไม่ยอมให้ override); step-up หมดอายุระหว่าง grant = re-auth modal (ไม่ทิ้งฟอร์ม).

---

### 7.7 (g) Queue empty · SLA-breach · bulk · loading · error states

```
[EMPTY — คิวสะอาด]                         [SLA-BREACH — escalation surfaced]
┌──────────────────────────────┐           ┌────────────────────────────────────────┐
│        ⚖ 🎉                   │           │ 🔴 2 รายการเกิน SLA — escalate แล้ว     │
│  ไม่มี proposal ค้างใน scope  │           │ ┌────────────────────────────────────┐ │
│  คิวสะอาด · avg วันนี้ 2m10s  │           │ │🔴 #CP-7741 -2:14 · escalated→CityMgr│ │ ← นาฬิกานับลบ (--danger) เต็มแถว
│  [ ดู approved วันนี้ ]        │           │ │🔴 #RV-8812 LEGAL -0:40 · →lawyer    │ │   ดันขึ้นบนสุดของคิวเสมอ
│  (suppress never-verified ใน  │           │ └────────────────────────────────────┘ │   audit: sla_breach event
│   AHA feed — ดู doc 06 §1.2)  │           │ เหตุ breach: queue spike 14:00–15:00    │   (auto-emit + notify lead)
└──────────────────────────────┘           └────────────────────────────────────────┘

[BULK — เลือกหลายรายการ (เฉพาะ trusted-set/low-risk)]
┌──────────────────────────────────────────────────────────────────────────────────────┐
│ ☑ 4 รายการเลือก (ทั้งหมด verdict 4/4 ✓ · risk=low · field∈trusted-set)                │
│  [ ✅ Approve ทั้งหมด ]   [ 🟠 Request-more ]   [ ✕ ยกเลิกเลือก ]                       │
│  ⚠ ตัด 1 รายการออกจาก bulk: #CP-7762 (🕓 EXIF ✗) — ต้องตรวจเดี่ยว (verdict ไม่ครบ)     │
│  ⚠ ตัด 1 รายการออก: #CP-7760 — คุณส่งเอง (SoD: ตรวจไม่ได้)                              │
│  ── bulk approve = ทุกแถวเรียก apply_proposal แยก txn + เขียน audit แยก (ไม่ batch ทับ) ── │
│  bulk **ไม่อนุญาต** กับ: seed-new-place · activate · verdict-incomplete · risk≥med ·     │
│       reject (reject ต้องมี reason_code ต่อรายการเสมอ → ทำเดี่ยว) · CityMgr (read-only) │
└──────────────────────────────────────────────────────────────────────────────────────┘

[LOADING — verdict re-verify ค้าง]            [ERROR — apply conflict]
┌──────────────────────────────┐             ┌────────────────────────────────────┐
│ ⟳ กำลัง re-verify ฝั่ง server  │             │ ⚠ live ถูกแก้ระหว่างรอ (v7→v8)      │
│   📍⟳ 📷⟳ 🕓⟳ #️⃣⟳            │             │   diff อาจไม่ตรงแล้ว                 │
│ (ปุ่ม Approve ล็อกจน verdict   │             │ [ โหลด diff ใหม่ ] [ ปิด ]           │
│  กลับครบ — client เชื่อไม่ได้) │             │ (กัน lost-update บน moat data)       │
└──────────────────────────────┘             └────────────────────────────────────┘
```

- **operator goal:** ให้คิวบอกความจริงเสมอ — ว่าง=สบายใจ, breach=ดันขึ้นหน้า+escalate, bulk=เร็วแต่ปลอดภัย (ตัด SoD/verdict-fail/CityMgr อัตโนมัติ).
- **action/state effect:** **bulk approve = N ครั้งของ `apply_proposal` แยก txn + แยก audit** (ไม่มี single-blob write ทับ moat); SLA breach = `ticket_events/audit(sla_breach)` + notify lead.
- **SoD/step-up/PII/audit:** bulk **ตัดแถว `proposer==viewer` + `viewer.role==CityMgr` ออกอัตโนมัติ** (SoD) + ตัด verdict-incomplete; bulk approve ของ trusted-set ไม่ต้อง step-up รายตัว แต่ seed/activate ถูกกันออกจาก bulk ตั้งแต่ต้น; ทุก bulk เขียน audit ต่อรายการ.
- **empty/loading/error/SLA:** ครบทั้ง 5 ตามภาพ — เน้น **fail-closed**: verdict ไม่ครบ/conflict/SoD → ปุ่มล็อก, ไม่ปล่อยให้ลื่นไถลเข้าผ่าน bulk.

> **สรุปทำไม section นี้คือ "moat human gate":** 7.2 เป็นจุดเดียวที่ข้อมูล supply-side (สด/จริง/ไม่ซ้ำ/ตรงพิกัด) ได้รับ "ตราอนุมัติของมนุษย์" ก่อนเป็น `places` live; auto-approve รับเฉพาะ low-risk trusted-set ที่ verdict ครบ; ทุกอย่างที่เหลือผ่านสายตา **Content Moderator** (ไม่ใช่ CityMgr) ภายใต้ **author≠moderator** + **content-lane creator≠approver** + **apply_proposal เป็น writer เดียว** + **audit ครบ**. 7.5 ปิด loop ความเป็นธรรมต่อ agent (appeal ≠ rejecting-mod); 7.6 สถาปนา SoD ตั้งแต่ตอน grant role. ถ้า gate เหล่านี้แข็ง → freshness badge ฝั่ง consumer (doc 06 §1.2) เชื่อถือได้จริง = ตัว moat ของทั้งผลิตภัณฑ์.

---

### 7.8 Critique disposition — shell-moderation scope (รับ / ส่งต่อ + เหตุผล)

**รับเข้า (fold-in) — แก้ในสเปก §7 นี้:**

| # | severity | ประเด็น (critique area) | แก้ที่ |
|---|---|---|---|
| 1 | **critical** | SoD — CityMgr approve Change Proposal (§7.1 matrix vs §11.2.c) | §7.1 matrix → CityMgr `○ read/escalate-only`; §7.2 approve ASSERT role∈{Mod,Admin,Owner} + SoD guard บล็อก CityMgr; §7.7 bulk ตัด CityMgr; §0 หลักการ #2 |
| 2 | **critical** | Brand/Sponsor reachability — home + Sponsor Campaigns orphan CTA | §7.1 Brand home variant 4 (own-scope campaign/budget/escrow/quest/analytics k≥5) + reachability note *(Sponsor Campaigns console เต็ม = §11 Brand section — ส่งต่อ)* |
| 3 | **critical** | Handoff Chain D — agent appeal landing (reviewer≠rejecting-mod) | §7.5 Agent-Dispute queue + detail (SoD guard, OVERTURNED→apply_proposal+re-accrue, UPHELD close) + nav/home route-target |
| 4 | major | Settings · Roles undrawn (role.grant + SoD-at-grant) | §7.6 Settings·Roles screen (grant/revoke + SoD-at-grant guard + step-up + role.grant audit) |
| 5 | major | Media Pending undrawn (orphan nav lane) | §7.4 Media Pending list+detail (reuse verdict-chip engine) + offered alternative (รวมเข้า §7.2 → ลบ nav) |
| 6 | major | Owner & P.Admin orientation home หาย | §7.1 Owner home (platform-health + dual-Owner co-sign inbox + payout>threshold) + P.Admin home (cross-section counts + เทา Owner-only) |
| 7 | major | Freeze Control role split (P.Admin ไม่ครบ dual-Owner → dead-end) | §7.1 matrix → Owner `●(+release)` / P.Admin `○(view+manual-freeze)` + FIX note *(ปุ่ม release gating ที่จอ = §9.d ส่งต่อ)* |
| 8 | major | Role-matrix vs drawn-screen — CityMgr Support `○`, Analyst read `○` | §7.1 matrix → CityMgr Support `○(read/handoff)` + Analyst Solvency/Onboarding `○read` ให้ตรง intent *(จอจริง = §11.2/§11.3 ส่งต่อ)* |
| 9 | minor | payout.approve audit severity ต่ำไป | §0 หลักการ #6 — money-out + freeze-governance = **high severity** ใน audit taxonomy |
| 10 | minor | state-color token drift (§8/§9/doc 06) | §0 color-token discipline — admin อ้าง doc 06 §1.2 ด้วย **ชื่อตัวแปร** ไม่ re-pin hex; ทุก ASCII chip ระบุ `--token` |

**ส่งต่อ / นอกขอบเขต §7 (เหตุผล — ระบุปลายทางกัน orphan):**

- **PII tiering — payment-instrument unmask (§8.4 vs §9.a) [major]** → canonical rule ต้องตัดสินใน **§8.4 tiering table** (bank-account = payment-instrument). §7 รับเฉพาะ *principle*: §0 #5 + top-bar PII-tier indicator route sensitive-tier ไป DPO. การตัดสินว่า Finance unmask payout-bank ได้ด้วย ABAC exception "Finance-on-active-payout-item" หรือต้อง route DPO = **งาน §8.4/§9.a** (ดู residual-risk #2).
- **Manual-freeze step-up + form (§9.d) [major+minor]** → step-up MFA + audit + 2-Owner-for-FROZEN-global บน manual-freeze form = **งาน §9.d** (เขียน `freeze_events`/`platform_freeze_state`). §7.1 ทำได้แค่ split capability (Owner+P.Admin) ใน matrix; การวาด form + gate ปุ่ม = §9.d.
- **Solvency-override owner-B inbox (§9.d/§9.c) [major]** → §7.1 Owner home มี "dual-Owner co-sign inbox" เป็น *entry point*; แต่ wizard owner-B (review + co-sign out-of-band) = **งาน §9.d**.
- **DPO pending-unmask approval queue [critical]** & **DPO blocker drill-down [minor]** & **Cross-border SCC/DPA registry [minor]** → ทั้งหมดอยู่ใน **§11.1 DPO console** (§7 route ปลายทางไปให้แล้วผ่าน "[ ขอ DPO → ]" + §0 #5).
- **Disputed-claim dedupe resolution screen [major]** → **§8.1** (Gate-1 merchant verify lane).
- **CityMgr Support-Tickets / Analyst read-only Solvency/Onboarding จอจริง [major]** → **§11.2 / §11.3** (§7.1 matrix แก้ให้ `○` ตรง intent แล้ว; การวาดจอ = section ปลายทาง).
- **10.2 mis-issued-QR report CTA [minor]** → consumer/merchant flow **§10.2** (back-office destination = support_ticket(merchant_onboarding) / agent-attribution flag → CityMgr — ระบุปลายทางไว้กัน orphan).

> หลักการ filter: §7 = **console shell + change-proposal/UGC/media/appeal moderation + console-RBAC grant**. รับ finding ที่เปลี่ยน *nav-matrix / SoD-gating ของ moderation / role-aware home / moderation-lane screen / token-reference ของ admin surface*; ส่งต่อ finding ที่เป็น *Finance/freeze/DPO/merchant-verify/consumer screen* ไป section ปลายทาง (§8/§9/§10/§11). ทุก reject ระบุปลายทาง.

---

## 8. Merchant Verification & Support/Dispute Console

> **พื้นผิว:** Next.js + Refine (desktop-first, role-gated single web app) — ใช้ token จากชุด *Lanna-modern* (doc 06 §1) **อ้างอิงด้วยชื่อตัวแปร ไม่ re-pin hex** เพื่อให้ admin/consumer ไม่ drift จากกัน. โหมด admin = **หนาแน่น/utilitarian/data-table-heavy**: brand amber `--brand-primary #E8852C` สงวนไว้สำหรับ **CTA หลัก + active nav/tab เท่านั้น** (ไม่ใช่ทุกปุ่ม), jade `--brand-secondary #1E8E7E` = link/secondary/`--focus-ring`, ink `--ink-900/600/400` (`#221B12/#5C5346/#8A8170`) = ข้อความ 3 ระดับ, saa-paper `--surface-paper #FBF6EE` = พื้น, `--surface-card #FFFFFF` = card/table, `--surface-sunk #F2EADD` = input/well, `--hairline #E6DDCE`. Sparks = ✦ violet `#7C5CFF`, Coins = ◉ metallic-gold `#C9962A` (**ตัวเลขเงิน = `--ink-900` เสมอ; gold เฉพาะ ◉ icon/ขอบ — doc 06 §1.7 contrast**).
>
> **State color = ใช้ token canonical ของ doc 06 §1.2 โดยชื่อตัวแปร (ไม่ re-pin hex ใน section นี้ — แก้ minor "token drift §8 vs §9 vs doc 06"):** `--success #2BA84A` · `--warning` ochre `#C77A0F` · `--danger #D64545` · `--hold` slate `#7A8290` · `--info`/`--focus-ring` jade `#1E8E7E`. (ตรวจแล้วตรง doc 06 §1.9 — `success #2BA84A` + `hold #7A8290` = canonical; §9/§11 ต้องอ้างตัวแปรชุดเดียวกันนี้ ไม่ pin hex ซ้ำ.) **กฎ baht face value ของ doc 06 §1.2 ไม่บังคับใน admin** (single-currency-per-field; แสดง ฿ ได้ตรงๆ — COGS/escrow/payout/ledger) แต่ **ห้าม mirror เลขบาทคู่ Coin กลับมาฝั่งผู้ใช้.**
>
> **กฎเหล็กของทั้ง section (ตรง doc 03 S1/S4 + ledger A.7):**
> 1. **ไม่มี ad-hoc balance edit ที่ไหนเลย** — ทุกการเคลื่อนมูลค่าออกจาก ticket = canonical txn จริง (`REFUND` / `GRANT` / `MERCHANT_CLAWBACK` / `RECOVERY` / `WRITE_OFF`) + ผูก `resolution_ledger_txn_id` กลับ ticket เสมอ (CHECK constraint บังคับ; ไม่มี txn → transition เข้า RESOLVED fail).
> 2. **SoD (author ≠ approver) แข็ง:** Gate 1 Identity reviewer ≠ Gate 2 Finance reviewer (คนละ role/คนละคน). CS **ไม่มี** capability `create_payout`/`approve_payout` — baht refund/agent-payout วิ่งผ่าน Finance role เสมอ. maker ≠ checker ที่ money action เกิน threshold. **agent-appeal reviewer ≠ rejecting moderator** (§8.3-AP).
> 3. **step-up MFA (`S*`)** ที่: unmask PII, money action > threshold (เสนอ 500฿ / 2,000 COIN), GRANT ที่ค้ำด้วย third-party funder (เสมอ ไม่ว่าจำนวน), bank-change, advance trust state.
> 4. **PII masked by default** ผ่าน ABAC `PII_MASK`; unmask = ต้องมี active ticket + reason_code + justification + step-up + audit, time-boxed. **tiering = doc-wide canonical (§8.4 = single source).**
> 5. **fraud-gate ก่อน goodwill** (`fraud_score < threshold` + cap check per-user/per-CS-daily/per-city) — กัน goodwill-farming.

---

### 8.1 Merchant Verify — Gate 1 (Identity) review console

> **เป้าหมาย operator (Content Moderator / Identity reviewer):** ตัดสินว่า "นี่คือเจ้าของร้านตัวจริงที่ pin ตรงสถานที่จริง ไม่มี claim ซ้อน" → advance `CLAIMED → IDENTITY_VERIFIED`. **Author ≠ moderator (SoD hard):** ผู้ตรวจ Gate 1 ต้องไม่ใช่ agent ที่ออกโค้ดหน้าร้าน และไม่ใช่ผู้ที่จะตรวจ Gate 2.

```
┌─ Soi Hop · Admin ─────────────────────────────────────────────────────────────────────────┐
│ ⌂ Dashboard  ◔ Moderation  ▣ Merchant Verify ●  ⚖ Support  ₿ Finance  ◬ Recon  ⚙ ...   [CNX▾]│ ← active tab = amber underline (--brand-primary; เดียวในแถบ)
├──────────────┬─────────────────────────────────────────────────────────────────────────────┤
│ QUEUES       │  GATE 1 · IDENTITY REVIEW                    reviewer: you (mod_id 7731)       │
│ ▸ G1 Identity│  ┌─ MV-2026-00471  ☕ Ristr8to Lab ─────────────────────  trust 40/40 ▰▰▰▰  ─┐ │
│   (12) ⏱2    │  │ place_id pl_9af2 · นิมมานซอย3 · claimed 2569-06-12 09:14 · CLAIMED        │ │
│ ▸ G2 Finance │  │ SLA: first-resp ◷ 24h → due in 03:41  ●on-track (--success)              │ │
│   (5)        │  ├──────────────────────────┬───────────────────────────────────────────────┤ │
│ ▸ Re-verify  │  │ EVIDENCE / หลักฐาน        │ PHOTO ↔ PIN (map)                              │ │
│   (3) ⚠1     │  │                           │  ┌──────────────────────────────────────┐     │ │
│ ▸ Disputed   │  │ ◻ on-premise code  +40 ✓  │  │  [ shop-front photo ]  [ Mapbox pin ] │     │ │
│   claim (1)🔶 │  │   482-913 · agent A-220   │  │   EXIF: 2569-06-12 09:02 (Asus..)     │     │ │
│   → §8.1-D   │  │   ⓘ issued by ≠ you (SoD) │  │   GPS 18.7982,98.9670 · 22m from pin ●│ ←within80m
│              │  │ ◻ DBD cert 13ก  +50  📄👁 │  │   pHash: no dup match ●               │     │ │
│ FILTERS      │  │   OCR: "บ.ริสเตรโต่ จก."   │  └──────────────────────────────────────┘     │ │
│ city: CNX    │  │ ◻ ภพ.20 VAT  +50  📄👁     │  CHECKS (auto):                               │ │
│ status:CLAIM │  │ ◻ domain @ristr8to.co +20 │   ● fresh-camera (no gallery)  ● GPS≤80m       │ │
│ age: any     │  │ ◻ phone OTP  +10 ✓        │   ● EXIF intact   ● pHash unique  ◐ name-dedup │ │
│              │  │                           │   ⚠ name-dedupe: 1 near "Ristr8to" → review   │ │ (--warning)
│ [+ assign]   │  ├───────────────────────────┴───────────────────────────────────────────────┤ │
│              │  │ PII (masked ⊘)  owner: คุณ ก****  ·  08x-xxx-4471  ·  r***@ristr8to.co     │ │
│              │  │                                            [ 🔓 Unmask (reason+step-up) ]  │ │ → §8.4
│              │  ├───────────────────────────────────────────────────────────────────────────┤ │
│              │  │ DECISION                                                                   │ │
│              │  │  ◉ Approve → IDENTITY_VERIFIED   ◯ Reject + reason   ◯ Request more         │ │
│              │  │  reason/note (required if ≠approve): [________________________________]     │ │
│              │  │  ⚠ Approve requires step-up MFA · author≠moderator enforced               │ │
│              │  │                              [ Cancel ]      [ Approve → step-up 🔐 ]       │ │
│              │  └───────────────────────────────────────────────────────────────────────────┘ │
└──────────────┴─────────────────────────────────────────────────────────────────────────────┘
```

**Components:** sidebar queue list (count + SLA-breach ⚠ + Disputed-claim 🔶 → §8.1-D) · case header w/ trust-points bar (ไต่จริงตามหลักฐาน) · evidence checklist (method + points + 👁 doc-viewer) · **photo↔pin split (Mapbox)** + auto-check verdict row (fresh-camera / GPS≤80m / EXIF / pHash / name-dedupe) · masked PII row + unmask CTA · decision radio (approve / reject+reason / request-more) · step-up gate button.

**Operator goal:** ยืนยันตัวตน+สถานที่ ไม่มี claim ซ้อน → `IDENTITY_VERIFIED`.

**System effect / state change:** **ไม่มี ledger txn** (Gate 1 = trust-state เท่านั้น, ไม่ใช่เงิน). Approve → `merchant.trust_state = IDENTITY_VERIFIED` + version bump + write `verification_decision` (append-only: reviewer_id, ts, before/after, evidence refs). **ปลดล็อก:** Gate 2 (Finance) เปิดให้ตรวจได้ — แต่ **ยังออก redemption / fund escrow ไม่ได้** (gate ที่ FINANCE_VERIFIED).

**SoD / step-up / PII / audit / SLA:**
- **SoD:** ผู้ตรวจ Gate 1 ≠ agent ที่ issue on-premise code (`ⓘ issued by ≠ you`) ≠ ผู้ตรวจ Gate 2 — enforce ที่ accessControlProvider + DB constraint.
- **step-up:** Approve→IDENTITY_VERIFIED = `S*` MFA (advance trust state = high-impact).
- **PII:** owner ชื่อ/เบอร์/email masked default; unmask = reason+step-up+audit (§8.4).
- **audit:** ทุก decision → append-only `verification_decision` + `audit_log`.
- **SLA:** first-response 24h (Gate 1); breach → `sla_breach` event + escalate, sidebar badge ⚠.

**Empty / loading / error / SLA-breach:**
- **empty:** "ไม่มีคำขอรอตรวจในเมืองนี้ 🎉" + ลิงก์ดู Re-verify queue.
- **loading:** skeleton card + map placeholder; doc-viewer = spinner คงขนาด.
- **error — OCR/DBD ล้มเหลว:** flag "ตรวจด้วยคน" + doc แสดง raw; ไม่ block manual approve.
- **error — claim ซ้อน (DISPUTED):** banner ส้ม `--warning` "มีผู้อื่นกำลัง claim ร้านนี้" → ทั้งคู่ค้างที่ CLAIMED, case ไป **Disputed-claim queue** (🔶) → **§8.1-D**; Gate 1 ตัดสินไม่ได้จนกว่า dedupe verdict เคลียร์.
- **SLA-breach:** sidebar ⏱ แดง `--danger` + row banner "เกิน SLA — escalated to lead".

---

### 8.1-D Disputed-claim dedupe resolution — competing-claim verdict (NEW · ปลดบล็อก Gate 1)

> **เป้าหมาย operator (Senior Identity reviewer — ไม่ใช่ผู้ออกโค้ดของ claim ใดเลย):** เมื่อ ≥2 ราย claim place เดียวกัน (name+geo dedupe trip หรือโค้ด 2 ใบบน pin เดียว) ทั้งคู่ **HARD-BLOCK ที่ CLAIMED** จน reviewer เปรียบเทียบหลักฐานแบบ side-by-side แล้วตัดสินเจ้าของ. **นี่คือทางออกเดียวของ 🔶 Disputed-claim queue — Gate 1 ของทั้งสอง claim ถูกบล็อกจนกว่า verdict ที่นี่ลง.** (แก้ completeness-major: §8.1/§10.2 route มาที่นี่แต่เดิม "วาดแค่ banner ไม่มีจอตัดสิน".)

```
┌─ DISPUTED CLAIM · DC-2026-0014  ☕ "Ristr8to" (pl_9af2) · นิมมานซอย3 ──── 🔶 BOTH HELD@CLAIMED ─┐
│  reviewer: you (sn_mod_5510) · ⛔ SoD: คุณต้องไม่ใช่ agent ที่ออกโค้ดของ claim ใดในนี้ ● OK     │
│  trigger: name-dedupe near-match + 2 on-premise codes บน pin เดียว · opened 2569-06-13 11:02   │
│  SLA: dedupe-resolve ◷ 48h → due in 21:30  ●on-track          [ ⏸ ทั้งสอง claim ถูก pause ]    │
├──────────────────────── CLAIM A ─────────────────────────┬──────────────── CLAIM B ───────────┤
│ MV-2026-00471 · claimant usr_3b1 (masked ⊘)              │ MV-2026-00488 · claimant usr_9fe (⊘) │
│ claimed 06-12 09:14 (เร็วกว่า ●)                          │ claimed 06-13 08:40                  │
│ on-premise code 482-913 · agent A-220                    │ on-premise code 771-006 · agent A-091│
│ shop-front photo  [👁]  EXIF 06-12 09:02 · GPS 22m ●     │ shop-front photo [👁] EXIF 06-13 ·44m│
│ DBD 13ก "บ.ริสเตรโต่ จก." ●  ภพ.20 ●  domain ●           │ DBD —  ภพ.20 —  domain @gmail ✗      │
│ phone OTP ● · pHash unique ●                             │ phone OTP ● · pHash → ตรงกับ A ⚠farm │ (--warning)
│ evidence-strength: 200/200 ▰▰▰▰▰                         │ evidence-strength: 50/200 ▰▱▱▱▱      │
├──────────────────────────────────────────────────────────┴──────────────────────────────────┤
│  DECISION (mutually-exclusive, audited):                                                      │
│   ◉ Grant A (→ A: IDENTITY_VERIFIED unblock · B: REJECT_DUPLICATE + reason)                    │
│   ◯ Grant B (→ B unblock · A reject)    ◯ Reject both (ทั้งคู่ไม่ผ่าน → กลับให้ submit หลักฐาน) │
│   ◯ Escalate → City Manager (กรณีโต้แย้งสิทธิ์เจ้าของจริง/legal)                                │
│  reason_code: [ ◉ stronger_evidence  ◯ first_legit_claim  ◯ duplicate_farming  ◯ inconclusive]│
│  note (required): [_____________________________________________________________________]      │
│  ⚠ losing claimant ได้ reason ที่ไม่ leak หลักฐานคู่แข่ง (templated) · ผู้ออกโค้ดทั้งสอง = audited│
│                                    [ Cancel ]        [ Decide → step-up 🔐 · audited ]         │
└────────────────────────────────────────────────────────────────────────────────────────────────┘
```

**Components:** dispute header (SoD-guard: reviewer ≠ ผู้ออกโค้ดของ claim ใด + both-held banner) · **side-by-side claimant panel** (claim time, agent-attribution ต่อ claim, evidence list + 👁, evidence-strength bar, pHash cross-match anti-farm flag) · decision radio (grant A / grant B / reject both / escalate→CityMgr) mutually-exclusive · reason_code enum · note required · step-up gate.

**Operator goal:** ตัดสินเจ้าของจริง 1 ราย (หรือ reject both/escalate) → **ปลดบล็อก Gate 1** ของ claim ที่ชนะ.

**System effect / state change:** **ไม่มี ledger txn** (เป็น trust-state arbitration). Decide →
- **Grant A:** `MV-A.dedupe_state = CLEARED` (Gate 1 ของ A เปิดตัดสินได้ทันที); `MV-B.trust_state → REJECTED` (reason_code `duplicate`/`weaker_evidence`, ไม่ leak A) + agent-attribution ของ B ติด flag review ถ้า pHash farm.
- **Reject both:** ทั้งคู่ → `REQUEST_MORE` (กลับ CLAIMED + แจ้งให้ส่งหลักฐานเพิ่ม).
- **Escalate:** route City Manager (เจ้าของสิทธิ์/legal) — case ค้าง 🔶 จนกว่า CityMgr ส่งกลับ.
- ทุกผล → append-only `dedupe_decision` + `audit_log` (reviewer, ทั้งสอง claim refs, evidence refs, reason). **"dedupe cleared" = ฟิลด์ `dedupe_state=CLEARED` บน claim ที่ชนะ** — Gate 1 อ่านฟิลด์นี้เป็น precondition ปลดบล็อก.

**SoD / step-up / PII / audit / SLA:**
- **SoD:** reviewer ≠ agent ที่ออก on-premise code ของ claim A หรือ B (enforce accessControlProvider + DB constraint); ถ้า route มาให้คนที่ขัด → reject + re-route Senior pool.
- **step-up:** Decide = `S*` (advance/deny trust state ของ 2 ราย = high-impact).
- **PII:** claimant ทั้งคู่ masked default; unmask ต่อราย = §8.4 (active dispute = active ticket).
- **audit:** `dedupe_decision` append-only; losing-claimant reason = templated (ไม่เปิดหลักฐานคู่แข่ง).
- **SLA:** dedupe-resolve 48h; breach → escalate Senior lead; ทั้งสอง claim ยังคง HARD-BLOCK (กัน premature unlock ฝั่งใดฝั่งหนึ่ง).

**Empty / loading / error:**
- **empty:** "ไม่มี claim ซ้อนค้างพิจารณา".
- **error — claim หนึ่งถอนตัว:** dispute auto-resolve เหลือ 1 ราย → `dedupe_state=CLEARED` อัตโนมัติ + audit "single remaining claimant".
- **error — ผู้ออกโค้ดเดียวกันทั้ง A,B (collusion):** banner `--danger` "โค้ดทั้งสอง claim มาจาก agent คนเดียว — escalate fraud_case" + decision lock จนกว่า Senior lead รับ.
- **loading:** side-by-side skeleton; evidence thumb spinner คงขนาด.

---

### 8.2 Merchant Verify — Gate 2 (Finance) review · SEPARATE reviewer

> **เป้าหมาย operator (Finance/Payout reviewer — คนละคนกับ Gate 1):** ตรวจบัญชีรับเงิน + ชื่อตรงเจ้าของ (PromptPay name-match / micro-deposit) + KYC payee → advance `IDENTITY_VERIFIED → FINANCE_VERIFIED`. **นี่คือ gate ที่ปลดล็อก fund-escrow + ออก redemption.**

```
┌─ Gate 2 · FINANCE VERIFY ───────────────────────  reviewer: Finance (fin_id 4102) ─────────┐
│  MV-2026-00471  ☕ Ristr8to Lab        trust_state: IDENTITY_VERIFIED ✓ (by mod_7731)       │
│  ⛔ SoD CHECK: Gate1 reviewer mod_7731 ≠ you fin_4102  ● OK                                 │
│  SLA: ◷ 48h → due in 31:08  ●on-track                                                       │
├────────────────────────────────────────────────────────────────────────────────────────────┤
│  BANK / PAYOUT  (PII sensitive — payment-instrument tier → ดู §8.4 tiering)                  │
│  ┌──────────────────────────────────────────────────────────────────────────────────────┐  │
│  │ payee name (contact-tier)  คุณ ก████████      [ 🔓 unmask (reason+step-up · Finance) ]  │  │
│  │ bank acct (PAYMENT-INSTR)  SCB ····6 7 8 9    name-match: ● PromptPay ตรง 100%          │  │
│  │   → unmask เลขบัญชีเต็ม = ABAC exception "Finance-on-active-payout-item" (§8.4) 🔐       │  │
│  │ micro-deposit     ฿0.07 + ฿0.13  → echoed ✓    verify: ● matched (2569-06-13)          │  │
│  │ KYC doc (บัตร ปชช) 📄 [ 👁 view · encrypted ]   ● face-match  ● not on sanction list    │  │
│  │   → KYC unmask = DPO-approve เท่านั้น (sensitive group · Finance เห็นไม่ได้) [ ขอ DPO →]│  │
│  └──────────────────────────────────────────────────────────────────────────────────────┘  │
│  WHT / TAX profile:  type นิติบุคคล · WHT 3% applies · 50-tawi name = "บ.ริสเตรโต่ จก."     │
├────────────────────────────────────────────────────────────────────────────────────────────┤
│  TRUST-STATE PROGRESSION                                                                     │
│   CLAIMED ──✓──▶ IDENTITY_VERIFIED ──[you]──▶ FINANCE_VERIFIED ──▶ READY                     │
│   unlocks at FINANCE_VERIFIED:  ✓ fund escrow   ✓ issue redemptions   ✓ run quests          │
│   (จนกว่าจะถึง FINANCE_VERIFIED — escrow-fund + redemption ถูก HARD-BLOCK ที่ edge fn)       │
├────────────────────────────────────────────────────────────────────────────────────────────┤
│  DECISION   ◉ Approve → FINANCE_VERIFIED   ◯ Reject+reason   ◯ Request more (bank re-submit) │
│  note: [____________________________________________]                                       │
│  ⚠ Approve = step-up MFA (S*) · advances finance-trust · audited                            │
│                                          [ Cancel ]   [ Approve → FINANCE_VERIFIED  🔐 ]     │
└────────────────────────────────────────────────────────────────────────────────────────────┘
```

**Components:** SoD-check banner (Gate1 reviewer ≠ you) · bank/KYC panel (masked, **tiered ตาม §8.4 — table เดียว doc-wide**: contact+bank-acct(payment-instrument) = Finance unmask ได้ผ่าน ABAC exception "Finance-on-active-payout-item"; **KYC = DPO-approve เท่านั้น**) · name-match + micro-deposit verdict · WHT/50-tawi tax profile · **trust-state progression strip** ที่บอกชัดว่าอะไรปลดล็อกที่ FINANCE_VERIFIED · decision radio + step-up.

**Operator goal:** ยืนยันเงินเข้าบัญชีคนถูก → `FINANCE_VERIFIED`.

**System effect / state change:** **ไม่มี ledger txn ที่ขั้นนี้** (ยังไม่มีเงินไหล — escrow ยังว่าง). Approve → `merchant.trust_state = FINANCE_VERIFIED` + ผูก payout profile (bank, WHT, 50-tawi) ที่ Finance verify แล้ว. **ปลดล็อก (hard, ที่ edge fn ไม่ใช่ UI):** `fund_escrow` (PREFUND/PSP_SETTLE), `issue_redemption` (REDEEM), `run_quest`. ก่อนหน้านี้ทุกตัว block.

**SoD / step-up / PII / audit / SLA:**
- **SoD (hard):** banner `Gate1 reviewer ≠ you` — enforce DB-level; ถ้าระบบ route case มาให้คนเดิม → reject + re-route.
- **step-up:** Approve = `S*`.
- **PII (tiered — canonical = §8.4):** payee-name (contact) + **bank-account (payment-instrument)** = Finance unmask ได้ **ผ่าน ABAC exception "Finance-on-active-payout-item"** (reason+step-up+audit, ไม่ใช่ self-step-up ทั่วไป — ผูกกับ payout-item ที่ active) — **เข้ากับ §9.a (payout batch) เป็นกฎเดียวกัน, แก้ critique-major "payment-instrument tiering inconsistency §8.4 vs §9.a"**. **KYC doc / location-trajectory = DPO approve ต่อคำขอ** (CS/Finance เห็นไม่ได้) → `[ ขอ DPO → ]` สร้าง DPO unmask-request (ปลายทาง §11.1, ดู §8.4).
- **audit:** decision + micro-deposit verify + name-match + ทุก unmask → append-only.
- **SLA:** 48h (Gate 2); breach → escalate.

**Empty / loading / error / SLA-breach:**
- **empty:** "ไม่มีร้านรอตรวจการเงิน" (เฉพาะร้านที่ผ่าน Gate 1 แล้วเข้า queue นี้).
- **loading:** micro-deposit verify = polling spinner "รอ merchant echo ยอด".
- **error — name mismatch:** ● แดง `--danger` "ชื่อบัญชี ≠ ชื่อเจ้าของ" → บังคับ Reject หรือ Request-more, Approve disabled.
- **error — micro-deposit ไม่ echo:** state `AWAITING_MERCHANT` (SLA pause).
- **SLA-breach:** escalate ไป Finance lead; redemption ยังคง block (ป้องกัน premature unlock).

> **(c) Re-verify-on-bank-change (กัน account-takeover ดูด escrow):**
```
┌─ RE-VERIFY · BANK CHANGE  MV-2026-00471 ☕ Ristr8to ──────────  🔶 PAYOUT_FROZEN ───────────┐
│  trigger: merchant เปลี่ยน payout bank (SCB··6789 → KBANK··2210)  · 2569-06-14 10:05         │
│  STATE: PAYOUT_FROZEN (auto) — payout + escrow-withdraw paused until re-verify ผ่าน          │
│  ┌─ diff ──────────────────────────┐  cool-down: 24–72h ก่อนเข้า batch ใดๆ                  │
│  │ old  SCB ····6789  (verified)   │  out-of-band notify: ✓ SMS ✓ email ✓ LINE → owner      │
│  │ new  KBANK ····2210 (pending)   │  ⛔ SoD: ผู้ที่ approve bank-change ห้ามเป็นผู้ create/  │
│  └─────────────────────────────────┘     approve payout batch ที่จ่าย payee นี้ (cross-SoD)  │
│  bank-acct unmask (diff เต็ม) = ABAC exception "Finance-on-active-payout-item" (§8.4) 🔐     │
│  re-run: ● name-match ● micro-deposit ◐ KYC unchanged                                        │
│         [ Reject ]   [ Approve bank-change → unfreeze  🔐 step-up + 4-eyes ]                  │
└─────────────────────────────────────────────────────────────────────────────────────────────┘
```
- **System effect:** เปลี่ยน bank = `PAYOUT_FROZEN` (auto) — ระงับ payout/escrow-withdraw จนกว่า re-verify ผ่าน; **ไม่มี ledger edit** (เป็น state flag). Approve = step-up + **cross-SoD** (approver bank-change ≠ creator/approver ของ payout batch ที่จ่าย payee, enforce join `audit_log`→`payout_batches`) + **out-of-band notify ทุกช่อง** ก่อน payout แรกเข้าเลขใหม่. การดู diff เลขบัญชีเต็ม = ABAC exception เดียวกับ §8.2/§9.a (Finance-on-active-payout-item), audited.

---

### 8.3 Support/CS — Ticket Queue + Detail (taxonomy + state machine)

> **เป้าหมาย operator (Support/CS):** triage → ทำงาน → ตัดสิน → ปิดด้วย canonical txn (ถ้ามีเงิน). CS เห็นเฉพาะ city ใน scope (RLS).

```
┌─ ⚖ SUPPORT / CS ──────────────────────────────────────────────────────────────  [CNX▾]  me ─┐
│ QUEUES (city=CNX)         ┌─ TICKETS ─────────────────────────────────────────────────────┐ │
│ ▸ Q_MONEY    (8) 🔴P1×1   │ no.          cat            pri  status            SLA     $    │ │
│ ▸ Q_MERCHANT (3)          │ CNX-26-00123 burned_no_rew  P2🟠 PENDING_MONEY..⏳  03:11  ฿80  │ │
│ ▸ Q_AGENT    (2)→Finance  │ CNX-26-00124 wrong_amount   P2   IN_PROGRESS       18:40  ฿140 │ │
│ ▸ Q_AGT_APPEAL(2)→§8.3-AP │ CNX-26-00125 duplicate_chrg P1🔴 TRIAGED          ‼ -00:22 ฿520 │ │ ←SLA breach (--danger)
│ ▸ Q_PSP     (1) 🔴deadline│ CNX-26-00126 quest_progress P3   AWAITING_REPORTER ⏸pause  —    │ │
│ ▸ Q_QUEST   (4)           │ CNX-26-00127 review_dispute P3   TRIAGED →route S5  —     —    │ │
│ ▸ Q_REVIEW  (2)→S5        │ CNX-26-00128 burned_no_rew  P2   AWAITING_MERCHANT⏸ pause  ฿60  │ │
│ ▸ Q_PRIVACY (1)→DPO       │ AG-26-00031  agent_dispute  P2   TRIAGED →route §8.3-AP  —     │ │ ←appeal lane
│ ▸ Q_GENERAL (15)          │ ...                                                            │ │
│                           └────────────────────────────────────────────────────────────────┘ │
│ pri filter: ▣P1 ▣P2 □P3 □P4    ‼ = SLA breached (auto-escalated)   ⏸ = clock paused           │
└─────────────────────────────────────────────────────────────────────────────────────────────┘

── DISPUTE TAXONOMY → canonical txn (column-locked; CS ไม่คิด txn เอง) ────────────────────────
 D1 burned_no_reward → REFUND (reverse REDEEM, lot re-lock)  OR  GRANT goodwill
 D2 wrong_amount     → REFUND full → (opt) re-post REDEEM ยอดถูก
 D3 duplicate_charge → REFUND (redeem side) / CHARGEBACK (PSP side) / REFUND (subscription leg)
 D4 agent_payout     → AGENT_PAYOUT  *** Finance posts, CS ไม่ post ***  → route Q_AGENT
 D5 review_dispute   → ไม่มี ledger txn (content moderation)  *** route → S5 ***
 D6 psp_chargeback   → CHARGEBACK (+ RECOVERY/WRITE_OFF)  *** S4/S6 owns lifecycle ***  → Q_PSP
 D7 quest_progress   → Sparks (นอก ledger) / ถ้าชดเชยเป็น Coin = GRANT (ผ่าน gate goodwill เดียวกัน)
 D8 agent_dispute    → re-accrue→AGENT_PAYOUT (Finance) ถ้า OVERTURNED / no-txn ถ้า UPHELD  → §8.3-AP
```

```
┌─ CNX-2026-00123  ·  D1 burned_no_reward  ·  P2 🟠  ·  PENDING_MONEY_ACTION ────────────────┐
│ reporter: customer (ref usr_3b1•masked)  city CNX  channel in_app   fraud_score 0.12 ●low  │
│ linked_redemption_id: rdm_77c2  (REDEEM T#5521 · settled · 60 COIN · ☕ฟรีกาแฟ · ฿80 net)  │
│ SLA resolution ◷ 24h → 03:11 left  ●on-track                                               │
├─ TIMELINE (ticket_events · APPEND-ONLY) ────────────────────────────────────────────────── │
│  09:02 created (system_auto)                                                               │
│  09:05 assigned → you · Q_MONEY                                                             │
│  09:20 evidence_attached: receipt photo (hash 0x9f..) · merchant_pos_log                   │
│  09:31 note "ลูกค้าแจ้งร้านไม่ให้กาแฟ; POS log ไม่มี fulfilment record"                     │
│  09:40 status_change → PENDING_MONEY_ACTION                                                 │
├─ STATE MACHINE ──────────────────────────────────────────────────────────────────────────  │
│  NEW→TRIAGED→IN_PROGRESS→[PENDING_MONEY_ACTION]→RESOLVED→CLOSED                             │
│        branches: AWAITING_REPORTER ⏸ · AWAITING_MERCHANT ⏸ · ESCALATED · REJECTED          │
│  ▸ verdict (shared S1↔S5): ◉ merchant_at_fault  ◯ false_claim  ◯ inconclusive             │
├─ EVIDENCE ───────────────────────┬─ SUBJECT (PII masked ⊘) ──────────────────────────────  │
│  📎 receipt.jpg  hash✓ unique     │  name ก****  ·  08x-xxx-1133  ·  k***@gmail.com         │
│  📎 pos_log.json  (no fulfilment) │  [ 🔓 Unmask (reason + step-up) ]   → §8.4              │
├──────────────────────────────────┴───────────────────────────────────────────────────────  │
│  [ Reply to reporter ]  [ → AWAITING_MERCHANT (LINE 1-tap) ]  [ Escalate ]  [ RESOLVE → 💰 ]│ → §8.3-RES
└─────────────────────────────────────────────────────────────────────────────────────────────┘
```

**Components:** queue sidebar (per-queue count + P1/breach badge + route-target สำหรับ Q_REVIEW→S5, Q_AGENT→Finance, Q_AGT_APPEAL→§8.3-AP, Q_PRIVACY→DPO) · ticket table (no/cat/pri/status/SLA/$ + ‼ breach + ⏸ pause) · taxonomy→txn reference strip (D1–D8) · ticket header (linked_redemption + fraud_score) · **append-only timeline** · state-machine strip + verdict radio (shared dispute_verdict) · evidence list (hash-dedup) · masked subject + unmask · action bar.

**Operator goal:** จัดการ case → RESOLVED ที่ถูกต้องตามฝั่งความผิด + canonical txn.

**System effect / state change:** ส่วนใหญ่เป็น `status_change` + `ticket_events` (append-only). **เงินเกิดเฉพาะที่ RESOLVE panel** (§8.3-RES). `AWAITING_*` = **pause SLA clock**. Route Q_REVIEW → S5 (content, ไม่แตะ ledger); Q_AGENT/Q_PSP → Finance (CS ไม่ post txn เงิน); **Q_AGT_APPEAL → §8.3-AP** (SoD reviewer ≠ rejecting moderator).

**SoD / step-up / PII / audit / SLA:**
- **SoD:** CS **ไม่มี** `create_payout`/`approve_payout`; agent-payout/baht-refund → Finance. Q_PRIVACY → DPO (CS route ออกทันที). **agent_dispute → reviewer ≠ rejecting moderator (§8.3-AP).**
- **PII:** subject masked default; timeline + evidence ไม่อุ้ม PII ตรง (`subject_user_ref` pseudonymous).
- **audit:** ticket_events + dispute_verdicts append-only (ห้าม UPDATE/DELETE).
- **SLA:** P1 1h/8h · P2 4h/24h · P3 12h/72h · P4 24h/best-effort; clock pause ที่ AWAITING_*; breach → `sla_breach` + auto-escalate (S1.6).

**Empty / loading / error / SLA-breach:**
- **empty:** "ไม่มี ticket ใน queue นี้" + ลิงก์ Q_GENERAL.
- **loading:** table skeleton rows; evidence thumb spinner.
- **error — linked entity หาย:** banner "redemption ผูกไม่พบ — ตรวจ ledger ก่อน RESOLVE" → RESOLVE disabled.
- **SLA-breach:** row `‼ -00:22` แดง `--danger` + auto `ESCALATED` + page lead.

> **(AP) Agent-dispute (appeal) review — reviewer ≠ rejecting moderator (NEW · ปิด Handoff Chain D):**
> **ปลายทางของ §10.3 appeal** (`support_tickets(kind='agent_dispute')`). เดิม submit แล้ว "หายเข้า phone" — ไม่มีจอ back-office รับ. ที่นี่คือ inbox ของ Q_AGT_APPEAL + จอตัดสิน, **บล็อก rejecting moderator เป็น reviewer (SoD guard เหมือน §7.2).**
```
┌─ AGENT APPEAL · AG-2026-00031 ──────────────────────────  reviewer: you (mod_8120) ─────────┐
│  ⛔ SoD: rejecting moderator = mod_7731 · you = mod_8120  ● OK (≠)  [ถ้า == → Approve/Uphold │
│      ปุ่มถูก disable + "คุณคือผู้ปฏิเสธเดิม — ส่งให้ผู้ตรวจอื่น" + auto re-route]              │
│  appeal by agent A-220 · against proposal CP-9921 (rejected 06-12 · reason=blurry_photo)     │
│  SLA: appeal-review ◷ 72h → due in 40:12  ●on-track                                          │
├──────────────────────── ORIGINAL (read-only) ────────────────────────────────────────────────┤
│  proposal CP-9921 · place pl_9af2 · submitted photo [👁] EXIF/GPS/pHash chips:               │
│     ● fresh-camera  ◐ GPS 95m (>80m ⚠)  ● EXIF intact  ● pHash unique                        │
│  rejection reason_code: blurry_photo · moderator note: "อ่านป้ายไม่ออก"                       │
│  agent appeal text: "ป้ายชัด ถ่ายมุมเดิม GPS เพี้ยนเพราะตึกบัง — แนบรูปเพิ่ม [👁]"            │
├──────────────────────────────────────────────────────────────────────────────────────────────┤
│  DECISION:  ◉ OVERTURN (กลับคำ)    ◯ UPHOLD (ยืนผลเดิม)                                        │
│   • OVERTURN → apply_proposal(CP-9921) (service_role, version++) + re-accrue agent quality   │
│       + ถ้าค่าตอบแทนค้าง → AGENT_PAYOUT (Finance posts — CS/mod ไม่ post)  → route Q_AGENT     │
│   • UPHOLD   → ไม่มี ledger txn · close appeal + แสดงเหตุผลให้ agent (§10.3 card 'upheld')     │
│  note (required): [_____________________________________________________________________]      │
│  ⚠ OVERTURN = step-up MFA (เขียน live place ผ่าน apple_proposal) · audited                    │
│                                    [ Cancel ]      [ Submit decision → 🔐 ]                    │
└────────────────────────────────────────────────────────────────────────────────────────────────┘
```
- **System effect:** **OVERTURN** → `apply_proposal()` (single live writer, version++ + places_history snapshot) + restore `agent.quality_score`/accept-rate + ถ้ามีค่าตอบแทนค้าง → **route Q_AGENT ให้ Finance post `AGENT_PAYOUT`** (mod/CS ไม่ post — SoD). **UPHOLD** → **ไม่มี ledger txn**, close + reason กลับ §10.3 card. ทุกผล → `ticket_events` + `audit_log` append-only.
- **SoD:** reviewer ≠ moderator ที่ reject เดิม (DB CHECK + UI guard: ถ้า viewer == rejecting moderator → Overturn/Uphold disabled + auto re-route). **step-up:** OVERTURN = `S*` (เขียน live place). **SLA:** 72h; breach → escalate moderation lead.
> *(จอ moderation-author-side ของ appeal เต็มรูป อาจ render ใน §7 ได้ — แต่ "queue lane + route-target + SoD-guarded decision" อยู่ที่นี่ตาม completeness fix.)*

---

### 8.3-RES  Resolution panel — compensation strictly via canonical ledger txn

> **เป้าหมาย operator:** ออกการชดเชยที่ถูกต้อง **ผ่าน canonical txn เท่านั้น** — ไม่มี balance edit. CS มี 3 เครื่องมือ: **(1) REFUND** (กลับ REDEEM ที่ settled, lot re-lock), **(2) GRANT goodwill** (funder `sponsor:platform_goodwill`), **(3) baht refund** (→ Finance, CS ไม่ post).

```
┌─ RESOLVE  CNX-2026-00123  D1 burned_no_reward ──────────────────────────────────────────────┐
│  verdict: merchant_at_fault ✓ (recorded)   consumer-protect default → REFUND                 │
│                                                                                              │
│  CHOOSE CANONICAL TXN (no ad-hoc edit):                                                       │
│  ◉ (1) REFUND  reverse REDEEM T#5521 "ทั้งก้อน" (stored amounts, no recompute)                │
│  ◯ (2) GRANT goodwill   funder = sponsor:platform_goodwill   (ไม่มี REDEEM ให้กลับ)           │
│  ◯ (3) Baht refund      → route Finance (CS post ไม่ได้ — SoD)                                │
│ ┌─ PREVIEW POSTING  (A.6(6), reverses_txn_id=T#5521, one_reversal_per_target) ─────────────┐ │
│ │ txn_type=REFUND  ref_type=reversal  idempotency=hash('REFUND',T5521,CNX-26-00123)        │ │
│ │  Dr user_coin(usr_3b1)        60 COIN  lot L1 (expires=REFUND_EXPIRY, +30d grace)         │ │
│ │  Cr coin_liability(platform)  60 COIN  lot L1                                             │ │
│ │  Dr platform_revenue          take฿    (stored)                                          │ │
│ │  Dr merchant_payable(R)       net฿     (stored)                                          │ │
│ │  Cr coin_backing(funder,L1)   60 COIN                                                     │ │
│ │  → lot L1.remaining += 60; state=active                                                  │ │
│ │ ⚠ PRECONDITION: merchant_payable(R) ถูก PAYOUT แล้ว → MERCHANT_CLAWBACK (S4) ก่อน,        │ │
│ │    มิฉะนั้น REFUND BLOCK (ไม่ปล่อย merchant_payable ติดลบ — hard precondition)            │ │
│ ├─ GATES (must all pass) ──────────────────────────────────────────────────────────────────┤ │
│ │  ● fraud-gate: fraud_score 0.12 < 0.40 threshold          ● PASS                         │ │
│ │  ● goodwill cap: n/a (REFUND ไม่ใช่ goodwill)                                             │ │
│ │  ● value vs threshold: ฿80 < ฿500 / 2,000 COIN → step-up NOT required, single CS ok      │ │
│ │  ● maker-checker: not required (≤ threshold)                                              │ │
│ │  ● one_reversal_per_target: no prior reversal on T#5521  ● PASS                          │ │
│ └──────────────────────────────────────────────────────────────────────────────────────────┘ │
│                                   [ Cancel ]      [ Post REFUND → cs_refund() ]               │
└──────────────────────────────────────────────────────────────────────────────────────────────┘

── after post ───────────────────────────────────────────────────────────────────────────────
┌─ ✅ RESOLVED ────────────────────────────────────────────────────────────────────────────────┐
│  resolution_ledger_txn_id:  T#5611  [ 🔗 view in ledger ]   ← ผูกกลับ ticket (CHECK บังคับ)   │
│  ticket.status → RESOLVED · resolution_type=refund_redeem · lot L1 re-locked, expires +30d    │
│  ticket_events += money_action {ledger_txn_id:T5611, by:you, ts}                              │
└───────────────────────────────────────────────────────────────────────────────────────────────┘
```

**GRANT goodwill variant (เมื่อเลือก (2) — funder = third-party → gates เข้มขึ้น):**
```
┌─ (2) GRANT goodwill  → cs_grant_goodwill() ─────────────────────────────────────────────────┐
│ txn_type=GRANT  funded_by='sponsor:platform_goodwill'  ref_type=coin_grant                   │
│   idempotency=hash('GOODWILL',ticket_id)   FOR UPDATE on escrow_wallets(sponsor:goodwill)     │
│  Dr sponsor_budget(sponsor:platform_goodwill)   X COIN  THB                                   │
│  Cr coin_backing(platform, sponsor:goodwill)    X COIN  THB                                   │
│  Dr user_coin(user)                             X COIN  (lot Lg, expires=+EXPIRY)             │
│  Cr coin_liability(platform)                    X COIN                                        │
│ ┌─ GATES (third-party funder → step-up + 4-eyes ALWAYS, ไม่ว่าจำนวน) ───────────────────────┐ │
│ │ ● settled_available(sponsor:goodwill) ≥ X         (A.8.11 — settled THB ค้ำก่อน mint)      │ │
│ │ ● goodwill cap per-user/window: 1/3 used      ● per-CS daily cap: ฿320/฿1,000             │ │
│ │ ● per-city goodwill ceiling: 12% used (กัน budget แห้งทั้งเมือง)                          │ │
│ │ ● fraud-gate: fraud_score < threshold + no has_false_claim_flag (anti-farming)           │ │
│ │ ● solvency: sponsor:goodwill not frozen by S6 (A.8.5 per-funder)                          │ │
│ │ 🔐 step-up MFA (S*)   👥 dual-control: CS maker + lead/Finance checker (REQUIRED)          │ │
│ └────────────────────────────────────────────────────────────────────────────────────────┘ │
│   maker: you (cs_88)   checker: [ assign lead ▾ ]        [ Submit for approval → ]            │
└──────────────────────────────────────────────────────────────────────────────────────────────┘
```

**Components:** txn-type radio (REFUND / GRANT-goodwill / baht-refund→Finance) · **read-only posting preview** (double-entry legs, stored amounts, idempotency_key) · gates panel (fraud / cap / value-threshold / maker-checker / one_reversal) · maker-checker assign · post button → edge fn. Post-state: `resolution_ledger_txn_id` chip + 🔗 ledger link.

**Operator goal:** ชดเชยถูกต้องผ่าน canonical txn จริง, ปิดวง audit.

**System effect / state change:**
- **(1) REFUND** → `cs_refund()` posts A.6(6) reversal (stored amounts, `reverses_txn_id=T_redeem`, lot re-lock, `REFUND_EXPIRY = max(L1.expires, now+30d)`). ผูก `resolution_ledger_txn_id`. **ถ้า merchant_payable ถูก payout แล้ว → MERCHANT_CLAWBACK (S4) เป็น hard precondition, REFUND block จนกว่า claw สำเร็จ.**
- **(2) GRANT goodwill** → `cs_grant_goodwill()` posts `GRANT funded_by='sponsor:platform_goodwill'` (settled THB ค้ำ 1:1, lot+expiry, A.8.12 ไม่ trip เพราะ funder ≠ ร้าน). ผูก `resolution_ledger_txn_id`.
- **(3) Baht refund** → **route Finance** (REFUND/CHARGEBACK Dr ... / Cr bank_settlement; CS ไม่ post — SoD).
- ทุกตัวเขียน `ticket_events(money_action)` + ปิด ticket → RESOLVED (CHECK บังคับ `resolution_ledger_txn_id NOT NULL`).

**SoD / step-up / PII / audit:**
- **step-up:** money > 500฿/2,000 COIN = `S*`; GRANT third-party funder = `S*` **เสมอ** (เงิน funder ≠ เงินแพลตฟอร์ม).
- **maker-checker:** ≤ threshold REFUND = CS เดี่ยว (audited); > threshold + goodwill = maker ≠ checker (lead/Finance); baht-refund checker = Finance (เหมือน approve_payout).
- **fraud-gate + cap:** ก่อน goodwill เสมอ (per-user/per-CS-daily/per-city ceiling + fraud_score + false_claim_flag).
- **audit:** posting + gates + step_up_ref → audit_log + ticket_events append-only.

**Empty / loading / error:**
- **loading:** "กำลัง post txn… อย่าปิดหน้าจอ" (money-action, neutral spinner, ปุ่ม lock — กัน double-post; idempotency_key กัน replay).
- **error — REFUND blocked (payout แล้ว):** banner ochre `--warning` "ต้อง MERCHANT_CLAWBACK (S4) ก่อน — เปิดคำขอ clawback" + REFUND disabled.
- **error — goodwill cap/budget แห้ง:** "เกิน cap ต่อ city/วัน — ต้อง lead approve หรือ Finance เติมงบ goodwill".
- **error — fraud-gate fail:** "fraud_score เกินเกณฑ์ — goodwill ระงับ, escalate fraud_case" (กัน farming) — **ไม่มีทางลัดแก้ยอดมือ**.
- **error — solvency freeze:** "GRANT(goodwill) per-city ถูก S6 freeze — รอ recon เคลียร์".

---

### 8.4 PII Unmask control — tiering (single source) + justification + audit + step-up

> **เป้าหมาย operator:** เห็นค่า PII จริง **เฉพาะเท่าที่จำเป็น** ต่อ case จริง — default masked, unmask = active ticket + reason_code + justification + step-up + audit, time-boxed. **§8.4 = single source of PII-tiering ของทั้ง doc admin** (§8.2/§9.a อ้างตารางนี้ ไม่ตั้งกฎเอง — แก้ critique-major "tiering inconsistency").

**PII tiering table (canonical — doc-wide):**

| field category | tier | ใครเห็นได้ / เงื่อนไข | gate |
|---|---|---|---|
| ชื่อจริง · เบอร์ · email (contact) | **contact** | CS / Finance / Moderator | active ticket + reason_code + justification + **self step-up** + audit, time-boxed |
| **bank account / payment instrument** | **payment-instrument** | **Finance เท่านั้น** บน payout-item ที่ active | **ABAC exception "Finance-on-active-payout-item"** — reason+justification+step-up+audit (ไม่ใช่ self-step-up ทั่วไป; ผูกกับ payout-item/bank-change/Gate2 ที่ active) — **กฎเดียวกัน §8.2/§8.2c/§9.a** |
| KYC doc (บัตร ปชช / passport) | **sensitive** | **DPO approve ต่อคำขอ** (CS/Finance เห็นไม่ได้แม้มี ticket) | route Q_PRIVACY → DPO unmask-request (§11.1) |
| location trajectory | **sensitive** | DPO approve ต่อคำขอ | route Q_PRIVACY → DPO |
| legal/court-ordered | **sensitive** | DPO approve + legal_request reason | route Q_PRIVACY → DPO |

> **เหตุผลของ ABAC exception (payment-instrument):** Finance ต้องเห็นเลขบัญชีเต็มเพื่อ verify name-match/micro-deposit (Gate 2) และ diff bank-change/payout-batch (§9.a) — งานนี้ทำไม่ได้ถ้า DPO-only เด็ดขาด. จึงนิยาม exception **แคบ**: ปลดได้เฉพาะเมื่อมี **active payout-item / Gate2 / bank-change** ผูกกับ payee นั้น (ABAC predicate `actor.role=Finance AND target.payout_item.status=active AND target.payee=subject`), audited+step-up+rate-limited+DPO-monitored เหมือน contact tier. **KYC/identity-document ยังคง DPO-only** (ต่างจาก payment-instrument). นี่คือกฎเดียวที่ §8.2, §8.2c, และ §9.a ต้องอ้าง — ไม่มี surface ใด self-unmask payment-instrument นอก predicate นี้.

```
┌─ 🔓 UNMASK PII ·  CNX-2026-00123  (active: PENDING_MONEY_ACTION ✓) ──────────────────────────┐
│  ⓘ default = masked (ABAC PII_MASK). การ unmask ถูกบันทึก audit + แจ้ง DPO oversight          │
│                                                                                               │
│  fields (data-minimization — ⊆ minimum-necessary ของ category):                              │
│   ▣ ชื่อจริง        (currently: ก****)            tier=contact · self step-up                  │
│   ▣ เบอร์โทร        (currently: 08x-xxx-1133)     tier=contact · self step-up                  │
│   □ อีเมล           (currently: k***@gmail.com)   tier=contact · self step-up                  │
│   ⊘ บัญชีธนาคาร      — Finance-only (ABAC payout-item) · CS unmask ไม่ได้                       │
│   ⊘ บัตร ปชช / KYC   — DPO approve เท่านั้น (sensitive) [ ขอ DPO → สร้าง unmask-request ]      │
│   ⊘ location trajectory — DPO เท่านั้น [ ขอ DPO → ]                                            │
│                                                                                               │
│  reason_code (required):  [ ◉ verify_identity  ◯ locate_redemption  ◯ psp_dispute_doc        │
│                            ◯ refund_payee  ◯ legal_request ]                                  │
│  justification (required, free-text, audited): [_________________________________________]   │
│                                                                                               │
│  ⏱ time-boxed: เห็นได้ 60 นาที หรือจน ticket ออกจาก active state (แล้วแต่ถึงก่อน)             │
│  🔐 step-up MFA required (S* — export_pii/unmask class)                                       │
│  📋 จะบันทึก: {who, ticket, fields, reason_code, justification, IP, device, step_up_ref, ts} │
│                                       [ Cancel ]      [ Verify (step-up) → Reveal 🔐 ]        │
└───────────────────────────────────────────────────────────────────────────────────────────────┘

── DPO unmask-request (เมื่อกด [ ขอ DPO → ] บน sensitive field) ───────────────────────────────
┌─ ✉ ส่งคำขอ DPO unmask · field=KYC_doc · CNX-2026-00123 ────────────────────────────────────┐
│  สร้าง object: pii_unmask_request {requester, role, field_category, reason_code,             │
│       justification, active_ticket_id, ts, status='PENDING_DPO'}  → route Q_PRIVACY          │
│  ปลายทาง: DPO 'Pending Unmask Requests' approval queue (§11.1 — DPO approve/deny + step-up)  │
│  สถานะที่นี่: PENDING_DPO (ฟิลด์ยังคง ⊘) · จะปลดเมื่อ DPO อนุมัติ (time-boxed เช่นกัน)        │
│                                          [ Cancel ]   [ ส่งคำขอ DPO → ]                       │
└─────────────────────────────────────────────────────────────────────────────────────────────┘

── after reveal (time-boxed banner persists) ─────────────────────────────────────────────────
┌─ ⏱ UNMASKED · expires 14:32 (47m) ────────────────────────────────────────────────────────┐
│  ชื่อ: กานต์ ใจดี · 089-221-1133 · audit_log #aud_77c91 written · DPO notified ●            │
│                                                            [ Re-mask now ]                   │
└─────────────────────────────────────────────────────────────────────────────────────────────┘
```

**Components:** active-ticket guard banner · field checklist (data-minimization, **tier ต่อ field**: contact=self-step-up / payment-instrument=Finance-ABAC / sensitive=DPO ⊘ → `[ ขอ DPO → ]`) · reason_code radio (fixed enum) · justification free-text (required) · time-box notice · step-up button · **DPO unmask-request composer** (สร้าง `pii_unmask_request` → Q_PRIVACY → §11.1) · post-reveal banner w/ countdown + re-mask + audit ref.

**Operator goal:** เห็น PII จริงเท่าที่จำเป็นต่อ case, ทิ้ง trail ครบ.

**System effect / state change:** **ไม่มี ledger txn**. เขียน `audit_log` + `ticket_events(pii_unmask)` (append-only) + set `ticket.pii_unmasked=true` + reveal time-boxed (60m หรือ exit active state). **ไม่เปลี่ยนข้อมูล subject ใดๆ** (อ่านอย่างเดียว). **กด [ ขอ DPO → ]** → สร้าง `pii_unmask_request {status=PENDING_DPO}` route Q_PRIVACY (ปลายทาง approve = §11.1 DPO queue, **cross-section dependency** — ฝั่ง §8 จบที่สร้าง request object + แสดง PENDING_DPO; approve/deny surface = §11.1 ต้องวาด).

**SoD / step-up / PII / audit:**
- **guard (ABAC PII_MASK):** ต้อง `ticket.status ∈ {IN_PROGRESS, PENDING_MONEY_ACTION, AWAITING_*}` + reason → ถ้าไม่มี active ticket = unmask ไม่ได้เลย.
- **step-up:** `S*` เสมอ (class export_pii/unmask).
- **tiered sensitivity (= ตาราง canonical ด้านบน):** contact = self step-up; **payment-instrument = Finance-on-active-payout-item ABAC exception** (ไม่ self-unmask นอก predicate); **KYC / location-trajectory / legal = DPO approve ต่อคำขอ** (route Q_PRIVACY → §11.1) — CS เห็นไม่ได้แม้มี ticket.
- **data-minimization:** `fields ⊆ MINIMUM_NECESSARY(category)` (PDPA C.4).
- **DPO oversight:** ทุก unmask อยู่ใน immutable audit_log ที่ DPO ตรวจ; **rate-limit ต่อ CS/วัน + alert DPO ถ้า CS unmask spike** (กัน insider-threat data-harvesting). DPO unmask-request = approval inbox (§11.1), แยกจาก after-the-fact "Unmask Review" monitoring.

**Empty / loading / error:**
- **error — no active ticket:** "unmask ต้องมี case ที่ active — เปิด/รับ ticket ก่อน" (ปุ่ม disabled).
- **error — sensitive field:** "ฟิลด์นี้ต้อง DPO อนุมัติ" → ปุ่ม [ ขอ DPO → ] เปิด composer สร้าง `pii_unmask_request` → Q_PRIVACY.
- **error — payment-instrument นอก predicate:** "เลขบัญชีปลดได้เฉพาะ Finance บน payout-item ที่ active" (CS เห็นปุ่ม disabled + เหตุผล).
- **error — step-up fail:** "ยืนยันตัวตนไม่สำเร็จ — ลองใหม่"; ไม่ reveal, log attempt.
- **error — rate-limit:** "วันนี้ unmask ครบโควต้า — DPO ได้รับแจ้งแล้ว".
- **loading:** "กำลังยืนยัน step-up…" neutral spinner.
- **edge — auto re-mask:** เมื่อ ticket ออก active state หรือ 60m → ค่ากลับเป็น masked อัตโนมัติ + banner "re-masked (time-box หมด)".

---

### 8.5 Critique disposition — verify-support scope (รับ / ปฏิเสธ + เหตุผล)

**รับเข้า (fold-in) — แก้ในสเปก §8 นี้:**

| # | severity | ประเด็น (critique) | แก้ที่ §8 |
|---|---|---|---|
| 1 | critical (completeness) | Disputed-claim dedupe resolution screen หาย (§8.1 sidebar 🔶 มีแต่ banner) | **§8.1-D ใหม่** — side-by-side claimant, evidence-strength, decision (grant A/B / reject both / escalate), `dedupe_state=CLEARED` ปลดบล็อก Gate 1, SoD reviewer≠code-issuer, step-up+audit |
| 2 | critical (completeness) | Handoff Chain D — agent appeal landing (reviewer≠rejecting moderator) ไม่มีจอ back-office | **§8.3-AP ใหม่** + Q_AGT_APPEAL lane + D8 taxonomy — OVERTURN→apply_proposal+re-accrue→AGENT_PAYOUT(Finance) / UPHOLD no-txn, SoD guard (disable+re-route ถ้า viewer==rejecting mod), step-up |
| 3 | critical (completeness) | Handoff — DPO-tier unmask approval **request** (ฝั่ง §8: `[ ขอ DPO → ]` ชี้ไปไหน) | §8.2/§8.4 — กด `[ ขอ DPO → ]` สร้าง `pii_unmask_request{PENDING_DPO}` route Q_PRIVACY + แสดง state; **destination approve queue = §11.1 (cross-section forward, ดู reject)** |
| 4 | major (logic) | PII tiering inconsistency — payment-instrument (§8.4 vs §9.a self-step-up) | §8.4 tiering table = single source + นิยาม **ABAC exception "Finance-on-active-payout-item"** (predicate แคบ) ให้ §8.2/§8.2c/§9.a อ้างกฎเดียว; KYC ยัง DPO-only |
| 5 | minor (logic) | State-color token drift (§8 vs §9 vs doc 06) | header §8 — อ้าง doc 06 §1.2 token **โดยชื่อตัวแปร** (`--success/--warning/--danger/--hold`) ไม่ re-pin hex; ตรวจแล้ว `success #2BA84A`+`hold #7A8290` ตรง doc 06 §1.9 canonical; Coin gold แก้เป็น `#C9962A` ตาม §1.2 (ไม่ใช่ `#C8881C`) |

**ปฏิเสธ / นอกขอบเขต §8 (เหตุผล + ปลายทางที่ต้องแก้ — กันหล่นหาย):**

| ประเด็น (critique) | severity | ปลายทาง | เหตุผล |
|---|---|---|---|
| SoD Change-Proposal approval ownership (CityMgr) | critical | **§7.1 matrix + §11.2.c** | content-lane SoD; §8 ไม่ถือ change_proposal approve — มาตัด CityMgr ●→○ ที่ matrix §7 + accessControlProvider |
| Freeze override role mismatch (P.Admin vs dual-Owner) | major | **§7.1 matrix + §9.d** | freeze capability split = §7/§9; §8 ไม่มี freeze control |
| Manual-freeze step-up + form หาย | major / minor | **§9.d** | freeze write = Finance/§9; §8 อ้าง solvency-freeze เป็น read-only gate เท่านั้น |
| Audit severity payout.approve under-weighted | minor | **§11.1.d** | audit-severity taxonomy = DPO console §11; §8 เพียง emit audit_log |
| **DPO 'Pending Unmask Requests' approve queue** (รับ+อนุมัติ) | critical | **§11.1 (DPO console)** | §8 สร้าง request (fold #3) แต่ **จอ approve/deny** = DPO console — ต้องวาดที่ §11.1 (แยกจาก monitoring "Unmask Review"). §8 ทำฝั่งต้นทางครบแล้ว |
| Brand/Sponsor home + Sponsor Campaigns | critical | **§7/§11 (Brand role)** | นอก verify-support role surface |
| Settings · Roles (role.grant + SoD-at-grant) | major | **§11.4 / Settings** | RBAC provisioning = ที่ที่ตั้ง SoD ของ Gate1≠Gate2; §8 *บริโภค* SoD นี้แต่ไม่ provision |
| Owner / P.Admin role home | major | **§7/§11** | นอก verify-support |
| Media Pending queue+detail | major | **§7 (moderation)** | media lane = moderation §7, ไม่ใช่ verify/support |
| CityMgr Support-Tickets read-view / Analyst read-views | major | **§11.2 / §11.3 + §7.1 matrix** | scope-filtered read = role console ปลายทาง; §8.3 คือ CS-owned queue (RLS city) ไม่ใช่ CityMgr read-view |
| DPO blocker drill-down reachability (Chain C) | minor | **§11.1.a** | DPO erasure gate = §11; §8 เป็นเจ้าของ ticket/fraud record ที่ถูกชี้ (read-only view fine) |
| Cross-border SCC/DPA registry | minor | **§11.1 (DPO nav)** | DPO console |
| §10.2 "นี่ไม่ใช่ร้านของฉัน (report)" confirm/handoff | minor | **§10.2 + §8 (รับปลายทาง)** | จอ confirm/success = §10 consumer/merchant; **ปลายทาง back-office** = สร้าง `support_ticket(merchant_onboarding)` หรือ agent-attribution flag → เข้า **Q_MERCHANT (§8.3)** หรือ §8.1-D ถ้าชน claim — §8 รับเป็น ticket lane ที่มีอยู่แล้ว, จอ confirm อยู่ §10 |

> **หลักการ filter §8:** รับ finding ที่เป็น *verify/support/dispute surface, ticket lane, dedupe verdict, PII-tiering canonical, compensation-via-canonical-txn, SoD ภายในสาย verify/CS/agent-appeal*. ส่งต่อ finding ที่เป็น *freeze/solvency write (§9), role-matrix/RBAC provisioning (§7/§11), DPO approve/audit-taxonomy console (§11), brand/owner/analyst/CityMgr home (§7/§11), consumer/merchant confirm screen (§10)*. ทุก reject ระบุปลายทาง.

---

> **สรุปการผูกกับ canonical (ปิดวง audit ทั้ง section):** ทุก money-moving action จาก §8.3-RES = canonical txn (`REFUND`/`GRANT`/baht-refund→Finance) + agent-appeal OVERTURN→AGENT_PAYOUT (Finance posts) + บังคับ `resolution_ledger_txn_id NOT NULL` ก่อนเข้า RESOLVED (CHECK) + 🔗 ลิงก์กลับ ledger. Gate 1 / §8.1-D dedupe / Gate 2 / agent-appeal UPHOLD / unmask = **state/flag/audit เท่านั้น ไม่มี ledger txn**. **ไม่มีจุดใดในทั้ง section ที่แก้ balance มือ** — เป็น invariant ที่ enforce ทั้ง UI (no edit affordance), edge fn (canonical posting only), และ DB (CHECK + append-only + RLS + ABAC). **PII tiering = §8.4 ตารางเดียว** (contact / payment-instrument-ABAC-exception / DPO-sensitive) ที่ §8.2/§8.2c/§9.a อ้างร่วม — ไม่มี surface ใดตั้งกฎ unmask เอง.

---

## 9. Finance/Payout & Observability/Reconciliation Console

> **Surface:** Back-office console (web, **Next.js + Refine**, desktop-first, คีย์บอร์ด-heavy) · **Roles ที่เข้าได้:** `Finance/Payout` (สร้าง batch, recon, break, manual-freeze) · `Platform Owner` (approve/release, override freeze, write-off, solvency-override — **ฝั่งอนุมัติของ dual-Owner**) · `City/Regional Manager` (approve batch ใน city scope) · `Content Moderator` (fraud triage soft) · `DPO` (fraud cluster ที่แตะ PII, dual-control) · `Analyst` (read-only — solvency/recon/dashboard) · `Platform Admin` (**view + manual-freeze only — ปลด/override freeze ไม่ได้**, ดู 9.d) — Role+Scope+ABAC, enforce ที่ Postgres RLS + Edge Fn, UI ซ่อนปุ่มเป็น UX-only.
> **อ้าง canonical:** S4 (Payout/Settlement/Tax) + S6 (Observability/Recon/DR) ใน doc 03 · ledger A2 (CoA/txn_type/invariant/SEAM) ใน doc 02b · token/สี/typography = **doc 06 §1 (Lanna-modern)**. **admin = denser variant** ของ design system เดียวกัน (doc 06 §1.9 "merchant/counter/admin = web pattern, ไม่มี bottom nav").
>
> **กฎ money-integrity ที่ทุกจอ section นี้ต้องสื่อชัด (locked):**
> 1. **ไม่มี ad-hoc balance edit ที่ใดเลย** — ทุกการเคลื่อนเงิน = canonical ledger txn (`PAYOUT` / `AGENT_PAYOUT` / `AGENT_CLAWBACK` / `MERCHANT_CLAWBACK` / `RECOVERY` / `WRITE_OFF` / `WHT_REMIT` / `VAT_REMIT`); break ปิดด้วย **adjustment txn (append-only)** ไม่ใช่แก้ cache (A.8.9/A.8.6). ทุก mint/value-move route ผ่าน **edge fn เดียว** (SEAM-1) — console ไม่มีประตูหลัง.
> 2. **SoD เด็ดขาด:** creator ≠ approver (DB CHECK `sod_creator_ne_approver`) + **cross-action SoD** (คน approve bank-change ใน cool-down 72h ห้าม create/approve batch ที่จ่าย payee นั้น — S4.6.1a / SEAM-3). solvency-override = **dual Owner (2 คน) + step-up ซ้อน** (A2.10-#7 / S4-7).
> 3. **step-up MFA (aal2)** บังคับบน **ทุก** high-impact write: approve/release batch, approve WHT/VAT remit, override freeze, **manual freeze ทุก scope**, write-off, เปลี่ยน payout bank. PII (เลขบัญชี/ชื่อ payee) **masked by default**; unmask ต้อง reason + audit + step-up — และ **payment-instrument/KYC อยู่ใต้ tiering ของ §8.4 (DPO-gated)** ยกเว้น Finance-on-active-payout-item (ดู 9.a, exception ที่ declare แล้ว).
> 4. **ตัวเลขเงิน = `--ink-900` `#221B12` tabular** (Inter Tabular Nums 600 — doc 06 §1.3; **ไม่ใช่ gold**), single-currency-per-field (`฿ THB` xor `COIN`, ห้ามปนช่อง), ห้ามคำว่า "ถอน/withdraw/cash-out". สอดคล้อง doc 06 §1.2/§1.7.
> 5. **ทุก state transition → `audit_log`** (actor, before/after, MFA assertion id, ip/device), immutable, ผูก `ledger_transactions.created_by`. **money-out events (`payout.approve` / batch release / `WHT_REMIT` / `VAT_REMIT` / `WRITE_OFF`) = severity `high`** ใน audit taxonomy — surface เคียง `pii_unmask` / `erasure.execute` ใน DPO/Owner oversight (§11.1.d).
>
> **สี state (อ้าง doc 06 §1.2 semantic token table — by variable name, ไม่ re-pin hex):**
> ทุกจอ §9 ใช้ token กลางของ doc 06 §1.2: `--success` (`#2BA84A`) · `--warning` ochre (`#C77A0F`) · `--danger` (`#D64545`) · `--info`/jade (`#1E8E7E`) · `--hold` slate-neutral (`#7A8290`). draft/idle ใช้ slate `--hold`-family. **ไม่ re-pin hex ในจอ §9** — ดึงจาก token เดียว เพื่อ admin/consumer surface ไม่ drift (แก้ critique state-color drift §8/§9/doc 06; success/hold ยืนยันตรง doc 06 canonical แล้ว). ตัวเลขเงิน = `--ink-900` เสมอ (ไม่แตะ gold/jade — gold สงวนที่ Coin icon ฝั่งผู้ใช้).
>
> **Console shell (ร่วมทุกจอ — Refine layout):**
> ```
> ┌──────────────────────────────────────────────────────────────────────────────────────┐
> │ ◆ Soi Hop · BACK-OFFICE      [city: CNX ▾]   [ค้นหา ⌘K]      ● fin-01 · Finance/Payout │  ← top-bar: scope chip = ABAC city, role badge, aal2-countdown chip
> ├───────────────┬──────────────────────────────────────────────────────────────────────┤
> │ 🛡 Moderation │                                                                        │  sidebar (role-gated; จาง = ไม่มีสิทธิ์ + ไม่ mount route)
> │ 🏪 Verify     │   [ เนื้อหาจอ ]                                                        │
> │ 🌆 City Ops   │                                                                        │
> │ ━━━━━━━━━━━━ │                                                                        │
> │ 💰 Payout   ▸ │  ▸ Batches · Bank Recon · Tax (WHT/VAT) · Failed/Suspense              │  ← section 9 (a),(b)
> │ 📊 Solvency   │                                                                        │  ← section 9 (c)  [Analyst = read-only variant]
> │ ⏸ Freeze     │                                                                        │  ← section 9 (d)  [P.Admin = manual-freeze only]
> │ 🚨 Fraud      │                                                                        │  ← section 9 (e)
> │ 🔐 DPO/PDPA   │                                                                        │
> └───────────────┴──────────────────────────────────────────────────────────────────────┘
> ```
> sidebar item ที่ role ไม่มี capability → **render จาง + ไม่ถูก mount route** (RLS เป็น source of truth; ซ่อนปุ่มเป็น UX-only). **Analyst** เห็น `📊 Solvency` + Bank Recon read-only (no mutate control mount); **P.Admin** เห็น `⏸ Freeze` แต่ปุ่ม Release/Override **ไม่ mount** (ดู 9.d).
>
> **★ Cross-section handoff endpoints ที่ §9 เป็นเจ้าของ (ปลายทางของจอ role อื่น — ปิด dead-end):**
> - **DPO erasure-gate** (§11.1.a) drill `payout_suspense>0` / `open fraud_case` → **อ่านจาก 9.b/9.e ตามลำดับ**. DPO **เคลียร์เองไม่ได้** (ถูกต้องตาม SoD) → §9 expose **read-only record view + "owned by Finance/Fraud · view only" + [notify owner]** ให้ DPO drill ไม่ตัน (แก้ critique Chain-C blocker drill).
> - **DPO sensitive-unmask approval** (§8.2/§8.4 `[ขอ DPO →]`) — เมื่อ Finance ขอ unmask นอก ABAC-exception ของ 9.a → route ไป **DPO pending-unmask queue (§11.1, ไม่ใช่จอ §9)**; §9.a CTA ชี้ปลายทางนั้น (จอ DPO เป็น deliverable §11 — ไม่วาดที่นี่, ดู residual-risk).

---

### 9.a PAYOUT BATCH — List + Detail (create=Finance · approve=different actor · SoD CHECK + step-up)

**Operator goal:** Finance/Payout ตัดยอด/รวม `merchant_payable` + agent earning เป็น batch แล้วส่ง review; Owner/City-Manager (คนละคน) ตรวจ solvency+coverage+bank-flag แล้ว approve+release. **Action effect:** approve → post `PAYOUT` (merchant, ไม่มี WHT) / `AGENT_PAYOUT` (agent, +WHT 3% monthly-grain + reserve-hold 30%) ต่อ item ภายใต้ idempotency_key; batch เดิน state machine `draft→pending_review→approved→releasing→settled→reconciled` (fail-branch → `partially_failed`/`cancelled`, S4.3.2).

#### (a-1) Batch list

```
┌──────────────────────────────────────────────────────────────────────────────────────┐
│ 💰 Payout › Batches                       [track: ทั้งหมด ▾] [city: CNX] [+ สร้าง batch]│
├──────────────────────────────────────────────────────────────────────────────────────┤
│ Batch ID            │track   │ตัดยอด    │ items│ net (฿)   │สถานะ          │SLA        │
│ ────────────────────┼────────┼──────────┼──────┼───────────┼───────────────┼────────── │
│ MERCH-2026-W24-CNX  │merchant│10 มิ.ย.  │  2   │ 24,570.00 │🟡 pending_rev │approve ก่อน│
│                     │        │          │      │           │ ⚠ 1 bank-flag │พฤ 12:00 ⏳ │
│ AGENT-2026-06-CNX   │agent   │30 มิ.ย.  │ 14   │ 96,840.00 │⚪ draft        │—          │
│ MERCH-2026-W23-CNX  │merchant│03 มิ.ย.  │  9   │ 71,200.00 │🟢 reconciled  │✓ ปิดรอบ   │
│ MERCH-2026-W22-CNX  │merchant│27 พ.ค.   │  7   │ 58,010.00 │🟠 partially_  │1 item bounce│  ← failed item → 9.b/Suspense
│                     │        │          │      │           │   failed      │→ suspense  │
│ AGENT-2026-05-CNX   │agent   │31 พ.ค.   │ 12   │ 88,300.00 │🔴 cancelled   │solvency FAIL│  ← A.8.2s/coverage fail ที่ pending_review
│ ────────────────────┴────────┴──────────┴──────┴───────────┴───────────────┴────────── │
│ ⓘ ตัวเลข net = หลังหัก WHT (agent track, monthly-grain) · merchant track WHT=0 · derive จาก ledger│
└──────────────────────────────────────────────────────────────────────────────────────┘
```
- **Components:** Refine `<List>` + DataTable (sortable, keyboard-nav, server-side filter ตาม `city_id` scope), status pill (สี = state machine S4.3.2), SLA chip, bank-flag warning badge.
- **State map → token (doc 06 §1.2, by name):** `draft`=⚪`--hold` slate · `pending_review`=🟡`--warning` ochre · `approved/releasing`=🔵`--info` jade · `settled`/`reconciled`=🟢`--success` (+✓ ที่ reconciled) · `partially_failed`=🟠`--warning`+ลิงก์ failed · `cancelled`=🔴`--danger`.
- **Empty:** "ยังไม่มี batch ในรอบนี้ — cron ตัดยอด merchant ทุกอังคาร 23:59 / agent สิ้นเดือน" + ปุ่มสร้าง manual (role-gated).
- **Loading:** skeleton rows. **Error:** "โหลด ledger ไม่ได้ — ตัวเลขทั้งจอนี้ derive จาก ledger, ไม่แสดง cache เก่า" (fail-closed, ไม่โชว์ตัวเลขเก่ากำกวม).
- **SLA-breach:** merchant approve ต้องเสร็จก่อนโอนพฤหัส; เลย cutoff → row แดง "⚠ พลาด cutoff รอบนี้ → roll W25" + page Finance lead.

#### (a-2) Batch detail — review & approve (SoD + step-up unmistakable)

```
┌──────────────────────────────────────────────────────────────────────────────────────┐
│ ← MERCH-2026-W24-CNX        merchant track · CNX · ตัดยอด อ. 10 มิ.ย. 23:59           │
├──────────────────────────────────────────────────────────────────────────────────────┤
│ ┌─ Pre-flight gates (ต้องผ่านครบก่อน approve ได้ — S4.3.2 4 เงื่อนไข) ────────────────┐ │
│ │ ✅ A.8.2s solvency  R-924 · pass · 11 มิ.ย. 02:14  (S6-owned)   [ดู → 9.c]          │ │  ← solvency_check_id
│ │ ✅ payable_coverage R-925 · pass · 11 มิ.ย. 02:15  (S4-owned)   LHS 194,000 ≥ 69,010│ │  ← payable_check_id
│ │ ✅ SoD: creator (fin-01) ≠ approver (you)                                            │ │
│ │ ⚠ cross-action SoD: 1 item bank-changed <72h — ต้อง explicit clear (ดูแถว ⚑)       │ │  ← S4.6.1a / SEAM-3
│ └──────────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                        │
│ Payee            │ bank snapshot (masked)   │ gross ฿   │ WHT │ net ฿     │ flag       │
│ ─────────────────┼──────────────────────────┼───────────┼─────┼───────────┼─────────── │
│ ร้าน A กาแฟ Nimman│ กสิกร ••••3421 ✓         │ 18,420.00 │  —  │ 18,420.00 │ ok         │
│ ⚑ ร้าน C ร้านนวด │ ไทยพาณิชย์ ••••8890 ⚠    │  6,150.00 │  —  │  6,150.00 │ bank chg 2วัน│  ← per-item flag (SEAM-3 / S4.6.1a)
│                  │   ↳ เปลี่ยน 08 มิ.ย. · approve โดย fin-02 (≠คุณ, ≠creator) ✓        │ │  ← cross-action SoD ตรวจผ่าน
│                  │   [ 🔓 unmask + diff bank เก่า→ใหม่ ]     [ ✓ explicit clear item ] │ │  ← unmask = Finance-on-active-payout-item ABAC exception (ดูหมายเหตุ PII)
│ ─────────────────┼──────────────────────────┼───────────┼─────┼───────────┼─────────── │
│ excluded: ร้าน B 240.00฿ (< MIN 300 → roll W25) · ร้าน D PAYOUT_FROZEN 4,000฿ (A.8.4) │  ← ไม่อยู่ใน batch, แสดงเหตุ
│ ─────────────────┴──────────────────────────┴───────────┴─────┴───────────┴─────────── │
│ รวม: 2 items · total_gross 24,570.00 · WHT 0 · total_net 24,570.00 ฿                    │
│                                                                                        │
│ จ่ายจาก bank_settlement (A.8.11 gate: balance ≥ total_net) · idempotency_key per item   │
│                                                                                        │
│            [ ปฏิเสธ + เหตุผล (→cancelled) ]      [ Approve & Release ฿24,570 → ] 🔒     │  ← approve = step-up MFA · audit severity=high
└──────────────────────────────────────────────────────────────────────────────────────┘

  กด Approve →  ┌─────────────────────────────────────────────┐
                │ 🔒 ยืนยันตัวตน (step-up MFA · aal2)           │  ← TOTP บังคับ (staff)
                │ คุณกำลังอนุมัติเงินออกจริง ฿24,570 · 2 รายการ │  ← money-out = audit high-severity
                │ ▸ SoD ✓ creator≠approver  ▸ bank-flag ✓ cleared│
                │ ┌──┬──┬──┬──┬──┬──┐  [ ยืนยัน ]               │
                │ └──┴──┴──┴──┴──┴──┘                          │
                └─────────────────────────────────────────────┘
```
- **Components:** pre-flight gate panel (4 เงื่อนไข S4.3.2 — 2 check-id + SoD + cross-action SoD), per-payee row พร้อม **bank snapshot masked** + bank-change cool-down flag + diff viewer, explicit-clear control ต่อ item, excluded-list พร้อมเหตุ (MIN/FROZEN), step-up modal.
- **Action effect (release):** ต่อ item post `PAYOUT` — `Dr merchant_payable / Cr clearing → Dr clearing / Cr bank_settlement` (clearing กลับ 0, A.8.1b); agent track → `AGENT_PAYOUT` (`Dr platform_expense gross / Cr wht_payable 3% / Cr agent_reserve 30% / Cr clearing net → Dr clearing / Cr bank_settlement`; side-effect `agent_wht_ledger += gross`). batch → `releasing`.
- **SoD/step-up/PII/audit:**
  - **SoD CHECK (DB):** `approved_by <> created_by` reject ที่ constraint; **cross-action SoD (SEAM-3):** approver ต้องไม่ใช่ bank-change approver ของ item ใดใน cool-down → ⚠ flag + explicit clear ก่อน enable ปุ่ม.
  - **step-up:** ปุ่ม Approve mount step-up modal (aal2/TOTP); ล้มเหลว → batch ค้าง `pending_review`, ไม่ post.
  - **PII — payment-instrument tiering (★ แก้ critique-major §8.4 vs §9.a):** bank acct/ชื่อ payee = **payment instrument** → ปกติเป็น **DPO-gated (§8.4)**. **§9.a เป็น ABAC exception ที่ declare ชัด:** `Finance-on-active-payout-item` — Finance/Payout **self-unmask ได้เฉพาะ bank snapshot ของ item ที่อยู่ใน batch ที่กำลัง review/approve** (purpose = verify bank-change diff ก่อนปล่อยเงิน) ผ่าน `reason_code ∈ {refund_payee, verify_identity}` + justification + audit + step-up. **นอก scope นี้ (เช่น ดู bank ของ payee ที่ไม่ได้อยู่ใน active batch, หรือ KYC doc)** → ต้องผ่าน **DPO approve (§8.2/§8.4)** เหมือนเดิม. exception นี้ต้องถูกระบุใน §8.4 tiering table (row `payment_instrument → Finance: active-payout-item only · else DPO`) เพื่อให้ enforcement ตรงกันทั้ง §8.2/§8.4/§9.a.
  - **audit:** approve/reject/clear/unmask → `audit_log` (before/after bank_snapshot, MFA assertion id). `payout.approve`/release = **severity `high`** (money-out) — surface เคียง pii_unmask/erasure ใน §11.1.d.
- **Empty:** batch 0 item → "ทุกรายการ < MIN หรือ frozen — roll-over ทั้งหมด, ไม่มีอะไรให้ approve".
- **Loading:** "⟳ กำลังรัน pre-flight (solvency+coverage)…" (gate panel skeleton; ปุ่ม approve **lock จนกว่า 2 run = pass ภายใน 24 ชม.**).
- **Error / gate-fail:** ถ้า A.8.2s หรือ coverage = fail → gate แดง "❌ A.8.2s FAIL → batch ไป cancelled, page on-call" ปุ่ม approve **disabled** (ไม่มี override ที่นี่ — override เป็น dual-Owner ที่ Freeze console 9.d).
- **SLA-breach:** approve ค้างเกิน cutoff → banner "⚠ เลยเวลาโอน — รายการ roll W25" + audit timeout.

---

### 9.b BANK RECONCILIATION — statement (bank/PSP) vs ledger + break investigation

**Operator goal:** Finance match bank/PSP statement จริงกับ ledger leg ทุกวัน, สืบ + ปิด break ภายใน SLA, ไม่มี break ใดปิดด้วยการแก้ตัวเลข. **Action effect:** ปิด break = post **adjustment ledger txn** (canonical) แล้ว cache rebuild (A.8.6); ไม่มี balance-edit.

```
┌──────────────────────────────────────────────────────────────────────────────────────┐
│ 💰 Payout › Bank Reconciliation        วันที่ [13 มิ.ย. 2026 ▾]  city: CNX             │
├──────────────────────────────────────────────────────────────────────────────────────┤
│ ┌─ 4 ชั้น recon (S4.4.1) ─────────────────────────────────────────────────────────┐  │
│ │ ① PSP statement (NET) ⟷ psp_suspense   ✅ 142/142 matched                         │  │
│ │ ② Bank statement     ⟷ bank_settlement ⚠ 11/12 matched · 1 break                  │  │  ← BANK_RECON
│ │ ③ A.8.2s solvency (S6-owned)            ✅ pass  [ดู → 9.c]                         │  │
│ │ ④ payable_coverage (S4-owned)           ✅ pass                                     │  │
│ │ + WHT_RECON: Σ(per-payout wht)=agent_wht_ledger ✅ · VAT_RECON ✅                   │  │
│ └──────────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                        │
│  Open breaks (SLA 2 วันทำการ):                                  [ import statement ⬆ ] │
│  type             │ ref                  │ จำนวน ฿  │ อายุ │ สถานะ      │ resolution     │
│  ─────────────────┼──────────────────────┼──────────┼──────┼────────────┼─────────────── │
│  🔴 missing_in_bank│ MERCH-W22 item ร้าน E│ 6,150.00 │1วัน  │ open       │ → failed-payout │  ← bounce → reverse→payout_suspense (A2.3.7)
│  🟡 timing         │ PSP_SETTLE Omise #88 │12,400.00 │6 ชม. │ open       │ เฝ้ารอ T+1 auto │  ← ปิดเองพรุ่งนี้, ไม่ post
│  🟠 unmatched_psp_ │ Omise fee diff       │   −85.00 │1วัน  │ in_review  │ adj psp_fee_exp │
│      fee           │                      │          │      │            │                │
│  🟣 missing_in_    │ เงินเข้า bank ไม่รู้ │ 9,000.00 │2วัน  │ in_review  │ สืบ source ⚠   │  ← ห้าม mint จากเงินนี้
│      ledger        │ ที่มา                │          │      │ ⏳ SLA ใกล้ │ จน identify    │
│  ─────────────────┴──────────────────────┴──────────┴──────┴────────────┴─────────────── │
└──────────────────────────────────────────────────────────────────────────────────────┘

  คลิก break → ┌──────────────────────────────────────────────────────────────────────┐
              │ Break #BR-2026-0613-03 · unmatched_psp_fee · −85.00 ฿                 │
              │ ─────────────────────────────────────────────────────────────────── │
              │ Statement (Omise): fee 1,285.00   │  Ledger (psp_fee_expense): 1,200.00│  ← side-by-side diff
              │ diff: −85.00 ฿ (fee จริง > ที่ประมาณตอน PREFUND)                       │
              │                                                                      │
              │ Resolution → post adjustment (canonical, append-only):               │
              │   Dr psp_fee_expense 8500 / Cr bank_settlement 8500  (satang)         │  ← ไม่แก้ cache; post txn
              │ ⓘ การปิด break = post ledger txn เท่านั้น (A.8.9) — ไม่มีปุ่มแก้ยอด    │
              │ amount_mismatch/missing_in_ledger → ต้อง SoD review (creator≠approver) │
              │                          [ post adjustment + ปิด break ] 🔒 (step-up) │
              └──────────────────────────────────────────────────────────────────────┘
```
- **Components:** 4-layer recon status board (S4.4.1) + WHT/VAT recon chip · open-break table (type/ref/amount/aging/SLA) · break-detail diff (statement vs ledger side-by-side) · adjustment-posting panel (canonical txn preview) · statement-import (`bank_statement_lines`/`psp_settlement_lines`).
- **Break-type → resolution (S4.4.4):** `timing`→เฝ้ารอ (no post) · `unmatched_psp_fee`→adj `psp_fee_expense` · `amount_mismatch`→adj + SoD review · `missing_in_bank`→ failed-payout reverse→`payout_suspense` (A2.3.7) · `missing_in_ledger`→**สืบ source ก่อน, ห้าม mint** · `wht_drift`→post `wht_trueup` ก่อน WHT_REMIT.
- **Action effect:** ปิด break = post adjustment txn (canonical type) → cache rebuild; **`written_off` break >30 วัน** = `WRITE_OFF` (`Dr bad_debt_expense / Cr merchant_receivable`) ต้อง **Owner approve + step-up** + audit severity=**high**.
- **SoD/step-up/audit:** `amount_mismatch`/write-off = SoD (creator≠approver) + step-up; ทุก resolution → audit (actor, diff, txn id). recon ใช้ **NET match** (Spec A.6(1)) ไม่ใช่ gross. `recon_tolerance` = 100 satang (1฿) external = WARN; เกิน = BREAK.
- **★ Handoff (DPO erasure-gate, แก้ Chain-C):** `payout_suspense_balance>0` ที่ §11.1.a DPO drill เข้ามา → จอนี้ expose **read-only view ของ suspense record + "owned by Finance · view only" + [notify Finance owner]** — DPO เห็นสถานะแต่เคลียร์เองไม่ได้ (SoD ถูกต้อง).
- **Empty:** "ไม่มี break เปิด — recon ผ่านครบ 4 ชั้น ✓" (good-state, `--success`).
- **Loading:** "⟳ กำลัง import statement / match…"; nightly recon ต้องเสร็จก่อน 06:00 (SLO 100%).
- **Error:** statement file หาย/ดึงไม่ได้ → "⚠ ไม่มี statement วันนี้ — A.8.2s ไม่ anchor กับเงินจริง" + page (blind-to-insolvency risk).
- **SLA-breach:** break อายุ > 2 วันทำการ → row แดง + escalate Finance lead; PSP unmatched > T+2 → WARN→page.

---

### 9.c SOLVENCY DASHBOARD (S6) — per-funder backing vs liability + fail-closed thresholds

**Operator goal:** Finance/Owner เห็น **HAVE − REQUIRED** ต่อ city ทุกวินาที (derive จาก ledger, ไม่ใช่ cache อิสระ) + per-funder coin_backing vs coin_liability + escrow exposure + reserve vs merchant_receivable พร้อม threshold **70% WARN / 100% PAUSE** (SEAM-2). **Action effect:** อ่าน-only (no txn); แต่ ASSERT/threshold break → auto-PAUSE GRANT/PAYOUT (S6.1.6) — แสดงสถานะ freeze ที่นี่, สั่งจาก 9.d. **Analyst เห็นจอนี้แบบ read-only** (ตาม §7.1 matrix `Solvency/Recon [Finance·Owner·Analyst read]`) — ไม่มี mutate control mount เลย (จอนี้ไม่มี mutate อยู่แล้ว → เป็น natural home ของ Analyst read view; ปิด matrix-vs-screen gap).

```
┌──────────────────────────────────────────────────────────────────────────────────────┐
│ 📊 Solvency & Escrow Exposure        city: CNX      ● live (ledger high_seq #4,182,330) │
├──────────────────────────────────────────────────────────────────────────────────────┤
│ ┌─ A.8.2s Solvency Anchor (S6-owned · canonical narrow) ─────────────────────────────┐ │
│ │  HAVE (เงินสด settled จริง)                                          1,420,000.00 ฿ │ │
│ │    bank_settlement 1,420,000.00 · psp_suspense(settled) 0                           │ │
│ │  REQUIRED = coin_liability + escrow_avail + sponsor_avail − merchant_receivable     │ │
│ │    880,000.00 + 310,000.00 + 40,000.00 − 4,000.00          =        1,226,000.00 ฿ │ │  ← ไม่บวก payable/WHT/VAT
│ │  ────────────────────────────────────────────────────────────────────────────────  │ │
│ │  BUFFER = HAVE − REQUIRED                          🟢 +194,000.00 ฿  (15.8%)        │ │  ← > SOLVENCY_BUFFER_MIN
│ │  ASSERT1 HAVE≥REQUIRED ✓  ASSERT2 |bank−stmt|≤1฿ ✓  ASSERT3 |suspense−PSP|≤1฿ ✓     │ │  ← 3 ASSERT (S6.1.4)
│ └──────────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                        │
│ ┌─ Per-funder coin_backing vs coin_liability (A.8.5) ──┐ ┌─ Reserve vs receivable ───┐ │
│ │ funder              backing฿   ⟷ liability(COIN)  ✓/✗ │ │ funded reserve  500,000.00 │ │
│ │ merchant:A         128,000  ⟷ 128,000      ✅        │ │ merchant_receiv.  4,000.00 │ │
│ │ merchant:C          61,500  ⟷  61,500      ✅        │ │ ███░░░░░░░░░░░  0.8%        │ │  ← util bar
│ │ sponsor:TAT         40,000  ⟷  40,000      ✅        │ │ ┌──────────────────────┐   │ │
│ │ sponsor:platform_   25,000  ⟷  25,000      ✅        │ │ │ 70% ───────WARN──────┤   │ │  ← threshold markers (SEAM-2)
│ │   goodwill (settled-backed)                         │ │ │ 100% ──────PAUSE─────┤   │ │
│ │ ─────────────────────────────────────────────────── │ │ └──────────────────────┘   │ │
│ │ Σ coin_backing 880,000 ⟷ coin_liability 880,000 ✅  │ │ 🟢 0.8% — ปกติ            │ │
│ └─────────────────────────────────────────────────────┘ └────────────────────────────┘ │
│                                                                                        │
│ ┌─ Escrow exposure ──────────────┐ ┌─ Outstanding Coin liability (mint vs burn) ──────┐ │
│ │ Σ escrow available  310,000.00 │ │ liability 880,000 COIN  ▁▂▃▅▆▇ ↑ mint > burn     │ │
│ │ locked in quest pool 145,000   │ │ aging lot ใกล้หมดอายุ (T-14): 12,400 COIN ⚠      │ │
│ │ escrow < 0: ไม่มี (A.8.4) ✓    │ │ breakage policy = platform_breakage              │ │
│ └────────────────────────────────┘ └──────────────────────────────────────────────────┘ │
│                                                                                        │
│ payable/WHT/VAT outstanding (เฝ้าแยก — ไม่ยัดเข้า A.8.2s):                              │  ← payable_coverage cross-ref (S4-owned)
│   merchant_payable 24,810 · wht_payable 5,200 · vat_output 47,000 − vat_input 8,000    │  ← receivable haircut: ดู note coverage
└──────────────────────────────────────────────────────────────────────────────────────┘
```
- **Components:** A.8.2s anchor card (HAVE/REQUIRED/BUFFER + 3 ASSERT) · per-funder backing⟷liability table (A.8.5 per row, รวม `sponsor:platform_goodwill` settled-backed) · **reserve-util gauge พร้อม 70%/100% threshold markers** · escrow-exposure card · outstanding-liability sparkline (mint/burn/expire + lot aging) · payable/tax watch strip (เฝ้าแยกจาก solvency).
- **Action effect:** read-only — **ไม่ post txn**. แต่ ASSERT/threshold break → trigger auto-PAUSE/FREEZE (S6.1.6); dashboard แสดงสถานะ freeze ปัจจุบัน (อ่าน `platform_freeze_state`) + ลิงก์ไป 9.d.
- **Threshold states (fail-closed, SEAM-2):**
  - reserve util **< 70%** → 🟢 ปกติ · **≥ 70%** → 🟡 `--warning` banner "receivable เข้าใกล้ reserve" · **≥ 100%** → 🔴 "merchant_receivable > reserve → **auto-PAUSE GRANT** (SEAM-2 fail-closed)" + page; gauge เปลี่ยนเป็นแดง + แสดง freeze scope.
  - ASSERT1 (HAVE < REQUIRED) → 🔴 "under-collateralized — ละเมิด 'แพลตฟอร์มไม่สำรองจ่าย' → auto-PAUSE GRANT+PAYOUT city" + page on-call ทันที.
  - ASSERT2/3 drift > 1฿ → 🟡 "ledger ≠ เงินจริง — เปิด recon-investigation" (ไม่ freeze ทันทีเว้น drift > hard threshold).
- **★ payable_coverage haircut note (A2 verifier-major):** watch-strip แสดง `merchant_receivable` แยก; ใน `payable_coverage` (S4) LHS นับ receivable แบบ **reserve-adjusted haircut (หรือ exclude)** — doubtful asset ไม่ถูกนับเป็น liquid cover สำหรับ statutory tax remit. แสดง footnote เล็ก "receivable ใน coverage = haircut แล้ว".
- **SoD/audit:** read-only (Analyst เห็นได้, ไม่มี mutate control mount); **ไม่มีปุ่ม mutate** ที่จอนี้ — กดต่อไป freeze/recon เท่านั้น. ทุก threshold-cross → `freeze_events`/alert audit.
- **Empty:** city ใหม่ไม่มี liability → "ยังไม่มี Coin/escrow ใน city นี้ — buffer = HAVE ทั้งหมด".
- **Loading:** snapshot pin ที่ `ledger_high_seq` (S6.1.2 กัน race กับ traffic สด); "⟳ pin snapshot…".
- **Error:** recon job คืนนี้ fail → banner "⚠ คืนที่ไม่ reconcile = blind ต่อ insolvency — ตัวเลขอาจไม่ครบ" + ไม่อนุญาตให้ batch approve อ้าง run เก่า > 24 ชม.
- **SLA-breach:** buffer < `SOLVENCY_BUFFER_MIN` → page Finance+Owner (Tier-1).

---

### 9.d FREEZE CONTROL — `platform_freeze_state` (manual-freeze=step-up · release/override=dual-Owner+step-up ซ้อน · high-severity · audited)

**Operator goal:** ดู/สั่ง freeze ระดับ NORMAL→PAUSED→FROZEN ต่อ scope (global/city/merchant/funder/identity-cluster), และ **override/release** ที่ต้อง **dual Owner (2 คน, creator≠approver) + step-up MFA ซ้อน**. **Action effect:** เขียน `freeze_events` (append-only) + อัปเดต read-model `platform_freeze_state` ที่ edge fn อ่านก่อนทุก money op (รวม Counter PWA pre-check, doc 06 §3.2.g); **ไม่ใช่ revoke DB grant** (EXPIRE/REFUND/RECOVERY ต้องทำงานต่อใน PAUSED).

> **★ Capability split (แก้ critique-major §7.1 vs §9.d role mismatch):**
> - **`Finance/Payout` + `Platform Admin`** = **view + manual-freeze เท่านั้น** (สั่ง freeze ได้, ปลดไม่ได้). manual-freeze = step-up + audit.
> - **`Platform Owner` เท่านั้น** = **Release / Override** ภายใต้ **dual-Owner** (owner-A ≠ owner-B, ทั้งคู่เป็น Owner, DB CHECK A≠B) + step-up ทั้งสองฝั่ง.
> - **ปุ่ม `[ Release / Override ]` ไม่ mount เลยสำหรับ P.Admin/Finance** (ไม่ใช่แค่ disabled) — กัน dead-end ที่ critique ชี้ (P.Admin โครงสร้างไม่มีทางครบ 2 Owner). §7.1 matrix ต้องแก้: `Freeze Control` → Owner `●` (manual+release), P.Admin `○` (view+manual-freeze only).

```
┌──────────────────────────────────────────────────────────────────────────────────────┐
│ ⏸ Freeze Control                                              ⚠ HIGH-SEVERITY · audited│
├──────────────────────────────────────────────────────────────────────────────────────┤
│ state machine:  NORMAL ──► PAUSED ──► FROZEN   (PAUSED บล็อก GRANT/PAYOUT, ยอม EXPIRE/  │
│                   ▲__________release__________│   REFUND/RECOVERY+read · FROZEN บล็อกทุก op)│
│                                                                                        │
│ Active freezes (platform_freeze_state):                                                │
│ scope_key                  │ level │frozen_ops          │trigger          │ตั้งโดย    │
│ ───────────────────────────┼───────┼────────────────────┼─────────────────┼─────────  │
│ 🔴 identity-cluster:c-7741 │FROZEN │GRANT REDEEM PAYOUT  │A.8.12_resid     │system     │  ← self-redeem cluster (9.e)
│                            │       │                    │ +fraud_case#FC-91│ 06:02     │
│ 🟠 merchant:339            │PAUSED │GRANT               │cogs_budget_cap  │system     │  ← COGS เกิน cap
│ 🟠 city:CNX                │PAUSED │GRANT PAYOUT        │A.8.2s ASSERT1   │system     │  ← under-collateralized
│ ───────────────────────────┴───────┴────────────────────┴─────────────────┴─────────  │
│ consumer protection: REDEEM ของ Coin ที่ออกแล้วยัง honor ใน PAUSED — user สุจริตไม่ถูกลงโทษ│
│                                                                                        │
│  [ + Manual freeze (scope+level) ] 🔒    [ Release / Override freeze ] 🔒🔒 (Owner only)│  ← manual=step-up · release=dual-Owner
│   ▲ Finance/Admin: เห็น + กดได้                ▲ mount เฉพาะ viewer.role==Owner            │
└──────────────────────────────────────────────────────────────────────────────────────┘

  Manual freeze →  ┌────────────────────────────────────────────────────────────────────┐
                   │ + Manual freeze · ⚠ HIGH-SEVERITY (privileged governance write)      │  ← แก้ critique-major: manual freeze ต้อง step-up+audit
                   │ ────────────────────────────────────────────────────────────────── │
                   │ scope:  ○ global  ◉ city  ○ merchant  ○ funder  ○ identity-cluster   │  ← scope picker
                   │ scope_key: [ CNX ▾ ]                                                 │
                   │ level:  ○ PAUSED (บล็อก GRANT/PAYOUT, ยอม EXPIRE/REFUND/RECOVERY)     │  ← level radio
                   │         ○ FROZEN (บล็อกทุก op)                                        │
                   │ frozen_ops (derive จาก level): GRANT · PAYOUT                         │
                   │ เหตุผล: [_________________________________________]  (audit, บังคับ)  │
                   │ ⚠ global FROZEN → ต้อง dual-Owner เหมือน release (ไม่ใช่ single)       │  ← global FROZEN = 2 Owner
                   │                              [ ตั้ง freeze ] 🔒 (step-up MFA · aal2)  │  ← step-up บังคับทุก scope
                   └────────────────────────────────────────────────────────────────────┘

  Release / Override →  ┌────────────────────────────────────────────────────────────────┐
                        │ ปลด freeze · city:CNX · A.8.2s ASSERT1   ⚠ HIGH-SEVERITY        │
                        │ ────────────────────────────────────────────────────────────── │
                        │ 1. Diagnose: recon_check_results ของ run ที่ break  [ดู R-924]   │  ← S6.1.7 step 1
                        │    root cause: ◉ missing settle file  ○ cache drift  ○ real loss │
                        │ 2. Remediate: ✓ post adjustment / rebuild cache (append-only)    │  ← ไม่แก้ตัวเลข
                        │ 3. Re-verify: run post_freeze_verify → ต้อง status=pass          │
                        │    ⟳ R-931 (post_freeze_verify)… ✅ pass                         │
                        │ ────────────────── DUAL-OWNER (two-person) ──────────────────── │
                        │  ผู้เสนอปลด:  owner-A (you) ✓ step-up 🔒                          │  ← creator (Owner)
                        │  ผู้อนุมัติ:   [ owner-B ▾ ]  รอ step-up ของ owner-B 🔒           │  ← approver = distinct Owner
                        │  ⚠ owner-A ≠ owner-B (SoD บังคับ · DB CHECK A≠B) · ทั้งคู่ = Owner │
                        │  เหตุผลปลด: [____________________________________]  (audit)      │
                        │                          [ ยืนยันปลด (รอ 2 ลายเซ็น + 2 step-up) ]│
                        └────────────────────────────────────────────────────────────────┘
```

> **★ Owner-B co-sign entry (แก้ critique missing-screen "solvency-override second-Owner surface"):** owner-B **ไม่ได้** เริ่มจากปุ่ม release — owner-B ค้นพบ pending release **out-of-band** ผ่าน:
> - **Owner home / top-bar "pending dual-Owner approvals" badge** (จอ Owner home เป็น deliverable §7/§11 — ดู residual) ที่ deep-link เข้า wizard ฝั่ง approver;
> - **page/alert** (Tier-1) ที่ส่งตอน owner-A เสนอ → owner-B เปิด link → เห็น wizard เดียวกัน **ฝั่ง approver** (Diagnose/Remediate/Re-verify เป็น read-only, owner-B review แล้วกด step-up co-sign).
> เมื่อ owner-B = owner-A → DB CHECK reject (ปลดไม่สำเร็จ). pending release row ค้างใน `freeze_events(status=proposed)` จน owner-B co-sign หรือ expire.

- **Components:** state-machine legend · active-freeze table (scope_key/level/frozen_ops/trigger/who จาก `freeze_events`+`platform_freeze_state`) · consumer-protection note · **manual-freeze form (scope picker + level radio + reason + step-up; global FROZEN = 2-Owner)** · **dual-Owner release wizard** (4 ขั้น S6.1.7: diagnose→remediate→re-verify→two-person release) + owner-B co-sign entry.
- **Action effect:** manual freeze/release → INSERT `freeze_events` (append-only, `retention_class governance_7y`) + update `platform_freeze_state`. **manual-freeze precondition:** step-up MFA (ทุก scope) + reason (audit); **global FROZEN = dual-Owner** เหมือน release. **release precondition:** (1) `post_freeze_verify` run = pass · (2) `created_by(owner-A) ≠ approved_by(owner-B)` DB CHECK + ทั้งคู่ role==Owner · (3) step-up MFA **ทั้งสองฝั่ง**. solvency-override (ปล่อยทั้งที่ยัง fail) = dual-Owner + **step-up ซ้อน** (A2.10-#7 / S4-7).
- **SoD/step-up/audit:** **dual-Owner เด็ดขาดบน release/override** — single-Owner ปลดไม่ได้ (constraint reject ถ้า A=B); P.Admin/Finance **ไม่มีปุ่ม release** (ไม่ mount). **manual-freeze = step-up + audit ทุก scope** (privileged governance write — แก้ critique-major). ทุก propose/approve/step-up/release/manual-freeze → `audit_log` (tamper-evident, S6.4, severity=high) + page Finance lead + Owner.
- **Empty (good-state):** "🟢 ไม่มี freeze active — ทุก money op ทำงานปกติ" (NORMAL ทั้ง scope).
- **Loading:** "⟳ re-verify (post_freeze_verify)…"; ปุ่มปลด **lock จนกว่า run = pass** + ครบ 2 ลายเซ็น.
- **Error:** re-verify ยัง break → "❌ ยัง break — ปลดไม่ได้ จนกว่า recon pass" (fail-closed, ปุ่ม disabled); owner-B step-up ล้มเหลว → freeze คงอยู่.
- **SLA-breach:** Tier-1 alert (A.8.2s break / FROZEN) ไม่ ack ใน 15 นาที → escalate Platform Owner.

---

### 9.e FRAUD_CASES queue — impossible-travel · self-redeem (A.8.12 cluster) · Sybil → investigate / freeze-cluster / clear

**Operator goal:** Moderator/Finance/DPO triage `fraud_cases` ตาม risk_score + SLA (hard ≤4ชม. settlement-held), สืบ evidence แล้ว **clear** (→release/unfreeze) หรือ **confirm** (→ freeze **ทั้ง identity-cluster** + recovery + ban). **Action effect:** confirm → `platform_freeze_state` freeze cluster + post recovery (`AGENT_CLAWBACK`/`MERCHANT_CLAWBACK`/`RECOVERY`); clear → un-freeze + feedback ลด score weight.

```
┌──────────────────────────────────────────────────────────────────────────────────────┐
│ 🚨 Fraud Cases                       [tier: hard ▾] [city: CNX]   ⏱ SLA hard ≤ 4 ชม.   │
├──────────────────────────────────────────────────────────────────────────────────────┤
│ case   │ subject            │signal              │score│ auto_action      │SLA   │owner │
│ ───────┼────────────────────┼────────────────────┼─────┼──────────────────┼──────┼───── │
│🔴FC-91 │identity-cluster:7741│merchant_self_redeem│ 0.93│FROZEN(cluster)   │2:14⏳│DPO+Fin│  ← A.8.12_resid → freeze ทั้ง cluster (9.d)
│🔴FC-88 │merchant:339        │chargeback_after_   │ 0.81│settlement_held   │0:48⏳│Fin+Mod│
│        │                    │  redeem            │     │                  │ ⚠    │      │
│🟠FC-85 │user:u-5520         │impossible_travel   │ 0.62│grant_blocked     │18:00 │Mod    │  ← นิมมาน→สันกำแพง 4 นาที
│🟠FC-83 │identity-cluster:6610│multi_account_sybil │ 0.58│payout_paused(ring)│7:30  │CM+Fin │  ← 20 acct ↔ 2 device
│ ───────┴────────────────────┴────────────────────┴─────┴──────────────────┴──────┴───── │
└──────────────────────────────────────────────────────────────────────────────────────┘

  เปิด FC-91 →  ┌──────────────────────────────────────────────────────────────────────┐
              │ FC-91 · merchant_self_redeem · risk 0.93 · ⏱ SLA 2:14 (hard, เงินค้าง) │
              │ owner: DPO + Finance (dual-control) · A.8.12 e-money boundary           │
              │ ────────────────────────────────────────────────────────────────────  │
              │ Evidence (append-only fraud_signals · score = Σ weight×time_decay):     │
              │  • funder=merchant:402 redeem โดย identity ใน cluster ของ controller    │  ← A.8.12_resid
              │  • same device_id ข้าม 4 account (graph community detection)            │
              │  • redeem velocity z-score 5.8 (cohort นิมมาน)                          │
              │  • PII: payee/ผู้คุม [masked ••••] [🔓 unmask — reason+audit+step-up]   │  ← PII mask default (DPO-tier)
              │ ────────────────────────────────────────────────────────────────────  │
              │ cluster ที่กระทบ: 4 accounts · escrow exposure ฿38,200 (= risk cap)     │
              │ สถานะ: 🔴 FROZEN(cluster) GRANT+REDEEM+PAYOUT แล้ว (auto, S6.1.6/SEAM-2)  │
              │                                                                        │
              │ Resolution:                                                            │
              │  ○ Clear  → un-freeze cluster + feedback ลด weight (เหตุผลบังคับ)        │  ← false positive
              │  ◉ Confirm fraud → คง FROZEN cluster + ban + recovery                   │
              │     recovery txn: MERCHANT_CLAWBACK/AGENT_CLAWBACK/RECOVERY (canonical)  │  ← ไม่แก้ balance
              │  ○ Escalate → Owner review                                             │
              │ ⚠ dual-control: DPO เสนอ · Finance approve (creator≠approver) + step-up │  ← SoD บน cluster-action
              │                              [ บันทึก resolution → ] 🔒 (step-up)       │
              └──────────────────────────────────────────────────────────────────────┘
```
- **Components:** queue table (case/subject/signal/score/auto_action/SLA/owner ตาม S6.2.3 ownership) · case detail พร้อม **evidence list (append-only `fraud_signals`)** + score breakdown + cluster-impact (escrow = risk cap) + current freeze state · resolution radio (clear/confirm/escalate) + recovery-txn preview · PII-masked subject.
- **Signal → behavior (S6.2.2):**
  - `impossible_travel` (speed > `IMPOSSIBLE_SPEED_KMH` config) → soft: flag+ไม่นับ step · hard: block GRANT ของ user.
  - `merchant_self_redeem` (A.8.12 funder==redeemer / same KYC/device/payment + nightly residual A.8.12_resid) → confirm → **FROZEN ทั้ง identity-cluster** (ไม่ใช่แค่แถวที่ match — กัน ring adapt, SEAM-2) + recovery; **owner = DPO+Finance dual-control** (e-money boundary).
  - `multi_account_sybil` (device-graph community detection, A.8.13) → ring ≥3 acct/device → review · ring redeem จาก funder เดียว → freeze payout ของ ring.
- **Action effect:** confirm → update `platform_freeze_state` cluster + post canonical recovery (`MERCHANT_CLAWBACK`/`AGENT_CLAWBACK`/`RECOVERY`; เก็บไม่ได้→`WRITE_OFF`) — **ไม่มี balance edit**; clear → release freeze + feedback ลด weight. **erasure-gate signal (★ ปลายทาง §11.1.a):** `fraud_cases ∈ {open,in_review,escalated}` → §11.1.a DPO erasure **BLOCK** (preserve evidence จน case ปิด); DPO drill เข้ามาเห็น **read-only case status + "owned by Fraud (DPO+Finance) · view only"** — ปิด Chain-C dead-end.
- **SoD/step-up/PII/audit:** cluster-action (freeze/ban/recovery) = **dual-control** (DPO/Mod เสนอ ≠ Finance approve) + **step-up**; PII (ผู้คุม/payee) masked = **DPO-tier** (§8.4), unmask = reason+audit+step-up (ผ่าน DPO gate — fraud PII ไม่เข้า ABAC-exception ของ 9.a); resolution + evidence-view → `audit_log` (`governance_7y`). identity-graph เก็บภายใต้ legitimate-interest (anti-fraud); raw GPS ≤ 90 วัน.
- **Empty:** "ไม่มี fraud case ค้าง — queue ว่าง ✓".
- **Loading:** "⟳ คำนวณ score (graph community detection nightly)…"; settlement-held case โชว์ "เงินค้างจ่าย — รอ resolve".
- **Error:** signal pipeline หยุด → "⚠ fraud signal ค้าง — อาจมี case ที่ยังไม่ enqueue" + Tier-2 alert.
- **SLA-breach:** hard tier > 4 ชม. (settlement-held เงินค้าง) → row แดง + escalate; identity-cluster/self-redeem > 4 ชม. → DPO+Finance page.

---

> **Build handoff (ผูกกับ section อื่น):** จอ 9.a/9.b post canonical txn ที่ doc 02b A2.3 นิยาม (`PAYOUT`/`AGENT_PAYOUT`/`AGENT_CLAWBACK`/`MERCHANT_CLAWBACK`/`WHT_REMIT`/`VAT_REMIT`/`RECOVERY`/`WRITE_OFF`; bounce→`payout_suspense` A2.3.7); 9.c อ่าน A.8.2s (S6-owned) ที่ batch-approval (9.a) อ้างเป็น `solvency_check_id` + `payable_coverage` (S4-owned, receivable-haircut) เป็น `payable_check_id`; 9.d `platform_freeze_state` ถูกอ่านโดย **ทุก** edge fn (รวม Counter PWA pre-check, doc 06 §3.2.g) ก่อน money op; 9.e feed erasure-gate ของ DPO console (`cs_open_obligations.has_open_fraud_case`/`payout_suspense_balance`) + freeze trigger ของ 9.d. **เลขในตัวอย่าง = worked example S4.10 (MERCH-2026-W24-CNX)** เพื่อให้ implementer trace ตรง ledger.
>
> **★ Cross-doc reconciliations ที่ section นี้ fold เข้า (ต้องสะท้อนกลับใน §7/§8/§11):**
> 1. **§7.1 nav matrix:** `Freeze Control` → split capability `Owner ● (manual+release/override)` / `P.Admin ○ (view+manual-freeze only)` — ให้ตรง 9.d capability split.
> 2. **§8.4 PII tiering table:** เพิ่ม row exception `payment_instrument → Finance: active-payout-item only (reason+step-up+audit) · else DPO approve` — ให้ตรง 9.a self-unmask scope.
> 3. **§11.1.d audit severity taxonomy:** `payout.approve` / batch release / `WHT_REMIT` / `VAT_REMIT` / `WRITE_OFF` = severity **high** (money-out) — ให้ตรง §9 audit emission.
>
> **Out-of-section (รับทราบ แต่ไม่ใช่ §9 finance-observability — ต้องสร้างใน section ปลายทาง):** Owner/P.Admin role-home (ที่ aggregate pending dual-Owner approvals → จุดที่ owner-B ค้นพบ release ของ 9.d) = **§7/§11 deliverable**; DPO pending-unmask approval queue (ปลายทางของ `[ขอ DPO →]` ใน 9.a/9.e) = **§11.1 deliverable**; Brand/Sponsor home + Sponsor Campaigns, Settings·Roles, agent-dispute queue, Media Pending, Disputed-claim dedupe, CityMgr Support-Tickets, Cross-border registry = **§7/§8/§10/§11**. §9 expose เฉพาะ **read-only handoff endpoint + "owned by … · view only" affordance** สำหรับ drill ที่เข้ามา (ปิด dead-end ฝั่ง §9), ไม่ใช่เจ้าของจอเหล่านั้น.

---

## 10. Missing Consumer/Merchant Screens

> **ขอบเขต:** ปิด 5 ช่องว่างที่ flow-completeness critique ชี้ — หน้าจอ **consumer (Flutter)** + **merchant first-run (web/Flutter)** ที่ section 2–4 อ้างถึงแต่ยังไม่ถูกวาดเป็น production wireframe เต็ม. ทุกจอ reuse design system **§1.9** โดย **อ้างอิง token ด้วยชื่อตัวแปร** (ไม่ re-pin hex ในจอ เพื่อกัน drift ข้ามเอกสาร — critique minor "state-color token drift"): `--brand-primary` `#E8852C` = CTA/active เท่านั้น · `--brand-secondary`/jade `#1E8E7E` = secondary/info · Sparks ✦ violet `#7C5CFF` · Coins ◉ metallic-gold `#C9962A` (ตัวเลข=ink #221B12 เสมอ) · freshness 4-state · `--success` `#2BA84A` · `--warning` ochre `#C77A0F` · `--danger` `#D64545` · `--hold` slate `#7A8290` (ค่าทั้งหมด = ตาราง semantic §1.2/§1.9 canonical — จอ §10 ไม่ตั้งค่าเอง). target ≥44 / CTA 48. ยึดหลัก **defer-auth + value-capture** (§2.0): browse/start = guest 100%, auth เด้งเฉพาะตอน "first value capture" (first stamp).
>
> **i18n หมายเหตุรวม:** wireframe เขียนหลายภาษาเพื่อสื่อความ แต่ runtime แสดง **active-locale บรรทัดเดียว** (ไม่ stack 3 ภาษา ยกเว้น language-picker). ตัวเลข = Inter tabular nums, สี ink.
>
> **เหตุผลที่ "consumer/merchant" ไม่ใช่ "back-office":** จอเหล่านี้เป็น surface ของผู้ใช้ปลายทาง — ไม่มี PII-unmask, ไม่ post ledger txn โดยตรง, ไม่มี SoD ภายในจอ. แต่ **ทุกจอเป็น input ของ back-office** (review → moderation queue §5; signup → verify reviewers Gate1/Gate2 §8; appeal → support ticket §9) — handoff annotation ระบุชัดว่า "ผลลัพธ์ไปโผล่ที่คอนโซลไหน + queue ไหน + ใครรีวิว (SoD)". **จอ back-office ปลายทางเป็น deliverable ของ §7–§11 (Admin console) ไม่ใช่ §10** — §10 รับผิดชอบ *contract ของ handoff* (record อะไร, route ไป queue ไหน, SoD ที่ต้องบังคับ); ความเสี่ยงที่ queue ปลายทางยัง undrawn ระบุไว้ที่ §10.6 + ภาคผนวกความเสี่ยง.

| # | Gap | Surface | Back-office handoff (queue + SoD/audit อยู่ฝั่งโน้น) |
|---|---|---|---|
| 10.1 | Review Composer + Report | Flutter (consumer) | Content Moderation §5 (`Q_REVIEW`): author≠moderator (hard CHECK) |
| 10.2 | Merchant first-time signup (claim-code landing) + wrong-recipient report | Web/Flutter (merchant) | verify stepper §8 (Gate1≠Gate2 reviewer) · report → `Q_MERCHANT` §8.3 → City Manager §11.2 |
| 10.3 | Agent appeal form + status | Flutter (agent mode) | `support_tickets(kind=agent_dispute)` → **`Q_AGENT` review queue §8.3/§9**, reviewer≠rejecting-moderator (hard) |
| 10.4 | Push opt-in primer | Flutter (consumer) | `consents` write → DPO consent mgmt §11.1; self-consent (ไม่มี back-office gate) |
| 10.5 | Guest quest-start persist + recovery/merge | Flutter (consumer) | merge → §2.7 auth; ไม่มี back-office |

---

### 10.1 Consumer Review Composer + Report — verified-visitor UGC (Flutter)

> **เข้าจาก:** Place Detail (§2.5) "เขียนรีวิว" หรือ Redeem success (§2.8 unlock). **เขียนได้เฉพาะคนมี `check_in` หรือ `redemption` fact ที่ร้านนั้น** (verified-visitor) — guest/คนไม่เคยไป ไม่เห็นปุ่มเขียน (เห็นแต่ "ไปเช็คอินเป็นคนแรก"). **ทุกรีวิวเข้า content moderation ก่อน publish** (author = ผู้เขียน, moderator = คนอื่น — SoD บังคับฝั่ง §5, ปลายทาง = `Q_REVIEW`).

**(10.1-a) Composer — star + original-language note + photo + verified badge**
```
┌──────────────────────────────────────────────────┐
│ ←  เขียนรีวิว · Ristr8to              Visited ✓   │ ← verified-visitor badge (jade --info)
│                                       (จาก check-in)│   อ่านจาก linked_check_in_id
├──────────────────────────────────────────────────┤
│  ให้คะแนนของคุณ * (จำเป็น)                         │
│        ★   ★   ★   ★   ☆                          │ ← star input (required) · ≥48dp
│        "4 จาก 5 ดาว"  (aria-label / haptic แต่ละดาว)│
│                                                    │
│  เล่าประสบการณ์ (ไม่บังคับ)                         │
│  ┌──────────────────────────────────────────────┐ │
│  │ กาแฟนุ่ม ลาเต้อาร์ตสวย คิวยาวช่วงบ่าย…        │ │ ← text · ภาษาที่พิมพ์ = original
│  │                                          0/600 │ │   เก็บ original_lang tag
│  └──────────────────────────────────────────────┘ │
│  เขียนเป็นภาษา:  ( ◉ ไทย   ◯ EN   ◯ 中文 )         │ ← original-language tag (สำหรับ auto-translate)
│                                                    │
│  📷 แนบรูป (ไม่บังคับ, สูงสุด 4)                    │
│  ┌────┐ ┌────┐ ┌─────────────────┐                │
│  │📷สด│ │ +  │ │ 📸 ถ่ายในแอป     │ ← camera-only (เหมือน §4.3 anti-fraud)
│  └────┘ └────┘ └─────────────────┘                │   EXIF/pHash reuse (ดู annotation)
│  ⓘ รูปรีวิวถ่ายสดในแอป — ใช้กล้องเพื่อกันรูปซ้ำ/เก่า │
│                                                    │
│  ⓘ รีวิวจะขึ้นหลังทีมงานตรวจ (ปกติ < 24 ชม.)       │ ← set expectation = moderation
│  ┌──────────────────────────────────────────────┐ │
│  │              ส่งรีวิว / Submit                  │ │ ← disabled จน ★ ≥1 (rating required)
│  └──────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────┘
```

**(10.1-b) Submit states — pending / published / rejected+reason**
```
SUBMITTED (optimistic queue OK — ไม่ใช่ activation moment)
┌──────────────────────────────────────────────────┐
│ ✓ ส่งแล้ว · รอตรวจสอบ                              │ ← pending-moderation (ยังไม่ public)
│   รีวิวของคุณจะขึ้นเมื่อผ่านการตรวจ                 │   neutral/info tone (ไม่ใช้ --success)
│   [ ดูรีวิวของฉัน ]                                │
└──────────────────────────────────────────────────┘
        │ poll/push เมื่อ moderator ตัดสิน (§5):
        ├─ PUBLISHED → 🟢 "รีวิวของคุณขึ้นแล้ว" (--success · Visited ✓ · translated on-demand)
        └─ REJECTED  →
┌──────────────────────────────────────────────────┐
│ ⚠ รีวิวไม่ผ่านการตรวจสอบ                           │ ← --danger #D64545 + ⚠ (ไม่พึ่งสี)
│   เหตุผล: มีข้อมูลติดต่อ/โฆษณาในรีวิว               │ ← reason ย่อ (มาตรฐาน, ไม่ใช่ free-text หลุด)
│   คุณแก้แล้วส่งใหม่ได้                              │   (no blame, recoverable)
│   [ แก้ไขและส่งใหม่ → ]                            │ → กลับ composer (ค่าเดิม pre-fill)
└──────────────────────────────────────────────────┘
```

**(10.1-c) Report this review — จาก review list (§2.5)**
```
── bottom sheet (จากแตะ ⋮ บนรีวิวของคนอื่น) ──────────
┌──────────────────────────────────────────────────┐
│  รายงานรีวิวนี้                                    │
│   ◯ สแปม / โฆษณา                                  │
│   ◯ ไม่เหมาะสม / hate                              │
│   ◯ ไม่ตรงร้าน (ไม่ได้ไปจริง)                       │
│   ◯ อื่น ๆ  [ ________________ ]                   │
│            [ ส่งรายงาน ]                            │ → moderation queue §5 (Q_REVIEW)
└──────────────────────────────────────────────────┘
        │ หลังกด "ส่งรายงาน":
        └─ ✓ toast "ได้รับรายงานแล้ว — ทีมงานจะตรวจสอบ" (acknowledge, ไม่เปิดเผยผล)
```

- **Components:** star input (required, switch-accessible), text field + char-counter, original-language radio, **camera-only photo attach** (1–4 รูป), moderation-expectation microcopy, submit (disabled-until-rating); states submitted/published/rejected+reason+edit-loop; **report bottom-sheet** (radio + other) + acknowledge-toast บน review ของคนอื่น.
- **เป้าหมายผู้ใช้:** แชร์ประสบการณ์จริงที่ร้านที่ตัวเองไป + รายงานรีวิวปลอม/สแปมได้ และรู้ว่ารายงานถูกรับแล้ว.
- **Action / system effect:** submit → **`INSERT reviews(place_id, rating, body, original_lang, linked_check_in_id, status='pending')`** + `evidence_media_ids[]` ถ้าแนบรูป → เข้า **content moderation queue §5 (`Q_REVIEW`)**; rating ถูกถ่วงด้วย **`trust_weight`** (จาก trust tier ของ `linked_check_in_id`: GPS-dwell < scan-QR < proven-purchase). approve → `status='published'` + นับเข้า trust-weighted rating ของ place; reject → `status='rejected'` + reason code. report → **`INSERT review_reports`** → moderation queue §5 (`Q_REVIEW`). **ไม่มี ledger txn** (UGC ไม่แตะเงิน).
- **SoD / step-up / PII-mask / audit:** **SoD บังคับฝั่ง §5** — author (`reviews.author_id`) ≠ moderator (`reviewed_by`) hard CHECK; ผู้เขียนรีวิว **ตรวจรีวิวตัวเองไม่ได้** (Approve disabled/hidden เมื่อ viewer==author). ไม่มี step-up/PII-unmask ฝั่ง consumer. รูปรีวิว reuse pipeline anti-fraud เดียวกับ §4.3 (**EXIF ≤ N นาที + GPS-in-EXIF + pHash dedup**) — verdict ไปแสดงให้ moderator (§5) ไม่ใช่ผู้ใช้. ทุกการตัดสินของ moderator = audit-log (ฝั่ง §5).
- **Empty / loading / error / SLA:**
  - *guest / ไม่มี visit fact* → ปุ่มเขียน **ไม่ render**; แทนด้วย "ยังไม่มีรีวิวจากคนที่ไปจริง — ไปเช็คอินเป็นคนแรก".
  - *loading (review list)* → skeleton 3 การ์ด.
  - *offline submit* → queue ส่งเมื่อ sync → pending (รูป upload retry); ถ้า fail ถาวร → toast "ส่งรีวิวไม่สำเร็จ ลองใหม่" (low-stakes).
  - *photo gate fail (EXIF/pHash)* → ฝั่ง consumer **ไม่ block submit** (รีวิวไม่ใช่ paid evidence) — แต่ verdict ติดไปกับ media ให้ moderator พิจารณา (กัน UX wall บนผู้ใช้สุจริต).
  - *SLA-breach (moderation > 24h)* → ไม่แสดงตัวนับฝั่งผู้ใช้ (ไม่สร้างความคาดหวังเชิงสัญญา); ฝั่ง §5 มี SLA timer + escalation.
  - *rejected loop* → แก้แล้วส่งใหม่ได้ไม่จำกัด (no lockout) ตราบใดไม่ใช่ abuse-flagged.
- **i18n/a11y:** เขียนภาษาใดก็ได้ + tag original; แสดงให้คนอื่น = auto-translate on-demand + chip "translated" + ปุ่ม "ดู original"; star keyboard/switch-accessible + text equivalent; report radio มี label; acknowledge-toast `aria-live="polite"`.

---

### 10.2 Merchant First-Time Signup — claim-code deep-link landing → auth → verify stepper (Web/Flutter)

> **เข้าจาก:** สแกน QR ที่ Field Agent มอบ (§4.5 ขั้น 2/4) — deep-link มี `merchant_claim_code` (เช่น `CNX-7F3K`) ผูก `place_id + territory_id + issued_by_agent_id`. นี่คือ **สะพานที่ §4.5 สัญญาไว้** (sync §3.1.a): จาก "Agent onboards" → "authenticated dashboard + verify stepper §8 โดยมีโค้ดผูกแล้ว". เป้าหมาย: **เจ้าของร้านไทยที่อาจไม่ tech-savvy** ทำให้จบได้ใน <2 นาที.

**(10.2-a) Deep-link landing — pre-filled code, แสดง "Place ไหนที่กำลัง claim"**
```
┌────────────────────────────────────────────────────────────┐
│              ยืนยันการเป็นเจ้าของร้าน                        │
│              Claim your shop on Soi Hop                      │
│                                                            │
│   ┌──────────────────────────────────────────────────────┐ │
│   │  📍 ร้านที่กำลังเชื่อม                                 │ │ ← จาก place_id ใน deep-link
│   │     ☕ ร้านกาแฟ Ristr8to                              │ │   (รูป+ชื่อ verified place จริง)
│   │     ถ.นิมมาน ซ.7 · เชียงใหม่                          │ │
│   │     โค้ดอ้างอิง: CNX-7F3K   ✓ ผูกกับ QR แล้ว           │ │ ← claim_code (pre-bound, read-only)
│   │     ส่งมอบโดยเจ้าหน้าที่: นิมมาน-เขต 1                  │ │ ← issued_by_agent (attribution)
│   └──────────────────────────────────────────────────────┘ │
│                                                            │
│   ถ้านี่คือร้านของคุณ → เข้าสู่ระบบ/สมัครเพื่อยืนยันต่อ      │
│                                                            │
│   [   ดำเนินการต่อ →   ]    [ นี่ไม่ใช่ร้านของฉัน (รายงาน) ] │ ← report = กัน QR หลุดผิดคน (10.2-e)
└────────────────────────────────────────────────────────────┘
```

**(10.2-b) Auth / account-create — persona-ordered (LINE first สำหรับไทย)**
```
┌────────────────────────────────────────────────────────────┐
│   เข้าสู่ระบบร้านค้า / Merchant sign-in                      │
│   กำลังยืนยัน:  ☕ Ristr8to  (CNX-7F3K)                      │ ← context คงไว้ตลอด (ไม่หลุด)
│                                                            │
│   [  💚  เข้าด้วย LINE  ]   ← แนะนำสำหรับร้านไทย (default บน) │
│   [  ✉  อีเมล + รหัสผ่าน  ]                                  │
│   [  Apple  ]   [  Google  ]   (ถ้าเปิดใช้)                  │
│                                                            │
│   ⓘ บัญชีนี้จะกลายเป็น "owner" ของร้าน Ristr8to หลังยืนยัน   │
│                                                            │
│   ─────────────────────────────────────────────────────    │
│   ไม่มี LINE / ไม่มีมือถือสมาร์ท?  [ ให้เจ้าหน้าที่ช่วย → ]   │ ← fallback (10.2-d)
└────────────────────────────────────────────────────────────┘
```

**(10.2-c) Post-auth routing → verify stepper §8 (code pre-bound)**
```
┌────────────────────────────────────────────────────────────┐
│  ยินดีต้อนรับ! เริ่มยืนยันร้าน Ristr8to                       │
│  ●━━━━○━━━━○━━━━○                                            │ ← stepper §8.x (Claimed→Identity→
│  Claimed  Identity  Finance  Ready                          │   Finance→Ready) — code ผูกแล้ว
│                                                            │
│  STEP ①  ยืนยันตัวตน (Identity)         Trust ▓▓▓▓░░ 40/40 ✓ │
│  ⭐ โค้ดจากเจ้าหน้าที่ (pre-filled):  [ C N X - 7 F 3 K ] ✓   │ ← auto-filled จาก session
│     +40 แต้ม — ผ่านเกณฑ์ identity ในก้าวเดียว  [ ยืนยันโค้ด ]  │   (ไม่ต้องพิมพ์ซ้ำ)
│  → ดำเนินการ verify stepper เต็มที่ §8                       │
└────────────────────────────────────────────────────────────┘
```

**(10.2-d) Fallback — "เจ้าของไม่มี LINE/สมาร์ทโฟน" (agent-assisted / email path)**
```
┌────────────────────────────────────────────────────────────┐
│ ←  ตั้งค่าด้วยอีเมล (ให้เจ้าหน้าที่ช่วยได้)                   │
│   ☕ Ristr8to · CNX-7F3K                                     │
│                                                            │
│   อีเมล:     [ owner@ristr8to.co.th        ]               │
│   รหัสผ่าน:  [ ••••••••              ] [ตั้งให้สุ่ม]         │ ← agent ตั้ง temp, owner เปลี่ยนทีหลัง
│   🔒 เจ้าหน้าที่จะไม่เห็นรหัสผ่านของคุณ (พิมพ์เอง/ตั้งสุ่ม)    │ ← privacy reassurance
│                                                            │
│   ☐ ส่งลิงก์ตั้งรหัสผ่านไปอีเมลให้เจ้าของยืนยันเอง           │ ← email-verify ownership
│   [ สร้างบัญชีและเริ่มยืนยัน → ]                             │
│   ─────────────────────────────────────────────────────    │
│   ยังติดขัด?  [ ขอความช่วยเหลือทาง Support → ]               │ → support ticket (merchant_onboarding)
└────────────────────────────────────────────────────────────┘
```

**(10.2-e) "นี่ไม่ใช่ร้านของฉัน" — confirm → handoff → success (ปิด dead-end, fraud-relevant)**
```
─ bottom sheet จากกด "นี่ไม่ใช่ร้านของฉัน (รายงาน)" ─────────
┌────────────────────────────────────────────────────────────┐
│  รายงานว่า QR/โค้ดนี้ส่งมาผิดคน?                              │
│  ☕ Ristr8to · CNX-7F3K · ส่งโดย: นิมมาน-เขต 1               │ ← echo สิ่งที่กำลัง report
│  ⓘ เราจะแจ้งทีมตรวจสอบ — โค้ดนี้จะถูกพักไว้จนกว่าจะเคลียร์    │ ← ตั้งความคาดหวัง + กัน claim ผี
│  (ไม่บังคับ) เกิดอะไรขึ้น?  [ ________________ ]              │ ← optional note
│  [ ยืนยันการรายงาน ]            [ ยกเลิก ]                    │
└────────────────────────────────────────────────────────────┘
        │ ยืนยัน →
        ▼
┌────────────────────────────────────────────────────────────┐
│ ✓ ได้รับรายงานแล้ว                                          │ ← success ack (--success)
│   ทีมงานจะตรวจสอบการส่งมอบโค้ดนี้ · ขอบคุณที่แจ้ง            │
│   [ เสร็จสิ้น ]                                              │
└────────────────────────────────────────────────────────────┘
```
> **Handoff (10.2-e):** ยืนยัน → **`INSERT support_tickets(kind='merchant_onboarding', flag='claim_wrong_recipient', subject_claim_code, issued_by_agent_id, note?)`** + set `merchant_claim.status='reported'` (พัก code, ไม่ auto-grant) → route **`Q_MERCHANT` §8.3** + **agent-attribution flag → City Manager §11.2** (ตรวจ agent ที่ออกโค้ด). โค้ดที่ถูก report ใช้ claim ต่อไม่ได้จนกว่า reviewer เคลียร์ — กัน mis-issued QR หลุดเป็น ownership ผิดคน.

- **Components:** (a) landing card = verified-place preview (รูป/ชื่อ/ที่อยู่/code/agent) + "ดำเนินการต่อ" + "ไม่ใช่ร้านฉัน(report)"; (b) auth choice persona-ordered (LINE→email→Apple/Google) + context-pinned banner + fallback link; (c) stepper §8 entry พร้อม code-prefilled chip; (d) email-fallback minimal + password-privacy note + email-verify checkbox + support escape; **(e) wrong-recipient report confirm + handoff + success-ack**.
- **เป้าหมายผู้ใช้:** เปลี่ยนจาก "สแกน QR เจ้าหน้าที่" → "เข้า dashboard + เริ่ม verify" โดยไม่ต้องพิมพ์ code ซ้ำ, มีทางออกถ้าไม่มี LINE, และมีทางรายงานถ้าโค้ดมาผิดคน (ไม่เป็น dead-end).
- **Action / system effect:** `claim_code` **bind ใน session ตั้งแต่ landing** → ส่งต่อทุกขั้น. auth สำเร็จ → **`INSERT merchant_accounts(role='owner')` + `merchant_claim(place_id, code, status='claimed')`** → trust state = **`CLAIMED`** → route เข้า **verify stepper §8** (Step① code pre-filled, รอ "ยืนยันโค้ด" = +40 trust → `IDENTITY` หลัง reviewer approve). report (10.2-e) → ดู handoff box ด้านบน. **ไม่มี ledger txn** (signup ไม่แตะเงิน; เงินเข้าได้ก่อนเงินออก — escrow top-up ปลดที่ IDENTITY_VERIFIED, payout ที่ FINANCE_VERIFIED §3.0).
- **SoD / step-up / PII-mask / audit:** trust ladder บังคับ **2 gate ผู้รีวิวคนละคน (SoD hard, §8): Gate1 Identity ≠ Gate2 Finance-verify** — merchant ออก redemption/รับ payout ไม่ได้จนผ่าน Gate2. email-fallback: เจ้าหน้าที่ตั้งบัญชีได้แต่ **ไม่เห็น/ไม่เก็บรหัสผ่าน** (password ไม่ผ่าน agent device แบบ plaintext; ใช้ set-password link หรือ random+force-reset) + **email-ownership verify** กัน agent ยึดบัญชี. wrong-recipient report = สัญญาณ fraud → ผูก agent-attribution ให้ City Manager ตรวจ (ไม่ใช่ silent action). KYC docs ที่อัปใน Gate2 = encrypted-at-rest (PDPA), masked-by-default ในคอนโซล §8 (unmask = DPO-approve tier; ดู §10.6 residual). ทุก state transition (CLAIMED→IDENTITY→FINANCE) + claim report = audit-log.
- **Empty / loading / error / SLA:**
  - *claim_code หมดอายุ/ใช้แล้ว* → "ลิงก์ยืนยันหมดอายุ — ขอ QR ใหม่จากเจ้าหน้าที่ที่มาที่ร้าน".
  - *place_id ใน deep-link ไม่พบ/ถูกลบ* → "ไม่พบร้านนี้ในระบบ" + ลิงก์ support (ไม่ปล่อยให้ claim ของผี).
  - *บัญชีเคยผูกร้านอื่นแล้ว* → "เพิ่มร้านนี้ในบัญชีเดิม?" (multi-place owner) แทนสร้างซ้ำ.
  - *claim ซ้อน (มีคน claim place เดียวกันค้าง)* → banner ส้ม `DISPUTED` + เข้าคิว **Disputed-claim dedupe §8** — **ไม่ auto-grant ใคร** (จอ resolution = back-office §8, ดู §10.6 residual).
  - *loading auth* → ปุ่ม spinner + คง context banner.
  - *SLA:* Gate1 review ปกติ < 24 ชม., Gate2 < 48 ชม. — แสดง "รอเจ้าหน้าที่ตรวจ — ปกติภายใน X ชม." (ฝั่ง §8 มี SLA timer + escalation จริง).
- **i18n/a11y:** auth เรียงตาม persona (LINE บนสุด); ทุก label locale-active; ปุ่ม ≥44px; ชื่อร้าน+code อ่านโดย screen reader ("โค้ดอ้างอิง CNX dash 7F3K"); fallback + report path เข้าถึงได้ด้วยคีย์บอร์ด; success-ack `aria-live="polite"`.

---

### 10.3 Agent Appeal Form + Status — rejected proposal → support ticket (Flutter, agent mode)

> **เข้าจาก:** การ์ด **REJECTED** ใน "ที่ส่งแล้ว / My Submissions" (§4.4) → ปุ่ม `[ อุทธรณ์ / Appeal ]` (sync §4.4a). ปิด dead-end ที่ critique ชี้ (`[อุทธรณ์]` ไม่มีปลายทาง). **ผลปฏิเสธมาจาก moderator (§5); การอุทธรณ์เปิด ticket ที่ route เข้า `Q_AGENT` review queue (§8.3/§9) และ "คนอื่นที่ไม่ใช่ moderator คนที่ปฏิเสธ" รีวิวซ้ำ (SoD hard, บังคับฝั่ง queue-routing).**
>
> **⚠ Dependency (completeness critical — Handoff Chain D):** ปลายทาง back-office ของ ticket นี้คือ **agent_dispute review queue + detail** ที่ต้อง (1) surface proposal เดิม + reason_code, (2) **block reviewer ที่เป็น rejecting-moderator** (SoD guard แบบ §7.2), (3) wire OVERTURNED → `apply_proposal` + re-accrue / UPHELD → close. **จอนี้เป็น deliverable ของ §8.3 (queue) / §7.x (moderation) — ไม่ใช่ §10**; §10.3 รับผิดชอบเฉพาะ contract (record `kind=agent_dispute`, queue `Q_AGENT`, SoD reviewer≠rejecter). ความเสี่ยงที่ queue ยัง undrawn → ระบุที่ §10.6 + ภาคผนวก.

**(10.3-a) Appeal form**
```
┌──────────────────────────────────────────────────┐
│ ←  อุทธรณ์ผลปฏิเสธ · ตรวจ geo "ร้าน Soi 9"         │
│                                                    │
│  ผลเดิม: 🔴 REJECTED                               │ ← --danger (icon+label, ไม่พึ่งสี)
│  เหตุผล (reason code): GPS_TOO_FAR — submit ห่าง 140ม.│ ← echo reason code (โปร่งใส)
│  ตรวจโดย: ทีม moderation · 11 มิ.ย. 14:20          │ ← reviewer = role label (ไม่เปิดชื่อบุคคล)
│                                                    │
│  เล่าสิ่งที่เกิดขึ้น (ทำไมคิดว่าผลไม่ถูก) *          │
│  ┌──────────────────────────────────────────────┐ │
│  │ ร้านมี 2 ทางเข้า GPS เด้งเพราะตึกบัง ผมยืนหน้า  │ │ ← reason text (required)
│  │ ป้ายจริง รูปเห็นป้ายชื่อชัด…              0/500  │ │
│  └──────────────────────────────────────────────┘ │
│  📎 แนบหลักฐานเพิ่ม (ถ้ามี)                         │
│  ┌────┐ ┌─────────────────┐                       │
│  │📷สด│ │ 📸 ถ่ายในแอป     │ ← optional re-evidence (camera, reuse EXIF/pHash/GPS)
│  └────┘ └─────────────────┘                       │
│                                                    │
│  ⓘ ส่งเป็นเรื่องร้องเรียน — ทีมจะตรวจซ้ำโดยคนละคน    │ ← SoD reassurance
│     กับผู้ปฏิเสธ · ไม่กระทบงานอื่นของคุณ            │
│  ┌──────────────────────────────────────────────┐ │
│  │          ส่งอุทธรณ์ / Submit Appeal             │ │ ← disabled จน reason ไม่ว่าง
│  └──────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────┘
```

**(10.3-b) Appeal status — แสดงเป็น sub-state บนการ์ดใน "ที่ส่งแล้ว" (§4.4)**
```
─ การ์ดเดิม §4.4 หลังส่งอุทธรณ์ ───────────────────────
🔴 ปฏิเสธ REJECTED · ตรวจ geo · "ร้าน Soi 9"
   reason code: GPS_TOO_FAR (140ม.)
   ⚖ อุทธรณ์: รอพิจารณา (PENDING)              ← ticket open ใน Q_AGENT, รอ reviewer คนใหม่
        │
        ├─ ✅ กลับคำ (OVERTURNED)
        │     "ตรวจซ้ำแล้ว GPS เด้งจากตึกบัง — อนุมัติ"
        │     → accept-rate/quality_score คืนค่า · ฿14 re-accrued (รอบถัดไป)
        │
        └─ ❌ ยืนผลเดิม (UPHELD)
              "หลักฐานยังไม่พอยืนยันตำแหน่งหน้าร้าน"
              → คงผลเดิม + แสดงเหตุ (no further penalty)
```

- **Components:** echoed reason-code + original verdict + reviewer-role label; reason text (required); optional camera re-evidence (EXIF/pHash reuse); SoD-reassurance microcopy; submit (disabled-until-reason); **3 sub-states** บนการ์ด §4.4 — pending / overturned / upheld + เหตุผล.
- **เป้าหมายผู้ใช้:** ได้ช่องทางยุติธรรมเมื่อเชื่อว่าผลปฏิเสธผิด — โดยไม่เสียงานอื่นและรู้สถานะตลอด.
- **Action / system effect:** submit → **`INSERT support_tickets(kind='agent_dispute', subject_proposal_id, subject_reason_code)`** + แนบ re-evidence media → route **`Q_AGENT` review queue (§8.3/§9)**. resolution:
  - **OVERTURNED** → moderator/CS คนใหม่ (≠ rejecter) approve proposal → `apply_proposal` (ขึ้น live ถ้ายังไม่มี) + **restore `agents.quality_score`/accept-rate** + ถ้าเป็นงานเงิน → **re-accrue → `AGENT_PAYOUT` รอบถัดไป** (canonical ledger, append-only — ไม่ใช่ ad-hoc balance edit). ถ้าเคยมี `AGENT_CLAWBACK` ผิด → reversing entry ผ่าน `reverses_txn_id`.
  - **UPHELD** → ticket close + คงผลเดิม + แสดงเหตุ (ไม่ลงโทษเพิ่มจากการอุทธรณ์ — กัน chilling effect).
- **SoD / step-up / PII-mask / audit:** **SoD hard** — reviewer ของ appeal **ต้อง ≠ moderator ที่ปฏิเสธ proposal เดิม** (enforced ฝั่ง `Q_AGENT` queue-routing §8.3/§9 — DB-level guard เหมือน §7.2 author≠moderator). reviewer-label แสดงเป็น **role** ("ทีม moderation") ไม่เปิดชื่อบุคคล (PII-protect ทั้งสองฝั่ง). re-evidence รูป reuse pipeline §4.3 (EXIF/GPS/pHash). re-accrue/clawback-reversal = ledger txn ที่ post โดย S4 ภายใต้ creator≠approver — **ไม่มีการแก้ยอด agent ตรงๆ**. ทุก ticket action + ledger txn = audit-log.
- **Empty / loading / error / SLA:**
  - *กดอุทธรณ์ซ้ำงานเดิมที่ยัง pending* → "อุทธรณ์นี้กำลังพิจารณาอยู่" (กัน duplicate ticket).
  - *reason ว่าง* → ปุ่ม disabled.
  - *re-evidence gate fail* → ไม่ block ส่งอุทธรณ์ (text อย่างเดียวพอ) — verdict แนบให้ reviewer.
  - *offline* → queue ส่งเมื่อ sync.
  - *SLA-breach (appeal เกิน SLA, เช่น > 72h)* → ฝั่งผู้ใช้แสดง "กำลังพิจารณา" (ไม่สร้างความคาดหวังตัวเลข); ฝั่ง §9 มี SLA timer + escalation → City Manager.
  - *role ถูก suspend ระหว่างอุทธรณ์* → งานค้าง/อุทธรณ์ **ไม่หาย** (due process, §4.0 fallback) — ยังเห็นผลได้แม้กลับ customer mode.
- **i18n/a11y:** reason field + sub-state + reason code 3 ภาษา; สถานะ icon+label (⚖/✅/❌ ไม่พึ่งสี); submit disabled-state มี aria.

---

### 10.4 Push Opt-In Primer — persona-toned, trigger หลัง first-stamp success (Flutter)

> **Trigger:** หลัง **first-stamp success** (§2.7 ③✓ / sync §2.12) — จังหวะที่ผู้ใช้เพิ่งได้คุณค่า จึงเต็มใจรับ nudge (ไม่ใช่ตอนเปิดแอปครั้งแรก = ขัด defer-auth/value-capture). **consent-gated**: deny/not-now → **ไม่ส่ง geo-push** (sync กับ marketing toggle §2.10). primer นี้คือ "pre-permission" — ขอ OS dialog เฉพาะเมื่อผู้ใช้กด "เปิดแจ้งเตือน" (กัน OS prompt เปลือง 1 ครั้งที่มี).

```
─ overlay (เหนือ first-stamp success screen, persona-toned) ─
┌──────────────────────────────────────────────────┐
│                  🔔 (illustration)                 │
│                                                    │
│   อยากให้เราเตือนตอนใกล้จบ quest                    │ ← headline = active-locale
│   หรือมีโปรสดใกล้คุณไหม?                            │
│                                                    │
│   ── persona tone (เลือกตาม persona §2.10) ──       │
│   tourist:  • ร้านถัดไปของ quest อยู่ใกล้คุณ        │ ← 2-bullet value (สั้น, จับต้องได้)
│             • รางวัล/โปรใกล้หมดเวลา                 │
│   local:    • แต้มโบนัสร้านแถวบ้านวันนี้             │
│   FIT(zh):  • 收藏清单的店有新优惠 (list ใกล้คุณ)    │
│                                                    │
│   ┌──────────────────────────────────────────────┐ │
│   │            เปิดแจ้งเตือน / Allow                │ │ ← → OS push dialog (CTA --brand-primary)
│   └──────────────────────────────────────────────┘ │
│              [ ไม่เป็นไร / Not now ]                │ ← not-now (no dead-end, re-ask ได้)
│                                                    │
│   🔒 เลือกได้ภายหลังใน โปรไฟล์ > การแจ้งเตือน        │ ← ทางถอน/ตั้งใหม่ (PDPA)
└──────────────────────────────────────────────────┘
        │
        ├─ Allow → OS push dialog →
        │     granted → toast "✓ เปิดแจ้งเตือนแล้ว" (--success) + consent write
        │     OS-denied → ไม่ retry OS prompt (เคารพ); แสดง "เปิดได้ใน Settings ภายหลัง"
        └─ Not now → ปิด overlay กลับ success; ไม่ส่ง geo-push; re-ask ที่ contextual moment ทีหลัง
```

- **Components:** illustration + persona-toned headline + 2-bullet value (สลับตาม persona) + allow (→OS dialog) + not-now + "ตั้งได้ภายหลัง" link.
- **เป้าหมายผู้ใช้:** เข้าใจ "ทำไมควรเปิด push" ด้วยเหตุผลที่ตรงกับ persona ตัวเอง แล้วเลือกได้โดยไม่ถูกบังคับ.
- **Action / system effect:** allow → request OS push permission → ถ้า granted → **`INSERT/UPSERT consents(user_ref, purpose='marketing_push', granted=true, source='primer')`** + เก็บ push token. deny/not-now → **ไม่ส่ง geo-push** (no consent row / granted=false). emit analytics: **`push_primer_shown{trigger:'first_stamp'}` → `push_primer_result{allow|deny|os_denied}`**. **ไม่มี ledger txn.**
- **SoD / step-up / PII-mask / audit:** **ไม่มี SoD/step-up** (self-consent ของผู้ใช้เอง). consent เป็น **first-class record** (PDPA) — granular per-purpose, มี timestamp + source, **ถอนได้ทุกเมื่อ** ใน Profile §2.10; **DPO consent-management console §11.1 อ่าน/จัดการ consent ผ่าน record ชุดนี้** (ฝั่ง consumer แค่ write/withdraw — DPO surface = back-office §11). geo-push เคารพ negative-assurance copy §1.7/§1.9 ("ใช้ location เฉพาะตอนเช็คอิน/แลก ไม่สร้างแผนที่เดินทางต่อเนื่อง").
- **Empty / loading / error / SLA:**
  - *marketing toggle ปิดอยู่ใน Profile* → primer **ไม่ขึ้นเลย** (เคารพ pref เดิม).
  - *เคย deny OS-level แล้ว* → ไม่ยิง OS prompt ซ้ำ; allow → ลิงก์ไป Settings แทน.
  - *not-now* → re-ask ได้ที่ contextual moment ทีหลัง (เช่น quest ใกล้จบ) — **ไม่สแปม** (cooldown).
  - *no error/loading state ซับซ้อน* (overlay เบา); ถ้า consent write fail → retry เงียบ + ไม่ block flow.
- **i18n/a11y:** headline/bullet active-locale + persona tone; allow/not-now ≥48dp; rationale อ่านได้ screen reader; ไม่พึ่งสีสื่อความ (allow = ปุ่มเต็ม, not-now = text button).

---

### 10.5 Guest Quest-Start Persist + Recovery / Merge — device-scoped (Flutter)

> **ปัญหาที่ critique ชี้:** guest กด "เริ่ม quest" ได้ (defer-auth §2.6) — แต่ถ้าปิดแอป/session หายก่อน first stamp, progress หายเงียบ = เสีย TTFS. แก้ด้วย **device-scoped guest persist** + recovery banner + merge ที่ first stamp (handoff §2.7). **ไม่มี back-office; ไม่มี ledger txn** (ยังไม่ได้ stamp = ยังไม่มี fact/Sparks).

**(10.5-a) Persist หลัง guest start — confirm เบาๆ (ไม่มี auth wall)**
```
─ หลังกด "เริ่ม Nimman Cafe-Hop" (guest) ──────────────
┌──────────────────────────────────────────────────┐
│  ✓ เริ่ม Nimman Cafe-Hop แล้ว                       │ ← เก็บ device-scoped (ไม่ขอ auth ตอนนี้)
│    เก็บแสตมป์แรกที่ร้านแรกได้เลย                     │
│    ⓘ ความคืบหน้าเก็บไว้ในเครื่องนี้ —               │ ← ตั้งความคาดหวังตรงไปตรงมา
│       เข้าสู่ระบบตอนแสตมป์แรกเพื่อกันหาย             │   (defer-auth + value-capture)
│    [ ไปร้านแรก → ]                                  │
└──────────────────────────────────────────────────┘
```

**(10.5-b) Recovery — guest กลับมาเปิดแอป (อ่าน device-scoped progress)**
```
─ Home/Passport banner เมื่อกลับมา ───────────────────
┌──────────────────────────────────────────────────┐
│ 🎫 คุณเริ่ม Nimman Cafe-Hop ไว้ (0/5) — เก็บต่อได้เลย│ ← non-blocking banner, info tone (jade)
│    [ เก็บต่อ → ]                  [ ✕ ]            │   อ่านจาก device guest progress
└──────────────────────────────────────────────────┘

  ถ้า device storage หาย (เคลียร์ cache/เครื่องใหม่):
┌──────────────────────────────────────────────────┐
│  Nimman Cafe-Hop · 0/5                             │ ← reset เป็น 0/5 เงียบๆ (no error/blame)
│  [ เริ่มเก็บแสตมป์ ]                                │   CTA เริ่มใหม่ (TTFS ยังเดินได้)
└──────────────────────────────────────────────────┘
```

**(10.5-c) Merge ที่ first stamp — guest progress → account (handoff §2.7)**
```
─ first stamp ของ guest → auth wall (§2.7 ②) → merge ─
┌──────────────────────────────────────────────────┐
│  เก็บแสตมป์แรกของคุณ! 🎉                            │
│  เข้าสู่ระบบเพื่อบันทึก progress (จะไม่หาย)          │ ← auth เด้ง "เฉพาะ" first stamp
│  [ 💚 เข้าด้วย LINE ]  [ Apple ] [ Google ] [微信]   │   persona-ordered
│  ⓘ Nimman Cafe-Hop ที่คุณเริ่มไว้จะถูกผูกเข้าบัญชี ✓ │ ← merge promise (device → account)
│                              [ ภายหลัง ]            │ ← dismiss ได้ (ไม่เสียที่ browse)
└──────────────────────────────────────────────────┘
        │ ถ้าบัญชี LINE นี้มี progress อยู่แล้ว (merge-conflict §2.7 ②b):
        ▼
┌──────────────────────────────────────────────────┐
│  บัญชีนี้มี progress อยู่แล้ว                        │
│  • ของตอนนี้ (guest): Cafe-Hop 0/5 (เพิ่งเริ่ม)     │
│  • บัญชีเดิม: Cafe-Hop 3/5, Temple 2/4              │
│  [ รวมแบบเก็บที่ดีที่สุด (แนะนำ) ]                   │ ← max-merge per quest (ไม่เสีย step)
│  [ ใช้บัญชีเดิม ]   [ ใช้ของตอนนี้ ]                 │ ← explicit, no silent loss
└──────────────────────────────────────────────────┘
```

- **Components:** (a) start-confirm เบา + persist-microcopy (ไม่มี auth wall); (b) recovery banner (มี progress) / silent-reset (storage หาย) — non-blocking; (c) first-stamp auth wall + merge-promise → max-merge conflict screen (reuse §2.7 ②b).
- **เป้าหมายผู้ใช้:** เริ่ม quest แบบ guest แล้วกลับมาเก็บต่อได้ ไม่งงว่า "ทำไมหาย" และไม่เสีย progress ตอนสมัคร.
- **Action / system effect:** start (guest) → **เขียน device-scoped store** (`guest_quest_progress` local: quest_id, started_at, steps=[]) — **ยังไม่แตะ server / ไม่มี Sparks** (ยังไม่มี stamp fact). recovery = อ่าน local store. **first stamp** = activation → auth (`auth_wall_shown{trigger:'first_stamp'}`) → **server merge: device guest progress → account (max-merge per quest, conflict = user เลือก)** → จากนั้น server บันทึก check-in fact + mint Sparks (§2.7). **ไม่มี ledger txn จนกว่า quest ปิด → grant_coins** (ฝั่ง §2.7). storage หาย = reset 0/N เงียบ (ยังไม่มี server fact ให้กู้ → ไม่ใช่ data loss เชิงบัญชี).
- **SoD / step-up / PII-mask / audit:** **ไม่มี** (pre-auth, device-local, ไม่มีเงิน/ไม่มี PII นอกจาก ephemeral device id). merge เป็น user-explicit choice (no silent loss). หลัง first stamp ทุกอย่างเข้าระบบ audit ปกติ (check-in fact).
- **Empty / loading / error / SLA:**
  - *storage หาย/เครื่องใหม่* → reset 0/N เงียบ + CTA เริ่มใหม่ (**no error, no blame**).
  - *guest start แต่ออฟไลน์* → persist local ปกติ (ไม่ต้องเน็ต); **แต่ first stamp ต้อง online** (§2.7 — กัน celebrate-แล้ว-rollback).
  - *auth dismissed ("ภายหลัง")* → กลับ browse; guest progress **คงอยู่ใน device** (ไม่เสีย); re-prompt ตอนพยายาม stamp อีกครั้ง.
  - *merge-conflict* → ผู้ใช้เลือกชัด (max-merge แนะนำ); ของที่ earn แล้วไม่หายทั้งสองฝั่ง.
  - *guest มีหลาย quest started* → recovery banner รวม "คุณเริ่มไว้ N quest".
- **i18n/a11y:** banner active-locale; progress มี "0/5" text; recovery banner `aria-live="polite"`; merge ตัวเลือกอ่านลำดับชัด; ไม่ flash/strobe.

---

### 10.6 Cross-screen handoff สรุป (consumer/merchant → back-office) + dependency gate

| จอ (§10) | สร้าง record | ไปโผล่ที่คอนโซล (queue) | SoD/audit ที่ผูก | จอ back-office วาดแล้ว? |
|---|---|---|---|---|
| 10.1 Review | `reviews(status=pending)` | Content Moderation §5 (`Q_REVIEW`) | author≠moderator (hard); audit ทุก verdict | ⚠ ต้องมี §5/§7 review queue |
| 10.1 Report | `review_reports` | Content Moderation §5 (`Q_REVIEW`) | moderator≠reported-author; audit | ⚠ เช่นเดียวกัน |
| 10.2 Merchant signup | `merchant_claim(claimed)` + trust=CLAIMED | Merchant Verify §8 (Gate1/Gate2) | Identity≠Finance reviewer (hard); KYC masked; step-up บน finance-verify | ✓ §8 stepper (Gate review queue = §8) |
| 10.2 Wrong-recipient report | `support_tickets(merchant_onboarding, flag=claim_wrong_recipient)` + claim=reported | `Q_MERCHANT` §8.3 → City Manager §11.2 (agent-attribution) | reviewer ตรวจ agent ที่ออกโค้ด; audit | ⚠ ต้องมี `Q_MERCHANT` lane + CityMgr attribution view |
| 10.3 Agent appeal | `support_tickets(agent_dispute)` | **`Q_AGENT` review queue §8.3/§9** | reviewer≠rejecting-moderator (hard); re-accrue/clawback-reversal ผ่าน ledger (creator≠approver) | ⚠ **undrawn — agent_dispute queue + detail (completeness CRITICAL Chain D)** |
| 10.4 Push primer | `consents(marketing_push)` | DPO consent mgmt §11.1 | self-consent; ถอนได้; ไม่มี SoD | ✓ DPO consent view §11.1 |
| 10.5 Guest persist | device-local (no server) → merge ที่ stamp | — (เข้าระบบที่ §2.7) | — | — |

> **กฎที่ทุกจอ §10 ยึดร่วมกัน:** (1) ไม่มีจอใดแก้ live data หรือ post ledger txn โดยตรง — ทุกอย่างเป็น **proposal/ticket/consent/local** ที่ back-office หรือ activation flow เป็นผู้ commit; (2) **เงินเข้าได้ก่อนเงินออก** (escrow ที่ IDENTITY, redeem/payout ที่ FINANCE — §10.2); (3) reuse anti-fraud pipeline เดียว (camera-only + EXIF + pHash + GPS) ทั้ง review photo (§10.1) และ agent re-evidence (§10.3); (4) defer-auth + value-capture — auth เด้งเฉพาะ first-value moment (§10.5), consent ขอเฉพาะหลังได้คุณค่า (§10.4); (5) **ไม่มี dead-end CTA** — ทุกปุ่ม (report/appeal/wrong-recipient/not-now) มี confirm/success/handoff หรือ re-ask path.
>
> **⚠ Back-office dependency (out-of-scope สำหรับ §10 — เป็น §7–§11 deliverable แต่ระบุไว้กัน orphan):** §10 คือ *ต้นทาง* ของ record เหล่านี้; *ปลายทาง* ที่ต้องวาดในคอนโซล Admin มี **3 จอที่ critique จัดเป็น CRITICAL** ยังไม่มีในสเปก back-office: **(A) agent_dispute review queue + detail** (รับ ticket จาก §10.3, block rejecting-moderator, wire OVERTURNED→`apply_proposal`+re-accrue) — Chain D dead-end ถ้าไม่วาด; **(B) DPO pending-unmask approval queue** (รับคำขอ unmask KYC/payment จาก §8.2/§8.4 — §11.1.d เป็น monitoring ไม่ใช่ approval inbox; กระทบ §10.2 KYC-unmask path); **(C) Disputed-claim dedupe resolution detail** (รับ `DISPUTED` จาก §10.2 — มีแต่ banner ไม่มีจอตัดสิน, block Gate1). จอเหล่านี้ **ไม่ใช่ของ §10**; §10 ปิด contract ฝั่งผู้ใช้ครบแล้ว (record + queue-target + SoD) — รายการเต็มของ gap ฝั่ง back-office อยู่ในภาคผนวกความเสี่ยง.

---

### 10.7 Critique disposition — missing-screens scope (รับ / ปฏิเสธ + เหตุผล)

**รับเข้า (fold-in) — แก้ในสเปก §10 นี้:**

| # | severity | ประเด็น (critique) | แก้ที่ §10 |
|---|---|---|---|
| 1 | completeness MINOR | 10.2 "นี่ไม่ใช่ร้านของฉัน (report)" = dead-end (ไม่มี confirm/success/handoff) | **§10.2-e ใหม่:** confirm sheet → `support_tickets(merchant_onboarding, flag=claim_wrong_recipient)` + พัก code + route `Q_MERCHANT`→CityMgr (agent-attribution) → success-ack |
| 2 | logic MINOR | state-color token drift (re-pin hex ต่างเอกสาร) | **§10 header + ทุกจอ:** อ้าง token ด้วยชื่อตัวแปร (`--danger`/`--success`/`--warning`/`--hold`/`--brand-primary`); ยืนยัน `--danger`=#D64545, `--success`=#2BA84A, `--hold`=#7A8290 ตรง doc 06 §1.2/§1.9 canonical |
| 3 | completeness CRITICAL | Chain D — agent appeal ticket ไม่มี queue ปลายทาง (reviewer≠rejecter SoD) | **§10.3 contract เข้มขึ้น:** ระบุ queue `Q_AGENT` + SoD reviewer≠rejecting-moderator (hard, queue-routing) + OVERTURNED→`apply_proposal`+re-accrue wiring; **flag จอ back-office เป็น dependency ⚠** ใน §10.6 (วาด = §8.3/§7.x) |

> **เหตุผลที่ #3 "รับครึ่งเดียว":** ส่วนที่เป็น **contract ฝั่งผู้ใช้/handoff** (record kind, queue target, SoD ที่ต้องบังคับ, OVERTURNED/UPHELD effect) = งานของ §10 → fold เข้าแล้ว. ส่วนที่เป็น **จอ back-office จริง** (agent_dispute queue list + detail + SoD guard UI) = deliverable ของ §7.x/§8.3 → ระบุเป็น dependency ⚠ ใน §10.6 ไม่ใช่วาดใน §10 (กัน persona/section ปน). เหมือนกับ §10.2 wrong-recipient: §10 ออก ticket + พัก code ได้, แต่ "จอ City Manager ตรวจ agent" อยู่ §11.2.

**ปฏิเสธ / นอกขอบเขต §10 (เหตุผล — ส่งต่อ section ปลายทาง, กัน orphan):**

- **completeness CRITICAL — Brand/Sponsor console + home + Sponsor Campaigns + scoped analytics; agent_dispute review queue (back-office side); DPO pending-unmask approval queue** → เป็น **back-office (web admin §7–§11)** persona แยกจาก consumer/merchant. §10 = surface ผู้ใช้ปลายทางเท่านั้น; §10.3/§10.2 ออก *record + queue-target* ให้แล้ว แต่จอที่ reviewer ใช้ตัดสิน = §7/§8/§11. ระบุเป็น dependency ⚠ §10.6.
- **completeness MAJOR — Settings · Roles (RBAC grant + SoD-at-grant); Media Pending queue; Disputed-claim dedupe resolution; Owner/P.Admin role home; CityMgr Support-Tickets view; Analyst read-only Solvency/Onboarding** → **role-console reachability + back-office screens (§7.1 nav / §11)** ทั้งหมด. ไม่มีจอใดเป็น consumer/merchant surface; §10 ไม่ใช่เจ้าของ. (Disputed-claim ถูกอ้างจาก §10.2 error-state แต่ *จอตัดสิน* = §8 — flag ⚠ §10.6.)
- **logic CRITICAL — CityMgr approve change_proposal SoD (§7.1 matrix vs §11.2.c)** → ความขัดแย้งของ **role-matrix/accessControlProvider ฝั่ง console** (§7.1/§11.2). ไม่แตะจอ §10 (consumer/merchant ไม่ approve proposal). ส่งต่อ §7/§11 reconcile (ใช้กฎเข้ม §11.2: CityMgr = read/escalate only).
- **logic MAJOR — Freeze override role mismatch (§7.1 vs §9.d); payment-instrument unmask tiering (§8.4 vs §9.a); manual-freeze step-up (§9.d)** → กติกา **money-integrity/RBAC/step-up ของ back-office** (§8/§9). §10 ไม่มีจอ freeze/unmask/payout; KYC-unmask ที่ §10.2 อ้างถึงเป็น *back-office tier* (DPO-approve) ไม่ใช่ self-step-up ในจอ merchant → consistent กับฝั่งเข้มอยู่แล้ว. ปลายทาง = §8.4/§9.
- **logic MINOR — payout.approve audit severity (§11.1.d)** → **audit-taxonomy ของ DPO viewer (§11)** — ไม่มี money-out action ในจอ §10. ส่งต่อ §11.
- **completeness MINOR — DPO blocker drill-down reachability (Chain C); Cross-border SCC/DPA registry orphan nav** → **DPO console (§11.1)** internal navigation. ไม่เกี่ยว consumer/merchant surface. ส่งต่อ §11.

> หลักการ filter: §10 = **consumer + merchant first-run surface** (ผู้ใช้ปลายทาง, ไม่มี PII-unmask/ledger-post/SoD ภายในจอ). รับ finding ที่เปลี่ยน *จอ/CTA/state/handoff-contract ของผู้ใช้ปลายทาง*; ส่งต่อ finding ที่เป็น *จอ back-office / role-matrix / step-up / audit-taxonomy / money-integrity rule*. ทุก reject ระบุปลายทาง (§7/§8/§9/§11) เพื่อไม่ให้หล่น — และ dependency ที่ §10 *เรียกใช้* แต่ยัง undrawn ถูกยก ⚠ ไว้ที่ §10.6 อย่างชัดเจน.

---

## 11. DPO/PDPA, City Manager & Analyst Consoles

> **Surface:** Back-office web (Next.js + Refine), desktop-density, role-gated single app. **Design system:** Lanna-modern (doc 06 §1) — แต่ admin = denser/utilitarian/data-table-heavy. **โทเคนสีอ้างชื่อ-ตัวแปรจาก doc 06 §1.2/§1.9 เท่านั้น (ไม่ re-pin hex ในหมวดนี้ — กัน token drift):** `--brand-primary #E8852C` ใช้เฉพาะ CTA/active-nav/destructive-confirm; `--brand-secondary` (jade `#1E8E7E`) = link/secondary; `--surface-paper`/`--ink-*` สำหรับ surface; semantic = `--success`/`--warning`(ochre)/`--danger`/`--hold`(slate)/`--info` ตาม doc 06 §1.2; Coins ◉ = metallic gold (`--coin-gold`), Sparks ✦ = violet (`--spark-violet`) — admin แทบไม่ใช้ Coin/Spark สี เพราะเป็น data surface (ตัวเลข = `--ink-900` เสมอ, §1.7). ในจอ admin **อนุญาตเลขบาท (฿)** (เป็น admin surface, single-currency-per-field — doc 06 §1.2 "กฎมูลค่าบาท"); แต่ **ห้าม mirror เลขบาท×Coin กลับฝั่งผู้ใช้**.
> **Roles ในหมวดนี้:** **DPO** (Role 12), **City/Regional Manager**, **Analyst/API-Partner**. ทุกจอแสดง role-context chip ที่ top-bar + ABAC scope (city/territory). ทุก high-impact action = **step-up MFA (aal2, §S3.5)** + เขียน **`audit_log` (append-only, hash-chain `prev_hash/row_hash`)**. PII = **masked by default** ผ่าน ABAC `PII_MASK`; unmask ต้อง justification + step-up + audit.
> **ขอบเขตหมวดนี้ (กัน scope-bleed):** จอ Owner/Platform-Admin home, **Settings · Roles** (console-role grant/RBAC), **manual-freeze form / freeze-override**, **Brand/Sponsor console**, **agent-dispute review queue**, **disputed-claim dedupe**, **Media-Pending queue** — *เป็นของหมวด §7/§8/§9 ไม่ใช่ §11* (ดู §11.5 cross-doc reconciliation). หมวดนี้วาดเฉพาะ 3 console: DPO · City Manager · Analyst และ **destination ที่หมวดอื่นชี้เข้ามาที่ DPO** (unmask-approval inbox).
> **Header pattern (ใช้ทุกจอในหมวดนี้):**
> ```
> ┌──────────────────────────────────────────────────────────────────────────┐
> │ Soi Hop · Back-Office     [ role: DPO ▾ ]  scope: ทุกเมือง   🔔  ◐ aal2 ✓ │
> └──────────────────────────────────────────────────────────────────────────┘
>   ◐ aal2 = step-up ใช้งานอยู่ (มี TTL); ◯ aal1 = ต้อง step-up ก่อนทำ high-impact
> ```

---

### 11.1 DPO / PDPA Console

> 🎯 **Operator goal (DPO, Role 12):** เป็น "ผู้เฝ้า ops" คนเดียว — ดำเนินคำขอ DSAR/erasure ตาม **eligibility gate** (`cs_open_obligations`, fail-closed), **อนุมัติคำขอ unmask sensitive จาก CS/Finance** (Q_PRIVACY inbox — DPO เป็นผู้ approve, §S1.4), ดู preview ว่าอะไรถูก pseudonymize ใน ledger vs ลบ geo จริง, จัดการ consent, เดิน **tiered breach runbook** (no-risk/risk/high-risk · 72h + 15-day valve), และตรวจ **append-only audit-log** (รวม CS unmask spikes).
> **ABAC:** DPO = scope ทั้งเมือง, อ่าน sensitive (KYC/payment/trajectory) ได้ภายใต้ audit; เป็น role เดียวที่ approve erasure/sensitive-unmask. **SoD:** DPO ไม่โพสต์ ledger txn เอง (Finance owns money); DPO trigger breach broadcast ผ่าน privileged path เดียว (ไม่ใช่ producer ทั่วไป — §S1.6/§S2.9 breach linkage).

**Left-nav (DPO):**
```
┌─────────────────┐
│ ⚖ DPO Console   │
│  ▸ Unmask Inbox │  ← คิว approve unmask (KYC/payment/trajectory) จาก CS/Finance ●N
│  ▸ DSAR / Erasure│  ← คิวคำขอ
│  ▸ Consent       │  ← consent registry (per purpose/lawful_basis)
│  ▸ Breach Runbook│  ← incident + risk-tier
│  ▸ Audit Log     │  ← append-only viewer (hash-chain verify)
│  ▸ Unmask Review │  ← เฝ้า CS unmask post-hoc (insider-threat) — แยกจาก Inbox
│  ▸ Cross-border  │  ← SCC/DPA registry (read-only)
└─────────────────┘
```
> **หมายเหตุ nav (แก้ critique completeness-critical "no DPO unmask approval inbox" + แก้ confusion):** **Unmask Inbox (§11.1.a) = approval ก่อนเหตุ** (รับคำขอจาก CS/Finance ที่กด `[ ขอ DPO → ]` ใน §8.2/§8.4 → routed `Q_PRIVACY`); **Unmask Review (§11.1.e) = monitoring หลังเหตุ** (จับ spike insider-threat). สองจอนี้คนละหน้าที่ ไม่ใช่จอเดียว.

#### 11.1.a Unmask Inbox — DPO approval ของ sensitive PII (KYC / payment-instrument / trajectory)

> **เหตุที่มีจอนี้:** §S1.4 + ตาราง §S1.4.2 กำหนดว่า field กลุ่ม **sensitive จริง (KYC doc / payment instrument / location trajectory) → CS/Finance unmask เองไม่ได้แม้มี ticket — ต้อง DPO approve ต่อคำขอ** (route → `Q_PRIVACY`). CTA `[ ขอ DPO → ]` ใน §8.2/§8.4 เดิม "ชี้ไปที่ไม่มีปลายทาง" — จอนี้คือปลายทางนั้น (ปิด cross-surface dead-end).

```
┌──────────────────────────────────────────────────────────────────────────┐
│ Unmask Inbox · คำขอเปิดเผย PII อ่อนไหว (รอ DPO อนุมัติ)        ●5 รอดำเนินการ│
│ ┌─ filter ─────────────────────────────────────────────────────────────┐  │
│ │ ผู้ขอ:[ ทั้งหมด▾ ] กลุ่มข้อมูล:[ ทั้งหมด▾ ] reason:[ ทั้งหมด▾ ] SLA:[≤24h▾]│  │
│ └───────────────────────────────────────────────────────────────────────┘  │
│ ───────────────────────────────────────────────────────────────────────── │
│ req_id   ผู้ขอ(role)      กลุ่มข้อมูล         ผูก ticket  reason_code   รอ │
│ UM-512   fin_02(Finance)  payment_instrument  TK-901      psp_dispute_doc 3h→│
│ UM-511   cs_07(Support)   kyc_doc             TK-898      legal_request   6h→│
│ UM-510   cs_04(Support)   payment_instrument  TK-882      refund_payee   11h→│
│ UM-509   cs_07(Support)   location_trajectory FC-204      (legal only) ⚠ 19h→│
│ UM-508   fin_02(Finance)  payment_instrument  BATCH-44    verify_payout   1h→│
└──────────────────────────────────────────────────────────────────────────┘
```
- **Components:** Refine `<List>`; แต่ละแถวลิงก์ไป detail; severity chip บน `location_trajectory` (⚠ = "legal only — rarely", §S1.4.2). SLA = "ลูกบอลฝั่งเรา" (subject รอ).

**Detail — approve/deny พร้อม minimum-necessary scope:**
```
┌──────────────────────────────────────────────────────────────────────────┐
│ ← UM-512 · คำขอ unmask payment_instrument          ผู้ขอ: fin_02 (Finance) │
│ ────────────────────────────────────────────────────────────────────────  │
│  subject: u_5b1c…(masked)   ผูก: TK-901 (PSP dispute, IN_PROGRESS ✓)        │
│  reason_code: psp_dispute_doc   justification: "ต้องเลข bank 4 ตัวท้ายยืน   │
│              เอกสารต่อ PSP chargeback rep — ดู TK-901 evidence #3"          │
│  ┌─ ขออ่าน fields (DPO กำหนด minimum-necessary ได้) ───────────────────┐   │
│  │ ☑ bank_acct_last4      (จำเป็นต่อ PSP rep)                           │   │
│  │ ☐ bank_acct_full       (เกินจำเป็น — ไม่อนุมัติ)                     │   │
│  │ ☐ card_pan             (ไม่เกี่ยวคำขอนี้)                            │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│  TTL ที่จะให้: [ 30 นาที ▾ ] (time-boxed; หมดเมื่อ ticket ออก active)       │
│  ────────────────────────────────────────────────────────────────────────  │
│  [ ปฏิเสธ (เหตุผล) ]              [ ✓ อนุมัติ unmask — ↧ step-up MFA ]      │
└──────────────────────────────────────────────────────────────────────────┘
```
- **Operator goal:** DPO ตัดสิน "เห็นได้ไหม + เห็นแค่ไหน" — บังคับ `fields ⊆ MINIMUM_NECESSARY(ticket.category)` ก่อนปล่อย (data-minimization, C.4).
- **Action/system effect:** **approve** → ปล่อย unmask grant time-boxed (TTL) ให้ "ผู้ขอ" ฝั่ง §8/§9 (ไม่ใช่ DPO เห็นเอง); เขียน `audit_log{action=pii_unmask.approve, fields, reason_code, step_up_ref, ttl}`. **deny** → audit `pii_unmask.deny` + เหตุผล; ผู้ขอเห็นว่าถูกปฏิเสธ. **ทั้งสองต้องผูก active ticket** — ถ้า ticket หลุด active state ระหว่างรอ → คำขอ auto-void ("ticket ปิดแล้ว — คำขอเป็นโมฆะ").
- **Step-up/SoD:** approve = aal2; **DPO เป็น approver, ผู้ขอเป็น requester (creator≠approver)** — DPO ไม่สร้างคำขอเอง (กัน self-approve). `location_trajectory` = legal-request-only gate (UI เตือน + ต้องแนบ legal ref).
- **PII:** DPO เห็น metadata คำขอ (subject masked) ในจอนี้ — **ค่า PII จริงไม่โผล่ที่ DPO**; DPO แค่อนุญาตให้ requester เห็น (DPO = gatekeeper ไม่ใช่ผู้บริโภคข้อมูล โดย default).
- **States:** **empty** = "ไม่มีคำขอ unmask ค้าง"; **loading** = skeleton; **error** = "เชื่อมต่อ Q_PRIVACY ไม่ได้ — แสดง cached, ห้าม approve (fail-closed)"; **SLA-breach** = แถวขอบ danger + 🔔.

#### 11.1.b DSAR / Erasure — คิว + Eligibility Gate

```
┌──────────────────────────────────────────────────────────────────────────┐
│ DSAR / Erasure Requests                            [ + บันทึกคำขอช่องทางอื่น ]│
│ ┌─ filter ─────────────────────────────────────────────────────────────┐  │
│ │ ประเภท:[ ทั้งหมด▾ ] สถานะ:[ blocked▾ ] เมือง:[ ทุกเมือง▾ ] SLA:[ ≤7d▾ ]│  │
│ └───────────────────────────────────────────────────────────────────────┘  │
│ ───────────────────────────────────────────────────────────────────────── │
│ req_id   ประเภท   subject_user_ref   ยื่นเมื่อ   สถานะ          เหลือ(30วัน)│
│ DS-2041  Erasure  u_9f3a…(masked)    6/10 14:22  ⛔ BLOCKED      18 วัน  →  │
│ DS-2040  Access   u_77b1…(masked)    6/11 09:05  ⏳ IN_PROGRESS  19 วัน  →  │
│ DS-2039  Erasure  u_22cd…(masked)    6/09 18:40  ✅ ELIGIBLE     17 วัน  →  │
│ DS-2038  Portab.  u_0aa2…(masked)    6/08 11:10  ✓ FULFILLED     —      →  │
│ DS-2031  Erasure  u_d41e…(masked)    5/20 08:00  ⏸ CHARGEBACK_WAIT 4 วัน →  │
└──────────────────────────────────────────────────────────────────────────┘
```
- **Components:** Refine `<List>` data-table, filter pills (doc 06 §1.4 chip), status badge (⛔ `--danger` / ⏳ `--ink-600` / ✅ `--success` / ⏸ `--hold` slate), **30-วัน PDPA-fulfilment countdown** ต่อแถว (เป็น "ลูกบอลฝั่งเรา" SLA), `subject_user_ref` masked ตาม C.3.
- **State machine:** `RECEIVED → ELIGIBILITY_CHECK → {ELIGIBLE | BLOCKED | CHARGEBACK_WAIT} → IN_PROGRESS → FULFILLED`. Access/Portability (ม.30/31) ไม่ต้องผ่าน erasure gate แต่ก็ audit.
- **Empty:** "ยังไม่มีคำขอ DSAR". **Loading:** skeleton rows. **Error:** "เชื่อมต่อ obligations service ไม่ได้ — แสดงเฉพาะ cached, ห้ามดำเนินการ erasure (fail-closed)".
- **SLA-breach:** countdown < 3 วัน → แถวขอบ danger + 🔔 escalate; เกิน 30 วัน → แดงเต็ม + แจ้ง Owner (เสี่ยงปรับปกครอง สูงสุด 5M, doc 02 C.4(h)).

**Erasure detail — Eligibility gate (ชี้ว่าทำไม block + blocker คลิกได้แบบ DPO-scoped):**
```
┌──────────────────────────────────────────────────────────────────────────┐
│ ← DS-2041 · Erasure (PDPA ม.33)         subject: u_9f3a… [ 👁 unmask ↧step-up]│
│ ────────────────────────────────────────────────────────────────────────  │
│  ⛔ ERASURE BLOCKED — มีภาระค้าง (fail-closed)                             │
│  เหตุผลจาก cs_open_obligations(user_ref) + chargeback-window: ❗clear ก่อนลบ │
│  ┌────────────────────────────────────────────────────────────────────┐   │
│  │ ☒ has_open_dispute          ⛔ มี — TK-870 (เปิด)         👁 ดู →    │   │
│  │ ☒ has_pending_money_action  ⛔ มี — REFUND ค้าง #TK-881 (รอ post) 👁→│   │
│  │ ☐ has_false_claim_flag      ✅ ไม่มี                                 │   │
│  │ ☒ fraud_score ≥ threshold   ⛔ 0.82 ≥ 0.70 — fraud_case FC-204    👁→│   │
│  │ ☒ chargeback_window          ⏸ ยังไม่พ้น — last_card_funded 5/28     │   │
│  │                                 (พ้น 9/25 · window 120วัน)          │   │
│  └────────────────────────────────────────────────────────────────────┘   │
│  legal basis คงข้อมูล: legal-obligation (ภาษี ม.87/ม.24(6)) + legitimate-  │
│  interest (fraud evidence จน case ปิด · มี LIA on file).                   │
│  [ แจ้ง subject (เหตุผล+timeline) ✉ ]   [ ตั้งเตือนเมื่อ obligation clear ] │
└──────────────────────────────────────────────────────────────────────────┘
```
> **gate fields = canonical `cs_open_obligations` 5 ค่า** (`has_open_dispute`, `has_pending_money_action`, `fraud_score`, `has_false_claim_flag`, `last_card_funded_txn_at`→chargeback-window) ตรงตาม §S1.4.1 — ไม่ประดิษฐ์ field เกิน schema.
- **Operator goal:** เห็น *เป๊ะ ๆ* ว่าทำไมลบไม่ได้ + แต่ละ blocker เปิดดูได้.
- **Drill behavior (แก้ critique completeness-minor "Chain C reachability"):** ปุ่ม `👁 ดู →` บน blocker = เปิด **read-only DPO-scoped panel** ของ record ที่บล็อก (สถานะ + role เจ้าของ + "owned by Finance/Fraud — view only") **ไม่ใช่ deep-link เข้า console ที่ DPO act ไม่ได้** (DPO ไม่มี nav money/fraud). มีปุ่ม `[ แจ้งเจ้าของ → ]` (notify owning role) แทนการกดเคลียร์เอง — **ไม่ dead-end, ไม่ละเมิด SoD**.
- **Action/system effect:** ปุ่ม erase **disabled** จนทุก blocker = ✅; nothing posts. "แจ้ง subject" = ส่ง notice ผ่าน privileged DSAR path (§S2.9), audit.
- **SoD:** DPO อ่าน blocker ได้ แต่ **clear money-action/fraud ไม่ได้เอง** (Finance/Fraud owns) — กัน DPO ลบเพื่อหนี investigation.
- **fail-closed:** RPC ใด fail/timeout → ถือว่า "ยืนยัน eligibility ไม่ได้" → block (ห้ามลบ). แสดง "ตรวจ obligation ไม่ครบ — ระงับไว้".
- **audit:** เปิดจอ = `action=dsar.view`; unmask = `action=pii_unmask`(reason+step_up_ref).

**Erasure PREVIEW — pseudonymize vs delete (เมื่อ ELIGIBLE):**
```
┌──────────────────────────────────────────────────────────────────────────┐
│ DS-2039 · Erasure — ตัวอย่างก่อนลบ (ELIGIBLE ✅)         ⚠ ลบแล้วกู้ไม่ได้  │
│ ────────────────────────────────────────────────────────────────────────  │
│  🗑 ลบจริง (hard delete / raw)            🔒 คงไว้แบบ pseudonymize          │
│  ┌──────────────────────────────┐        ┌──────────────────────────────┐ │
│  │ • mapping user_ref→identity   │        │ • ledger txns (redemption     │ │
│  │   (ชื่อ/เบอร์/email/Apple sub)│        │   FACT: amount, Coin, place,  │ │
│  │ • raw check-in GPS / geo trail│        │   ts, tax fields) → user_ref  │ │
│  │ • movement graph (behavioral) │        │   เก็บ 7 ปี (ม.87/ม.24(6))     │ │
│  │ • device fingerprints (non-   │        │ • dispute_verdicts → user_ref │ │
│  │   evidentiary)                │        │ • tombstone hash (non-PII) →  │ │
│  │ • marketing profile/segments  │        │   ให้ late CHARGEBACK ผูกได้   │ │
│  └──────────────────────────────┘        └──────────────────────────────┘ │
│  retention_class: behavioral_short → ลบ · tax_7y → คง (pseudonymous)        │
│  หลังลบ: ledger ยัง balance ได้ (double-entry ไม่กระทบ) · A.8.12 cluster    │
│         คง tombstone กัน erase-เพื่อหนี.                                    │
│  พิมพ์ "ERASE u_22cd" เพื่อยืนยัน:  [______________]                        │
│  [ ยกเลิก ]                       [ ⚠ ลบถาวร — ↧ step-up MFA ]  (disabled)  │
└──────────────────────────────────────────────────────────────────────────┘
```
- **Operator goal:** DPO เห็น 2 คอลัมน์ชัด — **อะไรหาย / อะไรอยู่** — ก่อนกดลบ; ตรงกับ C.3 ("เก็บ fact ไม่เก็บ graph").
- **Action/system effect:** กดลบ → edge fn `erase-account`: ลบคอลัมน์ซ้าย, set ledger เป็น pseudonymous (mapping ลบ), เขียน `audit_log{action=erasure.execute, before/after redacted}`. **ไม่มี ad-hoc balance edit** — ledger ไม่ถูกแตะ amount, แค่ identity mapping หาย.
- **Step-up:** typed-confirm + aal2 (bulk-delete/PII ปลายทาง = §S3.5). **a11y:** destructive ปุ่ม disabled จน typed-confirm; danger ⚠ ไม่พึ่งสีเดียว (มีไอคอน+ข้อความ — doc 06 §1.7).
- **Error:** ระหว่างลบ partial-fail → rollback + "ลบไม่สมบูรณ์ — ระบบ revert, ลองใหม่" (atomic; ไม่ทิ้ง orphan).

#### 11.1.c Consent Management

```
┌──────────────────────────────────────────────────────────────────────────┐
│ Consent Registry (append-only · per purpose · per lawful_basis)            │
│ ┌─ aggregate (k-safe, ไม่เผยรายบุคคลโดย default) ──────────────────────┐  │
│ │ purpose            lawful_basis   granted%   ผู้ถอนล่าสุด  policy_ver │  │
│ │ location_checkin   consent        91.2%      6/14 09:12     v3.2     │  │
│ │ marketing          consent        34.7%      6/14 10:40     v3.2     │  │
│ │ analytics_anon     legitimate_int  (LIA✓)     —             v3.2     │  │
│ │ data_product       consent        12.0%      6/13 22:01     v3.1 ⚠   │  │
│ └────────────────────────────────────────────────────────────────────┘  │
│  ⚠ data_product v3.1 = บางผู้ใช้ยัง consent เวอร์ชันเก่า → re-prompt batch │
│ ────────────────────────────────────────────────────────────────────────  │
│  per-subject (เปิดจาก DSAR/Access เท่านั้น · audited):                      │
│  u_9f3a… → location_checkin: granted 4/01 v3.2 · marketing: revoked 5/30   │
│            (append-only timeline — ไม่ overwrite; ทุก row มี policy_version) │
│  [ ส่งออก consent receipt (PDF, ม.30) ]                                     │
└──────────────────────────────────────────────────────────────────────────┘
```
- **Components:** aggregate table (`consents` purpose enum: `location_checkin/marketing/analytics_anon/data_product`; lawful_basis `consent/contract/legitimate_interest/legal_obligation` ตาม doc 02 C.4(a)), per-subject append-only timeline (ไม่ update — ตรง schema "ห้าม update เดิม"), policy_version drift ⚠.
- **Operator goal:** เห็นสุขภาพ consent ต่อ purpose, จับ version drift (กฎหมายเปลี่ยน T&C → ต้อง re-consent), ออก consent receipt.
- **Action/system effect:** ไม่มี mutate consent ตรง ๆ (consent มาจากฝั่งผู้ใช้ doc 06 §2.10); DPO action = "re-prompt batch" (เขียน notif campaign ผ่าน §S2.9 normal path, audit `consent.reprompt`) + export receipt. **wording ต้องตรงกับ S1 priming คำต่อคำ** (doc 06 §1.7/§2.10) — แสดง diff ถ้า copy ไม่ match.
- **PII-mask:** aggregate = no PII; per-subject เปิดได้เฉพาะมี active DSAR/ticket + audit. **LIA badge** สำหรับ legitimate_interest (ต้องมีเอกสาร balancing test — C.4(a)).
- **Empty/Error:** purpose ไม่มี consent = "—"; LIA ขาดเอกสาร → ⚠ "ยังไม่มี LIA on file".

#### 11.1.d Breach Runbook — Tiered (no-risk / risk / high-risk · 72h + 15-day valve)

```
┌──────────────────────────────────────────────────────────────────────────┐
│ Incident · INC-0007 "CS unmask นอก policy → อาจ leak contact"   ◐ aal2 ✓  │
│ ────────────────────────────────────────────────────────────────────────  │
│ STEP 1 · Risk Classifier  (ตอบเพื่อจัด tier — ไม่ hard-code 72h)           │
│  ขอบเขต: [ contact 1 ราย ▾ ]  ชนิดข้อมูล: ☐sensitive ☑contact ☐payment    │
│  เข้ารหัส?[ ใช่ ▾ ]  ผู้ไม่ได้รับอนุญาตเข้าถึง?[ ภายใน(CS) ▾ ]              │
│  ┌──────────────────────────────────────────────────────────────────┐    │
│  │ → จัดระดับ:  ◯ NO-RISK   ◉ RISK   ◯ HIGH-RISK                      │    │
│  │   RISK = แจ้ง PDPC ≤72ชม. · ยังไม่ต้องแจ้งราย-บุคคล (เว้นยกระดับ)  │    │
│  └──────────────────────────────────────────────────────────────────┘    │
│                                                                            │
│  ┌─ เส้นทางตาม tier ─────────────────────────────────────────────────┐    │
│  │ NO-RISK   → บันทึก, ปิด, ไม่แจ้ง PDPC/subject (C.4(d)) · log only   │    │
│  │ RISK      → แจ้ง PDPC ≤72ชม.  [นาฬิกา ⏱ 41:12 เหลือ]                │    │
│  │ HIGH-RISK → แจ้ง PDPC ≤72ชม. + แจ้ง subject "เสี่ยงสูง" รายบุคคล    │    │
│  └────────────────────────────────────────────────────────────────────┘    │
│ STEP 2 · 72h notify   ⏱ 41:12:07   [ ร่างแจ้ง PDPC ]  [ ขยาย→15วัน (เหตุผล)]│
│ STEP 3 · Individual notice (HIGH-RISK เท่านั้น) — ปิดอยู่ (tier=RISK)       │
│ STEP 4 · Remediation + post-mortem  [ ผูก fraud_case/ticket ]              │
│ ────────────────────────────────────────────────────────────────────────  │
│  Broadcast control (§S2.9):  send_budget ◷ 0/5,000   kill-switch ⏻ พร้อม   │
│  [ บันทึก runbook step (audit) ]   [ ⚠ ยิง breach broadcast — dual-approve ]│
└──────────────────────────────────────────────────────────────────────────┘
```
- **Operator goal:** จัด risk-tier ก่อน **ไม่ over-rotate เป็น hard-72h** (doc 02 C.4(d)/C.7); no-risk = skip; risk/high-risk เดินเส้นทางแจ้งที่ถูก; มี **15-วัน safety valve พร้อม justification**.
- **Action/system effect:** classifier เขียน `audit_log{action=breach.classify}`; "ร่างแจ้ง PDPC" = generate report; "ยิง breach broadcast" = privileged P1 fan-out (§S2.9 `notif.broadcast`) — **dual-approve (`created_by <> approved_by` CHECK) + step-up (`step_up_at`)** ผ่าน restricted RLS path (`dpo_console`/`incident_runbook` เท่านั้น). **send_budget hard cap ต่อ incident + kill-switch (`killed_at`)** หยุด fan-out กลางคันได้ (กัน denial-of-wallet/phishing-at-scale). deep-link ใน payload ต้องอยู่ใน allow-list. ไม่มี ledger txn (governance event).
- **SoD/step-up:** broadcast ต้อง 2 ผู้อนุมัติ (mirror S4 SoD) + aal2; ⏱ countdown = "ลูกบอลฝั่งเรา".
- **SLA-breach:** 72h ⏱ < 6ชม. → แดง + escalate Owner; ขยาย 15-วัน ต้องกรอกเหตุผล (เก็บ audit) — ปุ่มขยาย disabled ถ้าไม่กรอก.
- **States:** **empty** = "ไม่มี incident เปิด"; **loading** = skeleton; **error (classifier service down)** = "จัด tier อัตโนมัติไม่ได้ — เลือก tier ด้วยมือ + บันทึกเหตุผล" (fail-safe ไป manual, ไม่ block การแจ้ง).

#### 11.1.e Audit-Log Viewer (append-only · hash-chain) + Unmask Review

```
┌──────────────────────────────────────────────────────────────────────────┐
│ Audit Log  (append-only · prev_hash→row_hash chain)        🔗 chain ✓ verified│
│ ┌─ filter ────────────────────────────────────────────────────────────┐   │
│ │ actor:[ ทั้งหมด▾ ] action:[ pii_unmask▾ ] severity:[ high▾ ]          │   │
│ │ entity:[ ทั้งหมด▾ ] เมือง:[ ทุกเมือง▾ ] ช่วง:[ 7 วัน▾ ]  [🔎 ค้นหา]    │   │
│ └──────────────────────────────────────────────────────────────────────┘   │
│ ─────────────────────────────────────────────────────────────────────────  │
│ seq    at          actor(role)        action          entity        sev    │
│ 88214  6/14 10:42  cs_07(Support)     pii_unmask       TK-881        ⚠ high →│
│ 88213  6/14 10:40  cs_07(Support)     pii_unmask       TK-879        ⚠ high →│
│ 88212  6/14 10:39  cs_07(Support)     pii_unmask       TK-877        ⚠ high  │
│ 88211  6/14 09:55  fin_02(Finance)    payout.approve   BATCH-44      ⚠ high →│
│ 88210  6/14 09:12  dpo_01(DPO)        erasure.execute  DS-2039       ⚠ high →│
│ ─────────────────────────────────────────────────────────────────────────  │
│ ⚠ ANOMALY: cs_07 ทำ pii_unmask 3 ครั้ง/5 นาที (> baseline) → [ สอบสวน CS ] │
└──────────────────────────────────────────────────────────────────────────┘
```
- **Components:** virtualized table (`audit_log`: `seq, actor_user_id, actor_role, action, entity_type/id, before/after, city_id, ip_coarse, prev_hash, row_hash, step_up_ref, at`), filter by **actor / action / severity / entity**, **hash-chain verify badge** (🔗 ✓ = ต่อเนื่อง / ✗ = tamper alert), row → detail (before/after JSON redacted, ip_coarse, step_up_ref).
- **Severity taxonomy (แก้ critique logic-minor "payout.approve under-weighted"):** **`high` (⚠ `--danger`)** = ทุก money-out + PII/identity event: `payout.approve`, `payout.release`, `wht_vat.remit`, `writeoff`, `clawback`, `pii_unmask`, `pii_unmask.approve`, `erasure.execute`, `role.grant`, `district.marketing_unlock`, `breach.broadcast`, `apikey.create`. **`med` (● `--warning`)** = state-advance ไม่เคลื่อนเงินทันที (เช่น `dsar.view`, `consent.reprompt`, gate-approve). **`low`** = read/export ที่ k-safe. → **money-out โผล่เด่นเทียบเท่า PII/erasure ในสายตา DPO/Owner** (เดิม `payout.approve` ถูกจัด med ทำให้ release เงินจริงดูเบากว่า unmask — แก้แล้ว).
- **Operator goal:** DPO = ผู้เดียวที่ "เฝ้า CS" (§S1.4) — จับ unmask spike (insider threat), ยืนยัน erasure/payout/role-grant ถูก audit, พิสูจน์ chain ไม่ถูกแก้.
- **Action/system effect:** **read-only** (append-only — แก้/ลบไม่ได้เลย; ปุ่ม mutate ไม่มี). "สอบสวน CS" = เปิด ticket/incident, audit. before/after ของ pii_unmask แสดงเป็น **redacted** (ไม่ re-leak PII ในจอ audit).
- **SoD/PII:** anomaly rule = unmask > baseline ต่อ CS/วัน → auto-flag (§S1.4 rate-limit); DPO เห็น metadata ของ unmask แต่ไม่เห็นค่า PII ที่ถูก unmask.
- **States:** **empty filter** = "ไม่พบ event"; **loading** = streaming skeleton; **error** = "อ่าน log partition ไม่ได้"; **tamper** = 🔗✗ → แดงเต็ม + แจ้ง Owner ทันที (integrity break).

> **Unmask Review (monitoring, แยกจาก §11.1.a Inbox):** มุมมอง pre-filtered ของ audit-log (`action=pii_unmask*`, group by actor) + anomaly cards — *หลังเหตุ* ไว้จับ insider-threat. Inbox (§11.1.a) = *ก่อนเหตุ* (approve). ทั้งคู่ read-only ต่อ chain.

#### 11.1.f Cross-border (SCC/DPA) Registry — read-only

> **เหตุที่มีจอนี้ (แก้ critique completeness-minor "orphan nav"):** nav มี "Cross-border" แต่เดิมไม่มีจอ. doc 02 C.4(g) ระบุชัด: cross-border ต้องพึ่ง **ม.29 Safeguard Route (SCC/DPA/encryption/no-third-party-access)** เพราะยังไม่มี adequacy list → DPO ต้องเห็นทะเบียนข้อตกลงเป็น compliance evidence. read-only (แก้/ลงนามจริงทำนอกระบบ).

```
┌──────────────────────────────────────────────────────────────────────────┐
│ Cross-border Transfer Registry (read-only · ม.28/29 PDPA)                   │
│ ───────────────────────────────────────────────────────────────────────── │
│ counterpart      role        region   safeguard         เอกสาร   หมดอายุ    │
│ Supabase Inc.    processor   SG       SCC + DPA + enc    ✓ on file 2027-03  │
│ (PSP) Omise      sub-proc.   TH/SG    DPA               ✓ on file 2026-12  │
│ Klook (partner)  controller  HK/SG    DPA + k≥5 agg     ✓ on file 2026-09 ⚠ │
│ ───────────────────────────────────────────────────────────────────────── │
│  ⚠ Klook DPA หมดอายุใน <90 วัน → [ ตั้งเตือนต่ออายุ ]                       │
│  หมายเหตุ: no adequacy list (ม.28 ใช้ไม่ได้) → ทุกราย route ผ่าน ม.29       │
│  Safeguard. encryption-at-rest/in-transit + no-third-party-access ต้องคง.   │
│  [ ส่งออกทะเบียน (PDF, สำหรับ PDPC audit) ]                                 │
└──────────────────────────────────────────────────────────────────────────┘
```
- **Components:** read-only table (counterpart, role processor/sub-processor/controller, region, safeguard mechanism, doc-on-file, expiry), expiry-warning ⚠ chip.
- **Operator goal:** DPO พิสูจน์ต่อ PDPC ได้ว่า cross-border ทุกเส้นมี ม.29 safeguard + ติดตามเอกสารใกล้หมดอายุ.
- **Action/system effect:** **read-only** — ไม่มี mutate ในจอ (ลงนาม/แก้ทำที่ legal ops). "ตั้งเตือน" = สร้าง reminder task (audit). "ส่งออกทะเบียน" = audit `report.export`.
- **States:** **empty** = "ยังไม่มีรายการ cross-border"; **expiring** = ⚠ ภายใน 90 วัน; **error** = "อ่านทะเบียนไม่ได้".

---

### 11.2 City / Regional Manager Console

> 🎯 **Operator goal:** คุม **territory + agent roster**, **merchant onboarding pipeline**, **Nimman Density Gate** (เปิด consumer marketing เมื่อผ่านครบ 6 เกณฑ์), และ **per-city P&L**. ABAC scope = `scope_city_ids[]` / territory เท่านั้น (เห็นเฉพาะเมือง/เขตที่ดูแล).
> **SoD (hard, doc 03):** (1) City Manager ที่ **สร้าง/มอบ role agent ไม่ใช่ผู้ approve payout ของ agent คนนั้น** — payout เป็นของ Finance (§9 Finance owns); จอนี้แสดง earnings แบบ **read-only** + ปุ่มไป Finance (ไม่ approve เอง). (2) City Manager **ไม่ approve change_proposal เอง** — content lane เป็นของ **Content Moderator** (author≠moderator). กัน creator==approver ทั้งสองสาย.
> ⚠ **Cross-doc note (แก้ critique logic-critical):** §7.1 role-matrix เดิมให้ CityMgr `●(scope)` บน "Change Proposals (Tab A)" ขัดกับกฎ §11.2.c นี้ — **§11.2 เป็น authority ที่ stricter**; §7.1 ต้องแก้เป็น `○(read/escalate only)` และ `apply_proposal` authz ต้อง deny CityMgr (ดู §11.5).

**Left-nav (City Manager):**
```
┌────────────────────┐
│ 🏙 CNX-Nimman ▾    │  ← city/territory switcher (ABAC-gated)
│  ▸ Density Gate    │
│  ▸ Agent Roster    │
│  ▸ Onboarding Pipe │
│  ▸ Merchants       │
│  ▸ City P&L        │
└────────────────────┘
```

#### 11.2.a Density Gate Dashboard (6 เกณฑ์ · coverage vs baseline)

```
┌──────────────────────────────────────────────────────────────────────────┐
│ 🚦 Density Gate — CNX · Nimman (Soi 1–17)        สถานะ: 🟠 SEEDING (4/6)    │
│ "ไม่ยิง consumer marketing จนกว่าจะผ่านครบ" (GTM §11.2)                     │
│ ───────────────────────────────────────────────────────────────────────── │
│  เกณฑ์                              ปัจจุบัน      เป้า        สถานะ          │
│  ① Place coverage vs baseline       87%          ≥ 90%       🟠 ขาด 3%  →   │
│     (published / districts.coverage_baseline = 142 ที่ "ควรอยู่")           │
│  ② รูป ≥5/place (agent-shot)         ████░ 81%    100%        🟠 26 ที่ขาด → │
│  ③ ข้อมูลครบ (hours·price·cat·geo)   ██████ 100%  100%        🟢 ผ่าน        │
│  ④ Trilingual (TH·EN·ZH≥80%)         TH100 EN100  ZH 72%      🟠 ZH ขาด →    │
│  ⑤ ≥3 quest + ≥5 merchant escrow-on  3 quest·6 r.  ≥3·≥5      🟢 ผ่าน        │
│  ⑥ ≥10 promo สด                      11           ≥10         🟢 ผ่าน        │
│ ───────────────────────────────────────────────────────────────────────── │
│  ⛔ ปุ่ม "ปลด consumer marketing" — LOCKED จนผ่านครบ 6 (เหลือ ①②④)         │
│  [ ดู gap list ① (18 ที่ยังไม่ seed) ]  [ มอบ task เก็บรูป ② → agent ]      │
└──────────────────────────────────────────────────────────────────────────┘
```
- **Components:** 6-row criterion table (ตรง doc 04 §1278 gate query + SYSTEM_PLAN §11.2), progress bar ต่อเกณฑ์, master status (🟢 PASSED / 🟠 SEEDING), **denominator = `districts.coverage_baseline`** แสดงชัด (เกณฑ์ ① ต้องมี baseline เก็บใน schema).
- **Operator goal:** เห็นว่า "ขาดอะไรถึงจะปลดโฆษณา" + drill ลง gap list / มอบ task ปิด gap.
- **Action/system effect:** **"ปลด consumer marketing" disabled จนครบ 6** (gate query server-side; ปุ่มกดได้แล้ว = เขียน `audit_log{action=district.marketing_unlock}` + step-up). "มอบ task" = สร้าง agent task (ปลายทาง §4) — **ไม่เขียน live place** (agent เก็บรูป → change_proposal → moderator approve, §10/§4 ownership).
- **SoD/step-up:** unlock marketing = high-impact (budget) → step-up + audit. Manager **ไม่ approve change_proposal เอง** (Content Moderator owns — กัน creator==approver ในสาย content; ดู §11.2.c).
- **States:** **empty** (เขตยังไม่ seed) = "baseline ยังไม่ตั้ง — ตั้ง coverage_baseline ก่อน"; **loading** = skeleton bars; **error (gate query fail)** = "คำนวณ gate ไม่ได้ — ปุ่ม unlock ระงับ (fail-closed)"; **passed** = 🟢 + ปุ่ม unlock เปิด (แต่ยัง step-up).

#### 11.2.b Agent Roster (accept-rate · quality · merchant-quality)

```
┌──────────────────────────────────────────────────────────────────────────┐
│ 👥 Agent Roster — CNX-Nimman (6 active · 1 coaching)   [ + เชิญ agent ]    │
│ ───────────────────────────────────────────────────────────────────────── │
│ agent      สถานะ     accept-rate   quality  merch-q  freshness  earnings(฿)│
│            (30d)     (approval)    ×mult.   score    portfolio  (read-only)│
│ Beam       active    0.96 ×1.20    0.96     0.84     93% 🟢     2,480 →    │
│ Ploy       active    0.88 ×1.00    0.88     0.79     90% 🟢     1,930 →    │
│ Nut        active    0.91 ×1.00    0.91     0.61 ⚠   88%        1,610 →    │
│ Mick       coaching  0.68 ×0.50    0.68 ⚠   0.55 ⚠   74% 🟠     410  →    │
│ Fai        suspended 0.52          —        —        —          0    →    │
│ ───────────────────────────────────────────────────────────────────────── │
│ 💰 Earnings = อ่านอย่างเดียว · approve/จ่ายอยู่ที่ Finance (SoD)  [ ไป Finance →]│
└──────────────────────────────────────────────────────────────────────────┘
```
- **Components:** roster table — **accept-rate→bounty multiplier** (≥0.95 ×1.20 / 0.85–0.949 ×1.00 / 0.70–0.849 ×0.80 / <0.70 ×0.50+coaching, doc 02 B.3.1), **merchant_quality_score** (วัดร้านจ่ายจริง, แยกจาก quality_score; <0.6 ⚠), portfolio freshness %, earnings **read-only**.
- **Operator goal:** จัดการคุณภาพทีม — เห็นใครเข้า coaching/suspended (<0.55 ×2 รอบ → suspended อัตโนมัติ), territory cap.
- **Action/system effect:** "เชิญ agent" = ส่ง role-invite → **grant role `field_agent`** (high-impact → **step-up + audit `role.grant`**). **SoD-hard:** Manager ที่ grant agent นี้ ถูก system บล็อกจาก approve payout ของ agent คนนั้น (SEAM-3 style — enforce ที่ §9 ด้วย constraint join, ไม่ใช่แค่ UI) — earnings column ลิงก์ไป Finance, ไม่มีปุ่ม approve ในจอนี้.
- **PII:** agent contact masked default; unmask (เช่นโทรหา) = reason + step-up + audit (contact-tier = self-step-up ได้ตาม §S1.4.2; **ไม่ใช่ sensitive-tier** จึงไม่ต้องผ่าน DPO Inbox §11.1.a).
- **States:** **empty** = "ยังไม่มี agent ในเขตนี้ — เชิญคนแรก"; **suspended row** = slate/disabled + เหตุผล; **error** = "โหลด quality score ไม่ได้".
> **Cross-doc note:** การ provision **console role** (Finance/Moderator/DPO ฯลฯ) = **Settings · Roles ของ Owner/Admin (§7.x)** ไม่ใช่จอนี้. จอนี้ grant ได้เฉพาะ `field_agent` ในขอบเขตเมืองตน.

#### 11.2.c Merchant Onboarding Pipeline (kanban · trust-state)

```
┌──────────────────────────────────────────────────────────────────────────┐
│ 🏪 Onboarding Pipeline — CNX-Nimman                  [ มุมมอง: kanban ▾ ]   │
│ ───────────────────────────────────────────────────────────────────────── │
│ CLAIMED(8)   │ IDENTITY_VERIF(5) │ FINANCE_VERIF(4) │ ESCROW-FUNDED(6) │   │
│ ┌──────────┐ │ ┌──────────┐      │ ┌──────────┐     │ ┌──────────┐     │   │
│ │Graph Café│ │ │Ristr8to  │      │ │Akha Ama  │     │ │Roast8ry  │     │   │
│ │claim 6/12│ │ │Gate1 ✓   │      │ │Gate1✓Gate2✓    │ │escrow ฿8k│     │   │
│ │by: Beam  │ │ │รอ Gate2  │      │ │รอเติม escrow    │ │3 quest   │     │   │
│ │⏳ SLA 2d │ │ │💤 5 วัน  │      │ │          │     │ │🟢 active │     │   │
│ └──────────┘ │ └──────────┘      │ └──────────┘     │ └──────────┘     │   │
│   ...        │   ...             │   ...            │   ...            │   │
│ ───────────────────────────────────────────────────────────────────────── │
│ ⚠ Gate1/Gate2 review = ของ Identity/Finance reviewer (แยกคน) — Manager ดู  │
│   pipeline เท่านั้น, ไม่ verify เอง (SoD §8 Merchant Verify)               │
└──────────────────────────────────────────────────────────────────────────┘
```
- **Components:** kanban ตาม **trust ladder CLAIMED → IDENTITY_VERIFIED → FINANCE_VERIFIED → escrow-funded** (doc 06 §3.1.b), card แสดง agent ผู้ claim, SLA aging chip (💤 stale).
- **Operator goal:** เห็นคอขวด pipeline (เช่น 5 ร้านค้างที่ Gate2), ดันงาน, แต่ **ไม่กด verify เอง**.
- **Action/system effect:** Manager **ไม่ verify** (Gate 1 Identity / Gate 2 Finance = reviewer แยกคน, §8 Merchant Verify SoD — Gate1-reviewer≠Gate2-reviewer enforce ที่ DB CHECK); ทำได้แค่ nudge/reassign agent (audit). ไม่มี ledger txn.
> **Cross-doc note:** ถ้าเกิด **dual-claim conflict** (ทั้งคู่ค้าง CLAIMED) → resolution อยู่ที่ **Disputed-claim dedupe ของ Identity reviewer (§8.1)** ไม่ใช่จอนี้; CityMgr เห็นได้ว่ามี conflict แต่ escalate เท่านั้น.
- **States:** **empty column** = "ไม่มีร้านในสถานะนี้"; **SLA-breach card** = ขอบ danger + เด้งหัวคอลัมน์; **loading** = skeleton cards.

#### 11.2.d Per-City P&L

```
┌──────────────────────────────────────────────────────────────────────────┐
│ 📊 City P&L — CNX (มิ.ย. 2026)            [ เดือนนี้ ▾ ]  [ ส่งออก CSV ↧ ] │
│ ───────────────────────────────────────────────────────────────────────── │
│  รายได้                          ฿            ต้นทุน                     ฿  │
│  • subscription MRR          48,200          • agent payout       -22,400  │
│  • redemption take-rate      31,750          • agent reserve hold  -3,100  │
│  • sponsored quest            12,000          • goodwill GRANT (S1) -1,800  │
│  ─────────────────────────────────           • PSP/processing      -2,950  │
│  รวมรายได้ (ก่อน VAT)         91,950          รวมต้นทุน           -30,250  │
│  ─────────────────────────────────────────────────────────────────────── │
│  Gross margin (เมือง)         61,700  (67%)   ↑ vs พ.ค. +8%               │
│  หมายเหตุ: ตัวเลขจาก ledger projection (read-only) · VAT/WHT แยกที่ Finance │
└──────────────────────────────────────────────────────────────────────────┘
```
- **Components:** P&L 2-คอลัมน์ (admin surface → แสดง ฿ ได้), margin %, MoM delta, export.
- **Operator goal:** ดู unit economics ต่อเมือง (วัด density-gate ROI).
- **Action/system effect:** **read-only projection จาก ledger** — ไม่ post, ไม่แก้ยอด (ห้าม ad-hoc balance edit). Export CSV = high-impact (อาจมี business data) → audit `report.export`. ตัวเลข goodwill/take-rate/payout = aggregate ของ canonical txns (AGENT_PAYOUT/REDEEM/GRANT).
- **PII:** ไม่มี PII (aggregate การเงินเมือง). **States:** **loading** = skeleton; **error** = "ledger projection ไม่พร้อม"; **empty (เมืองใหม่)** = "ยังไม่มี revenue".

---

### 11.3 Analyst / API-Partner Console

> 🎯 **Operator goal:** อ่าน analytics แบบ **read-only, PDPA-safe** — foot-traffic/heatmap แบบ aggregate ที่ผ่าน **k-anonymity** (external k ≥ 5, internal k ≥ 3; doc 02 C.4(e)), suppression cell ต่ำกว่า k, generalize เวลา/พื้นที่; และจัดการ **API key + rate-limit** สำหรับ data-product partner.
> **ABAC:** Analyst = read-only เสมอ (ไม่มี write/money/PII). **ไม่มี unmask, ไม่มี per-individual row** — ถ้า query ทำให้ cell < k → suppress. ทุก export/API-call audit.

#### 11.3.a Analytics Dashboard (k-anonymity-gated)

```
┌──────────────────────────────────────────────────────────────────────────┐
│ 📈 Analytics — Nimman Foot-Traffic            🔒 PDPA-safe · k≥5 (external) │
│ ┌─ controls ──────────────────────────────────────────────────────────┐  │
│ │ เมือง:[ CNX▾ ] เขต:[ Nimman▾ ] ช่วง:[ มิ.ย.▾ ] grain:[ 1ชม×grid หยาบ▾]│  │
│ │ segment:[ tourist/local▾ ]   k-floor:[ 5 (external) ▾ ]              │  │
│ └──────────────────────────────────────────────────────────────────────┘  │
│ ───────────────────────────────────────────────────────────────────────── │
│  Foot-traffic heatmap (aggregated · cell < k = suppressed ▒)               │
│  ┌────────────────────────────────────────────────┐                       │
│  │  ░░▓▓███▓░   Soi 1–7  พีค 12:00–13:00          │  ● = ผ่าน k           │
│  │  ▒▒░░▓▓██▓   Soi 9–13                           │  ▒ = suppressed       │
│  │  ▒▒▒▒░░▓▓░   (cells ▒ = n<5, ปกปิดตาม k-anon)   │      (n<5)            │
│  └────────────────────────────────────────────────┘                       │
│  Tourist 58% · Local 42% (rounded, aggregate)   total visits: ~9.2k (±bin) │
│  ⚠ 3 cells ถูก suppress (น้อยกว่า k=5) — ไม่แสดง/ไม่ export                 │
│  [ ส่งออก aggregate CSV ↧ (k-checked) ]   [ ฝัง query → API ]              │
└──────────────────────────────────────────────────────────────────────────┘
```
- **Components:** heatmap (generalized 1ชม × grid หยาบ — กัน trajectory re-identification, C.4(e)), segment split, **k-floor selector** (external 5 / internal 3), suppressed-cell indicator ▒.
- **Operator goal:** ขาย/วิเคราะห์ footfall โดย **ไม่ re-identify บุคคล**.
- **Action/system effect:** **read-only**, pipeline aggregate ก่อนเสมอ; cell n < k → suppress (ไม่ใช่แค่ซ่อน — ไม่ออกใน export/API ด้วย, enforce ที่ pipeline/gateway). ไม่มี raw GPS, ไม่มี movement graph รายบุคคล (raw GPS ≤90วัน, role อื่น — C.4(f)). Export = audit `analytics.export`.
- **PDPA touchpoints:** ต้องมี consent `analytics_anon`/`data_product` base; data_product (external) = k≥5 + suppression + generalization. **ไม่มี PII path เลย** (Analyst เห็น aggregate เท่านั้น — ไม่มีปุ่ม unmask).
- **States:** **empty (ข้อมูลน้อย)** = "ทั้งช่วงต่ำกว่า k — ไม่มีผลแสดงได้"; **loading** = skeleton heatmap; **error** = "aggregate pipeline ล่าช้า"; **over-suppressed** = ⚠ "เกินครึ่งถูก suppress — ขยาย grain/ช่วงเวลา".

#### 11.3.b API Key / Rate-Limit

```
┌──────────────────────────────────────────────────────────────────────────┐
│ 🔑 API Keys & Rate Limits (data-product partner)         [ + ออก key ใหม่ ]│
│ ───────────────────────────────────────────────────────────────────────── │
│ key (masked)        partner       scope         rate (req/นาที)  สถานะ     │
│ ak_live_…8f2a       Klook         footfall:agg  60 / 1,000ใช้แล้ว ● active →│
│ ak_live_…1c90       TakeMeTour    heatmap:agg   30 / 280ใช้แล้ว  ● active →│
│ ak_test_…44de       (internal QA) all:agg       120              ◐ test    │
│ ak_live_…77b0       (revoked)     —             —                ✕ revoked │
│ ───────────────────────────────────────────────────────────────────────── │
│  usage (24ชม):  ████████░░ 68%   · 0 calls ที่คืน suppressed-only (k ดี)   │
│  ⚠ Klook ใกล้ rate cap (1,000/1,200) — throttle อัตโนมัติเมื่อเกิน         │
│  scope ของทุก key = aggregate-only (k≥5) · ไม่มี endpoint คืน row บุคคล     │
└──────────────────────────────────────────────────────────────────────────┘
```
- **Components:** key table (key masked เสมอ — เผยเต็มครั้งเดียวตอนสร้าง), per-key scope (`footfall:agg`/`heatmap:agg` — **aggregate-only**), rate-limit gauge, usage 24ชม, revoke.
- **Operator goal:** จัดการการเข้าถึง data-product ของ partner ภายนอกอย่างปลอดภัย.
- **Action/system effect:** "ออก key" = high-impact → **step-up + audit `apikey.create`**; เผย secret ครั้งเดียว (copy-once). "revoke" = audit `apikey.revoke`, effect ทันที. scope **บังคับ aggregate-only** — ไม่มี endpoint คืน row บุคคล (enforced ที่ gateway, ไม่ใช่แค่ UI). rate-limit เกิน → throttle/429 (ไม่ใช่ leak).
- **SoD/step-up:** Analyst ออก key ได้เฉพาะ scope aggregate; การเพิ่ม scope ใหม่/ปลดเพดานสูง = ต้อง Owner/Admin approve (dual-control).
- **States:** **empty** = "ยังไม่มี API key — ออกใบแรก"; **near-cap** = ⚠ gauge danger; **revoked** = slate/disabled; **error** = "อ่าน usage metering ไม่ได้".

---

### 11.4 SoD / Step-up / PII-mask / Audit — สรุป touchpoint (หมวด 11)

| จอ | high-impact action | step-up (aal2) | PII-mask | audit action | severity | SoD |
|---|---|---|---|---|---|---|
| Unmask Inbox (DPO) | approve sensitive unmask | ✅ | DPO เห็น metadata; ปล่อยค่าให้ requester | `pii_unmask.approve/deny` | high | requester≠approver; DPO ไม่สร้างคำขอเอง |
| DSAR eligibility | (อ่าน) | unmask เท่านั้น | subject masked | `dsar.view` | med | DPO clear money/fraud เองไม่ได้ (blocker = view-only) |
| Erasure execute | ลบถาวร + pseudonymize | ✅ typed+aal2 | redacted preview | `erasure.execute` | high | gate fail-closed; ledger ไม่ถูก edit |
| Consent re-prompt | broadcast batch | ✅ | per-subject audited | `consent.reprompt` | med | DPO ไม่ mutate consent ตรง |
| Breach broadcast | P1 fan-out | ✅ + **dual-approve** | — | `breach.classify/broadcast` | high | 2-คน (`created_by<>approved_by`), privileged RLS path, send_budget+kill |
| Cross-border registry | (อ่าน/export) | — | no PII | `report.export` | low | read-only |
| Audit viewer | (อ่าน) | — | unmask redacted | (read-only) | — | append-only, mutate ไม่ได้ |
| Density unlock | ปลด marketing | ✅ | — | `district.marketing_unlock` | high | gate fail-closed |
| Agent grant role | grant `field_agent` | ✅ | contact masked (self-step-up tier) | `role.grant` | high | grantor ≠ payout approver |
| City P&L export | export CSV | — | no PII | `report.export` | low | read-only projection |
| Analytics export | export aggregate | — | k≥5 suppress | `analytics.export` | low | aggregate-only, no unmask |
| API key create | ออก/ปลดเพดาน key | ✅ | key masked | `apikey.create/revoke` | high | scope=agg; ปลดเพดาน=dual-control |

> **severity = audit-log taxonomy §11.1.e:** `high` (⚠ danger) = money-out + PII/identity + privileged-broadcast + role/key/marketing grant; `med` (● warning) = state-advance ไม่เคลื่อนเงินทันที; `low` = read/k-safe export.

---

### 11.5 Critique disposition — dpo-citymgr-analyst scope (รับ / ปฏิเสธ + เหตุผล)

**รับเข้า (fold-in) — แก้ในหมวด §11 นี้:**

| # | severity | ประเด็น (มี §11 surface) | แก้ที่ |
|---|---|---|---|
| 1 | critical | ไม่มี DPO unmask-approval inbox (ปลายทาง `[ขอ DPO →]` จาก §8.2/§8.4 → Q_PRIVACY) | **§11.1.a Unmask Inbox** (จอใหม่ + nav) + แยกชัดจาก §11.1.e monitoring |
| 2 | critical | SoD ขัดกัน: §7.1 matrix ให้ CityMgr approve change_proposal แต่ §11.2.c ห้าม | §11.2 header + §11.2.c reinforce กฎ stricter + cross-doc note (ต้องแก้ §7.1 → ○) |
| 3 | minor | audit severity `payout.approve` = med ทั้งที่เป็น money-out | **§11.1.e severity taxonomy** — ยก money-out + remit/writeoff/clawback ขึ้น `high`; ตาราง §11.4 มี column severity |
| 4 | minor | state-color token drift (§8 pin hex เอง) | header §11: อ้าง token doc 06 §1.2/§1.9 **by variable name** (`--success/--warning/--danger/--hold`), เลิก re-pin hex |
| 5 | minor | orphan nav "Cross-border (SCC/DPA)" ไม่มีจอ | **§11.1.f Cross-border Registry** (read-only, อิง doc 02 C.4(g) ม.29 Safeguard) |
| 6 | minor | DPO blocker drill (Chain C) อาจ dead-end / ข้ามไป console ที่ act ไม่ได้ | §11.1.b: `👁 ดู →` = read-only DPO-scoped panel + `[แจ้งเจ้าของ →]`, ไม่ deep-link เข้า money/fraud console |
| + | build | breach broadcast ขาด kill-switch/send_budget; eligibility-gate field ไม่ตรง canonical | §11.1.d เพิ่ม send_budget+kill (§S2.9); §11.1.b align เป็น `cs_open_obligations` 5 ค่า + chargeback-window |

**ปฏิเสธ (out-of-scope สำหรับ §11 — เป็น deliverable ของ §7/§8/§9; ไม่มี §11 surface ให้แก้):**

| ประเด็น (critique) | เหตุผลที่ reject ที่ §11 |
|---|---|
| Brand/Sponsor home + Sponsor Campaigns console | Role/section ของ §7/§8 — ไม่ใช่ 1 ใน 3 console ของหมวดนี้; ระบุไว้ใน scope-note header |
| Settings · Roles (console-role grant/RBAC) | เป็นจอ Owner/Admin (§7.x); §11.2.b grant ได้เฉพาะ `field_agent` — note ไว้แล้ว |
| Owner / P.Admin role home | role อื่น, จอ orientation อยู่ §7.x |
| Manual-freeze form / freeze-override role mismatch (§9.d / §7.1) | Freeze เป็นของ Finance/Owner §9 — DPO/CityMgr/Analyst ไม่มี freeze capability |
| payment-instrument unmask §8.4 vs §9.a inconsistency | ต้อง reconcile ใน §8/§9; **§11.1.a บังคับ DPO-approve สำหรับ sensitive-tier ถูกต้องแล้ว** — ถ้า §9 ให้ Finance self-step-up bank ต้องประกาศ ABAC exception ใน §8.4 (residual) |
| Media-Pending queue · agent-dispute review · disputed-claim dedupe | เป็น moderation/identity surfaces (§7/§8); §11.2.c/§11.2.b เพียง escalate/ชี้ปลายทาง ไม่ใช่เจ้าของจอ |
| CityMgr Support-Tickets · Analyst read-Solvency/Onboarding (matrix grant) | ถ้าจะมี ต้องวาดใน §8/§9 หรือแก้ §7.1 matrix; §11 ตั้งใจไม่ขยาย scope CityMgr/Analyst เกิน 4/2 จอที่นิยามไว้ (residual: ต้อง reconcile matrix) |

> **Cross-doc reconciliation ที่ต้องทำนอก §11 (ส่งต่อเจ้าของ section):** (a) §7.1 matrix: CityMgr Change-Proposals `●→○`, Freeze split P.Admin `●→○ manual-only`, drop/วาด CityMgr-Support & Analyst-read grants ให้ตรงจอ; (b) §8.4 tiering: ตัดสิน payment-instrument unmask = DPO-only (ตาม §11.1.a) **หรือ** ประกาศ Finance-on-active-payout-item ABAC exception ให้ §9.a; (c) §9 ต้อง enforce SEAM-3 grantor≠payout-approver ที่ constraint-join (ไม่ใช่แค่ §11.2.b UI).

---

## ภาคผนวก: ความเสี่ยง/ข้อจำกัด UX คงเหลือ
### §7 Console Shell + Moderation Queue
- Cross-doc SoD reconciliation REQUIRED before build: SYSTEM_PLAN §4.4 grants `moderate_change`=S to City Manager and doc 04 §3.3 edge-fn asserts `reviewer ∈ {Content Moderator, City Manager}`. §7 now adopts the stricter rule (CityMgr cannot approve), so SYSTEM_PLAN §4.4 and the apply_proposal ASSERT must be amended to DROP City Manager from the approve-set; accessControlProvider must deny CityMgr the `moderate_change` approve capability. Until amended, UI gating and edge-fn authorization disagree.
- Payment-instrument unmask tiering is still unresolved across §8.4 vs §9.a (Finance self-unmask of payout bank vs DPO-only). §7 routes sensitive-tier to DPO as the principle, but the canonical decision (ABAC exception 'Finance-on-active-payout-item' vs route-through-DPO) belongs to §8.4/§9.a and is NOT settled here.
- Several reconciliations only fix the §7.1 nav matrix; the actual screens live in sibling admin sections that this task did not author: §9.d (manual-freeze form + Release/Override dual-Owner button gating + step-up + owner-B co-sign wizard), §11.1 (DPO pending-unmask approval queue, DPO blocker drill-down behavior, Cross-border SCC/DPA registry), §8.1 (Disputed-claim dedupe resolution screen), §11.2/§11.3 (CityMgr Support-Tickets and Analyst read-only Solvency/Onboarding). These must be drawn there for end-to-end reachability.
- Doc 06 (06_ux_ui_design.md) currently ends at section 5; sections 7–11 referenced throughout are siblings that may not all exist yet. This finalized §7 was authored as a standalone build-ready spec and was NOT inserted into doc 06 (no edit was requested). If §7 is meant to live inside doc 06, its cross-references to §8/§9/§10/§11 assume those sections will be added with the numbering used here.
- The Media Pending lane (§7.4) is drawn but the spec also offers the alternative of folding media review into the §7.2 evidence flow and removing the nav entry. The build team must pick one to avoid a half-orphan; this spec chose to draw it because media-only submissions exist outside place-field diffs, but that assumption should be confirmed against the actual submission model in §4.3.

### §8 Merchant Verify + Support/Dispute
- The DPO-side approve/deny inbox for pii_unmask_request (the destination of '[ ขอ DPO → ]'), the standalone after-the-fact 'Unmask Review' monitoring viewer, the audit-severity taxonomy (payout.approve elevation), and CityMgr-escalation receipt of §8.1-D dispute escalations all live in §11 and are NOT drawn here — they are cross-section dependencies forwarded in the §8.5 reject table and must be completed in §11.1/§11.2 or these handoffs remain half-open.
- The full moderation-author-side rendering of the agent appeal (e.g. inside §7 moderation) is only partially scoped: §8.3-AP draws the SoD-guarded queue lane + decision surface (per the completeness fix wording), but if §7 also intends a richer moderation-context appeal view, ownership of that view must be reconciled to avoid duplication.
- The 'Finance-on-active-payout-item' ABAC exception is defined in §8.4 but must be mirrored verbatim into the actual accessControlProvider predicate + DB policy and into §9.a's narrative; if §9.a is edited independently and keeps generic 'self-step-up' wording, the inconsistency the critique flagged could re-appear at the §9 surface.
- Section numbering assumes this lives in the admin-console doc (doc 07-style: §7/§9/§11 siblings referenced by the critique). The cross-refs to doc 06 (§1.x design system) are concrete and verified, but cross-refs to §7/§9/§10/§11 point to sibling admin sections that were not in this repo as files — those section numbers must match the final admin doc's actual numbering.
- Coin-gold canonical value was reconciled to #C9962A per doc 06 §1.2/§1.9; the consumer doc 06 §2 changelog still cites #C8881C as the Coin hue. That intra-doc-06 discrepancy is outside §8 scope but should be reconciled in doc 06 so admin and consumer cite the same Coin token.

### §9 Finance/Payout + Observability/Recon
- REJECTED-as-out-of-section (fix lives elsewhere, only handoff endpoint added on §9 side): §7.1 Change-Proposal CityMgr-approve content-lane SoD (content moderation, not finance); Brand/Sponsor home + Sponsor Campaigns; Settings·Roles RBAC/role.grant screen; agent-dispute review queue; DPO pending-unmask approval queue; Media Pending queue; Disputed-claim dedupe; Owner/P.Admin role-home; CityMgr Support-Tickets; Cross-border SCC/DPA registry; 10.2 'not-my-shop' report CTA. These MUST be authored in §7/§8/§10/§11 or their pipelines orphan.
- The §9 fixes assume three reciprocal edits will be made in sibling sections: (1) §7.1 matrix Freeze Control split (Owner ●/P.Admin ○); (2) §8.4 tiering-table exception row for payment_instrument Finance-on-active-payout-item; (3) §11.1.d audit severity elevation of money-out events. If those sibling edits are not applied, the cross-doc consistency the critique demanded is only half-closed.
- owner-B co-sign discovery depends on an Owner role-home with a 'pending dual-Owner approvals' aggregator that is itself an undrawn §7/§11 deliverable. §9.d specifies the approver-side wizard entry and the out-of-band page path, but the inbox/home that surfaces the pending item is not owned by §9 — until §7/§11 draws it, owner-B discovery relies solely on the Tier-1 page deep-link.
- cogs_budget_cap shown as a live PAUSE trigger (merchant:339 in 9.d) is INERT-UNTIL-SIZED per A2.4/A2.10-#3 — the cap numbers are an unresolved founder call; the freeze trigger will not fire meaningfully until REWARD_PER_REDEMPTION_CAP_THB / MERCHANT_MONTHLY_COGS_CAP_THB are set. The screen depicts the eventual behavior, not a currently-armed control.
- sponsor:platform_goodwill backing is shown in 9.c per-funder table as build-ready (partition), but the dedicated platform_goodwill_budget account remains pending_ratification (A2.9/A2.10-#2, BoT e-money legal sign-off). If the founder later migrates to the dedicated account, 9.c per-funder label changes (peg 1:1 keeps solvency arithmetic identical, so no number changes).
- Worked-example numbers are pinned to S4.10 (MERCH-2026-W24-CNX) for traceability; if doc 03 S4.10 is later revised, §9 wireframe numbers must be re-synced or they drift from the canonical worked example.

### §10 Missing Consumer/Merchant Screens
- Three CRITICAL back-office screens that §10 hands off to remain UNDRAWN in the Admin console (§7–§11) and are out of §10's scope by design: (A) agent_dispute review queue + detail with reviewer≠rejecting-moderator SoD guard (target of §10.3 — Chain D is a dead-end on the back-office side until drawn); (B) DPO pending-unmask approval queue for KYC/payment (the §10.2 KYC-unmask path and §8.2/§8.4 'ขอ DPO →' point at §11.1.d which is monitoring-only, not an approval inbox); (C) Disputed-claim dedupe resolution detail (the §10.2 DISPUTED error-state has only a banner, no decision screen — blocks Gate1). These must be specced in §7.x/§8.3/§11.1 or the end-to-end journeys originated in §10 stay orphaned.
- Coin-gold hex is inconsistent across doc 06 itself: §1.9/§1.2 canonical = #C9962A, but §2.9 wireframes use #C8881C. §10 follows the §1.9 canonical (#C9962A) by referencing the token by name, but the underlying doc 06 §2.9 discrepancy still needs a one-source reconciliation before Figma lock (not a §10 defect — flagged for the design-system owner).
- Per doc 06's own residual-risk appendix, the canonical --warning ochre #C77A0F and Coin-gold #C9962A still need a real contrast-checker pass on their tinted backgrounds (gold-50 pill, dark-mode variants) before lock; §10 references them by token name so it inherits whatever the final value resolves to, but the numeric verification is owned by §1.
- The wrong-recipient report (§10.2-e) sets merchant_claim.status='reported' to pause the code; the exact state-machine transition that un-pauses or voids a reported code (and who can do it under SoD) is defined on the City Manager / §11.2 side, not in §10 — needs the §11.2 agent-attribution review screen to define the 'cleared' transition, mirroring the same gap the critique raised for Disputed-claim dedupe.
- Back-office RBAC/SoD contradictions the critique raised (CityMgr approving change_proposals §7.1 vs §11.2.c; Platform-Admin freeze-override role mismatch §7.1 vs §9.d; payment-instrument unmask tiering §8.4 vs §9.a; manual-freeze step-up §9.d; payout.approve audit severity §11.1.d) are NOT resolvable inside §10 and were routed to §7/§8/§9/§11; if those sections aren't reconciled, §10's handoff promises (e.g. SoD reviewer≠rejecter, KYC-unmask = DPO-approve tier) could be violated by a permissive back-office matrix.
- Queue names (Q_AGENT/Q_MERCHANT/Q_REVIEW) and back-office section numbers (§5/§8/§9/§11) used in §10 handoffs assume the Admin-console doc (07) adopts the same taxonomy/numbering the critique uses; if the actual admin doc renumbers or renames queues, the §10 cross-references will need a sync pass.

### §11 DPO/PDPA + City Manager + Analyst
- Cross-doc dependency NOT in my control: §7.1 role-matrix still grants CityMgr ●(scope) on Change Proposals and must be edited to ○(read/escalate); §11 flags this but the matrix itself (a §7 deliverable) is unchanged. If §7.1 is not reconciled, the contradiction persists at the matrix layer and apply_proposal authz must still be hardened to deny CityMgr.
- payment-instrument unmask tiering (§8.4 DPO-only vs §9.a Finance self-step-up bank, critique logic-major) is only resolvable in §8/§9. §11.1.a now correctly enforces DPO-approve for the sensitive tier, but if Finance is intended to self-unmask payout bank for batch verification, §8.4 must explicitly document that Finance-on-active-payout-item ABAC exception; otherwise §9.a should route through the §11.1.a Inbox. Left as a cross-doc note.
- SEAM-3 grantor≠payout-approver SoD (CityMgr who grants field_agent cannot approve that agent's payout) is depicted as UI/system-blocked in §11.2.b but its hard enforcement lives in §9 as a constraint-join — must be implemented there, not just surfaced in the §11 UI.
- Matrix-vs-screen grants for CityMgr Support-Tickets and Analyst read-only Solvency/Onboarding (critique completeness-major) are intentionally NOT drawn in §11 to keep the three consoles to their defined 4/2-screen scope; either those views get drawn in §8/§9 or the §7.1 matrix must drop the grants. Unresolved at the matrix level.
- Brand/Sponsor console, Settings·Roles, Owner/P.Admin home, Media-Pending, agent-dispute review, and disputed-claim dedupe remain genuinely undrawn deliverables (critique critical/major) — they are out of §11 scope and require separate authoring in §7/§8/§9; §11 only documents the handoff points.
- Doc 06 currently ends at §5 + appendix and the §7–§11 admin sections appear to be authored as a separate parallel effort; §11's cross-references to §7.1/§8.x/§9.x assume those sibling sections will exist with the reconciled rules. If section numbering shifts when admin docs are assembled, the §-cross-refs in §11 will need a renumber pass.
- Field naming for the consent purpose enum and audit action strings (e.g., consent.reprompt, pii_unmask.approve, district.marketing_unlock) are aligned to canonical where docs specify them, but a few action-string labels are introduced by this spec for completeness — they must be added to the canonical audit_log action enum during implementation to stay build-consistent.
