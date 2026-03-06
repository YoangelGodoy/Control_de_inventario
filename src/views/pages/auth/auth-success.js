import React from "react"
import { Link } from "react-router-dom"
import {
  CButton,
  CCard,
  CCardBody,
  CCol,
  CContainer,
  CRow
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilEnvelopeLetter } from '@coreui/icons'

export default function SignUpSuccessPage() {
  return (
    <div className="bg-light min-vh-100 d-flex flex-row align-items-center">
      <CContainer>
        <CRow className="justify-content-center">
          <CCol md={6} lg={5} xl={4}>
            <CCard className="shadow-sm border-0 text-center p-4">
              <CCardBody>
                <div 
                  className="mx-auto mb-4 d-flex align-items-center justify-content-center rounded-circle bg-success bg-opacity-10" 
                  style={{ width: '80px', height: '80px' }}
                >
                  <CIcon icon={cilEnvelopeLetter} size="xl" className="text-success" style={{ width: '40px' }} />
                </div>

                <h2 className="fw-bold text-dark mb-3">Revisa tu correo</h2>
                
                <p className="text-muted mb-4 px-2">
                  Te hemos enviado un enlace de confirmación. Revisa tu bandeja de entrada y haz clic en el enlace para activar tu cuenta.
                </p>

                <div className="d-grid mt-4">
                  <Link to="/login" className="text-decoration-none">
                    <CButton color="primary" variant="outline" className="w-100 py-2 fw-semibold">
                      Volver a Iniciar sesión
                    </CButton>
                  </Link>
                </div>
              </CCardBody>
            </CCard>
          </CCol>
        </CRow>
      </CContainer>
    </div>
  )
}