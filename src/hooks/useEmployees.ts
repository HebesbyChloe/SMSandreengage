import { useState, useEffect } from 'react';
import { Employee } from '../types/batch';
import { employeeService } from '../services/api/employeeService';

export const useEmployees = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true); // Start as true

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const data = await employeeService.getEmployeesByTeam('Sales');
        if (data && data.length > 0) {
          setEmployees(data);
        }
      } catch (error) {
        // If API fails, keep employees empty
        setEmployees([]);
      } finally {
        setLoading(false);
      }
    };

    fetchEmployees();
  }, []);

  return { employees, loading };
};

