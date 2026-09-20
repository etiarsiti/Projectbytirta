import PayrollIndonesiaV23 from '../payroll/PayrollIndonesiaV23';
import { useEffect, useMemo, useState, type FormEvent, type ReactNode, type CSSProperties } from 'react';
import { isSupabaseConfigured, supabase } from '../../../lib/supabase/client';
import { signIn, signOut } from '../../../lib/auth';
import { rupiah as money } from '../../../lib/hris';
import { canDelete, canWrite, hasPermission } from '../../../lib/security';
import '../../../styles/admin/admin.css';
import MasterData from '../employee/MasterData';
import { PayrollEnterprise, RecruitmentEnterprise, RoleEditorEnterprise, ApprovalCenter } from '../enterprise/EnterpriseModules';
import { PayrollEngineV9 } from '../payroll/PayrollEngineV9';
import Employee360 from '../employee/Employee360';
import HRISCore from '../core/HRISCore';
import ProductionHR from '../payroll/ProductionHR';
import EnterpriseV20 from '../enterprise/EnterpriseV20';
import SecurityCenterV21 from '../security/SecurityCenterV21';
import PayrollProductionV22 from '../payroll/PayrollProductionV22';
import RecruitmentATSv25 from '../recruitment/RecruitmentATSv25';
import EnterpriseRoadmapV26V35 from '../enterprise/EnterpriseRoadmapV26V35';
import moonLogo from '../../../assets/moon-logo.svg';
import IDCardModule from '../employee/IDCardModule';
import '../../../styles/admin/id-card.css';
import { useTranslation } from '../../../locales/LanguageContext';

type Karyawan = {
  id: string;
  id_karyawan?: string;
  nama: string;
  jabatan?: string;
  departemen?: string;
  email?: string;
  no_telp?: string;
  alamat_rumah?: string;
  nik_ktp?: string;
  gaji_pokok?: number;
  tanggal_lahir?: string;
  tanggal_masuk?: string;
  status_aktif?: boolean;
  status_karyawan?: string;
  role?: string;
  auth_user_id?: string | null;
  email_terverifikasi?: boolean;
};

interface Absensi {
  id?: string | number;
  id_karyawan?: string;
  nama?: string;
  tanggal?: string;
  jam_masuk?: string;
  jam_pulang?: string;
  total_jam?: string;
  status?: string;
  lokasi?: string;
  lokasi_masuk?: string;
  keterlambatan_menit?: number | string;
  lembur_menit?: number | string;
  foto?: string;
  selfie_masuk?: string;
}

type MenuKey =
  | 'overview' | 'employees' | 'employee-360' | 'employee-add' | 'id-card' | 'organization' | 'hr-operations'
  | 'attendance' | 'attendance-today' | 'late' | 'leave' | 'overtime' | 'selfie'
  | 'schedule' | 'shift' | 'holiday' | 'leave-request' | 'leave-balance' | 'approvals'
  | 'payroll' | 'production-hr' | 'payroll-engine' | 'payroll-production-v22' | 'payroll-components' | 'payroll-overtime' | 'payslip'
  | 'performance' | 'kpi' | 'recruitment-v25' | 'recruitment' | 'candidates'
  | 'reports' | 'settings' | 'roles' | 'audit' | 'notifications' | 'system-health'
  | 'professional-suite' | 'enterprise-v20' | 'security-v21' | 'payroll-indonesia-v23'
  | `enterprise-v${26 | 27 | 28 | 29 | 30 | 31 | 32 | 33 | 34 | 35}`;

const isoToday = () => new Date().toISOString().slice(0, 10);

const rolePermissions: Record<string, string[]> = {
  'Super Admin': ['*'],
  'Admin': ['people', 'attendance', 'schedule', 'leave', 'payroll', 'talent', 'reports', 'system'],
  'HRD': ['people', 'attendance', 'schedule', 'leave', 'talent', 'reports'],
  'Payroll': ['people.read', 'attendance.read', 'payroll', 'reports.payroll'],
  'Supervisor': ['people.read', 'attendance.read', 'schedule.read', 'leave.read', 'leave.approve', 'reports.attendance'],
  'Karyawan': []
};

const menuGroup = (key: MenuKey) => 
  ['professional-suite'].includes(key) ? 'system' : 
  ['employees', 'id-card', 'employee-360', 'employee-add', 'organization'].includes(key) ? 'people' : 
  ['attendance', 'attendance-today', 'late', 'leave', 'overtime', 'selfie'].includes(key) ? 'attendance' : 
  ['schedule', 'shift', 'holiday'].includes(key) ? 'schedule' : 
  ['leave-request', 'leave-balance', 'approvals'].includes(key) ? 'leave' : 
  ['payroll', 'payroll-components', 'payroll-overtime', 'payslip', 'production-hr', 'payroll-engine', 'payroll-production-v22'].includes(key) ? 'payroll' : 
  ['performance', 'kpi'].includes(key) ? 'talent' : 
  ['recruitment', 'candidates', 'recruitment-v25'].includes(key) ? 'recruitment' : 
  ['enterprise-v26', 'enterprise-v27', 'enterprise-v28', 'enterprise-v29', 'enterprise-v30', 'enterprise-v31', 'enterprise-v32', 'enterprise-v33', 'enterprise-v34', 'enterprise-v35'].includes(key) ? 'system' : 
  key === 'reports' ? 'reports' : 
  key === 'settings' ? 'settings' : 
  key === 'roles' ? 'roles' : 
  key === 'audit' ? 'audit' : 
  key === 'notifications' ? 'notifications' : 
  key === 'system-health' ? 'system' : 
  (key === 'enterprise-v26' || key === 'payroll-indonesia-v23' || key === 'security-v21') ? 'system' : 'overview';

const requiredPermission = (key: MenuKey) => {
  if (key === 'professional-suite') return 'system.health';
  if (key === 'hr-operations') return 'people.read';
  if (key === 'production-hr' || key === 'payroll-engine' || key === 'payroll-production-v22') return 'payroll.read';
  
  const g = menuGroup(key); 
  if (key === 'employee-add') return 'people.write'; 
  if (key === 'roles') return 'roles.read'; 
  if (key === 'settings') return 'settings.write'; 
  if (key === 'audit') return 'audit.read'; 
  if (key === 'approvals') return 'approval.read'; 
  if (key === 'notifications') return 'notifications.read'; 
  if (key === 'system-health') return 'system.health';
  if ((key === 'enterprise-v26' || key === 'payroll-indonesia-v23')) return 'system.health'; 
  if (key === 'security-v21') return 'security.read'; 
  if (key.startsWith('enterprise-v')) return 'system.health'; 
  if (key === 'overtime') return 'overtime.read'; 
  if (key === 'reports') return 'reports.read'; 
  if (g === 'recruitment') return 'recruitment.read'; 
  if (g === 'talent') return 'talent.read'; 
  return g === 'overview' ? '' : `${g}.read`;
};

const menuPermissionForRole = (key: MenuKey, role: string, dbPerms: string[] = []) => {
  if (role === 'Super Admin' || requiredPermission(key) === '' || dbPerms.includes('*')) return true;
  const req = requiredPermission(key);
  if (key === 'approvals') return ['approval.read', 'leave.approve', 'overtime.approve', 'payroll.approve', 'recruitment.approve'].some(p => hasPermission(dbPerms, p, role) || hasPermission(rolePermissions[role] || [], p, role));
  return hasPermission(dbPerms, req, role) || hasPermission(dbPerms, menuGroup(key), role) || hasPermission(rolePermissions[role] || [], req, role) || hasPermission(rolePermissions[role] || [], menuGroup(key), role);
};

