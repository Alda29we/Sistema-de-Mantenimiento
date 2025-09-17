import React, { useState } from 'react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const EquipmentForm = ({ onSubmit, onCancel, initialData = null }) => {
  const [formData, setFormData] = useState({
    area: initialData?.area || '',
    equipment_type: initialData?.equipment_type || 'cpu',
    nombre_pc: initialData?.nombre_pc || '',
    marca: initialData?.marca || '',
    modelo: initialData?.modelo || '',
    serie: initialData?.serie || '',
    tipo_mantenimiento: initialData?.tipo_mantenimiento || 'preventivo',
    observaciones: initialData?.observaciones || '',
    estado_equipo: initialData?.estado_equipo || 'operativo'
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const submitData = {
        ...formData,
        fecha: new Date(formData.fecha).toISOString()
      };

      if (initialData) {
        // Update existing equipment
        await axios.put(`${API}/equipment/${initialData.id}`, submitData);
      } else {
        // Create new equipment
        await axios.post(`${API}/equipment`, submitData);
      }

      onSubmit();
    } catch (error) {
      setError(error.response?.data?.detail || 'Error al guardar el equipo');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-screen overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              {initialData ? 'Editar Equipo' : 'Registrar Nuevo Equipo'}
            </h2>
            <button
              onClick={onCancel}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {error && (
            <div className="alert alert-error mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="form-label">Área</label>
                <input
                  type="text"
                  required
                  value={formData.area}
                  onChange={(e) => handleChange('area', e.target.value)}
                  className="form-input"
                  placeholder="Ej: Sistemas, Contabilidad, Gerencia"
                />
              </div>

              <div>
                <label className="form-label">Tipo de Equipo</label>
                <select
                  value={formData.equipment_type}
                  onChange={(e) => handleChange('equipment_type', e.target.value)}
                  className="form-select"
                >
                  <option value="cpu">CPU/Computadora</option>
                  <option value="monitor">Monitor</option>
                  <option value="impresora">Impresora</option>
                </select>
              </div>
            </div>

            {formData.equipment_type === 'cpu' && (
              <div>
                <label className="form-label">Nombre del PC</label>
                <input
                  type="text"
                  value={formData.nombre_pc}
                  onChange={(e) => handleChange('nombre_pc', e.target.value)}
                  className="form-input"
                  placeholder="Ej: PC-SISTEMAS-01"
                />
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="form-label">Marca</label>
                <input
                  type="text"
                  required
                  value={formData.marca}
                  onChange={(e) => handleChange('marca', e.target.value)}
                  className="form-input"
                  placeholder="Ej: HP, Dell, Canon"
                />
              </div>

              <div>
                <label className="form-label">Modelo</label>
                <input
                  type="text"
                  required
                  value={formData.modelo}
                  onChange={(e) => handleChange('modelo', e.target.value)}
                  className="form-input"
                  placeholder="Ej: Pavilion g6, OptiPlex 3070"
                />
              </div>
            </div>

            <div>
              <label className="form-label">Número de Serie</label>
              <input
                type="text"
                required
                value={formData.serie}
                onChange={(e) => handleChange('serie', e.target.value)}
                className="form-input"
                placeholder="Número de serie del equipo"
              />
            </div>

            <div>
              <label className="form-label">Tipo de Mantenimiento</label>
              <select
                value={formData.tipo_mantenimiento}
                onChange={(e) => handleChange('tipo_mantenimiento', e.target.value)}
                className="form-select"
              >
                <option value="preventivo">Preventivo</option>
                <option value="correctivo">Correctivo</option>
                <option value="limpieza">Limpieza</option>
              </select>
            </div>

            <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Nota:</strong> La fecha del mantenimiento se registrará automáticamente como la fecha actual.
              </p>
            </div>

            <div>
              <label className="form-label">Estado del Equipo</label>
              <select
                value={formData.estado_equipo}
                onChange={(e) => handleChange('estado_equipo', e.target.value)}
                className="form-select"
              >
                <option value="operativo">Operativo</option>
                <option value="en_reparacion">En Reparación</option>
                <option value="fuera_servicio">Fuera de Servicio</option>
              </select>
            </div>

            <div>
              <label className="form-label">Observaciones</label>
              <textarea
                value={formData.observaciones}
                onChange={(e) => handleChange('observaciones', e.target.value)}
                className="form-input"
                rows="4"
                placeholder="Detalles del mantenimiento realizado, problemas encontrados, etc."
              />
            </div>

            <div className="flex space-x-3 pt-4">
              <button
                type="submit"
                disabled={loading}
                className="btn-primary flex-1"
              >
                {loading ? 'Guardando...' : (initialData ? 'Actualizar' : 'Guardar')}
              </button>
              <button
                type="button"
                onClick={onCancel}
                className="btn-secondary px-6"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default EquipmentForm;