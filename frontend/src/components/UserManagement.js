import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../App';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const UserManagement = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    full_name: '',
    role: 'user',
    temporary_password: ''
  });
  const [passwordData, setPasswordData] = useState({
    new_password: '',
    confirm_password: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchUsers();
    }
  }, [user]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API}/admin/users`);
      setUsers(response.data);
    } catch (error) {
      setError('Error al cargar usuarios');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (formData.temporary_password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    try {
      await axios.post(`${API}/admin/users`, formData);
      setSuccess('Usuario creado exitosamente');
      setShowForm(false);
      setFormData({
        username: '',
        email: '',
        full_name: '',
        role: 'user',
        temporary_password: ''
      });
      fetchUsers();
    } catch (error) {
      setError(error.response?.data?.detail || 'Error al crear usuario');
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (passwordData.new_password !== passwordData.confirm_password) {
      setError('Las contraseñas no coinciden');
      return;
    }

    if (passwordData.new_password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    try {
      await axios.post(`${API}/admin/users/${selectedUser.id}/reset-password`, {
        new_password: passwordData.new_password
      });
      setSuccess('Contraseña restablecida exitosamente. El usuario deberá cambiarla en su próximo login.');
      setShowPasswordModal(false);
      setPasswordData({ new_password: '', confirm_password: '' });
      setSelectedUser(null);
    } catch (error) {
      setError(error.response?.data?.detail || 'Error al restablecer contraseña');
    }
  };

  const handleToggleActive = async (userId, isActive) => {
    try {
      await axios.put(`${API}/admin/users/${userId}`, {
        is_active: !isActive
      });
      fetchUsers();
      setSuccess(`Usuario ${!isActive ? 'activado' : 'desactivado'} exitosamente`);
    } catch (error) {
      setError('Error al cambiar estado del usuario');
    }
  };

  const handleDeleteUser = async (userId, username) => {
    if (window.confirm(`¿Estás seguro de que quieres eliminar al usuario "${username}"?`)) {
      try {
        await axios.delete(`${API}/admin/users/${userId}`);
        setSuccess('Usuario eliminado exitosamente');
        fetchUsers();
      } catch (error) {
        setError(error.response?.data?.detail || 'Error al eliminar usuario');
      }
    }
  };

  if (user?.role !== 'admin') {
    return (
      <div className="p-6">
        <div className="alert alert-error">
          No tienes permisos para acceder a esta sección.
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-6 flex justify-center">
        <div className="spinner w-8 h-8"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Gestión de Usuarios</h2>
        <button
          onClick={() => setShowForm(true)}
          className="btn-primary"
        >
          + Nuevo Usuario
        </button>
      </div>

      {error && (
        <div className="alert alert-error">
          {error}
        </div>
      )}

      {success && (
        <div className="alert alert-success">
          {success}
        </div>
      )}

      {/* Users Table */}
      <div className="card">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Usuarios del Sistema ({users.length})
        </h3>

        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Usuario</th>
                <th>Nombre Completo</th>
                <th>Email</th>
                <th>Rol</th>
                <th>Estado</th>
                <th>Último Login</th>
                <th>Cambiar Contraseña</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td className="font-medium">{u.username}</td>
                  <td>{u.full_name}</td>
                  <td>{u.email}</td>
                  <td>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      u.role === 'admin' 
                        ? 'bg-blue-100 text-blue-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {u.role === 'admin' ? 'Administrador' : 'Usuario'}
                    </span>
                  </td>
                  <td>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      u.is_active 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {u.is_active ? 'Activo' : 'Inactivo'}
                    </span>
                    {u.must_change_password && (
                      <span className="ml-2 px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">
                        Debe cambiar contraseña
                      </span>
                    )}
                  </td>
                  <td className="text-sm">
                    {u.last_login 
                      ? new Date(u.last_login).toLocaleString()
                      : 'Nunca'
                    }
                  </td>
                  <td>
                    <button
                      onClick={() => {
                        setSelectedUser(u);
                        setShowPasswordModal(true);
                      }}
                      className="text-blue-600 hover:text-blue-900 text-sm"
                    >
                      Restablecer
                    </button>
                  </td>
                  <td>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleToggleActive(u.id, u.is_active)}
                        className={`text-sm ${
                          u.is_active 
                            ? 'text-red-600 hover:text-red-900' 
                            : 'text-green-600 hover:text-green-900'
                        }`}
                      >
                        {u.is_active ? 'Desactivar' : 'Activar'}
                      </button>
                      {u.id !== user.id && (
                        <button
                          onClick={() => handleDeleteUser(u.id, u.username)}
                          className="text-red-600 hover:text-red-900 text-sm"
                        >
                          Eliminar
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create User Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Crear Nuevo Usuario</h2>
                <button
                  onClick={() => setShowForm(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleCreateUser} className="space-y-4">
                <div>
                  <label className="form-label">Usuario</label>
                  <input
                    type="text"
                    required
                    value={formData.username}
                    onChange={(e) => setFormData({...formData, username: e.target.value})}
                    className="form-input"
                    placeholder="Nombre de usuario"
                  />
                </div>

                <div>
                  <label className="form-label">Email</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="form-input"
                    placeholder="correo@ejemplo.com"
                  />
                </div>

                <div>
                  <label className="form-label">Nombre Completo</label>
                  <input
                    type="text"
                    required
                    value={formData.full_name}
                    onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                    className="form-input"
                    placeholder="Nombre completo"
                  />
                </div>

                <div>
                  <label className="form-label">Rol</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({...formData, role: e.target.value})}
                    className="form-select"
                  >
                    <option value="user">Usuario Normal</option>
                    <option value="admin">Administrador</option>
                  </select>
                </div>

                <div>
                  <label className="form-label">Contraseña Temporal</label>
                  <input
                    type="password"
                    required
                    value={formData.temporary_password}
                    onChange={(e) => setFormData({...formData, temporary_password: e.target.value})}
                    className="form-input"
                    placeholder="Contraseña temporal (mínimo 6 caracteres)"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    El usuario deberá cambiar esta contraseña en su primer login.
                  </p>
                </div>

                <div className="flex space-x-3 pt-4">
                  <button
                    type="submit"
                    className="btn-primary flex-1"
                  >
                    Crear Usuario
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="btn-secondary px-6"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Password Reset Modal */}
      {showPasswordModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">
                  Restablecer Contraseña
                </h2>
                <button
                  onClick={() => setShowPasswordModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <p className="text-gray-600 mb-4">
                Restableciendo contraseña para: <strong>{selectedUser.full_name}</strong>
              </p>

              <form onSubmit={handleResetPassword} className="space-y-4">
                <div>
                  <label className="form-label">Nueva Contraseña</label>
                  <input
                    type="password"
                    required
                    value={passwordData.new_password}
                    onChange={(e) => setPasswordData({...passwordData, new_password: e.target.value})}
                    className="form-input"
                    placeholder="Nueva contraseña (mínimo 6 caracteres)"
                  />
                </div>

                <div>
                  <label className="form-label">Confirmar Contraseña</label>
                  <input
                    type="password"
                    required
                    value={passwordData.confirm_password}
                    onChange={(e) => setPasswordData({...passwordData, confirm_password: e.target.value})}
                    className="form-input"
                    placeholder="Confirmar nueva contraseña"
                  />
                </div>

                <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    <strong>Nota:</strong> El usuario deberá cambiar esta contraseña en su próximo login.
                  </p>
                </div>

                <div className="flex space-x-3 pt-4">
                  <button
                    type="submit"
                    className="btn-primary flex-1"
                  >
                    Restablecer
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowPasswordModal(false)}
                    className="btn-secondary px-6"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;