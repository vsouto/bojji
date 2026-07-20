# Bojji

> **The AI Knowledge Graph for Engineering Organizations**

## Vision

Bojji is a knowledge layer for engineering organizations.

Instead of being another developer portal or dependency manager, Bojji models the entire engineering ecosystem as a structured knowledge graph that can be queried by both humans and AI agents.

Its goal is to answer questions like:

- What exists?
- How is everything connected?
- Who owns what?
- What will break if something changes?

---

# Problem

Modern engineering organizations consume dozens of internal resources:

- UI Libraries
- SDKs
- Internal APIs
- Platform Services
- Shared Components
- CI/CD Templates
- Docker Images
- Design Systems
- Infrastructure Services

The knowledge about these resources is fragmented across:

- GitHub / GitLab
- Jira
- Confluence
- Artifactory
- Backstage
- Slack / Teams
- Documentation
- Individual teams

As organizations grow, understanding dependencies becomes the bottleneck—not writing code.

---

# Mission

Create a unified engineering knowledge graph that enables developers and AI agents to reason about the organization.

---

# MVP Goals

The MVP must answer three questions:

1. What exists?
2. How is everything connected?
3. What is the impact of a change?

If Bojji answers these three questions reliably, it already delivers value.

---

# Core Domain

## Entities

- Team
- Project
- Repository
- Library
- Service
- Artifact
- Release
- Documentation

## Relationships

- Team owns Library
- Team owns Service
- Team owns Repository

- Project uses Library
- Project uses Service
- Project belongs to Team

- Library depends_on Library
- Library documented_by Documentation
- Library latest_release Release
- Library published_from Repository

- Repository produces Artifact
- Repository belongs_to Team

---

# Architecture

## Connectors

Initial connectors:

- GitHub
- npm Registry
- Jira
- Confluence

Future connectors:

- GitLab
- Azure DevOps
- Artifactory
- Backstage
- SonarQube
- Slack
- Microsoft Teams
- Kubernetes
- PagerDuty

Each connector exposes a common interface.

Example:

```ts
interface Connector {

  syncTeams()

  syncRepositories()

  syncLibraries()

  syncReleases()

  syncDependencies()

  syncDocumentation()

}
```

---

# Data Strategy

Bojji is NOT a mirror of external systems.

It stores only an indexed representation.

## Persisted

- Owners
- Dependencies
- Metadata
- Documentation links
- Versions
- Relationships

## Live

- Incidents
- Running pipelines
- Pull Requests
- Active deployments

---

# Knowledge Graph

The Knowledge Graph is the heart of Bojji.

Everything becomes a node.

Everything is connected through relationships.

Example:

Project
→ uses
Library
→ depends_on
Library
→ owned_by
Team

This allows impact analysis through graph traversal.

---

# API

REST

GET /libraries

GET /libraries/{id}

GET /projects

GET /teams

GET /graph

GET /impact/{library}

---

# MCP Server

Bojji exposes an MCP Server so any AI agent can query the graph.

Initial tools:

- find_library()
- find_owner()
- find_dependents()
- find_dependencies()
- get_latest_release()
- search_documentation()
- project_health()
- impact_analysis()

---

# AI Capabilities

Initial questions:

- Who owns this library?
- Who consumes this library?
- What does it depend on?
- Which version should I use?
- Is there documentation?
- What projects are outdated?
- What breaks if I upgrade?
- Is there an alternative library?

Future:

- Upgrade Advisor
- Migration Planner
- Risk Analysis
- Release Summaries
- Platform Recommendations

---

# UI

Navigation

- Dashboard
- Search
- Libraries
- Projects
- Teams
- Graph
- AI Chat

---

# Library Page

Shows:

- Owner
- Latest Version
- Consumers
- Dependencies
- Repository
- Documentation
- Releases
- Open Issues

---

# Project Page

Shows:

- Libraries Used
- Services Used
- Dependency Health
- Available Updates
- Risk Score

---

# Graph View

Interactive dependency graph.

Users can expand nodes recursively to visualize the engineering ecosystem.

---

# Tech Stack

Frontend

- Next.js

Backend

- NestJS

Database

- Neo4j

Search

- PostgreSQL Full Text Search

Cache

- Redis

Jobs

- BullMQ

AI

- OpenAI
- Claude

Protocols

- MCP

---

# Roadmap

## v0.1

- Knowledge Graph
- GitHub Connector
- npm Connector
- Search
- MCP Server
- AI Chat

## v0.2

- Jira
- Confluence
- Impact Analysis
- Version Health

## v0.3

- Upgrade Advisor
- Migration Assistant
- Dependency Timeline
- Breaking Change Detection

## v1.0

- Multi-tenant SaaS
- Connector Marketplace
- Agent Workflows
- Platform Intelligence
- Engineering Analytics

---

# Product Positioning

Bojji is not:

- a dependency manager
- a developer portal
- a documentation platform
- another Backstage

Bojji is an Engineering Knowledge Graph with AI.

---

# Vision Statement

> Bojji is for engineering organizations what GitHub is for source code: a unified layer of knowledge, relationships, and intelligence.
