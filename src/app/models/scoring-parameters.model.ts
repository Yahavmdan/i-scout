export interface ScoringParameters {
  goals: number;
  ownGoals: number;
  headGoals: number;
  goalAfterDribble: number;
  hardGoal: number;
  easyGoal: number;
  farShootingGoal: number;
  passes: number;
  accuratePasses: number;
  passLeadingToGoal: number;
  ballLoss: number;
  ballLossDangerous: number;
  ballLossCausingGoal: number;
  goalReceived: number;
  goalReceivedBadPass: number;
  goalReceivedOwnLoss: number;
  foulTackle: number;
  foulHandball: number;
  foulStoppingGoalHand: number;
  foulStoppingGoalTackle: number;
  penaltyScored: number;
  penaltyMissed: number;
  penaltySaved: number;
}
