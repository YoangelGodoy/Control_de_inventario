import React from 'react'
import CIcon from '@coreui/icons-react'
import {
  cilBell,
  cilCalculator,
  cilChartPie,
  cilCursor,
  cilDescription,
  cilGroup,
  cilNotes,
  cilTruck,
  cilPuzzle,
  cilHome,
  cilFile,
  cilPlus,
  cilList,
  cilLibraryAdd,
  cilCreditCard,
  cilWallet,
  cilUserPlus,
  cilUser,
  cibCcVisa,
  cilStorage,
  cilInbox,
  cilHistory,
  cilPeople,
  cilTag,
  cilTags,
  cilDollar
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
    name: 'Deudas',
    to: '/deudas',
    icon: <CIcon icon={cilCreditCard} customClassName="nav-icon" />,
  },
  {
    component: CNavItem,
    name: 'Historial',
    to: '/historial',
    icon: <CIcon icon={cilHistory} customClassName="nav-icon" />,
  },
  // {
  //   component: CNavGroup,
  //   name: 'Servicio de Grúa',
  //   icon: <CIcon icon={cilLibraryAdd} customClassName="nav-icon" />,
  //   items: [
  //     {
  //       component: CNavItem,
  //       name: 'Añadir Servicio',
  //       to: '/services/add',
  //       icon: <CIcon icon={cilPlus} customClassName="nav-icon" />,
  //     },
  //     {
  //       component: CNavItem,
  //       name: 'Lista de Servicios',
  //       to: '/services/list',
  //       icon: <CIcon icon={cilList} customClassName="nav-icon" />,
  //     },
  //     {
  //       component: CNavItem,
  //       name: 'Pago de Servicio',
  //       to: '/services/paymentService',
  //       icon: <CIcon icon={cilWallet} customClassName="nav-icon" />,
  //     }
  //   ]
  // },

  /*{
    component: CNavTitle,
    name: 'Components',
  },
  {
    component: CNavGroup,
    name: 'Base',
    to: '/base',
    icon: <CIcon icon={cilPuzzle} customClassName="nav-icon" />,
    items: [
      {
        component: CNavItem,
        name: 'Accordion',
        to: '/base/accordion',
      },
      {
        component: CNavItem,
        name: 'Breadcrumb',
        to: '/base/breadcrumbs',
      },
      {
        component: CNavItem,
        name: 'Cards',
        to: '/base/cards',
      },
      {
        component: CNavItem,
        name: 'Carousel',
        to: '/base/carousels',
      },
      {
        component: CNavItem,
        name: 'Collapse',
        to: '/base/collapses',
      },
      {
        component: CNavItem,
        name: 'List group',
        to: '/base/list-groups',
      },
      {
        component: CNavItem,
        name: 'Navs & Tabs',
        to: '/base/navs',
      },
      {
        component: CNavItem,
        name: 'Pagination',
        to: '/base/paginations',
      },
      {
        component: CNavItem,
        name: 'Placeholders',
        to: '/base/placeholders',
      },
      {
        component: CNavItem,
        name: 'Popovers',
        to: '/base/popovers',
      },
      {
        component: CNavItem,
        name: 'Progress',
        to: '/base/progress',
      },
      {
        component: CNavItem,
        name: 'Spinners',
        to: '/base/spinners',
      },
      {
        component: CNavItem,
        name: 'Tables',
        to: '/base/tables',
      },
      {
        component: CNavItem,
        name: 'Tabs',
        to: '/base/tabs',
      },
      {
        component: CNavItem,
        name: 'Tooltips',
        to: '/base/tooltips',
      },
    ],
  },
  {
    component: CNavGroup,
    name: 'Buttons',
    to: '/buttons',
    icon: <CIcon icon={cilCursor} customClassName="nav-icon" />,
    items: [
      {
        component: CNavItem,
        name: 'Buttons',
        to: '/buttons/buttons',
      },
      {
        component: CNavItem,
        name: 'Buttons groups',
        to: '/buttons/button-groups',
      },
      {
        component: CNavItem,
        name: 'Dropdowns',
        to: '/buttons/dropdowns',
      },
    ],
  },
  {
    component: CNavGroup,
    name: 'Forms',
    icon: <CIcon icon={cilNotes} customClassName="nav-icon" />,
    items: [
      {
        component: CNavItem,
        name: 'Form Control',
        to: '/forms/form-control',
      },
      {
        component: CNavItem,
        name: 'Select',
        to: '/forms/select',
      },
      {
        component: CNavItem,
        name: 'Checks & Radios',
        to: '/forms/checks-radios',
      },
      {
        component: CNavItem,
        name: 'Range',
        to: '/forms/range',
      },
      {
        component: CNavItem,
        name: 'Input Group',
        to: '/forms/input-group',
      },
      {
        component: CNavItem,
        name: 'Floating Labels',
        to: '/forms/floating-labels',
      },
      {
        component: CNavItem,
        name: 'Layout',
        to: '/forms/layout',
      },
      {
        component: CNavItem,
        name: 'Validation',
        to: '/forms/validation',
      },
    ],
  },
  {
    component: CNavItem,
    name: 'Charts',
    to: '/charts',
    icon: <CIcon icon={cilChartPie} customClassName="nav-icon" />,
  },
  {
    component: CNavGroup,
    name: 'Icons',
    icon: <CIcon icon={cilStar} customClassName="nav-icon" />,
    items: [
      {
        component: CNavItem,
        name: 'CoreUI Free',
        to: '/icons/coreui-icons',
        badge: {
          color: 'success',
          text: 'NEW',
        },
      },
      {
        component: CNavItem,
        name: 'CoreUI Flags',
        to: '/icons/flags',
      },
      {
        component: CNavItem,
        name: 'CoreUI Brands',
        to: '/icons/brands',
      },
    ],
  },
  {
    component: CNavGroup,
    name: 'Notifications',
    icon: <CIcon icon={cilBell} customClassName="nav-icon" />,
    items: [
      {
        component: CNavItem,
        name: 'Alerts',
        to: '/notifications/alerts',
      },
      {
        component: CNavItem,
        name: 'Badges',
        to: '/notifications/badges',
      },
      {
        component: CNavItem,
        name: 'Modal',
        to: '/notifications/modals',
      },
      {
        component: CNavItem,
        name: 'Toasts',
        to: '/notifications/toasts',
      },
    ],
  },
  {
    component: CNavItem,
    name: 'Widgets',
    to: '/widgets',
    icon: <CIcon icon={cilCalculator} customClassName="nav-icon" />,
    badge: {
      color: 'info',
      text: 'NEW',
    },
  },**/
  // {
  //   component: CNavTitle,
  //   name: 'Extras',
  // },

  // {
  //   component: CNavGroup,
  //   name: 'Pages',
  //   icon: <CIcon icon={cilFile} customClassName="nav-icon" />,
  //   items: [
  //     {
  //       component: CNavItem,
  //       name: 'Error 404',
  //       to: '/404',
  //     },
  //     {
  //       component: CNavItem,
  //       name: 'Error 500',
  //       to: '/500',
  //     },
  //   ],
  // },
  /*
  {
    component: CNavItem,
    name: 'Docs',
    href: 'https://coreui.io/react/docs/templates/installation/',
    icon: <CIcon icon={cilDescription} customClassName="nav-icon" />,
  },*/
]

export default _nav
