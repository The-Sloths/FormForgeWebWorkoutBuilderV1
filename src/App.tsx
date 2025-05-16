import { Toaster } from "@/components/ui/toaster";

import { BrowserRouter, Link, Route, Routes } from "react-router-dom";

import DocumentsPage from "./pages/DocumentsPage";
import WorkoutPlanPage from "./pages/WorkoutPlanPage";
import WorkoutPlansPage from "./pages/WorkoutPlansPage";
import MockDashboard from "./components/mock-dasboard";

function WorkoutBuilder() {
  return (
    <div className="min-h-screen">
      <header className="bg-primary text-primary-foreground py-8">
        <div className="container mx-auto text-center">
          <h1 className="text-3xl font-bold">Gradatrim</h1>
          <p className="text-xl mt-2">Custom Workout Creator</p>
        </div>
      </header>

      <main className="container mx-auto py-8 px-4">
        <MockDashboard />
      </main>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <>
        <nav className="bg-primary text-primary-foreground">
          <div className="container mx-auto px-4 py-2 flex items-center justify-between">
            <Link to="/" className="font-bold text-lg">
              <img
                src="/gradatrim_logo.png"
                alt="Gradatrim Logo"
                className="h-16 w-auto"
              />
            </Link>
            <div className="space-x-4">
              <Link to="/workouts" className="hover:underline">
                Workouts
              </Link>
              <Link to="/documents" className="hover:underline">
                Documents
              </Link>
            </div>
          </div>
        </nav>

        <Routes>
          <Route path="/" element={<WorkoutBuilder />} />
          <Route path="/documents" element={<DocumentsPage />} />
          <Route path="/workouts" element={<WorkoutPlansPage />} />
          <Route path="/workout-plan/:planId" element={<WorkoutPlanPage />} />
        </Routes>

        <Toaster />
      </>
    </BrowserRouter>
  );
}
