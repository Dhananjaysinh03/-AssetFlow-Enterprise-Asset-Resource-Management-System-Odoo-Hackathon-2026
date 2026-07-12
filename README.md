# 🏢 AssetFlow — Enterprise Asset & Resource Management System

> A centralized ERP platform for managing enterprise assets, shared resources, maintenance, inventory audits, and organizational operations.

![React](https://img.shields.io/badge/Frontend-React-blue)
![Node.js](https://img.shields.io/badge/Backend-Node.js-green)
![Express](https://img.shields.io/badge/Framework-Express-black)
![TypeScript](https://img.shields.io/badge/Language-TypeScript-blue)
![Prisma](https://img.shields.io/badge/ORM-Prisma-2D3748)
![SQLite](https://img.shields.io/badge/Database-SQLite-003B57)
![JWT](https://img.shields.io/badge/Auth-JWT-orange)

---

# 📖 Overview

Modern organizations manage hundreds of physical assets such as laptops, monitors, vehicles, projectors, meeting rooms, networking equipment, and office furniture.

Traditional spreadsheet-based tracking often leads to:

- Duplicate asset allocation
- Booking conflicts
- Poor maintenance tracking
- Missing inventory
- Lack of accountability
- No centralized reporting

**AssetFlow** solves these challenges through a centralized role-based ERP platform that manages the complete lifecycle of enterprise assets—from registration to allocation, maintenance, auditing, reporting, and activity tracking.

---

# 🚀 Key Features

## 🔐 Authentication & Role Management

- JWT Authentication
- Secure password hashing using bcrypt
- Role-Based Access Control (RBAC)

Supported Roles

- Administrator
- Asset Manager
- Department Head
- Employee

Each role automatically receives an interface tailored to its permissions.

---

## 🏢 Organization Management

Configure organizational master data including:

- Departments
- Asset Categories
- Employee Directory
- Department Hierarchy

This serves as the foundation for all asset operations.

---

## 💻 Asset Directory

Maintain a centralized inventory of company assets.

Features include:

- Asset Registration
- Asset Categories
- QR Code Identification
- Department Assignment
- Asset Condition Tracking
- Acquisition Details
- Search & Filtering

Supported Asset Types:

- Laptops
- Monitors
- Furniture
- Vehicles
- Servers
- Meeting Rooms
- Projectors
- Shared Equipment

---

## 👥 Asset Allocation

Assign organizational assets to employees.

Features

- Employee Allocation
- Expected Return Dates
- Active Allocation Tracking
- Overdue Asset Detection
- Asset Return Workflow

### Business Rule

An asset can only be allocated to **one employee at a time**.

Duplicate allocations are automatically rejected by the backend.

---

## 📅 Resource Booking

Book shared organizational resources such as:

- Meeting Rooms
- Conference Halls
- Company Vehicles
- Projectors

Features

- Time Slot Booking
- Existing Booking Timeline
- Booking History
- Automatic Conflict Detection

### Business Rule

Overlapping bookings are automatically rejected.

---

## 🔧 Maintenance Management

Track the complete repair lifecycle.

Workflow

Pending

⬇

Approved

⬇

Technician Assigned

⬇

In Progress

⬇

Resolved

Features

- Raise Repair Requests
- Priority Levels
- Technician Assignment
- Repair Tracking
- Resolution History

---

## 📋 Inventory Audit

Verify physical inventory against digital records.

Features

- Audit Cycles
- Verification Progress
- Missing Asset Detection
- Damaged Asset Reporting
- Audit Notes
- Completion Reports

Verification Status

- ✅ Verified
- ❌ Missing
- ⚠ Damaged

---

## 📊 Reports & Analytics

Real-time dashboards provide operational insights.

Available Reports

- Asset Allocation Distribution
- Department Utilization
- Maintenance Statistics
- Booking Analytics
- Most Frequently Booked Resources
- Live KPIs

---

## 🔔 Activity Logs & Notifications

Every system action is recorded.

Examples

- Login Activity
- Department Creation
- Asset Registration
- Allocation History
- Audit Events
- Maintenance Updates

This improves transparency and accountability.

---

# ⚙ Business Rules

## 1. Duplicate Allocation Prevention

Only one employee may hold an asset at any given time.

If an allocated asset is selected again, the backend returns:

```
409 Conflict
```

---

## 2. Booking Conflict Detection

Bookings cannot overlap.

Example

Existing Booking

```
09:00 AM → 10:30 AM
```

Requested Booking

```
10:00 AM → 11:00 AM
```

Result

```
Booking Rejected
```

---

## 3. Role-Based Permissions

| Role | Permissions |
|-------|------------|
| Admin | Full System Access |
| Asset Manager | Assets, Maintenance, Audits |
| Department Head | Department Assets & Transfers |
| Employee | Book Resources, Raise Repairs |

---

# 🏗 System Architecture

```
                React Frontend
                      │
                      │ REST API
                      ▼
        Node.js + Express + TypeScript
                      │
              Prisma ORM
                      │
                  SQLite Database
```

---

# 💻 Tech Stack

## Frontend

- React
- Vite
- TypeScript
- Vanilla CSS
- Responsive Design

## Backend

- Node.js
- Express.js
- TypeScript

## Database

- SQLite
- Prisma ORM

## Authentication

- JWT
- bcryptjs

## Validation

- Zod

---

# 📂 Project Structure

```
AssetFlow/

│
├── frontend/
│   ├── src/
│   ├── pages/
│   ├── components/
│   └── styles/
│
├── backend/
│   ├── prisma/
│   ├── routes/
│   ├── middleware/
│   ├── controllers/
│   ├── services/
│   └── utils/
│
└── README.md
```

---

# 👥 Demo Accounts

Default Password

```
Admin@1234
```

| Email | Role |
|--------|------|
| admin@assetflow.com | Administrator |
| manager@assetflow.com | Asset Manager |
| head.eng@assetflow.com | Department Head |
| priya@assetflow.com | Employee |

---

# 🚀 Installation

## 1. Install Dependencies

```bash
npm install
```

---

## 2. Configure Environment

Create

```
backend/.env
```

```env
PORT=5000

JWT_SECRET=super-secret-key

DATABASE_URL="file:./dev.db"
```

---

## 3. Create Database

```bash
cd backend

npx prisma generate

npx prisma db push
```

---

## 4. Seed Demo Data

```bash
npx tsx prisma/seed.ts
```

---

## 5. Build Project

```bash
npm run build
```

---

## 6. Start Server

```bash
npm run start
```

Open

```
http://localhost:5000
```

---

# 🎯 Business Impact

AssetFlow enables organizations to:

- Eliminate spreadsheet-based asset tracking
- Prevent duplicate asset allocation
- Avoid booking conflicts
- Improve maintenance visibility
- Conduct structured inventory audits
- Monitor asset utilization using real-time dashboards
- Increase operational transparency with audit logs

---

# 🌟 Future Enhancements

- Barcode & QR Scanner Integration
- Email Notifications
- Mobile Application
- Asset Depreciation Tracking
- Vendor Management
- Purchase Order Integration
- Multi-Branch Support
- Cloud Deployment
- AI-Based Maintenance Prediction

---

# 👨‍💻 Developed For

**Odoo Hackathon**

Enterprise Asset & Resource Management Challenge

Built with ❤️ using React, Node.js, TypeScript, Prisma, and SQLite.
