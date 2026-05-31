
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const { nanoid } = require('nanoid');
const cloudinary = require('cloudinary').v2;
const { query, one, many } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_me';

const useCloudinary = Boolean(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET);

if (useCloudinary) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  });
}

app.use(cors());
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));
app.use(express.static(path.join(__dirname, '..', 'public')));

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 500 * 1024 * 1024 }
});

async function uploadFile(file, folder = 'curso-pro') {
  if (!file) return '';
  if (useCloudinary) {
    const resource_type = file.mimetype.startsWith('video/') ? 'video' : file.mimetype === 'application/pdf' ? 'raw' : 'image';
    return await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder, resource_type, public_id: `${Date.now()}-${nanoid(8)}-${file.originalname.replace(/[^\w.-]/g, '_')}` },
        (error, result) => error ? reject(error) : resolve(result.secure_url)
      );
      stream.end(file.buffer);
    });
  }
  const fs = require('fs');
  const safe = `${Date.now()}-${nanoid(8)}-${file.originalname.replace(/[^\w.-]/g, '_')}`;
  const dest = path.join(__dirname, '..', 'uploads', safe);
  fs.writeFileSync(dest, file.buffer);
  return `/uploads/${safe}`;
}

function sign(user) {
  return jwt.sign({ id: user.id, role: user.role, name: user.name, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
}
function auth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Token ausente' });
  try { req.user = jwt.verify(token, JWT_SECRET); next(); }
  catch { res.status(401).json({ error: 'Token inválido' }); }
}
function admin(req, res, next) {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Acesso negado' });
  next();
}
function publicUser(user) {
  return { id: user.id, name: user.name, email: user.email, phone: user.phone, role: user.role, status: user.status };
}
async function getSetting(key) {
  const row = await one('SELECT value FROM settings WHERE key=$1', [key]);
  return row?.value || '';
}
async function setSetting(key, value) {
  await query('INSERT INTO settings (key,value) VALUES ($1,$2) ON CONFLICT(key) DO UPDATE SET value=EXCLUDED.value', [key, String(value ?? '')]);
}
async function log(userId, action) {
  await query('INSERT INTO logs (user_id, action) VALUES ($1,$2)', [userId || null, action]);
}
async function updateProgress(userId, courseId) {
  const total = (await one('SELECT COUNT(*)::int total FROM lessons WHERE course_id=$1 AND active=TRUE', [courseId]))?.total || 1;
  const completed = (await one(`
    SELECT COUNT(*)::int total
    FROM lesson_progress lp JOIN lessons l ON l.id=lp.lesson_id
    WHERE lp.user_id=$1 AND l.course_id=$2 AND lp.completed=TRUE
  `, [userId, courseId]))?.total || 0;
  const progress = Math.round((completed / total) * 100);
  await query('UPDATE enrollments SET progress=$1 WHERE user_id=$2 AND course_id=$3', [progress, userId, courseId]);
}
async function averageQuiz(userId, courseId) {
  const rows = await many(`
    SELECT qr.score FROM quiz_results qr
    JOIN lessons l ON l.id=qr.lesson_id
    WHERE qr.user_id=$1 AND l.course_id=$2
  `, [userId, courseId]);
  if (!rows.length) return 0;
  return Math.round(rows.reduce((a, b) => a + Number(b.score), 0) / rows.length);
}

app.get('/api/health', (req, res) => res.json({ ok: true }));

app.get('/api/public', async (req, res) => {
  const settings = {
    brand_name: await getSetting('brand_name'),
    pix_key: await getSetting('pix_key'),
    pix_qr_file: await getSetting('pix_qr_file')
  };
  const courses = await many('SELECT * FROM courses WHERE active=TRUE ORDER BY id DESC');
  res.json({ settings, courses });
});

app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, phone, password, course_id } = req.body;
    if (!name || !email || !password || !course_id) return res.status(400).json({ error: 'Dados obrigatórios ausentes' });
    const course = await one('SELECT * FROM courses WHERE id=$1 AND active=TRUE', [course_id]);
    if (!course) return res.status(404).json({ error: 'Curso não encontrado' });
    const userResult = await query(
      'INSERT INTO users (name,email,phone,password_hash,role) VALUES ($1,$2,$3,$4,$5) RETURNING *',
      [name, email, phone || '', bcrypt.hashSync(password, 10), 'student']
    );
    const user = userResult.rows[0];
    await query('INSERT INTO enrollments (user_id,course_id,access_status) VALUES ($1,$2,$3)', [user.id, course_id, 'blocked']);
    await query('INSERT INTO payments (user_id,course_id,amount,status,pix_key,pix_qr_file) VALUES ($1,$2,$3,$4,$5,$6)', [user.id, course_id, course.price, 'pending', await getSetting('pix_key'), await getSetting('pix_qr_file')]);
    await log(user.id, `Cadastro criado para o curso ${course.title}`);
    res.json({ token: sign(user), user: publicUser(user) });
  } catch (e) {
    res.status(400).json({ error: 'E-mail já cadastrado ou dados inválidos' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await one('SELECT * FROM users WHERE email=$1', [email]);
  if (!user || !bcrypt.compareSync(password || '', user.password_hash)) return res.status(401).json({ error: 'Login ou senha incorretos' });
  res.json({ token: sign(user), user: publicUser(user) });
});

app.get('/api/me', auth, async (req, res) => {
  const user = await one('SELECT * FROM users WHERE id=$1', [req.user.id]);
  res.json({ user: publicUser(user) });
});

app.get('/api/student/dashboard', auth, async (req, res) => {
  const enrollments = await many(`
    SELECT e.*, c.title, c.description, c.workload, c.teacher, c.price
    FROM enrollments e JOIN courses c ON c.id=e.course_id WHERE e.user_id=$1
  `, [req.user.id]);
  const payments = await many('SELECT * FROM payments WHERE user_id=$1 ORDER BY id DESC', [req.user.id]);
  res.json({ enrollments, payments });
});

app.get('/api/student/course/:id', auth, async (req, res) => {
  const courseId = Number(req.params.id);
  const enrollment = await one('SELECT * FROM enrollments WHERE user_id=$1 AND course_id=$2', [req.user.id, courseId]);
  if (!enrollment) return res.status(404).json({ error: 'Matrícula não encontrada' });
  const course = await one('SELECT * FROM courses WHERE id=$1', [courseId]);
  const lessons = enrollment.access_status === 'active' ? await many('SELECT * FROM lessons WHERE course_id=$1 AND active=TRUE ORDER BY position,id', [courseId]) : [];
  const progress = await many('SELECT * FROM lesson_progress WHERE user_id=$1', [req.user.id]);
  const results = await many('SELECT * FROM quiz_results WHERE user_id=$1', [req.user.id]);
  res.json({ course, enrollment, lessons, progress, results });
});

app.post('/api/student/lesson/:id/complete', auth, async (req, res) => {
  const lessonId = Number(req.params.id);
  const lesson = await one('SELECT * FROM lessons WHERE id=$1', [lessonId]);
  if (!lesson) return res.status(404).json({ error: 'Aula não encontrada' });
  const enrollment = await one('SELECT * FROM enrollments WHERE user_id=$1 AND course_id=$2 AND access_status=$3', [req.user.id, lesson.course_id, 'active']);
  if (!enrollment) return res.status(403).json({ error: 'Acesso bloqueado' });
  await query(`
    INSERT INTO lesson_progress (user_id,lesson_id,completed,completed_at)
    VALUES ($1,$2,TRUE,NOW())
    ON CONFLICT(user_id,lesson_id) DO UPDATE SET completed=TRUE, completed_at=NOW()
  `, [req.user.id, lessonId]);
  await updateProgress(req.user.id, lesson.course_id);
  res.json({ ok: true });
});

app.get('/api/student/lesson/:id/quiz', auth, async (req, res) => {
  const lessonId = Number(req.params.id);
  const lesson = await one('SELECT * FROM lessons WHERE id=$1', [lessonId]);
  if (!lesson) return res.status(404).json({ error: 'Aula não encontrada' });
  const enrollment = await one('SELECT * FROM enrollments WHERE user_id=$1 AND course_id=$2 AND access_status=$3', [req.user.id, lesson.course_id, 'active']);
  if (!enrollment) return res.status(403).json({ error: 'Acesso bloqueado' });
  const questions = await many('SELECT id,question,option_a,option_b,option_c,option_d FROM quiz_questions WHERE lesson_id=$1 ORDER BY id', [lessonId]);
  res.json({ lesson, questions });
});

app.post('/api/student/lesson/:id/quiz', auth, async (req, res) => {
  const lessonId = Number(req.params.id);
  const answers = req.body.answers || {};
  const lesson = await one('SELECT * FROM lessons WHERE id=$1', [lessonId]);
  if (!lesson) return res.status(404).json({ error: 'Aula não encontrada' });
  const enrollment = await one('SELECT * FROM enrollments WHERE user_id=$1 AND course_id=$2 AND access_status=$3', [req.user.id, lesson.course_id, 'active']);
  if (!enrollment) return res.status(403).json({ error: 'Acesso bloqueado' });
  const questions = await many('SELECT * FROM quiz_questions WHERE lesson_id=$1 ORDER BY id', [lessonId]);
  let correct = 0;
  for (const q of questions) if (Number(answers[q.id]) === Number(q.correct_option)) correct++;
  const total = questions.length || 1;
  const score = Math.round((correct / total) * 100);
  await query('INSERT INTO quiz_results (user_id,lesson_id,score,correct_count,total_count,answers_json) VALUES ($1,$2,$3,$4,$5,$6)', [req.user.id, lessonId, score, correct, questions.length, JSON.stringify(answers)]);
  await updateProgress(req.user.id, lesson.course_id);
  res.json({ score, correct, total: questions.length });
});

app.post('/api/student/payment/:id/receipt', auth, upload.single('receipt'), async (req, res) => {
  const paymentId = Number(req.params.id);
  const payment = await one('SELECT * FROM payments WHERE id=$1 AND user_id=$2', [paymentId, req.user.id]);
  if (!payment) return res.status(404).json({ error: 'Pagamento não encontrado' });
  const receipt = await uploadFile(req.file, 'curso-pro/receipts');
  await query('UPDATE payments SET receipt_file=$1,status=$2 WHERE id=$3', [receipt, 'pending', paymentId]);
  await log(req.user.id, 'Comprovante enviado');
  res.json({ ok: true, receipt_file: receipt });
});

app.post('/api/student/course/:id/certificate', auth, async (req, res) => {
  const courseId = Number(req.params.id);
  const enrollment = await one('SELECT * FROM enrollments WHERE user_id=$1 AND course_id=$2 AND access_status=$3', [req.user.id, courseId, 'active']);
  if (!enrollment) return res.status(403).json({ error: 'Acesso bloqueado' });
  const min = Number(await getSetting('min_certificate_score') || 70);
  const avg = await averageQuiz(req.user.id, courseId);
  if (avg < min) return res.status(400).json({ error: `Média mínima não atingida. Média atual: ${avg}%` });
  let cert = await one('SELECT * FROM certificates WHERE user_id=$1 AND course_id=$2', [req.user.id, courseId]);
  if (!cert) {
    const code = `CERT-${nanoid(10).toUpperCase()}`;
    cert = (await query('INSERT INTO certificates (user_id,course_id,code) VALUES ($1,$2,$3) RETURNING *', [req.user.id, courseId, code])).rows[0];
  }
  res.json({ certificate: cert });
});

app.get('/api/certificate/:code', async (req, res) => {
  const cert = await one(`
    SELECT cert.*, u.name student_name, c.title course_title, c.workload, c.teacher
    FROM certificates cert JOIN users u ON u.id=cert.user_id JOIN courses c ON c.id=cert.course_id
    WHERE cert.code=$1
  `, [req.params.code]);
  if (!cert) return res.status(404).json({ error: 'Certificado não encontrado' });
  res.json({ certificate: cert });
});

/* ADMIN */
app.get('/api/admin/dashboard', auth, admin, async (req, res) => {
  const users = (await one('SELECT COUNT(*)::int total FROM users WHERE role=$1', ['student'])).total;
  const courses = (await one('SELECT COUNT(*)::int total FROM courses')).total;
  const pending = (await one('SELECT COUNT(*)::int total FROM payments WHERE status=$1', ['pending'])).total;
  const paid = (await one('SELECT COALESCE(SUM(amount),0) total FROM payments WHERE status=$1', ['paid'])).total;
  const logs = await many('SELECT * FROM logs ORDER BY id DESC LIMIT 20');
  res.json({ users, courses, pending, paid, logs });
});

app.get('/api/admin/settings', auth, admin, async (req, res) => {
  const rows = await many('SELECT * FROM settings');
  res.json(Object.fromEntries(rows.map(r => [r.key, r.value])));
});

app.put('/api/admin/settings', auth, admin, upload.single('pix_qr'), async (req, res) => {
  const { brand_name, pix_key, min_certificate_score } = req.body;
  if (brand_name !== undefined) await setSetting('brand_name', brand_name);
  if (pix_key !== undefined) await setSetting('pix_key', pix_key);
  if (min_certificate_score !== undefined) await setSetting('min_certificate_score', min_certificate_score);
  if (req.file) await setSetting('pix_qr_file', await uploadFile(req.file, 'curso-pro/pix'));
  await log(req.user.id, 'Configurações atualizadas');
  res.json({ ok: true });
});

app.get('/api/admin/courses', auth, admin, async (req, res) => {
  res.json({ courses: await many('SELECT * FROM courses ORDER BY id DESC') });
});
app.post('/api/admin/courses', auth, admin, upload.single('cover'), async (req, res) => {
  const { title, description, price, workload, teacher, active } = req.body;
  const cover = await uploadFile(req.file, 'curso-pro/covers');
  const result = await query('INSERT INTO courses (title,description,price,workload,teacher,cover_url,active) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id', [title, description || '', Number(price || 0), workload || '', teacher || '', cover, active === '0' ? false : true]);
  await log(req.user.id, `Curso criado: ${title}`);
  res.json({ id: result.rows[0].id });
});
app.delete('/api/admin/courses/:id', auth, admin, async (req, res) => {
  await query('DELETE FROM courses WHERE id=$1', [Number(req.params.id)]);
  res.json({ ok: true });
});

app.get('/api/admin/courses/:id/lessons', auth, admin, async (req, res) => {
  res.json({ lessons: await many('SELECT * FROM lessons WHERE course_id=$1 ORDER BY position,id', [Number(req.params.id)]) });
});
app.post('/api/admin/lessons', auth, admin, upload.fields([{ name: 'video', maxCount: 1 }, { name: 'pdf', maxCount: 1 }]), async (req, res) => {
  const { course_id, title, module, summary, content, video_url, active, position } = req.body;
  const video = await uploadFile(req.files?.video?.[0], 'curso-pro/videos');
  const pdf = await uploadFile(req.files?.pdf?.[0], 'curso-pro/pdfs');
  const result = await query('INSERT INTO lessons (course_id,title,module,summary,content,video_url,video_file,pdf_file,active,position) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id', [course_id, title, module || '', summary || '', content || '', video_url || '', video, pdf, active === '0' ? false : true, Number(position || 0)]);
  await log(req.user.id, `Aula criada: ${title}`);
  res.json({ id: result.rows[0].id });
});
app.delete('/api/admin/lessons/:id', auth, admin, async (req, res) => {
  await query('DELETE FROM lessons WHERE id=$1', [Number(req.params.id)]);
  res.json({ ok: true });
});

app.get('/api/admin/students', auth, admin, async (req, res) => {
  const students = await many(`
    SELECT u.id,u.name,u.email,u.phone,u.status,u.created_at,COUNT(e.id)::int enrollments
    FROM users u LEFT JOIN enrollments e ON e.user_id=u.id
    WHERE u.role='student'
    GROUP BY u.id ORDER BY u.id DESC
  `);
  res.json({ students });
});

app.get('/api/admin/payments', auth, admin, async (req, res) => {
  const payments = await many(`
    SELECT p.*, u.name student_name, u.email, c.title course_title
    FROM payments p JOIN users u ON u.id=p.user_id JOIN courses c ON c.id=p.course_id
    ORDER BY p.id DESC
  `);
  res.json({ payments });
});
app.post('/api/admin/payments/:id/approve', auth, admin, async (req, res) => {
  const id = Number(req.params.id);
  const p = await one('SELECT * FROM payments WHERE id=$1', [id]);
  if (!p) return res.status(404).json({ error: 'Pagamento não encontrado' });
  await query('UPDATE payments SET status=$1,approved_by=$2,approved_at=NOW() WHERE id=$3', ['paid', req.user.id, id]);
  await query(`
    INSERT INTO enrollments (user_id,course_id,access_status) VALUES ($1,$2,$3)
    ON CONFLICT(user_id,course_id) DO UPDATE SET access_status='active'
  `, [p.user_id, p.course_id, 'active']);
  await log(req.user.id, `Pagamento aprovado #${id}`);
  res.json({ ok: true });
});
app.post('/api/admin/payments/:id/reject', auth, admin, async (req, res) => {
  const id = Number(req.params.id);
  const p = await one('SELECT * FROM payments WHERE id=$1', [id]);
  await query('UPDATE payments SET status=$1 WHERE id=$2', ['rejected', id]);
  if (p) await query('UPDATE enrollments SET access_status=$1 WHERE user_id=$2 AND course_id=$3', ['blocked', p.user_id, p.course_id]);
  await log(req.user.id, `Pagamento recusado #${id}`);
  res.json({ ok: true });
});

app.get('/api/admin/lessons/:id/questions', auth, admin, async (req, res) => {
  res.json({ questions: await many('SELECT * FROM quiz_questions WHERE lesson_id=$1 ORDER BY id', [Number(req.params.id)]) });
});
app.post('/api/admin/questions', auth, admin, async (req, res) => {
  const { lesson_id, question, option_a, option_b, option_c, option_d, correct_option } = req.body;
  const result = await query('INSERT INTO quiz_questions (lesson_id,question,option_a,option_b,option_c,option_d,correct_option) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id', [lesson_id, question, option_a, option_b, option_c || '', option_d || '', Number(correct_option || 0)]);
  res.json({ id: result.rows[0].id });
});
app.delete('/api/admin/questions/:id', auth, admin, async (req, res) => {
  await query('DELETE FROM quiz_questions WHERE id=$1', [Number(req.params.id)]);
  res.json({ ok: true });
});

app.get('/api/admin/reports', auth, admin, async (req, res) => {
  const finance = await many(`
    SELECT p.id,u.name student,c.title course,p.amount,p.status,p.created_at,p.approved_at
    FROM payments p JOIN users u ON u.id=p.user_id JOIN courses c ON c.id=p.course_id
    ORDER BY p.id DESC
  `);
  const performance = await many(`
    SELECT u.name student,l.title lesson,qr.score,qr.correct_count,qr.total_count,qr.created_at
    FROM quiz_results qr JOIN users u ON u.id=qr.user_id JOIN lessons l ON l.id=qr.lesson_id
    ORDER BY qr.id DESC
  `);
  res.json({ finance, performance });
});

app.get('*', (req, res) => res.sendFile(path.join(__dirname, '..', 'public', 'index.html')));
app.listen(PORT, () => console.log(`CursoPro LMS rodando na porta ${PORT}`));
