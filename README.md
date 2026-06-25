# Aura: AI-Powered Smart Job Board

Aura is a modern, premium, and feature-rich job board application built with a React/Vite/TypeScript frontend and an Express/TypeScript/Prisma/PostgreSQL backend. It is designed to bridge the gap between candidates and employers using state-of-the-art Local LLMs (via Ollama or LM-Studio) and external LLM services (OpenAI and Claude).

---

## 🚀 Key Features

### 👤 For Candidates
*   **Semantic Job Search:** Conceptually search for roles using natural language (e.g., "remote React internship" or "python data engineering with flexible hours") rather than strict keyword-matching.
*   **Resume Parsing & Upload:** Upload PDF/Word resumes. The text is automatically parsed, summarized, and matched to available positions using semantic embeddings.
*   **LinkedIn Profile Auto-Import:** Import raw LinkedIn profile text. Aura extracts and structures work history, education, skills, and certifications, merging it seamlessly into the candidate profile.
*   **Real-time Matching Alerts:** Get notified via email as soon as new job postings matching your profile score above 40%.

### 🏢 For Employers
*   **AI Job Description Generator:** Generate polished, formatted Markdown job descriptions by inputting basic requirements, culture, and benefits.
*   **Automated Interview Prep:** Instantly create 10 customized interview questions (5 Technical, 3 Behavioral, 2 Culture Fit) mapped to the job description, with guidelines on what a good answer looks like.
*   **Interactive Salary Analysis:** Evaluate proposed salary ranges against market averages based on role title, location, required experience, and skills.
*   **Candidate Fit Analytics:** Review detailed AI breakdowns of applicants showing:
    *   *Why this candidate:* A tailored evaluation paragraph.
    *   *Strength Highlights:* Custom highlighted matches.
    *   *Concerns:* Potential gaps or warning signs.
    *   *Confidence Score:* A decimal (0.0 to 1.0) indicating LLM match confidence.
*   **Multi-Platform Export Engine:** Export job listings to formats tailored for external platforms like LinkedIn (Plain Text), Indeed (XML), Glassdoor (JSON), HTML, and JSON.
*   **Talent Pipelines:** Organically group candidates into talent pools. Employers can manually add notes or trigger AI auto-population to pull top-matching resumes into a pipeline.

---

## 🛠️ Architecture & Tech Stack

Aura separates the user interface from the heavy-lifting logic through a modular decoupled backend:

```mermaid
graph TD
    A[Frontend React / Vite] <-->|JSON REST API| B[Backend Node.js / Express]
    B <-->|Prisma Client| C[(PostgreSQL Database)]
    B <-->|OpenAI SDK / HTTP| D[AI Providers: Claude / OpenAI / Ollama / LM-Studio]
    B <-->|SendGrid Node SDK| E[SendGrid Email Service]
```

### Frontend (`/frontend`)
*   **Framework:** React 19 (Vite, TypeScript).
*   **Styling:** Tailwind CSS with custom glassmorphism components, gradients, and a dark-theme design system.
*   **State Management:** React Hook Form & Zod for forms/validations, Axios for API communications.

### Backend (`/backend`)
*   **Runtime:** Node.js (Express, TypeScript).
*   **ORM:** Prisma ORM.
*   **Database:** PostgreSQL.
*   **AI Engine:** Multi-LLM provider abstraction. Supported engines:
    *   `Ollama` / `LM-Studio` (Local models, e.g., `qwen2.5:3b`, `nomic-embed-text`)
    *   `Claude` (`claude-3-5-sonnet`)
    *   `OpenAI` (OpenAI model suite)
*   **Notification Engine:** SendGrid Integration for programmatic email notifications.
*   **Job Queue:** Background matching task execution using in-memory queues to maintain low latency.

---

## 🧠 Core AI Engines

### 1. Vector Embeddings & Semantic Search
When jobs are created or resumes are uploaded, Aura requests embeddings from the active AI Provider. A cosine similarity algorithm is applied to candidate embeddings against job embeddings to evaluate their conceptual match. If the AI provider lacks native embedding support, a fallback bag-of-words frequency model or full-text database index is used.

### 2. The Weighted Match Score Algorithm (100-Point System)
The candidate-to-job match score is calculated using a robust, multi-dimensional formula:
*   **Skills Overlap (25%):** Exact and semantic intersection of candidate skills with the job requirements.
*   **Experience Alignment (15%):** Compares candidate's years of experience with the job's requested baseline.
*   **Semantic Similarity (15%):** Cosine similarity between the resume text embedding and the job description embedding.
*   **Keyword Overlap (10%):** Frequency check of job description terms in the resume text.
*   **Deep AI Analysis (25%):** Structured LLM-based evaluation (`matchCandidateToJob`) scoring the overall contextual fit.
*   **Culture Fit Alignment (10%):** Overlap of the employer's company culture criteria with keywords in the candidate's resume.

