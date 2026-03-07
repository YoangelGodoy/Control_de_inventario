import { element } from 'prop-types'
import React from 'react'

const Dashboard = React.lazy(() => import('./views/dashboard/Dashboard'))
const Users = React.lazy(() => import('./views/users/users'))
const Historial = React.lazy(() => import ('./views/Historial/Historial'))
const Productos = React.lazy(() => import ('./views/Inventario/Producto/productos')) 
const Compras = React.lazy(() => import ('./views/Inventario/Compras/Compras')) 
const proveedores = React.lazy(() => import ('./views/Proveedores/proveedores')) 
const ventas = React.lazy(() => import ('./views/ventas/ventas'))
const Login = React.lazy(() => import ('./views/pages/login/Login')) 
const Register = React.lazy(() => import ('./views/pages/register/Register'))
const clientes = React.lazy(() => import ('./views/clientes/clientes'))
const deudas = React.lazy(() => import ('./views/deudas/deudas'))
const empleados = React.lazy(() => import ('./views/empleados/empleados'))
const Inven_empleado = React.lazy(() => import ('./views/empleados/stock_empleado'))
const venta_empleado = React.lazy(() => import ('./views/empleados/venta_empleado'))

const routes = [
  { path: '/', exact: true, name: 'Home', element: Login},
  { path: '/register', name: 'Register', element: Register},
  { path: '/dashboard', name: 'Dashboard', element: Dashboard },
  { path: '/users', name: 'Users', element: Users },
  { path: '/Inventario/Compras' ,  name: 'Compras', element: Compras },
  { path: '/Inventario/Producto', name:'Productos', element: Productos },
  { path: '/Historial', name:'Historial', element: Historial },
  { path: '/proveedores', name:'proveedores', element: proveedores  },
  { path: '/ventas', name:'Ventas', element: ventas},
  {path: '/clientes', name:'Clientes', element: clientes},
  {path: '/deudas', name:'deudas', element: deudas},
  {path: '/empleados', name:'empleados', element: empleados},
  {path: '/stock_empleado', name:'Stock_empleado', element: Inven_empleado},
  {path: '/venta_empleado', name:'Venta_empleado', element: venta_empleado}
]

export default routes
