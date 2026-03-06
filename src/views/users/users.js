import React, { useEffect, useState, useCallback } from 'react';
import {
  CForm, CFormInput, CFormSelect, CButton, CCard, CCardBody, CCardHeader,
  CCol, CRow, CContainer, CTable, CTableHead, CTableRow, CTableHeaderCell,
  CTableBody, CTableDataCell, CSpinner, CModal, CModalHeader, CModalTitle,
  CModalBody, CModalFooter, CFormLabel, CFormFeedback,
  CPagination, CPaginationItem // <-- NUEVAS IMPORTACIONES
} from '@coreui/react';

import { CIcon } from '@coreui/icons-react'; 
import { cilPencil, cilSearch, cilLockLocked, cilPeople, cilChevronLeft, cilChevronRight } from '@coreui/icons'; 
import { createClient } from "../../../supabase/client";
import { toast } from "sonner";

const AUsers = () => {
  const supabase = createClient();

  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  // --- ESTADOS DE PAGINACIÓN ---
  const [currentPage, setCurrentPage] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const PAGE_SIZE = 10;

  const [modalVisible, setModalVisible] = useState(false);
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  const [updateData, setUpdateData] = useState(null);
  const [validated, setValidated] = useState(false);

  const initialFormState = {
    name: '',
    lastname: '',
    email: '',
    phone: '',
    rol_id: '7',
    cedula: ''
  };

  const [formData, setFormData] = useState(initialFormState);

  // 🔐 Verificar acceso
  const verifyAccess = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const { data: profile } = await supabase
        .from('usuarios_perfiles')
        .select('rol_id')
        .eq('id_user', user.id)
        .single();

      return Number(profile?.rol_id) === 6;
    } catch {
      return false;
    }
  }, [supabase]);

  // 📥 Cargar usuarios con Paginación
  const fetchUsers = useCallback(async () => {
    setLoading(true);

    const access = await verifyAccess();
    if (!access) {
      setIsAdmin(false);
      setLoading(false);
      return;
    }
    setIsAdmin(true);

    const from = (currentPage - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    try {
      let query = supabase
        .from("usuarios_perfiles")
        .select("*", { count: 'exact' });

      // Filtrado por servidor si hay término de búsqueda
      if (searchTerm) {
        query = query.or(`name.ilike.%${searchTerm}%,lastname.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,cedula.ilike.%${searchTerm}%`);
      }

      const { data, count, error } = await query
        .order("rol_id", { ascending: true })
        .range(from, to);

      if (error) throw error;

      setUsers(data || []);
      setTotalRecords(count || 0);
    } catch (error) {
      toast.error("Error al cargar usuarios", { description: error.message });
    } finally {
      setLoading(false);
    }
  }, [supabase, verifyAccess, currentPage, searchTerm]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Resetear a página 1 al buscar
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  // --- Lógica de Edición y Modal (Sin cambios significativos) ---
  useEffect(() => {
    if (updateData) {
      setFormData({
        name: updateData.name ?? '',
        lastname: updateData.lastname ?? '',
        email: updateData.email ?? '',
        phone: updateData.phone ?? '',
        rol_id: updateData.rol_id?.toString() ?? '7',
        cedula: updateData.cedula ?? ''
      });
    } else {
      setFormData(initialFormState);
    }
  }, [updateData]);

  const confirmSave = async () => {
    if (!updateData) return;
    setConfirmModalVisible(false);
    setLoading(true);

    const { error } = await supabase
      .from("usuarios_perfiles")
      .update({
        name: formData.name.trim(),
        lastname: formData.lastname.trim(),
        phone: formData.phone.trim() || null,
        rol_id: parseInt(formData.rol_id)
      })
      .eq('id_user', updateData.id_user);

    if (error) {
      toast.error("Error al actualizar", { description: error.message });
    } else {
      toast.success("Usuario actualizado exitosamente");
      fetchUsers();
      handleCancel();
    }
    setLoading(false);
  };

  const handleCancel = () => {
    setModalVisible(false);
    setConfirmModalVisible(false);
    setUpdateData(null);
    setFormData(initialFormState);
    setValidated(false);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const totalPages = Math.ceil(totalRecords / PAGE_SIZE);

  if (!loading && !isAdmin) {
    return (
      <CContainer className="mt-5">
        <CRow className="justify-content-center">
          <CCol md={6}>
            <CCard className="shadow border-0">
              <CCardBody className="text-center p-5">
                <CIcon icon={cilLockLocked} size="3xl" className="text-danger mb-3" />
                <h2 className="text-dark">Acceso Restringido</h2>
                <p className="text-muted">Se requieren permisos de Administrador.</p>
              </CCardBody>
            </CCard>
          </CCol>
        </CRow>
      </CContainer>
    );
  }

  return (
    <CContainer>
      <CCard className="mb-4 shadow-lg border-0 overflow-hidden w-100" style={{ borderRadius: '16px' }}>
        <CCardHeader className="bg-primary text-white py-3">
          <h2 className="fw-bold text-white d-flex align-items-center m-0 fs-4 text-uppercase">
            <CIcon icon={cilPeople} className="me-2 " />
            Gestión de Usuarios
          </h2>
        </CCardHeader>
      </CCard>

      <CCard className="mb-4 shadow-lg border-0" style={{ borderRadius: '16px' }}>
        <CCardHeader className="py-3 border-bottom-0">
          <div className="d-flex align-items-center rounded-pill px-3 py-1" style={{ width: '400px' }}>
            <CIcon icon={cilSearch} className="text-muted me-2" />
            <CFormInput
              type="text"
              placeholder="Buscar por nombre, email o cédula..."
              className="border-0 bg-transparent shadow-none"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CCardHeader>

        <CCardBody className="px-4">
          <CTable hover responsive align="middle" className="mb-0">
            <CTableHead>
              <CTableRow>
                <CTableHeaderCell className="text-muted small text-uppercase">Cédula</CTableHeaderCell>
                <CTableHeaderCell className="text-muted small text-uppercase">Nombre</CTableHeaderCell>
                <CTableHeaderCell className="text-muted small text-uppercase">Email</CTableHeaderCell>
                <CTableHeaderCell className="text-muted small text-uppercase">Rol</CTableHeaderCell>
                <CTableHeaderCell className="text-end text-muted small text-uppercase">Acciones</CTableHeaderCell>
              </CTableRow>
            </CTableHead>
            <CTableBody>
              {loading && users.length === 0 ? (
                <CTableRow>
                  <CTableDataCell colSpan="5" className="text-center py-5">
                    <CSpinner color="primary" />
                  </CTableDataCell>
                </CTableRow>
              ) : users.length === 0 ? (
                <CTableRow>
                  <CTableDataCell colSpan="5" className="text-center py-4 text-muted">
                    No se encontraron usuarios
                  </CTableDataCell>
                </CTableRow>
              ) : (
                users.map(user => (
                  <CTableRow key={user.id_user}>
                    <CTableDataCell className="fw-bold">{user.cedula}</CTableDataCell>
                    <CTableDataCell>{user.name} {user.lastname}</CTableDataCell>
                    <CTableDataCell>{user.email}</CTableDataCell>
                    <CTableDataCell>
                      <span className={`badge rounded-pill px-3 py-2 text-uppercase`} 
                        style={{
                          background: user.rol_id === 6 
                            ? "linear-gradient(45deg, #ff4d4f, #d9363e)" 
                            : "linear-gradient(45deg, #1890ff, #0050b3)",
                          fontSize: "0.7rem"
                        }}>
                        {user.rol_id === 6 ? 'Administrador' : 'Asistente'}
                      </span>
                    </CTableDataCell>
                    <CTableDataCell className="text-end">
                      <CButton
                        color="info"
                        variant="ghost"
                        size="sm"
                        className="rounded-pill"
                        onClick={() => {
                          setUpdateData(user);
                          setModalVisible(true);
                        }}
                      >
                        <CIcon icon={cilPencil} />
                      </CButton>
                    </CTableDataCell>
                  </CTableRow>
                ))
              )}
            </CTableBody>
          </CTable>

          {/* COMPONENTE DE PAGINACIÓN */}
          {!loading && totalPages > 1 && (
            <div className="d-flex justify-content-between align-items-center mt-4">
              <span className="text-muted small">Mostrando {users.length} de {totalRecords} usuarios</span>
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

      {/* --- Modales de Edición y Confirmación (Mantienen la lógica original) --- */}
      <CModal visible={modalVisible} onClose={handleCancel} size="lg" alignment="center" backdrop="static">
         <CForm noValidate validated={validated} onSubmit={(e) => e.preventDefault()}>
           <CModalHeader className="bg-primary text-white border-0 py-3">
             <CModalTitle className="fw-bold text-white m-0 fs-5">Actualizar Usuario</CModalTitle>
           </CModalHeader>
           <CModalBody className="p-4">
             <CRow className="g-4">
               <CCol md={6}>
                 <CFormLabel className="fw-bold text-muted small mb-2 ms-1">Nombre *</CFormLabel>
                 <CFormInput name="name" value={formData.name} onChange={handleChange} required className="border shadow-sm" style={{ borderRadius: '12px' }} />
               </CCol>
               <CCol md={6}>
                 <CFormLabel className="fw-bold text-muted small mb-2 ms-1">Apellido *</CFormLabel>
                 <CFormInput name="lastname" value={formData.lastname} onChange={handleChange} required className="border shadow-sm" style={{ borderRadius: '12px' }} />
               </CCol>
               <CCol md={6}>
                 <CFormLabel className="fw-bold text-muted small mb-2 ms-1">Teléfono</CFormLabel>
                 <CFormInput name="phone" value={formData.phone} onChange={handleChange} className="border shadow-sm" style={{ borderRadius: '12px' }} />
               </CCol>
               <CCol md={6}>
                 <CFormLabel className="fw-bold text-muted small mb-2 ms-1">Nivel de acceso *</CFormLabel>
                 <CFormSelect name="rol_id" value={formData.rol_id} onChange={handleChange} className="border shadow-sm" style={{ borderRadius: '12px' }}>
                   <option value="7">Asistente</option>
                   <option value="6">Administrador</option>
                 </CFormSelect>
               </CCol>
             </CRow>
           </CModalBody>
           <CModalFooter className="border-0 p-4 pt-0 d-flex gap-3 bg-light">
             <CButton color="secondary" variant="ghost" className="flex-grow-1 py-2 fw-bold" onClick={handleCancel}>Cancelar</CButton>
             <CButton color="primary" className="flex-grow-1 py-2 fw-bold text-white shadow-sm" style={{ borderRadius: '12px' }} onClick={() => { if (formData.name?.trim() && formData.lastname?.trim()) setConfirmModalVisible(true); else toast.warning('Datos incompletos'); }}>Guardar Cambios</CButton>
           </CModalFooter>
         </CForm>
      </CModal>

      <CModal visible={confirmModalVisible} onClose={() => setConfirmModalVisible(false)} alignment="center" backdrop="static">
         <CModalHeader className="bg-warning text-dark border-0 py-3">
           <CModalTitle className="fw-bold text-dark m-0 fs-5">Confirmar Cambios</CModalTitle>
         </CModalHeader>
         <CModalBody className="p-4">
           <p className="mb-1">Vas a actualizar el usuario:</p>
           <p className="fw-bold mb-2">{formData.name} {formData.lastname}</p>
           <p className="text-muted small mb-0">Esta acción modificará su información y nivel de acceso.</p>
         </CModalBody>
         <CModalFooter className="border-0 p-4 pt-0 d-flex gap-3 bg-light">
           <CButton color="secondary" variant="ghost" className="flex-grow-1 py-2 fw-bold" onClick={() => setConfirmModalVisible(false)}>Cancelar</CButton>
           <CButton color="warning" className="flex-grow-1 py-2 fw-bold text-dark shadow-sm" style={{ borderRadius: '12px' }} onClick={confirmSave}>Confirmar Actualización</CButton>
         </CModalFooter>
      </CModal>
    </CContainer>
  );
};

export default AUsers;