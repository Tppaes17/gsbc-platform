# GSBC — Constituição do Produto

**Documento:** `docs/PRODUCT.md`  
**Status:** Fonte de verdade funcional e de negócio  
**Versão:** 1.1  
**Data:** 29/08/2026  
**Idioma canônico:** Português  
**Produto:** GSBC — Gestora Sindical de Benefícios & Compliance

---

## 1. Finalidade

O GSBC é uma plataforma SaaS B2B premium, multi-tenant e orientada a compliance, arrecadação e operações de relações sindicais.

O produto deve permitir que entidades sindicais administrem, com alto grau de automação e rastreabilidade:

- instrumentos coletivos e suas versões;
- enquadramento e cobertura de empresas e estabelecimentos;
- obrigações financeiras e não financeiras;
- arrecadação, cobrança, conciliação e negociação;
- contestações;
- notificações extrajudiciais;
- preparação de dossiês jurídicos;
- compliance das empresas;
- potencial e previsão de arrecadação;
- workflows humanos;
- documentos e evidências;
- decisões, aprovações e delegações;
- inteligência artificial aplicada à análise e à operação.

Cobrança é um dos motores do produto, e não sua definição integral.

---

## 2. Escopo inicial

### 2.1 Clientes

Os tenants iniciais são exclusivamente entidades sindicais:

- sindicatos laborais;
- sindicatos patronais;
- federações;
- confederações.

Empresas não são tenants no escopo inicial. São objetos de enquadramento, compliance, arrecadação, cobrança e relacionamento.

### 2.2 Hierarquia sindical

Federações e confederações podem estar vinculadas a múltiplas entidades.

A hierarquia não concede acesso irrestrito por si só. Visualização e execução dependem de permissões explícitas.

Não haverá benchmarking ou ranking entre sindicatos.

---

## 3. Princípios não negociáveis

1. **Tenant scope por padrão.**
2. **Fail closed:** dúvida de autorização deve bloquear, não liberar.
3. **Histórico não é sobrescrito.**
4. **Eventos relevantes são imutáveis e corrigidos por novos eventos.**
5. **IA não publica interpretação operacional sem validação humana.**
6. **A IA nunca possui autoridade superior à do usuário que a aciona.**
7. **Decisões críticas exigem controles proporcionais ao risco.**
8. **Regras devem ser temporalmente reproduzíveis.**
9. **Toda obrigação deve ser explicável até sua fonte normativa.**
10. **Toda cobrança deve ser explicável até sua regra, cálculo e evidências.**
11. **Dados oficiais devem ser priorizados quando afetarem enquadramento, cálculo ou cobrança.**
12. **Operação humana deve ser orquestrada pelo sistema, não depender de controles paralelos.**
13. **Dados entre tenants não podem vazar por UI, busca, IA, logs, autocomplete, relatórios ou integrações.**
14. **Automação não substitui autoridade jurídica ou institucional quando esta for necessária.**
15. **A decisão institucional do tenant não obriga a GSBC a executar ato ilegal, fraudulento, inseguro ou incompatível com privacidade, segurança ou compliance.**
16. **Imutabilidade probatória não significa retenção irrestrita de dados pessoais.**


---

## 4. Modelo multi-tenant

Cada sindicato, federação ou confederação contratante é operado dentro de escopo de tenant.

Configurações tenant-scoped incluem, entre outras:

- usuários;
- autoridades;
- delegações;
- instrumentos;
- empresas;
- estabelecimentos;
- regras;
- políticas;
- contratos;
- integrações;
- contas financeiras;
- templates;
- documentos;
- workflows;
- tarefas;
- notificações;
- scoring;
- forecasts.

Cada entidade contratante constitui um tenant próprio.

Relações entre sindicato, federação e confederação são vínculos institucionais entre tenants independentes. Esses vínculos não concedem acesso por si mesmos.

Acesso transversal de federações/confederações somente pode ocorrer mediante grant formal, explícito, granular, revogável e auditável, sem romper o isolamento lógico entre tenants.

---

## 5. Onboarding e ciclo de vida do tenant

### 5.1 Wizard de implantação

Novos tenants passam por wizard estruturado acompanhado pela GSBC:

1. cadastro da entidade;
2. usuários e autoridades;
3. delegações;
4. instrumentos coletivos;
5. território/base;
6. critérios de enquadramento;
7. política de negociação;
8. contrato comercial e split;
9. conta financeira;
10. e-mails;
11. templates de cobrança/notificação;
12. templates jurídicos;
13. integrações;
14. regras de compliance;
15. validação final;
16. ativação.

### 5.2 Go-Live Gate

Produção exige readiness obrigatório.

Antes do Go-Live podem ocorrer configuração, importação, interpretação, simulação e testes, mas não:

- cobrança real;
- comunicação externa real;
- movimentação financeira real.

Go-Live exige dupla aprovação:

- GSBC: prontidão técnica/operacional;
- entidade: Presidente, Vice-Presidente ou delegado formal.

A aprovação deve exigir MFA e gerar auditoria imutável.

### 5.3 Encerramento

No encerramento contratual:

- novas cobranças e operações são bloqueadas;
- tenant entra em modo somente leitura;
- documentos, histórico, auditoria, financeiro e processos permanecem preservados.

