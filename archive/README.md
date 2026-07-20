# Archive

Superseded or one-off artifacts, kept for provenance. Nothing here is current. The live source of truth is `docs/` (the wiki + "Where the project stands" dashboard) and `plans/004-final-solution-spec.md`.

| File | What it was | Why archived |
|---|---|---|
| `spec_v0.1.md` | The original ChatGPT-drafted spec — direction "a" ("AI Knowledge Graph for Engineering Organizations") with a heavy stack (Neo4j, Postgres, Redis, BullMQ) and connector framework. | Superseded on 2026-07-17 by strategy "b" (on-prem, compliance-grade, ontology-backed dependency inventory) and by Plan 004 (portable-first, no central service). The heavy stack and the "AI knowledge graph" positioning were explicitly dropped. |
| `spec_graph.md.txt` | Early ASCII diagram of a "Bojji Engine" stack (Knowledge Graph / Query Engine / Reasoner / Connector Framework / Permission Engine over MCP/REST/SDK). | Same old heavy framing; superseded by the Plan 004 architecture (files in a shared index repo, no engine service). |
| `analyze_cosmos_export.py` | One-off script parsing a Siemens *Cosmos GOV Export* spreadsheet (a local Windows Downloads file) to tally document types / org units. | Research-adjacent exploration, not product code. References a path that does not exist in this repo. |
