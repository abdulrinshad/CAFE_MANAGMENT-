# Cafe Management System (POS & Digital Menu)

A comprehensive, multi-branch Cafe Management and Point-of-Sale (POS) System. The platform features role-based access for Owners, Branch Managers, Cashiers, and Waiters, alongside a public self-service digital menu for Customers accessed via table-specific QR codes.

---

## 🏛️ System Architecture & Roles

The system is designed for multi-branch operations, allowing isolated administration for branch managers while giving owners/admins global oversight.

| Role | Access & Key Responsibilities |
| :--- | :--- |
| **Owner / Admin** | Global control over all branches. Manages global menus, system-wide staff (Branch Managers, Cashiers, Waiters, Kitchen Staff), branch configurations, global billing, inventory, corporate expenses, and consolidated analytics. |
| **Branch Manager** | Operational lead for a specific branch. Manages branch-level staff, POS terminal setups, tables, localized menu availability, active inventory, local expenses, and branch-specific reports. |
| **Cashier** | Operates the POS Dashboard to process Dine-In, Takeaway, and Online orders. Generates invoices, records payments (Cash, Card, UPI), prints/shares receipts via WhatsApp, and handles table bill requests. |
| **Waiter** | Table-side assistance. Manages tables, logs new orders, adds items to active orders, tracks preparation status, and responds to real-time customer service requests. |
| **Customer** | Self-service dining. Scans a physical table QR code to view the live digital menu (supports dietary filters like Vegan, Gluten-Free, etc.) and submits service requests (e.g., Call Waiter, Refill, Bill Request). |

---

## ✨ Key Features

- **Multi-Branch Operations**: Complete isolation of data (orders, staff, tables, inventory) per branch with centralized owner controls.
- **Dynamic POS Interface**: Quick-action order placement, category browsing, and order customizer designed for cashiers and POS desk terminals.
- **Real-time Table Management**: Live table status tracking (Available, Occupied, Bill Requested, Needs Attention) with seats and current bill amounts.
- **QR Code Digital Menu**: Automatic QR code image generation for newly created dining tables, pointing directly to a secure, public digital menu URL.
- **Service Request Panel**: Seamless messaging system where customer requests (Call Waiter, Refill, Bill) appear instantly on the Waiter and Cashier dashboards.
- **Inventory & Expenses Tracker**: Track stock levels, cost, minimum stock warnings, and log operational expenses (Rent, Utilities, Supplies) per branch.
- **Analytics & Reporting**: Live sales statistics, transaction history, charts, payment method distribution, and exportable reports.

---

## 💻 Tech Stack

### Backend
- **Core Framework**: [Django 6.0.6](https://docs.djangoproject.com/)
- **API Engine**: [Django REST Framework 3.17.1](https://www.django-rest-framework.org/)
- **Authentication**: JWT Auth via [djangorestframework-simplejwt 5.3.1](https://django-rest-framework-simplejwt.readthedocs.io/)
- **Database**: [PostgreSQL](https://www.postgresql.org/) (via `psycopg2-binary`)
- **Key Packages**: `qrcode` (for automatic table menu QR code generation), `Pillow` (for product and waiter photos), `python-dotenv` (for settings environment configuration).

### Frontend
- **Framework**: [React 19](https://react.dev/) (bundled with [Vite 8](https://vite.dev/))
- **Routing**: [React Router 7](https://reactrouter.com/)
- **Styles**: Custom Vanilla CSS with responsive design patterns, modular variables, and modern dark aesthetics.

---

## 📂 Project Structure

```
cafe_management/
├── backend/
│   ├── accounts/        # Branch, Manager, UserProfile, Waiter, Cashier, KitchenStaff models & auth views
│   ├── menu/            # Category, Product, Table, QRCode, WaiterRequest, Inventory models
│   ├── orders/          # Order, OrderItem, Invoice, Payment, Expense models & financial logic
│   ├── notifications/   # System notifications & alerts
│   ├── config/          # Django core settings (Asia/Kolkata timezone, media configurations) & routing
│   ├── manage.py
│   ├── requirements.txt
│   └── .env.example
│
└── frontend/
    ├── src/
    │   ├── pages/       # Portal pages (owner dashboard, cashier POS, waiter tables, customer menu)
    │   ├── components/  # Reusable UI elements (charts, tables, cards, payment forms)
    │   ├── context/     # AppContext for shared global states, API integrations, and auth sessions
    │   ├── api.js       # Centralized Axios wrapper targeting the Django REST endpoints
    │   └── App.jsx      # Router configuration and Role-based Route Protection
    ├── package.json
    └── vite.config.js   # Vite config with API proxy mappings to port 8000
```

---

## ⚙️ Local Setup and Installation

### Prerequisites
- **Python** 3.10+
- **Node.js** 18+
- **PostgreSQL** 14+

---

### Step 1: Database Setup
Create a PostgreSQL database on your local server:
```sql
CREATE DATABASE cafe_manager_db;
```

---

### Step 2: Backend Configuration & Run

1. Navigate to the backend directory and set up a virtual environment:
   ```bash
   cd backend
   python -m venv venv
   ```
2. Activate the virtual environment:
   - **Windows (CMD/PowerShell)**:
     ```powershell
     venv\Scripts\activate
     ```
   - **macOS / Linux**:
     ```bash
     source venv/bin/activate
     ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Configure environment variables:
   ```bash
   copy .env.example .env   # Windows
   cp .env.example .env     # macOS / Linux
   ```
   Open `backend/.env` and update the database credentials to match your local setup:
   ```env
   SECRET_KEY=your_secure_random_secret_key
   DEBUG=True
   ALLOWED_HOSTS=localhost,127.0.0.1
   DB_NAME=cafe_manager_db
   DB_USER=postgres
   DB_PASSWORD=your_postgres_password
   DB_HOST=127.0.0.1
   DB_PORT=5432
   CORS_ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
   ```
5. Apply database migrations and load sample seed data (if applicable):
   ```bash
   python manage.py migrate
   python manage.py createsuperuser
   ```
6. Run the server:
   ```bash
   python manage.py runserver
   ```
   The backend API will run at `http://127.0.0.1:8000`.

---

### Step 3: Frontend Configuration & Run

1. Open a new terminal and navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install package dependencies:
   ```bash
   npm install
   ```
3. Start the Vite development server:
   ```bash
   npm run dev
   ```
   The frontend application will be accessible at `http://localhost:5173`.

---

## 🔗 Key Endpoints & Routing

- **Frontend Login**: `http://localhost:5173/login`
- **Customer Menu**: `http://localhost:5173/customer/menu?table=<Table_Name>`
- **API Browsable root**: `http://127.0.0.1:8000/api/v1/`
- **Django Admin panel**: `http://127.0.0.1:8000/admin/`

---

## ⚠️ Important Implementation Notes

- **Timezone Settings**: The system records timestamps in the `Asia/Kolkata` (IST) zone (`backend/config/settings.py`).
- **GST / Tax Snapshots**: Orders utilize a standard 5% tax configuration. During order completion, prices and tax rates are snapshotted in `OrderItem` and `Invoice` objects so that historical sales metrics remain unaffected by subsequent product price or catalog adjustments.
- **PIN Hashing**: Waiters, Cashiers, Kitchen Staff, and Branch Managers authenticate using unique employee IDs/manager IDs + PINs, which are stored using PBKDF2 hashing (`make_password`) in Django for top-tier security.
- **QR Code Generation**: Table QR Codes are generated locally and stored inside `backend/media/qr_codes/`. Make sure that media permissions allow write operations.
