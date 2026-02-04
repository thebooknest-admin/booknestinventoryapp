// lib/reviewRules.js

export function shouldRequireReview(result) {
  const { confidence, winnerScore, totalScore, runnerUpScore } = result;
  
  const reasons = [];
  
  // Rule 1: Too unsure (less than 60% confident)
  if (confidence < 60) {
    reasons.push(`Low confidence: ${confidence}%`);
  }
  
  // Rule 2: Not enough words matched (score too low)
  if (totalScore < 10) {
    reasons.push(`Weak signal: only ${totalScore} points`);
  }
  
  // Rule 3: Winner isn't strong enough (less than 30% of total)
  if (winnerScore / totalScore < 0.3) {
    reasons.push(`Winner too weak: only ${Math.round(winnerScore/totalScore*100)}% of total`);
  }
  
  // Rule 4: Too close between 1st and 2nd place
  const gap = ((winnerScore - runnerUpScore) / totalScore) * 100;
  if (gap < 15) {
    reasons.push(`Too close: only ${gap.toFixed(1)}% gap`);
  }
  
  // Rule 5: No matches at all
  if (totalScore === 0) {
    reasons.push('No keyword matches found');
  }
  
  return {
    needsReview: reasons.length > 0,
    reasons: reasons,
    action: reasons.length > 0 ? 'REQUIRE_REVIEW' : 'AUTO_APPROVE'
  };
}