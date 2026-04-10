export type DefectType = 'Missing Component' | 'Solder Bridge' | 'Misalignment' | 'None';

export interface BoundingBox {
  ymin: number;
  xmin: number;
  ymax: number;
  xmax: number;
}

export interface Defect {
  type: DefectType;
  location: BoundingBox | null;
  confidence: number;
  description: string;
}

export interface Case {
  id: string;
  timestamp: string;
  defectType: DefectType;
  status: 'Awaiting Rework' | 'Completed';
  imageUrl: string;
  repairTime?: number; // in seconds
  completedAt?: string;
  location: BoundingBox | null;
}

export interface AnalyticsData {
  defectDistribution: { name: string; value: number }[];
  avgRepairTime: number;
  yieldPercentage: number;
  totalCases: number;
  completedCases: number;
}
