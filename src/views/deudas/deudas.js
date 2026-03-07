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
  cilCalendar, cilClock 
} from '@coreui/icons';
import { createClient } from "../../../supabase/client";
import { toast } from "sonner";

const CobranzasCoreUI = () => {
  const supabase = createClient();

  // Estados de datos
  const [cuentas, setCuentas] = useState([]);
  
  // Estados de Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const PAGE_SIZE = 7;

  // Estados de UI
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedRows, setExpandedRows] = useState([]);
  
  // Estados para el Modal de Pago
  const [modalVisible, setModalVisible] = useState(false);
  const [cuentaSeleccionada, setCuentaSeleccionada] = useState(null);
  const [montoPago, setMontoPago] = useState('');
  const [metodoPago, setMetodoPago] = useState('Efectivo');
  const [referencia, setReferencia] = useState('');

  // 1. Cargar Cuentas con Paginación
  const fetchCuentas = useCallback(async () => {
    setLoading(true);
    try {
      const from = (currentPage - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const { data, count, error } = await supabase
        .from("cuentas_por_cobrar")
        .select(`
          *,
          clientes ( nombre, identificacion ),
          pagos_clientes ( id, monto_pagado, metodo_pago, created_at, referencia )
        `, { count: 'exact' })
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
  }, [supabase, currentPage]);

  useEffect(() => {
    fetchCuentas();
  }, [fetchCuentas]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

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

  const getBadgeColor = (estado) => {
    if (estado === 'PAGADA') return 'success';
    if (estado === 'PARCIAL') return 'warning';
    return 'danger';
  };

  const calcularEstatusVencimiento = (fechaVencimiento) => {
    if (!fechaVencimiento) return { texto: 'Sin fecha', color: 'secondary', dias: 0 };
    
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    // AGREGAMOS T00:00:00 para evitar el desfase de zona horaria
    const vencimiento = new Date(fechaVencimiento + 'T00:00:00'); 
    vencimiento.setHours(0, 0, 0, 0);
    
    const diffTime = vencimiento - hoy;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { texto: `Vencido (${Math.abs(diffDays)}d)`, color: 'danger' };
    } else if (diffDays === 0) {
      return { texto: 'Vence hoy', color: 'warning' };
    } else {
      return { texto: `Faltan ${diffDays}d`, color: 'info' };
    }
  };

  const filteredCuentas = cuentas.filter(c => 
    c.clientes?.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.clientes?.identificacion?.includes(searchTerm)
  );

  const totalPages = Math.ceil(totalRecords / PAGE_SIZE);

  return (
    <CContainer>
      <CCard className="mb-4 shadow-lg border-0 overflow-hidden w-100" style={{ borderRadius: '16px' }}>
        <CCardHeader className="bg-primary text-white py-3">
          <h2 className="fw-bold text-white d-flex align-items-center m-0 fs-4 text-uppercase">
            <CIcon icon={cilCreditCard} className="me-2 " />
            DEUDAS Y COBRANZAS
          </h2>
        </CCardHeader>
      </CCard>

      <CCard className="mb-4 shadow-lg border-0" style={{ borderRadius: '16px' }}>
        <CCardHeader className="py-3 border-bottom-0">
          <div className="d-flex bg-body-secondary align-items-center rounded-pill px-3 py-1" style={{ width: '400px' }}>
            <CIcon icon={cilSearch} className="text-muted me-2" />
            <CFormInput
              placeholder="Buscar por cliente..."
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
                <CTableHeaderCell className="text-muted small text-uppercase" style={{ width: '40px' }}></CTableHeaderCell>
                <CTableHeaderCell className="text-muted small text-uppercase">Fecha Venta</CTableHeaderCell>
                <CTableHeaderCell className="text-muted small text-uppercase" style={{ width: '20%' }}>Cliente</CTableHeaderCell>
                <CTableHeaderCell className="text-muted small text-uppercase text-center">Vencimiento</CTableHeaderCell>
                <CTableHeaderCell className="text-muted small text-uppercase text-center">Estado</CTableHeaderCell>
                <CTableHeaderCell className="text-end text-muted small text-uppercase">Monto Total</CTableHeaderCell>
                <CTableHeaderCell className="text-end text-muted small text-uppercase text-danger">Restante</CTableHeaderCell>
                <CTableHeaderCell className="text-center text-muted small text-uppercase">Acción</CTableHeaderCell>
              </CTableRow>
            </CTableHead>
            <CTableBody>
              {loading && cuentas.length === 0 ? (
                <CTableRow><CTableDataCell colSpan="8" className="text-center py-5"><CSpinner color="primary" /></CTableDataCell></CTableRow>
              ) : filteredCuentas.length === 0 ? (
                <CTableRow><CTableDataCell colSpan="8" className="text-center py-4 text-muted">No se encontraron registros</CTableDataCell></CTableRow>
              ) : filteredCuentas.map((c) => {
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
                        <div className="small fw-bold">
                          {new Date(c.created_at).toLocaleDateString('es-ES', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric'
                          })}
                        </div>
                        <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                          {new Date(c.created_at).toLocaleTimeString('es-ES', { 
                            hour: '2-digit', 
                            minute: '2-digit', 
                            hour12: true 
                          })}
                        </div>
                      </CTableDataCell>
                      <CTableDataCell>
                        <strong>{c.clientes?.nombre}</strong><br/>
                        <small className="text-muted">{c.clientes?.identificacion}</small>
                      </CTableDataCell>
                      <CTableDataCell className="text-center">
                        <div className="d-flex flex-column align-items-center justify-content-center">
                           <CBadge color={estatus.color} className="rounded-pill px-3 py-2 mb-1">
                              <CIcon icon={cilClock} className="me-1" size="sm"/>
                              {estatus.texto}
                           </CBadge>
                           <small className="text-muted" style={{fontSize: '0.7rem'}}>
                             Límite: {c.fecha_vencimiento ? new Date(c.fecha_vencimiento + 'T00:00:00').toLocaleDateString() : 'N/A'}
                           </small>
                        </div>
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
                          onClick={() => {
                            setCuentaSeleccionada(c);
                            setModalVisible(true);
                          }}
                        >
                          <CIcon icon={cilMoney} className="me-1"/> Abonar
                        </CButton>
                      </CTableDataCell>
                    </CTableRow>
                    
                    {expandedRows.includes(c.id) && (
                      <CTableRow>
                        <CTableDataCell colSpan="8" className="bg-body-secondary p-3">
                          <div className="bg-body-tertiary p-3 rounded shadow-sm">
                            <h6 className="fw-bold mb-3"><CIcon icon={cilHistory} className="me-2"/>Historial de Abonos</h6>
                            <CTable bordered size="sm">
                              <thead>
                                <tr>
                                  <th>Fecha Pago</th>
                                  <th>Método</th>
                                  <th>Referencia</th>
                                  <th className="text-end">Monto</th>
                                </tr>
                              </thead>
                              <tbody>
                                {c.pagos_clientes?.length > 0 ? c.pagos_clientes.map(p => (
                                  <tr key={p.id}>
                                    <td>{new Date(p.created_at).toLocaleDateString()}</td>
                                    <td>{p.metodo_pago}</td>
                                    <td>{p.referencia || '-'}</td>
                                    <td className="text-end text-success fw-bold">${Number(p.monto_pagado).toFixed(2)}</td>
                                  </tr>
                                )) : <tr><td colSpan="4" className="text-center text-muted italic">No hay pagos registrados aún</td></tr>}
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

          {/* PAGINACIÓN */}
          {!loading && totalPages > 1 && (
            <div className="d-flex justify-content-between align-items-center mt-4">
              <div className="text-muted small">
                Mostrando {cuentas.length} de {totalRecords} registros
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

      {/* MODAL DE PAGO (SIN CAMBIOS ESTRUCTURALES) */}
      <CModal visible={modalVisible} onClose={() => setModalVisible(false)} alignment="center" backdrop="static">
        <CForm onSubmit={handleRegistrarPago}>
          <CModalHeader className="bg-success text-white border-0 py-3">
            <CModalTitle className="fw-bold text-white m-0 fs-5">Registrar Abono</CModalTitle>
          </CModalHeader>
          <CModalBody className="p-4">
            <div className="mb-4 text-center p-3 bg-body-secondary rounded" style={{ borderRadius: '12px' }}>
              <span className="text-muted small text-uppercase">Saldo Pendiente</span>
              <h3 className="text-danger fw-bold m-0">${Number(cuentaSeleccionada?.saldo_pendiente).toFixed(2)}</h3>
            </div>
            
            <CRow className="g-3">
              <CCol md={12}>
                <CFormLabel className="fw-bold text-muted small ms-1">Monto a Pagar</CFormLabel>
                <CInputGroup className="shadow-sm">
                  <CInputGroupText className="bg-body-secondary border-end-0">$</CInputGroupText>
                  <CFormInput 
                    type="number" 
                    step="0.01" 
                    placeholder="0.00"
                    value={montoPago}
                    onChange={(e) => setMontoPago(e.target.value)}
                    className="border-start-0"
                    style={{ borderRadius: '0 12px 12px 0' }}
                    required 
                  />
                </CInputGroup>
              </CCol>

              <CCol md={12}>
                <CFormLabel className="fw-bold text-muted small ms-1">Método de Pago</CFormLabel>
                <CFormSelect 
                   value={metodoPago} 
                   onChange={(e) => setMetodoPago(e.target.value)}
                   className="shadow-sm"
                   style={{ borderRadius: '12px' }}
                >
                  <option value="Efectivo">Efectivo</option>
                  <option value="Transferencia">Transferencia</option>
                  <option value="Pago Móvil">Pago Móvil</option>
                  <option value="Zelle">Zelle</option>
                </CFormSelect>
              </CCol>

              <CCol md={12}>
                <CFormLabel className="fw-bold text-muted small ms-1">Referencia / Nota</CFormLabel>
                <CFormInput 
                  placeholder="Número de confirmación..." 
                  value={referencia}
                  onChange={(e) => setReferencia(e.target.value)}
                  className="shadow-sm"
                  style={{ borderRadius: '12px' }}
                />
              </CCol>
            </CRow>
          </CModalBody>
          <CModalFooter className="border-0 p-4 pt-0 d-flex gap-3 bg-body-secondary">
            <CButton color="secondary" variant="ghost" className="flex-grow-1 py-2 fw-bold" onClick={() => setModalVisible(false)}>
              Cancelar
            </CButton>
            <CButton color="success" type="submit" className="flex-grow-1 py-2 fw-bold text-white shadow-sm" style={{ borderRadius: '12px' }}>
              Confirmar Abono
            </CButton>
          </CModalFooter>
        </CForm>
      </CModal>
    </CContainer>
  );
};

export default CobranzasCoreUI;