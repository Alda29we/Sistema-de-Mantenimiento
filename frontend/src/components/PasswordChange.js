import React, { useState } from 'react';
import axios from 'axios';
import { useAuth } from '../App';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const PasswordChange = ({ onClose, onSuccess }) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (formData.new_password !== formData.confirm_password) {
      setError('Las nuevas contraseñas no coinciden');
      setLoading(false);
      return;
    }

    if (formData.new_password.length < 6) {
      setError('La nueva contraseña debe tener al menos 6 caracteres');
      setLoading(false);
      return;
    }

    try {
      await axios.post(`${API}/change-password`, {
        current_password: formData.current_password,
        new_password: formData.new_password
      });
      onSuccess();
    } catch (error) {
      setError(error.response?.data?.detail || 'Error al cambiar contraseña');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              {user?.must_change_password ? 'Cambiar Contraseña (Requerido)' : 'Cambiar Contraseña'}
            </h2>
            {!user?.must_change_password && (
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {user?.must_change_password && (
            <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg mb-6">
              <div className="flex">
                <svg className="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <div className="ml-3">
                  <p className="text-sm text-yellow-800">
                    <strong>Cambio de contraseña requerido.</strong> Debes cambiar tu contraseña temporal antes de continuar.
                  </p>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="alert alert-error mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="form-label">Contraseña Actual</label>
              <input
                type="password"
                required
                value={formData.current_password}
                onChange={(e) => setFormData({...formData, current_password: e.target.value})}
                className="form-input"
                placeholder="Tu contraseña actual"
              />
            </div>

            <div>
              <label className="form-label">Nueva Contraseña</label>
              <input
                type="password"
                required
                value={formData.new_password}
                onChange={(e) => setFormData({...formData, new_password: e.target.value})}
                className="form-input"
                placeholder="Nueva contraseña (mínimo 6 caracteres)"
              />
            </div>

            <div>
              <label className="form-label">Confirmar Nueva Contraseña</label>
              <input
                type="password"
                required
                value={formData.confirm_password}
                onChange={(e) => setFormData({...formData, confirm_password: e.target.value})}
                className="form-input"
                placeholder="Confirmar nueva contraseña"
              />
            </div>

            <div className="flex space-x-3 pt-4">
              <button
                type="submit"
                disabled={loading}
                className="btn-primary flex-1"
              >
                {loading ? 'Cambiando...' : 'Cambiar Contraseña'}
              </button>
              {!user?.must_change_password && (
                <button
                  type="button"
                  onClick={onClose}
                  className="btn-secondary px-6"
                >
                  Cancelar
                </button>
              )}
            </div>
          </form>

          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Recomendaciones:</strong>
            </p>
            <ul className="text-sm text-blue-700 mt-1 list-disc list-inside">
              <li>Usa al menos 8 caracteres</li>
              <li>Combina letras, números y símbolos</li>
              <li>No uses información personal</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PasswordChange;