import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  CCloseButton,
  CSidebar,
  CSidebarBrand,
  CSidebarFooter,
  CSidebarHeader,
  CSidebarToggler,
} from '@coreui/react';
import CIcon from '@coreui/icons-react';

import { AppSidebarNav } from './AppSidebarNav';

import logo from 'src/assets/images/logo_parts2.png';
import '../scss/_custom.scss'
// sidebar nav config
import navigation from '../_nav';

const AppSidebar = () => {
  const dispatch = useDispatch();
  const unfoldable = useSelector((state) => state.sidebarUnfoldable);
  const sidebarShow = useSelector((state) => state.sidebarShow);

  return (
    <CSidebar
      className="border-end"
      colorScheme="dark"
      position="fixed"
      unfoldable={unfoldable}
      visible={sidebarShow}
      onVisibleChange={(visible) => {
        dispatch({ type: 'set', sidebarShow: visible });
      }}
    >
      <CSidebarHeader className="border-bottom-logo p-0 d-flex justify-content-center">
        <CSidebarBrand className="d-flex align-items-center justify-content-center w-100" style={{ height: '114px' }}>
          <img 
            className="logo-maximized" 
            src={logo} 
            alt="Logo" 
          />
        </CSidebarBrand>
      </CSidebarHeader>
      <AppSidebarNav items={navigation} />
      
      <CSidebarFooter>
      <div className="border-top-logo" style={{paddingBottom:"1px", paddingTop:"15px", display: "flex", alignItems: "center", justifyContent: "left", textAlign: "center"}}>
        <CSidebarToggler
          onClick={() => dispatch({ type: 'set', sidebarUnfoldable: !unfoldable })}
        />
        </div>
      </CSidebarFooter>
    </CSidebar>
  );
};

export default React.memo(AppSidebar);