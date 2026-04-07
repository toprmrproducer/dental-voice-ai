"use client";

import { useEffect, useState } from "react";
import { getUser, getClinicId } from "@/lib/auth";
import { getMyDashboardCalls } from "@/lib/api";
import type { PaginatedCalls, CallFilters } from "@/lib/types";
import TranscriptModal from "@/components/TranscriptModal";
import { Search, ChevronLeft, ChevronRight, Filter } from "lucide-react";

export default function CallHistoryPage() {
  const [data, setData] = useState<PaginatedCalls>({ calls: [], total: 0, page: 1, limit: 20 });
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<CallFilters>({
    call_type: "",
    outcome: "",
    date_from: "",
    date_to: "",
  });
  const [selectedTranscript, setSelectedTranscript] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    async function init() {
      const user = await getUser();
      if (!user) return;
      setReady(true);
    }
    init();
  }, []);

  useEffect(() => {
    if (!ready) return;
    setLoading(true);
    const activeFilters = Object.fromEntries(
      Object.entries(filters).filter(([_, v]) => v !== "")
    ) as CallFilters;
    getMyDashboardCalls(page, 20, activeFilters)
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [ready, page, filters]);

  const totalPages = Math.ceil((data.total || 0) / 20);

  const outcomeColors: Record<string, string> = {
    booked: "bg-green-100 text-green-700",
    confirmed: "bg-green-100 text-green-700",
    rescheduled: "bg-blue-100 text-blue-700",
    cancelled: "bg-red-100 text-red-700",
    faq: "bg-slate-100 text-slate-600",
    transferred: "bg-yellow-100 text-yellow-700",
    no_answer: "bg-gray-100 text-gray-500",
    voicemail: "bg-gray-100 text-gray-500",
    emergency: "bg-red-200 text-red-800",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Call History</h1>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center gap-2 mb-3 text-sm text-slate-600">
          <Filter className="w-4 h-4" />
          <span className="font-medium">Filters</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <select
            value={filters.call_type}
            onChange={(e) => {
              setFilters({ ...filters, call_type: e.target.value });
              setPage(1);
            }}
            className="px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-dental-500"
          >
            <option value="">All Call Types</option>
            <option value="inbound">Inbound</option>
            <option value="outbound_reminder">Reminder</option>
            <option value="outbound_recall">Recall</option>
          </select>

          <select
            value={filters.outcome}
            onChange={(e) => {
              setFilters({ ...filters, outcome: e.target.value });
              setPage(1);
            }}
            className="px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-dental-500"
          >
            <option value="">All Outcomes</option>
            <option value="booked">Booked</option>
            <option value="rescheduled">Rescheduled</option>
            <option value="cancelled">Cancelled</option>
            <option value="faq">FAQ</option>
            <option value="transferred">Transferred</option>
            <option value="no_answer">No Answer</option>
            <option value="emergency">Emergency</option>
          </select>

          <input
            type="date"
            value={filters.date_from}
            onChange={(e) => {
              setFilters({ ...filters, date_from: e.target.value });
              setPage(1);
            }}
            className="px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-dental-500"
            placeholder="From"
          />

          <input
            type="date"
            value={filters.date_to}
            onChange={(e) => {
              setFilters({ ...filters, date_to: e.target.value });
              setPage(1);
            }}
            className="px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-dental-500"
            placeholder="To"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-dental-600" />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-slate-600">Date/Time</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-600">Patient</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-600">Phone</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-600">Type</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-600">Duration</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-600">Outcome</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-600">Summary</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-600"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {(data?.calls || []).map((call: any) => {
                    const dt = new Date(call.created_at);
                    const dateStr = dt.toLocaleDateString("en-US", { month: "short", day: "numeric" });
                    const timeStr = dt.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
                    const durationMin = Math.floor((call.duration_seconds || 0) / 60);
                    const durationSec = (call.duration_seconds || 0) % 60;

                    return (
                      <tr key={call.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="font-medium">{dateStr}</div>
                          <div className="text-xs text-slate-400">{timeStr}</div>
                        </td>
                        <td className="px-4 py-3">{call.patient_name}</td>
                        <td className="px-4 py-3 font-mono text-xs">{call.patient_phone || call.phone_number_from}</td>
                        <td className="px-4 py-3">
                          <span className="text-xs capitalize">{call.call_type?.replace(/_/g, " ")}</span>
                        </td>
                        <td className="px-4 py-3">{durationMin}:{String(durationSec).padStart(2, "0")}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                              outcomeColors[call.outcome] || "bg-gray-100 text-gray-600"
                            }`}
                          >
                            {call.outcome || "—"}
                          </span>
                        </td>
                        <td className="px-4 py-3 max-w-[200px] truncate text-xs text-slate-500">
                          {call.ai_summary || "—"}
                        </td>
                        <td className="px-4 py-3">
                          {call.transcript_text && (
                            <button
                              onClick={() => setSelectedTranscript(call)}
                              className="text-dental-600 hover:text-dental-700 text-xs font-medium"
                            >
                              View
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {(data?.calls || []).length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                        No calls found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
              <span className="text-sm text-slate-500">
                {data.total || 0} total calls
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page <= 1}
                  className="p-1 rounded hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <span className="text-sm text-slate-600">
                  Page {page} of {totalPages || 1}
                </span>
                <button
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page >= totalPages}
                  className="p-1 rounded hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Transcript Modal */}
      {selectedTranscript && (
        <TranscriptModal
          call={selectedTranscript}
          onClose={() => setSelectedTranscript(null)}
        />
      )}
    </div>
  );
}
