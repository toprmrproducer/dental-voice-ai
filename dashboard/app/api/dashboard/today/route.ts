import { NextResponse } from "next/server";

export async function GET() {
  const now = new Date();
  const todayStr = now.toISOString().split("T")[0];

  return NextResponse.json({
    total_calls: 12,
    appointments_booked_today: 5,
    reminders_sent: 8,
    recalls_made: 3,
    recent_calls: [
      {
        id: "c1",
        patient_name: "Rahul Sharma",
        phone_number: "+91 98765 43210",
        call_type: "inbound",
        outcome: "booked",
        duration_seconds: 142,
        summary: "Patient called to book a routine cleaning. Appointment scheduled for tomorrow at 10 AM with Dr. Patel.",
        created_at: new Date(now.getTime() - 15 * 60000).toISOString(),
      },
      {
        id: "c2",
        patient_name: "Priya Mehta",
        phone_number: "+91 87654 32109",
        call_type: "inbound",
        outcome: "faq",
        duration_seconds: 67,
        summary: "Patient inquired about teeth whitening costs and availability.",
        created_at: new Date(now.getTime() - 45 * 60000).toISOString(),
      },
      {
        id: "c3",
        patient_name: "Arjun Reddy",
        phone_number: "+91 76543 21098",
        call_type: "reminder",
        outcome: "booked",
        duration_seconds: 95,
        summary: "Reminded about upcoming appointment. Patient confirmed attendance.",
        created_at: new Date(now.getTime() - 90 * 60000).toISOString(),
      },
      {
        id: "c4",
        patient_name: "Ananya Iyer",
        phone_number: "+91 65432 10987",
        call_type: "recall",
        outcome: "booked",
        duration_seconds: 120,
        summary: "Recall for 6-month checkup. Patient booked for next week.",
        created_at: new Date(now.getTime() - 150 * 60000).toISOString(),
      },
      {
        id: "c5",
        patient_name: "Vikram Singh",
        phone_number: "+91 54321 09876",
        call_type: "inbound",
        outcome: "transferred",
        duration_seconds: 38,
        summary: "Patient reported severe toothache. Transferred to emergency line.",
        created_at: new Date(now.getTime() - 200 * 60000).toISOString(),
      },
    ],
    todays_appointments: [
      {
        id: "a1",
        patient_name: "Meera Kapoor",
        provider_name: "Dr. Patel",
        service_type: "Cleaning",
        start_time: `${todayStr}T09:00:00`,
        status: "confirmed",
      },
      {
        id: "a2",
        patient_name: "Ravi Kumar",
        provider_name: "Dr. Gupta",
        service_type: "Root Canal",
        start_time: `${todayStr}T10:30:00`,
        status: "confirmed",
      },
      {
        id: "a3",
        patient_name: "Sneha Joshi",
        provider_name: "Dr. Patel",
        service_type: "Whitening",
        start_time: `${todayStr}T11:00:00`,
        status: "scheduled",
      },
      {
        id: "a4",
        patient_name: "Amit Desai",
        provider_name: "Dr. Shah",
        service_type: "Filling",
        start_time: `${todayStr}T14:00:00`,
        status: "scheduled",
      },
      {
        id: "a5",
        patient_name: "Kavya Nair",
        provider_name: "Dr. Gupta",
        service_type: "Checkup",
        start_time: `${todayStr}T15:30:00`,
        status: "confirmed",
      },
    ],
  });
}
