# DEPMS REST API Documentation

**Base URL:** `https://your-domain.com/api/v1`  
**Auth:** JWT via httpOnly cookie (set on login). All endpoints except `/auth/login` require authentication.

---

## Authentication

### POST /auth/login
Login and receive JWT cookies.
```json
// Request
{ "email": "admin@company.com", "password": "Admin@123" }

// Response 200
{
  "success": true,
  "data": {
    "id": "uuid",
    "full_name": "System Admin",
    "email": "admin@company.com",
    "employee_code": "EMP001",
    "role": "admin",
    "team_id": "uuid"
  }
}
```

### POST /auth/logout
Invalidates current token (blacklists in Redis).

### POST /auth/refresh
Refreshes access token using refresh cookie.

### GET /auth/me
Returns currently authenticated user.

### PUT /auth/change-password
```json
{ "current_password": "old", "new_password": "newMin8Chars" }
```

---

## Dashboard

### GET /dashboard/employee
Employee's personal widgets, today's entry, 7-day trend.  
**Role:** employee

### GET /dashboard/leader
Team summary, member-wise performance, week trend.  
**Role:** team_leader

### GET /dashboard/admin
Org-wide widgets, team performance, 6-month trend, leaderboard.  
**Role:** admin

---

## Daily Entries

### GET /entries/today
Get or auto-create today's entry with stats.

### PATCH /entries/first-half
Update first half count (before lunch).
```json
{ "count": 45, "half_day_count": 0 }
```

### PATCH /entries/second-half
Update second half count (after lunch).
```json
{ "count": 38 }
```

### POST /entries/submit
Lock end-of-day submission.
```json
{ "notes": "Completed all assigned records." }
```

### GET /entries/history?from=2024-01-01&to=2024-01-31
Paginated entry history for the current user.

### GET /entries/today/:userId
Get a specific user's today entry.  
**Role:** admin, team_leader

### GET /entries/history/:userId
Get a specific user's entry history.  
**Role:** admin, team_leader

---

## Targets

### GET /targets?year=2024&month=1&user_id=uuid&team_id=uuid
List targets. Employees see only their own.

### POST /targets
Create individual target.  
**Role:** admin
```json
{
  "user_id": "uuid",
  "team_id": "uuid",
  "year": 2024,
  "month": 1,
  "monthly_target": 2000,
  "working_days": 26
}
```
Daily target is auto-calculated: `ceil(monthly_target / working_days)`

### POST /targets/bulk-team
Assign same target to all active team members.  
**Role:** admin
```json
{
  "team_id": "uuid",
  "year": 2024,
  "month": 1,
  "monthly_target": 2000
}
```

### PUT /targets/:id
Update target (recalculates daily target).  
**Role:** admin

### GET /targets/progress/:userId?year=2024&month=1
Remaining target, required daily average, achievement %.

---

## Users

### GET /users?search=john&role=employee&team_id=uuid&page=1&limit=20
List all users.  
**Role:** admin, team_leader (leaders see their team only)

### POST /users
Create employee.  
**Role:** admin
```json
{
  "employee_code": "EMP042",
  "full_name": "Jane Smith",
  "email": "jane@company.com",
  "password": "SecurePass@123",
  "role": "employee",
  "team_id": "uuid"
}
```

### PUT /users/:id
Update user (name, email, team, role, is_active).  
**Role:** admin

### DELETE /users/:id
Soft-deactivate user.  
**Role:** admin

### POST /users/:id/reset-password
```json
{ "new_password": "NewSecurePass@123" }
```
**Role:** admin

---

## Teams

### GET /teams
List all teams with leader and member count.

### POST /teams
Create team.  
**Role:** admin
```json
{ "name": "Data Team A", "description": "...", "leader_id": "uuid" }
```

### POST /teams/:id/assign
Assign employee to team.  
**Role:** admin
```json
{ "user_id": "uuid" }
```

---

## Reports

### GET /reports/daily?date=2024-01-15&team_id=uuid
Daily report for a date.

### GET /reports/monthly?year=2024&month=1&team_id=uuid
Monthly aggregated report per employee with achievement %.

### GET /reports/export/excel?year=2024&month=1&team_id=uuid
Download .xlsx file.  
**Role:** admin, team_leader

### GET /reports/export/pdf?year=2024&month=1
Download .pdf file.  
**Role:** admin, team_leader

---

## Notifications

### GET /notifications
Last 50 notifications for current user.

### PATCH /notifications/:id/read
Mark one notification as read.

### PATCH /notifications/read-all
Mark all as read.

---

## Audit Logs

### GET /audit-logs?action=LOGIN&from=2024-01-01&to=2024-01-31&page=1&limit=50
Paginated audit log.  
**Role:** admin

---

## Error Responses

All errors follow:
```json
{
  "success": false,
  "message": "Human-readable error message"
}
```

| Code | Meaning |
|------|---------|
| 400 | Bad request / validation error |
| 401 | Unauthenticated |
| 403 | Forbidden (wrong role) |
| 404 | Resource not found |
| 409 | Conflict (duplicate) |
| 422 | Validation failed |
| 429 | Rate limit exceeded |
| 500 | Internal server error |
