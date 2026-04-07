"use client";

import { X, Play, Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { getRecordingUrl } from "@/lib/api";

interface TranscriptModalProps {
  call: {
    id: string;
    clinic_id?: string;
    patient_name?: string;
    phone_number_from?: string;
    call_type: string;
    outcome?: string;
    duration_seconds?: number;
    created_at: string;
    transcript_text?: string;
    ai_summary?: string;
    recording_url?: string;
  };
  onClose: () => void;
}

export default function TranscriptModal({ call, onClose }: TranscriptModalProps) {
  const backdropRef = useRef<HTMLDivElement>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [loadingAudio, setLoadingAudio] = useState(false);

  useEffect(() => {
    function handleEsc(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  const handlePlayRecording = async () => {
    if (audioUrl) return; // Already loaded
    if (!call.clinic_id || !call.recording_url) return;
    setLoadingAudio(true);
    try {
      const result = await getRecordingUrl(call.id, call.clinic_id);
      setAudioUrl(result.signed_url);
    } catch {
      // No recording available
    } finally {
      setLoadingAudio(false);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === backdropRef.current) onClose();
  };

  const dt = new Date(call.created_at);
  const dateStr = dt.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const timeStr = dt.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  const durationMin = Math.floor((call.duration_seconds || 0) / 60);
  const durationSec = (call.duration_seconds || 0) % 60;

  // Parse transcript lines (format: "role: text" per line)
  const transcriptLines = (call.transcript_text || "").split("\n").filter(Boolean);

  return (
    <div
      ref={backdropRef}
      onClick={handleBackdropClick}
      className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
    >
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-semibold text-slate-800">Call Transcript</h2>
            <p className="text-sm text-slate-500">
              {call.patient_name || call.phone_number_from || "Unknown"} &mdash; {dateStr} at {timeStr}
            </p>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Meta */}
        <div className="px-6 py-3 border-b border-gray-100 flex flex-wrap gap-4 text-xs text-slate-500">
          <span>
            Type: <span className="font-medium capitalize text-slate-700">{call.call_type?.replace(/_/g, " ")}</span>
          </span>
          <span>
            Outcome: <span className="font-medium capitalize text-slate-700">{call.outcome || "—"}</span>
          </span>
          <span>
            Duration: <span className="font-medium text-slate-700">{durationMin}:{String(durationSec).padStart(2, "0")}</span>
          </span>
        </div>

        {/* AI Summary */}
        {call.ai_summary && (
          <div className="px-6 py-3 border-b border-gray-100 bg-teal-50/50">
            <p className="text-xs font-medium text-teal-700 mb-1">AI Summary</p>
            <p className="text-sm text-teal-800">{call.ai_summary}</p>
          </div>
        )}

        {/* Recording Player */}
        {call.recording_url && (
          <div className="px-6 py-3 border-b border-gray-100">
            {audioUrl ? (
              <audio controls className="w-full" src={audioUrl}>
                Your browser does not support the audio element.
              </audio>
            ) : (
              <button
                onClick={handlePlayRecording}
                disabled={loadingAudio}
                className="inline-flex items-center gap-2 px-3 py-2 bg-dental-50 hover:bg-dental-100 text-dental-700 text-sm font-medium rounded-lg transition disabled:opacity-50"
              >
                {loadingAudio ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Play className="w-4 h-4" />
                )}
                Play Recording
              </button>
            )}
          </div>
        )}

        {/* Transcript */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
          {transcriptLines.length > 0 ? (
            transcriptLines.map((line, i) => {
              const colonIdx = line.indexOf(":");
              if (colonIdx === -1) {
                return (
                  <p key={i} className="text-sm text-slate-600">{line}</p>
                );
              }
              const role = line.substring(0, colonIdx).trim().toLowerCase();
              const text = line.substring(colonIdx + 1).trim();
              const isAgent = role === "agent" || role === "assistant" || role === "ai";

              return (
                <div
                  key={i}
                  className={`flex ${isAgent ? "justify-start" : "justify-end"}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                      isAgent
                        ? "bg-teal-50 text-teal-900"
                        : "bg-slate-100 text-slate-800"
                    }`}
                  >
                    <span className="text-xs font-medium block mb-0.5 opacity-60">
                      {isAgent ? "Agent" : "Patient"}
                    </span>
                    {text}
                  </div>
                </div>
              );
            })
          ) : (
            <p className="text-sm text-slate-400 text-center py-8">No transcript available</p>
          )}
        </div>
      </div>
    </div>
  );
}
