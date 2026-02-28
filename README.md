# Identity Lens: Real-Time Cross-Platform Identity Reconciliation

Identity Lens is a robust, production-ready system designed to seamlessly link user interactions across multiple channels (using overlapping emails and phone numbers) into unified **Identity Clusters**.

It determines whether an incoming interaction belongs to an existing user, needs to be appended as a secondary contact method, or requires merging two previously distinct user profiles together.

---

## 🏗️ Architecture Overview

The system is cleanly decoupled into two main components:

1. **Backend (Web Service)**: Built with **Node.js, Express, and TypeScript**. It uses **Prisma ORM** for type-safe database access and **PostgreSQL** (via Supabase) for robust relational data storage.
2. **Frontend (UI Pane)**: Built with **React and Vite**. It features a modern, "glassmorphism" SaaS desktop aesthetic, providing real-time visual feedback on identity cluster generations.

### Core Technologies
* **TypeScript**: Strict typing across both backend and frontend.
* **Prisma**: Schema definition, migrations, and database transactions.
* **Zod**: Runtime schema validation for incoming Express payloads.
* **Vanilla CSS**: Performance-first, custom-variable-driven dark UI styling.

---

## 🧠 The Reconciliation Engine (Backend Logic)

The heart of the system lives in `backend/src/services/identity.service.ts`. The reconciliation algorithm enforces strict business rules mapped to the `Contact` model:

### Database Schema (`Contact`)
* `id` (Primary Key)
* `phoneNumber` (Optional String)
* `email` (Optional String)
* `linkedId` (Self-referential Foreign Key pointing to the Primary Contact)
* `linkPrecedence` (`"primary"` | `"secondary"`)
* `createdAt`, `updatedAt`, `deletedAt`

### The Algorithm Rules
When an `email` and/or `phoneNumber` hits the `POST /identify` endpoint, the system executes a deeply protective, transaction-safe workflow:

1. **Base Case (Creation)**: If no matching records exist, a new **Primary** contact is created.
2. **Append (Secondary Creation)**: If the incoming request contains *one* known piece of info (e.g., matching email) but introduces *new* info (e.g., a new phone number), it creates a **Secondary** contact pointing to the existing primary.
3. **Cross-Link (Merging)**: If the request contains an email belonging to *Primary A* and a phone number belonging to *Primary B*, the system must merge them.
   * **The "Oldest Wins" Rule**: It fetches the entire cluster, sorts all contacts chronologically by `createdAt`, and designates the absolute oldest record as the *undisputed Primary*.
   * **Deep Traversal**: It uses recursive root-finding to ensure that even if records have merged multiple times (A -> B -> C), it always finds the true root node of the cluster.
   * **Cascading Updates**: All younger primaries are downgraded to `secondary`, and every node in the cluster has its `linkedId` repointed directly to the oldest primary.
4. **Concurrency Safety**: The entire process is wrapped in a `prisma.$transaction`. Selects are executed with `FOR UPDATE` to apply row-level database locks, preventing race conditions if identical payloads hit the server precisely simultaneously.

---

## 🚀 Setup Instructions

### 1. Database Initialization
This project uses **Supabase PostgreSQL**. To initialize the database structure, you can either:
1. Run `npx prisma migrate dev --name init` remotely.
2. Or use the generated `init.sql` script (located in the `backend/` folder) and execute it directly in your Supabase SQL Editor to rapidly scaffold the tables.

### 2. Backend Setup
Configure your environment variables in `backend/.env`:
```env
# Example Supabase pooled connection
DATABASE_URL="postgres://postgres.xxx:password@aws-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
PORT=3000
```
Then start the server:
```bash
cd backend
npm install
npx prisma generate
npm run dev
```

### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
Navigate to `http://localhost:5173` to interact with Identity Lens.

---

## 🧪 Testing via cURL

You can bypass the UI and test the API directly using cURL:

#### 1. Create a new primary contact
```bash
curl -X POST http://localhost:3000/api/identify \
-H "Content-Type: application/json" \
-d '{"email": "lorraine@hillvalley.edu", "phoneNumber": "123456"}'
```

#### 2. Identify new phone number (creates secondary)
```bash
curl -X POST http://localhost:3000/api/identify \
-H "Content-Type: application/json" \
-d '{"email": "lorraine@hillvalley.edu", "phoneNumber": "100000"}'
```

#### 3. Cross-linking multiple primaries (merging clusters)
```bash
curl -X POST http://localhost:3000/api/identify \
-H "Content-Type: application/json" \
-d '{"email": "mcfly@hillvalley.edu", "phoneNumber": "123456"}'
```

---

## 🌐 Deployment (Render)

### Deploying the Backend
1. Create a **Web Service** tied to the `backend/` root directory.
2. Build Command: `npm install && npx prisma generate && npx tsc`
3. Start Command: `npm start` *(make sure `"start": "node dist/index.js"` is in package.json)*
4. Ensure `DATABASE_URL` is configured in the environment variables.

### Deploying the Frontend
1. Create a **Static Site** tied to the `frontend/` root directory.
2. Build Command: `npm install && npm run build`
3. Publish Directory: `dist`
4. Make sure to update the `axios.post` URL in `App.tsx` replacing `localhost:3000` with your deployed Render Web Service URL.
