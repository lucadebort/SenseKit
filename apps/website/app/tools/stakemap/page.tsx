import { ToolShowcase } from '../../../components/ToolShowcase';

export default function StakeMapPage() {
  return (
    <ToolShowcase
      name="StakeMap"
      tagline="Stakeholder mapping interattivo e collaborativo"
      description="StakeMap ti permette di capire come i partecipanti percepiscono gli stakeholder di un progetto. Definisci due assi personalizzati (es. Influenza / Interesse), condividi il link e raccogli le posizioni in tempo reale. La dashboard mostra le posizioni aggregate con dispersione, per ogni stakeholder."
      features={[
        {
          title: 'Assi personalizzabili',
          description:
            'Definisci i due assi della matrice con etichette bipolari libere. Preset disponibili per i casi d\'uso più comuni.',
        },
        {
          title: 'Drag & drop intuitivo',
          description:
            'I partecipanti posizionano gli stakeholder trascinandoli sulla mappa. Funziona su desktop e mobile.',
        },
        {
          title: 'Aggregazione in tempo reale',
          description:
            'La dashboard mostra le posizioni medie con ellissi di dispersione. Vedi convergenze e divergenze a colpo d\'occhio.',
        },
        {
          title: 'Export CSV',
          description:
            'Scarica tutti i dati grezzi delle sessioni per analisi ulteriori in Excel, R o Python.',
        },
      ]}
      color="#2383E2"
      appUrl="https://stakemap.sensekit.eu"
      icon={
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l5.447 2.724A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
        </svg>
      }
    />
  );
}
