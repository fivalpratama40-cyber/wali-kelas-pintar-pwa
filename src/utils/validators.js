/**
 * Input Validation Utilities
 */

/**
 * Validate WhatsApp number format
 * @param {string} number - Phone number to validate
 * @returns {boolean} True if valid
 */
export const validateWhatsAppNumber = (number) => {
  // Must be digits only, at least 10 digits, not ending with 0
  const regex = /^\d{10,}$/;
  return regex.test(number) && !number.endsWith('0');
};

/**
 * Validate NISN (Nomor Induk Siswa Nasional)
 * @param {string} nisn - NISN to validate
 * @returns {boolean} True if valid
 */
export const validateNISN = (nisn) => {
  return /^\d{10}$/.test(nisn);
};

/**
 * Validate NIP (Nomor Induk Pegawai)
 * @param {string} nip - NIP to validate
 * @returns {boolean} True if valid
 */
export const validateNIP = (nip) => {
  return /^\d{18}$/.test(nip) || nip === '';
};

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean} True if valid
 */
export const validateEmail = (email) => {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
};

/**
 * Validate username format
 * @param {string} username - Username to validate
 * @returns {boolean} True if valid
 */
export const validateUsername = (username) => {
  // Alphanumeric and underscore, 3-20 characters
  return /^[a-zA-Z0-9_]{3,20}$/.test(username);
};

/**
 * Validate password strength
 * @param {string} password - Password to validate
 * @returns {object} Validation result with score and feedback
 */
export const validatePasswordStrength = (password) => {
  let score = 0;
  const feedback = [];

  if (password.length >= 8) score++; else feedback.push('Minimal 8 karakter');
  if (/[A-Z]/.test(password)) score++; else feedback.push('Tambahkan huruf besar');
  if (/[a-z]/.test(password)) score++; else feedback.push('Tambahkan huruf kecil');
  if (/\d/.test(password)) score++; else feedback.push('Tambahkan angka');
  if (/[^a-zA-Z0-9]/.test(password)) score++; else feedback.push('Tambahkan simbol');

  return {
    score,
    strength: score < 2 ? 'Lemah' : score < 4 ? 'Sedang' : 'Kuat',
    feedback
  };
};

/**
 * Sanitize CSV input
 * @param {string} csvText - Raw CSV text
 * @returns {array} Parsed rows
 */
export const parseCSV = (csvText) => {
  const lines = csvText.trim().split('\n');
  const rows = [];

  lines.forEach((line, index) => {
    if (!line.trim() || (index === 0 && line.toLowerCase().includes('nama'))) {
      return; // Skip header or empty lines
    }

    const cols = line.split(/[;,]/).map(col => col.trim());
    if (cols.length >= 3) {
      rows.push({
        nisn: cols[0],
        nama: cols[1],
        parent_whatsapp: cols[2]
      });
    }
  });

  return rows;
};

/**
 * Validate form data completeness
 * @param {object} data - Form data
 * @param {array} requiredFields - Required field names
 * @returns {object} Validation result with errors
 */
export const validateFormData = (data, requiredFields) => {
  const errors = {};

  requiredFields.forEach(field => {
    if (!data[field] || (typeof data[field] === 'string' && !data[field].trim())) {
      errors[field] = `${field} wajib diisi`;
    }
  });

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};
