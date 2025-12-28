import { AccountFormData, LogEntry, CreatedAccount } from '../types';

export const generateStrongPassword = (): string => {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
  let password = "";
  for (let i = 0; i < 14; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
};

export const validateForm = (data: AccountFormData): string | null => {
  if (!data.email || !data.email.includes('@')) return "Invalid email address.";
  if (!data.password || data.password.length < 6) return "Password is too short.";
  
  const y = parseInt(data.birthYear);
  const m = parseInt(data.birthMonth);
  const d = parseInt(data.birthDay);

  if (isNaN(y) || isNaN(m) || isNaN(d)) return "Invalid date of birth.";
  if (y < 1900 || y > new Date().getFullYear()) return "Invalid birth year.";
  
  return null;
};

/**
 * Tries to create an account via the local Node.js backend.
 * If backend is offline, throws error to fallback to simulation.
 */
export const createAccountViaBackend = async (
  data: AccountFormData,
  proxy: string | null,
  addLog: (message: string, type: LogEntry['type']) => void
): Promise<CreatedAccount | null> => {
  
    addLog("Handshaking with Backend (http://localhost:3001)...", "network");

    try {
        const response = await fetch('http://localhost:3001/api/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...data, proxy })
        });

        const result = await response.json();

        // Merge backend logs into frontend UI
        if (result.logs && Array.isArray(result.logs)) {
            result.logs.forEach((l: any) => {
                // Add slight delay to logs so they don't appear all at once
                setTimeout(() => addLog(l.message, l.type), 100);
            });
        }

        if (result.success) {
            return {
                email: data.email,
                pass: data.password,
                birth: `${data.birthYear}-${data.birthMonth}-${data.birthDay}`,
                gender: data.gender,
                country: 'US' // Real country would come from backend response
            };
        } else {
            addLog(`Backend failed: ${result.error}`, "error");
            return null;
        }

    } catch (e) {
        throw new Error("Backend unavailable");
    }
};

/**
 * SIMULATION FALLBACK (Giữ lại logic cũ để demo nếu không chạy backend)
 */
export const simulateAccountCreation = async (
  data: AccountFormData, 
  proxy: string | null,
  addLog: (message: string, type: LogEntry['type']) => void
): Promise<CreatedAccount | null> => {
  
  const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
  const randomDelay = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1) + min);

  try {
    addLog("--- SIMULATION DRIVER STARTED ---", "info");
    
    if (proxy) {
      addLog(`[PROXY] Connecting to ${proxy.split(':')[0]}...`, "warning");
      await wait(randomDelay(400, 800));
      addLog("Proxy Handshake: HTTP/2 200 OK", "info");
    }

    addLog("GET /v1/clienttoken (iOS 8.9.10)...", "network");
    await wait(randomDelay(800, 1200));
    addLog(`ClientToken: ${Math.random().toString(36).substring(7).toUpperCase()}... [OK]`, "info");

    addLog(`Checking availability: ${data.email}`, "network");
    await wait(randomDelay(600, 900));
    
    addLog("Initializing Arkose Labs (Funcaptcha)...", "info");
    await wait(randomDelay(2000, 4000));
    addLog("Captcha Solved: 44215.11215.1215...", "success");

    addLog("POST /signup/public/v2/account/create", "network");
    await wait(randomDelay(1000, 1500));

    addLog("HTTP 200 OK - Created", "success");
    
    return {
      email: data.email,
      pass: data.password,
      birth: `${data.birthYear}-${data.birthMonth}-${data.birthDay}`,
      gender: data.gender,
      country: 'US (Simulated)'
    };

  } catch (error: any) {
    addLog(`Error: ${error.message}`, "error");
    return null;
  }
};