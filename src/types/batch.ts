export interface Batch {
  id: string;
  batchName: string;
  assignedRep: string; // Display name
  assignedToId?: string | number; // Original ID from API
  batchSize: number;
  responseRate: number;
  conversionRate: number;
  status: 'new' | 'assigned' | 'in_progress' | 'done';
  createdDate: string;
  assignedDate: string;
  historicalValue: number;
  contacted: number;
  responded: number;
  purchased: number;
  reactivatedRevenue: number;
}

export interface ApiBatch {
  id: string;
  batch_name: string;
  assigned_to: string;
  size: string;
  historical_value: string;
  status: string;
  response: string;  // Number of responses
  conversion: string;  // Number of conversions
  contact: string;  // Number of contacted customers
  response_rate: string;  // Decimal like 0.25
  conversion_rate: string;  // Decimal like 0.05
  reactive_revenue: string;  // Reactivated revenue
  purchase: string;  // Number of purchases
  created_date: string;
}

export interface Employee {
  id: string; // API returns string ID like "186"
  full_name: string;
  team: string;
}

export interface SummaryStats {
  total_batches: number;
  total_customers: number;
  total_reactive_revenue: number;
  total_batches_by_status: {
    New?: number;
    Assigned?: number;
    'In Progress'?: number;
    Done?: number;
  };
}

export type StatusFilter = 'all' | 'new' | 'assigned' | 'in_progress' | 'done';

