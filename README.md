# IT Faculty Comlab Scheduler

A web-based scheduling system for managing curriculum semesters, teachers, subjects, sections, computer labs, and class schedules.

**Repository:** [https://github.com/Edvir04/Faculty-Sched.git](https://github.com/Edvir04/Faculty-Sched.git)

## Tech Stack

- **Backend:** Laravel 12 (PHP 8.2+)
- **Frontend:** React + Inertia.js + TypeScript
- **Build Tool:** Vite
- **UI:** Tailwind CSS + Radix/Shadcn components
- **Database:** MySQL (default local setup in `.env.example`)
- **Testing:** PHPUnit

---

## Features

- Curriculum semester management (activate semester, default curriculum options)
- Teacher management with duplicate validation
- Subject management with duplicate validation
- Section and Comlab management with delete previews
- Schedule creation/editing with conflict checks
- Print/export schedule support
- Flash toast notifications
- Automated linting and test workflows via GitHub Actions

---

## Requirements

- PHP **8.2+**
- Composer **2+**
- Node.js **18+** (recommended: 20+)
- npm
- MySQL / MariaDB

---

## Setup and Run (Dependencies Included)

### 1) Clone the repository

```bash
git clone https://github.com/Edvir04/Faculty-Sched.git
cd Faculty-Sched
```

### 2) Install PHP dependencies

```bash
composer install
```

### 3) Install Node dependencies

```bash
npm install
```

### 4) Create environment file

```bash
cp .env.example .env
```

PowerShell alternative:

```powershell
Copy-Item .env.example .env
```

### 5) Generate application key

```bash
php artisan key:generate
```

### 6) Configure database in `.env`

Set these values based on your local MySQL setup:

```env
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=faculty_sched
DB_USERNAME=root
DB_PASSWORD=
```

### 7) Run migrations

```bash
php artisan migrate
```

### 8) Build frontend assets (for non-development use)

```bash
npm run build
```

### 9) Start the application server

```bash
php artisan serve
```

### 10) Open in browser

`http://localhost:8000`

## Useful Commands

### Run all tests

```bash
php artisan test
```

### Run frontend lint

```bash
npm run lint
```

### Format frontend code

```bash
npm run format
```

### Build frontend assets

```bash
npm run build
```

### Run in LAN mode (optional)

```bash
composer run dev:lan
```

For LAN mode, set `VITE_DEV_HOST` in `.env` to your machine's IPv4 and allow ports `8000` and `5173` in Windows Firewall.

