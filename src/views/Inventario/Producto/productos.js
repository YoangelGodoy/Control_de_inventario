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
  cilTags
} from '@coreui/icons';
import { createClient } from "../../../../supabase/client"; 
import { toast } from "sonner";

const InventarioProductos = () => {
  const supabase = createClient();
  
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const PAGE_SIZE = 7;

  const [modalVisible, setModalVisible] = useState(false);
  const [modalDeleteVisible, setModalDeleteVisible] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [productToDelete, setProductToDelete] = useState(null);
  
  const [submitting, setSubmitting] = useState(false);
  const [validated, setValidated] = useState(false);
  const [skuError, setSkuError] = useState(false);

  const initialFormState = {
    sku: '', nombre: '', marca: '',
    stock_actual: 0, precio_costo: 0,
    precio_venta: 0, precio_credito: 0,
    ubicacion: ''
  };
  const [formData, setFormData] = useState(initialFormState);

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
      toast.error("Error al cargar: " + error.message);
    } finally {
      setLoading(false);
    }
  }, [supabase, currentPage]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'sku') setSkuError(false);
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCancel = () => {
    setFormData(initialFormState);
    setEditingProduct(null);
    setModalVisible(false);
    setValidated(false);
    setSkuError(false);
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
      const skuLimpio = formData.sku.trim().toUpperCase();

      if (!editingProduct) {
        const { data: existing } = await supabase
          .from("productos")
          .select("sku")
          .eq("sku", skuLimpio)
          .maybeSingle();

        if (existing) {
          setSkuError(true);
          setSubmitting(false);
          return;
        }
      }

      const payload = { 
        ...formData,
        sku: skuLimpio,
        stock_actual: parseInt(formData.stock_actual) || 0,
        precio_costo: parseFloat(formData.precio_costo) || 0,
        precio_venta: parseFloat(formData.precio_venta) || 0,
        precio_credito: parseFloat(formData.precio_credito) || 0,
        user_id: user?.id 
      };

      const { error } = editingProduct 
        ? await supabase.from("productos").update(payload).eq("id", editingProduct.id)
        : await supabase.from("productos").insert([payload]);

      if (error) throw error;

      toast.success("Operación exitosa");
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
      toast.success("Eliminado");
      fetchProducts();
    } catch (error) {
      toast.error("Error al eliminar");
    } finally {
      setModalDeleteVisible(false);
    }
  };

  const filteredProducts = products.filter(p => 
    p.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.sku?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.ceil(totalRecords / PAGE_SIZE);

  return (
    <CContainer>
      <CCard className="mb-4 shadow-lg border-0 overflow-hidden w-100" style={{ borderRadius: '16px' }}>
        <CCardHeader className="bg-primary text-white py-3">
          <h2 className="fw-bold text-white d-flex align-items-center m-0 fs-4 text-uppercase">
            <CIcon icon={cilTags} className="me-2" /> Inventario de Productos
          </h2>
        </CCardHeader>
      </CCard>

      <CCard className="mb-4 shadow-lg border-0" style={{ borderRadius: '16px' }}>
        <CCardHeader className="py-3 border-bottom-0">
          <div className="d-flex justify-content-between align-items-center">
            <div className="d-flex bg-body-secondary align-items-center rounded-pill px-3 py-1" style={{ width: '400px' }}>
              <CIcon icon={cilSearch} className="text-muted me-2" />
              <CFormInput 
                placeholder="Buscar por sku o nombre..." 
                className="border-0 bg-transparent shadow-none"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <CButton color="success" className="text-white rounded-pill px-4" onClick={() => { setEditingProduct(null); setFormData(initialFormState); setModalVisible(true); }}>
              <CIcon icon={cilPlus} className="me-2" /> Nuevo Producto
            </CButton>
          </div>
        </CCardHeader>

        <CCardBody className="px-4">
          <CTable hover responsive align="middle" className="mb-0" style={{ tableLayout: 'fixed' }}>
            <CTableHead>
              <CTableRow>
                <CTableHeaderCell className="text-muted small text-uppercase" style={{ width: '15%' }}>SKU</CTableHeaderCell>
                <CTableHeaderCell className="text-muted small text-uppercase" style={{ width: '30%' }}>Producto</CTableHeaderCell>
                <CTableHeaderCell className="text-muted small text-uppercase text-center" style={{ width: '10%' }}>Stock</CTableHeaderCell>
                <CTableHeaderCell className="text-muted small text-uppercase" style={{ width: '15%' }}>P. Contado</CTableHeaderCell>
                <CTableHeaderCell className="text-muted small text-uppercase" style={{ width: '15%' }}>P. Crédito</CTableHeaderCell>
                <CTableHeaderCell className="text-end text-muted small text-uppercase" style={{ width: '15%' }}>Costo</CTableHeaderCell>
                <CTableHeaderCell className="text-end text-muted small text-uppercase" style={{ width: '15%' }}>Acciones</CTableHeaderCell>
              </CTableRow>
            </CTableHead>
            <CTableBody>
              {loading ? (
                <CTableRow><CTableDataCell colSpan="7" className="text-center py-5"><CSpinner color="primary" /></CTableDataCell></CTableRow>
                ) : filteredProducts.length === 0 ? (
                <CTableRow><CTableDataCell colSpan="7" className="text-center py-4 text-muted">No se encontraron productos</CTableDataCell></CTableRow>
                ) : filteredProducts.map((p) => (
                <CTableRow key={p.id}>
                  <CTableDataCell className="fw-bold text-muted text-truncate">{p.sku}</CTableDataCell>
                  <CTableDataCell>
                    <div className="fw-bold text-uppercase" title={p.nombre} style={{ maxWidth: '100%' }}>
                      {p.nombre}
                    </div>
                    <div className="small text-muted text-truncate">{p.marca || "Sin marca"}</div>
                  </CTableDataCell>
                  <CTableDataCell className="text-center">
                    <CBadge color={p.stock_actual <= 5 ? 'danger' : 'success'} shape="rounded-pill">
                      {p.stock_actual}
                    </CBadge>
                  </CTableDataCell>
                  <CTableDataCell className="fw-bold text-success">
                    ${p.precio_venta?.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </CTableDataCell>
                  <CTableDataCell className="fw-bold text-warning">
                    ${p.precio_credito?.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </CTableDataCell>
                 <CTableDataCell>
                    <div className="d-flex justify-content-end fw-bold">
                      ${p.precio_costo?.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </div>
                 </CTableDataCell>
                  <CTableDataCell className="text-end">
                    <div className="d-flex justify-content-end">
                      <CButton color="info" variant="ghost" size="sm" onClick={() => { setEditingProduct(p); setFormData(p); setModalVisible(true); }}>
                        <CIcon icon={cilPencil} />
                      </CButton>
                      <CButton color="danger" variant="ghost" size="sm" onClick={() => { setProductToDelete(p); setModalDeleteVisible(true); }}>
                        <CIcon icon={cilTrash} />
                      </CButton>
                    </div>
                  </CTableDataCell>
                </CTableRow>
              ))}
            </CTableBody>
          </CTable>

          {/* Bloque de Paginación Agregado */}
          {!loading && totalPages > 1 && (
            <div className="d-flex justify-content-between align-items-center mt-4">
              <div className="text-muted small">
                Mostrando {products.length} de {totalRecords} productos
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

      <CModal visible={modalVisible} onClose={handleCancel} size="lg" alignment='center' backdrop="static">
        <CForm noValidate validated={validated} onSubmit={handleSubmit}>
          <CModalHeader className="bg-primary text-white"><CModalTitle>{editingProduct ? 'Editar' : 'Nuevo'} Producto</CModalTitle></CModalHeader>
          <CModalBody className="p-4">
            <CRow className="g-3">
  <CCol md={6}>
    <CFormLabel className="small fw-bold">SKU *</CFormLabel>
    <CFormInput 
      name="sku" 
      value={formData.sku} 
      onChange={handleChange} 
      required 
      disabled={!!editingProduct} 
      invalid={skuError} 
      placeholder="Ej: AB-1234"
    />
  </CCol>
  <CCol md={6}>
    <CFormLabel className="small fw-bold">Marca</CFormLabel>
    <CFormInput 
      name="marca" 
      value={formData.marca} 
      onChange={handleChange} 
      placeholder="Ej: Toyota, Bosch..."
    />
  </CCol>
  <CCol md={12}>
    <CFormLabel className="small fw-bold">Nombre *</CFormLabel>
    <CFormInput 
      name="nombre" 
      value={formData.nombre} 
      onChange={handleChange} 
      required 
      placeholder="Nombre descriptivo del producto"
    />
  </CCol>
  <CCol md={3}>
    <CFormLabel className="small fw-bold">Stock</CFormLabel>
    <CFormInput 
      type="number" 
      name="stock_actual" 
      value={formData.stock_actual} 
      onChange={handleChange} 
      placeholder="0"
    />
  </CCol>
  <CCol md={3}>
    <CFormLabel className="small fw-bold">Costo</CFormLabel>
    <CFormInput 
      type="number" 
      step="0.01" 
      name="precio_costo" 
      value={formData.precio_costo} 
      onChange={handleChange} 
      placeholder="0.00"
    />
  </CCol>
  <CCol md={3}>
    <CFormLabel className="small fw-bold text-success">P. Contado</CFormLabel>
    <CFormInput 
      type="number" 
      step="0.01" 
      name="precio_venta" 
      value={formData.precio_venta} 
      onChange={handleChange} 
      placeholder="0.00"
    />
  </CCol>
  <CCol md={3}>
    <CFormLabel className="small fw-bold text-warning">P. Crédito</CFormLabel>
    <CFormInput 
      type="number" 
      step="0.01" 
      name="precio_credito" 
      value={formData.precio_credito} 
      onChange={handleChange} 
      placeholder="0.00"
    />
  </CCol>
</CRow>
          </CModalBody>
          <CModalFooter>
            <CButton color="secondary" onClick={handleCancel}>Cancelar</CButton>
            <CButton type="submit" color="primary" disabled={submitting}>Guardar</CButton>
          </CModalFooter>
        </CForm>
      </CModal>

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
              <CModalFooter className="border-0 p-4 pt-0 d-flex gap-3 bg-body-secondary">
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

export default InventarioProductos;