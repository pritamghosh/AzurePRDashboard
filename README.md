# Azure DevOps Personal Dashboard

A lightweight, locally-run dashboard that consolidates your Azure DevOps pull request activity into a single view.  
Built with **Spring Boot 4.0.6** (backend) and **React + TypeScript + Material UI** (frontend).

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Project Structure](#project-structure)
3. [Technology Stack](#technology-stack)
4. [Configuration](#configuration)
5. [Running the Application](#running-the-application)
6. [API Endpoints](#api-endpoints)
7. [Build & Package](#build--package)
8. [How Azure DevOps Authentication Works](#how-azure-devops-authentication-works)
9. [Development Tips](#development-tips)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        Your Browser                             │
│                                                                 │
│   ┌─────────────────────────────────────────────────────────┐  │
│   │         React App  (MUI + TypeScript)                   │  │
│   │                                                         │  │
│   │  ┌───────────────┐  ┌───────────────┐  ┌────────────┐  │  │
│   │  │ SummaryCards  │  │ AssignedPRs   │  │ ReviewPRs  │  │  │
│   │  │ (counts +     │  │ Table         │  │ Table      │  │  │
│   │  │  last refresh)│  │ (my PRs)      │  │ (review)   │  │  │
│   │  └───────────────┘  └───────────────┘  └────────────┘  │  │
│   │                         │ Axios /api/*                  │  │
│   └─────────────────────────┼───────────────────────────────┘  │
└─────────────────────────────┼───────────────────────────────────┘
                              │ HTTP (same origin in prod /
                              │       Vite proxy in dev)
┌─────────────────────────────┼───────────────────────────────────┐
│              Spring Boot 4.0.6  (port 8080)                     │
│                             │                                   │
│   ┌─────────────────────────▼───────────────────────────────┐  │
│   │             PullRequestController                        │  │
│   │   GET /api/pullrequests/assigned                        │  │
│   │   GET /api/pullrequests/review                          │  │
│   │   GET /api/dashboard/summary                            │  │
│   └─────────────────────────┬───────────────────────────────┘  │
│                             │                                   │
│   ┌─────────────────────────▼───────────────────────────────┐  │
│   │             PullRequestService                           │  │
│   │   · Resolves current user GUID via profile API          │  │
│   │   · Fetches PRs created by user                         │  │
│   │   · Fetches PRs where user is a reviewer                │  │
│   │   · Combines counts for summary (parallel Mono.zip)     │  │
│   └─────────────────────────┬───────────────────────────────┘  │
│                             │                                   │
│   ┌─────────────────────────▼───────────────────────────────┐  │
│   │             AzureDevOpsClient  (WebClient)               │  │
│   │   · PAT encoded as HTTP Basic Auth header               │  │
│   │   · All calls over HTTPS                                │  │
│   └─────────────┬───────────────────────────┬───────────────┘  │
│                 │                           │                   │
└─────────────────┼───────────────────────────┼───────────────────┘
                  │ HTTPS                     │ HTTPS
      ┌───────────▼──────────┐   ┌────────────▼────────────────┐
      │  dev.azure.com       │   │  app.vssps.visualstudio.com  │
      │  /{org}/{project}/   │   │  /_apis/profile/profiles/me  │
      │  _apis/git/          │   │  (user identity resolution)  │
      │  pullrequests        │   └─────────────────────────────┘
      └──────────────────────┘
```

### Key Design Decisions

| Decision | Choice | Reason |
|----------|--------|--------|
| Frontend bundling | Maven `frontend-maven-plugin` + Vite | Single JAR, no separate deployment |
| HTTP client | Spring `WebClient` (reactive) | Non-blocking; easy to compose parallel calls |
| Auth | HTTP Basic with PAT as password | Azure DevOps standard; simple to implement |
| PAT storage | Gitignored local YAML file | Never in source control; no secrets manager needed for personal use |
| Dev proxy | Vite proxy → `:8080` | Eliminates CORS issues during development |

---

## Project Structure

```
AzureDashboard/
│
├── docs/
│   └── BDD.md                          ← Business-driven requirements (all phases)
│
├── frontend/                           ← React application (Vite + TypeScript + MUI)
│   ├── index.html                      ← HTML entry point
│   ├── package.json                    ← npm dependencies & scripts
│   ├── tsconfig.json                   ← TypeScript compiler options
│   ├── vite.config.ts                  ← Vite config + dev proxy to :8080
│   └── src/
│       ├── main.tsx                    ← React entry point + MUI ThemeProvider
│       ├── App.tsx                     ← Root component; manages all data fetching
│       ├── api/
│       │   └── pullRequestApi.ts       ← All Axios API calls (typed)
│       ├── types/
│       │   └── PullRequest.ts          ← Shared TypeScript interfaces
│       └── components/
│           ├── SummaryCards.tsx        ← Top 3 stat cards
│           ├── AssignedPRsTable.tsx    ← Table: PRs I authored
│           └── ReviewPRsTable.tsx      ← Table: PRs awaiting my review
│
├── src/
│   ├── main/
│   │   ├── java/io/github/pritamghosh/azuredashboard/
│   │   │   ├── AzureDashboardApplication.java     ← Spring Boot entry point
│   │   │   ├── config/
│   │   │   │   ├── AzureDevOpsProperties.java     ← @ConfigurationProperties binding
│   │   │   │   └── WebClientConfig.java           ← WebClient beans (PAT auth)
│   │   │   ├── client/
│   │   │   │   ├── AzureDevOpsClient.java         ← Low-level Azure DevOps API calls
│   │   │   │   └── model/
│   │   │   │       ├── AzureProfile.java          ← Profile API response model
│   │   │   │       ├── AzurePullRequest.java      ← PR API response model
│   │   │   │       └── AzurePullRequestResponse.java ← Paginated list wrapper
│   │   │   ├── service/
│   │   │   │   └── PullRequestService.java        ← Business logic; maps API → DTOs
│   │   │   ├── controller/
│   │   │   │   └── PullRequestController.java     ← REST endpoints exposed to frontend
│   │   │   └── model/
│   │   │       ├── PullRequestDto.java            ← Frontend-facing PR payload
│   │   │       └── DashboardSummaryDto.java       ← Frontend-facing summary payload
│   │   └── resources/
│   │       ├── application.yml                    ← Safe defaults (committed ✔)
│   │       └── application-local.yml              ← Your real PAT (gitignored ✔)
│   └── test/
│       └── java/.../AzureDashboardApplicationTests.java
│
├── pom.xml                             ← Spring Boot 4.0.6 + frontend-maven-plugin
├── .gitignore                          ← Excludes PAT file, node_modules, target/
└── README.md                           ← This file
```

---

## Technology Stack

### Backend

| Technology | Version | Purpose |
|------------|---------|---------|
| Java | 25 | Runtime |
| Spring Boot | 4.0.6 | Application framework |
| Spring Web | (via Boot) | REST controllers, serves static React build |
| Spring WebFlux | (via Boot) | `WebClient` for non-blocking Azure API calls |
| Spring Actuator | (via Boot) | `/actuator/health` endpoint |
| Jackson | (via Boot) | JSON serialisation / deserialisation |
| Maven | 3.9+ | Build tool |
| frontend-maven-plugin | 1.15.1 | Downloads Node, runs `npm install` + `npm run build` |

### Frontend

| Technology | Version | Purpose |
|------------|---------|---------|
| React | 18 | UI framework |
| TypeScript | 5 | Type safety |
| Material UI (MUI) | 6 | Component library + theming |
| Vite | 6 | Build tool + dev server with proxy |
| Axios | 1.7 | HTTP client for backend API calls |

---

## Configuration

### `src/main/resources/application.yml` _(committed to source control)_

```yaml
server:
  port: 8080

azure:
  devops:
    pat: ""           # ← Leave empty here
    organization: ""  # ← Leave empty here
    project: ""       # ← Leave empty here
    api-version: "7.1"

management:
  endpoints:
    web:
      exposure:
        include: health, info
```

This file defines the structure but contains **no secrets**. It is safe to commit.

---

### `src/main/resources/application-local.yml` _(gitignored — your secrets go here)_

```yaml
azure:
  devops:
    pat: "YOUR_PERSONAL_ACCESS_TOKEN"
    organization: "your-azure-devops-org"
    project: "your-project-name"
```

> ⚠️ **This file is listed in `.gitignore` and must NEVER be committed.**

This file is automatically picked up by Spring Boot via:
```yaml
spring:
  config:
    import: "optional:classpath:application-local.yml"
```
defined in `application.yml`. No extra profile flag is needed.

---

### How to Create a Personal Access Token (PAT)

1. Go to `https://dev.azure.com/{your-org}` → **User Settings** → **Personal access tokens**
2. Click **New Token**
3. Set a descriptive name: e.g. `local-dashboard`
4. Set expiry as appropriate
5. Under **Scopes**, select:
   - `Code` → **Read** (to access pull requests)
6. Click **Create** and copy the token immediately — it won't be shown again
7. Paste it into `application-local.yml`

---

## Running the Application

### Prerequisites

- **Java 25** (minimum required)
- Maven 3.9+
- Azure DevOps organization and project (required)
- Azure DevOps Personal Access Token (PAT) with "Read" scope
- _(Node.js is NOT required — the frontend-maven-plugin downloads it automatically)_

---

### Option 1 – Development Mode (recommended while coding)

Run the Spring Boot backend and the React dev server separately.  
The Vite dev server proxies all `/api` requests to Spring Boot on port 8080,  
so both servers appear as a single app from the browser's perspective.

```bash
# Terminal 1 — Start the Spring Boot backend
mvn spring-boot:run

# Terminal 2 — Start the React dev server (hot reload)
cd frontend
npm install        # only needed on first run
npm run dev
```

Open your browser at: **`http://localhost:5173`**

---

### Option 2 – Production JAR (fully self-contained)

Maven builds the React app and bundles it into the JAR as static resources.  
One JAR, one command to run.

```bash
# Build everything (downloads Node, builds React, packages JAR)
mvn clean package

# Run the self-contained JAR (reads config from application-local.yml automatically)
java -jar target/azure-dashboard-1.0.0-SNAPSHOT.jar
```

Open your browser at: **`http://localhost:8080`**

---

### Option 2b – Windows PowerShell Script

For Windows users, the `azuredashboard.ps1` script provides a convenient one-command launch with embedded configuration.

**Edit these settings in the script:**

```powershell
# Personal Access Token (required)
$pat = "YOUR_PAT_VALUE_HERE"

# Azure DevOps organization and project (required)
$organization = "YOUR_ORGANIZATION_NAME"
$project = "YOUR_PROJECT_NAME"

# Java location (update if installed elsewhere)
$env:JAVA_HOME="C:\Program Files\Java\jdk-25.0.2"

# Server port (default 8080)
$serverPort = 8080

# Repository groups (customize to your needs)
$repositoryGroups = @(
    @{ name = "Team A"; prefixes = @("team-a-", "proj1-") },
    @{ name = "Team B"; prefixes = @("team-b-", "proj2-") }
)
```

**Run:**
```powershell
.\azuredashboard.ps1
```

The script validates your configuration and displays helpful error messages if any required value is missing.

---

## API Endpoints

All endpoints return JSON. Base URL: `http://localhost:8080`

| Endpoint | Description | Response |
|----------|-------------|----------|
| `GET /api/pullrequests/assigned` | Active PRs created by you | `[{id, title, repositoryName, status, createdDate, author, url}]` |
| `GET /api/pullrequests/review` | Active PRs awaiting your review | Same shape as above |
| `GET /api/dashboard/summary` | PR counts and last refresh time | `{assignedCount, reviewCount, lastRefreshed}` |
| `GET /actuator/health` | Spring Boot health check | `{status: "UP"}` |

---

## Build & Package

The Maven build process automatically:
1. Compiles React frontend with Vite (`frontend/dist/`)
2. Copies frontend build into Spring Boot static resources
3. Packages everything into a single JAR with embedded static files

```bash
mvn clean package
```

That's it. The JAR is self-contained and ready to run.

---

## How Azure DevOps Authentication Works

The app uses **HTTP Basic Auth** with a Personal Access Token (PAT) as the password:

```
Authorization: Basic BASE64(":" + PAT)
```

(Username is intentionally empty; Azure DevOps uses the colon as delimiter.)

**User Resolution:**

On startup, the app calls:
```
GET https://app.vssps.visualstudio.com/_apis/profile/profiles/me?api-version=7.1
```

This returns your GUID (identity ID), which is used for subsequent queries:
- My PRs: `searchCriteria.creatorId={guid}`
- Review requests: `searchCriteria.reviewerId={guid}`

The PAT is configured at runtime and **never logged**.

---

## PR Info Column

Every PR table renders a unified **Info** column powered by the `PRInfoCell` component with:

- **Status icon** — merge-readiness (click for details popover)
- **Auto-complete badge** _(purple play icon)_ — shown when auto-complete is enabled
- **Work-item count** _(link icon)_ — number of linked work items
- **Refresh button** _(rotate icon)_ — re-fetch that single PR without refreshing the whole dashboard

---

## Development Tips

### Enable WebClient request/response logging

In `application-local.yml`, add:

```yaml
logging:
  level:
    org.springframework.web.reactive.function.client: DEBUG
    reactor.netty.http.client: DEBUG
```

### Switch Azure DevOps project without rebuilding

Simply update `application-local.yml` and restart Spring Boot.  
The React frontend requires no changes — it calls the backend which reads config at startup.

### Adding a new Phase 2 feature (Stories)

1. Add new Azure DevOps API call in `AzureDevOpsClient`
2. Add a new `StoryDto` in `model/`
3. Add a new `StoryService`
4. Add endpoints to a new `StoryController` (or extend `PullRequestController`)
5. Add a new `StoryTable.tsx` component in `frontend/src/components/`
6. Wire it up in `App.tsx`

