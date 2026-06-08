const PASSING_GRADE = 7;
let examTimerInterval = null;
let activeExamDeadline = null;

function cryptoId() {
  return "id_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function createQuestion(courseId, question, a, b, c, d, correct) {
  return { id: cryptoId(), courseId, question, a, b, c, d, correct };
}

function defaultState() {
  const courseId = cryptoId();
  const moduleId = cryptoId();

  return {
    settings: {
      adminPassword: "admin123"
    },
    courses: [
      {
        id: courseId,
        title: "Informática Básica",
        desc: "Curso introdutório com aulas, atividades, quiz e prova.",
        hours: "20 horas",
        teacher: "Professor responsável",
        institution: "Instituição de Ensino",
        passingGrade: 7,
        thumb: ""
      }
    ],
    modules: [
      { id: moduleId, courseId, title: "Módulo 1 - Introdução" }
    ],
    lessons: [
      {
        id: cryptoId(),
        courseId,
        moduleId,
        title: "Aula 1 - Como usar o curso",
        desc: "Conheça a plataforma e entenda como estudar.",
        videoType: "youtube",
        videoUrl: "https://www.youtube.com/watch?v=zT8hDuKkVyI",
        thumb: "",
        pdf: "",
        duration: "10 min",
        status: "published"
      },
      {
        id: cryptoId(),
        courseId,
        moduleId,
        title: "Aula 2 - Conteúdo básico",
        desc: "Aprenda os primeiros conceitos do curso.",
        videoType: "youtube",
        videoUrl: "https://youtu.be/TGpVY6q0emY",
        thumb: "",
        pdf: "",
        duration: "12 min",
        status: "published"
      }
    ],
    activities: [
      {
        id: cryptoId(),
        courseId,
        title: "Atividade 1",
        question: "Explique com suas palavras o que você aprendeu na primeira aula."
      }
    ],
    quiz: [
      createQuestion(courseId, "O que é uma videoaula?", "Uma aula em formato de vídeo", "Um arquivo vazio", "Uma imagem", "Um menu", "a"),
      createQuestion(courseId, "Para que serve uma atividade?", "Para fixar o conteúdo", "Para apagar o curso", "Para bloquear o aluno", "Para remover as aulas", "a")
    ],
    exam: {
      settings: {
        [courseId]: {
          released: false,
          timeMinutes: 20
        }
      },
      normal: [
        createQuestion(courseId, "Qual é o objetivo de um curso online?", "Organizar o aprendizado", "Apagar dados", "Bloquear vídeos", "Impedir o estudo", "a")
      ],
      recovery: [
        createQuestion(courseId, "O que fazer para melhorar a nota?", "Revisar as aulas", "Ignorar o conteúdo", "Fechar o site", "Apagar respostas", "a")
      ]
    },
    students: [],
    progress: {}
  };
}

function getData() {
  const saved = localStorage.getItem("cursoProDataV3");
  let data;
  try {
    data = saved ? JSON.parse(saved) : defaultState();
  } catch (error) {
    localStorage.setItem("cursoProDataV3_corrupted", saved || "");
    data = defaultState();
    toast("Dados locais corrompidos foram reiniciados.");
  }

  data.settings ??= { adminPassword: "admin123" };
  data.settings.adminPassword ??= "admin123";
  data.courses ??= [];
  data.modules ??= [];
  data.lessons ??= [];
  data.activities ??= [];
  data.quiz ??= [];
  data.exam ??= { settings: {}, normal: [], recovery: [] };
  data.exam.settings ??= {};
  data.exam.normal ??= [];
  data.exam.recovery ??= [];
  data.students ??= [];
  data.students.forEach(s => { s.password ??= "123456"; s.active ??= true; });
  data.progress ??= {};
  data.payments ??= {};
  data.notices ??= [];
  data.notifications ??= {};

  if (!data.courses.length) data = defaultState();

  data.lessons.forEach(l => {
    l.status ??= "published";
  });

  data.courses.forEach(course => {
    course.teacher ??= "";
    course.institution ??= "";
    course.passingGrade ??= 7;
    course.price ??= "Grátis";
    course.pix ??= "";
    course.logo ??= "";
    course.teacher ??= "";
    course.institution ??= "";
    course.passingGrade ??= 7;
    data.exam.settings[course.id] ??= { released: false, timeMinutes: 20 };
    if (!data.modules.some(m => m.courseId === course.id)) {
      data.modules.push({ id: cryptoId(), courseId: course.id, title: "Módulo 1 - Introdução" });
    }
  });

  saveData(data);
  return data;
}

function saveData(data) {
  localStorage.setItem("cursoProDataV3", JSON.stringify(data));
  if (typeof scheduleRemoteSave === "function") {
    scheduleRemoteSave(data);
  }
}

function toast(msg) {
  const box = document.getElementById("toast");
  box.textContent = msg;
  box.classList.add("show");
  setTimeout(() => box.classList.remove("show"), 2500);
}

function showPage(id) {
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  document.getElementById(id).classList.add("active");

  const logged = localStorage.getItem("currentStudentV3") || localStorage.getItem("adminLoggedV3") === "true";
  document.getElementById("logoutBtn").classList.toggle("hidden", !logged);
}

function goHome() {
  if (localStorage.getItem("adminLoggedV3") === "true") showPage("adminApp");
  else if (localStorage.getItem("currentStudentV3")) showPage("studentApp");
  else showPage("landingPage");
}

function openHelp() {
  document.getElementById("helpModal").classList.remove("hidden");
}

function closeHelp() {
  document.getElementById("helpModal").classList.add("hidden");
}

