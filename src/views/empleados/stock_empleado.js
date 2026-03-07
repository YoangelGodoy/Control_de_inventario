import React, { useEffect, useState, useCallback } from 'react';
import {
  CButton, CCard, CCardBody, CCardHeader, CCol, CRow, CContainer, 
  CTable, CTableHead, CTableRow, CTableHeaderCell, CTableBody, 
  CTableDataCell, CFormSelect, CFormInput, CSpinner, CBadge,
  CFormLabel, CInputGroup, CInputGroupText,
  CModal, CModalHeader, CModalTitle, CModalBody, CModalFooter // Importamos componentes de Modal
} from '@coreui/react';
import { CIcon } from '@coreui/icons-react';
import { 
  cilTransfer, cilUser, cilSave, cilArrowThickFromBottom, cilWarning
} from '@coreui/icons';
import { createClient } from "../../../supabase/client"; 
import { toast } from "sonner";

const StockEmpleado = () => {
  const supabase = createClient();

  // Estados principales
  const [empleados, setEmpleados] = useState([]);
  const [productosGeneral, setProductosGeneral] = useState([]);
  const [empleadoId, setEmpleadoId] = useState('');
  const [inventarioActual, setInventarioActual] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // Estado para la nueva asignación
  const [itemAsignar, setItemAsignar] = useState({ producto_id: '', cantidad: 1, stockMax: 0 });

  // --- ESTADOS PARA EL MODAL DE DEVOLUCIÓN ---
  const [visibleModal, setVisibleModal] = useState(false);
  const [itemADevolver, setItemADevolver] = useState({ producto_id: '', nombre: '', cantidadMax: 0, cantidadSeleccionada: 1 });

  const loadInitialData = useCallback(async () => {
    const { data: emp } = await supabase.from('empleados').select('*').eq('activo', true).order('nombre');
    const { data: prod } = await supabase.from('productos').select('id, nombre, stock_actual').gt('stock_actual', 0).order('nombre');
    setEmpleados(emp || []);
    setProductosGeneral(prod || []);
  }, [supabase]);

  const fetchStockEmpleado = useCallback(async (id) => {
    if (!id) {
      setInventarioActual([]);
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('inventario_empleados')
        .select(`id, producto_id, cantidad_actual, updated_at, productos ( nombre )`)
        .eq('empleado_id', id)
        .gt('cantidad_actual', 0);

      if (error) throw error;
      setInventarioActual(data || []);
    } catch (error) {
      toast.error("Error al cargar stock: " + error.message);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => { loadInitialData(); }, [loadInitialData]);
  useEffect(() => { fetchStockEmpleado(empleadoId); }, [empleadoId, fetchStockEmpleado]);

  // Manejador para abrir el modal
  const abrirModalDevolucion = (item) => {
    setItemADevolver({
      producto_id: item.producto_id,
      nombre: item.productos?.nombre,
      cantidadMax: item.cantidad_actual,
      cantidadSeleccionada: item.cantidad_actual
    });
    setVisibleModal(true);
  };

  // Función lógica para procesar la devolución (RPC)
  const ejecutarDevolucion = async () => {
    const { producto_id, cantidadSeleccionada, cantidadMax } = itemADevolver;

    if (!cantidadSeleccionada || cantidadSeleccionada <= 0 || cantidadSeleccionada > cantidadMax) {
      toast.error("Cantidad inválida");
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.rpc('devolver_mercancia_empleado', {
        p_empleado_id: empleadoId,
        p_items: [{ 
          producto_id: producto_id, 
          cantidad: parseInt(cantidadSeleccionada) 
        }]
      });

      if (error) throw error;

      toast.success("Devolución procesada correctamente");
      setVisibleModal(false);
      fetchStockEmpleado(empleadoId);
      loadInitialData();
    } catch (error) {
      toast.error("Error: " + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAsignar = async () => {
    if (!empleadoId || !itemAsignar.producto_id) {
      toast.warning("Seleccione un empleado y un producto");
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.rpc('asignar_mercancia_empleado', {
        p_empleado_id: empleadoId,
        p_items: [{ producto_id: itemAsignar.producto_id, cantidad: parseInt(itemAsignar.cantidad) }]
      });
      if (error) throw error;
      toast.success("Asignado con éxito");
      setItemAsignar({ producto_id: '', cantidad: 1, stockMax: 0 });
      fetchStockEmpleado(empleadoId);
      loadInitialData(); 
    } catch (error) {
      toast.error("Error al asignar");
    } finally { setSubmitting(false); }
  };

  return (
    <CContainer>
      {/* TÍTULO PRINCIPAL */}
      <CCard className="mb-4 shadow-lg border-0 overflow-hidden" style={{ borderRadius: '16px' }}>
        <CCardHeader className="bg-primary text-white py-3">
          <h2 className="fw-bold text-white d-flex align-items-center m-0 fs-4 text-uppercase">
            <CIcon icon={cilTransfer} className="me-2" /> Control de Stock de Empleados
          </h2>
        </CCardHeader>
      </CCard>

      <CRow>
        {/* PANEL IZQUIERDO: ASIGNACIÓN */}
        <CCol lg={4}>
          <CCard className="mb-4 shadow-lg border-0" style={{ borderRadius: '16px' }}>
            <CCardHeader className="py-3 border-bottom-0 text-muted text-uppercase small fw-bold">Gestión de Entrega</CCardHeader>
            <CCardBody className="p-4 pt-0">
              <div className="mb-3">
                <CFormLabel className="small fw-bold">Empleado</CFormLabel>
                <CFormSelect value={empleadoId} onChange={(e) => setEmpleadoId(e.target.value)} className="rounded-pill shadow-sm">
                  <option value="">-- Seleccionar --</option>
                  {empleados.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}
                </CFormSelect>
              </div>
              <div className="mb-3">
                <CFormLabel className="small fw-bold">Producto</CFormLabel>
                <CFormSelect 
                  value={itemAsignar.producto_id} 
                  className="rounded-pill shadow-sm"
                  onChange={(e) => {
                    const p = productosGeneral.find(x => x.id === e.target.value);
                    setItemAsignar({...itemAsignar, producto_id: e.target.value, stockMax: p?.stock_actual || 0});
                  }}
                >
                  <option value="">-- Seleccionar --</option>
                  {productosGeneral.map(p => (
                    <option key={p.id} value={p.id}>{p.nombre} ({p.stock_actual})</option>
                  ))}
                </CFormSelect>
              </div>
              <div className="mb-4">
                <CFormLabel className="small fw-bold">Cantidad</CFormLabel>
                <CInputGroup className="shadow-sm rounded-pill overflow-hidden">
                  <CFormInput type="number" value={itemAsignar.cantidad} onChange={(e) => setItemAsignar({...itemAsignar, cantidad: e.target.value})} className="border-0 bg-body-secondary text-center text-body fw-bold"/>
                  <CInputGroupText className="bg-body-secondary border-0 small">Máx: {itemAsignar.stockMax}</CInputGroupText>
                </CInputGroup>
              </div>
              <CButton color="success" className="text-white w-100 py-2 fw-bold rounded-pill shadow-sm" onClick={handleAsignar} disabled={submitting || !empleadoId}>
                {submitting ? <CSpinner size="sm"/> : <CIcon icon={cilSave} className="me-2" />} ASIGNAR
              </CButton>
            </CCardBody>
          </CCard>
        </CCol>

        {/* PANEL DERECHO: TABLA DE STOCK */}
        <CCol lg={8}>
          <CCard className="mb-4 shadow-lg border-0" style={{ borderRadius: '16px' }}>
            <CCardHeader className="py-3 border-bottom-0 d-flex justify-content-between align-items-center">
              <strong className="text-muted text-uppercase small fw-bold">Stock en Posesión</strong>
              {loading && <CSpinner size="sm" color="primary" />}
            </CCardHeader>
            <CCardBody className="px-4">
              {!empleadoId ? (
                <div className="text-center py-5 text-muted opacity-50">Seleccione un empleado para ver su inventario</div>
              ) : (
                <CTable hover responsive align="middle" className="mb-0">
                  <CTableHead>
                    <CTableRow>
                      <CTableHeaderCell className="text-muted small">PRODUCTO</CTableHeaderCell>
                      <CTableHeaderCell className="text-center text-muted small">CANT.</CTableHeaderCell>
                      <CTableHeaderCell className="text-end text-muted small">ACCIÓN</CTableHeaderCell>
                    </CTableRow>
                  </CTableHead>
                  <CTableBody>
                    {inventarioActual.map((item) => (
                      <CTableRow key={item.id}>
                        <CTableDataCell className="fw-bold">{item.productos?.nombre}</CTableDataCell>
                        <CTableDataCell className="text-center bg-body">
                          <CBadge color="info" shape="pill" className="px-3 py-2">{item.cantidad_actual}</CBadge>
                        </CTableDataCell>
                        <CTableDataCell className="text-end">
                          <CButton color="danger" variant="ghost" size="sm" className="rounded-pill" onClick={() => abrirModalDevolucion(item)}>
                            <CIcon icon={cilArrowThickFromBottom} className="me-1" /> Devolver
                          </CButton>
                        </CTableDataCell>
                      </CTableRow>
                    ))}
                  </CTableBody>
                </CTable>
              )}
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>

      {/* --- MODAL DE DEVOLUCIÓN --- */}
      <CModal visible={visibleModal} onClose={() => setVisibleModal(false)} alignment="center" backdrop="static">
        <CModalHeader className="bg-danger text-white border-0">
          <CModalTitle className="fs-5 fw-bold text-uppercase">
            <CIcon icon={cilWarning} className="me-2" /> Devolver a Inventario
          </CModalTitle>
        </CModalHeader>
        <CModalBody className="p-4">
          <p className="text-muted small">Estás devolviendo <strong>{itemADevolver.nombre}</strong> al almacén central.</p>
          <CFormLabel className="fw-bold">Cantidad a devolver:</CFormLabel>
          <CInputGroup className="mb-2 shadow-sm rounded-pill overflow-hidden">
            <CFormInput 
              type="number" 
              value={itemADevolver.cantidadSeleccionada} 
              onChange={(e) => setItemADevolver({...itemADevolver, cantidadSeleccionada: e.target.value})}
              className="text-center fw-bold border-0 text-body"
            />
            <CInputGroupText className="bg-body border-0"> de {itemADevolver.cantidadMax}</CInputGroupText>
          </CInputGroup>
          {itemADevolver.cantidadSeleccionada > itemADevolver.cantidadMax && (
            <small className="text-danger">La cantidad supera lo que el empleado posee.</small>
          )}
        </CModalBody>
        <CModalFooter className="border-0">
          <CButton color="light" className="rounded-pill px-4" onClick={() => setVisibleModal(false)}>Cancelar</CButton>
          <CButton 
            color="danger" 
            className="text-white rounded-pill px-4 fw-bold" 
            onClick={ejecutarDevolucion}
            disabled={submitting || itemADevolver.cantidadSeleccionada > itemADevolver.cantidadMax}
          >
            {submitting ? <CSpinner size="sm"/> : "CONFIRMAR DEVOLUCIÓN"}
          </CButton>
        </CModalFooter>
      </CModal>
    </CContainer>
  );
};

export default StockEmpleado;