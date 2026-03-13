import { Tldraw } from '@tldraw/tldraw'

export default function ExpoBoard() {
    return (
        <div style={{ position: 'fixed', inset: 0 }}>
            <Tldraw />
        </div>
    )
}