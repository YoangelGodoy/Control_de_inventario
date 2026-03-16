import React, { useEffect, useState, useCallback } from 'react';
import {
  CForm, CFormInput, CButton, CCard, CCardBody, CCardHeader,
  CCol, CRow, CContainer, CTable, CTableHead, CTableRow,
  CTableHeaderCell, CTableBody, CTableDataCell,
  CModal, CModalHeader, CModalTitle, CModalBody, CModalFooter,
  CFormLabel, CFormFeedback, CSpinner, CPagination, CPaginationItem
} from '@coreui/react';
import { CIcon } from '@coreui/icons-react'; 
import { 
  cilPencil, cilPlus, cilSearch, cilTrash, cilTruck,
  cilChevronLeft, cilChevronRight 
} from '@coreui/icons'; 
import { createClient } from "../../../supabase/client"; 
import { toast } from "sonner";

const ProveedoresCoreUI = () => {
  const supabase = createClient();

  // Estados de datos
  const [proveedores, setProveedores] = useState([]);
  
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
  const [updateData, setUpdateData] = useState(null);
  const [proveedorToDelete, setProveedorToDelete] = useState(null); 
  const [submitting, setSubmitting] = useState(false);
  const [validated, setValidated] = useState(false);

  const initialFormState = { nombre: '', telefono: '', email: '', direccion: '' };
  const [formData, setFormData] = useState(initialFormState);

  // 1. Lógica de Debounce para búsqueda eficiente
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setCurrentPage(1); 
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // 2. Cargar Datos con Filtrado Remoto
  const fetchProveedores = useCallback(async () => {
    setLoading(true);
    try {
      const from = (currentPage - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      let query = supabase
        .from("proveedores")
        .select("*", { count: 'exact' });

      // Filtrado en el servidor mediante .or() e .ilike
      if (debouncedSearch) {
        query = query.or(`nombre.ilike.%${debouncedSearch}%,email.ilike.%${debouncedSearch}%`);
      }

      const { data, count, error } = await query
        .order("nombre", { ascending: true })
        .range(from, to);

      if (error) throw error;
      setProveedores(data || []);
      setTotalRecords(count || 0);
    } catch (error) {
      toast.error("Error al cargar proveedores: " + error.message);
    } finally {
      setLoading(false);
    }
  }, [supabase, currentPage, debouncedSearch]);

  useEffect(() => {
    fetchProveedores();
  }, [fetchProveedores]);

  // Sincronizar datos para edición
  useEffect(() => {
    if (updateData) {
      setFormData({
        nombre: updateData.nombre ?? '',
        telefono: updateData.telefono ?? '',
        email: updateData.email ?? '',
        direccion: updateData.direccion ?? ''
      });
    } else {
      setFormData(initialFormState);
    }
    setValidated(false);
  }, [updateData]);

  // Manejadores de eventos
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCancel = () => {
    setFormData(initialFormState);
    setUpdateData(null);
    setModalVisible(false);
    setValidated(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const form = e.currentTarget;
    setValidated(true);

    if (form.checkValidity() === false || !formData.nombre.trim()) {
      e.stopPropagation();
      return;
    }

    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const payload = {
        nombre: formData.nombre.trim(),
        telefono: formData.telefono.trim() || null,
        email: formData.email.trim().toLowerCase() || null,
        direccion: formData.direccion.trim() || null,
        user_id: user.id,
      };

      const { error } = updateData 
        ? await supabase.from("proveedores").update(payload).eq("id", updateData.id)
        : await supabase.from("proveedores").insert([payload]);

      if (error) throw error;
      
      toast.success(updateData ? "Proveedor actualizado" : "Proveedor registrado");
      fetchProveedores();
      handleCancel();
    } catch (error) {
      toast.error("Error en la operación: " + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    try {
      const { error } = await supabase.from("proveedores").delete().eq("id", proveedorToDelete);
      if (error) throw error;
      toast.success("Proveedor eliminado");
      fetchProveedores();
    } catch (error) {
      toast.error("Error al eliminar");
    } finally {
      setModalDeleteVisible(false);
      setProveedorToDelete(null);
    }
  };

  const totalPages = Math.ceil(totalRecords / PAGE_SIZE);

  return (
    <CContainer>
      {/* Cabecera Estilo Card */}
      <CCard className="mb-4 shadow-lg border-0 overflow-hidden w-100" style={{ borderRadius: '16px' }}>
        <CCardHeader className="bg-primary text-white py-3">
          <h2 className="fw-bold text-white d-flex align-items-center m-0 fs-4 text-uppercase">
            <CIcon icon={cilTruck} className="me-2 " />
            Gestión de Proveedores
          </h2>
        </CCardHeader>
      </CCard>
      
      {/* Tabla y Filtros */}
      <CCard className="mb-4 shadow-lg border-0" style={{ borderRadius: '16px' }}>
        <CCardHeader className="py-3 border-bottom-0">
          <div className="d-flex justify-content-between align-items-center gap-3 flex-wrap">
            <div className="d-flex bg-body-secondary align-items-center rounded-pill px-3 py-1" style={{ minWidth: '350px' }}>
              <CIcon icon={cilSearch} className="text-muted me-2" />
              <CFormInput
                placeholder="Buscar nombre o correo..."
                className="border-0 bg-transparent shadow-none"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <CButton 
              color="success" 
              className="text-white rounded-pill px-4 fw-bold" 
              onClick={() => { setUpdateData(null); setModalVisible(true); }}
            >
              <CIcon icon={cilPlus} className="me-2"/> Nuevo Proveedor
            </CButton>
          </div>
        </CCardHeader>

        <CCardBody className="px-4">
          <CTable hover responsive align="middle" className="mb-0">
            <CTableHead>
              <CTableRow>
                <CTableHeaderCell className="text-muted small text-uppercase">Nombre / Razón Social</CTableHeaderCell>
                <CTableHeaderCell className="text-muted small text-uppercase">Contacto</CTableHeaderCell>
                <CTableHeaderCell className="text-muted small text-uppercase">Ubicación</CTableHeaderCell>
                <CTableHeaderCell className="text-end text-muted small text-uppercase">Acciones</CTableHeaderCell>
              </CTableRow>
            </CTableHead>
            <CTableBody>
              {loading ? (
                <CTableRow><CTableDataCell colSpan="4" className="text-center py-5"><CSpinner color="primary" /></CTableDataCell></CTableRow>
              ) : proveedores.length === 0 ? (
                <CTableRow><CTableDataCell colSpan="4" className="text-center py-4 text-muted">No se encontraron registros</CTableDataCell></CTableRow>
              ) : proveedores.map((prov) => (
                <CTableRow key={prov.id}>
                  <CTableDataCell>
                    <div className="fw-bold text-uppercase small text-body">{prov.nombre}</div>
                    <div className="small text-muted">{prov.email ?? "Sin email"}</div>
                  </CTableDataCell>
                  <CTableDataCell className="small">{prov.telefono ?? "N/A"}</CTableDataCell>
                  <CTableDataCell className="small text-muted text-truncate" style={{ maxWidth: '200px' }}>
                    {prov.direccion ?? "N/A"}
                  </CTableDataCell>
                  <CTableDataCell className="text-end">
                    <CButton color="info" variant="ghost" size="sm" className="rounded-pill" onClick={() => { setUpdateData(prov); setModalVisible(true) }}>
                      <CIcon icon={cilPencil} />
                    </CButton>
                    <CButton color="danger" variant="ghost" size="sm" className="rounded-pill ms-2" onClick={() => { setProveedorToDelete(prov.id); setModalDeleteVisible(true) }}>
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

      {/* Modal Formulario */}
      <CModal visible={modalVisible} onClose={handleCancel} size="lg" alignment="center" backdrop="static">
        <CForm noValidate validated={validated} onSubmit={handleSubmit}>
          <CModalHeader className="bg-primary text-white border-0 py-3">
            <CModalTitle className="fw-bold text-white m-0 fs-5">
              {updateData ? 'Actualizar Proveedor' : 'Registrar Nuevo Proveedor'}
            </CModalTitle>
          </CModalHeader>
          <CModalBody className="p-4">
            <CRow className="g-4">
              <CCol md={6}>
                <CFormLabel className="fw-bold text-muted small mb-2">Nombre o Razón Social *</CFormLabel>
                <CFormInput
                  name="nombre"
                  value={formData.nombre}
                  onChange={handleChange}
                  placeholder="Ej: Repuestos El Sol C.A."
                  required
                  className="py-2 border-secondary-subtle"
                  style={{ borderRadius: '10px' }}
                />
              </CCol>
              <CCol md={6}>
                <CFormLabel className="fw-bold text-muted small mb-2">Teléfono de contacto</CFormLabel>
                <CFormInput
                  name="telefono"
                  value={formData.telefono}
                  onChange={handleChange}
                  placeholder="+58 414..."
                  className="py-2 border-secondary-subtle"
                  style={{ borderRadius: '10px' }}
                />
              </CCol>
              <CCol md={12}>
                <CFormLabel className="fw-bold text-muted small mb-2">Correo Electrónico</CFormLabel>
                <CFormInput
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="contacto@proveedor.com"
                  className="py-2 border-secondary-subtle"
                  style={{ borderRadius: '10px' }}
                />
              </CCol>
              <CCol md={12}>
                <CFormLabel className="fw-bold text-muted small mb-2">Dirección Fiscal / Oficina</CFormLabel>
                <CFormInput
                  name="direccion"
                  value={formData.direccion}
                  onChange={handleChange}
                  placeholder="Av. Principal, Edificio X, Piso 1"
                  className="py-2 border-secondary-subtle"
                  style={{ borderRadius: '10px' }}
                />
              </CCol>
            </CRow>
          </CModalBody>
          <CModalFooter className="border-0 p-4 pt-0 d-flex gap-3 bg-body-secondary mt-3">
            <CButton color="secondary" variant="ghost" className="flex-grow-1 fw-bold" onClick={handleCancel}>Cancelar</CButton>
            <CButton type="submit" color="primary" className="flex-grow-1 text-white fw-bold shadow-sm" disabled={submitting}>
              {submitting ? <CSpinner size="sm" /> : 'Guardar Datos'}
            </CButton>
          </CModalFooter>
        </CForm>
      </CModal>

      {/* Modal Eliminar */}
      <CModal visible={modalDeleteVisible} onClose={() => setModalDeleteVisible(false)} alignment="center">
        <CModalHeader className="bg-danger text-white border-0 py-3">
          <CModalTitle className="fw-bold m-0 fs-5">Confirmar Eliminación</CModalTitle>
        </CModalHeader>
        <CModalBody className="text-center p-4">
          <CIcon icon={cilTrash} size="xl" className="text-danger mb-3" />
          <h6 className="fw-bold">¿Deseas eliminar este proveedor?</h6>
          <p className="text-muted small">Esta acción no se puede deshacer y afectará los registros asociados.</p>
        </CModalBody>
        <CModalFooter className="border-0 p-4 pt-0 d-flex gap-3 bg-body-secondary">
          <CButton color="secondary" variant="ghost" className="flex-grow-1 fw-bold" onClick={() => setModalDeleteVisible(false)}>Cancelar</CButton>
          <CButton color="danger" className="flex-grow-1 text-white fw-bold shadow-sm" onClick={confirmDelete}>Eliminar</CButton>
        </CModalFooter>
      </CModal>
    </CContainer>
  );
};

export default ProveedoresCoreUI;