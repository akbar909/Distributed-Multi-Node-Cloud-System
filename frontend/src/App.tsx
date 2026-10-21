import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import AppLayout from "./components/layout/AppLayout";
import { ToastProvider } from "./components/common/Toast";
import DashboardPage from "./pages/DashboardPage";
import UploadPage from "./pages/UploadPage";
import TaskMonitorPage from "./pages/TaskMonitorPage";
import WorkerMonitorPage from "./pages/WorkerMonitorPage";
import BenchmarkPage from "./pages/BenchmarkPage";
import HistoryPage from "./pages/HistoryPage";
import { useState, useEffect } from "react";
import { getHealth } from "./api/client";

export default function App() {
  const [deploymentMode, setDeploymentMode] = useState<string>("local");

  useEffect(() => {
    getHealth()
      .then((data) => {
        if (data.deployment_mode) {
          setDeploymentMode(data.deployment_mode);
        }
      })
      .catch(() => {
        // Fallback to local default if backend is not yet reachable
      });
  }, []);

  return (
    <ToastProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<AppLayout deploymentMode={deploymentMode} />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/upload" element={<UploadPage />} />
            <Route path="/tasks" element={<TaskMonitorPage />} />
            <Route path="/workers" element={<WorkerMonitorPage />} />
            <Route path="/benchmarks" element={<BenchmarkPage />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ToastProvider>
  );
}
