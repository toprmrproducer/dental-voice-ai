"use client";

import { useEffect, useState } from "react";
import { getUser, getClinicId } from "@/lib/auth";
import { getDashboardMetrics } from "@/lib/api";
import MetricsChart from "@/components/MetricsChart";
import KPICard from "@/components/KPICard";
import { Clock, TrendingUp, RefreshCcw, Phone } from "lucide-react";

export default function MetricsPage() {
  const [metrics, setMetrics] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const user = await getUser();
      if (!user) return;
      const cid = getClinicId(user);
      const data = await getDashboardMetrics(cid, 30).catch(() => ({ metrics: [] }));
      setMetrics(data.metrics || []);
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-dental-600" />
      </div>
    );
  }

  // Compute aggregate KPIs
  const totalCalls = metrics.reduce((s, m) => s + (m.total_calls || 0), 0);
  const totalBooked = metrics.reduce((s, m) => s + (m.appointments_booked || 0), 0);
  const totalCancelled = metrics.reduce((s, m) => s + (m.appointments_cancelled || 0), 0);
  const totalNoAnswer = metrics.reduce((s, m) => s + (m.no_answer_count || 0), 0);
  const totalRecall = metrics.reduce((s, m) => s + (m.outbound_recall_calls || 0), 0);
  const totalTransfers = metrics.reduce((s, m) => s + (m.transfers_to_human || 0), 0);
  const totalInbound = metrics.reduce((s, m) => s + (m.inbound_calls || 0), 0);

  const bookingRate = totalCalls > 0 ? ((totalBooked / totalCalls) * 100).toFixed(1) : "0";
  const recallSuccessRate =
    totalRecall > 0
      ? (((totalBooked / Math.max(totalRecall, 1)) * 100).toFixed(1))
      : "0";

  // Prepare chart data
  const callVolumeData = metrics.map((m) => ({
    date: m.date,
    Inbound: m.inbound_calls || 0,
    Reminders: m.outbound_reminder_calls || 0,
    Recalls: m.outbound_recall_calls || 0,
  }));

  const appointmentData = metrics.map((m) => ({
    date: m.date,
    Booked: m.appointments_booked || 0,
    Cancelled: m.appointments_cancelled || 0,
  }));

  // Outcome breakdown for pie
  const outcomeData = [
    { name: "Booked", value: totalBooked, color: "#10b981" },
    { name: "FAQ", value: totalCalls - totalBooked - totalCancelled - totalNoAnswer - totalTransfers, color: "#64748b" },
    { name: "Transferred", value: totalTransfers, color: "#f59e0b" },
    { name: "No Answer", value: totalNoAnswer, color: "#94a3b8" },
    { name: "Recall", value: totalRecall, color: "#8b5cf6" },
  ].filter((d) => d.value > 0);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-800">Analytics</h1>

      {/* KPI Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Total Calls (30d)" value={totalCalls} icon={<Phone className="w-5 h-5" />} color="dental" />
        <KPICard title="Booking Rate" value={`${bookingRate}%`} icon={<TrendingUp className="w-5 h-5" />} color="blue" />
        <KPICard title="Recall Success" value={`${recallSuccessRate}%`} icon={<RefreshCcw className="w-5 h-5" />} color="purple" />
        <KPICard title="Transfers" value={totalTransfers} icon={<Clock className="w-5 h-5" />} color="amber" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <MetricsChart
          title="Call Volume (30 Days)"
          type="line"
          data={callVolumeData}
          dataKeys={["Inbound", "Reminders", "Recalls"]}
          colors={["#14b8a6", "#f59e0b", "#8b5cf6"]}
        />
        <MetricsChart
          title="Appointments: Booked vs Cancelled"
          type="bar"
          data={appointmentData}
          dataKeys={["Booked", "Cancelled"]}
          colors={["#10b981", "#ef4444"]}
        />
      </div>

      <div className="max-w-md">
        <MetricsChart
          title="Call Outcomes Breakdown"
          type="pie"
          data={outcomeData}
          dataKeys={["value"]}
          colors={outcomeData.map((d) => d.color)}
        />
      </div>
    </div>
  );
}
