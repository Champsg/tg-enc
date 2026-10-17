# tg-enc

A private, Telegram-styled, **text-only** messenger with end-to-end encryption.

No room ids. No passkeys. No invite codes. You pick a username, friends find you
by your `@handle`, and every conversation stays in your history until someone
deletes it.

## Features

- **Just a username** — pick a handle once; nothing else to copy or share.
- **End-to-end encryption** — each device owns an ECDH P-256 keypair that never leaves the browser. A shared chat key is negotiated automatically (ECDH → HKDF-SHA-256) and messages are sealed with AES-256-GCM.
- **Permanent history** — messages are stored encrypted in Supabase and reloaded whenever you open the chat, with “load older” pagination.
- **Real-time inbox** — new chats and incoming messages appear live, even when the conversation is not open. Unread badges included.
- **No strangers in your database** — every row is scoped by Supabase row-level security to the two participants, and a message can only be inserted by its real sender.
- **Delete on your terms** — “Delete chat” removes the conversation for both people. Nothing expires on its own.
- **Replies, reactions, read receipts, typing indicator** — all persisted (reactions and read state survive a reload).
- **Privacy extras** — instant screen blur and an encryption-verification screen.
- **Account safety** — back up your account to a file and restore it on another device.

## Setup

### 1. Install

```bash
npm install
```

### 2. Environment

Copy `.env.example` to `.env` and fill in your Supabase URL and publishable (anon) key:

```env
SUPABASE_URL="https://your-project.supabase.co"
SUPABASE_ANON_KEY="your-supabase-publishable-key"
VITE_SUPABASE_URL="https://your-project.supabase.co"
VITE_SUPABASE_ANON_KEY="your-supabase-publishable-key"
PORT=3000
```

No project URL or key is hard-coded in the source.

### 3. Enable anonymous sign-in

Supabase dashboard → **Authentication → Sign In / Providers → Anonymous sign-ins → Enable**.

This gives every device a real session (`auth.uid()`), which is what lets the
database enforce that you can only read your own conversations and only send
messages as yourself.

### 4. Create the tables

Paste [`supabase-setup.sql`](./supabase-setup.sql) into **SQL Editor** and run it.
The app shows the same script on its first screen and checks each setup step.

### 5. Run

```bash
npm run dev
```

Open http://localhost:3000.

## Production

```bash
npm run build
npm start
```

The Node process only serves the frontend. All realtime traffic and storage go
directly to Supabase, so the app also works on static hosting.

## How it works

1. On first run the browser gets an anonymous Supabase session and generates an ECDH keypair. The private key stays in this browser.
2. Your public key and `@username` are published to `profiles` so people can find you.
3. Starting a chat writes one `conversations` row containing the two participants and an opaque `chat_id` (SHA-256 of the two user ids).
4. Both sides derive the same AES-256-GCM key from their own private key and the other person’s public key. No secret is ever transmitted.
5. Messages are encrypted locally, stored in `direct_messages`, and delivered live over Supabase Realtime.
6. Row-level security uses `auth.uid()` to make reads, inserts and deletes participant-only.
7. Opening a chat decrypts history (100 messages at a time) and restores persisted reactions and read state.

## Security notes

- **Content is zero-knowledge.** Supabase stores ciphertext and an opaque chat id; without your device key the messages cannot be read.
- **The server cannot forge messages.** Inserts must come from the authenticated sender and membership is checked in the database.
- **A changed contact key triggers a warning.** The app never silently accepts a new public key for an existing chat.
- **The account backup file is sensitive.** It contains your session tokens and private key — treat it like a password.
- **This is still a personal project, not an audited messenger.** There is no key rotation / forward secrecy, no multi-device sync beyond restoring a backup, and no report/block tooling.
