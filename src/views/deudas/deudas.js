import React, { useEffect, useState, useCallback, Fragment } from 'react';
import {
  CButton, CCard, CCardBody, CCardHeader, CCol, CRow, CContainer,
  CTable, CTableHead, CTableRow, CTableHeaderCell, CTableBody, CTableDataCell,
  CSpinner, CBadge, CModal, CModalHeader, CModalTitle, CModalBody, CModalFooter,
  CForm, CFormInput, CFormLabel, CFormSelect, CInputGroup, CInputGroupText,
  CPagination, CPaginationItem
} from '@coreui/react';
import { CIcon } from '@coreui/icons-react';
import { 
  cilSearch, cilChevronBottom, cilChevronTop, cilMoney, 
  cilHistory, cilCreditCard, cilChevronLeft, cilChevronRight,
  cilCalendar, cilClock, cilTrash 
} from '@coreui/icons';
import { createClient } from "../../../supabase/client";
import { toast } from "sonner";

const CobranzasCoreUI = () => {
  const supabase = createClient();

  // Estados de datos
  const [cuentas, setCuentas] = useState([]);
  
  // Estados de Paginación y Filtros
  const [currentPage, setCurrentPage] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const PAGE_SIZE = 5;
  const [filters, setFilters] = useState({ search: '' });

  // Estados de UI
  const [loading, setLoading] = useState(true);
  const [expandedRows, setExpandedRows] = useState([]);
  
  // Estados para Modal de Pago
  const [modalVisible, setModalVisible] = useState(false);
  const [cuentaSeleccionada, setCuentaSeleccionada] = useState(null);
  const [montoPago, setMontoPago] = useState('');
  const [metodoPago, setMetodoPago] = useState('Efectivo');
  const [referencia, setReferencia] = useState('');

  // Estados para Modal de Eliminación de Abono
  const [modalDeleteVisible, setModalDeleteVisible] = useState(false);
  const [pagoToDelete, setPagoToDelete] = useState(null);

  // 1. Cargar Cuentas
  const fetchCuentas = useCallback(async () => {
    setLoading(true);
    try {
      const from = (currentPage - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      let query = supabase
        .from("cobranzas_con_clientes")
        .select(`
          *,
          pagos_clientes ( id, monto_pagado, metodo_pago, created_at, referencia )
        `, { count: 'exact' });

      if (filters.search) {
        query = query.or(`cliente_nombre.ilike.%${filters.search}%, cliente_rif.ilike.%${filters.search}%`);
      }

      const { data, count, error } = await query
        .order("created_at", { ascending: false })
        .range(from, to);

      if (error) throw error;
      setCuentas(data || []);
      setTotalRecords(count || 0);
    } catch (error) {
      toast.error("Error al cargar deudas", { description: error.message });
    } finally {
      setLoading(false);
    }
  }, [supabase, currentPage, filters]);

  useEffect(() => {
    fetchCuentas();
  }, [fetchCuentas]);

  // 2. Registrar Pago
  const handleRegistrarPago = async (e) => {
    e.preventDefault();
    if (!montoPago || montoPago <= 0) return toast.warning("Ingrese un monto válido");
    if (parseFloat(montoPago) > cuentaSeleccionada.saldo_pendiente) {
      return toast.error("El pago no puede ser mayor al saldo pendiente");
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from("pagos_clientes")
        .insert([{
          cuenta_id: cuentaSeleccionada.id,
          monto_pagado: parseFloat(montoPago),
          metodo_pago: metodoPago,
          referencia: referencia,
          user_id: user.id
        }]);

      if (error) throw error;

      toast.success("Pago registrado correctamente");
      setModalVisible(false);
      setMontoPago('');
      setReferencia('');
      fetchCuentas(); 
    } catch (error) {
      toast.error("Error al procesar pago", { description: error.message });
    } finally {
      setLoading(false);
    }
  };

  // 3. Eliminar Abono (RPC)
  const confirmDeleteAbono = async () => {
    if (!pagoToDelete) return;
    
    setLoading(true);
    try {
      const { error } = await supabase.rpc('eliminar_abono_y_actualizar_deuda', {
        p_pago_id: pagoToDelete.id,
        p_cuenta_id: pagoToDelete.cuenta_id
      });

      if (error) throw error;

      toast.success("Abono eliminado correctamente");
      fetchCuentas();
    } catch (error) {
      toast.error("Error al eliminar abono", { description: error.message });
    } finally {
      setLoading(false);
      setModalDeleteVisible(false);
      setPagoToDelete(null);
    }
  };

  // Helpers de UI
  const getBadgeColor = (estado) => {
    if (estado === 'PAGADA') return 'success';
    if (estado === 'PARCIAL') return 'warning';
    return 'danger';
  };

  const calcularEstatusVencimiento = (fechaVencimiento) => {
    if (!fechaVencimiento) return { texto: 'Sin fecha', color: 'secondary' };
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const vencimiento = new Date(fechaVencimiento + 'T00:00:00'); 
    const diffDays = Math.ceil((vencimiento - hoy) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return { texto: `Vencido (${Math.abs(diffDays)}d)`, color: 'danger' };
    if (diffDays === 0) return { texto: 'Vence hoy', color: 'warning' };
    return { texto: `Faltan ${diffDays}d`, color: 'info' };
  };

  const totalPages = Math.ceil(totalRecords / PAGE_SIZE);

  return (
    <CContainer>
      {/* HEADER */}
      <CCard className="mb-4 shadow-lg border-0 overflow-hidden" style={{ borderRadius: '16px' }}>
        <CCardHeader className="bg-primary text-white py-3">
          <h2 className="fw-bold text-white d-flex align-items-center m-0 fs-4 text-uppercase">
            <CIcon icon={cilCreditCard} className="me-2 " /> VENTAS A CREDITO
          </h2>
        </CCardHeader>
      </CCard>

      {/* BUSCADOR */}
      <CCard className="mb-4 shadow-lg border-0" style={{ borderRadius: '16px' }}>
        <CCardHeader className="py-3 border-bottom-0">
          <div className="d-flex bg-body-secondary align-items-center rounded-pill px-3 py-1" style={{ width: '400px' }}>
            <CIcon icon={cilSearch} className="text-muted me-2" />
            <CFormInput
              placeholder="Buscar por cliente o identificación..."
              className="border-0 bg-transparent shadow-none"
              value={filters.search}
              onChange={(e) => {
                setFilters({ ...filters, search: e.target.value });
                setCurrentPage(1);
              }}
            />
          </div>
        </CCardHeader>

        <CCardBody className="px-4">
          <CTable hover responsive align="middle" className="mb-0">
            <CTableHead>
              <CTableRow>
                <CTableHeaderCell style={{ width: '40px' }}></CTableHeaderCell>
                <CTableHeaderCell className="text-muted small text-uppercase">Fecha Venta</CTableHeaderCell>
                <CTableHeaderCell className="text-muted small text-uppercase" style={{ width: '20%' }}>Cliente</CTableHeaderCell>
                <CTableHeaderCell className="text-center text-muted small text-uppercase">Vencimiento</CTableHeaderCell>
                <CTableHeaderCell className="text-center text-muted small text-uppercase">Estado</CTableHeaderCell>
                <CTableHeaderCell className="text-end text-muted small text-uppercase">Monto Total</CTableHeaderCell>
                <CTableHeaderCell className="text-end text-muted small text-uppercase text-danger">Restante</CTableHeaderCell>
                <CTableHeaderCell className="text-center text-muted small text-uppercase">Acción</CTableHeaderCell>
              </CTableRow>
            </CTableHead>
            <CTableBody>
              {loading && cuentas.length === 0 ? (
                <CTableRow><CTableDataCell colSpan="8" className="text-center py-5"><CSpinner color="primary" /></CTableDataCell></CTableRow>
              ) : cuentas.length === 0 ? (
                <CTableRow><CTableDataCell colSpan="8" className="text-center py-4 text-muted">No se encontraron registros</CTableDataCell></CTableRow>
              ) : cuentas.map((c) => {
                const estatus = calcularEstatusVencimiento(c.fecha_vencimiento);
                return (
                  <Fragment key={c.id}>
                    <CTableRow>
                      <CTableDataCell 
                        onClick={() => setExpandedRows(prev => prev.includes(c.id) ? prev.filter(id => id !== c.id) : [...prev, c.id])} 
                        style={{ cursor: 'pointer' }}
                      >
                        <CIcon icon={expandedRows.includes(c.id) ? cilChevronTop : cilChevronBottom} />
                      </CTableDataCell>
                      <CTableDataCell>
                        <div className="small fw-bold">{new Date(c.created_at).toLocaleDateString()}</div>
                      </CTableDataCell>
                      <CTableDataCell>
                        <strong>{c.cliente_nombre}</strong><br/>
                        <small className="text-muted">{c.cliente_rif}</small>
                      </CTableDataCell>
                      <CTableDataCell className="text-center">
                        <CBadge color={estatus.color} className="rounded-pill px-3 py-2">
                          <CIcon icon={cilClock} className="me-1" size="sm"/> {estatus.texto}
                        </CBadge>
                      </CTableDataCell>
                      <CTableDataCell className="text-center">
                        <CBadge color={getBadgeColor(c.estado)}>{c.estado}</CBadge>
                      </CTableDataCell>
                      <CTableDataCell className="text-end fw-bold">${Number(c.monto_total).toFixed(2)}</CTableDataCell>
                      <CTableDataCell className="text-end fw-bold text-danger">${Number(c.saldo_pendiente).toFixed(2)}</CTableDataCell>
                      <CTableDataCell className="text-center">
                        <CButton 
                          color="success" 
                          size="sm" 
                          className="text-white rounded-pill px-3"
                          disabled={c.estado === 'PAGADA'}
                          onClick={() => { setCuentaSeleccionada(c); setModalVisible(true); }}
                        >
                          <CIcon icon={cilMoney} className="me-1"/> Abonar
                        </CButton>
                      </CTableDataCell>
                    </CTableRow>
                    
                    {/* HISTORIAL EXPANDIBLE */}
                    {expandedRows.includes(c.id) && (
                      <CTableRow>
                        <CTableDataCell colSpan="8" className="bg-body-secondary p-3">
                          <div className="bg-body-tertiary p-3 rounded shadow-sm">
                            <h6 className="fw-bold mb-3 small"><CIcon icon={cilHistory} className="me-2"/>HISTORIAL DE ABONOS</h6>
                            <CTable bordered size="sm" className="bg-white">
                              <thead>
                                <tr className="small text-muted">
                                  <th>Fecha</th>
                                  <th>Método</th>
                                  <th>Referencia</th>
                                  <th className="text-end">Monto</th>
                                  <th className="text-center">Acción</th>
                                </tr>
                              </thead>
                              <tbody>
                                {c.pagos_clientes?.length > 0 ? c.pagos_clientes.map(p => (
                                  <tr key={p.id}>
                                    <td className="small">{new Date(p.created_at).toLocaleDateString()}</td>
                                    <td className="small">{p.metodo_pago}</td>
                                    <td className="small">{p.referencia || '-'}</td>
                                    <td className="text-end text-success fw-bold">${Number(p.monto_pagado).toFixed(2)}</td>
                                    <td className="text-center">
                                      <CButton 
                                        color="danger" 
                                        variant="ghost" 
                                        size="sm" 
                                        onClick={() => {
                                          setPagoToDelete({ ...p, cuenta_id: c.id });
                                          setModalDeleteVisible(true);
                                        }}
                                      >
                                        <CIcon icon={cilTrash} size="sm" />
                                      </CButton>
                                    </td>
                                  </tr>
                                )) : <tr><td colSpan="5" className="text-center text-muted small py-2">No hay pagos registrados</td></tr>}
                              </tbody>
                            </CTable>
                          </div>
                        </CTableDataCell>
                      </CTableRow>
                    )}
                  </Fragment>
                );
              })}
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

      {/* MODAL REGISTRAR PAGO */}
      <CModal visible={modalVisible} onClose={() => setModalVisible(false)} alignment="center" backdrop="static">
        <CForm onSubmit={handleRegistrarPago}>
          <CModalHeader className="bg-success text-white border-0 py-3">
            <CModalTitle className="fw-bold text-white m-0 fs-5">Registrar Abono</CModalTitle>
          </CModalHeader>
          <CModalBody className="p-4">
            <div className="mb-4 text-center p-3 bg-body-secondary rounded">
              <span className="text-muted small text-uppercase">Saldo Pendiente</span>
              <h3 className="text-danger fw-bold m-0">${Number(cuentaSeleccionada?.saldo_pendiente).toFixed(2)}</h3>
            </div>
            <CRow className="g-3">
              <CCol md={12}>
                <CFormLabel className="fw-bold text-muted small ms-1">Monto a Pagar</CFormLabel>
                <CInputGroup>
                  <CInputGroupText className="bg-body-secondary">$</CInputGroupText>
                  <CFormInput type="number" step="0.01" value={montoPago} onChange={(e) => setMontoPago(e.target.value)} required />
                </CInputGroup>
              </CCol>
              <CCol md={12}>
                <CFormLabel className="fw-bold text-muted small ms-1">Método de Pago</CFormLabel>
                <CFormSelect value={metodoPago} onChange={(e) => setMetodoPago(e.target.value)}>
                  <option value="Efectivo">Efectivo</option>
                  <option value="Transferencia">Transferencia</option>
                  <option value="Pago Móvil">Pago Móvil</option>
                  <option value="Zelle">Zelle</option>
                </CFormSelect>
              </CCol>
              <CCol md={12}>
                <CFormLabel className="fw-bold text-muted small ms-1">Referencia / Nota</CFormLabel>
                <CFormInput placeholder="Confirmación..." value={referencia} onChange={(e) => setReferencia(e.target.value)} />
              </CCol>
            </CRow>
          </CModalBody>
          <CModalFooter className="border-0 p-4 pt-0 d-flex gap-3 bg-body-secondary">
            <CButton color="secondary" variant="ghost" className="flex-grow-1" onClick={() => setModalVisible(false)}>Cancelar</CButton>
            <CButton color="success" type="submit" className="flex-grow-1 text-white fw-bold">Confirmar Abono</CButton>
          </CModalFooter>
        </CForm>
      </CModal>

      {/* MODAL ELIMINAR ABONO (ESTILO CLIENTES) */}
      <CModal visible={modalDeleteVisible} onClose={() => setModalDeleteVisible(false)} alignment="center" backdrop="static">
        <CModalHeader className="bg-primary text-white border-0 py-3">
          <CModalTitle className="fw-bold text-white m-0 fs-5">Confirmar eliminación</CModalTitle>
        </CModalHeader>
        <CModalBody className="text-center p-4">
          <CIcon icon={cilTrash} size="xl" className="text-danger mb-2" />
          <h6 className="fw-bold">¿Eliminar este abono?</h6>
          <p className="text-muted small">
            El monto de <strong>${Number(pagoToDelete?.monto_pagado).toFixed(2)}</strong> se sumará nuevamente al saldo pendiente.
          </p>
        </CModalBody>
        <CModalFooter className="bg-body-secondary p-4">
          <CButton color="secondary" variant="ghost" onClick={() => setModalDeleteVisible(false)}>Cancelar</CButton>
          <CButton color="danger" className="text-white" onClick={confirmDeleteAbono}>Eliminar</CButton>
        </CModalFooter>
      </CModal>

    </CContainer>
  );
};

export default CobranzasCoreUI;