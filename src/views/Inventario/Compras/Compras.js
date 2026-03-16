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
  
  // Estados de datos (Desde la Vista)
  const [compras, setCompras] = useState([]);
  const [productos, setProductos] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  
  // Estados de Búsqueda y Paginación
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const PAGE_SIZE = 8;

  // Estados de UI
  const [loading, setLoading] = useState(true);
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

  // 1. Debounce para optimizar la búsqueda en servidor
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setCurrentPage(1); 
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // 2. Cargar Datos usando la Vista 'vista_compras_detalladas'
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const from = (currentPage - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      // Consulta a la VISTA (datos ya aplanados y procesados)
      let query = supabase
        .from("vista_compras_detalladas")
        .select("*", { count: 'exact' });

      // Filtro simple sobre las columnas de la vista
      if (debouncedSearch) {
        query = query.or(`producto_nombre.ilike.%${debouncedSearch}%,producto_sku.ilike.%${debouncedSearch}%`);
      }

      const { data, count, error } = await query
        .order("created_at", { ascending: false })
        .range(from, to);

      if (error) throw error;

      setCompras(data || []);
      setTotalRecords(count || 0);

      // Cargar catálogos para el Modal
      const { data: prods } = await supabase.from("productos").select("id, nombre, sku, precio_costo");
      const { data: provs } = await supabase.from("proveedores").select("id, nombre");
      setProductos(prods || []);
      setProveedores(provs || []);

    } catch (error) {
      toast.error("Error al sincronizar datos: " + error.message);
    } finally {
      setLoading(false);
    }
  }, [supabase, currentPage, debouncedSearch]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Manejadores de eventos
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
    if (!formData.producto_id) return;

    setSubmitting(true);
    try {
      // Llamada al RPC para mantener integridad de stock
      const { data, error } = await supabase.rpc("registrar_compra", {
        p_producto_id: formData.producto_id,
        p_proveedor_id: formData.proveedor_id || null,
        p_cantidad: formData.cantidad,
        p_precio_costo_unitario: formData.precio_costo_unitario,
        p_notas: formData.notas.trim() || null,
      });

      if (error) throw error;

      toast.success(`Entrada registrada. Nuevo stock: ${data.stock_nuevo}`);
      handleCancelModal();
      fetchData(); // Recargar la vista actualizada
    } catch (error) {
      toast.error("Error en la operación: " + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const totalPages = Math.ceil(totalRecords / PAGE_SIZE);

  return (
    <CContainer>
      {/* HEADER DE SECCIÓN */}
      <CCard className="mb-4 shadow-lg border-0 overflow-hidden" style={{ borderRadius: '16px' }}>
        <CCardHeader className="bg-primary text-white py-3">
          <h2 className="fw-bold text-white d-flex align-items-center m-0 fs-4 text-uppercase">
            <CIcon icon={cibCcVisa} className="me-2 " />
            Compras / Entradas de Inventario</h2>
        </CCardHeader>
      </CCard>

      {/* FILTROS Y ACCIONES */}
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
              ) : compras.length === 0 ? (
                <CTableRow><CTableDataCell colSpan="6" className="text-center py-4 text-muted">No se encontraron registros</CTableDataCell></CTableRow>
              ) : compras.map((c) => (
                <CTableRow key={c.id}>
                  <CTableDataCell className="small">
                    {new Date(c.created_at).toLocaleDateString()}
                  </CTableDataCell>
                  <CTableDataCell>
                    <div className="fw-bold">{c.producto_nombre}</div>
                    <div className="small text-muted">{c.producto_sku}</div>
                  </CTableDataCell>
                  <CTableDataCell>{c.proveedor_nombre || "-"}</CTableDataCell>
                  <CTableDataCell className="text-center">{c.cantidad}</CTableDataCell>
                  <CTableDataCell className="text-end fw-bold text-success">$ {c.precio_costo_unitario?.toFixed(2)}</CTableDataCell>
                  <CTableDataCell className="text-end fw-bold text-primary">
                    $ {c.total_compra?.toFixed(2)}
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

      {/* MODAL DE REGISTRO */}
      <CModal visible={modalVisible} onClose={handleCancelModal} size="lg" alignment="center" backdrop="static">
        <CForm noValidate validated={validated} onSubmit={handleSubmit}>
          <CModalHeader className="bg-primary text-white border-0 py-3">
            <CModalTitle className="fw-bold m-0 fs-5">Registrar Entrada de Mercancía</CModalTitle>
          </CModalHeader>
          <CModalBody className="p-4">
            <CRow className="g-4">
              <CCol md={6}>
                <CFormLabel className="fw-bold text-muted small">Producto *</CFormLabel>
                <CFormSelect
                  name="producto_id"
                  value={formData.producto_id}
                  onChange={handleChange}
                  required
                  className="py-2 rounded-3"
                >
                  <option value="">Seleccione un producto...</option>
                  {productos.map(p => (
                    <option key={p.id} value={p.id}>{p.nombre} ({p.sku})</option>
                  ))}
                </CFormSelect>
              </CCol>
              <CCol md={6}>
                <CFormLabel className="fw-bold text-muted small">Proveedor (opcional)</CFormLabel>
                <CFormSelect name="proveedor_id" value={formData.proveedor_id} onChange={handleChange} className="py-2 rounded-3">
                  <option value="">Seleccione un proveedor...</option>
                  {proveedores.map(pv => (
                    <option key={pv.id} value={pv.id}>{pv.nombre}</option>
                  ))}
                </CFormSelect>
              </CCol>
              <CCol md={4}>
                <CFormLabel className="fw-bold text-muted small">Cantidad</CFormLabel>
                <CFormInput type="number" name="cantidad" min={1} value={formData.cantidad} onChange={handleChange} required className="py-2 rounded-3" />
              </CCol>
              <CCol md={4}>
                <CFormLabel className="fw-bold text-muted small">Costo unitario (USD)</CFormLabel>
                <CFormInput type="number" step="0.01" name="precio_costo_unitario" value={formData.precio_costo_unitario} onChange={handleChange} required className="py-2 rounded-3" />
              </CCol>
              <CCol md={4}>
                <CFormLabel className="fw-bold text-muted small">Total calculado</CFormLabel>
                <div className="h4 text-primary mt-1">
                  USD {(formData.cantidad * formData.precio_costo_unitario).toFixed(2)}
                </div>
              </CCol>
              <CCol md={12}>
                <CFormLabel className="fw-bold text-muted small">Notas / Observaciones</CFormLabel>
                <CFormInput name="notas" value={formData.notas} onChange={handleChange} placeholder="Ej: Factura #123" className="py-2 rounded-3" />
              </CCol>
            </CRow>
          </CModalBody>
          <CModalFooter className="border-0 p-4 pt-0 d-flex gap-3 bg-body-secondary">
            <CButton color="secondary" variant="ghost" className="flex-grow-1" onClick={handleCancelModal}>Cancelar</CButton>
            <CButton type="submit" color="primary" className="flex-grow-1 text-white fw-bold" disabled={submitting}>
              {submitting ? <CSpinner size="sm" /> : 'Confirmar Entrada'}
            </CButton>
          </CModalFooter>
        </CForm>
      </CModal>
    </CContainer>
  );
};

export default ComprasRepuestos;