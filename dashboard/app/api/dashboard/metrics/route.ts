import { NextResponse } from "next/server";

export async function GET() {
  const now = new Date();
  const days = 30;
  const metrics = Array.from({ length: days }, (_, i) => {
    const d = new Date(now.getTime() - (days - 1 - i) * 86400000);
    const dateStr = d.toISOString().split("T")[0];
    const inbound = 5 + Math.floor(Math.random() * 10);
    const reminders = 3 + Math.floor(Math.random() * 6);
    const recalls = Math.floor(Math.random() * 4);
    const total = inbound + reminders + recalls;
    const booked = Math.floor(total * 0.55);
    const cancelled = Math.floor(total * 0.08);
    const noAnswer = Math.floor(total * 0.1);
    const transfers = Math.floor(total * 0.05);
    return {
      date: dateStr,
      total_calls: total,
      inbound_calls: inbound,
      outbound_reminder_calls: reminders,
      outbound_recall_calls: recalls,
      appointments_booked: booked,
      appointments_cancelled: cancelled,
      no_answer_count: noAnswer,
      transfers_to_human: transfers,
    };
  });

  return NextResponse.json({ metrics });
}
