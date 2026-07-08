/* eslint-disable react-refresh/only-export-components */
import { lazy } from "react";
import { createBrowserRouter } from "react-router-dom";
import { ProtectedRoute, PublicOnlyRoute } from "@/components/ProtectedRoute";
import { AdminDashboardLayout } from "@/components/layout/AdminDashboardLayout";
import { InstructorDashboardLayout } from "@/components/layout/InstructorDashboardLayout";
import { StudentDashboardLayout } from "@/components/layout/StudentDashboardLayout";
import { AuthLayout } from "@/components/layouts/AuthLayout";
import { PublicLayout } from "@/components/layouts/PublicLayout";
import { ROUTES } from "@/lib/routes";

// Suspense in main.tsx shows LoadingPage while lazy chunks load.
const HomePage = lazy(() => import("@/pages/public/HomePage").then((m) => ({ default: m.HomePage })));
const LoginPage = lazy(() => import("@/pages/auth/LoginPage").then((m) => ({ default: m.LoginPage })));
const RegisterPage = lazy(() => import("@/pages/auth/RegisterPage").then((m) => ({ default: m.RegisterPage })));
const NotFoundPage = lazy(() => import("@/pages/shared/NotFoundPage").then((m) => ({ default: m.NotFoundPage })));
const NotificationsPage = lazy(() => import("@/pages/NotificationsPage").then((m) => ({ default: m.NotificationsPage })));

const StudentDashboardPage = lazy(() => import("@/pages/student/StudentDashboardPage").then((m) => ({ default: m.StudentDashboardPage })));
const StudentRequestsPage = lazy(() => import("@/pages/student/StudentRequestsPage").then((m) => ({ default: m.StudentRequestsPage })));
const RequestDetailsPage = lazy(() => import("@/pages/student/RequestDetailsPage").then((m) => ({ default: m.RequestDetailsPage })));
const CreateRequestPage = lazy(() => import("@/pages/student/CreateRequestPage").then((m) => ({ default: m.CreateRequestPage })));
const StudentInstantRequestsPage = lazy(() => import("@/pages/student/InstantRequestsPage").then((m) => ({ default: m.InstantRequestsPage })));
const CreateInstantRequestPage = lazy(() => import("@/pages/student/CreateInstantRequestPage").then((m) => ({ default: m.CreateInstantRequestPage })));
const StudentInstantRequestDetailsPage = lazy(() => import("@/pages/student/InstantRequestDetailsPage").then((m) => ({ default: m.InstantRequestDetailsPage })));
const GroupRequestsPage = lazy(() => import("@/pages/student/GroupRequestsPage").then((m) => ({ default: m.GroupRequestsPage })));
const CreateGroupRequestPage = lazy(() => import("@/pages/student/CreateGroupRequestPage").then((m) => ({ default: m.CreateGroupRequestPage })));
const GroupRequestDetailsPage = lazy(() => import("@/pages/student/GroupRequestDetailsPage").then((m) => ({ default: m.GroupRequestDetailsPage })));
const BrowseInstructorsPage = lazy(() => import("@/pages/student/BrowseInstructorsPage").then((m) => ({ default: m.BrowseInstructorsPage })));
const StudentInstructorProfilePage = lazy(() => import("@/pages/student/InstructorProfilePage").then((m) => ({ default: m.InstructorProfilePage })));
const ChatPage = lazy(() => import("@/pages/student/ChatPage").then((m) => ({ default: m.ChatPage })));
const SessionsPage = lazy(() => import("@/pages/student/SessionsPage").then((m) => ({ default: m.SessionsPage })));
const SessionDetailsPage = lazy(() => import("@/pages/student/SessionDetailsPage").then((m) => ({ default: m.SessionDetailsPage })));
const PaymentsPage = lazy(() => import("@/pages/student/PaymentsPage").then((m) => ({ default: m.PaymentsPage })));
const PaymentConfirmationPage = lazy(() => import("@/pages/student/PaymentConfirmationPage").then((m) => ({ default: m.PaymentConfirmationPage })));
const PaymentCallbackPage = lazy(() => import("@/pages/student/PaymentCallbackPage").then((m) => ({ default: m.PaymentCallbackPage })));
const StudentReviewsPage = lazy(() => import("@/pages/student/StudentReviewsPage").then((m) => ({ default: m.StudentReviewsPage })));
const ProfilePage = lazy(() => import("@/pages/student/ProfilePage").then((m) => ({ default: m.ProfilePage })));
const StudentSettingsPage = lazy(() => import("@/pages/student/StudentSettingsPage").then((m) => ({ default: m.StudentSettingsPage })));