Prazo padrão de read-only: **3 anos**.

### 5.4 Arquivamento

Após 3 anos:

- tenant é arquivado;
- antigos usuários da entidade perdem acesso;
- não há direito contratual ordinário à exportação final;
- acesso fica restrito a usuários GSBC especificamente autorizados para auditoria, defesa jurídica ou obrigação legal;
- todo acesso é auditado.

Obrigações legais, regulatórias e ordens judiciais prevalecem sobre a regra contratual.

### 5.5 Reativação

Tenant arquivado pode ser reativado, preservando identidade e histórico.

Não exige novo onboarding completo nem novo Go-Live integral.

Exige **Reactivation Integrity Check** das dependências críticas. O sistema bloqueia seletivamente apenas capacidades com configuração inválida, vencida ou ausente.

---

## 6. Usuários, autoridades e permissões

### 6.1 Entidade

Presidente e diretoria possuem acesso gerencial conforme permissão.

Autoridades formais para decisões críticas:

- Presidente;
- Vice-Presidente;
- delegado formal, dentro do escopo da delegação.

### 6.2 Delegação

Delegação é objeto formal e auditável, contendo:

- delegante;
- delegado;
- início e fim da vigência;
- escopo;
- poderes;
- histórico de utilização.

### 6.3 Perfis internos GSBC

Perfis-base:

- Proprietário;
- Administrador;
- Operação/Compliance;
- Financeiro;
- Jurídico;
- Atendimento.

Perfis devem funcionar como bundles de permissões, não como limitação arquitetural rígida.

### 6.4 View x execute

Permissões de visualização e execução são independentes e granulares por:

- tenant;
- entidade;
- módulo;
- tipo de informação;
- ação.

### 6.5 MFA

MFA obrigatório no login para:

- Proprietário;
- Administrador;
- Financeiro;
- Jurídico;
- Presidente;
- Vice-Presidente;
- delegados com autoridade crítica.

Demais perfis podem ter MFA configurável.

Ações sensíveis exigem step-up MFA mesmo com sessão autenticada.

### 6.6 Maker-checker

Dupla aprovação é configurável por:

- módulo;
- tenant;
- valor;
- risco;
- ação.

Operações em massa de alto impacto financeiro, jurídico ou de comunicação externa exigem maker-checker obrigatoriamente.

---

## 7. Instrumentos coletivos

### 7.1 Tipos

O sistema deve suportar documentos que criem, modifiquem, complementem ou extingam obrigações, incluindo:

- CCT;
- ACT;
- termos aditivos;
- retificações;
- decisões/sentenças normativas;
- outros instrumentos juridicamente relevantes.

### 7.2 Entrada inicial

No MVP, o instrumento é fornecido/uploadado pela entidade.

Integração automática com Mediador/MTE é evolução posterior e não bloqueia o MVP.

### 7.3 Interpretação por IA

Fluxo obrigatório:

**IA interpreta → GSBC revisa → entidade ou GSBC autorizado valida → regra é publicada.**

Nenhuma interpretação de IA produz efeito operacional direto sem validação humana.

### 7.4 Rastreabilidade normativa

Toda regra deve apontar para:

- instrumento;
- versão;
- cláusula;
- parágrafo/item;
- página;
- trecho-fonte.

A cadeia deve permitir navegar:

**regra → cálculo → comunicação → cobrança → notificação → negociação → dossiê jurídico.**

### 7.5 Versionamento temporal

Instrumentos-base são preservados.

Aditivos e retificações são versões/apêndices que alteram apenas o necessário.

Regras vencidas continuam disponíveis para reconstrução histórica.

### 7.6 Conflitos

IA pode identificar e recomendar tratamento de conflito.

Publicação fica bloqueada até:

1. análise GSBC;
2. validação da entidade.

Se conflito for descoberto durante cobrança, apenas obrigações/competências afetadas são suspensas. Demais fluxos continuam.

A suspensão congela o relógio operacional.

---

## 8. Empresas, CNPJs e enquadramento

### 8.1 Descoberta

Pode começar por:

- base fornecida pela entidade;
- pesquisa automatizada.

Pesquisa pode utilizar:

- dados oficiais de CNPJ;
- CNAE principal e secundários;
- geografia;
- contatos empresariais qualificados;
- APIs e fontes autorizadas.

Fluxo:

**IA identifica → GSBC revisa → entidade valida → CNPJ entra em escopo operacional.**

Lead não validado não gera obrigação nem estimativa financeira.

### 8.2 Monitoramento oficial

Rotina diária às **06:00**, no calendário/timezone operacional a ser implementado conforme regra de negócio.

Funções:

1. monitorar CNPJs existentes;
2. descobrir potenciais novos CNPJs.

Mudança oficial com potencial impacto operacional gera pendência de revisão antes de modificar cobertura, regra ou obrigação.

### 8.3 Corporate tree

O sistema deve representar:

- grupo econômico/corporativo;
- empresa;
- estabelecimentos/CNPJs;
- genealogia societária relevante.

Enquadramento, instrumento, obrigação, dívida e histórico podem variar por estabelecimento.

### 8.4 Eventos societários

Sucessão, fusão, incorporação, cisão, transformação ou transferência:

