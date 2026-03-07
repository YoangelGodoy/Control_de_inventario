import React, { useEffect, useState, useCallback } from 'react';
import {
  CForm, CFormInput, CButton, CCard, CCardBody, CCardHeader,
  CCol, CRow, CContainer, CTable, CTableHead, CTableRow,
  CTableHeaderCell, CTableBody, CTableDataCell,
  CModal, CModalHeader, CModalTitle, CModalBody, CModalFooter,
  CFormLabel, CFormFeedback, CSpinner, CFormSelect, CPagination, CPaginationItem
} from '@coreui/react';
import { CIcon } from '@coreui/icons-react';
import { cilPlus, cilSearch, cilChevronLeft, cilChevronRight, cibCcVisa } from '@coreui/icons';
import { createClient } from "../../../../supabase/client"; 
import { toast } from "sonner";

const ComprasRepuestos = () => {
  const supabase = createClient();
  
  // Estados de datos
  const [compras, setCompras] = useState([]);
  const [productos, setProductos] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  
  // Estados de Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const PAGE_SIZE = 8;

  // Estados de UI
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [validated, setValidated] = useState(false);

  // Estado del Formulario
  const [formData, setFormData] = useState({
    producto_id: '',
    proveedor_id: '',
    cantidad: 1,
    precio_costo_unitario: 0,
    notas: ''
  });

  // 1. Cargar Datos con Paginación
  const fetchData = useCallback(async () => {
    setLoading(true);
    
    // Cálculo del rango para Supabase
    const from = (currentPage - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    // Traemos las compras con rango y conteo total
    const { data: comprasData, count, error } = await supabase
      .from("compras_entradas")
      .select(`
        *,
        productos (nombre, sku),
        proveedores (nombre)
      `, { count: 'exact' }) // 'exact' nos da el total de filas para la paginación
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) {
      toast.error("Error al cargar compras: " + error.message);
    } else {
      setCompras(comprasData || []);
      setTotalRecords(count || 0);
    }

    // Estos se cargan completos para los selectores del modal (no necesitan paginarse)
    const { data: productosData } = await supabase.from("productos").select("id, nombre, sku, precio_costo");
    const { data: proveedoresData } = await supabase.from("proveedores").select("id, nombre");

    setProductos(productosData || []);
    setProveedores(proveedoresData || []);
    setLoading(false);
  }, [supabase, currentPage]); // Se dispara cuando cambia la página

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Resetear a página 1 cuando el usuario busca algo
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: ["cantidad", "precio_costo_unitario"].includes(name) ? Number(value) : value
    }));

    if (name === 'producto_id') {
      const prod = productos.find(p => p.id === value);
      if (prod) setFormData(prev => ({ ...prev, precio_costo_unitario: prod.precio_costo }));
    }
  };

  const handleCancelModal = () => {
    setModalVisible(false);
    setFormData({ producto_id: '', proveedor_id: '', cantidad: 1, precio_costo_unitario: 0, notas: '' });
    setValidated(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setValidated(true);
    if (!formData.producto_id) {
      toast.warning("Seleccione un producto");
      return;
    }

    setSubmitting(true);
    
    const { data, error } = await supabase.rpc("registrar_compra", {
      p_producto_id: formData.producto_id,
      p_proveedor_id: formData.proveedor_id || null,
      p_cantidad: formData.cantidad,
      p_precio_costo_unitario: formData.precio_costo_unitario,
      p_notas: formData.notas.trim() || null,
    });

    if (error) {
      toast.error("Error: " + error.message);
    } else {
      toast.success(`Entrada registrada. Nuevo stock: ${data.stock_nuevo}`);
      handleCancelModal();
      setCurrentPage(1);
      fetchData();
    }
    setSubmitting(false);
  };

  // Filtro local (aplica sobre los datos de la página actual)
  const filteredCompras = compras.filter(c => 
    c.productos?.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.productos?.sku?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.ceil(totalRecords / PAGE_SIZE);

  return (
    <CContainer>
      <CCard className="mb-4 shadow-lg border-0 overflow-hidden w-100" style={{ borderRadius: '16px' }}>
        <CCardHeader className="bg-primary text-white py-3">
          <h2 className="fw-bold text-white d-flex align-items-center m-0 fs-4 text-uppercase">
            <CIcon icon={cibCcVisa} className="me-2 " />
            Compras / Entradas de Inventario</h2>
        </CCardHeader>
      </CCard>

      <CCard className="mb-4 shadow-lg border-0" style={{ borderRadius: '16px' }}>
        <CCardHeader className="py-3 border-bottom-0">
          <div className="d-flex justify-content-between align-items-center">
            <div className="d-flex bg-body-secondary align-items-center rounded-pill px-3 py-1" style={{ width: '400px' }}>
              <CIcon icon={cilSearch} className="text-muted me-2" />
              <CFormInput
                placeholder="Buscar por producto o SKU..."
                className="border-0 bg-transparent shadow-none"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <CButton color="success" className="text-white rounded-pill px-4" onClick={() => setModalVisible(true)}>
              <CIcon icon={cilPlus} className="me-2" /> Nueva Compra
            </CButton>
          </div>
        </CCardHeader>
        <CCardBody className="px-4">
          <CTable hover responsive align="middle" className="mb-0">
            <CTableHead>
              <CTableRow>
                <CTableHeaderCell className="text-muted small text-uppercase">Fecha</CTableHeaderCell>
                <CTableHeaderCell className="text-muted small text-uppercase">Producto</CTableHeaderCell>
                <CTableHeaderCell className="text-muted small text-uppercase">Proveedor</CTableHeaderCell>
                <CTableHeaderCell className="text-center text-muted small text-uppercase">Cant.</CTableHeaderCell>
                <CTableHeaderCell className="text-end text-muted small text-uppercase">P. Unitario</CTableHeaderCell>
                <CTableHeaderCell className="text-end text-muted small text-uppercase">Total</CTableHeaderCell>
              </CTableRow>
            </CTableHead>
            <CTableBody>
              {loading ? (
                <CTableRow><CTableDataCell colSpan="6" className="text-center py-5"><CSpinner color="primary" /></CTableDataCell></CTableRow>
              ) : filteredCompras.length === 0 ? (
                <CTableRow><CTableDataCell colSpan="6" className="text-center py-4 text-muted">No hay registros</CTableDataCell></CTableRow>
              ) : filteredCompras.map((c) => (
                <CTableRow key={c.id}>
                  <CTableDataCell className="small">
                    {new Date(c.created_at).toLocaleDateString()}
                  </CTableDataCell>
                  <CTableDataCell>
                    <div className="fw-bold">{c.productos?.nombre}</div>
                    <div className="small text-muted">{c.productos?.sku}</div>
                  </CTableDataCell>
                  <CTableDataCell>{c.proveedores?.nombre || "-"}</CTableDataCell>
                  <CTableDataCell className="text-center">{c.cantidad}</CTableDataCell>
                  <CTableDataCell className="text-end fw-bold text-success">$ {c.precio_costo_unitario?.toFixed(2)}</CTableDataCell>
                  <CTableDataCell className="text-end fw-bold text-primary">
                    $ {(c.cantidad * c.precio_costo_unitario).toFixed(2)}
                  </CTableDataCell>
                </CTableRow>
              ))}
            </CTableBody>
          </CTable>

          {/* CONTROLES DE PAGINACIÓN */}
          {!loading && totalPages > 1 && (
            <div className="d-flex justify-content-between align-items-center mt-4">
              <div className="text-muted small">
                Mostrando {compras.length} de {totalRecords} compras
              </div>
              <CPagination align="end" className="mb-0">
                <CPaginationItem 
                  disabled={currentPage === 1} 
                  onClick={() => setCurrentPage(prev => prev - 1)}
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
                  onClick={() => setCurrentPage(prev => prev + 1)}
                  style={{ cursor: 'pointer' }}
                >
                  <CIcon icon={cilChevronRight} />
                </CPaginationItem>
              </CPagination>
            </div>
          )}
        </CCardBody>
      </CCard>

      {/* MODAL REGISTRO */}
      <CModal visible={modalVisible} onClose={handleCancelModal} size="lg" alignment="center" backdrop="static">
        <CForm noValidate validated={validated} onSubmit={handleSubmit}>
          <CModalHeader className="bg-primary text-white border-0 py-3">
            <CModalTitle className="fw-bold text-white m-0 fs-5">Registrar Entrada de Mercancía</CModalTitle>
          </CModalHeader>
          <CModalBody className="p-4">
            <CRow className="g-4">
              <CCol md={6}>
                <CFormLabel className="fw-bold text-muted small mb-2 ms-1">Producto *</CFormLabel>
                <CFormSelect
                  name="producto_id"
                  value={formData.producto_id}
                  onChange={handleChange}
                  required
                  className="border shadow-sm py-2 px-3"
                  style={{ borderRadius: '12px' }}
                  invalid={validated && !formData.producto_id}
                >
                  <option value="">Seleccione un producto...</option>
                  {productos.map(p => (
                    <option key={p.id} value={p.id}>{p.nombre} ({p.sku})</option>
                  ))}
                </CFormSelect>
                <CFormFeedback invalid>Seleccione un producto.</CFormFeedback>
              </CCol>
              <CCol md={6}>
                <CFormLabel className="fw-bold text-muted small mb-2 ms-1">Proveedor (opcional)</CFormLabel>
                <CFormSelect
                  name="proveedor_id"
                  value={formData.proveedor_id}
                  onChange={handleChange}
                  className="border shadow-sm py-2 px-3"
                  style={{ borderRadius: '12px' }}
                >
                  <option value="">Seleccione un proveedor...</option>
                  {proveedores.map(pv => (
                    <option key={pv.id} value={pv.id}>{pv.nombre}</option>
                  ))}
                </CFormSelect>
              </CCol>
              <CCol md={4}>
                <CFormLabel className="fw-bold text-muted small mb-2 ms-1">Cantidad</CFormLabel>
                <CFormInput
                  type="number"
                  name="cantidad"
                  min={1}
                  value={formData.cantidad}
                  onChange={handleChange}
                  required
                  className="border shadow-sm py-2 px-3"
                  style={{ borderRadius: '12px' }}
                />
              </CCol>
              <CCol md={4}>
                <CFormLabel className="fw-bold text-muted small mb-2 ms-1">Costo unitario (USD)</CFormLabel>
                <CFormInput
                  type="number"
                  step="0.01"
                  name="precio_costo_unitario"
                  value={formData.precio_costo_unitario}
                  onChange={handleChange}
                  required
                  className="border shadow-sm py-2 px-3"
                  style={{ borderRadius: '12px' }}
                />
              </CCol>
              <CCol md={4}>
                <CFormLabel className="fw-bold text-muted small mb-2 ms-1">Total compra</CFormLabel>
                <div className="h4 text-primary mt-1 mb-0">
                  USD {(formData.cantidad * formData.precio_costo_unitario).toFixed(2)}
                </div>
              </CCol>
              <CCol md={12}>
                <CFormLabel className="fw-bold text-muted small mb-2 ms-1">Notas / Observaciones</CFormLabel>
                <CFormInput
                  name="notas"
                  value={formData.notas}
                  onChange={handleChange}
                  placeholder="Ej: Factura #123"
                  className="border shadow-sm py-2 px-3"
                  style={{ borderRadius: '12px' }}
                />
              </CCol>
            </CRow>
          </CModalBody>
          <CModalFooter className="border-0 p-4 pt-0 d-flex gap-3 bg-body-secondary">
            <CButton
              type="button"
              color="secondary"
              variant="ghost"
              className="flex-grow-1 py-2 fw-bold"
              style={{ borderRadius: '12px' }}
              onClick={handleCancelModal}
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
              {submitting ? <CSpinner size="sm" /> : 'Confirmar Entrada'}
            </CButton>
          </CModalFooter>
        </CForm>
      </CModal>
    </CContainer>
  );
};

export default ComprasRepuestos;