---

## 🗄️ Database Schema Overview

```mermaid
erDiagram
    users ||--o| candidate_profiles : "has profile"
    users ||--o| employer_profiles : "has profile"
    users ||--o| resume_files : "owns"
    users ||--o{ refresh_tokens : "signs"
    companies ||--o{ jobs : "hosts"
    companies ||--o{ employer_profiles : "hires"
    jobs ||--o{ job_skills : "requires"
    candidate_profiles ||--o{ candidate_skills : "possesses"
    candidate_profiles ||--o{ applications : "submits"
    jobs ||--o{ applications : "receives"
    jobs ||--o{ candidate_job_matches : "ranks"
    candidate_profiles ||--o{ candidate_job_matches : "is matched"
    employer_profiles ||--o{ talent_pipelines : "creates"
    talent_pipelines ||--o{ pipeline_candidates : "contains"
    candidate_profiles ||--o{ pipeline_candidates : "groups"
```

*   `User`: Base credentials and authentication context. Roles include `CANDIDATE`, `EMPLOYER`, and `ADMIN`.
*   `CandidateProfile`: Structured record storing candidate bio, experience, LinkedIn data, education, work history, and skills.
*   `EmployerProfile`: Employer profile linked to a `Company`.
*   `Job`: Job posting fields (compensation range, location, requirements, benefits) and cached AI details (embeddings, interview questions, description).
*   `Skill`: Master skills collection mapping many-to-many relationship with Jobs and Candidates.
*   `Application`: Tracks applicant status from `APPLIED`, `UNDER_REVIEW`, `SHORTLISTED`, all the way to `HIRED` or `REJECTED`, complete with a historical timeline logs.
*   `CandidateJobMatch`: AI evaluations storing the matching analytics.
*   `TalentPipeline`: Shared pools created by employers to organize candidates with customized criteria.

---

## ⚙️ Project Setup & Installation

### Prerequisites
*   [Node.js](https://nodejs.org/) (v18+)
*   [Docker](https://www.docker.com/) & Docker Compose
*   [Ollama](https://ollama.com/) (Optional: if running local models)

### Step 1: Start the Database
From the root directory, run Docker Compose to bring up PostgreSQL:
```bash
docker compose up -d
```

### Step 2: Configure Environment Variables
Create `.env` files in both the root workspace, `/backend`, and `/frontend`.

#### Workspace / Backend `.env`
Create a `.env` inside `/backend` (an example resides in `backend/.env.example` or root `.env.example`):
```env
DATABASE_URL="postgresql://postgres:postgres_password@localhost:5432/jobboard?schema=public"
PORT=3000
JWT_SECRET="your-development-jwt-secret-key"
JWT_REFRESH_SECRET="your-development-jwt-refresh-secret-key"

# AI Configuration (Option A: Local Ollama / LM-Studio)
AI_PROVIDER=ollama
AI_BASE_URL=http://localhost:11434/v1
AI_API_KEY=ollama
AI_MODEL=qwen2.5:3b
AI_EMBEDDING_MODEL=nomic-embed-text

# AI Configuration (Option B: Claude / Anthropic)
# AI_PROVIDER=claude
# CLAUDE_API_KEY=your-anthropic-key-here
# CLAUDE_MODEL=claude-3-5-sonnet-20240620

# Notifications Setup
SENDGRID_API_KEY=your-sendgrid-api-key
SENDGRID_FROM_EMAIL=your-verified-sender-email
```

#### Frontend `.env`
Create `.env` inside `/frontend`:
```env
VITE_API_URL=http://localhost:3000/api
```

### Step 3: Run Database Migrations & Seed
From the `/backend` folder:
```bash
cd backend
npm install
npx prisma migrate dev
npm run prisma:seed
```

### Step 4: Run the Backend
```bash
npm run dev
```
The server will start on [http://localhost:3000](http://localhost:3000). You can browse the Swagger API documentation at [http://localhost:3000/api/docs](http://localhost:3000/api/docs).

### Step 5: Run the Frontend
In a new terminal, navigate to the `/frontend` directory:
```bash
cd frontend
npm install
npm run dev
```
The client app will launch at [http://localhost:5173](http://localhost:5173).
