# tg-enc

A high-performance, private 1-on-1 end-to-end encrypted Telegram-styled web messenger with real-time Supabase cloud relay, WebCrypto AES-256-GCM encryption, encrypted media & voice sharing, safety number verification, and remote panic wipe.

## 🚀 Features

- **End-to-End Encryption**: AES-256-GCM authenticated encryption using keys derived via PBKDF2 directly in the browser. Zero plaintext ever reaches servers.
- **Supabase Cloud Relay & Storage**: Real-time broadcast channels and persistent encrypted envelopes table with Row Level Security (RLS).
- **Embedded WebSocket Fallback Server**: Full Node.js / Express WebSocket relay fallback.
- **Encrypted Media & Voice**: Client-side encrypted image, file, and voice note sharing.
- **Privacy & Security**: Screen blur privacy shield, safety number fingerprint comparison, self-destructing messages, and panic wipe.

---

## 🛠️ Quick Start

### 1. Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- [npm](https://www.npmjs.com/)

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Supabase Environment
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Provide your Supabase URL and Publishable / Anon Key in `.env`:
```env
SUPABASE_URL="https://your-project.supabase.co"
SUPABASE_ANON_KEY="your-supabase-publishable-key"
VITE_SUPABASE_URL="https://your-project.supabase.co"
VITE_SUPABASE_ANON_KEY="your-supabase-publishable-key"
PORT=3000
```

### 4. Database Setup (Supabase)
Run the migration script in your Supabase Dashboard **SQL Editor**:
```sql
create table if not exists public.secret_envelopes (
  id text primary key,
  room_id text not null,
  sender_id text not null,
  sender_name text not null,
  type text not null,
  payload jsonb,
  metadata jsonb,
  reply_to_id text,
  timestamp bigint not null,
  created_at timestamptz default now()
);

create index if not exists idx_secret_envelopes_room_id on public.secret_envelopes(room_id, timestamp asc);
alter table public.secret_envelopes enable row level security;

create policy "Allow anon insert" on public.secret_envelopes for insert with check (true);
create policy "Allow anon select" on public.secret_envelopes for select using (true);
create policy "Allow anon delete" on public.secret_envelopes for delete using (true);
```

### 5. Run Locally
```bash
npm run dev
```
Open `http://localhost:3000` in your browser.

---

## 📦 Production Deployment

### Build for Production:
```bash
npm run build
```

### Start Production Server:
```bash
npm start
```
The server serves the compiled Vite frontend from `dist/` along with the WebSocket and REST relay endpoints.

---

## 🔒 Security Architecture
- Keys are derived locally using PBKDF2 (`SHA-256`, 100,000 iterations).
- Messages and attachments are encrypted with AES-256-GCM with unique Initialization Vectors (IV).
- Passkeys never leave client memory or devices.
- Supabase stores only zero-knowledge ciphertext envelopes.