function Icon({ name }: { name: string }) {
  const paths: Record<string, string> = {
    chevronDown: 'M6 9l6 6 6-6', chevronRight: 'M9 6l6 6-6 6', logout: 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4m7 14 5-5-5-5m5 5H9', menu: 'M4 6h16M4 12h16M4 18h16', refresh: 'M20 11a8 8 0 1 0 1 4m-1-4v-5m0 5h-5', search: 'M11 19a8 8 0 1 1 0-16 8 8 0 0 1 0 16m10 2-4.3-4.3', home: 'M3 10.5 12 3l9 7.5V21a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z', users: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8m6-3a4 4 0 0 1 4 4m-1-8a3 3 0 0 1 0 6', plus: 'M12 5v14M5 12h14', org: 'M4 4h16v16H4zM8 8h3v3H8zm5 0h3v3h-3zM8 13h3v3H8zm5 0h3v3h-3z', clock: 'M12 7v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0', check: 'm5 12 4 4L19 6', alert: 'M12 9v4m0 4h.01M10.3 3.9 2.7 17a2 2 0 0 0 1.7 3h15.2a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0', leave: 'M7 3h10v18H7zM10 12h7m0 0-3-3m3 3-3 3', arrow: 'M5 12h14m-6-6 6 6-6 6', camera: 'M4 7h3l2-2h6l2 2h3v12H4zM12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8', calendar: 'M4 5h16v16H4zM8 3v4m8-4v4M4 10h16', shift: 'M6 4h12v16H6zM9 8h6M9 12h6M9 16h4', holiday: 'M12 2l2.6 6.3 6.8.5-5.2 4.4 1.6 6.6-5.8-3.5-5.8 3.5 1.6-6.6-5.2-4.4 6.8-.5z', request: 'M6 3h12v18H6zM9 8h6M9 12h6M9 16h4', balance: 'M5 4h14v16H5zM9 8h6M9 12h3', payroll: 'M5 4h14v16H5zM8 8h8M8 12h8M8 16h5', components: 'M5 5h14M5 12h14M5 19h14', kpi: 'M5 20V10m7 10V4m7 16v-7', recruitment: 'M4 6h16v12H4zM8 10h8M8 14h5', report: 'M5 4h14v16H5zM8 9h8M8 13h8M8 17h5', settings: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8m0-6v3m0 14v3m10-10h-3M5 12H2m17.1-7.1-2.1 2.1M7 17l-2.1 2.1m12.2 0L15 17M7 7 4.9 4.9', bell: 'M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9m-8 13h6', health: 'M20 12h-4l-2 7-4-14-2 7H4', card: 'M5 4h14v16H5zM8 8h8M8 12h5M8 16h8', dashboard: 'M4 4h6v6H4zm10 0h6v6h-6zM4 14h6v6H4zm10 0h6v6h-6z'
  };
  const d = paths[name] || paths.home; 
  return <svg className="ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d}/></svg>;
}
export default function DashboardAdmin() {
  const { lang, setLang, t } = useTranslation();

  // 1. Deklarasi State diletakkan paling atas di dalam komponen
  const [logged, setLogged] = useState(false);
  const [email, setEmail] = useState('');
  const [pin, setPin] = useState('');
  const [menu, setMenu] = useState<MenuKey>('overview');
  const [sidebar, setSidebar] = useState(true);
  const [employees, setEmployees] = useState<Karyawan[]>([]);
  const [attendance, setAttendance] = useState<Absensi[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [editing, setEditing] = useState<Karyawan | null>(null);
  const [userRole, setUserRole] = useState('');
  const [dbPerms, setDbPerms] = useState<string[]>([]);
  const [sessionChecking, setSessionChecking] = useState(true);
  const [roleOpen, setRoleOpen] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  // 2. Deklarasi menuGroups
  const menuGroups = useMemo(() => [
    {
      title: 'UTAMA',
      items: [
        ['overview', t('dashboard') || 'Overview', 'home'] as [MenuKey, string, string],
        ['professional-suite', 'Professional Suite', 'kpi'] as [MenuKey, string, string]
      ]
    },
    {
      title: 'PEOPLE',
      items: [
        ['employees', t('employees') || 'Semua Karyawan', 'users'] as [MenuKey, string, string],
        ['id-card', 'ID Card', 'card'] as [MenuKey, string, string],
        ['employee-360', 'Employee 360°', 'users'] as [MenuKey, string, string],
        ['employee-add', t('add_employee') || 'Tambah Karyawan', 'plus'] as [MenuKey, string, string],
        ['organization', 'Organisasi', 'org'] as [MenuKey, string, string],
        ['hr-operations', 'HR Operations', 'settings'] as [MenuKey, string, string]
      ]
    },
    {
      title: 'ATTENDANCE',
      items: [
        ['attendance', 'Rekap Absensi', 'clock'] as [MenuKey, string, string],
        ['attendance-today', 'Absensi Hari Ini', 'check'] as [MenuKey, string, string],
        ['late', 'Keterlambatan', 'alert'] as [MenuKey, string, string],
        ['leave', 'Izin & Sakit', 'leave'] as [MenuKey, string, string],
        ['overtime', 'Lembur', 'arrow'] as [MenuKey, string, string],
        ['selfie', 'Monitoring Selfie', 'camera'] as [MenuKey, string, string]
      ]
    },
    {
      title: 'PAYROLL',
      items: [
        ['payroll', 'Monthly Payroll', 'payroll'] as [MenuKey, string, string],
        ['production-hr', 'HR Transaction Center', 'settings'] as [MenuKey, string, string],
        ['payroll-engine', t('payroll_calc') || 'Payroll Calculation', 'payroll'] as [MenuKey, string, string],
        ['payroll-production-v22', t('payroll_control') || 'Payroll Control', 'payroll'] as [MenuKey, string, string],
        ['payroll-components', 'Salary Components', 'components'] as [MenuKey, string, string],
        ['payroll-overtime', 'Overtime Payroll', 'arrow'] as [MenuKey, string, string],
        ['payslip', 'Payslip', 'calendar'] as [MenuKey, string, string]
      ]
    },
    {
      title: 'TALENT',
      items: [
        ['performance', 'Performance', 'arrow'] as [MenuKey, string, string],
        ['kpi', 'KPI & Target', 'kpi'] as [MenuKey, string, string],
        ['recruitment-v25', 'Recruitment ATS Enterprise', 'recruitment'] as [MenuKey, string, string],
        ['recruitment', 'Recruitment Legacy', 'recruitment'] as [MenuKey, string, string],
        ['candidates', 'Kandidat', 'users'] as [MenuKey, string, string]
      ]
    },
    {
      title: 'ENTERPRISE SUITE',
      items: [
        ['enterprise-v26', 'Documents & Compliance', 'request'] as [MenuKey, string, string],
        ['enterprise-v27', 'Performance & KPI', 'kpi'] as [MenuKey, string, string],
        ['enterprise-v28', 'HR Analytics & BI', 'kpi'] as [MenuKey, string, string],
        ['enterprise-v29', 'HR Inbox', 'bell'] as [MenuKey, string, string],
        ['enterprise-v30', 'ESS Enterprise', 'users'] as [MenuKey, string, string],
        ['enterprise-v31', 'QA & Testing', 'check'] as [MenuKey, string, string],
        ['enterprise-v32', 'Production Optimization', 'settings'] as [MenuKey, string, string],
        ['enterprise-v33', 'Multi-Company', 'org'] as [MenuKey, string, string],
        ['enterprise-v34', 'API & Integrations', 'settings'] as [MenuKey, string, string],
        ['enterprise-v35', 'AI HR & Automation', 'kpi'] as [MenuKey, string, string]
      ]
    },
    {
      title: 'REPORTING',
      items: [
        ['reports', 'Laporan', 'report'] as [MenuKey, string, string]
      ]
    },
    {
      title: 'SYSTEM',
      items: [
        ['enterprise-v20', 'Enterprise Command Center', 'org'] as [MenuKey, string, string],
        ['payroll-indonesia-v23', 'Payroll Indonesia Compliance', 'payroll'] as [MenuKey, string, string],
        ['security-v21', 'Security Center', 'health'] as [MenuKey, string, string],
        ['approvals', 'Pusat Persetujuan', 'check'] as [MenuKey, string, string],
        ['notifications', 'Notifikasi', 'bell'] as [MenuKey, string, string],
        ['system-health', 'System Health', 'health'] as [MenuKey, string, string],
        ['settings', t('settings') || 'Pengaturan', 'settings'] as [MenuKey, string, string],
        ['roles', 'Role & Permission', 'users'] as [MenuKey, string, string],
        ['audit', 'Audit Log', 'request'] as [MenuKey, string, string]
      ]
    }
  ], [t]);

  const visibleMenuGroups = useMemo(() =>
    menuGroups
      .map((group) => ({
        ...group,
        items: group.items.filter((item) =>
          menuPermissionForRole(item[0], userRole, dbPerms)
        ),
      }))
      .filter((group) => group.items.length > 0),
    [menuGroups, userRole, dbPerms]
  );

  useEffect(() => {
    let active = true;
    const loadSession = async () => {
      setSessionChecking(true);
      if (!isSupabaseConfigured) { setError('Supabase belum dikonfigurasi. Isi VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY pada environment deployment.'); setSessionChecking(false); return; }
      const { data } = await supabase.auth.getUser();
      if (!active) return;
      if (data.user?.email) {
        const { data: p } = await supabase.from('hris_users').select('role,status').eq('email', data.user.email).maybeSingle();
        if (active && p?.status === 'Aktif') {
          setUserRole(p.role || '');
          const { data: rp } = await supabase.from('hris_role_permissions').select('permission_code').eq('role_name', p.role);
          if (active) { setDbPerms((rp || []).map(x => x.permission_code)); setEmail(data.user.email); setLogged(true); }
        } else if (active) { await supabase.auth.signOut(); setLogged(false); }
      }
      if (active) setSessionChecking(false);
    };
    loadSession();
    if (!isSupabaseConfigured) return () => { active = false };
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session) { setLogged(false); setUserRole(''); setDbPerms([]); setSessionChecking(false); }
    });
    return () => { active = false; listener.subscription.unsubscribe() };
  }, []);

  useEffect(() => { if (logged) refresh() }, [logged]);
  useEffect(() => { const read = () => { const candidate = location.hash.replace('#/', '') as MenuKey; if (candidate && menuGroups.flatMap(g => g.items).some(x => x[0] === candidate) && menuPermissionForRole(candidate, userRole, dbPerms)) setMenu(candidate) }; read(); window.addEventListener('hashchange', read); return () => window.removeEventListener('hashchange', read) }, [userRole, dbPerms, menuGroups]);
  
  const navigate = (next: MenuKey) => { setMenu(next); location.hash = `/${next}`; if (window.innerWidth < 900) setSidebar(false) };

  async function confirmEmployeeEmail(employee: Karyawan) {
    if (!employee.email) {
      setError('Karyawan belum memiliki email.');
      return;
    }

    const confirmed = window.confirm(
      `Aktifkan akun karyawan?\n\n` +
      `Nama: ${employee.nama}\n` +
      `ID: ${employee.id_karyawan || '-'}\n` +
      `Email: ${employee.email}\n\n` +
      `Jika akun belum ada, sistem akan otomatis membuat akun Supabase Auth.`
    );

    if (!confirmed) return;

    try {
      setError('');
      setLoading(true);

      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;

      const accessToken = sessionData.session?.access_token;
      if (!accessToken) throw new Error('Sesi login HR/Admin tidak ditemukan. Silakan login ulang.');

      const response = await fetch('/.netlify/functions/confirm-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ employee_id: employee.id }),
      });

      let result: { success?: boolean; account_created?: boolean; message?: string; error?: string; temporary_password?: string; email?: string; nama?: string } = {};
      try { result = await response.json(); } catch { result = {}; }

      if (!response.ok) throw new Error(result.error || result.message || 'Gagal membuat akun karyawan.');

      if (result.success && result.account_created && result.temporary_password) {
        window.alert(
          `AKUN KARYAWAN BERHASIL DIBUAT\n\n` +
          `Nama: ${result.nama || employee.nama}\n` +
          `Email: ${result.email || employee.email}\n\n` +
          `PASSWORD SEMENTARA:\n` +
          `${result.temporary_password}\n\n` +
          `Berikan email dan password ini kepada karyawan.`
        );
      } else {
        window.alert(result.message || `Akun ${employee.nama} berhasil diaktifkan.`);
      }

      setToast(result.message || 'Akun karyawan berhasil diaktifkan.');
      await refresh();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Gagal membuat akun karyawan.';
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  async function refresh() {
    setLoading(true); setError('');
    const [k, a] = await Promise.all([
      supabase.from('karyawan').select('*').order('nama'),
      supabase.from('absensi').select('*').order('created_at', { ascending: false }).limit(2000)
    ]);
    if (k.error) setError(`Karyawan: ${k.error.message}`); else setEmployees(k.data || []);
    if (a.error) setError(v => v ? `${v}\nAbsensi: ${a.error.message}` : `Absensi: ${a.error.message}`); else setAttendance(a.data || []);
    setLoading(false);
  }

  async function login(e: FormEvent) {
    e.preventDefault(); setError('');
    if (!isSupabaseConfigured) { setError('Supabase belum dikonfigurasi. Isi VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY pada environment deployment.'); return }
    setLoading(true);
    const { data, error: e2 } = await signIn(email, pin);
    setLoading(false);
    if (e2 || !data.user) { setError(e2?.message || 'Email atau password tidak valid.'); return; }
    const { data: profile, error: pe } = await supabase.from('hris_users').select('role,status').ilike('email', data.user.email || '').maybeSingle();
    if (pe) { await signOut(); setError('Profil akses HR tidak dapat diverifikasi. Coba lagi atau hubungi administrator.'); return; }
    if (!profile || profile.status !== 'Aktif') {
      await signOut(); setError('Akun tidak memiliki akses Dashboard HR.'); return;
    }
    setUserRole(profile.role);
    const { data: rp } = await supabase.from('hris_role_permissions').select('permission_code').eq('role_name', profile.role);
    setDbPerms((rp || []).map(x => x.permission_code));
    setLogged(true);
  }

  async function removeEmployee(k: Karyawan) {
    if (!menuPermissionForRole('employees', userRole, dbPerms) || !canDelete(dbPerms, 'people', userRole)) { setError('Anda tidak memiliki permission people.delete.'); return }
    if (!confirm(`Hapus ${k.nama}?`)) return;
    const { error: e } = await supabase.from('karyawan').delete().eq('id', k.id);
    if (e) setError(e.message); else { setToast('Karyawan dihapus.'); refresh() }
  }

  async function saveEdit(payload: Record<string, unknown>) {
    if (!canWrite(dbPerms, 'people', userRole)) { setError('Anda tidak memiliki permission people.write.'); return }
    if (!editing) return;
    if (payload.id_karyawan !== undefined) {
      const nextId = String(payload.id_karyawan || '').trim().toUpperCase();
      if (!nextId) { setError('ID Karyawan wajib diisi.'); return; }
      const { data: duplicate } = await supabase.from('karyawan').select('id').eq('id_karyawan', nextId).neq('id', editing.id).maybeSingle();
      if (duplicate) { setError(`ID Karyawan ${nextId} sudah digunakan.`); return; }
      payload.id_karyawan = nextId;
    }
    const { error: e } = await supabase.from('karyawan').update(payload).eq('id', editing.id);
    if (e) setError(e.message); else { setEditing(null); setToast('Data karyawan tersimpan.'); refresh() }
  }

  const filtered = useMemo(() => employees.filter(k => `${k.nama} ${k.id_karyawan || ''} ${k.jabatan || ''} ${k.departemen || ''}`.toLowerCase().includes(search.toLowerCase())), [employees, search]);
  const filteredA = useMemo(() => attendance.filter(a => `${a.nama || ''} ${a.id_karyawan || ''} ${a.status || ''}`.toLowerCase().includes(search.toLowerCase())), [attendance, search]);
  const today = attendance.filter(a => a.tanggal === isoToday());
  const present = today.filter(a => ['Hadir', 'Tepat Waktu', 'Terlambat'].includes(a.status || '')).length;
  const late = today.filter(a => (a.status || '').toLowerCase().includes('terlambat') || Number(a.keterlambatan_menit) > 0).length;
  const payroll = employees.reduce((s, k) => s + Number(k.gaji_pokok || 0), 0);
  const activeLabel = menuGroups.flatMap(g => g.items).find((x) => x[0] === menu)?.[1] || 'Overview';
  
  const exportCsv = (rows: Record<string, unknown>[], filename: string, columns?: string[]) => {
    if (!rows.length) { setToast('Tidak ada data untuk diekspor.'); return; }
    const keys = columns?.length ? columns : Object.keys(rows[0]);
    const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const csv = [keys.join(';'), ...rows.map(r => keys.map(k => esc(r[k])).join(';'))].join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' }));
    a.download = filename;
    a.click(); URL.revokeObjectURL(a.href);
    setToast(`Export ${keys.length} kolom berhasil dibuat.`);
  };

  const exportExcel = (rows: Record<string, unknown>[], filename: string, columns: string[]) => {
    if (!rows.length) { setToast('Tidak ada data untuk diekspor.'); return; }
    const escHtml = (v: unknown) => String(v ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    const html = `<html><head><meta charset="utf-8"></head><body><table><thead><tr>${columns.map(k=>`<th>${escHtml(fieldLabel(k))}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr>${columns.map(k=>`<td>${escHtml(r[k])}</td>`).join('')}</tr>`).join('')}</tbody></table></body></html>`;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([html], { type: 'application/vnd.ms-excel' }));
    a.download = filename; a.click(); URL.revokeObjectURL(a.href);
    setToast('File Excel kompatibel berhasil dibuat.');
  };

  if (sessionChecking) return <div className="login-wrap"><div className="login-card"><div className="loading">Memeriksa sesi keamanan...</div></div></div>;
  if (!logged) return <Login email={email} pin={pin} setEmail={setEmail} setPin={setPin} onSubmit={login} loading={loading} error={error}/>;
  return (
   <div className="talenta-shell">

    <aside className="sidebar">
      <div className="sidebar-head">
        <div className="brand">
          <div className="brand-mark"><img src={moonLogo} alt="Project by Tirta" /></div>
          {sidebar && <div><b>Project by Tirta</b><small>People Platform</small></div>}
        </div>
      </div>

      <nav className="sidebar-nav" aria-label="Menu utama">
  {visibleMenuGroups.map((group) => {
    const visibleItems = group.items.filter((item) =>
      menuPermissionForRole(item[0], userRole, dbPerms)
    );

    if (!visibleItems.length) return null;
return (
            <div className="nav-group" key={group.title}>
              {sidebar && (
                <button
                  type="button"
                  className="nav-title"
                  onClick={() =>
                    setCollapsedGroups((prev) => ({
                      ...prev,
                      [group.title]: !prev[group.title],
                    }))
                  }
                  aria-expanded={!collapsedGroups[group.title]}
                >
                  <span>{group.title}</span>
                  <Icon
                    name={collapsedGroups[group.title] ? 'chevronRight' : 'chevronDown'}
                  />
                </button>
              )}

              {!collapsedGroups[group.title] && (
                <div className="nav-group-items">
                  {visibleItems.map(([key, label, icon]) => (
                    <button
                      key={key}
                      className={`nav-item ${menu === key ? 'active' : ''}`}
                      onClick={() => navigate(key)}
                      title={!sidebar ? label : undefined}
                      type="button"
                    >
                      <Icon name={icon} />
                      {sidebar && <span>{label}</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>

     
      
      {/* ===== BAGIAN BAWAH SIDEBAR (PROFIL, BAHASA, & LOGOUT) ===== */}
      <div className="sidebar-bottom">
        
        {/* Dropdown Pemilih Bahasa */}
        {sidebar && (
  <div
  style={{
    padding: '4px 12px 12px 12px',
    borderBottom: '1px solid #e2e7ee',
    marginBottom: '8px',
  }}
>
    <div style={{
  fontSize: '11px',
  color: '#475467', marginBottom: '4px', fontWeight: 500, letterSpacing: '0.5px' }}>
      BAHASA / LANGUAGE
    </div>
    <select 
      value={lang} 
      onChange={(e) => setLang(e.target.value)}
      style={{ 
        width: '100%', 
        padding: '8px 12px', 
        borderRadius: '8px', 
        border: '1px solid rgba(255, 255, 255, 0.15)', 
        background: 'rgba(255, 255, 255, 0.07)', 
        color: '#ffffff',
        fontSize: '13px', 
        fontWeight: 500,
        outline: 'none',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
      }}
      onMouseOver={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.12)')}
      onMouseOut={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.07)')}
    >
      <option value="id" style={{ background: '#1e293b', color: '#fff' }}>🇮🇩 Indonesia</option>
      <option value="en" style={{ background: '#1e293b', color: '#fff' }}>🇬🇧 English</option>
      <option value="ja" style={{ background: '#1e293b', color: '#fff' }}>🇯🇵 日本語</option>
      <option value="ko" style={{ background: '#1e293b', color: '#fff' }}>🇰🇷 한국어</option>
      <option value="zh" style={{ background: '#1e293b', color: '#fff' }}>🇨🇳 中文</option>
    </select>
  </div>
)}
        {/* Informasi Admin */}
        <div className="admin-mini">
          <div className="avatar">HR</div>
          {sidebar && <div><b>{userRole || 'User'}</b><small>Project by Tirta Access</small></div>}
        </div>

        {/* Tombol Logout */}
        <button className="logout" onClick={async () => {
          await signOut();
          setLogged(false);
          setUserRole('');
          setDbPerms([]);
          setMenu('overview');
          location.hash = '/home';
        }}>
          <Icon name="logout"/>{sidebar && 'Keluar'}
        </button>

      </div>
      {/* ======================================================== */}
    </aside>
   <main className="talenta-main"><header className="topbar">
<button className="icon-btn" aria-label="Buka menu" onClick={()=>setSidebar(v=>!v)}><Icon name="menu"/></button>
<div className="crumb"><span>Project by Tirta</span><b>/</b>{activeLabel}</div>
<div className="floating-role-wrap">
  <button type="button" className="floating-role" onClick={()=>setRoleOpen(v=>!v)} aria-expanded={roleOpen}><span className="role-shield">♜</span><strong>{userRole || 'User'}</strong><Icon name="chevronDown"/></button>
  {roleOpen && <div className="role-menu"><small>ROLE AKTIF</small>{['Super Admin','Admin','HRD','Payroll','Supervisor','Karyawan'].map(r=><button type="button" key={r} className={r===userRole?'selected':''} onClick={()=>{setRoleOpen(false); if(r!==userRole)setToast(`Role ${r} hanya dapat diubah melalui Role & Permission.`)}}>{r===userRole?'✓':' '} {r}</button>)}</div>}
</div>
<div className="top-actions"><div className="search-global"><span><Icon name="search"/></span><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Cari data..."/></div><button className="icon-btn" aria-label="Muat ulang" onClick={()=>refresh()}><Icon name="refresh"/></button><div className="avatar">HR</div></div></header>
    <section className="page">{loading&&<div className="loading">Memuat data…</div>}{error&&<div className="alert">{error}</div>}
    {menu==='overview'&&<Overview employees={employees} attendance={attendance} present={present} late={late} payroll={payroll} onNavigate={navigate}/>}
    {menu==='id-card'&&<IDCardModule employees={employees} companyName="Project by Tirta" logoUrl={moonLogo}/> }
    {menu==='employees'&&<Employees data={filtered} onDelete={removeEmployee} onEdit={setEditing} onExport={(columns, format)=>format==='excel' ? exportExcel(employees as any,'database-karyawan.xls',columns) : exportCsv(employees as any,'database-karyawan.csv',columns)} onAdd={()=>navigate('employee-add')} onConfirmEmail={confirmEmployeeEmail}/> }
    {menu==='employee-360'&&<Employee360 employees={employees}/>}
    {menu==='employee-add'&&<AddEmployee refresh={refresh} onDone={()=>navigate('employees')}/>} {menu==='hr-operations'&&<HRISCore employees={employees}/>} {menu==='production-hr'&&<ProductionHR employees={employees}/>} 
    {menu==='organization'&&<MasterData initialTab="cabang"/>}
    {['attendance','attendance-today','late','leave','overtime','selfie'].includes(menu)&&<AttendanceModule type={menu} data={filteredA} onRefresh={refresh} onExport={()=>exportCsv(attendance as any,'laporan-absensi.csv')}/>}
    {menu==='schedule'&&<MasterData initialTab="jadwal"/>}{menu==='shift'&&<MasterData initialTab="shift"/>}
    {menu==='holiday'&&<HolidayModule/>}
    {['leave-request','leave-balance'].includes(menu)&&<LeaveModule initial={menu}/>}
    {['payroll','payroll-components','payroll-overtime','payslip'].includes(menu)&&<PayrollEnterprise employees={employees}/>}
    {menu==='payroll-engine'&&<PayrollEngineV9/>}{menu==='payroll-production-v22'&&<PayrollProductionV22/>}{menu==='payroll-indonesia-v23'&&<PayrollIndonesiaV23/>}
    {['performance','kpi'].includes(menu)&&<TalentModule initial={menu} employees={employees}/>} {menu==='recruitment-v25'&&<RecruitmentATSv25/>} {menu.startsWith('enterprise-v')&&menu!=='enterprise-v20'&&<EnterpriseRoadmapV26V35 version={menu.replace('enterprise-','') as any}/>} {['recruitment','candidates'].includes(menu)&&<RecruitmentEnterprise/>}
    {menu==='reports'&&<Reports employees={employees} attendance={attendance} onExport={exportCsv}/>}
    {menu==='settings'&&<Settings/>}{menu==='roles'&&<RoleEditorEnterprise userRole={userRole}/>} {menu==='audit'&&<Audit/>}{menu==='approvals'&&<ApprovalCenter/>}{menu==='notifications'&&<Notifications/>} {menu==='system-health'&&<SystemHealth/>}{menu==='enterprise-v20'&&<EnterpriseV20 employees={employees}/>}{menu==='security-v21'&&<SecurityCenterV21/>}  
    {editing&&<EmployeeEditor employee={editing} onClose={()=>setEditing(null)} onSave={saveEdit}/>}
    {toast&&<button className="toast" onClick={()=>setToast('')}>{toast} ×</button>}
      </section>
    </main>
   </div>
  );
};

function Login(p:{email:string;pin:string;setEmail:(v:string)=>void;setPin:(v:string)=>void;onSubmit:(e:FormEvent)=>void;error:string;loading:boolean}){
 return <div className="login-wrap"><div className="login-card"><div className="brand center"><div className="brand-mark"><img src={moonLogo} alt="Project by Tirta" /></div><div><b>Project by Tirta</b><small>People Platform</small></div></div><h1>Selamat datang kembali</h1><p>Masuk ke dashboard HR & payroll.</p><form onSubmit={p.onSubmit}><label>Email<input value={p.email} onChange={e=>p.setEmail(e.target.value)} required/></label><label>PIN / Password<input type="password" value={p.pin} onChange={e=>p.setPin(e.target.value)} required/></label>{p.error&&<div className="form-error">{p.error}</div>}<button className="primary full" disabled={p.loading}>{p.loading?'Memeriksa…':'Masuk ke Dashboard'}</button></form><small className="security-note">Gunakan email dan password Supabase Auth yang diberikan HR.</small></div></div>
}

function Heading({
  title,
  desc,
  action,
  onAction,
}: {
  title: string;
  desc: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <div className="page-heading">
      <div>
        <h1>{title}</h1>
        <p>{desc}</p>
      </div>

      {action && (
        <button className="primary" onClick={onAction}>
          {action}
        </button>
      )}
    </div>
  );
}

function Overview({employees,attendance,present,late,payroll,onNavigate}:{employees:Karyawan[];attendance:Absensi[];present:number;late:number;payroll:number;onNavigate:(m:MenuKey)=>void}){
 const active=employees.filter(k=>k.status_aktif!==false).length;
 const inactive=Math.max(0,employees.length-active);
 const absent=Math.max(0,employees.length-present-late);
 const attendanceRate=employees.length?Math.min(100,Math.round((present/Math.max(1,employees.length))*100)):0;
 const recent=attendance.slice(0,6);
 const dept=employees.reduce<Record<string,number>>((a,k)=>{const d=k.departemen||'Belum diatur';a[d]=(a[d]||0)+1;return a},{});
 const deptRows=Object.entries(dept).sort((a,b)=>b[1]-a[1]).slice(0,5);
 const maxDept=Math.max(1,...deptRows.map(x=>x[1]));
 return <div className="executive-dashboard">
  <Heading title="HR Command Center" desc="Ringkasan workforce, attendance, dan payroll dalam satu pusat kendali." action="Tambah Karyawan" onAction={()=>onNavigate('employee-add')}/>
  <div className="command-strip">
   <div><span className="eyebrow">OPERATIONAL STATUS</span><strong>Sistem HR aktif</strong><small>Data tersinkron dari database</small></div>
   <div className="strip-meta"><span className="status green">Operational</span><span>Update otomatis saat halaman dimuat</span></div>
  </div>
  <div className="stat-grid executive-stats">
   <Stat title="Total Karyawan" value={String(employees.length)} hint={`${active} aktif · ${inactive} nonaktif`} icon="users"/>
   <Stat title="Kehadiran Hari Ini" value={`${attendanceRate}%`} hint={`${present} hadir · ${late} terlambat`} icon="check"/>
   <Stat title="Payroll Workforce" value={money(payroll)} hint="Total gaji pokok" icon="payroll"/>
   <Stat title="Record Absensi" value={String(attendance.length)} hint="Data tersimpan" icon="clock"/>
  </div>
  <div className="dashboard-grid-top">
   <div className="panel executive-chart">
    <div className="panel-head"><div><span className="eyebrow">WORKFORCE</span><h2>Komposisi Workforce</h2><p>Distribusi karyawan berdasarkan departemen.</p></div><button className="link-btn" onClick={()=>onNavigate('employees')}>Buka master</button></div>
    <div className="department-bars">{deptRows.length?deptRows.map(([name,count])=><div className="dept-row" key={name}><div className="dept-label"><span>{name}</span><b>{count}</b></div><div className="progress"><span style={{width:`${Math.round(count/maxDept*100)}%`}}/></div></div>):<div className="empty-module"><h3>Belum ada data workforce</h3><p>Tambahkan karyawan untuk melihat distribusi.</p></div>}</div>
   </div>
   <div className="panel attendance-health">
    <div className="panel-head"><div><span className="eyebrow">TODAY</span><h2>Attendance Health</h2><p>Status kehadiran hari ini.</p></div></div>
    <div className="health-ring" style={{'--rate':`${attendanceRate*3.6}deg`} as CSSProperties}><div><strong>{attendanceRate}%</strong><small>Hadir</small></div></div>
    <div className="health-legend"><div><i className="dot present"/><span>Hadir</span><b>{present}</b></div><div><i className="dot late"/><span>Terlambat</span><b>{late}</b></div><div><i className="dot absent"/><span>Belum tercatat</span><b>{absent}</b></div></div>
   </div>
  </div>
  <div className="dashboard-grid-bottom">
   <div className="panel"><div className="panel-head"><div><span className="eyebrow">LIVE FEED</span><h2>Aktivitas Absensi Terbaru</h2><p>Record terbaru yang masuk ke sistem.</p></div><button className="link-btn" onClick={()=>onNavigate('attendance')}>Lihat semua</button></div><AttendanceMini rows={recent}/></div>
   <div className="panel quick executive-quick"><div className="panel-head"><div><span className="eyebrow">SHORTCUTS</span><h2>Akses cepat</h2><p>Masuk langsung ke proses HR utama.</p></div></div><Quick label="Tambah karyawan" icon="users" onClick={()=>onNavigate('employee-add')}/><Quick label="Jadwal kerja" icon="calendar" onClick={()=>onNavigate('schedule')}/><Quick label="Payroll" icon="payroll" onClick={()=>onNavigate('payroll')}/><Quick label="Pengajuan cuti" icon="request" onClick={()=>onNavigate('leave-request')}/></div>
  </div>
 </div>
}
function Stat({title,value,hint,icon}:{title:string;value:string;hint:string;icon:string}){return <div className="stat-card"><div className="stat-icon"><Icon name={icon}/></div><div><span>{title}</span><strong>{value}</strong><small>{hint}</small></div></div>}
function Quick({label,icon,onClick}:{label:string;icon:string;onClick:()=>void}){return <button className="quick-action" onClick={onClick}><span className="quick-icon"><Icon name={icon}/></span>{label}<span aria-hidden="true">›</span></button>}
function AttendanceMini({rows}:{rows:Absensi[]}){return <div className="table-wrap"><table><thead><tr><th>Karyawan</th><th>Tanggal</th><th>Masuk</th><th>Pulang</th><th>Status</th></tr></thead><tbody>{rows.length?rows.map((a,i)=><tr key={a.id||i}><td><b>{a.nama||'-'}</b><small>{a.id_karyawan||''}</small></td><td>{a.tanggal||'-'}</td><td className="green">{a.jam_masuk||'-'}</td><td>{a.jam_pulang||'-'}</td><td><Status value={a.status||'Hadir'}/></td></tr>):<Empty cols={5}/>}</tbody></table></div>}

function Employees({data,onDelete,onEdit,onExport,onAdd,onConfirmEmail}:{data:Karyawan[];onDelete:(k:Karyawan)=>void;onEdit:(k:Karyawan)=>void;onExport:(columns:string[],format:'csv'|'excel')=>void;onAdd:()=>void;onConfirmEmail:(k:Karyawan)=>void}){
 const [open,setOpen]=useState(false);
 const available=[
  ['id_karyawan','ID Karyawan'],['nama','Nama'],['nik_ktp','NIK'],['email','Email'],['no_telp','No. HP'],
  ['departemen','Departemen'],['jabatan','Jabatan'],['tanggal_masuk','Tanggal Masuk'],['status_karyawan','Status Karyawan'],
  ['status_aktif','Status Aktif'],['alamat_rumah','Alamat'],['gaji_pokok','Gaji Pokok']
 ] as const;
 const [selected,setSelected]=useState<string[]>(available.slice(0,9).map(x=>x[0]));
 const toggle=(key:string)=>setSelected(v=>v.includes(key)?v.filter(x=>x!==key):[...v,key]);
 return <><Heading title="Semua Karyawan" desc="Master data workforce yang tersimpan di Supabase." action="Tambah Karyawan" onAction={onAdd}/>
 <div className="toolbar"><b>{data.length} karyawan</b><button className="secondary" onClick={()=>setOpen(true)}>Export Data</button></div>
 {open&&<div className="export-backdrop" onMouseDown={e=>{if(e.currentTarget===e.target)setOpen(false)}}>
   <div className="export-card">
    <div className="export-head"><div><span>PEOPLE · EXPORT</span><h2>Export Database Karyawan</h2><p>Pilih kolom yang ingin dimasukkan ke file.</p></div><button className="icon-btn" onClick={()=>setOpen(false)}>×</button></div>
    <div className="export-actions-top"><button type="button" className="link-btn" onClick={()=>setSelected(available.map(x=>x[0]))}>Pilih semua</button><button type="button" className="link-btn" onClick={()=>setSelected([])}>Kosongkan</button><strong>{selected.length} kolom</strong></div>
    <div className="export-columns">{available.map(([key,label])=><label key={key} className="export-check"><input type="checkbox" checked={selected.includes(key)} onChange={()=>toggle(key)}/><span>{label}</span></label>)}</div>
    <div className="export-foot"><button className="secondary" onClick={()=>setOpen(false)}>Batal</button><button className="secondary" disabled={!selected.length} onClick={()=>{onExport(selected,'csv');setOpen(false)}}>Download CSV</button><button className="primary" disabled={!selected.length} onClick={()=>{onExport(selected,'excel');setOpen(false)}}>Download Excel</button></div>
   </div>
 </div>}
 <div className="panel table-panel"><div className="table-wrap"><table><thead><tr><th>Nama</th><th>ID</th><th>Jabatan</th><th>Departemen</th><th>Status</th><th>Gaji Pokok</th><th>Aksi</th></tr></thead><tbody>{data.length?data.map(k=><tr key={k.id}><td><div className="person"><div className="mini-avatar">{k.nama?.[0]||'K'}</div><b>{k.nama}</b></div></td><td>{k.id_karyawan||'-'}</td><td>{k.jabatan||'-'}</td><td>{k.departemen||'-'}</td><td><Status value={k.status_aktif===false?'Nonaktif':'Aktif'}/></td><td>{money(Number(k.gaji_pokok||0))}</td><td>
  <div className="row-actions"><button className="link-btn" onClick={()=>onEdit(k)}>Edit</button>
    {k.email&&<button className="link-btn" onClick={()=>onConfirmEmail(k)} disabled={!!k.email_terverifikasi}>{k.email_terverifikasi?'✓ Email Terverifikasi':!k.auth_user_id?'Akun Belum Terhubung':'Konfirmasi Email'}</button>}
    <button className="danger-text" onClick={()=>onDelete(k)}>Hapus</button>
  </div>
</td></tr>):<Empty cols={7}/>}</tbody></table></div></div></>
}
function AddEmployee({onDone,refresh}:{onDone:()=>void;refresh:()=>void}){
 const [f,setF]=useState({id_karyawan:'',nama:'',jabatan:'',email:'',no_telp:'',departemen:'',tanggal_masuk:'',gaji_pokok:''}),[saving,setSaving]=useState(false),[msg,setMsg]=useState('');
 async function save(e:FormEvent){e.preventDefault();setSaving(true);setMsg('');const payload={...f,gaji_pokok:Number(f.gaji_pokok||0),status_aktif:true};const {error:e2}=await supabase.from('karyawan').insert(payload);setSaving(false);if(e2)setMsg(e2.message);else{refresh();onDone()}}
 return <><Heading title="Tambah Karyawan" desc="Simpan profil baru langsung ke tabel karyawan."/><div className="panel form-panel"><form className="form-grid" onSubmit={save}>{Object.entries(f).map(([k,v])=><label key={k}>{fieldLabel(k)}<input required={['id_karyawan','nama'].includes(k)} type={k==='gaji_pokok'?'number':k==='tanggal_masuk'?'date':'text'} value={String(v ?? '')} onChange={e=>setF({...f,[k]:e.target.value})}/></label>)}{msg&&<div className="form-error full-span">{msg}</div>}<div className="full-span form-actions"><button type="button" className="secondary" onClick={onDone}>Batal</button><button className="primary" disabled={saving}>{saving?'Menyimpan…':'Simpan Karyawan'}</button></div></form></div></>
}
function EmployeeEditor({ employee, onClose, onSave }: { employee: Karyawan; onClose: () => void; onSave: (p: Record<string, unknown>) => void }) {
  const [f, setF] = useState({
    id_karyawan: employee.id_karyawan || '',
    nama: employee.nama || '',
    jabatan: employee.jabatan || '',
    email: employee.email || '',
    no_telp: employee.no_telp || '',
    departemen: employee.departemen || '',
    tanggal_masuk: employee.tanggal_masuk || '',
    gaji_pokok: String(employee.gaji_pokok || 0),
    status_aktif: employee.status_aktif !== false
  });

  return (
    <div className="drawer-backdrop" onMouseDown={e => { if (e.currentTarget === e.target) onClose(); }}>
      <aside className="edit-drawer">
        <div className="drawer-head">
          <div>
            <span>EMPLOYEE PROFILE</span>
            <h2>Edit Karyawan</h2>
          </div>
          <button className="icon-btn" onClick={onClose} type="button">×</button>
        </div>
        <div className="drawer-body">
          {Object.entries(f).filter(([k]) => k !== 'status_aktif').map(([k, v]) => (
            <label key={k}>
              {fieldLabel(k)}
              <input
                type={k === 'gaji_pokok' ? 'number' : k === 'tanggal_masuk' ? 'date' : 'text'}
                value={String(v ?? '')}
                onChange={e => setF({ ...f, [k]: e.target.value })}
              />
            </label>
          ))}
          <label className="switch-row">
            <span>Status Aktif</span>
            <input
              type="checkbox"
              checked={f.status_aktif}
              onChange={e => setF({ ...f, status_aktif: e.target.checked })}
            />
          </label>
        </div>
        <div className="drawer-foot">
          <button type="button" className="secondary" onClick={onClose}>Batal</button>
          <button type="button" className="primary" onClick={() => { if (!f.id_karyawan.trim()) { alert('ID Karyawan wajib diisi.'); return; } onSave({ ...f, id_karyawan: f.id_karyawan.trim().toUpperCase(), gaji_pokok: Number(f.gaji_pokok || 0) }); }}>Simpan Perubahan</button>
        </div>
      </aside>
    </div>
  );
}
function Branch({title,desc,items,tab,setTab,action,onAction,children}:{title:string;desc:string;items:{key:string;label:string;icon:string}[];tab:string;setTab:(v:string)=>void;action?:string;onAction?:()=>void;children:ReactNode}){return <><Heading title={title} desc={desc} action={action} onAction={onAction}/><div className="branch-nav">{items.map(i=><button key={i.key} className={tab===i.key?'active':''} onClick={()=>setTab(i.key)}><span>{i.icon}</span>{i.label}</button>)}</div>{children}</>}
function AttendanceModule({type,data,onRefresh,onExport}:{type:MenuKey;data:Absensi[];onRefresh:()=>void;onExport:()=>void}){
 const initial=type==='attendance-today'?'today':type==='late'?'late':type==='leave'?'leave':type==='overtime'?'overtime':type==='selfie'?'selfie':'summary';
 const [tab,setTab]=useState(initial),[open,setOpen]=useState(false),[employees,setEmployees]=useState<Karyawan[]>([]);
 const [f,setF]=useState({id_karyawan:'',tanggal:isoToday(),jam_masuk:'07:00',jam_pulang:'16:00',status:'Hadir',lokasi:'Manual HR',keterangan:''});
 useEffect(()=>{supabase.from('karyawan').select('*').order('nama').then(({data})=>setEmployees(data||[]))},[]);
 const items=[['summary','Rekap','clock'],['today','Hari Ini','check'],['late','Terlambat','alert'],['leave','Izin & Sakit','leave'],['overtime','Lembur','arrow'],['selfie','Monitoring Selfie','camera']];
 let rows=data;if(tab==='today')rows=data.filter(a=>a.tanggal===isoToday());if(tab==='late')rows=data.filter(a=>Number(a.keterlambatan_menit||0)>0||(a.status||'').toLowerCase().includes('terlambat'));if(tab==='leave')rows=data.filter(a=>/izin|sakit/i.test(a.status||''));if(tab==='overtime')rows=data.filter(a=>Number(a.lembur_menit||0)>0);if(tab==='selfie')rows=data.filter(a=>!!a.foto||!!a.selfie_masuk);
 const save=async(e:FormEvent)=>{e.preventDefault();const emp=employees.find(x=>x.id_karyawan===f.id_karyawan);if(!emp)return alert('Pilih karyawan.');const {error}=await supabase.from('absensi').insert({...f,nama:emp.nama,jabatan:emp.jabatan||'',total_jam:'8:00'});if(error)alert(error.message);else{setOpen(false);onRefresh()}};
 const del=async(id:string)=>{if(confirm('Hapus record absensi ini?')){const {error}=await supabase.from('absensi').delete().eq('id',id);if(error)alert(error.message);else onRefresh()}};
 return <Branch title="Absensi" desc="Rekap, input manual, review keterlambatan, lembur, dan selfie." items={items.map(([key,label,icon])=>({key,label,icon}))} tab={tab} setTab={setTab} action={tab==='summary'?'＋ Input Absensi': 'Export CSV'} onAction={tab==='summary'?()=>setOpen(true):onExport}>
  <div className="stat-grid three"><Stat title="Record" value={String(rows.length)} hint="Data ditampilkan" icon="calendar"/><Stat title="Hadir" value={String(rows.filter(a=>/hadir|tepat|terlambat/i.test(a.status||'')).length)} hint="Kehadiran" icon="check"/><Stat title="Perlu Review" value={String(rows.filter(a=>Number(a.lembur_menit||0)>0||Number(a.keterlambatan_menit||0)>0).length)} hint="Lembur / terlambat" icon="alert"/></div>
  <div className="panel table-panel"><div className="table-wrap"><table><thead><tr><th>Foto</th><th>Karyawan</th><th>Tanggal</th><th>Masuk</th><th>Pulang</th><th>Total</th><th>Status</th><th>Lokasi</th><th>Aksi</th></tr></thead><tbody>{rows.length?rows.map((a,i)=><tr key={a.id||i}><td>{a.foto||a.selfie_masuk?<img className="selfie" src={a.foto||a.selfie_masuk}/>:<div className="selfie blank">—</div>}</td><td><b>{a.nama||'-'}</b><small>{a.id_karyawan||''}</small></td><td>{a.tanggal||'-'}</td><td>{a.jam_masuk||'-'}</td><td>{a.jam_pulang||'-'}</td><td>{a.total_jam||'-'}</td><td><Status value={a.status||'-'}/></td><td>{a.lokasi||a.lokasi_masuk||'-'}</td><td>{a.id !== undefined && (
  <button className="danger-text" onClick={() => del(String(a.id))}>
    Hapus
  </button>
)}
  </td></tr>):<Empty cols={9}/>}</tbody></table></div></div>
  {open&&<SimpleModal title="Input Absensi Manual" onClose={()=>setOpen(false)} onSave={save}><label>Karyawan<select required value={f.id_karyawan} onChange={e=>setF({...f,id_karyawan:e.target.value})}><option value="">Pilih karyawan</option>{employees.map(k=><option key={k.id_karyawan} value={k.id_karyawan}>{k.nama} — {k.id_karyawan}</option>)}</select></label><label>Tanggal<input type="date" value={f.tanggal} onChange={e=>setF({...f,tanggal:e.target.value})}/></label><label>Jam Masuk<input type="time" value={f.jam_masuk} onChange={e=>setF({...f,jam_masuk:e.target.value})}/></label><label>Jam Pulang<input type="time" value={f.jam_pulang} onChange={e=>setF({...f,jam_pulang:e.target.value})}/></label><label>Status<select value={f.status} onChange={e=>setF({...f,status:e.target.value})}><option>Hadir</option><option>Terlambat</option><option>Izin</option><option>Sakit</option><option>Alpa</option></select></label><label>Lokasi<input value={f.lokasi} onChange={e=>setF({...f,lokasi:e.target.value})}/></label><label>Keterangan<textarea value={f.keterangan} onChange={e=>setF({...f,keterangan:e.target.value})}/></label></SimpleModal>}
 </Branch>
}

function HolidayModule(){
 const [rows,setRows]=useState<any[]>([]),[modal,setModal]=useState(false),[f,setF]=useState({tanggal:isoToday(),nama:'',tipe:'Nasional'}),[msg,setMsg]=useState('');
 const load=async()=>{const {data,error}=await supabase.from('hris_hari_libur').select('*').order('tanggal');if(error)setMsg(error.message);else setRows(data||[])};useEffect(()=>{load()},[]);
 const save=async(e:FormEvent)=>{e.preventDefault();const {error}=await supabase.from('hris_hari_libur').insert(f);if(error)setMsg(error.message);else{setModal(false);setF({tanggal:isoToday(),nama:'',tipe:'Nasional'});load()}};
 const del=async(id:string)=>{if(confirm('Hapus hari libur?')){const {error}=await supabase.from('hris_hari_libur').delete().eq('id',id);if(error)setMsg(error.message);else load()}};
 return <><Heading title="Hari Libur" desc="Kelola tanggal non-working day di database." action="＋ Tambah Hari Libur" onAction={()=>setModal(true)}/>{msg&&<div className="alert">{msg}</div>}<div className="panel table-panel"><div className="table-wrap"><table><thead><tr><th>Tanggal</th><th>Nama</th><th>Tipe</th><th>Aksi</th></tr></thead><tbody>{rows.length?rows.map(r=><tr key={r.id}><td>{r.tanggal}</td><td><b>{r.nama}</b></td><td><Status value={r.tipe}/></td><td><button className="danger-text" onClick={()=>del(r.id)}>Hapus</button></td></tr>):<Empty cols={4}/>}</tbody></table></div></div>{modal&&<SimpleModal title="Tambah Hari Libur" onClose={()=>setModal(false)} onSave={save}><label>Tanggal<input type="date" value={f.tanggal} onChange={e=>setF({...f,tanggal:e.target.value})}/></label><label>Nama Hari Libur<input required value={f.nama} onChange={e=>setF({...f,nama:e.target.value})}/></label><label>Tipe<select value={f.tipe} onChange={e=>setF({...f,tipe:e.target.value})}><option>Nasional</option><option>Perusahaan</option></select></label></SimpleModal>}</>
}

function LeaveModule({initial}:{initial:MenuKey}){
 const [tab,setTab]=useState(initial==='leave-balance'?'balance':'requests'),[rows,setRows]=useState<any[]>([]),[balances,setBalances]=useState<any[]>([]),[modal,setModal]=useState(false),[employees,setEmployees]=useState<Karyawan[]>([]);
 const [f,setF]=useState({id_karyawan:'',jenis:'Tahunan',tanggal_mulai:isoToday(),tanggal_selesai:isoToday(),jumlah_hari:'1',alasan:'',status:'Menunggu'});
 const load=async()=>{const [a,b,c]=await Promise.all([supabase.from('hris_cuti').select('*').order('created_at',{ascending:false}),supabase.from('hris_saldo_cuti').select('*').eq('tahun',new Date().getFullYear()),supabase.from('karyawan').select('*').order('nama')]);if(!a.error)setRows(a.data||[]);if(!b.error)setBalances(b.data||[]);if(!c.error)setEmployees(c.data||[])};useEffect(()=>{load()},[]);
 const save=async(e:FormEvent)=>{e.preventDefault();const {data,error}=await supabase.from('hris_cuti').insert({...f,jumlah_hari:Number(f.jumlah_hari)}).select('id').single();if(error){alert(error.message);return}if(data){const a=await supabase.rpc('hris_submit_approval',{p_modul:'leave',p_record_id:String(data.id)});if(a.error){await supabase.from('hris_cuti').delete().eq('id',data.id);alert(a.error.message);return}}setModal(false);load()};
 const update=async(id:string,status:string)=>{const {data:req,error:e1}=await supabase.from('hris_approval_requests').select('id').eq('modul','leave').eq('record_id',id).eq('status','Menunggu').maybeSingle();if(e1||!req){alert(e1?.message||'Workflow approval tidak ditemukan.');return}const {error}=await supabase.rpc('hris_decide_approval',{p_id:req.id,p_status:status,p_catatan:status==='Ditolak'?(window.prompt('Alasan penolakan:','')||null):null});if(error)alert(error.message);else load()};
 const ensureBalance=async(k:string)=>{const found=balances.find(x=>x.id_karyawan===k);if(found)return found;const {data,error}=await supabase.from('hris_saldo_cuti').insert({id_karyawan:k,tahun:new Date().getFullYear(),jenis:'Tahunan',saldo:12,terpakai:0}).select().single();if(error) return null;return data};
 const items=[['inbox','Approval Inbox','request'],['requests','Pengajuan Baru','＋'],['history','Riwayat','calendar'],['balance','Saldo Cuti','balance']].map(([key,label,icon])=>({key,label,icon}));
 return <Branch title="Cuti" desc="Pengajuan, approval, dan saldo cuti tersimpan di database." items={items} tab={tab} setTab={setTab} action={tab==='requests'?'＋ Buat Pengajuan':undefined} onAction={()=>setModal(true)}>{tab==='balance'?<div className="panel table-panel"><div className="table-wrap"><table><thead><tr><th>Karyawan</th><th>Jenis</th><th>Jatah</th><th>Terpakai</th><th>Sisa</th><th>Aksi</th></tr></thead><tbody>{employees.map(k=>{const b=balances.find(x=>x.id_karyawan===k.id_karyawan);const quota=Number((b?.saldo??12))+Number(b?.terpakai??0);const used=Number(b?.terpakai??0);return <tr key={k.id}><td><b>{k.nama}</b><small>{k.id_karyawan}</small></td><td>Tahunan</td><td>{quota}</td><td>{used}</td><td><Status value={String(Math.max(0,quota-used))}/></td><td><button className="link-btn" onClick={()=>k.id_karyawan && ensureBalance(k.id_karyawan).then(load)}>Inisialisasi</button></td></tr>})}</tbody></table></div></div>:<div className="panel table-panel"><div className="table-wrap"><table><thead><tr><th>Karyawan</th><th>Jenis</th><th>Tanggal</th><th>Alasan</th><th>Status</th><th>Aksi</th></tr></thead><tbody>{rows.length?rows.map(r=><tr key={r.id}><td>{r.id_karyawan}</td><td>{r.jenis}</td><td>{r.tanggal_mulai} s/d {r.tanggal_selesai}</td><td>{r.alasan||'-'}</td><td><Status value={r.status}/></td><td>{r.status==='Menunggu'&&<><button className="link-btn" onClick={()=>update(r.id,'Disetujui')}>Setujui</button> <button className="danger-text" onClick={()=>update(r.id,'Ditolak')}>Tolak</button></>}</td></tr>):<Empty cols={6}/>}</tbody></table></div></div>}{modal&&<SimpleModal title="Pengajuan Cuti" onClose={()=>setModal(false)} onSave={save}><label>Karyawan<select required value={f.id_karyawan} onChange={e=>setF({...f,id_karyawan:e.target.value})}><option value="">Pilih karyawan</option>{employees.map(k=><option key={k.id_karyawan} value={k.id_karyawan}>{k.nama} — {k.id_karyawan}</option>)}</select></label><label>Jenis<select value={f.jenis} onChange={e=>setF({...f,jenis:e.target.value})}><option>Tahunan</option><option>Sakit</option><option>Khusus</option></select></label><label>Mulai<input type="date" value={f.tanggal_mulai} onChange={e=>setF({...f,tanggal_mulai:e.target.value})}/></label><label>Selesai<input type="date" value={f.tanggal_selesai} onChange={e=>setF({...f,tanggal_selesai:e.target.value})}/></label><label>Jumlah Hari<input type="number" min="0.5" step="0.5" value={f.jumlah_hari} onChange={e=>setF({...f,jumlah_hari:e.target.value})}/></label><label>Alasan<textarea value={f.alasan} onChange={e=>setF({...f,alasan:e.target.value})}/></label></SimpleModal>}</Branch>
}

function TalentModule({initial,employees}:{initial:MenuKey;employees:Karyawan[]}){
 const [tab,setTab]=useState(initial==='kpi'?'kpi':initial==='recruitment'?'vacancies':initial==='candidates'?'candidates':'performance'),[rows,setRows]=useState<any[]>([]),[modal,setModal]=useState(false);
 const load=async()=>{const table=tab==='kpi'?'hris_kpi':tab==='vacancies'?'hris_lowongan':tab==='candidates'?'hris_kandidat':tab==='interviews'?'hris_interview':'hris_performance';const {data,error}=await supabase.from(table).select('*').order('created_at',{ascending:false});if(!error)setRows(data||[]);else setRows([])};useEffect(()=>{load()},[tab]);
 const items=[['performance','Performance','arrow'],['kpi','KPI & Target','kpi'],['vacancies','Lowongan','recruitment'],['candidates','Kandidat','users'],['interviews','Interview','calendar']];
 return <Branch title="Talent" desc="Performance, KPI, recruitment, kandidat, dan interview dengan data persisten." items={items.map(([key,label,icon])=>({key,label,icon}))} tab={tab} setTab={setTab} action="＋ Tambah" onAction={()=>setModal(true)}>{<TalentTable tab={tab} rows={rows}/>} {modal&&<TalentForm tab={tab} employees={employees} onClose={()=>setModal(false)} onSaved={()=>{setModal(false);load()}}/>}</Branch>
}
function TalentTable({tab,rows}:{tab:string;rows:any[]}){let cols:string[]=[];if(tab==='kpi')cols=['id_karyawan','periode','indikator','target','realisasi','skor','status'];else if(tab==='vacancies')cols=['posisi','departemen','jumlah_kebutuhan','status','tanggal_buka','tanggal_tutup'];else if(tab==='candidates')cols=['nama','email','no_telp','posisi','tahap','status'];else if(tab==='interviews')cols=['kandidat','tanggal','jam','interviewer','hasil','status'];else cols=['id_karyawan','periode','nilai','catatan','status'];return <div className="panel table-panel"><div className="table-wrap"><table><thead><tr>{cols.map(c=><th key={c}>{fieldLabel(c)}</th>)}</tr></thead><tbody>{rows.length?rows.map(r=><tr key={r.id}>{cols.map(c=><td key={c}>{c==='status'?<Status value={String(r[c]??'-')}/>:String(r[c]??'-')}</td>)}</tr>):<Empty cols={cols.length}/>}</tbody></table></div></div>}
function TalentForm({tab,employees,onClose,onSaved}:{tab:string;employees:Karyawan[];onClose:()=>void;onSaved:()=>void}){
 const [f,setF]=useState<any>(tab==='kpi'?{id_karyawan:'',periode:new Date().toISOString().slice(0,7),indikator:'',target:'',realisasi:'',bobot:'0',skor:'0',status:'Draft'}:tab==='vacancies'?{posisi:'',departemen:'',jumlah_kebutuhan:'1',status:'Open',tanggal_buka:isoToday(),tanggal_tutup:'',deskripsi:''}:tab==='candidates'?{nama:'',email:'',no_telp:'',posisi:'',sumber:'',tahap:'Screening',status:'Aktif',catatan:''}:tab==='interviews'?{kandidat:'',tanggal:isoToday(),jam:'09:00',interviewer:'',hasil:'',status:'Terjadwal'}:{id_karyawan:'',periode:new Date().toISOString().slice(0,7),nilai:'0',catatan:'',status:'Draft'});
 const table=tab==='kpi'?'hris_kpi':tab==='vacancies'?'hris_lowongan':tab==='candidates'?'hris_kandidat':tab==='interviews'?'hris_interview':'hris_performance';
 const save=async(e:FormEvent)=>{e.preventDefault();const numeric=['target','realisasi','bobot','skor','jumlah_kebutuhan','nilai'];const payload={...f};numeric.forEach(k=>{if(k in payload)payload[k]=Number(payload[k]||0)});const {error}=await supabase.from(table).insert(payload);if(error)alert(error.message);else onSaved()};
 return <SimpleModal title={`Tambah ${tab==='kpi'?'KPI':tab==='vacancies'?'Lowongan':tab==='candidates'?'Kandidat':tab==='interviews'?'Interview':'Performance'}`} onClose={onClose} onSave={save}>{Object.entries(f).map(([k,v])=><label key={k}>{fieldLabel(k)}{k==='id_karyawan'?<select required value={String(v)} onChange={e=>setF({...f,[k]:e.target.value})}><option value="">Pilih karyawan</option>{employees.map(x=><option key={x.id_karyawan} value={x.id_karyawan}>{x.nama} — {x.id_karyawan}</option>)}</select>:<input required={['nama','posisi','indikator','kandidat'].includes(k)} type={['target','realisasi','bobot','skor','jumlah_kebutuhan','nilai'].includes(k)?'number':k==='tanggal'||k.includes('tanggal')?'date':k==='jam'?'time':'text'} value={String(v??'')} onChange={e=>setF({...f,[k]:e.target.value})}/>}</label>)}</SimpleModal>
}
function Reports({employees,attendance,onExport}:{employees:Karyawan[];attendance:Absensi[];onExport:(r:any[],f:string)=>void}){const [tab,setTab]=useState('overview'),[payroll,setPayroll]=useState<any[]>([]);useEffect(()=>{if(tab==='payroll')supabase.from('hris_payroll').select('*').order('created_at',{ascending:false}).limit(2000).then(({data})=>setPayroll(data||[]))},[tab]);const items=[['overview','Analytics','report'],['attendance','Laporan Absensi','clock'],['payroll','Laporan Payroll','payroll'],['people','Laporan Karyawan','users']].map(([key,label,icon])=>({key,label,icon}));return <Branch title="Laporan" desc="Export data nyata dari database." items={items} tab={tab} setTab={setTab}>{tab==='overview'?<div className="report-grid"><ReportCard name="Master Karyawan" count={employees.length} onClick={()=>onExport(employees,'laporan-karyawan.csv')}/><ReportCard name="Absensi" count={attendance.length} onClick={()=>onExport(attendance,'laporan-absensi.csv')}/><ReportCard name="Payroll" count={payroll.length} onClick={()=>onExport(payroll,'laporan-payroll.csv')}/></div>:tab==='attendance'?<ReportCard name="Laporan Absensi" count={attendance.length} onClick={()=>onExport(attendance,'laporan-absensi.csv')}/>:tab==='people'?<ReportCard name="Laporan Karyawan" count={employees.length} onClick={()=>onExport(employees,'laporan-karyawan.csv')}/>:<ReportCard name="Laporan Payroll" count={payroll.length} onClick={()=>onExport(payroll,'laporan-payroll.csv')}/>}</Branch>}
function ReportCard({name,count,onClick}:{name:string;count:number;onClick:()=>void}){return <div className="report-card"><span>REPORT</span><h3>{name}</h3><b>{count}</b><p>record tersedia</p><button className="primary" onClick={onClick}>Export CSV</button></div>}
function Settings(){
  const [f,setF]=useState<any>({
    company_name:'Project by Tirta',
    work_start:'07:00',
    work_end:'16:00',
    break_minutes:60,
    payday_day:'Jumat',
    currency:'IDR',
    timezone:'Asia/Jakarta',
    overtime_multiplier:2,
    late_tolerance_minutes:10,
    attendance_radius_meters:100,
    attendance_latitude:'',
    attendance_longitude:'',
    attendance_max_accuracy_meters:100,
    auto_approve_attendance:false,
    notify_late:true,
    notify_leave:true,
    maintenance_mode:false
  });

  const [tab,setTab]=useState('Perusahaan');
  const [msg,setMsg]=useState('');

  const [customTheme,setCustomTheme]=useState({
    primary:'#101a33',
    accent:'#d6ae58',
    background:'#f6f7fb',
    surface:'#ffffff',
    text:'#172033',
    border:'#d6ae58'
  });

  const themes=[
    {
      id:'moon',
      name:'Project by Tirta — Navy Gold',
      description:'Tema utama enterprise Project by Tirta.',
      primary:'#101a33',
      accent:'#d6ae58',
      background:'#f6f7fb',
      surface:'#ffffff',
      text:'#172033',
      border:'#d6ae58'
    },
    {
      id:'blue',
      name:'Corporate Blue',
      description:'Tampilan profesional biru korporat.',
      primary:'#123b63',
      accent:'#2f80ed',
      background:'#f4f7fb',
      surface:'#ffffff',
      text:'#172033',
      border:'#b8cee5'
    },
    {
      id:'green',
      name:'Professional Green',
      description:'Tema untuk operasional dan workforce.',
      primary:'#174d3b',
      accent:'#2e9d68',
      background:'#f4f8f6',
      surface:'#ffffff',
      text:'#172033',
      border:'#a9d7c0'
    },
    {
      id:'purple',
      name:'Modern Purple',
      description:'Tema modern untuk HR dan talent.',
      primary:'#3b2a63',
      accent:'#7c3aed',
      background:'#f7f5fb',
      surface:'#ffffff',
      text:'#172033',
      border:'#c8b8e8'
    },
    {
      id:'dark',
      name:'Dark Enterprise',
      description:'Mode gelap untuk penggunaan malam.',
      primary:'#0b132b',
      accent:'#d6ae58',
      background:'#101827',
      surface:'#172033',
      text:'#f8fafc',
      border:'#334155'
    },
    {
      id:'light',
      name:'Light Enterprise',
      description:'Tampilan terang dan minimalis.',
      primary:'#1f2937',
      accent:'#2563eb',
      background:'#f8fafc',
      surface:'#ffffff',
      text:'#111827',
      border:'#dbe3ee'
    }
  ];

  const applyTheme = (theme: any) => {
  const root = document.documentElement;

  const primary =
    theme.primary || '#101a33';

  const accent =
    theme.accent || '#d6ae58';

  const background =
    theme.background || '#f6f7fb';

  const surface =
    theme.surface || '#ffffff';

  const text =
    theme.text || '#172033';

  const border =
  theme.border || '#e2e7ee';

  root.style.setProperty(
    '--mx-primary',
    primary
  );

  root.style.setProperty(
    '--mx-accent',
    accent
  );

  root.style.setProperty(
    '--mx-background',
    background
  );

  root.style.setProperty(
    '--mx-surface',
    surface
  );

  root.style.setProperty(
    '--mx-text',
    text
  );

  root.style.setProperty(
    '--mx-border',
    border
  );

  /*
   * Compatibility dengan CSS lama
   */
  root.style.setProperty(
    '--blue',
    accent
  );

  root.style.setProperty(
    '--blue2',
    primary
  );

  root.style.setProperty(
    '--blue-soft',
    background
  );

  root.style.setProperty(
    '--ink',
    text
  );

  root.style.setProperty(
    '--line',
    border
  );

  root.style.setProperty(
    '--surface',
    surface
  );

  root.style.setProperty(
    '--bg',
    background
  );

  setCustomTheme({
    primary,
    accent,
    background,
    surface,
    text,
    border,
  });

  localStorage.setItem(
    'moonx-theme',
    JSON.stringify({
      ...theme,
      primary,
      accent,
      background,
      surface,
      text,
      border,
    })
  );

  setMsg(
    `Tema "${theme.name || 'Custom Theme'}" berhasil diterapkan.`
  );
};
  const updateCustomColor = (
  key: keyof typeof customTheme,
  value: string
) => {
  setCustomTheme(prev => ({
    ...prev,
    [key]: value,
  }));

  const root =
    document.documentElement;

  const map: Record<
    keyof typeof customTheme,
    string
  > = {
    primary: '--mx-primary',
    accent: '--mx-accent',
    background: '--mx-background',
    surface: '--mx-surface',
    text: '--mx-text',
    border: '--mx-border',
  };

  root.style.setProperty(
    map[key],
    value
  );

  /*
   * CSS lama
   */
  if (key === 'primary') {
    root.style.setProperty(
      '--blue2',
      value
    );
  }

  if (key === 'accent') {
    root.style.setProperty(
      '--blue',
      value
    );
  }

  if (key === 'background') {
    root.style.setProperty(
      '--bg',
      value
    );
  }

  if (key === 'surface') {
    root.style.setProperty(
      '--surface',
      value
    );
  }

  if (key === 'text') {
    root.style.setProperty(
      '--ink',
      value
    );
  }

  if (key === 'border') {
    root.style.setProperty(
      '--line',
      value
    );
  }
};
  useEffect(()=>{
    supabase
      .from('hris_company_settings')
      .select('*')
      .eq('id',1)
      .maybeSingle()
      .then(({data})=>{
        if(data)setF(data);
      });

    const saved=localStorage.getItem('moonx-theme');

    if(saved){
      try{
        const theme=JSON.parse(saved);

        applyTheme(theme);
      }catch{
        applyTheme(themes[0]);
      }
    }else{
      applyTheme(themes[0]);
    }
  },[]);

  const save=async()=>{
    const {error}=await supabase
      .from('hris_company_settings')
      .upsert({
        ...f,
        id:1
      });

    setMsg(
      error
        ? error.message
        : 'Pengaturan berhasil disimpan.'
    );
  };

const saveCustomTheme = () => {
  const theme = {
    id: 'custom',
    name: 'Custom Theme',
    description:
      'Tema kustom Project by Tirta',
    ...customTheme,
  };

  const root =
    document.documentElement;

  root.style.setProperty(
    '--mx-primary',
    customTheme.primary
  );

  root.style.setProperty(
    '--mx-accent',
    customTheme.accent
  );

  root.style.setProperty(
    '--mx-background',
    customTheme.background
  );

  root.style.setProperty(
    '--mx-surface',
    customTheme.surface
  );

  root.style.setProperty(
    '--mx-text',
    customTheme.text
  );

  root.style.setProperty(
    '--mx-border',
    customTheme.border
  );

  root.style.setProperty(
    '--blue',
    customTheme.accent
  );

  root.style.setProperty(
    '--blue2',
    customTheme.primary
  );

  root.style.setProperty(
    '--blue-soft',
    customTheme.background
  );

  root.style.setProperty(
    '--ink',
    customTheme.text
  );

  root.style.setProperty(
    '--line',
    customTheme.border
  );

  root.style.setProperty(
    '--surface',
    customTheme.surface
  );

  root.style.setProperty(
    '--bg',
    customTheme.background
  );

  localStorage.setItem(
    'moonx-theme',
    JSON.stringify(theme)
  );

  setMsg(
    'Custom Theme berhasil disimpan dan diterapkan.'
  );
};
  const groups:any={
    'Perusahaan':[
      'company_name',
      'currency',
      'timezone'
    ],
    'Jam Kerja':[
      'work_start',
      'work_end',
      'break_minutes',
      'late_tolerance_minutes'
    ],
    'Payroll':[
      'payday_day',
      'overtime_multiplier'
    ],
    'Absensi':[
      'attendance_radius_meters',
      'attendance_latitude',
      'attendance_longitude',
      'attendance_max_accuracy_meters',
      'auto_approve_attendance'
    ],
    'Notifikasi':[
      'notify_late',
      'notify_leave'
    ],
    'Keamanan':[
      'maintenance_mode'
    ]
  };

  const labels:any={
    company_name:'Nama Perusahaan',
    currency:'Mata Uang',
    timezone:'Zona Waktu',
    work_start:'Jam Masuk',
    work_end:'Jam Pulang',
    break_minutes:'Istirahat (menit)',
    late_tolerance_minutes:'Toleransi Terlambat (menit)',
    payday_day:'Hari Gajian',
    overtime_multiplier:'Pengali Lembur',
    attendance_radius_meters:'Radius Absensi (meter)',
    attendance_latitude:'Latitude Lokasi Absensi',
    attendance_longitude:'Longitude Lokasi Absensi',
    attendance_max_accuracy_meters:'Maksimal Akurasi GPS (meter)',
    auto_approve_attendance:'Auto Approve Absensi',
    notify_late:'Notifikasi Keterlambatan',
    notify_leave:'Notifikasi Cuti',
    maintenance_mode:'Mode Maintenance'
  };

  return (
    <>
      <Heading
        title="Pengaturan"
        desc="Kelola konfigurasi perusahaan, operasional, payroll, absensi, keamanan, dan tampilan sistem."
        action="Simpan Perubahan"
        onAction={save}
      />

      {msg&&(
        <div className="theme-message">
          {msg}
        </div>
      )}

      <div className="settings-tabs">
        {Object.keys(groups).map(x=>(
          <button
            key={x}
            type="button"
            className={tab===x?'active':''}
            onClick={()=>setTab(x)}
          >
            {x}
          </button>
        ))}

        <button
          type="button"
          className={tab==='Tampilan & Tema'?'active':''}
          onClick={()=>setTab('Tampilan & Tema')}
        >
          🎨 Tampilan & Tema
        </button>
      </div>

      {tab==='Tampilan & Tema' ? (
        <div className="theme-manager">

          <div className="theme-manager-header">
            <div>
              <h2>Tampilan & Tema</h2>
              <p>
                Pilih tampilan visual yang digunakan oleh HRIS Project by Tirta.
              </p>
            </div>
          </div>

          <div className="theme-grid">
            {themes.map(theme=>(
              <button
                type="button"
                key={theme.id}
                className="theme-card"
                onClick={()=>applyTheme(theme)}
              >
                <div
                  className="theme-preview"
                  style={{
                    background:theme.background
                  }}
                >
                  <div
                    className="theme-preview-sidebar"
                    style={{
                      background:theme.primary
                    }}
                  >
                    <span></span>
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>

                  <div className="theme-preview-content">

                    <div
                      className="theme-preview-top"
                      style={{
                        borderColor:theme.border
                      }}
                    ></div>

                    <div className="theme-preview-cards">
                      <i
                        style={{
                          background:theme.accent
                        }}
                      ></i>

                      <i
                        style={{
                          background:theme.primary
                        }}
                      ></i>

                      <i
                        style={{
                          background:theme.border
                        }}
                      ></i>
                    </div>

                    <div
                      className="theme-preview-line"
                      style={{
                        background:theme.accent
                      }}
                    ></div>

                  </div>
                </div>

                <div className="theme-card-body">
                  <div>
                    <strong>
                      {theme.name}
                    </strong>

                    <small>
                      {theme.description}
                    </small>
                  </div>

                  <span
                    className="theme-color-dot"
                    style={{
                      background:theme.accent
                    }}
                  ></span>
                </div>
              </button>
            ))}
          </div>

          <div className="custom-theme-panel">

            <div>
              <h3>Custom Theme</h3>
              <p>
                Gunakan warna pilihan Anda untuk tampilan HRIS.
              </p>
            </div>

            <div className="custom-theme-controls">

              <label>
                Primary
                <input
                  type="color"
                  value={customTheme.primary}
                  onChange={e=>
                    updateCustomColor(
                      'primary',
                      e.target.value
                    )
                  }
                />
              </label>

              <label>
                Accent
                <input
                  type="color"
                  value={customTheme.accent}
                  onChange={e=>
                    updateCustomColor(
                      'accent',
                      e.target.value
                    )
                  }
                />
              </label>

              <label>
                Background
                <input
                  type="color"
                  value={customTheme.background}
                  onChange={e=>
                    updateCustomColor(
                      'background',
                      e.target.value
                    )
                  }
                />
              </label>

              <label>
                Surface
                <input
                  type="color"
                  value={customTheme.surface}
                  onChange={e=>
                    updateCustomColor(
                      'surface',
                      e.target.value
                    )
                  }
                />
              </label>

              <label>
                Text
                <input
                  type="color"
                  value={customTheme.text}
                  onChange={e=>
                    updateCustomColor(
                      'text',
                      e.target.value
                    )
                  }
                />
              </label>

              <label>
                Border
                <input
                  type="color"
                  value={customTheme.border}
                  onChange={e=>
                    updateCustomColor(
                      'border',
                      e.target.value
                    )
                  }
                />
              </label>

            </div>

            <div className="custom-theme-actions">
              <button
                type="button"
                className="primary theme-save-button"
                onClick={saveCustomTheme}
              >
                Simpan Custom Theme
              </button>
            </div>

          </div>

        </div>
      ) : (

        <div className="panel form-panel settings-content">

          <div className="form-grid">

            {groups[tab].map((k:string)=>{

              const v=f[k];

              const bool=[
                'auto_approve_attendance',
                'notify_late',
                'notify_leave',
                'maintenance_mode'
              ].includes(k);

              return (
                <label key={k}>

                  {labels[k]}

                  {bool ? (

                    <input
                      type="checkbox"
                      checked={!!v}
                      onChange={e=>
                        setF({
                          ...f,
                          [k]:e.target.checked
                        })
                      }
                    />

                  ) : (

                    <input
                      type={
                        [
                          'break_minutes',
                          'late_tolerance_minutes',
                          'attendance_radius_meters',
                          'attendance_max_accuracy_meters',
                          'attendance_latitude',
                          'attendance_longitude'
                        ].includes(k)
                          ? 'number'
                          : k.includes('start')||k.includes('end')
                            ? 'time'
                            : 'text'
                      }
                      value={String(v??'')}
                      onChange={e=>
                        setF({
                          ...f,
                          [k]:
                            [
                              'break_minutes',
                              'late_tolerance_minutes',
                              'attendance_radius_meters',
                              'attendance_max_accuracy_meters',
                              'attendance_latitude',
                              'attendance_longitude'
                            ].includes(k)
                              ? Number(e.target.value)
                              : e.target.value
                        })
                      }
                    />

                  )}

                </label>
              );
            })}

          </div>

        </div>
      )}

    </>
  );
}
function Audit() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('ALL');
  const [moduleFilter, setModuleFilter] = useState('ALL');
  const [selected, setSelected] = useState<any | null>(null);
  useEffect(() => {
    let mounted = true;

    const loadAudit = async () => {
      setLoading(true);

      const { data, error } = await supabase
        .from('hris_audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);

      if (mounted) {
        setRows(error ? [] : data || []);
        setLoading(false);
      }
    };

    loadAudit();

    return () => {
      mounted = false;
    };
  }, []);

  const normalize = (value: any) => {
    if (value === null || value === undefined) return '-';

    if (typeof value === 'object') {
      try {
        return JSON.stringify(value);
      } catch {
        return String(value);
      }
    }

    return String(value);
  };

  const getChangedFields = (row: any) => {
    const oldValue =
      row?.old ??
      row?.old_data ??
      row?.old_values ??
      row?.metadata?.old ??
      {};

    const newValue =
      row?.new ??
      row?.new_data ??
      row?.new_values ??
      row?.metadata?.new ??
      {};

    const oldObj =
      oldValue && typeof oldValue === 'object' ? oldValue : {};

    const newObj =
      newValue && typeof newValue === 'object' ? newValue : {};

    const keys = Array.from(
      new Set([...Object.keys(oldObj), ...Object.keys(newObj)])
    );

    return keys
      .filter(
        (key) =>
          JSON.stringify(oldObj[key]) !== JSON.stringify(newObj[key])
      )
      .map((key) => ({
        field: key,
        oldValue: oldObj[key],
        newValue: newObj[key],
      }));
  };

  const formatDate = (value: any) => {
    if (!value) return '-';

    try {
      return new Date(value).toLocaleString('id-ID', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    } catch {
      return String(value);
    }
  };

  const actionLabel = (action: any) => {
    const value = String(action || '-').toUpperCase();

    if (value === 'INSERT' || value === 'CREATE') return 'CREATE';
    if (value === 'UPDATE') return 'UPDATE';
    if (value === 'DELETE') return 'DELETE';

    return value;
  };

  const actionClass = (action: any) => {
    const value = actionLabel(action);

    if (value === 'CREATE') return 'audit-badge audit-create';
    if (value === 'UPDATE') return 'audit-badge audit-update';
    if (value === 'DELETE') return 'audit-badge audit-delete';

    return 'audit-badge';
  };

  const filteredRows = rows.filter((row) => {
    const action = actionLabel(row.action);
    const module = String(row.module || '-');

    const keyword = search.trim().toLowerCase();

    const searchable = [
      row.actor_email,
      row.actor_name,
      row.action,
      row.module,
      row.description,
      row.entity_id,
      row.entity_type,
      JSON.stringify(row.details || {}),
      JSON.stringify(row.old || {}),
      JSON.stringify(row.new || {}),
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    const matchesSearch =
      !keyword || searchable.includes(keyword);

    const matchesAction =
      actionFilter === 'ALL' || action === actionFilter;

    const matchesModule =
      moduleFilter === 'ALL' || module === moduleFilter;

    return matchesSearch && matchesAction && matchesModule;
  });

  const modules = Array.from(
    new Set(
      rows
        .map((row) => String(row.module || '-'))
        .filter(Boolean)
    )
  );

  return (
    <>
      <Heading
        title="Audit Log"
        desc="Riwayat aktivitas dan perubahan data yang tercatat di database."
      />

      <div className="panel" style={{ marginBottom: 16 }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns:
              'minmax(220px, 1fr) 180px 180px auto',
            gap: 10,
            alignItems: 'center',
          }}
        >
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari actor, action, module, ID..."
            style={{
              width: '100%',
              padding: '11px 13px',
              borderRadius: 10,
              border: '1px solid #d9dee8',
              outline: 'none',
            }}
          />

          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            style={{
              padding: '11px 13px',
              borderRadius: 10,
              border: '1px solid #d9dee8',
              background: '#fff',
            }}
          >
            <option value="ALL">Semua Action</option>
            <option value="CREATE">CREATE</option>
            <option value="UPDATE">UPDATE</option>
            <option value="DELETE">DELETE</option>
          </select>

          <select
            value={moduleFilter}
            onChange={(e) => setModuleFilter(e.target.value)}
            style={{
              padding: '11px 13px',
              borderRadius: 10,
              border: '1px solid #d9dee8',
              background: '#fff',
            }}
          >
            <option value="ALL">Semua Module</option>
            {modules.map((module) => (
              <option key={module} value={module}>
                {module}
              </option>
            ))}
          </select>

          <div
            style={{
              fontSize: 13,
              color: '#667085',
              whiteSpace: 'nowrap',
            }}
          >
            {filteredRows.length} aktivitas
          </div>
        </div>
      </div>

      <div className="panel table-panel">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Waktu</th>
                <th>Actor</th>
                <th>Action</th>
                <th>Module</th>
                <th>Entity</th>
                <th>Perubahan</th>
                <th style={{ textAlign: 'center' }}>Detail</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={7}
                    style={{
                      textAlign: 'center',
                      padding: 30,
                    }}
                  >
                    Memuat Audit Log...
                  </td>
                </tr>
              ) : filteredRows.length ? (
                filteredRows.map((row) => {
                  const changes = getChangedFields(row);

                  return (
                    <tr key={row.id}>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        {formatDate(row.created_at)}
                      </td>

                      <td>
                        <div
                          style={{
                            fontWeight: 600,
                            color: '#101828',
                          }}
                        >
                          {row.actor_email ||
                            row.actor_name ||
                            '-'}
                        </div>
                      </td>

                      <td>
                        <span className={actionClass(row.action)}>
                          {actionLabel(row.action)}
                        </span>
                      </td>

                      <td>
                        {row.module || '-'}
                      </td>

                      <td>
                        <div>
                          <strong>
                            {row.entity_type || '-'}
                          </strong>
                        </div>

                        {row.entity_id && (
                          <small
                            style={{
                              color: '#667085',
                              wordBreak: 'break-all',
                            }}
                          >
                            {row.entity_id}
                          </small>
                        )}
                      </td>

                      <td>
                        {changes.length ? (
                          <div
                            style={{
                              display: 'flex',
                              flexDirection: 'column',
                              gap: 4,
                            }}
                          >
                            {changes
                              .slice(0, 3)
                              .map((change) => (
                                <div
                                  key={change.field}
                                  style={{
                                    fontSize: 12,
                                  }}
                                >
                                  <strong>
                                    {change.field}
                                  </strong>
                                  :{' '}
                                  <span
                                    style={{
                                      color: '#b42318',
                                    }}
                                  >
                                    {normalize(
                                      change.oldValue
                                    )}
                                  </span>
                                  {' → '}
                                  <span
                                    style={{
                                      color: '#027a48',
                                    }}
                                  >
                                    {normalize(
                                      change.newValue
                                    )}
                                  </span>
                                </div>
                              ))}

                            {changes.length > 3 && (
                              <small
                                style={{
                                  color: '#667085',
                                }}
                              >
                                +{changes.length - 3} perubahan
                                lainnya
                              </small>
                            )}
                          </div>
                        ) : (
                          <span
                            style={{
                              color: '#98a2b3',
                            }}
                          >
                            Tidak ada perubahan field
                          </span>
                        )}
                      </td>

                      <td style={{ textAlign: 'center' }}>
                        <button
                          type="button"
                          onClick={() => setSelected(row)}
                          style={{
                            border: '1px solid #d0d5dd',
                            background: '#fff',
                            borderRadius: 8,
                            padding: '7px 11px',
                            cursor: 'pointer',
                            fontWeight: 600,
                          }}
                        >
                          Detail
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <Empty cols={7} />
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selected && (
        <div
          onClick={() => setSelected(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
            zIndex: 9999,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: 'min(1000px, 100%)',
              maxHeight: '85vh',
              overflow: 'auto',
              background: '#fff',
              borderRadius: 16,
              boxShadow: '0 20px 60px rgba(0,0,0,.2)',
              padding: 24,
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 20,
              }}
            >
              <div>
                <h2
                  style={{
                    margin: 0,
                    fontSize: 20,
                  }}
                >
                  Audit Detail
                </h2>

                <div
                  style={{
                    marginTop: 5,
                    color: '#667085',
                    fontSize: 13,
                  }}
                >
                  {formatDate(selected.created_at)}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelected(null)}
                style={{
                  border: 'none',
                  background: '#f2f4f7',
                  borderRadius: 8,
                  padding: '8px 12px',
                  cursor: 'pointer',
                }}
              >
                Tutup
              </button>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns:
                  'repeat(4, minmax(0, 1fr))',
                gap: 12,
                marginBottom: 20,
              }}
            >
              <div>
                <small>Actor</small>
                <div style={{ fontWeight: 600 }}>
                  {selected.actor_email ||
                    selected.actor_name ||
                    '-'}
                </div>
              </div>

              <div>
                <small>Action</small>
                <div style={{ marginTop: 5 }}>
                  <span
                    className={actionClass(selected.action)}
                  >
                    {actionLabel(selected.action)}
                  </span>
                </div>
              </div>

              <div>
                <small>Module</small>
                <div style={{ fontWeight: 600 }}>
                  {selected.module || '-'}
                </div>
              </div>

              <div>
                <small>Entity</small>
                <div style={{ fontWeight: 600 }}>
                  {selected.entity_type || '-'}
                </div>
              </div>
            </div>

            <h3
              style={{
                margin: '0 0 12px',
                fontSize: 16,
              }}
            >
              Perubahan Data
            </h3>

            <div
              style={{
                border: '1px solid #eaecf0',
                borderRadius: 12,
                overflow: 'hidden',
              }}
            >
              <table>
                <thead>
                  <tr>
                    <th>Field</th>
                    <th>OLD VALUE</th>
                    <th>NEW VALUE</th>
                  </tr>
                </thead>

                <tbody>
                  {getChangedFields(selected).length ? (
                    getChangedFields(selected).map(
                      (change) => (
                        <tr key={change.field}>
                          <td>
                            <strong>
                              {change.field}
                            </strong>
                          </td>

                          <td>
                            <span
                              style={{
                                color: '#b42318',
                                wordBreak: 'break-word',
                              }}
                            >
                              {normalize(
                                change.oldValue
                              )}
                            </span>
                          </td>

                          <td>
                            <span
                              style={{
                                color: '#027a48',
                                wordBreak: 'break-word',
                              }}
                            >
                              {normalize(
                                change.newValue
                              )}
                            </span>
                          </td>
                        </tr>
                      )
                    )
                  ) : (
                    <tr>
                      <td
                        colSpan={3}
                        style={{
                          textAlign: 'center',
                          padding: 20,
                        }}
                      >
                        Tidak ada perubahan field.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {selected.details && (
              <details style={{ marginTop: 20 }}>
                <summary
                  style={{
                    cursor: 'pointer',
                    fontWeight: 600,
                  }}
                >
                  Raw Details
                </summary>

                <pre
                  style={{
                    marginTop: 10,
                    background: '#101828',
                    color: '#f8fafc',
                    padding: 15,
                    borderRadius: 10,
                    overflow: 'auto',
                    fontSize: 12,
                  }}
                >
                  {JSON.stringify(
                    selected.details,
                    null,
                    2
                  )}
                </pre>
              </details>
            )}
          </div>
        </div>
      )}
    </>
  );
}
function Notifications(){const [rows,setRows]=useState<any[]>([]),[loading,setLoading]=useState(true);const load=async()=>{setLoading(true);const {data}=await supabase.from('hris_notifications').select('*').order('created_at',{ascending:false}).limit(100);setRows(data||[]);setLoading(false)};useEffect(()=>{load()},[]);const mark=async(id:string)=>{await supabase.from('hris_notifications').update({is_read:true}).eq('id',id);load()};return <><Heading title="Notifikasi" desc="Pusat pemberitahuan HRIS untuk approval, cuti, payroll, dan aktivitas penting."/><div className="panel table-panel"><div className="panel-head"><div><h2>Inbox HR</h2><p>{rows.filter(r=>!r.is_read).length} belum dibaca</p></div><button className="secondary" onClick={load}>Refresh</button></div><div className="notification-list">{loading?<div className="loading">Memuat…</div>:rows.length?rows.map(r=><button key={r.id} className={`notification-item ${r.is_read?'read':''}`} onClick={()=>mark(r.id)}><span className="notification-dot"/><span><b>{r.title}</b><small>{r.message}</small><em>{r.created_at?.replace('T',' ').slice(0,19)}</em></span></button>):<div className="empty-module"><h3>Tidak ada notifikasi</h3><p>Notifikasi sistem akan muncul di sini.</p></div>}</div></div></>}
function SystemHealth(){const [h,setH]=useState<any>(null),[err,setErr]=useState('');const load=async()=>{const {data,error}=await supabase.from('hris_system_health').select('*').maybeSingle();if(error)setErr(error.message);else setH(data)};useEffect(()=>{load()},[]);const cards=[['active_employees','Karyawan Aktif'],['pending_leave','Cuti Menunggu'],['pending_overtime','Lembur Menunggu'],['pending_payroll','Payroll Menunggu'],['pending_approvals','Approval Menunggu'],['unread_notifications','Notifikasi Belum Dibaca']];return <><Heading title="System Health" desc="Ringkasan kesehatan operasional HRIS dari database." action="Refresh" onAction={load}/>{err&&<div className="alert">{err}</div>}<div className="mini-kpi-row">{cards.map(([k,l])=><div className="stat-card" key={k}><span>{l}</span><strong>{h?.[k]??'—'}</strong></div>)}</div><div className="panel"><h3>Status layanan</h3><p>Database: <b>{h?'Operational':'Checking…'}</b></p><p>Terakhir diperiksa: {h?.checked_at?.replace('T',' ').slice(0,19)||'—'}</p></div></>}

function SimpleModal({title,onClose,onSave,children}:{title:string;onClose:()=>void;onSave:(e:FormEvent)=>void;children:ReactNode}){return <div className="drawer-backdrop"><aside className="edit-drawer"><div className="drawer-head"><h2>{title}</h2><button className="icon-btn" onClick={onClose}>×</button></div><form className="drawer-body" onSubmit={onSave}>{children}<div className="drawer-foot"><button type="button" className="secondary" onClick={onClose}>Batal</button><button className="primary">Simpan</button></div></form></aside></div>}
function Status({value}:{value:string}){const v=value.toLowerCase();const cls=v.includes('non')||v.includes('tolak')||v.includes('sakit')?'red':v.includes('terlambat')||v.includes('draft')||v.includes('menunggu')?'orange':v.includes('izin')?'blue':'green';return <span className={`status ${cls}`}>{value}</span>}
function Empty({cols}:{cols:number}){return <tr><td colSpan={cols} className="empty-cell">Belum ada data.</td></tr>}
function fieldLabel(k:string){return ({id_karyawan:'ID Karyawan',nama:'Nama Lengkap',jabatan:'Jabatan',email:'Email',no_telp:'No. Telepon',departemen:'Departemen',tanggal_masuk:'Tanggal Masuk',gaji_pokok:'Gaji Pokok',periode:'Periode',indikator:'Indikator',target:'Target',realisasi:'Realisasi',bobot:'Bobot',skor:'Skor',jumlah_kebutuhan:'Jumlah Kebutuhan',tanggal_buka:'Tanggal Buka',tanggal_tutup:'Tanggal Tutup',deskripsi:'Deskripsi',posisi:'Posisi',sumber:'Sumber',tahap:'Tahap',catatan:'Catatan',nilai:'Nilai',kandidat:'Kandidat',jam:'Jam',interviewer:'Interviewer',hasil:'Hasil',company_name:'Nama Perusahaan',work_start:'Jam Masuk',work_end:'Jam Pulang',break_minutes:'Istirahat (menit)',payday_day:'Hari Gajian',currency:'Mata Uang',timezone:'Timezone'})[k]||k}

===== src/styles/admin/admin.css =====

:root{--blue:#0B1736;--blue2:#12244D;--blue-soft:#FBF5E7;--ink:#0B1736;--muted:#64748B;--line:#E5EAF2;--surface:#fff;--bg:#F7F9FC;--green:#22A06B;--red:#D9534F;--orange:#B7791F;--purple:#A67C22}
*{box-sizing:border-box}.talenta-shell{min-height:100vh;background:var(--bg);color:var(--ink);display:flex;font-family:Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif}.talenta-sidebar{width:268px;background:#fff;border-right:1px solid var(--line);padding:18px 13px;display:flex;flex-direction:column;position:sticky;top:0;height:100vh;flex:none;overflow:auto}.talenta-sidebar.collapsed{width:76px}.brand{display:flex;align-items:center;gap:10px;padding:4px 8px 20px}.brand.center{justify-content:center}.brand-mark{width:37px;height:37px;border-radius:11px;background:linear-gradient(135deg,#2563eb,#7c3aed);color:white;display:grid;place-items:center;font-weight:850}.brand b{display:block;font-size:16px}.brand small{display:block;color:#8a93a3;font-size:10px;margin-top:1px}.workspace{border:1px solid var(--line);border-radius:11px;padding:11px;margin-bottom:15px;color:#8a93a3;font-size:9px}.workspace b{display:block;color:#344054;font-size:12px;margin-top:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.workspace small{display:block;margin-top:3px}.sidebar-nav{display:flex;flex-direction:column;gap:7px}.nav-group{display:flex;flex-direction:column;gap:2px}.group-title{border:0;background:transparent;color:#98a2b3;font-size:9px;font-weight:800;letter-spacing:.8px;padding:7px 10px 4px;display:flex;justify-content:space-between;cursor:pointer}.nav-item{border:0;background:transparent;color:#667085;border-radius:9px;display:flex;align-items:center;gap:10px;width:100%;padding:9px 10px;cursor:pointer;text-align:left;font-size:12px;min-height:37px}.nav-item:hover{background:#f5f7fa;color:#172033}.nav-item.active{background:var(--blue-soft);color:var(--blue);font-weight:750}.nav-icon{width:20px;text-align:center;font-size:13px}.nav-item em{margin-left:auto;background:#edf1f7;border-radius:99px;padding:2px 7px;font-style:normal;font-size:9px}.sidebar-bottom{margin-top:auto;padding-top:12px}.admin-mini{display:flex;align-items:center;gap:9px;border-top:1px solid var(--line);padding:13px 7px 8px}.admin-mini b{font-size:11px;display:block}.admin-mini small{font-size:9px;color:#98a2b3}.avatar{width:34px;height:34px;border-radius:50%;background:#dbeafe;color:#1d4ed8;display:grid;place-items:center;font-size:10px;font-weight:800}.logout{width:100%;border:0;background:transparent;color:#9a3a3a;padding:9px;text-align:left;cursor:pointer;border-radius:9px}.logout:hover{background:#fff1f2}.talenta-main{min-width:0;flex:1}.topbar{height:64px;background:#fff;border-bottom:1px solid var(--line);display:flex;align-items:center;padding:0 28px;gap:18px;position:sticky;top:0;z-index:5}.icon-btn{border:0;background:transparent;color:#667085;font-size:18px;cursor:pointer}.crumb{font-size:12px;font-weight:700;display:flex;gap:8px;align-items:center}.crumb span{color:#98a2b3}.crumb b{color:#d0d5dd}.top-actions{margin-left:auto;display:flex;align-items:center;gap:13px}.search-global{height:38px;width:min(330px,35vw);border:1px solid var(--line);border-radius:9px;display:flex;align-items:center;padding:0 11px;gap:8px;background:#fbfcfe}.search-global input{border:0;outline:0;background:transparent;width:100%;font-size:12px}.page{padding:27px;max-width:1600px;margin:auto}.page-heading{display:flex;justify-content:space-between;gap:20px;align-items:flex-start;margin-bottom:21px}.page-heading h1{font-size:25px;margin:4px 0 5px;color:#172033;font-weight:780;letter-spacing:-.5px}.page-heading p,.panel-head p{margin:0;color:var(--muted);font-size:12px;line-height:1.5}.eyebrow{font-size:9px;color:var(--blue);font-weight:850;letter-spacing:1.4px}.primary,.secondary{border-radius:8px;padding:10px 14px;font-weight:700;font-size:11px;cursor:pointer}.primary{background:var(--blue);color:#fff;border:1px solid var(--blue);box-shadow:0 2px 5px #2563eb25}.primary:hover{background:#1d4ed8}.secondary{background:#fff;border:1px solid #d9dee8;color:#344054}.full{width:100%}.stat-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:13px;margin-bottom:15px}.stat-grid.three{grid-template-columns:repeat(3,minmax(0,1fr))}.stat-card{background:#fff;border:1px solid var(--line);border-radius:12px;padding:17px;display:flex;gap:12px;align-items:flex-start;box-shadow:0 1px 2px #10182808}.stat-icon{width:38px;height:38px;border-radius:9px;background:#eff6ff;color:#2563eb;display:grid;place-items:center;font-size:13px;font-weight:800;flex:none}.stat-card span,.stat-card small{display:block;color:#667085;font-size:10px}.stat-card strong{display:block;color:#172033;font-size:19px;margin:4px 0 2px;line-height:1.1}.mini-kpi-row{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:17px}.mini-kpi{background:#fff;border:1px solid var(--line);border-radius:10px;padding:11px 13px;position:relative}.mini-kpi span{font-size:9px;color:#98a2b3;display:block}.mini-kpi b{font-size:15px;display:block;margin-top:3px}.mini-kpi i{position:absolute;right:12px;top:15px;font-style:normal;color:var(--green);font-size:11px}.content-grid{display:grid;grid-template-columns:minmax(0,1fr) 285px;gap:16px}.panel{background:#fff;border:1px solid var(--line);border-radius:12px;box-shadow:0 1px 2px #10182808;overflow:hidden}.panel-head{padding:17px;display:flex;justify-content:space-between;align-items:center;gap:12px}.panel-head h2,.quick h2,.settings h2{margin:0 0 4px;font-size:14px}.link-btn{border:0;background:none;color:var(--blue);font-weight:700;font-size:10px;cursor:pointer}.quick{padding:17px}.quick p{color:var(--muted);font-size:10px;margin:0 0 12px}.quick-action{display:flex;align-items:center;gap:9px;width:100%;padding:11px 0;border:0;border-top:1px solid var(--line);background:transparent;text-align:left;font-size:11px;color:#344054;cursor:pointer}.quick-action>span:last-child{margin-left:auto;color:#98a2b3}.quick-icon{width:26px;height:26px;border-radius:7px;background:#f3f6fa;display:grid;place-items:center;color:var(--blue)}.table-panel{margin-top:13px}.table-wrap{overflow:auto}table{width:100%;border-collapse:collapse;font-size:10.5px;min-width:760px}th{background:#fafbfc;color:#667085;font-weight:750;text-align:left;padding:11px 14px;border-bottom:1px solid var(--line);white-space:nowrap}td{padding:11px 14px;border-bottom:1px solid #f0f2f5;color:#344054;vertical-align:middle}tr:hover td{background:#fbfcff}td b{font-weight:700;color:#1d2939}td small{display:block;color:#98a2b3;font-size:9px;margin-top:2px}.green{color:var(--green)!important}.muted{color:#98a2b3!important}.status{display:inline-block;padding:4px 7px;border-radius:99px;font-size:9px;font-weight:700}.status.green{background:#ecfdf3;color:#087443}.status.red{background:#fef2f2;color:#b42318}.status.orange{background:#fff7ed;color:#b45309}.status.blue{background:#eff6ff;color:#1d4ed8}.person{display:flex;align-items:center;gap:8px}.mini-avatar{width:28px;height:28px;border-radius:8px;background:#eef2ff;color:#4f46e5;display:grid;place-items:center;font-weight:800;font-size:10px}.danger-text{border:0;background:none;color:#dc2626;font-size:10px;cursor:pointer}.selfie{width:35px;height:35px;border-radius:7px;object-fit:cover}.selfie.blank{background:#f3f4f6;display:grid;place-items:center;color:#98a2b3}.toolbar,.filter-row{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:10px}.filter-row{justify-content:flex-start}.filter{border:1px solid var(--line);background:#fff;padding:7px 10px;border-radius:7px;font-size:10px;color:#667085}.filter.active{color:var(--blue);background:var(--blue-soft);border-color:#bfdbfe}.loading{position:fixed;top:72px;right:25px;background:#172033;color:#fff;padding:8px 12px;border-radius:8px;font-size:10px;z-index:20}.alert,.form-error{background:#fef2f2;color:#b42318;border:1px solid #fecaca;padding:10px 12px;border-radius:8px;font-size:10px;margin-bottom:12px}.empty-cell{text-align:center!important;padding:35px!important;color:#98a2b3!important}.form-panel{padding:20px}.form-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:15px}.form-grid label,.login-card label{display:flex;flex-direction:column;gap:6px;font-size:10px;color:#475467;font-weight:700}.form-grid input,.login-card input{height:39px;border:1px solid #d8dee8;border-radius:8px;padding:0 11px;outline:none;font-size:11px;background:#fff}.form-grid input:focus,.login-card input:focus{border-color:#93c5fd;box-shadow:0 0 0 3px #dbeafe}.full-span{grid-column:1/-1}.form-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:3px}.org-grid,.calendar-grid,.feature-grid,.report-grid,.settings-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:13px}.org-card,.calendar-card,.feature-card,.report-card,.setting-card{background:#fff;border:1px solid var(--line);border-radius:12px;padding:17px;box-shadow:0 1px 2px #10182808}.org-icon,.feature-icon,.setting-icon{width:36px;height:36px;border-radius:9px;background:#eff6ff;color:var(--blue);display:grid;place-items:center;font-weight:800}.org-card h3,.calendar-card h3,.feature-card h3,.report-card h3,.setting-card h3{font-size:13px;margin:13px 0 5px}.org-card p,.calendar-card p,.feature-card p,.report-card p,.setting-card p{font-size:10px;color:var(--muted);line-height:1.5;margin:0 0 12px}.progress{height:5px;background:#eef2f6;border-radius:99px;overflow:hidden}.progress span{display:block;height:100%;background:var(--blue);border-radius:99px}.report-card span{font-size:8px;color:#98a2b3;font-weight:800;letter-spacing:1px}.report-card>b{font-size:24px;display:block;margin-top:12px}.chart-placeholder{height:260px;padding:25px 30px 20px;display:flex;flex-direction:column;justify-content:flex-end}.bars{height:190px;display:flex;align-items:flex-end;gap:15px;border-bottom:1px solid var(--line)}.bars i{flex:1;max-width:55px;background:linear-gradient(#60a5fa,#2563eb);border-radius:6px 6px 0 0}.chart-labels{display:flex;justify-content:space-between;padding-top:8px;color:#98a2b3;font-size:9px}.feature-grid,.settings-grid{margin-bottom:14px}.empty-module{padding:55px 25px;text-align:center}.empty-icon{margin:auto;width:48px;height:48px;border-radius:13px;background:#eff6ff;color:var(--blue);display:grid;place-items:center;font-size:20px}.empty-module h3{font-size:14px;margin:14px 0 5px}.empty-module p{max-width:520px;margin:auto;color:var(--muted);font-size:11px;line-height:1.6}.badge-soft{background:#f2f4f7;color:#667085;border-radius:99px;padding:5px 8px;font-size:9px}.login-wrap{min-height:100vh;background:linear-gradient(135deg,#f8fbff,#eef2ff);display:grid;place-items:center;padding:20px}.login-card{width:min(420px,100%);background:#fff;border:1px solid var(--line);border-radius:18px;padding:32px;box-shadow:0 20px 60px #10182818}.login-card h1{font-size:25px;margin:28px 0 5px}.login-card>p{font-size:11px;color:var(--muted);margin:0 0 22px}.login-card form{display:grid;gap:14px}.security-note{display:block;color:#98a2b3;font-size:9px;line-height:1.5;margin-top:16px}.form-error{margin:0}.center{justify-content:center}.center>div:last-child{text-align:left}@media(max-width:1050px){.talenta-sidebar{width:220px}.content-grid{grid-template-columns:1fr}.stat-grid{grid-template-columns:repeat(2,1fr)}.mini-kpi-row{grid-template-columns:repeat(2,1fr)}.org-grid,.calendar-grid,.feature-grid,.report-grid,.settings-grid{grid-template-columns:repeat(2,1fr)}}@media(max-width:700px){.talenta-sidebar{width:76px}.talenta-sidebar .brand>div:last-child,.workspace,.group-title,.nav-item>span:nth-child(2),.admin-mini>div:last-child,.logout{display:none}.talenta-sidebar .nav-item{justify-content:center}.page{padding:17px}.topbar{padding:0 14px}.search-global{width:150px}.page-heading{flex-direction:column}.stat-grid,.stat-grid.three,.mini-kpi-row,.org-grid,.calendar-grid,.feature-grid,.report-grid,.settings-grid,.form-grid{grid-template-columns:1fr}.top-actions .icon-btn{display:none}}

.row-actions{display:flex;align-items:center;gap:10px}.drawer-backdrop{position:fixed;inset:0;background:#10182855;z-index:50;display:flex;justify-content:flex-end}.edit-drawer{width:min(500px,100%);height:100%;background:#fff;box-shadow:-20px 0 60px #10182822;display:flex;flex-direction:column}.drawer-head{padding:20px;border-bottom:1px solid var(--line);display:flex;justify-content:space-between;align-items:flex-start}.drawer-head span{font-size:8px;color:var(--blue);font-weight:850;letter-spacing:1.2px}.drawer-head h2{font-size:20px;margin:5px 0 0}.drawer-body{padding:20px;display:grid;grid-template-columns:1fr 1fr;gap:15px;overflow:auto}.drawer-body label{display:flex;flex-direction:column;gap:6px;font-size:10px;color:#475467;font-weight:700}.drawer-body input:not([type=checkbox]){height:39px;border:1px solid #d8dee8;border-radius:8px;padding:0 10px;font-size:11px}.switch-row{grid-column:1/-1;flex-direction:row!important;align-items:center;justify-content:space-between;border:1px solid var(--line);padding:12px;border-radius:9px}.drawer-foot{border-top:1px solid var(--line);padding:15px 20px;display:flex;justify-content:flex-end;gap:8px}.toast{position:fixed;right:25px;bottom:25px;z-index:60;border:1px solid #bbf7d0;background:#f0fdf4;color:#166534;border-radius:10px;padding:11px 14px;box-shadow:0 12px 35px #10182818;font-size:11px;cursor:pointer}
@media(max-width:600px){.drawer-body{grid-template-columns:1fr}}

.branch-nav{display:flex;gap:7px;flex-wrap:wrap;margin:-7px 0 18px;padding:5px;background:#fff;border:1px solid var(--line);border-radius:11px;width:max-content;max-width:100%;box-shadow:0 1px 2px #10182808}.branch-nav button{border:0;background:transparent;color:#667085;padding:9px 12px;border-radius:8px;font-size:10px;font-weight:700;cursor:pointer;display:flex;align-items:center;gap:6px}.branch-nav button:hover{background:#f5f7fa;color:#172033}.branch-nav button.active{background:var(--blue-soft);color:var(--blue)}.branch-nav button span{font-size:12px}.clickable{transition:.15s}.clickable:hover{transform:translateY(-1px);border-color:#bfdbfe;box-shadow:0 6px 20px #1018280c}.split-module{display:grid;grid-template-columns:300px minmax(0,1fr);gap:14px}.list-select{display:flex;width:100%;border:0;border-top:1px solid var(--line);background:#fff;padding:14px 17px;justify-content:space-between;align-items:center;color:#344054;font-size:11px;cursor:pointer;text-align:left}.list-select:hover,.list-select.active{background:var(--blue-soft);color:var(--blue)}.detail-panel{padding:22px}.detail-panel h2{font-size:19px;margin:7px 0 4px}.detail-panel>p{font-size:11px;color:var(--muted);margin:0 0 20px}.detail-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:10px}.info-box{border:1px solid var(--line);border-radius:9px;padding:12px;background:#fafbfc}.info-box span{display:block;color:#98a2b3;font-size:9px}.info-box b{display:block;margin-top:5px;font-size:13px}.detail-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:18px}.assignment-list{padding:0 17px 17px}.assignment-row{display:flex;width:100%;align-items:center;gap:12px;padding:13px 0;border:0;border-top:1px solid var(--line);background:transparent;text-align:left;cursor:pointer;font-size:11px}.assignment-row span{color:#98a2b3}.assignment-row em{margin-left:auto;color:var(--blue);font-style:normal;font-weight:700;font-size:10px}.assignment-row:hover b{color:var(--blue)}
@media(max-width:700px){.branch-nav{width:100%;overflow:auto;flex-wrap:nowrap}.branch-nav button{white-space:nowrap}.split-module{grid-template-columns:1fr}.detail-grid{grid-template-columns:1fr}}
/* MoonHR Enterprise visual layer: aligns admin modules with the public brand. */
:root{--blue:#0f172a;--blue2:#172554;--blue-soft:#f7f1dc;--ink:#172033;--muted:#667085;--line:#e7eaf0;--surface:#fff;--bg:#f7f8fb;--green:#157347;--red:#b42318;--orange:#9a6700;--purple:#6d5bd0}
.talenta-shell{background:var(--bg)}
.talenta-sidebar{background:linear-gradient(180deg,#0b1222 0%,#111b33 100%);border-right:1px solid #1e293b}
.talenta-sidebar .brand{color:#fff}.talenta-sidebar .brand-mark{background:linear-gradient(135deg,#0f172a,#1e3a8a)!important;color:#d8bd59!important;border:1px solid #9a7a13!important}
.nav-item:hover{background:#ffffff0d!important}.nav-item.active{background:linear-gradient(90deg,#ffffff12,#ffffff08)!important;color:#f5df86!important;border-left-color:#c9a227!important}
.group-title{color:#94a3b8!important}.topbar{background:#fff;border-bottom:1px solid var(--line)}
.primary{background:linear-gradient(135deg,#0f172a,#172554)!important;border-color:#c9a227!important;color:#f5df86!important}.secondary{background:#fff!important;border-color:#d8dee8!important;color:#344054!important}.secondary:hover{background:#f7f1dc!important;border-color:#c9a227!important}
.stat-card,.panel,.login-card,.branch-nav,.info-box{box-shadow:0 8px 30px rgba(15,23,42,.045)!important}.stat-icon{background:#f7f1dc!important;color:#8a6b0b!important}.green{color:#157347!important}.link-btn{color:#8a6b0b!important}.badge-soft{background:#f7f1dc!important;color:#6e5707!important}
.login-wrap{background:radial-gradient(circle at 15% 10%,#eef3ff 0,#f7f8fb 42%,#fff 100%)!important}.login-card{border-radius:20px}.login-card .brand-mark{background:linear-gradient(135deg,#0f172a,#172554)!important;color:#d8bd59!important;border:1px solid #c9a227!important}
.branch-nav button.active,.list-select:hover,.list-select.active{background:#f7f1dc!important;color:#8a6b0b!important}.clickable:hover{border-color:#d8bd59!important}.drawer-head span{color:#8a6b0b!important}
.payroll-module .page-heading h1{margin-bottom:4px}.payroll-module .page-heading p{color:var(--muted);font-size:11px}.payroll-policy-list{display:grid;gap:10px}.payroll-policy-list>div{padding:14px;border:1px solid var(--line);border-radius:10px;background:#fafbfc}.payroll-policy-list b,.payroll-policy-list span{display:block}.payroll-policy-list b{font-size:11px}.payroll-policy-list span{font-size:10px;color:var(--muted);margin-top:4px;line-height:1.5}.payroll-steps{display:grid;gap:10px}.payroll-steps>div{display:grid;grid-template-columns:35px 1fr;column-gap:10px;padding:12px;border:1px solid var(--line);border-radius:10px}.payroll-steps strong{grid-row:1/3;color:#9a7a13}.payroll-steps b{font-size:11px}.payroll-steps span{font-size:9px;color:var(--muted);margin-top:3px}
.toolbar-panel{display:flex;gap:18px;align-items:end;flex-wrap:wrap;background:var(--panel,#fff);border:1px solid var(--line,#e7e9ef);border-radius:18px;padding:16px;margin-bottom:18px}.toolbar-panel label{display:flex;flex-direction:column;gap:6px;font-size:12px;font-weight:700}.toolbar-panel input,.toolbar-panel select,.toolbar-panel textarea,.inline-form input{padding:10px 12px;border:1px solid #dfe3ea;border-radius:10px;background:#fff}.stat-inline{display:flex;flex-direction:column;min-width:120px}.stat-inline b{font-size:20px}.stat-inline span{font-size:11px;color:#6b7280}.kanban-grid{display:grid;grid-template-columns:repeat(6,minmax(180px,1fr));gap:12px;overflow:auto}.kanban-col{background:#f6f7f9;border:1px solid #e5e7eb;border-radius:14px;padding:10px;min-height:380px}.kanban-head{display:flex;justify-content:space-between;padding:8px;border-bottom:1px solid #e5e7eb;margin-bottom:8px}.kanban-head span{background:#fff;border-radius:99px;padding:2px 7px;font-size:11px}.kanban-card{background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:12px;margin:8px 0;display:flex;flex-direction:column;gap:6px;box-shadow:0 2px 8px rgba(0,0,0,.03)}.kanban-card small{color:#6b7280}.kanban-card select{font-size:11px;border:1px solid #e5e7eb;border-radius:8px;padding:6px}.role-builder{display:grid;grid-template-columns:300px 1fr;gap:18px}.role-list-item{display:flex;width:100%;flex-direction:column;text-align:left;border:0;background:transparent;padding:12px;border-radius:10px;margin-top:4px}.role-list-item.active{background:#eef2ff}.role-list-item small{color:#6b7280}.inline-form{display:flex;gap:8px;margin-bottom:12px}.permission-grid{display:grid;grid-template-columns:repeat(3,minmax(180px,1fr));gap:8px;margin:18px 0}.permission-item{padding:10px;border:1px solid #e5e7eb;border-radius:9px;font-size:12px;background:#fafafa}.permission-item input{margin-right:8px}@media(max-width:900px){.role-builder{grid-template-columns:1fr}.permission-grid{grid-template-columns:repeat(2,1fr)}.kanban-grid{grid-template-columns:repeat(2,minmax(180px,1fr))}}@media(max-width:600px){.permission-grid{grid-template-columns:1fr}.kanban-grid{grid-template-columns:1fr}}

/* Enterprise UX v2: navigation, accessibility and responsive polish */
.nav-item{position:relative;min-height:42px}.nav-item.active:before{content:"";position:absolute;left:0;top:8px;bottom:8px;width:3px;border-radius:0 3px 3px 0}.group-title{letter-spacing:.08em;text-transform:uppercase}.search-global input{outline:none}.search-global:focus-within{border-color:#c9a227;box-shadow:0 0 0 3px #c9a22718}.topbar{position:sticky;top:0;z-index:20}.panel,.stat-card{transition:box-shadow .18s ease,transform .18s ease}.panel:hover{box-shadow:0 10px 34px rgba(15,23,42,.06)!important}.primary:focus-visible,.secondary:focus-visible,.nav-item:focus-visible,.group-title:focus-visible,.icon-btn:focus-visible{outline:3px solid #c9a22755;outline-offset:2px}.status{white-space:nowrap}.table-wrap{scrollbar-width:thin}.page{min-height:calc(100vh - 68px)}.mini-kpi-row{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-bottom:16px}.mini-kpi-row .stat-card{min-height:92px}.mini-kpi-row .stat-card strong{font-size:25px}.workspace{border-radius:12px}.role-builder .panel{min-height:100%}.permission-item{transition:.15s ease}.permission-item:has(input:checked){border-color:#c9a227;background:#fffaf0}.kanban-card select:focus,.toolbar-panel input:focus,.toolbar-panel select:focus,.drawer-body input:focus,.drawer-body select:focus,.drawer-body textarea:focus{outline:none;border-color:#c9a227;box-shadow:0 0 0 3px #c9a22718}.drawer-body textarea{min-height:100px;padding:10px;border:1px solid #d8dee8;border-radius:8px;resize:vertical}.full-span{grid-column:1/-1}@media(max-width:900px){.mini-kpi-row{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:600px){.mini-kpi-row{grid-template-columns:1fr}.topbar{position:sticky}.page{padding-bottom:80px}.drawer-foot{position:sticky;bottom:0;background:#fff}}

/* V3 visual system */
.ui-icon{width:18px;height:18px;display:block;flex:0 0 18px}
.nav-icon{display:grid;place-items:center;width:24px;height:24px;opacity:.86}
.nav-item.active .nav-icon{opacity:1}
.compact-input{max-width:240px;padding:10px 12px;border:1px solid var(--border,#dfe3ea);border-radius:10px;background:var(--surface,#fff)}
.permission-section{margin:18px 0 24px}.permission-section h4{margin:0 0 10px;font-size:11px;letter-spacing:.12em;opacity:.65}.permission-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.permission-item{display:flex;align-items:center;gap:8px;padding:9px 10px;border:1px solid var(--border,#e3e6eb);border-radius:9px;font-size:13px;background:rgba(255,255,255,.02)}.permission-item input{accent-color:#b78a2c}.permission-item:has(input:checked){border-color:#b78a2c66;background:#b78a2c0d}
@media(max-width:700px){.permission-grid{grid-template-columns:1fr}.compact-input{max-width:none;width:100%}}

.brand-mark img{width:26px;height:26px;display:block}.search-global>span{display:grid;place-items:center}.search-global .ui-icon{width:16px;height:16px}


/* V5 enterprise surfaces */
.employee-picker{min-width:260px;max-width:340px;padding:12px 14px;border:1px solid var(--line,#dfe5ee);border-radius:12px;background:#fff;font-weight:700}.employee-hero{display:flex;align-items:center;gap:18px;margin-bottom:16px}.employee-avatar{width:64px;height:64px;border-radius:18px;display:grid;place-items:center;background:linear-gradient(135deg,#101b35,#c7a86b);color:#fff;font-weight:800;font-size:20px}.employee-hero-copy{flex:1}.employee-hero-copy h2{margin:0 0 5px}.employee-hero-copy p{margin:0 0 4px;font-weight:700}.employee-hero-copy small{opacity:.7}.employee-hero-meta{display:grid;gap:4px;text-align:right}.employee-hero-meta b{font-size:12px;text-transform:uppercase;letter-spacing:.08em}.employee-hero-meta span{font-size:12px;opacity:.7}.employee-overview{display:grid;grid-template-columns:1fr 1fr;gap:32px}.employee-overview dl{display:grid;grid-template-columns:150px 1fr;gap:10px 18px;margin:16px 0}.employee-overview dt{font-size:12px;text-transform:uppercase;letter-spacing:.06em;opacity:.6}.employee-overview dd{margin:0;font-weight:700}.big-money{font-size:28px}.employee-overview h3{margin-top:0}.employee-overview h3:not(:first-child){margin-top:26px}@media(max-width:800px){.employee-hero{align-items:flex-start;flex-wrap:wrap}.employee-hero-meta{text-align:left}.employee-overview{grid-template-columns:1fr}.employee-picker{width:100%;max-width:none}}

.notification-list{display:flex;flex-direction:column}.notification-item{display:flex;gap:12px;align-items:flex-start;width:100%;padding:16px;border:0;border-bottom:1px solid var(--line,#e5e7eb);background:transparent;text-align:left;cursor:pointer}.notification-item:hover{background:rgba(15,23,42,.03)}.notification-item.read{opacity:.62}.notification-dot{width:8px;height:8px;border-radius:50%;background:currentColor;margin-top:7px;flex:0 0 auto}.notification-item span:nth-child(2){display:flex;flex-direction:column;gap:4px}.notification-item small{font-size:13px;line-height:1.45}.notification-item em{font-size:11px;opacity:.65;font-style:normal}.loading{padding:16px}

/* V7 HR Operations */
.branch-tabs{display:flex;gap:7px;overflow:auto;padding:4px;margin-bottom:14px;border-bottom:1px solid var(--line);}
.branch-tabs button{border:0;background:transparent;padding:10px 13px;border-radius:8px 8px 0 0;color:#667085;font-size:11px;font-weight:700;white-space:nowrap;cursor:pointer}
.branch-tabs button.active{background:#eff6ff;color:#2563eb}
.compact-panel{padding:16px;margin-bottom:13px;overflow:visible}
.compact-panel h3{font-size:13px;margin:0 0 12px}
.compact-panel .form-grid{align-items:end}
.compact-panel select,.compact-panel input{height:39px;border:1px solid #d8dee8;border-radius:8px;padding:0 10px;font-size:11px;background:#fff;min-width:0}
.status-pill{display:inline-flex;padding:4px 8px;border-radius:999px;background:#eef2ff;color:#334155;font-size:9px;font-weight:750;white-space:nowrap}
.modal-backdrop{position:fixed;inset:0;background:rgba(15,23,42,.42);display:grid;place-items:center;padding:20px;z-index:100}
.modal{width:min(620px,100%);max-height:90vh;overflow:auto;background:#fff;border-radius:16px;border:1px solid var(--line);padding:20px;box-shadow:0 24px 80px rgba(15,23,42,.22);display:grid;gap:12px}
.modal-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:3px}
.modal-head h3{margin:0;font-size:15px}.modal-head button{border:0;background:#f3f4f6;border-radius:8px;width:30px;height:30px;cursor:pointer;font-size:18px}
.modal label{display:flex;flex-direction:column;gap:6px;font-size:10px;color:#475467;font-weight:700}
.modal input,.modal select,.modal textarea{border:1px solid #d8dee8;border-radius:8px;min-height:39px;padding:9px 11px;font-size:11px;background:#fff}
.modal textarea{min-height:80px;resize:vertical}
@media(max-width:700px){.branch-tabs{margin-left:-4px;margin-right:-4px}.compact-panel .form-grid{grid-template-columns:1fr}.modal-backdrop{padding:10px}.modal{max-height:94vh}}


/* V8 Production HR */
.module-page{padding-bottom:40px}.module-page .page-heading{display:flex;justify-content:space-between;gap:24px;margin-bottom:22px}.module-page .eyebrow{font-size:11px;letter-spacing:.14em;font-weight:800;opacity:.65}.module-page h1{margin:6px 0;font-size:28px}.module-page .page-heading p{margin:0;color:var(--muted,#667085)}.branch-tabs{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:18px;border-bottom:1px solid rgba(15,23,42,.08);padding-bottom:10px}.branch-tabs button{border:0;background:transparent;padding:10px 13px;border-radius:8px;cursor:pointer}.branch-tabs button.active{background:rgba(37,99,235,.10);font-weight:800}.compact-panel form{margin-top:10px}.compact-panel .form-grid{align-items:end}.table-panel{overflow:hidden}.table-panel table{width:100%;border-collapse:collapse}.table-panel th,.table-panel td{padding:12px 14px;border-bottom:1px solid rgba(15,23,42,.07);text-align:left}.table-panel th{font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:var(--muted,#667085);background:rgba(15,23,42,.025)}@media(max-width:700px){.module-page h1{font-size:23px}.branch-tabs{overflow:auto;flex-wrap:nowrap}.branch-tabs button{white-space:nowrap}.table-panel{overflow-x:auto}.table-panel table{min-width:680px}}

/* ================= V37 EXECUTIVE UI ================= */
.executive-dashboard{max-width:1500px;margin:0 auto}.command-strip{display:flex;justify-content:space-between;align-items:center;gap:20px;padding:14px 17px;margin:-4px 0 15px;background:linear-gradient(135deg,#101b34,#17284a);border:1px solid #25365b;border-radius:14px;color:#fff;box-shadow:0 8px 22px rgba(16,27,52,.12)}.command-strip strong{display:block;font-size:13px;margin:3px 0}.command-strip small{display:block;color:#b9c5da;font-size:9px}.strip-meta{display:flex;align-items:center;gap:12px;color:#aebbd0;font-size:9px}.executive-stats .stat-card{min-height:112px;border-radius:14px;padding:18px;box-shadow:0 5px 18px rgba(16,24,40,.05)}.executive-stats .stat-icon{width:42px;height:42px;border-radius:11px}.dashboard-grid-top{display:grid;grid-template-columns:minmax(0,1.55fr) minmax(290px,.75fr);gap:16px;margin-bottom:16px}.dashboard-grid-bottom{display:grid;grid-template-columns:minmax(0,1fr) 285px;gap:16px}.executive-chart,.attendance-health{min-height:330px}.eyebrow{display:inline-block;font-size:8px;letter-spacing:1.5px;font-weight:850;color:#7182a5;margin-bottom:2px}.department-bars{padding:3px 20px 20px}.dept-row{margin:18px 0}.dept-label{display:flex;justify-content:space-between;align-items:center;font-size:10px;color:#475467;margin-bottom:7px}.dept-label b{font-size:11px;color:#172033}.dept-row .progress{height:7px;background:#eef2f7}.dept-row .progress span{background:linear-gradient(90deg,#243b69,#c5a15b)}.health-ring{width:150px;height:150px;margin:13px auto 17px;border-radius:50%;display:grid;place-items:center;background:conic-gradient(#c5a15b var(--rate),#e9edf3 0deg);position:relative}.health-ring:before{content:"";position:absolute;inset:13px;border-radius:50%;background:#fff}.health-ring>div{position:relative;text-align:center}.health-ring strong{display:block;font-size:27px;letter-spacing:-1px;color:#172033}.health-ring small{font-size:9px;color:#98a2b3}.health-legend{padding:0 20px 18px;display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.health-legend>div{display:grid;grid-template-columns:9px 1fr;column-gap:6px;align-items:center}.health-legend .dot{grid-row:span 2;width:7px;height:7px;border-radius:50%;background:#94a3b8}.health-legend .dot.present{background:#159447}.health-legend .dot.late{background:#d97706}.health-legend .dot.absent{background:#98a2b3}.health-legend span{font-size:8px;color:#667085}.health-legend b{font-size:12px;color:#172033}.executive-quick{overflow:hidden}.executive-quick .panel-head{padding-bottom:7px}.executive-quick .quick-action{padding:12px 17px}.executive-quick .quick-action:first-of-type{border-top:0}.login-wrap{background:radial-gradient(circle at 75% 15%,#263a68 0,transparent 30%),linear-gradient(135deg,#091226,#142344);}.login-card{box-shadow:0 25px 70px rgba(0,0,0,.28);border-color:#d9dee8}.brand-mark{background:#17284a!important;border:1px solid #c5a15b;box-shadow:0 4px 16px rgba(197,161,91,.18)}
@media(max-width:1100px){.dashboard-grid-top{grid-template-columns:1fr}.dashboard-grid-bottom{grid-template-columns:1fr}.attendance-health{min-height:auto}}
@media(max-width:700px){.command-strip{align-items:flex-start;flex-direction:column}.strip-meta{width:100%;justify-content:space-between}.executive-stats{grid-template-columns:repeat(2,minmax(0,1fr))}.health-legend{grid-template-columns:1fr}.page{padding:18px}.topbar{padding:0 16px}.search-global{width:170px}.page-heading{flex-direction:column}.page-heading .primary{width:100%}}

/* V38 ENTERPRISE DESIGN SYSTEM — consistent treatment across every HR module */
:root{
  --mx-navy:#0b1630;--mx-navy-2:#122343;--mx-gold:#caa75e;--mx-gold-soft:#fbf6e9;
  --mx-bg:#f4f6f9;--mx-card:#fff;--mx-line:#e4e8ef;--mx-text:#172033;--mx-muted:#667085;
  --mx-radius:14px;--mx-shadow:0 4px 18px rgba(15,23,42,.045)
}
.talenta-shell{background:var(--mx-bg);font-family:Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif}
.talenta-sidebar{width:276px;background:linear-gradient(180deg,#0b1630 0%,#101d3b 100%);border-right:0;padding:18px 14px;color:#fff;box-shadow:10px 0 30px rgba(15,23,42,.08)}
.talenta-sidebar.collapsed{width:78px}.talenta-sidebar .brand{padding:5px 8px 22px}.talenta-sidebar .brand b{color:#fff;font-size:15px;letter-spacing:-.2px}.talenta-sidebar .brand small{color:#aab6ca}.talenta-sidebar .brand-mark{background:linear-gradient(135deg,#caa75e,#f1d78e);box-shadow:0 5px 16px rgba(202,167,94,.2)}
.workspace{background:rgba(255,255,255,.055);border-color:rgba(255,255,255,.1);color:#91a0b8}.workspace b{color:#fff}.workspace small{color:#91a0b8}
.group-title{color:#7f8da5}.nav-item{color:#b7c1d1;border-radius:10px;min-height:39px}.nav-item:hover{background:rgba(255,255,255,.07);color:#fff}.nav-item.active{background:linear-gradient(90deg,rgba(202,167,94,.2),rgba(202,167,94,.08));color:#f3d88f;box-shadow:inset 3px 0 0 var(--mx-gold)}.nav-item em{background:rgba(255,255,255,.08);color:#c9d2df}.nav-icon{color:inherit}.admin-mini{border-top-color:rgba(255,255,255,.1)}.admin-mini b{color:#fff}.admin-mini small{color:#8d9bb1}.avatar{background:#d8bf7e;color:#172033}.logout{color:#f0a0a0}.logout:hover{background:rgba(255,255,255,.07)}
.topbar{height:68px;padding:0 30px;box-shadow:0 1px 0 rgba(15,23,42,.02);background:rgba(255,255,255,.97);backdrop-filter:blur(10px)}.crumb{font-size:12px}.top-actions{gap:10px}.search-global{height:40px;border-radius:10px;background:#f8fafc}
.page{padding:30px;max-width:1700px}.page-heading{margin-bottom:23px}.page-heading h1{font-size:26px;letter-spacing:-.65px}.page-heading p{font-size:12px}.eyebrow{color:#9a7a2c;letter-spacing:1.6px}
.primary,.secondary{min-height:38px;border-radius:9px;padding:9px 14px;font-size:11px;transition:all .16s ease}.primary{background:#172b4d;border-color:#172b4d;box-shadow:0 4px 10px rgba(23,43,77,.12)}.primary:hover{background:#0f1f39;border-color:#0f1f39;transform:translateY(-1px)}.secondary{border-color:#d5dbe5}.secondary:hover{background:#f8fafc;border-color:#c4ccd8}
.stat-grid,.mini-kpi-row{gap:14px}.stat-card,.mini-kpi,.panel,.org-card,.calendar-card,.feature-card,.report-card,.setting-card{border-color:var(--mx-line);border-radius:var(--mx-radius);box-shadow:var(--mx-shadow)}.stat-card{padding:18px}.stat-icon{border-radius:10px;background:var(--mx-gold-soft);color:#8c6b21}.stat-card strong{font-size:21px}.mini-kpi{padding:14px}.mini-kpi b{font-size:16px}
.panel{box-shadow:var(--mx-shadow)}.panel-head{padding:18px 20px;border-bottom:1px solid #eef1f5}.panel-head h2,.quick h2,.settings h2{font-size:14px;letter-spacing:-.1px}.table-panel{margin-top:14px}.table-wrap{scrollbar-width:thin}table{font-size:11px}th{background:#f8fafc;color:#667085;padding:12px 15px;font-size:9.5px;letter-spacing:.35px;text-transform:uppercase}td{padding:13px 15px}tr:hover td{background:#fbfcfe}.status{padding:5px 8px}.filter,.filter-row select,.toolbar input,.toolbar select,.toolbar-panel input,.compact-input{border-color:#d8dee8;border-radius:9px;background:#fff;min-height:38px}.filter:focus,.toolbar input:focus,.toolbar select:focus,.toolbar-panel input:focus,.compact-input:focus{outline:none;border-color:#bca15f;box-shadow:0 0 0 3px rgba(202,167,94,.12)}
.form-panel{padding:22px}.form-grid{gap:17px}.form-grid input,.form-grid select,.form-grid textarea,.login-card input{border-radius:9px;border-color:#d8dee8;min-height:41px}.form-grid label,.login-card label{font-size:10px;color:#475467}.form-grid input:focus,.login-card input:focus{border-color:#bca15f;box-shadow:0 0 0 3px rgba(202,167,94,.12)}
.branch-nav,.branch-tabs{background:#eef2f6;border:1px solid #e1e6ed;border-radius:10px;padding:4px;gap:3px}.branch-nav button,.branch-tabs button{border:0;border-radius:8px;background:transparent;color:#667085;padding:8px 12px;font-size:10px;font-weight:750}.branch-nav button:hover,.branch-tabs button:hover{color:#172033;background:#fff}.branch-nav button.active,.branch-tabs button.active{background:#fff;color:#172b4d;box-shadow:0 1px 4px rgba(15,23,42,.08)}
.kanban-grid{gap:12px}.kanban-col{background:#eef2f6;border:1px solid #e0e5ec;border-radius:12px;padding:9px}.kanban-head{padding:6px 5px 10px}.kanban-head b{font-size:11px}.kanban-card{background:#fff;border:1px solid #e1e6ed;border-radius:10px;padding:12px;box-shadow:0 2px 7px rgba(15,23,42,.04);margin-bottom:8px}.kanban-card:hover{border-color:#c9b071;transform:translateY(-1px)}
.role-builder{gap:15px}.role-builder>.panel{border-radius:14px}.role-list-item{border-color:#e3e7ee;background:#fff;color:#344054;border-radius:9px;padding:11px 12px}.role-list-item:hover{background:#f8fafc}.role-list-item.active{background:#fbf6e9;border-color:#dcc78f;color:#6f541d}.permission-section{padding:15px 18px;border-top:1px solid #eef1f5}.permission-section h4{font-size:9px;letter-spacing:1px;color:#98a2b3}.permission-grid{gap:8px}.permission-item{border:1px solid #e1e6ed;border-radius:9px;background:#fff;padding:9px 10px;font-size:10px}.permission-item:hover{border-color:#c9b071;background:#fffcf5}
.toolbar-panel{border:1px solid var(--mx-line);background:#fff;border-radius:12px;padding:13px 15px;box-shadow:var(--mx-shadow)}.stat-inline{background:#f8fafc;border:1px solid #e9edf2;border-radius:9px;padding:7px 12px}.stat-inline b{font-size:15px}.stat-inline span{font-size:9px;color:#98a2b3}
.modal-backdrop,.overlay{backdrop-filter:blur(4px);background:rgba(8,18,38,.42)}.modal,.dialog,.simple-modal{border:1px solid #e1e6ed!important;border-radius:16px!important;box-shadow:0 24px 70px rgba(15,23,42,.2)!important}.modal-head,.dialog-head{border-bottom:1px solid #eef1f5}.modal h2,.dialog h2{font-size:16px}
.employee-hero{border-radius:16px!important;border:1px solid var(--mx-line)!important;box-shadow:var(--mx-shadow)!important}.employee-hero .mini-avatar{width:46px;height:46px;border-radius:12px}.profile-grid,.detail-grid{gap:14px}.profile-card,.detail-card{border:1px solid var(--mx-line);border-radius:14px;box-shadow:var(--mx-shadow)}
.chart-placeholder{border-top:1px solid #eef1f5}.bars i{background:linear-gradient(#caa75e,#9b7a2f)}
.login-wrap{background:radial-gradient(circle at 50% 0,#172b4d 0,#0b1630 45%,#070f21 100%);min-height:100vh}.login-card{border:1px solid rgba(255,255,255,.12)!important;border-radius:18px!important;box-shadow:0 25px 80px rgba(0,0,0,.28)!important}.login-card .brand-mark{background:linear-gradient(135deg,#caa75e,#f0d995)}.login-card .primary{background:#172b4d}.security-note{color:#98a2b3}
/* Normalize legacy icon/glyph surfaces so the application does not look like a template. */
.nav-item,.quick-action,.link-btn,.danger-text,.primary,.secondary{line-height:1.2}.icon-btn{width:36px;height:36px;border-radius:9px;display:grid;place-items:center}.icon-btn:hover{background:#f2f4f7;color:#172033}.quick-action>span:last-child{font-size:0}.quick-action>span:last-child::after{content:'›';font-size:16px}.page button:disabled{opacity:.55;cursor:not-allowed;transform:none!important}
@media(max-width:1100px){.talenta-sidebar{width:240px}.page{padding:22px}.content-grid{grid-template-columns:1fr}.org-grid,.calendar-grid,.feature-grid,.report-grid,.settings-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:800px){.topbar{padding:0 16px}.page{padding:17px}.page-heading{flex-direction:column}.page-heading .primary,.page-heading .secondary{width:100%}.stat-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.form-grid{grid-template-columns:1fr}.full-span{grid-column:auto}.org-grid,.calendar-grid,.feature-grid,.report-grid,.settings-grid{grid-template-columns:1fr}.search-global{display:none}}
@media(max-width:560px){.stat-grid,.mini-kpi-row{grid-template-columns:1fr}.topbar{height:60px}.page-heading h1{font-size:22px}.panel-head{padding:15px}.table-panel{margin-top:10px}.branch-nav,.branch-tabs{overflow:auto;white-space:nowrap}.branch-nav button,.branch-tabs button{flex:none}}

/* V-END final interaction polish */
.permission-toggle{min-height:30px;border:1px solid #dfe4eb;border-radius:8px;background:#fff;color:#98a2b3;font-size:9px;font-weight:800;cursor:pointer}.permission-toggle:hover{border-color:#c9b071;background:#fffcf5;color:#6f541d}.permission-toggle.on{background:#172b4d;border-color:#172b4d;color:#fff}.permission-toggle:disabled{cursor:default;opacity:.7}.logout{display:flex;align-items:center;gap:8px}.logout .ui-icon{width:15px;height:15px}.alert.success{border-color:#cde8d8;background:#f1fbf5;color:#17663a}.ui-icon{width:17px;height:17px;display:block;flex:none}
/* =========================================================
   PROJECT BY TIRTA — ENTERPRISE BUTTON SYSTEM
   Global standard button: NAVY + GOLD BORDER
   ========================================================= */

/* ---------------------------------------------------------
   1. SEMUA TOMBOL STANDAR DI AREA ADMIN
   --------------------------------------------------------- */

.talenta-main button:not(.nav-item):not(.group-title):not(.icon-btn):not(.link-btn):not(.quick-action):not(.danger-text):not(.toast) {
  min-height: 38px !important;
  padding: 9px 15px !important;

  background: var(--mx-primary, #101a33) !important;
  color: #ffffff !important;

  border: 1px solid var(--mx-accent, #d6ae58) !important;
  border-radius: 9px !important;

  font-family: inherit;
  font-size: 11px;
  font-weight: 700;

  cursor: pointer;

  transition:
    background .18s ease,
    border-color .18s ease,
    color .18s ease,
    box-shadow .18s ease,
    transform .12s ease;
}

/* Hover */

.talenta-main button:not(.nav-item):not(.group-title):not(.icon-btn):not(.link-btn):not(.quick-action):not(.danger-text):not(.toast):hover {
  background: #182544 !important;
  color: #ffffff !important;

  border-color: #f0cf7a !important;

  box-shadow:
    0 4px 12px rgba(16,26,51,.20);

  transform: translateY(-1px);
}

/* Active / klik */

.talenta-main button:not(.nav-item):not(.group-title):not(.icon-btn):not(.link-btn):not(.quick-action):not(.danger-text):not(.toast):active {
  transform: translateY(0);
}

/* ---------------------------------------------------------
   2. PRIMARY
   --------------------------------------------------------- */

.talenta-main button.primary,
.talenta-main button.primary-btn,
.talenta-main button.btn-primary {
  background: var(--mx-primary, #101a33) !important;
  color: #ffffff !important;

  border: 1px solid var(--mx-accent, #d6ae58) !important;

  box-shadow:
    0 3px 9px rgba(16,26,51,.18);
}

.talenta-main button.primary:hover,
.talenta-main button.primary-btn:hover,
.talenta-main button.btn-primary:hover {
  background: #182544 !important;
  border-color: #f0cf7a !important;
}

/* ---------------------------------------------------------
   3. SECONDARY
   --------------------------------------------------------- */

.talenta-main button.secondary {
  background: #ffffff !important;
  color: var(--mx-primary, #101a33) !important;

  border: 1px solid var(--mx-accent, #d6ae58) !important;

  box-shadow: none;
}

.talenta-main button.secondary:hover {
  background: #faf6e9 !important;
  color: var(--mx-primary, #101a33) !important;
  border-color: #f0cf7a !important;
}

/* ---------------------------------------------------------
   4. FULL WIDTH
   --------------------------------------------------------- */

.talenta-main button.full {
  width: 100%;
}

/* ---------------------------------------------------------
   5. TAB / BRANCH TAB
   --------------------------------------------------------- */

.talenta-main .branch-tabs button,
.talenta-main .branch-nav button {
  min-height: 38px !important;

  background: #ffffff !important;
  color: #344054 !important;

  border: 1px solid var(--mx-accent, #d6ae58) !important;
  border-radius: 8px !important;

  padding: 8px 14px !important;

  font-weight: 700;

  box-shadow: none;

  transform: none !important;
}

/* Tab hover */

.talenta-main .branch-tabs button:hover,
.talenta-main .branch-nav button:hover {
  background: #faf6e9 !important;
  color: var(--mx-primary, #101a33) !important;
  border-color: #f0cf7a !important;
}

/* Tab aktif */

.talenta-main .branch-tabs button.active,
.talenta-main .branch-nav button.active {
  background: var(--mx-primary, #101a33) !important;
  color: #ffffff !important;

  border: 1px solid var(--mx-accent, #d6ae58) !important;

  box-shadow:
    0 3px 9px rgba(16,26,51,.18);

  font-weight: 800;
}

/* ---------------------------------------------------------
   6. TAB SETTINGS / TAB YANG TIDAK MEMILIKI CLASS
   --------------------------------------------------------- */

/*
   Digunakan untuk tab seperti:

   Perusahaan
   Jam Kerja
   Payroll
   Absensi
   Notifikasi
   Keamanan

   terutama jika tombol dibuat langsung dengan inline style.
*/

.talenta-main .settings button:not(.primary):not(.secondary) {
  min-height: 38px !important;

  background: #ffffff !important;
  color: var(--mx-primary, var(--mx-primary, #101a33)) !important;

  border: 1px solid var(--mx-accent, #d6ae58) !important;
  border-radius: 8px !important;

  padding: 8px 14px !important;

  font-weight: 700;

  box-shadow: none;

  transform: none !important;
}

.talenta-main .settings button.active {
  background: var(--mx-primary, #101a33) !important;
  color: #ffffff !important;

  border-color: var(--mx-accent, #d6ae58) !important;

  box-shadow:
    0 3px 9px rgba(16,26,51,.18);
}

/* ---------------------------------------------------------
   7. ICON BUTTON
   --------------------------------------------------------- */

.talenta-main button.icon-btn {
  width: 36px !important;
  height: 36px !important;

  min-height: 36px !important;
  padding: 0 !important;

  display: grid;
  place-items: center;

  background: #ffffff !important;
  color: var(--mx-primary, #101a33) !important;

  border: 1px solid var(--mx-accent, #d6ae58) !important;
  border-radius: 9px !important;

  box-shadow: none;

  transform: none !important;
}

.talenta-main button.icon-btn:hover {
  background: var(--mx-primary, #101a33) !important;
  color: #ffffff !important;
  border-color: #f0cf7a !important;
}

/* ---------------------------------------------------------
   8. LINK BUTTON
   --------------------------------------------------------- */

.talenta-main button.link-btn {
  background: #ffffff !important;
  color: var(--mx-primary, #101a33) !important;

  border: 1px solid var(--mx-accent, #d6ae58) !important;
  border-radius: 7px !important;

  padding: 7px 11px !important;

  font-weight: 700;

  transform: none !important;
}

.talenta-main button.link-btn:hover {
  background: var(--mx-primary, #101a33) !important;
  color: #ffffff !important;
  border-color: #f0cf7a !important;
}

/* ---------------------------------------------------------
   9. DANGER
   Tetap merah untuk tombol hapus / tindakan berbahaya
   --------------------------------------------------------- */

.talenta-main button.danger-text {
  background: #ffffff !important;
  color: #b42318 !important;

  border: 1px solid #e5a29c !important;
  border-radius: 7px !important;

  padding: 7px 11px !important;

  transform: none !important;
}

.talenta-main button.danger-text:hover {
  background: #b42318 !important;
  color: #ffffff !important;

  border-color: #b42318 !important;
}

/* ---------------------------------------------------------
   10. QUICK ACTION
   Quick action tetap berbentuk baris,
   tetapi diberi aksen bingkai gold.
   --------------------------------------------------------- */

.talenta-main button.quick-action {
  background: #ffffff !important;
  color: var(--mx-primary, #101a33) !important;

  border: 1px solid var(--mx-accent, #d6ae58) !important;
  border-radius: 9px !important;

  padding: 10px 12px !important;

  margin-bottom: 7px;

  transform: none !important;
}

.talenta-main button.quick-action:hover {
  background: #faf6e9 !important;
  border-color: #f0cf7a !important;
}

/* ---------------------------------------------------------
   11. GROUP TITLE
   Tidak dibuat seperti tombol aksi.
   --------------------------------------------------------- */

.talenta-sidebar button.group-title {
  border: 0 !important;
  background: transparent !important;
  color: #98a2b3 !important;

  box-shadow: none !important;
  transform: none !important;
}

/* ---------------------------------------------------------
   12. SIDEBAR NAVIGATION
   Tetap model menu, bukan tombol aksi.
   --------------------------------------------------------- */

.talenta-sidebar button.nav-item {
  border: 1px solid transparent !important;
  background: transparent !important;

  color: #667085 !important;

  box-shadow: none !important;
  transform: none !important;
}

.talenta-sidebar button.nav-item:hover {
  background: #f8fafc !important;
  border-color: var(--mx-accent, #d6ae58) !important;
  color: var(--mx-primary, #101a33) !important;
}

.talenta-sidebar button.nav-item.active {
  background: #f7f1dc !important;
  border-color: var(--mx-accent, #d6ae58) !important;
  color: var(--mx-primary, #101a33) !important;

  box-shadow: none !important;
}

/* ---------------------------------------------------------
   13. LOGOUT
   --------------------------------------------------------- */

.talenta-sidebar button.logout {
  background: transparent !important;
  color: #9a3a3a !important;

  border: 1px solid transparent !important;

  box-shadow: none !important;
  transform: none !important;
}

.talenta-sidebar button.logout:hover {
  background: #fff1f2 !important;
  border-color: #e5a29c !important;
}

/* ---------------------------------------------------------
   14. DISABLED
   --------------------------------------------------------- */

.talenta-main button:disabled {
  opacity: .5 !important;
  cursor: not-allowed !important;

  transform: none !important;

  box-shadow: none !important;
}

/* ---------------------------------------------------------
   15. FOCUS
   --------------------------------------------------------- */

.talenta-main button:focus-visible {
  outline: 2px solid var(--mx-accent, #d6ae58) !important;
  outline-offset: 2px;
}

/* ---------------------------------------------------------
   16. MOBILE
   --------------------------------------------------------- */

@media (max-width: 700px) {
  .talenta-main button.primary,
  .talenta-main button.secondary {
    min-height: 40px !important;
  }

  .talenta-main .branch-tabs,
  .talenta-main .branch-nav {
    overflow-x: auto;
    flex-wrap: nowrap;
  }

  .talenta-main .branch-tabs button,
  .talenta-main .branch-nav button {
    flex-shrink: 0;
    white-space: nowrap;
  }
}
/* =========================================================
   PROJECT BY TIRTA THEME MANAGER
   ========================================================= */

:root {
  --mx-primary: #101a33;
  --mx-accent: #d6ae58;

  --mx-background: #f6f7fb;
  --mx-surface: #ffffff;

  --mx-text: #172033;
  --mx-text-secondary: #344054;
  --mx-text-muted: #667085;

  --mx-border: #e2e7ee;
  --mx-border-strong: #cbd2dc;
}

/* Theme message */

.theme-message{
  margin-bottom:14px;
  padding:11px 14px;
  border:1px solid var(--mx-border);
  border-left:4px solid var(--mx-accent);
  border-radius:9px;
  background:var(--mx-surface);
  color:var(--mx-text);
  font-size:11px;
  font-weight:700;
}

/* Theme manager */

.theme-manager{
  display:flex;
  flex-direction:column;
  gap:18px;
}

.theme-manager-header{
  background:var(--mx-surface);
  border:1px solid var(--mx-border);
  border-radius:13px;
  padding:20px;
}

.theme-manager-header h2{
  margin:0 0 5px;
  color:var(--mx-text);
  font-size:17px;
  font-weight:800;
}

.theme-manager-header p{
  margin:0;
  color:#667085;
  font-size:11px;
}

/* Theme cards */

.theme-grid{
  display:grid;
  grid-template-columns:
    repeat(3,minmax(0,1fr));
  gap:15px;
}

.theme-card{
  padding:0;
  overflow:hidden;
  text-align:left;
  cursor:pointer;
  background:var(--mx-surface);
  border:1px solid var(--mx-border);
  border-radius:13px;
  color:var(--mx-text);
  transition:
    transform .18s ease,
    box-shadow .18s ease,
    border-color .18s ease;
}

.theme-card:hover{
  transform:translateY(-2px);
  box-shadow:
    0 8px 25px rgba(16,24,40,.10);
  border-color:var(--mx-accent);
}

.theme-preview{
  height:145px;
  display:flex;
  overflow:hidden;
  border-bottom:1px solid var(--mx-border);
}

.theme-preview-sidebar{
  width:31%;
  padding:15px 9px;
  display:flex;
  flex-direction:column;
  gap:9px;
}

.theme-preview-sidebar span{
  height:7px;
  border-radius:4px;
  background:rgba(255,255,255,.25);
}

.theme-preview-sidebar span:first-child{
  width:70%;
  background:rgba(255,255,255,.75);
}

.theme-preview-content{
  flex:1;
  padding:14px;
}

.theme-preview-top{
  height:20px;
  border-bottom:1px solid;
  margin-bottom:12px;
}

.theme-preview-cards{
  display:flex;
  gap:7px;
}

.theme-preview-cards i{
  display:block;
  width:30px;
  height:25px;
  border-radius:5px;
  opacity:.9;
}

.theme-preview-line{
  width:75%;
  height:5px;
  border-radius:5px;
  margin-top:17px;
  opacity:.8;
}

/* Theme card information */

.theme-card-body{
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:10px;
  padding:14px;
}

.theme-card-body strong{
  display:block;
  font-size:11px;
  font-weight:800;
  color:var(--mx-text);
}

.theme-card-body small{
  display:block;
  margin-top:4px;
  color:#8a93a3;
  font-size:9px;
  line-height:1.4;
}

.theme-color-dot{
  width:18px;
  height:18px;
  flex:none;
  border-radius:50%;
  border:2px solid #fff;
  box-shadow:0 0 0 1px var(--mx-border);
}

/* Custom theme */

.custom-theme-panel{
  background:var(--mx-surface);
  border:1px solid var(--mx-border);
  border-radius:13px;
  padding:20px;
}

.custom-theme-panel h3{
  margin:0 0 5px;
  font-size:14px;
  color:var(--mx-text);
}

.custom-theme-panel p{
  margin:0;
  color:#667085;
  font-size:10px;
}

.custom-theme-controls{
  display:flex;
  gap:15px;
  margin-top:18px;
  margin-bottom:17px;
}

.custom-theme-controls label{
  display:flex;
  flex-direction:column;
  gap:7px;
  color:#475467;
  font-size:10px;
  font-weight:800;
}

.custom-theme-controls input[type="color"]{
  width:100px;
  height:42px;
  padding:3px;
  cursor:pointer;
  border:1px solid var(--mx-border);
  border-radius:8px;
  background:#fff;
}

.theme-save-button{
  min-width:190px;
}

/* Settings tabs */

.settings-tabs{
  display:flex;
  flex-wrap:wrap;
  gap:7px;
  margin-bottom:15px;
}

.settings-tabs button{
  min-height:36px;
  padding:8px 13px;
  border:1px solid var(--mx-border);
  border-radius:8px;
  background:var(--mx-surface);
  color:var(--mx-text);
  cursor:pointer;
  font-size:10px;
  font-weight:750;
  transition:.18s ease;
}

.settings-tabs button:hover{
  border-color:var(--mx-accent);
  color:var(--mx-accent);
}

.settings-tabs button.active{
  background:var(--mx-primary);
  color:#fff;
  border-color:var(--mx-accent);
  box-shadow:
    0 2px 8px rgba(16,24,40,.12);
}

/* Theme-aware admin controls */

.talenta-main .primary {
  background: #101a33 !important;
  color: #ffffff !important;
  border: 1px solid #101a33 !important;
}
.talenta-main .primary:hover {
  background: #182442 !important;
  color: #ffffff !important;
}

.talenta-main .secondary {
  background: #ffffff !important;
  color: #344054 !important;
  border: 1px solid #cbd2dc !important;
}

.talenta-main .secondary:hover {
  background: #f8fafc !important;
  border-color: #98a2b3 !important;
}

.talenta-shell{
  background:var(--mx-background);
  color:var(--mx-text);
}

.talenta-sidebar{
  background:#0b1630 !important;
  color:#ffffff !important;
  border-right:1px solid rgba(255,255,255,.12) !important;
}

.topbar{
  background:var(--mx-surface);
  border-bottom-color:var(--mx-border);
}

.panel,
.stat-card,
.mini-kpi,
.org-card,
.calendar-card,
.feature-card,
.report-card,
.setting-card{
  background:var(--mx-surface);
  border-color:var(--mx-border);
}

.page-heading h1,
.panel-head h2,
.quick h2,
.settings h2{
  color:var(--mx-text);
}

/* Mobile */

@media(max-width:1050px){

  .theme-grid{
    grid-template-columns:
      repeat(2,minmax(0,1fr));
  }

}

@media(max-width:700px){

  .theme-grid{
    grid-template-columns:1fr;
  }

  .theme-preview{
    height:130px;
  }

  .custom-theme-controls{
    flex-direction:column;
  }

  .custom-theme-controls input[type="color"]{
    width:100%;
  }

  .theme-save-button{
    width:100%;
  }

  .settings-tabs{
    overflow-x:auto;
    flex-wrap:nowrap;
    padding-bottom:4px;
  }

  .settings-tabs button{
    white-space:nowrap;
    flex:none;
  }

}
/* =========================================================
   MOONXPROJECt CUSTOM THEME SYSTEM
   ========================================================= */

:root {
  --mx-primary: #101a33;
  --mx-accent: #d6ae58;
  --mx-background: #f6f7fb;
  --mx-surface: #ffffff;
  --mx-text: #172033;
  --mx-border: #d6ae58;

  --blue: var(--mx-accent);
  --ink: var(--mx-text);
  --line: var(--mx-border);
  --surface: var(--mx-surface);
  --bg: var(--mx-background);
}

/* Dashboard background */

.talenta-main,
.admin-main,
.dashboard-main,
.page-content,
.content-area {
  background: var(--mx-background) !important;
  color: var(--mx-text);
}

/* Panel */

.panel,
.card,
.dashboard-card,
.stat-card,
.table-panel,
.form-panel,
.report-card {
  background: #ffffff !important;
  color: #172033 !important;
  border: 1px solid #e2e7ee !important;
}
/* Headings */

.page-heading h1,
.page-heading h2,
.page-heading h3,
.panel h1,
.panel h2,
.panel h3 {
  color: var(--mx-text);
}

/* Main buttons */

button.primary,
button.hero-primary,
.primary,
.btn-primary {
  background:
    linear-gradient(
      135deg,
      var(--mx-primary),
      color-mix(
        in srgb,
        var(--mx-primary) 75%,
        black
      )
    ) !important;

  color: var(--mx-accent) !important;
  border: 1px solid var(--mx-accent) !important;
}

/* Secondary */

button.secondary,
.secondary,
.btn-secondary {
  background: var(--mx-surface) !important;
  color: var(--mx-primary) !important;
  border: 1px solid var(--mx-border) !important;
}

/* Navigation */

.talenta-sidebar {
  background: var(--mx-primary) !important;
}

.talenta-sidebar .nav-item {
  color: #ffffff !important;
}

.talenta-sidebar .nav-item:hover {
  background: rgba(255, 255, 255, 0.08) !important;
  color: #ffffff !important;
}

.talenta-sidebar .nav-item.active {
  background: rgba(214, 174, 88, 0.16) !important;
  color: #ffffff !important;
  border-color: transparent !important;
}
/* Tabs */

.settings-tabs button,
.branch-tabs button,
.branch-nav button {
  color: var(--mx-text) !important;
  border-color: var(--mx-border) !important;
}

.settings-tabs button.active,
.branch-tabs button.active,
.branch-nav button.active {
  background: var(--mx-primary) !important;
  color: var(--mx-accent) !important;
  border-color: var(--mx-accent) !important;
}

/* Inputs */

input,
select,
textarea {
  border-color: var(--mx-border) !important;
  color: var(--mx-text);
  background: var(--mx-surface);
}

input:focus,
select:focus,
textarea:focus {
  border-color: var(--mx-accent) !important;
  box-shadow:
    0 0 0 3px
    color-mix(
      in srgb,
      var(--mx-accent) 18%,
      transparent
    ) !important;
}

/* Links */

a,
.link-btn {
  color: var(--mx-primary) !important;
}

.link-btn:hover {
  color: var(--mx-accent) !important;
}

/* Borders */

.table-panel,
.panel,
.card,
.settings-tabs,
.theme-card,
.custom-theme-panel {
  border-color: var(--mx-border) !important;
}

/* Theme cards */

.theme-card:hover {
  border-color: var(--mx-accent) !important;
  box-shadow:
    0 12px 35px
    color-mix(
      in srgb,
      var(--mx-primary) 14%,
      transparent
    ) !important;
}

/* Custom theme save */

.theme-save-button {
  background: var(--mx-primary) !important;
  color: var(--mx-accent) !important;
  border: 1px solid var(--mx-accent) !important;
}

.theme-save-button:hover {
  background: var(--mx-accent) !important;
  color: var(--mx-primary) !important;
}

/* Toast */

.toast {
  background: var(--mx-primary) !important;
  color: var(--mx-accent) !important;
  border: 1px solid var(--mx-accent) !important;
}

/* Table */

table thead th {
  background: #f8fafc !important;
  color: #344054 !important;
  border-bottom: 1px solid #e2e7ee !important;
}

table td {
  color: #344054 !important;
  border-bottom: 1px solid #e2e7ee !important;
}
/* Status / accent */

.status-badge,
.theme-color-dot {
  border-color: var(--mx-accent) !important;
}

/* Scrollbar */

::-webkit-scrollbar-thumb {
  background: var(--mx-primary);
}

::-webkit-scrollbar-thumb:hover {
  background: var(--mx-accent);
}

/* =========================================================
   V53 PROFESSIONAL SUITE
   ========================================================= */
.professional-suite .heading-actions{display:flex;gap:8px;align-items:center}.professional-suite .content-grid{display:grid;grid-template-columns:1.5fr 1fr;gap:16px}.professional-suite .alert-list,.professional-suite .check-list{display:grid;gap:0}.professional-suite .alert-row,.professional-suite .check-list>div{display:grid;grid-template-columns:auto 1fr auto;gap:12px;align-items:center;padding:13px 15px;border-bottom:1px solid #eef1f5}.professional-suite .alert-row:last-child,.professional-suite .check-list>div:last-child{border-bottom:0}.professional-suite .alert-row small{display:block;color:#98a2b3;margin-top:3px}.professional-suite .check-list>div{grid-template-columns:1fr auto}.professional-suite .action-card-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;padding:2px}.professional-suite .action-card{display:flex;flex-direction:column;align-items:flex-start;gap:7px;text-align:left;padding:15px!important;border:1px solid #e2e7ee!important;background:#fff!important;color:#172033!important;border-radius:12px!important;box-shadow:none!important;transform:none!important}.professional-suite .action-card:hover{background:#fffcf5!important;border-color:#d6ae58!important;transform:translateY(-1px)!important}.professional-suite .action-card b{font-size:12px}.professional-suite .action-card small{font-size:10px;color:#667085;line-height:1.5}.professional-suite .action-card em{font-size:9px;font-style:normal;color:#8b6a24;font-weight:800;margin-top:2px}.professional-suite .roadmap-list{margin:0;padding:0 22px 20px 36px;color:#475467}.professional-suite .roadmap-list li{padding:7px 0;font-size:11px}.professional-suite .status{white-space:nowrap}.professional-suite .heading-actions button{width:auto!important}.professional-suite .branch-tabs{margin-bottom:16px}
@media(max-width:800px){.professional-suite .content-grid,.professional-suite .action-card-grid{grid-template-columns:1fr}.professional-suite .heading-actions{width:100%}.professional-suite .heading-actions button{flex:1}}
/* =========================================================
   PERBAIKAN TAMPILAN EMPLOYEE 360° (AGAR SIMETRIS & RAPI)
   ========================================================= */

/* 1. Bagian Atas: Header Judul & Dropdown Pilihan Karyawan */
.page-heading {
  display: flex;
  justify-content: space-between;
  align-items: center; /* Membuat judul di kiri dan dropdown di kanan sejajar lurus secara vertikal */
  gap: 20px;
  margin-bottom: 21px;
}

.employee-picker {
  min-width: 280px;
  max-width: 360px;
  padding: 11px 14px;
  border: 1px solid var(--line, #d8dee8);
  border-radius: 10px;
  background: #fff;
  font-weight: 700;
  font-size: 12px;
  color: #172033;
  box-shadow: 0 1px 2px rgba(16, 24, 40, 0.05);
}

/* 2. Kotak Profil Utama Karyawan (Employee Hero) */
.employee-hero {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding: 22px 24px;
  background: #fff;
  border: 1px solid var(--line, #d8dee8);
  border-radius: 16px;
  margin-bottom: 16px;
  box-shadow: 0 1px 3px rgba(16, 24, 40, 0.06);
}

.employee-avatar {
  width: 56px;
  height: 56px;
  border-radius: 14px;
  display: grid;
  place-items: center;
  background: linear-gradient(135deg, #101b35, #c7a86b);
  color: #fff;
  font-weight: 800;
  font-size: 18px;
  flex: none;
}

.employee-hero-copy {
  flex: 1;
  min-width: 0;
}

.employee-hero-copy h2 {
  margin: 0 0 4px;
  font-size: 18px;
  font-weight: 780;
  color: #172033;
}

.employee-hero-copy p {
  margin: 0 0 4px;
  font-size: 12px;
  font-weight: 700;
  color: #475467;
}

.employee-hero-copy small {
  display: block;
  font-size: 11px;
  color: var(--muted, #667085);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.employee-hero-meta {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
  text-align: right;
  flex: none;
  padding-left: 16px;
  border-left: 1px solid #eef1f5;
}

.employee-hero-meta b {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  padding: 3px 8px;
  border-radius: 99px;
  background: #ecfdf3;
  color: #087443;
}

.employee-hero-meta span {
  font-size: 11px;
  color: var(--muted, #667085);
}

/* 3. Baris 5 Kotak Indikator (Attendance, Cuti, Lembur, Payroll, Dokumen) */
.mini-kpi-row {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr)); /* Memaksa tepat 5 kolom berjajar rapi dalam satu baris horizontal */
  gap: 12px;
  margin-bottom: 16px;
}

.mini-kpi-row .stat-card {
  min-height: 92px;
  padding: 14px;
}

.mini-kpi-row .stat-card strong {
  font-size: 20px;
}

/* Penyesuaian Otomatis (Responsif) untuk HP & Tablet */
@media (max-width: 1100px) {
  .mini-kpi-row {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 800px) {
  .page-heading {
    flex-direction: column;
    align-items: stretch;
  }
  .employee-picker {
    width: 100%;
    max-width: none;
  }
  .employee-hero {
    flex-direction: column;
    align-items: flex-start;
  }
  .employee-hero-meta {
    align-items: flex-start;
    text-align: left;
    border-left: none;
    border-top: 1px solid #eef1f5;
    padding-left: 0;
    padding-top: 12px;
    width: 100%;
  }
  .mini-kpi-row {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 560px) {
  .mini-kpi-row {
    grid-template-columns: 1fr;
  }
}

/* =========================================================
   PROJECT BY TIRTA — FINAL VISIBILITY / CONTRAST PATCH
   ========================================================= */
.talenta-shell{color:#172033 !important;}
.talenta-sidebar{
  background:linear-gradient(180deg,#0b1630 0%,#101d3b 100%) !important;
  color:#ffffff !important;
  border-right:1px solid rgba(255,255,255,.12) !important;
}
.talenta-sidebar .brand b{color:#ffffff !important;}
.talenta-sidebar .brand small{color:#aab6ca !important;}
.talenta-sidebar .workspace{
  background:rgba(255,255,255,.055) !important;
  border-color:rgba(255,255,255,.12) !important;
  color:#b7c1d1 !important;
}
.talenta-sidebar .workspace b{color:#ffffff !important;}
.talenta-sidebar .workspace small{color:#aab6ca !important;}
.talenta-sidebar .group-title{color:#aab6ca !important;}
.talenta-sidebar .nav-item{
  background:transparent !important;
  color:#d5dce8 !important;
}
.talenta-sidebar .nav-item:hover{
  background:rgba(255,255,255,.10) !important;
  color:#ffffff !important;
}
.talenta-sidebar .nav-item.active{
  background:linear-gradient(90deg,rgba(202,167,94,.30),rgba(202,167,94,.12)) !important;
  color:#ffe39a !important;
  box-shadow:inset 3px 0 0 #d6ae58 !important;
}
.talenta-sidebar .nav-item em{
  background:rgba(255,255,255,.12) !important;
  color:#e5ebf4 !important;
}
.talenta-sidebar .admin-mini{border-top-color:rgba(255,255,255,.12) !important;}
.talenta-sidebar .admin-mini b{color:#ffffff !important;}
.talenta-sidebar .admin-mini small{color:#aab6ca !important;}
.talenta-sidebar .logout{color:#ffb4b4 !important;}
.talenta-sidebar .logout:hover{background:rgba(255,255,255,.08) !important;color:#ffffff !important;}

.talenta-main{background:#f6f7fb !important;color:#172033 !important;}
.talenta-main .topbar{background:#ffffff !important;color:#172033 !important;border-bottom:1px solid #e4e8ef !important;}
.talenta-main .crumb{color:#172033 !important;}
.talenta-main .crumb span{color:#667085 !important;}
.talenta-main .icon-btn{color:#344054 !important;}
.talenta-main .search-global{background:#ffffff !important;border-color:#d8dee8 !important;}
.talenta-main .search-global input{color:#172033 !important;}
.talenta-main .search-global input::placeholder{color:#98a2b3 !important;}
.talenta-main .page-heading h1,.talenta-main h1,.talenta-main h2,.talenta-main h3,.talenta-main h4,.talenta-main h5,.talenta-main strong{color:#172033;}
.talenta-main p,.talenta-main label{color:#475467;}
.talenta-main .panel,.talenta-main .stat-card,.talenta-main .mini-kpi,.talenta-main .org-card,.talenta-main .calendar-card,.talenta-main .feature-card,.talenta-main .report-card,.talenta-main .setting-card,.talenta-main .toolbar-panel{
  background:#ffffff !important;
  color:#172033 !important;
}
.talenta-main td{color:#344054 !important;}
.talenta-main th{color:#475467 !important;background:#f8fafc !important;}
.talenta-main input,
.talenta-main select,
.talenta-main textarea {
  background: #ffffff !important;
  color: #172033 !important;
  border: 1px solid #cbd2dc !important;
}

.talenta-main input::placeholder,
.talenta-main textarea::placeholder {
  color: #98a2b3 !important;
}

.talenta-main input:focus,
.talenta-main select:focus,
.talenta-main textarea:focus {
  border-color: #d6ae58 !important;
  box-shadow: 0 0 0 3px rgba(214, 174, 88, 0.15) !important;
}
/* Prevent theme variables from ever becoming self-referential. */
:root {
  --mx-primary: #101a33;
  --mx-accent: #d6ae58;

  --mx-background: #f6f7fb;
  --mx-surface: #ffffff;

  --mx-text: #172033;
  --mx-text-secondary: #344054;
  --mx-text-muted: #667085;

  --mx-border: #e2e7ee;
  --mx-border-strong: #cbd2dc;
}
/* =========================================================
   FINAL SIDEBAR VISIBILITY FIX
   ========================================================= */

aside.sidebar,
.sidebar {
  background: #ffffff !important;
  color: #172033 !important;
  opacity: 1 !important;
}

/* Brand */
.sidebar .brand b {
  color: #172033 !important;
}

.sidebar .brand small {
  color: #667085 !important;
}

/* Judul group */
.sidebar .nav-title,
.sidebar .group-title {
  color: #475467 !important;
  opacity: 1 !important;
  font-weight: 800 !important;
}

/* Menu */
.sidebar .nav-item {
  background: transparent !important;
  color: #344054 !important;
  opacity: 1 !important;
  border: 1px solid transparent !important;
}

/* Text menu */
.sidebar .nav-item span {
  color: #344054 !important;
  opacity: 1 !important;
}

/* Icon */
.sidebar .nav-item svg {
  color: #344054 !important;
  stroke: #344054 !important;
  opacity: 1 !important;
}

/* Hover */
.sidebar .nav-item:hover {
  background: #f2f4f7 !important;
  color: #101828 !important;
}

/* Active */
.sidebar .nav-item.active {
  background: #fff4d6 !important;
  color: #7a5b12 !important;
  border-left: 3px solid #d6ae58 !important;
}

/* Active text */
.sidebar .nav-item.active span {
  color: #7a5b12 !important;
  font-weight: 700 !important;
}

/* Workspace */
.sidebar .workspace {
  color: #667085 !important;
  background: #ffffff !important;
}

.sidebar .workspace b {
  color: #172033 !important;
}

.sidebar .workspace small {
  color: #667085 !important;
}

/* Admin */
.sidebar .admin-mini b {
  color: #172033 !important;
}

.sidebar .admin-mini small {
  color: #667085 !important;
}

/* Language */
.sidebar .sidebar-bottom {
  color: #344054 !important;
}

.sidebar .sidebar-bottom select {
  background: #ffffff !important;
  color: #172033 !important;
  border: 1px solid #98a2b3 !important;
}

/* Logout */
.sidebar .logout {
  color: #b42318 !important;
}

/* Project by Tirta role badge + employee export */
.floating-role-wrap{position:absolute;left:50%;transform:translateX(-50%);z-index:30}
.floating-role{height:38px;padding:0 12px 0 10px;border:1px solid #D6B56A;border-radius:999px;background:#fff;color:#0B1736;display:flex;align-items:center;gap:8px;box-shadow:0 8px 22px rgba(11,23,54,.10);font-size:11px}
.floating-role .ui-icon{width:13px;height:13px}
.role-shield{width:25px;height:25px;border-radius:50%;display:grid;place-items:center;background:#FBF5E7;color:#A67C22;font-size:12px}
.role-menu{position:absolute;top:46px;left:50%;transform:translateX(-50%);width:210px;padding:10px;background:#fff;border:1px solid #E4E9F1;border-radius:14px;box-shadow:0 18px 45px rgba(15,23,42,.16)}
.role-menu small{display:block;padding:4px 10px 8px;color:#94A3B8;font-size:9px;font-weight:900;letter-spacing:1.3px}
.role-menu button{width:100%;border:0;background:transparent;border-radius:9px;padding:9px 10px;text-align:left;color:#475569;font-size:12px}
.role-menu button:hover,.role-menu button.selected{background:#FBF5E7;color:#0B1736;font-weight:800}
.export-backdrop{position:fixed;inset:0;z-index:100;display:grid;place-items:center;padding:20px;background:rgba(7,16,36,.48);backdrop-filter:blur(5px)}
.export-card{width:min(720px,100%);max-height:min(760px,90vh);overflow:auto;background:#fff;border:1px solid #E5EAF2;border-radius:20px;box-shadow:0 30px 80px rgba(7,16,36,.24);padding:22px}
.export-head{display:flex;justify-content:space-between;gap:15px;align-items:flex-start;border-bottom:1px solid #EEF2F6;padding-bottom:15px}
.export-head span{font-size:9px;letter-spacing:1.5px;color:#B18432;font-weight:900}
.export-head h2{margin:5px 0;color:#0B1736;font-size:20px}
.export-head p{margin:0;color:#64748B;font-size:12px}
.export-actions-top{display:flex;align-items:center;gap:12px;padding:14px 0}
.export-actions-top strong{margin-left:auto;color:#64748B;font-size:11px}
.export-columns{display:grid;grid-template-columns:repeat(2,1fr);gap:8px}
.export-check{display:flex;align-items:center;gap:9px;padding:10px;border:1px solid #E7ECF2;border-radius:10px;color:#334155;font-size:12px}
.export-check:has(input:checked){border-color:#D6B56A;background:#FFFCF4}
.export-check input{accent-color:#0B1736}
.export-foot{display:flex;justify-content:flex-end;gap:8px;margin-top:18px;padding-top:15px;border-top:1px solid #EEF2F6}
@media(max-width:900px){.floating-role-wrap{position:fixed;top:10px}.topbar{position:relative}.crumb{max-width:35%}}
@media(max-width:600px){.floating-role strong{display:none}.floating-role{width:42px;justify-content:center;padding:0}.role-menu{right:0;left:auto;transform:none}.export-columns{grid-template-columns:1fr}.export-foot{flex-wrap:wrap}}


/* =========================================================
   DASHBOARD SIDEBAR - SCROLLBAR & COLLAPSIBLE GROUPS
   ========================================================= */

.sidebar {
  overflow-y: auto !important;
  overflow-x: hidden !important;
  scrollbar-width: thin;
  scrollbar-color: #cbd5e1 transparent;
}

.sidebar::-webkit-scrollbar {
  width: 5px;
}

.sidebar::-webkit-scrollbar-track {
  background: transparent;
}

.sidebar::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 999px;
}

.sidebar::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}

.sidebar .nav-group {
  width: 100%;
}

.sidebar .nav-title {
  width: 100%;
  border: 0 !important;
  background: transparent !important;
  color: #475467 !important;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 7px 10px 5px;
  margin: 2px 0;
  cursor: pointer;
  text-align: left;
  font-size: 9px;
  font-weight: 800;
  letter-spacing: .08em;
  text-transform: uppercase;
}

.sidebar .nav-title:hover {
  color: #172033 !important;
  background: #f2f4f7 !important;
  border-radius: 7px;
}

.sidebar .nav-title .ui-icon {
  width: 13px;
  height: 13px;
  flex: none;
  transition: transform .18s ease;
}

.sidebar .nav-group-items {
  overflow: hidden;
}

.sidebar .nav-item {
  position: relative !important;
  border: 1px solid transparent !important;
  transition: background-color .18s ease, border-color .18s ease, box-shadow .18s ease, transform .18s ease, color .18s ease !important;
}

.sidebar .nav-item:hover {
  background: #f2f4f7 !important;
  border-color: #dfe4ec !important;
  box-shadow: 0 2px 7px rgba(16,24,40,.10) !important;
  transform: translateX(2px);
}

.sidebar .nav-item.active {
  background: #fff4d6 !important;
  border-color: #d6ae58 !important;
  border-left-width: 3px !important;
  color: #7a5b12 !important;
  box-shadow: 0 2px 8px rgba(214,174,88,.16) !important;
  transform: none;
}
