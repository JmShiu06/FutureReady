import type { LearningMilestone } from './types';
/** Pack ordered activities into a weekly capacity; split long activities without losing hours. */
export function learningSchedule(steps: LearningMilestone[], hoursPerWeek: number) {
  if (!Number.isFinite(hoursPerWeek) || hoursPerWeek < 1 || hoursPerWeek > 40) return [];
  const weeks: { week: number; activities: { id: string; skill: string; hours: number }[]; hours: number }[] = [];
  for (const step of steps) {
    if (step.durationHours === null || !Number.isFinite(step.durationHours) || step.durationHours <= 0) continue;
    let left = step.durationHours;
    while (left > .00001 && weeks.length < 2000) {
      let week = weeks.at(-1);
      if (!week || week.hours >= hoursPerWeek - .00001) {
        week = { week: weeks.length + 1, activities: [], hours: 0 }; weeks.push(week);
      }
      const hours = Math.min(left, hoursPerWeek - week.hours);
      week.activities.push({ id: step.id, skill: step.skill, hours });
      week.hours += hours; left -= hours;
    }
  }
  return weeks;
}
