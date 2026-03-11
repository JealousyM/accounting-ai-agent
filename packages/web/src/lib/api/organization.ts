import axios from 'axios';
import { API_URL } from '@/lib/config';

const getAuthHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem('token')}`,
});

export interface OrgMember {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  orgRole: 'admin' | 'member';
  orgMembershipStatus: 'active' | 'pending' | 'rejected';
  createdAt: string;
}

export interface OrganizationData {
  id: string;
  name: string;
  createdAt: string;
  members: OrgMember[];
  pendingMembers: OrgMember[];
  currentUserRole: 'admin' | 'member' | null;
  adminNames?: string;
}

export const getOrganization = async (): Promise<OrganizationData | null> => {
  const response = await axios.get(`${API_URL}/api/organization`, {
    headers: getAuthHeaders(),
  });
  return response.data.data;
};

export const updateOrgName = async (name: string): Promise<void> => {
  await axios.put(
    `${API_URL}/api/organization/name`,
    { name },
    { headers: getAuthHeaders() }
  );
};

export const withdrawRequest = async (): Promise<void> => {
  await axios.post(
    `${API_URL}/api/organization/withdraw`,
    {},
    { headers: getAuthHeaders() }
  );
};

export const leaveOrganization = async (): Promise<void> => {
  await axios.post(
    `${API_URL}/api/organization/leave`,
    {},
    { headers: getAuthHeaders() }
  );
};

export const approveMember = async (userId: string): Promise<void> => {
  await axios.post(
    `${API_URL}/api/organization/members/${userId}/approve`,
    {},
    { headers: getAuthHeaders() }
  );
};

export const rejectMember = async (userId: string): Promise<void> => {
  await axios.post(
    `${API_URL}/api/organization/members/${userId}/reject`,
    {},
    { headers: getAuthHeaders() }
  );
};

export const removeMember = async (userId: string): Promise<void> => {
  await axios.delete(`${API_URL}/api/organization/members/${userId}`, {
    headers: getAuthHeaders(),
  });
};

export const promoteMember = async (userId: string): Promise<void> => {
  await axios.post(
    `${API_URL}/api/organization/members/${userId}/promote`,
    {},
    { headers: getAuthHeaders() }
  );
};

export const demoteMember = async (userId: string): Promise<void> => {
  await axios.post(
    `${API_URL}/api/organization/members/${userId}/demote`,
    {},
    { headers: getAuthHeaders() }
  );
};

export const joinOrganization = async (name: string): Promise<void> => {
  await axios.post(
    `${API_URL}/api/organization/join`,
    { name },
    { headers: getAuthHeaders() }
  );
};
