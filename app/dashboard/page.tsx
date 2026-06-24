"use client"

import dynamic from "next/dynamic"

const StudentDashboard = dynamic(
  () => import("@/components/student-dashboard").then((m) => m.StudentDashboard),
  {
    loading: () => (
      <div className="animate-pulse space-y-4 p-4 md:p-6">
        <div className="h-24 rounded-2xl bg-muted" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="h-28 rounded-2xl bg-muted" />
          <div className="h-28 rounded-2xl bg-muted" />
        </div>
      </div>
    ),
  },
)

export default function DashboardPage() {
  return <StudentDashboard />
}
