export default function GiphyAttribution({ className = '' }) {
  return (
    <a className={`giphy-attribution ${className}`.trim()} href="https://giphy.com"
      target="_blank" rel="noopener noreferrer" aria-label="Powered by GIPHY">
      <img src="/giphy/powered-by-giphy.gif" alt="Powered by GIPHY" width="200" height="42" />
    </a>
  )
}
