import { ToolShowcase } from '../../../components/ToolShowcase';

export default function SemDiffPage() {
  return (
    <ToolShowcase
      name="SemDiff"
      tagline="Differenziale semantico digitale"
      description="SemDiff digitalizza la tecnica del differenziale semantico. Crea scale bipolari personalizzate (es. Innovativo — Tradizionale), raccogli le valutazioni dei partecipanti e visualizza i profili semantici medi con indicatori di dispersione. Ideale per brand perception, valutazione di concetti e ricerca attitudinale."
      features={[
        {
          title: 'Scale bipolari personalizzabili',
          description:
            'Definisci coppie di aggettivi opposti su scale a 5 o 7 punti. Aggiungi quante scale vuoi.',
        },
        {
          title: 'Profili semantici',
          description:
            'Visualizza il profilo medio dei rispondenti con linee che collegano i punteggi su ogni scala.',
        },
        {
          title: 'Analisi della dispersione',
          description:
            'Identifica le scale ad alta e bassa concordanza tra i partecipanti con indicatori di deviazione standard.',
        },
        {
          title: 'Confronto tra gruppi',
          description:
            'Sovrapponi i profili di più sessioni per confrontare le percezioni di gruppi diversi.',
        },
      ]}
      color="#9B59B6"
      appUrl="https://semdiff.sensekit.eu"
      icon={
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21l5-5 5 5M4 4h16M4 8h16M4 12h10" />
        </svg>
      }
    />
  );
}
