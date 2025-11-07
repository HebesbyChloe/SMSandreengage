import { useState } from 'react';
import { Users, TrendingUp, DollarSign, Target, ChevronDown, Loader2, CheckCircle2 } from 'lucide-react';
import { Batch } from '@/types/batch';
import { useBatches } from '@/hooks/useBatches';
import { useEmployees } from '@/hooks/useEmployees';
import { StatusBadge } from '@/components/re-engage/StatusBadge';

export default function ReEngagePage() {
  const { employees, loading: employeesLoading } = useEmployees();
  const {
    batches,
    summaryStats,
    statusFilter,
    setStatusFilter,
    loading,
    loadingMore,
    hasMore,
    observerTarget,
    updateBatch
  } = useBatches({ employees });

  const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null);
  const [showRepDropdown, setShowRepDropdown] = useState(false);
  const [editingBatchId, setEditingBatchId] = useState<string | null>(null);

  // Calculate stats
  const totalBatches = summaryStats.total_batches;
  const totalCustomers = summaryStats.total_customers;
  const totalRevenue = summaryStats.total_reactive_revenue;
  const avgResponseRate = batches.length > 0 
    ? Math.round(batches.reduce((sum, b) => sum + b.responseRate, 0) / batches.length)
    : 0;
  const avgConversionRate = batches.length > 0
    ? Math.round(batches.reduce((sum, b) => sum + b.conversionRate, 0) / batches.length)
    : 0;

  const statusCounts = {
    all: summaryStats.total_batches,
    new: summaryStats.total_batches_by_status.New || 0,
    assigned: summaryStats.total_batches_by_status.Assigned || 0,
    in_progress: summaryStats.total_batches_by_status['In Progress'] || 0,
    done: summaryStats.total_batches_by_status.Done || 0
  };

  const handleUpdateBatch = async (id: string, employeeId: string, employeeName: string) => {
    // Convert string ID to number for API
    const employeeIdNum = parseInt(employeeId, 10);
    const result = await updateBatch(id, employeeIdNum, employeeName);
    
    if (result.success && selectedBatch?.id === id) {
      const updated = { 
        ...selectedBatch, 
        assignedRep: employeeName,
        status: employeeId === '0' ? 'new' as const : 'assigned' as const
      };
      
      // Update assignedDate if not set and not unassigned
      if (employeeId !== '0' && (!selectedBatch.assignedDate || selectedBatch.assignedDate === '-')) {
        const today = new Date();
        updated.assignedDate = today.toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric', 
          year: 'numeric' 
        });
      } else if (employeeId === '0') {
        // Reset assignedDate for unassigned
        updated.assignedDate = '-';
      }
      
      setSelectedBatch(updated);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FB] px-4 py-6 md:px-8 md:py-8">
      <div className="max-w-[1600px] mx-auto">
        {/* Header */}
        <div className="mb-6 md:mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-semibold text-gray-900 mb-2">Re-Engage Board</h1>
            <p className="text-sm md:text-base text-gray-500">Manage and track customer reactivation batches</p>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 md:mb-8 items-stretch">
          {/* Combined Batches & Customers Card */}
          <div className="bg-white rounded-xl p-4 md:p-5 border border-gray-200 shadow-sm h-full">
            <div className="flex flex-col h-full">
              <div className="flex-1 pb-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                    <Users className="w-5 h-5 text-blue-600" />
                  </div>
                  <span className="text-sm text-gray-500">Total Batches</span>
                </div>
                <p className="text-2xl font-semibold text-gray-900 ml-[52px]">{totalBatches}</p>
              </div>
              <div className="flex-1 pt-4 border-t border-gray-100">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-lg bg-violet-50 flex items-center justify-center flex-shrink-0">
                    <Target className="w-5 h-5 text-violet-600" />
                  </div>
                  <span className="text-sm text-gray-500">Total Customers</span>
                </div>
                <p className="text-2xl font-semibold text-gray-900 ml-[52px]">{totalCustomers.toLocaleString()}</p>
              </div>
            </div>
          </div>

          {/* Combined Response & Conversion Card with Progress Bars */}
          <div className="bg-white rounded-xl p-4 md:p-5 border border-gray-200 shadow-sm h-full">
            <div className="flex flex-col h-full">
              <div className="flex-1 pb-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                    <TrendingUp className="w-5 h-5 text-[#2F80ED]" />
                  </div>
                  <span className="text-sm text-gray-500">Response Rate Avg</span>
                </div>
                <p className="text-2xl font-semibold text-[#2F80ED] ml-[52px] mb-2">{avgResponseRate}%</p>
                <div className="h-1 bg-gray-100 rounded-full overflow-hidden ml-[52px]">
                  <div
                    className="h-full bg-[#2F80ED] rounded-full transition-all duration-500"
                    style={{ width: `${Math.max(avgResponseRate, 1)}%` }}
                  />
                </div>
              </div>
              <div className="flex-1 pt-4 border-t border-gray-100">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 className="w-5 h-5 text-[#F2C94C]" />
                  </div>
                  <span className="text-sm text-gray-500">Conversion Rate Avg</span>
                </div>
                <p className="text-2xl font-semibold text-[#F2C94C] ml-[52px] mb-2">{avgConversionRate}%</p>
                <div className="h-1 bg-gray-100 rounded-full overflow-hidden ml-[52px]">
                  <div
                    className="h-full bg-[#F2C94C] rounded-full transition-all duration-500"
                    style={{ width: `${Math.max(avgConversionRate, 1)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Total Revenue Card */}
          <div className="bg-white rounded-xl p-4 md:p-5 border border-gray-200 shadow-sm h-full">
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-12 h-12 rounded-lg bg-emerald-50 flex items-center justify-center mb-3 flex-shrink-0">
                <DollarSign className="w-6 h-6 text-[#27AE60]" />
              </div>
              <span className="text-sm text-gray-500 mb-2">Total Reactivated Revenue</span>
              <p className="text-3xl font-semibold text-gray-900">${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>
          </div>
        </div>

        {/* Main Content with Table and Detail Panel */}
        <div className="flex flex-col md:flex-row gap-4 md:gap-6 relative">
          {/* Table Section */}
          <div className={`transition-all duration-300 ${selectedBatch ? 'w-full md:w-[70%]' : 'w-full'}`}>
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              {/* Filter Tabs */}
              <div className="border-b border-gray-200 px-4 md:px-6 py-3 md:py-4">
                <div className="flex gap-2 overflow-x-auto">
                  <button
                    onClick={() => setStatusFilter('all')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      statusFilter === 'all'
                        ? 'bg-gray-900 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    All ({statusCounts.all})
                  </button>
                  <button
                    onClick={() => setStatusFilter('new')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      statusFilter === 'new'
                        ? 'bg-gray-900 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    New ({statusCounts.new})
                  </button>
                  <button
                    onClick={() => setStatusFilter('in_progress')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      statusFilter === 'in_progress'
                        ? 'bg-gray-900 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    In Progress ({statusCounts.in_progress})
                  </button>
                  <button
                    onClick={() => setStatusFilter('assigned')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      statusFilter === 'assigned'
                        ? 'bg-gray-900 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    Assigned ({statusCounts.assigned})
                  </button>
                  <button
                    onClick={() => setStatusFilter('done')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      statusFilter === 'done'
                        ? 'bg-gray-900 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    Done ({statusCounts.done})
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      <th className="px-3 md:px-6 py-3 md:py-4 text-left text-xs md:text-sm font-medium text-gray-900">Batch Name</th>
                      <th className="px-3 md:px-6 py-3 md:py-4 text-left text-xs md:text-sm font-medium text-gray-900">Assigned Rep</th>
                      <th className="px-3 md:px-6 py-3 md:py-4 text-left text-xs md:text-sm font-medium text-gray-900 hidden md:table-cell">Batch Size</th>
                      <th className="px-3 md:px-6 py-3 md:py-4 text-left text-xs md:text-sm font-medium text-gray-900 hidden lg:table-cell">Historical Value</th>
                      <th className="px-3 md:px-6 py-3 md:py-4 text-left text-xs md:text-sm font-medium text-gray-900">Status</th>
                      <th className="px-3 md:px-6 py-3 md:py-4 text-left text-xs md:text-sm font-medium text-gray-900 hidden sm:table-cell">Response %</th>
                      <th className="px-3 md:px-6 py-3 md:py-4 text-left text-xs md:text-sm font-medium text-gray-900 hidden sm:table-cell">Conversion %</th>
                      <th className="px-3 md:px-6 py-3 md:py-4 text-left text-xs md:text-sm font-medium text-gray-900 hidden lg:table-cell">Created Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {(employeesLoading || (loading && batches.length === 0)) ? (
                      <tr>
                        <td colSpan={8} className="px-4 md:px-6 py-8 md:py-12 text-center">
                          <div className="flex flex-col items-center justify-center text-gray-500">
                            <Loader2 className="w-8 h-8 mb-3 text-gray-400 animate-spin" />
                            <p className="text-sm font-medium">
                              {employeesLoading ? 'Loading employees...' : 'Loading batches...'}
                            </p>
                          </div>
                        </td>
                      </tr>
                    ) : batches.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-4 md:px-6 py-8 md:py-12 text-center">
                          <div className="flex flex-col items-center justify-center text-gray-500">
                            <Users className="w-12 h-12 mb-3 text-gray-300" />
                            <p className="text-sm font-medium">No batches found</p>
                            <p className="text-xs mt-1">Create your first re-engagement batch to get started</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      <>
                        {batches.map((batch) => (
                      <tr
                        key={batch.id}
                        className={`transition-colors hover:bg-gray-50 ${
                          selectedBatch?.id === batch.id ? 'bg-blue-50' : ''
                        }`}
                      >
                        {/* Batch Name - Editable */}
                        <td className="px-3 md:px-6 py-3 md:py-4">
                          <button
                            onClick={() => setSelectedBatch(batch)}
                            className="text-sm font-medium text-gray-900 hover:text-blue-600 text-left w-full"
                          >
                            {batch.batchName}
                          </button>
                        </td>

                        {/* Assigned Rep - Dropdown */}
                        <td className="px-3 md:px-6 py-3 md:py-4">
                          <div className="relative">
                            {editingBatchId === batch.id ? (
                              <>
                                <div 
                                  className="fixed inset-0 z-10" 
                                  onClick={() => setEditingBatchId(null)}
                                />
                                <div className="absolute top-0 left-0 bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-[180px] z-20 max-h-[300px] overflow-y-auto">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleUpdateBatch(batch.id, '0', 'Unassigned');
                                      setEditingBatchId(null);
                                    }}
                                    className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 transition-colors"
                                    style={{ display: 'none' }}
                                  >
                                    Unassigned
                                  </button>
                                  {employees.map((employee) => (
                                    <button
                                      key={employee.id}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleUpdateBatch(batch.id, employee.id, employee.full_name);
                                        setEditingBatchId(null);
                                      }}
                                      className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 transition-colors"
                                    >
                                      {employee.full_name}
                                    </button>
                                  ))}
                                  {employees.length === 0 && (
                                    <div className="px-3 py-2 text-sm text-gray-500">
                                      No employees found
                                    </div>
                                  )}
                                </div>
                              </>
                            ) : (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingBatchId(batch.id);
                                }}
                                className="flex items-center gap-1 text-sm text-gray-600 hover:text-blue-600"
                              >
                                {batch.assignedRep}
                                <ChevronDown className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </td>

                        {/* Batch Size */}
                        <td 
                          className="px-3 md:px-6 py-3 md:py-4 text-sm text-gray-900 cursor-pointer hidden md:table-cell"
                          onClick={() => setSelectedBatch(batch)}
                        >
                          {batch.batchSize}
                        </td>

                        {/* Historical Value */}
                        <td 
                          className="px-3 md:px-6 py-3 md:py-4 cursor-pointer hidden lg:table-cell"
                          onClick={() => setSelectedBatch(batch)}
                        >
                          <span className="text-sm font-semibold text-[#27AE60]">
                            ${batch.historicalValue.toLocaleString()}
                          </span>
                        </td>

                        {/* Status - Read Only */}
                        <td 
                          className="px-3 md:px-6 py-3 md:py-4 cursor-pointer"
                          onClick={() => setSelectedBatch(batch)}
                        >
                          <StatusBadge status={batch.status} />
                        </td>

                        {/* Response % */}
                        <td 
                          className="px-3 md:px-6 py-3 md:py-4 cursor-pointer hidden sm:table-cell"
                          onClick={() => setSelectedBatch(batch)}
                        >
                          <span className="text-sm font-medium text-[#2F80ED]">
                            {batch.responseRate}%
                          </span>
                        </td>

                        {/* Conversion % */}
                        <td 
                          className="px-3 md:px-6 py-3 md:py-4 cursor-pointer hidden sm:table-cell"
                          onClick={() => setSelectedBatch(batch)}
                        >
                          <span className="text-sm font-medium text-[#F2C94C]">
                            {batch.conversionRate}%
                          </span>
                        </td>

                        {/* Created Date */}
                        <td 
                          className="px-3 md:px-6 py-3 md:py-4 text-sm text-gray-600 cursor-pointer hidden lg:table-cell"
                          onClick={() => setSelectedBatch(batch)}
                        >
                          {batch.createdDate}
                        </td>
                      </tr>
                        ))}
                        {/* Loading more indicator */}
                        {loadingMore && (
                          <tr>
                            <td colSpan={8} className="px-6 py-8 text-center">
                              <div className="flex items-center justify-center gap-2 text-gray-500">
                                <Loader2 className="w-5 h-5 animate-spin" />
                                <span className="text-sm">Loading more batches...</span>
                              </div>
                            </td>
                          </tr>
                        )}
                        {/* Intersection observer target for infinite scroll */}
                        {!loadingMore && hasMore && (
                          <tr>
                            <td colSpan={8} className="px-6 py-2">
                              <div ref={observerTarget} className="h-1" />
                            </td>
                          </tr>
                        )}
                      </>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Detail Panel */}
          {selectedBatch && (
            <>
              {/* Backdrop */}
              <div 
                className="fixed inset-0 bg-black/20 z-30"
                onClick={() => setSelectedBatch(null)}
              />
              <div className="w-full md:w-1/3 fixed md:relative right-0 top-0 bottom-0 md:bottom-auto animate-in slide-in-from-right duration-300 z-40 md:z-auto">
                <div className="bg-white border-l border-gray-200 shadow-xl h-full overflow-y-auto">
                {/* Header */}
                <div className="p-4 md:p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h2 className="text-xl font-semibold text-gray-900 mb-2">
                        {selectedBatch.batchName}
                      </h2>
                      <div className="flex items-center gap-3 text-sm">
                        {/* Assigned Rep Dropdown */}
                        <div className="relative">
                          <button
                            onClick={() => setShowRepDropdown(!showRepDropdown)}
                            className="flex items-center gap-1 text-gray-600 hover:text-blue-600 cursor-pointer"
                          >
                            {selectedBatch.assignedRep}
                            <ChevronDown className="w-3 h-3" />
                          </button>
                          {showRepDropdown && (
                            <>
                              <div 
                                className="fixed inset-0 z-10" 
                                onClick={() => setShowRepDropdown(false)}
                              />
                              <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-[180px] z-20 max-h-[300px] overflow-y-auto">
                                <button
                                  onClick={() => {
                                    handleUpdateBatch(selectedBatch.id, '0', 'Unassigned');
                                    setShowRepDropdown(false);
                                  }}
                                  className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 transition-colors"
                                  style={{ display: 'none' }}
                                >
                                  Unassigned
                                </button>
                                {employees.map((employee) => (
                                  <button
                                    key={employee.id}
                                    onClick={() => {
                                      handleUpdateBatch(selectedBatch.id, employee.id, employee.full_name);
                                      setShowRepDropdown(false);
                                    }}
                                    className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 transition-colors"
                                  >
                                    {employee.full_name}
                                  </button>
                                ))}
                                {employees.length === 0 && (
                                  <div className="px-3 py-2 text-sm text-gray-500">
                                    No employees found
                                  </div>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                        <span className="text-gray-400">•</span>
                        {/* Status - Read Only */}
                        <StatusBadge status={selectedBatch.status} />
                      </div>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-gray-500">Created: {selectedBatch.createdDate}</p>
                    <p className="text-sm text-gray-500">Assigned: {selectedBatch.assignedDate}</p>
                  </div>
                </div>

                {/* Batch Summary */}
                <div className="p-6 space-y-6">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-4">Batch Summary</h3>
                    
                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div className="bg-emerald-50 rounded-lg p-4 border border-emerald-100">
                        <p className="text-xs text-emerald-700 mb-1">Reactivated Revenue</p>
                        <p className="text-lg font-semibold text-emerald-900">
                          ${selectedBatch.reactivatedRevenue.toLocaleString()}
                        </p>
                      </div>
                      <div className="bg-amber-50 rounded-lg p-4 border border-amber-100">
                        <p className="text-xs text-amber-700 mb-1">Conversion Rate</p>
                        <p className="text-lg font-semibold text-amber-900">
                          {selectedBatch.conversionRate}%
                        </p>
                      </div>
                    </div>

                    {/* View Batch Customers Button */}
                    <a 
                      href={`https://admin.hebesbychloe.com//customer?id-batch=${selectedBatch.id}`}
                      className="w-full px-4 py-2.5 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors flex items-center justify-center gap-2 mb-6"
                    >
                      <Users className="w-4 h-4" />
                      View Batch Customers
                    </a>

                    <div className="space-y-3 mb-6">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Contacted</span>
                        <span className="font-medium text-gray-900">{selectedBatch.contacted}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Responded</span>
                        <span className="font-medium text-gray-900">{selectedBatch.responded}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Purchased</span>
                        <span className="font-medium text-gray-900">{selectedBatch.purchased}</span>
                      </div>
                    </div>

                    {/* Response Rate Progress */}
                    <div className="mb-6">
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-gray-600">Response Rate</span>
                        <span className="font-semibold text-[#2F80ED]">
                          {selectedBatch.responseRate}%
                        </span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#2F80ED] rounded-full transition-all duration-500"
                          style={{ width: `${selectedBatch.responseRate}%` }}
                        />
                      </div>
                    </div>

                    {/* Historical Value and Batch Size at bottom */}
                    <div className="grid grid-cols-2 gap-4 mt-6 pt-6 border-t border-gray-200">
                      <div className="bg-emerald-50 rounded-lg p-4 border border-emerald-100">
                        <p className="text-xs text-emerald-700 mb-1">Historical Value</p>
                        <p className="text-lg font-semibold text-emerald-900">
                          ${selectedBatch.historicalValue.toLocaleString()}
                        </p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                        <p className="text-xs text-gray-600 mb-1">Batch Size</p>
                        <p className="text-lg font-semibold text-gray-900">
                          {selectedBatch.batchSize}
                        </p>
                      </div>
                    </div>
                  </div>

                </div>
              </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