function escapeHtml(text) {
  return String(text ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function currentEmail() {
  return localStorage.getItem("currentStudentV3");
}

function getSelectedCourseId(data) {
  const email = currentEmail();
  const student = data.students.find(s => s.email === email);
  return student?.selectedCourseId || data.courses[0]?.id;
}

function createEmptyCourseProgress() {
  return {
    completedLessons: [],
    activities: {},
    quizAttempts: [],
    examNormal: null,
    examRecovery: null,
    examDeadline: null,
    lessonNotes: {},
    favoriteLessons: [],
    currentLessonId: null
  };
}

function getCourseProgress(data, email, courseId) {
  data.progress[email] ??= {};
  data.progress[email][courseId] ??= createEmptyCourseProgress();

  const progress = data.progress[email][courseId];
  progress.completedLessons ??= [];
  progress.activities ??= {};
  progress.quizAttempts ??= [];
  progress.examNormal ??= null;
  progress.examRecovery ??= null;
  progress.examDeadline ??= null;
  progress.lessonNotes ??= {};
  progress.favoriteLessons ??= [];
  progress.currentLessonId ??= null;

  return progress;
}

function studentTab(id) {
  document.querySelectorAll("#studentApp .tab").forEach(t => t.classList.remove("active"));
  document.getElementById(id).classList.add("active");
  renderStudent();
}

function adminTab(id) {
  document.querySelectorAll("#adminApp .tab").forEach(t => t.classList.remove("active"));
  document.getElementById(id).classList.add("active");
  renderAdmin();
}

function loginStudent() {
  const email = normalizeEmail(document.getElementById("studentEmail").value);
  const password = document.getElementById("studentPassword").value.trim();

  if (!email || !password) {
    toast("Digite e-mail e senha.");
    return;
  }

  if (!isValidEmail(email)) {
    toast("Digite um e-mail válido.");
    return;
  }

  const data = getData();
  const student = data.students.find(s => s.email === email);

  if (!student) {
    toast("Aluno não encontrado. Peça o acesso ao administrador.");
    return;
  }

  if (student.password !== password) {
    toast("Senha incorreta.");
    return;
  }

  if (student.active === false) {
    toast("Este acesso está bloqueado pelo administrador.");
    return;
  }

  data.courses.forEach(c => {
    getCourseProgress(data, email, c.id);
    ensurePayment(data, email, c.id);
  });

  student.lastAccess = new Date().toLocaleString("pt-BR");

  saveData(data);
  localStorage.setItem("currentStudentV3", email);
  localStorage.removeItem("adminLoggedV3");
  showPage("studentApp");
  renderStudent();
  toast("Bem-vindo!");
}

function loginAdmin() {
  const data = getData();
  const pass = document.getElementById("adminPassword").value;

  if (pass !== data.settings.adminPassword) {
    toast("Senha incorreta.");
    return;
  }

  localStorage.setItem("adminLoggedV3", "true");
  localStorage.removeItem("currentStudentV3");
  showPage("adminApp");
  renderAdmin();
  toast("Admin aberto.");
}

function logout() {
  localStorage.removeItem("currentStudentV3");
  localStorage.removeItem("adminLoggedV3");
  stopExamTimer();
  showPage("landingPage");
}

document.getElementById("logoutBtn").addEventListener("click", logout);

const adminPasswordEnterHandler = document.getElementById("adminPassword");
if (adminPasswordEnterHandler) {
  adminPasswordEnterHandler.addEventListener("keydown", event => {
    if (event.key === "Enter") loginAdmin();
  });
}

const studentPasswordEnterHandler = document.getElementById("studentPassword");
if (studentPasswordEnterHandler) {
  studentPasswordEnterHandler.addEventListener("keydown", event => {
    if (event.key === "Enter") loginStudent();
  });
}

document.getElementById("themeBtn").addEventListener("click", () => {
  document.body.classList.toggle("dark");
  localStorage.setItem("cursoProThemeV3", document.body.classList.contains("dark") ? "dark" : "light");
});

if (localStorage.getItem("cursoProThemeV3") === "dark") document.body.classList.add("dark");

/* VIDEO */

function getYoutubeId(url) {
  if (!url) return "";
  url = url.trim();

  const patterns = [
    /youtube\.com\/watch\?v=([^&]+)/,
    /youtu\.be\/([^?&]+)/,
    /youtube\.com\/embed\/([^?&]+)/,
    /youtube\.com\/shorts\/([^?&]+)/
  ];

  for (const p of patterns) {
    const m = url.match(p);
    if (m?.[1]) return m[1];
  }

  if (/^[a-zA-Z0-9_-]{8,}$/.test(url)) return url;
  return "";
}

function getYoutubeEmbed(url) {
  const id = getYoutubeId(url);
  return id ? `https://www.youtube-nocookie.com/embed/${id}?rel=0&modestbranding=1&playsinline=1` : "";
}

function getYoutubeWatchUrl(url) {
  const id = getYoutubeId(url);
  return id ? `https://www.youtube.com/watch?v=${id}` : url;
}

function isDirectVideo(url) {
  return /\.(mp4|webm|ogg)(\?.*)?$/i.test(url || "");
}

function renderVideoPlayer(lesson) {
  const type = lesson.videoType || "youtube";
  const url = lesson.videoUrl || "";

  if (type === "youtube") {
    const embed = getYoutubeEmbed(url);

    if (!embed) {
      return `<div class="warning-box">Link do YouTube inválido.</div>`;
    }

    return `
      <iframe class="video-frame" src="${embed}" title="${escapeHtml(lesson.title)}"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>
      <div class="lesson-actions">
        <a class="secondary-btn" href="${getYoutubeWatchUrl(url)}" target="_blank" rel="noopener">Abrir no YouTube</a>
      </div>
    `;
  }

  if (type === "direct") {
    if (!isDirectVideo(url)) return `<div class="warning-box">Use um link direto terminado em .mp4, .webm ou .ogg.</div>`;

    return `
      <video class="video-player" controls preload="metadata">
        <source src="${url}">
      </video>
      <div class="lesson-actions">
        <a class="secondary-btn" href="${url}" target="_blank" rel="noopener">Abrir vídeo</a>
      </div>
    `;
  }

  return `
    <div class="video-placeholder">
      <div>
        <strong>Vídeo local</strong>
        <p>Selecione o vídeo no dispositivo.</p>
        <input type="file" accept="video/*" onchange="previewLocalVideo(event, 'localVideo_${lesson.id}')">
      </div>
    </div>
    <video id="localVideo_${lesson.id}" class="video-player" controls></video>
  `;
}

function previewLocalVideo(event, id) {
  const file = event.target.files[0];
  if (!file) return;
  const video = document.getElementById(id);
  video.src = URL.createObjectURL(file);
  video.play();
}

function previewAdminVideo() {
  const type = document.getElementById("lessonVideoType").value;
  const url = document.getElementById("lessonVideoUrl").value.trim();
  const preview = document.getElementById("adminVideoPreview");

  const temp = { id: "admin_preview", title: "Preview", videoType: type, videoUrl: url };
  preview.outerHTML = `<div id="adminVideoPreview">${renderVideoPlayer(temp)}</div>`;
}

/* STUDENT */

function renderStudent() {
  const data = getData();
  const email = currentEmail();
  if (!email) return;

  const student = data.students.find(s => s.email === email);
  const courseId = getSelectedCourseId(data);
  const course = data.courses.find(c => c.id === courseId) || data.courses[0];
  const progress = getCourseProgress(data, email, course.id);

  document.getElementById("welcomeStudent").textContent = `Olá, ${student.name}! Continue seus estudos.`;

  renderStudentCourses(data, student);
  renderCourseDetails(data, course, student);
  renderProfile(data, student);
  renderModuleFilter(data, course.id);
  renderStudentDashboard(data, course, progress);
  renderStudentLessons(data, course, progress);
  renderLessonRoom(data, course, progress);
  renderFavorites(data, course, progress);
  renderStudentActivities(data, course, progress);
  renderStudentQuiz(data, course, progress);
  renderStudentExam(data, course, progress);
  renderGrades(data, course, progress);
  renderCertificate(data, course, progress, student);

  saveData(data);
}

function selectCourse(courseId) {
  const data = getData();
  const email = currentEmail();
  const student = data.students.find(s => s.email === email);
  const course = data.courses.find(c => c.id === courseId);

  if (!isCourseAllowedForStudent(student, courseId)) {
    toast("Este curso não está liberado para seu usuário.");
    return;
  }

  if (!isCoursePaidOrFree(data, email, course)) {
    toast("Este curso está aguardando aprovação de pagamento.");
    return;
  }

  student.selectedCourseId = courseId;
  saveData(data);
  renderStudent();
  studentTab("studentDashboard");
}


function isCourseAllowedForStudent(student, courseId) {
  return (student.allowedCourses || [student.selectedCourseId]).includes(courseId);
}

function ensurePayment(data, email, courseId) {
  data.payments ??= {};
  data.payments[email] ??= {};
  data.payments[email][courseId] ??= {
    status: "pending",
    proof: "",
    note: "",
    updatedAt: ""
  };
  return data.payments[email][courseId];
}

function isCoursePaidOrFree(data, email, course) {
  const payment = ensurePayment(data, email, course.id);
  const isFree = !course.price || String(course.price).toLowerCase() === "grátis" || String(course.price).toLowerCase() === "gratis" || String(course.price) === "0";
  return isFree || payment.status === "paid";
}

function renderStudentCourses(data, student) {
  document.getElementById("studentCoursesList").innerHTML = `
    <div class="course-grid">
      ${data.courses.map(course => {
        const selected = student.selectedCourseId === course.id;
        const allowed = isCourseAllowedForStudent(student, course.id);
        const payment = ensurePayment(data, student.email, course.id);
        const paid = isCoursePaidOrFree(data, student.email, course);
        const locked = !allowed || !paid;

        return `
          <div class="course-card">
            ${course.thumb ? `<img class="course-thumb" src="${course.thumb}" alt="">` : `<div class="course-thumb">CURSO</div>`}
            <h3>${escapeHtml(course.title)}</h3>
            <p>${escapeHtml(course.desc)}</p>
            <p><strong>Carga horária:</strong> ${escapeHtml(course.hours || "Não informada")}</p>
            <p><strong>Professor:</strong> ${escapeHtml(course.teacher || "Não informado")}</p>
            <p><strong>Preço:</strong> ${escapeHtml(course.price || "Grátis")}</p>
            <p><span class="payment-status ${paid ? "paid" : payment.status}">${!allowed ? "Bloqueado" : paid ? "Liberado" : "Pagamento pendente"}</span></p>

            ${locked ? `
              <div class="pix-box">
                ${!allowed ? `<strong>Curso não liberado para seu usuário.</strong>` : `
                  <strong>Pagamento pendente.</strong><br>
                  Chave Pix: ${escapeHtml(course.pix || "Não informada")}
                `}
              </div>
            ` : ""}

            <div class="lesson-actions">
              <button class="secondary-btn" onclick="viewCourseDetails('${course.id}')">Ver detalhes</button>
              <button class="${selected ? "success-btn" : "primary-btn"}" ${locked ? "disabled" : ""} onclick="selectCourse('${course.id}')">
                ${locked ? "Bloqueado" : selected ? "Curso selecionado" : "Estudar este curso"}
              </button>
            </div>
          </div>
        `;
      }).join("")}
    </div>
  `;
}



function viewCourseDetails(courseId) {
  const data = getData();
  const email = currentEmail();
  const student = data.students.find(s => s.email === email);
  if (student) {
    student.selectedCourseId = courseId;
    saveData(data);
  }
  studentTab("studentCourseDetails");
}

function renderCourseDetails(data, course, student) {
  const lessons = courseLessons(data, course.id, true);
  const modules = data.modules.filter(m => m.courseId === course.id);
  const activities = courseActivities(data, course.id);
  const quiz = courseQuiz(data, course.id);
  const payment = ensurePayment(data, student.email, course.id);
  const allowed = isCourseAllowedForStudent(student, course.id);
  const paid = isCoursePaidOrFree(data, student.email, course);

  const box = document.getElementById("courseDetailsBox");
  if (!box) return;

  box.innerHTML = `
    <div class="course-details-hero">
      <div class="course-details-thumb">
        ${course.thumb ? `<img src="${course.thumb}" alt="">` : "CURSO"}
      </div>
      <div>
        <h2>${escapeHtml(course.title)}</h2>
        <p>${escapeHtml(course.desc || "")}</p>

        <div class="detail-grid">
          <div class="detail-item"><strong>${lessons.length}</strong><span>Aulas</span></div>
          <div class="detail-item"><strong>${modules.length}</strong><span>Módulos</span></div>
          <div class="detail-item"><strong>${activities.length}</strong><span>Atividades</span></div>
          <div class="detail-item"><strong>${Number(course.passingGrade || 7).toFixed(1)}</strong><span>Nota mínima</span></div>
        </div>

        <p><strong>Professor:</strong> ${escapeHtml(course.teacher || "Não informado")}</p>
        <p><strong>Instituição:</strong> ${escapeHtml(course.institution || "Não informada")}</p>
        <p><strong>Carga horária:</strong> ${escapeHtml(course.hours || "Não informada")}</p>
        <p><strong>Preço:</strong> ${escapeHtml(course.price || "Grátis")}</p>

        <div class="pix-box">
          <strong>Status de acesso:</strong><br>
          ${!allowed ? "Bloqueado pelo administrador." : paid ? "Curso liberado." : "Aguardando aprovação de pagamento."}
          ${!paid && allowed ? `<br><br><strong>Chave Pix:</strong> ${escapeHtml(course.pix || "Não informada")}` : ""}
        </div>

        <div class="lesson-actions">
          <button class="primary-btn" ${(!allowed || !paid) ? "disabled" : ""} onclick="selectCourse('${course.id}')">Estudar curso</button>
          <button class="ghost-btn" onclick="studentTab('studentCourses')">Voltar aos cursos</button>
        </div>
      </div>
    </div>
  `;
}

function renderProfile(data, student) {
  const box = document.getElementById("profileBox");
  if (!box) return;

  const notices = getStudentNotifications(data, student);
  const allowedCourses = data.courses.filter(c => isCourseAllowedForStudent(student, c.id));

  box.innerHTML = `
    <div class="profile-grid">
      <div class="profile-card">
        <h3>Dados do aluno</h3>
        <p><strong>Nome:</strong> ${escapeHtml(student.name)}</p>
        <p><strong>E-mail:</strong> ${escapeHtml(student.email)}</p>
        <p><strong>Telefone:</strong> ${escapeHtml(student.phone || "Não informado")}</p>
        <p><strong>Cidade:</strong> ${escapeHtml(student.city || "Não informada")}</p>
        <p><strong>Último acesso:</strong> ${escapeHtml(student.lastAccess || "Não registrado")}</p>
      </div>

      <div class="profile-card">
        <h3>Cursos liberados</h3>
        ${allowedCourses.length ? allowedCourses.map(c => `<p>• ${escapeHtml(c.title)}</p>`).join("") : "<p>Nenhum curso liberado.</p>"}
      </div>
    </div>

    <div class="profile-card" style="margin-top:18px">
      <h3>Notificações</h3>
      <div class="notification-list">
        ${notices.length ? notices.map(n => `
          <div class="notification-card ${n.read ? "" : "unread"}">
            <strong>${escapeHtml(n.title)}</strong>
            <p>${escapeHtml(n.message)}</p>
            <small>${escapeHtml(n.date || "")}</small>
          </div>
        `).join("") : "<p>Nenhuma notificação.</p>"}
      </div>
    </div>
  `;
}

function getStudentNotifications(data, student) {
  const allowed = student.allowedCourses || [student.selectedCourseId];
  const notices = (data.notices || []).filter(n => allowed.includes(n.courseId));
  const personal = (data.notifications?.[student.email] || []);
  return [...personal, ...notices].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
}

function renderModuleFilter(data, courseId) {
  const select = document.getElementById("moduleFilter");
  if (!select) return;

  const selected = select.value || "all";
  const modules = data.modules.filter(m => m.courseId === courseId);

  select.innerHTML = `<option value="all">Todos os módulos</option>` + modules.map(m => `
    <option value="${m.id}">${escapeHtml(m.title)}</option>
  `).join("");

  select.value = selected;
}

function courseLessons(data, courseId, onlyPublished = false) {
  return data.lessons.filter(l => {
    const sameCourse = l.courseId === courseId;
    const isVisible = (l.status || "published") === "published";
    return sameCourse && (!onlyPublished || isVisible);
  });
}

function courseActivities(data, courseId) {
  return data.activities.filter(a => a.courseId === courseId);
}

function courseQuiz(data, courseId) {
  return data.quiz.filter(q => q.courseId === courseId);
}

function courseExam(data, courseId, type) {
  return data.exam[type].filter(q => q.courseId === courseId);
}

function renderStudentDashboard(data, course, progress) {
  const lessons = courseLessons(data, course.id, true);
  const lessonPercent = lessons.length ? Math.round((progress.completedLessons.length / lessons.length) * 100) : 0;
  const avg = calculateAverage(data, course.id, progress);
  const status = getStatus(avg, progress, course.passingGrade);

  document.getElementById("statLessons").textContent = `${lessonPercent}%`;
  document.getElementById("statAverage").textContent = avg.toFixed(1);
  document.getElementById("statStatus").textContent = status;

  const global = Math.round((lessonPercent + Math.min(avg * 10, 100)) / 2);
  const bar = document.getElementById("globalProgress");
  bar.style.width = `${global}%`;
  bar.textContent = `${global}%`;

  const pendingActivities = courseActivities(data, course.id).filter(a => {
    const rec = progress.activities[a.id];
    return !rec || !rec.attempts || rec.attempts.length === 0;
  }).length;

  const quizStatus = progress.quizAttempts.length ? "Iniciado" : "Pendente";
  const certificateStatus = getStatus(avg, progress, course.passingGrade) === "Aprovado" ? "Liberado" : "Bloqueado";

  document.getElementById("selectedCourseBox").innerHTML = `
    <h3>${escapeHtml(course.title)}</h3>
    <p>${escapeHtml(course.desc)}</p>
    <div class="dashboard-pro-grid">
      <div class="dashboard-pro-item"><strong>${pendingActivities}</strong><span>Atividades pendentes</span></div>
      <div class="dashboard-pro-item"><strong>${quizStatus}</strong><span>Status do quiz</span></div>
      <div class="dashboard-pro-item"><strong>${progress.favoriteLessons.length}</strong><span>Aulas favoritas</span></div>
      <div class="dashboard-pro-item"><strong>${certificateStatus}</strong><span>Certificado</span></div>
    </div>
  `;

  const next = lessons.find(l => !progress.completedLessons.includes(l.id));
  document.getElementById("continueBox").innerHTML = next ? `
    <p>Próxima aula: <strong>${escapeHtml(next.title)}</strong></p>
    <button class="primary-btn" onclick="studentTab('studentLessons')">Continuar</button>
  ` : `
    <p>Todas as aulas deste curso foram concluídas.</p>
    <button class="primary-btn" onclick="studentTab('studentExam')">Ir para prova</button>
  `;
}

function isLessonLocked(lessons, progress, index) {
  if (index === 0) return false;
  return !progress.completedLessons.includes(lessons[index - 1].id);
}

function renderStudentLessons(data, course, progress) {
  const box = document.getElementById("studentLessonsList");
  const student = data.students.find(s => s.email === currentEmail());
  if (!isCourseAllowedForStudent(student, course.id) || !isCoursePaidOrFree(data, student.email, course)) {
    box.innerHTML = `<div class="locked-state-pro"><strong>Curso bloqueado.</strong><br>Verifique liberação ou pagamento.</div>`;
    return;
  }
  const search = (document.getElementById("lessonSearch")?.value || "").toLowerCase();
  const moduleFilter = document.getElementById("moduleFilter")?.value || "all";
  const lessons = courseLessons(data, course.id, true);

  if (!lessons.length) {
    box.innerHTML = `<div class="card"><p>Nenhuma aula cadastrada neste curso.</p></div>`;
    return;
  }

  const filtered = lessons.filter(l => {
    const text = `${l.title} ${l.desc}`.toLowerCase();
    return text.includes(search) && (moduleFilter === "all" || l.moduleId === moduleFilter);
  });

  const modules = data.modules.filter(m => m.courseId === course.id);
  box.innerHTML = modules.map(module => {
    const list = filtered.filter(l => l.moduleId === module.id);
    if (!list.length) return "";

    return `
      <h3 class="module-title">${escapeHtml(module.title)}</h3>
      ${list.map(lesson => {
        const index = lessons.findIndex(l => l.id === lesson.id);
        const locked = isLessonLocked(lessons, progress, index);
        const done = progress.completedLessons.includes(lesson.id);

        if (locked) {
          return `
            <div class="card">
              <h3>${escapeHtml(lesson.title)}</h3>
              <p>${escapeHtml(lesson.desc)}</p>
              <div class="warning-box">Aula bloqueada. Conclua a aula anterior.</div>
            </div>
          `;
        }

        return `
          <div class="card">
            <h3>${escapeHtml(lesson.title)}</h3>
            <p>${escapeHtml(lesson.desc)}</p>
            ${lesson.thumb ? `<img class="lesson-thumb" src="${lesson.thumb}" alt="">` : ""}
            ${lesson.duration ? `<p><strong>Duração:</strong> ${escapeHtml(lesson.duration)}</p>` : ""}
            ${renderVideoPlayer(lesson)}
            <div class="lesson-actions">
              ${lesson.pdf ? `<a class="secondary-btn" href="${lesson.pdf}" target="_blank">Abrir PDF</a>` : ""}
              <button class="secondary-btn" onclick="openLessonRoom('${course.id}','${lesson.id}')">Abrir sala da aula</button>
              <button class="ghost-btn" onclick="toggleFavoriteLesson('${course.id}','${lesson.id}')">
                ${progress.favoriteLessons.includes(lesson.id) ? "Remover favorito" : "Favoritar"}
              </button>
              <button class="${done ? "success-btn" : "primary-btn"}" onclick="completeLesson('${course.id}','${lesson.id}')">
                ${done ? "Aula concluída" : "Marcar como concluída"}
              </button>
            </div>
          </div>
        `;
      }).join("")}
    `;
  }).join("");
}

function completeLesson(courseId, lessonId) {
  const data = getData();
  const progress = getCourseProgress(data, currentEmail(), courseId);

  if (!progress.completedLessons.includes(lessonId)) progress.completedLessons.push(lessonId);
  progress.currentLessonId = lessonId;

  saveData(data);
  renderStudent();
  toast("Aula concluída.");
}


function openLessonRoom(courseId, lessonId) {
  const data = getData();
  const progress = getCourseProgress(data, currentEmail(), courseId);
  progress.currentLessonId = lessonId;
  saveData(data);
  studentTab("studentLessonRoom");
}

function toggleFavoriteLesson(courseId, lessonId) {
  const data = getData();
  const progress = getCourseProgress(data, currentEmail(), courseId);

  if (progress.favoriteLessons.includes(lessonId)) {
    progress.favoriteLessons = progress.favoriteLessons.filter(id => id !== lessonId);
    toast("Aula removida dos favoritos.");
  } else {
    progress.favoriteLessons.push(lessonId);
    toast("Aula adicionada aos favoritos.");
  }

  saveData(data);
  renderStudent();
}

function saveLessonNote(courseId, lessonId) {
  const data = getData();
  const progress = getCourseProgress(data, currentEmail(), courseId);
  const note = document.getElementById(`note_${lessonId}`).value;

  progress.lessonNotes[lessonId] = {
    text: note,
    updatedAt: new Date().toLocaleString("pt-BR")
  };

  saveData(data);
  toast("Anotação salva.");
}

function goToLessonByDirection(courseId, lessonId, direction) {
  const data = getData();
  const lessons = courseLessons(data, courseId, true);
  const index = lessons.findIndex(l => l.id === lessonId);
  const next = lessons[index + direction];

  if (!next) {
    toast(direction > 0 ? "Essa é a última aula." : "Essa é a primeira aula.");
    return;
  }

  openLessonRoom(courseId, next.id);
}

function renderLessonRoom(data, course, progress) {
  const lessons = courseLessons(data, course.id, true);
  const box = document.getElementById("lessonRoomBox");

  if (!lessons.length) {
    box.innerHTML = `<div class="empty-state-pro"><h3>Nenhuma aula publicada</h3><p>O admin ainda não publicou aulas neste curso.</p></div>`;
    return;
  }

  let lesson = lessons.find(l => l.id === progress.currentLessonId) || lessons.find(l => !progress.completedLessons.includes(l.id)) || lessons[0];
  progress.currentLessonId = lesson.id;

  const index = lessons.findIndex(l => l.id === lesson.id);
  const locked = isLessonLocked(lessons, progress, index);
  const done = progress.completedLessons.includes(lesson.id);
  const favorite = progress.favoriteLessons.includes(lesson.id);
  const note = progress.lessonNotes[lesson.id]?.text || "";
  const noteDate = progress.lessonNotes[lesson.id]?.updatedAt || "Ainda não salva";

  if (locked) {
    box.innerHTML = `
      <div class="locked-state-pro">
        <strong>Aula bloqueada.</strong><br>
        Conclua a aula anterior para abrir esta sala.
      </div>
    `;
    return;
  }

  box.innerHTML = `
    <div class="lesson-room">
      <div class="lesson-main-card">
        <h3>${escapeHtml(lesson.title)}</h3>
        <p>${escapeHtml(lesson.desc || "")}</p>

        <div class="lesson-meta-line">
          ${lesson.duration ? `<span class="learning-badge">${escapeHtml(lesson.duration)}</span>` : ""}
          <span class="learning-badge ${done ? "success" : "warning"}">${done ? "Concluída" : "Em andamento"}</span>
          <span class="learning-badge ${favorite ? "success" : ""}">${favorite ? "Favorita" : "Não favoritada"}</span>
        </div>

        ${lesson.thumb ? `<img class="lesson-thumb" src="${lesson.thumb}" alt="">` : ""}
        ${renderVideoPlayer(lesson)}

        <div class="lesson-card-actions">
          ${lesson.pdf ? `<a class="secondary-btn" href="${lesson.pdf}" target="_blank">Abrir material PDF</a>` : ""}
          <button class="ghost-btn" onclick="toggleFavoriteLesson('${course.id}','${lesson.id}')">${favorite ? "Remover favorito" : "Favoritar aula"}</button>
          <button class="${done ? "success-btn" : "primary-btn"}" onclick="completeLesson('${course.id}','${lesson.id}')">${done ? "Aula concluída" : "Concluir aula"}</button>
        </div>

        <div class="lesson-note-box">
          <label>Minhas anotações</label>
          <textarea id="note_${lesson.id}" placeholder="Escreva suas dúvidas, resumos e pontos importantes...">${escapeHtml(note)}</textarea>
          <small>Última atualização: ${escapeHtml(noteDate)}</small>
          <div class="submit-area-pro">
            <button class="primary-btn" onclick="saveLessonNote('${course.id}','${lesson.id}')">Salvar anotação</button>
          </div>
        </div>

        <div class="lesson-nav-buttons">
          <button class="ghost-btn" onclick="goToLessonByDirection('${course.id}','${lesson.id}',-1)">Aula anterior</button>
          <button class="primary-btn" onclick="goToLessonByDirection('${course.id}','${lesson.id}',1)">Próxima aula</button>
        </div>
      </div>

      <div class="lesson-side-card">
        <h3>Aulas do curso</h3>
        <p>Escolha uma aula publicada.</p>
        <div class="lesson-list-mini">
          ${lessons.map((item, i) => {
            const itemLocked = isLessonLocked(lessons, progress, i);
            const itemDone = progress.completedLessons.includes(item.id);
            return `
              <div class="lesson-mini-item ${item.id === lesson.id ? "active" : ""} ${itemLocked ? "locked" : ""}"
                onclick="${itemLocked ? "" : `openLessonRoom('${course.id}','${item.id}')`}">
                <strong>${i + 1}. ${escapeHtml(item.title)}</strong><br>
                <small>${itemDone ? "Concluída" : itemLocked ? "Bloqueada" : "Disponível"}</small>
              </div>
            `;
          }).join("")}
        </div>
      </div>
    </div>
  `;
}

function renderFavorites(data, course, progress) {
  const lessons = courseLessons(data, course.id, true)
    .filter(l => progress.favoriteLessons.includes(l.id));

  const box = document.getElementById("favoritesBox");

  if (!lessons.length) {
    box.innerHTML = `
      <div class="favorite-empty">
        <h3>Nenhuma aula favoritada</h3>
        <p>Abra uma aula e clique em “Favoritar aula” para salvar aqui.</p>
      </div>
    `;
    return;
  }

  box.innerHTML = lessons.map(lesson => `
    <div class="activity-card-pro">
      <div class="activity-top">
        <div class="activity-title-group">
          <h3>${escapeHtml(lesson.title)}</h3>
          <p>${escapeHtml(lesson.desc || "")}</p>
        </div>
        <span class="learning-badge success">Favorita</span>
      </div>
      ${lesson.thumb ? `<img class="lesson-thumb" src="${lesson.thumb}" alt="">` : ""}
      <div class="lesson-actions">
        <button class="primary-btn" onclick="openLessonRoom('${course.id}','${lesson.id}')">Abrir aula</button>
        <button class="ghost-btn" onclick="toggleFavoriteLesson('${course.id}','${lesson.id}')">Remover</button>
      </div>
    </div>
  `).join("");
}


function renderStudentActivities(data, course, progress) {
  const student = data.students.find(s => s.email === currentEmail());
  if (!isCourseAllowedForStudent(student, course.id) || !isCoursePaidOrFree(data, student.email, course)) {
    document.getElementById("studentActivitiesList").innerHTML = `<div class="locked-state-pro"><strong>Curso bloqueado.</strong><br>Atividades indisponíveis.</div>`;
    return;
  }
  const list = courseActivities(data, course.id);

  document.getElementById("studentActivitiesList").innerHTML = list.length ? `
    <div class="learning-panel">
      <div class="learning-header">
        <div>
          <h3>Atividades do curso</h3>
          <p>Responda com atenção. Cada atividade permite até 2 tentativas.</p>
        </div>
        <span class="learning-badge">${list.length} atividade(s)</span>
      </div>
    </div>

    ${list.map((act, index) => {
      const record = progress.activities[act.id] || { attempts: [] };
      const attempts = record.attempts.length;
      const locked = attempts >= 2;
      const statusClass = locked ? "danger" : attempts > 0 ? "warning" : "success";
      const statusText = locked ? "Tentativas esgotadas" : attempts > 0 ? "Em andamento" : "Disponível";

      return `
        <div class="activity-card-pro">
          <div class="activity-top">
            <div class="activity-title-group">
              <h3>${index + 1}. ${escapeHtml(act.title)}</h3>
              <p>Atividade discursiva</p>
            </div>
            <span class="learning-badge ${statusClass}">${statusText} • ${attempts}/2</span>
          </div>

          <div class="activity-question">
            <strong>Enunciado:</strong><br>
            ${escapeHtml(act.question)}
          </div>

          ${locked ? `
            <div class="locked-state-pro">
              <strong>Limite atingido.</strong><br>
              Você já usou as 2 tentativas desta atividade.
            </div>
          ` : `
            <div class="activity-answer-box">
              <label>Sua resposta</label>
              <textarea id="answer_${act.id}" placeholder="Digite sua resposta com calma e revise antes de enviar..."></textarea>
              <div class="submit-area-pro">
                <button class="primary-btn" onclick="sendActivity('${course.id}','${act.id}')">Enviar atividade</button>
              </div>
            </div>
          `}

          ${record.attempts.length ? `
            <div class="activity-history">
              <strong>Histórico de envio</strong>
              ${record.attempts.map((item, i) => `
                <div class="activity-history-item">
                  <small>Tentativa ${i + 1} • ${escapeHtml(item.date || "")} • ${item.status === "corrected" ? "Corrigida" : "Pendente"}</small>
                  <p>${escapeHtml(item.answer)}</p>
                  ${item.status === "corrected" ? `<p><strong>Nota:</strong> ${Number(item.grade || 0).toFixed(1)}</p><p><strong>Comentário:</strong> ${escapeHtml(item.comment || "Sem comentário")}</p>` : `<p><strong>Aguardando correção do professor.</strong></p>`}
                </div>
              `).join("")}
            </div>
          ` : ""}
        </div>
      `;
    }).join("")}
  ` : `
    <div class="empty-state-pro">
      <h3>Nenhuma atividade disponível</h3>
      <p>O administrador ainda não cadastrou atividades para este curso.</p>
    </div>
  `;
}

function sendActivity(courseId, actId) {
  const data = getData();
  const progress = getCourseProgress(data, currentEmail(), courseId);
  const answer = document.getElementById(`answer_${actId}`).value.trim();

  if (!answer) {
    toast("Digite sua resposta.");
    return;
  }

  progress.activities[actId] ??= { attempts: [] };

  if (progress.activities[actId].attempts.length >= 2) {
    toast("Limite de tentativas atingido.");
    return;
  }

  progress.activities[actId].attempts.push({
    answer,
    grade: null,
    comment: "",
    status: "pending",
    date: new Date().toLocaleString("pt-BR"),
    correctedAt: ""
  });

  saveData(data);
  renderStudent();
  toast("Atividade enviada.");
}

function renderQuestions(questions, prefix) {
  return questions.map((q, i) => `
    <div class="question-box">
      <p><strong>Questão ${i + 1}</strong><br>${escapeHtml(q.question)}</p>
      <label><input type="radio" name="${prefix}_${q.id}" value="a"> <span><strong>A)</strong> ${escapeHtml(q.a)}</span></label>
      <label><input type="radio" name="${prefix}_${q.id}" value="b"> <span><strong>B)</strong> ${escapeHtml(q.b)}</span></label>
      <label><input type="radio" name="${prefix}_${q.id}" value="c"> <span><strong>C)</strong> ${escapeHtml(q.c)}</span></label>
      <label><input type="radio" name="${prefix}_${q.id}" value="d"> <span><strong>D)</strong> ${escapeHtml(q.d)}</span></label>
    </div>
  `).join("");
}

function renderStudentQuiz(data, course, progress) {
  const student = data.students.find(s => s.email === currentEmail());
  if (!isCourseAllowedForStudent(student, course.id) || !isCoursePaidOrFree(data, student.email, course)) {
    document.getElementById("studentQuizBox").innerHTML = `<div class="locked-state-pro"><strong>Curso bloqueado.</strong><br>Quiz indisponível.</div>`;
    return;
  }
  const questions = courseQuiz(data, course.id);

  if (!questions.length) {
    document.getElementById("studentQuizBox").innerHTML = `
      <div class="empty-state-pro">
        <h3>Nenhum quiz disponível</h3>
        <p>O administrador ainda não cadastrou questões para este curso.</p>
      </div>
    `;
    return;
  }

  if (progress.quizAttempts.length >= 2) {
    const best = Math.max(...progress.quizAttempts.map(a => a.grade));
    const approved = best >= PASSING_GRADE;

    document.getElementById("studentQuizBox").innerHTML = `
      <div class="quiz-result-card">
        <h3>Quiz finalizado</h3>
        <p>Você usou as 2 tentativas disponíveis.</p>
        <div class="quiz-result-number">${best.toFixed(1)}</div>
        <span class="learning-badge ${approved ? "success" : "danger"}">
          ${approved ? "Bom desempenho" : "Revise o conteúdo"}
        </span>
      </div>
    `;
    return;
  }

  const percent = Math.round((progress.quizAttempts.length / 2) * 100);

  document.getElementById("studentQuizBox").innerHTML = `
    <div class="quiz-panel-pro">
      <div class="learning-header">
        <div>
          <h3>Quiz - ${escapeHtml(course.title)}</h3>
          <p>Leia cada pergunta com atenção. Você possui 2 tentativas.</p>
        </div>
        <span class="learning-badge warning">Tentativas ${progress.quizAttempts.length}/2</span>
      </div>

      <div class="quiz-progress-line">
        <span style="width:${percent}%"></span>
      </div>

      ${renderQuestions(questions, "quiz")}

      <div class="submit-area-pro">
        <button class="primary-btn" onclick="submitQuiz('${course.id}')">Finalizar quiz</button>
      </div>
    </div>
  `;
}

function submitQuiz(courseId) {
  const data = getData();
  const progress = getCourseProgress(data, currentEmail(), courseId);
  const questions = courseQuiz(data, courseId);

  const result = gradeQuestions(questions, "quiz");

  if (!result.complete) {
    toast("Responda todas as questões.");
    return;
  }

  progress.quizAttempts.push({
    grade: result.grade,
    date: new Date().toLocaleString("pt-BR")
  });

  saveData(data);
  renderStudent();
  toast(`Nota do quiz: ${result.grade.toFixed(1)}`);
}

function renderStudentExam(data, course, progress) {
  const student = data.students.find(s => s.email === currentEmail());
  if (!isCourseAllowedForStudent(student, course.id) || !isCoursePaidOrFree(data, student.email, course)) {
    document.getElementById("studentExamBox").innerHTML = `<div class="locked-state-pro"><strong>Curso bloqueado.</strong><br>Prova indisponível.</div>`;
    return;
  }
  const settings = data.exam.settings[course.id] || { released: false, timeMinutes: 20 };
  const normalQuestions = courseExam(data, course.id, "normal");
  const recoveryQuestions = courseExam(data, course.id, "recovery");
  const lessons = courseLessons(data, course.id, true);
  const allLessonsDone = lessons.length > 0 && progress.completedLessons.length >= lessons.length;

  if (!settings.released) {
    document.getElementById("studentExamBox").innerHTML = `<div class="card"><h3>Prova bloqueada</h3><p>O admin ainda não liberou a prova.</p></div>`;
    return;
  }

  if (!allLessonsDone) {
    document.getElementById("studentExamBox").innerHTML = `<div class="card"><h3>Conclua as aulas</h3><p>Finalize todas as aulas para liberar a prova.</p></div>`;
    return;
  }

  if (!progress.examNormal) {
    if (!progress.examDeadline) {
      document.getElementById("studentExamBox").innerHTML = `
        <div class="card">
          <h3>Prova normal</h3>
          <p>Tempo: ${settings.timeMinutes} minutos. Tentativa única.</p>
          <button class="primary-btn" onclick="startExam('${course.id}')">Iniciar prova</button>
        </div>
      `;
      return;
    }

    document.getElementById("studentExamBox").innerHTML = `
      <div class="exam-timer" id="examTimer">Carregando cronômetro...</div>
      <div class="card">
        <h3>Prova normal</h3>
        ${renderQuestions(normalQuestions, "exam")}
        <button class="primary-btn" onclick="submitExam('${course.id}','normal')">Finalizar prova</button>
      </div>
    `;

    startExamTimer(course.id);
    return;
  }

  if (progress.examNormal.grade >= PASSING_GRADE) {
    stopExamTimer();
    document.getElementById("studentExamBox").innerHTML = `<div class="card"><h3>Prova concluída</h3><p>Nota: ${progress.examNormal.grade.toFixed(1)}</p></div>`;
    return;
  }

  if (!progress.examRecovery) {
    document.getElementById("studentExamBox").innerHTML = `
      <div class="card">
        <h3>Recuperação</h3>
        <p>Sua nota foi ${progress.examNormal.grade.toFixed(1)}. Faça a recuperação.</p>
        ${renderQuestions(recoveryQuestions, "recovery")}
        <button class="primary-btn" onclick="submitExam('${course.id}','recovery')">Finalizar recuperação</button>
      </div>
    `;
    return;
  }

  document.getElementById("studentExamBox").innerHTML = `
    <div class="card">
      <h3>Provas concluídas</h3>
      <p>Normal: ${progress.examNormal.grade.toFixed(1)}</p>
      <p>Recuperação: ${progress.examRecovery.grade.toFixed(1)}</p>
    </div>
  `;
}

function startExam(courseId) {
  const data = getData();
  const settings = data.exam.settings[courseId];
  const progress = getCourseProgress(data, currentEmail(), courseId);

  progress.examDeadline = Date.now() + (Number(settings.timeMinutes || 20) * 60 * 1000);

  saveData(data);
  renderStudent();
}

function startExamTimer(courseId) {
  stopExamTimer();

  const data = getData();
  const progress = getCourseProgress(data, currentEmail(), courseId);

  activeExamDeadline = progress.examDeadline;

  examTimerInterval = setInterval(() => {
    const remaining = activeExamDeadline - Date.now();
    const box = document.getElementById("examTimer");

    if (!box) {
      stopExamTimer();
      return;
    }

    if (remaining <= 0) {
      stopExamTimer();
      toast("Tempo encerrado. Prova finalizada automaticamente.");
      submitExam(courseId, "normal", true);
      return;
    }

    const min = Math.floor(remaining / 60000);
    const sec = Math.floor((remaining % 60000) / 1000);
    box.textContent = `Tempo restante: ${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  }, 500);
}

function stopExamTimer() {
  if (examTimerInterval) clearInterval(examTimerInterval);
  examTimerInterval = null;
  activeExamDeadline = null;
}

function submitExam(courseId, type, auto = false) {
  const data = getData();
  const progress = getCourseProgress(data, currentEmail(), courseId);

  if (type === "normal" && progress.examNormal) {
    toast("A prova normal já foi feita.");
    return;
  }

  if (type === "recovery" && progress.examRecovery) {
    toast("A recuperação já foi feita.");
    return;
  }

  const questions = courseExam(data, courseId, type);
  const prefix = type === "normal" ? "exam" : "recovery";
  let result = auto ? gradeQuestionsAllowBlank(questions, prefix) : gradeQuestions(questions, prefix);

  if (!auto && !result.complete) {
    toast("Responda todas as questões.");
    return;
  }

  const payload = {
    grade: result.grade,
    date: new Date().toLocaleString("pt-BR")
  };

  if (type === "normal") {
    progress.examNormal = payload;
    progress.examDeadline = null;
    stopExamTimer();
  }

  if (type === "recovery") progress.examRecovery = payload;

  saveData(data);
  renderStudent();
  toast(`Nota: ${result.grade.toFixed(1)}`);
}

function gradeQuestions(questions, prefix) {
  let correct = 0;
  let complete = true;

  questions.forEach(q => {
    const selected = document.querySelector(`input[name="${prefix}_${q.id}"]:checked`);
    if (!selected) {
      complete = false;
      return;
    }
    if (selected.value === q.correct) correct++;
  });

  return { complete, grade: questions.length ? (correct / questions.length) * 10 : 0 };
}

function gradeQuestionsAllowBlank(questions, prefix) {
  let correct = 0;

  questions.forEach(q => {
    const selected = document.querySelector(`input[name="${prefix}_${q.id}"]:checked`);
    if (selected?.value === q.correct) correct++;
  });

  return { complete: true, grade: questions.length ? (correct / questions.length) * 10 : 0 };
}

function calculateAverage(data, courseId, progress) {
  const activityGrades = Object.values(progress.activities || {})
    .flatMap(item => item.attempts || [])
    .filter(item => item.status === "corrected" && item.grade !== null && item.grade !== undefined)
    .map(item => Number(item.grade || 0));
  const activityAvg = activityGrades.length ? activityGrades.reduce((a, b) => a + b, 0) / activityGrades.length : 0;
  const quizBest = progress.quizAttempts.length ? Math.max(...progress.quizAttempts.map(a => a.grade)) : 0;

  let examGrade = 0;
  if (progress.examRecovery) examGrade = Math.max(progress.examNormal?.grade || 0, progress.examRecovery.grade);
  else if (progress.examNormal) examGrade = progress.examNormal.grade;

  const items = [activityAvg, quizBest, examGrade].filter(n => n > 0);
  return items.length ? items.reduce((a, b) => a + b, 0) / items.length : 0;
}

function getStatus(avg, progress, passingGrade = PASSING_GRADE) {
  if (!progress.examNormal) return "Em andamento";
  return avg >= Number(passingGrade || PASSING_GRADE) ? "Aprovado" : "Reprovado";
}

function renderGrades(data, course, progress) {
  const activityGrades = Object.values(progress.activities || {})
    .flatMap(item => item.attempts || [])
    .filter(item => item.status === "corrected" && item.grade !== null && item.grade !== undefined)
    .map(item => Number(item.grade || 0));
  const activityAvg = activityGrades.length ? activityGrades.reduce((a, b) => a + b, 0) / activityGrades.length : 0;
  const quizBest = progress.quizAttempts.length ? Math.max(...progress.quizAttempts.map(a => a.grade)) : 0;
  const normal = progress.examNormal?.grade || 0;
  const recovery = progress.examRecovery?.grade || 0;
  const finalAvg = calculateAverage(data, course.id, progress);

  document.getElementById("gradesBox").innerHTML = `
    <div class="card table-wrap">
      <table>
        <thead><tr><th>Item</th><th>Nota</th><th>Observação</th></tr></thead>
        <tbody>
          <tr><td>Atividades</td><td>${activityAvg.toFixed(1)}</td><td>2 tentativas</td></tr>
          <tr><td>Quiz</td><td>${quizBest.toFixed(1)}</td><td>Melhor nota</td></tr>
          <tr><td>Prova normal</td><td>${normal.toFixed(1)}</td><td>Tentativa única</td></tr>
          <tr><td>Recuperação</td><td>${recovery.toFixed(1)}</td><td>Se necessário</td></tr>
          <tr><td><strong>Média final</strong></td><td><strong>${finalAvg.toFixed(1)}</strong></td><td><strong>${getStatus(finalAvg, progress, course.passingGrade)}</strong></td></tr>
        </tbody>
      </table>
    </div>
  `;
}

function certificateCode(student, course) {
  return `CP-${student.id.slice(-5).toUpperCase()}-${course.id.slice(-5).toUpperCase()}`;
}

function renderCertificate(data, course, progress, student) {
  const avg = calculateAverage(data, course.id, progress);

  if (getStatus(avg, progress, course.passingGrade) !== "Aprovado") {
    document.getElementById("certificateBox").innerHTML = `
      <div class="card">
        <h3>Certificado indisponível</h3>
        <p>Conclua o curso e alcance média mínima ${PASSING_GRADE}.</p>
      </div>
    `;
    return;
  }

  document.getElementById("certificateBox").innerHTML = `
    <div class="certificate" id="certificatePrint">
      ${course.logo ? `<img class="certificate-logo" src="${course.logo}" alt="">` : ""}
      <h2>Certificado de Conclusão</h2>
      <p>Certificamos que</p>
      <h3>${escapeHtml(student.name)}</h3>
      <p>concluiu o curso <strong>${escapeHtml(course.title)}</strong>.</p>
      <p><strong>Instituição:</strong> ${escapeHtml(course.institution || "Não informada")}</p>
      <p><strong>Carga horária:</strong> ${escapeHtml(course.hours || "Não informada")}</p>
      <p><strong>Média final:</strong> ${avg.toFixed(1)}</p>
      <p><strong>Data:</strong> ${new Date().toLocaleDateString("pt-BR")}</p>

      <div class="certificate-signatures">
        <div class="signature-line">${escapeHtml(course.teacher || "Professor responsável")}</div>
        <div class="signature-line">${escapeHtml(course.institution || "Instituição")}</div>
      </div>

      <div class="qr-visual"><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span></div>
      <p class="certificate-code">Código: ${certificateCode(student, course)}</p>
    </div>
    <br>
    <button class="primary-btn" onclick="window.print()">Imprimir / salvar PDF</button>
  `;
}

/* ADMIN */

function countPendingCorrections(data) {
  let count = 0;
  Object.values(data.progress || {}).forEach(studentProgress => {
    Object.values(studentProgress || {}).forEach(courseProgress => {
      Object.values(courseProgress.activities || {}).forEach(activityProgress => {
        (activityProgress.attempts || []).forEach(attempt => {
          if ((attempt.status || "pending") === "pending") count++;
        });
      });
    });
  });
  return count;
}


function countPendingPayments(data) {
  let count = 0;
  data.students.forEach(student => {
    data.courses.forEach(course => {
      const payment = ensurePayment(data, student.email, course.id);
      const isFree = !course.price || String(course.price).toLowerCase() === "grátis" || String(course.price).toLowerCase() === "gratis" || String(course.price) === "0";
      if (!isFree && payment.status === "pending") count++;
    });
  });
  return count;
}

function renderAdmin() {
  const data = getData();

  document.getElementById("adminCourseCount").textContent = data.courses.length;
  document.getElementById("adminLessonCount").textContent = data.lessons.length;
  document.getElementById("adminStudentCount").textContent = data.students.length;

  const pendingCorrections = typeof countPendingCorrections === "function" ? countPendingCorrections(data) : 0;
  const pendingPayments = countPendingPayments(data);

  document.getElementById("adminSummary").innerHTML = `
    <p><strong>Correções pendentes:</strong> ${pendingCorrections}</p>
    <p><strong>Pagamentos pendentes:</strong> ${pendingPayments}</p>
    <p><strong>Módulos:</strong> ${data.modules.length}</p>
    <p><strong>Atividades:</strong> ${data.activities.length}</p>
    <p><strong>Questões de quiz:</strong> ${data.quiz.length}</p>
    <p><strong>Questões de prova:</strong> ${data.exam.normal.length}</p>
  `;

  fillCourseSelects(data);
  renderAdminCourses(data);
  renderAdminModules(data);
  renderAdminLessons(data);
  renderAdminActivities(data);
  renderCorrections(data);
  renderAdminQuiz(data);
  renderAdminExam(data);
  renderStudents(data);
  renderPayments(data);
  renderNotices(data);
}

function fillCourseSelects(data) {
  const html = data.courses.map(c => `<option value="${c.id}">${escapeHtml(c.title)}</option>`).join("");
  ["moduleCourse", "lessonCourse", "activityCourse", "quizCourse", "examCourse", "adminStudentCourse", "correctionCourseFilter", "noticeCourse"].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    const old = el.value;
    el.innerHTML = html;
    if (old && data.courses.some(c => c.id === old)) el.value = old;
  });
  refreshLessonModuleOptions();
  renderAllowedCoursesChecklist(data);
}

function saveCourse() {
  const data = getData();
  const id = document.getElementById("editingCourseId").value;
  const title = document.getElementById("courseTitle").value.trim();
  const desc = document.getElementById("courseDesc").value.trim();
  const hours = document.getElementById("courseHours").value.trim();
  const teacher = document.getElementById("courseTeacher")?.value.trim() || "";
  const institution = document.getElementById("courseInstitution")?.value.trim() || "";
  const passingGrade = clampGrade(document.getElementById("coursePassingGrade")?.value || 7);
  const price = document.getElementById("coursePrice")?.value.trim() || "Grátis";
  const pix = document.getElementById("coursePix")?.value.trim() || "";
  const logo = document.getElementById("courseLogo")?.value.trim() || "";
  const thumb = document.getElementById("courseThumb").value.trim();

  if (!title) {
    toast("Digite o nome do curso.");
    return;
  }

  if (id) {
    const c = data.courses.find(c => c.id === id);
    Object.assign(c, { title, desc, hours, teacher, institution, passingGrade, price, pix, logo, thumb });
  } else {
    const courseId = cryptoId();
    data.courses.push({ id: courseId, title, desc, hours, teacher, institution, passingGrade, price, pix, logo, thumb });
    data.modules.push({ id: cryptoId(), courseId, title: "Módulo 1 - Introdução" });
    data.exam.settings[courseId] = { released: false, timeMinutes: 20 };
  }

  saveData(data);
  cancelCourseEdit();
  renderAdmin();
  toast("Curso salvo.");
}

function cancelCourseEdit() {
  ["editingCourseId", "courseTitle", "courseDesc", "courseHours", "courseTeacher", "courseInstitution", "coursePassingGrade", "coursePrice", "coursePix", "courseLogo", "courseThumb"].forEach(id => { const el = document.getElementById(id); if (el) el.value = ""; });
}

function editCourse(id) {
  const c = getData().courses.find(c => c.id === id);
  document.getElementById("editingCourseId").value = c.id;
  document.getElementById("courseTitle").value = c.title;
  document.getElementById("courseDesc").value = c.desc;
  document.getElementById("courseHours").value = c.hours;
  if (document.getElementById("coursePrice")) document.getElementById("coursePrice").value = c.price || "Grátis";
  if (document.getElementById("coursePix")) document.getElementById("coursePix").value = c.pix || "";
  if (document.getElementById("courseLogo")) document.getElementById("courseLogo").value = c.logo || "";
  document.getElementById("courseThumb").value = c.thumb || "";
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function deleteCourse(id) {
  const data = getData();

  if (data.courses.length <= 1) {
    toast("Mantenha pelo menos 1 curso.");
    return;
  }

  if (!confirm("Excluir curso e todo conteúdo dele?")) return;
  backupBeforeDangerousAction();

  data.courses = data.courses.filter(c => c.id !== id);
  data.modules = data.modules.filter(m => m.courseId !== id);
  data.lessons = data.lessons.filter(l => l.courseId !== id);
  data.activities = data.activities.filter(a => a.courseId !== id);
  data.quiz = data.quiz.filter(q => q.courseId !== id);
  data.exam.normal = data.exam.normal.filter(q => q.courseId !== id);
  data.exam.recovery = data.exam.recovery.filter(q => q.courseId !== id);
  delete data.exam.settings[id];

  data.students.forEach(s => {
    if (s.selectedCourseId === id) s.selectedCourseId = data.courses[0].id;
  });

  saveData(data);
  renderAdmin();
  toast("Curso excluído.");
}

function renderAdminCourses(data) {
  document.getElementById("adminCoursesList").innerHTML = `
    <div class="course-grid">
      ${data.courses.map(c => `
        <div class="course-card">
          ${c.thumb ? `<img class="course-thumb" src="${c.thumb}" alt="">` : `<div class="course-thumb">CURSO</div>`}
          <h3>${escapeHtml(c.title)}</h3>
          <p>${escapeHtml(c.desc)}</p>
          <p><strong>Carga:</strong> ${escapeHtml(c.hours || "Não informada")}</p>
          <p><strong>Professor:</strong> ${escapeHtml(c.teacher || "Não informado")}</p>
          <p><strong>Nota mínima:</strong> ${Number(c.passingGrade || 7).toFixed(1)}</p>
          <div class="lesson-actions">
            <button class="warning-btn" onclick="editCourse('${c.id}')">Editar</button>
            <button class="danger-btn" onclick="deleteCourse('${c.id}')">Excluir</button>
          </div>
        </div>
      `).join("")}
    </div>
  `;
}

function addModule() {
  const data = getData();
  const courseId = document.getElementById("moduleCourse").value;
  const title = document.getElementById("moduleTitle").value.trim();

  if (!title) {
    toast("Digite o nome do módulo.");
    return;
  }

  data.modules.push({ id: cryptoId(), courseId, title });
  document.getElementById("moduleTitle").value = "";
  saveData(data);
  renderAdmin();
  toast("Módulo adicionado.");
}

function renderAdminModules(data) {
  document.getElementById("adminModulesList").innerHTML = data.modules.map(m => {
    const course = data.courses.find(c => c.id === m.courseId);
    return `
      <div class="card">
        <h3>${escapeHtml(m.title)}</h3>
        <p>Curso: ${escapeHtml(course?.title || "")}</p>
        <p>Aulas: ${data.lessons.filter(l => l.moduleId === m.id).length}</p>
        <button class="danger-btn" onclick="deleteModule('${m.id}')">Excluir</button>
      </div>
    `;
  }).join("");
}

function deleteModule(id) {
  const data = getData();
  const module = data.modules.find(m => m.id === id);
  const sameCourseModules = data.modules.filter(m => m.courseId === module.courseId);

  if (sameCourseModules.length <= 1) {
    toast("Cada curso precisa ter pelo menos 1 módulo.");
    return;
  }

  if (!confirm("Excluir módulo? As aulas vão para outro módulo do mesmo curso.")) return;

  const fallback = sameCourseModules.find(m => m.id !== id).id;
  data.modules = data.modules.filter(m => m.id !== id);
  data.lessons.forEach(l => {
    if (l.moduleId === id) l.moduleId = fallback;
  });

  saveData(data);
  renderAdmin();
}

function refreshLessonModuleOptions() {
  const data = getData();
  const courseId = document.getElementById("lessonCourse")?.value || data.courses[0].id;
  const modules = data.modules.filter(m => m.courseId === courseId);
  const select = document.getElementById("lessonModule");
  if (!select) return;
  select.innerHTML = modules.map(m => `<option value="${m.id}">${escapeHtml(m.title)}</option>`).join("");
}

function saveLesson() {
  const data = getData();
  const id = document.getElementById("editingLessonId").value;
  const courseId = document.getElementById("lessonCourse").value;
  const moduleId = document.getElementById("lessonModule").value;
  const title = document.getElementById("lessonTitle").value.trim();
  const desc = document.getElementById("lessonDesc").value.trim();
  const videoType = document.getElementById("lessonVideoType").value;
  const videoUrl = document.getElementById("lessonVideoUrl").value.trim();
  const thumb = document.getElementById("lessonThumb").value.trim();
  const pdf = document.getElementById("lessonPdf").value.trim();
  const duration = document.getElementById("lessonDuration").value.trim();
  const status = document.getElementById("lessonStatus").value || "published";

  if (!title) {
    toast("Digite o título.");
    return;
  }

  if (videoType === "youtube" && videoUrl && !getYoutubeId(videoUrl)) {
    toast("Link do YouTube inválido.");
    return;
  }

  if (videoType === "direct" && videoUrl && !isDirectVideo(videoUrl)) {
    toast("Use link .mp4, .webm ou .ogg.");
    return;
  }

  const payload = { courseId, moduleId, title, desc, videoType, videoUrl, thumb, pdf, duration, status };

  if (id) {
    Object.assign(data.lessons.find(l => l.id === id), payload);
  } else {
    data.lessons.push({ id: cryptoId(), ...payload });
  }

  saveData(data);
  cancelLessonEdit();
  renderAdmin();
  toast("Aula salva.");
}

function cancelLessonEdit() {
  ["editingLessonId", "lessonTitle", "lessonDesc", "lessonVideoUrl", "lessonThumb", "lessonPdf", "lessonDuration"].forEach(id => document.getElementById(id).value = "");
  document.getElementById("lessonStatus").value = "published";
  document.getElementById("adminVideoPreview").innerHTML = `<div class="video-placeholder"><div><strong>Nenhum vídeo carregado</strong><p>Cole o link e teste.</p></div></div>`;
}

function editLesson(id) {
  const data = getData();
  const l = data.lessons.find(l => l.id === id);

  document.getElementById("editingLessonId").value = l.id;
  document.getElementById("lessonCourse").value = l.courseId;
  refreshLessonModuleOptions();
  document.getElementById("lessonModule").value = l.moduleId;
  document.getElementById("lessonTitle").value = l.title;
  document.getElementById("lessonDesc").value = l.desc;
  document.getElementById("lessonVideoType").value = l.videoType;
  document.getElementById("lessonVideoUrl").value = l.videoUrl;
  document.getElementById("lessonThumb").value = l.thumb;
  document.getElementById("lessonPdf").value = l.pdf;
  document.getElementById("lessonDuration").value = l.duration;
  document.getElementById("lessonStatus").value = l.status || "published";
  previewAdminVideo();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function duplicateLesson(id) {
  const data = getData();
  const l = data.lessons.find(l => l.id === id);
  data.lessons.push({ ...clone(l), id: cryptoId(), title: l.title + " - Cópia" });
  saveData(data);
  renderAdmin();
  toast("Aula duplicada.");
}

function deleteLesson(id) {
  if (!confirm("Excluir aula?")) return;

  const data = getData();
  data.lessons = data.lessons.filter(l => l.id !== id);
  Object.values(data.progress).forEach(studentProgress => {
    Object.values(studentProgress).forEach(p => {
      p.completedLessons = p.completedLessons.filter(x => x !== id);
    });
  });

  saveData(data);
  renderAdmin();
}

function moveLesson(index, direction) {
  const data = getData();
  const next = index + direction;
  if (next < 0 || next >= data.lessons.length) return;

  [data.lessons[index], data.lessons[next]] = [data.lessons[next], data.lessons[index]];
  saveData(data);
  renderAdmin();
}

function renderAdminLessons(data) {
  document.getElementById("adminLessonsList").innerHTML = data.lessons.map((l, i) => {
    const c = data.courses.find(c => c.id === l.courseId);
    const m = data.modules.find(m => m.id === l.moduleId);

    return `
      <div class="card">
        <h3>${i + 1}. ${escapeHtml(l.title)}</h3>
        <p>${escapeHtml(l.desc)}</p>
        <p><strong>Curso:</strong> ${escapeHtml(c?.title || "")}</p>
        <p><strong>Módulo:</strong> ${escapeHtml(m?.title || "")}</p>
        <p><strong>Vídeo:</strong> ${escapeHtml(l.videoUrl || "Não informado")}</p>
        <p><strong>Status:</strong> <span class="status-pill ${escapeHtml(l.status || "published")}">${lessonStatusText(l.status || "published")}</span></p>
        <div class="lesson-actions">
          <button class="warning-btn" onclick="editLesson('${l.id}')">Editar</button>
          <button class="secondary-btn" onclick="duplicateLesson('${l.id}')">Duplicar</button>
          <button class="ghost-btn" onclick="moveLesson(${i}, -1)">Subir</button>
          <button class="ghost-btn" onclick="moveLesson(${i}, 1)">Descer</button>
          <button class="danger-btn" onclick="deleteLesson('${l.id}')">Excluir</button>
        </div>
      </div>
    `;
  }).join("");
}

/* Activities, quiz, exam admin */

function saveActivity() {
  const data = getData();
  const id = document.getElementById("editingActivityId").value;
  const courseId = document.getElementById("activityCourse").value;
  const title = document.getElementById("activityTitle").value.trim();
  const question = document.getElementById("activityQuestion").value.trim();

  if (!title || !question) {
    toast("Preencha tudo.");
    return;
  }

  if (id) Object.assign(data.activities.find(a => a.id === id), { courseId, title, question });
  else data.activities.push({ id: cryptoId(), courseId, title, question });

  saveData(data);
  cancelActivityEdit();
  renderAdmin();
}

function cancelActivityEdit() {
  ["editingActivityId", "activityTitle", "activityQuestion"].forEach(id => document.getElementById(id).value = "");
}

function editActivity(id) {
  const a = getData().activities.find(a => a.id === id);
  document.getElementById("editingActivityId").value = a.id;
  document.getElementById("activityCourse").value = a.courseId;
  document.getElementById("activityTitle").value = a.title;
  document.getElementById("activityQuestion").value = a.question;
}

function deleteActivity(id) {
  if (!confirm("Excluir atividade?")) return;
  const data = getData();
  data.activities = data.activities.filter(a => a.id !== id);
  saveData(data);
  renderAdmin();
}

function renderAdminActivities(data) {
  document.getElementById("adminActivitiesList").innerHTML = data.activities.map(a => {
    const c = data.courses.find(c => c.id === a.courseId);
    return `
      <div class="card">
        <h3>${escapeHtml(a.title)}</h3>
        <p>${escapeHtml(a.question)}</p>
        <p><strong>Curso:</strong> ${escapeHtml(c?.title || "")}</p>
        <div class="lesson-actions">
          <button class="warning-btn" onclick="editActivity('${a.id}')">Editar</button>
          <button class="danger-btn" onclick="deleteActivity('${a.id}')">Excluir</button>
        </div>
      </div>
    `;
  }).join("");
}


function renderCorrections(data) {
  const box = document.getElementById("correctionsList");
  if (!box) return;
  const courseFilter = document.getElementById("correctionCourseFilter")?.value || data.courses[0]?.id;
  const statusFilter = document.getElementById("correctionStatusFilter")?.value || "all";
  let items = [];
  data.students.forEach(student => {
    Object.entries(data.progress[student.email] || {}).forEach(([courseId, courseProgress]) => {
      if (courseFilter && courseId !== courseFilter) return;
      Object.entries(courseProgress.activities || {}).forEach(([activityId, activityProgress]) => {
        const activity = data.activities.find(a => a.id === activityId);
        const course = data.courses.find(c => c.id === courseId);
        if (!activity || !course) return;
        (activityProgress.attempts || []).forEach((attempt, attemptIndex) => {
          const status = attempt.status || "pending";
          if (statusFilter !== "all" && status !== statusFilter) return;
          items.push({ student, course, activity, attempt, attemptIndex });
        });
      });
    });
  });
  if (!items.length) {
    box.innerHTML = `<div class="empty-state-pro"><h3>Nenhuma correção encontrada</h3><p>Quando os alunos enviarem atividades, elas aparecerão aqui.</p></div>`;
    return;
  }
  box.innerHTML = items.map((item, index) => {
    const status = item.attempt.status || "pending";
    const corrected = status === "corrected";
    return `
      <div class="correction-card">
        <div class="learning-header">
          <div>
            <h3>${escapeHtml(item.activity.title)}</h3>
            <p>${escapeHtml(item.course.title)} • ${escapeHtml(item.student.name)} • tentativa ${item.attemptIndex + 1}</p>
          </div>
          <span class="learning-badge ${corrected ? "success" : "warning"}">${corrected ? "Corrigida" : "Pendente"}</span>
        </div>
        <div class="correction-meta">
          <span class="learning-badge">Aluno: ${escapeHtml(item.student.email)}</span>
          <span class="learning-badge">Enviado: ${escapeHtml(item.attempt.date || "")}</span>
        </div>
        <div class="correction-grid">
          <div class="correction-answer"><strong>Enunciado</strong><br>${escapeHtml(item.activity.question)}</div>
          <div class="correction-answer"><strong>Resposta do aluno</strong><br>${escapeHtml(item.attempt.answer)}</div>
        </div>
        <label>Nota da atividade</label>
        <input type="number" min="0" max="10" step="0.1" id="correctionGrade_${index}" value="${item.attempt.grade ?? ""}" placeholder="0 a 10" />
        <label>Comentário do professor</label>
        <textarea id="correctionComment_${index}" rows="3" placeholder="Digite o comentário da correção...">${escapeHtml(item.attempt.comment || "")}</textarea>
        <div class="lesson-actions">
          <button class="primary-btn" onclick="saveCorrection('${item.student.email}','${item.course.id}','${item.activity.id}',${item.attemptIndex},'correctionGrade_${index}','correctionComment_${index}')">Salvar correção</button>
          ${corrected ? `<button class="ghost-btn" onclick="markCorrectionPending('${item.student.email}','${item.course.id}','${item.activity.id}',${item.attemptIndex})">Marcar como pendente</button>` : ""}
        </div>
      </div>`;
  }).join("");
}

function saveCorrection(email, courseId, activityId, attemptIndex, gradeInputId, commentInputId) {
  const data = getData();
  const progress = getCourseProgress(data, email, courseId);
  const attempt = progress.activities[activityId]?.attempts?.[attemptIndex];
  if (!attempt) { toast("Tentativa não encontrada."); return; }
  const grade = Number(document.getElementById(gradeInputId).value);
  const comment = document.getElementById(commentInputId).value.trim();
  if (Number.isNaN(grade) || grade < 0 || grade > 10) { toast("Digite uma nota entre 0 e 10."); return; }
  attempt.grade = grade;
  attempt.comment = comment;
  attempt.status = "corrected";
  attempt.correctedAt = new Date().toLocaleString("pt-BR");
  saveData(data);
  renderAdmin();
  toast("Correção salva.");
}

function markCorrectionPending(email, courseId, activityId, attemptIndex) {
  const data = getData();
  const progress = getCourseProgress(data, email, courseId);
  const attempt = progress.activities[activityId]?.attempts?.[attemptIndex];
  if (!attempt) return;
  attempt.status = "pending";
  attempt.correctedAt = "";
  saveData(data);
  renderAdmin();
  toast("Atividade marcada como pendente.");
}

function saveQuizQuestion() {
  const data = getData();
  const id = document.getElementById("editingQuizId").value;
  const courseId = document.getElementById("quizCourse").value;
  const q = document.getElementById("quizQuestion").value.trim();
  const a = document.getElementById("quizA").value.trim();
  const b = document.getElementById("quizB").value.trim();
  const c = document.getElementById("quizC").value.trim();
  const d = document.getElementById("quizD").value.trim();
  const correct = document.getElementById("quizCorrect").value;

  if (!q || !a || !b || !c || !d) {
    toast("Preencha todas as alternativas.");
    return;
  }

  if (id) Object.assign(data.quiz.find(item => item.id === id), { courseId, question: q, a, b, c, d, correct });
  else data.quiz.push(createQuestion(courseId, q, a, b, c, d, correct));

  saveData(data);
  cancelQuizEdit();
  renderAdmin();
}

function cancelQuizEdit() {
  ["editingQuizId", "quizQuestion", "quizA", "quizB", "quizC", "quizD"].forEach(id => document.getElementById(id).value = "");
}

function editQuizQuestion(id) {
  const q = getData().quiz.find(q => q.id === id);
  document.getElementById("editingQuizId").value = q.id;
  document.getElementById("quizCourse").value = q.courseId;
  document.getElementById("quizQuestion").value = q.question;
  document.getElementById("quizA").value = q.a;
  document.getElementById("quizB").value = q.b;
  document.getElementById("quizC").value = q.c;
  document.getElementById("quizD").value = q.d;
  document.getElementById("quizCorrect").value = q.correct;
}

function deleteQuizQuestion(id) {
  if (!confirm("Excluir questão?")) return;
  const data = getData();
  data.quiz = data.quiz.filter(q => q.id !== id);
  saveData(data);
  renderAdmin();
}

function renderAdminQuiz(data) {
  document.getElementById("adminQuizList").innerHTML = data.quiz.map(q => {
    const c = data.courses.find(c => c.id === q.courseId);
    return `
      <div class="card">
        <h3>${escapeHtml(q.question)}</h3>
        <p>A) ${escapeHtml(q.a)}</p>
        <p>B) ${escapeHtml(q.b)}</p>
        <p>C) ${escapeHtml(q.c)}</p>
        <p>D) ${escapeHtml(q.d)}</p>
        <p><strong>Correta:</strong> ${q.correct.toUpperCase()}</p>
        <p><strong>Curso:</strong> ${escapeHtml(c?.title || "")}</p>
        <div class="lesson-actions">
          <button class="warning-btn" onclick="editQuizQuestion('${q.id}')">Editar</button>
          <button class="danger-btn" onclick="deleteQuizQuestion('${q.id}')">Excluir</button>
        </div>
      </div>
    `;
  }).join("");
}

function saveExamSettings() {
  const data = getData();
  const courseId = document.getElementById("examCourse").value;
  const time = Number(document.getElementById("examTime").value || 20);

  data.exam.settings[courseId] ??= { released: false, timeMinutes: 20 };
  data.exam.settings[courseId].timeMinutes = time;

  saveData(data);
  renderAdmin();
  toast("Tempo salvo.");
}

function toggleExamRelease() {
  const data = getData();
  const courseId = document.getElementById("examCourse").value;

  data.exam.settings[courseId] ??= { released: false, timeMinutes: 20 };
  data.exam.settings[courseId].released = !data.exam.settings[courseId].released;

  saveData(data);
  renderAdmin();
}

function saveExamQuestion(type) {
  const data = getData();
  const courseId = document.getElementById("examCourse").value;
  const prefix = type === "normal" ? "exam" : "recovery";

  const q = document.getElementById(`${prefix}Question`).value.trim();
  const a = document.getElementById(`${prefix}A`).value.trim();
  const b = document.getElementById(`${prefix}B`).value.trim();
  const c = document.getElementById(`${prefix}C`).value.trim();
  const d = document.getElementById(`${prefix}D`).value.trim();
  const correct = document.getElementById(`${prefix}Correct`).value;

  if (!q || !a || !b || !c || !d) {
    toast("Preencha tudo.");
    return;
  }

  data.exam[type].push(createQuestion(courseId, q, a, b, c, d, correct));

  [`${prefix}Question`, `${prefix}A`, `${prefix}B`, `${prefix}C`, `${prefix}D`].forEach(id => document.getElementById(id).value = "");

  saveData(data);
  renderAdmin();
}

function deleteExamQuestion(type, id) {
  if (!confirm("Excluir questão?")) return;

  const data = getData();
  data.exam[type] = data.exam[type].filter(q => q.id !== id);
  saveData(data);
  renderAdmin();
}

function renderAdminExam(data) {
  const courseId = document.getElementById("examCourse")?.value || data.courses[0].id;
  const settings = data.exam.settings[courseId] || { released: false, timeMinutes: 20 };

  document.getElementById("examTime").value = settings.timeMinutes;
  document.getElementById("examReleaseText").textContent = settings.released ? "Prova liberada." : "Prova bloqueada.";

  const normal = data.exam.normal.filter(q => q.courseId === courseId).map((q, i) => `
    <div class="card">
      <h3>Normal ${i + 1}: ${escapeHtml(q.question)}</h3>
      <p>Correta: ${q.correct.toUpperCase()}</p>
      <button class="danger-btn" onclick="deleteExamQuestion('normal','${q.id}')">Excluir</button>
    </div>
  `).join("");

  const recovery = data.exam.recovery.filter(q => q.courseId === courseId).map((q, i) => `
    <div class="card">
      <h3>Recuperação ${i + 1}: ${escapeHtml(q.question)}</h3>
      <p>Correta: ${q.correct.toUpperCase()}</p>
      <button class="danger-btn" onclick="deleteExamQuestion('recovery','${q.id}')">Excluir</button>
    </div>
  `).join("");

  document.getElementById("adminExamList").innerHTML = normal + recovery;
}

function renderStudents(data) {
  if (!data.students.length) {
    document.getElementById("studentsList").innerHTML = `<div class="card"><p>Nenhum aluno cadastrado. Crie o primeiro login acima.</p></div>`;
    return;
  }

  document.getElementById("studentsList").innerHTML = `
    <div class="card table-wrap">
      <table>
        <thead>
          <tr>
            <th>Nome</th>
            <th>E-mail/Login</th>
            <th>Senha</th>
            <th>Curso</th>
            <th>Média</th>
            <th>Status</th>
            <th>Acesso</th>
            <th>Último acesso</th>
            <th>Ação</th>
          </tr>
        </thead>
        <tbody>
          ${data.students.map(s => {
            const course = data.courses.find(c => c.id === s.selectedCourseId) || data.courses[0];
            const progress = getCourseProgress(data, s.email, course.id);
            const avg = calculateAverage(data, course.id, progress);
            const active = s.active !== false;

            return `
              <tr>
                <td>${escapeHtml(s.name)}</td>
                <td>${escapeHtml(s.email)}</td>
                <td>
                  <code id="pass_${s.id}" class="password-hidden">${escapeHtml(s.password || "sem senha")}</code>
                  <button class="ghost-btn" onclick="togglePasswordView('${s.id}')">Mostrar</button>
                </td>
                <td>${escapeHtml(course.title)}</td>
                <td>${(s.allowedCourses || [s.selectedCourseId]).length}</td>
                <td>${avg.toFixed(1)}</td>
                <td>${getStatus(avg, progress, course.passingGrade)}</td>
                <td>${active ? "Ativo" : "Bloqueado"}</td>
                <td>${escapeHtml(s.lastAccess || "Nunca acessou")}</td>
                <td>
                  <div class="lesson-actions">
                    <button class="secondary-btn" onclick="copyStudentAccess('${s.email}')">Copiar</button>
                    <button class="warning-btn" onclick="editStudentLogin('${s.email}')">Editar</button>
                    <button class="ghost-btn" onclick="toggleStudentAccess('${s.email}')">${active ? "Bloquear" : "Ativar"}</button>
                    <button class="danger-btn" onclick="deleteStudent('${s.email}')">Excluir</button>
                  </div>
                </td>
              </tr>
            `;
          }).join("")}
        </tbody>
      </table>
    </div>
  `;
}


function bulkImportStudents() {
  const data = getData();
  const text = document.getElementById("bulkStudentsText").value.trim();
  if (!text) { toast("Cole a lista de alunos."); return; }
  const courseId = document.getElementById("adminStudentCourse").value || data.courses[0].id;
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  let created = 0, ignored = 0;
  lines.forEach(line => {
    const [name, emailRaw, passwordRaw, phone = "", city = ""] = line.split(";").map(v => (v || "").trim());
    const email = (emailRaw || "").toLowerCase();
    const password = passwordRaw || generatePasswordValue();
    if (!name || !email || data.students.some(s => s.email === email)) { ignored++; return; }
    data.students.push({ id: cryptoId(), name, email, password, phone, city, selectedCourseId: courseId, active: true, createdAt: new Date().toLocaleString("pt-BR"), lastAccess: "" });
    data.courses.forEach(c => getCourseProgress(data, email, c.id));
    created++;
  });
  document.getElementById("bulkStudentsText").value = "";
  saveData(data);
  renderAdmin();
  toast(`${created} aluno(s) importado(s). ${ignored} ignorado(s).`);
}

function generatePasswordValue() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let pass = "";
  for (let i = 0; i < 8; i++) pass += chars[Math.floor(Math.random() * chars.length)];
  return pass;
}

function togglePasswordView(studentId) {
  const el = document.getElementById(`pass_${studentId}`);
  if (!el) return;
  el.classList.toggle("password-hidden");
}

function generateStudentPassword() {
  document.getElementById("adminStudentPassword").value = generatePasswordValue();
  toast("Senha gerada.");
}


function renderAllowedCoursesChecklist(data, selectedIds = []) {
  const box = document.getElementById("adminStudentAllowedCourses");
  if (!box) return;

  box.innerHTML = data.courses.map(course => `
    <label>
      <input type="checkbox" value="${course.id}" ${selectedIds.includes(course.id) ? "checked" : ""}>
      ${escapeHtml(course.title)}
    </label>
  `).join("");
}

function getAllowedCoursesFromForm() {
  return Array.from(document.querySelectorAll("#adminStudentAllowedCourses input:checked")).map(input => input.value);
}

function saveStudentLogin() {
  const data = getData();

  const editingEmail = document.getElementById("editingStudentEmail").value.trim().toLowerCase();
  const name = document.getElementById("adminStudentName").value.trim();
  const email = document.getElementById("adminStudentEmail").value.trim().toLowerCase();
  const password = document.getElementById("adminStudentPassword").value.trim();
  const phone = document.getElementById("adminStudentPhone").value.trim();
  const city = document.getElementById("adminStudentCity").value.trim();
  const selectedCourseId = document.getElementById("adminStudentCourse").value || data.courses[0].id;
  let allowedCourses = getAllowedCoursesFromForm();
  if (!allowedCourses.length) allowedCourses = [selectedCourseId];

  if (!name || !email || !password) {
    toast("Preencha nome, e-mail e senha.");
    return;
  }

  if (!isValidEmail(email)) {
    toast("Digite um e-mail válido para o aluno.");
    return;
  }

  if (password.length < 4) {
    toast("A senha do aluno precisa ter pelo menos 4 caracteres.");
    return;
  }

  const duplicate = data.students.find(s => s.email === email && s.email !== editingEmail);

  if (duplicate) {
    toast("Já existe um aluno com este e-mail.");
    return;
  }

  let student = editingEmail
    ? data.students.find(s => s.email === editingEmail)
    : null;

  if (!student) {
    student = {
      id: cryptoId(),
      createdAt: new Date().toLocaleString("pt-BR"),
      active: true,
      lastAccess: ""
    };
    data.students.push(student);
  }

  if (editingEmail && editingEmail !== email) {
    data.progress[email] = data.progress[editingEmail] || {};
    delete data.progress[editingEmail];
  }

  Object.assign(student, {
    name,
    email,
    password,
    phone,
    city,
    selectedCourseId,
    allowedCourses,
    active: student.active !== false
  });

  data.courses.forEach(c => getCourseProgress(data, email, c.id));

  saveData(data);
  cancelStudentEdit();
  renderAdmin();
  toast("Login do aluno salvo.");
}

function editStudentLogin(email) {
  const data = getData();
  const student = data.students.find(s => s.email === email);

  if (!student) return;

  document.getElementById("editingStudentEmail").value = student.email;
  document.getElementById("adminStudentName").value = student.name || "";
  document.getElementById("adminStudentEmail").value = student.email || "";
  document.getElementById("adminStudentPassword").value = student.password || "";
  document.getElementById("adminStudentPhone").value = student.phone || "";
  document.getElementById("adminStudentCity").value = student.city || "";
  document.getElementById("adminStudentCourse").value = student.selectedCourseId || data.courses[0].id;
  renderAllowedCoursesChecklist(data, student.allowedCourses || [student.selectedCourseId || data.courses[0].id]);

  window.scrollTo({ top: 0, behavior: "smooth" });
}

function cancelStudentEdit() {
  [
    "editingStudentEmail",
    "adminStudentName",
    "adminStudentEmail",
    "adminStudentPassword",
    "adminStudentPhone",
    "adminStudentCity"
  ].forEach(id => document.getElementById(id).value = "");
}

function copyTextSmart(text) {
  if (navigator.clipboard && window.isSecureContext) {
    return navigator.clipboard.writeText(text);
  }

  return new Promise((resolve, reject) => {
    try {
      const area = document.createElement("textarea");
      area.value = text;
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.focus();
      area.select();
      document.execCommand("copy");
      area.remove();
      resolve();
    } catch (error) {
      reject(error);
    }
  });
}

function copyStudentAccess(email) {
  const data = getData();
  const student = data.students.find(s => s.email === email);

  if (!student) return;

  const course = data.courses.find(c => c.id === student.selectedCourseId) || data.courses[0];

  const text = `Olá, ${student.name}!

Seu acesso ao curso foi criado.

Curso: ${course.title}
Login: ${student.email}
Senha: ${student.password}

Acesse o site e entre na Área do aluno.`;

  copyTextSmart(text)
    .then(() => toast("Dados de acesso copiados."))
    .catch(() => {
      prompt("Copie os dados de acesso:", text);
    });
}

function toggleStudentAccess(email) {
  const data = getData();
  const student = data.students.find(s => s.email === email);

  if (!student) return;

  student.active = student.active === false ? true : false;

  saveData(data);
  renderAdmin();
  toast(student.active ? "Aluno ativado." : "Aluno bloqueado.");
}

function deleteStudent(email) {
  if (!confirm("Excluir aluno e progresso?")) return;

  const data = getData();

  data.students = data.students.filter(s => s.email !== email);
  delete data.progress[email];

  saveData(data);
  renderAdmin();
}


function renderPayments(data) {
  const box = document.getElementById("paymentsList");
  if (!box) return;

  let rows = [];

  data.students.forEach(student => {
    data.courses.forEach(course => {
      const payment = ensurePayment(data, student.email, course.id);
      rows.push({ student, course, payment });
    });
  });

  if (!rows.length) {
    box.innerHTML = `<div class="empty-state-pro"><h3>Nenhum aluno cadastrado</h3><p>Crie alunos para controlar pagamentos.</p></div>`;
    return;
  }

  box.innerHTML = rows.map(item => `
    <div class="payment-card">
      <div class="learning-header">
        <div>
          <h3>${escapeHtml(item.student.name)}</h3>
          <p>${escapeHtml(item.course.title)} • ${escapeHtml(item.student.email)}</p>
        </div>
        <span class="payment-status ${item.payment.status}">${paymentStatusText(item.payment.status)}</span>
      </div>

      <p><strong>Preço:</strong> ${escapeHtml(item.course.price || "Grátis")}</p>
      <p><strong>Chave Pix:</strong> ${escapeHtml(item.course.pix || "Não informada")}</p>

      <label>Comprovante/observação do pagamento</label>
      <textarea id="paymentProof_${item.student.id}_${item.course.id}" rows="3">${escapeHtml(item.payment.proof || "")}</textarea>

      <div class="lesson-actions">
        <button class="success-btn" onclick="setPaymentStatus('${item.student.email}','${item.course.id}','paid','paymentProof_${item.student.id}_${item.course.id}')">Marcar pago e liberar</button>
        <button class="warning-btn" onclick="setPaymentStatus('${item.student.email}','${item.course.id}','pending','paymentProof_${item.student.id}_${item.course.id}')">Pendente</button>
        <button class="danger-btn" onclick="setPaymentStatus('${item.student.email}','${item.course.id}','blocked','paymentProof_${item.student.id}_${item.course.id}')">Bloquear</button>
      </div>
    </div>
  `).join("");
}

function paymentStatusText(status) {
  const map = {
    pending: "Aguardando pagamento",
    paid: "Pago/liberado",
    blocked: "Bloqueado"
  };
  return map[status] || "Pendente";
}

function setPaymentStatus(email, courseId, status, proofInputId) {
  const data = getData();
  const payment = ensurePayment(data, email, courseId);

  payment.status = status;
  payment.proof = document.getElementById(proofInputId)?.value || "";
  payment.updatedAt = new Date().toLocaleString("pt-BR");

  const student = data.students.find(s => s.email === email);
  if (student) {
    student.allowedCourses ??= [student.selectedCourseId];
    if (status === "paid" && !student.allowedCourses.includes(courseId)) {
      student.allowedCourses.push(courseId);
    }
    if (status === "blocked") {
      student.allowedCourses = student.allowedCourses.filter(id => id !== courseId);
    }
  }

  addNotification(data, email, {
    title: status === "paid" ? "Curso liberado" : status === "blocked" ? "Curso bloqueado" : "Pagamento pendente",
    message: `Status do curso atualizado: ${paymentStatusText(status)}.`,
    courseId
  });

  saveData(data);
  renderAdmin();
  toast("Pagamento atualizado.");
}

function addNotification(data, email, payload) {
  data.notifications ??= {};
  data.notifications[email] ??= [];
  data.notifications[email].push({
    id: cryptoId(),
    title: payload.title,
    message: payload.message,
    courseId: payload.courseId,
    read: false,
    date: new Date().toLocaleString("pt-BR"),
    timestamp: Date.now()
  });
}

function saveNotice() {
  const data = getData();
  const courseId = document.getElementById("noticeCourse").value;
  const title = document.getElementById("noticeTitle").value.trim();
  const message = document.getElementById("noticeMessage").value.trim();

  if (!title || !message) {
    toast("Preencha título e mensagem.");
    return;
  }

  data.notices ??= [];
  data.notices.push({
    id: cryptoId(),
    courseId,
    title,
    message,
    date: new Date().toLocaleString("pt-BR"),
    timestamp: Date.now()
  });

  document.getElementById("noticeTitle").value = "";
  document.getElementById("noticeMessage").value = "";

  saveData(data);
  renderAdmin();
  toast("Aviso publicado.");
}

function renderNotices(data) {
  const box = document.getElementById("noticesList");
  if (!box) return;

  if (!data.notices?.length) {
    box.innerHTML = `<div class="empty-state-pro"><h3>Nenhum aviso</h3><p>Publique avisos para os alunos.</p></div>`;
    return;
  }

  box.innerHTML = data.notices.map(notice => {
    const course = data.courses.find(c => c.id === notice.courseId);
    return `
      <div class="notification-card">
        <h3>${escapeHtml(notice.title)}</h3>
        <p>${escapeHtml(notice.message)}</p>
        <p><strong>Curso:</strong> ${escapeHtml(course?.title || "")}</p>
        <small>${escapeHtml(notice.date || "")}</small>
        <div class="lesson-actions">
          <button class="danger-btn" onclick="deleteNotice('${notice.id}')">Excluir</button>
        </div>
      </div>
    `;
  }).join("");
}

function deleteNotice(id) {
  const data = getData();
  data.notices = (data.notices || []).filter(n => n.id !== id);
  saveData(data);
  renderAdmin();
}

function changeAdminPassword() {
  const data = getData();
  const pass = document.getElementById("newAdminPassword").value.trim();

  if (pass.length < 4) {
    toast("Senha muito curta.");
    return;
  }

  data.settings.adminPassword = pass;
  document.getElementById("newAdminPassword").value = "";
  saveData(data);
  toast("Senha alterada.");
}

function exportData() {
  const data = getData();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "backup-curso-pro-3.json";
  a.click();
  URL.revokeObjectURL(url);
}

function importData(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      saveData(data);
      renderAdmin();
      toast("Backup importado.");
    } catch {
      toast("Arquivo inválido.");
    }
  };
  reader.readAsText(file);
}

function clearAllData() {
  if (!confirm("Apagar todos os dados?")) return;
  backupBeforeDangerousAction();
  localStorage.removeItem("cursoProDataV3");
  localStorage.removeItem("currentStudentV3");
  localStorage.removeItem("adminLoggedV3");
  getData();
  showPage("landingPage");
  toast("Dados apagados.");
}


function lessonStatusText(status) {
  const map = {
    published: "Publicada",
    draft: "Rascunho",
    locked: "Bloqueada"
  };
  return map[status] || "Publicada";
}

function downloadCSV(filename, rows) {
  const csv = rows.map(row =>
    row.map(value => `"${String(value ?? "").replaceAll('"', '""')}"`).join(";")
  ).join("\n");

  const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");

  a.href = url;
  a.download = filename;
  a.click();

  URL.revokeObjectURL(url);
}

