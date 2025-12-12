import { supabase } from '../../lib/supabase';

export default async function handler(req, res) {
  try {
    const nowIso = new Date().toISOString();

    const { data, error } = await supabase
      .from('lessons')
      .select('*')
      //.gte('start_time', nowIso)
      .order('start_time', { ascending: true });

    if (error) {
      console.error(error);
      return res.status(500).json({ error: 'DB error' });
    }

    return res.status(200).json(data || []);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
}
