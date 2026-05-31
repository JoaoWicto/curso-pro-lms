
require('dotenv').config();
const bcrypt = require('bcryptjs');
const { query, one } = require('./db');

async function setDefault(key, value) {
  const row = await one('SELECT value FROM settings WHERE key=$1', [key]);
  if (!row) await query('INSERT INTO settings (key,value) VALUES ($1,$2)', [key, value]);
}

async function init() {
  await query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      phone TEXT DEFAULT '',
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'student',
      status TEXT NOT NULL DEFAULT 'active',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS courses (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      price NUMERIC(10,2) NOT NULL DEFAULT 0,
      workload TEXT DEFAULT '',
      teacher TEXT DEFAULT '',
      cover_url TEXT DEFAULT '',
      active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS lessons (
      id SERIAL PRIMARY KEY,
      course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      module TEXT DEFAULT '',
      summary TEXT DEFAULT '',
      content TEXT DEFAULT '',
      video_url TEXT DEFAULT '',
      video_file TEXT DEFAULT '',
      pdf_file TEXT DEFAULT '',
      active BOOLEAN NOT NULL DEFAULT TRUE,
      position INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS enrollments (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
      access_status TEXT NOT NULL DEFAULT 'blocked',
      progress INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(user_id, course_id)
    );

    CREATE TABLE IF NOT EXISTS payments (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
      amount NUMERIC(10,2) NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'pending',
      pix_key TEXT DEFAULT '',
      pix_qr_file TEXT DEFAULT '',
      receipt_file TEXT DEFAULT '',
      notes TEXT DEFAULT '',
      approved_by INTEGER,
      approved_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS quiz_questions (
      id SERIAL PRIMARY KEY,
      lesson_id INTEGER NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
      question TEXT NOT NULL,
      option_a TEXT NOT NULL,
      option_b TEXT NOT NULL,
      option_c TEXT DEFAULT '',
      option_d TEXT DEFAULT '',
      correct_option INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS quiz_results (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      lesson_id INTEGER NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
      score INTEGER NOT NULL,
      correct_count INTEGER NOT NULL,
      total_count INTEGER NOT NULL,
      answers_json TEXT NOT NULL DEFAULT '{}',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS lesson_progress (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      lesson_id INTEGER NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
      completed BOOLEAN NOT NULL DEFAULT FALSE,
      completed_at TIMESTAMPTZ,
      UNIQUE(user_id, lesson_id)
    );

    CREATE TABLE IF NOT EXISTS certificates (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
      code TEXT NOT NULL UNIQUE,
      issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(user_id, course_id)
    );


    CREATE TABLE IF NOT EXISTS assessments (
      id SERIAL PRIMARY KEY,
      course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      type TEXT NOT NULL DEFAULT 'activity',
      max_attempts INTEGER NOT NULL DEFAULT 2,
      active BOOLEAN NOT NULL DEFAULT TRUE,
      released BOOLEAN NOT NULL DEFAULT TRUE,
      position INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS assessment_questions (
      id SERIAL PRIMARY KEY,
      assessment_id INTEGER NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
      question TEXT NOT NULL,
      option_a TEXT NOT NULL,
      option_b TEXT NOT NULL,
      option_c TEXT DEFAULT '',
      option_d TEXT DEFAULT '',
      correct_option INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS assessment_attempts (
      id SERIAL PRIMARY KEY,
      assessment_id INTEGER NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      score INTEGER NOT NULL,
      correct_count INTEGER NOT NULL,
      total_count INTEGER NOT NULL,
      answers_json TEXT NOT NULL DEFAULT '{}',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS logs (
      id SERIAL PRIMARY KEY,
      user_id INTEGER,
      action TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  const adminEmail = process.env.ADMIN_EMAIL || 'admin@curso.local';
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
  const admin = await one('SELECT id FROM users WHERE email=$1', [adminEmail]);
  if (!admin) {
    await query(
      'INSERT INTO users (name,email,password_hash,role) VALUES ($1,$2,$3,$4)',
      ['Administrador', adminEmail, bcrypt.hashSync(adminPassword, 10), 'admin']
    );
  }

  await setDefault('brand_name', 'CursoPro LMS');
  await setDefault('pix_key', 'sua-chave-pix-aqui');
  await setDefault('pix_qr_file', '');
  await setDefault('min_certificate_score', '70');

  const count = await one('SELECT COUNT(*)::int AS total FROM courses');
  if (!count.total) {
    const course = await query(
      'INSERT INTO courses (title,description,price,workload,teacher,active) VALUES ($1,$2,$3,$4,$5,TRUE) RETURNING id',
      ['Curso Profissional Completo', 'Curso completo com aulas, PDFs, vídeos, quiz, Pix manual e certificado.', 197, '40h', 'Professor Responsável']
    );
    const lesson = await query(
      'INSERT INTO lessons (course_id,title,module,summary,content,active,position) VALUES ($1,$2,$3,$4,$5,TRUE,1) RETURNING id',
      [course.rows[0].id, 'Boas-vindas e introdução', 'Módulo 1', 'Primeira aula do curso.', 'Conteúdo introdutório da aula.']
    );
    await query(
      'INSERT INTO quiz_questions (lesson_id,question,option_a,option_b,option_c,option_d,correct_option) VALUES ($1,$2,$3,$4,$5,$6,$7)',
      [lesson.rows[0].id, 'Qual é o objetivo da primeira aula?', 'Finalizar o curso', 'Entender como o curso funciona', 'Emitir certificado', 'Ignorar conteúdo', 1]
    );

    const assessment = await query(
      'INSERT INTO assessments (course_id,title,description,type,max_attempts,active,released,position) VALUES ($1,$2,$3,$4,$5,TRUE,TRUE,1) RETURNING id',
      [course.rows[0].id, 'Atividade de Fixação 1', 'Atividade inicial com duas tentativas.', 'activity', 2]
    );
    await query(
      'INSERT INTO assessment_questions (assessment_id,question,option_a,option_b,option_c,option_d,correct_option) VALUES ($1,$2,$3,$4,$5,$6,$7)',
      [assessment.rows[0].id, 'Quantas tentativas a atividade possui?', 'Uma', 'Duas', 'Três', 'Ilimitadas', 1]
    );
    const exam = await query(
      'INSERT INTO assessments (course_id,title,description,type,max_attempts,active,released,position) VALUES ($1,$2,$3,$4,$5,TRUE,FALSE,2) RETURNING id',
      [course.rows[0].id, 'Prova Final', 'Prova normal liberada pelo administrador. Apenas uma tentativa.', 'exam', 1]
    );
    await query(
      'INSERT INTO assessment_questions (assessment_id,question,option_a,option_b,option_c,option_d,correct_option) VALUES ($1,$2,$3,$4,$5,$6,$7)',
      [exam.rows[0].id, 'A prova normal pode ser refeita?', 'Sim, várias vezes', 'Sim, duas vezes', 'Não, apenas uma tentativa', 'Somente no domingo', 2]
    );

  }

  console.log('Banco inicializado com sucesso.');
  process.exit(0);
}

init().catch(err => {
  console.error(err);
  process.exit(1);
});
