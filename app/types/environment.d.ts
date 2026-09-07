// The optional database helper checks this binding before using it.
declare namespace Cloudflare {
  interface Env { DB?: D1Database; }
}
