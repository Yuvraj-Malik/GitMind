# Git-Mind

An AI-driven, self-healing CI/CD visualizer.

## The idea

Every dev team has been through this: a PR fails, someone opens the CI logs, scrolls through a wall of red text, figures out what broke, fixes it, pushes again. Git-Mind tries to automate the boring middle part of that.

It hooks into a GitHub repo through webhooks. When a build or check run fails, an AI agent reads the actual broken files, writes a patch, and opens a real pull request with the fix — instead of you doing it manually at 1am before a deadline. And instead of just dumping logs in a terminal, we're rendering the whole thing as a live node graph, so you can actually watch a commit fail, get picked up by the AI, and turn into a PR in real time.

We didn't want this to be "ChatGPT wrapper #4000" though, so there's a hard limit: the AI gets 3 retries max on a fix. If it can't solve it by then, it stops and hands it back to a human instead of looping forever or making things worse. Nothing it does merges on its own either — everything goes through a normal PR review.

On top of the fixer, there's also a chat feature called "Ask Git-Mind" — you can literally ask questions about your own codebase ("why does this function break on empty input") and get an answer that's grounded in the actual code, with citations back to the file, using RAG + Tree-Sitter for chunking instead of just blindly splitting text.

## How it's built

Rough flow: GitHub sends a webhook → our backend picks it up and drops a job in a Redis queue (BullMQ) → the AI worker picks that job up and either runs the fixer agent or the RAG agent depending on the job type → fixer agent talks to the repo through Octokit and opens the PR, RAG agent pulls from a vector store (Qdrant) and answers → everything gets pushed back to the frontend live through Socket.io, where it shows up on the graph.

```
GitHub Webhook → Backend (Express + Socket.io) → Redis/BullMQ Queue → AI Worker
                                                        ├── Fixer Agent → patches code, opens PR
                                                        └── RAG Agent → searches vector store, answers questions
Backend also talks to MongoDB (state) and pushes live updates to the React frontend
```

Split into 4 workspaces so nothing blocks on the AI calls, which can be slow:

**Frontend** — React + Vite, Tailwind for styling, Zustand for state, React Flow for the graph canvas, Socket.io client for the live updates.

**Backend** — Node/Express doing the traffic-directing: catches webhooks, validates them, writes to MongoDB, emits socket events.

**AI Worker** — the actual brains. LangChain/OpenAI, BullMQ consumer, Octokit for GitHub ops, Tree-Sitter for parsing code into real logical chunks instead of arbitrary text splits.

**Shared** — small package for constants and utils used across the other three so nothing gets duplicated.

## Folder structure

```
git-mind/
├── frontend/src/
│   ├── store/            → Zustand store
│   ├── hooks/            → useWebSocket
│   ├── services/         → axios + socket client setup
│   ├── components/       → Button, Modal, Card etc — dumb reusable stuff
│   └── features/
│       ├── canvas/       → the graph itself, commit/AI nodes, edges
│       ├── chat-rag/     → the "Ask Git-Mind" chat drawer + citations
│       ├── pr-metrics/   → build metric cards, error log viewer
│       └── sidebar/
│
├── backend/src/
│   ├── webhooks/         → GitHub receiver + event routing
│   ├── controllers/      → repo + chat endpoints
│   ├── services/         → db, queue, github service logic
│   ├── sockets/          → real-time emission
│   └── models/           → Repository, PullRequest, AILog schemas
│
├── ai-worker/src/
│   ├── queue/worker.js   → consumes fix-code + rag-query jobs
│   ├── agents/
│   │   ├── fixerAgent.js → generates the fix, opens the PR
│   │   └── ragAgent.js   → codebase Q&A
│   ├── tools/             → github ops + Tree-Sitter parsing
│   ├── vector-store/      → embeddings + similarity search
│   └── prompts/            → the system prompts for each agent
│
├── shared/src/
├── docker-compose.yml      → spins up Mongo, Redis, Qdrant locally
└── package.json             → monorepo root
```

## Running it locally

```bash
docker compose up -d        # mongo, redis, qdrant
npm install                 # from root, installs all workspaces

npm run dev -w frontend     # localhost:5173
npm run dev -w backend
npm run dev -w ai-worker
```

## Team

4 of us worked on this, each owning one slice of the stack:

- **Visual UI** — the React Flow canvas, components, node rendering
- **Core Backend** — Express, MongoDB, webhooks, sockets
- **AI Fixer** — the BullMQ worker + LangChain fixer agent + the retry-limit logic
- **RAG Engine** — Tree-Sitter chunking, embeddings, vector search, and the chat UI for "Ask Git-Mind"

---

Still actively being built — this covers the architecture as it stands right now, not a finished product.
