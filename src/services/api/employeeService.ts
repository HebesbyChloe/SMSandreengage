import { API_BASE_URL, API_ENDPOINTS, fetchWithConfig } from './config';
import { Employee } from '../../types/batch';

export interface EmployeesResponse {
  success: boolean;
  data: Employee[];
  message: string;
}

export const employeeService = {
  /**
   * Fetch employees by team
   * GET /employee-api.php/Sales
   */
  async getEmployeesByTeam(team: string = 'Sales'): Promise<Employee[]> {
    const url = `${API_BASE_URL}/employee-api.php/${team}`;
    const data: EmployeesResponse = await fetchWithConfig(url);
    
    return data.data || [];
  }
};

