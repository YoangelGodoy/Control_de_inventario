import React, { useEffect, useMemo, useState } from 'react'
import {
  CContainer, CRow, CCol, CCard, CCardBody,
  CForm, CFormInput, CButton, CSpinner, CFormFeedback, CAlert
} from '@coreui/react'
import { createClient } from "../../../../supabase/client"
import { toast } from "sonner"
import { useLocation, useNavigate, Link } from "react-router-dom"

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

  // Verificar si el usuario ya está autenticado
  useEffect(() => {
    let cancelled = false

    const checkAuth = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession()
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
    return () => {
      cancelled = true
    }
  }, [navigate, redirectTo])

  // Mostrar spinner mientras verifica autenticación
  if (isCheckingAuth) {
    return (
      <CContainer className="min-vh-100 d-flex align-items-center justify-content-center">
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
      const email = credentials.email.trim()
      const password = credentials.password

      const { error } = await supabase.auth.signInWithPassword({ email, password })

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
    <CContainer className="min-vh-100 d-flex align-items-center justify-content-center py-5">
      {/* Tarjeta principal más ancha con bordes redondeados y sin desbordamiento */}
      <CCard className="shadow-lg border-0 overflow-hidden w-100" style={{ borderRadius: '20px', maxWidth: '900px' }}>
        <CRow className="g-0"> {/* g-0 elimina el padding entre columnas */}
          
          {/* LADO IZQUIERDO: Formulario de Login */}
          <CCol md={6} className="p-4 p-md-5 bg-white d-flex flex-column justify-content-center">
            
            <div className="text-center mb-3">
              <h3 className="fw-bold text-primary">LOGIN</h3>
              <p className="text-muted small">Ingresa tus credenciales para continuar</p>
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
                  inputMode="email"
                  invalid={touched.email && !!errors.email}
                  className="bg-light border-0" // Estilo más suave similar al diseño
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
                  minLength={6}
                  value={credentials.password}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  autoComplete="current-password"
                  invalid={touched.password && !!errors.password}
                  className="bg-light border-0" // Estilo más suave similar al diseño
                />
                <CFormFeedback invalid>{errors.password}</CFormFeedback>
              </div>

              {formError && (
                <CAlert color="danger" className="mb-3">
                  {formError}
                </CAlert>
              )}

              <div className="d-grid mb-3 mt-4">
                <CButton 
                  type="submit" 
                  color="primary" 
                  disabled={loading}
                  style={{ borderRadius: '10px' }} // Botón redondeado
                >
                  {loading ? (
                    <>
                      <CSpinner size="sm" className="me-2" /> Conectando...
                    </>
                  ) : (
                    "Login"
                  )}
                </CButton>
              </div>

              <div className="text-center mt-4">
                <small className="text-muted">
                  ¿No tienes una cuenta? <Link to="/register" className="text-decoration-none fw-bold">Regístrate aquí</Link>
                </small>
              </div>
            </CForm>
          </CCol>

          {/* LADO DERECHO: Imagen y Fondo */}
          {/* d-none oculta esto en móviles, d-md-flex lo muestra en pantallas medianas o más */}
          <CCol md={6} className="d-none d-md-flex bg-primary align-items-center justify-content-center p-5">
            <div className="text-center text-white">
              {/* Reemplaza el src con la ruta de tu imagen de la chica con la tablet */}
              <img 
                src="https://via.placeholder.com/400x500/8A2BE2/FFFFFF?text=Tu+Imagen+Aqui" 
                alt="Login Illustration" 
                className="img-fluid"
                style={{ borderRadius: '16px', maxHeight: '450px', objectFit: 'cover' }}
              />
            </div>
          </CCol>

        </CRow>
      </CCard>
    </CContainer>
  )
}

export default Login