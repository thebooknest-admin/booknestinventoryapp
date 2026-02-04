// src/scripts/fetchAndTagBooks.js

// Import dotenv FIRST
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';
import { fetchBookMetadata } from '../lib/isbnMetadata.js';
import { assignPrimaryTopic } from '../lib/topicAssignment.js';
import { shouldRequireReview } from '../lib/reviewRules.js';

// Add these debug lines temporarily
console.log('🔍 Checking environment variables...');
console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
console.log('Anon Key:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅ Found' : '❌ Missing');
console.log('Service Key:', process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ Found' : '❌ Missing');
console.log('');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials!');
  console.error('Make sure .env.local exists in the project root with:');
  console.error('  NEXT_PUBLIC_SUPABASE_URL=...');
  console.error('  SUPABASE_SERVICE_ROLE_KEY=...');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fetchAndTagAllBooks() {
  console.log('🚀 Starting metadata fetch + tagging...\n');
  
  // Get books without metadata OR without tags
  const { data: books, error } = await supabase
    .from('book_titles')
    .select('id, isbn, title')
    .or('metadata_fetched_at.is.null,primary_topic.is.null')
    .limit(100);
  
  if (error) {
    console.error('❌ Error fetching books:', error);
    return;
  }
  
  console.log(`📚 Found ${books.length} books to process\n`);
  
  let metadataFetched = 0;
  let metadataFailed = 0;
  let autoApproved = 0;
  let needsReview = 0;
  
  for (let i = 0; i < books.length; i++) {
    const book = books[i];
    
    console.log(`\n[${i+1}/${books.length}] Processing: ${book.title}`);
    console.log(`   ISBN: ${book.isbn}`);
    
    try {
      // STEP 1: Fetch metadata if we don't have it
      console.log('   📖 Fetching metadata...');
      const metadata = await fetchBookMetadata(book.isbn);
      
      if (!metadata) {
        console.log('   ❌ No metadata found');
        metadataFailed++;
        
        // Still try to tag with just the title
        const result = assignPrimaryTopic({
          isbn: book.isbn,
          title: book.title,
          subtitle: '',
          description: '',
          subjects: []
        });
        
        const reviewCheck = shouldRequireReview(result);
        
        await supabase
          .from('book_titles')
          .update({
            primary_topic: result.primaryTopic,
            topic_confidence: result.confidence,
            needs_topic_review: true,
            topic_review_reasons: ['No metadata available', ...(reviewCheck.reasons || [])],
            topic_assigned_at: new Date().toISOString()
          })
          .eq('id', book.id);
        
        needsReview++;
        continue;
      }
      
      console.log('   ✅ Metadata found from', metadata.metadata_source);
      metadataFetched++;
      
      // STEP 2: Save metadata to database
      await supabase
        .from('book_titles')
        .update({
          subtitle: metadata.subtitle,
          description: metadata.description,
          subjects: metadata.subjects,
          publisher: metadata.publisher,
          published_date: metadata.published_date,
          page_count: metadata.page_count,
          metadata_fetched_at: new Date().toISOString(),
          metadata_source: metadata.metadata_source,
          cover_url: metadata.cover_url || book.cover_url
        })
        .eq('id', book.id);
      
      // STEP 3: Tag the book with full metadata
      console.log('   🏷️  Assigning topic...');
      const result = assignPrimaryTopic({
        isbn: book.isbn,
        title: metadata.title || book.title,
        subtitle: metadata.subtitle,
        description: metadata.description,
        subjects: metadata.subjects
      });
      
      const reviewCheck = shouldRequireReview(result);
      
      // STEP 4: Save the tag
      await supabase
        .from('book_titles')
        .update({
          primary_topic: result.primaryTopic,
          topic_confidence: result.confidence,
          needs_topic_review: reviewCheck.needsReview,
          topic_review_reasons: reviewCheck.reasons || [],
          topic_assigned_at: new Date().toISOString()
        })
        .eq('id', book.id);
      
      if (reviewCheck.needsReview) {
        needsReview++;
        console.log(`   ⚠️  ${result.primaryTopic} (${result.confidence}%) - NEEDS REVIEW`);
      } else {
        autoApproved++;
        console.log(`   ✅ ${result.primaryTopic} (${result.confidence}%) - AUTO-APPROVED`);
      }
      
      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
      
    } catch (error) {
      console.error(`   ❌ Error processing book:`, error.message);
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total processed:        ${books.length}`);
  console.log(`✅ Metadata fetched:    ${metadataFetched}`);
  console.log(`❌ Metadata failed:     ${metadataFailed}`);
  console.log(`✅ Auto-approved tags:  ${autoApproved}`);
  console.log(`⚠️  Needs review:       ${needsReview}`);
  if (books.length > 0) {
    console.log(`Success rate:           ${Math.round(autoApproved/books.length*100)}%`);
  }
  console.log('='.repeat(60));
}

fetchAndTagAllBooks()
  .catch(console.error)
  .finally(() => process.exit());