function exportStudentsCSV() {
  const data = getData();

  const rows = [
    ["Nome", "Email", "Senha", "Telefone", "Cidade", "Curso selecionado", "Ativo", "Criado em", "Último acesso"]
  ];

  data.students.forEach(s => {
    const course = data.courses.find(c => c.id === s.selectedCourseId);
    rows.push([
      s.name,
      s.email,
      s.password,
      s.phone || "",
      s.city || "",
      course?.title || "",
      s.active === false ? "Não" : "Sim",
      s.createdAt || "",
      s.lastAccess || ""
    ]);
  });

  downloadCSV("relatorio-alunos.csv", rows);
}

function exportGradesCSV() {
  const data = getData();

  const rows = [
    ["Aluno", "Email", "Curso", "Quiz", "Prova normal", "Recuperação", "Média final", "Status"]
  ];

  data.students.forEach(s => {
    data.courses.forEach(course => {
      const progress = getCourseProgress(data, s.email, course.id);
      const quiz = progress.quizAttempts.length ? Math.max(...progress.quizAttempts.map(a => a.grade)) : 0;
      const normal = progress.examNormal?.grade || 0;
      const recovery = progress.examRecovery?.grade || 0;
      const avg = calculateAverage(data, course.id, progress);

      rows.push([
        s.name,
        s.email,
        course.title,
        quiz.toFixed(1),
        normal.toFixed(1),
        recovery.toFixed(1),
        avg.toFixed(1),
        getStatus(avg, progress, course.passingGrade)
      ]);
    });
  });

  downloadCSV("relatorio-notas.csv", rows);
}


