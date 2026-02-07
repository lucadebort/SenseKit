import { ToolShowcase } from '../../../components/ToolShowcase';

export default function CompScapePage() {
  return (
    <ToolShowcase
      name="CompScape"
      tagline="Analisi competitiva visuale e partecipativa"
      description="CompScape ti permette di mappare il panorama competitivo attraverso gli occhi dei tuoi partecipanti. Definisci i competitor e due assi di valutazione, poi raccogli le posizioni individuali. La dashboard mostra le percezioni aggregate con ellissi di dispersione per identificare convergenze e ambiguità."
      features={[
        {
          title: 'Matrice competitiva personalizzabile',
          description:
            'Scegli i due assi di valutazione (es. Prezzo/Qualità, Innovazione/Tradizione) e i competitor da posizionare.',
        },
        {
          title: 'Posizionamento drag & drop',
          description:
            'I partecipanti posizionano i competitor nella matrice con un\'interfaccia intuitiva e responsive.',
        },
        {
          title: 'Mappa aggregata con dispersione',
          description:
            'Visualizza le posizioni medie con ellissi che mostrano il grado di accordo tra i partecipanti.',
        },
        {
          title: 'Export e analisi',
          description:
            'Scarica i dati grezzi in CSV per analisi approfondite o condividi la mappa aggregata con il team.',
        },
      ]}
      color="#E67E22"
      appUrl="https://compscape.sensekit.eu"
      icon={
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
        </svg>
      }
    />
  );
}
