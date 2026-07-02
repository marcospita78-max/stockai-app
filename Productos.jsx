import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://ubweexzjhumjbefjlheg.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVid2VleHpqaHVtamJlZmpsaGVnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI3NjM4NjksImV4cCI6MjA5ODMzOTg2OX0.pj8p1SFPYrCEEtMe2AEtdHGatUMiaxHLOp2WatXPDr8'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
