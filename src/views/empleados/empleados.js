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

  // 1. Cargar Datos con Paginación
  const fetchEmpleados = useCallback(async () => {
    setLoading(true);
    try {
      const from = (currentPage - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const { data, count, error } = await supabase
        .from("empleados")
        .select("*", { count: 'exact' })
        .order("created_at", { ascending: false })
        .range(from, to);

      if (error) throw error;
      setEmpleados(data || []);
      setTotalRecords(count || 0);
    } catch (error) {
      toast.error("Error al cargar empleados: " + error.message);
    } finally {
      setLoading(false);
    }
  }, [supabase, currentPage]);

  useEffect(() => {
    fetchEmpleados();
  }, [fetchEmpleados]);

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

      // Verificar duplicados solo si es nuevo
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

      if (updateData) {
        const { error: err } = await supabase
          .from("empleados")
          .update(payload)
          .eq("id", updateData.id);
        if (err) throw err;
        toast.success("Empleado actualizado");
      } else {
        const { error: err } = await supabase.from("empleados").insert([payload]);
        if (err) throw err;
        toast.success("Empleado registrado con éxito");
        setCurrentPage(1);
      }

      handleCancel();
      fetchEmpleados();
    } catch (error) {
      toast.error("Error: " + (error.message || "Error desconocido"));
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    if (!empleadoToDelete) return;
    try {
      const { error } = await supabase.from("empleados").delete().eq("id", empleadoToDelete);
      if (error) throw error;
      toast.success("Empleado eliminado");
      fetchEmpleados();
    } catch (error) {
      toast.error("Error al eliminar: Es posible que el empleado tenga registros asociados.");
    } finally {
      setModalDeleteVisible(false);
      setEmpleadoToDelete(null);
    }
  };

  const filteredEmpleados = empleados.filter(e => 
    e.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.identificacion?.includes(searchTerm)
  );

  const totalPages = Math.ceil(totalRecords / PAGE_SIZE);

  return (
    <CContainer> 
      <CCard className="mb-4 shadow-lg border-0 overflow-hidden w-100" style={{ borderRadius: '16px' }}>
        <CCardHeader className="bg-primary text-white py-3">
          <h2 className="fw-bold text-white d-flex align-items-center m-0 fs-4 text-uppercase">
            <CIcon icon={cilAddressBook} className="me-2 " />
            Gestión de Empleados / Vendedores
          </h2>
        </CCardHeader>
      </CCard>

      <CCard className="mb-4 shadow-lg border-0" style={{ borderRadius: '16px' }}>
        <CCardHeader className="py-3 border-bottom-0">
          <div className="d-flex justify-content-between align-items-center">
            <div className="d-flex bg-body-secondary align-items-center rounded-pill px-3 py-1" style={{ width: '400px' }}>
              <CIcon icon={cilSearch} className="text-muted me-2" />
              <CFormInput
                placeholder="Buscar vendedor..."
                className="border-0 bg-transparent shadow-none"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <CButton color="success" className="text-white rounded-pill px-4" onClick={() => { setUpdateData(null); setModalVisible(true); }}>
              <CIcon icon={cilPlus} className="me-2" /> Nuevo Empleado
            </CButton>
          </div>
        </CCardHeader>
        <CCardBody className="px-4">
          <CTable hover responsive align="middle" className="mb-0">
            <CTableHead>
              <CTableRow>
                <CTableHeaderCell className="text-muted small text-uppercase">ID / Cédula</CTableHeaderCell>
                <CTableHeaderCell className="text-muted small text-uppercase">Nombre</CTableHeaderCell>
                <CTableHeaderCell className="text-muted small text-uppercase">Estado</CTableHeaderCell>
                <CTableHeaderCell className="text-end text-muted small text-uppercase">Acciones</CTableHeaderCell>
              </CTableRow>
            </CTableHead>
            <CTableBody>
              {loading ? (
                <CTableRow><CTableDataCell colSpan="4" className="text-center py-5"><CSpinner color="primary" /></CTableDataCell></CTableRow>
              ) : filteredEmpleados.length === 0 ? (
                <CTableRow><CTableDataCell colSpan="4" className="text-center py-4 text-muted">No hay empleados registrados</CTableDataCell></CTableRow>
              ) : filteredEmpleados.map((e) => (
                <CTableRow key={e.id}>
                  <CTableDataCell className="fw-bold text-uppercase">{e.identificacion}</CTableDataCell>
                  <CTableDataCell>
                    <div>{e.nombre}</div>
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

          {!loading && totalPages > 1 && (
            <div className="d-flex justify-content-between align-items-center mt-4">
              <div className="text-muted small">Mostrando {empleados.length} empleados</div>
              <CPagination align="end" className="mb-0">
                <CPaginationItem disabled={currentPage === 1} onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}>
                  <CIcon icon={cilChevronLeft} />
                </CPaginationItem>
                {[...Array(totalPages)].map((_, i) => (
                  <CPaginationItem key={i + 1} active={currentPage === i + 1} onClick={() => setCurrentPage(i + 1)}>
                    {i + 1}
                  </CPaginationItem>
                ))}
                <CPaginationItem disabled={currentPage === totalPages} onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}>
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
              {updateData ? 'Editar Empleado' : 'Nuevo Empleado'}
            </CModalTitle>
          </CModalHeader>
          <CModalBody className="p-4">
              <CRow className="g-4">
                <CCol md={6}>
                  <CFormLabel className="fw-bold text-muted small mb-2">Identificación *</CFormLabel>
                  <CFormInput
                    name="identificacion"
                    value={formData.identificacion}
                    onChange={handleChange}
                    required
                    disabled={!!updateData}
                    placeholder="V-20123456"
                    className="border shadow-sm py-2 px-3"
                    style={{ borderRadius: '12px' }}
                    invalid={idError}
                  />
                  <CFormFeedback invalid>La identificación es obligatoria o ya existe.</CFormFeedback>
                </CCol>
                <CCol md={6}>
                  <CFormLabel className="fw-bold text-muted small mb-2">Nombre Completo *</CFormLabel>
                  <CFormInput
                    name="nombre"
                    value={formData.nombre}
                    onChange={handleChange}
                    required
                    placeholder="Nombre del Vendedor"
                    className="border shadow-sm py-2 px-3"
                    style={{ borderRadius: '12px' }}
                  />
                  <CFormFeedback invalid>El nombre es obligatorio.</CFormFeedback>
                </CCol>
                <CCol md={6}>
                  <CFormLabel className="fw-bold text-muted small mb-2">Teléfono</CFormLabel>
                  <CFormInput
                    name="telefono"
                    value={formData.telefono}
                    onChange={handleChange}
                    placeholder="0412-1234567"
                    className="border shadow-sm py-2 px-3"
                    style={{ borderRadius: '12px' }}
                  />
                </CCol>
              </CRow>
          </CModalBody>
          <CModalFooter className="border-0 p-4 pt-2 d-flex gap-3 bg-body-secondary">
            <CButton type="button" color="secondary" variant="ghost" className="flex-grow-1 py-2 fw-bold" onClick={handleCancel}>
              Cancelar
            </CButton>
            <CButton type="submit" color="primary" className="flex-grow-1 py-2 fw-bold text-white" disabled={submitting}>
              {submitting ? <CSpinner size="sm" /> : 'Guardar Empleado'}
            </CButton>
          </CModalFooter>
        </CForm>
      </CModal>

      {/* MODAL ELIMINAR */}
      <CModal visible={modalDeleteVisible} onClose={() => setModalDeleteVisible(false)} alignment="center">
        <CModalHeader className="bg-primary text-white border-0 py-3">
          <CModalTitle className="fw-bold text-white m-0 fs-5">Confirmar eliminación</CModalTitle>
        </CModalHeader>
        <CModalBody className="text-center p-4">
          <CIcon icon={cilTrash} size="xl" className="text-danger mb-2" />
          <h6 className="fw-bold mb-1">¿Eliminar empleado?</h6>
          <p className="text-muted small mb-0">Esta acción no se puede deshacer.</p>
        </CModalBody>
        <CModalFooter className="border-0 p-4 pt-0 d-flex gap-3 bg-body-secondary">
          <CButton color="secondary" variant="ghost" className="flex-grow-1 py-2 fw-bold" onClick={() => setModalDeleteVisible(false)}>
            Cancelar
          </CButton>
          <CButton color="danger" className="flex-grow-1 py-2 fw-bold text-white" onClick={confirmDelete}>
            Eliminar
          </CButton>
        </CModalFooter>
      </CModal>
    </CContainer>
  );
};

export default Empleados;