import { NextResponse } from "next/server";

export async function GET() {
  const now = new Date();
  return NextResponse.json({
    campaigns: [
      {
        id: "rc1",
        patient_name: "Deepak Patil",
        phone_number: "+91 88901 23456",
        last_visit: new Date(now.getTime() - 180 * 86400000).toISOString().split("T")[0],
        status: "pending",
        attempts: 0,
        last_called_at: null,
      },
      {
        id: "rc2",
        patient_name: "Sunita Rao",
        phone_number: "+91 77890 12345",
        last_visit: new Date(now.getTime() - 200 * 86400000).toISOString().split("T")[0],
        status: "called",
        attempts: 1,
        last_called_at: new Date(now.getTime() - 2 * 86400000).toISOString(),
      },
      {
        id: "rc3",
        patient_name: "Rajesh Verma",
        phone_number: "+91 66789 01234",
        last_visit: new Date(now.getTime() - 210 * 86400000).toISOString().split("T")[0],
        status: "booked",
        attempts: 1,
        last_called_at: new Date(now.getTime() - 5 * 86400000).toISOString(),
      },
      {
        id: "rc4",
        patient_name: "Pooja Agarwal",
        phone_number: "+91 55678 90123",
        last_visit: new Date(now.getTime() - 190 * 86400000).toISOString().split("T")[0],
        status: "no_answer",
        attempts: 2,
        last_called_at: new Date(now.getTime() - 1 * 86400000).toISOString(),
      },
      {
        id: "rc5",
        patient_name: "Nikhil Das",
        phone_number: "+91 44567 89012",
        last_visit: new Date(now.getTime() - 250 * 86400000).toISOString().split("T")[0],
        status: "declined",
        attempts: 1,
        last_called_at: new Date(now.getTime() - 7 * 86400000).toISOString(),
      },
    ],
  });
}
