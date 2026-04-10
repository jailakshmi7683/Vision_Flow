import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = 3000;
const DATA_FILE = path.join(process.cwd(), 'cases.json');

app.use(express.json({ limit: '50mb' }));

// Initialize data file if it doesn't exist
if (!fs.existsSync(DATA_FILE)) {
  fs.writeFileSync(DATA_FILE, JSON.stringify([]));
}

const getCases = () => JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
const saveCases = (cases: any) => fs.writeFileSync(DATA_FILE, JSON.stringify(cases, null, 2));

// Create a new case
app.post('/api/cases', (req, res) => {
  const { defectType, imageUrl, location, description, severity, reason, repairSuggestions } = req.body;
  
  const newCase = {
    id: uuidv4(),
    timestamp: new Date().toISOString(),
    defectType,
    status: 'Awaiting Rework',
    imageUrl,
    location,
    description,
    severity,
    reason,
    repairSuggestions
  };
  
  const cases = getCases();
  cases.push(newCase);
  saveCases(cases);
  
  res.json(newCase);
});

// Get all cases
app.get('/api/cases', (req, res) => {
  res.json(getCases());
});

// Clear all cases
app.delete('/api/cases', (req, res) => {
  saveCases([]);
  res.json({ message: 'All cases cleared successfully' });
});

// Update case status
app.patch('/api/cases/:id', (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const cases = getCases();
  const caseIndex = cases.findIndex((c: any) => c.id === id);
  
  if (caseIndex !== -1) {
    const now = new Date();
    const startTime = new Date(cases[caseIndex].timestamp);
    const repairTime = Math.floor((now.getTime() - startTime.getTime()) / 1000);
    
    cases[caseIndex].status = status;
    cases[caseIndex].completedAt = now.toISOString();
    cases[caseIndex].repairTime = repairTime;
    saveCases(cases);
    res.json(cases[caseIndex]);
  } else {
    res.status(404).json({ error: 'Case not found' });
  }
});

// Analytics Endpoint
app.get('/api/analytics', (req, res) => {
  const cases = getCases();
  const completed = cases.filter((c: any) => c.status === 'Completed');
  
  const defectCounts: Record<string, number> = {
    'Missing Component': 0,
    'Solder Bridge': 0,
    'Misalignment': 0
  };

  const severityCounts: Record<string, number> = {
    'HIGH': 0,
    'MEDIUM': 0,
    'LOW': 0
  };
  
  cases.forEach((c: any) => {
    if (defectCounts[c.defectType] !== undefined) {
      defectCounts[c.defectType]++;
    }
    if (c.severity && severityCounts[c.severity] !== undefined) {
      severityCounts[c.severity]++;
    }
  });

  const avgRepairTime = completed.length > 0 
    ? completed.reduce((acc: number, c: any) => acc + (c.repairTime || 0), 0) / completed.length 
    : 0;

  const yieldPercentage = cases.length > 0 
    ? ((cases.length - cases.filter((c: any) => c.status === 'Awaiting Rework').length) / cases.length) * 100 
    : 100;

  res.json({
    defectDistribution: Object.entries(defectCounts).map(([name, value]) => ({ name, value })),
    severityDistribution: Object.entries(severityCounts).map(([name, value]) => ({ name, value })),
    avgRepairTime,
    yieldPercentage,
    totalCases: cases.length,
    completedCases: completed.length
  });
});

// Seed Demo Data
app.post('/api/seed', (req, res) => {
  const demoCases = [
    {
      id: uuidv4(),
      timestamp: new Date(Date.now() - 3600000 * 5).toISOString(),
      defectType: 'Missing Component',
      status: 'Completed',
      imageUrl: 'https://picsum.photos/seed/pcb1/800/600',
      location: { ymin: 200, xmin: 300, ymax: 400, xmax: 500 },
      description: 'C12 capacitor is missing from the designated footprint.',
      repairTime: 450,
      completedAt: new Date(Date.now() - 3600000 * 4).toISOString()
    },
    {
      id: uuidv4(),
      timestamp: new Date(Date.now() - 3600000 * 3).toISOString(),
      defectType: 'Solder Bridge',
      status: 'Awaiting Rework',
      imageUrl: 'https://picsum.photos/seed/pcb2/800/600',
      location: { ymin: 500, xmin: 100, ymax: 650, xmax: 250 },
      description: 'Solder bridge detected between pins 4 and 5 of U7 microcontroller.'
    },
    {
      id: uuidv4(),
      timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
      defectType: 'Misalignment',
      status: 'Awaiting Rework',
      imageUrl: 'https://picsum.photos/seed/pcb3/800/600',
      location: { ymin: 100, xmin: 600, ymax: 300, xmax: 800 },
      description: 'R45 resistor is rotated by 15 degrees and misaligned with pads.'
    }
  ];
  saveCases(demoCases);
  res.json({ message: 'Demo data seeded successfully' });
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
