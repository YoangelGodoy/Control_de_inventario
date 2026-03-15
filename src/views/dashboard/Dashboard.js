import React, { useEffect, useState, useCallback } from 'react';
import {
  CContainer, CRow, CCol, CCard, CCardBody, CSpinner,
  CTable, CTableHead, CTableRow, CTableHeaderCell, CTableBody, CTableDataCell,
  CButton, CBadge
} from '@coreui/react';
import { CIcon } from '@coreui/icons-react';
import {
  cilDollar, cilTags, cilWarning, cilCreditCard, cilChartLine, cilCheckCircle
} from '@coreui/icons';
import { cibWhatsapp, cibGmail } from '@coreui/icons';
import { createClient } from "../../../supabase/client"; 
import { toast } from "sonner";
import { open } from '@tauri-apps/plugin-shell';

const Dashboard = () => {
  const supabase = createClient();

  const [metricas, setMetricas] = useState({
    totalVentas: 0,
    totalContado: 0, // Nueva métrica
    totalCobrar: 0,
    valorInventario: 0,
    gananciaInventario: 0,
    productosBajoStock: 0
  });
  
  const [clientesDeudores, setClientesDeudores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mostrarTodos, setMostrarTodos] = useState(false);

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      const [ventasRes, cobrarRes, productosRes] = await Promise.all([
        // Agregamos es_credito para diferenciar contado de crédito
        supabase.from('ventas_salidas').select('total, es_credito'),
        supabase.from('cuentas_por_cobrar').select(`
          saldo_pendiente, 
          created_at, 
          fecha_vencimiento,
          clientes ( nombre, telefono, email )
        `),
        supabase.from('productos').select('stock_actual, precio_costo, precio_venta')
      ]);

      if (ventasRes.error) throw ventasRes.error;
      if (cobrarRes.error) throw cobrarRes.error;
      if (productosRes.error) throw productosRes.error;

      // Cálculo de Ventas Totales
      const totalVentasCalc = ventasRes.data.reduce((acc, curr) => acc + Number(curr.total || 0), 0);
      
      // Cálculo de Ventas al Contado (Donde es_credito es false)
      const totalContadoCalc = ventasRes.data
        .filter(v => !v.es_credito)
        .reduce((acc, curr) => acc + Number(curr.total || 0), 0);

      const totalCobrarCalc = cobrarRes.data.reduce((acc, curr) => acc + Number(curr.saldo_pendiente || 0), 0);
      
      let valorInvCalc = 0;
      let gananciaInvCalc = 0;
      let bajoStockCalc = 0;

      productosRes.data.forEach(prod => {
        const stock = Number(prod.stock_actual || 0);
        const costo = Number(prod.precio_costo || 0);
        const venta = Number(prod.precio_venta || 0);

        valorInvCalc += (stock * costo);
        gananciaInvCalc += (stock * (venta - costo));
        if (stock < 3) bajoStockCalc++;
      });

      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);

      const deudoresProcesados = cobrarRes.data
        .filter(d => d.saldo_pendiente > 0)
        .map(deuda => {
          if (!deuda.fecha_vencimiento) {
            return { ...deuda, estado: 'Sin fecha', color: 'secondary', diffDays: 999 };
          }

          const vencimiento = new Date(deuda.fecha_vencimiento + 'T00:00:00');
          vencimiento.setHours(0, 0, 0, 0);
          
          const diffTime = vencimiento - hoy;
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

          let color = 'info';
          let estado = `Faltan ${diffDays}d`;

          if (diffDays < 0) {
            color = 'danger';
            estado = `Vencido (${Math.abs(diffDays)}d)`;
          } else if (diffDays === 0) {
            color = 'warning';
            estado = 'Vence hoy';
          }

          return { ...deuda, diffDays, color, estado };
        })
        .filter(d => d.diffDays <= 3)
        .sort((a, b) => a.diffDays - b.diffDays);

      setMetricas({
        totalVentas: totalVentasCalc,
        totalContado: totalContadoCalc,
        totalCobrar: totalCobrarCalc,
        valorInventario: valorInvCalc,
        gananciaInventario: gananciaInvCalc,
        productosBajoStock: bajoStockCalc
      });
      setClientesDeudores(deudoresProcesados);

    } catch (error) {
      toast.error("Error en Dashboard: " + error.message);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const enviarWhatsApp = async (cliente) => {
    const telefonoRaw = cliente.clientes?.telefono;
    if (!telefonoRaw) {
      alert("El cliente no tiene un número registrado");
      return;
    }
    const telefonoLimpio = telefonoRaw.replace(/\D/g, '');
    const mensaje = `Hola ${cliente.clientes.nombre}, te saludamos de AutoParts. Te recordamos que tienes un saldo pendiente de $${cliente.saldo_pendiente.toFixed(2)} que se encuentra próximo a vencer o vencido. ¿Podrías confirmarnos cuándo pasarías a abonar? Gracias.`;
    const url = `https://wa.me/${telefonoLimpio}?text=${encodeURIComponent(mensaje)}`;

    try {
      await open(url);
    } catch (error) {
      console.error("Error al abrir WhatsApp:", error);
      window.open(url, '_blank');
    }
  };

  const enviarCorreo = (cliente) => {
    const email = cliente.clientes?.email;
    if (!email) {
      alert("El cliente no tiene un correo electrónico registrado");
      return;
    }

    const asunto = "Recordatorio de Pago Pendiente - AutoParts";
    const cuerpo = `Hola ${cliente.clientes.nombre},\n\nTe saludamos de AutoParts. Te recordamos que tienes un saldo pendiente de $${cliente.saldo_pendiente.toFixed(2)} que se encuentra próximo a vencer o vencido.\n\nPor favor, confírmanos tu fecha de pago.\n\nAtentamente,\nEquipo de AutoParts.`;

    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${email}&su=${encodeURIComponent(asunto)}&body=${encodeURIComponent(cuerpo)}`;
    window.open(gmailUrl, '_blank');
  };

  const StatCard = ({ title, value, icon, color, isCurrency = true }) => (
    <CCol xs={12} sm={6} lg={4} className="mb-4">
      <CCard 
        className={`h-100 shadow-sm border-top-0 border-end-0 border-bottom-0 border-start border-4 border-${color}`} 
        style={{ borderRadius: '12px' }}
      >
        <CCardBody className="d-flex align-items-center justify-content-between p-3">
          <div className="flex-grow-1 me-1" style={{ minWidth: 0 }}>
            <div className="text-muted fw-bold mb-1" style={{ fontSize: '0.7rem', textTransform: 'uppercase', minHeight: '34px', display: 'flex', alignItems: 'center' }}>
              {title}
            </div>
            <div className={`fw-bold text-${color}`} style={{ fontSize: 'clamp(1.1rem, 2vw, 1.4rem)', whiteSpace: 'nowrap' }}>
              {loading ? <CSpinner size="sm" /> : (isCurrency ? `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : value)}
            </div>
          </div>
          <div className={`bg-${color} bg-opacity-10 rounded-circle d-flex align-items-center justify-content-center flex-shrink-0`} style={{ width: '44px', height: '44px' }}>
            <CIcon icon={icon} size="lg" className={`text-${color}`} />
          </div>
        </CCardBody>
      </CCard>
    </CCol>
  );

  return (
    <CContainer fluid className="px-3">
      <CCard className="mb-4 shadow-lg border-0 overflow-hidden w-100" style={{ borderRadius: '16px' }}>
        <CCardBody className="bg-primary text-white py-3">
          <h2 className="fw-bold text-white m-0 fs-4 text-uppercase">Panel de Gestión AutoParts</h2>
          <small className="text-white-50">Alertas críticas y métricas en tiempo real</small>
        </CCardBody>
      </CCard>

      <CRow className="align-items-stretch">
        <StatCard title="Ingresos Totales (Ventas)" value={metricas.totalVentas} icon={cilDollar} color="success" />
        <StatCard title="Ventas al Contado" value={metricas.totalContado} icon={cilCheckCircle} color="dark" />
        <StatCard title="Cuentas por Cobrar" value={metricas.totalCobrar} icon={cilCreditCard} color="warning" />
      </CRow>

      <CRow className="align-items-stretch">
        <StatCard title="Inversión en Inventario" value={metricas.valorInventario} icon={cilTags} color="indigo" />
        <StatCard title="Ganancia Proyectada" value={metricas.gananciaInventario} icon={cilChartLine} color="info" />
        <StatCard title="Alertas de Stock (-3)" value={metricas.productosBajoStock} icon={cilWarning} color="danger" isCurrency={false} />
      </CRow>

      <CRow className="mt-2">
        <CCol xs={12}>
          <CCard className="shadow border-0 mb-4" style={{ borderRadius: '16px' }}>
            <CCardBody className="p-4">
              <h5 className="fw-bold mb-1 d-flex align-items-center text-danger">
                <CIcon icon={cilWarning} className="me-2" />
                Cobros Urgentes
              </h5>
              <p className="text-muted small mb-4">Mostrando deudas vencidas o por vencer en los próximos 3 días.</p>
              
              <div className="table-responsive">
                <CTable hover align="middle" borderless className="mb-0">
                  <CTableHead className="bg-light text-muted small text-uppercase">
                    <CTableRow>
                      <CTableHeaderCell>Cliente</CTableHeaderCell>
                      <CTableHeaderCell className="text-center">Estado</CTableHeaderCell>
                      <CTableHeaderCell className="text-center">Vence</CTableHeaderCell>
                      <CTableHeaderCell className="text-end">Saldo</CTableHeaderCell>
                      <CTableHeaderCell className="text-center">Acciones</CTableHeaderCell>
                    </CTableRow>
                  </CTableHead>
                  <CTableBody>
                    {loading ? (
                      <CTableRow><CTableDataCell colSpan="5" className="text-center py-5"><CSpinner color="primary" /></CTableDataCell></CTableRow>
                    ) : clientesDeudores.length === 0 ? (
                      <CTableRow><CTableDataCell colSpan="5" className="text-center py-5 text-muted">No hay cobros urgentes pendientes</CTableDataCell></CTableRow>
                    ) : (
                      clientesDeudores
                        .slice(0, mostrarTodos ? clientesDeudores.length : 5)
                        .map((d, i) => (
                          <CTableRow key={i} className="border-bottom">
                            <CTableDataCell>
                              <div className="fw-bold text-body" style={{ fontSize: '0.85rem' }}>{d.clientes?.nombre || 'Sin nombre'}</div>
                              <div className="small text-muted" style={{ fontSize: '0.75rem' }}>{d.clientes?.telefono || '---'}</div>
                            </CTableDataCell>
                            <CTableDataCell className="text-center">
                              <CBadge color={d.color} className="px-2 py-1" shape="rounded-pill" style={{ fontSize: '0.65rem' }}>
                                {d.estado}
                              </CBadge>
                            </CTableDataCell>
                            <CTableDataCell className="text-center small" style={{ fontSize: '0.8rem' }}>
                              {new Date(d.fecha_vencimiento + 'T00:00:00').toLocaleDateString()}
                            </CTableDataCell>
                            <CTableDataCell className="text-end fw-bold text-body" style={{ fontSize: '0.85rem' }}>
                              ${d.saldo_pendiente.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </CTableDataCell>
                            <CTableDataCell className="text-center">
                              <div className="d-flex justify-content-center gap-2">
                                <CButton 
                                  color="success" 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => enviarWhatsApp(d)}
                                  disabled={!d.clientes?.telefono}
                                  title="Enviar WhatsApp"
                                >
                                  <CIcon icon={cibWhatsapp} />
                                </CButton>
                                <CButton 
                                  color="danger" 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => enviarCorreo(d)}
                                  disabled={!d.clientes?.email}
                                  title="Enviar Correo"
                                >
                                  <CIcon icon={cibGmail} />
                                </CButton>
                              </div>
                            </CTableDataCell>
                          </CTableRow>
                        ))
                    )}
                  </CTableBody>
                </CTable>
              </div>

              {!loading && clientesDeudores.length > 5 && (
                <div className="d-grid gap-2 mt-3">
                  <CButton variant="ghost" size="sm" onClick={() => setMostrarTodos(!mostrarTodos)} className="fw-bold text-primary">
                    {mostrarTodos ? "Ver menos" : `Ver todos los urgentes (${clientesDeudores.length})`}
                  </CButton>
                </div>
              )}
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>
    </CContainer>
  );
};

export default Dashboard;