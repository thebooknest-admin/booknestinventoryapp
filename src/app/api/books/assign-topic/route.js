// src/app/api/books/assign-topic/route.js

import { assignPrimaryTopic } from '@/lib/topicAssignment';
import { shouldRequireReview } from '@/lib/reviewRules';

export async function POST(request) {
  try {
    const bookData = await request.json();
    
    const result = assignPrimaryTopic(bookData);
    const reviewCheck = shouldRequireReview(result);
    
    return Response.json({
      isbn: bookData.isbn,
      primaryTopic: result.primaryTopic,
      confidence: result.confidence,
      action: reviewCheck.action,
      needsReview: reviewCheck.needsReview,
      reviewReasons: reviewCheck.reasons,
      allScores: result.allScores,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    return Response.json(
      { error: 'Failed to assign topic', details: error.message },
      { status: 500 }
    );
  }
}