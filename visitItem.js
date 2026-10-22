/**
 * ui/components/visitItem.js - שורת ביקור ברשימות (דף מרפאה, מסך ביקורים).
 */
import { fmtDate } from '../../utils/format.js';
import { clinicName, userName } from '../../domain/permissions.js';
import { completionPct } from '../../domain/checklist.js';
import { completionTone } from '../../domain/metrics.js';
import { listItem } from './listItem.js';
import { pill } from './pill.js';

export function visitItem(visit) {
  const pct = completionPct(visit);
  const open = visit.tasks.filter(t => !t.done).length;
  const subtitle = `${userName(visit.coordId)} · ${visit.purpose || 'ללא מטרה'}${open ? ` · ${open} משימות פתוחות` : ''}`;
  return listItem({
    action: 'showVisit',
    id: visit.id,
    title: `${fmtDate(visit.date)} · ${clinicName(visit.clinicId)}`,
    subtitle,
    badgeHtml: pill(`${pct}%`, completionTone(pct)),
  });
}