- podem ser detectadas;
- geram relacionamento potencial;
- criam revisão GSBC;
- **não transferem dívida automaticamente**.

### 8.5 Situação cadastral

Baixa, suspensão, inaptidão etc.:

- devem ser destacadas;
- podem interromper obrigações futuras quando juridicamente aplicável;
- não eliminam dívidas históricas.

### 8.6 Mudança de CNAE

Gera alerta e revisão.

Não suspende automaticamente cobranças existentes.

---

## 9. Obrigações

O sistema deve suportar:

1. obrigação financeira própria da empresa perante a entidade;
2. obrigação de descontar/recolher e repassar valores;
3. obrigações não financeiras de compliance.

Exemplos não financeiros:

- piso salarial;
- VR;
- VA;
- auxílio-creche;
- seguro;
- plano de saúde;
- jornada;
- banco de horas;
- adicionais;
- outras cláusulas normativas.

Evidências não financeiras são fornecidas pela entidade contratante.

Descumprimentos não financeiros podem seguir fluxo de compliance/notificação semelhante ao financeiro, mas decisão jurídica permanece da entidade.

---

## 10. Fontes oficiais e dados de cálculo

Para dados que afetem enquadramento, cálculo ou cobrança, devem ser priorizadas fontes oficiais e evidências documentais juridicamente utilizáveis.

O GSBC não presume acesso automático a RAIS, GFIP, eSocial ou bases equivalentes da empresa. Quando esses documentos forem necessários, a empresa deverá fornecê-los no fluxo aplicável.

Documentos fornecidos pela empresa devem ser tratados como evidência documental, preservando, quando aplicável:

- origem;
- empresa/CNPJ;
- competência;
- data de recebimento;
- arquivo original;
- hash;
- responsável pelo recebimento;
- validações realizadas;
- vínculo com obrigação/caso.

O sistema não deve transformar automaticamente documento fornecido pela empresa em verdade absoluta. Regras de validação, inconsistência e revisão humana permanecem aplicáveis.

Integrações futuras com fontes oficiais somente poderão ser habilitadas quando houver base jurídica, autorização e acesso técnico válidos.

---

## 11. Retroatividade

### 11.1 Novo instrumento retroativo

O sistema deve:

- detectar retroatividade;
- reconstruir competências afetadas;
- comparar regra anterior e nova;
- considerar pagamentos anteriores;
- calcular diferenças;
- gerar novas obrigações/diferenças;
- preservar histórico.

### 11.2 Correção de interpretação

Correção retroativa sem novo instrumento exige autorização específica da entidade.

Autoridade:

- Presidente;
- Vice-Presidente;
- delegado formal.

Exige step-up MFA.

Antes da aprovação, deve haver simulação não produtiva contendo:

- CNPJs afetados;
- competências;
- cobranças abertas;
- valores adicionais;
- pagamentos excedentes/créditos;
- negociações;
- casos jurídicos.

Relatório de impacto é preservado.

---

## 12. Sandbox e homologação

Deve existir ambiente/camada de homologação para:

- instrumentos;
- regras;
- políticas;
- modelos;
- alterações relevantes.

Simulações não podem modificar produção.

Promoção deve registrar:

- quem testou;
- resultado;
- quem aprovou;
- versão;
- data de vigência.

Também deve existir tenant de demonstração totalmente segregado e abastecido apenas com dados sintéticos.

---

## 13. Cobrança preventiva e régua

### 13.1 Pré-vencimento

Comunicação preventiva automática contendo:

- fundamento;
- valor;
- vencimento;
- boleto/link.

Não conta como tentativa de cobrança.

Timing é parametrizável por:

**entidade → instrumento → obrigação**, com regra específica prevalecendo sobre geral.

### 13.2 Pós-vencimento

Após inadimplemento:

- 3 tentativas;
- intervalo de 3 dias úteis entre tentativas concluídas.

Calendário considera:

- fins de semana;
- feriados nacionais;
- estaduais;
- municipais do estabelecimento/CNPJ.

### 13.3 Escalonamento de destinatários

Destinatários podem ser ampliados progressivamente por tentativa conforme matriz configurável.

Exemplo:

1. Financeiro;
2. Financeiro + RH/RT;
3. Financeiro + RH/RT + Jurídico/Diretoria.

Escalonamento não altera quantidade de tentativas nem prazos.

---

## 14. Cobrança multicanal

### 14.1 Canais iniciais obrigatórios

Cada tentativa formal é composta por:

- e-mail;
- WhatsApp.

Inicialmente, ambos devem ter entrega válida para que a tentativa seja concluída.

### 14.2 WhatsApp

O GSBC terá canal próprio utilizado em representação da entidade sindical.

A comunicação deve identificar inequivocamente o sindicato representado.

Toda mensagem é tenant-scoped e vinculada ao caso/obrigação.

### 14.3 Tentativa x envio

Tentativa e envio são entidades diferentes.

Cada canal possui estado e evidências próprias.

Se apenas um canal falhar, apenas ele é reenviado.

O canal entregue permanece válido.

### 14.4 Conclusão da tentativa

A tentativa é concluída na data/hora da última entrega válida necessária para completar os canais obrigatórios.

O prazo de 3 dias úteis começa em `attempt_completed_at`.

### 14.5 Falha definitiva

Hard bounce/endereço inexistente/falha definitiva:

