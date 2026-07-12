# Database Schema Documentation

This document lists the tables, data types, relationships, and index keys configured in the **AssetFlow** database.

---

## 🗺️ Entity-Relationship Diagram

```mermaid
erDiagram
    users {
        string id PK
        string email UK
        string password_hash
        string name
        string role
        boolean is_active
        datetime deleted_at
        string department_id FK
        datetime created_at
        datetime updated_at
    }
    departments {
        string id PK
        string name UK
        boolean is_active
        datetime deleted_at
        string parent_department_id FK
        string manager_id UK
        datetime created_at
        datetime updated_at
    }
    asset_categories {
        string id PK
        string name UK
        string description
        string custom_fields
        datetime deleted_at
        datetime created_at
        datetime updated_at
    }
    assets {
        string id PK
        string name
        string category_id FK
        string asset_tag UK
        string serial_number
        datetime acquisition_date
        float acquisition_cost
        string condition
        string location
        boolean is_shared
        string status
        string photo_url
        string document_urls
        datetime deleted_at
        datetime created_at
        datetime updated_at
    }
    asset_allocations {
        string id PK
        string asset_id FK
        string user_id FK
        string department_id FK
        datetime allocated_date
        datetime expected_return_date
        datetime returned_date
        string checkin_notes
        boolean is_active
        datetime created_at
        datetime updated_at
    }
    transfer_requests {
        string id PK
        string allocation_id FK
        string requested_by_id FK
        string target_user_id
        string target_department_id
        string status
        string approved_by_id FK
        string notes
        datetime created_at
        datetime updated_at
    }
    resource_bookings {
        string id PK
        string asset_id FK
        string user_id FK
        datetime start_time
        datetime end_time
        string status
        string notes
        datetime created_at
        datetime updated_at
    }
    maintenance_requests {
        string id PK
        string asset_id FK
        string requester_id FK
        string issue_description
        string priority
        string status
        string assigned_to_id FK
        string photo_url
        string resolution_notes
        datetime created_at
        datetime updated_at
    }
    audit_cycles {
        string id PK
        string name
        datetime start_date
        datetime end_date
        boolean is_active
        boolean is_closed
        datetime created_at
        datetime updated_at
    }
    audit_records {
        string id PK
        string cycle_id FK
        string asset_id FK
        string status
        string notes
        datetime created_at
        datetime updated_at
    }

    departments ||--o{ users : "members"
    departments ||--o{ asset_allocations : "allocations"
    users ||--o{ asset_allocations : "allocations"
    users ||--o{ transfer_requests : "transfers"
    users ||--o{ resource_bookings : "bookings"
    users ||--o{ maintenance_requests : "maintenance"
    asset_categories ||--o{ assets : "assets"
    assets ||--o{ asset_allocations : "allocations"
    assets ||--o{ resource_bookings : "bookings"
    assets ||--o{ maintenance_requests : "maintenance"
    assets ||--o{ audit_records : "audit_records"
    audit_cycles ||--o{ audit_records : "records"
```

---

## 🗃️ Database Tables Definition

### 1. `users` Table
Tracks registered employees, roles, and department affiliations.
* **Indexes**: 
  - Index on `email` (for quick login/verification)
  - Index on `department_id`

### 2. `departments` Table
Tracks operational divisions and hierarchy lines.
* **Indexes**:
  - Index on `parent_department_id`

### 3. `asset_categories` Table
Stores structural rules and default custom specifications per category.

### 4. `assets` Table
Master inventory log of physical and bookable assets.
* **Indexes**:
  - Index on `category_id`
  - Index on `status` (Available, Allocated, etc.)
  - Index on `asset_tag` (AF-XXXX)

### 5. `asset_allocations` Table
Tracks active ownership checkouts.
* **Indexes**:
  - Index on `asset_id`
  - Index on `user_id`
  - Index on `department_id`
  - Index on `is_active`

### 6. `transfer_requests` Table
Tracks handovers.
* **Indexes**:
  - Index on `allocation_id`
  - Index on `requested_by_id`
  - Index on `status`

### 7. `resource_bookings` Table
Schedules shared space reservations.
* **Indexes**:
  - Index on `asset_id`
  - Index on `user_id`
  - Compound Index on `[start_time, end_time]` (for collision verification queries)

### 8. `maintenance_requests` Table
Repairs pipeline logs.
* **Indexes**:
  - Index on `asset_id`
  - Index on `requester_id`
  - Index on `status`

### 9. `audit_cycles` Table
Checks inventory.

### 10. `audit_records` Table
Auditor checklist items.
* **Indexes**:
  - Index on `cycle_id`
  - Index on `asset_id`
