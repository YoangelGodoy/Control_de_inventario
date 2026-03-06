import React, { Suspense, useEffect } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { useSelector } from 'react-redux'

import { CSpinner, useColorModes } from '@coreui/react'
import './scss/style.scss'

// Containers
const DefaultLayout = React.lazy(() => import('./layout/DefaultLayout'))

// Pages
const Login = React.lazy(() => import('./views/pages/login/Login'))
const Register = React.lazy(() => import('./views/pages/register/Register'))
// Añadimos la importación de tu página de éxito
const SignUpSuccess = React.lazy(() => import('./views/pages/auth/auth-success'))
const Page404 = React.lazy(() => import('./views/pages/page404/Page404'))
const Page500 = React.lazy(() => import('./views/pages/page500/Page500'))

// Protected Route Component
import ProtectedRoute from './components/ProtectedRoute'

const App = () => {
  const { isColorModeSet, setColorMode } = useColorModes('coreui-free-react-admin-template-theme')
  const storedTheme = useSelector((state) => state.theme)

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.href.split('?')[1])
    const theme = urlParams.get('theme') && urlParams.get('theme').match(/^[A-Za-z0-9\s]+/)[0]
    if (theme) {
      setColorMode(theme)
    }

    if (isColorModeSet()) {
      return
    }

    setColorMode(storedTheme)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <BrowserRouter>
      <Suspense
        fallback={
          <div className="pt-3 text-center">
            <CSpinner color="primary" variant="grow" />
          </div>
        }
      >
        <Routes>
          {/* Mantenemos el Login en la raíz o en /login */}
          <Route exact path="/" name="Login Page" element={<Login />} />
          <Route exact path="/login" name="Login Page" element={<Login />} />
          
          <Route exact path="/register" name="Register Page" element={<Register />} />
          
          {/* Nueva ruta que coincide con tu navigate("/auth/sign-up-success") */}
          <Route 
            exact 
            path="/auth/auth-success" 
            name="Success Page" 
            element={<SignUpSuccess />} 
          />

          <Route exact path="/404" name="Page 404" element={<Page404 />} />
          <Route exact path="/500" name="Page 500" element={<Page500 />} />
          
          {/* Rutas protegidas - solo accesibles si el usuario está autenticado */}
          <Route
            path="*"
            name="Home"
            element={
              <ProtectedRoute>
                <DefaultLayout />
              </ProtectedRoute>
            }
          />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}

export default App