- não conta como entrega;
- suspende avanço;
- cria tarefa para correção/enriquecimento;
- preserva evidência.

### 14.6 Resposta antes da conclusão

Qualquer resposta válida em qualquer canal:

- interrompe automação imediatamente;
- cancela envios pendentes;
- cria/encaminha atendimento humano;
- preserva tentativa em seu estado real, ainda que incompleta.

---

## 15. Contatos empresariais

Cada CNPJ pode possuir múltiplos contatos classificados por:

- finalidade;
- prioridade;
- fonte;
- status de validação;
- histórico de utilização.

Categorias podem incluir:

- financeiro;
- fiscal;
- RH;
- jurídico;
- relações trabalhistas;
- diretoria;
- geral.

Falha definitiva pode iniciar enriquecimento automático.

Contatos encontrados são candidatos e exigem validação humana GSBC antes de uso.

O produto deve limitar enriquecimento e cobrança a **canais profissionais/institucionais**.

Dados pessoais privados não devem integrar esse mecanismo.

Na notificação extrajudicial podem ser utilizados contatos profissionais de sócios, administradores ou representantes legais, com fonte, vínculo, finalidade e uso rastreados.

---

## 16. Atendimento e suspensão da régua

Qualquer resposta da empresa encaminha o caso para atendimento humano.

A régua fica suspensa e seu relógio é congelado.

Na retomada, o fluxo continua exatamente do checkpoint anterior, incluindo saldo de prazo restante.

### 16.1 SLA

Prazo máximo geral de atendimento: **15 dias úteis**.

SLAs menores podem existir por categoria, fila, criticidade ou tenant.

Hierarquia:

1. prazo legal aplicável;
2. exceção tenant;
3. política global GSBC.

Prazo mais restritivo prevalece quando necessário.

Vencimento do SLA:

- não retoma cobrança automaticamente;
- mantém caso suspenso;
- registra violação;
- escala gerencialmente.

### 16.2 Calendário

SLA usa calendário do estabelecimento/CNPJ.

Se segregável, cada CNPJ possui prazo próprio.

Se manifestação indivisível envolver múltiplos CNPJs, aplica-se o calendário mais conservador, produzindo o vencimento efetivo mais próximo.

---

## 17. Notificação extrajudicial

Após terceira tentativa válida sem solução:

- notificação é emitida no primeiro dia útil seguinte;
- usa template pré-aprovado e versionado;
- possui assinatura digital quando aplicável;
- prazo: **10 dias corridos**.

Após o prazo, entidade possui **10 dias corridos** para decidir:

- aprovar ação;
- não ajuizar;
- suspender por prazo definido;
- solicitar negociação.

Justificativa é obrigatória.

Se não houver decisão, fluxo entra automaticamente em preparação jurídica.

---

## 18. Autoridade para decisões críticas

Decisões formais sobre:

- escalada jurídica;
- contestação;
- exceções de negociação;
- uso de crédito;
- correções retroativas;
- outras matérias críticas definidas em política,

cabem a:

- Presidente;
- Vice-Presidente;
- delegado formal dentro da alçada.

---

## 19. Contestação

Decisão é compartilhada entre GSBC e entidade, mas a palavra final é da entidade.

Divergência técnica GSBC deve permanecer registrada.

### 19.1 Contestação parcial

Se apenas uma competência de cobrança consolidada for contestada:

- separa competência;
- suspende apenas a parte contestada;
- demais competências continuam;
- boleto pode ser reemitido.

### 19.2 Contestação de enquadramento

Cobranças permanecem ativas até suspensão expressa da entidade.

Discussão de representação é acompanhada pela GSBC.

### 19.3 Decisão judicial desfavorável à entidade

Se reconhecer ausência de representação em período:

- identificar obrigações afetadas;
- cancelar saldos abertos;
- recalcular histórico;
- converter pagamentos indevidos em créditos;
- preservar originais;
- vincular mudanças à decisão.

### 19.4 Decisão favorável

Reconhecimento histórico deve permitir reconstrução do período com:

- instrumentos vigentes por competência;
- regras;
- bases oficiais;
- pagamentos;
- diferenças;
- juros;
- multas.

---

## 20. Financeiro

### 20.1 Infraestrutura

Boleto/link são emitidos por plataforma financeira externa integrada.

Conciliação ocorre no GSBC.

Recursos transitam por instituição de pagamento/conta apropriada, não por custódia direta do GSBC.

Split é realizado pela instituição financeira conforme contrato validado.

### 20.2 Contratos

Gestão contratual é core.

IA pode extrair:

- percentual GSBC;
- percentual entidade;
- terceiros;
- vigência;
- mudanças temporais;
- honorários;
- regras extrajudiciais/judiciais;
- término;
- demais condições financeiras.

Entrada em produção exige validação GSBC.

### 20.3 Conciliação

Confirmação financeira:

- concilia automaticamente;
- atualiza obrigação;
- gera notificação interna;
- aplica split validado.

### 20.4 Pagamento parcial

- concilia recebido;
- mantém saldo;
- cobrança continua apenas sobre saldo;
- juros/multa são recalculados conforme regra.

### 20.5 Pagamento não identificado

Vai para fila de conciliação GSBC.

Não há atribuição automática.

