import { NextResponse } from "next/server";

const agentData: Record<string, any> = {};

function getDefaultConfig(clinicId: string) {
  return {
    clinic: {
      id: clinicId,
      name: "DentAI Dental Clinic",
      address: "123 Health Street, Mumbai",
      phone: "+91 22 6973 8988",
      emergency_escalation_number: "+91 98765 00000",
      business_hours_json: {
        monday: { open: "09:00", close: "18:00", is_open: true },
        tuesday: { open: "09:00", close: "18:00", is_open: true },
        wednesday: { open: "09:00", close: "18:00", is_open: true },
        thursday: { open: "09:00", close: "18:00", is_open: true },
        friday: { open: "09:00", close: "17:00", is_open: true },
        saturday: { open: "10:00", close: "14:00", is_open: true },
        sunday: { open: "00:00", close: "00:00", is_open: false },
      },
    },
    agent: {
      agent_name: "Riya",
      voice: "Cheyenne",
      voice_id: "Cheyenne-PlayAI",
      is_active: true,
      language: "en",
      greeting: "Hello! Thank you for calling DentAI Dental Clinic. How can I help you today?",
      faq_bank_json: [
        { question: "What are your hours?", answer: "We are open Mon-Fri 9 AM to 6 PM, Saturday 10 AM to 2 PM." },
        { question: "Do you accept insurance?", answer: "Yes, we accept most major dental insurance plans." },
        { question: "How much is a cleaning?", answer: "A routine cleaning starts at ₹1,500." },
      ],
    },
    providers: [
      { id: "p1", name: "Dr. Patel", specialty: "General Dentist", is_active: true },
      { id: "p2", name: "Dr. Gupta", specialty: "Endodontist", is_active: true },
      { id: "p3", name: "Dr. Shah", specialty: "Hygienist", is_active: true },
    ],
  };
}

export async function GET(
  _req: Request,
  { params }: { params: { clinicId: string } }
) {
  const data = agentData[params.clinicId] || getDefaultConfig(params.clinicId);
  return NextResponse.json(data);
}

export async function PUT(
  req: Request,
  { params }: { params: { clinicId: string } }
) {
  const body = await req.json();
  const current = agentData[params.clinicId] || getDefaultConfig(params.clinicId);

  if (body.agent_name) current.agent.agent_name = body.agent_name;
  if (body.voice_id) current.agent.voice_id = body.voice_id;
  if (body.emergency_escalation_number) current.clinic.emergency_escalation_number = body.emergency_escalation_number;
  if (body.business_hours_json) current.clinic.business_hours_json = body.business_hours_json;
  if (body.faq_bank_json) current.agent.faq_bank_json = body.faq_bank_json;
  if (body.providers) current.providers = body.providers;

  agentData[params.clinicId] = current;
  return NextResponse.json({ success: true });
}
