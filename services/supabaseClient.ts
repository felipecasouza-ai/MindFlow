
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://juvobbrekqdcnzeiuycy.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_5sQh67oKvoFD4P_K3xjPuA_iJcUHfCC';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
