import { useState, useEffect, useRef } from 'react';
import { Batch, ApiBatch, SummaryStats, StatusFilter, Employee } from '../types/batch';
import { batchService } from '../services/api/batchService';

interface UseBatchesOptions {
  employees: Employee[];
}

export const useBatches = ({ employees }: UseBatchesOptions) => {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [summaryStats, setSummaryStats] = useState<SummaryStats>({
    total_batches: 0,
    total_customers: 0,
    total_reactive_revenue: 0,
    total_batches_by_status: {}
  });
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  
  const observerTarget = useRef<HTMLDivElement>(null);

  // Map API status to UI status
  const mapStatus = (apiStatus: string): Batch['status'] => {
    const statusMap: Record<string, Batch['status']> = {
      'New': 'new',
      'Assigned': 'assigned',
      'In Progress': 'in_progress',
      'Done': 'done'
    };
    return statusMap[apiStatus] || 'new';
  };

  // Map UI status to API status
  const mapStatusToApi = (uiStatus: Batch['status']): string => {
    const statusMap: Record<Batch['status'], string> = {
      'new': 'New',
      'assigned': 'Assigned',
      'in_progress': 'In Progress',
      'done': 'Done'
    };
    return statusMap[uiStatus];
  };

  // Get employee name by ID with proper type coercion
  const getEmployeeName = (id: string | number): string => {
    if (!id || id === '0' || id === 0) return 'Unassigned';
    
    // API returns employee.id as string, batch.assigned_to might be string or number
    // Normalize both to strings and trim whitespace for safe comparison
    const searchId = String(id).trim();
    const employee = employees.find(emp => String(emp.id).trim() === searchId);
    
    return employee ? employee.full_name : `Unassigned`;
  };

  // Transform API batch to UI batch
  const transformBatch = (apiBatch: ApiBatch): Batch => {
    const batchSize = parseInt(apiBatch.size) || 0;
    // Convert decimal to percentage (0.25 -> 25)
    const responseRate = Math.round((parseFloat(apiBatch.response_rate) || 0) * 100);
    const conversionRate = Math.round((parseFloat(apiBatch.conversion_rate) || 0) * 100);
    const historicalValue = parseFloat(apiBatch.historical_value) || 0;
    
    // Use actual counts from API
    const contacted = parseInt(apiBatch.contact) || 0;  // Use contact field from API
    const responded = parseInt(apiBatch.response) || 0;  // Actual response count
    const purchased = parseInt(apiBatch.purchase) || 0;  // Actual purchase count
    const reactivatedRevenue = parseFloat(apiBatch.reactive_revenue) || 0;

    const assignedRepName = getEmployeeName(apiBatch.assigned_to);
    const isAssigned = apiBatch.assigned_to && String(apiBatch.assigned_to) !== '0' && Number(apiBatch.assigned_to) !== 0;

    return {
      id: apiBatch.id,
      batchName: apiBatch.batch_name,
      assignedRep: assignedRepName,
      assignedToId: apiBatch.assigned_to,
      batchSize,
      responseRate,
      conversionRate,
      status: mapStatus(apiBatch.status),
      createdDate: new Date(apiBatch.created_date).toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
      }),
      assignedDate: isAssigned ? new Date(apiBatch.created_date).toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
      }) : '-',
      historicalValue,
      contacted,
      responded,
      purchased,
      reactivatedRevenue
    };
  };

  // Fetch summary stats from API
  const loadSummaryStats = async () => {
    try {
      const stats = await batchService.getSummaryStats();
      setSummaryStats(stats);
    } catch (error) {
      // If API fails, keep empty stats (already initialized)
    }
  };

  // Fetch batches from API
  const fetchBatches = async (currentOffset: number, filter: StatusFilter, append: boolean = false) => {
    try {
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }

      const apiStatus = filter !== 'all' ? mapStatusToApi(filter as Batch['status']) : undefined;
      const data = await batchService.getBatches(currentOffset, apiStatus);

      if (data.success && data.data && Array.isArray(data.data)) {
        const transformedBatches = data.data.map(transformBatch);
        
        if (append) {
          setBatches(prev => [...prev, ...transformedBatches]);
        } else {
          setBatches(transformedBatches);
        }

        setHasMore(data.data.length === 20);
        setOffset(currentOffset + data.data.length);
      }
    } catch (error) {
      // If API fails, keep batches empty or show what we have
      setHasMore(false);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  // Initial load - ONLY fetch summary stats first
  useEffect(() => {
    loadSummaryStats();
  }, []);

  // Wait for employees to load before fetching batches
  useEffect(() => {
    if (employees.length > 0) {
      setOffset(0);
      setHasMore(true);
      fetchBatches(0, statusFilter, false);
    }
  }, [employees.length, statusFilter]);

  // Infinite scroll observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading && !loadingMore) {
          fetchBatches(offset, statusFilter, true);
        }
      },
      { threshold: 0.1 }
    );

    const currentTarget = observerTarget.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, [offset, hasMore, loading, loadingMore, statusFilter]);

  // Update batch - calls API to update assigned rep and status
  const updateBatch = async (id: string, employeeId: number, employeeName: string) => {
    try {
      // Call API to update batch
      const response = await batchService.updateBatch(id, employeeId);
      
      // Update local state after successful API call
      setBatches(prev => prev.map(batch => {
        if (batch.id === id) {
          const updated = { 
            ...batch, 
            assignedRep: employeeName,
            status: employeeId === 0 ? 'new' as const : 'assigned' as const
          };
          
          // Update assignedDate if it hasn't been set and not unassigned
          if (employeeId !== 0 && (!batch.assignedDate || batch.assignedDate === '-')) {
            const today = new Date();
            updated.assignedDate = today.toLocaleDateString('en-US', { 
              month: 'short', 
              day: 'numeric', 
              year: 'numeric' 
            });
          } else if (employeeId === 0) {
            // Reset assignedDate for unassigned
            updated.assignedDate = '-';
          }
          
          return updated;
        }
        return batch;
      }));
      
      // Refresh summary stats after update
      loadSummaryStats();
      
      return { success: true };
    } catch (error) {
      return { success: false, error };
    }
  };

  return {
    batches,
    summaryStats,
    statusFilter,
    setStatusFilter,
    loading,
    loadingMore,
    hasMore,
    observerTarget,
    updateBatch
  };
};

