"use client"

import type React from "react"

import { useEffect, useState, useMemo } from "react"
import AppShell from "@/components/layout/AppShell"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/useToast"

interface User {
  _id: string
  name: string
  email: string
  designation?: string
  department?: string
  role: "admin" | "employee"
  employerType?: "Field" | "HQ"
  archived?: boolean
}

interface Kpi {
  _id: string
  kpiName: string
  metric: string
  target: number
  weightage: number
  achievedValue: number
  score: number
  period: string
  status: "Pending" | "In Progress" | "Completed" | "not_started" | "in_progress" | "completed" | "at_risk"
  progress: number
  deadline?: string
  progressNotes?: string
  assignedTo: User
  assignedBy?: User
  employerType?: "Field" | "HQ"
  isDefault?: boolean
  readOnly?: boolean
  source?: "e-office" | "manual"
  verificationStatus?: "pending" | "approved" | "rejected"
  eofficeScore?: number
  verifiedBy?: User
  verifiedAt?: string
}

const KpiStatusBadge = ({ status }: { status: Kpi["status"] }) => {
  const styles = useMemo(() => {
    switch (status) {
      case "Completed":
      case "completed":
        return "bg-emerald-100 text-emerald-800"
      case "In Progress":
      case "in_progress":
        return "bg-sky-100 text-sky-800"
      case "Pending":
      case "not_started":
        return "bg-amber-100 text-amber-800"
      case "at_risk":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }, [status])

  const displayStatus = status.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase())

  return <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${styles}`}>{displayStatus}</span>
}

const ProgressBar = ({ achieved, target }: { achieved: number; target: number }) => {
  const progress = target === 0 ? 0 : Math.min((achieved / target) * 100, 100)
  const progressColor = progress >= 80 ? "bg-emerald-500" : progress >= 40 ? "bg-sky-500" : "bg-amber-500"

  return (
    <div className="w-full">
      <div className="flex justify-between text-xs mb-1">
        <span className="text-gray-500 font-medium">Progress</span>
        <span className="font-bold text-gray-700">{progress.toFixed(0)}%</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
        <div
          className={`${progressColor} h-2 rounded-full transition-all duration-500 ease-out`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  )
}

export default function KpiPage() {
  const router = useRouter()
  const { showToast } = useToast()
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [kpis, setKpis] = useState<Kpi[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingUsers, setLoadingUsers] = useState(false)

  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("All")

  const [isAddKpiOpen, setAddKpiOpen] = useState(false)
  const [isAnalyzeKpiOpen, setAnalyzeKpiOpen] = useState(false)
  const [isViewKpiOpen, setViewKpiOpen] = useState(false)
  const [selectedKpi, setSelectedKpi] = useState<Kpi | null>(null)
  const [selectedEmployerType, setSelectedEmployerType] = useState<"Field" | "HQ">("Field")
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("")
  const [analyzeAll, setAnalyzeAll] = useState(false) // new toggle
  const [results, setResults] = useState<
    Array<{
      employeeId: string
      employeeName: string
      department?: string
      employerType?: "Field" | "HQ"
      outputScore: number
    }>
  >([]) // results table

  useEffect(() => {
    const userData = localStorage.getItem("user")
    if (userData) {
      try {
        setCurrentUser(JSON.parse(userData))
      } catch {
        router.push("/login")
      }
    } else {
      router.push("/login")
    }
  }, [router])

  const isAdmin = useMemo(() => currentUser?.role === "admin", [currentUser])

  useEffect(() => {
    if (currentUser) {
      fetchKpis()
      if (isAdmin) {
        fetchUsers()
      }
    }
  }, [currentUser, isAdmin])

  const fetchKpis = async () => {
    if (!currentUser) return
    if (isAdmin) {
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const token = localStorage.getItem("token")
      const employerType = currentUser.employerType
        ? currentUser.employerType.toLowerCase() === "hq" || currentUser.employerType === "HQ"
          ? "HQ"
          : "Field"
        : undefined
      const url = `/api/kpi?userId=${currentUser._id}${employerType ? `&employerType=${employerType}` : ""}`
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      const data = await res.json()
      if (data.success) setKpis(data.data)
    } catch (error) {
      console.error("Error fetching KPIs:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchUsers = async () => {
    setLoadingUsers(true)
    try {
      const token = localStorage.getItem("token")
      const res = await fetch("/api/users", {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (data.success) setUsers(data.data || data.users || [])
    } catch (error) {
      console.error("Error fetching users:", error)
    } finally {
      setLoadingUsers(false)
    }
  }

  const handleAddDefaultKpi = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!selectedEmployeeId || !selectedEmployerType) {
      showToast({
        title: "Missing selection",
        description: "Please select an employee and employer type",
        variant: "error",
      })
      return
    }

    try {
      const token = localStorage.getItem("token")
      const res = await fetch("/api/kpi/add-default", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          employeeId: selectedEmployeeId,
          employerType: selectedEmployerType,
          period: "Annual",
        }),
      })
      const data = await res.json()
      if (data.success) {
        fetchKpis()
        setAddKpiOpen(false)
        setSelectedEmployeeId("")
        showToast({ title: "KPIs added", description: "Default KPIs have been added successfully", variant: "success" })
      } else {
        showToast({ title: "Failed to add KPIs", description: data.error || "An error occurred", variant: "error" })
      }
    } catch (err) {
      console.error(err)
      showToast({ title: "Error", description: "Error adding KPIs", variant: "error" })
    }
  }

  const handleAnalyzeKpi = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!analyzeAll && !selectedEmployeeId) {
      showToast({ title: "No employee selected", description: "Please select an employee", variant: "error" })
      return
    }

    try {
      const token = localStorage.getItem("token")
      const res = await fetch("/api/kpi/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(analyzeAll ? { all: true } : { employeeId: selectedEmployeeId }),
      })
      const data = await res.json()

      if (data.success) {
        if (analyzeAll) {
          const table = (data.results || []).map((r: any) => ({
            employeeId: r.employeeId,
            employeeName: r.employeeName,
            department: r.department,
            employerType: r.employerType,
            outputScore: r.outputScore,
          }))
          setResults(table)
          showToast({
            title: "Analysis Complete",
            description: `Analyzed ${table.length} employees`,
            variant: "success",
          })
        } else {
          showToast({
            title: "Analysis Complete",
            description: `Employee: ${data.employeeName} | Output: ${data.outputScore}/70`,
            variant: "success",
          })
          setResults((prev) => [
            ...prev.filter((r) => r.employeeId !== (selectedEmployeeId || "")),
            {
              employeeId: selectedEmployeeId,
              employeeName: data.employeeName,
              department: undefined,
              employerType: undefined,
              outputScore: data.outputScore,
            },
          ])
        }
        setAnalyzeKpiOpen(false)
        setSelectedEmployeeId("")
        setAnalyzeAll(false)
        fetchKpis()
      } else {
        showToast({ title: "Analysis failed", description: data.error || "Failed to analyze KPI", variant: "error" })
      }
    } catch (err) {
      console.error(err)
      showToast({ title: "Error", description: "Error analyzing KPI", variant: "error" })
    }
  }

  const filteredKpis = useMemo(() => {
    return kpis.filter((kpi) => {
      const matchesSearch =
        kpi.assignedTo?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        kpi.kpiName?.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesStatus =
        statusFilter === "All" ||
        kpi.status === statusFilter ||
        kpi.status.toLowerCase().replace(" ", "_") === statusFilter.toLowerCase()
      return matchesSearch && matchesStatus
    })
  }, [kpis, searchQuery, statusFilter])

  const activeUsers = users.filter((u) => !u.archived)
  const archivedUsers = users.filter((u) => u.archived)

  if (loading || !currentUser) {
    return (
      <AppShell title="KPIs" description="Track and manage Key Performance Indicators">
        <div className="flex h-screen items-center justify-center w-full">
          <p className="animate-pulse text-gray-500">Loading KPIs...</p>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell title="">
      <div className="min-h-screen p-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Key Performance Indicators</h1>
            <p className="text-gray-600 mt-1">
              {isAdmin ? "Manage and track employee KPIs" : "Track your performance goals"}
            </p>
          </div>
          {isAdmin && (
            <div className="flex gap-3">
              <button
                onClick={() => setAddKpiOpen(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                Add KPI
              </button>
              <button
                onClick={() => setAnalyzeKpiOpen(true)}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
              >
                Analyze KPI
              </button>
            </div>
          )}
        </div>

        <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
          <strong>ℹ️ These scores are obtained from the e-Office</strong>
        </div>

        {!isAdmin && kpis.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg border shadow-sm p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 font-medium">Total KPIs</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">{kpis.length}</p>
                </div>
                <div className="bg-blue-100 rounded-full p-3">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                    />
                  </svg>
                </div>
              </div>
              <div className="mt-4 flex items-center text-sm">
                <span className="text-emerald-600 font-medium">
                  {kpis.filter((k) => k.status === "completed" || k.status === "Completed").length} Completed
                </span>
                <span className="text-gray-400 mx-2">•</span>
                <span className="text-sky-600 font-medium">
                  {kpis.filter((k) => k.status === "in_progress" || k.status === "In Progress").length} In Progress
                </span>
              </div>
            </div>

            <div className="bg-white rounded-lg border shadow-sm p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 font-medium">Average Score</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">
                    {(kpis.reduce((sum, k) => sum + k.score, 0) / kpis.length).toFixed(1)}
                  </p>
                </div>
                <div className="bg-emerald-100 rounded-full p-3">
                  <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138z"
                    />
                  </svg>
                </div>
              </div>
              <div className="mt-4">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-emerald-500 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${kpis.reduce((sum, k) => sum + k.score, 0) / kpis.length}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg border shadow-sm p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 font-medium">Average Progress</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">
                    {(kpis.reduce((sum, k) => sum + k.progress, 0) / kpis.length).toFixed(0)}%
                  </p>
                </div>
                <div className="bg-sky-100 rounded-full p-3">
                  <svg className="w-6 h-6 text-sky-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                    />
                  </svg>
                </div>
              </div>
              <div className="mt-4">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-sky-500 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${kpis.reduce((sum, k) => sum + k.progress, 0) / kpis.length}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg border shadow-sm p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 font-medium">At Risk</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">
                    {kpis.filter((k) => k.status === "at_risk").length}
                  </p>
                </div>
                <div
                  className={`${kpis.filter((k) => k.status === "at_risk").length > 0 ? "bg-red-100" : "bg-gray-100"} rounded-full p-3`}
                >
                  <svg
                    className={`w-6 h-6 ${kpis.filter((k) => k.status === "at_risk").length > 0 ? "text-red-600" : "text-gray-400"}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                </div>
              </div>
              <div className="mt-4 flex items-center text-sm">
                <span className="text-gray-600">
                  {kpis.filter((k) => k.status === "not_started" || k.status === "Pending").length} Not Started
                </span>
              </div>
            </div>
          </div>
        )}

        {isAdmin ? (
          <div className="bg-white rounded-lg border shadow-sm p-8">
            <div className="text-center py-12">
              <h3 className="text-xl font-semibold text-gray-800 mb-2">KPI Analysis Dashboard</h3>
              <p className="text-gray-600 mb-8">
                Use the buttons above to add KPIs for employees or analyze their performance
              </p>
              <div className="max-w-md mx-auto space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-800 text-center">
                    Click "Analyze KPI" to generate and view final performance scores
                  </p>
                </div>
              </div>
            </div>

            {results.length > 0 && (
              <div className="mt-6 overflow-x-auto">
                <h4 className="text-lg font-semibold text-gray-900 mb-3">Final KPI Scores</h4>
                <table className="min-w-full text-sm border rounded-lg">
                  <thead className="bg-gray-50 text-left">
                    <tr>
                      <th className="px-4 py-2 font-semibold text-gray-600">Employee Name</th>
                      <th className="px-4 py-2 font-semibold text-gray-600">Department</th>
                      <th className="px-4 py-2 font-semibold text-gray-600">Role</th>
                      <th className="px-4 py-2 font-semibold text-gray-600">Final KPI Score (out of 70)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {results.map((r) => (
                      <tr key={r.employeeId} className="hover:bg-gray-50">
                        <td className="px-4 py-2 text-gray-800 font-medium">{r.employeeName}</td>
                        <td className="px-4 py-2 text-gray-600">{r.department || "—"}</td>
                        <td className="px-4 py-2 text-gray-600">{r.employerType || "—"}</td>
                        <td className="px-4 py-2 font-bold text-gray-900">{r.outputScore?.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-lg border shadow-sm overflow-x-auto">
            {kpis.length === 0 ? (
              <div className="p-12 text-center">
                <p className="text-gray-500">No KPIs assigned to you yet.</p>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b">
                    <th className="p-3 text-left text-sm font-semibold text-gray-600">KPI Parameter</th>
                    <th className="p-3 text-left text-sm font-semibold text-gray-600">Weightage</th>
                    <th className="p-3 text-left text-sm font-semibold text-gray-600">Progress</th>
                    <th className="p-3 text-left text-sm font-semibold text-gray-600">Status</th>
                    <th className="p-3 text-left text-sm font-semibold text-gray-600">Score</th>
                  </tr>
                </thead>
                <tbody>
                  {kpis.map((kpi) => (
                    <tr key={kpi._id} className="border-b hover:bg-gray-50/50">
                      <td className="p-3">
                        <p className="text-sm font-medium text-gray-700">{kpi.kpiName}</p>
                        <p className="text-xs text-gray-500">{kpi.period}</p>
                      </td>
                      <td className="p-3">
                        <span className="text-sm font-semibold text-gray-700">{kpi.weightage}%</span>
                      </td>
                      <td className="p-3 w-48">
                        <ProgressBar achieved={kpi.achievedValue} target={kpi.target} />
                        <p className="text-xs text-gray-500 mt-1">
                          {kpi.achievedValue} / {kpi.target} {kpi.metric}
                        </p>
                      </td>
                      <td className="p-3">
                        <KpiStatusBadge status={kpi.status} />
                      </td>
                      <td className="p-3">
                        <span className="font-bold text-gray-700">{kpi.score.toFixed(1)}</span>
                        <span className="text-xs text-gray-500 ml-1">/100</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {isAdmin && archivedUsers.length > 0 && (
          <div className="mt-8 bg-white rounded-lg border shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Archived Employees</h3>
            <div className="space-y-2">
              {archivedUsers.map((user) => (
                <div key={user._id} className="rounded-lg border border-gray-300 bg-gray-100 p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">{user.name}</p>
                      <p className="text-xs text-gray-500">
                        {user.email} • {user.department}
                      </p>
                      <p className="text-xs text-gray-400 italic mt-1">Archived Record — Not Active</p>
                    </div>
                    <span className="text-xs font-semibold text-gray-500 bg-gray-200 px-3 py-1 rounded-full">
                      Archived
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {isAddKpiOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg w-full max-w-lg p-6 relative max-h-[90vh] overflow-y-auto shadow-xl">
              <button
                onClick={() => setAddKpiOpen(false)}
                className="absolute top-3 right-3 text-gray-500 hover:text-gray-700 text-xl"
              >
                ✕
              </button>
              <h2 className="text-xl font-bold mb-4">Add Default KPIs</h2>
              <p className="text-sm text-gray-600 mb-4">
                Select an employee and employer type to automatically add default KPI parameters
              </p>
              <form className="space-y-4" onSubmit={handleAddDefaultKpi}>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Employer Type</label>
                  <select
                    value={selectedEmployerType}
                    onChange={(e) => setSelectedEmployerType(e.target.value as "Field" | "HQ")}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 bg-white focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Field">Field</option>
                    <option value="HQ">HQ</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Select Employee</label>
                  <select
                    value={selectedEmployeeId}
                    onChange={(e) => setSelectedEmployeeId(e.target.value)}
                    required
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 bg-white focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Choose an employee</option>
                    {activeUsers
                      .filter((u) => u.role === "employee")
                      .map((user) => (
                        <option key={user._id} value={user._id}>
                          {user.name} - {user.department} ({user.employerType || "Not Set"})
                        </option>
                      ))}
                  </select>
                </div>
                <button
                  type="submit"
                  className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
                >
                  Add Default KPIs
                </button>
              </form>
            </div>
          </div>
        )}

        {isAnalyzeKpiOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg w-full max-w-lg p-6 relative max-h-[90vh] overflow-y-auto shadow-xl">
              <button
                onClick={() => setAnalyzeKpiOpen(false)}
                className="absolute top-3 right-3 text-gray-500 hover:text-gray-700 text-xl"
              >
                ✕
              </button>
              <h2 className="text-xl font-bold mb-4">Analyze KPI Performance</h2>
              <p className="text-sm text-gray-600 mb-4">
                Select an employee or analyze all employees to calculate final KPI scores
              </p>
              <form className="space-y-4" onSubmit={handleAnalyzeKpi}>
                <div className="flex items-center gap-2">
                  <input
                    id="analyzeAll"
                    type="checkbox"
                    checked={analyzeAll}
                    onChange={(e) => setAnalyzeAll(e.target.checked)}
                    className="h-4 w-4"
                  />
                  <label htmlFor="analyzeAll" className="text-sm text-gray-700">
                    Analyze all employees
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Select Employee</label>
                  <select
                    value={selectedEmployeeId}
                    onChange={(e) => setSelectedEmployeeId(e.target.value)}
                    required={!analyzeAll}
                    disabled={analyzeAll}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 bg-white focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                  >
                    <option value="">Choose an employee</option>
                    {activeUsers
                      .filter((u) => u.role === "employee")
                      .map((user) => (
                        <option key={user._id} value={user._id}>
                          {user.name} - {user.department} ({user.employerType || "Not Set"})
                        </option>
                      ))}
                  </select>
                </div>
                <button
                  type="submit"
                  className="w-full bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition"
                >
                  {analyzeAll ? "Analyze All" : "Analyze Performance"}
                </button>
              </form>
            </div>
          </div>
        )}

        {isViewKpiOpen && selectedKpi && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg w-full max-w-2xl p-6 relative max-h-[90vh] overflow-y-auto shadow-xl">
              <button
                onClick={() => {
                  setViewKpiOpen(false)
                  setSelectedKpi(null)
                }}
                className="absolute top-3 right-3 text-gray-500 hover:text-gray-700 text-xl"
              >
                ✕
              </button>
              <h2 className="text-2xl font-bold mb-4">{selectedKpi.kpiName}</h2>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Assigned To</p>
                    <p className="font-semibold">{selectedKpi.assignedTo?.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Department</p>
                    <p className="font-semibold">{selectedKpi.assignedTo?.department}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Period</p>
                    <p className="font-semibold">{selectedKpi.period}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Status</p>
                    <KpiStatusBadge status={selectedKpi.status} />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Metric</p>
                    <p className="font-semibold">{selectedKpi.metric}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Weightage</p>
                    <p className="font-semibold">{selectedKpi.weightage}%</p>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-2">Progress</p>
                  <ProgressBar achieved={selectedKpi.achievedValue} target={selectedKpi.target} />
                  <p className="text-sm text-gray-600 mt-2">
                    {selectedKpi.achievedValue} / {selectedKpi.target} {selectedKpi.metric}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Score</p>
                  <p className="text-2xl font-bold">{selectedKpi.score.toFixed(1)}/100</p>
                </div>
                {selectedKpi.progressNotes && (
                  <div>
                    <p className="text-sm text-gray-500">Progress Notes</p>
                    <p className="text-gray-700">{selectedKpi.progressNotes}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  )
}