Vinculação manual registra operador, data, critério e transações.

### 20.6 Excesso/duplicidade

- obrigação é quitada;
- excesso vira crédito automaticamente;
- utilização futura do crédito exige autorização da entidade.

### 20.7 Estorno

- reabre obrigação;
- restaura/recalcula saldo;
- preserva histórico de pagamento e reversão;
- retoma fluxo do ponto adequado.

### 20.8 Ledger

Cada CNPJ/estabelecimento possui conta financeira histórica.

Transações nunca são sobrescritas.

---

## 21. Juros e multas

Hierarquia:

1. instrumento coletivo;
2. contrato/regra específica da entidade;
3. regra legal aplicável.

IA pode identificar regra, fonte e validade.

Produção exige revisão/validação humana.

Memória de cálculo deve registrar fonte e precedência.

---

## 22. Negociação

Equipe GSBC pode negociar dentro da política da entidade.

Política pode conter:

- desconto máximo;
- parcelas máximas;
- entrada mínima;
- prazos;
- outras alçadas.

Exceções exigem Presidente, Vice-Presidente ou delegado formal, justificativa e auditoria.

---

## 23. Créditos

Créditos podem surgir por:

- pagamento excedente;
- duplicidade;
- recálculo retroativo;
- decisão judicial;
- outras hipóteses válidas.

Reconhecimento pode ser automático.

**Utilização/compensação exige autorização da entidade em cada ocorrência.**

---

## 24. Escalada jurídica

Após inadimplemento persistente e conclusão dos fluxos aplicáveis, o sistema prepara fase jurídica.

A atuação jurídica pode ser indicada ou operada pela GSBC, com validação jurídica.

Monitoramento judicial poderá ocorrer por API com fornecedor especializado.

### 24.1 Dossiê

Produto final inicial:

**PDF/download de dossiê pré-contencioso contendo petição inicial e documentos, pronto para protocolo por profissional autorizado.**

GSBC não protocola automaticamente no escopo inicial.

### 24.2 Seleção documental por IA

IA pode selecionar e ordenar:

- CCT/aditivos;
- evidência de enquadramento;
- memória de cálculo;
- e-mails;
- evidências de entrega;
- notificação;
- histórico da dívida;
- demais documentos.

Deve registrar o que incluiu e por quê.

### 24.3 Templates jurídicos

Cada obrigação/ação possui template pré-aprovado e versionado.

IA não cria tese jurídica livremente.

Pode preencher:

- fatos;
- valores;
- documentos;
- fundamentos específicos permitidos;
- pedidos autorizados.

### 24.4 Prescrição

Sistema apenas sinaliza risco.

Não decide prescrição autonomamente.

Decisão é conjunta entre jurídico e entidade e deve registrar:

- parecer jurídico;
- manifestação da entidade;
- decisão final;
- operador;
- fundamento.

---

## 25. Compliance Score

Cada CNPJ possui status/índice dinâmico.

Possíveis estados:

- Regular;
- Atenção;
- Inadimplente;
- Notificado;
- Em negociação;
- Judicializado.

Pode considerar:

- obrigações;
- pagamentos;
- descumprimentos;
- contestações;
- notificações;
- negociações;
- processos;
- histórico.

### 25.1 Personalização

GSBC fornece matriz padrão.

Entidade pode definir pesos e critérios.

Modelos são versionados.

### 25.2 Consequência

Score pode:

- aumentar monitoramento;
- gerar alertas;
- priorizar filas.

Score **não cria obrigação jurídica/financeira e não altera a régua formal de cobrança**.

### 25.3 Histórico

Regularização não apaga comportamento anterior.

Após quinquênio, peso negativo pode ser reduzido, mas evento permanece no histórico.

### 25.4 Mudança do modelo

Nova versão:

- recalcula automaticamente o histórico;
- preserva score originalmente calculado;
- mantém score histórico recalculado pela metodologia vigente.

Novo modelo deve passar por homologação GSBC antes de produzir efeitos operacionais.

---

## 26. Receita potencial, forecast e metas

Pipeline:

**Potencial identificado → potencial qualificado → obrigação constituída → cobrado → negociado → recebido/recuperado.**

Não há estimativa financeira antes da validação do CNPJ.

Para CNPJs validados, forecast automático de:

- 3 meses;
- 6 meses;
- 12 meses.

### 26.1 Métricas

- Receita Bruta Projetada;
- Receita Projetada Ponderada.

A ponderada considera histórico e compliance score.

Metodologia deve ser explicável e versionada.

### 26.2 Metas

Entidade pode definir metas:

- mensais;
- trimestrais;
- anuais.

Comparação:

**Meta → Receita Bruta Projetada → Receita Ponderada → Cobrado → Recebido.**

### 26.3 Inteligência preditiva

Pode alertar risco de não atingir meta e explicar fatores como:

- inadimplência;
- redução de base;
- concentração;
- queda de empregados;
- disputas.

Pode sugerir prioridades GSBC.

### 26.4 Concentração

Sistema deve permitir análise/simulação de impacto de perda ou inadimplência de grandes contribuintes.

---

## 27. Modelos globais e inteligência agregada

GSBC pode utilizar dados anonimizados e agregados entre tenants para melhorar:

