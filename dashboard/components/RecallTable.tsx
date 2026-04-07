"use client";

interface Campaign {
  id: string;
  patient_name?: string;
  patient_phone?: string;
  last_visit_date?: string;
  status: string;
  attempts: number;
  last_called_at?: string;
  call_id?: string;
  created_at: string;
}

interface RecallTableProps {
  campaigns: Campaign[];
}

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  called: "bg-blue-100 text-blue-700",
  booked: "bg-green-100 text-green-700",
  declined: "bg-red-100 text-red-700",
  no_answer: "bg-gray-100 text-gray-500",
  opted_out: "bg-slate-200 text-slate-600",
};

export default function RecallTable({ campaigns }: RecallTableProps) {
  if (campaigns.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-sm text-slate-400">
        No recall campaigns found. Click &quot;Run Recall Now&quot; to generate a list.
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Patient</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Phone</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Last Visit</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Status</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Attempts</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Last Called</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {campaigns.map((c) => {
              const lastVisit = c.last_visit_date
                ? new Date(c.last_visit_date).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })
                : "—";
              const lastCalled = c.last_called_at
                ? new Date(c.last_called_at).toLocaleString("en-US", {
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })
                : "—";
              const created = new Date(c.created_at).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              });

              return (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-slate-800">{c.patient_name || "—"}</td>
                  <td className="px-4 py-3 font-mono text-xs">{c.patient_phone || "—"}</td>
                  <td className="px-4 py-3">{lastVisit}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                        statusColors[c.status] || "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {c.status?.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">{c.attempts}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">{lastCalled}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">{created}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
