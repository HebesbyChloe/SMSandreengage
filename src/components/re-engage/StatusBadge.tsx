import { Batch } from '../../types/batch';

interface StatusBadgeProps {
  status: Batch['status'];
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const styles = {
    new: 'bg-gray-100 text-gray-600',
    assigned: 'bg-blue-50 text-blue-700',
    in_progress: 'bg-amber-50 text-amber-700',
    done: 'bg-emerald-50 text-emerald-700'
  };

  const labels = {
    new: 'New',
    assigned: 'Assigned',
    in_progress: 'In Progress',
    done: 'Done'
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}

