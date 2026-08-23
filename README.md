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
│   │   ├── java/com/personal/azuredashboard/
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

For Windows users, the `azuredashboard.ps1` script provides a convenient way to run the application with custom configuration embedded in the script.

**Script features:**
- Automatically sets Java environment (`JAVA_HOME` and `PATH`)
- Defines repository groups for organizing your pull requests
- Passes configuration to the JAR via command-line arguments
- No need for a separate `application-local.yml` file

**Usage:**

```powershell
# Run from the project root directory
.\azuredashboard.ps1
```

**Configuring Java Location:**

If Java 25 is installed in a different location on your system, update the path at the top of `azuredashboard.ps1`:

```powershell
# ✏️ Update this path if Java 25 is installed elsewhere
$env:JAVA_HOME="C:\Program Files\Java\jdk-25.0.2"
```

To find your Java installation path:
```powershell
# Run this to find where Java is installed
where java
# Or check: C:\Program Files\Java (Windows default location)
```

**Customizing repository groups in the script:**

Edit `azuredashboard.ps1` and update the `$repositoryGroups` array to match your repository naming conventions:

```powershell
$repositoryGroups = @(
    @{
        name = "Your Team 1"
        prefixes = @("team1-", "proj-a-")
    },
    @{
        name = "Your Team 2"
        prefixes = @("team2-", "proj-b-")
    }
)
```

**Configuring the Personal Access Token (PAT):**

The script requires you to set your Azure DevOps PAT. You have two options:

**Option A: Direct (default - simpler)**

Edit `azuredashboard.ps1` at the top and replace the placeholder:

```powershell
# ⚠️ Personal Access Token (PAT) Configuration
$pat = "YOUR_PAT_VALUE_HERE"     # ← Replace with your actual PAT
```

Then run:
```powershell
.\azuredashboard.ps1
```

**Option B: Environment Variable (more secure)**

Uncomment the environment variable section in the script (comment out the direct `$pat` line):

```powershell
# Uncomment this block and comment out the direct $pat line above
if ($null -eq $env:AZURE_DEVOPS_PAT -or $env:AZURE_DEVOPS_PAT -eq "") {
    Write-Host "ERROR: AZURE_DEVOPS_PAT environment variable is not set." -ForegroundColor Red
    exit 1
}
$pat = $env:AZURE_DEVOPS_PAT
```

Then set the environment variable before running:

```powershell
$env:AZURE_DEVOPS_PAT = "YOUR_ACTUAL_PAT"
.\azuredashboard.ps1
```

**Script validation:**

The script will error and exit if the PAT is not properly configured, with helpful instructions on how to fix it.

> **Tip:** For persistent storage of your PAT, set it in Windows environment variables via **Settings → Environment Variables** instead of in the script.

---

### Option 2c – Command-Line Arguments (Cross-Platform)

```bash
java -jar target/azure-dashboard-1.0.0-SNAPSHOT.jar --azure.devops.pat="YOUR_PAT_HERE"
```

**Method 2 — Java system properties** (`-D` flags, before `-jar`)

```bash
java -Dazure.devops.pat="YOUR_PAT_HERE" -jar target/azure-dashboard-1.0.0-SNAPSHOT.jar
```

**Method 3 — Environment variables**

Spring Boot automatically maps environment variables to properties using the convention
`AZURE_DEVOPS_PAT` → `azure.devops.pat` (dots become underscores, all uppercase):

```powershell
# PowerShell — current session
$env:AZURE_DEVOPS_PAT = "YOUR_PAT_HERE"
java -jar target/azure-dashboard-1.0.0-SNAPSHOT.jar
```

> **Precedence (highest → lowest):**  
> `--` command-line args → `-D` system properties → environment variables → `application-local.yml` → `application.yml`

> ⚠️ Avoid putting the PAT in shell history. Prefer environment variables set via the Windows UI (see below).

---

### Option 3 – IntelliJ IDEA Run Configuration

1. Open the **Run/Debug Configurations** dialog
2. Add a new **Spring Boot** configuration
3. Set **Main class**: `com.personal.azuredashboard.AzureDashboardApplication`
4. No additional environment variables are needed  
   _(config is loaded automatically from `application-local.yml`)_
7. Run it, then separately start the frontend with `npm run dev` in the `frontend/` directory

---

## API Endpoints

All endpoints return JSON. Base URL in production: `http://localhost:8080`

### `GET /api/pullrequests/assigned`

Returns active pull requests **created by** the authenticated user.

**Response:**
```json
[
  {
    "id": 42,
    "title": "Fix login timeout bug",
    "repositoryName": "my-service",
    "status": "active",
    "createdDate": "2026-05-20T09:15:00Z",
    "author": "Your Name",
    "url": "https://dev.azure.com/org/project/_git/my-service/pullrequest/42"
  }
]
```