function exportPaymentsCSV() {
  const data = getData();
  const rows = [["Aluno", "Email", "Curso", "Preço", "Status", "Comprovante", "Atualizado em"]];

  data.students.forEach(student => {
    data.courses.forEach(course => {
      const payment = ensurePayment(data, student.email, course.id);
      rows.push([
        student.name,
        student.email,
        course.title,
        course.price || "Grátis",
        paymentStatusText(payment.status),
        payment.proof || "",
        payment.updatedAt || ""
      ]);
    });
  });

  downloadCSV("relatorio-pagamentos.csv", rows);
}

function exportProgressCSV() {
  const data = getData();

  const rows = [
    ["Aluno", "Email", "Curso", "Aulas concluídas", "Total de aulas", "Progresso %", "Favoritos", "Anotações"]
  ];

  data.students.forEach(s => {
    data.courses.forEach(course => {
      const progress = getCourseProgress(data, s.email, course.id);
      const lessons = courseLessons(data, course.id, true);
      const total = lessons.length;
      const completed = progress.completedLessons.length;
      const percent = total ? Math.round((completed / total) * 100) : 0;

      rows.push([
        s.name,
        s.email,
        course.title,
        completed,
        total,
        percent + "%",
        progress.favoriteLessons.length,
        Object.keys(progress.lessonNotes || {}).length
      ]);
    });
  });

  downloadCSV("relatorio-progresso.csv", rows);
}



