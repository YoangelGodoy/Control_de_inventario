import React, { useEffect, useState, useCallback } from 'react';
import {
  CForm, CFormInput, CButton, CCard, CCardBody, CCardHeader,
  CCol, CRow, CContainer, CTable, CTableHead, CTableRow,
  CTableHeaderCell, CTableBody, CTableDataCell,
  CModal, CModalHeader, CModalTitle, CModalBody, CModalFooter,
  CFormLabel, CSpinner, CPagination, CPaginationItem,
  CFormFeedback, CBadge
} from '@coreui/react';
import { CIcon } from '@coreui/icons-react';
import { 
  cilPlus, cilSearch, cilChevronLeft, cilChevronRight, 
  cilPencil, cilTrash, 
  cilAddressBook
} from '@coreui/icons';
import { createClient } from "../../../supabase/client"; 
import { toast } from "sonner";

const Empleados = () => {
  const supabase = createClient();

  // Estados de datos
  const [empleados, setEmpleados] = useState([]);
  
  // Estados de Búsqueda y Paginación (Server-side)
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
  const [empleadoToDelete, setEmpleadoToDelete] = useState(null);
  const [validated, setValidated] = useState(false); 
  const [idError, setIdError] = useState(false);

  const initialFormState = { 
    identificacion: '', 
    nombre: '', 
    telefono: '', 
    activo: true
  };
  const [formData, setFormData] = useState(initialFormState);

  // 1. Lógica de Debounce: Espera 500ms antes de disparar la búsqueda
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setCurrentPage(1); // Reiniciar a pág 1 al buscar
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // 2. Cargar Datos con Filtrado desde Supabase
  const fetchEmpleados = useCallback(async () => {
    setLoading(true);
    try {
      const from = (currentPage - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      let query = supabase
        .from("empleados")
        .select("*", { count: 'exact' });

      // Aplicar filtro si existe término de búsqueda
      if (debouncedSearch) {
        query = query.or(`nombre.ilike.%${debouncedSearch}%,identificacion.ilike.%${debouncedSearch}%`);
      }

      const { data, count, error } = await query
        .order("nombre", { ascending: true })
        .range(from, to);

      if (error) throw error;
      setEmpleados(data || []);
      setTotalRecords(count || 0);
    } catch (error) {
      toast.error("Error al cargar empleados: " + error.message);
    } finally {
      setLoading(false);
    }
  }, [supabase, currentPage, debouncedSearch]);

  useEffect(() => {
    fetchEmpleados();
  }, [fetchEmpleados]);

  // Sincronizar formulario para edición
  useEffect(() => {
    if (updateData) {
      setFormData({
        identificacion: updateData.identificacion || '',
        nombre: updateData.nombre || '',
        telefono: updateData.telefono || '',
        activo: updateData.activo ?? true
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
      const idLimpia = formData.identificacion.trim().toUpperCase();

      if (!updateData) {
        const { data: existing } = await supabase
          .from("empleados")
          .select("identificacion")
          .eq("identificacion", idLimpia)
          .maybeSingle();

        if (existing) {
          setIdError(true);
          toast.error("Ya existe un empleado con esta identificación");
          setSubmitting(false);
          return;
        }
      }

      const payload = { 
        identificacion: idLimpia,
        nombre: formData.nombre.trim(),
        telefono: formData.telefono.trim(),
        activo: formData.activo
      };

      const { error: err } = updateData 
        ? await supabase.from("empleados").update(payload).eq("id", updateData.id)
        : await supabase.from("empleados").insert([payload]);

      if (err) throw err;
      
      toast.success(updateData ? "Empleado actualizado" : "Empleado registrado");
      handleCancel();
      fetchEmpleados();
    } catch (error) {
      toast.error("Error: " + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    try {
      const { error } = await supabase.from("empleados").delete().eq("id", empleadoToDelete);
      if (error) throw error;
      toast.success("Empleado eliminado");
      fetchEmpleados();
    } catch (error) {
      toast.error("No se pudo eliminar: El empleado tiene registros vinculados.");
    } finally {
      setModalDeleteVisible(false);
      setEmpleadoToDelete(null);
    }
  };

  const totalPages = Math.ceil(totalRecords / PAGE_SIZE);

  return (
    <CContainer> 
      <CCard className="mb-4 shadow-lg border-0 overflow-hidden w-100" style={{ borderRadius: '16px' }}>
        <CCardHeader className="bg-primary text-white py-3">
          <h2 className="fw-bold text-white d-flex align-items-center m-0 fs-4 text-uppercase">
            <CIcon icon={cilAddressBook} className="me-2 " />
            Gestión de Personal
          </h2>
        </CCardHeader>
      </CCard>

      <CCard className="mb-4 shadow-lg border-0" style={{ borderRadius: '16px' }}>
        <CCardHeader className="py-3 border-bottom-0">
          <div className="d-flex justify-content-between align-items-center flex-wrap gap-3">
            <div className="d-flex bg-body-secondary align-items-center rounded-pill px-3 py-1" style={{ minWidth: '350px' }}>
              <CIcon icon={cilSearch} className="text-muted me-2" />
              <CFormInput
                placeholder="Buscar por nombre o identificación..."
                className="border-0 bg-transparent shadow-none"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <CButton color="success" className="text-white rounded-pill px-4 fw-bold" onClick={() => { setUpdateData(null); setModalVisible(true); }}>
              <CIcon icon={cilPlus} className="me-2" /> Nuevo Empleado
            </CButton>
          </div>
        </CCardHeader>
        <CCardBody className="px-4">
          <CTable hover responsive align="middle" className="mb-0">
            <CTableHead>
              <CTableRow>
                <CTableHeaderCell className="text-muted small text-uppercase">ID / Cédula</CTableHeaderCell>
                <CTableHeaderCell className="text-muted small text-uppercase">Nombre Completo</CTableHeaderCell>
                <CTableHeaderCell className="text-muted small text-uppercase">Estado</CTableHeaderCell>
                <CTableHeaderCell className="text-end text-muted small text-uppercase">Acciones</CTableHeaderCell>
              </CTableRow>
            </CTableHead>
            <CTableBody>
              {loading ? (
                <CTableRow><CTableDataCell colSpan="4" className="text-center py-5"><CSpinner color="primary" /></CTableDataCell></CTableRow>
              ) : empleados.length === 0 ? (
                <CTableRow><CTableDataCell colSpan="4" className="text-center py-4 text-muted">No se encontraron empleados</CTableDataCell></CTableRow>
              ) : empleados.map((e) => (
                <CTableRow key={e.id}>
                  <CTableDataCell className="fw-bold text-uppercase small">{e.identificacion}</CTableDataCell>
                  <CTableDataCell>
                    <div className="small fw-semibold">{e.nombre}</div>
                    <div className="small text-muted">{e.telefono || "Sin teléfono"}</div>
                  </CTableDataCell>
                  <CTableDataCell>
                    <CBadge color={e.activo ? 'success' : 'danger'} shape="pill">
                      {e.activo ? 'Activo' : 'Inactivo'}
                    </CBadge>
                  </CTableDataCell>
                  <CTableDataCell className="text-end">
                    <CButton color="info" variant="ghost" size="sm" className="rounded-pill" onClick={() => { setUpdateData(e); setModalVisible(true); }}>
                      <CIcon icon={cilPencil} />
                    </CButton>
                    <CButton color="danger" variant="ghost" size="sm" className="rounded-pill ms-2" onClick={() => { setEmpleadoToDelete(e.id); setModalDeleteVisible(true); }}>
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
          <CModalHeader className="bg-primary text-white border-0 py-3">
            <CModalTitle className="fw-bold text-white m-0 fs-5">
              {updateData ? 'Actualizar Información' : 'Registrar Nuevo Empleado'}
            </CModalTitle>
          </CModalHeader>
          <CModalBody className="p-4">
              <CRow className="g-4">
                <CCol md={6}>
                  <CFormLabel className="fw-bold text-muted small mb-2">Cédula / Identificación *</CFormLabel>
                  <CFormInput
                    name="identificacion"
                    value={formData.identificacion}
                    onChange={handleChange}
                    required
                    disabled={!!updateData}
                    placeholder="V-20.123.456"
                    className="py-2 px-3"
                    style={{ borderRadius: '10px' }}
                    invalid={idError}
                  />
                  <CFormFeedback invalid>La identificación es requerida o ya está registrada.</CFormFeedback>
                </CCol>
                <CCol md={6}>
                  <CFormLabel className="fw-bold text-muted small mb-2">Nombre y Apellido *</CFormLabel>
                  <CFormInput
                    name="nombre"
                    value={formData.nombre}
                    onChange={handleChange}
                    required
                    placeholder="Ej: Juan Pérez"
                    className="py-2 px-3"
                    style={{ borderRadius: '10px' }}
                  />
                  <CFormFeedback invalid>Debe ingresar el nombre.</CFormFeedback>
                </CCol>
                <CCol md={6}>
                  <CFormLabel className="fw-bold text-muted small mb-2">Teléfono</CFormLabel>
                  <CFormInput
                    name="telefono"
                    value={formData.telefono}
                    onChange={handleChange}
                    placeholder="0414-0000000"
                    className="py-2 px-3"
                    style={{ borderRadius: '10px' }}
                  />
                </CCol>
                <CCol md={6} className="d-flex align-items-end pb-2">
                   <div className="form-check form-switch custom-switch">
                      <input 
                        className="form-check-input" 
                        type="checkbox" 
                        role="switch" 
                        name="activo"
                        id="switchActivo"
                        checked={formData.activo}
                        onChange={handleChange}
                      />
                      <label className="form-check-label fw-bold text-muted small ms-2" htmlFor="switchActivo">
                        Vendedor Activo
                      </label>
                    </div>
                </CCol>
              </CRow>
          </CModalBody>
          <CModalFooter className="border-0 p-4 pt-0 d-flex gap-3 bg-body-secondary mt-3">
            <CButton type="button" color="secondary" variant="ghost" className="flex-grow-1 fw-bold" onClick={handleCancel}>
              Cancelar
            </CButton>
            <CButton type="submit" color="primary" className="flex-grow-1 text-white fw-bold shadow-sm" disabled={submitting}>
              {submitting ? <CSpinner size="sm" /> : 'Guardar Datos'}
            </CButton>
          </CModalFooter>
        </CForm>
      </CModal>

      {/* MODAL ELIMINAR */}
      <CModal visible={modalDeleteVisible} onClose={() => setModalDeleteVisible(false)} alignment="center">
        <CModalHeader className="bg-danger text-white border-0 py-3">
          <CModalTitle className="fw-bold m-0 fs-5">Confirmar Eliminación</CModalTitle>
        </CModalHeader>
        <CModalBody className="text-center p-4">
          <CIcon icon={cilTrash} size="xl" className="text-danger mb-3" />
          <h6 className="fw-bold">¿Realmente desea eliminar a este empleado?</h6>
          <p className="text-muted small">Esta acción no se puede revertir.</p>
        </CModalBody>
        <CModalFooter className="border-0 p-4 pt-0 d-flex gap-3 bg-body-secondary">
          <CButton color="secondary" variant="ghost" className="flex-grow-1 fw-bold" onClick={() => setModalDeleteVisible(false)}>
            Cancelar
          </CButton>
          <CButton color="danger" className="flex-grow-1 text-white fw-bold" onClick={confirmDelete}>
            Confirmar
          </CButton>
        </CModalFooter>
      </CModal>
    </CContainer>
  );
};

export default Empleados;