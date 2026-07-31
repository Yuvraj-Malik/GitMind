# 🧠 Git-Mind: Comprehensive File Guide

This document explains the exact purpose of every file in the Git-Mind monorepo. Use this to assign tasks and ensure everyone knows where to write their code.

## 🏗️ Root Directory

- **`docker-compose.yml`**: A configuration file to instantly boot up your local database (MongoDB), message queue (Redis), and vector database (Qdrant) without needing to install them directly.
- **`package.json`**: The main monorepo configuration that links your frontend, backend, and ai-worker together so you can run `npm install` and start everything with one command.
- **`.gitignore`**: Global ignore rules for the monorepo to keep generated files (for example `node_modules`, build outputs, logs, and `.env` secrets) out of Git.

## 🎨 1. Frontend (`/frontend/src`)

Everything the user sees and interacts with. Built with React, Vite, Tailwind CSS, Zustand, and React Flow.

### Core Setup

- **`App.jsx`**: The main entry point of the React application. It handles the high-level layout (Sidebar on the left, Canvas in the middle, Chat on the right).
- **`main.jsx`**: React bootstrap file that mounts the application into the DOM.
- **`index.css`**: Global styling foundation and layout shell styles.

### State & Services

- **`store/appStore.js`**: Zustand global state store (for active repository, user state, and app-level setters).
- **`hooks/useWebSocket.js`**: A custom React hook that maintains the live Socket.io connection and subscribes to real-time backend events.
- **`services/apiClient.js`**: Axios configuration for standard HTTP requests to the backend API.
- **`services/socket.js`**: Socket.io client setup used by real-time UI features.

### Dumb/Reusable Components (`/components`)

- **`components/ui/Button.jsx`**: Reusable button primitive.
- **`components/ui/Input.jsx`**: Reusable input primitive.
- **`components/ui/Modal.jsx`**: Reusable modal wrapper.
- **`components/ui/Card.jsx`**: Reusable card container.
- **`components/typography/Heading.jsx`**: Reusable heading style wrapper.
- **`components/typography/Label.jsx`**: Reusable label/text token.

### Smart Features (`/features`)

- **`features/canvas/GraphCanvas.jsx`**: React Flow visualization surface for commit/AI nodes.
- **`features/canvas/nodes/CommitNode.jsx`**: Visual node for a standard commit/PR state.
- **`features/canvas/nodes/AINode.jsx`**: Visual node for AI actions (e.g., fix generation state).
- **`features/canvas/edges/CustomEdge.jsx`**: Edge renderer for custom graph connection styling.
- **`features/canvas/useCanvasState.js`**: Graph node/edge state and positioning logic.
- **`features/chat-rag/ChatDrawer.jsx`**: Side panel where developers ask RAG/codebase questions.
- **`features/chat-rag/ChatMessage.jsx`**: Chat message renderer for assistant/user messages.
- **`features/chat-rag/CitationLink.jsx`**: Clickable citation element for file references.
- **`features/pr-metrics/LiveMetrics.jsx`**: PR/build metric dashboard cards and summary panel.
- **`features/pr-metrics/ErrorLogViewer.jsx`**: Terminal-style error output area for failed build logs.
- **`features/sidebar/Sidebar.jsx`**: Left navigation and activity entry point.

## ⚙️ 2. Backend API (`/backend/src`)

The fast, traffic-directing server. It catches webhooks, updates the database, and talks to the frontend.

### Core Setup

- **`server.js`**: Initializes Express, binds Socket.io, registers routes, and starts the HTTP server.
- **`config/env.js`**: Loads environment variables (`PORT`, `MONGO_URI`, `REDIS_URL`, GitHub secret).
- **`config/db.js`**: MongoDB connection bootstrap via Mongoose.
- **`config/redis.js`**: Shared Redis connection instance.

### GitHub Webhooks (`/webhooks`)

- **`webhooks/githubReceiver.js`**: Receives GitHub webhook requests and validates the signature.
- **`webhooks/eventRouter.js`**: Routes webhook payloads by event type (`check_run`, `pull_request`) and triggers queue/DB updates.

### REST Controllers (`/controllers`)

- **`controllers/repoController.js`**: Handles repository and commit-fetch endpoints.
- **`controllers/chatController.js`**: Receives RAG chat requests and enqueues them for the AI worker.

### Business Logic (`/services`)

- **`services/dbService.js`**: Encapsulates MongoDB CRUD helpers for repositories and pull requests.
- **`services/queueService.js`**: BullMQ queue producer for `fix-code` and `rag-query` jobs.
- **`services/githubService.js`**: Octokit wrapper for GitHub PR metadata access.

### Real-Time Sync (`/sockets`)

- **`sockets/socketManager.js`**: Socket connection lifecycle and real-time event emission to clients.

### Database Schemas (`/models`)

- **`models/Repository.js`**: Repository schema for tracked repositories and commit snapshots.
- **`models/PullRequest.js`**: Pull request schema for status tracking and repo linkage.
- **`models/AILog.js`**: AI run log schema for attempts, reasoning, and lifecycle status.

## 🤖 3. AI Worker (`/ai-worker/src`)

The heavy-lifting background process. It reads code, prompts LLMs, and pushes fixes asynchronously.

### The Engine

- **`queue/worker.js`**: BullMQ consumer that listens for `fix-code` and `rag-query` jobs.

### LLM Brains (`/agents`)

- **`agents/fixerAgent.js`**: Builds and runs code-fix logic for broken PR/check runs.
- **`agents/ragAgent.js`**: Handles RAG Q&A flow and citation-oriented answer output.

### Capabilities (`/tools`)

- **`tools/githubOps.js`**: Git operation helpers for creating branches/commits and PR automation hooks.
- **`tools/codeParser.js`**: Source chunking utilities intended for Tree-Sitter-backed semantic splitting.

### Vector Database (`/vector-store`)

- **`vector-store/embedder.js`**: Embedding workflow from code chunks to vector payloads.
- **`vector-store/search.js`**: Similarity search entry point for retrieval during chat.

### Static Instructions (`/prompts`)

- **`prompts/selfHealingPrompt.txt`**: System instructions for autonomous fix generation behavior.
- **`prompts/codeQaPrompt.txt`**: System instructions for citation-grounded code Q&A behavior.

## 🔁 Shared Package (`/shared/src`)

Cross-package constants and utility helpers.

- **`constants.js`**: Shared socket event names and app-wide constants.
- **`utils.js`**: Shared utility functions (for example safe JSON parsing helpers).
- **`index.js`**: Package export surface for shared modules.

## ▶️ Suggested Dev Workflow

1. Start infrastructure: `docker compose up -d`
2. Install dependencies from root: `npm install`
3. Run frontend: `npm run dev -w frontend`
4. Run backend: `npm run dev -w backend`
5. Run worker: `npm run dev -w ai-worker`
