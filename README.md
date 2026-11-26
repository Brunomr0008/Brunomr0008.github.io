# Portal — LEIA-ME (fase 1.1)

> Guia completo e ilustrado: os PDFs "Portal - Guias". Este ficheiro é o resumo técnico.

O Portal abre e gere as tuas apps (as que fazes nos chats do Claude). Guarda tudo no teu Google Drive e funciona sem internet.

**Na fase 1 já funciona:**
- o Portal instala-se como app e funciona sem internet;
- desbloqueio com PIN ou palavra-passe;
- entrar com Google e criar a pasta `Portal/` no Drive;
- juntar e atualizar apps (pasta, .zip ou só o `index.html`), com envio para o Drive e as versões antigas em `versoes/`;
- abrir as apps dentro do Portal.

**Ainda não funciona:** as apps guardarem dados. Isso é a gaveta `window.claude` (fase 2). Até lá, o Estúdio abre mas esquece o que fizeres ao fechar. **Não importes ainda a tua Cópia (.zip).**

---

## A. Onde fica cada coisa

| Sítio | O que lá está | Quando mexes |
|---|---|---|
| **GitHub** (`<utilizador>.github.io`) | Só o Portal (estes ficheiros) | Só quando eu te der uma versão nova do Portal |
| **Google Drive** (`Portal/`) | O programa e os dados de cada app, cada app na sua pasta | Nunca à mão: o Portal trata de tudo |
| **Cada aparelho** | Uma cópia do Portal, das apps e dos dados | Nada: só abres o Portal |

Instalas **uma única app** em cada aparelho: o Portal. As tuas apps aparecem dentro dele.

## B. O que tens de ver — lista

**Agora, para testar a fase 1**
- [ ] Conta no GitHub
- [ ] Repositório `<utilizador>.github.io` com estes ficheiros e o GitHub Pages ligado (secção C)
- [ ] Abrir o Portal no PC e definir o PIN (podes escolher "Fazer isto mais tarde" no Google)
- [ ] Ter os ficheiros do Estúdio: o `index.html` e, se a tiveres, a pasta `ler/`
- [ ] Fazer os testes da secção E
- [ ] *(quando quiseres o Drive)* Verificação em 2 passos na conta Google
- [ ] *(quando quiseres o Drive)* Projeto na Google Cloud e ID do cliente no `config.js` (secção D)

**Mais tarde (não é preciso para testar)**
- [ ] PC: ligar a **Encriptação de dispositivo** (Windows Home) ou o **BitLocker** (Windows Pro), em Definições → Privacidade e segurança
- [ ] Android e tablet: confirmar que têm bloqueio de ecrã (com isso, a cifra do telemóvel já está ligada)
- [ ] Fase 6: imprimir o código de recuperação e guardá-lo num sítio seguro
- [ ] Fase 6: escolher o email de recuperação escondido
- [ ] Fase 7: impressão digital

## C. Pôr o Portal na internet (GitHub Pages)

> O repositório **tem de se chamar exatamente** `<o-teu-utilizador>.github.io`. Só assim o Portal fica na raiz do endereço, e precisa disso para as apps abrirem os ficheiros.

1. Entra em <https://github.com> (cria conta se não tiveres).
2. **New repository** → nome: `<o-teu-utilizador>.github.io` → **Public** → **Create repository**.
3. **uploading an existing file** → arrasta **o conteúdo** desta pasta (os ficheiros e as pastas `css`, `js`, `icons`, `vendor`; não a pasta de fora) → **Commit changes**.
4. **Settings → Pages** → *Source*: **Deploy from a branch** → **main** e **/ (root)** → **Save**.
5. Espera 1 ou 2 minutos. O Portal fica em `https://<o-teu-utilizador>.github.io`.

**Atualizar o Portal mais tarde:** arrastas os ficheiros novos para o repositório da mesma forma e fazes **Commit**. Os aparelhos apanham a versão nova sozinhos, ou em Definições → **Procurar atualização do Portal**.

## D. Ligar ao Google Drive (Google Cloud, grátis)

1. Confirma que a tua conta Google tem a **verificação em 2 passos** ligada.
2. Abre <https://console.cloud.google.com> → **Selecionar projeto → Novo projeto** → `Portal` → **Criar**.
3. **APIs e serviços → Biblioteca** → **Google Drive API** → **Ativar**.
4. **Google Auth Platform** (ou "Ecrã de consentimento OAuth") → **Começar**:
   - nome `Portal`, o teu email de apoio, público **Externo**;
   - em **Público-alvo → Utilizadores de teste**, junta o teu email;
   - em **Acesso a dados → Adicionar âmbitos**, escolhe `.../auth/drive.file`.
5. **Clientes → Criar cliente** → **Aplicação Web** → em **Origens JavaScript autorizadas**, põe `https://<o-teu-utilizador>.github.io` (sem `/` no fim) → **Criar** → copia o **ID do cliente**.
6. No GitHub: `config.js` → lápis → cola o ID entre as aspas de `googleClientId` → **Commit changes**.

Se o Google avisar que "a app não foi verificada", é normal, porque a app é tua: **Continuar**.

## E. Como testar a fase 1

