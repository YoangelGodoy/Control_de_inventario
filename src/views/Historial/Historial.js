import React, { useEffect, useState, useCallback } from 'react';
import {
  CFormInput,
  CFormSelect,
  CCard,
  CCardBody,
  CCardHeader,
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
  
  // Estados de Filtros y Búsqueda
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [tipoFilter, setTipoFilter] = useState('todos');

  // Estados de Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const PAGE_SIZE = 6; 

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

  // 1. Efecto de Debounce: Espera 500ms antes de aplicar la búsqueda real
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // 2. Efecto para resetear a la página 1 cuando cambian los filtros
  useEffect(() => {
    setCurrentPage(1);
  }, [tipoFilter, debouncedSearch]);

  // 3. Fetch principal apuntando a la Vista SQL
  const fetchMovimientos = useCallback(async () => {
    setLoading(true);

    const from = (currentPage - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    let query = supabase
      .from("vista_historial_stock")
      .select('*', { count: 'exact' });

    // Aplicar filtro de tipo
    if (tipoFilter !== 'todos') {
      query = query.eq('tipo', tipoFilter);
    }

    // Aplicar filtro de búsqueda global usando OR e ILIKE
    if (debouncedSearch) {
      query = query.or(`producto_nombre.ilike.%${debouncedSearch}%,producto_sku.ilike.%${debouncedSearch}%,notas.ilike.%${debouncedSearch}%`);
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
  }, [supabase, currentPage, tipoFilter, debouncedSearch]);

  useEffect(() => {
    fetchMovimientos();
  }, [fetchMovimientos]);

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
            <div className="d-flex bg-body-secondary align-items-center rounded-pill px-3 py-1" style={{ width: '400px' }}>
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
              ) : movimientos.length === 0 ? (
                <CTableRow>
                  <CTableDataCell colSpan="7" className="text-center py-4 text-muted">
                    No se encontraron movimientos registrados
                  </CTableDataCell>
                </CTableRow>
              ) : (
                movimientos.map((m) => {
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
                            {/* Ahora leemos directamente de la vista */}
                            {m.producto_nombre ?? "Producto eliminado"}
                          </span>
                          <span className="text-medium-emphasis small font-monospace">
                            {m.producto_sku}
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

          {/* COMPONENTE DE PAGINACIÓN */}
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
    </CContainer>
  );
};

export default HistorialStock;