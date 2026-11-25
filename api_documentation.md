# HRIS EasyGo – API Documentation (v1)

> Generated on 2026‑11‑25

---

## Base URL
```
http://localhost:3000/api/v1
```
(When deployed to Vercel replace `localhost:3000` with your Vercel domain.)

All responses are JSON and follow the shape:
```json
{ "success": true, "data": <payload> }
```
On error the object contains `success: false` and an `error` field.

All protected routes require an **Authorization** header:
```
Authorization: Bearer <JWT token>
```
The token is obtained via the **Login** endpoint.

---

## Authentication
| Method | Endpoint | Description | Request Body | Response |
|--------|----------|-------------|--------------|----------|
| **POST** | `/auth/login` | Verify user credentials and return a JWT. | ```json { "email": "user@example.com", "password": "••••••" } ``` | ```json { "success": true, "data": { "token": "<jwt>", "expiresIn": 3600 } } ``` |
| **POST** | `/auth/logout` *(optional)* | Invalidate the current token (handled client‑side). | — | ```json { "success": true, "data": { "message": "Logged out" } } ``` |

---

## User Profile
| Method | Endpoint | Description | Request | Response |
|--------|----------|-------------|---------|----------|
| **GET** | `/me` | Returns the authenticated employee profile, roles and permissions. | — | ```json { "success": true, "data": { "id": 12, "name": "Alice Example", "email": "alice@example.com", "roles": ["HR_MANAGER"], "permissions": ["EMPLOYEE_READ", "EMPLOYEE_WRITE"] } } ``` |

---

## Health Check
| Method | Endpoint | Description |
|--------|----------|-------------|
| **GET** | `/health` | Simple ping that verifies DB connectivity. |

Response example:
```json
{ "success": true, "data": { "status": "ok", "database": "connected" } }
```
---

## Employees
| Method | Endpoint | Description | Request Body | Response |
|--------|----------|-------------|--------------|----------|
| **GET** | `/employees` | List all employees (paginated). Supports query params `?page=` and `?search=`. | — | ```json { "success": true, "data": { "employees": [ {"id":1,"name":"Bob"}, … ], "total": 124 } } ``` |
| **GET** | `/employees/:id` | Get detailed data for a single employee. | — | ```json { "success": true, "data": { "id": 3, "name": "Carol", "email": "c@example.com", "position": "Analyst", "photoUrl": "https://..." } } ``` |
| **POST** | `/employees` | Create a new employee (admin only). | ```json { "name": "John", "email": "john@example.com", "positionId": 5, "unitId": 2 } ``` | ```json { "success": true, "data": { "id": 57 } } ``` |
| **PUT** | `/employees/:id` | Update employee fields. | ```json { "name": "John Doe" } ``` | ```json { "success": true, "data": { "updated": true } } ``` |
| **DELETE** | `/employees/:id` | Soft‑delete (sets `is_active = false`). | — | ```json { "success": true, "data": { "deleted": true } } ``` |

---

## Master Data (CRUD for lookup tables)
All master‑data entities share the same pattern. Replace `{entity}` with one of:
`directorates`, `departments`, `units`, `grades`, `positions`, `work_schedules`, `contract_types`, `employment_statuses`, `leave_types`, `users`, `roles`, `permissions`, `banks`, `payment_methods`, `expense_items`, `document_types`, `cities`, `loan_purposes`, `candidate_sources`, `approval_flows`.

| Method | Endpoint | Description | Request Body | Response |
|--------|----------|-------------|--------------|----------|
| **GET** | `/{entity}` | List all rows (supports pagination & search). | — | `{ "success": true, "data": { "items": [ … ], "total": N } }`
| **GET** | `/{entity}/:id` | Retrieve a single row. | — | `{ "success": true, "data": { … } }`
| **POST** | `/{entity}` | Create a new row (admin only). | Entity‑specific JSON payload. | `{ "success": true, "data": { "id": <newId> } }`
| **PUT** | `/{entity}/:id` | Update an existing row. | Partial JSON payload. | `{ "success": true, "data": { "updated": true } }`
| **DELETE** | `/{entity}/:id` | Delete row (hard delete unless foreign‑key prevents). | — | `{ "success": true, "data": { "deleted": true } }`

