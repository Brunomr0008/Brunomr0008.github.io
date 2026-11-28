# Portal — LEIA-ME (versão 1.9)

> Guia completo e ilustrado: os PDFs "Portal - Guias". Este ficheiro é o resumo técnico.

O Portal abre e gere as tuas apps (as que fazes nos chats do Claude). Guarda tudo no teu Google Drive e funciona sem internet.

## Novidades (cada versão: título em inglês, até 40 caracteres, e descrição em português)

| Versão | Data | Título | O que mudou |
|---|---|---|---|
| 1.9 | 28/11/2026 | Phase 4: apps on other devices | Fase 4: apps juntadas noutro aparelho aparecem em "No Drive, ainda não neste aparelho" (Transferir); versão nova no Drive aparece no cartão ("↓ versão N"); o Portal pergunta sempre. Versão ativa por aparelho (menu ⋯). Eliminar de vez (também no Drive) com palavra-passe de eliminação; lixo do Drive, 30 dias. App apagada do Drive: pergunta se a apaga do aparelho. Juntar uma app que já está no Drive nunca escreve por cima de uma versão. Desbloquear volta ao ecrã principal. PDFs abertos com o nome no histórico e guardados em memória durante a sessão. |
| 1.8 | 27/11/2026 | Phase 3: sync between devices | Fase 3: recebe do Drive só o que mudou noutros aparelhos (ao entrar, de 30 em 30 s, "Sincronizar agora"); as apps abertas veem as mudanças logo. Conflitos: fica o mais recente, com aviso. Browser: os dados vêm do Drive em cada sessão e os PDFs quando os abres; não ficam guardados. Instalado: guarda tudo. Aviso ao sair de uma app com alterações por enviar. Histórico das transferências. Versão nova: verifica a cada ação e de 5 em 5 min; aviso de 5 s, bloqueia e volta ao ecrã principal. Documentação: pasta "Guias - últimas versões". |
| 1.7 | 27/11/2026 | Fast update checks, tidy guides | O Portal pergunta ao GitHub de minuto a minuto (e antes de cada envio para o Drive) se há versão nova; quando há, bloqueia e recarrega sozinho para a instalar, sem enviar nada com a versão antiga. Documentação: barra de progresso visível; na pasta Guias fica só a versão mais recente de cada guia (as anteriores vão para "Versões antigas"); aceita guias soltos, numa pasta ou num .zip; não envia outra vez um guia que já lá está. Transferências: mostra quanto falta enviar no total. |
| 1.6 | 27/11/2026 | Strict updates, Documentation editing | Com internet e uma versão nova no GitHub, já não há "Continuar sem atualizar": entras com o PIN, mas as apps, a Documentação, as definições e os envios ficam parados até a versão nova estar instalada. Documentação: apagar (lixo do Drive, 30 dias), mudar o nome e juntar pastas inteiras. Transferências: sem linhas repetidas; o total conta tudo o que falta; velocidade dos últimos 20 s; os dados vão de seguida, sem esperar pela volta seguinte. |
| 1.5 | 27/11/2026 | App data drawer, Documentation, updates | Fase 2: as apps passam a guardar dados no Portal (a "gaveta" `window.claude`: base de dados, ficheiros como PDFs e descarregar), tal como no Claude, sem mudar nada nas apps. Os dados ficam no aparelho, funcionam sem internet e vão sozinhos para o Drive, só o que mudou (`apps/<app>/dados/`). Cada app tem o seu próprio `localStorage`. Nova secção Documentação, protegida pelo PIN, no Drive: cada versão nova do Portal arquiva-se lá sozinha. Com internet, um aparelho com uma versão antiga do Portal fica bloqueado até instalar a mais recente (`versao.json`). |
| 1.4 | 27/11/2026 | Single PIN, version folders, faster sync | PIN único para todos os aparelhos, guardado no Drive só como "resumo" (nunca o PIN). Num aparelho novo entras primeiro com Google e depois escreves o PIN que já usas. Cada versão de uma app fica na sua pasta (`versoes/v1`, `v2`…); a pasta antiga `programa` é arrumada sozinha. Os ficheiros que não mudaram são copiados no próprio Drive em vez de enviados outra vez, e até 3 ficheiros vão ao mesmo tempo. No browser (sem instalar) as apps só abrem com internet. Definições numa janela própria. Corrigido o aviso vermelho sem internet. Um endereço `/a/…` aberto fora do Portal leva ao Portal. |
| 1.3 | 26/11/2026 | Settings sections, transfers, history | Definições divididas por secções. Histórico de erros, avisos e informações, com filtro por datas, copiar e exportar. Transferências com progresso real, pausar, retomar e cancelar; um envio interrompido continua onde parou. Indicador Online / Sem internet que testa a ligação a sério. Barra "A atualizar o Portal" no ecrã do PIN. Contagem decrescente depois de 5 tentativas erradas. Temas escolhidos com botões; o Escuro passou a preto. Teclado do PIN mais visível. Editar o nome e a descrição das apps. "Juntar app" reconhece uma app que já existe e manda-te para "Atualizar"; "Atualizar" avisa se o ficheiro não parecer da mesma app. |
| 1.2 | 26/11/2026 | Themes, PIN dots and update checks | Temas; círculos do PIN do tamanho do PIN e entrada automática; a versão nova instala-se antes do PIN; verificação dos ficheiros; registo de erros. |
| 1.1 | 26/11/2026 | Fix Cancel button in Add app | O botão Cancelar da janela "Juntar app" voltou a fechar a janela. |
| 1.0 | 24/11/2026 | First release: the base Portal | Primeira versão: instalar, PIN, Google Drive, juntar, atualizar e abrir apps, sem internet. |

