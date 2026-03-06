import React, { useEffect, useState, useCallback } from 'react';
import {
  CContainer, CRow, CCol, CCard, CCardBody, CSpinner,
  CTable, CTableHead, CTableRow, CTableHeaderCell, CTableBody, CTableDataCell,
  CButton, CBadge
} from '@coreui/react';
import { CIcon } from '@coreui/icons-react';
import {
  cilDollar, cilTags, cilWarning, cilCreditCard, cilUser, cilChatBubble
} from '@coreui/icons';
import { createClient } from "../../../supabase/client"; 
import { toast } from "sonner";

const Dashboard = () => {
  const supabase = createClient();

  const [metricas, setMetricas] = useState({
    totalVentas: 0,
    totalCobrar: 0,
    valorInventario: 0,
    productosBajoStock: 0
  });
  
  const [clientesDeudores, setClientesDeudores] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Promesas en paralelo para optimizar carga
      const [ventasRes, cobrarRes, productosRes] = await Promise.all([
        supabase.from('ventas_salidas').select('total'),
        supabase.from('cuentas_por_cobrar').select(`
          saldo_pendiente, 
          created_at, 
          clientes ( nombre, telefono )
        `),
        supabase.from('productos').select('stock_actual, precio_costo')
      ]);

      if (ventasRes.error) throw ventasRes.error;
      if (cobrarRes.error) throw cobrarRes.error;
      if (productosRes.error) throw productosRes.error;

      // --- CÁLCULOS DE METRICAS ---
      const totalVentasCalc = ventasRes.data.reduce((acc, curr) => acc + Number(curr.total || 0), 0);
      const totalCobrarCalc = cobrarRes.data.reduce((acc, curr) => acc + Number(curr.saldo_pendiente || 0), 0);
      
      let valorInvCalc = 0;
      let bajoStockCalc = 0;
      productosRes.data.forEach(prod => {
        valorInvCalc += (Number(prod.stock_actual || 0) * Number(prod.precio_costo || 0));
        if (prod.stock_actual < 3) bajoStockCalc++;
      });

      // --- LÓGICA DE SEGUIMIENTO DE DEUDAS (CADA 7 DÍAS) ---
      const ahora = new Date();
      const deudoresProcesados = cobrarRes.data
        .filter(d => d.saldo_pendiente > 0)
        .map(deuda => {
          const fechaVenta = new Date(deuda.created_at);
          const diasTranscurridos = Math.floor((ahora - fechaVenta) / (1000 * 60 * 60 * 24));
          
          // Semáforo: Verde (<7), Amarillo (7-14), Rojo (>14)
          let color = 'success';
          let estado = 'Al día';
          if (diasTranscurridos >= 15) { color = 'danger'; estado = 'Mora Crítica'; }
          else if (diasTranscurridos >= 7) { color = 'warning'; estado = 'Cobro Semanal'; }

          return { ...deuda, diasTranscurridos, color, estado };
        })
        .sort((a, b) => b.diasTranscurridos - a.diasTranscurridos); // Los más viejos primero

      setMetricas({
        totalVentas: totalVentasCalc,
        totalCobrar: totalCobrarCalc,
        valorInventario: valorInvCalc,
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

  const enviarWhatsApp = (cliente) => {
    const mensaje = `Hola ${cliente.clientes.nombre}, te saludamos de AutoParts. Te recordamos que tienes un saldo pendiente de $${cliente.saldo_pendiente.toFixed(2)} que cumple ciclo de pago. ¿Podrías confirmarnos cuándo pasarías a abonar? Gracias.`;
    const url = `https://wa.me/${cliente.clientes.telefono}?text=${encodeURIComponent(mensaje)}`;
    window.open(url, '_blank');
  };

  const StatCard = ({ title, value, icon, color, isCurrency = true }) => (
    <CCol sm={6} lg={3}>
      <CCard className={`mb-4 shadow-sm border-top-0 border-end-0 border-bottom-0 border-start border-4 border-${color}`} style={{ borderRadius: '12px' }}>
        <CCardBody className="d-flex align-items-center justify-content-between p-4">
          <div>
            <div className="text-muted small text-uppercase fw-bold mb-2">{title}</div>
            <div className={`fs-3 fw-bold text-${color}`}>
              {loading ? <CSpinner size="sm" /> : (isCurrency ? `$${value.toLocaleString()}` : value)}
            </div>
          </div>
          <div className={`bg-${color} bg-opacity-10 p-3 rounded-circle`}>
            <CIcon icon={icon} size="xl" className={`text-${color}`} />
          </div>
        </CCardBody>
      </CCard>
    </CCol>
  );

  return (
    <CContainer>
      <CCard className="mb-4 shadow-lg border-0 overflow-hidden" style={{ borderRadius: '16px' }}>
        <CCardBody className="bg-primary text-white py-3">
          <h2 className="fw-bold text-white m-0 fs-4 text-uppercase">Panel de Gestión AutoParts</h2>
          <small className="text-white-50">Torre de control de ventas y cobranzas</small>
        </CCardBody>
      </CCard>

      <CRow>
        <StatCard title="Ingresos Totales (Ventas)" value={metricas.totalVentas} icon={cilDollar} color="success" />
        <StatCard title="Cuentas por Cobrar" value={metricas.totalCobrar} icon={cilCreditCard} color="warning" />
        <StatCard title="Capital en Inventario" value={metricas.valorInventario} icon={cilTags} color="info" />
        <StatCard title="Alertas de Stock (-3)" value={metricas.productosBajoStock} icon={cilWarning} color="danger" isCurrency={false} />
      </CRow>

      <CRow className="mt-2">
        <CCol md={12}>
          <CCard className="shadow border-0" style={{ borderRadius: '16px' }}>
            <CCardBody className="p-4">
              <h5 className="fw-bold mb-4 d-flex align-items-center">
                <CIcon icon={cilUser} className="me-2 text-primary" />
                Seguimiento de Cobros Semanales
              </h5>
              <CTable hover responsive align="middle" borderless>
                <CTableHead className="bg-light text-muted small text-uppercase">
                  <CTableRow>
                    <CTableHeaderCell>Cliente / Contacto</CTableHeaderCell>
                    <CTableHeaderCell className="text-center">Días Transcurridos</CTableHeaderCell>
                    <CTableHeaderCell className="text-center">Ciclo/Estado</CTableHeaderCell>
                    <CTableHeaderCell className="text-end">Saldo Pendiente</CTableHeaderCell>
                    <CTableHeaderCell className="text-center">Acción</CTableHeaderCell>
                  </CTableRow>
                </CTableHead>
                <CTableBody>
                  {loading ? (
                    <CTableRow><CTableDataCell colSpan="5" className="text-center py-4"><CSpinner color="primary" /></CTableDataCell></CTableRow>
                  ) : clientesDeudores.length === 0 ? (
                    <CTableRow><CTableDataCell colSpan="5" className="text-center py-4">No hay deudas activas</CTableDataCell></CTableRow>
                  ) : clientesDeudores.map((d, i) => (
                    <CTableRow key={i} className="border-bottom">
                      <CTableDataCell>
                        <div className="fw-bold text-dark">{d.clientes?.nombre}</div>
                        <div className="small text-muted">{d.clientes?.telefono}</div>
                      </CTableDataCell>
                      <CTableDataCell className="text-center">
                        <span className="fw-bold">{d.diasTranscurridos} días</span>
                      </CTableDataCell>
                      <CTableDataCell className="text-center">
                        <CBadge color={d.color} className="px-3 py-2" shape="rounded-pill">
                          {d.estado}
                        </CBadge>
                      </CTableDataCell>
                      <CTableDataCell className="text-end fw-bold text-dark fs-5">
                        ${d.saldo_pendiente.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </CTableDataCell>
                      <CTableDataCell className="text-center">
                        <CButton 
                          color="success" 
                          variant="ghost" 
                          size="sm"
                          onClick={() => enviarWhatsApp(d)}
                          title="Enviar Recordatorio WhatsApp"
                        >
                          <CIcon icon={cilChatBubble} size="lg" />
                        </CButton>
                      </CTableDataCell>
                    </CTableRow>
                  ))}
                </CTableBody>
              </CTable>
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>
    </CContainer>
  );
};

export default Dashboard;