All create/update endpoints validate required fields; validation errors return `400` with `error` details.

---

## Requests (Leave, Overtime, etc.)
| Method | Endpoint | Description | Request Body | Response |
|--------|----------|-------------|--------------|----------|
| **POST** | `/requests` | Submit a new request (leave, overtime, loan, etc.). The payload must contain `type` (`"leave"`, `"overtime"`, …) and type‑specific fields. | ```json { "type": "leave", "employeeId": 12, "startDate": "2026-12-01", "endDate": "2026-12-05", "reason": "Vacation" } ``` | `{ "success": true, "data": { "requestId": 87 } }` |
| **GET** | `/requests/:id` | Retrieve request details and current approval status. | — | `{ "success": true, "data": { "id":87, "status":"PENDING", "steps": [ {"approverId":3,"status":"PENDING"}, … ] } }` |
| **PUT** | `/requests/:id/decision` | Approver decides (`APPROVE` / `REJECT`). | ```json { "decision": "APPROVE", "comment": "OK" } ``` | `{ "success": true, "data": { "updated": true } }` |

The backend automatically checks for overlapping leave, validates overtime duration, and ensures **anti‑self‑approval** rules.

---

## Attendance (Clock‑in / Clock‑out)
| Method | Endpoint | Description | Request Body | Response |
|--------|----------|-------------|--------------|----------|
| **POST** | `/attendance/clock-in` | Record a clock‑in event. Includes optional `latitude`/`longitude` for geofence validation. | ```json { "employeeId": 12, "timestamp": "2026-11-24T08:03:00Z", "lat": -6.200000, "lon": 106.816666 } ``` | `{ "success": true, "data": { "clockInId": 45, "valid": true } }` |
| **POST** | `/attendance/clock-out` | Record a clock‑out event. | Same shape as clock‑in. | `{ "success": true, "data": { "clockOutId": 46, "durationHours": 8.5 } }` |

Geofence is enforced (default radius 100 m around office coordinates). If outside, the response includes `valid: false` and a warning message.

---

## Payroll Engine
| Method | Endpoint | Description | Request Body | Response |
|--------|----------|-------------|--------------|----------|
| **POST** | `/payroll/run` | Trigger payroll calculation for a given period (e.g., `2026-11`). Returns a batch ID. | ```json { "period": "2026-11" } ``` | `{ "success": true, "data": { "batchId": "pay_2026_11_01" } }` |
| **GET** | `/payroll/results/:batchId` | Retrieve payroll results for the batch – employee payslips, journal entries, tax summary. | — | `{ "success": true, "data": { "payroll": [ {"employeeId":12,"gross":5000000,"net":4250000,…}, … ], "taxSummary": { … } } }` |
| **POST** | `/payroll/golden-tests` | Executes the 10 regulatory “golden” scenarios (used by CI). Returns a summary of pass/fail. | — | `{ "success": true, "data": { "passed": 10, "failed": 0, "details": [ … ] } }` |
| **POST** | `/payroll/december-reconciliation` | Runs the PPh 21 Pasal 17 year‑end reconciliation for the current year. | — | `{ "success": true, "data": { "reconciled": true, "taxDue": 123456 } }` |

All payroll endpoints are protected by the `payroll` permission; only users with the role **Payroll Operator** may invoke them.

---

## Error Handling
- **400 Bad Request** – validation failure; response contains `error` with field‑specific messages.
- **401 Unauthorized** – missing or invalid JWT.
- **403 Forbidden** – authenticated but lacking required permission/role.
- **404 Not Found** – resource does not exist.
- **500 Internal Server Error** – unexpected server condition; logs are written to Neon MCP.

Error response example:
```json
{ "success": false, "error": { "code": 400, "message": "Leave dates overlap with existing request", "details": { "conflictId": 23 } } }
```
---

## Versioning & Change Log
| Version | Date | Changes |
|---------|------|---------|
| **v1.0** | 2026‑11‑24 | Initial public API covering auth, health, employees, master data, requests, attendance, payroll. |
| **v1.1** (planned) | 2026‑12‑01 | Replace base64 photo storage with Neon Object Storage; move geofence logic to Neon Functions. |

---

*Generated by Antigravity AI.  For any missing endpoint or clarification, feel free to ask!*