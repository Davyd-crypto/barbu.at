interface KilledScreenProps {
  onReconnect: () => void
}

/* Blackout / SIGINT screen */
export function KilledScreen({ onReconnect }: KilledScreenProps) {
  return (
    <div
      className="terminal-killed"
      onClick={onReconnect}
      onTouchEnd={(e) => {
        e.preventDefault()
        onReconnect()
      }}
    >
      <div>[PROCESS TERMINATED: SIGINT (exit code 130)]</div>
      <span>TAP ANYWHERE OR PRESS ANY KEY TO RECONNECT</span>
    </div>
  )
}
