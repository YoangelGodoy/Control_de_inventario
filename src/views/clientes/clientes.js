import React, { useEffect, useState, useCallback } from 'react';
import {
  CForm, CFormInput, CButton, CCard, CCardBody, CCardHeader,
  CCol, CRow, CContainer, CTable, CTableHead, CTableRow,
  CTableHeaderCell, CTableBody, CTableDataCell,
  CModal, CModalHeader, CModalTitle, CModalBody, CModalFooter,
  CFormLabel, CSpinner, CPagination, CPaginationItem,
  CFormFeedback
} from '@coreui/react';
import { CIcon } from '@coreui/icons-react';
import { 
  cilPlus, cilSearch, cilChevronLeft, cilChevronRight, 
  cilPencil, cilTrash, 
  cilUser
} from '@coreui/icons';
import { createClient } from "../../../supabase/client"; 
import { toast } from "sonner";

const ClientesCoreUI = () => {
  const supabase = createClient();

  // Estados de datos
  const [clientes, setClientes] = useState([]);
  
  // Estados de Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const PAGE_SIZE = 8; 

  // Estados de UI
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [modalDeleteVisible, setModalDeleteVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [updateData, setUpdateData] = useState(null);
  const [clienteToDelete, setClienteToDelete] = useState(null);
  const [validated, setValidated] = useState(false); 
  const [idError, setIdError] = useState(false);

  const initialFormState = { 
    identificacion: '', 
    nombre: '', 
    telefono: '', 
    email: '', 
    direccion: ''
  };
  const [formData, setFormData] = useState(initialFormState);

  // 1. Cargar Datos con Paginación
  const fetchClientes = useCallback(async () => {
    setLoading(true);
    try {
      const from = (currentPage - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const { data, count, error } = await supabase
        .from("clientes")
        .select("*", { count: 'exact' })
        .order("created_at", { ascending: false })
        .range(from, to);

      if (error) throw error;
      setClientes(data || []);
      setTotalRecords(count || 0);
    } catch (error) {
      toast.error("Error al cargar clientes: " + error.message);
    } finally {
      setLoading(false);
    }
  }, [supabase, currentPage]);

  useEffect(() => {
    fetchClientes();
  }, [fetchClientes]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  // Sincronizar formulario
  useEffect(() => {
    if (updateData) {
      setFormData({
        identificacion: updateData.identificacion || '',
        nombre: updateData.nombre || '',
        telefono: updateData.telefono || '',
        email: updateData.email || '',
        direccion: updateData.direccion || ''
      });
    } else {
      setFormData(initialFormState);
    }
    setValidated(false);
    setIdError(false);
  }, [updateData]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (name === 'identificacion') setIdError(false);
    setFormData(prev => ({ 
      ...prev, 
      [name]: type === 'checkbox' ? checked : value 
    }));
  };

  const handleCancel = () => {
    setUpdateData(null);
    setFormData(initialFormState);
    setModalVisible(false);
    setValidated(false);
    setIdError(false);
  };

  // --- VALIDACIONES ANTES DE ENVIAR ---
  const validateForm = () => {
    if (!formData.identificacion.trim()) {
      toast.warning("La identificación es obligatoria");
      return false;
    }
    if (!formData.nombre.trim()) {
      toast.warning("El nombre es obligatorio");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const form = e.currentTarget;
    
    setValidated(true);

    if (form.checkValidity() === false || !validateForm()) {
      e.stopPropagation();
      return;
    }
    
    setSubmitting(true);
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error("Sesión de usuario no encontrada");

      const idLimpia = formData.identificacion.trim().toUpperCase();

      if (!updateData) {
        const { data: existing } = await supabase
          .from("clientes")
          .select("identificacion")
          .eq("identificacion", idLimpia)
          .maybeSingle();

        if (existing) {
          setIdError(true);
          toast.error("Ya existe un cliente con esta identificación");
          setSubmitting(false);
          return;
        }
      }

      const payload = { 
        identificacion: idLimpia,
        nombre: formData.nombre.trim(),
        telefono: formData.telefono.trim(),
        email: formData.email.trim().toLowerCase(),
        direccion: formData.direccion.trim(),
        user_id: user.id 
      };

      if (updateData) {
        const { error: err } = await supabase
          .from("clientes")
          .update(payload)
          .eq("id", updateData.id);
        if (err) throw err;
        toast.success("Cliente actualizado");
      } else {
        const { error: err } = await supabase.from("clientes").insert([payload]);
        if (err) throw err;
        toast.success("Cliente registrado con éxito");
        setCurrentPage(1);
      }

      handleCancel();
      fetchClientes();
    } catch (error) {
      toast.error("Error: " + (error.message || "Error desconocido"));
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    if (!clienteToDelete) return;
    try {
      const { error } = await supabase.from("clientes").delete().eq("id", clienteToDelete);
      if (error) throw error;
      toast.success("Cliente eliminado correctamente");
      fetchClientes();
    } catch (error) {
      toast.error("No se pudo eliminar: " + error.message);
    } finally {
      setModalDeleteVisible(false);
      setClienteToDelete(null);
    }
  };

  const filteredClientes = clientes.filter(c => 
    c.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.identificacion?.includes(searchTerm)
  );

  const totalPages = Math.ceil(totalRecords / PAGE_SIZE);

  return (
    <CContainer> 
      <CCard className="mb-4 shadow-lg border-0 overflow-hidden w-100" style={{ borderRadius: '16px' }}>
        <CCardHeader className="bg-primary text-white py-3">
          <h2 className="fw-bold text-white d-flex align-items-center m-0 fs-4 text-uppercase">
            <CIcon icon={cilUser} className="me-2 " />
            Gestión de Clientes
          </h2>
        </CCardHeader>
      </CCard>

      <CCard className="mb-4 shadow-lg border-0" style={{ borderRadius: '16px' }}>
        <CCardHeader className="py-3 border-bottom-0">
          <div className="d-flex justify-content-between align-items-center">
            <div className="d-flex align-items-center rounded-pill px-3 py-1" style={{ width: '400px' }}>
              <CIcon icon={cilSearch} className="text-muted me-2" />
              <CFormInput
                placeholder="Buscar por nombre o ID..."
                className="border-0 bg-transparent shadow-none"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <CButton color="success" className="text-white rounded-pill px-4" onClick={() => { setUpdateData(null); setModalVisible(true); }}>
              <CIcon icon={cilPlus} className="me-2" /> Nuevo Cliente
            </CButton>
          </div>
        </CCardHeader>
        <CCardBody className="px-4">
          <CTable hover responsive align="middle" className="mb-0">
            <CTableHead>
              <CTableRow>
                <CTableHeaderCell className="text-muted small text-uppercase">Identificación</CTableHeaderCell>
                <CTableHeaderCell className="text-muted small text-uppercase">Nombre</CTableHeaderCell>
                <CTableHeaderCell className="text-muted small text-uppercase">Contacto</CTableHeaderCell>
                <CTableHeaderCell className="text-end text-muted small text-uppercase">Acciones</CTableHeaderCell>
              </CTableRow>
            </CTableHead>
            <CTableBody>
              {loading ? (
                <CTableRow><CTableDataCell colSpan="4" className="text-center py-5"><CSpinner color="primary" /></CTableDataCell></CTableRow>
              ) : filteredClientes.length === 0 ? (
                <CTableRow><CTableDataCell colSpan="4" className="text-center py-4 text-muted">No se encontraron registros</CTableDataCell></CTableRow>
              ) : filteredClientes.map((c) => (
                <CTableRow key={c.id}>
                  <CTableDataCell className="fw-bold text-uppercase">{c.identificacion}</CTableDataCell>
                  <CTableDataCell>{c.nombre}</CTableDataCell>
                  <CTableDataCell>
                    <div className="small">{c.telefono || "-"}</div>
                    <div className="small text-muted">{c.email || "-"}</div>
                  </CTableDataCell>
                  <CTableDataCell className="text-end">
                    <CButton color="info" variant="ghost" size="sm" className="rounded-pill" title="Editar" onClick={() => { setUpdateData(c); setModalVisible(true); }}>
                      <CIcon icon={cilPencil} />
                    </CButton>
                    <CButton color="danger" variant="ghost" size="sm" className="rounded-pill ms-2" title="Eliminar" onClick={() => { setClienteToDelete(c.id); setModalDeleteVisible(true); }}>
                      <CIcon icon={cilTrash} />
                    </CButton>
                  </CTableDataCell>
                </CTableRow>
              ))}
            </CTableBody>
          </CTable>

          {!loading && totalPages > 1 && (
            <div className="d-flex justify-content-between align-items-center mt-4">
              <div className="text-muted small">
                Mostrando {clientes.length} de {totalRecords} registros
              </div>
              <CPagination align="end" className="mb-0">
                <CPaginationItem 
                  disabled={currentPage === 1} 
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  style={{ cursor: 'pointer' }}
                >
                  <CIcon icon={cilChevronLeft} />
                </CPaginationItem>
                
                {[...Array(totalPages)].map((_, i) => (
                  <CPaginationItem 
                    key={i + 1}
                    active={currentPage === i + 1}
                    onClick={() => setCurrentPage(i + 1)}
                    style={{ cursor: 'pointer' }}
                  >
                    {i + 1}
                  </CPaginationItem>
                ))}

                <CPaginationItem 
                  disabled={currentPage === totalPages} 
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  style={{ cursor: 'pointer' }}
                >
                  <CIcon icon={cilChevronRight} />
                </CPaginationItem>
              </CPagination>
            </div>
          )}
        </CCardBody>
      </CCard>

      {/* MODAL FORMULARIO */}
      <CModal
        visible={modalVisible}
        onClose={handleCancel}
        size="lg"
        alignment="center"
        backdrop="static"
      >
        <CForm
          noValidate
          validated={validated}
          onSubmit={handleSubmit}
          className="overflow-visible"
        >
          <CModalHeader className="bg-primary text-white border-0 py-3">
            <CModalTitle className="fw-bold text-white m-0 fs-5">
              {updateData ? 'Editar Cliente' : 'Nuevo Cliente'}
            </CModalTitle>
          </CModalHeader>

          <CModalBody className="p-4">
              <CRow className="g-4">
                <CCol md={6}>
                  <CFormLabel className="fw-bold text-muted small mb-2 ms-1">Identificación *</CFormLabel>
                  <CFormInput
                    name="identificacion"
                    value={formData.identificacion}
                    onChange={handleChange}
                    required
                    disabled={!!updateData}
                    placeholder="Ej: V-12345678"
                    className="border shadow-sm py-2 px-3"
                    style={{ borderRadius: '12px', fontSize: '0.95rem' }}
                    invalid={idError || (validated && !formData.identificacion.trim())}
                  />
                  <CFormFeedback invalid>
                    {idError ? 'Ya existe un cliente con esta identificación.' : 'La identificación es obligatoria.'}
                  </CFormFeedback>
                </CCol>

                <CCol md={6}>
                  <CFormLabel className="fw-bold text-muted small mb-2 ms-1">Nombre Completo *</CFormLabel>
                  <CFormInput
                    name="nombre"
                    value={formData.nombre}
                    onChange={handleChange}
                    required
                    placeholder="Juan Pérez"
                    className="border shadow-sm py-2 px-3"
                    style={{ borderRadius: '12px', fontSize: '0.95rem' }}
                    invalid={validated && !formData.nombre.trim()}
                  />
                  <CFormFeedback invalid>El nombre es obligatorio.</CFormFeedback>
                </CCol>

                <CCol md={6}>
                  <CFormLabel className="fw-bold text-muted small mb-2 ms-1">Teléfono</CFormLabel>
                  <CFormInput
                    name="telefono"
                    value={formData.telefono}
                    onChange={handleChange}
                    placeholder="Ej: 04121234567"
                    className="border shadow-sm py-2 px-3"
                    style={{ borderRadius: '12px', fontSize: '0.95rem' }}
                  />
                </CCol>

                <CCol md={6}>
                  <CFormLabel className="fw-bold text-muted small mb-2 ms-1">Correo Electrónico</CFormLabel>
                  <CFormInput
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="usuario@correo.com"
                    className="border shadow-sm py-2 px-3"
                    style={{ borderRadius: '12px', fontSize: '0.95rem' }}
                  />
                </CCol>

                <CCol md={12}>
                  <CFormLabel className="fw-bold text-muted small mb-2 ms-1">Dirección</CFormLabel>
                  <CFormInput
                    name="direccion"
                    value={formData.direccion}
                    onChange={handleChange}
                    placeholder="Av. Principal, Ciudad, País"
                    className="border shadow-sm py-2 px-3"
                    style={{ borderRadius: '12px', fontSize: '0.95rem' }}
                  />
                </CCol>
              </CRow>
          </CModalBody>

          <CModalFooter className="border-0 p-4 pt-2 d-flex gap-3 bg-light">
            <CButton
              type="button"
              color="secondary"
              variant="ghost"
              className="flex-grow-1 py-2 fw-bold"
              style={{ borderRadius: '12px' }}
              onClick={handleCancel}
            >
              Cancelar
            </CButton>
            <CButton
              type="submit"
              color="primary"
              className="flex-grow-1 py-2 fw-bold text-white shadow-sm"
              style={{ borderRadius: '12px' }}
              disabled={submitting}
            >
              {submitting ? <CSpinner size="sm" /> : 'Guardar'}
            </CButton>
          </CModalFooter>
        </CForm>
      </CModal>

      {/* MODAL ELIMINAR */}
      <CModal
        visible={modalDeleteVisible}
        onClose={() => setModalDeleteVisible(false)}
        alignment="center"
        backdrop="static"
      >
        <CModalHeader className="bg-primary text-white border-0 py-3">
          <CModalTitle className="fw-bold text-white m-0 fs-5">Confirmar eliminación</CModalTitle>
        </CModalHeader>
        <CModalBody className="text-center p-4">
          <CIcon icon={cilTrash} size="xl" className="text-danger mb-2" />
          <h6 className="fw-bold mb-1">¿Eliminar cliente?</h6>
          <p className="text-muted small mb-0">Esta acción es permanente y no podrá revertirse.</p>
        </CModalBody>
        <CModalFooter className="border-0 p-4 pt-0 d-flex gap-3 bg-light">
          <CButton
            color="secondary"
            variant="ghost"
            className="flex-grow-1 py-2 fw-bold"
            style={{ borderRadius: '12px' }}
            onClick={() => setModalDeleteVisible(false)}
          >
            Cancelar
          </CButton>
          <CButton
            color="danger"
            className="flex-grow-1 py-2 fw-bold text-white shadow-sm"
            style={{ borderRadius: '12px' }}
            onClick={confirmDelete}
          >
            Eliminar
          </CButton>
        </CModalFooter>
      </CModal>
    </CContainer>
  );
};

export default ClientesCoreUI;