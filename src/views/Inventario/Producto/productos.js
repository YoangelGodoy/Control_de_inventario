import React, { useEffect, useState, useCallback } from 'react';
import {
  CForm, CFormInput, CButton, CCard, CCardBody, CCardHeader,
  CCol, CRow, CContainer, CTable, CTableHead, CTableRow,
  CTableHeaderCell, CTableBody, CTableDataCell, CBadge,
  CModal, CModalHeader, CModalTitle, CModalBody, CModalFooter,
  CFormLabel, CFormFeedback, CSpinner, CPagination, CPaginationItem
} from '@coreui/react';
import { CIcon } from '@coreui/icons-react';
import { 
  cilPencil, cilTrash, cilPlus, cilSearch, 
  cilChevronLeft, cilChevronRight, 
  cilList,
  cilTag,
  cilTags
} from '@coreui/icons';
import { createClient } from "../../../../supabase/client"; 
import { toast } from "sonner";

const InventarioProductos = () => {
  const supabase = createClient();
  
  // Estados de datos
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const PAGE_SIZE = 8;

  // Estados de UI
  const [modalVisible, setModalVisible] = useState(false);
  const [modalDeleteVisible, setModalDeleteVisible] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [productToDelete, setProductToDelete] = useState(null);
  
  // Estados de Formulario y Validación
  const [submitting, setSubmitting] = useState(false);
  const [validated, setValidated] = useState(false);
  const [skuError, setSkuError] = useState(false); // Error de duplicado

  const initialFormState = {
    sku: '', nombre: '', marca: '',
    stock_actual: 0, precio_costo: 0,
    precio_venta: 0, ubicacion: ''
  };
  const [formData, setFormData] = useState(initialFormState);

  // 1. Cargar Datos
  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const from = (currentPage - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const { data, count, error } = await supabase
        .from("productos")
        .select("*", { count: 'exact' })
        .order("created_at", { ascending: false })
        .range(from, to);
      
      if (error) throw error;
      setProducts(data || []);
      setTotalRecords(count || 0);
    } catch (error) {
      toast.error("Error al cargar inventario: " + error.message);
    } finally {
      setLoading(false);
    }
  }, [supabase, currentPage]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  // Manejo de cambios en el form
  const handleChange = (e) => {
    const { name, value, type } = e.target;
    if (name === 'sku') setSkuError(false); // Reset error al escribir
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? value : value // Guardamos el valor literal para validación
    }));
  };

  const handleCancel = () => {
    setFormData(initialFormState);
    setEditingProduct(null);
    setModalVisible(false);
    setValidated(false);
    setSkuError(false);
  };

  // --- VALIDACIONES LÓGICAS ---
  const validateForm = () => {
    if (!formData.sku.trim()) return false;
    if (!formData.nombre.trim()) return false;
    if (Number(formData.stock_actual) < 0) {
      toast.warning("El stock no puede ser negativo");
      return false;
    }
    if (Number(formData.precio_costo) < 0 || Number(formData.precio_venta) < 0) {
      toast.warning("Los precios no pueden ser negativos");
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
      const { data: { user } } = await supabase.auth.getUser();
      const skuLimpio = formData.sku.trim().toUpperCase();

      // VALIDACIÓN DE SKU DUPLICADO (Solo para nuevos)
      if (!editingProduct) {
        const { data: existing } = await supabase
          .from("productos")
          .select("sku")
          .eq("sku", skuLimpio)
          .maybeSingle();

        if (existing) {
          setSkuError(true);
          toast.error("Ya existe un producto con este SKU");
          setSubmitting(false);
          return;
        }
      }

      const payload = { 
        ...formData,
        sku: skuLimpio,
        nombre: formData.nombre.trim(),
        marca: formData.marca.trim(),
        stock_actual: parseInt(formData.stock_actual) || 0,
        precio_costo: parseFloat(formData.precio_costo) || 0,
        precio_venta: parseFloat(formData.precio_venta) || 0,
        user_id: user?.id 
      };

      const { error } = editingProduct 
        ? await supabase.from("productos").update(payload).eq("id", editingProduct.id)
        : await supabase.from("productos").insert([payload]);

      if (error) throw error;

      toast.success(editingProduct ? "Producto actualizado" : "Producto registrado");
      if (!editingProduct) setCurrentPage(1);
      fetchProducts();
      handleCancel();
    } catch (error) {
      toast.error("Error: " + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    try {
      const { error } = await supabase.from("productos").delete().eq("id", productToDelete.id);
      if (error) throw error;
      toast.success("Producto eliminado");
      fetchProducts();
    } catch (error) {
      toast.error("Error al eliminar");
    } finally {
      setModalDeleteVisible(false);
      setProductToDelete(null);
    }
  };

  const filteredProducts = products.filter(p => 
    p.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.sku?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.ceil(totalRecords / PAGE_SIZE);

  return (
    <CContainer>
      {/* Cabecera */}
      <CCard className="mb-4 shadow-lg border-0 overflow-hidden w-100" style={{ borderRadius: '16px' }}>
        <CCardHeader className="bg-primary text-white py-3">
          <h2 className="fw-bold text-white d-flex align-items-center m-0 fs-4 text-uppercase">
            <CIcon icon={cilTags} className="me-2 " />
            Inventario de Productos
          </h2>
        </CCardHeader>
      </CCard>

      {/* Buscador y Tabla */}
      <CCard className="mb-4 shadow-lg border-0" style={{ borderRadius: '16px' }}>
        <CCardHeader className="py-3 border-bottom-0">
          <div className="d-flex justify-content-between align-items-center">
            <div className="d-flex align-items-center rounded-pill px-3 py-1" style={{ width: '400px' }}>
              <CIcon icon={cilSearch} className="text-muted me-2" />
              <CFormInput 
                placeholder="Buscar por SKU o nombre..." 
                className="border-0 bg-transparent shadow-none"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <CButton color="success" className="text-white rounded-pill px-4" onClick={() => { setEditingProduct(null); setModalVisible(true); }}>
              <CIcon icon={cilPlus} className="me-2" /> Nuevo Producto
            </CButton>
          </div>
        </CCardHeader>

        <CCardBody className="px-4">
          <CTable hover responsive align="middle" className="mb-0">
            <CTableHead>
              <CTableRow>
                <CTableHeaderCell className="text-muted small text-uppercase">SKU</CTableHeaderCell>
                <CTableHeaderCell className="text-muted small text-uppercase">Producto</CTableHeaderCell>
                <CTableHeaderCell className="text-muted small text-uppercase text-center">Stock</CTableHeaderCell>
                <CTableHeaderCell className="text-muted small text-uppercase">Precio Venta</CTableHeaderCell>
                <CTableHeaderCell className="text-muted small text-uppercase">Precio Compra</CTableHeaderCell>
                <CTableHeaderCell className="text-end text-muted small text-uppercase">Acciones</CTableHeaderCell>
              </CTableRow>
            </CTableHead>
            <CTableBody>
              {loading ? (
                <CTableRow><CTableDataCell colSpan="5" className="text-center py-5"><CSpinner color="primary" /></CTableDataCell></CTableRow>
              ) : filteredProducts.length === 0 ? (
                <CTableRow><CTableDataCell colSpan="5" className="text-center py-4 text-muted">No se encontraron registros</CTableDataCell></CTableRow>
              ) : filteredProducts.map((p) => (
                <CTableRow key={p.id}>
                  <CTableDataCell className="fw-bold text-muted">{p.sku}</CTableDataCell>
                  <CTableDataCell>
                    <div className="fw-bold text-dark text-uppercase">{p.nombre}</div>
                    <div className="small text-muted">{p.marca || "Sin marca"}</div>
                  </CTableDataCell>
                  <CTableDataCell className="text-center">
                    <CBadge color={p.stock_actual <= 5 ? 'danger' : 'success'} shape="rounded-pill" className="px-3">
                      {p.stock_actual}
                    </CBadge>
                  </CTableDataCell>
                  <CTableDataCell className="fw-bold text-primary">
                    ${p.precio_venta?.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </CTableDataCell>
                  <CTableDataCell className="fw-bold text-primary">
                    ${p.precio_costo?.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </CTableDataCell>
                  <CTableDataCell className="text-end">
                    <CButton color="info" variant="ghost" size="sm" className="rounded-pill" onClick={() => { setEditingProduct(p); setFormData(p); setModalVisible(true); }}>
                      <CIcon icon={cilPencil} />
                    </CButton>
                    <CButton color="danger" variant="ghost" size="sm" className="rounded-pill ms-2" onClick={() => { setProductToDelete(p); setModalDeleteVisible(true); }}>
                      <CIcon icon={cilTrash} />
                    </CButton>
                  </CTableDataCell>
                </CTableRow>
              ))}
            </CTableBody>
          </CTable>
          
          {/* Paginación */}
          {!loading && totalPages > 1 && (
            <div className="d-flex justify-content-between align-items-center mt-4">
              <div className="text-muted small">Mostrando {products.length} de {totalRecords}</div>
              <CPagination align="end" className="mb-0">
                <CPaginationItem disabled={currentPage === 1} onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} style={{ cursor: 'pointer' }}>
                  <CIcon icon={cilChevronLeft} />
                </CPaginationItem>
                {[...Array(totalPages)].map((_, i) => (
                  <CPaginationItem key={i + 1} active={currentPage === i + 1} onClick={() => setCurrentPage(i + 1)} style={{ cursor: 'pointer' }}>
                    {i + 1}
                  </CPaginationItem>
                ))}
                <CPaginationItem disabled={currentPage === totalPages} onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} style={{ cursor: 'pointer' }}>
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
              {editingProduct ? 'Editar Producto' : 'Nuevo Producto'}
            </CModalTitle>
          </CModalHeader>

          <CModalBody className="p-4">
            <CRow className="g-4">
              <CCol md={6}>
                <CFormLabel className="fw-bold text-muted small mb-2 ms-1">SKU / Código *</CFormLabel>
                <CFormInput
                  name="sku"
                  value={formData.sku}
                  onChange={handleChange}
                  required
                  disabled={!!editingProduct}
                  placeholder="Ej: BUJ-001"
                  className="border shadow-sm py-2 px-3"
                  style={{ borderRadius: '12px' }}
                  invalid={skuError || (validated && !formData.sku.trim())}
                />
                <CFormFeedback invalid>
                  {skuError ? 'Este SKU ya está registrado.' : 'El SKU es obligatorio.'}
                </CFormFeedback>
              </CCol>

              <CCol md={6}>
                <CFormLabel className="fw-bold text-muted small mb-2 ms-1">Marca</CFormLabel>
                <CFormInput
                  name="marca"
                  value={formData.marca}
                  onChange={handleChange}
                  placeholder="Ej: Toyota"
                  className="border shadow-sm py-2 px-3"
                  style={{ borderRadius: '12px' }}
                />
              </CCol>

              <CCol md={12}>
                <CFormLabel className="fw-bold text-muted small mb-2 ms-1">Nombre del Producto *</CFormLabel>
                <CFormInput
                  name="nombre"
                  value={formData.nombre}
                  onChange={handleChange}
                  required
                  placeholder="Ej: Kit de Embrague"
                  className="border shadow-sm py-2 px-3"
                  style={{ borderRadius: '12px' }}
                  invalid={validated && !formData.nombre.trim()}
                />
                <CFormFeedback invalid>El nombre es obligatorio.</CFormFeedback>
              </CCol>

              <CCol md={4}>
                <CFormLabel className="fw-bold text-muted small mb-2 ms-1">Stock Actual</CFormLabel>
                <CFormInput
                  type="number"
                  name="stock_actual"
                  value={formData.stock_actual}
                  onChange={handleChange}
                  className="border shadow-sm py-2 px-3"
                  style={{ borderRadius: '12px' }}
                  invalid={validated && formData.stock_actual < 0}
                />
                <CFormFeedback invalid>No puede ser negativo.</CFormFeedback>
              </CCol>

              <CCol md={4}>
                <CFormLabel className="fw-bold text-muted small mb-2 ms-1">Costo (USD)</CFormLabel>
                <CFormInput
                  type="number"
                  step="0.01"
                  name="precio_costo"
                  value={formData.precio_costo}
                  onChange={handleChange}
                  className="border shadow-sm py-2 px-3"
                  style={{ borderRadius: '12px' }}
                  invalid={validated && formData.precio_costo < 0}
                />
                <CFormFeedback invalid>No puede ser negativo.</CFormFeedback>
              </CCol>

              <CCol md={4}>
                <CFormLabel className="fw-bold text-muted small mb-2 ms-1">Venta (USD)</CFormLabel>
                <CFormInput
                  type="number"
                  step="0.01"
                  name="precio_venta"
                  value={formData.precio_venta}
                  onChange={handleChange}
                  className="border shadow-sm py-2 px-3"
                  style={{ borderRadius: '12px' }}
                  invalid={validated && formData.precio_venta < 0}
                />
                <CFormFeedback invalid>No puede ser negativo.</CFormFeedback>
              </CCol>
            </CRow>
          </CModalBody>

          <CModalFooter className="border-0 p-4 pt-2 d-flex gap-3 bg-light">
            <CButton type="button" color="secondary" variant="ghost" className="flex-grow-1 py-2 fw-bold" style={{ borderRadius: '12px' }} onClick={handleCancel}>
              Cancelar
            </CButton>
            <CButton type="submit" color="primary" className="flex-grow-1 py-2 fw-bold text-white shadow-sm" style={{ borderRadius: '12px' }} disabled={submitting}>
              {submitting ? <CSpinner size="sm" /> : 'Guardar'}
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
          <h6 className="fw-bold mb-1">¿Eliminar "{productToDelete?.nombre}"?</h6>
          <p className="text-muted small mb-0">Esta acción no se puede deshacer.</p>
        </CModalBody>
        <CModalFooter className="border-0 p-4 pt-0 d-flex gap-3 bg-light">
          <CButton color="secondary" variant="ghost" className="flex-grow-1 py-2 fw-bold" style={{ borderRadius: '12px' }} onClick={() => setModalDeleteVisible(false)}>
            Cancelar
          </CButton>
          <CButton color="danger" className="flex-grow-1 py-2 fw-bold text-white shadow-sm" style={{ borderRadius: '12px' }} onClick={confirmDelete}>
            Eliminar
          </CButton>
        </CModalFooter>
      </CModal>
    </CContainer>
  );
};

export default InventarioProductos;