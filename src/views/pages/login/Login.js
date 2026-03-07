import React, { useEffect, useMemo, useState } from 'react'
import {
  CContainer, CRow, CCol, CCard,
  CForm, CFormInput, CButton, CSpinner, CFormFeedback, CAlert
} from '@coreui/react'
import { createClient } from "../../../../supabase/client"
import { toast } from "sonner"
import { useLocation, useNavigate, Link } from "react-router-dom"

// --- IMPORTACIÓN DEL LOGO (Igual que en AppSidebar) ---
import logo from 'src/assets/images/logo_parts2.png';

const supabase = createClient()

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const getFriendlyAuthError = (error) => {
  const code = error?.code
  const msg = (error?.message || '').toLowerCase()

  if (code === 'invalid_credentials' || msg.includes('invalid login credentials')) {
    return 'Correo o contraseña incorrectos.'
  }
  if (code === 'email_not_confirmed' || msg.includes('email not confirmed')) {
    return 'Debes confirmar tu correo electrónico. Revisa tu bandeja de entrada.'
  }
  if (msg.includes('too many requests')) {
    return 'Demasiados intentos. Espera unos minutos e intenta de nuevo.'
  }
  if (msg.includes('fetch') || msg.includes('network')) {
    return 'No se pudo conectar. Verifica tu internet e inténtalo de nuevo.'
  }

  return 'No se pudo iniciar sesión. Verifica tus datos e inténtalo de nuevo.'
}

