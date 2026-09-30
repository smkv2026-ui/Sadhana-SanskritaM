import { lazy } from 'react';
import { createBrowserRouter, type RouteObject } from 'react-router-dom';
import { Layout } from './shared/layout/Layout';
import HomePage from './pages/HomePage';

// Everything except the home page is code-split.
const CoursesPage = lazy(() => import('./features/courses/CoursesPage'));
const CourseDetailPage = lazy(() => import('./features/courses/CourseDetailPage'));
const EventsPage = lazy(() => import('./features/courses/EventsPage'));
const RegisterPage = lazy(() => import('./features/registration/RegisterPage'));
const FinderPage = lazy(() => import('./features/finder/FinderPage'));
const AboutPage = lazy(() => import('./pages/AboutPage'));
const ContactPage = lazy(() => import('./pages/ContactPage'));
const LegalPage = lazy(() => import('./pages/LegalPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));
const SignInPage = lazy(() => import('./pages/SignInPage'));
const AuthFinishPage = lazy(() => import('./pages/AuthFinishPage'));
const SubscribePage = lazy(() => import('./features/notifications/SubscribePage'));
const SubscriptionLinkPage = lazy(() => import('./features/notifications/SubscriptionLinkPage'));
const CustomAppPage = lazy(() => import('./features/custom-requests/CustomAppPage'));
const TrackRequestsPage = lazy(() => import('./features/custom-requests/TrackRequestsPage'));
const MyLearningPage = lazy(() => import('./features/learning/MyLearningPage'));
const ReceiptPage = lazy(() => import('./features/learning/ReceiptPage'));
const AdminApp = lazy(() => import('./features/admin/AdminApp'));

export const routeObjects: RouteObject[] = [
  {
    element: <Layout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'courses', element: <CoursesPage /> },
      { path: 'courses/:slug', element: <CourseDetailPage /> },
      { path: 'courses/:slug/register', element: <RegisterPage /> },
      { path: 'events', element: <EventsPage /> },
      { path: 'find-your-path', element: <FinderPage /> },
      { path: 'about', element: <AboutPage /> },
      { path: 'contact', element: <ContactPage /> },
      { path: 'privacy', element: <LegalPage doc="privacy" /> },
      { path: 'terms', element: <LegalPage doc="terms" /> },
      { path: 'refund-policy', element: <LegalPage doc="refund" /> },
      { path: 'subscribe', element: <SubscribePage /> },
      { path: 'subscribe/confirm', element: <SubscriptionLinkPage mode="confirm" /> },
      { path: 'subscribe/preferences', element: <SubscriptionLinkPage mode="preferences" /> },
      { path: 'subscribe/unsubscribe', element: <SubscriptionLinkPage mode="unsubscribe" /> },
      { path: 'custom-apps', element: <CustomAppPage /> },
      { path: 'custom-apps/track', element: <TrackRequestsPage /> },
      { path: 'my-learning', element: <MyLearningPage /> },
      { path: 'my-learning/receipt/:id', element: <ReceiptPage /> },
      { path: 'sign-in', element: <SignInPage /> },
      { path: 'auth/finish', element: <AuthFinishPage /> },
      { path: 'admin/*', element: <AdminApp /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
];

export const router = createBrowserRouter(routeObjects, { basename: import.meta.env.BASE_URL.replace(/\/$/, '') || '/' });