- IA;
- scoring;
- forecast;
- inteligência de produto.

Condições:

- sem identificação de sindicato, empresa ou CNPJ;
- sem reidentificação razoável;
- segregação do ambiente operacional individual.

Existem duas camadas:

1. inteligência global GSBC;
2. configuração específica do tenant.

Mudanças globais podem recalcular histórico, mas efeitos operacionais exigem homologação GSBC.

---

## 28. Workflow e tarefas

O GSBC possui motor interno de tarefas.

Cada tarefa pode conter:

- tenant;
- caso/origem;
- responsável;
- equipe/fila;
- prioridade;
- SLA;
- status;
- comentários;
- documentos;
- vínculos;
- histórico.

### 28.1 Roteamento

Distribuição automática considera:

- especialidade;
- carteira;
- tenant;
- tipo;
- prioridade;
- SLA;
- carga;
- disponibilidade;
- permissões.

Reatribuição manual é permitida e auditada.

### 28.2 Disponibilidade

Operadores podem estar:

- ativos;
- férias;
- afastados;
- indisponíveis;
- outros estados configurados.

Motor evita novas atribuições e pode redistribuir backlog.

### 28.3 Filas

Exemplos:

- Compliance/Enquadramento;
- Cobrança;
- Atendimento/Contestação;
- Financeiro;
- Negociação;
- Jurídico;
- Instrumentos/IA.

### 28.4 Escalonamento

Aproximação ou violação de SLA pode:

- alertar responsável;
- alertar gestor;
- elevar prioridade;
- redistribuir;
- registrar violação.

---

## 29. Control Tower

Gestores GSBC terão painel consolidado de operação com:

- volume;
- backlog;
- tarefas sem responsável;
- capacidade;
- SLA;
- violações;
- gargalos;
- produtividade;
- distribuição por operador;
- intervenção manual.

Gestor pode reatribuir, repriorizar e redistribuir conforme permissão.

Produtividade não deve ser reduzida a volume de tarefas fechadas. Métricas futuras devem considerar qualidade, retrabalho, tempo e complexidade.

---

## 30. Timeline colaborativa

Cada tarefa/caso possui timeline.

Pode conter:

- comentários;
- menções;
- documentos;
- decisões;
- eventos;
- mudanças de status;
- responsáveis.

Existem dois níveis imutáveis de visibilidade:

1. **Interno GSBC**;
2. **Compartilhado com tenant**.

Visibilidade não pode ser alterada após publicação.

Comentários não podem ser editados nem excluídos fisicamente.

Correções ocorrem por retificação vinculada.

---

## 31. Documentos e cadeia de evidências

Anexos/documentos são imutáveis.

Nova versão não substitui fisicamente a anterior.

Relações possíveis:

- nova versão;
- retificação;
- substituição.

Documentos relevantes devem registrar, quando aplicável:

- hash;
- timestamp;
- autor;
- versão;
- assinatura digital;
- comprovante de assinatura;
- vínculo com evento/processo.

O repositório deve suportar cadeia de custódia documental verificável.

---

## 32. Comunicações como evidência

Toda comunicação externa deve preservar:

- remetente;
- destinatários;
- data/hora;
- assunto;
- conteúdo efetivamente enviado;
- anexos;
- identificador técnico;
- status de entrega;
- bounce/falha;
- leitura quando tecnicamente disponível;
- respostas;
- demais evidências.

Registros são imutáveis e vinculados ao CNPJ, obrigação, competência e caso.

---

## 33. Central de Notificações

Notificação é distinta de tarefa:

- **tarefa:** exige ação;
- **notificação:** exige ciência.

Central existe apenas dentro da plataforma.

Não envia notificações internas por e-mail ou WhatsApp.

Não exige confirmação formal de leitura.

Visualização pode ser registrada, mas não constitui aceite.

### 33.1 Preferências

Usuários podem personalizar notificações configuráveis.

Categorias GSBC podem ser obrigatórias.

Usuário nunca recebe notificações de objetos sem permissão.

### 33.2 Retenção

Central possui:

- área operacional recente;
- histórico pesquisável.

Eventos relevantes à auditoria não são eliminados pelo simples arquivamento da notificação.

---

## 34. Busca global

Busca global deve localizar, conforme permissão:

- CNPJ;
- razão social;
- sindicato;
- instrumento;
- obrigação;
- cobrança;
- boleto;
- pagamento;
- contestação;
- negociação;
- tarefa;
- comunicação;
- documento;
- processo.

Segurança deve ser aplicada na própria consulta.

Resultados não autorizados não podem vazar por:

- autocomplete;
- título;
- contagem;
- sugestão;
- metadados.

---

## 35. Busca semântica e IA interna

Busca em linguagem natural é exclusiva da equipe GSBC.

Deve operar apenas sobre dados autorizados ao usuário autenticado.

Respostas devem indicar fontes/registros utilizados.

IA não pode contornar RBAC ou tenant scope.

---

## 36. IA operacional

Equipe GSBC pode comandar ações em linguagem natural.

Exemplos:

- suspender cobranças;
- criar tarefas;
- simular impacto;
- preparar notificações;
- recalcular obrigações.

A IA herda exatamente as permissões e alçadas do usuário.

### 36.1 Execução por risco

Baixo risco, reversível e dentro da alçada pode ser executado diretamente.

