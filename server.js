const app = require('./src/app');
const { isSupabaseConfigured } = require('./src/config/supabase');

const PORT = Number(process.env.PORT) || 3000;

app.listen(PORT, () => {
  console.log(`\n🍽️  SIGR - Sistema Integral de Gestión de Restaurantes`);
  console.log(`🚀 Servidor escuchando en: http://localhost:${PORT}`);
  console.log(
    isSupabaseConfigured
      ? '✅ Base de datos: Supabase conectado'
      : '⚠️  Base de datos: Modo Demo Local (configura .env para conectar Supabase)'
  );
});
