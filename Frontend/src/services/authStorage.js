import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'matinee_auth_token';
const USER_KEY = 'matinee_auth_user';

export const authStorage = {
  async saveSession(token, user) {
    try {
      await SecureStore.setItemAsync(TOKEN_KEY, token);
      if (user) {
        await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
      }
    } catch (err) {
      console.warn('Could not save session to SecureStore:', err);
    }
  },

  async getToken() {
    try {
      return await SecureStore.getItemAsync(TOKEN_KEY);
    } catch (err) {
      console.warn('Could not retrieve token from SecureStore:', err);
      return null;
    }
  },

  async getUser() {
    try {
      const data = await SecureStore.getItemAsync(USER_KEY);
      return data ? JSON.parse(data) : null;
    } catch (err) {
      console.warn('Could not retrieve user from SecureStore:', err);
      return null;
    }
  },

  async clearSession() {
    try {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
      await SecureStore.deleteItemAsync(USER_KEY);
    } catch (err) {
      console.warn('Could not clear session from SecureStore:', err);
    }
  }
};
