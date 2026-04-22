---
prd_loaded: ''
architecture_loaded: ''
tech_spec_loaded: ''
---

# Step 3: Planning Artifact Reader

## RULES

1. **Read-only:** This step uses the IDE's native Read file tool only. No ClickUp API calls are made in this step. No files are written or modified.
2. **PRD required:** If `planning-artifacts/PRD.md` cannot be read, emit the PRD-not-found error block (see INSTRUCTIONS step 2) and **stop** — do not proceed to step 4.
3. **Architecture required:** If `planning-artifacts/architecture.md` cannot be read, emit the architecture-not-found error block (see INSTRUCTIONS step 5) and **stop** — do not proceed to step 4.
4. **Tech-spec best-effort:** If `planning-artifacts/tech-spec.md` is absent, emit the tech-spec-skipped warning block (see INSTRUCTIONS step 9), set `{tech_spec_loaded}` = `'false'`, and **continue** — the skill proceeds with PRD and architecture only.
5. **Contract:** `{prd_loaded}` and `{architecture_loaded}` MUST be `'true'` by the time this step completes. `{tech_spec_loaded}` is `'true'` if the file was read, `'false'` otherwise.

## INSTRUCTIONS

1. Using the IDE Read file tool, attempt to read `planning-artifacts/PRD.md`.
2. If the read fails (file not found or access error), emit the PRD-not-found error block and stop.

   ```
   ❌ **Planning artifact missing — PRD.md not found**

   The `clickup-dev-implement` skill could not read `planning-artifacts/PRD.md`.

   **Why this is fatal:** The PRD defines product requirements and functional scope. Without it, the Dev agent cannot make scope-aware implementation decisions.

   **What to do:** Ensure `planning-artifacts/PRD.md` exists in the project root, then re-invoke the Dev agent with task `{task_id}`.
   ```

3. Set `{prd_loaded}` = `'true'`. PRD content is now in conversation context.
4. Using the IDE Read file tool, attempt to read `planning-artifacts/architecture.md`.
5. If the read fails, emit the architecture-not-found error block and stop.

   ```
   ❌ **Planning artifact missing — architecture.md not found**

   The `clickup-dev-implement` skill could not read `planning-artifacts/architecture.md`.

   **Why this is fatal:** The architecture document defines the technical stack, patterns, and constraints the Dev agent must follow. Without it, the Dev agent cannot make architecture-compliant implementation decisions.

   **What to do:** Ensure `planning-artifacts/architecture.md` exists in the project root, then re-invoke the Dev agent with task `{task_id}`.
   ```

6. Set `{architecture_loaded}` = `'true'`. Architecture content is now in conversation context.
7. Using the IDE Read file tool, attempt to read `planning-artifacts/tech-spec.md`.
8. If the read succeeds, set `{tech_spec_loaded}` = `'true'`. Tech-spec content is now in conversation context.
9. If the read fails, emit the tech-spec-skipped warning block, set `{tech_spec_loaded}` = `'false'`, and continue.

   ```
   ⚠️ **Optional artifact not found — tech-spec.md skipped**

   `planning-artifacts/tech-spec.md` was not found in the project root.

   **Why this is non-fatal:** Tech-spec is an optional artifact. PRD and architecture are sufficient for most implementations.

   **Impact:** No tech-spec constraints are loaded for this implementation session. The Dev agent will rely on PRD and architecture only.
   ```

10. Emit the success summary block and continue to step 4.

    ```
    ✅ **Planning artifacts loaded**

    - **PRD:** `planning-artifacts/PRD.md` — loaded
    - **Architecture:** `planning-artifacts/architecture.md` — loaded
    - **Tech spec:** `planning-artifacts/tech-spec.md` — loaded [or "not found, skipped" if tech_spec_loaded is 'false']

    Proceeding to step 4 (progress-comment poster).
    ```
