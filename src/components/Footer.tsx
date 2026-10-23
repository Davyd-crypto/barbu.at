interface FooterProps {
  onExit: () => void
}

export function Footer({ onExit }: FooterProps) {
  return (
    <footer>
      <nav className="links">
        <a href="mailto:dbarbu03@gmail.com">email</a>
        <a href="https://github.com/Davyd-crypto" target="_blank" rel="noreferrer">github</a>
        <a href="https://www.linkedin.com/in/david-barbu-7a84ab264/" target="_blank" rel="noreferrer">linkedin</a>
      </nav>
      <button
        className="exit-btn"
        aria-label="Terminate session"
        onClick={(e) => {
          e.stopPropagation()
          onExit()
        }}
      >
        [EXIT / ^C]
      </button>
    </footer>
  )
}
