import React, { useEffect, useState, useCallback } from 'react';
import {
  CFormInput,
  CFormSelect,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CRow,
  CContainer,
  CTable,
  CTableHead,
  CTableRow,
  CTableHeaderCell,
  CTableBody,
  CTableDataCell,
  CSpinner,
  CBadge,
  CPagination,
  CPaginationItem
} from '@coreui/react';
import { CIcon } from '@coreui/icons-react';
import { 
  cilSearch, 
  cilArrowTop, 
  cilArrowBottom, 
  cilSettings, 
  cilHistory,
  cilChevronLeft,
  cilChevronRight 
} from '@coreui/icons';
import { createClient } from "../../../supabase/client";
import { toast } from "sonner";

const HistorialStock = () => {
  const supabase = createClient();

  // Estados de datos
  const [movimientos, setMovimientos] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Estados de Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [tipoFilter, setTipoFilter] = useState('todos');

  // --- NUEVOS ESTADOS DE PAGINACIÓN ---
  const [currentPage, setCurrentPage] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const PAGE_SIZE = 8; 

  const tipoConfig = {
    entrada: { label: "Entrada", icon: cilArrowTop, color: "success" },
    salida: { label: "Salida", icon: cilArrowBottom, color: "danger" },
    ajuste: { label: "Ajuste", icon: cilSettings, color: "warning" },
  };

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    return new Intl.DateTimeFormat("es-MX", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(dateString));
  };

  const fetchMovimientos = useCallback(async () => {
    setLoading(true);

    // Cálculo de rango para Supabase
    const from = (currentPage - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    let query = supabase
      .from("movimientos_stock")
      .select(`
        *,
        productos (
          nombre,
          sku
        )
      `, { count: 'exact' });

    // Aplicar filtro de tipo directamente en la base de datos si no es "todos"
    // Esto es necesario para que el totalRecords de la paginación sea correcto
    if (tipoFilter !== 'todos') {
      query = query.eq('tipo', tipoFilter);
    }

    const { data, count, error } = await query
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) {
      toast.error("Error al cargar historial", { description: error.message });
    } else {
      setMovimientos(data || []);
      setTotalRecords(count || 0);
    }

    setLoading(false);
  }, [supabase, currentPage, tipoFilter]); // Dependencias actualizadas

  useEffect(() => {
    fetchMovimientos();
  }, [fetchMovimientos]);

  // Si el usuario cambia el filtro de tipo, volvemos a la página 1
  useEffect(() => {
    setCurrentPage(1);
  }, [tipoFilter]);

  // El filtrado por búsqueda se mantiene en cliente (sobre los resultados de la página)
  // o podrías implementarlo en el query de Supabase para mayor precisión.
  const filteredMovimientos = movimientos.filter((m) => {
    const search = searchTerm.toLowerCase();
    return (
      m.productos?.nombre?.toLowerCase().includes(search) ||
      m.productos?.sku?.toLowerCase().includes(search) ||
      m.notas?.toLowerCase().includes(search)
    );
  });

  const totalPages = Math.ceil(totalRecords / PAGE_SIZE);

  return (
    <CContainer>
      <CCard className="mb-4 shadow-lg border-0 overflow-hidden w-100" style={{ borderRadius: '16px' }}>
        <CCardHeader className="bg-primary text-white py-3">
          <h2 className="fw-bold text-white m-0 fs-4 text-uppercase d-flex align-items-center">
            <CIcon icon={cilHistory} className="me-2" />
            Historial de Movimientos
          </h2>
        </CCardHeader>
      </CCard>

      <CCard className="mb-4 shadow-lg border-0" style={{ borderRadius: '16px' }}>
        <CCardHeader className="py-3 border-bottom-0">
          <div className="d-flex flex-wrap align-items-center gap-3">
            <div className="d-flex align-items-center rounded-pill px-3 py-1" style={{ width: '400px' }}>
              <CIcon icon={cilSearch} className="text-muted me-2" />
              <CFormInput
                type="text"
                placeholder="Buscar por producto, SKU o notas..."
                className="border-0 bg-transparent shadow-none"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div style={{ width: '220px' }}>
              <CFormSelect
                value={tipoFilter}
                onChange={(e) => setTipoFilter(e.target.value)}
                className="border shadow-sm py-2 px-3"
                style={{ borderRadius: '12px' }}
              >
                <option value="todos">Todos los tipos</option>
                <option value="entrada">Entradas</option>
                <option value="salida">Salidas</option>
              </CFormSelect>
            </div>
          </div>
        </CCardHeader>

        <CCardBody className="px-4">
          <CTable hover responsive align="middle" className="mb-0">
            <CTableHead>
              <CTableRow>
                <CTableHeaderCell className="text-muted small text-uppercase">Fecha</CTableHeaderCell>
                <CTableHeaderCell className="text-muted small text-uppercase">Producto</CTableHeaderCell>
                <CTableHeaderCell className="text-muted small text-uppercase">Tipo</CTableHeaderCell>
                <CTableHeaderCell className="text-center text-muted small text-uppercase">Cant.</CTableHeaderCell>
                <CTableHeaderCell className="text-center text-muted small text-uppercase">Antes</CTableHeaderCell>
                <CTableHeaderCell className="text-center text-muted small text-uppercase">Después</CTableHeaderCell>
                <CTableHeaderCell className="d-none d-md-table-cell text-muted small text-uppercase">Notas</CTableHeaderCell>
              </CTableRow>
            </CTableHead>

                <CTableBody>
                  {loading ? (
                    <CTableRow>
                      <CTableDataCell colSpan="7" className="text-center py-5">
                        <CSpinner color="primary" />
                      </CTableDataCell>
                    </CTableRow>
                  ) : filteredMovimientos.length === 0 ? (
                    <CTableRow>
                      <CTableDataCell colSpan="7" className="text-center py-4 text-muted">
                        No se encontraron movimientos registrados
                      </CTableDataCell>
                    </CTableRow>
                  ) : (
                    filteredMovimientos.map((m) => {
                      const config = tipoConfig[m.tipo] || {
                        label: m.tipo,
                        color: "secondary",
                        icon: cilSettings,
                      };

                      return (
                        <CTableRow key={m.id}>
                          <CTableDataCell className="ps-3 small">
                            {formatDate(m.created_at)}
                          </CTableDataCell>

                          <CTableDataCell>
                            <div className="d-flex flex-column">
                              <span className="fw-semibold">
                                {m.productos?.nombre ?? "Producto eliminado"}
                              </span>
                              <span className="text-medium-emphasis small font-monospace">
                                {m.productos?.sku}
                              </span>
                            </div>
                          </CTableDataCell>

                          <CTableDataCell>
                            <CBadge color={config.color} className="px-3 py-2">
                              <CIcon icon={config.icon} className="me-1" size="sm" />
                              {config.label}
                            </CBadge>
                          </CTableDataCell>

                          <CTableDataCell
                            className={`text-center fw-bold ${
                              m.tipo === 'entrada' ? 'text-success' : 
                              m.tipo === 'salida' ? 'text-danger' : ''
                            }`}
                          >
                            {m.tipo === "salida" ? "-" : "+"}
                            {m.cantidad}
                          </CTableDataCell>

                          <CTableDataCell className="text-center text-medium-emphasis">
                            {m.stock_anterior}
                          </CTableDataCell>

                          <CTableDataCell className="text-center fw-semibold">
                            {m.stock_nuevo}
                          </CTableDataCell>

                          <CTableDataCell className="d-none d-md-table-cell small text-medium-emphasis">
                            {m.notas || "-"}
                          </CTableDataCell>
                        </CTableRow>
                      );
                    })
                  )}
                </CTableBody>
              </CTable>

              {/* --- COMPONENTE DE PAGINACIÓN --- */}
              {!loading && totalPages > 1 && (
                <div className="d-flex justify-content-between align-items-center p-3 border-top">
                  <div className="text-muted small">
                    Página {currentPage} de {totalPages} ({totalRecords} movimientos en total)
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
    </CContainer>
  );
};

export default HistorialStock;