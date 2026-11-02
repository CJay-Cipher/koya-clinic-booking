export default function Header({ view, onNavigate }) {
  return (
    <header className="border-b border-line">
      <div className="mx-auto flex max-w-2xl items-baseline justify-between px-5 py-6 sm:px-0">
        <button
          onClick={() => onNavigate('book')}
          className="font-serif text-xl tracking-tight text-primary-dark"
        >
          Koya Clinic
        </button>
        <button
          onClick={() => onNavigate(view === 'book' ? 'lookup' : 'book')}
          className="text-sm text-ink/70 underline decoration-line decoration-1 underline-offset-4 transition hover:text-primary-dark hover:decoration-primary"
        >
          {view === 'book' ? 'Find a booking' : 'Back to slots'}
        </button>
      </div>
    </header>
  );
}
