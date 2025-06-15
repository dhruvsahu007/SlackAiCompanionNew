# 🧠 Slack AI Companion

A **Slack-like chat platform** powered by AI that enhances workplace communication with smart features like Org Memory, Instant Reply Composer, and AI-Powered Meeting Notes.

---

## 🚀 Live Demo

👉 [Live App on Render](https://slackai-oirf.onrender.com)

---

## 🛠 Features

### 🧩 Slack-Clone Core

- Multi-user chat interface with **threads**, **mentions**, and **channels**
- Responsive UI styled with **TailwindCSS + Radix UI**
- Built with **React (Vite)** and **Express**

---

### 🤖 AI-Powered Add-ons

#### 🧠 Org Brain Plugin  
Ask questions like:  
> “What’s the latest on Project Atlas?”

AI summarizes across public channels and pinned docs to keep you up-to-date.

---

#### ✍️ Auto-Reply Composer  
Click **“Suggest Reply”** in any thread — AI proposes replies using:
- Full thread context
- Org-wide memory

---

#### 🎯 Tone & Impact Meter  
AI analyzes your drafted replies for:
- Aggressive / Weak / Confusing tone
- High-Impact vs Low-Impact phrasing

---

#### 📝 Meeting Notes Generator  
Select any **thread or channel**, click **“Generate Notes”**, and AI generates clean, summarized meeting notes instantly.

---

## 🧪 Tech Stack

- **Frontend**: React, Vite, TailwindCSS, Radix UI
- **Backend**: Express.js, TypeScript
- **AI**: OpenAI API
- **Database**: PostgreSQL (via Drizzle ORM + Neon)
- **Deployment**: Render

---

## 🧰 Setup Instructions

### 1. Clone the Repo
```bash
git clone https://github.com/dhruvsahu007/SlackAiCompanionNew.git
cd SlackAiCompanionNew
```
### 2. Install Dependencies
```bash
npm install
```
### 3. Configure Environment Variables
Create a .env file in the root:
```bash
OPENAI_API_KEY=your-openai-api-key
DATABASE_URL=your-postgres-url
SESSION_SECRET=some-secret
```
### 4. Build the Frontend + Backend
```bash
npm run build
```
### 5. Run in Development
```bash
npm run dev
```
## 🛰 Deployment
Deployed via Render using:
```bash
vite build as Build Command
dist as Output Directory
node dist/index.js to start server
```
## 🧑‍💻 Author

Made by Dhruv Sahu as part of a fullstack AI Slack Clone project.
