/**
 * Peça ilustrativa dentro de um território.
 *
 * Os dois valores que a narrativa usa — o número sem contexto e a decisão
 * de estoque — são EXEMPLOS, e estão marcados como tal no próprio bloco.
 * Nenhum deles é resultado de cliente, e nada aqui pode ser lido como
 * métrica entregue.
 */
import styles from './Example.module.css';

interface Props {
  /** Linha principal: o número ou a decisão. */
  value: string;
  /** Linhas de apoio, quando a decisão tem mais de um campo. */
  detail?: string[];
  caption: string;
}

export default function Example({ value, detail, caption }: Props) {
  return (
    <figure className={styles.wrap}>
      <p className={styles.value}>{value}</p>
      {detail && (
        <ul className={styles.detail}>
          {detail.map((d) => <li key={d}>{d}</li>)}
        </ul>
      )}
      <figcaption className={styles.caption}>Exemplo · {caption}</figcaption>
    </figure>
  );
}
