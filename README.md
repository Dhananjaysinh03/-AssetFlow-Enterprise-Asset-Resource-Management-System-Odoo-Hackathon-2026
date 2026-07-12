# AssetFlow - Enterprise Asset & Resource Management System

AssetFlow is a centralized ERP platform designed to track, allocate, and maintain physical assets (laptops, vehicles, machinery) and shared resources (conference rooms, project spaces) with robust conflict handling, role-based workflows, and state-machine transitions.

---

## 🏗️ Architecture & Core Components

- **Frontend**: Single-Page App (SPA) built with modern CSS (glassmorphism, dark mode) and Chart.js. Served statically from the `/public` directory.
- **Backend**: Express.js REST APIs in TypeScript compiled to ES Modules.
- **Database ORM**: Prisma ORM targeting SQLite (configured in `.env`). The full entity-relationship diagram and table structure are documented in [database_schema.md](file:///c:/Users/Dhananjaysinh/Desktop/Odoo/database_schema.md).
- **Validation**: Zod schema parsing.
- **Security**: JWT session tokens with bcryptjs password hashing.

---

## 🔒 Crucial Rules Enforced

### 1. Zero Double-Allocations (Exclusive Assets)
- **Constraint**: An asset (like a laptop or exclusive vehicle) can only be allocated to one entity (user or department) at a time.
- **Enforcement Code**: [allocations.ts:L30-58](file:///c:/Users/Dhananjaysinh/Desktop/Odoo/src/routes/allocations.ts#L30-L58).
- **Behavior**: If a user attempts to allocate a currently checked-out asset (e.g., Priya holds `AF-0114` and Raj tries to allocate it), the system blocks the transaction, returns a conflict alert indicating exactly who is holding it, and prompts the user to submit a **Transfer Request** instead.

### 2. Overlap Validation for Shared Resource Bookings
- **Constraint**: Bookable assets (like conference rooms or shared projectors) cannot have overlapping time slots.
- **Enforcement Code**: [bookings.ts:L46-77](file:///c:/Users/Dhananjaysinh/Desktop/Odoo/src/routes/bookings.ts#L46-L77).
- **Validation Logic**: Uses the condition `startTime < requestedEndTime` AND `requestedStartTime < endTime` against active bookings. 
- **Behavior**: If Room B2 is booked from 9:00 - 10:00, a request for 9:30 - 10:30 gets rejected automatically with details of the conflicting booking. A booking starting at 10:00 succeeds immediately.

### 3. Realistic Roles & Promotions (No Self-Elevating Signups)
- **Constraint**: Signups default exclusively to `Employee`. Role selection is blocked on registration.
- **Enforcement Code**: [auth.ts:L24-38](file:///c:/Users/Dhananjaysinh/Desktop/Odoo/src/routes/auth.ts#L24-L38).
- **Behavior**: The first user who registers is granted `Admin` privileges to bootstrap the organization. All subsequent signups default to `Employee`. The Admin can promote employees to `Asset Manager` or `Department Head` inside the Org Setup Employee Directory ([org.ts:L172-202](file:///c:/Users/Dhananjaysinh/Desktop/Odoo/src/routes/org.ts#L172-L202)).

---

## 🚀 How to Run & Verify

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Database Connection
Create a `.env` file in the root directory (you can copy `.env.example`):
```env
PORT=5000
JWT_SECRET=your-secret-key
DATABASE_URL="postgresql://username:password@localhost:5432/assetflow?schema=public"
```

### 3. Push Database Schema
Ensure your local PostgreSQL server is running, then push the tables:
```bash
npx prisma db push
```

### 4. Seed the Database
Populate the database with departments, category limits, employee directory, pre-registered assets, active allocations (e.g., Priya holding laptop `AF-0114`), ongoing bookings, and audit records:
```bash
npx prisma db seed
```

### 5. Build and Start Server
```bash
# Build the TypeScript files
npm run build

# Start the application
npm start
```

### 6. Visit the Dashboard
Open your web browser and navigate to:
```url
http://localhost:5000
```
- **Sign In Credentials (Pre-seeded)**:
  - **Admin**: `admin@assetflow.com` (password: `password123`)
  - **Asset Manager**: `manager@assetflow.com` (password: `password123`)
  - **Employee (Priya)**: `priya@assetflow.com` (password: `password123`)
  - **Employee (Raj)**: `raj@assetflow.com` (password: `password123`)
