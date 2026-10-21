/**
 * Metric card for dashboard stats display.
 */

import { type LucideIcon } from "lucide-react";

interface MetricCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  subtitle?: string;
  trend?: {
    value: number;
    positive: boolean;
  };
  color?: "blue" | "green" | "red" | "orange" | "purple" | "gray";
}

const colorMap = {
  blue: {
    bg: "bg-brand-50",
    icon: "text-brand-600",
    ring: "ring-brand-100",
  },
  green: {
    bg: "bg-success-50",
    icon: "text-success-600",
    ring: "ring-success-100",
  },
  red: {
    bg: "bg-danger-50",
    icon: "text-danger-600",
    ring: "ring-danger-100",
  },
  orange: {
    bg: "bg-warning-50",
    icon: "text-warning-500",
    ring: "ring-warning-100",
  },
  purple: {
    bg: "bg-purple-50",
    icon: "text-purple-600",
    ring: "ring-purple-100",
  },
  gray: {
    bg: "bg-gray-100",
    icon: "text-gray-600",
    ring: "ring-gray-200",
  },
};

export default function MetricCard({
  icon: Icon,
  label,
  value,
  subtitle,
  trend,
  color = "blue",
}: MetricCardProps) {
  const colors = colorMap[color];

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5 hover:shadow-md transition-shadow duration-200 animate-fade-in">
      <div className="flex items-start justify-between mb-3">
        <div
          className={`flex items-center justify-center w-10 h-10 rounded-xl ${colors.bg} ring-1 ${colors.ring}`}
        >
          <Icon className={`w-5 h-5 ${colors.icon}`} strokeWidth={1.8} />
        </div>
        {trend && (
          <span
            className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
              trend.positive
                ? "bg-success-50 text-success-600"
                : "bg-danger-50 text-danger-600"
            }`}
          >
            {trend.positive ? "+" : ""}
            {trend.value}%
          </span>
        )}
      </div>
      <p className="text-2xl font-bold text-gray-900 tracking-tight">{value}</p>
      <p className="text-sm text-gray-500 mt-1">{label}</p>
      {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
    </div>
  );
}
