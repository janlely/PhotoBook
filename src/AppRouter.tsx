import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import CanvasEditPage from './pages/CanvasEditPage';
import AboutPage from './pages/AboutPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ImageUploadPage from './pages/ImageUploadPage';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';

const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/register',
    element: <RegisterPage />,
  },
  {
    path: '/',
    element: <ProtectedRoute><Layout /></ProtectedRoute>,
    children: [
      { index: true, element: <CanvasEditPage /> },
      { path: 'about', element: <AboutPage /> },
      { path: 'upload', element: <ImageUploadPage /> },
    ],
  },
]);

function AppRouter() {
  return <RouterProvider router={router} />;
}

export default AppRouter;
