import type { AcquisitionMilestone } from "@shared/schema";

export type MilestoneStatus = "on_track" | "at_risk" | "behind" | "achieved" | "no_data";

export interface MilestoneStatusResult {
  status: MilestoneStatus;
  currentMilestone: AcquisitionMilestone | null;
  actualCount: number;
  targetCount: number;
  percentComplete: number;
  delta: number;
  daysRemaining: number | null;
  projectedCount: number | null;
}

export function calculateMilestoneStatus(
  milestones: AcquisitionMilestone[] | null | undefined,
  acquisitionGoal: number | null | undefined,
  actualRegistrations: number,
  today: Date = new Date()
): MilestoneStatusResult {
  const noDataResult: MilestoneStatusResult = {
    status: "no_data",
    currentMilestone: null,
    actualCount: actualRegistrations,
    targetCount: 0,
    percentComplete: 0,
    delta: 0,
    daysRemaining: null,
    projectedCount: null,
  };

  if (!milestones || milestones.length === 0) {
    if (acquisitionGoal && acquisitionGoal > 0) {
      const percentComplete = Math.round((actualRegistrations / acquisitionGoal) * 100);
      return {
        status: actualRegistrations >= acquisitionGoal ? "achieved" : "on_track",
        currentMilestone: null,
        actualCount: actualRegistrations,
        targetCount: acquisitionGoal,
        percentComplete: Math.min(percentComplete, 100),
        delta: actualRegistrations - acquisitionGoal,
        daysRemaining: null,
        projectedCount: null,
      };
    }
    return noDataResult;
  }

  const sortedMilestones = [...milestones].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  
  let currentMilestone: AcquisitionMilestone | null = null;
  let previousMilestone: AcquisitionMilestone | null = null;

  for (let i = 0; i < sortedMilestones.length; i++) {
    const milestone = sortedMilestones[i];
    const milestoneDate = new Date(milestone.date);
    const milestoneDateStart = new Date(milestoneDate.getFullYear(), milestoneDate.getMonth(), milestoneDate.getDate());

    if (milestoneDateStart >= todayStart) {
      currentMilestone = milestone;
      previousMilestone = i > 0 ? sortedMilestones[i - 1] : null;
      break;
    }
  }

  if (!currentMilestone) {
    const lastMilestone = sortedMilestones[sortedMilestones.length - 1];
    const delta = actualRegistrations - lastMilestone.targetAttendees;
    const percentComplete = Math.round((actualRegistrations / lastMilestone.targetAttendees) * 100);
    
    return {
      status: actualRegistrations >= lastMilestone.targetAttendees ? "achieved" : "behind",
      currentMilestone: lastMilestone,
      actualCount: actualRegistrations,
      targetCount: lastMilestone.targetAttendees,
      percentComplete: Math.min(percentComplete, 100),
      delta,
      daysRemaining: 0,
      projectedCount: actualRegistrations,
    };
  }

  const milestoneDate = new Date(currentMilestone.date);
  const milestoneDateStart = new Date(milestoneDate.getFullYear(), milestoneDate.getMonth(), milestoneDate.getDate());
  
  const daysRemaining = Math.ceil((milestoneDateStart.getTime() - todayStart.getTime()) / (1000 * 60 * 60 * 24));
  
  const startDate = previousMilestone 
    ? new Date(previousMilestone.date) 
    : new Date(sortedMilestones[0].date);
  startDate.setMonth(startDate.getMonth() - 1);
  
  const startCount = previousMilestone ? previousMilestone.targetAttendees : 0;
  const targetCount = currentMilestone.targetAttendees;
  
  const totalDays = Math.ceil((milestoneDateStart.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  const elapsedDays = Math.ceil((todayStart.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  
  const delta = actualRegistrations - targetCount;
  const percentComplete = targetCount > 0 
    ? Math.round((actualRegistrations / targetCount) * 100) 
    : 100;

  if (actualRegistrations >= targetCount) {
    return {
      status: "achieved",
      currentMilestone,
      actualCount: actualRegistrations,
      targetCount,
      percentComplete: Math.min(percentComplete, 100),
      delta,
      daysRemaining,
      projectedCount: actualRegistrations,
    };
  }

  const registrationsNeeded = targetCount - startCount;
  const expectedProgress = totalDays > 0 ? (elapsedDays / totalDays) * registrationsNeeded : 0;
  const expectedCount = startCount + expectedProgress;
  
  const dailyRate = elapsedDays > 0 ? (actualRegistrations - startCount) / elapsedDays : 0;
  const projectedCount = Math.round(actualRegistrations + (dailyRate * daysRemaining));

  const progressRatio = expectedCount > 0 ? actualRegistrations / expectedCount : 1;
  
  let status: MilestoneStatus;
  if (progressRatio >= 0.9) {
    status = "on_track";
  } else if (progressRatio >= 0.7 || projectedCount >= targetCount * 0.9) {
    status = "at_risk";
  } else {
    status = "behind";
  }

  return {
    status,
    currentMilestone,
    actualCount: actualRegistrations,
    targetCount,
    percentComplete: Math.min(percentComplete, 100),
    delta,
    daysRemaining,
    projectedCount,
  };
}

export function getStatusLabel(status: MilestoneStatus): string {
  switch (status) {
    case "on_track":
      return "On track";
    case "at_risk":
      return "At risk";
    case "behind":
      return "Behind";
    case "achieved":
      return "Achieved";
    case "no_data":
      return "No milestones";
    default:
      return "Unknown";
  }
}

export function getStatusColor(status: MilestoneStatus): "green" | "yellow" | "red" | "blue" | "gray" {
  switch (status) {
    case "on_track":
      return "green";
    case "at_risk":
      return "yellow";
    case "behind":
      return "red";
    case "achieved":
      return "blue";
    case "no_data":
      return "gray";
    default:
      return "gray";
  }
}
