# Sidebar catalog scope

The dashboard and compact sidebar tag counts share one catalog of unarchived local tasks belonging to the desktop sidebar. Membership is independent of mounted DOM rows, project expansion, task loading and running status.

`packages/orbit-tags/runtime/src/service/catalog/sidebar-membership.ts` reads the desktop's `.codex-global-state.json` without writing it. It combines pinned IDs, projectless IDs, explicit local project assignments and saved project thread orders. Only existing local projects qualify; explicit assignments supersede saved positions. Database pin/project metadata also qualifies a task when present. `session-catalog.ts` joins this membership with the read-only threads database for titles, update times and archival state.

Realtime voice and guardian review records are excluded. A subagent provenance marker alone does not override explicit sidebar membership: desktop tasks promoted or retained in the sidebar can carry that marker. Record age and `has_user_event` are not membership predicates. Historical records outside the sidebar are excluded even if the database still marks them unarchived.

Missing or unsupported sidebar state produces an incomplete catalog rather than falling back to all unarchived history. This is a private desktop persistence contract, so compatibility checks must compare catalog IDs with the application's task list after desktop updates. Remote-only tasks use best-effort native-row discovery path.

Regression coverage includes promoted tasks, voice/review exclusion, long-lived project tasks, projectless tasks, archival, project moves/removal, malformed state and collapse-independent counts.
