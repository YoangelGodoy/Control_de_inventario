import React, { useEffect, useState } from 'react'
import {
  CAvatar,
  CDropdown,
  CDropdownDivider,
  CDropdownHeader,
  CDropdownItem,
  CDropdownMenu,
  CDropdownToggle,
} from '@coreui/react'
import {
  cilExitToApp,
  cilUser,
} from '@coreui/icons'
import CIcon from '@coreui/icons-react'
import { useNavigate } from 'react-router-dom';
import avatar8 from './../../assets/images/avatars/8.png'
import { createClient } from '../../../supabase/client';

const AppHeaderDropdown = () => {
  const navigate = useNavigate();
  const supabase = createClient();
  const [userEmail, setUserEmail] = useState('Cargando...');

  useEffect(() => {
    const getUserData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserEmail(user.email);
      }
    };

    getUserData();
  }, [supabase]);

  const handleLogout = async (e) => {
    e.preventDefault(); // Evita que el href="#" recargue la página
    try {
      await supabase.auth.signOut();
      navigate('/login');
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
      navigate('/login');
    }
  };

  return (
    <CDropdown variant="nav-item">
      <CDropdownToggle placement="bottom-end" className="py-0 pe-0" caret={false}>
        <CAvatar src={avatar8} size="md" />
      </CDropdownToggle>
      <CDropdownMenu className="pt-0" placement="bottom-end">
        <CDropdownHeader className="bg-body-secondary fw-semibold py-2">Cuenta</CDropdownHeader>
        
        {/* Información del usuario */}
        <CDropdownItem className="py-2" disabled>
          <CIcon icon={cilUser} className="me-2" />
          <span className="small text-muted">{userEmail}</span>
        </CDropdownItem>

        <CDropdownDivider />
        
        <CDropdownItem onClick={handleLogout} href="#" className="text-danger">
          <CIcon icon={cilExitToApp} className="me-2" />
          Salir
        </CDropdownItem>
      </CDropdownMenu>
    </CDropdown>
  )
}

export default AppHeaderDropdown;