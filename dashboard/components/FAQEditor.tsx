"use client";

import { Plus, Trash2 } from "lucide-react";

interface FAQ {
  question: string;
  answer: string;
}

interface FAQEditorProps {
  faqs: FAQ[];
  onChange: (faqs: FAQ[]) => void;
}

export default function FAQEditor({ faqs, onChange }: FAQEditorProps) {
  const handleAdd = () => {
    onChange([...faqs, { question: "", answer: "" }]);
  };

  const handleRemove = (index: number) => {
    onChange(faqs.filter((_, i) => i !== index));
  };

  const handleUpdate = (index: number, field: "question" | "answer", value: string) => {
    const updated = [...faqs];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  };

  return (
    <div className="space-y-4">
      {faqs.length === 0 && (
        <p className="text-sm text-slate-400 text-center py-4">
          No FAQs configured yet. Add common questions and answers below.
        </p>
      )}

      {faqs.map((faq, i) => (
        <div key={i} className="border border-gray-200 rounded-lg p-4 space-y-3 relative group">
          <button
            onClick={() => handleRemove(i)}
            className="absolute top-3 right-3 p-1 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition"
          >
            <Trash2 className="w-4 h-4" />
          </button>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Question #{i + 1}
            </label>
            <input
              type="text"
              value={faq.question}
              onChange={(e) => handleUpdate(i, "question", e.target.value)}
              placeholder="e.g., Do you accept Delta Dental insurance?"
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-dental-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Answer</label>
            <textarea
              value={faq.answer}
              onChange={(e) => handleUpdate(i, "answer", e.target.value)}
              placeholder="e.g., Yes, we are a Delta Dental Premier provider and accept most PPO and HMO plans."
              rows={3}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-dental-500 outline-none resize-none"
            />
          </div>
        </div>
      ))}

      <button
        onClick={handleAdd}
        className="w-full py-2.5 border-2 border-dashed border-gray-200 rounded-lg text-sm text-slate-500 hover:text-dental-600 hover:border-dental-300 transition flex items-center justify-center gap-2"
      >
        <Plus className="w-4 h-4" />
        Add FAQ Entry
      </button>
    </div>
  );
}
