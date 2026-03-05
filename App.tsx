import React, { useState, useEffect } from 'react';
import { 
  LogIn, 
  LogOut, 
  Users, 
  ClipboardList, 
  UserPlus, 
  Trash2, 
  Clock, 
  Calendar,
  User as UserIcon,
  ShieldCheck,
  LogOut as LogoutIcon,
  Edit2,
  Check,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { User, AttendanceRecord, Role } from './types';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [view, setView] = useState<'login' | 'staff' | 'admin'>('login');
  const [adminTab, setAdminTab] = useState<'attendance' | 'users'>('attendance');
  
  // Login state
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  // Staff state
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [lastAction, setLastAction] = useState<AttendanceRecord | null>(null);

  // Admin state
  const [allAttendance, setAllAttendance] = useState<AttendanceRecord[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [newUser, setNewUser] = useState({ username: '', password: '', full_name: '', role: 'staff' as Role });
  const [editingRecord, setEditingRecord] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ timestamp: '', type: 'in' as 'in' | 'out', note: '' });

  const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  useEffect(() => {
    if (user) {
      if (user.role === 'admin') {
        fetchAdminData();
        setView('admin');
      } else {
        fetchStaffData();
        setView('staff');
      }
    }
  }, [user]);

  const fetchStaffData = async () => {
    if (!user) return;
    const res = await fetch(`/api/attendance?user_id=${user.id}`);
    const data = await res.json();
    setAttendance(data);
    if (data.length > 0) setLastAction(data[0]);
  };

  const fetchAdminData = async () => {
    const [attRes, usersRes] = await Promise.all([
      fetch('/api/attendance'),
      fetch('/api/users')
    ]);
    setAllAttendance(await attRes.json());
    setAllUsers(await usersRes.json());
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (data.success) {
        setUser(data.user);
      } else {
        setLoginError('Usuario o contraseña incorrectos');
      }
    } catch (err) {
      setLoginError('Error de conexión con el servidor');
    }
  };

  const handleClockAction = async (type: 'in' | 'out') => {
    if (!user) return;
    const res = await fetch('/api/attendance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: user.id, type })
    });
    if (res.ok) fetchStaffData();
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newUser)
    });
    if (res.ok) {
      setNewUser({ username: '', password: '', full_name: '', role: 'staff' });
      fetchAdminData();
    }
  };

  const handleDeleteUser = async (id: number) => {
    try {
      console.log('Intentando eliminar usuario:', id);
      const res = await fetch(`/api/users/${id}`, { method: 'DELETE' });
      const data = await res.json();
      
      if (data.success) {
        console.log('Usuario eliminado con éxito');
        setMessage({ text: 'Usuario eliminado correctamente', type: 'success' });
        await fetchAdminData();
      } else {
        setMessage({ text: 'Error al eliminar usuario: ' + (data.error || 'Error desconocido'), type: 'error' });
      }
    } catch (err) {
      console.error('Error en handleDeleteUser:', err);
      setMessage({ text: 'Error de red al intentar eliminar el usuario', type: 'error' });
    }
  };

  const handleDeleteRecord = async (id: number) => {
    try {
      const res = await fetch(`/api/attendance/${id}`, { method: 'DELETE' });
      const data = await res.json();
      
      if (data.success) {
        setMessage({ text: 'Registro eliminado correctamente', type: 'success' });
        fetchAdminData();
      } else {
        setMessage({ text: 'Error al eliminar registro: ' + (data.error || 'Error desconocido'), type: 'error' });
      }
    } catch (err) {
      console.error('Error en handleDeleteRecord:', err);
      setMessage({ text: 'Error de red al intentar eliminar el registro', type: 'error' });
    }
  };

  const startEditing = (record: AttendanceRecord) => {
    setEditingRecord(record.id);
    setEditForm({
      timestamp: new Date(record.timestamp).toISOString().slice(0, 16),
      type: record.type,
      note: record.note
    });
  };

  const handleUpdateRecord = async (id: number) => {
    const res = await fetch(`/api/attendance/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editForm)
    });
    if (res.ok) {
      setEditingRecord(null);
      fetchAdminData();
    }
  };

  const handleLogout = () => {
    setUser(null);
    setView('login');
    setUsername('');
    setPassword('');
  };

  if (view === 'login') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-zinc-50">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md glass-card p-8"
        >
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-zinc-900 rounded-2xl flex items-center justify-center mb-4 shadow-lg">
              <ShieldCheck className="text-white w-8 h-8" />
            </div>
            <h1 className="text-2xl font-bold text-zinc-900">Control de Acceso</h1>
            <p className="text-zinc-500 text-sm">Finca Residencial</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">Usuario</label>
              <input 
                type="text" 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="input-field"
                placeholder="Ej: conserje1"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">Contraseña</label>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field"
                placeholder="••••••••"
                required
              />
            </div>
            {loginError && (
              <p className="text-red-500 text-xs font-medium">{loginError}</p>
            )}
            <button type="submit" className="btn-primary w-full flex items-center justify-center gap-2 py-3">
              <LogIn size={18} />
              Entrar al Sistema
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      {/* Header */}
      <header className="bg-white border-b border-zinc-200 sticky top-0 z-10">
        <AnimatePresence>
          {message && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className={`absolute top-20 left-1/2 -translate-x-1/2 px-6 py-3 rounded-xl shadow-lg z-50 flex items-center gap-2 font-bold text-sm ${
                message.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'
              }`}
            >
              {message.type === 'success' ? <Check size={18} /> : <X size={18} />}
              {message.text}
            </motion.div>
          )}
        </AnimatePresence>
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-zinc-900 rounded-xl flex items-center justify-center">
              <ShieldCheck className="text-white w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-zinc-900 leading-none">Control Finca</h2>
              <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">
                {user?.role === 'admin' ? 'Panel Administrador' : 'Panel Conserje'}
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-sm font-medium text-zinc-900">{user?.full_name}</span>
              <span className="text-xs text-zinc-500 capitalize">{user?.role}</span>
            </div>
            <button 
              onClick={handleLogout}
              className="p-2 hover:bg-zinc-100 rounded-lg text-zinc-500 transition-colors"
              title="Cerrar sesión"
            >
              <LogoutIcon size={20} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {view === 'staff' ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Clocking Controls */}
            <div className="lg:col-span-1 space-y-6">
              <div className="glass-card p-6">
                <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                  <Clock size={20} className="text-zinc-400" />
                  Registro de Jornada
                </h3>
                
                <div className="space-y-4">
                  <button 
                    onClick={() => handleClockAction('in')}
                    disabled={lastAction?.type === 'in'}
                    className="w-full py-6 rounded-2xl bg-emerald-50 text-emerald-700 border-2 border-emerald-100 hover:bg-emerald-100 transition-all flex flex-col items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed group"
                  >
                    <LogIn size={32} className="group-hover:scale-110 transition-transform" />
                    <span className="font-bold text-lg">ENTRADA</span>
                  </button>

                  <button 
                    onClick={() => handleClockAction('out')}
                    disabled={!lastAction || lastAction.type === 'out'}
                    className="w-full py-6 rounded-2xl bg-rose-50 text-rose-700 border-2 border-rose-100 hover:bg-rose-100 transition-all flex flex-col items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed group"
                  >
                    <LogOut size={32} className="group-hover:scale-110 transition-transform" />
                    <span className="font-bold text-lg">SALIDA</span>
                  </button>
                </div>

                {lastAction && (
                  <div className="mt-8 p-4 bg-zinc-50 rounded-xl border border-zinc-100">
                    <p className="text-xs text-zinc-500 uppercase font-bold tracking-wider mb-2">Último marcaje</p>
                    <div className="flex items-center justify-between">
                      <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase ${
                        lastAction.type === 'in' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                      }`}>
                        {lastAction.type === 'in' ? 'Entrada' : 'Salida'}
                      </span>
                      <span className="text-sm font-mono text-zinc-600">
                        {new Date(lastAction.timestamp).toLocaleString()}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* History */}
            <div className="lg:col-span-2">
              <div className="glass-card overflow-hidden">
                <div className="p-6 border-b border-zinc-100 flex items-center justify-between">
                  <h3 className="text-lg font-bold flex items-center gap-2">
                    <ClipboardList size={20} className="text-zinc-400" />
                    Mis Últimos Registros
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-zinc-50 text-zinc-500 text-[10px] uppercase tracking-wider font-bold">
                        <th className="px-6 py-3">Fecha y Hora</th>
                        <th className="px-6 py-3">Tipo</th>
                        <th className="px-6 py-3">Notas</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                      {attendance.map((record) => (
                        <tr key={record.id} className="hover:bg-zinc-50/50 transition-colors">
                          <td className="px-6 py-4 text-sm font-mono text-zinc-600">
                            {new Date(record.timestamp).toLocaleString()}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase ${
                              record.type === 'in' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                            }`}>
                              {record.type === 'in' ? 'Entrada' : 'Salida'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-zinc-500 italic">
                            {record.note || '-'}
                          </td>
                        </tr>
                      ))}
                      {attendance.length === 0 && (
                        <tr>
                          <td colSpan={3} className="px-6 py-12 text-center text-zinc-400">
                            No hay registros todavía
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Admin Tabs */}
            <div className="flex gap-2 p-1 bg-zinc-200/50 rounded-xl w-fit">
              <button 
                onClick={() => setAdminTab('attendance')}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${
                  adminTab === 'attendance' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'
                }`}
              >
                <ClipboardList size={16} />
                Registros
              </button>
              <button 
                onClick={() => setAdminTab('users')}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${
                  adminTab === 'users' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'
                }`}
              >
                <Users size={16} />
                Usuarios
              </button>
            </div>

            {adminTab === 'attendance' ? (
              <div className="glass-card overflow-hidden">
                <div className="p-6 border-b border-zinc-100 flex items-center justify-between">
                  <h3 className="text-lg font-bold">Listado General de Marcajes</h3>
                  <button 
                    onClick={() => {
                      const csv = allAttendance.map(r => `${r.full_name},${r.timestamp},${r.type},${r.note}`).join('\n');
                      const blob = new Blob([`Nombre,Fecha,Tipo,Nota\n${csv}`], { type: 'text/csv' });
                      const url = window.URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = 'marcajes.csv';
                      a.click();
                    }}
                    className="btn-secondary text-xs flex items-center gap-2"
                  >
                    Exportar CSV
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-zinc-50 text-zinc-500 text-[10px] uppercase tracking-wider font-bold">
                        <th className="px-6 py-3">Empleado</th>
                        <th className="px-6 py-3">Fecha y Hora</th>
                        <th className="px-6 py-3">Tipo</th>
                        <th className="px-6 py-3">Notas</th>
                        <th className="px-6 py-3 text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                      {allAttendance.map((record) => (
                        <tr key={record.id} className="hover:bg-zinc-50/50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center">
                                <UserIcon size={14} className="text-zinc-400" />
                              </div>
                              <span className="text-sm font-bold text-zinc-900">{record.full_name}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            {editingRecord === record.id ? (
                              <input 
                                type="datetime-local" 
                                value={editForm.timestamp}
                                onChange={(e) => setEditForm({...editForm, timestamp: e.target.value})}
                                className="text-xs border rounded p-1"
                              />
                            ) : (
                              <span className="text-sm font-mono text-zinc-600">
                                {new Date(record.timestamp).toLocaleString()}
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            {editingRecord === record.id ? (
                              <select 
                                value={editForm.type}
                                onChange={(e) => setEditForm({...editForm, type: e.target.value as 'in' | 'out'})}
                                className="text-xs border rounded p-1"
                              >
                                <option value="in">Entrada</option>
                                <option value="out">Salida</option>
                              </select>
                            ) : (
                              <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase ${
                                record.type === 'in' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                              }`}>
                                {record.type === 'in' ? 'Entrada' : 'Salida'}
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            {editingRecord === record.id ? (
                              <input 
                                type="text" 
                                value={editForm.note}
                                onChange={(e) => setEditForm({...editForm, note: e.target.value})}
                                className="text-xs border rounded p-1 w-full"
                              />
                            ) : (
                              <span className="text-sm text-zinc-500 italic">{record.note || '-'}</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {editingRecord === record.id ? (
                                <>
                                  <button onClick={() => handleUpdateRecord(record.id)} className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"><Check size={16} /></button>
                                  <button onClick={() => setEditingRecord(null)} className="p-1 text-zinc-400 hover:bg-zinc-50 rounded"><X size={16} /></button>
                                </>
                              ) : (
                                <>
                                  <button onClick={() => startEditing(record)} className="p-1 text-zinc-400 hover:bg-zinc-100 rounded"><Edit2 size={16} /></button>
                                  <button 
                                    onClick={() => handleDeleteRecord(record.id)} 
                                    className="p-3 text-rose-400 hover:bg-rose-50 rounded-xl transition-all active:scale-95"
                                    title="Eliminar registro"
                                  >
                                    <Trash2 size={20} />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Create User */}
                <div className="lg:col-span-1">
                  <div className="glass-card p-6">
                    <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                      <UserPlus size={20} className="text-zinc-400" />
                      Nuevo Usuario
                    </h3>
                    <form onSubmit={handleCreateUser} className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Nombre Completo</label>
                        <input 
                          type="text" 
                          value={newUser.full_name}
                          onChange={(e) => setNewUser({...newUser, full_name: e.target.value})}
                          className="input-field text-sm"
                          placeholder="Ej: Juan Pérez"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Usuario</label>
                        <input 
                          type="text" 
                          value={newUser.username}
                          onChange={(e) => setNewUser({...newUser, username: e.target.value})}
                          className="input-field text-sm"
                          placeholder="Ej: jperez"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Contraseña</label>
                        <input 
                          type="password" 
                          value={newUser.password}
                          onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                          className="input-field text-sm"
                          placeholder="••••••••"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Rol</label>
                        <select 
                          value={newUser.role}
                          onChange={(e) => setNewUser({...newUser, role: e.target.value as Role})}
                          className="input-field text-sm"
                        >
                          <option value="staff">Conserje</option>
                          <option value="admin">Administrador</option>
                        </select>
                      </div>
                      <button type="submit" className="btn-primary w-full py-3 text-sm">
                        Crear Usuario
                      </button>
                    </form>
                  </div>
                </div>

                {/* User List */}
                <div className="lg:col-span-2">
                  <div className="glass-card overflow-hidden">
                    <div className="p-6 border-b border-zinc-100">
                      <h3 className="text-lg font-bold">Usuarios del Sistema</h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="bg-zinc-50 text-zinc-500 text-[10px] uppercase tracking-wider font-bold">
                            <th className="px-6 py-3">Nombre</th>
                            <th className="px-6 py-3">Usuario</th>
                            <th className="px-6 py-3">Rol</th>
                            <th className="px-6 py-3 text-right">Acciones</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100">
                          {allUsers.map((u) => (
                            <tr key={u.id} className="hover:bg-zinc-50/50 transition-colors">
                              <td className="px-6 py-4">
                                <span className="text-sm font-bold text-zinc-900">{u.full_name}</span>
                              </td>
                              <td className="px-6 py-4">
                                <span className="text-sm text-zinc-500">{u.username}</span>
                              </td>
                              <td className="px-6 py-4">
                                <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase ${
                                  u.role === 'admin' ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-600'
                                }`}>
                                  {u.role === 'admin' ? 'Admin' : 'Conserje'}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-right">
                                <button 
                                  onClick={() => handleDeleteUser(u.id)}
                                  disabled={u.username === 'admin'}
                                  className="p-3 text-rose-400 hover:bg-rose-50 rounded-xl disabled:opacity-30 transition-all active:scale-95"
                                  title="Eliminar usuario"
                                >
                                  <Trash2 size={20} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