function validateCertificate() {
  const data = getData();
  const code = document.getElementById("certificateCodeInput").value.trim().toUpperCase();
  const result = document.getElementById("certificateValidationResult");
  if (!code) { toast("Digite o código."); return; }
  let found = null;
  data.students.forEach(student => {
    data.courses.forEach(course => {
      const expected = certificateCode(student, course).toUpperCase();
      if (expected === code) {
        const progress = getCourseProgress(data, student.email, course.id);
        const avg = calculateAverage(data, course.id, progress);
        const status = getStatus(avg, progress, course.passingGrade);
        if (status === "Aprovado") found = { student, course, avg, status };
      }
    });
  });
  if (!found) {
    result.innerHTML = `<div class="validation-error"><strong>Certificado não encontrado ou não aprovado.</strong><br>Verifique se o código está correto e se os dados estão neste navegador.</div>`;
    return;
  }
  result.innerHTML = `<div class="validation-success"><strong>Certificado válido</strong><p><strong>Aluno:</strong> ${escapeHtml(found.student.name)}</p><p><strong>Curso:</strong> ${escapeHtml(found.course.title)}</p><p><strong>Instituição:</strong> ${escapeHtml(found.course.institution || "Não informada")}</p><p><strong>Carga horária:</strong> ${escapeHtml(found.course.hours || "Não informada")}</p><p><strong>Média:</strong> ${found.avg.toFixed(1)}</p><p><strong>Código:</strong> ${certificateCode(found.student, found.course)}</p></div>`;
}


