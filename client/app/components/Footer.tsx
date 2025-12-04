import { ExternalLinkIcon } from 'lucide-react'
import pkg from '../../package.json'

export default function Footer() {
    return (
        <div className="mx-auto py-10 pt-10 color-fg-tertiary text-sm">
            <ul className="flex flex-col items-center w-sm justify-around">
                <li>Beat Scrobble {import.meta.env.VITE_BEAT_SCROBBLE_VERSION || pkg.version}</li>
                <li><a href="https://github.com/gabehf/beat-scrobble" target="_blank" className="link-underline">View the source on GitHub <ExternalLinkIcon className='inline mb-1' size={14} /></a></li>
                <li>Fork Beat Scrobble {import.meta.env.VITE_BEAT_SCROBBLE_VERSION || pkg.version}</li>
                <li><a href="https://github.com/SaturnX-Dev/beat-scrobble" target="_blank" className="link-underline">View the source of fork on GitHub <ExternalLinkIcon className='inline mb-1' size={14} /></a></li>
            </ul>
        </div>
    )
}
