import { ReactNode } from "react";

interface KPICardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  color: "dental" | "blue" | "amber" | "purple" | "green" | "red";
  subtitle?: string;
}

const colorStyles: Record<string, { bg: string; icon: string; text: string }> = {
  dental: { bg: "bg-teal-50", icon: "text-teal-600", text: "text-teal-700" },
  blue: { bg: "bg-blue-50", icon: "text-blue-600", text: "text-blue-700" },
  amber: { bg: "bg-amber-50", icon: "text-amber-600", text: "text-amber-700" },
  purple: { bg: "bg-purple-50", icon: "text-purple-600", text: "text-purple-700" },
  green: { bg: "bg-green-50", icon: "text-green-600", text: "text-green-700" },
  red: { bg: "bg-red-50", icon: "text-red-600", text: "text-red-700" },
};

export default function KPICard({ title, value, icon, color, subtitle }: KPICardProps) {
  const styles = colorStyles[color] || colorStyles.dental;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className={`text-2xl font-bold ${styles.text}`}>{value}</p>
          {subtitle && <p className="text-xs text-slate-400">{subtitle}</p>}
        </div>
        <div className={`p-3 rounded-lg ${styles.bg}`}>
          <div className={styles.icon}>{icon}</div>
        </div>
      </div>
    </div>
  );
}
