import React from 'react';

/**
 * Error Handler & Mapper untuk User-Friendly Messages
 */

const ERROR_MESSAGES = {
  'permission-denied': 'Anda tidak memiliki akses untuk melakukan tindakan ini.',
  'unavailable': 'Layanan cloud tidak tersedia. Silakan coba lagi dalam beberapa saat.',
  'quota-exceeded': 'Kuota database telah terlampaui. Hubungi administrator.',
  'resource-exhausted': 'Terlalu banyak permintaan. Silakan tunggu sebentar.',
  'unauthenticated': 'Sesi Anda telah berakhir. Silakan login kembali.',
  'invalid-argument': 'Data yang dikirim tidak valid. Periksa kembali input Anda.',
  'not-found': 'Data tidak ditemukan.',
  'already-exists': 'Data sudah ada di sistem.',
  'network-error': 'Periksa koneksi internet Anda.',
  'timeout': 'Permintaan melampaui waktu tunggu. Silakan coba lagi.',
  'unknown': 'Terjadi kesalahan tidak terduga. Silakan coba lagi atau hubungi support.'
};

/**
 * Get user-friendly error message
 * @param {Error} error - Error object
 * @returns {string} User-friendly error message
 */
export const getErrorMessage = (error) => {
  if (!error) return ERROR_MESSAGES['unknown'];

  // Firestore error code
  if (error.code && ERROR_MESSAGES[error.code]) {
    return ERROR_MESSAGES[error.code];
  }

  // Firebase auth error
  if (error.message) {
    if (error.message.includes('auth')) return 'Gagal authentikasi. Periksa username dan password.';
    if (error.message.includes('network')) return ERROR_MESSAGES['network-error'];
    if (error.message.includes('timeout')) return ERROR_MESSAGES['timeout'];
  }

  return ERROR_MESSAGES['unknown'];
};

/**
 * Log error untuk debugging
 * @param {string} context - Error context (api_req, api_resp, system, etc.)
 * @param {string} message - Log message
 * @param {Error} error - Error object (optional)
 */
export const logError = (context, message, error = null) => {
  const timestamp = new Date().toLocaleTimeString('id-ID');
  const logEntry = {
    timestamp,
    context,
    message,
    error: error ? { code: error.code, message: error.message } : null
  };

  console.error(`[${context}] ${message}`, error);

  // Simpan ke IndexedDB untuk debugging production
  if (typeof window !== 'undefined' && window.indexedDB) {
    try {
      const request = indexedDB.open('WaliKelasLogs', 1);
      request.onsuccess = (event) => {
        const db = event.target.result;
        const transaction = db.transaction(['logs'], 'readwrite');
        const objectStore = transaction.objectStore('logs');
        objectStore.add(logEntry);
      };
    } catch (e) {
      console.warn('Tidak bisa menyimpan log ke IndexedDB:', e);
    }
  }
};

/**
 * Retry mechanism untuk failed operations
 * @param {Function} fn - Async function to retry
 * @param {number} maxAttempts - Maximum retry attempts (default: 3)
 * @param {number} delayMs - Delay between retries in ms (default: 1000)
 * @returns {Promise} Result from successful execution
 */
export const retryAsync = async (fn, maxAttempts = 3, delayMs = 1000) => {
  let lastError;

  for (let i = 0; i < maxAttempts; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (i < maxAttempts - 1) {
        console.warn(`Attempt ${i + 1} failed, retrying in ${delayMs}ms...`, error.message);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  }

  logError('retry', `Failed after ${maxAttempts} attempts`, lastError);
  throw lastError;
};

/**
 * Error Boundary Component
 */
export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    logError('error-boundary', `React error caught: ${error.message}`, error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 max-w-md">
            <h1 className="text-lg font-bold text-rose-400 mb-2">⚠️ Terjadi Kesalahan</h1>
            <p className="text-xs text-slate-400 mb-4">
              Aplikasi mengalami masalah yang tidak terduga. Silakan refresh halaman atau coba lagi.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-4 py-2 rounded-xl"
            >
              Refresh Halaman
            </button>
            <p className="text-[10px] text-slate-600 mt-3 font-mono break-all">
              Error: {this.state.error?.message}
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
