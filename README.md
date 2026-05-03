# Audit & Compliance Management System

A multi-tenant application for real estate financial auditing.

## Tech Stack
- **Backend:** Spring Boot, Java 17, PostgreSQL, JPA/Hibernate
- **Frontend:** React, Axios, Tailwind CSS
- **AI Service:** Python, Flask, Scikit-learn
- **Security:** JWT (JSON Web Token)
- **Storage:** Local File System (for audit evidence)

## Project Structure
- `backend/`: Spring Boot application source code.
- `frontend/`: React application source code.
- `ai-service/`: Python Flask service for AI functionalities.
- `uploads/`: Local directory for stored evidence documents (organized by organization_id).

## Setup Instructions

### 1. Database Setup
1. Ensure PostgreSQL is running.
2. Create a database named `audit_db`.
3. Update `backend/src/main/resources/application.properties` with your credentials.

### 2. Run Backend
```bash
cd backend
mvn spring-boot:run
```

### 3. Run AI Service
```bash
cd ai-service
pip install -r requirements.txt
python app.py
```

### 4. Run Frontend
```bash
cd frontend
npm install
npm start
```

## Features Implemented
- **Multi-Tenancy:** Full data isolation using `organization_id`.
- **RBAC:** Roles for Admin, Finance, Auditor, and Viewer.
- **Workflow:** 
  - Organization Registration & Admin Setup.
  - Project & Category Configuration.
  - Transaction Import via CSV.
  - Evidence Document Uploads.
  - Audit Findings Lifecycle.
  - Audit Readiness Dashboard.

## Business Rules
- Transactions require checklist completion before being audit-ready.
- Role-based restrictions prevent unauthorized evidence modification.
- Full audit trail maintained via JPA Auditing.
