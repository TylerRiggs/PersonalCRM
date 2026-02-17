# Sales Workload Manager

A personal sales CRM web application for managing opportunities, tracking actions, generating CRM updates, and integrating with OpenClaw AI assistant.

## Tech Stack

- **Frontend**: React + TypeScript + Vite
- **Design System**: Adobe React Spectrum
- **Data Storage**: IndexedDB via Dexie.js (local-first, no backend required)
- **AI Integration**: OpenClaw API (optional)

## Setup

```bash
npm install
npm run dev
```

The app runs at `http://localhost:5173` by default.

## Features

### Opportunity Management
- Create, edit, and delete sales opportunities
- Track stage (Discovery, Demo, Proposal, Negotiation, Closed Won/Lost)
- Risk level indicators (Low, Medium, High)
- Deal value and close date tracking

### Dashboard
- Overview of active opportunities and pipeline value
- "Requires Attention" section for high-risk, stale, and overdue items
- Pipeline breakdown by stage with progress bars

### Interaction Logging
- Log customer calls, internal calls, emails, and meetings
- Track participants and outcomes
- Timeline view per opportunity

### Task Management
- To-do lists per opportunity with priority and due dates
- Dependency tracking with owner and status
- Overdue task highlighting

### Weekly CRM Export
- Generate formatted CRM updates for all opportunities
- Filter by stage and date range
- Copy to clipboard or download as text file
- Adobe CRM update format

### OpenClaw AI Integration
- Connect to OpenClaw API for AI-powered recommendations
- "Suggest Next Actions" sends opportunity context for analysis
- Configure connection in Settings page

## OpenClaw Configuration

1. Go to **Settings** in the app
2. Enter the OpenClaw API URL (default: `http://localhost:18789`)
3. Enter your bearer token (from `~/.openclaw/gateway.json`)
4. Click **Test Connection** to verify

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd/Ctrl + K` | New Opportunity |
| `/` | Focus Search |

## Data Storage

All data is stored locally in your browser using IndexedDB. No server or account is required. Data persists across browser sessions but is tied to the browser/device.
