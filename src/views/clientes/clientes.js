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
  
  // Estados de Búsqueda y Paginación
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const PAGE_SIZE = 8; 

  // Estados de UI
  const [loading, setLoading] = useState(true);
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

  // 1. Efecto Debounce para la búsqueda
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setCurrentPage(1); // Volver a la página 1 al buscar
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // 2. Cargar Datos desde Supabase con Filtro y Paginación
  const fetchClientes = useCallback(async () => {
    setLoading(true);
    try {
      const from = (currentPage - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      let query = supabase
        .from("clientes")
        .select("*", { count: 'exact' });

      // Filtro OR en el servidor (nombre o identificación)
      if (debouncedSearch) {
        query = query.or(`nombre.ilike.%${debouncedSearch}%,identificacion.ilike.%${debouncedSearch}%`);
      }

      const { data, count, error } = await query
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
  }, [supabase, currentPage, debouncedSearch]);

  useEffect(() => {
    fetchClientes();
  }, [fetchClientes]);

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
    const { name, value } = e.target;
    if (name === 'identificacion') setIdError(false);
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCancel = () => {
    setUpdateData(null);
    setFormData(initialFormState);
    setModalVisible(false);
    setValidated(false);
    setIdError(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const form = e.currentTarget;
    setValidated(true);

    if (form.checkValidity() === false) {
      e.stopPropagation();
      return;
    }
    
    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
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

      const { error: err } = updateData 
        ? await supabase.from("clientes").update(payload).eq("id", updateData.id)
        : await supabase.from("clientes").insert([payload]);

      if (err) throw err;
      
      toast.success(updateData ? "Cliente actualizado" : "Cliente registrado");
      handleCancel();
      fetchClientes();
    } catch (error) {
      toast.error("Error: " + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    try {
      const { error } = await supabase.from("clientes").delete().eq("id", clienteToDelete);
      if (error) throw error;
      toast.success("Cliente eliminado");
      fetchClientes();
    } catch (error) {
      toast.error("Error al eliminar");
    } finally {
      setModalDeleteVisible(false);
      setClienteToDelete(null);
    }
  };

  const totalPages = Math.ceil(totalRecords / PAGE_SIZE);

  return (
    <CContainer> 
      {/* HEADER */}
      <CCard className="mb-4 shadow-lg border-0 overflow-hidden" style={{ borderRadius: '16px' }}>
        <CCardHeader className="bg-primary text-white py-3">
          <h2 className="fw-bold text-white d-flex align-items-center m-0 fs-4 text-uppercase">
            <CIcon icon={cilUser} className="me-2" /> Gestión de Clientes
          </h2>
        </CCardHeader>
      </CCard>

      {/* SEARCH AND ACTIONS */}
      <CCard className="mb-4 shadow-lg border-0" style={{ borderRadius: '16px' }}>
        <CCardHeader className="py-3 border-bottom-0">
          <div className="d-flex justify-content-between align-items-center">
            <div className="d-flex bg-body-secondary align-items-center rounded-pill px-3 py-1" style={{ width: '400px' }}>
              <CIcon icon={cilSearch} className="text-muted me-2" />
              <CFormInput
                placeholder="Buscar por nombre o identificación..."
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
              ) : clientes.length === 0 ? (
                <CTableRow><CTableDataCell colSpan="4" className="text-center py-4 text-muted">No se encontraron registros</CTableDataCell></CTableRow>
              ) : clientes.map((c) => (
                <CTableRow key={c.id}>
                  <CTableDataCell className="fw-bold text-uppercase">{c.identificacion}</CTableDataCell>
                  <CTableDataCell>{c.nombre}</CTableDataCell>
                  <CTableDataCell>
                    <div className="small">{c.telefono || "-"}</div>
                    <div className="small text-muted">{c.email || "-"}</div>
                  </CTableDataCell>
                  <CTableDataCell className="text-end">
                    <CButton color="info" variant="ghost" size="sm" onClick={() => { setUpdateData(c); setModalVisible(true); }}>
                      <CIcon icon={cilPencil} />
                    </CButton>
                    <CButton color="danger" variant="ghost" size="sm" onClick={() => { setClienteToDelete(c.id); setModalDeleteVisible(true); }}>
                      <CIcon icon={cilTrash} />
                    </CButton>
                  </CTableDataCell>
                </CTableRow>
              ))}
            </CTableBody>
          </CTable>

          {/* PAGINACIÓN INTELIGENTE */}
          {!loading && totalPages > 1 && (
            <div className="d-flex justify-content-between align-items-center p-3 border-top">
              <div className="text-muted small">
                Página {currentPage} de {totalPages} ({totalRecords} movimientos)
              </div>
              <CPagination align="end" className="mb-0">
                <CPaginationItem 
                  disabled={currentPage === 1} 
                  onClick={() => setCurrentPage(prev => prev - 1)}
                  style={{ cursor: currentPage === 1 ? 'default' : 'pointer' }}
                >
                  <CIcon icon={cilChevronLeft} />
                </CPaginationItem>

                {(() => {
                  const pages = [];
                  const leftSide = Math.max(1, currentPage - 1);
                  const rightSide = Math.min(totalPages, currentPage + 1);

                  pages.push(
                    <CPaginationItem 
                      key={1} 
                      active={currentPage === 1} 
                      onClick={() => setCurrentPage(1)}
                      style={{ cursor: 'pointer' }}
                    >
                      1
                    </CPaginationItem>
                  );

                  if (leftSide > 2) {
                    pages.push(<CPaginationItem key="dots-left" disabled>...</CPaginationItem>);
                  }

                  for (let i = leftSide; i <= rightSide; i++) {
                    if (i !== 1 && i !== totalPages) {
                      pages.push(
                        <CPaginationItem 
                          key={i} 
                          active={currentPage === i} 
                          onClick={() => setCurrentPage(i)}
                          style={{ cursor: 'pointer' }}
                        >
                          {i}
                        </CPaginationItem>
                      );
                    }
                  }

                  if (rightSide < totalPages - 1) {
                    pages.push(<CPaginationItem key="dots-right" disabled>...</CPaginationItem>);
                  }

                  if (totalPages > 1) {
                    pages.push(
                      <CPaginationItem 
                        key={totalPages} 
                        active={currentPage === totalPages} 
                        onClick={() => setCurrentPage(totalPages)}
                        style={{ cursor: 'pointer' }}
                      >
                        {totalPages}
                      </CPaginationItem>
                    );
                  }

                  return pages;
                })()}

                <CPaginationItem 
                  disabled={currentPage === totalPages} 
                  onClick={() => setCurrentPage(prev => prev + 1)}
                  style={{ cursor: currentPage === totalPages ? 'default' : 'pointer' }}
                >
                  <CIcon icon={cilChevronRight} />
                </CPaginationItem>
              </CPagination>
            </div>
          )}
        </CCardBody>
      </CCard>

      {/* MODAL FORMULARIO */}
      <CModal visible={modalVisible} onClose={handleCancel} size="lg" alignment="center" backdrop="static">
        <CForm noValidate validated={validated} onSubmit={handleSubmit}>
          <CModalHeader className="bg-primary text-white">
            <CModalTitle>{updateData ? 'Editar Cliente' : 'Nuevo Cliente'}</CModalTitle>
          </CModalHeader>
          <CModalBody className="p-4">
            <CRow className="g-4">
              <CCol md={6}>
                <CFormLabel className="fw-bold small ms-1">Identificación *</CFormLabel>
                <CFormInput
                  name="identificacion"
                  value={formData.identificacion}
                  onChange={handleChange}
                  required
                  placeholder="Ej: V-12345678"
                  invalid={idError}
                />
                <CFormFeedback invalid>La identificación ya existe o es requerida.</CFormFeedback>
              </CCol>
              <CCol md={6}>
                <CFormLabel className="fw-bold small ms-1">Nombre Completo *</CFormLabel>
                <CFormInput name="nombre" value={formData.nombre} onChange={handleChange} required />
              </CCol>
              <CCol md={6}>
                <CFormLabel className="fw-bold small ms-1">Teléfono</CFormLabel>
                <CFormInput name="telefono" value={formData.telefono} onChange={handleChange} />
              </CCol>
              <CCol md={6}>
                <CFormLabel className="fw-bold small ms-1">Correo</CFormLabel>
                <CFormInput type="email" name="email" value={formData.email} onChange={handleChange} />
              </CCol>
              <CCol md={12}>
                <CFormLabel className="fw-bold small ms-1">Dirección</CFormLabel>
                <CFormInput name="direccion" value={formData.direccion} onChange={handleChange} />
              </CCol>
            </CRow>
          </CModalBody>
          <CModalFooter className="bg-body-secondary p-4">
            <CButton color="secondary" variant="ghost" onClick={handleCancel}>Cancelar</CButton>
            <CButton type="submit" color="primary" disabled={submitting}>Guardar</CButton>
          </CModalFooter>
        </CForm>
      </CModal>

      {/* MODAL ELIMINAR */}
      <CModal visible={modalDeleteVisible} onClose={() => setModalDeleteVisible(false)} alignment="center" backdrop="static">
        <CModalHeader className="bg-primary text-white border-0 py-3">
          <CModalTitle className="fw-bold text-white m-0 fs-5">Confirmar eliminación</CModalTitle>
        </CModalHeader>
        <CModalBody className="text-center p-4">
          <CIcon icon={cilTrash} size="xl" className="text-danger mb-2" />
          <h6 className="fw-bold">¿Eliminar este cliente?</h6>
          <p className="text-muted small">Esta acción no se puede revertir.</p>
        </CModalBody>
        <CModalFooter className="bg-body-secondary p-4">
          <CButton color="secondary" variant="ghost" onClick={() => setModalDeleteVisible(false)}>Cancelar</CButton>
          <CButton color="danger" className="text-white" onClick={confirmDelete}>Eliminar</CButton>
        </CModalFooter>
      </CModal>
    </CContainer>
  );
};

export default ClientesCoreUI;