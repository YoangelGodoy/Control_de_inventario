import React from 'react'
import {
  CAvatar,
  CBadge,
  CDropdown,
  CDropdownDivider,
  CDropdownHeader,
  CDropdownItem,
  CDropdownMenu,
  CDropdownToggle,
} from '@coreui/react'
import {
  cilBell,
  cilCreditCard,
  cilCommentSquare,
  cilEnvelopeOpen,
  cilFile,
  cilExitToApp,
  cilSettings,
  cilTask,
  cilUser,
} from '@coreui/icons'
import CIcon from '@coreui/icons-react'
import { useNavigate } from 'react-router-dom';
import avatar8 from './../../assets/images/avatars/8.jpg'
import { createClient } from '../../../supabase/client';

const AppHeaderDropdown = () => {
  const navigate = useNavigate();
  const supabase = createClient();

  const handleLogout = async () => {
    try {
      // Cerrar sesión en Supabase
      await supabase.auth.signOut();
      // Redirigir al login
      navigate('/login');
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
      // Redirigir al login incluso si hay error
      navigate('/login');
    }
  };

  return (
    <CDropdown variant="nav-item">
      <CDropdownToggle placement="bottom-end" className="py-0 pe-0" caret={false}>
        <CAvatar src={avatar8} size="md" />
      </CDropdownToggle>
      <CDropdownMenu className="pt-0" placement="bottom-end">
      <CDropdownHeader className="bg-body-secondary fw-semibold mb-2">Cuenta</CDropdownHeader>
        <CDropdownDivider />
        <CDropdownItem onClick={handleLogout} href="#">
          <CIcon icon={cilExitToApp} className="me-2" />
          Salir
        </CDropdownItem>
      </CDropdownMenu>
    </CDropdown>
  )
}

export default AppHeaderDropdown;

