import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");
  const callType = searchParams.get("call_type");
  const outcome = searchParams.get("outcome");

  const now = new Date();
  const allCalls = Array.from({ length: 47 }, (_, i) => {
    const types = ["inbound", "reminder", "recall"] as const;
    const outcomes = ["booked", "rescheduled", "faq", "transferred", "no_answer", "cancelled"] as const;
    const names = [
      "Rahul Sharma", "Priya Mehta", "Arjun Reddy", "Ananya Iyer", "Vikram Singh",
      "Meera Kapoor", "Ravi Kumar", "Sneha Joshi", "Amit Desai", "Kavya Nair",
      "Deepak Patil", "Sunita Rao", "Rajesh Verma", "Pooja Agarwal", "Nikhil Das",
    ];
    const t = types[i % types.length];
    const o = outcomes[i % outcomes.length];
    const d = new Date(now.getTime() - i * 3600000 * 2);
    return {
      id: `call-${String(i + 1).padStart(3, "0")}`,
      patient_name: names[i % names.length],
      phone_number: `+91 ${90000 + i * 111} ${10000 + i * 37}`,
      call_type: t,
      outcome: o,
      duration_seconds: 30 + Math.floor(Math.random() * 200),
      summary: `${t === "inbound" ? "Patient called" : t === "reminder" ? "Reminder call" : "Recall outreach"} — ${o}`,
      transcript: "Agent: Hello, thank you for calling DentAI Dental Clinic...\nPatient: Hi, I'd like to...",
      created_at: d.toISOString(),
    };
  });

  let filtered = allCalls;
  if (callType) filtered = filtered.filter((c) => c.call_type === callType);
  if (outcome) filtered = filtered.filter((c) => c.outcome === outcome);

  const start = (page - 1) * limit;
  const paged = filtered.slice(start, start + limit);

  return NextResponse.json({
    calls: paged,
    total: filtered.length,
    page,
    limit,
    total_pages: Math.ceil(filtered.length / limit),
  });
}
