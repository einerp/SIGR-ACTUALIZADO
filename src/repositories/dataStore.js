const { isSupabaseConfigured } = require('../config/supabase');
const supabaseAdapter = require('./supabaseAdapter');
const demoAdapter = require('./demoAdapter');

const dataStore = isSupabaseConfigured ? supabaseAdapter : demoAdapter;

module.exports = {
  dataStore,
  isSupabaseConfigured
};
