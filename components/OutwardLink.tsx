interface OutwardLinkProps {
  href: string;
  children: any;
}

export default function OutwardLink(props: OutwardLinkProps) {
  return (
    <a
      href={props.href}
      target="_blank"
      rel="noopener noreferrer"
      class="text-blue-600 dark:text-blue-400 underline cursor-pointer OutwardLink"
      aria-label={`${props.children} (opens in a new tab)`}
    >
      {props.children}
    </a>
  )
}
