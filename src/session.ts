/* Lifecycle of the terminal "session" driven by the EXIT / ^C button */
export type Session = 'online' | 'shutting-down' | 'killed' | 'powering-on'
