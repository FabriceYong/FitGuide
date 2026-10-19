/** Classes for a header nav link (shared by the server header and client role links). */
export const navLinkClass = (active, href) => `px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors whitespace-nowrap ${
  active === href ? 'bg-lime-light text-noir-eclipse' : 'text-white-70 hover:text-white hover:bg-white/5'
}`;
