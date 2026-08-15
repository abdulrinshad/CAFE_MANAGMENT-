# Cafe Manager — POS System

A browser-based point-of-sale system for cafés. Owners manage menus and tables; waiters take orders and process payments; customers scan a QR code to view the digital menu.

---

## How It Works

1. Owner sets up categories, menu items, and tables.
2. Waiter logs in, creates an order for a table, and adds items.
3. Order moves through: **Pending → Preparing → Ready → Completed**.
4. Waiter generates a bill (invoice with 5% GST) and optionally sends it to the customer via WhatsApp.
5. Payment is recorded and the table is freed.
6. Owner views live dashboard stats and sales reports.

---

## User Roles

| Role | Access |
|---|---|
| Admin | Everything — menu, orders, tables, waiters, reports, settings |
| Manager | Same as Admin, except waiter management |
| Waiter | Dashboard, orders, tables, requests |
| Customer | Public digital menu (no login, QR scan only) |

Waiters log in with a name and PIN. Admins/Managers log in with email and password.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, React Router 7, Vite 8 |
| Backend | Python, Django 6.0.6, Django REST Framework |
| Auth | JWT (djangorestframework-simplejwt) |
| Database | PostgreSQL |
| Other | django-cors-headers, Pillow, qrcode, python-dotenv |

---

## Requirements

- Python 3.10+
- Node.js 18+
- PostgreSQL 14+

---

## Local Setup

### 1. Clone the project

```bash
git clone <repository-url> Cafe_manager
cd Cafe_manager
```

### 2. Create the database

Open `psql` and run:

```sql
CREATE DATABASE cafe_manager_db;
```

### 3. Set up the backend

```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\activate
# macOS / Linux
source venv/bin/activate

pip install -r requirements.txt
```

### 4. Configure environment variables

```bash
# Windows
copy .env.example .env
# macOS / Linux
cp .env.example .env
```

Edit `backend/.env`:

```env
SECRET_KEY=any-long-random-string
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1

DB_NAME=cafe_manager_db
DB_USER=postgres
DB_PASSWORD=your_postgres_password
DB_HOST=localhost
DB_PORT=5432

CORS_ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
```

### 5. Run migrations and create admin account

```bash
python manage.py migrate
python manage.py createsuperuser
```

### 6. Start the backend

```bash
python manage.py runserver
```

Backend runs at `http://127.0.0.1:8000`.

### 7. Set up and start the frontend

Open a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at `http://localhost:5173`.

---

## URLs

| URL | Purpose |
|---|---|
| `http://localhost:5173` | Application (login page) |
| `http://localhost:5173/dashboard` | Dashboard |
| `http://127.0.0.1:8000/admin/` | Django admin panel |
| `http://127.0.0.1:8000/api/v1/` | REST API (browsable) |

---

## Project Structure

```
Cafe_manager/
├── backend/
│   ├── accounts/        # Auth, user roles, waiter management
│   ├── menu/            # Categories, products, tables, QR codes
│   ├── orders/          # Orders, invoices, payments
│   ├── notifications/   # System notifications
│   ├── config/          # Django settings and URL routing
│   ├── manage.py
│   ├── requirements.txt
│   └── .env.example
│
└── frontend/
    ├── src/
    │   ├── pages/       # One file per screen
    │   ├── components/  # Shared UI components
    │   ├── context/     # Global app state (AppContext)
    │   └── api.js       # All API calls to Django
    ├── package.json
    └── vite.config.js   # Proxies /api to Django on port 8000
```

---

## Database Tables

| Table | Stores |
|---|---|
| `auth_user` | Admin/Manager accounts |
| `accounts_userprofile` | Role per user |
| `accounts_waiter` | Waiter name, section, PIN |
| `menu_category` | Menu categories |
| `menu_product` | Menu items, prices, images |
| `menu_table` | Dining tables and status |
| `menu_qrcode` | QR code per table |
| `menu_waiterrequest` | Customer/staff requests |
| `orders_order` | Order header and status |
| `orders_orderitem` | Items within an order |
| `orders_invoice` | Generated bill per order |
| `orders_payment` | Payment record per order |
| `notifications_notification` | System notifications |

---

## Troubleshooting

**PostgreSQL connection error**
Check that PostgreSQL is running and that `DB_*` values in `.env` are correct. Confirm the database exists (`\l` in psql).

**`SECRET_KEY` error on startup**
`backend/.env` is missing or does not contain `SECRET_KEY`. The file must be inside the `backend/` folder.

**Migration error — column does not exist**
Run `python manage.py migrate` to apply any unapplied migrations.

**Frontend cannot reach backend**
Confirm Django is running on port 8000. Check `CORS_ALLOWED_ORIGINS` in `.env` includes `http://localhost:5173`.

**Port already in use**
Django: `python manage.py runserver 8001` (and update `vite.config.js` target).
Vite: it picks the next available port automatically.

**401 Unauthorized**
Session expired. Log out and log in again.

---

## Important Notes

- Both servers must run at the same time. Use two terminal windows.
- The `.env` file is not committed to version control. Never share it.
- Waiter accounts are created by the Admin in the **Waiters** page before they can log in.
- WhatsApp bill sending opens WhatsApp Web — the waiter clicks Send manually.
- Media files (images, QR codes) are stored in `backend/media/` and are not committed to version control.
- The time zone is set to `Asia/Kolkata` (IST) in `backend/config/settings.py`.
