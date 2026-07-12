# 🏢 AssetFlow — Enterprise Asset & Resource Management System

AssetFlow is a centralized, role-based ERP platform designed to simplify how modern organizations track, allocate, maintain, and audit their physical hardware, fleet vehicles, and shared meeting rooms. Built with a robust relational database schema and a gorgeous glassmorphic user interface, the system solves complex business needs like double-allocation prevention, time-slot booking conflicts, and structured inventory auditing.

---

## 🎨 Design System & User Interface Highlights

AssetFlow features a premium visual aesthetic built using a custom vanilla CSS design system (found in `theme.css`):
* **Live Dashboards**: Interactive KPI card displays that fetch real-time database indicators (available vs allocated counts, active bookings, overdue returns, and ongoing maintenance tasks).
* **Audit Cycles Workspace**: A visual auditor dashboard featuring responsive inventory checklists, progress bars tracking checked items, and warning logs summarizing discrepancies (missing or damaged items).
* **Interactive Status Pickers**: Forms discard basic browser inputs for customized, color-coded visual picker buttons (e.g. green for Verified, amber for Damaged, red for Missing) that change the submit buttons dynamically.
* **Role-Based Adaptation**: The sidebar and forms adapt automatically to the logged-in user's role—hiding management controls for employees and showcasing administrative panels for managers.

---

## 🏗️ Technical Stack & Architecture

* **Frontend SPA**: React (Vite) styled with maximum CSS customizability (Steel Blue + Teal theme). Built statically and served directly by the Express server.
* **Backend API**: Node.js & Express.js written in TypeScript (ES Modules).
* **Database & ORM**: Prisma ORM targeting a SQLite database. Includes a fully normalized relational schema supporting Cascade deletes and SetNull safeguards.
* **Validation Layer**: Type-safe Zod schema validation on all incoming API request payloads.
* **Auth & Security**: JWT-based stateless session authentication combined with `bcryptjs` password hashing.

---

## 🔒 Implemented Core Rules

### 1. Conflict Prevention on Allocations
* **Rule**: Assets (laptops, monitors) can only be checked out by one person/department at a time.
* **Behavior**: If Priya holds a MacBook and Raj tries to allocate it, the backend rejects it with `Conflict (409)`. The frontend displays a conflict modal showing who currently holds it, and offers to start a **Transfer Request**.

### 2. Time-Slot Overlap Validation on Shared Bookings
* **Rule**: Bookings for shared rooms or vehicles cannot overlap.
* **Behavior**: If Meeting Room B2 is booked from 9:00 AM to 10:30 AM, any overlapping request (e.g., 10:15 AM to 11:30 AM) is rejected by the server with a helpful message detailing the active booking.

### 3. Progressive Role Elevation
* **Rule**: Evaluators can register a new account on `/signup`. The very first account registered is automatically granted `Admin` role to bootstrap the system. All subsequent signups default to `Employee`. The Admin can promote any user to `Asset_Manager` or `Department_Head` via the **Organization Setup** directory.

---

## 👥 Seeded Scenario Accounts (For Evaluators)

The database includes pre-configured mock data representing a corporate workspace. Use the credentials below to experience role-specific layouts:

* **Default Password for all accounts**: `Admin@1234`

| User Email | Assigned Role | Main Responsibility / Test Flow |
| :--- | :--- | :--- |
| **`admin@assetflow.com`** | **Admin** | Promotes employees, creates departments/categories, inspects system-wide activity logs. |
| **`manager@assetflow.com`** | **Asset Manager** | Registers assets, assigns allocations, reviews maintenance boards, initiates and closes inventory audits. |
| **`head.eng@assetflow.com`** | **Dept Head (Eng)** | Approves/rejects asset transfers request and views department assets. |
| **`priya@assetflow.com`** | **Employee** | Views checked-out laptop, requests room bookings, and reports damaged items. |

---

## 🚀 Quick Start Guide

### 1. Install Dependencies
Run the installation command in both the root workspace and subdirectories:
```bash
npm install
```

### 2. Set Up Environment Variables
Create a `.env` file in the `backend/` directory:
```env
PORT=5000
JWT_SECRET=super-secret-key-for-development
DATABASE_URL="file:./dev.db"
```

### 3. Push Database Schema
Generate the SQLite database and tables using Prisma:
```bash
cd backend
npx prisma db push
npx prisma generate
```

### 4. Seed the Scenario Data
Populate the database with all scenario accounts, departments, categories, and pre-allocated items:
```bash
npx tsx prisma/seed.ts
```

### 5. Build and Launch
Compile the typescript code and start the local development server:
```bash
# Build frontend and backend
npm run build

# Start the application (runs on localhost:5000)
npm run start
```

Open your browser and navigate to **[http://localhost:5000](http://localhost:5000)** to explore!
