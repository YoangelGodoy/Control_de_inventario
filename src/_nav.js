import React from 'react'
import CIcon from '@coreui/icons-react'
import {
  cilTruck,
  cilHome,
  cilCreditCard,
  cilUser,
  cibCcVisa,
  cilStorage,
  cilHistory,
  cilPeople,
  cilTags,
  cilDollar,
  cilCart
} from '@coreui/icons'
import { CNav, CNavbar, CNavGroup, CNavItem, CNavTitle} from '@coreui/react'
import { compose } from 'redux'

const _nav = [
  {
    component: CNavItem,
    name: 'Inicio',
    to: '/Dashboard',
    icon: <CIcon icon={cilHome} customClassName="nav-icon" />,
    badge: {
      color: 'info',
    },
  },
  {
    component: CNavItem,
    name: 'Usuarios',
    to: '/users',
    icon: <CIcon icon={cilPeople} customClassName="nav-icon" />
  },
 /*  {
    component: CNavItem,
    name: 'Login',
    to: '/login',
    icon: <CIcon icon={cilUser} customClassName="nav-icon" />,
  },
  {
    component: CNavItem,
    name: 'Registro',
    to: '/register',
    icon: <CIcon icon={cilUserPlus} customClassName="nav-icon" />,
  }, */
  {
    component: CNavTitle,
    name: 'Inventario',
  },
  { 
    component: CNavItem,
    name: 'Productos',
    to: '/Inventario/Producto',
    icon: <CIcon icon={cilTags} customClassName="nav-icon" />,
  },
  {
    component: CNavItem,
    name: 'Compras',
    to:'/Inventario/Compras',
    icon: <CIcon icon={cibCcVisa} customClassName="nav-icon" />,
  },

  {
    component: CNavTitle,
    name: 'Registros',
  },
  {
    component: CNavItem,
    name: 'Proveedores',
    to: '/proveedores',
    icon: <CIcon icon={cilTruck} customClassName="nav-icon" />,
  },
  {
    component: CNavItem,
    name: 'Clientes',
    to: '/clientes',
    icon: <CIcon icon={cilUser} customClassName="nav-icon" />,
  },
  {
    component: CNavItem,
    name: 'Empleados',
    to: '/empleados',
    icon: <CIcon icon={cilUser} customClassName="nav-icon" />,
  },
  {
    component: CNavItem,
    name: 'Stock de Empleados',
    to: '/stock_empleado',
    icon: <CIcon icon={cilStorage} customClassName="nav-icon" />,
  },
  
  {
    component: CNavTitle,
    name: 'Ventas',
  },
  {
    component: CNavItem,
    name: 'Ventas',
    to: '/ventas',
    icon: <CIcon icon={cilDollar} customClassName="nav-icon" />,
  },
  {
    component: CNavItem,
    name: 'Venta por Empleado',
    to: '/venta_empleado',
    icon: <CIcon icon={cilCart} customClassName="nav-icon" />,
  },
  {
    component: CNavItem,
    name: 'Ventas a Credito',
    to: '/deudas',
    icon: <CIcon icon={cilCreditCard} customClassName="nav-icon" />,
  },
  {
    component: CNavItem,
    name: 'Historial',
    to: '/historial',
    icon: <CIcon icon={cilHistory} customClassName="nav-icon" />,
  },
]

export default _nav
