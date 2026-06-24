import React, { useState, useEffect } from 'react';
import { auth, db } from './firebase/config';
import {
  signInWithCustomToken,
  signInAnonymously,
  onAuthStateChanged
} from 'firebase/auth';
import {
  collection,
  doc,
  setDoc,
  getDocs,
  onSnapshot,
  updateDoc,
  deleteDoc
} from 'firebase/firestore';
import {
  Users, UserCheck, Shield, Wifi, WifiOff, Phone,
  CheckCircle, AlertTriangle, Bell, Download, FileSpreadsheet,
  Mail, Trash2, Edit, Plus, Database, FolderTree, Send,
  FileText, LogIn, LogOut, Check, RefreshCw, Upload, AlertCircle,
  Info, Settings, Key, User, Lock, Clock, CheckSquare, Eye, EyeOff, X
} from 'lucide-react';
import { ErrorBoundary, getErrorMessage, logError } from './utils/errorHandler';
import { APP_CONFIG, DEFAULT_CREDENTIALS, FIRESTORE_PATHS, USER_ROLES } from './utils/constants';
import { validateWhatsAppNumber, validateFormData } from './utils/validators';

const appId = APP_CONFIG.APP_ID;

export default function App() {
  // Autentikasi & Jaringan
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // State Portal Login
  const [loginRole, setLoginRole] = useState('walikelas');
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');

  // Sesi User Aktif
  const [sessionUser, setSessionUser] = useState(null);
  const [currentTab, setCurrentTab] = useState('dashboard');

  // Database State
  const [students, setStudents] = useState([]);
  const [attendances, setAttendances] = useState([]);
  const [userCredentials, setUserCredentials] = useState([]);
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);

  // Antrean Sinkronisasi & Log Sistem
  const [syncQueue, setSyncQueue] = useState([]);
  const [apiLogs, setApiLogs] = useState([
    { time: new Date().toLocaleTimeString(), type: 'system', message: 'Sistem Sinkronisasi Multi-Perangkat Wali Kelas Pintar Siap.' }
  ]);

  // UI Feedback
  const [toastNotification, setToastNotification] = useState(null);
  const [customConfirm, setCustomConfirm] = useState({ show: false, title: '', message: '', onConfirm: null });

  // State Form Siswa & Import CSV
  const [newStudent, setNewStudent] = useState({ nisn: '', nama: '', parent_whatsapp: '' });
  const [waCheckLoading, setWaCheckLoading] = useState(false);
  const [waCheckStatus, setWaCheckStatus] = useState(null);
  const [csvText, setCsvText] = useState('');
  const [showImportModal, setShowImportModal] = useState(false);
  const [realTimeNotification, setRealTimeNotification] = useState(null);
  const [emailStatus, setEmailStatus] = useState(null);

  // State Pengelolaan Kredensial Baru
  const [managedUsername, setManagedUsername] = useState('');
  const [managedPassword, setManagedPassword] = useState('');
  const [managedName, setManagedName] = useState('');
  const [managedClass, setManagedClass] = useState('Kelas XII RPL A');

  // State Form Edit Profil Mandiri
  const [profileName, setProfileName] = useState('');
  const [profileUsername, setProfileUsername] = useState('');
  const [profilePassword, setProfilePassword] = useState('');
  const [profileNip, setProfileNip] = useState('');
  const [profileWa, setProfileWa] = useState('');
  const [profileClass, setProfileClass] = useState('');

  // Sinkronisasi Sesi Profil ketika user berganti tab
  useEffect(() => {
    if (sessionUser) {
      setProfileName(sessionUser.name || '');
      setProfileUsername(sessionUser.username || '');
      setProfilePassword(sessionUser.password || '');
      setProfileNip(sessionUser.nip || '');
      setProfileWa(sessionUser.waGuru || '');
      setProfileClass(sessionUser.class || '');
    }
  }, [sessionUser]);

  // Monitor Koneksi Internet
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      showToast('success', 'Koneksi internet terhubung kembali!');
      addLog('system', 'Koneksi internet terdeteksi online.');
    };
    const handleOffline = () => {
      setIsOnline(false);
      showToast('info', 'Mode offline aktif. Perubahan disimpan di penyimpanan lokal.');
      addLog('system', 'Perangkat kehilangan koneksi.');
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Show Toast Notification
  const showToast = (type, message) => {
    setToastNotification({ type, message });
    setTimeout(() => {
      setToastNotification(null);
    }, 4000);
  };

  const addLog = (type, message) => {
    setApiLogs(prev => [{ time: new Date().toLocaleTimeString(), type, message }, ...prev].slice(0, 30));
  };

  // Suara Alarm (Web Audio API)
  const playAlarmSound = () => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const playTone = (freq, duration, delay) => {
        setTimeout(() => {
          const oscillator = audioCtx.createOscillator();
          const gainNode = audioCtx.createGain();
          oscillator.connect(gainNode);
          gainNode.connect(audioCtx.destination);
          oscillator.type = 'sine';
          oscillator.frequency.value = freq;
          gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
          gainNode.gain.linearRampToValueAtTime(0.4, audioCtx.currentTime + 0.05);
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);
          oscillator.start();
          oscillator.stop(audioCtx.currentTime + duration);
        }, delay * 1000);
      };
      playTone(587.33, 0.25, 0);
      playTone(659.25, 0.25, 0.12);
      playTone(880.00, 0.4, 0.24);
      addLog('websocket', '🔊 Alarm pemberitahuan diputar.');
    } catch (e) {
      console.warn('Web Audio API diblokir browser.', e);
    }
  };

  // ==========================================
  // AUTENTIKASI UTAMA & INTEGRASI FIRESTORE
  // ==========================================
  useEffect(() => {
    const initAuthAndSync = async () => {
      if (!auth || !db) {
        setAuthLoading(false);
        loadMockData();
        return;
      }

      try {
        setAuthLoading(true);
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) {
        logError('auth', 'Firebase Auth gagal, menggunakan sandbox lokal.', err);
        loadMockData();
      } finally {
        setAuthLoading(false);
      }
    };

    initAuthAndSync();
  }, []);

  // Sinkronisasi data real-time dengan Firestore
  useEffect(() => {
    if (!auth || !db) return;

    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      if (!firebaseUser) return;

      addLog('system', `Pangkalan data cloud berhasil diamankan.`);

      try {
        // Sinkronisasi Users
        const usersCol = collection(db, ...FIRESTORE_PATHS.USERS(appId).split('/'));
        const unsubUsers = onSnapshot(usersCol, (snapshot) => {
          const list = [];
          snapshot.forEach(doc => list.push({ id: doc.id, ...doc.data() }));

          if (list.length === 0) {
            seedDefaultCredentials();
          } else {
            setUserCredentials(list);
            if (sessionUser) {
              const updatedSelf = list.find(u => u.id === sessionUser.id);
              if (updatedSelf && JSON.stringify(updatedSelf) !== JSON.stringify(sessionUser)) {
                setSessionUser(updatedSelf);
                addLog('system', 'Profil diperbarui otomatis dari Cloud database.');
              }
            }
          }
        }, (err) => {
          logError('firestore', 'Sync users error', err);
          loadMockData();
        });

        // Sinkronisasi Siswa
        const studentsCol = collection(db, ...FIRESTORE_PATHS.STUDENTS(appId).split('/'));
        const unsubStudents = onSnapshot(studentsCol, (snapshot) => {
          const list = [];
          snapshot.forEach(doc => list.push({ id: Number(doc.id) || doc.id, ...doc.data() }));
          setStudents(list.sort((a, b) => a.nama.localeCompare(b.nama)));
        }, (err) => {
          logError('firestore', 'Sync students error', err);
        });

        // Sinkronisasi Absensi
        const attendancesCol = collection(db, ...FIRESTORE_PATHS.ATTENDANCES(appId).split('/'));
        const unsubAttendances = onSnapshot(attendancesCol, (snapshot) => {
          const list = [];
          snapshot.forEach(doc => list.push({ id: doc.id, ...doc.data() }));

          if (list.length > 0 && attendances.length > 0) {
            const latestDbItem = list[list.length - 1];
            const existLocally = attendances.some(a => a.id === latestDbItem.id);

            if (!existLocally && latestDbItem.status !== 'Hadir' && sessionUser?.role === 'walikelas') {
              addLog('websocket', `📩 Absensi baru masuk dari perangkat Ketua Kelas!`);
              playAlarmSound();
              setRealTimeNotification({
                sender: 'Ketua Kelas (Operator)',
                time: new Date().toLocaleTimeString(),
                date: latestDbItem.date,
                absentList: [`Siswa: ${latestDbItem.student_id} (${latestDbItem.status})`]
              });
            }
          }
          setAttendances(list);
        }, (err) => {
          logError('firestore', 'Sync attendances error', err);
        });

        return () => {
          unsubUsers();
          unsubStudents();
          unsubAttendances();
        };
      } catch (err) {
        logError('firestore', 'Sync setup error', err);
      }
    });

    return () => unsubscribeAuth();
  }, [user, attendances.length, sessionUser]);

  // Seeding Kredensial Default
  const seedDefaultCredentials = async () => {
    if (!db) return;
    addLog('system', 'Menyediakan kredensial bawaan ke cloud database...');

    try {
      for (const cred of DEFAULT_CREDENTIALS) {
        await setDoc(doc(db, ...FIRESTORE_PATHS.USERS(appId).split('/'), cred.id), cred);
      }
      addLog('system', 'Kredensial default berhasil disimpan.');
    } catch (err) {
      logError('firestore', 'Seed credentials error', err);
    }
  };

  // Mock Sandbox Offline
  const loadMockData = () => {
    addLog('system', 'Berjalan menggunakan database sandbox lokal.');
    setUserCredentials(DEFAULT_CREDENTIALS);
    setStudents([
      { id: 1, nisn: '0054321011', nama: 'Aditya Pratama', parent_whatsapp: '081288889999', is_wa_valid: true },
      { id: 2, nisn: '0054321012', nama: 'Budi Santoso', parent_whatsapp: '089876543210', is_wa_valid: true },
      { id: 3, nisn: '0054321013', nama: 'Citra Kirana', parent_whatsapp: '085211223344', is_wa_valid: true },
      { id: 4, nisn: '0054321014', nama: 'Dedi Kurniawan', parent_whatsapp: '081399001122', is_wa_valid: true },
      { id: 5, nisn: '0054321015', nama: 'Elisa Fitriani', parent_whatsapp: '087766554433', is_wa_valid: false }
    ]);
    setAttendances([
      { id: 'att_1_today', student_id: 1, status: 'Hadir', keterangan: '', is_synced: true, date: attendanceDate },
      { id: 'att_2_today', student_id: 2, status: 'Alpa', keterangan: 'Tanpa kabar', is_synced: true, date: attendanceDate },
      { id: 'att_3_today', student_id: 3, status: 'Terlambat', keterangan: 'Ban bocor', is_synced: true, date: attendanceDate },
      { id: 'att_4_today', student_id: 4, status: 'Hadir', keterangan: '', is_synced: true, date: attendanceDate },
      { id: 'att_5_today', student_id: 5, status: 'Sakit', keterangan: 'Surat sakit', is_synced: true, date: attendanceDate }
    ]);
  };

  // ==========================================
  // AUTENTIKASI PORTAL LOGIN
  // ==========================================
  const handleLoginSubmit = (e) => {
    e.preventDefault();
    setLoginError('');

    const validation = validateFormData(
      { usernameInput, passwordInput },
      ['usernameInput', 'passwordInput']
    );

    if (!validation.isValid) {
      setLoginError('Harap lengkapi isian username dan password!');
      return;
    }

    const matchedAccount = userCredentials.find(
      u => u.username === usernameInput && u.password === passwordInput && u.role === loginRole
    );

    if (matchedAccount) {
      setSessionUser(matchedAccount);
      addLog('system', `Sesi pengguna ${matchedAccount.name} berhasil diinisialisasi.`);

      if (matchedAccount.role === 'admin') {
        setCurrentTab('users');
      } else if (matchedAccount.role === 'walikelas') {
        setCurrentTab('dashboard');
      } else {
        setCurrentTab('absensi');
      }

      setUsernameInput('');
      setPasswordInput('');
      showToast('success', `Selamat datang kembali, ${matchedAccount.name}!`);
    } else {
      setLoginError('Username, Password, atau Peran tidak cocok!');
      addLog('system', `⚠️ Percobaan masuk gagal: ${usernameInput}`);
    }
  };

  const handleLogout = () => {
    showToast('info', 'Anda telah keluar dari aplikasi.');
    addLog('system', `Sesi ${sessionUser.name} berakhir.`);
    setSessionUser(null);
    setCurrentTab('dashboard');
  };

  // ==========================================
  // UPDATE PROFIL MANDIRI
  // ==========================================
  const handleUpdateOwnProfile = async (e) => {
    e.preventDefault();
    if (!profileName) {
      showToast('error', 'Nama Lengkap wajib diisi!');
      return;
    }

    const finalUsername = sessionUser.role === 'admin' ? profileUsername : sessionUser.username;
    const finalPassword = sessionUser.role === 'admin' ? profilePassword : sessionUser.password;

    if (sessionUser.role === 'admin' && (!profileUsername || !profilePassword)) {
      showToast('error', 'Admin wajib melengkapi kolom Username dan Password!');
      return;
    }

    if (sessionUser.role === 'admin' && profileUsername !== sessionUser.username) {
      const isTaken = userCredentials.some(u => u.username === profileUsername && u.id !== sessionUser.id);
      if (isTaken) {
        showToast('error', 'Username baru tersebut telah terdaftar di sistem!');
        return;
      }
    }

    const updatedProfile = {
      ...sessionUser,
      name: profileName,
      username: finalUsername,
      password: finalPassword,
      ...(sessionUser.role === 'walikelas' && { nip: profileNip, waGuru: profileWa }),
      ...(sessionUser.role === 'ketuakelas' && { class: profileClass })
    };

    if (isOnline && db) {
      try {
        await setDoc(doc(db, ...FIRESTORE_PATHS.USERS(appId).split('/'), sessionUser.id), updatedProfile);
        addLog('api_req', `Memperbarui data profil ID: ${sessionUser.id} ke cloud.`);
        showToast('success', 'Profil Anda berhasil diperbarui & disinkronkan ke Cloud!');
      } catch (err) {
        logError('firestore', 'Update profile error', err);
        showToast('error', getErrorMessage(err));
      }
    } else {
      setUserCredentials(prev => prev.map(u => u.id === sessionUser.id ? updatedProfile : u));
      addLog('indexeddb', `Penyimpanan offline: Profil diperbarui secara lokal.`);
      showToast('success', 'Perubahan disimpan sementara di penyimpanan lokal!');
    }

    setSessionUser(updatedProfile);
  };

  // ==========================================
  // MANAJEMEN AKUN ATASAN -> BAWAHAN
  // ==========================================
  const handleCreateCredential = async (e) => {
    e.preventDefault();
    if (!managedUsername || !managedPassword || !managedName) {
      showToast('error', 'Semua kolom isian pembuatan akun wajib diisi!');
      return;
    }

    const isTaken = userCredentials.some(u => u.username === managedUsername);
    if (isTaken) {
      showToast('error', 'Username tersebut sudah terpakai di sistem!');
      return;
    }

    const targetRole = sessionUser.role === 'admin' ? 'walikelas' : 'ketuakelas';
    const newCredId = 'u_' + Date.now();
    const newCred = {
      id: newCredId,
      username: managedUsername,
      password: managedPassword,
      name: managedName,
      role: targetRole,
      ...(targetRole === 'walikelas'
        ? { waGuru: '081234567890', nip: '19850311 201001 1 003' }
        : { class: managedClass }
      )
    };

    if (isOnline && db) {
      try {
        await setDoc(doc(db, ...FIRESTORE_PATHS.USERS(appId).split('/'), newCredId), newCred);
        addLog('api_req', `Menyimpan akun ${targetRole} baru ke cloud.`);
        showToast('success', `Sukses membuat akun ${targetRole} baru!`);
      } catch (err) {
        logError('firestore', 'Create credential error', err);
        showToast('error', getErrorMessage(err));
      }
    } else {
      setUserCredentials(prev => [...prev, newCred]);
      addLog('indexeddb', `Offline! Akun disimpan sementara di memori lokal.`);
      showToast('success', 'Akun login baru berhasil dibuat secara lokal.');
    }

    setManagedUsername('');
    setManagedPassword('');
    setManagedName('');
  };

  const triggerDeleteCredential = (id, name, targetRole) => {
    if (sessionUser.role === 'admin' && targetRole !== 'walikelas') {
      showToast('error', 'Akses ditolak! Admin hanya dapat menghapus akun Wali Kelas.');
      return;
    }
    if (sessionUser.role === 'walikelas' && targetRole !== 'ketuakelas') {
      showToast('error', 'Akses ditolak! Wali Kelas hanya dapat menghapus akun Ketua Kelas.');
      return;
    }

    setCustomConfirm({
      show: true,
      title: `Hapus Akun ${targetRole === 'walikelas' ? 'Wali Kelas' : 'Ketua Kelas'}`,
      message: `Apakah Anda sepenuhnya yakin ingin menghapus akun login milik "${name}"? Tindakan ini tidak dapat dibatalkan.`,
      onConfirm: async () => {
        if (isOnline && db) {
          try {
            await deleteDoc(doc(db, ...FIRESTORE_PATHS.USERS(appId).split('/'), id));
            showToast('success', `Akun berhasil dihapus dari cloud.`);
          } catch (err) {
            logError('firestore', 'Delete credential error', err);
            showToast('error', getErrorMessage(err));
          }
        } else {
          setUserCredentials(prev => prev.filter(u => u.id !== id));
          showToast('success', 'Akun berhasil dihapus secara lokal dari memori.');
        }
        setCustomConfirm({ show: false, title: '', message: '', onConfirm: null });
      }
    });
  };

  // ==========================================
  // INTEGRASI WHATSAPP & VALIDASI
  // ==========================================
  const validateWhatsAppNumberAsync = async (number) => {
    setWaCheckLoading(true);
    addLog('api_req', `POST /api/wa-gateway/verify - Mengecek keaktifan nomor ${number}...`);

    return new Promise((resolve) => {
      setTimeout(() => {
        const isValid = validateWhatsAppNumber(number);
        setWaCheckLoading(false);
        if (isValid) {
          addLog('api_resp', `✅ WA Checker: Nomor ${number} Aktif.`);
          resolve(true);
        } else {
          addLog('api_resp', `❌ WA Checker: Nomor ${number} Tidak Terdaftar.`);
          resolve(false);
        }
      }, 1000);
    });
  };

  const handleAddStudent = async (e) => {
    e.preventDefault();
    if (!newStudent.nisn || !newStudent.nama || !newStudent.parent_whatsapp) {
      showToast('error', 'Silakan lengkapi seluruh isian siswa!');
      return;
    }

    const isWaActive = await validateWhatsAppNumberAsync(newStudent.parent_whatsapp);
    if (!isWaActive) {
      setWaCheckStatus('invalid');
      showToast('error', 'Validasi Gagal! Nomor WhatsApp Orang Tua tidak aktif.');
      return;
    }

    setWaCheckStatus('valid');
    const createdStudent = {
      id: Date.now(),
      nisn: newStudent.nisn,
      nama: newStudent.nama,
      parent_whatsapp: newStudent.parent_whatsapp,
      is_wa_valid: true
    };

    if (isOnline && db) {
      try {
        await setDoc(doc(db, ...FIRESTORE_PATHS.STUDENTS(appId).split('/'), String(createdStudent.id)), createdStudent);
        showToast('success', 'Siswa baru berhasil didaftarkan ke pangkalan cloud!');
      } catch (err) {
        logError('firestore', 'Add student error', err);
        showToast('error', getErrorMessage(err));
      }
    } else {
      setStudents(prev => [...prev, createdStudent]);
      showToast('success', 'Profil siswa disimpan sementara di database lokal.');
    }

    setNewStudent({ nisn: '', nama: '', parent_whatsapp: '' });
    setWaCheckStatus(null);
  };

  const triggerDeleteStudent = (studentId, studentName) => {
    setCustomConfirm({
      show: true,
      title: 'Hapus Data Siswa',
      message: `Apakah Anda sepenuhnya yakin ingin menghapus data murid atas nama "${studentName}"? Seluruh riwayat presensi yang terhubung juga akan terhapus.`,
      onConfirm: async () => {
        if (isOnline && db) {
          try {
            await deleteDoc(doc(db, ...FIRESTORE_PATHS.STUDENTS(appId).split('/'), String(studentId)));
            showToast('success', 'Data siswa berhasil dihapus dari sistem.');
          } catch (err) {
            logError('firestore', 'Delete student error', err);
            showToast('error', getErrorMessage(err));
          }
        } else {
          setStudents(prev => prev.filter(s => s.id !== studentId));
          showToast('success', 'Siswa berhasil dihapus secara lokal.');
        }
        setCustomConfirm({ show: false, title: '', message: '', onConfirm: null });
      }
    });
  };

  // ==========================================
  // WORKFLOW PRESENSI
  // ==========================================
  const handleSaveAttendanceRecord = async (studentId, status, keterangan = '') => {
    const existingAttId = `att_${studentId}_${attendanceDate}`;
    const newRecord = {
      id: existingAttId,
      student_id: studentId,
      status: status,
      keterangan: keterangan,
      date: attendanceDate,
      is_synced: isOnline
    };

    if (isOnline && db) {
      try {
        await setDoc(doc(db, ...FIRESTORE_PATHS.ATTENDANCES(appId).split('/'), existingAttId), newRecord);
        addLog('api_req', `Sinkronisasi absensi siswa ID ${studentId} (${status}) sukses.`);
      } catch (err) {
        logError('firestore', 'Save attendance error', err);
      }
    } else {
      setAttendances(prev => {
        const filtered = prev.filter(a => !(a.student_id === studentId && a.date === attendanceDate));
        return [...filtered, newRecord];
      });
      setSyncQueue(prev => [...prev, { type: 'attendance', data: newRecord }]);
      addLog('indexeddb', `Menyimpan data presensi lokal.`);
    }
  };

  const sendWhatsAppConfirmation = (student, status, keterangan) => {
    const formatPesan = `${student.nama} - ${status} (${keterangan || 'Tanpa keterangan tambahan'})`;
    addLog('api_req', `Mengirim pesan otomatis WA Orang Tua...`);

    setTimeout(() => {
      addLog('api_resp', `Laporan WA Terkirim ke nomor ${student.parent_whatsapp}: "${formatPesan}"`);
      showToast('success', `Laporan konfirmasi terkirim ke Orang Tua ${student.nama}!`);
    }, 600);
  };

  const handleCsvImport = () => {
    if (!csvText.trim()) return;
    try {
      const lines = csvText.split('\n');
      const imported = [];
      lines.forEach((line, i) => {
        if (!line.trim() || i === 0 && line.toLowerCase().includes('nama')) return;
        const cols = line.split(/[;,]/);
        if (cols.length >= 3) {
          imported.push({
            id: Date.now() + i,
            nisn: cols[0].trim(),
            nama: cols[1].trim(),
            parent_whatsapp: cols[2].trim(),
            is_wa_valid: true
          });
        }
      });

      if (imported.length > 0) {
        imported.forEach(async (std) => {
          if (isOnline && db) {
            try {
              await setDoc(doc(db, ...FIRESTORE_PATHS.STUDENTS(appId).split('/'), String(std.id)), std);
            } catch (err) {
              logError('firestore', 'Import student error', err);
            }
          } else {
            setStudents(prev => [...prev, std]);
          }
        });
        showToast('success', `Berhasil mengimpor ${imported.length} data siswa.`);
        setShowImportModal(false);
        setCsvText('');
      }
    } catch (e) {
      logError('csv', 'CSV import error', e);
      showToast('error', 'Format impor tidak dikenali oleh sistem.');
    }
  };

  const exportToExcel = () => {
    let content = "REKAPITULASI ABSENSI DAN KETERLAMBATAN BULANAN\n";
    content += `Dicetak oleh: ${sessionUser?.name}\n\n`;
    content += "No;NISN;Nama Siswa;Status Kehadiran;Alasan;Verifikasi WA\n";

    students.forEach((std, i) => {
      const att = attendances.find(a => a.student_id === std.id && a.date === attendanceDate);
      const status = att ? att.status : 'Hadir';
      const ket = att ? (att.keterangan || '-') : '-';
      content += `${i+1};${std.nisn};${std.nama};${status};${ket};${std.is_wa_valid ? 'VALID' : 'INVALID'}\n`;
    });

    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Rekap_Presensi_${attendanceDate}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('success', 'Spreadsheet Excel (.csv) berhasil diunduh.');
  };

  const handlePrintPDF = () => {
    const printWindow = window.open('', '_blank');
    const rows = students.map((std, i) => {
      const att = attendances.find(a => a.student_id === std.id && a.date === attendanceDate);
      return `
        <tr>
          <td style="border: 1px solid #cbd5e1; padding: 10px; text-align: center;">${i+1}</td>
          <td style="border: 1px solid #cbd5e1; padding: 10px;">${std.nisn}</td>
          <td style="border: 1px solid #cbd5e1; padding: 10px; font-weight: bold;">${std.nama}</td>
          <td style="border: 1px solid #cbd5e1; padding: 10px; text-align: center;">
            <span style="padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: bold;">${att ? att.status : 'Hadir'}</span>
          </td>
          <td style="border: 1px solid #cbd5e1; padding: 10px; font-style: italic;">${att ? (att.keterangan || 'Nihil') : 'Hadir Tepat Waktu'}</td>
        </tr>
      `;
    }).join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>Laporan Absensi & Keterlambatan Kelas</title>
          <style>
            body { font-family: 'Segoe UI', sans-serif; margin: 40px; color: #1e293b; }
            h2 { text-align: center; color: #1e3a8a; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th { background-color: #f1f5f9; border: 1px solid #cbd5e1; padding: 12px; }
          </style>
        </head>
        <body>
          <h2>LAPORAN KEHADIRAN & KETERLAMBATAN SISWA</h2>
          <p><strong>Dicetak oleh:</strong> ${sessionUser?.name} (${sessionUser?.role.toUpperCase()})</p>
          <table>
            <thead>
              <tr>
                <th>No</th>
                <th>NISN</th>
                <th>Nama Siswa</th>
                <th>Status Kehadiran</th>
                <th>Alasan / Keterangan</th>
              </tr>
            </thead>
            <tbody>
              ${rows}
            </tbody>
          </table>
          <script>window.print();</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleSendEmailReport = () => {
    setEmailStatus('sending');
    addLog('api_req', 'POST /api/smtp/send-report - Mengirim laporan ke email pimpinan...');
    setTimeout(() => {
      setEmailStatus('success');
      addLog('api_resp', 'SMTP Server: Email laporan absensi berhasil dikirim.');
      showToast('success', 'Laporan berhasil dikirim ke email Kepala Sekolah!');
      setTimeout(() => setEmailStatus(null), 3000);
    }, 1200);
  };

  // ==========================================
  // UI RENDERING
  // ==========================================
  if (!sessionUser) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-4 relative overflow-hidden font-sans">
        <div className="absolute top-0 left-0 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-violet-600/10 rounded-full blur-3xl translate-x-1/2 translate-y-1/2"></div>

        <div className="w-full max-w-md bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-3xl p-8 shadow-2xl relative z-10">
          <div className="text-center mb-8">
            <div className="inline-flex bg-gradient-to-tr from-indigo-500 to-violet-500 p-3.5 rounded-2xl shadow-xl shadow-indigo-500/20 mb-4">
              <Users className="h-7 w-7 text-white" />
            </div>
            <h1 className="text-2xl font-black tracking-tight bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
              Wali Kelas Pintar
            </h1>
            <p className="text-xs text-slate-400 mt-1 font-medium">Sistem Monitoring Presensi Terintegrasi &amp; Real-Time</p>
          </div>

          <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-950 rounded-2xl border border-slate-800/80 mb-6">
            {[
              { id: 'walikelas', label: 'Wali Kelas', icon: User },
              { id: 'ketuakelas', label: 'Ketua Kelas', icon: Clock },
              { id: 'admin', label: 'Admin', icon: Shield }
            ].map(roleItem => {
              const IconComp = roleItem.icon;
              return (
                <button
                  key={roleItem.id}
                  onClick={() => {
                    setLoginRole(roleItem.id);
                    setLoginError('');
                  }}
                  className={`flex flex-col items-center gap-1 py-2.5 rounded-xl text-[11px] font-bold transition-all ${
                    loginRole === roleItem.id
                      ? 'bg-gradient-to-b from-indigo-600 to-indigo-700 text-white shadow-lg'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <IconComp className="h-4 w-4" />
                  {roleItem.label}
                </button>
              );
            })}
          </div>

          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Username</label>
              <div className="relative">
                <input
                  type="text"
                  value={usernameInput}
                  onChange={(e) => setUsernameInput(e.target.value)}
                  placeholder="Masukkan username..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
                />
                <User className="h-4.5 w-4.5 text-slate-600 absolute left-3.5 top-3.5" />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="Masukkan password..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-10 py-3 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
                />
                <Lock className="h-4.5 w-4.5 text-slate-600 absolute left-3.5 top-3.5" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3.5 text-slate-500 hover:text-slate-300"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {loginError && (
              <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs p-3 rounded-xl flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{loginError}</span>
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 px-4 rounded-xl text-sm transition-all shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 mt-2 cursor-pointer"
            >
              <LogIn className="h-4.5 w-4.5" />
              Masuk Sistem
            </button>
          </form>

          <div className="border-t border-slate-800/80 mt-6 pt-4 text-center">
            <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Kredensial Demo Sandbox:</span>
            <div className="grid grid-cols-3 gap-2 mt-2 text-[10px] text-slate-400 bg-slate-950/80 p-2 rounded-xl">
              <div>
                <p className="font-bold text-indigo-400">Wali Kelas</p>
                <p>walikelas12</p>
                <p>walipassword</p>
              </div>
              <div>
                <p className="font-bold text-violet-400">Ketua Kelas</p>
                <p>ketua12</p>
                <p>ketuapassword</p>
              </div>
              <div>
                <p className="font-bold text-teal-400">Admin</p>
                <p>admin</p>
                <p>adminpassword</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Main workspace akan dilanjutkan di file terpisah
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans antialiased">
      {/* TOAST SYSTEM */}
      {toastNotification && (
        <div className="fixed top-4 right-4 z-50 animate-fade-in">
          <div className={`flex items-center gap-2.5 px-4 py-3 rounded-2xl shadow-2xl border ${
            toastNotification.type === 'success' ? 'bg-slate-900 border-emerald-500/30 text-emerald-400' :
            toastNotification.type === 'error' ? 'bg-slate-900 border-rose-500/30 text-rose-400' :
            'bg-slate-900 border-cyan-500/30 text-cyan-400'
          }`}>
            {toastNotification.type === 'success' ? <CheckCircle className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
            <span className="text-xs font-bold">{toastNotification.message}</span>
          </div>
        </div>
      )}

      {/* Placeholder untuk workspace - akan di-refactor menjadi component terpisah */}
      <div className="flex-1 flex items-center justify-center">
        <p className="text-slate-400">Workspace sedang dimuat...</p>
      </div>
    </div>
  );
}
