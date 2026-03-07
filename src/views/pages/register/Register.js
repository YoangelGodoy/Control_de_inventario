import React, { useState, useEffect } from 'react';
import {
  CContainer, CRow, CCol, CCard,
  CForm, CFormInput, CButton, CSpinner, CFormSelect, CInputGroup, CInputGroupText, CFormLabel, CFormFeedback
} from '@coreui/react';
import { createClient } from "../../../../supabase/client";
import { toast } from "sonner";
import { useNavigate, Link } from "react-router-dom";
import CIcon from '@coreui/icons-react';
import { cilLockLocked, cilLockUnlocked } from '@coreui/icons';

const supabase = createClient();

const Register = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [touched, setTouched] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [formData, setFormData] = useState({
    cedula: '',
    name: '',
    lastname: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    question1: '',
    answer1: '',
    question2: '',
    answer2: ''
  });

  const [errors, setErrors] = useState({});

  const securityQuestions = [
    "¿Nombre de tu primera mascota?",
    "¿Ciudad donde naciste?",
    "¿Nombre de tu mejor amigo de infancia?",
    "¿Colegio donde estudiaste?",
    "¿Marca de tu primer carro?",
    "¿Comida favorita?"
  ];

  const validateField = (name, value, allData = formData) => {
    let error = '';
    switch (name) {
      case 'cedula':
        if (!value.trim()) error = 'La cédula es requerida';
        else if (!/^[VEJG]-?\d{5,9}$/i.test(value.trim())) error = 'Formato inválido. Ej: V-12345678';
        break;
      case 'name':
        if (!value.trim()) error = 'El nombre es requerido';
        else if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/.test(value.trim())) error = 'Solo letras';
        break;
      case 'lastname':
        if (!value.trim()) error = 'El apellido es requerido';
        break;
      case 'email':
        if (!value.trim()) error = 'El email es requerido';
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) error = 'Email inválido';
        break;
      case 'password':
        if (!value) error = 'La contraseña es requerida';
        else if (value.length < 6) error = 'Mínimo 6 caracteres';
        break;
      case 'confirmPassword':
        if (value !== allData.password) error = 'No coinciden';
        break;
      case 'question1': case 'question2':
        if (!value) error = 'Selecciona una pregunta';
        break;
      case 'answer1': case 'answer2':
        if (!value.trim()) error = 'Respuesta requerida';
        break;
      default: break;
    }
    return error;
  };

  const validateForm = () => {
    const newErrors = {};
    let isValid = true;
    Object.keys(formData).forEach(field => {
      const error = validateField(field, formData[field]);
      if (error) {
        newErrors[field] = error;
        isValid = false;
      }
    });
    setErrors(newErrors);
    return isValid;
  };

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) navigate('/dashboard');
      } catch (error) {
        console.error(error);
      } finally {
        setIsCheckingAuth(false);
      }
    };
    checkAuth();
  }, [navigate]);

  if (isCheckingAuth) {
    return (
      <CContainer className="min-vh-100 d-flex align-items-center justify-content-center bg-body">
        <CSpinner color="primary" />
      </CContainer>
    );
  }

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (touched[name]) {
      const error = validateField(name, value);
      setErrors(prev => ({ ...prev, [name]: error }));
    }
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    setTouched(prev => ({ ...prev, [name]: true }));
    setErrors(prev => ({ ...prev, [name]: validateField(name, value) }));
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    const allTouched = {};
    Object.keys(formData).forEach(key => allTouched[key] = true);
    setTouched(allTouched);

    if (!validateForm()) {
      toast.error('Corrige los errores antes de continuar');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: formData.email.trim(),
        password: formData.password,
        options: {
          data: {
            cedula: formData.cedula.trim().toUpperCase(),
            name: formData.name.trim(),
            lastname: formData.lastname.trim(),
            phone: formData.phone.trim(),
            question1: formData.question1,
            answer1: formData.answer1.trim(),
            question2: formData.question2,
            answer2: formData.answer2.trim()
          }
        }
      });
      if (error) throw error;
      if (data.user) {
        toast.success("¡Registro exitoso! Verifica tu correo.");
        navigate('/login');
      }
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const availableQuestions2 = securityQuestions.filter(q => q !== formData.question1);

  return (
    <CContainer fluid className="min-vh-100 d-flex align-items-center justify-content-center py-5 bg-body-tertiary">
      <CCard className="shadow-lg border-0 overflow-hidden w-100 bg-body" style={{ borderRadius: '20px', maxWidth: '1100px' }}>
        <CRow className="g-0">
          
          {/* LADO IZQUIERDO: Formulario con Scroll adaptativo */}
          <CCol lg={7} md={6} className="p-4 p-md-5 d-flex flex-column bg-body" style={{ maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="mb-4">
              <h3 className="fw-bold text-primary">CREAR CUENTA</h3>
              <p className="text-body-secondary small">Únete a la red de gestión AutoParts</p>
            </div>

            <CForm onSubmit={handleRegister} noValidate>
              {/* Sección: Datos Personales */}
              <p className="fw-bold text-uppercase small text-primary mb-3 border-bottom pb-2">Datos Personales</p>
              <CRow className="g-3 mb-4">
                <CCol md={12}>
                  <CFormInput className="bg-body-secondary border-0" label="Cédula *" name="cedula" placeholder="V-12345678" value={formData.cedula} onChange={handleChange} onBlur={handleBlur} invalid={touched.cedula && !!errors.cedula} />
                  <CFormFeedback invalid>{errors.cedula}</CFormFeedback>
                </CCol>
                <CCol md={6}>
                  <CFormInput className="bg-body-secondary border-0" label="Nombre *" name="name" placeholder="Juan" value={formData.name} onChange={handleChange} onBlur={handleBlur} invalid={touched.name && !!errors.name} />
                  <CFormFeedback invalid>{errors.name}</CFormFeedback>
                </CCol>
                <CCol md={6}>
                  <CFormInput className="bg-body-secondary border-0" label="Apellido *" name="lastname" placeholder="Pérez" value={formData.lastname} onChange={handleChange} onBlur={handleBlur} invalid={touched.lastname && !!errors.lastname} />
                  <CFormFeedback invalid>{errors.lastname}</CFormFeedback>
                </CCol>
                <CCol md={6}>
                  <CFormInput className="bg-body-secondary border-0" label="Email *" type="email" name="email" placeholder="correo@ejemplo.com" value={formData.email} onChange={handleChange} onBlur={handleBlur} invalid={touched.email && !!errors.email} />
                  <CFormFeedback invalid>{errors.email}</CFormFeedback>
                </CCol>
                <CCol md={6}>
                  <CFormInput className="bg-body-secondary border-0" label="Teléfono" name="phone" placeholder="04141234567" value={formData.phone} onChange={handleChange} onBlur={handleBlur} invalid={touched.phone && !!errors.phone} />
                  <CFormFeedback invalid>{errors.phone}</CFormFeedback>
                </CCol>
              </CRow>

              {/* Sección: Seguridad */}
              <p className="fw-bold text-uppercase small text-primary mb-3 border-bottom pb-2">Seguridad y Acceso</p>
              <CRow className="g-3 mb-4">
                <CCol md={6}>
                  <CFormLabel className="small text-body-secondary">Contraseña *</CFormLabel>
                  <CInputGroup>
                    <CFormInput className="bg-body-secondary border-0" type={showPassword ? 'text' : 'password'} name="password" value={formData.password} onChange={handleChange} onBlur={handleBlur} invalid={touched.password && !!errors.password} />
                    <CInputGroupText className="bg-body-secondary border-0" style={{ cursor: 'pointer' }} onClick={() => setShowPassword(!showPassword)}>
                      <CIcon icon={showPassword ? cilLockUnlocked : cilLockLocked} className="text-body-secondary" />
                    </CInputGroupText>
                  </CInputGroup>
                  <CFormFeedback invalid className="d-block">{errors.password}</CFormFeedback>
                </CCol>
                <CCol md={6}>
                  <CFormLabel className="small text-body-secondary">Confirmar *</CFormLabel>
                  <CInputGroup>
                    <CFormInput className="bg-body-secondary border-0" type={showConfirmPassword ? 'text' : 'password'} name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} onBlur={handleBlur} invalid={touched.confirmPassword && !!errors.confirmPassword} />
                    <CInputGroupText className="bg-body-secondary border-0" style={{ cursor: 'pointer' }} onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                      <CIcon icon={showConfirmPassword ? cilLockUnlocked : cilLockLocked} className="text-body-secondary" />
                    </CInputGroupText>
                  </CInputGroup>
                  <CFormFeedback invalid className="d-block">{errors.confirmPassword}</CFormFeedback>
                </CCol>
              </CRow>

              <CRow className="g-3 mb-4">
                <CCol md={6}>
                  <CFormSelect className="bg-body-secondary border-0" label="Pregunta 1" name="question1" value={formData.question1} onChange={handleChange} invalid={touched.question1 && !!errors.question1}>
                    <option value="">Selecciona...</option>
                    {securityQuestions.map((q, i) => <option key={i} value={q}>{q}</option>)}
                  </CFormSelect>
                  <CFormFeedback invalid>{errors.question1}</CFormFeedback>
                </CCol>
                <CCol md={6}>
                  <CFormInput className="bg-body-secondary border-0" label="Respuesta 1" name="answer1" value={formData.answer1} onChange={handleChange} invalid={touched.answer1 && !!errors.answer1} />
                  <CFormFeedback invalid>{errors.answer1}</CFormFeedback>
                </CCol>
                <CCol md={6}>
                  <CFormSelect className="bg-body-secondary border-0" label="Pregunta 2" name="question2" value={formData.question2} onChange={handleChange} invalid={touched.question2 && !!errors.question2}>
                    <option value="">Selecciona...</option>
                    {availableQuestions2.map((q, i) => <option key={i} value={q}>{q}</option>)}
                  </CFormSelect>
                  <CFormFeedback invalid>{errors.question2}</CFormFeedback>
                </CCol>
                <CCol md={6}>
                  <CFormInput className="bg-body-secondary border-0" label="Respuesta 2" name="answer2" value={formData.answer2} onChange={handleChange} invalid={touched.answer2 && !!errors.answer2} />
                  <CFormFeedback invalid>{errors.answer2}</CFormFeedback>
                </CCol>
              </CRow>

              <div className="d-grid gap-2 mt-2">
                <CButton type="submit" color="primary" disabled={loading} size="lg" className="shadow-sm border-0" style={{ borderRadius: '12px', fontWeight: '600' }}>
                  {loading ? <CSpinner size="sm" /> : "Registrarme"}
                </CButton>
                <Link to="/login" className="text-center text-body-secondary text-decoration-none small mt-2">
                  ¿Ya tienes cuenta? <span className="text-primary fw-bold">Inicia sesión</span>
                </Link>
              </div>
            </CForm>
          </CCol>

          {/* LADO DERECHO: Visual Decorativo */}
          <CCol lg={5} md={6} className="d-none d-md-flex align-items-center justify-content-center bg-primary p-5 position-relative">
            <div className="text-center text-white position-relative">
              <h4 className="fw-bold">¡Empieza Ahora!</h4>
              <p className="opacity-75 small px-4">Optimiza la gestión de tus repuestos y clientes con nuestra plataforma inteligente.</p>
            </div>
          </CCol>

        </CRow>
      </CCard>
    </CContainer>
  );
};

export default Register;