Ações críticas devem apresentar antes:

- ação proposta;
- escopo;
- objetos afetados;
- consequências esperadas.

Exigem confirmação explícita.

MFA, maker-checker e autoridade formal permanecem aplicáveis.

### 36.2 Auditoria da IA

Registrar:

- comando original;
- modelo/agente;
- versão de prompt/instrução;
- fontes;
- interpretação;
- saída;
- confiança quando disponível;
- ação proposta;
- parâmetros;
- aprovação/rejeição;
- revisor;
- execução;
- resultado;
- divergências.

---

## 37. Operações em massa

Toda operação em massa comandada por IA exige simulação prévia obrigatória.

Deve mostrar:

- universo;
- CNPJs;
- competências;
- obrigações;
- valores;
- comunicações;
- tarefas/processos;
- exceções;
- falhas previstas.

Aprovação se refere ao escopo simulado.

Mudança material entre simulação e execução exige nova simulação/aprovação.

Alto impacto financeiro, jurídico ou externo exige maker-checker.

---

## 38. Circuit breaker

Operações em massa devem possuir circuit breaker.

Pode interromper execução por:

- taxa anormal de erro;
- impacto financeiro;
- quantidade de CNPJs;
- falha de integração;
- divergência esperado x realizado;
- erro crítico;
- outros critérios configurados.

Gatilhos são parametrizáveis por tipo de operação.

Ao interromper:

- não inicia novos itens;
- preserva processados;
- identifica pendentes/falhos;
- congela lote;
- cria revisão humana.

Retomada deve ser idempotente e não repetir efeitos concluídos.

---


## 38-A. GSBC Compliance Veto

A entidade mantém autoridade sobre seu posicionamento institucional, dentro das competências previstas neste documento.

Entretanto, GSBC, seus agentes automatizados e prestadores não são obrigados a executar, automatizar, transmitir ou operacionalizar ação considerada:

- ilegal;
- fraudulenta;
- materialmente insegura;
- incompatível com proteção de dados;
- incompatível com política de compliance;
- contrária a determinação judicial ou regulatória aplicável.

O veto deve ser motivado, auditado e vinculado ao objeto afetado.

O sistema deve distinguir, no mínimo:

- decisão institucional da entidade;
- autorização de execução GSBC;
- execução recusada/bloqueada;
- necessidade de ação externa/manual.

O veto não apaga nem altera a manifestação original da entidade.

## 38-B. Imutabilidade, estado operacional e dados pessoais

A arquitetura deve separar três camadas conceituais:

1. **Audit/Event Ledger:** eventos append-only, invioláveis e retificados por novos eventos;
2. **Operational State/Projection:** estado corrente derivado, corrigível por eventos autorizados;
3. **Personal Data Layer:** dados pessoais sujeitos a lifecycle próprio, incluindo correção, bloqueio, pseudonimização, anonimização ou eliminação quando juridicamente aplicável.

A preservação da prova deve ocorrer na máxima extensão juridicamente permitida sem transformar auditabilidade em retenção irrestrita de dado pessoal bruto.

## 38-C. Política de evidência de entrega

A conclusão de uma tentativa multicanal depende de evidência técnica válida e versionada por canal.

Regra inicial:

- **E-mail:** entrega válida quando o provedor/servidor confirmar aceitação/entrega sem hard bounce ou falha definitiva;
- **WhatsApp:** entrega válida quando a API/provedor autorizado retornar status técnico equivalente a `delivered`;
- **Leitura (`read`):** evidência complementar, não requisito ordinário para conclusão.

Cada entrega deve registrar, quando disponível:

- `sent_at`;
- `delivered_at`;
- `read_at`;
- `failed_at`;
- `failure_reason`;
- identificador do provedor;
- versão da política de evidência.

`attempt_completed_at` corresponde ao instante da última entrega obrigatória válida necessária para completar a tentativa.

## 38-D. Instituição de pagamento e subledger GSBC

A instituição de pagamento integrada é a fonte primária da liquidação financeira e executa, conforme contrato e capacidades do provedor, alocação, split e distribuição dos recebíveis.

O GSBC não deve duplicar o motor de liquidação da instituição.

O GSBC mantém subledger operacional reconciliado para rastreabilidade, conciliação, cálculo de saldo operacional, auditoria e relacionamento com obrigações.

A integração deve receber, quando aplicável:

- cobrança;
- pagamento;
- competências;
- principal;
- juros/multas/encargos;
- split;
- beneficiários;
- estorno;
- chargeback;
- identificadores de transação;
- status de liquidação.

Após liquidação, o GSBC registra e reconcilia o resultado informado pela instituição, sem recalcular retroativamente o split liquidado como se a regra contratual atual fosse aplicável.

## 39. Auditoria

Trilha de auditoria é imutável.

Nenhum usuário, inclusive Proprietário/Admin, pode editar ou apagar eventos.

Correção ocorre por novo evento de retificação vinculado ao original.

Devem ser auditadas, entre outras:

- autenticação;
- permissões;
- delegações;
- aprovações;
- regras;
- cálculos;
- alterações de estado;
- comunicações;
- pagamentos;
- conciliações;
- créditos;
- negociações;
- decisões;
- documentos;
- IA;
- operações em massa;
- acessos excepcionais a tenants arquivados.

