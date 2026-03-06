import React, { useEffect, useState, useCallback, Fragment } from 'react';
import {
  CForm, CFormInput, CFormSelect, CButton, CCard, CCardBody, CCardHeader,
  CCol, CRow, CContainer, CTable, CTableHead, CTableRow, CTableHeaderCell,
  CTableBody, CTableDataCell, CSpinner, CModal, CModalHeader, CModalTitle,
  CModalBody, CModalFooter, CFormLabel, CFormFeedback, CFormSwitch,
  CPagination, CPaginationItem
} from '@coreui/react';
import { CIcon } from '@coreui/icons-react'; 
import { 
  cilPlus, cilSearch, cilTrash, cilChevronBottom, cilChevronTop, 
  cilTags, cilChevronLeft, cilChevronRight, 
  cilDollar
} from '@coreui/icons'; 
import { createClient } from "../../../supabase/client"; 
import { toast } from "sonner"; 

const VentasCoreUI = () => {
  const supabase = createClient();

  // Estados de Datos
  const [ventas, setVentas] = useState([]);
  const [productos, setProductos] = useState([]);
  const [clientes, setClientes] = useState([]); 
  
  // Estados de Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const PAGE_SIZE = 11;

  // Estados de UI
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [expandedRows, setExpandedRows] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [validated, setValidated] = useState(false);

  // Estados del formulario
  const [clienteId, setClienteId] = useState('');
  const [notas, setNotas] = useState('');
  const [items, setItems] = useState([]); 
  const [esCredito, setEsCredito] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const from = (currentPage - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      // 1. Cargar Ventas Paginadas con búsqueda (si aplica)
      let query = supabase
        .from("ventas_salidas")
        .select(`
          *,
          clientes ( nombre ),
          ventas_detalle (
            id, producto_id, cantidad, precio_unitario, subtotal,
            productos ( nombre, sku )
          )
        `, { count: 'exact' });

      if (searchTerm) {
        // Nota: El filtrado por relación 'clientes.nombre' en Supabase 
        // requiere configuraciones específicas, aquí filtramos por la tabla principal
        query = query.or(`notas.ilike.%${searchTerm}%`);
      }

      const { data: ventasData, count, error: ventasError } = await query
        .order("created_at", { ascending: false })
        .range(from, to);

      if (ventasError) throw ventasError;

      // 2. Cargar Productos y Clientes (estos suelen ser listas completas para selectores)
      const { data: productosData } = await supabase
        .from("productos")
        .select("*")
        .gt("stock_actual", 0) 
        .order("nombre", { ascending: true });

      const { data: clientesData } = await supabase
        .from("clientes")
        .select("id, nombre, identificacion")
        .order("nombre", { ascending: true });

      setVentas(ventasData || []);
      setTotalRecords(count || 0);
      setProductos(productosData || []);
      setClientes(clientesData || []);
    } catch (error) {
      toast.error("Error de conexión", { description: error.message });
    } finally {
      setLoading(false);
    }
  }, [supabase, currentPage, searchTerm]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Resetear a pág 1 cuando se busca
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  // --- Lógica de Carrito ---
  const addItem = (productoId) => {
    const producto = productos.find((p) => String(p.id) === String(productoId));
    if (!producto) return;
    if (items.some((i) => i.producto_id === producto.id)) {
      toast.warning("El producto ya está en el carrito");
      return;
    }
    setItems([...items, {
      producto_id: producto.id,
      nombre: producto.nombre,
      cantidad: 1,
      precio_unitario: Number(producto.precio_venta),
      max_stock: producto.stock_actual
    }]);
  };

  const updateItem = (index, field, value) => {
    const newItems = [...items];
    newItems[index][field] = value;
    setItems(newItems);
  };

  const totalVenta = items.reduce((acc, item) => acc + (item.cantidad * item.precio_unitario), 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setValidated(true);
    if (!clienteId || items.length === 0) return;

    setLoading(true);
    try {
      const p_items_json = items.map(item => ({
        producto_id: item.producto_id,
        cantidad: parseInt(item.cantidad),
        precio_unitario: parseFloat(item.precio_unitario)
      }));

      const { error } = await supabase.rpc("registrar_venta", {
        p_cliente_id: clienteId, 
        p_notas: notas.trim() || null,
        p_items: p_items_json,
        p_es_credito: esCredito 
      });

      if (error) throw error;

      toast.success("Venta registrada con éxito");
      handleCancel();
      fetchData();
    } catch (error) {
      toast.error("Error al registrar venta", { description: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setClienteId('');
    setNotas('');
    setItems([]);
    setEsCredito(false);
    setModalVisible(false);
    setValidated(false);
  };

  const totalPages = Math.ceil(totalRecords / PAGE_SIZE);

  return (
    <CContainer>
      <CCard className="mb-4 shadow-lg border-0 overflow-hidden w-100" style={{ borderRadius: '16px' }}>
        <CCardHeader className="bg-primary text-white py-3">
          <h2 className="fw-bold text-white d-flex align-items-center m-0 fs-4 text-uppercase">
            <CIcon icon={cilDollar} className="me-2 " />
            Ventas / salidas de inventario
          </h2>
        </CCardHeader>
      </CCard>

      <CCard className="mb-4 shadow-lg border-0" style={{ borderRadius: '16px' }}>
        <CCardHeader className="py-3 border-bottom-0">
          <div className="d-flex justify-content-between align-items-center">
            <div className="d-flex align-items-center rounded-pill px-3 py-1" style={{ width: '400px' }}>
              <CIcon icon={cilSearch} className="text-muted me-2" />
              <CFormInput
                placeholder="Buscar por notas..."
                className="border-0 bg-transparent shadow-none"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <CButton color="success" className="text-white rounded-pill px-4" onClick={() => setModalVisible(true)}>
              <CIcon icon={cilPlus} className="me-2" /> Nueva Venta
            </CButton>
          </div>
        </CCardHeader>

        <CCardBody className="px-4">
          <CTable hover responsive align="middle" className="mb-0">
            <CTableHead>
              <CTableRow>
                <CTableHeaderCell className="text-muted small text-uppercase" width="50"></CTableHeaderCell>
                <CTableHeaderCell className="text-muted small text-uppercase">Fecha</CTableHeaderCell>
                <CTableHeaderCell className="text-muted small text-uppercase">Cliente</CTableHeaderCell>
                <CTableHeaderCell className="text-end text-muted small text-uppercase">Total</CTableHeaderCell>
              </CTableRow>
            </CTableHead>
            <CTableBody>
              {loading && ventas.length === 0 ? (
                <CTableRow><CTableDataCell colSpan="4" className="text-center py-5"><CSpinner color="primary" /></CTableDataCell></CTableRow>
              ) : ventas.map((v) => (
                <Fragment key={v.id}>
                  <CTableRow onClick={() => {
                    setExpandedRows(prev => prev.includes(v.id) ? prev.filter(id => id !== v.id) : [...prev, v.id])
                  }} style={{ cursor: 'pointer' }}>
                    <CTableDataCell>
                      <CIcon icon={expandedRows.includes(v.id) ? cilChevronTop : cilChevronBottom} />
                    </CTableDataCell>
                    <CTableDataCell>{new Date(v.created_at).toLocaleString()}</CTableDataCell>
                    <CTableDataCell>
                      <strong>{v.clientes?.nombre || 'Venta General'}</strong>
                    </CTableDataCell>
                    <CTableDataCell className="text-end fw-bold text-success">
                      ${Number(v.total).toFixed(2)}
                    </CTableDataCell>
                  </CTableRow>
                  
                  {expandedRows.includes(v.id) && (
                    <CTableRow>
                      <CTableDataCell colSpan="4" className="bg-light p-3">
                        <CTable bordered size="sm" className="bg-white mb-0 shadow-sm">
                          <thead>
                            <tr>
                              <th className="small text-muted">Producto</th>
                              <th className="text-center small text-muted">Cant.</th>
                              <th className="text-end small text-muted">Precio</th>
                              <th className="text-end small text-muted">Subtotal</th>
                            </tr>
                          </thead>
                          <tbody>
                            {v.ventas_detalle?.map(d => (
                              <tr key={d.id}>
                                <td className="small">{d.productos?.nombre}</td>
                                <td className="text-center small">{d.cantidad}</td>
                                <td className="text-end small">${Number(d.precio_unitario).toFixed(2)}</td>
                                <td className="text-end small">${Number(d.subtotal).toFixed(2)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </CTable>
                      </CTableDataCell>
                    </CTableRow>
                  )}
                </Fragment>
              ))}
            </CTableBody>
          </CTable>

          {/* COMPONENTE DE PAGINACIÓN */}
          {!loading && totalPages > 1 && (
            <div className="d-flex justify-content-between align-items-center mt-4">
              <span className="text-muted small">Mostrando {ventas.length} de {totalRecords} ventas</span>
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

      {/* MODAL NUEVA VENTA (Sin cambios en lógica interna) */}
      <CModal visible={modalVisible} onClose={handleCancel} size="lg" alignment="center" backdrop="static">
        <CForm noValidate validated={validated} onSubmit={handleSubmit}>
          <CModalHeader className="bg-primary text-white border-0 py-3">
            <CModalTitle className="fw-bold text-white m-0 fs-5">Registrar Salida de Inventario</CModalTitle>
          </CModalHeader>
          <CModalBody className="p-4">
            <CRow className="mb-3">
              <CCol md={8}>
                <CFormLabel className="fw-bold text-muted small mb-2 ms-1">Cliente *</CFormLabel>
                <CFormSelect
                  value={clienteId}
                  onChange={e => {
                    setClienteId(e.target.value);
                    if(e.target.value === '00000000-0000-0000-0000-000000000001') setEsCredito(false);
                  }}
                  required
                  className="border shadow-sm py-2 px-3"
                  style={{ borderRadius: '12px' }}
                >
                  <option value="">Seleccione un cliente...</option>
                  {clientes.map(c => (
                    <option key={c.id} value={c.id}>{c.nombre} ({c.identificacion})</option>
                  ))}
                </CFormSelect>
              </CCol>
              
              <CCol md={4} className="d-flex align-items-end">
                <div className="p-2 border w-100 bg-light shadow-sm d-flex align-items-center justify-content-center" style={{ borderRadius: '12px', height: '42px' }}>
                  <CFormSwitch
                    label="¿Venta a Crédito?"
                    id="es_credito"
                    checked={esCredito}
                    onChange={(e) => setEsCredito(e.target.checked)}
                    disabled={!clienteId || clienteId === '00000000-0000-0000-0000-000000000001'}
                    style={{ cursor: 'pointer' }}
                  />
                </div>
              </CCol>
            </CRow>

            <div className="bg-light p-3 rounded mb-3 border" style={{ borderRadius: '12px' }}>
              <h6 className="fw-bold text-muted small mb-2">Agregar productos</h6>
              <CFormSelect
                onChange={(e) => addItem(e.target.value)}
                className="border shadow-sm py-2 px-3"
                style={{ borderRadius: '12px' }}
              >
                <option value="">Seleccione un repuesto...</option>
                {productos.map(p => (
                  <option key={p.id} value={p.id}>{p.nombre} (Stock: {p.stock_actual})</option>
                ))}
              </CFormSelect>

              <CTable small className="mt-3 align-middle mb-0">
                <tbody>
                  {items.map((item, index) => (
                    <tr key={index}>
                      <td>{item.nombre}</td>
                      <td width="100">
                        <CFormInput
                          type="number"
                          size="sm"
                          value={item.cantidad}
                          max={item.max_stock}
                          min={1}
                          onChange={e => updateItem(index, 'cantidad', parseInt(e.target.value) || 0)}
                        />
                      </td>
                      <td className="text-end fw-bold">${(item.cantidad * item.precio_unitario).toFixed(2)}</td>
                      <td width="50">
                        <CButton color="danger" variant="ghost" size="sm" onClick={() => setItems(items.filter((_, i) => i !== index))}>
                          <CIcon icon={cilTrash} />
                        </CButton>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </CTable>
              <div className="text-end border-top pt-2 mt-2">
                <h5 className="mb-0">Total: <span className="text-success">${totalVenta.toFixed(2)}</span></h5>
              </div>
            </div>

            <CFormLabel className="fw-bold text-muted small mb-2 ms-1">Notas</CFormLabel>
            <CFormInput
              value={notas}
              onChange={e => setNotas(e.target.value)}
              placeholder="Opcional"
              className="border shadow-sm py-2 px-3"
              style={{ borderRadius: '12px' }}
            />
          </CModalBody>
          <CModalFooter className="border-0 p-4 pt-0 d-flex gap-3 bg-light">
            <CButton type="button" color="secondary" variant="ghost" className="flex-grow-1 py-2 fw-bold" onClick={handleCancel}>
              Cancelar
            </CButton>
            <CButton type="submit" color="primary" className="flex-grow-1 py-2 fw-bold text-white shadow-sm" style={{ borderRadius: '12px' }} disabled={loading || items.length === 0}>
              {loading ? <CSpinner size="sm" /> : 'Confirmar Venta'}
            </CButton>
          </CModalFooter>
        </CForm>
      </CModal>
    </CContainer>
  );
};

export default VentasCoreUI;