import "server-only";
import { Document, Page, renderToBuffer, StyleSheet, Text, View } from "@react-pdf/renderer";

/**
 * Template versionado do documento de notificação extrajudicial (STG-09,
 * roadmap: "Documento: Template versionado. Registrar: versão, dados,
 * emissor, aprovação, timestamp"). Diferente de collection_templates
 * (Rodada 19, texto de e-mail versionado em linha do banco), este
 * template é código — versionado por commit/migration, não editável por
 * staff via UI: o roadmap não pede uma tela de edição de texto jurídico,
 * só o REGISTRO de qual versão foi usada em cada emissão (ver
 * escalonamento_documentos.template_versao). Bump este número sempre que
 * o texto abaixo mudar de forma que precise ser rastreável.
 */
export const TEMPLATE_VERSAO = 1;

export interface DadosNotificacaoExtrajudicial {
  sindicatoNome: string;
  empresaRazaoSocial: string;
  empresaCnpj: string;
  empresaEndereco: string | null;
  obrigacaoDescricao: string;
  valorCobranca: number;
  vencimento: string;
  motivoEscalonamento: string;
  emissorNome: string;
  emitidoEm: string;
  cobrancaId: string;
  escalonamentoId: string;
}

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { timeZone: "UTC" });
}

const styles = StyleSheet.create({
  page: { padding: 56, fontSize: 11, fontFamily: "Helvetica", lineHeight: 1.5, color: "#1a1a1a" },
  title: { fontSize: 14, fontFamily: "Helvetica-Bold", textAlign: "center", marginBottom: 24 },
  paragraph: { marginBottom: 12, textAlign: "justify" },
  label: { fontFamily: "Helvetica-Bold" },
  table: { marginVertical: 12, borderWidth: 1, borderColor: "#999" },
  tableRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#ccc" },
  tableRowLast: { flexDirection: "row" },
  tableCellLabel: {
    width: "40%",
    padding: 6,
    fontFamily: "Helvetica-Bold",
    borderRightWidth: 1,
    borderRightColor: "#ccc",
  },
  tableCellValue: { width: "60%", padding: 6 },
  signature: { marginTop: 48 },
  footer: {
    position: "absolute",
    bottom: 24,
    left: 56,
    right: 56,
    fontSize: 8,
    color: "#666",
    textAlign: "center",
  },
});

export function NotificacaoExtrajudicialDocument({ dados }: { dados: DadosNotificacaoExtrajudicial }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>NOTIFICAÇÃO EXTRAJUDICIAL DE COBRANÇA</Text>

        <Text style={styles.paragraph}>
          <Text style={styles.label}>Notificante: </Text>
          {dados.sindicatoNome}
        </Text>
        <Text style={styles.paragraph}>
          <Text style={styles.label}>Notificada: </Text>
          {dados.empresaRazaoSocial}, inscrita no CNPJ sob o nº {dados.empresaCnpj}
          {dados.empresaEndereco ? `, com endereço em ${dados.empresaEndereco}` : ""}.
        </Text>

        <Text style={styles.paragraph}>
          Pela presente, {dados.sindicatoNome} notifica formalmente a empresa acima
          qualificada acerca da existência de pendência financeira relativa à
          obrigação &quot;{dados.obrigacaoDescricao}&quot;, conforme detalhado abaixo,
          decorrente de instrumento coletivo aplicável à categoria representada.
        </Text>

        <View style={styles.table}>
          <View style={styles.tableRow}>
            <Text style={styles.tableCellLabel}>Obrigação</Text>
            <Text style={styles.tableCellValue}>{dados.obrigacaoDescricao}</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.tableCellLabel}>Valor pendente</Text>
            <Text style={styles.tableCellValue}>{formatCurrency(dados.valorCobranca)}</Text>
          </View>
          <View style={styles.tableRowLast}>
            <Text style={styles.tableCellLabel}>Vencimento original</Text>
            <Text style={styles.tableCellValue}>{formatDate(dados.vencimento)}</Text>
          </View>
        </View>

        <Text style={styles.paragraph}>
          <Text style={styles.label}>Motivo do escalonamento: </Text>
          {dados.motivoEscalonamento}
        </Text>

        <Text style={styles.paragraph}>
          Diante do exposto, e não havendo regularização ou manifestação por
          parte da empresa notificada nas vias amigáveis já tentadas, fica
          formalmente constituída em mora a partir do recebimento desta
          notificação, ficando ressalvado o direito de adoção das medidas
          cabíveis, inclusive judiciais, para a cobrança do débito ora
          notificado, sem prejuízo de encargos, correção monetária e demais
          cominações legais e contratuais aplicáveis.
        </Text>

        <Text style={styles.paragraph}>
          Solicita-se manifestação ou regularização no prazo de 10 (dez) dias
          corridos, contados do recebimento desta notificação, através dos
          canais de contato usuais mantidos com {dados.sindicatoNome}.
        </Text>

        <View style={styles.signature}>
          <Text>Emitido em {formatDate(dados.emitidoEm)}.</Text>
          <Text style={{ marginTop: 24 }}>_______________________________________</Text>
          <Text>{dados.emissorNome}</Text>
          <Text>Em nome de {dados.sindicatoNome}</Text>
        </View>

        <Text style={styles.footer}>
          Documento gerado eletronicamente pela plataforma GSBC — template v{TEMPLATE_VERSAO} ·
          escalonamento {dados.escalonamentoId} · cobrança {dados.cobrancaId}
        </Text>
      </Page>
    </Document>
  );
}

export async function gerarNotificacaoExtrajudicialPdf(
  dados: DadosNotificacaoExtrajudicial,
): Promise<Buffer> {
  return renderToBuffer(<NotificacaoExtrajudicialDocument dados={dados} />);
}
