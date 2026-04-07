"use client";

import { useEffect, useState } from "react";
import { getUser, getClinicId } from "@/lib/auth";
import { getAgentConfig, updateAgentConfig } from "@/lib/api";
import FAQEditor from "@/components/FAQEditor";
import { Save, Loader2, Plus, Trash2 } from "lucide-react";

export default function SettingsPage() {
  const [clinicId, setClinicId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const [agentName, setAgentName] = useState("");
  const [voiceId, setVoiceId] = useState("");
  const [emergencyNumber, setEmergencyNumber] = useState("");
  const [businessHours, setBusinessHours] = useState<Record<string, any>>({});
  const [faqBank, setFaqBank] = useState<{ question: string; answer: string }[]>([]);
  const [providers, setProviders] = useState<any[]>([]);

  useEffect(() => {
    async function load() {
      const user = await getUser();
      if (!user) return;
      const cid = getClinicId(user);
      setClinicId(cid);

      const data = await getAgentConfig(cid).catch(() => null);
      if (data) {
        setAgentName(data.agent?.agent_name || "");
        setVoiceId(data.agent?.voice_id || "Cheyenne-PlayAI");
        setEmergencyNumber(data.clinic?.emergency_escalation_number || "");
        setBusinessHours(data.clinic?.business_hours_json || {});
        setFaqBank(data.agent?.faq_bank_json || []);
        setProviders(data.providers || []);
      }
      setLoading(false);
    }
    load();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setMessage("");
    try {
      await updateAgentConfig(clinicId, {
        agent_name: agentName,
        voice_id: voiceId,
        emergency_escalation_number: emergencyNumber,
        business_hours_json: businessHours,
        faq_bank_json: faqBank,
        providers: providers,
      });
      setMessage("Settings saved successfully!");
    } catch (err: any) {
      setMessage(`Error: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const dayLabels: Record<string, string> = {
    mon: "Monday",
    tue: "Tuesday",
    wed: "Wednesday",
    thu: "Thursday",
    fri: "Friday",
    sat: "Saturday",
    sun: "Sunday",
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-dental-600" />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-3xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Settings</h1>
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-dental-600 hover:bg-dental-700 text-white text-sm font-medium rounded-lg transition disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save Changes
        </button>
      </div>

      {message && (
        <div
          className={`p-3 text-sm rounded-lg border ${
            message.startsWith("Error")
              ? "bg-red-50 text-red-700 border-red-200"
              : "bg-green-50 text-green-700 border-green-200"
          }`}
        >
          {message}
        </div>
      )}

      {/* Agent Settings */}
      <section className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h2 className="text-lg font-semibold text-slate-800">Agent Configuration</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Agent Name</label>
            <input
              type="text"
              value={agentName}
              onChange={(e) => setAgentName(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-dental-500 outline-none"
              placeholder="Sophie"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Voice</label>
            <select
              value={voiceId}
              onChange={(e) => setVoiceId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-dental-500 outline-none"
            >
              <option value="Cheyenne-PlayAI">Cheyenne (Female, PlayAI)</option>
              <option value="Arista-PlayAI">Arista (Female, PlayAI)</option>
              <option value="Angelo-PlayAI">Angelo (Male, PlayAI)</option>
              <option value="Fritz-PlayAI">Fritz (Male, PlayAI)</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1">Emergency Escalation Number</label>
            <input
              type="tel"
              value={emergencyNumber}
              onChange={(e) => setEmergencyNumber(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-dental-500 outline-none"
              placeholder="+15551234599"
            />
          </div>
        </div>
      </section>

      {/* Business Hours */}
      <section className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h2 className="text-lg font-semibold text-slate-800">Business Hours</h2>
        <div className="space-y-3">
          {Object.entries(dayLabels).map(([key, label]) => {
            const dayVal = businessHours[key];
            const isOpen = dayVal !== null && dayVal !== undefined;

            return (
              <div key={key} className="flex items-center gap-3">
                <label className="w-24 text-sm font-medium text-slate-600">{label}</label>
                <label className="flex items-center gap-1.5 text-sm">
                  <input
                    type="checkbox"
                    checked={isOpen}
                    onChange={(e) => {
                      const updated = { ...businessHours };
                      if (e.target.checked) {
                        updated[key] = { open: "08:00", close: "17:00" };
                      } else {
                        updated[key] = null;
                      }
                      setBusinessHours(updated);
                    }}
                    className="rounded text-dental-600 focus:ring-dental-500"
                  />
                  Open
                </label>
                {isOpen && (
                  <>
                    <input
                      type="time"
                      value={dayVal?.open || "08:00"}
                      onChange={(e) => {
                        const updated = { ...businessHours };
                        updated[key] = { ...updated[key], open: e.target.value };
                        setBusinessHours(updated);
                      }}
                      className="px-2 py-1 rounded border border-gray-200 text-sm"
                    />
                    <span className="text-slate-400">to</span>
                    <input
                      type="time"
                      value={dayVal?.close || "17:00"}
                      onChange={(e) => {
                        const updated = { ...businessHours };
                        updated[key] = { ...updated[key], close: e.target.value };
                        setBusinessHours(updated);
                      }}
                      className="px-2 py-1 rounded border border-gray-200 text-sm"
                    />
                  </>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Provider Roster */}
      <section className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-800">Provider Roster</h2>
          <button
            onClick={() =>
              setProviders([...providers, { name: "", role: "dentist", is_active: true }])
            }
            className="inline-flex items-center gap-1 text-sm text-dental-600 hover:text-dental-700 font-medium"
          >
            <Plus className="w-4 h-4" /> Add Provider
          </button>
        </div>
        <div className="space-y-3">
          {providers.map((prov, i) => (
            <div key={i} className="flex items-center gap-3">
              <input
                type="text"
                value={prov.name}
                onChange={(e) => {
                  const updated = [...providers];
                  updated[i] = { ...updated[i], name: e.target.value };
                  setProviders(updated);
                }}
                placeholder="Provider name"
                className="flex-1 px-3 py-2 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-dental-500 outline-none"
              />
              <select
                value={prov.role}
                onChange={(e) => {
                  const updated = [...providers];
                  updated[i] = { ...updated[i], role: e.target.value };
                  setProviders(updated);
                }}
                className="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-dental-500 outline-none"
              >
                <option value="dentist">Dentist</option>
                <option value="hygienist">Hygienist</option>
              </select>
              <label className="flex items-center gap-1 text-sm">
                <input
                  type="checkbox"
                  checked={prov.is_active}
                  onChange={(e) => {
                    const updated = [...providers];
                    updated[i] = { ...updated[i], is_active: e.target.checked };
                    setProviders(updated);
                  }}
                  className="rounded text-dental-600"
                />
                Active
              </label>
              <button
                onClick={() => setProviders(providers.filter((_, idx) => idx !== i))}
                className="p-1 text-slate-400 hover:text-red-500"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ Bank */}
      <section className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h2 className="text-lg font-semibold text-slate-800">FAQ Bank</h2>
        <FAQEditor faqs={faqBank} onChange={setFaqBank} />
      </section>
    </div>
  );
}
