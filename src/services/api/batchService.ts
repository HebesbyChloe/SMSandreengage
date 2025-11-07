import { API_BASE_URL, API_ENDPOINTS, fetchWithConfig } from './config';
import { ApiBatch, SummaryStats } from '../../types/batch';

export interface BatchesResponse {
  success: boolean;
  data: ApiBatch[];
  count: number;
  limit: number;
  offset: number;
  message: string;
}

export interface SummaryStatsResponse {
  success: boolean;
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

export const batchService = {
  /**
   * Fetch summary statistics
   * GET /batch-api.php/get/summary
   */
  async getSummaryStats(): Promise<SummaryStats> {
    const url = `${API_BASE_URL}/batch-api.php/get/summary`;
    const data: SummaryStatsResponse = await fetchWithConfig(url);
    
    return {
      total_batches: data.total_batches || 0,
      total_customers: data.total_customers || 0,
      total_reactive_revenue: data.total_reactive_revenue || 0,
      total_batches_by_status: data.total_batches_by_status || {}
    };
  },

  /**
   * Fetch batches with pagination and filtering
   * GET /batch-api.php/get/batches
   * GET /batch-api.php/get/batches?status=New
   * GET /batch-api.php/get/batches?status=New&offset=20
   */
  async getBatches(offset: number = 0, status?: string): Promise<BatchesResponse> {
    let url = `${API_BASE_URL}/batch-api.php/get/batches`;
    
    const params = new URLSearchParams();
    
    if (offset > 0) {
      params.append('offset', offset.toString());
    }
    
    if (status && status !== 'all') {
      params.append('status', status);
    }
    
    const queryString = params.toString();
    if (queryString) {
      url += `?${queryString}`;
    }
    
    return fetchWithConfig(url);
  },

  /**
   * Update batch assigned rep and status
   * POST /batch-api.php/post/update/{batch_id}
   * Body: { "assigned_to": 123, "status": "Assigned" }
   */
  async updateBatch(batchId: string, assignedTo: number): Promise<{ success: boolean; message: string }> {
    const url = `${API_BASE_URL}/batch-api.php/post/update/${batchId}`;
    const payload = {
      assigned_to: assignedTo,
      status: 'Assigned'
    };
    
    return fetchWithConfig(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });
  }
};