---

## 40. Dashboard sindical

Dashboard deve oferecer visão gerencial de:

- empresas cobertas;
- compliance;
- valores esperados;
- cobrados;
- recebidos;
- inadimplência;
- negociação;
- notificações extrajudiciais;
- casos jurídicos;
- créditos;
- decisões pendentes;
- receita potencial;
- forecasts;
- metas.

Drill-down:

**entidade → empresa → estabelecimento/CNPJ → obrigação → competência.**

---

## 41. Dashboard hierárquico

Federação/confederação pode visualizar, conforme permissão:

- sindicatos vinculados;
- empresas;
- CNPJs;
- cobrança;
- recuperação;
- inadimplência;
- compliance;
- jurídico;
- performance operacional.

Deve permitir drill-down sem criar ranking comparativo entre sindicatos.

---

## 42. Requisitos de histórico e temporalidade

Histórico é requisito central.

O sistema deve conseguir responder:

- qual regra vigorava em determinada competência;
- qual instrumento a originou;
- qual cálculo foi feito;
- qual versão do modelo existia;
- quem aprovou;
- quais comunicações foram enviadas;
- quais pagamentos ocorreram;
- qual decisão existia naquele momento.

Estado atual nunca pode ser a única representação persistida de fatos relevantes.

---

## 43. Regras de precedência essenciais

### 43.1 Regras
Regra específica prevalece sobre geral quando configurada dentro de alçada válida.

### 43.2 Prazos
Prazo legal mais restritivo prevalece sobre SLA operacional.

### 43.3 Autoridade
IA e operador nunca excedem autoridade formal.

### 43.4 Interação humana
Resposta válida da empresa interrompe automação, mesmo com tentativa multicanal incompleta.

### 43.5 Suspensão
Suspensão congela relógio, salvo regra jurídica expressa em contrário.

### 43.6 Histórico
Nova versão complementa; não apaga o fato histórico original.

---

## 44. Fora do escopo inicial / evolução

Não são requisitos bloqueadores do MVP:

- empresa como tenant;
- protocolo judicial automático;
- integração automática obrigatória com Mediador/MTE;
- benchmarking entre sindicatos;
- canais pessoais de sócios/administradores;
- IA com autoridade independente;
- notificações internas por e-mail/WhatsApp.

---

## 45. Critérios de produto premium

O GSBC deve ser concebido como SaaS B2B premium.

Isso exige:

- UX consistente;
- navegação clara;
- estados vazios e de erro úteis;
- responsividade;
- tabelas operacionais;
- filtros;
- drill-down;
- rastreabilidade contextual;
- feedback de operações longas;
- prevenção de ações destrutivas;
- explicabilidade de IA;
- performance compatível com grandes bases;
- segurança por padrão;
- acessibilidade como requisito de qualidade;
- linguagem profissional e orientada à decisão.

---

## 46. Invariantes para engenharia

A implementação não poderá:

1. criar acesso cross-tenant implícito;
2. apagar histórico financeiro ou de auditoria;
3. permitir que IA publique regra sem validação;
4. permitir que score altere a régua formal de cobrança;
5. transferir dívida automaticamente em evento societário;
6. atribuir pagamento não identificado automaticamente;
7. usar crédito sem autorização da entidade;
8. contar falha definitiva como entrega válida;
9. reiniciar régua após suspensão quando a regra exige retomada;
10. alterar visibilidade de item da timeline após publicação;
11. editar/excluir fisicamente comentários ou anexos históricos;
12. executar operação em massa de IA sem simulação;
13. permitir maker aprovar sua própria operação quando checker for obrigatório;
14. continuar lote após circuit breaker;
15. usar dados pessoais privados para enriquecimento de cobrança;
16. produzir efeitos de modelo global não homologado;
17. permitir operação real antes do Go-Live Gate;
18. permitir usuário antigo acessar tenant arquivado;
19. expor resultado não autorizado por busca/IA/autocomplete;
20. permitir que privilégios administrativos eliminem trilha de auditoria.

---

## 47. Fonte de verdade e governança documental

Este documento é a fonte canônica de requisitos funcionais e princípios de produto.

Documentos derivados devem ser consistentes com ele:

- `docs/DOMAIN_RULES.md`;
- `docs/ARCHITECTURE.md`;
- `docs/SECURITY.md`;
- `docs/MULTITENANCY.md`;
- `docs/DESIGN_SYSTEM.md`;
- `docs/DECISIONS.md`.

A versão portuguesa é canônica.

`docs/PRODUCT.en.md` deve permanecer semanticamente equivalente.

Alterações materiais de produto devem:

1. identificar requisito afetado;
2. avaliar impacto;
3. registrar decisão;
4. atualizar documentos derivados;
5. preservar histórico da decisão.

---

## 48. Próxima fase

Antes de implementação autônoma ampla, esta Constituição deve passar por uma revisão crítica para identificar:

- contradições;
- lacunas;
- riscos legais;
- riscos de segurança;
- ambiguidades de autoridade;
- inconsistências temporais;
- dependências externas;
- requisitos não implementáveis;
- limites do MVP.

Somente depois devem ser derivados os documentos técnicos e liberada maior autonomia ao agente de engenharia.
