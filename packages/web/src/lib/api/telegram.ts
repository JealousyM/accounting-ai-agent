import axios from 'axios';
import { API_URL } from '@/lib/config';

const getAuthHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem('token')}`,
});

export interface TelegramStatus {
  linked: boolean;
  username?: string;
  firstName?: string;
  telegramId?: number;
}

export const getTelegramStatus = async (): Promise<TelegramStatus> => {
  const response = await axios.get(`${API_URL}/api/telegram/status`, {
    headers: getAuthHeaders(),
  });
  return response.data.data;
};

export const linkTelegram = async (code: string): Promise<TelegramStatus> => {
  const response = await axios.post(
    `${API_URL}/api/telegram/link`,
    { code },
    { headers: getAuthHeaders() }
  );
  return response.data.data;
};

export const unlinkTelegram = async (): Promise<void> => {
  await axios.delete(`${API_URL}/api/telegram/link`, {
    headers: getAuthHeaders(),
  });
};
