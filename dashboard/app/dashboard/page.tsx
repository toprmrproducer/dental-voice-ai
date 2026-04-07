"use client";

import { useEffect, useState } from "react";
import { getUser, getClinicId } from "@/lib/auth";
import { getDashboardToday, getAgentConfig } from "@/lib/api";
import KPICard from "@/components/KPICard";
import CallFeed from "@/components/CallFeed";
import { Phone, CalendarCheck, Bell, RefreshCcw, Activity } from "lucide-react";

export default function DashboardPage() {
  const [data, setData] = useState<any>(null);
  const [agentConfig, setAgentConfig] = useState<any>(null);
  const [clinicId, setClinicId] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const user = await getUser();
      if (!user) return;
      const cid = getClinicId(user);
      setClinicId(cid);

      const [dashData, agentData] = await Promise.all([
        getDashboardToday(cid).catch(() => null),
        getAgentConfig(cid).catch(() => null),
      ]);
      setData(dashData);
      setAgentConfig(agentData);
      setLoading(false);
    }
    load();
  }, []);

  // Auto-refresh every 10 seconds
  useEffect(() => {
    if (!clinicId) return;
    const interval = setInterval(async () => {
      const dashData = await getDashboardToday(clinicId).catch(() => null);
      if (dashData) setData(dashData);
    }, 10000);
    return () => clearInterval(interval);
  }, [clinicId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-dental-600" />
      </div>
    );
  }

  const clinicName = agentConfig?.clinic?.name || "Dental Office";
  const agentName = agentConfig?.agent?.agent_name || "AI Receptionist";
  const isActive = agentConfig?.agent?.is_active ?? false;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{clinicName}</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-sm text-slate-500">Agent: {agentName}</span>
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                isActive
                  ? "bg-green-100 text-green-700"
                  : "bg-gray-100 text-gray-500"
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${isActive ? "bg-green-500" : "bg-gray-400"}`} />
              {isActive ? "Live" : "Offline"}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <Activity className="w-4 h-4" />
          Auto-refreshing every 10s
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Total Calls Today"
          value={data?.total_calls ?? 0}
          icon={<Phone className="w-5 h-5" />}
          color="dental"
        />
        <KPICard
          title="Appointments Booked"
          value={data?.appointments_booked_today ?? 0}
          icon={<CalendarCheck className="w-5 h-5" />}
          color="blue"
        />
        <KPICard
          title="Reminders Sent"
          value={data?.reminders_sent ?? 0}
          icon={<Bell className="w-5 h-5" />}
          color="amber"
        />
        <KPICard
          title="Recalls Made"
          value={data?.recalls_made ?? 0}
          icon={<RefreshCcw className="w-5 h-5" />}
          color="purple"
        />
      </div>

      {/* Call Feed + Today's Appointments */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <h2 className="text-lg font-semibold text-slate-800 mb-3">Live Call Feed</h2>
          <CallFeed calls={data?.recent_calls || []} />
        </div>

        <div>
          <h2 className="text-lg font-semibold text-slate-800 mb-3">Today&apos;s Appointments</h2>
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {(data?.todays_appointments || []).length === 0 ? (
              <div className="p-6 text-center text-slate-400 text-sm">No appointments today</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-slate-600">Time</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-600">Patient</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-600">Provider</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-600">Service</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-600">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {(data?.todays_appointments || []).map((appt: any) => {
                    const time = new Date(appt.start_time).toLocaleTimeString("en-US", {
                      hour: "numeric",
                      minute: "2-digit",
                    });
                    const statusColors: Record<string, string> = {
                      confirmed: "bg-green-100 text-green-700",
                      scheduled: "bg-blue-100 text-blue-700",
                      cancelled: "bg-red-100 text-red-700",
                      completed: "bg-gray-100 text-gray-600",
                    };
                    return (
                      <tr key={appt.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium">{time}</td>
                        <td className="px-4 py-3">{appt.patient_name}</td>
                        <td className="px-4 py-3">{appt.provider_name}</td>
                        <td className="px-4 py-3">{appt.service_type}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                              statusColors[appt.status] || "bg-gray-100 text-gray-600"
                            }`}
                          >
                            {appt.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