**Na fase 1 já funciona:**
- o Portal instala-se como app e funciona sem internet;
- desbloqueio com PIN ou palavra-passe;
- entrar com Google e criar a pasta `Portal/` no Drive;
- um PIN único para todos os aparelhos (desde a 1.4);
- juntar e atualizar apps (pasta, .zip ou só o `index.html`), com envio para o Drive, cada versão na sua pasta `versoes/vN/`;
- abrir as apps dentro do Portal.

**Na fase 2 (versão 1.5) passou a funcionar:**
- as apps guardam dados (a gaveta `window.claude`: `db`, `assets`, `downloads`), também sem internet;
- os dados vão sozinhos para o Drive, só o que mudou: `apps/<app>/dados/registos/<coleção>/<id>.json` e `apps/<app>/dados/ficheiros/<nome> (<id>).pdf`;
- já podes importar a tua **Cópia (.zip)** no Estúdio dentro do Portal;
- cada app tem o seu `localStorage`;
- a secção **Documentação** (ícone de documento no topo), atrás do PIN: juntar ficheiros e pastas, mudar o nome, apagar (desde a 1.6);
- com internet, o Portal não deixa usar uma versão antiga: entras com o PIN, mas o resto fica parado até atualizar (desde a 1.6, sem opção de continuar).

**Na fase 3 (versão 1.8) passou a funcionar:** os dados passam de um aparelho para os outros pelo Drive (só as diferenças), com conflitos resolvidos (fica o mais recente) e o histórico das transferências.

**Na fase 4 (versão 1.9) passou a funcionar:** as apps do Drive aparecem nos outros aparelhos e transferes as que quiseres; versões novas e versão ativa por aparelho; eliminar de vez com palavra-passe.

**Ainda não funciona:** a aprovação de aparelhos novos pelo telemóvel principal (fase 5) e a cifra dos dados (fase 6). No browser sem instalar, os dados vêm do Drive em cada sessão e os PDFs quando os abres; não ficam guardados (só o que ainda não foi enviado e o programa das apps).

---

## A. Onde fica cada coisa

| Sítio | O que lá está | Quando mexes |
|---|---|---|
| **GitHub** (`<utilizador>.github.io`) | Só o Portal (estes ficheiros) | Só quando eu te der uma versão nova do Portal |
| **Google Drive** (`Portal/`) | O programa e os dados de cada app, cada app na sua pasta; a Documentação | Nunca à mão: o Portal trata de tudo |
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

## E. Como testar a fase 2 (1.5)

1. **Atualizar:** envia para o GitHub os ficheiros da atualização 1.5 (incluindo o `versao.json`, novo). Ao abrir, o ecrã do PIN mostra "Portal 1.5".
2. **Bloqueio de versão antiga:** quando houver uma versão mais recente no GitHub e houver internet, entras com o PIN, mas aparece "É preciso atualizar o Portal" e tudo o resto fica parado até a versão nova estar instalada (botão "Atualizar agora").
3. **Importar os dados:** no Estúdio do Claude, **Cópia (.zip) → Exportar**. No Estúdio dentro do Portal, **Cópia (.zip) → Importar** esse .zip. Os PDFs e os dados aparecem e continuam lá depois de fechar e voltar a abrir.
4. **Drive:** o estado no topo mostra "↑ N por enviar" e depois "✓ Tudo na nuvem". No Drive aparece `apps/estudio-de-trompete/dados/registos/…` e `dados/ficheiros/…` com os nomes dos PDFs.
5. **Sem internet (Portal instalado):** abre um PDF da biblioteca. Muda alguma coisa: o estado mostra "↑ 1 por enviar"; com internet, envia-se sozinho.
6. **Documentação:** ícone de documento no topo → PIN → pastas Portal (versões), Guias, Regras e Decisões. Em Portal (versões) já está a "Portal 1.5". Junta as Regras e os guias nas pastas certas.

