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
  
  // Estados de Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const PAGE_SIZE = 8; 

  // Estados de UI
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalDeleteVisible, setModalDeleteVisible] = useState(false);
  const [updateData, setUpdateData] = useState(null);
  const [proveedorToDelete, setProveedorToDelete] = useState(null); 
  const [submitting, setSubmitting] = useState(false);
  const [validated, setValidated] = useState(false);

  const initialFormState = { nombre: '', telefono: '', email: '', direccion: '' };
  const [formData, setFormData] = useState(initialFormState);

  // 1. Cargar Datos con Paginación (Server-side)
  const fetchProveedores = useCallback(async () => {
    setLoading(true);
    try {
      const from = (currentPage - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const { data, count, error } = await supabase
        .from("proveedores")
        .select("*", { count: 'exact' })
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
  }, [supabase, currentPage]);

  useEffect(() => {
    fetchProveedores();
  }, [fetchProveedores]);

  // Resetear a página 1 cuando se busca
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

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
      
      toast.success(updateData ? "Actualizado correctamente" : "Proveedor registrado");
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

  // Filtrado local (para la página actual)
  const filteredProveedores = proveedores.filter(prov => {
    const searchLower = searchTerm.toLowerCase();
    return prov.nombre?.toLowerCase().includes(searchLower) || 
           prov.email?.toLowerCase().includes(searchLower);
  });

  const totalPages = Math.ceil(totalRecords / PAGE_SIZE);

  return (
    <CContainer>
      {/* Cabecera */}
      <CCard className="mb-4 shadow-lg border-0 overflow-hidden w-100" style={{ borderRadius: '16px' }}>
        <CCardHeader className="bg-primary text-white py-3">
          <h2 className="fw-bold text-white d-flex align-items-center m-0 fs-4 text-uppercase">
            <CIcon icon={cilTruck} className="me-2 " />
            Directorio de Proveedores
          </h2>
        </CCardHeader>
      </CCard>
      
      <CCard className="mb-4 shadow-lg border-0" style={{ borderRadius: '16px' }}>
        <CCardHeader className="py-3 border-bottom-0">
          <div className="d-flex justify-content-between align-items-center">
            <div className="d-flex align-items-center rounded-pill px-3 py-1" style={{ width: '400px' }}>
              <CIcon icon={cilSearch} className="text-muted me-2" />
              <CFormInput
                placeholder="Buscar por nombre o correo..."
                className="border-0 bg-transparent shadow-none"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <CButton 
              color="success" 
              className="text-white rounded-pill px-4" 
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
                <CTableHeaderCell className="text-muted small text-uppercase">Nombre / Empresa</CTableHeaderCell>
                <CTableHeaderCell className="text-muted small text-uppercase">Contacto</CTableHeaderCell>
                <CTableHeaderCell className="text-muted small text-uppercase">Dirección</CTableHeaderCell>
                <CTableHeaderCell className="text-end text-muted small text-uppercase">Acciones</CTableHeaderCell>
              </CTableRow>
            </CTableHead>
            <CTableBody>
              {loading ? (
                <CTableRow><CTableDataCell colSpan="4" className="text-center py-5"><CSpinner color="primary" /></CTableDataCell></CTableRow>
              ) : filteredProveedores.length === 0 ? (
                <CTableRow><CTableDataCell colSpan="4" className="text-center py-4 text-muted">No se encontraron proveedores</CTableDataCell></CTableRow>
              ) : filteredProveedores.map((prov) => (
                <CTableRow key={prov.id}>
                  <CTableDataCell>
                    <div className="fw-bold text-dark text-uppercase small">{prov.nombre}</div>
                    <div className="small text-muted">{prov.email ?? "Sin correo registrado"}</div>
                  </CTableDataCell>
                  <CTableDataCell className="small">{prov.telefono ?? "-"}</CTableDataCell>
                  <CTableDataCell className="small text-muted">{prov.direccion ?? "-"}</CTableDataCell>
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

          {/* PAGINACIÓN */}
          {!loading && totalPages > 1 && (
            <div className="d-flex justify-content-between align-items-center mt-4">
              <div className="text-muted small">
                Mostrando {proveedores.length} de {totalRecords} registros
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
        <CForm noValidate validated={validated} onSubmit={handleSubmit} className="overflow-visible">
          <CModalHeader className="bg-primary text-white border-0 py-3">
            <CModalTitle className="fw-bold text-white m-0 fs-5">
              {updateData ? 'Editar Proveedor' : 'Nuevo Proveedor'}
            </CModalTitle>
          </CModalHeader>

          <CModalBody className="p-4">
              <CRow className="g-4">
                <CCol md={6}>
                  <CFormLabel className="fw-bold text-muted small mb-2 ms-1">Nombre o Razón Social *</CFormLabel>
                  <CFormInput
                    name="nombre"
                    value={formData.nombre}
                    onChange={handleChange}
                    placeholder="Ej: Distribuidora Polar"
                    required
                    className="border shadow-sm py-2 px-3"
                    style={{ borderRadius: '12px' }}
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
                    placeholder="Ej: +58 412..."
                    className="border shadow-sm py-2 px-3"
                    style={{ borderRadius: '12px' }}
                  />
                </CCol>
                <CCol md={12}>
                  <CFormLabel className="fw-bold text-muted small mb-2 ms-1">Correo Electrónico</CFormLabel>
                  <CFormInput
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="proveedor@empresa.com"
                    className="border shadow-sm py-2 px-3"
                    style={{ borderRadius: '12px' }}
                  />
                </CCol>
                <CCol md={12}>
                  <CFormLabel className="fw-bold text-muted small mb-2 ms-1">Dirección</CFormLabel>
                  <CFormInput
                    name="direccion"
                    value={formData.direccion}
                    onChange={handleChange}
                    placeholder="Calle, Ciudad..."
                    className="border shadow-sm py-2 px-3"
                    style={{ borderRadius: '12px' }}
                  />
                </CCol>
              </CRow>
          </CModalBody>

          <CModalFooter className="border-0 p-4 pt-0 d-flex gap-3 bg-light">
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
          <h6 className="fw-bold mb-1">¿Eliminar proveedor?</h6>
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

export default ProveedoresCoreUI;