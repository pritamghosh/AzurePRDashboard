# BDD – Local Personal Azure DevOps Dashboard

## Purpose

Provide a lightweight desktop/web dashboard that consolidates Azure DevOps information for a single user.  
The application is intended for personal productivity and will run locally on the user's machine.

---

## Target User

Single user (application owner).  
No multi-user support is required.

---

## Authentication

- The application shall authenticate to Azure DevOps using a **Personal Access Token (PAT)**.
- The PAT shall be supplied through local configuration (`application-local.yml`, gitignored).
- The application will use the PAT for **all** Azure DevOps REST API requests.
- The PAT **must not** be committed to source control.
- The PAT **must not** be logged.

---

## Scope

### Phase 1 – Pull Requests

#### Feature: Pull Requests Assigned to Me

> Display all active pull requests created by the authenticated Azure DevOps user.

**Acceptance Criteria:**

- [ ] Pull requests are retrieved across all repositories in the configured project.
- [ ] Repository name is displayed.
- [ ] Pull request title is displayed.
- [ ] Pull request status is displayed.
- [ ] Creation date is displayed.
- [ ] A direct Azure DevOps link is available for each PR.

---

#### Feature: Pull Requests Awaiting My Review

> Display all active pull requests where the authenticated user is listed as a reviewer.

**Acceptance Criteria:**

- [ ] Repository name is displayed.
- [ ] Pull request title is displayed.
- [ ] Author name is displayed.
- [ ] Pull request status is displayed.
- [ ] A direct Azure DevOps link is available for each PR.

---

#### Feature: Dashboard Summary

> Display a high-level summary at the top of the dashboard.

**Acceptance Criteria:**

- [ ] Number of pull requests assigned to me is displayed.
- [ ] Number of pull requests awaiting my review is displayed.
- [ ] Last refresh timestamp is displayed.
- [ ] A manual **Refresh** button allows the user to re-fetch data on demand.

---

### Phase 2 – Stories _(Future)_

- Stories assigned to me.
- Blocked stories.
- Stories nearing due date.

### Phase 3 – Pipelines _(Future)_

- Failed builds.
- Recent deployments.
- Pipeline execution history.

### Phase 4 – Developer Productivity _(Future)_

- PR aging.
- Review turnaround time.
- Story completion metrics.

---

## Non-Functional Requirements

| Category   | Requirement                                                              |
|------------|--------------------------------------------------------------------------|
| Deployment | Runs locally; no cloud, Kubernetes, or external database required        |
| Security   | PAT not committed to source control; PAT not logged; HTTPS to Azure DevOps |
| Packaging  | Single executable Spring Boot JAR with React bundled as static resources |

---

## Technical Architecture

| Layer      | Technology                                  |
|------------|---------------------------------------------|
| Frontend   | React · TypeScript · Material UI (MUI)      |
| Backend    | Spring Boot 4.0.6 · Spring WebClient        |
| Auth       | Azure DevOps Personal Access Token          |
| Storage    | Local configuration file only               |
| Build      | Maven + frontend-maven-plugin (Vite)        |

---

## API Endpoints (Backend)

| Method | Path                        | Description                              |
|--------|-----------------------------|------------------------------------------|
| GET    | `/api/pullrequests/assigned`| PRs created by the authenticated user    |
| GET    | `/api/pullrequests/review`  | PRs where the user is a reviewer         |
| GET    | `/api/dashboard/summary`    | Counts + last refresh timestamp          |

---

## Configuration Properties

```yaml
# application.yml (safe defaults, committed to source control)
azure:
  devops:
    pat: ""           # Override in application-local.yml — NEVER commit real value
    organization: ""  # e.g. my-org
    project: ""       # e.g. my-project

server:
  port: 8080
```

---

## Success Criteria

The application shall enable the user to:

1. View all pull requests they authored from a single dashboard.
2. View all pull requests awaiting their review from a single dashboard.
3. Access Azure DevOps pull requests directly from the dashboard via a clickable link.
4. Extend the application to support stories and pipeline monitoring in future releases.