function safeGetElement(id) {
  return document.getElementById(id);
}

function showLoading() {
  const el = safeGetElement("appLoading");
  if (el) el.classList.remove("hidden");
}

function hideLoading() {
  const el = safeGetElement("appLoading");
  if (el) el.classList.add("hidden");
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || "").trim());
}

function safeNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function clampGrade(value) {
  return Math.min(10, Math.max(0, safeNumber(value, 0)));
}

function notifyAndReturn(message) {
  toast(message);
  return false;
}

function backupBeforeDangerousAction() {
  try {
    localStorage.setItem("cursoProDataV3_backup_auto", localStorage.getItem("cursoProDataV3") || "");
  } catch (e) {}
}

function runSystemCheck() {
  const data = getData();
  const result = safeGetElement("systemCheckResult");
  if (!result) return;

  const checks = [];

  checks.push({
    label: "Cursos cadastrados",
    ok: data.courses.length > 0,
    detail: `${data.courses.length} curso(s)`
  });

  checks.push({
    label: "Módulos cadastrados",
    ok: data.modules.length > 0,
    detail: `${data.modules.length} módulo(s)`
  });

  checks.push({
    label: "Aulas cadastradas",
    ok: data.lessons.length > 0,
    detail: `${data.lessons.length} aula(s)`
  });

  checks.push({
    label: "Alunos cadastrados",
    ok: data.students.length > 0,
    warn: true,
    detail: `${data.students.length} aluno(s)`
  });

  const badStudents = data.students.filter(s => !s.email || !s.password || !s.name);
  checks.push({
    label: "Logins de alunos",
    ok: badStudents.length === 0,
    detail: badStudents.length ? `${badStudents.length} aluno(s) com dados incompletos` : "Todos completos"
  });

  const pendingPayments = typeof countPendingPayments === "function" ? countPendingPayments(data) : 0;
  checks.push({
    label: "Pagamentos pendentes",
    ok: pendingPayments === 0,
    warn: pendingPayments > 0,
    detail: `${pendingPayments} pendente(s)`
  });

  const pendingCorrections = typeof countPendingCorrections === "function" ? countPendingCorrections(data) : 0;
  checks.push({
    label: "Correções pendentes",
    ok: pendingCorrections === 0,
    warn: pendingCorrections > 0,
    detail: `${pendingCorrections} pendente(s)`
  });

  result.innerHTML = `
    <div class="system-check-list">
      ${checks.map(check => {
        const cls = check.ok ? "ok" : check.warn ? "warn" : "bad";
        const status = check.ok ? "OK" : check.warn ? "Atenção" : "Corrigir";
        return `
          <div class="system-check-item ${cls}">
            <span>${check.label}<br><small>${check.detail}</small></span>
            <strong>${status}</strong>
          </div>
        `;
      }).join("")}
    </div>
  `;

  toast("Verificação concluída.");
}

