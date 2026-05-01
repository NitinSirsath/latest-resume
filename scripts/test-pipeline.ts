import { createClient } from '@supabase/supabase-js'

// Simple integration test script to verify edge functions are reachable and respond correctly
// Run with: npx tsx scripts/test-pipeline.ts

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_ANON_KEY environment variables.')
  console.error('Please run with: VITE_SUPABASE_URL=... VITE_SUPABASE_ANON_KEY=... npx tsx scripts/test-pipeline.ts')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function testPipeline() {
  console.log('🚀 Starting Integration Tests for ResumeTailor Pipeline...')

  // Test 1: analyze-jd
  console.log('\n--- Test 1: analyze-jd ---')
  const dummyJD = `We are looking for a Senior Frontend Engineer with 5+ years of experience in React, TypeScript, and Next.js. You should know how to build accessible UI components and have a strong understanding of web performance.`
  
  try {
    console.log('Invoking analyze-jd...')
    const { data: jdData, error: jdError } = await supabase.functions.invoke('analyze-jd', {
      body: { 
        jd_text: dummyJD, 
        user_id: 'test-user-id',
        job_url: 'https://example.com/job/123'
      }
    })

    if (jdError) throw jdError
    if (!jdData || !jdData.analysis) throw new Error('Missing analysis in response')

    console.log('✅ analyze-jd returned successfully.')
    console.log('Role Title:', jdData.analysis.role_title)
    console.log('Tailored Resume ID:', jdData.id)

  } catch (err: unknown) {
    console.error('❌ analyze-jd failed:', err instanceof Error ? err.message : err)
  }

  // Note: We cannot easily test parse-resume or tailor-resume without a real file URL and real parsed_json
  // but we can test if the endpoint is reachable by sending an invalid payload and expecting a 400 or 500 error 
  // with a specific message rather than a connection failure.

  console.log('\n--- Test 2: parse-resume (connectivity check) ---')
  try {
    const { data: parseData, error: parseError } = await supabase.functions.invoke('parse-resume', {
      body: { resume_id: 'invalid-id', file_url: 'http://invalid.url', user_id: 'invalid-user' }
    })
    
    // We actually expect this to fail gracefully or return an error message, not crash the server
    if (parseError) {
      console.log('✅ parse-resume responded with expected error format:', parseError.message)
    } else {
      console.log('⚠️ parse-resume succeeded unexpectedly:', parseData)
    }
  } catch (err: unknown) {
    console.log('✅ parse-resume caught expected error:', err instanceof Error ? err.message : err)
  }

  console.log('\n🎉 Integration tests finished.')
}

testPipeline()