## E1. Como testar a fase 1

1. **Primeiro arranque (PC):** define o PIN e entra com Google (ou "Fazer isto mais tarde").
2. **Drive:** se ligaste, abre o Drive. Tem de lá estar `Portal/` com `portal.json`, `seguranca.json`, `apps/` e `aparelhos/`.
3. **Juntar o Estúdio:** **+ Juntar app** → **Escolher pasta** (ou **.zip ou index.html**) → **Juntar**. O nome vem sozinho.
4. **Estado no topo:** **A sincronizar…** e depois **✓ Tudo na nuvem**. No Drive aparece `apps/estudio-de-trompete/` com `app.json`, `versoes/v1/` e `dados/`.
5. **Abrir:** toca no cartão. O Estúdio abre e **← Início** volta.
6. **Instalar:** botão **Instalar** no topo do Portal (ou o ícone na barra de endereço).
7. **Sem internet:** desliga o Wi-Fi → abre o Portal **instalado** → PIN → abre o Estúdio. Tem de abrir. No browser (sem instalar) não abre: aparece um aviso.
8. **Por enviar:** sem internet, junta uma app qualquer. O estado mostra **↑ 1**. Liga o Wi-Fi: envia-se sozinha.
9. **Atualizar:** **⋯** no cartão → **Atualizar**. O cartão passa a "versão 2" e, no Drive, aparece `versoes/v2/` ao lado de `versoes/v1/`. Enquanto envia, a pasta chama-se `v2 (a enviar)`.
10. **PIN:** um PIN errado é recusado; depois de 5 erros, o Portal obriga a esperar.
11. **Atalho:** escreve `https://<…>.github.io/a/estudio-de-trompete/` na barra de endereço. Num aparelho onde a app ainda não existe, vai parar ao Portal (ecrã do PIN). Onde existe, abre-a depois do PIN.
12. **Telemóvel:** abre o endereço no Chrome → **Entrar com Google** → escreve **o mesmo PIN do PC** → **⋮ → Instalar app**. As apps do PC ainda não aparecem aqui (chegam na fase 4).

Se algo falhar, diz-me o número do teste e o que apareceu no ecrã.

## F. Decisões tomadas

