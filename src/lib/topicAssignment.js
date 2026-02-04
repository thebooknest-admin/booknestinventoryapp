// lib/topicAssignment.js

import { TOPIC_KEYWORDS } from './topicKeywords.js';

// How important each field is
const WEIGHTS = {
  title: 5,      // Title is VERY important
  subtitle: 3,   // Subtitle is pretty important
  subjects: 4,   // Publisher categories are important
  description: 1 // Description is least important
};

// Clean up text (make lowercase, remove weird characters)
function normalize(text) {
  if (!text) return '';
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Count how many times a word appears
function countMatches(text, keyword) {
  const regex = new RegExp(`\\b${keyword.replace(/\s+/g, '\\s+')}\\b`, 'gi');
  const matches = text.match(regex);
  return matches ? matches.length : 0;
}

// THE MAIN FUNCTION - This does all the work!
export function assignPrimaryTopic(bookData) {
  // Step 1: Clean up all the text
  const cleanText = {
    title: normalize(bookData.title),
    subtitle: normalize(bookData.subtitle || ''),
    description: normalize(bookData.description || ''),
    subjects: normalize(bookData.subjects?.join(' ') || '')
  };

  // Step 2: Count points for each topic
  const scores = {};
  
  for (const topicName in TOPIC_KEYWORDS) {
    let points = 0;
    
    // Look through each field (title, subtitle, etc.)
    for (const fieldName in cleanText) {
      const text = cleanText[fieldName];
      const fieldWeight = WEIGHTS[fieldName];
      
      // Count primary keywords (worth 3 points each)
      for (const keyword of TOPIC_KEYWORDS[topicName].primary) {
        const count = countMatches(text, keyword);
        const bonus = keyword.includes(' ') ? 2 : 1; // 2-word phrases get bonus
        points += count * fieldWeight * 3 * bonus;
      }
      
      // Count secondary keywords (worth 1 point each)
      for (const keyword of TOPIC_KEYWORDS[topicName].secondary) {
        const count = countMatches(text, keyword);
        points += count * fieldWeight * 1;
      }
    }
    
    scores[topicName] = points;
  }

  // Step 3: Find the winner
  const sortedTopics = Object.entries(scores)
    .sort((a, b) => b[1] - a[1]); // Sort by score, highest first
  
  const winnerName = sortedTopics[0][0];
  const winnerScore = sortedTopics[0][1];
  const runnerUpScore = sortedTopics[1]?.[1] || 0;
  const totalPoints = Object.values(scores).reduce((a, b) => a + b, 0);

  // Step 4: Calculate how sure we are (0-100%)
  const confidence = calculateConfidence(winnerScore, runnerUpScore, totalPoints);

  return {
    primaryTopic: winnerName,
    confidence: confidence,
    allScores: scores,
    winnerScore: winnerScore,
    runnerUpScore: runnerUpScore,
    totalScore: totalPoints
  };
}

// Figure out how confident we are (0-100)
function calculateConfidence(winnerScore, runnerUpScore, totalPoints) {
  if (totalPoints === 0) return 0;
  
  const howMuchBetter = winnerScore / (runnerUpScore + 1); // How much better than 2nd place
  const percentageOfTotal = winnerScore / totalPoints;      // How strong overall
  const gap = (winnerScore - runnerUpScore) / totalPoints;  // Size of gap
  
  const confidence = Math.min(100,
    (howMuchBetter * 20) +
    (percentageOfTotal * 40) +
    (gap * 40)
  );
  
  return Math.round(confidence);
}