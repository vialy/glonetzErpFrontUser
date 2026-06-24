"use client"

import { RouteReadyMarker } from "@/components/route-loader"

export default function DashboardTemplate({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <RouteReadyMarker />
    </>
  )
}
