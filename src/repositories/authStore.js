const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const { supabase, isSupabaseConfigured } = require('../config/supabase');

const DEMO_AUTH_FILE = process.env.DEMO_AUTH_FILE || path.join(process.cwd(), 'data', 'demo-auth.json');

function publicUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    usuario: user.usuario,
    nombre: user.nombre || 'Administrador',
    rol: user.rol || 'administrador',
    debe_cambiar_password: Boolean(user.debe_cambiar_password)
  };
}

function sessionVersion(user) {
  const value = user.updated_at || user.created_at;
  return String(new Date(value).getTime());
}

function loadDemoUsers() {
  try {
    if (fs.existsSync(DEMO_AUTH_FILE)) {
      return JSON.parse(fs.readFileSync(DEMO_AUTH_FILE, 'utf8'));
    }
  } catch {
    // Si el archivo local no está disponible se usa memoria durante el proceso.
  }
  return [];
}

function saveDemoUsers(users) {
  fs.mkdirSync(path.dirname(DEMO_AUTH_FILE), { recursive: true });
  fs.writeFileSync(DEMO_AUTH_FILE, JSON.stringify(users, null, 2), 'utf8');
}

async function hasUsers() {
  if (!isSupabaseConfigured) return loadDemoUsers().length > 0;
  const { data, error } = await supabase.from('usuarios').select('id').limit(1);
  if (error) throw error;
  return (data || []).length > 0;
}

async function findByUsername(username) {
  const normalized = String(username || '').trim();
  if (!normalized) return null;

  if (!isSupabaseConfigured) {
    return loadDemoUsers().find((u) => u.usuario.toLowerCase() === normalized.toLowerCase()) || null;
  }

  const { data, error } = await supabase
    .from('usuarios')
    .select('*')
    .ilike('usuario', normalized)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function findById(id) {
  if (!isSupabaseConfigured) {
    return loadDemoUsers().find((u) => String(u.id) === String(id)) || null;
  }

  const { data, error } = await supabase.from('usuarios').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data;
}

async function createUser({ usuario, password, nombre = 'Administrador' }) {
  const now = new Date().toISOString();
  const record = {
    usuario: String(usuario).trim(),
    password_hash: await bcrypt.hash(password, 12),
    nombre,
    rol: 'administrador',
    activo: true,
    debe_cambiar_password: true,
    created_at: now,
    updated_at: now
  };

  if (!isSupabaseConfigured) {
    const users = loadDemoUsers();
    const user = { id: users.length ? Math.max(...users.map((u) => Number(u.id))) + 1 : 1, ...record };
    users.push(user);
    saveDemoUsers(users);
    return user;
  }

  const { data, error } = await supabase.from('usuarios').insert(record).select('*').single();
  if (error) throw error;
  return data;
}

async function updateUser(id, fields) {
  const update = { ...fields, updated_at: new Date().toISOString() };

  if (!isSupabaseConfigured) {
    const users = loadDemoUsers();
    const index = users.findIndex((u) => String(u.id) === String(id));
    if (index === -1) return null;
    users[index] = { ...users[index], ...update };
    saveDemoUsers(users);
    return users[index];
  }

  const { data, error } = await supabase
    .from('usuarios')
    .update(update)
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

async function ensureInitialUser() {
  if (await hasUsers()) return;

  const username = (process.env.ADMIN_USERNAME || 'admin').trim();
  const password = process.env.ADMIN_PASSWORD || (process.env.NODE_ENV === 'production' ? '' : 'Admin123*');
  if (!password) {
    const err = new Error('Configura ADMIN_PASSWORD para crear el primer administrador.');
    err.statusCode = 503;
    throw err;
  }

  try {
    await createUser({ usuario: username, password });
  } catch (err) {
    if (err.code !== '23505') throw err;
  }
}

module.exports = {
  createUser,
  ensureInitialUser,
  findById,
  findByUsername,
  publicUser,
  sessionVersion,
  updateUser
};
