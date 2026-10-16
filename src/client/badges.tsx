import React from 'react';
import type { AttendanceStatus, FinancialStatus, OriginChannel } from '../shared/types';

export const ATTENDANCE_LABELS: Record<
  AttendanceStatus,
  { label: string; bg: string; text: string; dot: string }
> = {
  completed: {
    label: 'Atendida',
    bg: 'bg-emerald-50 border-emerald-200',
    text: 'text-emerald-700',
    dot: 'bg-emerald-500',
  },
  in_consultation: {
    label: 'En consulta',
    bg: 'bg-blue-50 border-blue-200',
    text: 'text-blue-700',
    dot: 'bg-blue-500',
  },
  waiting: {
    label: 'En espera',
    bg: 'bg-amber-50 border-amber-200',
    text: 'text-amber-700',
    dot: 'bg-amber-500',
  },
  confirmed: {
    label: 'Confirmada',
    bg: 'bg-teal-50 border-teal-200',
    text: 'text-teal-700',
    dot: 'bg-teal-500',
  },
  scheduled: {
    label: 'Programada',
    bg: 'bg-slate-100 border-slate-200',
    text: 'text-slate-700',
    dot: 'bg-slate-400',
  },
  cancelled: {
    label: 'Cancelada',
    bg: 'bg-rose-50 border-rose-200',
    text: 'text-rose-700',
    dot: 'bg-rose-500',
  },
  no_show: {
    label: 'No asistió',
    bg: 'bg-red-50 border-red-200',
    text: 'text-red-700',
    dot: 'bg-red-600',
  },
};

export const FINANCIAL_LABELS: Record<
  FinancialStatus,
  { label: string; bg: string; text: string }
> = {
  paid: {
    label: 'Pagado',
    bg: 'bg-emerald-50 border-emerald-200',
    text: 'text-emerald-700',
  },
  pending: {
    label: 'Pendiente',
    bg: 'bg-rose-50 border-rose-200',
    text: 'text-rose-700',
  },
  partial: {
    label: 'Parcial',
    bg: 'bg-amber-50 border-amber-200',
    text: 'text-amber-700',
  },
  partially_refunded: {
    label: 'Reemb. parcial',
    bg: 'bg-purple-50 border-purple-200',
    text: 'text-purple-700',
  },
  refunded: {
    label: 'Reembolsado',
    bg: 'bg-slate-100 border-slate-300',
    text: 'text-slate-700',
  },
  no_charge: {
    label: 'Sin cargo',
    bg: 'bg-slate-50 border-slate-200',
    text: 'text-slate-600',
  },
};

export const ORIGIN_LABELS: Record<OriginChannel, string> = {
  public_link: 'Enlace público',
  whatsapp_manual: 'WhatsApp recepción',
  phone: 'Llamada telefónica',
  reception: 'Recepción presencial',
  facebook: 'Campaña Facebook',
  google: 'Campaña Google',
  referral: 'Paciente referido',
};

export const AttendanceBadge: React.FC<{ status: AttendanceStatus }> = ({ status }) => {
  const cfg = ATTENDANCE_LABELS[status] || ATTENDANCE_LABELS.scheduled;
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold border ${cfg.bg} ${cfg.text}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} aria-hidden="true" />
      {cfg.label}
    </span>
  );
};

export const FinancialBadge: React.FC<{ status: FinancialStatus }> = ({ status }) => {
  const cfg = FINANCIAL_LABELS[status] || FINANCIAL_LABELS.pending;
  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold border ${cfg.bg} ${cfg.text}`}
    >
      {cfg.label}
    </span>
  );
};
