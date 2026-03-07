import React, { useEffect, useState, useCallback } from 'react';
import {
  CButton, CCard, CCardBody, CCardHeader, CCol, CRow, CContainer, 
  CTable, CTableHead, CTableRow, CTableHeaderCell, CTableBody, 
  CTableDataCell, CFormSelect, CFormInput, CSpinner, CFormLabel,
  CFormCheck, CFormTextarea, CBadge, CFormFeedback
} from '@coreui/react';
import { CIcon } from '@coreui/icons-react';
import { 
  cilCart, cilCheckCircle, cilTrash, cilUser, 
  cilWallet, cilNotes, cilWarning 
} from '@coreui/icons';
import { createClient } from "../../../supabase/client"; 
import { toast } from "sonner";

const VentasEmpleado = () => {
  const supabase = createClient();

  const [empleados, setEmpleados] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [empleadoId, setEmpleadoId] = useState('');
  const [clienteId, setClienteId] = useState('');
  const [stockDisponible, setStockDisponible] = useState([]);
  const [carrito, setCarrito] = useState([]);
  
  const [esCredito, setEsCredito] = useState(false);
  const [notas, setNotas] = useState('');
  const [tipoPago, setTipoPago] = useState('efectivo');
  const [fechaVencimiento, setFechaVencimiento] = useState('');

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [itemNuevo, setItemNuevo] = useState({ producto_id: '', cantidad: 1, stockMax: 0, nombre: '', precio: 0 });
  const [excesoStock, setExcesoStock] = useState(false);

  const loadData = useCallback(async () => {
    const { data: emp } = await supabase.from('empleados').select('*').eq('activo', true).order('nombre');
    const { data: cli } = await supabase.from('clientes').select('id, nombre').order('nombre');
    setEmpleados(emp || []);
    setClientes(cli || []);
  }, [supabase]);

  const fetchStockVenta = useCallback(async (id) => {
    if (!id) {
      setStockDisponible([]);
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from('inventario_empleados')
      .select(`producto_id, cantidad_actual, productos ( nombre, precio_venta )`)
      .eq('empleado_id', id).gt('cantidad_actual', 0);
    setStockDisponible(data || []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { loadData(); }, [loadData]);
  useEffect(() => { fetchStockVenta(empleadoId); }, [empleadoId, fetchStockVenta]);

  // Validación de cantidad en tiempo real
  const handleCantidadChange = (val) => {
    const cant = parseInt(val) || 0;
    setItemNuevo(prev => ({ ...prev, cantidad: val }));
    
    if (cant > itemNuevo.stockMax) {
      setExcesoStock(true);
    } else {
      setExcesoStock(false);
    }
  };

  const agregarAlCarrito = () => {
    if (!itemNuevo.producto_id) return toast.error("Seleccione un producto");
    if (excesoStock) return toast.error("No puedes superar el stock disponible");
    if (itemNuevo.cantidad <= 0) return toast.error("Cantidad inválida");

    const existe = carrito.find(c => c.producto_id === itemNuevo.producto_id);
    if (existe) {
      const nuevaCant = existe.cantidad + parseInt(itemNuevo.cantidad);
      if (nuevaCant > itemNuevo.stockMax) return toast.error("La suma excede el stock total");
      setCarrito(carrito.map(c => c.producto_id === itemNuevo.producto_id ? { ...c, cantidad: nuevaCant } : c));
    } else {
      setCarrito([...carrito, { ...itemNuevo, cantidad: parseInt(itemNuevo.cantidad) }]);
    }
    
    setItemNuevo({ producto_id: '', cantidad: 1, stockMax: 0, nombre: '', precio: 0 });
    setExcesoStock(false);
    toast.success("Añadido al carrito");
  };

  const totalVenta = carrito.reduce((acc, item) => acc + (item.precio * item.cantidad), 0);

  const finalizarVenta = async () => {
    if (!empleadoId || !clienteId || carrito.length === 0) {
      return toast.error("Complete los datos obligatorios");
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.rpc('registrar_venta_empleado', {
        p_empleado_id: empleadoId,
        p_cliente_id: clienteId,
        p_items: carrito.map(item => ({
          producto_id: item.producto_id,
          cantidad: item.cantidad,
          precio_unitario: item.precio
        })),
        p_notas: notas,
        p_es_credito: esCredito,
        p_fecha_vencimiento: esCredito ? fechaVencimiento : null,
        p_tipo_pago: tipoPago
      });

      if (error) throw error;

      toast.success("Venta realizada con éxito");
      setCarrito([]);
      setEmpleadoId('');
      setClienteId('');
      setNotas('');
    } catch (error) {
      toast.error("Error: " + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <CContainer className="pb-5">
      {/* HEADER IDÉNTICO A PRODUCTOS */}
      <CCard className="mb-4 shadow-lg border-0 overflow-hidden w-100" style={{ borderRadius: '16px' }}>
        <CCardHeader className="bg-primary text-white py-3">
          <h2 className="fw-bold text-white d-flex align-items-center m-0 fs-4 text-uppercase">
            <CIcon icon={cilCart} className="me-2" /> Punto de Venta (Vendedores)
          </h2>
        </CCardHeader>
      </CCard>

      <CRow>
        <CCol lg={8}>
          {/* SELECCIÓN DE ACTORES */}
          <CCard className="mb-4 shadow-lg border-0" style={{ borderRadius: '16px' }}>
            <CCardHeader className="py-3 border-bottom-0 bg-body-tertiary">
              <span className="fw-bold text-body-primary text-uppercase small">Configuración de Venta</span>
            </CCardHeader>
            <CCardBody className="px-4">
              <CRow className="g-3">
                <CCol md={6}>
                  <CFormLabel className="small fw-bold">Vendedor Responsable *</CFormLabel>
                  <CFormSelect 
                    value={empleadoId} 
                    onChange={(e) => setEmpleadoId(e.target.value)}
                    className="border-0 bg-body-secondary rounded-pill"
                  >
                    <option value="">Seleccione vendedor...</option>
                    {empleados.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}
                  </CFormSelect>
                </CCol>
                <CCol md={6}>
                  <CFormLabel className="small fw-bold">Cliente *</CFormLabel>
                  <CFormSelect 
                    value={clienteId} 
                    onChange={(e) => setClienteId(e.target.value)}
                    className="border-0 bg-body-secondary rounded-pill"
                  >
                    <option value="">Seleccione cliente...</option>
                    {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                  </CFormSelect>
                </CCol>
              </CRow>

              <hr className="my-4" />

              {/* AGREGAR PRODUCTOS */}
              <div className={`p-3 rounded-4 ${!empleadoId ? 'bg-body-secondary' : 'bg-body-secondary border border-primary border-opacity-10'}`}>
                <CRow className="g-2 align-items-end">
                  <CCol md={7}>
                    <CFormLabel className="small fw-bold">Producto en Stock</CFormLabel>
                    <CFormSelect 
                      disabled={!empleadoId || loading}
                      value={itemNuevo.producto_id}
                      className="border-0 shadow-sm rounded-pill"
                      onChange={(e) => {
                        const p = stockDisponible.find(x => x.producto_id === e.target.value);
                        setItemNuevo({
                          producto_id: e.target.value,
                          nombre: p?.productos?.nombre,
                          precio: p?.productos?.precio_venta,
                          stockMax: p?.cantidad_actual,
                          cantidad: 1
                        });
                        setExcesoStock(false);
                      }}
                    >
                      <option value="">{loading ? 'Cargando...' : 'Seleccione repuesto...'}</option>
                      {stockDisponible.map(s => (
                        <option key={s.producto_id} value={s.producto_id}>{s.productos?.nombre} (Disp: {s.cantidad_actual})</option>
                      ))}
                    </CFormSelect>
                  </CCol>
                  <CCol md={2}>
                    <CFormLabel className="small fw-bold">Cantidad</CFormLabel>
                    <CFormInput 
                    disabled={!empleadoId || loading}
                      type="number" 
                      value={itemNuevo.cantidad} 
                      className="border-0 shadow-sm text-body rounded-pill text-center"
                      onChange={(e) => handleCantidadChange(e.target.value)}
                    />
                  </CCol>
                  <CCol md={3}>
                    <CButton 
                      color="primary" 
                      className="w-100 rounded-pill fw-bold text-white"
                      disabled={!itemNuevo.producto_id || excesoStock}
                      onClick={agregarAlCarrito}
                    >
                      Añadir
                    </CButton>
                  </CCol>
                </CRow>
                {excesoStock && (
                  <div className="text-danger small mt-2 fw-bold d-flex align-items-center">
                    <CIcon icon={cilWarning} className="me-1" /> No puedes vender más de {itemNuevo.stockMax} unidades.
                  </div>
                )}
              </div>
            </CCardBody>
          </CCard>

          {/* TABLA DE CARRITO ESTILO PRODUCTOS */}
          <CCard className="shadow-lg border-0" style={{ borderRadius: '16px' }}>
            <CCardBody className="p-0 overflow-hidden">
              <CTable hover responsive align="middle" className="mb-0">
                <CTableHead className="bg-light">
                  <CTableRow>
                    <CTableHeaderCell className="text-muted small text-uppercase ps-4">Producto</CTableHeaderCell>
                    <CTableHeaderCell className="text-muted small text-uppercase text-center">Cant.</CTableHeaderCell>
                    <CTableHeaderCell className="text-muted small text-uppercase">Precio</CTableHeaderCell>
                    <CTableHeaderCell className="text-muted small text-uppercase text-end pe-4">Acciones</CTableHeaderCell>
                  </CTableRow>
                </CTableHead>
                <CTableBody>
                  {carrito.length === 0 ? (
                    <CTableRow>
                      <CTableDataCell colSpan="4" className="text-center py-5 text-muted">
                        El carrito está vacío
                      </CTableDataCell>
                    </CTableRow>
                  ) : (
                    carrito.map((item) => (
                      <CTableRow key={item.producto_id}>
                        <CTableDataCell className="ps-4">
                          <div className="fw-bold text-uppercase">{item.nombre}</div>
                          <div className="small text-muted">Stock disponible: {item.stockMax}</div>
                        </CTableDataCell>
                        <CTableDataCell className="text-center">
                          <CBadge color="info" shape="rounded-pill" className="px-3">
                            {item.cantidad}
                          </CBadge>
                        </CTableDataCell>
                        <CTableDataCell className="fw-bold text-success">
                          ${item.precio?.toLocaleString()}
                        </CTableDataCell>
                        <CTableDataCell className="text-end pe-4">
                          <CButton color="danger" variant="ghost" size="sm" onClick={() => setCarrito(carrito.filter(c => c.producto_id !== item.producto_id))}>
                            <CIcon icon={cilTrash} />
                          </CButton>
                        </CTableDataCell>
                      </CTableRow>
                    ))
                  )}
                </CTableBody>
              </CTable>
            </CCardBody>
          </CCard>
        </CCol>

        {/* RESUMEN DE PAGO */}
        <CCol lg={4}>
          <CCard className="shadow-lg border-0 bg-body-tertiary" style={{ borderRadius: '16px' }}>
            <CCardBody className="p-4">
              <h5 className="fw-bold mb-4 d-flex align-items-center">
                <CIcon icon={cilWallet} className="me-2 text-primary" /> TOTAL VENTA
              </h5>
              
              <div className="bg-primary bg-opacity-10 p-3 rounded-4 mb-4 text-center">
                <h1 className="fw-bold text-body-white m-0">${totalVenta.toFixed(2)}</h1>
              </div>

              <div className="mb-3">
                <CFormLabel className="small fw-bold">Método de Pago</CFormLabel>
                <CFormSelect value={tipoPago} onChange={(e) => setTipoPago(e.target.value)} className="border-0 bg-body-secondary rounded-pill">
                  <option value="efectivo">Efectivo</option>
                  <option value="pago movil">Pago Móvil</option>
                  <option value="transferencia">Transferencia</option>
                  <option value="zelle">Zelle</option>
                </CFormSelect>
              </div>

              <div className="mb-3 p-3 bg-body-secondary rounded-4">
                <CFormCheck 
                  label={<span className="fw-bold">¿Es crédito?</span>} 
                  checked={esCredito} 
                  onChange={(e) => setEsCredito(e.target.checked)} 
                />
                {esCredito && (
                  <CFormInput 
                    type="date" 
                    size="sm" 
                    className="mt-2 border-primary rounded-pill"
                    value={fechaVencimiento}
                    onChange={(e) => setFechaVencimiento(e.target.value)}
                  />
                )}
              </div>

              <CFormLabel className="small fw-bold">Notas</CFormLabel>
              <CFormTextarea 
                rows={2} 
                className="border-0 bg-body-secondary rounded-4 mb-4"
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
              />

              <CButton 
                color="primary" 
                size="lg"
                className="w-100 rounded-pill fw-bold text-white shadow"
                disabled={submitting || carrito.length === 0}
                onClick={finalizarVenta}
              >
                {submitting ? <CSpinner size="sm" /> : <><CIcon icon={cilCheckCircle} className="me-2" /> FINALIZAR</>}
              </CButton>
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>
    </CContainer>
  );
};

export default VentasEmpleado;