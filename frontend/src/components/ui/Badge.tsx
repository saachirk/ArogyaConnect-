// Triage level & status badge component

const TRIAGE_MAP: Record<string, string> = {
  RED: 'badge badge-red',
  ORANGE: 'badge badge-orange',
  GREEN: 'badge badge-green',
};

const STATUS_MAP: Record<string, string> = {
  WAITING: 'badge badge-yellow',
  IN_PROGRESS: 'badge badge-blue',
  COMPLETED: 'badge badge-green',
  CANCELLED: 'badge badge-red',
  RESCHEDULED: 'badge badge-purple',
};

const PRIORITY_MAP: Record<string, string> = {
  EMERGENCY: 'badge badge-red',
  URGENT: 'badge badge-orange',
  ROUTINE: 'badge badge-teal',
};

const REFERRAL_MAP: Record<string, string> = {
  CREATED: 'badge badge-yellow',
  ACCEPTED: 'badge badge-blue',
  SCHEDULED: 'badge badge-purple',
  CONSULTED: 'badge badge-teal',
  FOLLOW_UP_DUE: 'badge badge-orange',
  COMPLETED: 'badge badge-green',
  RE_REFERRED: 'badge badge-gray',
};

const FOLLOWUP_MAP: Record<string, string> = {
  DUE: 'badge badge-yellow',
  OVERDUE: 'badge badge-red',
  COMPLETED: 'badge badge-green',
};

const CONNECTIVITY_MAP: Record<string, string> = {
  ONLINE: 'badge badge-green',
  OFFLINE: 'badge badge-red',
  DEGRADED: 'badge badge-orange',
};

interface BadgeProps {
  type: 'triage' | 'status' | 'priority' | 'referral' | 'followup' | 'connectivity' | 'gender' | 'migrant';
  value: string;
}

export default function Badge({ type, value }: BadgeProps) {
  let cls = 'badge badge-gray';

  switch (type) {
    case 'triage':     cls = TRIAGE_MAP[value.toUpperCase()]       || 'badge badge-gray'; break;
    case 'status':     cls = STATUS_MAP[value.toUpperCase()]        || 'badge badge-gray'; break;
    case 'priority':   cls = PRIORITY_MAP[value.toUpperCase()]      || 'badge badge-gray'; break;
    case 'referral':   cls = REFERRAL_MAP[value.toUpperCase()]      || 'badge badge-gray'; break;
    case 'followup':   cls = FOLLOWUP_MAP[value.toUpperCase()]      || 'badge badge-gray'; break;
    case 'connectivity': cls = CONNECTIVITY_MAP[value.toUpperCase()] || 'badge badge-gray'; break;
    case 'gender':     cls = value.toUpperCase() === 'M' ? 'badge badge-blue' : value.toUpperCase() === 'F' ? 'badge badge-purple' : 'badge badge-gray'; break;
    case 'migrant':    cls = value === 'true' ? 'badge badge-orange' : 'badge badge-teal'; break;
  }

  const label =
    type === 'gender'  ? (value.toUpperCase() === 'M' ? 'Male' : value.toUpperCase() === 'F' ? 'Female' : value) :
    type === 'migrant' ? (value === 'true' ? 'Migrant' : 'Resident') :
    value;

  return <span className={cls}>{label}</span>;
}