const Login = () => {
  const navigate = useNavigate()
  const location = useLocation()

  const redirectTo = useMemo(() => {
    const from = location.state?.from?.pathname
    return typeof from === 'string' && from.length > 0 ? from : '/dashboard'
  }, [location.state])
  
  const [loading, setLoading] = useState(false)
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)
  const [touched, setTouched] = useState({})
  const [credentials, setCredentials] = useState({
    email: '',
    password: ''
  })
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')

  // Validaciones
  const validateField = (name, value) => {
    let error = ''
    switch (name) {
      case 'email':
        if (!value.trim()) {
          error = 'El correo electrónico es requerido'
        } else if (!EMAIL_REGEX.test(value.trim())) {
          error = 'Ingresa un correo electrónico válido'
        }
        break
      case 'password':
        if (!value) {
          error = 'La contraseña es requerida'
        } else if (value.length < 6) {
          error = 'La contraseña debe tener al menos 6 caracteres'
        }
        break
      default:
        break
    }
    return error
  }

  const validateForm = () => {
    const newErrors = {}
    let isValid = true
    Object.keys(credentials).forEach(field => {
      const error = validateField(field, credentials[field])
      if (error) {
        newErrors[field] = error
        isValid = false
      }
    })
    setErrors(newErrors)
    return isValid
  }

  useEffect(() => {
    let cancelled = false
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
          navigate(redirectTo, { replace: true })
        }
      } catch (error) {
        console.error('Error verificando sesión:', error)
      } finally {
        if (!cancelled) setIsCheckingAuth(false)
      }
    }
    checkAuth()
    return () => { cancelled = true }
  }, [navigate, redirectTo])

  if (isCheckingAuth) {
    return (
      <CContainer className="min-vh-100 d-flex align-items-center justify-content-center bg-body">
        <CSpinner color="primary" />
      </CContainer>
    )
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setCredentials(prev => ({ ...prev, [name]: value }))
    if (touched[name]) {
      const error = validateField(name, value)
      setErrors(prev => ({ ...prev, [name]: error }))
    }
  }

  const handleBlur = (e) => {
    const { name, value } = e.target
    setTouched(prev => ({ ...prev, [name]: true }))
    if (name === 'email') {
      const trimmed = value.trim()
      if (trimmed !== value) {
        setCredentials(prev => ({ ...prev, email: trimmed }))
      }
    }
    const error = validateField(name, value)
    setErrors(prev => ({ ...prev, [name]: error }))
  }

  const handleLogin = async (e) => {
    e.preventDefault()
    if (loading) return
    setTouched({ email: true, password: true })
    setFormError('')
    if (!validateForm()) {
      toast.error('Por favor, corrige los errores antes de continuar')
      return
    }
    setLoading(true)
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: credentials.email.trim(),
        password: credentials.password
      })
      if (error) {
        const friendly = getFriendlyAuthError(error)
        setFormError(friendly)
        toast.error(friendly)
        return
      }
      toast.success("¡Bienvenido de nuevo!")
      navigate(redirectTo, { replace: true })
    } catch (error) {
      const friendly = getFriendlyAuthError(error)
      setFormError(friendly)
      toast.error(friendly)
    } finally {
      setLoading(false)
    }
  }

  return (
    <CContainer fluid className="min-vh-100 d-flex align-items-center justify-content-center py-5 bg-body-tertiary">
      <CCard className="shadow-lg border-0 overflow-hidden w-100 bg-body" style={{ borderRadius: '20px', maxWidth: '950px' }}>
        <CRow className="g-0">
          
          {/* LADO IZQUIERDO: Formulario */}
          <CCol md={6} className="p-4 p-md-5 d-flex flex-column justify-content-center text-body">
            
            <div className="text-center mb-4">
              <h3 className="fw-bold text-primary">INICIAR SESIÓN</h3>
              <p className="text-body-secondary small">Gestiona tu inventario AutoParts</p>
            </div>

            <CForm onSubmit={handleLogin} noValidate>
              <div className="mb-3">
                <CFormInput
                  type="email"
                  name="email"
                  label="Correo Electrónico"
                  placeholder="ejemplo@correo.com"
                  required
                  value={credentials.email}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  autoComplete="username"
                  invalid={touched.email && !!errors.email}
                  className="bg-body-secondary border-0 py-2" 
                />
                <CFormFeedback invalid>{errors.email}</CFormFeedback>
              </div>
              
              <div className="mb-4">
                <CFormInput
                  type="password"
                  name="password"
                  label="Contraseña"
                  placeholder="••••••••"
                  required
                  value={credentials.password}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  autoComplete="current-password"
                  invalid={touched.password && !!errors.password}
                  className="bg-body-secondary border-0 py-2" 
                />
                <CFormFeedback invalid>{errors.password}</CFormFeedback>
              </div>

              {formError && (
                <CAlert color="danger" className="py-2 small">
                  {formError}
                </CAlert>
              )}

              <div className="d-grid gap-2 mt-4">
                <CButton 
                  type="submit" 
                  color="primary" 
                  disabled={loading}
                  size="lg"
                  className="shadow-sm border-0"
                  style={{ borderRadius: '12px', fontWeight: '600' }}
                >
                  {loading ? <CSpinner size="sm" /> : "Ingresar"}
                </CButton>
              </div>

              <div className="text-center mt-4 text-body-secondary">
                <small>
                  ¿No tienes cuenta? <Link to="/register" className="text-primary fw-bold text-decoration-none">Regístrate</Link>
                </small>
              </div>
            </CForm>
          </CCol>

          {/* LADO DERECHO: Visual */}
          {/* LADO DERECHO: Visual */}
          <CCol md={6} className="d-none d-md-flex bg-primary align-items-center justify-content-center p-5 position-relative">
            <div className="position-absolute top-0 start-0 w-100 h-100 overflow-hidden" style={{ opacity: 0.1 }}>
                <div className="bg-white rounded-circle position-absolute" style={{ width: '300px', height: '300px', top: '-100px', left: '-100px' }}></div>
            </div>
            
            <div className="text-center text-white position-relative w-100">
              
              {/* --- LOGO MÁS GRANDE --- */}
              <img 
                src={logo} 
                alt="Logo AutoParts" 
                className="img-fluid mb-4"
                style={{ 
                  width: '100%',        // Ocupa el ancho disponible
                  maxWidth: '280px',    // Pero no más de 280px para que no se pixele
                  height: 'auto',       // Mantiene la proporción
                  objectFit: 'contain',
                  marginTop: '40px'
                }} 
              />
            </div>
          </CCol>

        </CRow>
      </CCard>
    </CContainer>
  )
}

export default Login