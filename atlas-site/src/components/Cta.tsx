import { CONTACT_URL } from '../lib/content';
import styles from './ui.module.css';

/**
 * Todo CTA aponta para o formulário que já existe e já converte. O texto
 * muda com o contexto — "saiba mais" não é um pedido, é um adiamento.
 */
export default function Cta({ label, primary = true }: { label: string; primary?: boolean }) {
  return (
    <a className={`${styles.btn} ${primary ? styles.primary : ''}`} href={CONTACT_URL}>
      {label} →
    </a>
  );
}
