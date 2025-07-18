# 🌀 Portal

**Portal** is a real-time collaborative text editor that allows multiple users to edit shared documents simultaneously in private, room-based sessions. Powered by WebSockets, it ensures low-latency synchronization and seamless teamwork across devices.

---

## Features

* **Real-time Collaboration** — Type together with instant sync between users.
* **Room-based System** — Create or join sessions using a unique 6-digit room code.
* **Auto-Cleanup** — Inactive rooms are automatically removed after 1 hour to optimize resources.
* **Cross-platform Support** — Accessible via modern web browsers with responsive design.

---

## Architecture

Portal is a full-stack web application composed of:

### Backend (Go)

* WebSocket server for managing real-time connections.
* REST API for room lifecycle operations (`/create`, `/exists`, `/ws`).
* Thread-safe room state handling using mutexes for concurrency control.

### Frontend (React + TypeScript)

* Intuitive UI for creating and joining rooms.
* Collaborative text editor with WebSocket-based live updates.
* Built with **Vite**, **React Router**, **Tailwind CSS**, and **shadcn/ui** for modern styling.

---

## Quick Start

### Prerequisites

* **Go** v1.19+
* **Node.js** & **npm**

---

### Development Setup

1. **Clone the repository**

   ```bash
   git clone https://github.com/swgtds/portal.git
   cd portal
   ```

2. **Run the backend**

   ```bash
   cd backend
   go run main.go
   ```

   The backend server runs on `http://localhost:5001`

3. **Run the frontend**

   ```bash
   cd frontend
   npm install
   npm run dev
   ```

   The frontend runs on `http://localhost:8080`

---

## Usage

1. **Create a Room** — Click "Create Room" to generate a 6-digit session code.
2. **Join a Room** — Enter a valid code to collaborate with others.
3. **Start Editing** — Begin typing and watch all connected users sync in real time.

---

## 📡 API Endpoints

| Method | Endpoint            | Description                           |
| ------ | ------------------- | ------------------------------------- |
| POST   | `/create`           | Creates a new room and returns its ID |
| GET    | `/exists?room=<id>` | Checks if a room exists               |
| WS     | `/ws?room=<id>`     | WebSocket endpoint for collaboration  |

---

## Tech Stack

* **Backend**: Go, Gorilla WebSocket, `net/http`
* **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui

---

## Notes

* Portal uses **CORS middleware** to handle cross-origin communication between frontend and backend.
* Includes robust **error handling** for invalid room codes, connection failures, and session timeouts.
* The frontend was initially scaffolded using **Lovable.dev** for modern, developer-friendly UI.

---