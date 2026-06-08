# CursoPro 5.0 - Configurar tempo real grátis com Google Sheets

Esta versão usa:

- GitHub Pages para hospedar o site.
- Google Sheets como banco de dados.
- Google Apps Script como API gratuita.

## Passo 1 - Criar a planilha

1. Abra o Google Sheets.
2. Crie uma planilha nova.
3. Nomeie como `CursoPro Banco de Dados`.

## Passo 2 - Criar o Apps Script

1. Na planilha, clique em `Extensões`.
2. Clique em `Apps Script`.
3. Apague o código que aparece.
4. Copie o arquivo:

```txt
google-apps-script/Code.gs
```

5. Cole no Apps Script.
6. Clique em salvar.

## Passo 3 - Implantar como Web App

1. Clique em `Implantar`.
2. Clique em `Nova implantação`.
3. Em tipo, escolha `App da Web`.
4. Em `Executar como`, escolha `Eu`.
5. Em `Quem tem acesso`, escolha `Qualquer pessoa`.
6. Clique em `Implantar`.
7. Autorize com sua conta Google.
8. Copie a URL que termina com `/exec`.

## Passo 4 - Conectar no CursoPro

1. Abra o site CursoPro.
2. Entre como admin.
3. Vá em `Configurações`.
4. Cole a URL no campo `URL do Apps Script Web App`.
5. Clique em `Salvar URL`.
6. Clique em `Testar conexão`.
7. Clique em `Sincronizar agora`.

## O que passa a funcionar online

- Alunos criados pelo admin.
- Login dos alunos.
- Cursos.
- Aulas.
- Pagamentos.
- Atividades.
- Quiz.
- Provas.
- Certificados.
- Relatórios.
- Progresso dos alunos.

## Importante

O Google Apps Script tem cotas de uso. Para um curso pequeno ou médio, funciona bem. Se você tiver muitos alunos acessando ao mesmo tempo, pode atingir limites do Google.
