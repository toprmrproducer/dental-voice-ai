"use client";

import { Phone, PhoneOutgoing, PhoneIncoming } from "lucide-react";

interface Call {
  id: string;
  call_type: string;
  patient_name?: string;
  phone_number_from?: string;
  outcome?: string;
  duration_seconds?: number;
  created_at: string;
}

interface CallFeedProps {
  calls: Call[];
}

const outcomeColors: Record<string, string> = {
  booked: "text-green-600",
  rescheduled: "text-blue-600",
  cancelled: "text-red-600",
  faq: "text-slate-600",
  transferred: "text-yellow-600",
  no_answer: "text-gray-400",
  voicemail: "text-gray-400",
  emergency: "text-red-700",
};

const typeIcons: Record<string, typeof Phone> = {
  inbound: PhoneIncoming,
  outbound_reminder: PhoneOutgoing,
  outbound_recall: PhoneOutgoing,
};

export default function CallFeed({ calls }: CallFeedProps) {
  if (calls.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6 text-center text-sm text-slate-400">
        No calls yet today
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100 max-h-[400px] overflow-y-auto">
      {calls.map((call) => {
        const Icon = typeIcons[call.call_type] || Phone;
        const time = new Date(call.created_at).toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
        });
        const durationMin = Math.floor((call.duration_seconds || 0) / 60);
        const durationSec = (call.duration_seconds || 0) % 60;

        return (
          <div key={call.id} className="px-4 py-3 flex items-center gap-3 hover:bg-gray-50">
            <div
              className={`flex-shrink-0 p-2 rounded-full ${
                call.call_type === "inbound" ? "bg-teal-50 text-teal-600" : "bg-amber-50 text-amber-600"
              }`}
            >
              <Icon className="w-4 h-4" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-slate-800 truncate">
                  {call.patient_name || call.phone_number_from || "Unknown"}
                </span>
                <span className="text-xs text-slate-400">{time}</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="capitalize text-slate-500">{call.call_type?.replace(/_/g, " ")}</span>
                <span className="text-slate-300">&middot;</span>
                <span>{durationMin}:{String(durationSec).padStart(2, "0")}</span>
              </div>
            </div>

            {call.outcome && (
              <span
                className={`text-xs font-medium capitalize ${outcomeColors[call.outcome] || "text-gray-500"}`}
              >
                {call.outcome}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
