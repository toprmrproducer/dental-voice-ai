"use client";

import { useEffect, useState } from "react";
import { getUser, getClinicId } from "@/lib/auth";
import { getRecallCampaigns, triggerRecallBuild } from "@/lib/api";
import RecallTable from "@/components/RecallTable";
import { RefreshCcw, Loader2 } from "lucide-react";

export default function RecallPage() {
  const [clinicId, setClinicId] = useState("");
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState(false);
  const [triggerResult, setTriggerResult] = useState("");

  useEffect(() => {
    async function init() {
      const user = await getUser();
      if (!user) return;
      const cid = getClinicId(user);
      setClinicId(cid);
      const data = await getRecallCampaigns(cid).catch(() => ({ campaigns: [] }));
      setCampaigns(data.campaigns || []);
      setLoading(false);
    }
    init();
  }, []);

  const handleTrigger = async () => {
    setTriggering(true);
    setTriggerResult("");
    try {
      const result = await triggerRecallBuild();
      setTriggerResult(result.message || `${result.queued} patients queued`);
      // Refresh list
      const data = await getRecallCampaigns(clinicId).catch(() => ({ campaigns: [] }));
      setCampaigns(data.campaigns || []);
    } catch (err: any) {
      setTriggerResult(`Error: ${err.message}`);
    } finally {
      setTriggering(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-dental-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Recall Campaigns</h1>
          <p className="text-sm text-slate-500 mt-1">
            Outreach to patients who haven&apos;t visited in 5+ months
          </p>
        </div>
        <button
          onClick={handleTrigger}
          disabled={triggering}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-dental-600 hover:bg-dental-700 text-white text-sm font-medium rounded-lg transition disabled:opacity-50"
        >
          {triggering ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <RefreshCcw className="w-4 h-4" />
          )}
          Run Recall Now
        </button>
      </div>

      {triggerResult && (
        <div className="p-3 bg-dental-50 text-dental-700 text-sm rounded-lg border border-dental-200">
          {triggerResult}
        </div>
      )}

      <RecallTable campaigns={campaigns} />
    </div>
  );
}
