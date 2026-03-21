import React from "react"

export default function FillLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-screen overflow-y-auto">
      {children}
    </div>
  )
}