function repairLocalData() {
  const data = getData();

  data.courses.forEach(course => {
    course.teacher ??= "";
    course.institution ??= "";
    course.passingGrade = safeNumber(course.passingGrade, 7);
    course.price ??= "Grátis";
    course.pix ??= "";
    course.logo ??= "";
  });

  data.students.forEach(student => {
    student.email = normalizeEmail(student.email);
    student.active = student.active !== false;
    student.allowedCourses ??= [student.selectedCourseId || data.courses[0]?.id].filter(Boolean);
    if (!student.selectedCourseId || !data.courses.some(c => c.id === student.selectedCourseId)) {
      student.selectedCourseId = student.allowedCourses[0] || data.courses[0]?.id;
    }
  });

  data.lessons.forEach(lesson => {
    lesson.status ??= "published";
    if (!data.courses.some(c => c.id === lesson.courseId)) lesson.courseId = data.courses[0]?.id;
    const modules = data.modules.filter(m => m.courseId === lesson.courseId);
    if (!modules.some(m => m.id === lesson.moduleId)) lesson.moduleId = modules[0]?.id;
  });

  data.students.forEach(student => {
    data.courses.forEach(course => {
      getCourseProgress(data, student.email, course.id);
      if (typeof ensurePayment === "function") ensurePayment(data, student.email, course.id);
    });
  });

  saveData(data);
  renderAdmin();
  toast("Dados locais reparados.");
}