const InstructorDashboardPage = lazy(() => import("@/pages/instructor/InstructorDashboardPage").then((m) => ({ default: m.InstructorDashboardPage })));
const InstructorRequestsPage = lazy(() => import("@/pages/instructor/InstructorRequestsPage").then((m) => ({ default: m.InstructorRequestsPage })));
const InstructorRequestDetailsPage = lazy(() => import("@/pages/instructor/InstructorRequestDetailsPage").then((m) => ({ default: m.InstructorRequestDetailsPage })));
const InstructorInstantRequestsPage = lazy(() => import("@/pages/instructor/InstantRequestsPage").then((m) => ({ default: m.InstructorInstantRequestsPage })));
const InstructorInstantRequestDetailsPage = lazy(() => import("@/pages/instructor/InstantRequestDetailsPage").then((m) => ({ default: m.InstructorInstantRequestDetailsPage })));
const InstructorSessionsPage = lazy(() => import("@/pages/instructor/InstructorSessionsPage").then((m) => ({ default: m.InstructorSessionsPage })));
const InstructorSessionDetailsPage = lazy(() => import("@/pages/instructor/InstructorSessionDetailsPage").then((m) => ({ default: m.InstructorSessionDetailsPage })));
const InstructorChatPage = lazy(() => import("@/pages/instructor/InstructorChatPage").then((m) => ({ default: m.InstructorChatPage })));
const InstructorWalletPage = lazy(() => import("@/pages/instructor/InstructorWalletPage").then((m) => ({ default: m.InstructorWalletPage })));
const InstructorReviewsPage = lazy(() => import("@/pages/instructor/InstructorReviewsPage").then((m) => ({ default: m.InstructorReviewsPage })));
const InstructorProfilePage = lazy(() => import("@/pages/instructor/InstructorProfilePage").then((m) => ({ default: m.InstructorProfilePage })));
const InstructorAvailabilityPage = lazy(() => import("@/pages/instructor/InstructorAvailabilityPage").then((m) => ({ default: m.InstructorAvailabilityPage })));
const InstructorSettingsPage = lazy(() => import("@/pages/instructor/InstructorSettingsPage").then((m) => ({ default: m.InstructorSettingsPage })));

const AdminDashboardPage = lazy(() => import("@/pages/admin/AdminDashboardPage").then((m) => ({ default: m.AdminDashboardPage })));
const AdminUsersPage = lazy(() => import("@/pages/admin/AdminUsersPage").then((m) => ({ default: m.AdminUsersPage })));
const AdminRequestsPage = lazy(() => import("@/pages/admin/AdminRequestsPage").then((m) => ({ default: m.AdminRequestsPage })));
const AdminSessionsPage = lazy(() => import("@/pages/admin/AdminSessionsPage").then((m) => ({ default: m.AdminSessionsPage })));
const AdminPaymentsPage = lazy(() => import("@/pages/admin/AdminPaymentsPage").then((m) => ({ default: m.AdminPaymentsPage })));
const AdminReviewsPage = lazy(() => import("@/pages/admin/AdminReviewsPage").then((m) => ({ default: m.AdminReviewsPage })));

