import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../App';
import EquipmentForm from './EquipmentForm';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const EquipmentList = () => {
  const { user } = useAuth();
  const [equipment, setEquipment] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingEquipment, setEditingEquipment] = useState(null);
  const [filters, setFilters] = useState({
    equipment_type: '',
    area: '',
    tipo_mantenimiento: '',
    estado_equipo: '',
    fecha_inicio: '',
    fecha_fin: '',
    search: ''
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  useEffect(() => {
    fetchEquipment();
  }, []);

  const fetchEquipment = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API}/equipment`);
      setEquipment(response.data);
    } catch (error) {
      console.error('Error fetching equipment:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilter = async () => {
    try {
      setLoading(true);
      const response = await axios.post(`${API}/equipment/filter`, filters);
      setEquipment(response.data);
      setCurrentPage(1);
    } catch (error) {
      console.error('Error filtering equipment:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar este equipo?')) {
      try {
        await axios.delete(`${API}/equipment/${id}`);
        fetchEquipment();
      } catch (error) {
        alert('Error al eliminar el equipo');
      }
    }
  };

  const handleExport = async () => {
    try {
      const response = await axios.post(`${API}/export/excel`, filters, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'reporte_mantenimiento.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      alert('Error al exportar los datos');
    }
  };

  const handleFormSubmit = () => {
    setShowForm(false);
    setEditingEquipment(null);
    fetchEquipment();
  };

  const handleEdit = (equipment) => {
    setEditingEquipment(equipment);
    setShowForm(true);
  };

  const clearFilters = () => {
    setFilters({
      equipment_type: '',
      area: '',
      tipo_mantenimiento: '',
      estado_equipo: '',
      fecha_inicio: '',
      fecha_fin: '',
      search: ''
    });
    fetchEquipment();
  };

  // Pagination logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = equipment.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(equipment.length / itemsPerPage);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  const getStatusBadge = (status) => {
    const badges = {
      operativo: 'bg-green-100 text-green-800',
      en_reparacion: 'bg-yellow-100 text-yellow-800',
      fuera_servicio: 'bg-red-100 text-red-800'
    };
    return badges[status] || 'bg-gray-100 text-gray-800';
  };

  const getMaintenanceTypeBadge = (type) => {
    const badges = {
      preventivo: 'bg-blue-100 text-blue-800',
      correctivo: 'bg-orange-100 text-orange-800',
      limpieza: 'bg-purple-100 text-purple-800'
    };
    return badges[type] || 'bg-gray-100 text-gray-800';
  };

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
        <h2 className="text-2xl font-bold text-gray-900">Gestión de Equipos</h2>
        <button
          onClick={() => setShowForm(true)}
          className="btn-primary"
        >
          + Nuevo Equipo
        </button>
      </div>

      {/* Filters */}
      <div className="card">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Filtros</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="form-label">Buscar</label>
            <input
              type="text"
              value={filters.search}
              onChange={(e) => setFilters({...filters, search: e.target.value})}
              className="form-input"
              placeholder="Marca, modelo, serie..."
            />
          </div>

          <div>
            <label className="form-label">Tipo de Equipo</label>
            <select
              value={filters.equipment_type}
              onChange={(e) => setFilters({...filters, equipment_type: e.target.value})}
              className="form-select"
            >
              <option value="">Todos</option>
              <option value="cpu">CPU</option>
              <option value="monitor">Monitor</option>
              <option value="impresora">Impresora</option>
            </select>
          </div>

          <div>
            <label className="form-label">Área</label>
            <input
              type="text"
              value={filters.area}
              onChange={(e) => setFilters({...filters, area: e.target.value})}
              className="form-input"
              placeholder="Área del equipo"
            />
          </div>

          <div>
            <label className="form-label">Tipo Mantenimiento</label>
            <select
              value={filters.tipo_mantenimiento}
              onChange={(e) => setFilters({...filters, tipo_mantenimiento: e.target.value})}
              className="form-select"
            >
              <option value="">Todos</option>
              <option value="preventivo">Preventivo</option>
              <option value="correctivo">Correctivo</option>
              <option value="limpieza">Limpieza</option>
            </select>
          </div>

          <div>
            <label className="form-label">Estado</label>
            <select
              value={filters.estado_equipo}
              onChange={(e) => setFilters({...filters, estado_equipo: e.target.value})}
              className="form-select"
            >
              <option value="">Todos</option>
              <option value="operativo">Operativo</option>
              <option value="en_reparacion">En Reparación</option>
              <option value="fuera_servicio">Fuera de Servicio</option>
            </select>
          </div>

          <div>
            <label className="form-label">Fecha Desde</label>
            <input
              type="date"
              value={filters.fecha_inicio}
              onChange={(e) => setFilters({...filters, fecha_inicio: e.target.value})}
              className="form-input"
            />
          </div>

          <div>
            <label className="form-label">Fecha Hasta</label>
            <input
              type="date"
              value={filters.fecha_fin}
              onChange={(e) => setFilters({...filters, fecha_fin: e.target.value})}
              className="form-input"
            />
          </div>
        </div>

        <div className="flex space-x-3 mt-4">
          <button onClick={handleFilter} className="btn-primary">
            Aplicar Filtros
          </button>
          <button onClick={clearFilters} className="btn-secondary">
            Limpiar
          </button>
          <button onClick={handleExport} className="btn-success">
            Exportar Excel
          </button>
        </div>
      </div>

      {/* Results */}
      <div className="card">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900">
            Equipos Registrados ({equipment.length})
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Área</th>
                <th>Tipo</th>
                <th>Nombre PC</th>
                <th>Marca/Modelo</th>
                <th>Serie</th>
                <th>Fecha Mant.</th>
                <th>Tipo Mant.</th>
                <th>Estado</th>
                <th>Técnico</th>
                {user?.role === 'admin' && <th>Acciones</th>}
              </tr>
            </thead>
            <tbody>
              {currentItems.map((item) => (
                <tr key={item.id}>
                  <td className="font-medium">{item.area}</td>
                  <td>
                    <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded-full capitalize">
                      {item.equipment_type}
                    </span>
                  </td>
                  <td>{item.nombre_pc || '-'}</td>
                  <td>
                    <div>
                      <p className="font-medium">{item.marca}</p>
                      <p className="text-sm text-gray-500">{item.modelo}</p>
                    </div>
                  </td>
                  <td className="font-mono text-sm">{item.serie}</td>
                  <td>{new Date(item.fecha).toLocaleDateString()}</td>
                  <td>
                    <span className={`px-2 py-1 text-xs rounded-full ${getMaintenanceTypeBadge(item.tipo_mantenimiento)}`}>
                      {item.tipo_mantenimiento}
                    </span>
                  </td>
                  <td>
                    <span className={`px-2 py-1 text-xs rounded-full ${getStatusBadge(item.estado_equipo)}`}>
                      {item.estado_equipo.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="text-sm">{item.tecnico_responsable}</td>
                  {user?.role === 'admin' && (
                    <td>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleEdit(item)}
                          className="text-blue-600 hover:text-blue-900 text-sm"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="text-red-600 hover:text-red-900 text-sm"
                        >
                          Eliminar
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center space-x-2 mt-4">
            <button
              onClick={() => paginate(currentPage - 1)}
              disabled={currentPage === 1}
              className="px-3 py-1 text-sm border rounded disabled:opacity-50"
            >
              Anterior
            </button>
            
            {[...Array(totalPages)].map((_, index) => (
              <button
                key={index}
                onClick={() => paginate(index + 1)}
                className={`px-3 py-1 text-sm border rounded ${
                  currentPage === index + 1
                    ? 'bg-blue-600 text-white'
                    : 'hover:bg-gray-50'
                }`}
              >
                {index + 1}
              </button>
            ))}
            
            <button
              onClick={() => paginate(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="px-3 py-1 text-sm border rounded disabled:opacity-50"
            >
              Siguiente
            </button>
          </div>
        )}
      </div>

      {/* Form Modal */}
      {showForm && (
        <EquipmentForm
          initialData={editingEquipment}
          onSubmit={handleFormSubmit}
          onCancel={() => {
            setShowForm(false);
            setEditingEquipment(null);
          }}
        />
      )}
    </div>
  );
};

export default EquipmentList;