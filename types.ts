export type Role = 'admin' | 'staff';

export interface User {
  id: number;
  username: string;
  role: Role;
  full_name: string;
}

export interface AttendanceRecord {
  id: number;
  user_id: number;
  timestamp: string;
  type: 'in' | 'out';
  note: string;
  full_name?: string;
}
