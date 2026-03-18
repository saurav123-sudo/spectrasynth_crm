# SpectraSynth CRM

A full-stack Customer Relationship Management system designed for the chemical and pharmaceutical industry. It features an automated email-parsing AI-worker capable of extracting chemical products, matching CAS numbers, and automatically scraping external supplier pricing to build intelligent quotation documents.

## Project Structure

The project is divided into two primary directories:
- `Backend/` : Node.js & Express server with Sequelize ORM, AI workers, and web scrapers.
- `frontend/` : React application built with Vite and Bootstrap.

---

## 🛠 Required Technologies & Libraries

### **Backend Dependencies**
**Core APIs:**
- `express` (^5.1.0) - Node.js web framework.
- `sequelize` (^6.37.7) - SQL Object-Relational Mapper.
- `mysql2` (^3.15.1) - MySQL client for Node.js.
- `cors`, `dotenv` - Server middleware and environment handling.

**Automation & Scraping:**
- `@google/generative-ai` (^0.24.1) - Gemini integration to intelligently read incoming inquiry emails.
- `puppeteer` (^24.37.5) & `cheerio` (^1.1.2) - Headless browser and HTML parsing for automated pricing lookups.
- `node-cron` (^4.2.1) - Task scheduler to run the automation workers consistently.

**Email Handling:**
- `imap` (^0.8.17) & `mailparser` (^3.7.4) - To connect securely to Outlook/Gmail protocols and parse raw `.eml` bodies.
- `nodemailer` (^7.0.9) - To construct and send official quotations.

**Utility & Document Generation:**
- `pdfkit` (^0.17.2) - To dynamically generate `.pdf` formats of completed quotations.
- `jsonwebtoken`, `bcrypt` - Authentication.
- `multer` - File uploads handling.

### **Frontend Dependencies**
**Core UI:**
- `react` (^19.1.1) & `react-dom` - UI library.
- `vite` (^7.1.7) - Build tool and development server.
- `react-router-dom` (^7.9.4) - Client-side routing.
- `bootstrap` (^5.3.8) - CSS framework for layouts and grids.

**Data & Interactivity:**
- `axios` (^1.12.2) - For making RESTful calls to the backend server.
- `sweetalert2` (^11.26.2) - Beautiful pop-up alerts.
- `datatables.net-bs5` - Enhanced, searchable grid tables.
- `recharts`, `apexcharts`, `react-chartjs-2` - Various graphing libraries used on the dashboard.

---

## 🚀 How to Run the Project Local Environment

### **1. Database Setup**
Ensure you have MySQL installed and actively running on port `3306`.
Create a database mapped to your `.env` configuration, e.g., `spectadkxh_spectra_crm2`. Sequelize handles table initialization if configured properly.

### **2. Environment Variables (.env)**
Navigate to `Backend/` and ensure your `.env` contains the required keys. 
*Note: This file must NOT be committed to version control.*

```env
# Database
DB_NAME=spectadkxh_spectra_crm2
DB_USER=root
DB_PASS=root
DB_HOST=localhost
DB_DIALECT=mysql
JWT_SECRET=your_jwt_secret

# Server
PORT=8000
NODE_ENV=development

# Authentication & Emails
EMAIL_ACCOUNTS=[{"user":"example@outlook.com","pass":"app_pass","host":"outlook.office365.com","port":993}]
EMAIL_USER=example@gmail.com
EMAIL_PASS="your_app_password"
IMAP_HOST=imap.gmail.com
IMAP_PORT=993

# AI Scraping
GEMINI_API_KEY=your_gemini_key
GEMINI_MODEL=gemini-2.5-flash
```

### **3. Start the Backend Server**
Open a terminal in the `Backend` directory. Install the libraries and boot the server.
```bash
cd Backend
npm install
npm start
```
*(The backend should output `Server running on http://localhost:8000`)*

### **4. Start the Frontend Vite Server**
Open a secondary terminal in the `frontend` directory. Install the libraries and start Vite.
```bash
cd frontend
npm install
npm run dev
```
*(The React application should map locally to `http://localhost:5173`)*

---

### 🤖 How the AI Extraction Works

1. **Email Cron**: Every 2 minutes, the backend pulls new unread emails from the connected IMAP inboxes.
2. **Gemini Extraction**: `ai-automation-worker.js` feeds the raw email text (and structural diagrams) to the `GEMINI_MODEL`. Gemini parses technical compound names, CAS strings, and requested quantities.
3. **Database Validation**: The AI Worker cleans database names, stripping away artifacts like "Reference Standard" to verify if the compound already exists in the `products` table.
4. **Scraper Pipeline**: If the product is brand new, Puppeteer (`ChemScraper`) is launched to search chemical supplier sites, extract global pricing datasets across vendors (BLDPharm, Ambeed, Sigma, TCI), and map Indian Rupees (INR) or USD.
5. **UI Rendering**: In `Technical_CreateQuotation`, prices from `Company_Prices` are tabulated natively, prioritizing sorted vendor layouts and live timestamp data to let operators build final client Quotes rapidly.