| Assunto | Decisão |
|---|---|
| Onde fica o Portal | GitHub Pages, repositório `<utilizador>.github.io`. Só o Portal vai para lá. |
| Separação entre apps | **Por pasta:** cada app só recebe da gaveta a sua própria pasta `apps/<id>/`. O Portal cria e escolhe a pasta sozinho. Um único repositório. |
| PIN | **Um PIN único** para todos os aparelhos. No Drive fica só o "resumo" (`seguranca.json`), não o PIN. Mudar o PIN num aparelho muda-o em todos. |
| Acesso ao Google | Sem servidor. A autorização dura 1 hora; quando expira, um toque em **Ligar ao Drive** renova-a. |
| Sincronização (feita na 1.8) | Primeiro recebe, depois envia: ao entrar, de 30 em 30 s, ao voltar à janela e em "Sincronizar agora" (toque no estado). Só as diferenças (lista de alterações do Drive). Conflitos: fica o mais recente, com aviso no Histórico. Tudo fica no Histórico das transferências. |
| Apps novas ou atualizadas noutros aparelhos (feito na 1.9) | Aparecem em "No Drive, ainda não neste aparelho" (apps novas) e no cartão ("↓ versão N no Drive"). O Portal **pergunta sempre** antes de transferir. Cada aparelho escolhe a versão ativa (⋯ → Versão ativa). |
| Cifra (fase 6) | **Todos os dados** das apps ficam cifrados no Drive (registos e ficheiros, PDFs incluídos). Os programas ficam sem cifra. |
| Recuperação (fase 6) | Telemóvel-chave; código de recuperação impresso; email de recuperação escondido como último recurso. Esquecer o PIN nunca apaga dados. |
| Gaveta das apps (fase 2) | O Portal imita `window.claude.use("db" \| "assets" \| "downloads")`. Os dados ficam no aparelho e vão para o Drive, só o que mudou, poucos segundos depois. Cada app só vê os seus dados e o seu `localStorage`. |
| Versão do Portal desatualizada | Com internet, o Portal compara-se com o `versao.json` do GitHub a cada ação (abrir uma app, a Documentação, as definições, enviar para o Drive) e de 5 em 5 minutos (1.8). Quando há versão nova: aviso de 5 segundos, bloqueia e volta ao ecrã principal com a versão nova. Se houver uma mais recente: o PIN deixa entrar, mas as apps, a Documentação, as definições e os envios ficam parados até a versão nova estar instalada. Não há "continuar sem atualizar". Sem internet, entra normalmente. |
| Juntar e atualizar | Dois botões separados. "Juntar app" é só para apps novas: se a app já existir, avisa e manda-te para "⋯ → Atualizar". "Atualizar" avisa se o ficheiro não parecer da mesma app (tu confirmas). |
| Versões das apps | Ficam todas guardadas no Drive, cada uma na sua pasta `versoes/vN/`. |
| Remover uma app | "Apagar deste aparelho": só aqui. "Eliminar de vez" (1.9): pede o nome da app e a palavra-passe de eliminação (no Drive só o "resumo"); a pasta vai para o lixo do Drive (30 dias); os outros aparelhos perguntam se a apagam. Na fase 5, também a aprovação no telemóvel principal. |
| Versão de cada app | Cada aparelho escolhe a versão ativa de cada app (normalmente a mais recente). |
| Versão do Portal | Uma só (a do GitHub). Para voltar atrás, envia-se outra vez a versão antiga para o GitHub. Não se escolhe a versão do Portal. As versões antigas ficam arquivadas na secção Documentação (fase 2). |
| Documentação (feito na 1.5–1.6) | Secção no Portal, atrás do PIN, guardada no Drive (`Portal/documentacao/`): Portal (versões), Guias, Regras, Decisões. Juntar ficheiros e pastas, mudar o nome, apagar (vai para o lixo do Drive, 30 dias). As 4 pastas principais não se apagam. Na pasta Guias, as pastas que juntas ficam como estão; o Portal mantém a pasta "Guias - últimas versões" com uma cópia (feita no próprio Drive) da versão mais recente de cada guia "N - Título (vX).pdf" (1.8). Arquivo automático: cada versão nova do Portal guarda-se sozinha em Portal (versões). |
| Dados de cada app (feito na 1.5) | Cada app tem o seu próprio `localStorage`, separado das outras. |
| Regras para apps | Ficam dentro do Portal, guardadas no teu Drive (não no GitHub), escondidas atrás de uma palavra-passe, para ver e descarregar (fase 2). |
| Temas | Original, Claro e Escuro, em Definições → Aspeto (feito na 1.2). |
| Modos dos aparelhos | No browser (sem instalar): só com internet; os programas ficam em cache para abrir mais depressa, os dados não ficam guardados. Instalado no PC: guarda numa pasta que escolhes, com avisos se ela mudar de sítio. Instalado no Android: guarda no telemóvel. Todas as transferências se veem e podem ser canceladas ou retomadas. |
| Formato das apps | Ficheiro "Regras para apps do Portal": juntar a cada chat de app. |
| Para mais tarde | Impressão digital, cifra dos dados guardados no aparelho, BitLocker. |

## G. Coisas a saber

- **Não mexas à mão na pasta `Portal` do Drive.** O Portal só vê o que ele próprio criou.
- **Esqueceste-te do PIN?** **Esqueci-me** repõe só esse aparelho (o que está no Drive fica), mas para voltar a entrar precisas do mesmo PIN, porque é único. A recuperação a sério chega na fase 6.
- **Depois de atualizar para a 1.4, abre primeiro o PC:** o PIN do PC passa a ser o PIN único. Os outros aparelhos adotam-no a seguir.
- **Atualizar uma app:** só no Portal (no PC): **⋯ → Atualizar**. Não mexes no GitHub nem no Drive.

## Ficheiros

| Ficheiro | Para quê |
|---|---|
| `index.html`, `css/`, `icons/` | ecrãs do Portal |
| `config.js` | o ID do cliente Google (o único ficheiro que mudas; nunca o substituas numa atualização) |
| `sw.js` | funcionar sem internet; serve as apps em `/a/<id>/…` |
| `404.html` | um endereço `/a/…` aberto fora do Portal leva ao Portal |
| `js/main.js` | ecrãs e lógica |
| `js/cofre.js` | PIN / palavra-passe (e o PIN único no Drive) |
| `js/drive.js` | Google Drive |
| `js/apps.js` | juntar, guardar e apagar apps; bibliotecas externas |
| `js/gaveta.js` | a gaveta `window.claude` que cada app recebe (fase 2) |
| `js/gavetabd.js` | a base de dados local onde as apps guardam os dados |
| `js/dados.js` | envia os dados das apps para o Drive |
| `js/sinc.js` | recebe do Drive os dados mudados noutros aparelhos (fase 3) |
| `js/loja.js` | apps que estão no Drive: transferir, versões, eliminar de vez (fase 4) |
| `versao.json` | a versão publicada (o Portal compara-se com ela para saber se está desatualizado) |
| `js/armazem.js` | base de dados local (IndexedDB) |
| `vendor/jszip.min.js` | abrir ficheiros .zip |