1. **Primeiro arranque (PC):** define o PIN e entra com Google (ou "Fazer isto mais tarde").
2. **Drive:** se ligaste, abre o Drive. Tem de lá estar `Portal/` com `portal.json`, `apps/` e `aparelhos/`.
3. **Juntar o Estúdio:** **+ Juntar app** → **Escolher pasta** (ou **.zip ou index.html**) → **Juntar**. O nome vem sozinho.
4. **Estado no topo:** **A sincronizar…** e depois **✓ Tudo na nuvem**. No Drive aparece `apps/estudio-de-trompete/` com `app.json`, `programa/` e `dados/`.
5. **Abrir:** toca no cartão. O Estúdio abre e **← Início** volta.
6. **Instalar:** botão **Instalar** no topo do Portal (ou o ícone na barra de endereço).
7. **Sem internet:** desliga o Wi-Fi → abre o Portal → PIN → abre o Estúdio. Tem de abrir.
8. **Por enviar:** sem internet, junta uma app qualquer. O estado mostra **↑ 1**. Liga o Wi-Fi: envia-se sozinha.
9. **Atualizar:** **⋯** no cartão → **Atualizar**. O cartão passa a "versão 2" e, no Drive, a versão 1 vai para `versoes/v1/`.
10. **PIN:** um PIN errado é recusado; depois de 5 erros, o Portal obriga a esperar.
11. **Atalho:** escreve `https://<…>.github.io/a/estudio-de-trompete/index.html` na barra de endereço. Tem de ir parar ao ecrã do PIN.
12. **Telemóvel:** abre o endereço no Chrome → PIN → **⋮ → Instalar app**. As apps do PC ainda não aparecem aqui (chegam na fase 4).

Se algo falhar, diz-me o número do teste e o que apareceu no ecrã.

## F. Decisões tomadas

| Assunto | Decisão |
|---|---|
| Onde fica o Portal | GitHub Pages, repositório `<utilizador>.github.io`. Só o Portal vai para lá. |
| Separação entre apps | **Por pasta:** cada app só recebe da gaveta a sua própria pasta `apps/<id>/`. O Portal cria e escolhe a pasta sozinho. Um único repositório. |
| Acesso ao Google | Sem servidor. A autorização dura 1 hora; quando expira, um toque em **Ligar ao Drive** renova-a. |
| Sincronização (fase 3) | Verifica se há novidades de 30 em 30 s (com o Portal aberto e com internet) e quando abres ou fazes refresh a uma app. Só transfere o que mudou. Envia as tuas alterações poucos segundos depois de as fazeres. |
| Apps novas ou atualizadas noutros aparelhos (fase 4) | O Portal **pergunta sempre** antes de transferir. |
| Cifra (fase 6) | **Todos os dados** das apps ficam cifrados no Drive (registos e ficheiros, PDFs incluídos). Os programas ficam sem cifra. |
| Recuperação (fase 6) | Telemóvel-chave; código de recuperação impresso; email de recuperação escondido como último recurso. Esquecer o PIN nunca apaga dados. |
| Juntar e atualizar | Um só botão. O Portal reconhece se a app já existe e propõe atualizar; verifica se é mesmo a mesma app e avisa se não parecer (tu confirmas). Nunca cria duplicados sozinho. |
| Versões | Ficam todas guardadas. Em cada app escolhes no Portal qual a versão ativa (normalmente a mais recente). |
| Remover uma app | Possível, com aviso e aprovação no telemóvel principal (fase 5). |
| Modos dos aparelhos | No browser (sem instalar): só com internet, nada fica guardado. Instalado no PC: guarda numa pasta que escolhes, com avisos se ela mudar de sítio. Instalado no Android: guarda no telemóvel. Todas as transferências se veem e podem ser canceladas ou retomadas. |
| Formato das apps | Ficheiro "Regras para apps do Portal": juntar a cada chat de app. |
| Para mais tarde | Impressão digital, cifra dos dados guardados no aparelho, BitLocker. |

## G. Coisas a saber

- **Não mexas à mão na pasta `Portal` do Drive.** O Portal só vê o que ele próprio criou.
- **Esqueceste-te do PIN?** Na fase 1, **Esqueci-me** repõe só esse aparelho (o que está no Drive fica). Na fase 6 passa a haver recuperação a sério.
- **Atualizar uma app:** só no Portal (no PC): **⋯ → Atualizar**. Não mexes no GitHub nem no Drive.

## Ficheiros

| Ficheiro | Para quê |
|---|---|
| `index.html`, `css/`, `icons/` | ecrãs do Portal |
| `config.js` | o ID do cliente Google (o único ficheiro que mudas; nunca o substituas numa atualização) |
| `sw.js` | funcionar sem internet; serve as apps em `/a/<id>/…` |
| `js/main.js` | ecrãs e lógica |
| `js/cofre.js` | PIN / palavra-passe |
| `js/drive.js` | Google Drive |
| `js/apps.js` | juntar, guardar e apagar apps; bibliotecas externas |
| `js/armazem.js` | base de dados local (IndexedDB) |
| `vendor/jszip.min.js` | abrir ficheiros .zip |