---

### `GET /api/pullrequests/review`

Returns active pull requests where the authenticated user is listed as a **reviewer**.

**Response:** Same shape as above, `author` field contains the PR creator's name.

---

### `GET /api/dashboard/summary`

Returns counts and the server-side refresh timestamp.

**Response:**
```json
{
  "assignedCount": 3,
  "reviewCount": 7,
  "lastRefreshed": "2026-05-31T12:00:00Z"
}
```

---

### `GET /actuator/health`

Spring Boot health check endpoint.

```json
{ "status": "UP" }
```

---

## Build & Package

### Maven lifecycle phases relevant to this project

| Phase | What happens |
|-------|-------------|
| `generate-resources` | `frontend-maven-plugin` runs `npm install` then `npm run build` (outputs to `frontend/dist/`) |
| `process-resources` | `maven-resources-plugin` copies `frontend/dist/` → `target/classes/static/` |
| `compile` | Java source files compiled |
| `package` | Spring Boot repackages the JAR; static React files are bundled inside |

### Skipping the frontend build (faster iteration on backend only)

```bash
mvn spring-boot:run -Dfrontend.skip=true
```

> Note: this only skips the frontend plugin if you add the `skip` configuration to `pom.xml`.  
> Otherwise, skip by simply running `mvn spring-boot:run` — the plugin only executes during `package`.

---

## How Azure DevOps Authentication Works

Azure DevOps supports **HTTP Basic Authentication** using a PAT as the password field:

```
Authorization: Basic BASE64(":" + PAT)
```

Note the leading colon — the username is intentionally left empty.

This header is added to **every request** by the `WebClient` beans configured in `WebClientConfig.java`.  
The PAT is read from configuration properties and is **never logged** anywhere in the application.

### User Identity Resolution

When the app starts and the dashboard is loaded, it first calls:

```
GET https://app.vssps.visualstudio.com/_apis/profile/profiles/me?api-version=7.1
```

This returns the authenticated user's **GUID** (identity ID), which is then used in subsequent PR queries:

- PRs created by me: `searchCriteria.creatorId={guid}`
- PRs awaiting my review: `searchCriteria.reviewerId={guid}`

---

## PR Info Column

Every PR table (My PRs, Awaiting Review, and the Repository Group dialog) renders a unified **Info** column powered by the `PRInfoCell` component. The column displays:

| Indicator | Description |
|-----------|-------------|
| **Status icon** | Merge-readiness icon (click to open the detail popover). Reflects real policy state immediately on load — policy evaluations are fetched eagerly for every row as soon as the table renders. |
| **Auto-complete badge** _(purple play icon)_ | Shown when auto-complete has been enabled for the PR; tooltip shows who set it. |
| **Work-item count** _(link icon + count)_ | Number of linked work items, fetched eagerly on mount. Tooltip shows the human-readable label. |
| **Refresh button** _(mini rotate icon)_ | Inline per-row refresh button — re-fetches that single PR from Azure DevOps without refreshing the whole dashboard. Available in all tables including the Repository Group pop-up dialog. |

### Eager policy fetch

`PRInfoCell` issues two API calls on mount for every row:

* `GET /api/pullrequests/{id}/policy-evaluations` — used to immediately reflect blocking-policy violations in the status icon even before the user opens the popover.
* `GET /api/pullrequests/{id}/workitems` — used to show the work-item count badge inline.

The results are passed as **preloaded props** to `PRMergeStatusBadge`; the badge uses them immediately and skips its own lazy fetch when the popover is opened.

### Repository Group dialog refresh

When the refresh button is clicked inside the Repository Group pop-up:

1. The parent (`App`) is notified via `onRefreshPR`, updating the My PRs / Review tabs in the background.
2. The widget also re-fetches the individual PR and patches its own dialog snapshot, so the row inside the dialog updates without closing it.

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

### Change the server port

**Permanently** — in `application-local.yml`:

```yaml
server:
  port: 9090
```

**One-off at launch** — no file change needed:

```powershell
# Command-line argument
java -jar target/azure-dashboard-1.0.0-SNAPSHOT.jar --server.port=9090

# Or as a system property
java -Dserver.port=9090 -jar target/azure-dashboard-1.0.0-SNAPSHOT.jar

# Or as an environment variable (PowerShell)
$env:SERVER_PORT = "9090"
java -jar target/azure-dashboard-1.0.0-SNAPSHOT.jar
```

> When using the Vite dev server (Option 1), also update the proxy target in `frontend/vite.config.ts` to match the new port.

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

