import { lazy, Suspense, type ComponentType } from "react";
import { createBrowserRouter, Navigate } from "react-router";
import {
  CheckEmailPage,
  HowPage,
  HelpPage,
  LoginPage,
  NotFoundPage,
  RegisterPage,
  VerifyPage,
} from "../features/auth/auth-pages";
import { HomePage } from "../features/experience/home-page";
import { BrowsePage, DashboardPage, ExamDetailPage } from "../features/catalog/catalog-pages";
import { ProfilePage } from "../features/profile/profile-page";
import { SkeletonLines } from "../shared/ui/ui";
import { RootFrame } from "./chrome";
import { CandidateShell, ExamShell, PublicShell, RequireAuth } from "./shells";

function load(factory: () => Promise<{ default: ComponentType }>) {
  const Page = lazy(factory);
  return function LoadedPage() {
    return (
      <Suspense fallback={<SkeletonLines />}>
        <Page />
      </Suspense>
    );
  };
}

const ExamRoomPage = load(() =>
  import("../features/assessment/exam-room").then((mod) => ({ default: mod.ExamRoomPage })),
);
const SampleExperiencePage = load(() =>
  import("../features/experience/sample-experience").then((mod) => ({
    default: mod.SampleExperience,
  })),
);
const StatusPage = load(() =>
  import("../features/results/result-pages").then((mod) => ({ default: mod.StatusPage })),
);
const ResultPage = load(() =>
  import("../features/results/result-pages").then((mod) => ({ default: mod.ResultPage })),
);
const ReviewPage = load(() =>
  import("../features/results/result-pages").then((mod) => ({ default: mod.ReviewPage })),
);
const HistoryPage = load(() =>
  import("../features/results/result-pages").then((mod) => ({ default: mod.HistoryPage })),
);
const LeaderboardPage = load(() =>
  import("../features/results/result-pages").then((mod) => ({ default: mod.LeaderboardPage })),
);
const AdminLayout = load(() =>
  import("../features/admin/admin-layout").then((mod) => ({ default: mod.AdminLayout })),
);
const AdminHomePage = load(() =>
  import("../features/admin/admin-layout").then((mod) => ({ default: mod.AdminHomePage })),
);
const AdminExamListPage = load(() =>
  import("../features/admin/admin-exams").then((mod) => ({ default: mod.AdminExamListPage })),
);
const AdminExamEditorPage = load(() =>
  import("../features/admin/admin-exams").then((mod) => ({ default: mod.AdminExamEditorPage })),
);
const QuestionListPage = load(() =>
  import("../features/admin/admin-questions").then((mod) => ({ default: mod.QuestionListPage })),
);
const QuestionEditorPage = load(() =>
  import("../features/admin/admin-questions").then((mod) => ({ default: mod.QuestionEditorPage })),
);
const ImportPage = load(() =>
  import("../features/admin/admin-import").then((mod) => ({ default: mod.ImportPage })),
);
const ImportReportPage = load(() =>
  import("../features/admin/admin-import").then((mod) => ({ default: mod.ImportReportPage })),
);
const MonitorIndexPage = load(() =>
  import("../features/admin/admin-monitor").then((mod) => ({ default: mod.MonitorIndexPage })),
);
const MonitorExamPage = load(() =>
  import("../features/admin/admin-monitor").then((mod) => ({ default: mod.MonitorExamPage })),
);
const SubmissionsPage = load(() =>
  import("../features/admin/admin-monitor").then((mod) => ({ default: mod.SubmissionsPage })),
);
const AdminAttemptPage = load(() =>
  import("../features/admin/admin-monitor").then((mod) => ({ default: mod.AdminAttemptPage })),
);
const StatisticsPage = load(() =>
  import("../features/admin/admin-insights").then((mod) => ({ default: mod.StatisticsPage })),
);
const MetricsPage = load(() =>
  import("../features/admin/admin-insights").then((mod) => ({ default: mod.MetricsPage })),
);
const AuditPage = load(() =>
  import("../features/admin/admin-insights").then((mod) => ({ default: mod.AuditPage })),
);
const DemoDev =
  import.meta.env.VITE_DATA_MODE === "demo" ? lazy(() => import("../demo/dev-ui")) : null;

function DevGate() {
  if (!DemoDev) return <NotFoundPage />;
  return (
    <Suspense fallback={<SkeletonLines />}>
      <DemoDev />
    </Suspense>
  );
}

export const router = createBrowserRouter([
  {
    element: <RootFrame />,
    children: [
      {
        element: <PublicShell />,
        children: [
          { path: "/", element: <HomePage /> },
          { path: "/experience", element: <SampleExperiencePage /> },
          { path: "/how-it-works", element: <HowPage /> },
          { path: "/help", element: <HelpPage /> },
          { path: "/login", element: <LoginPage /> },
          { path: "/register", element: <RegisterPage /> },
          { path: "/check-email", element: <CheckEmailPage /> },
          { path: "/verify-email", element: <VerifyPage /> },
          { path: "/dev/ui", element: <DevGate /> },
        ],
      },
      {
        element: <RequireAuth />,
        children: [
          {
            element: <CandidateShell />,
            children: [
              { path: "/dashboard", element: <DashboardPage /> },
              { path: "/exams", element: <BrowsePage /> },
              { path: "/exams/:examId", element: <ExamDetailPage /> },
              { path: "/attempts/:attemptId/status", element: <StatusPage /> },
              { path: "/attempts/:attemptId/result", element: <ResultPage /> },
              { path: "/attempts/:attemptId/review", element: <ReviewPage /> },
              { path: "/history", element: <HistoryPage /> },
              {
                path: "/exams/:examId/versions/:versionId/leaderboard",
                element: <LeaderboardPage />,
              },
              { path: "/profile", element: <ProfilePage /> },
            ],
          },
          {
            element: <ExamShell />,
            children: [{ path: "/attempts/:attemptId", element: <ExamRoomPage /> }],
          },
          {
            path: "/admin",
            element: <AdminLayout />,
            children: [
              { index: true, element: <AdminHomePage /> },
              { path: "exams", element: <AdminExamListPage /> },
              { path: "exams/new", element: <AdminExamEditorPage /> },
              { path: "exams/:examId/edit", element: <AdminExamEditorPage /> },
              { path: "exams/:examId", element: <AdminExamEditorPage /> },
              { path: "questions", element: <QuestionListPage /> },
              { path: "questions/new", element: <QuestionEditorPage /> },
              { path: "questions/:questionId/edit", element: <QuestionEditorPage /> },
              { path: "questions/:questionId", element: <QuestionEditorPage /> },
              { path: "imports", element: <Navigate to="/admin/imports/new" replace /> },
              { path: "imports/new", element: <ImportPage /> },
              { path: "imports/:importId", element: <ImportReportPage /> },
              { path: "monitor", element: <MonitorIndexPage /> },
              { path: "exams/:examId/monitor", element: <MonitorExamPage /> },
              { path: "exams/:examId/submissions", element: <SubmissionsPage /> },
              { path: "attempts/:attemptId", element: <AdminAttemptPage /> },
              { path: "exams/:examId/versions/:versionId/statistics", element: <StatisticsPage /> },
              { path: "metrics", element: <MetricsPage /> },
              { path: "audit", element: <AuditPage /> },
            ],
          },
        ],
      },
      { path: "*", element: <PublicShell />, children: [{ path: "*", element: <NotFoundPage /> }] },
    ],
  },
]);
