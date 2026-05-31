
# CursoPro LMS — Produção Gratuita

Versão preparada para publicar gratuitamente com:

- Render para o backend Node.js
- Supabase ou Neon para PostgreSQL
- Cloudinary para uploads de PDFs, imagens, vídeos e comprovantes
- Pix manual com chave e QR Code cadastrados por você
- Aprovação manual no painel admin
- Multi-cursos
- Aulas com PDF/vídeo
- Quiz por aula
- Certificado com código de validação
- Relatórios administrativos

## Login admin padrão

```txt
E-mail: admin@curso.local
Senha: admin123
```

Troque isso nas variáveis de ambiente do Render.

---

# Tutorial de publicação gratuita

## Parte 1 — Criar banco PostgreSQL grátis no Supabase

1. Acesse https://supabase.com
2. Crie uma conta.
3. Clique em New Project.
4. Escolha nome, senha do banco e região.
5. Depois que criar, vá em:
   - Project Settings
   - Database
   - Connection string
6. Copie a string de conexão.
7. Use a conexão do pooler se o Render tiver problema com IPv6.

A variável será:

```txt
DATABASE_URL=sua_url_postgres
```

---

## Parte 2 — Criar Cloudinary grátis para uploads

1. Acesse https://cloudinary.com
2. Crie conta grátis.
3. No Dashboard, copie:
   - Cloud name
   - API Key
   - API Secret

No Render, você vai usar:

```txt
CLOUDINARY_CLOUD_NAME=seu_cloud_name
CLOUDINARY_API_KEY=sua_api_key
CLOUDINARY_API_SECRET=sua_api_secret
```

Se não configurar Cloudinary, o sistema salva em `/uploads`, mas no Render grátis isso não é ideal para produção.

---

## Parte 3 — Testar no computador

1. Instale Node.js 20 ou superior.
2. Abra o terminal na pasta do projeto.
3. Rode:

```bash
npm install
```

4. Copie `.env.example` para `.env`.

No Windows:

```bash
copy .env.example .env
```

5. Preencha o `.env`.

Exemplo:

```txt
PORT=3000
NODE_ENV=development
JWT_SECRET=uma_chave_grande
DATABASE_URL=sua_url_do_supabase
ADMIN_EMAIL=admin@curso.local
ADMIN_PASSWORD=admin123
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
```

6. Inicialize o banco:

```bash
npm run init-db
```

7. Rode:

```bash
npm start
```

8. Acesse:

```txt
http://localhost:3000
```

---

## Parte 4 — Publicar no Render sem usar GitHub

Você pode publicar pelo Render usando upload/Blueprint ou conectando repositório. O modo mais estável costuma ser via GitHub, mas sem GitHub você pode:

1. Criar conta em https://render.com
2. Criar um novo Web Service usando opção de deploy manual/Blueprint quando disponível.
3. Enviar este projeto compactado ou usar `render.yaml`.
4. Configurar:

```txt
Build Command:
npm install && npm run init-db

Start Command:
npm start
```

5. Variáveis obrigatórias:

```txt
NODE_ENV=production
JWT_SECRET=coloque_uma_chave_grande
DATABASE_URL=sua_url_postgres
ADMIN_EMAIL=seu_email_admin
ADMIN_PASSWORD=sua_senha_admin
CLOUDINARY_CLOUD_NAME=seu_cloud
CLOUDINARY_API_KEY=sua_key
CLOUDINARY_API_SECRET=sua_secret
```

6. Clique em Deploy.

---

## Parte 5 — Configurar Pix manual

1. Entre como admin.
2. Vá em Configurações.
3. Coloque sua chave Pix.
4. Envie a imagem do QR Code Pix gerado por você.
5. Salve.

Fluxo:
- aluno compra
- aluno vê chave/QR Pix
- aluno envia comprovante
- admin aprova
- sistema libera o curso automaticamente

---

## Parte 6 — O que não subir publicamente

Nunca compartilhe:

```txt
.env
JWT_SECRET
DATABASE_URL
CLOUDINARY_API_SECRET
senha admin real
```

---

# Observações importantes

- Render grátis pode "dormir" quando fica sem uso.
- Supabase/Neon ficam responsáveis pelo banco.
- Cloudinary guarda os arquivos fora do Render, melhor para vídeos e PDFs.
- Para muitos alunos, use plano pago futuramente.


## Versão definitiva visual limpa

Esta versão refez o frontend do zero:
- login corrigido
- telas não somem
- interface limpa para PC e mobile
- admin organizado
- aluno organizado
- Pix, comprovante, aulas, PDF, vídeo, quiz e certificado mantidos

Para publicar:
```bash
git add .
git commit -m "frontend limpo definitivo"
git push
```
Depois, no Render, clique em Deploy Latest Commit.
