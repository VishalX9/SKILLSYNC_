'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import AppShell from '@/components/layout/AppShell';

interface User {
  _id: string;
  name: string;
  email: string;
  designation?: string;
  department?: string;
  role: string;
  employerType?: 'Field' | 'HQ';
}

interface Kpi {
  _id: string;
  kpiName: string;
  metric: string;
  target: number;
  weightage: number;
  achievedValue: number;
  score: number;
  period: string;
  status: string;
  progress: number;
  deadline?: string;
  progressNotes?: string;
  description?: string;
  assignedTo: User;
  assignedBy?: User;
  eofficeScore?: number;
  createdAt: string;
  updatedAt: string;
}

export default function EmployeeKpiDetailPage() {
  const router = useRouter();
  const params = useParams();
  const userId = params.id as string;

  const [employee, setEmployee] = useState<User | null>(null);
  const [kpis, setKpis] = useState<Kpi[]>([]);
  const [loading, setLoading] = useState(true);
  const [scores, setScores] = useState<{
    outputScore: number;
    behaviouralScore: number;
    totalScore: number;
  } | null>(null);

  useEffect(() => {
    fetchEmployeeKpis();
  }, [userId]);

  const fetchEmployeeKpis = async () => {
    try {
      const token = localStorage.getItem('token');
      
      // Fetch employee details
      const userRes = await fetch(`/api/users/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const userData = await userRes.json();
      if (userData.success) setEmployee(userData.data);

      // Fetch KPIs for this employee
      const kpiRes = await fetch(`/api/kpi?userId=${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const kpiData = await kpiRes.json();
      if (kpiData.success) setKpis(kpiData.data);

      // Fetch scores
      const scoresRes = await fetch(`/api/scores?userId=${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const scoresData = await scoresRes.json();
      setScores(scoresData);
    } catch (error) {
      console.error('Error fetching employee KPIs:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase().replace(' ', '_')) {
      case 'completed': return 'bg-emerald-100 text-emerald-800';
      case 'in_progress': return 'bg-sky-100 text-sky-800';
      case 'not_started':
      case 'pending': return 'bg-amber-100 text-amber-800';
      case 'at_risk': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <AppShell title="Employee KPIs" description="View employee KPI details">
        <div className="flex h-screen items-center justify-center">
          <p className="animate-pulse text-gray-500">Loading...</p>
        </div>
      </AppShell>
    );
  }

  if (!employee) {
    return (
      <AppShell title="Employee KPIs" description="View employee KPI details">
        <div className="flex h-screen items-center justify-center">
          <p className="text-gray-500">Employee not found</p>
        </div>
      </AppShell>
    );
  }

  const totalWeightage = kpis.reduce((sum, k) => sum + k.weightage, 0);
  const totalScore = kpis.reduce((sum, k) => sum + k.score, 0);

  return (
    <AppShell title="">
      <div className="min-h-screen p-6">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="text-blue-600 hover:text-blue-800 mb-4 flex items-center gap-2"
          >
            ← Back to KPI Management
          </button>
          <div className="bg-white rounded-lg border shadow-sm p-6">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{employee.name}</h1>
                <p className="text-gray-600 mt-1">{employee.designation}</p>
                <p className="text-sm text-gray-500">{employee.department} • {employee.email}</p>
                <div className="mt-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    employee.employerType === 'Field' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-purple-100 text-purple-800'
                  }`}>
                    {employee.employerType || 'Not Set'} Employee
                  </span>
                </div>
              </div>
              <div className="text-right bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-xl">
                <p className="text-sm text-blue-700 font-medium">Output Performance Score</p>
                <p className="text-4xl font-bold text-blue-900 mt-2">
                  {scores?.outputScore.toFixed(2) || '0.00'}
                </p>
                <p className="text-sm text-blue-700 mt-1">out of 70 points</p>
                <div className="mt-3 pt-3 border-t border-blue-200">
                  <p className="text-xs text-blue-600">Total Weighted Score</p>
                  <p className="text-lg font-semibold text-blue-800">
                    {totalScore.toFixed(2)}/{totalWeightage}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* KPI Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg border shadow-sm p-4">
            <p className="text-sm text-gray-500">Total KPIs</p>
            <p className="text-2xl font-bold text-gray-900">{kpis.length}</p>
          </div>
          <div className="bg-white rounded-lg border shadow-sm p-4">
            <p className="text-sm text-gray-500">Completed</p>
            <p className="text-2xl font-bold text-emerald-600">
              {kpis.filter(k => k.status.toLowerCase() === 'completed').length}
            </p>
          </div>
          <div className="bg-white rounded-lg border shadow-sm p-4">
            <p className="text-sm text-gray-500">In Progress</p>
            <p className="text-2xl font-bold text-sky-600">
              {kpis.filter(k => k.status.toLowerCase().replace(' ', '_') === 'in_progress').length}
            </p>
          </div>
          <div className="bg-white rounded-lg border shadow-sm p-4">
            <p className="text-sm text-gray-500">At Risk</p>
            <p className="text-2xl font-bold text-red-600">
              {kpis.filter(k => k.status.toLowerCase() === 'at_risk').length}
            </p>
          </div>
        </div>

        {/* KPIs List */}
        <div className="bg-white rounded-lg border shadow-sm">
          <div className="p-6 border-b bg-gradient-to-r from-gray-50 to-white">
            <h2 className="text-xl font-bold text-gray-900">Individual KPI Metrics</h2>
            <p className="text-sm text-gray-600 mt-1">
              Detailed breakdown of each performance indicator
            </p>
          </div>
          
          {kpis.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-gray-500">No KPIs assigned yet</p>
            </div>
          ) : (
            <div className="divide-y">
              {kpis.map((kpi) => (
                <div key={kpi._id} className="p-6 hover:bg-gray-50/50 transition">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="text-lg font-semibold text-gray-900">{kpi.kpiName}</h3>
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(kpi.status)}`}>
                          {kpi.status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </span>
                      </div>
                      {kpi.description && (
                        <p className="text-sm text-gray-600 mt-1">{kpi.description}</p>
                      )}
                      <div className="flex items-center gap-4 mt-2">
                        <span className="text-sm text-gray-500">Period: {kpi.period}</span>
                        {kpi.deadline && (
                          <span className="text-sm text-gray-500">
                            Deadline: {new Date(kpi.deadline).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-sm text-gray-500 font-medium">Target</p>
                      <p className="text-lg font-semibold text-gray-900">
                        {kpi.target} {kpi.metric}
                      </p>
                    </div>
                    <div className="bg-blue-50 rounded-lg p-3">
                      <p className="text-sm text-blue-700 font-medium">Achieved</p>
                      <p className="text-lg font-semibold text-blue-900">
                        {kpi.achievedValue} {kpi.metric}
                      </p>
                    </div>
                    <div className="bg-purple-50 rounded-lg p-3">
                      <p className="text-sm text-purple-700 font-medium">Weightage</p>
                      <p className="text-lg font-semibold text-purple-900">{kpi.weightage}%</p>
                    </div>
                    <div className="bg-emerald-50 rounded-lg p-3">
                      <p className="text-sm text-emerald-700 font-medium">Score Obtained</p>
                      <p className="text-lg font-semibold text-emerald-900">
                        {kpi.score.toFixed(2)}
                        <span className="text-sm font-normal text-emerald-700">/{kpi.weightage}</span>
                      </p>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mb-4">
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-gray-600 font-medium">Progress</span>
                      <span className="font-bold text-gray-900">{kpi.progress.toFixed(0)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                      <div
                        className={`h-3 rounded-full transition-all duration-500 ${
                          kpi.progress >= 80 ? 'bg-emerald-500' :
                          kpi.progress >= 40 ? 'bg-sky-500' : 'bg-amber-500'
                        }`}
                        style={{ width: `${kpi.progress}%` }}
                      />
                    </div>
                  </div>

                  {/* Additional Info */}
                  {kpi.progressNotes && (
                    <div className="mt-4 p-3 bg-blue-50 border-l-4 border-blue-400 rounded">
                      <p className="text-sm text-blue-700 font-medium">Progress Notes</p>
                      <p className="text-sm text-gray-700 mt-1">{kpi.progressNotes}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Summary Section */}
        {kpis.length > 0 && (
          <div className="mt-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-200 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Performance Summary</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-gray-600">Total Weightage</p>
                <p className="text-2xl font-bold text-gray-900">{totalWeightage}%</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Score (Weighted)</p>
                <p className="text-2xl font-bold text-blue-900">
                  {totalScore.toFixed(2)}/{totalWeightage}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Output Score (70-point scale)</p>
                <p className="text-2xl font-bold text-emerald-600">
                  {scores?.outputScore.toFixed(2) || '0.00'}/70
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
