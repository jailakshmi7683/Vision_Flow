<div align="center">

# Aura-QA
### Autonomous PCB Quality Assurance System

AI-Powered PCB Defect Detection, Repair Workflow Automation, and Manufacturing Analytics Platform

</div>

---

# 📌 Overview

Aura-QA is an Industry 5.0 intelligent quality assurance platform designed to automate PCB defect detection and repair workflow management using AI-assisted analysis.

The system enables manufacturers and engineers to:
- Detect PCB defects automatically
- Track repair workflows
- Analyze manufacturing quality metrics
- Improve production reliability
- Reduce manual inspection effort

---

# 🚀 Key Features

## 🔍 AI-Based PCB Defect Detection
Detects common PCB assembly defects such as:
- Missing Components
- Misalignment
- Solder Bridges

---

## 📋 Automated Case Management
- Automatic defect case generation
- Repair workflow tracking
- Status management
- Repair evidence visualization

---

## 📊 Real-Time Analytics Dashboard
Provides:
- Yield Percentage
- Defect Distribution
- Severity Distribution
- Average Repair Time
- Pending Rework Statistics

---

## 🧠 Explainable AI Suggestions
Generates:
- AI-based defect explanations
- Smart repair recommendations
- Rework guidance for technicians

---

## 📁 Export Support
- CSV export functionality for reports and analytics

---

# 🖥️ System Modules

## 1️⃣ AI Detection Module
Upload PCB images for AI-powered defect analysis.

### Features
- Drag & Drop Upload
- Real-Time Detection
- AI Classification
- Instant Analysis

---

## 2️⃣ Case Management Module
Track and manage repair workflows.

### Features
- Repair Tracking
- Status Updates
- Repair Evidence Images
- Severity Classification
- Repair Suggestions

---

## 3️⃣ Analytics Dashboard
Monitor manufacturing quality metrics in real time.

### Includes
- Defect Charts
- Yield Monitoring
- Repair Performance
- Severity Analytics

---

# 🛠️ Tech Stack

## Frontend
- React 19
- TypeScript
- Vite
- Tailwind CSS
- Recharts
- Lucide React

## Backend
- Node.js
- Express.js

## AI Integration
- Google Gemini API

## Additional Libraries
- UUID
- Multer
- Motion

---

# 📂 Project Structure

```bash
Aura-QA/
│
├── src/
│   ├── components/
│   ├── pages/
│   ├── analytics/
│   ├── ai-detection/
│   ├── case-management/
│   └── assets/
│
├── public/
├── server.ts
├── cases.json
├── package.json
└── README.md
````

---

# ⚙️ Installation & Setup

## 1️⃣ Clone Repository

```bash
git clone https://github.com/your-username/aura-qa.git
cd aura-qa
```

---

## 2️⃣ Install Dependencies

```bash
npm install
```

---

## 3️⃣ Configure Environment Variables

Create a `.env.local` file:

```env
GEMINI_API_KEY=your_api_key_here
```

---

## 4️⃣ Start Development Server

```bash
npm run dev
```

---

# 🔌 API Endpoints

## Create Case

```http
POST /api/cases
```

## Get All Cases

```http
GET /api/cases
```

## Update Case Status

```http
PATCH /api/cases/:id
```

## Delete All Cases

```http
DELETE /api/cases
```

## Analytics Endpoint

```http
GET /api/analytics
```

---

# 📈 Analytics Metrics

The platform tracks:

* Total Cases
* Completed Repairs
* Pending Rework
* Yield Percentage
* Severity Levels
* Average Repair Time

---

# 🧠 AI Workflow

1. Upload PCB Image
2. AI analyzes PCB
3. Defect identified
4. Case automatically created
5. Repair suggestions generated
6. Workflow tracked in dashboard
7. Analytics updated in real time

---

# 🎯 Objectives

* Automate PCB inspection
* Improve manufacturing QA
* Reduce human error
* Enable intelligent repair workflows
* Provide actionable analytics

---

# 💡 Future Improvements

* Real-time camera integration
* Deep learning-based defect localization
* Multi-user authentication
* Cloud deployment
* IoT factory integration
* Predictive maintenance analytics

---

# 🏆 Project Highlights

✅ AI-Assisted PCB Inspection
✅ Smart Repair Workflow System
✅ Real-Time Analytics Dashboard
✅ Explainable AI Recommendations
✅ Industry 5.0 Manufacturing Concept
✅ Modern Responsive UI

---

# 👨‍💻 Developed By

### Jai Lakshmi Kangula

Electronics & Communication Engineering Student, 
CBIT Hyderabad

---

# 📜 License

This project is developed for academic, research, and innovation purposes.

```
