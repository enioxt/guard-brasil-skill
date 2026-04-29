import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL!;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(url, key);

async function run() {
  const { data, error } = await supabase.from('guard_brasil_events').select('*').limit(1);
  if (error) console.error('Error:', error);
  else console.log('Data:', data);
}
run();
