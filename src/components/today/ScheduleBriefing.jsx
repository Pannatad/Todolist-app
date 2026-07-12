/* eslint-disable react-refresh/only-export-components */
import { getColorForSubject } from '../../constants/subjects';

const minutesLabel = (minutes) => {
  if (!Number.isFinite(minutes) || minutes <= 0) return '0 min';
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60); const rest = minutes % 60;
  return rest ? `${hours}h ${rest}m` : `${hours}h`;
};

export const makeScheduleBriefing = (items, now) => {
  const entries = items.map((item) => {
    const start = item.displayTime || new Date(item.startTime || item.start_time);
    const duration = item.duration || 60;
    return { item, start, end: new Date(start.getTime() + duration * 60000), duration, category: String(item.category || item.subject || 'Other').trim() || 'Other' };
  }).filter((entry) => !Number.isNaN(entry.start.getTime()));
  const categories = new Map();
  entries.forEach((entry) => {
    const value = categories.get(entry.category) || { category: entry.category, count: 0, minutes: 0, remaining: 0, color: getColorForSubject(entry.category) };
    value.count += 1; value.minutes += entry.duration; if (entry.end > now) value.remaining += 1; categories.set(entry.category, value);
  });
  const remainingMinutes = entries.reduce((sum, entry) => sum + (entry.end > now ? Math.max(0, Math.round((entry.end - Math.max(entry.start, now)) / 60000)) : 0), 0);
  return { totalBlocks: entries.length, totalMinutes: entries.reduce((sum, entry) => sum + entry.duration, 0), remainingBlocks: entries.filter((entry) => entry.end > now).length, remainingMinutes, categories: [...categories.values()].sort((left, right) => right.remaining - left.remaining || right.minutes - left.minutes) };
};

const ScheduleBriefing = ({ briefing }) => {
  if (!briefing.totalBlocks) return null;
  const ahead = briefing.remainingBlocks > 0;
  return <div className="mt-4 rounded-xl border border-sage-200/70 bg-white/70 p-3.5"><p className="text-sm font-semibold leading-6 text-gray-700">{ahead ? <>You have <span className="font-black text-gray-950">{briefing.remainingBlocks}</span> of {briefing.totalBlocks} {briefing.totalBlocks === 1 ? 'block' : 'blocks'} still ahead · {minutesLabel(briefing.remainingMinutes)} of scheduled time left</> : <>All <span className="font-black text-gray-950">{briefing.totalBlocks}</span> {briefing.totalBlocks === 1 ? 'block is' : 'blocks are'} behind you · {minutesLabel(briefing.totalMinutes)} scheduled today</>} across {briefing.categories.length} {briefing.categories.length === 1 ? 'area' : 'areas'}.</p><div className="mt-3 flex flex-wrap gap-1.5">{briefing.categories.map((category) => <span key={category.category} className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold" style={{ backgroundColor: category.color.bgColor, color: category.color.color }}><span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: category.color.color }} />{category.category}<span className="opacity-70">{category.count} · {minutesLabel(category.minutes)}</span></span>)}</div></div>;
};

export default ScheduleBriefing;
