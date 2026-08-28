/**
 * Preferências de interface guardadas em cookie — lidas no servidor (para a
 * primeira pintura sair correta) e escritas no cliente.
 *
 * Mora fora dos componentes de propósito: uma constante exportada de um
 * módulo "use client" chega ao servidor como referência de cliente, não como
 * o valor, e a leitura silenciosamente falha.
 */
export const SIDEBAR_COOKIE = "atlas_sidebar";
export const SIDEBAR_COLLAPSED = "collapsed";
export const SIDEBAR_EXPANDED = "expanded";
/** Um ano: a preferência é do usuário, não da sessão. */
export const SIDEBAR_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;
