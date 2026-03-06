import React, { useEffect, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { createClient } from '../../supabase/client'
import { CSpinner, CContainer, CRow, CCol } from '@coreui/react'

const supabase = createClient()

const ProtectedRoute = ({ children }) => {
  const location = useLocation()
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  useEffect(() => {
    let cancelled = false

    const checkAuth = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession()
        if (!cancelled) setIsAuthenticated(!!session)
      } catch (error) {
        console.error('Error verificando autenticación:', error)
        if (!cancelled) setIsAuthenticated(false)
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    checkAuth()

    // Escuchar cambios en el estado de autenticación
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!cancelled) setIsAuthenticated(!!session)
    })

    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
  }, [])

  if (isLoading) {
    return (
      <CContainer fluid className="d-flex align-items-center justify-content-center min-vh-100">
        <CRow>
          <CCol className="text-center">
            <CSpinner color="primary" />
            <p className="mt-3 text-muted">Verificando autenticación...</p>
          </CCol>
        </CRow>
      </CContainer>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  return children
}

export default ProtectedRoute

