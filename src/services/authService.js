const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const authStore = require('../repositories/authStore');

const COOKIE_NAME = 'sigr_session';
const SESSION_DURATION = '8h';

function httpError(message, statusCode) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

function sessionSecret() {
  const configured = (process.env.SESSION_SECRET || '').trim();
  if (configured.length >= 32) return configured;
  if (process.env.NODE_ENV === 'production') {
    throw httpError('SESSION_SECRET debe tener al menos 32 caracteres en producción.', 503);
  }
  return 'sigr-demo-local-secret-no-usar-en-produccion';
}

function cookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 8 * 60 * 60 * 1000
  };
}

function createSession(user, res) {
  const token = jwt.sign(
    { sub: String(user.id), sv: authStore.sessionVersion(user) },
    sessionSecret(),
    { expiresIn: SESSION_DURATION, issuer: 'sigr-api', audience: 'sigr-web' }
  );
  res.cookie(COOKIE_NAME, token, cookieOptions());
}

function clearSession(res) {
  res.clearCookie(COOKIE_NAME, { ...cookieOptions(), maxAge: undefined });
}

async function login({ usuario, password }, res) {
  if (!usuario || !password) throw httpError('Ingresa usuario y contraseña.', 400);
  await authStore.ensureInitialUser();
  const user = await authStore.findByUsername(usuario);
  const valid = user && user.activo && (await bcrypt.compare(String(password), user.password_hash));
  if (!valid) throw httpError('Usuario o contraseña incorrectos.', 401);
  createSession(user, res);
  return authStore.publicUser(user);
}

async function authenticate(token) {
  if (!token) throw httpError('Debes iniciar sesión.', 401);
  let payload;
  try {
    payload = jwt.verify(token, sessionSecret(), { issuer: 'sigr-api', audience: 'sigr-web' });
  } catch {
    throw httpError('La sesión venció. Inicia sesión nuevamente.', 401);
  }

  const user = await authStore.findById(payload.sub);
  if (!user || !user.activo || authStore.sessionVersion(user) !== payload.sv) {
    throw httpError('La sesión ya no es válida. Inicia sesión nuevamente.', 401);
  }
  return user;
}

async function requireAuth(req, res, next) {
  try {
    req.user = await authenticate(req.cookies[COOKIE_NAME]);
    next();
  } catch (err) {
    next(err);
  }
}

async function changeCredentials(userId, payload, res) {
  const current = await authStore.findById(userId);
  if (!current || !(await bcrypt.compare(String(payload.password_actual || ''), current.password_hash))) {
    throw httpError('La contraseña actual es incorrecta.', 400);
  }

  const usuario = String(payload.nuevo_usuario || current.usuario).trim();
  const password = String(payload.nueva_password || '');
  const confirmacion = String(payload.confirmar_password || '');

  if (!/^[a-zA-Z0-9._-]{4,30}$/.test(usuario)) {
    throw httpError('El usuario debe tener entre 4 y 30 caracteres: letras, números, punto, guion o guion bajo.', 400);
  }
  if (password) {
    if (password.length < 10 || password.length > 72) {
      throw httpError('La nueva contraseña debe tener entre 10 y 72 caracteres.', 400);
    }
    if (!/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/\d/.test(password)) {
      throw httpError('La nueva contraseña debe incluir mayúsculas, minúsculas y números.', 400);
    }
    if (password !== confirmacion) throw httpError('La confirmación de contraseña no coincide.', 400);
    if (await bcrypt.compare(password, current.password_hash)) {
      throw httpError('La nueva contraseña debe ser diferente de la actual.', 400);
    }
  }
  if (usuario.toLowerCase() === current.usuario.toLowerCase() && !password) {
    throw httpError('Cambia el usuario o la contraseña antes de guardar.', 400);
  }

  if (usuario.toLowerCase() !== current.usuario.toLowerCase()) {
    const duplicate = await authStore.findByUsername(usuario);
    if (duplicate && String(duplicate.id) !== String(current.id)) {
      throw httpError('Ese nombre de usuario ya está en uso.', 409);
    }
  }

  const fields = {
    usuario,
    debe_cambiar_password: false
  };
  if (password) fields.password_hash = await bcrypt.hash(password, 12);

  const updated = await authStore.updateUser(current.id, fields);
  createSession(updated, res);
  return authStore.publicUser(updated);
}

module.exports = {
  changeCredentials,
  clearSession,
  login,
  requireAuth
};