export const router = createBrowserRouter([
  {
    element: <PublicLayout />,
    children: [{ path: ROUTES.HOME, element: <HomePage /> }],
  },
  {
    element: <AuthLayout />,
    children: [
      {
        element: <PublicOnlyRoute />,
        children: [
          { path: ROUTES.LOGIN, element: <LoginPage /> },
          { path: ROUTES.REGISTER, element: <RegisterPage /> },
        ],
      },
    ],
  },
  {
    element: <ProtectedRoute allowedRoles={["student"]} />,
    children: [
      {
        element: <StudentDashboardLayout />,
        children: [
          { path: ROUTES.STUDENT.DASHBOARD, element: <StudentDashboardPage /> },
          { path: ROUTES.STUDENT.REQUESTS, element: <StudentRequestsPage /> },
          { path: ROUTES.STUDENT.REQUEST_DETAILS, element: <RequestDetailsPage /> },
          { path: ROUTES.STUDENT.REQUEST_CREATE, element: <CreateRequestPage /> },
          { path: ROUTES.STUDENT.INSTANT_REQUESTS, element: <StudentInstantRequestsPage /> },
          { path: ROUTES.STUDENT.INSTANT_REQUEST_CREATE, element: <CreateInstantRequestPage /> },
          { path: ROUTES.STUDENT.INSTANT_REQUEST_DETAILS, element: <StudentInstantRequestDetailsPage /> },
          { path: ROUTES.STUDENT.GROUP_REQUESTS, element: <GroupRequestsPage /> },
          { path: ROUTES.STUDENT.GROUP_REQUEST_CREATE, element: <CreateGroupRequestPage /> },
          { path: ROUTES.STUDENT.GROUP_REQUEST_DETAILS, element: <GroupRequestDetailsPage /> },
          { path: ROUTES.STUDENT.INSTRUCTORS, element: <BrowseInstructorsPage /> },
          { path: ROUTES.STUDENT.INSTRUCTOR_DETAILS, element: <StudentInstructorProfilePage /> },
          { path: ROUTES.STUDENT.CHAT, element: <ChatPage /> },
          { path: ROUTES.STUDENT.SESSIONS, element: <SessionsPage /> },
          { path: ROUTES.STUDENT.SESSION_DETAILS, element: <SessionDetailsPage /> },
          { path: ROUTES.STUDENT.PAYMENTS, element: <PaymentsPage /> },
          { path: ROUTES.STUDENT.PAYMENT_CONFIRMATION, element: <PaymentConfirmationPage /> },
          { path: ROUTES.STUDENT.PAYMENT_CALLBACK, element: <PaymentCallbackPage /> },
          { path: ROUTES.STUDENT.REVIEWS, element: <StudentReviewsPage /> },
          { path: ROUTES.STUDENT.PROFILE, element: <ProfilePage /> },
          { path: ROUTES.STUDENT.SETTINGS, element: <StudentSettingsPage /> },
          { path: ROUTES.NOTIFICATIONS, element: <NotificationsPage /> },
        ],
      },
    ],
  },
  {
    element: <ProtectedRoute allowedRoles={["instructor"]} />,
    children: [
      {
        element: <InstructorDashboardLayout />,
        children: [
          { path: ROUTES.INSTRUCTOR.DASHBOARD, element: <InstructorDashboardPage /> },
          { path: ROUTES.INSTRUCTOR.REQUESTS, element: <InstructorRequestsPage /> },
          { path: ROUTES.INSTRUCTOR.REQUEST_DETAILS, element: <InstructorRequestDetailsPage /> },
          { path: ROUTES.INSTRUCTOR.INSTANT_REQUESTS, element: <InstructorInstantRequestsPage /> },
          { path: ROUTES.INSTRUCTOR.INSTANT_REQUEST_DETAILS, element: <InstructorInstantRequestDetailsPage /> },
          { path: ROUTES.INSTRUCTOR.SESSIONS, element: <InstructorSessionsPage /> },
          { path: ROUTES.INSTRUCTOR.SESSION_DETAILS, element: <InstructorSessionDetailsPage /> },
          { path: ROUTES.INSTRUCTOR.CHAT, element: <InstructorChatPage /> },
          { path: ROUTES.INSTRUCTOR.WALLET, element: <InstructorWalletPage /> },
          { path: ROUTES.INSTRUCTOR.REVIEWS, element: <InstructorReviewsPage /> },
          { path: ROUTES.INSTRUCTOR.PROFILE, element: <InstructorProfilePage /> },
          { path: ROUTES.INSTRUCTOR.AVAILABILITY, element: <InstructorAvailabilityPage /> },
          { path: ROUTES.INSTRUCTOR.SETTINGS, element: <InstructorSettingsPage /> },
          { path: ROUTES.NOTIFICATIONS, element: <NotificationsPage /> },
        ],
      },
    ],
  },
  {
    element: <ProtectedRoute allowedRoles={["admin"]} />,
    children: [
      {
        element: <AdminDashboardLayout />,
        children: [
          { path: ROUTES.ADMIN.DASHBOARD, element: <AdminDashboardPage /> },
          { path: ROUTES.ADMIN.USERS, element: <AdminUsersPage /> },
          { path: ROUTES.ADMIN.REQUESTS, element: <AdminRequestsPage /> },
          { path: ROUTES.ADMIN.SESSIONS, element: <AdminSessionsPage /> },
          { path: ROUTES.ADMIN.PAYMENTS, element: <AdminPaymentsPage /> },
          { path: ROUTES.ADMIN.REVIEWS, element: <AdminReviewsPage /> },
          { path: ROUTES.NOTIFICATIONS, element: <NotificationsPage /> },
        ],
      },
    ],
  },
  { path: "*", element: <NotFoundPage /> },
]);
