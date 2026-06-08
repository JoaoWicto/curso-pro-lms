# CursoPro 3.0 - GitHub Pages sem backend

Site completo de cursos online feito com HTML, CSS e JavaScript.

## Recursos

- Vários cursos
- Módulos por curso
- Videoaulas
- Suporte a YouTube
- Suporte a link direto MP4/WebM/OGG
- Suporte a vídeo local
- Preview de vídeo no painel admin
- Thumbnail de curso e aula
- Editar, duplicar, excluir e ordenar aulas
- Atividades com 2 tentativas
- Quiz com 4 alternativas
- Quiz com 2 tentativas
- Prova normal com 1 tentativa
- Cronômetro na prova
- Recuperação
- Certificado com código
- Menu inferior no celular
- Tema claro/escuro
- Backup e importação de dados
- Troca de senha do admin

## Senha padrão

```txt
admin123
```

## Como publicar

1. Envie os arquivos para o GitHub.
2. Vá em Settings > Pages.
3. Escolha a branch main.
4. Salve.

## Observação

Sem backend, os dados ficam salvos no navegador usando localStorage.


## Login dos alunos

Nesta versão, o aluno não cria a própria conta.

Fluxo correto:

1. O administrador entra no painel.
2. Vai em `Alunos`.
3. Cria o nome, e-mail e senha do aluno.
4. Copia os dados de acesso.
5. Envia para o aluno por WhatsApp, e-mail ou mensagem.
6. O aluno entra usando e-mail e senha.

Como o site não usa backend, esses logins ficam salvos no navegador onde o admin criou os dados.


## Versão 4.1 - Quiz e atividades profissionais

Melhorias visuais adicionadas:

- Cards profissionais para atividades
- Status de tentativas
- Histórico de respostas
- Área de resposta mais elegante
- Quiz com layout premium
- Alternativas em formato de botão
- Destaque visual na alternativa selecionada
- Tela de resultado do quiz melhorada
- Melhor visual no celular


## Versão 4.2

Novas melhorias:

- Sala da aula dedicada
- Botão para abrir aula em modo estudo
- Anotações do aluno por aula
- Favoritar aulas
- Aba de aulas favoritas
- Navegação aula anterior/próxima
- Status da aula: publicada, rascunho ou bloqueada
- O aluno só vê aulas publicadas
- Dashboard do aluno mais completo
- Relatórios CSV:
  - alunos
  - notas
  - progresso
- Correção do cronômetro da prova


## Versão 4.3 - EAD profissional

Novas funções:

- Correção manual das atividades
- Aba de correções pendentes no admin
- Nota e comentário do professor
- Atividades ficam pendentes até correção
- Nota mínima configurável por curso
- Professor e instituição por curso
- Certificado com professor, instituição e assinatura
- Validação de certificado por código
- Importação de alunos em massa
- Senha dos alunos ocultada por padrão na tabela


## Versão 4.4 - Plataforma EAD completa

Novas funções:

- Liberação de cursos por aluno
- Controle de pagamento manual/Pix
- Status de pagamento: pendente, pago/liberado e bloqueado
- Curso só libera após estar permitido e aprovado
- Página de detalhes do curso
- Perfil do aluno
- Notificações internas
- Avisos do professor por curso
- Dashboard admin com pagamentos pendentes
- Certificado com logo e QR Code visual
- Relatório CSV de pagamentos
- Melhor controle de acesso sem Firebase/Supabase

Observação: como ainda é GitHub Pages sem backend, os dados continuam salvos no navegador.


## CursoPro 4.5 - Correção final e polimento profissional

Esta versão foca em estabilidade, acabamento visual e revisão geral.

Melhorias adicionadas:

- Verificação de sintaxe do JavaScript
- Reparador de dados locais
- Verificação do sistema no painel admin
- Backup automático antes de ações perigosas
- Tratamento para dados locais corrompidos
- Validação melhor de e-mail e senha
- Melhor compatibilidade ao copiar login/senha
- Melhorias visuais gerais
- Loading overlay
- Cards de destaque na página inicial
- Melhor foco/acessibilidade em botões e campos
- Polimento no mobile
- Animações leves
- Melhor prevenção de ações inválidas

Fluxo recomendado para testar:

1. Entrar no admin com `admin123`
2. Criar um curso
3. Criar um aluno
4. Liberar curso para o aluno
5. Marcar pagamento como pago/liberado
6. Entrar como aluno
7. Assistir aula
8. Enviar atividade
9. Fazer quiz/prova
10. Gerar certificado
11. Validar certificado pelo código


## CursoPro 5.0 - Tempo real grátis

Esta versão adiciona controle online gratuito usando:

- Google Sheets
- Google Apps Script
- GitHub Pages

Leia o arquivo:

```txt
CONFIGURAR_TEMPO_REAL_GOOGLE_SHEETS.md
```

E copie o código:

```txt
google-apps-script/Code.gs
```

Depois cole a URL do Apps Script no painel admin do site.

## Vantagem

Agora você pode mandar o link para os alunos e acompanhar os dados centralizados na sua planilha Google.

## Observação

Continua sem Firebase, sem Supabase e sem pagar hospedagem.


## CursoPro 5.1 - Correção do erro CORS

Esta versão corrige o erro:

```txt
Access to fetch at script.google.com has been blocked by CORS policy
```

Correção aplicada:

- Leitura/teste via JSONP.
- Salvamento via formulário invisível em iframe.
- Não usa `fetch` direto para o Apps Script.
- Continua gratuito com Google Sheets.
