import React, { useEffect, useState, useCallback, Fragment } from 'react';
import {
  CForm, CFormInput, CFormSelect, CButton, CCard, CCardBody, CCardHeader,
  CCol, CRow, CContainer, CTable, CTableHead, CTableRow, CTableHeaderCell,
  CTableBody, CTableDataCell, CSpinner, CModal, CModalHeader, CModalTitle,
  CModalBody, CModalFooter, CFormLabel, CFormSwitch,
  CPagination, CPaginationItem, CBadge
} from '@coreui/react';
import { CIcon } from '@coreui/icons-react'; 
import { 
  cilPlus, cilSearch, cilTrash, cilChevronBottom, cilChevronTop, 
  cilChevronLeft, cilChevronRight, cilDollar, cilCalendar
} from '@coreui/icons'; 
import { createClient } from "../../../supabase/client"; 
import { toast } from "sonner"; 
import Select from 'react-select';

const VentasCoreUI = () => {
  const supabase = createClient();

  // --- Estados de Datos ---
  const [ventas, setVentas] = useState([]);
  const [productos, setProductos] = useState([]);
  const [clientes, setClientes] = useState([]); 
  
  // --- Estados de Paginación y Filtros (Lógica Unificada) ---
  const [currentPage, setCurrentPage] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const PAGE_SIZE = 8;
  const [filters, setFilters] = useState({
    search: '',
  });

  // --- Estados de UI ---
  const [loading, setLoading] = useState(false);
  const [expandedRows, setExpandedRows] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [validated, setValidated] = useState(false);

  // --- Estados del formulario ---
  const [clienteId, setClienteId] = useState('');
  const [notas, setNotas] = useState('');
  const [items, setItems] = useState([]); 
  const [esCredito, setEsCredito] = useState(false);
  const [fechaVencimiento, setFechaVencimiento] = useState(''); 
  const [tipoPago, setTipoPago] = useState('efectivo');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const from = (currentPage - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      // 1. Consultamos a la VISTA 'ventas_con_detalles'
      let query = supabase
        .from("ventas_con_detalles")
        .select(`
          *,
          ventas_detalle (
            id, producto_id, cantidad, precio_unitario, subtotal,
            productos ( nombre, sku )
          )
        `, { count: 'exact' });

      // 2. Lógica de filtrado adaptada (Busca en nombre de cliente, RIF y notas)
      if (filters.search) {
        query = query.or(`nombre_cliente.ilike.%${filters.search}%, cliente_rif.ilike.%${filters.search}%, notas.ilike.%${filters.search}%`);
      }

      const { data: ventasData, count, error: ventasError } = await query
        .order("created_at", { ascending: false })
        .range(from, to);

      if (ventasError) throw ventasError;

      // Carga de catálogos para el formulario
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
  }, [supabase, currentPage, filters]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

  // --- Lógica de Carrito y Precios ---
  const handleToggleCredito = (checked) => {
    setEsCredito(checked);
    if (!checked) setFechaVencimiento('');

    const updatedItems = items.map(item => {
      const prodOriginal = productos.find(p => p.id === item.producto_id);
      return {
        ...item,
        precio_unitario: checked 
          ? Number(prodOriginal.precio_credito) 
          : Number(prodOriginal.precio_venta)
      };
    });
    setItems(updatedItems);
  };

  const addItem = (productoId) => {
    const producto = productos.find((p) => String(p.id) === String(productoId));
    if (!producto) return false;
    
    if (items.some((i) => i.producto_id === producto.id)) {
      toast.warning("El producto ya está en el carrito");
      return false;
    }

    const precioActual = esCredito ? Number(producto.precio_credito) : Number(producto.precio_venta);

    setItems([...items, {
      producto_id: producto.id,
      nombre: producto.nombre,
      cantidad: 1,
      precio_unitario: precioActual,
      max_stock: producto.stock_actual
    }]);
    return true; 
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
    if (esCredito && !fechaVencimiento) {
      toast.error("Debe especificar una fecha de vencimiento");
      return;
    }

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
        p_es_credito: esCredito,
        p_fecha_vencimiento: esCredito ? fechaVencimiento : null,
        p_tipo_pago: tipoPago 
      });

      if (error) throw error;

      toast.success("Venta registrada con éxito");
      handleCancel();
      fetchData();
    } catch (error) {
      toast.error("Error al registrar", { description: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setClienteId('');
    setNotas('');
    setItems([]);
    setEsCredito(false);
    setFechaVencimiento('');
    setTipoPago('efectivo');
    setModalVisible(false);
    setValidated(false);
  };

  const totalPages = Math.ceil(totalRecords / PAGE_SIZE);

  // --- Configuraciones de Selects ---
  const productOptions = productos.map(p => ({
    value: p.id,
    label: `${p.nombre} (Stock: ${p.stock_actual}) - $${esCredito ? p.precio_credito : p.precio_venta}`
  }));

  const clientOptions = clientes.map(c => ({
    value: c.id,
    label: `${c.nombre} ${c.identificacion ? `(${c.identificacion})` : ''}`
  }));

  const customSelectStyles = {
    control: (base) => ({
      ...base,
      borderRadius: '50rem',
      borderColor: '#dee2e6',
      padding: '2px',
      boxShadow: 'none',
      '&:hover': { borderColor: '#b3d7ff' }
    })
  };

  return (
    <CContainer fluid className="px-4">
      {/* HEADER */}
      <CCard className="mb-4 shadow-lg border-0 overflow-hidden w-100" style={{ borderRadius: '16px' }}>
        <CCardHeader className="bg-primary text-white py-3">
          <h2 className="fw-bold text-white d-flex align-items-center m-0 fs-4 text-uppercase">
            <CIcon icon={cilDollar} className="me-2" />
            Ventas / Salidas de Inventario
          </h2>
        </CCardHeader>
      </CCard>

      {/* FILTROS Y BUSQUEDA */}
      <CCard className="mb-4 shadow-lg border-0" style={{ borderRadius: '16px' }}>
        <CCardHeader className="py-3 border-bottom-0">
          <div className="d-flex justify-content-between align-items-center">
            <div className="d-flex bg-body-secondary align-items-center rounded-pill px-3 py-1" style={{ width: '400px' }}>
              <CIcon icon={cilSearch} className="text-muted me-2" />
              <CFormInput
                placeholder="Buscar cliente, identificación o notas..."
                className="border-0 bg-transparent shadow-none"
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
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
                <CTableHeaderCell width="50"></CTableHeaderCell>
                <CTableHeaderCell className="text-muted small text-uppercase">Fecha</CTableHeaderCell>
                <CTableHeaderCell className="text-muted small text-uppercase">Cliente</CTableHeaderCell>
                <CTableHeaderCell className="text-muted small text-uppercase">Tipo</CTableHeaderCell>
                <CTableHeaderCell className="text-muted small text-uppercase">Total</CTableHeaderCell>
                <CTableHeaderCell className="text-end text-muted small text-uppercase">Notas</CTableHeaderCell>
              </CTableRow>
            </CTableHead>
            <CTableBody>
              {loading ? (
                <CTableRow><CTableDataCell colSpan="6" className="text-center py-5"><CSpinner color="primary" /></CTableDataCell></CTableRow>
              ) : ventas.length === 0 ? (
                <CTableRow><CTableDataCell colSpan="6" className="text-center py-5 text-muted">No se encontraron registros</CTableDataCell></CTableRow>
              ) : ventas.map((v) => (
                <Fragment key={v.id}>
                  <CTableRow 
                    onClick={() => setExpandedRows(prev => prev.includes(v.id) ? prev.filter(id => id !== v.id) : [...prev, v.id])} 
                    style={{ cursor: 'pointer' }}
                  >
                    <CTableDataCell>
                      <CIcon icon={expandedRows.includes(v.id) ? cilChevronTop : cilChevronBottom} className="text-primary" />
                    </CTableDataCell>
                    <CTableDataCell>
                      <div className="small fw-bold">{new Date(v.created_at).toLocaleDateString('es-ES')}</div>
                      <div className="text-muted small">{new Date(v.created_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', hour12: true })}</div>
                    </CTableDataCell>
                    {/* USO DE LOS CAMPOS DE LA VISTA */}
                    <CTableDataCell>
                      <div className="fw-bold">{v.nombre_cliente || 'Venta General'}</div>
                      <div className="text-muted extra-small">{v.cliente_rif}</div>
                    </CTableDataCell>
                    <CTableDataCell>
                      <CBadge color={v.es_credito ? 'warning' : 'info'} shape="rounded-pill">
                        {v.es_credito ? 'CRÉDITO' : 'CONTADO'}
                      </CBadge>
                    </CTableDataCell>
                    <CTableDataCell className="fw-bold text-success">${Number(v.total).toFixed(2)}</CTableDataCell>
                    <CTableDataCell className="text-end text-truncate" style={{ maxWidth: '150px' }}>{v.notas}</CTableDataCell>
                  </CTableRow>
                  
                  {/* DETALLE EXPANDIBLE */}
                  {expandedRows.includes(v.id) && (
                    <CTableRow>
                      <CTableDataCell colSpan="6" className="bg-body-secondary p-3">
                        <CRow>
                          <CCol md={8}>
                            <h6 className="small fw-bold text-muted">DETALLE DE PRODUCTOS</h6>
                            <CTable bordered size="sm" className="bg-body shadow-sm">
                              <thead>
                                <tr className="bg-body">
                                  <th>Producto</th>
                                  <th className="text-center">Cant.</th>
                                  <th className="text-end">Precio</th>
                                  <th className="text-end">Subtotal</th>
                                </tr>
                              </thead>
                              <tbody>
                                {v.ventas_detalle?.map(d => (
                                  <tr key={d.id}>
                                    <td>{d.productos?.nombre}</td>
                                    <td className="text-center">{d.cantidad}</td>
                                    <td className="text-end">${Number(d.precio_unitario).toFixed(2)}</td>
                                    <td className="text-end">${Number(d.subtotal).toFixed(2)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </CTable>
                          </CCol>
                          <CCol md={4}>
                            <h6 className="small fw-bold text-muted">INFORMACIÓN ADICIONAL</h6>
                            <div className="p-2 border rounded bg-body">
                                <div className="mb-2 text-info small">
                                  <strong>Método de pago:</strong> <span className="text-uppercase fw-bold">{v.tipo_pago || 'N/A'}</span>
                                </div>
                                {v.es_credito && (
                                    <div className="mb-2 text-danger small">
                                        <CIcon icon={cilCalendar} className="me-1"/> 
                                        <strong>Vence:</strong> {v.fecha_vencimiento ? new Date(v.fecha_vencimiento + 'T12:00:00').toLocaleDateString() : 'N/A'}
                                    </div>
                                )}
                                <p className="small mb-0 text-muted">{v.notas || 'Sin notas'}</p>
                            </div>
                          </CCol>
                        </CRow>
                      </CTableDataCell>
                    </CTableRow>
                  )}
                </Fragment>
              ))}
            </CTableBody>
          </CTable>

          {/* PAGINACIÓN INTELIGENTE */}
                    {!loading && totalPages > 1 && (
                      <div className="d-flex justify-content-between align-items-center mt-4">
                        <div className="text-muted small">
                          Página {currentPage} de {totalPages} ({totalRecords} clientes)
                        </div>
                        <CPagination align="end" className="mb-0">
                          <CPaginationItem 
                            disabled={currentPage === 1} 
                            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                            style={{ cursor: 'pointer' }}
                          >
                            <CIcon icon={cilChevronLeft} />
                          </CPaginationItem>
          
                          {(() => {
                            const pages = [];
                            const leftSide = Math.max(1, currentPage - 1);
                            const rightSide = Math.min(totalPages, currentPage + 1);
          
                            pages.push(
                              <CPaginationItem key={1} active={currentPage === 1} onClick={() => setCurrentPage(1)}>1</CPaginationItem>
                            );
          
                            if (leftSide > 2) pages.push(<CPaginationItem key="dots-l" disabled>...</CPaginationItem>);
          
                            for (let i = leftSide; i <= rightSide; i++) {
                              if (i !== 1 && i !== totalPages) {
                                pages.push(
                                  <CPaginationItem key={i} active={currentPage === i} onClick={() => setCurrentPage(i)}>{i}</CPaginationItem>
                                );
                              }
                            }
          
                            if (rightSide < totalPages - 1) pages.push(<CPaginationItem key="dots-r" disabled>...</CPaginationItem>);
          
                            if (totalPages > 1) {
                              pages.push(
                                <CPaginationItem key={totalPages} active={currentPage === totalPages} onClick={() => setCurrentPage(totalPages)}>{totalPages}</CPaginationItem>
                              );
                            }
                            return pages;
                          })()}
          
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

      {/* MODAL NUEVA VENTA */}
      <CModal visible={modalVisible} onClose={handleCancel} size="lg" alignment="center" backdrop="static">
        <CForm noValidate validated={validated} onSubmit={handleSubmit}>
          <CModalHeader className="bg-primary text-white py-3">
            <CModalTitle className="fw-bold text-white m-0 fs-5">Registrar Salida de Inventario</CModalTitle>
          </CModalHeader>
          <CModalBody className="p-4">
            <CRow className="mb-3">
              <CCol md={6}>
                <CFormLabel className="fw-bold text-muted small mb-2">Cliente *</CFormLabel>
                <Select
                  options={clientOptions}
                  value={clientOptions.find(opt => opt.value === clienteId) || null}
                  placeholder="Seleccione un cliente..."
                  isSearchable
                  onChange={(option) => setClienteId(option ? option.value : '')}
                  styles={customSelectStyles}
                />
              </CCol>
              <CCol md={3} className="d-flex align-items-end">
                <div className="p-2 border w-100 bg-body-secondary rounded-pill d-flex align-items-center justify-content-center" style={{ height: '38px' }}>
                  <CFormSwitch
                    label="Crédito"
                    id="es_credito"
                    checked={esCredito}
                    onChange={(e) => handleToggleCredito(e.target.checked)}
                    disabled={!clienteId}
                  />
                </div>
              </CCol>
              <CCol md={3}>
                <CFormLabel className="fw-bold text-muted small mb-2">Plazo Pago</CFormLabel>
                <CFormInput type="date" value={fechaVencimiento} onChange={e => setFechaVencimiento(e.target.value)} disabled={!esCredito} required={esCredito} className="rounded-pill" />
              </CCol>
            </CRow>

            <CRow className="mb-3">
              <CCol md={6}>
                <CFormLabel className="fw-bold text-muted small mb-2">Tipo de Pago *</CFormLabel>
                <CFormSelect value={tipoPago} onChange={e => setTipoPago(e.target.value)} className="rounded-pill">
                  <option value="efectivo">Efectivo</option>
                  <option value="pago movil">Pago Móvil</option>
                  <option value="transferencia">Transferencia</option>
                  <option value="zelle">Zelle</option>
                </CFormSelect>
              </CCol>
            </CRow>

            <div className="bg-body-tertiary p-3 rounded mb-3 border" style={{ borderRadius: '12px' }}>
              <h6 className="fw-bold text-muted small mb-2">Agregar Productos</h6>
              <Select
                className="mb-3"
                options={productOptions}
                value={null} 
                placeholder="Escribe para buscar un repuesto..."
                isSearchable
                onChange={(opt) => opt && addItem(opt.value)}
                styles={customSelectStyles}
              />

              <CTable small borderless className="align-middle mb-0">
                <thead>
                   <tr className="border-bottom text-muted small">
                     <th>Producto</th>
                     <th width="100">Cant.</th>
                     <th className="text-end">Subtotal</th>
                     <th width="40"></th>
                   </tr>
                </thead>
                <tbody>
                  {items.map((item, index) => (
                    <tr key={index}>
                      <td className="small py-2">{item.nombre}</td>
                      <td>
                        <CFormInput type="number" size="sm" value={item.cantidad} onChange={e => updateItem(index, 'cantidad', parseInt(e.target.value) || 0)} />
                      </td>
                      <td className="text-end fw-bold small">${(item.cantidad * item.precio_unitario).toFixed(2)}</td>
                      <td>
                        <CButton color="danger" variant="ghost" size="sm" onClick={() => setItems(items.filter((_, i) => i !== index))}><CIcon icon={cilTrash} /></CButton>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </CTable>
              <div className="text-end border-top pt-2 mt-2">
                <h5 className="mb-0 fw-bold text-primary">Total Venta: ${totalVenta.toFixed(2)}</h5>
              </div>
            </div>

            <CFormLabel className="fw-bold text-muted small mb-2">Notas / Referencia</CFormLabel>
            <CFormInput value={notas} onChange={e => setNotas(e.target.value)} placeholder="Ej. Pago movil ref 1234" className="rounded-pill px-3" />
          </CModalBody>
          <CModalFooter className="border-0 p-4 pt-0 d-flex gap-3 bg-body-secondary">
            <CButton type="button" color="secondary" variant="ghost" className="flex-grow-1" onClick={handleCancel}>Cancelar</CButton>
            <CButton type="submit" color="primary" className="flex-grow-1 text-white shadow-sm" disabled={loading || items.length === 0}>
              {loading ? <CSpinner size="sm" /> : 'Confirmar Registro'}
            </CButton>
          </CModalFooter>
        </CForm>
      </CModal>
    </CContainer>
  );
};

export default VentasCoreUI;