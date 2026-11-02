function NavButton({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={`rounded-full px-2.5 py-1.5 xs:px-3.5 text-sm font-medium transition ${active ? "bg-primary-light text-primary-dark" : "text-ink/60 hover:text-ink"}`}
    >
      {children}
    </button>
  );
}

export default function Header({ view, onNavigate }) {
  return (
    <header className="sticky top-0 z-20 border-b border-line/70 bg-paper/80 backdrop-blur">
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-5 py-3.5">
        <button onClick={() => onNavigate("book")} className="flex items-center gap-2.5" aria-label="Koya Clinic home">
          <img src="/koya-logo.webp" alt="Koya" className="h-6 w-auto" />
          <span className="hidden h-5 w-px bg-line xs:block" aria-hidden="true" />
          <span className="font-serif text-xl tracking-tight text-primary-dark">Clinic</span>
        </button>
        <nav className="flex items-center gap-1">
          <NavButton active={view === "book"} onClick={() => onNavigate("book")}>
            Book
          </NavButton>
          <NavButton active={view === "lookup"} onClick={() => onNavigate("lookup")}>
            <span className="xs:hidden">Find</span>
            <span className="hidden xs:inline">Find a booking</span>
          </NavButton>
        </nav>
      </div>
    </header>
  );
}