/* ============================
   CURSOPRO 5.0 - GOOGLE SHEETS TEMPO REAL
============================ */

let REMOTE_API_URL = localStorage.getItem("cursoProRemoteApiUrl") || "";
let REMOTE_ENABLED = Boolean(REMOTE_API_URL);
let REMOTE_LOADING = false;
let REMOTE_LAST_SYNC = localStorage.getItem("cursoProRemoteLastSync") || "";
let REMOTE_SAVE_TIMER = null;

function setSyncIndicator(status, text) {
  const el = document.getElementById("syncIndicator");
  if (!el) return;

  el.className = `sync-indicator ${status}`;
  el.textContent = text;
}

function updateRemoteStatusBox(message, status = "offline") {
  const box = document.getElementById("remoteStatusBox");
  if (!box) return;

  box.classList.remove("remote-online", "remote-offline", "remote-error");
  box.classList.add(status === "online" ? "remote-online" : status === "error" ? "remote-error" : "remote-offline");
  box.innerHTML = message;
}

function getRemoteApiUrl() {
  return localStorage.getItem("cursoProRemoteApiUrl") || REMOTE_API_URL || "";
}

function saveRemoteApiUrl() {
  const input = document.getElementById("remoteApiUrlInput");
  const url = (input?.value || "").trim();

  if (!url || !url.startsWith("https://script.google.com/")) {
    toast("Cole uma URL válida do Google Apps Script.");
    return;
  }

  REMOTE_API_URL = url;
  REMOTE_ENABLED = true;
  localStorage.setItem("cursoProRemoteApiUrl", url);
  updateRemoteStatusBox("Status: URL salva. Clique em testar conexão.", "offline");
  setSyncIndicator("offline", "Sheets");
  toast("URL salva.");
}

function disableRemoteSync() {
  if (!confirm("Desativar sincronização em tempo real neste navegador?")) return;

  REMOTE_API_URL = "";
  REMOTE_ENABLED = false;
  localStorage.removeItem("cursoProRemoteApiUrl");
  updateRemoteStatusBox("Status: sincronização desativada. Usando apenas dados locais.", "offline");
  setSyncIndicator("offline", "Local");
  toast("Tempo real desativado.");
}

async function remoteRequest(action, payload = {}) {
  const url = getRemoteApiUrl();

  if (!url) throw new Error("URL do Apps Script não configurada.");

  const body = JSON.stringify({
    action,
    secret: localStorage.getItem("cursoProRemoteSecret") || "",
    payload
  });

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "text/plain;charset=utf-8"
    },
    body
  });

  const text = await response.text();

  let json;
  try {
    json = JSON.parse(text);
  } catch (error) {
    throw new Error("Resposta inválida do Apps Script: " + text.slice(0, 120));
  }

  if (!json.ok) {
    throw new Error(json.error || "Erro na API.");
  }

  return json;
}

async function loadRemoteData() {
  if (!REMOTE_ENABLED || REMOTE_LOADING) return false;

  REMOTE_LOADING = true;
  setSyncIndicator("offline", "Sincronizando...");

  try {
    const result = await remoteRequest("getData", {});
    if (result.data) {
      localStorage.setItem("cursoProDataV3", JSON.stringify(result.data));
      REMOTE_LAST_SYNC = new Date().toLocaleString("pt-BR");
      localStorage.setItem("cursoProRemoteLastSync", REMOTE_LAST_SYNC);
    }

    setSyncIndicator("online", "Online");
    updateRemoteStatusBox(`Status: conectado ao Google Sheets.<br>Última sincronização: ${REMOTE_LAST_SYNC || "agora"}`, "online");
    return true;
  } catch (error) {
    console.warn("Erro ao carregar dados remotos:", error);
    setSyncIndicator("error", "Offline");
    updateRemoteStatusBox(`Status: erro na conexão.<br>${escapeHtml(error.message)}<br>O sistema continuará usando dados locais.`, "error");
    return false;
  } finally {
    REMOTE_LOADING = false;
  }
}

function scheduleRemoteSave(data) {
  if (!REMOTE_ENABLED) return;

  clearTimeout(REMOTE_SAVE_TIMER);
  REMOTE_SAVE_TIMER = setTimeout(() => {
    saveRemoteData(data);
  }, 600);
}

async function saveRemoteData(data) {
  if (!REMOTE_ENABLED) return false;

  try {
    await remoteRequest("saveData", { data });
    REMOTE_LAST_SYNC = new Date().toLocaleString("pt-BR");
    localStorage.setItem("cursoProRemoteLastSync", REMOTE_LAST_SYNC);
    setSyncIndicator("online", "Online");
    updateRemoteStatusBox(`Status: dados salvos no Google Sheets.<br>Última sincronização: ${REMOTE_LAST_SYNC}`, "online");
    return true;
  } catch (error) {
    console.warn("Erro ao salvar remoto:", error);
    setSyncIndicator("error", "Pendente");
    updateRemoteStatusBox(`Status: não foi possível salvar online.<br>${escapeHtml(error.message)}<br>Os dados continuam salvos localmente.`, "error");
    return false;
  }
}

async function testRemoteConnection() {
  const input = document.getElementById("remoteApiUrlInput");
  const url = (input?.value || getRemoteApiUrl()).trim();

  if (!url) {
    toast("Cole a URL do Apps Script.");
    return;
  }

  REMOTE_API_URL = url;
  REMOTE_ENABLED = true;
  localStorage.setItem("cursoProRemoteApiUrl", url);

  showLoading();

  try {
    const result = await remoteRequest("ping", {});
    setSyncIndicator("online", "Online");
    updateRemoteStatusBox(`Status: conexão OK.<br>${escapeHtml(result.message || "Apps Script respondeu corretamente.")}`, "online");
    toast("Conexão funcionando.");
  } catch (error) {
    setSyncIndicator("error", "Erro");
    updateRemoteStatusBox(`Status: erro no teste.<br>${escapeHtml(error.message)}`, "error");
    toast("Erro ao testar conexão.");
  } finally {
    hideLoading();
  }
}

async function forceSyncNow() {
  if (!getRemoteApiUrl()) {
    toast("Configure a URL do Apps Script primeiro.");
    return;
  }

  showLoading();

  try {
    await loadRemoteData();
    const data = getData();
    await saveRemoteData(data);
    renderAfterRemoteSync();
    toast("Sincronização concluída.");
  } finally {
    hideLoading();
  }
}

function renderAfterRemoteSync() {
  if (localStorage.getItem("adminLoggedV3") === "true") {
    renderAdmin();
  } else if (localStorage.getItem("currentStudentV3")) {
    renderStudent();
  }
}

function initRemoteSettingsUI() {
  const input = document.getElementById("remoteApiUrlInput");
  if (input) input.value = getRemoteApiUrl();

  if (getRemoteApiUrl()) {
    updateRemoteStatusBox(`Status: URL configurada.<br>Última sincronização: ${REMOTE_LAST_SYNC || "ainda não sincronizado"}`, "offline");
    setSyncIndicator("offline", "Sheets");
  } else {
    updateRemoteStatusBox("Status: usando dados locais até configurar a URL.", "offline");
    setSyncIndicator("offline", "Local");
  }
}


async function boot() {
  getData();
  initRemoteSettingsUI();

  if (getRemoteApiUrl()) {
    showLoading();
    await loadRemoteData();
    hideLoading();
  }

  getData();

  if (localStorage.getItem("adminLoggedV3") === "true") {
    showPage("adminApp");
    renderAdmin();
    return;
  }

  if (localStorage.getItem("currentStudentV3")) {
    showPage("studentApp");
    renderStudent();
    return;
  }

  showPage("landingPage");
}

boot();

console.log("CursoPro 5.0 tempo real carregado com sucesso.");
