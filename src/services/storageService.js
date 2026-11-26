const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const {
  supabase,
  isSupabaseConfigured,
  SUPABASE_STORAGE_BUCKET
} = require('../config/supabase');

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif'
]);

const MIME_TO_EXT = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif'
};

function buildSafeFilename(file) {
  const ext =
    MIME_TO_EXT[file.mimetype] ||
    path.extname(file.originalname || '').toLowerCase() ||
    '.jpg';
  const id = crypto.randomBytes(8).toString('hex');
  return `prod_${Date.now()}_${id}${ext}`;
}

async function uploadProductImage(file) {
  if (!file) return null;

  if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
    throw new Error('Formato de imagen no válido. Usa JPG, PNG, WEBP o GIF.');
  }

  const filename = buildSafeFilename(file);

  if (isSupabaseConfigured && supabase) {
    const storagePath = `productos/${filename}`;
    const { error: uploadError } = await supabase.storage
      .from(SUPABASE_STORAGE_BUCKET)
      .upload(storagePath, file.buffer, {
        contentType: file.mimetype,
        upsert: false
      });

    if (uploadError) {
      throw new Error(
        `Error al subir imagen a Supabase Storage (${SUPABASE_STORAGE_BUCKET}): ${uploadError.message}`
      );
    }

    const { data: publicUrlData } = supabase.storage
      .from(SUPABASE_STORAGE_BUCKET)
      .getPublicUrl(storagePath);

    return {
      imagen_url: publicUrlData.publicUrl,
      imagen_path: storagePath
    };
  }

  // Modo demo local (cuando Supabase no está configurado todavía)
  try {
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    fs.mkdirSync(uploadsDir, { recursive: true });
    const fullPath = path.join(uploadsDir, filename);
    fs.writeFileSync(fullPath, file.buffer);
    return {
      imagen_url: `/uploads/${filename}`,
      imagen_path: `local:${filename}`
    };
  } catch {
    // Fallback para entornos serverless de solo lectura sin Supabase configurado
    const base64 = file.buffer.toString('base64');
    return {
      imagen_url: `data:${file.mimetype};base64,${base64}`,
      imagen_path: ''
    };
  }
}

async function deleteProductImage(imagenPath) {
  if (!imagenPath) return;

  if (isSupabaseConfigured && supabase && !imagenPath.startsWith('local:')) {
    await supabase.storage
      .from(SUPABASE_STORAGE_BUCKET)
      .remove([imagenPath])
      .catch(() => {});
    return;
  }

  if (imagenPath.startsWith('local:')) {
    const filename = imagenPath.replace('local:', '');
    const fullPath = path.join(process.cwd(), 'public', 'uploads', filename);
    if (fs.existsSync(fullPath)) {
      try {
        fs.unlinkSync(fullPath);
      } catch {
        // Ignorar errores de limpieza en disco
      }
    }
  }
}

module.exports = {
  uploadProductImage,
  deleteProductImage,
  ALLOWED_MIME_TYPES
};
