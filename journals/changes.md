# Journal - Detailed Changes (Day 1 to Present)

## Architecture & Refactoring
- **Directory Restructuring**: Separated the source code (`/code`) from academic reporting (`/project-report`) and documentation (`/journals`).
- **AI Worker Decoupling**: Decoupled `ai-worker` from `backend`'s filesystem. The worker now initializes its own MongoDB connection using its own `.env` variables instead of reusing the backend's module.
- **Shared Models Library**: Moved Mongoose schemas (`AILog.js` and `PullRequest.js`) into a new `/code/shared/src/models/` directory.
- **Dependency Management**: Added the `shared` directory as a formal local dependency in both `backend/package.json` and `ai-worker/package.json`.
- **Gitignore Maintenance**: Updated `.gitignore` to prevent unnecessary files, environment variables, and local DB instances from being pushed to the remote repository.

## Backend Features & Fixes
- **Manual Trigger Endpoint**: Implemented a `POST /api/repos/:repoId/trigger-fix` route in `repoController.js` to allow synchronous testing of the AI fixer loop without requiring webhooks or BullMQ.
- **Path Resolution Fixes**: Corrected absolute path calculations in `repoController.js` to strictly enforce the `/code/` subdirectory structure.
- **Seeding Script**: Created a `seed.js` script to populate MongoDB with initial PR and AILog data for UI testing.

## AI Worker Logic
- **Retry-Loop Regression Fix**: Refactored `fixerAgent.js` to track actual attempt counts unconditionally. It now correctly returns `attempt: 1` and fails fast on non-recoverable errors (e.g., PR creation failures, missing config) instead of blindly retrying 3 times.
- **Core Execution Bypass**: Extracted `runFixerAgentCore` to allow the AI agent to be invoked purely programmatically without requiring a live MongoDB connection (used heavily in the E2E testing script).
- **E2E Verification**: Updated the `run-real-credential.js` E2E test harness to point to `06-misleading-comment.js` and successfully verified that a genuine fix PR was generated.

## Frontend Dashboard
- **Data Mapping Fixes**: Updated `appStore.js` to correctly map raw database fields from the backend's `AILog` and `PullRequest` endpoints into the properties expected by the React UI components.
- **Live Metrics Adjustments**: Refactored `LiveMetrics.jsx`. Removed dynamic rendering of fabricated metrics (Build Time, Tests, Security) that weren't actually stored in the DB schema, hardcoding them to "N/A" to maintain an honest UI state.
